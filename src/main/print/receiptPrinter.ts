/**
 * Receipt Printer Module
 * Generates patient receipts for medication dispensing
 */

import { PDFDocument, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import log from 'electron-log';
import { format } from 'date-fns';

export interface ReceiptMedication {
  name: string;
  strength: string;
  quantity: number;
  unit: string;
  lotNumber?: string;
  expirationDate?: string;
  directions: string;
  warnings: string[];
}

export interface ReceiptData {
  receiptNumber: string;
  patientName: string;
  patientChartNumber: string;
  patientDob?: string;
  medications: ReceiptMedication[];
  dispensedBy: string;
  dispensedAt: Date;
  clinicName: string;
  clinicAddress?: string;
  clinicPhone: string;
  clinicEmail?: string;
  notes?: string;
}

export interface ReceiptOptions {
  includeSignatureLine?: boolean;
  includeDisclaimer?: boolean;
  paperSize?: 'letter' | 'thermal' | 'a4';
}

/**
 * Generate a patient receipt as PDF
 */
export async function generateReceipt(
  data: ReceiptData,
  options: ReceiptOptions = {},
): Promise<Uint8Array> {
  const { paperSize = 'letter' } = options;

  try {
    const { width, height } = getPageDimensions(paperSize);
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([width, height]);

    await drawReceiptContent(page, data, pdfDoc, options);

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (error) {
    log.error('[ReceiptPrinter] Failed to generate receipt:', error);
    throw new Error('Failed to generate receipt PDF');
  }
}

/**
 * Generate a dispensing receipt from a record ID
 */
export async function generateReceiptFromRecord(
  _recordId: number,
  _options: ReceiptOptions = {},
): Promise<Uint8Array> {
  // This would fetch the record from the database
  // For now, throw an error indicating it needs database integration
  throw new Error(
    'Database integration required for record-based receipt generation',
  );
}

/**
 * Draw receipt content on the page
 */
async function drawReceiptContent(
  page: PDFPage,
  data: ReceiptData,
  pdfDoc: PDFDocument,
  options: ReceiptOptions,
): Promise<void> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  // Clinic Header
  page.drawText(data.clinicName, {
    x: margin,
    y,
    font: boldFont,
    size: 16,
    color: rgb(0.2, 0.4, 0.6),
  });
  y -= 22;

  page.drawText('Health & Wellness Clinic', {
    x: margin,
    y,
    font,
    size: 11,
  });
  y -= 18;

  // Contact info
  page.drawText(`Phone: ${data.clinicPhone}`, {
    x: margin,
    y,
    font,
    size: 9,
  });
  y -= 14;

  if (data.clinicAddress) {
    page.drawText(data.clinicAddress, {
      x: margin,
      y,
      font,
      size: 9,
    });
    y -= 14;
  }

  if (data.clinicEmail) {
    page.drawText(data.clinicEmail, {
      x: margin,
      y,
      font,
      size: 9,
    });
    y -= 14;
  }

  // Horizontal line
  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 2,
    color: rgb(0.2, 0.4, 0.6),
  });
  y -= 25;

  // Receipt Title
  page.drawText('PATIENT DISPENSING RECEIPT', {
    x: margin,
    y,
    font: boldFont,
    size: 14,
  });
  y -= 20;

  // Receipt Number
  page.drawText(`Receipt #: ${data.receiptNumber}`, {
    x: margin,
    y,
    font,
    size: 10,
  });
  y -= 30;

  // Patient Information Section
  page.drawText('PATIENT INFORMATION', {
    x: margin,
    y,
    font: boldFont,
    size: 11,
  });
  y -= 18;

  page.drawText(`Name: ${data.patientName}`, {
    x: margin,
    y,
    font,
    size: 10,
  });
  y -= 14;

  page.drawText(`Chart Number: ${data.patientChartNumber}`, {
    x: margin,
    y,
    font,
    size: 10,
  });
  y -= 14;

  if (data.patientDob) {
    page.drawText(`Date of Birth: ${data.patientDob}`, {
      x: margin,
      y,
      font,
      size: 10,
    });
    y -= 14;
  }

  y -= 10;

  // Dispense Information
  page.drawText(`Dispensed By: ${data.dispensedBy}`, {
    x: margin,
    y,
    font,
    size: 10,
  });
  y -= 14;

  page.drawText(
    `Date/Time: ${format(data.dispensedAt, 'MM/dd/yyyy hh:mm a')}`,
    {
      x: margin,
      y,
      font,
      size: 10,
    },
  );
  y -= 25;

  // Horizontal line
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 20;

  // Medications Section
  page.drawText('DISPENSED MEDICATIONS', {
    x: margin,
    y,
    font: boldFont,
    size: 11,
  });
  y -= 20;

  for (let i = 0; i < data.medications.length; i++) {
    const med = data.medications[i];

    // Medication name and strength
    page.drawText(`${i + 1}. ${med.name} ${med.strength}`, {
      x: margin,
      y,
      font: boldFont,
      size: 10,
    });
    y -= 14;

    // Quantity
    page.drawText(`   Quantity: ${med.quantity} ${med.unit}`, {
      x: margin,
      y,
      font,
      size: 9,
    });
    y -= 12;

    // Lot and expiration
    if (med.lotNumber) {
      page.drawText(`   Lot #: ${med.lotNumber}`, {
        x: margin,
        y,
        font,
        size: 9,
      });
      y -= 12;
    }
    if (med.expirationDate) {
      page.drawText(`   Expires: ${med.expirationDate}`, {
        x: margin,
        y,
        font,
        size: 9,
      });
      y -= 12;
    }

    // Directions
    const wrappedDirections = wrapText(med.directions, 70);
    for (const line of wrappedDirections) {
      page.drawText(`   ${line}`, {
        x: margin,
        y,
        font,
        size: 9,
      });
      y -= 12;
    }

    // Warnings
    if (med.warnings.length > 0) {
      y -= 2;
      for (const warning of med.warnings) {
        page.drawText(`   ⚠ ${truncateText(warning, 65)}`, {
          x: margin,
          y,
          font,
          size: 8,
          color: rgb(0.8, 0.3, 0),
        });
        y -= 11;
      }
    }

    y -= 10;

    // Check for page overflow
    if (y < 150 && i < data.medications.length - 1) {
      // Add new page (would need to continue drawing on new page in full implementation)
      pdfDoc.addPage([width, height]);
      break;
    }
  }

  // Notes section
  if (data.notes) {
    y -= 10;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 18;

    page.drawText('ADDITIONAL NOTES:', {
      x: margin,
      y,
      font: boldFont,
      size: 10,
    });
    y -= 14;

    const wrappedNotes = wrapText(data.notes, 70);
    for (const line of wrappedNotes) {
      page.drawText(line, {
        x: margin,
        y,
        font,
        size: 9,
      });
      y -= 12;
    }
  }

  // Signature line
  if (options.includeSignatureLine) {
    y -= 30;
    page.drawLine({
      start: { x: margin, y },
      end: { x: margin + 250, y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    y -= 14;

    page.drawText('Patient/Guardian Signature', {
      x: margin,
      y,
      font,
      size: 9,
    });
    y -= 20;

    page.drawLine({
      start: { x: margin, y },
      end: { x: margin + 150, y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    y -= 14;

    page.drawText('Date', {
      x: margin,
      y,
      font,
      size: 9,
    });
  }

  // Disclaimer
  if (options.includeDisclaimer) {
    y -= 40;

    // Box around disclaimer
    const disclaimerHeight = 60;
    page.drawRectangle({
      x: margin,
      y: y - disclaimerHeight,
      width: width - margin * 2,
      height: disclaimerHeight,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1,
      color: rgb(0.97, 0.97, 0.97),
    });

    y -= 15;
    page.drawText('IMPORTANT:', {
      x: margin + 8,
      y,
      font: boldFont,
      size: 8,
    });
    y -= 12;

    const disclaimerText = [
      '• Take medications exactly as directed by your prescriber',
      '• Do not share medications with others',
      '• Store medications in a cool, dry place away from children',
      '• Contact the clinic immediately if you experience adverse effects',
      '• Return unused/expired medications to the clinic for proper disposal',
    ];

    for (const line of disclaimerText) {
      page.drawText(line, {
        x: margin + 8,
        y,
        font,
        size: 7,
      });
      y -= 10;
    }
  }

  // Footer
  y = 40;
  page.drawText('Thank you for choosing Hyacinth Health & Wellness Clinic', {
    x: margin,
    y,
    font,
    size: 8,
    color: rgb(0.4, 0.4, 0.4),
  });
}

/**
 * Get page dimensions based on paper size
 */
function getPageDimensions(paperSize: string): {
  width: number;
  height: number;
} {
  switch (paperSize) {
    case 'thermal':
      return { width: 288, height: 792 }; // 4" x 11" thermal paper
    case 'a4':
      return { width: 595, height: 842 }; // A4
    case 'letter':
    default:
      return { width: 612, height: 792 }; // US Letter
  }
}

/**
 * Save receipt PDF to temporary file
 */
export async function saveReceiptToTemp(
  pdfBytes: Uint8Array,
  filename?: string,
): Promise<string> {
  const tempDir = app.getPath('temp');
  const finalFilename = filename || `receipt_${Date.now()}.pdf`;
  const filePath = path.join(tempDir, finalFilename);
  fs.writeFileSync(filePath, pdfBytes);
  return filePath;
}

/**
 * Helper to wrap text to multiple lines
 */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (`${currentLine} ${word}`.trim().length <= maxChars) {
      currentLine = `${currentLine} ${word}`.trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.length > 0 ? lines : [text];
}

/**
 * Helper to truncate text
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength - 3)}...`;
}

export default {
  generateReceipt,
  generateReceiptFromRecord,
  saveReceiptToTemp,
};
