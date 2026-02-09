/**
 * Receipt Generator Module
 * Generates pharmacy-standard receipts for medication dispensing
 * Enhanced with patient information, context-specific instructions, and verification sections
 */

import { PDFDocument, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import log from 'electron-log';

// Reason context type
export type ReasonContext = 'treatment' | 'prevention' | 'prophylaxis' | 'pep' | 'prep' | 'other';

export interface ReceiptData {
  patientName: string;
  patientChartNumber: string;
  patientDateOfBirth?: string;
  dispenseDate: string;
  rxNumber: string;
  medications: ReceiptMedicationData[];
  dispensedBy?: string;
  verifiedBy?: string;
  clinicInfo?: {
    name: string;
    phone: string;
    address?: string;
  };
}

export interface ReceiptMedicationData {
  medicationName: string;
  medicationStrength: string;
  quantity: number;
  unit: string;
  daySupply: number;
  directions: string;
  indication: string;
  instructionContext: ReasonContext;
  warnings: string[];
  lotNumber?: string;
  expirationDate?: string;
  prescribedBy: string;
}

/**
 * Generate a patient receipt as PDF
 */
export async function generateReceipt(data: ReceiptData): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([576, 792]); // 8" x 11" (standard letter width, adjustable height)

    await drawReceiptContent(page, data, pdfDoc);

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (error) {
    log.error('[ReceiptGenerator] Failed to generate receipt:', error);
    throw new Error('Failed to generate receipt PDF');
  }
}

/**
 * Draw receipt content with pharmacy-standard formatting
 */
