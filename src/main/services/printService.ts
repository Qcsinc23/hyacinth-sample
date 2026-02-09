/**
 * Print Service Module
 * Manages print jobs with queue, retry logic, and history tracking
 */

import { ipcMain, BrowserWindow, IpcMainInvokeEvent } from 'electron';
import log from 'electron-log';
import path from 'path';
import fs from 'fs';
import { shell } from 'electron';
import type { LabelData, LabelPrintOptions } from '../print/labelPrinter';
import type { ReceiptData, ReceiptOptions } from '../print/receiptPrinter';
import type { QRCodeData } from '../print/qrGenerator';
import labelPrinter from '../print/labelPrinter';
import receiptPrinter from '../print/receiptPrinter';
import qrGenerator from '../print/qrGenerator';

// ============================================================================
// Types
// ============================================================================

export type PrintJobType = 'label' | 'receipt' | 'qr_code' | 'report';
export type PrintJobStatus = 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled';

export interface PrintJob {
  id: string;
  type: PrintJobType;
  data: LabelData | ReceiptData | QRCodeData | unknown;
  options: PrintOptions;
  status: PrintJobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  printerName?: string;
}

export interface PrintOptions {
  printerName?: string;
  copies?: number;
  paperSize?: string;
  labelFormat?: 'avery5160' | 'single';
  silent?: boolean;
  preview?: boolean;
}

export interface PrintHistoryEntry {
  id: string;
  jobId: string;
  type: PrintJobType;
  status: PrintJobStatus;
  printerName: string;
  timestamp: Date;
  error?: string;
  documentName?: string;
}

// ============================================================================
// State
// ============================================================================

const printQueue: PrintJob[] = [];
const printHistory: PrintHistoryEntry[] = [];
let isProcessing = false;
let mainWindow: BrowserWindow | null = null;

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const HISTORY_LIMIT = 100;

// ============================================================================
// Queue Management
// ============================================================================

/**
 * Set the main window reference for print operations
 */
export function setMainWindow(window: BrowserWindow): void {
  mainWindow = window;
}

/**
 * Add a job to the print queue
 */
export function addToQueue(
  type: PrintJobType,
  data: unknown,
  options: PrintOptions = {}
): PrintJob {
  const job: PrintJob = {
    id: generateJobId(),
    type,
    data,
    options,
    status: 'pending',
    createdAt: new Date(),
    retryCount: 0,
    printerName: options.printerName,
  };

  printQueue.push(job);
  log.info(`[PrintService] Added job ${job.id} to queue (${type})`);

  // Start processing if not already running
  if (!isProcessing) {
    processQueue();
  }

  return job;
}

/**
 * Get the current print queue
 */
export function getQueue(): PrintJob[] {
  return [...printQueue];
}

/**
 * Get pending jobs count
 */
export function getPendingCount(): number {
  return printQueue.filter(job => job.status === 'pending').length;
}

/**
 * Cancel a pending job
 */
export function cancelJob(jobId: string): boolean {
  const jobIndex = printQueue.findIndex(job => job.id === jobId && job.status === 'pending');
  if (jobIndex !== -1) {
    printQueue[jobIndex].status = 'cancelled';
    printQueue.splice(jobIndex, 1);
    log.info(`[PrintService] Cancelled job ${jobId}`);
    return true;
  }
  return false;
}

/**
 * Clear completed and failed jobs from queue
 */
export function clearCompletedJobs(): void {
  const initialLength = printQueue.length;
  for (let i = printQueue.length - 1; i >= 0; i--) {
    if (printQueue[i].status === 'completed' || printQueue[i].status === 'cancelled') {
      printQueue.splice(i, 1);
    }
  }
  log.info(`[PrintService] Cleared ${initialLength - printQueue.length} completed jobs`);
}

// ============================================================================
// Queue Processing
// ============================================================================

/**
 * Process the print queue
 */
