/**
 * Label Printer Module
 * Generates PDF labels for medication dispensing
 * Supports Avery 5160 label format (30 labels per sheet, 1" x 2-5/8")
 * Enhanced with context-specific instructions and pharmacy-standard formatting
 */

import { PDFDocument, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import log from 'electron-log';

// Reason context type
export type ReasonContext = 'treatment' | 'prevention' | 'prophylaxis' | 'pep' | 'prep' | 'other';

// Avery 5160 Label Specifications (in points, 72 points = 1 inch)
const AVERY_5160 = {
  pageWidth: 612, // 8.5 inches
  pageHeight: 792, // 11 inches
  labelWidth: 189, // 2.625 inches
  labelHeight: 72, // 1 inch
  marginLeft: 13.5, // 0.1875 inches
  marginTop: 36, // 0.5 inches
  columnGap: 12, // Gap between columns
  rowGap: 0, // No gap between rows
  columns: 3,
  rows: 10,
  labelsPerPage: 30,
};

export interface LabelData {
  patientName: string;
  patientChartNumber: string;
  medicationName: string;
  medicationStrength: string; // Required - strength must be displayed
  quantity: number;
  unit: string;
  daySupply: number;
  directions: string;
  indication: string;
  prescribedBy: string;
  dispenseDate: string;
  rxNumber: string;
  warnings: string[]; // All warnings, not truncated
  lotNumber?: string;
  expirationDate?: string;
  qrCodeData?: string;
  // Enhanced fields for context-specific printing
  instructionContext: ReasonContext;
  fullWarnings: string[]; // All warnings, separate from truncated display
  patientDateOfBirth?: string; // For receipt
  dispensedBy?: string;
  verifiedBy?: string;
}

export interface LabelPrintOptions {
  labelFormat?: 'avery5160' | 'single';
  startPosition?: number; // 1-30 for Avery 5160, which label position to start
  skipPositions?: number[]; // Array of positions to skip
  copies?: number;
}

/**
 * Generate a single medication label as PDF
 */
export async function generateSingleLabel(
  labelData: LabelData,
  _options: LabelPrintOptions = {}
): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([288, 432]); // 4" x 6" label

    await drawLabelContent(page, labelData, pdfDoc);

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (error) {
    log.error('[LabelPrinter] Failed to generate single label:', error);
    throw new Error('Failed to generate label PDF');
  }
}

/**
 * Generate a full sheet of labels (Avery 5160 format)
 */
export async function generateLabelSheet(
  labels: LabelData[],
  options: LabelPrintOptions = {}
): Promise<Uint8Array> {
  const {
    startPosition = 1,
    skipPositions = [],
    copies = 1,
  } = options;

  try {
    const pdfDoc = await PDFDocument.create();
    let currentPage: PDFPage | null = null;
    let currentPosition = startPosition;

    // Expand labels with copies
    const expandedLabels: LabelData[] = [];
    for (const label of labels) {
      for (let i = 0; i < copies; i++) {
        expandedLabels.push(label);
      }
    }

    for (const label of expandedLabels) {
      // Skip positions if needed
      while (skipPositions.includes(currentPosition)) {
        currentPosition++;
        if (currentPosition > AVERY_5160.labelsPerPage) {
          currentPosition = 1;
        }
      }

      // Create new page if needed
      if (!currentPage || currentPosition === 1) {
        currentPage = pdfDoc.addPage([AVERY_5160.pageWidth, AVERY_5160.pageHeight]);
      }

      // Calculate position
      const { x, y } = calculateLabelPosition(currentPosition);

      // Draw label at position
      await drawAveryLabel(currentPage, label, x, y, pdfDoc);

      currentPosition++;
      if (currentPosition > AVERY_5160.labelsPerPage) {
        currentPosition = 1;
      }
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (error) {
    log.error('[LabelPrinter] Failed to generate label sheet:', error);
    throw new Error('Failed to generate label sheet PDF');
  }
}

/**
 * Calculate X, Y position for a label on Avery 5160 sheet
 */
function calculateLabelPosition(position: number): { x: number; y: number } {
  const pos = position - 1; // Convert to 0-based
  const col = pos % AVERY_5160.columns;
  const row = Math.floor(pos / AVERY_5160.columns);

  const x = AVERY_5160.marginLeft + col * (AVERY_5160.labelWidth + AVERY_5160.columnGap);
  const y = AVERY_5160.pageHeight - AVERY_5160.marginTop - (row + 1) * AVERY_5160.labelHeight;

  return { x, y };
}

/**
 * Draw a single Avery 5160 label at the specified position
 * Enhanced with context indicator and medication strength
 */
async function drawAveryLabel(
  page: PDFPage,
  data: LabelData,
  x: number,
  y: number,
  pdfDoc: PDFDocument
): Promise<void> {
  const { width, height } = { width: AVERY_5160.labelWidth, height: AVERY_5160.labelHeight };

  // Draw border (for cutting guide - very light)
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: rgb(0.9, 0.9, 0.9),
    borderWidth: 0.5,
  });

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 4;
  let currentY = y + height - margin - 10;

  // Patient name (bold, larger)
  page.drawText(data.patientName.toUpperCase(), {
    x: x + margin,
    y: currentY,
    font: boldFont,
    size: 9,
  });
  currentY -= 11;

  // Medication name and strength
  page.drawText(`${data.medicationName} ${data.medicationStrength}`.toUpperCase(), {
    x: x + margin,
    y: currentY,
    font: boldFont,
    size: 8,
  });
  currentY -= 10;

  // Context indicator badge
  const contextLabel = getContextLabel(data.instructionContext);
  const contextWidth = contextLabel.length * 4.5 + 6;
  page.drawRectangle({
    x: x + margin,
    y: currentY - 1,
    width: contextWidth,
    height: 10,
    color: getContextColor(data.instructionContext),
  });
  page.drawText(contextLabel, {
    x: x + margin + 3,
    y: currentY,
    font: boldFont,
    size: 6,
    color: rgb(0.2, 0.2, 0.2),
  });
  currentY -= 11;

  // Directions (wrapped, more space with context badge moved)
  const directions = truncateText(data.directions, 45);
  page.drawText(directions, {
    x: x + margin,
    y: currentY,
    font,
    size: 7,
  });
  currentY -= 9;

  // Quantity and day supply
  page.drawText(`Qty: ${data.quantity} ${data.unit} (${data.daySupply}d)`, {
    x: x + margin,
    y: currentY,
    font,
    size: 7,
  });
  currentY -= 9;

  // Rx number
  page.drawText(`Rx: ${data.rxNumber} | ${data.dispenseDate}`, {
    x: x + margin,
    y: currentY,
    font,
    size: 7,
  });
  currentY -= 9;

  // Lot number at bottom if available
  if (data.lotNumber) {
    page.drawText(`Lot: ${data.lotNumber}`, {
      x: x + margin,
      y: currentY,
      font,
      size: 6,
      color: rgb(0.5, 0.5, 0.5),
    });
    currentY -= 8;
  }

  // Warnings indicator with icon (if any)
  const allWarnings = data.fullWarnings.length > 0 ? data.fullWarnings : data.warnings;
  if (allWarnings.length > 0) {
    // Draw warning icon in top right
    page.drawText('⚠', {
      x: x + width - margin - 10,
      y: y + margin + 2,
      font,
      size: 10,
      color: rgb(1, 0.5, 0),
    });

    // Show warning count
    page.drawText(`(${allWarnings.length})`, {
      x: x + width - margin - 16,
      y: y + margin - 4,
      font: boldFont,
      size: 6,
      color: rgb(1, 0.5, 0),
    });
  }
}