async function drawReceiptContent(
  page: PDFPage,
  data: ReceiptData,
  pdfDoc: PDFDocument
): Promise<void> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 36;
  let y = page.getHeight() - margin - 30;

  const clinicName = data.clinicInfo?.name || 'HYACINTH HEALTH & WELLNESS CLINIC';
  const clinicPhone = data.clinicInfo?.phone || '(862) 240-1461';

  // ========== Header Section ==========
  page.drawText(clinicName, {
    x: margin,
    y,
    font: boldFont,
    size: 16,
    color: rgb(0.2, 0.4, 0.6),
  });
  y -= 22;

  page.drawText(clinicPhone, {
    x: margin,
    y,
    font,
    size: 11,
  });

  // Date and Rx number on right
  const rxText = `Rx #: ${data.rxNumber}`;
  page.drawText(rxText, {
    x: page.getWidth() - margin - rxText.length * 7,
    y,
    font: boldFont,
    size: 11,
  });
  y -= 30;

  // Horizontal line
  page.drawLine({
    start: { x: margin, y },
    end: { x: page.getWidth() - margin, y },
    thickness: 1.5,
    color: rgb(0, 0, 0),
  });
  y -= 25;

  // ========== Patient Header Section ==========
  page.drawText('PATIENT INFORMATION', {
    x: margin,
    y,
    font: boldFont,
    size: 12,
    color: rgb(0.2, 0.4, 0.6),
  });
  y -= 18;

  page.drawText(`Name: ${data.patientName.toUpperCase()}`, {
    x: margin,
    y,
    font: boldFont,
    size: 12,
  });
  y -= 16;

  page.drawText(`Chart Number: ${data.patientChartNumber}`, {
    x: margin,
    y,
    font,
    size: 11,
  });
  y -= 14;

  if (data.patientDateOfBirth) {
    page.drawText(`Date of Birth: ${data.patientDateOfBirth}`, {
      x: margin,
      y,
      font,
      size: 11,
    });
    y -= 16;
  }

  page.drawText(`Dispense Date: ${data.dispenseDate}`, {
    x: margin,
    y,
    font,
    size: 11,
  });
  y -= 30;

  // ========== Medications Section ==========
  for (let i = 0; i < data.medications.length; i++) {
    const med = data.medications[i];

    // Medication header with border
    page.drawRectangle({
      x: margin,
      y: y - 18,
      width: page.getWidth() - margin * 2,
      height: 22,
      color: rgb(0.95, 0.97, 1),
      borderColor: rgb(0.7, 0.8, 0.95),
      borderWidth: 1,
    });

    page.drawText(`MEDICATION ${i + 1} OF ${data.medications.length}`, {
      x: margin + 5,
      y: y - 6,
      font: boldFont,
      size: 10,
      color: rgb(0.2, 0.4, 0.6),
    });
    y -= 28;

    // Medication name and strength
    page.drawText(`${med.medicationName.toUpperCase()} ${med.medicationStrength}`, {
      x: margin,
      y,
      font: boldFont,
      size: 13,
    });
    y -= 18;

    // Context indicator badge
    const contextLabel = getContextLabel(med.instructionContext);
    const contextWidth = contextLabel.length * 6.5 + 12;
    page.drawRectangle({
      x: margin,
      y: y - 11,
      width: contextWidth,
      height: 14,
      color: getContextColor(med.instructionContext),
      borderColor: rgb(0.6, 0.6, 0.6),
      borderWidth: 0.5,
    });
    page.drawText(contextLabel, {
      x: margin + 6,
      y: y - 8,
      font: boldFont,
      size: 8,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Quantity and day supply on right
    const qtyText = `Qty: ${med.quantity} ${med.unit} (${med.daySupply}-day supply)`;
    page.drawText(qtyText, {
      x: page.getWidth() - margin - qtyText.length * 6,
      y: y - 8,
      font: boldFont,
      size: 10,
    });
    y -= 22;

    // Directions section
    page.drawText('DIRECTIONS:', {
      x: margin,
      y,
      font: boldFont,
      size: 11,
    });
    y -= 14;

    // Full instructions (not abbreviated)
    const wrappedDirections = wrapText(med.directions, 65);
    for (const line of wrappedDirections) {
      page.drawText(line, {
        x: margin + 8,
        y,
        font,
        size: 10,
      });
      y -= 13;
    }
    y -= 8;

    // Indication section
    if (med.indication) {
      page.drawText('For:', {
        x: margin,
        y,
        font: boldFont,
        size: 10,
      });
      y -= 13;

      const wrappedIndication = wrapText(med.indication, 65);
      for (const line of wrappedIndication) {
        page.drawText(line, {
          x: margin + 8,
          y,
          font,
          size: 10,
        });
        y -= 13;
      }
      y -= 8;
    }

    // Warnings section with checkboxes
    if (med.warnings.length > 0) {
      page.drawText('IMPORTANT WARNINGS:', {
        x: margin,
        y,
        font: boldFont,
        size: 10,
        color: rgb(0.8, 0.4, 0),
      });
      y -= 14;

      for (const warning of med.warnings) {
        // Draw checkbox
        page.drawRectangle({
          x: margin + 5,
          y: y - 2,
          width: 8,
          height: 8,
          borderColor: rgb(0.3, 0.3, 0.3),
          borderWidth: 0.5,
        });

        // Wrap warning text
        const wrappedWarning = wrapText(warning, 60);
        for (let j = 0; j < wrappedWarning.length; j++) {
          const line = wrappedWarning[j];
          page.drawText(j === 0 ? line : `  ${line}`, {
            x: margin + 18,
            y: j === 0 ? y : y - 13 * (j + 1),
            font,
            size: 9,
          });
        }
        y -= wrappedWarning.length * 13 + 4;
      }
      y -= 8;
    }

    // Additional medication info
    page.drawText(`Prescribed by: ${med.prescribedBy}`, {
      x: margin,
      y,
      font,
      size: 9,
    });
    y -= 12;

    if (med.lotNumber) {
      page.drawText(`Lot: ${med.lotNumber}`, {
        x: margin,
        y,
        font,
        size: 9,
      });
      y -= 12;
    }

    if (med.expirationDate) {
      page.drawText(`Expires: ${med.expirationDate}`, {
        x: margin,
        y,
        font,
        size: 9,
      });
      y -= 12;
    }

    // Spacer between medications
    y -= 20;

    // Check if we need a new page
    if (y < 150) {
      // Add new page if running low on space
      const newPage = pdfDoc.addPage([576, 792]);
      page = newPage;
      y = page.getHeight() - margin - 30;
    }
  }

  // ========== Staff Verification Section ==========
  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: page.getWidth() - margin, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  y -= 25;

  page.drawText('STAFF VERIFICATION', {
    x: margin,
    y,
    font: boldFont,
    size: 12,
    color: rgb(0.2, 0.4, 0.6),
  });
  y -= 20;

  if (data.dispensedBy) {
    page.drawText(`Dispensed by: ${data.dispensedBy}`, {
      x: margin,
      y,
      font,
      size: 10,
    });
    y -= 14;

    // Signature line
    page.drawLine({
      start: { x: margin + 80, y: y + 3 },
      end: { x: margin + 200, y: y + 3 },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText('Signature', {
      x: margin + 80,
      y: y - 5,
      font,
      size: 8,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 18;
  }

  if (data.verifiedBy) {
    page.drawText(`Verified by: ${data.verifiedBy}`, {
      x: margin,
      y,
      font,
      size: 10,
    });
    y -= 14;

    // Signature line
    page.drawLine({
      start: { x: margin + 80, y: y + 3 },
      end: { x: margin + 200, y: y + 3 },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText('Signature', {
      x: margin + 80,
      y: y - 5,
      font,
      size: 8,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 20;
  }

  // ========== Patient Acknowledgment Section ==========
  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: page.getWidth() - margin, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  y -= 25;

  page.drawText('PATIENT ACKNOWLEDGMENT', {
    x: margin,
    y,
    font: boldFont,
    size: 12,
    color: rgb(0.2, 0.4, 0.6),
  });
  y -= 18;

  const acknowledgmentText = [
    'I acknowledge that I have received the above medication(s) and have been',
    'informed of the proper use, potential side effects, and warnings.',
  ];

  for (const line of acknowledgmentText) {
    page.drawText(line, {
      x: margin,
      y,
      font,
      size: 9,
    });
    y -= 13;
  }
  y -= 10;

  // Patient signature line
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + 200, y },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });
  page.drawText('Patient Signature', {
    x: margin,
    y: y - 10,
    font,
    size: 9,
  });

  // Date line on right
  page.drawLine({
    start: { x: page.getWidth() - margin - 120, y },
    end: { x: page.getWidth() - margin, y },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });
  page.drawText('Date', {
    x: page.getWidth() - margin - 120,
    y: y - 10,
    font,
    size: 9,
  });
  y -= 30;

  // ========== Footer Notice ==========
  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: page.getWidth() - margin, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  y -= 25;

  // Barcode placeholder (Rx number as barcode)
  page.drawText(`Rx: ${data.rxNumber}`, {
    x: page.getWidth() / 2 - (data.rxNumber.length + 3) * 3,
    y,
    font: boldFont,
    size: 14,
  });
  y -= 20;

  // "Keep this for your records" notice
  const noticeText = 'KEEP THIS FOR YOUR RECORDS';
  const noticeWidth = noticeText.length * 4.5;
  page.drawRectangle({
    x: page.getWidth() / 2 - noticeWidth / 2 - 8,
    y: y - 12,
    width: noticeWidth + 16,
    height: 16,
    color: rgb(0.9, 0.95, 0.9),
    borderColor: rgb(0.6, 0.7, 0.6),
    borderWidth: 1,
  });
  page.drawText(noticeText, {
    x: page.getWidth() / 2 - noticeWidth / 2,
    y: y - 8,
    font: boldFont,
    size: 9,
    color: rgb(0.3, 0.5, 0.3),
  });
}

/**
 * Get display label for context
 */
function getContextLabel(context: ReasonContext): string {
  const labels: Record<ReasonContext, string> = {
    treatment: 'TREATMENT',
    prevention: 'PREVENTION',
    prophylaxis: 'PROPHYLAXIS',
    pep: 'nPEP (Post-Exposure Prophylaxis)',
    prep: 'PrEP (Pre-Exposure Prophylaxis)',
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

/**
 * Save receipt PDF to a temporary file for printing
 */
export async function saveReceiptToTemp(pdfBytes: Uint8Array, filename: string): Promise<string> {
  const tempDir = app.getPath('temp');
  const filePath = path.join(tempDir, filename);
  fs.writeFileSync(filePath, pdfBytes);
  return filePath;
}

export default {
  generateReceipt,
  saveReceiptToTemp,
};