async function processQueue(): Promise<void> {
  if (isProcessing || printQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (printQueue.length > 0) {
    const job = printQueue[0];

    if (job.status === 'cancelled') {
      printQueue.shift();
      continue;
    }

    try {
      job.status = 'printing';
      job.startedAt = new Date();

      log.info(`[PrintService] Processing job ${job.id} (${job.type})`);

      await executePrintJob(job);

      job.status = 'completed';
      job.completedAt = new Date();

      addToHistory({
        id: generateJobId(),
        jobId: job.id,
        type: job.type,
        status: 'completed',
        printerName: job.printerName || 'default',
        timestamp: new Date(),
      });

      log.info(`[PrintService] Completed job ${job.id}`);
    } catch (error) {
      job.retryCount++;

      if (job.retryCount >= MAX_RETRIES) {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';

        addToHistory({
          id: generateJobId(),
          jobId: job.id,
          type: job.type,
          status: 'failed',
          printerName: job.printerName || 'default',
          timestamp: new Date(),
          error: job.error,
        });

        log.error(`[PrintService] Job ${job.id} failed after ${MAX_RETRIES} retries:`, error);
      } else {
        log.warn(`[PrintService] Job ${job.id} failed, retrying (${job.retryCount}/${MAX_RETRIES})...`);
        job.status = 'pending';
        await delay(RETRY_DELAY_MS);
        continue; // Don't remove from queue, will retry
      }
    }

    // Remove processed job from queue
    printQueue.shift();
  }

  isProcessing = false;
}

/**
 * Execute a print job based on type
 */
async function executePrintJob(job: PrintJob): Promise<void> {
  switch (job.type) {
    case 'label':
      await printLabel(job.data as LabelData, job.options as PrintOptions & LabelPrintOptions);
      break;
    case 'receipt':
      await printReceipt(job.data as ReceiptData, job.options as PrintOptions & ReceiptOptions);
      break;
    case 'qr_code':
      await printQRCode(job.data as QRCodeData, job.options);
      break;
    default:
      throw new Error(`Unknown print job type: ${job.type}`);
  }
}

// ============================================================================
// Print Operations
// ============================================================================

/**
 * Print a medication label
 */
export async function printLabel(
  data: LabelData,
  options: PrintOptions & LabelPrintOptions = {}
): Promise<string> {
  try {
    // Generate PDF
    const pdfBytes = await labelPrinter.generateSingleLabel(data, {
      labelFormat: options.labelFormat || 'single',
      copies: options.copies,
    });

    // Save to temp file
    const filename = `label_${Date.now()}_${data.rxNumber}.pdf`;
    const filePath = await labelPrinter.savePdfToTemp(pdfBytes, filename);

    // Print or preview
    if (options.preview) {
      await shell.openPath(filePath);
    } else {
      await sendToPrinter(filePath, options);
    }

    return filePath;
  } catch (error) {
    log.error('[PrintService] Label printing failed:', error);
    throw error;
  }
}

/**
 * Print a label sheet (Avery 5160 format)
 */
export async function printLabelSheet(
  labels: LabelData[],
  options: PrintOptions & LabelPrintOptions = {}
): Promise<string> {
  try {
    const pdfBytes = await labelPrinter.generateLabelSheet(labels, {
      labelFormat: 'avery5160',
      copies: options.copies,
      startPosition: options.labelFormat === 'avery5160' ? 1 : undefined,
    });

    const filename = `label_sheet_${Date.now()}.pdf`;
    const filePath = await labelPrinter.savePdfToTemp(pdfBytes, filename);

    if (options.preview) {
      await shell.openPath(filePath);
    } else {
      await sendToPrinter(filePath, options);
    }

    return filePath;
  } catch (error) {
    log.error('[PrintService] Label sheet printing failed:', error);
    throw error;
  }
}

/**
 * Print a receipt
 */
export async function printReceipt(
  data: ReceiptData,
  options: PrintOptions & ReceiptOptions = {}
): Promise<string> {
  try {
    const pdfBytes = await receiptPrinter.generateReceipt(data, {
      includeSignatureLine: options.includeSignatureLine ?? true,
      includeDisclaimer: options.includeDisclaimer ?? true,
      paperSize: options.paperSize as 'letter' | 'thermal' | 'a4' || 'letter',
    });

    const filename = `receipt_${Date.now()}_${data.receiptNumber}.pdf`;
    const filePath = await receiptPrinter.saveReceiptToTemp(pdfBytes, filename);

    if (options.preview) {
      await shell.openPath(filePath);
    } else {
      await sendToPrinter(filePath, options);
    }

    return filePath;
  } catch (error) {
    log.error('[PrintService] Receipt printing failed:', error);
    throw error;
  }
}

/**
 * Print a QR code
 */
export async function printQRCode(
  data: QRCodeData,
  options: PrintOptions = {}
): Promise<string> {
  try {
    const pdfBytes = await qrGenerator.generateQRCodePDF(data);

    const tempDir = require('electron').app.getPath('temp');
    const filename = `qr_${Date.now()}.pdf`;
    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, pdfBytes);

    if (options.preview) {
      await shell.openPath(filePath);
    } else {
      await sendToPrinter(filePath, options);
    }

    return filePath;
  } catch (error) {
    log.error('[PrintService] QR code printing failed:', error);
    throw error;
  }
}

