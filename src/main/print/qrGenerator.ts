/**
 * QR Code Generator Module
 * Generates QR codes for medication labels and patient identification
 */

import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import log from 'electron-log';

// QR Code matrix size
const QR_SIZE = 21; // Version 1 QR code (21x21 modules)

export interface QRCodeData {
  type: 'patient' | 'medication' | 'inventory' | 'url';
  patientId?: string;
  patientChartNumber?: string;
  medicationId?: string;
  medicationName?: string;
  lotNumber?: string;
  expirationDate?: string;
  dosage?: string;
  url?: string;
  rawData?: string;
}

/**
 * Generate QR code matrix for data
 * This is a simplified QR code generator for basic alphanumeric data
 * For production, consider using a library like 'qrcode'
 */
export function generateQRMatrix(data: string): boolean[][] {
  // This is a placeholder implementation
  // In a real implementation, you would use the qrcode library or similar
  // For now, we create a simple pattern that looks like a QR code

  const matrix: boolean[][] = [];

  // Initialize with quiet zone and finder patterns
  for (let y = 0; y < QR_SIZE; y++) {
    matrix[y] = [];
    for (let x = 0; x < QR_SIZE; x++) {
      matrix[y][x] = false;
    }
  }

  // Add finder patterns (corners)
  addFinderPattern(matrix, 0, 0);
  addFinderPattern(matrix, QR_SIZE - 7, 0);
  addFinderPattern(matrix, 0, QR_SIZE - 7);

  // Add timing patterns
  for (let i = 8; i < QR_SIZE - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Add data (simplified encoding)
  // In a real implementation, this would properly encode the data
  let dataIndex = 0;
  for (let y = 8; y < QR_SIZE - 1 && dataIndex < data.length; y++) {
    for (let x = 8; x < QR_SIZE - 1 && dataIndex < data.length; x++) {
      if (!isReservedArea(x, y)) {
        matrix[y][x] = data.charCodeAt(dataIndex) % 2 === 1;
        dataIndex++;
      }
    }
  }

  return matrix;
}

/**
 * Add a finder pattern at the specified position
 */
function addFinderPattern(matrix: boolean[][], x: number, y: number): void {
  const pattern = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1],
  ];

  for (let dy = 0; dy < 7; dy++) {
    for (let dx = 0; dx < 7; dx++) {
      matrix[y + dy][x + dx] = pattern[dy][dx] === 1;
    }
  }
}

/**
 * Check if position is in a reserved area
 */
function isReservedArea(x: number, y: number): boolean {
  // Finder patterns
  if (x < 9 && y < 9) return true;
  if (x >= QR_SIZE - 8 && y < 9) return true;
  if (x < 9 && y >= QR_SIZE - 8) return true;
  // Timing patterns
  if (x === 6 || y === 6) return true;
  // Dark module
  if (x === 8 && y === QR_SIZE - 8) return true;

  return false;
}

/**
 * Encode QR code data to a string format
 */
export function encodeQRData(data: QRCodeData): string {
  switch (data.type) {
    case 'patient':
      return `PAT:${data.patientId || ''}:${data.patientChartNumber || ''}`;
    case 'medication':
      return `MED:${data.medicationId || ''}:${data.medicationName || ''}:${data.lotNumber || ''}`;
    case 'inventory':
      return `INV:${data.lotNumber || ''}:${data.expirationDate || ''}:${data.medicationName || ''}`;
    case 'url':
      return data.url || data.rawData || '';
    default:
      return data.rawData || '';
  }
}

/**
 * Decode QR code data from string
 */
export function decodeQRData(encoded: string): QRCodeData {
  if (encoded.startsWith('PAT:')) {
    const parts = encoded.split(':');
    return {
      type: 'patient',
      patientId: parts[1],
      patientChartNumber: parts[2],
    };
  } else if (encoded.startsWith('MED:')) {
    const parts = encoded.split(':');
    return {
      type: 'medication',
      medicationId: parts[1],
      medicationName: parts[2],
      lotNumber: parts[3],
    };
  } else if (encoded.startsWith('INV:')) {
    const parts = encoded.split(':');
    return {
      type: 'inventory',
      lotNumber: parts[1],
      expirationDate: parts[2],
      medicationName: parts[3],
    };
  } else {
    return {
      type: 'url',
      url: encoded,
      rawData: encoded,
    };
  }
}