/**
 * Draw full-size label content (4" x 6" format)
 * Enhanced with context-specific indication and all warnings
 */
async function drawLabelContent(
  page: PDFPage,
  data: LabelData,
  pdfDoc: PDFDocument
): Promise<void> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 20;
  let y = page.getHeight() - margin - 20;

  // Title
  page.drawText('HYACINTH HEALTH & WELLNESS CLINIC', {
    x: margin,
    y,
    font: boldFont,
    size: 12,
    color: rgb(0.2, 0.4, 0.6),
  });
  y -= 20;

  // Phone
  page.drawText('(862) 240-1461', {
    x: margin,
    y,
    font,
    size: 10,
  });
  y -= 30;

  // Patient name
  page.drawText(data.patientName.toUpperCase(), {
    x: margin,
    y,
    font: boldFont,
    size: 16,
  });
  y -= 25;

  // Chart number
  page.drawText(`Chart: ${data.patientChartNumber}`, {
    x: margin,
    y,
    font,
    size: 10,
  });
  y -= 25;

  // Horizontal line
  page.drawLine({
    start: { x: margin, y },
    end: { x: page.getWidth() - margin, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  // Medication header
  page.drawText('Medication:', {
    x: margin,
    y,
    font: boldFont,
    size: 10,
  });
  y -= 15;
  page.drawText(`${data.medicationName.toUpperCase()}`, {
    x: margin,
    y,
    font: boldFont,
    size: 11,
  });
  y -= 14;
  page.drawText(`Strength: ${data.medicationStrength}`, {
    x: margin,
    y,
    font,
    size: 10,
  });
  y -= 20;

  // Quantity with day supply prominently displayed
  page.drawText('Quantity:', {
    x: margin,
    y,
    font: boldFont,
    size: 10,
  });
  y -= 15;
  page.drawText(`${data.quantity} ${data.unit} (${data.daySupply}-day supply)`, {
    x: margin,
    y,
    font: boldFont,
    size: 11,
  });
  y -= 14;

  // Rx number
  page.drawText(`Rx #: ${data.rxNumber}`, {
    x: margin,
    y,
    font,
    size: 10,
  });
  y -= 20;

  // Horizontal line
  page.drawLine({
    start: { x: margin, y },
    end: { x: page.getWidth() - margin, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  // Directions header
  page.drawText('Directions:', {
    x: margin,
    y,
    font: boldFont,
    size: 10,
  });
  y -= 15;

  // Wrap directions - show full instructions
  const wrappedDirections = wrapText(data.directions, 50);
  for (const line of wrappedDirections) {
    page.drawText(line, {
      x: margin,
      y,
      font,
      size: 10,
    });
    y -= 14;
  }
  y -= 6;

  // Context-specific indication section
  if (data.indication) {
    page.drawLine({
      start: { x: margin, y },
      end: { x: page.getWidth() - margin, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 15;

    page.drawText('For:', {
      x: margin,
      y,
      font: boldFont,
      size: 10,
    });
    y -= 15;

    // Wrap indication if needed
    const wrappedIndication = wrapText(data.indication, 50);
    for (const line of wrappedIndication) {
      page.drawText(line, {
        x: margin,
        y,
        font,
        size: 10,
      });
      y -= 14;
    }
    y -= 6;
  }

  // Context indicator badge
  const contextLabel = getContextLabel(data.instructionContext);
  const contextColor = getContextColor(data.instructionContext);

  // Draw context badge
  page.drawRectangle({
    x: margin,
    y: y - 12,
    width: contextLabel.length * 7 + 10,
    height: 16,
    color: contextColor,
  });
  page.drawText(contextLabel, {
    x: margin + 5,
    y: y - 10,
    font: boldFont,
    size: 8,
    color: rgb(1, 1, 1),
  });
  y -= 25;

  // Horizontal line
  page.drawLine({
    start: { x: margin, y },
    end: { x: page.getWidth() - margin, y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 15;

  // Prescriber and dispense date
  page.drawText(`Prescribed by: ${data.prescribedBy}`, {
    x: margin,
    y,
    font,
    size: 10,
  });
  y -= 14;
  page.drawText(`Dispensed: ${data.dispenseDate}`, {
    x: margin,
    y,
    font,
    size: 10,
  });
  y -= 20;

  // Warnings section - show ALL warnings
  const allWarnings = data.fullWarnings.length > 0 ? data.fullWarnings : data.warnings;
  if (allWarnings.length > 0) {
    y -= 10;

    // Warning box
    const warningBoxHeight = allWarnings.length * 14 + 30;
    page.drawRectangle({
      x: margin,
      y: y - warningBoxHeight,
      width: page.getWidth() - margin * 2,
      height: warningBoxHeight,
      borderColor: rgb(0.8, 0.6, 0),
      borderWidth: 1,
      color: rgb(1, 1, 0.95),
    });

    page.drawText('IMPORTANT:', {
      x: margin + 5,
      y: y - 5,
      font: boldFont,
      size: 9,
      color: rgb(0.8, 0.4, 0),
    });
    y -= 18;

    for (const warning of allWarnings) {
      const wrappedWarning = wrapText(warning, 55);
      for (const line of wrappedWarning) {
        page.drawText(`• ${line}`, {
          x: margin + 5,
          y,
          font,
          size: 8,
        });
        y -= 12;
      }
      y -= 2; // Extra spacing between warnings
    }
    y -= 10;
  }

  // Lot number and expiration at bottom
  if (data.lotNumber || data.expirationDate) {
    page.drawLine({
      start: { x: margin, y },
      end: { x: page.getWidth() - margin, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 15;

    if (data.lotNumber) {
      page.drawText(`Lot: ${data.lotNumber}`, {
        x: margin,
        y,
        font,
        size: 9,
      });
    }

    if (data.expirationDate) {
      const expText = `Exp: ${data.expirationDate}`;
      page.drawText(expText, {
        x: page.getWidth() - margin - expText.length * 5.5,
        y,
        font,
        size: 9,
      });
    }
  }
}

/**
 * Get display label for context
 */
function getContextLabel(context: ReasonContext): string {
  const labels: Record<ReasonContext, string> = {
    treatment: 'TREATMENT',
    prevention: 'PREVENTION',
    prophylaxis: 'PROPHYLAXIS',
    pep: 'nPEP',
    prep: 'PrEP',
    other: 'OTHER',
  };
  return labels[context] || 'OTHER';
}

/**
 * Get color for context badge
 */
function getContextColor(context: ReasonContext): any {
  const colors: Record<ReasonContext, any> = {
    treatment: rgb(0.9, 0.95, 1),    // Light blue
    prevention: rgb(0.95, 1, 0.9),   // Light green
    prophylaxis: rgb(1, 0.95, 0.9),  // Light orange
    pep: rgb(1, 0.85, 0.85),         // Light red
    prep: rgb(0.95, 0.9, 1),         // Light purple
    other: rgb(0.95, 0.95, 0.95),    // Light gray
  };
  return colors[context] || colors.other;
}

/**
 * Save PDF to a temporary file for printing
 */
export async function savePdfToTemp(pdfBytes: Uint8Array, filename: string): Promise<string> {
  const tempDir = app.getPath('temp');
  const filePath = path.join(tempDir, filename);
  fs.writeFileSync(filePath, pdfBytes);
  return filePath;
}

/**
 * Helper to truncate text
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Helper to wrap text to multiple lines
 */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.length > 0 ? lines : [text];
}

export default {
  generateSingleLabel,
  generateLabelSheet,
  savePdfToTemp,
  AVERY_5160,
};