/**
 * Send PDF to printer
 */
async function sendToPrinter(filePath: string, options: PrintOptions): Promise<void> {
  if (!mainWindow) {
    throw new Error('Main window not available for printing');
  }

  // For cross-platform compatibility, we'll use the system's default PDF handler
  // or open in the browser for preview
  if (options.silent) {
    // On Windows, we could use PDF-to-printer or similar
    // On macOS, we can use lp command
    if (process.platform === 'darwin') {
      const { exec } = require('child_process');
      const printerOption = options.printerName ? `-d "${options.printerName}"` : '';
      exec(`lp ${printerOption} "${filePath}"`, (error: Error | null) => {
        if (error) {
          log.error('[PrintService] macOS print command failed:', error);
          throw error;
        }
      });
    } else if (process.platform === 'win32') {
      // Windows: use ShellExecute or similar
      // For now, open in default viewer
      await shell.openPath(filePath);
    } else {
      // Linux: use lp command
      const { exec } = require('child_process');
      const printerOption = options.printerName ? `-d "${options.printerName}"` : '';
      exec(`lp ${printerOption} "${filePath}"`, (error: Error | null) => {
        if (error) {
          log.error('[PrintService] Linux print command failed:', error);
          throw error;
        }
      });
    }
  } else {
    // Non-silent: open for user to print manually
    await shell.openPath(filePath);
  }
}

// ============================================================================
// History Management
// ============================================================================

/**
 * Add entry to print history
 */
function addToHistory(entry: PrintHistoryEntry): void {
  printHistory.unshift(entry);

  // Limit history size
  if (printHistory.length > HISTORY_LIMIT) {
    printHistory.pop();
  }
}

/**
 * Get print history
 */
export function getHistory(limit?: number): PrintHistoryEntry[] {
  const result = [...printHistory];
  if (limit && limit > 0) {
    return result.slice(0, limit);
  }
  return result;
}

/**
 * Clear print history
 */
export function clearHistory(): void {
  printHistory.length = 0;
  log.info('[PrintService] Print history cleared');
}

/**
 * Export history to file
 */
export function exportHistory(filePath: string): void {
  const data = {
    exportedAt: new Date().toISOString(),
    entries: printHistory,
  };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  log.info(`[PrintService] History exported to ${filePath}`);
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateJobId(): string {
  return `print_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// IPC Handlers
// ============================================================================

export function registerPrintIpcHandlers(): void {
  ipcMain.handle('print:label', async (_event: IpcMainInvokeEvent, data: LabelData, options: PrintOptions) => {
    const job = addToQueue('label', data, options);
    return { jobId: job.id, status: job.status };
  });

  ipcMain.handle('print:receipt', async (_event: IpcMainInvokeEvent, data: ReceiptData, options: PrintOptions) => {
    const job = addToQueue('receipt', data, options);
    return { jobId: job.id, status: job.status };
  });

  ipcMain.handle('print:labelSheet', async (_event: IpcMainInvokeEvent, labels: LabelData[], options: PrintOptions) => {
    try {
      const filePath = await printLabelSheet(labels, options);
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('print:qrCode', async (_event: IpcMainInvokeEvent, data: QRCodeData, options: PrintOptions) => {
    const job = addToQueue('qr_code', data, options);
    return { jobId: job.id, status: job.status };
  });

  ipcMain.handle('print:preview', async (_event: IpcMainInvokeEvent, filePath: string) => {
    try {
      await shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('print:getQueue', () => {
    return getQueue();
  });

  ipcMain.handle('print:getHistory', (_event: IpcMainInvokeEvent, limit?: number) => {
    return getHistory(limit);
  });

  ipcMain.handle('print:cancelJob', (_event: IpcMainInvokeEvent, jobId: string) => {
    return cancelJob(jobId);
  });

  ipcMain.handle('print:clearHistory', () => {
    clearHistory();
    return { success: true };
  });

  ipcMain.handle('print:exportHistory', (_event: IpcMainInvokeEvent, filePath: string) => {
    try {
      exportHistory(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  log.info('[PrintService] IPC handlers registered');
}

export default {
  setMainWindow,
  addToQueue,
  getQueue,
  getPendingCount,
  cancelJob,
  clearCompletedJobs,
  printLabel,
  printLabelSheet,
  printReceipt,
  printQRCode,
  getHistory,
  clearHistory,
  exportHistory,
  registerPrintIpcHandlers,
};