/**
 * Draw a QR code on a PDF page
 */
export async function drawQRCodeOnPage(
  page: PDFPage,
  data: QRCodeData | string,
  x: number,
  y: number,
  size: number = 50
): Promise<void> {
  try {
    const encodedData = typeof data === 'string' ? data : encodeQRData(data);
    const matrix = generateQRMatrix(encodedData);

    const moduleSize = size / matrix.length;

    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix[row].length; col++) {
        if (matrix[row][col]) {
          page.drawRectangle({
            x: x + col * moduleSize,
            y: y - row * moduleSize,
            width: moduleSize,
            height: moduleSize,
            color: rgb(0, 0, 0),
          });
        }
      }
    }
  } catch (error) {
    log.error('[QRGenerator] Failed to draw QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate a standalone QR code PDF
 */
export async function generateQRCodePDF(
  data: QRCodeData | string,
  label?: string
): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([200, 250]);

    // Draw QR code
    await drawQRCodeOnPage(page, data, 75, 175, 100);

    // Draw label if provided
    if (label) {
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      page.drawText(label, {
        x: 100 - (label.length * 3),
        y: 40,
        font,
        size: 10,
      });
    }

    return await pdfDoc.save();
  } catch (error) {
    log.error('[QRGenerator] Failed to generate QR PDF:', error);
    throw new Error('Failed to generate QR code PDF');
  }
}

/**
 * Generate QR codes for multiple items
 */
export async function generateQRCodeSheet(
  items: Array<{ data: QRCodeData | string; label?: string }>
): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    const itemsPerPage = 6;
    let currentPage: PDFPage | null = null;
    let itemIndex = 0;

    const positions = [
      { x: 50, y: 700 },
      { x: 300, y: 700 },
      { x: 50, y: 450 },
      { x: 300, y: 450 },
      { x: 50, y: 200 },
      { x: 300, y: 200 },
    ];

    for (const item of items) {
      if (itemIndex % itemsPerPage === 0) {
        currentPage = pdfDoc.addPage([612, 792]);
      }

      if (currentPage) {
        const pos = positions[itemIndex % itemsPerPage];
        await drawQRCodeOnPage(currentPage, item.data, pos.x, pos.y, 80);

        if (item.label) {
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          currentPage.drawText(item.label, {
            x: pos.x,
            y: pos.y - 100,
            font,
            size: 10,
          });
        }
      }

      itemIndex++;
    }

    return await pdfDoc.save();
  } catch (error) {
    log.error('[QRGenerator] Failed to generate QR sheet:', error);
    throw new Error('Failed to generate QR code sheet');
  }
}

/**
 * Generate a patient wristband QR code
 */
export async function generatePatientWristbandQR(
  patientId: string,
  chartNumber: string,
  _patientName: string
): Promise<Uint8Array> {
  const data: QRCodeData = {
    type: 'patient',
    patientId,
    patientChartNumber: chartNumber,
  };

  return generateQRCodePDF(data, chartNumber);
}

/**
 * Generate a medication bottle QR code
 */
export async function generateMedicationBottleQR(
  medicationId: string,
  medicationName: string,
  lotNumber: string,
  _expirationDate: string
): Promise<Uint8Array> {
  const data: QRCodeData = {
    type: 'medication',
    medicationId,
    medicationName,
    lotNumber,
  };

  return generateQRCodePDF(data, `${medicationName} - ${lotNumber}`);
}

export default {
  generateQRMatrix,
  encodeQRData,
  decodeQRData,
  drawQRCodeOnPage,
  generateQRCodePDF,
  generateQRCodeSheet,
  generatePatientWristbandQR,
  generateMedicationBottleQR,
};
