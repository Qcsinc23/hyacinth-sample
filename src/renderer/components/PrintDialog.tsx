import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, Tag, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from './common/Button';

export type ReasonContext = 'treatment' | 'prevention' | 'prophylaxis' | 'pep' | 'prep' | 'other';

interface PrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: PrintDialogOptions) => void | Promise<void>;
  patientName: string;
  chartNumber: string;
  patientDateOfBirth?: string;
  medications: Array<{
    id: string;
    name: string;
    strength: string;
    quantity: number;
    unit: string;
    lotNumber?: string;
    expirationDate?: string;
    directions: string;
    warnings: string[];
    fullInstructions?: string[];
    context?: ReasonContext;
    indication?: string;
    daySupply?: number;
    prescribedBy?: string;
  }>;
}

export interface PrintDialogOptions {
  printLabels: boolean;
  printReceipt: boolean;
  copies: number;
  labelFormat: 'single' | 'avery5160';
  labelFormatPerMedication?: Record<string, 'single' | 'avery5160'>; // Allow different formats per medication
  preview: boolean;
  printerName?: string;
  showPreviews?: boolean; // Show actual data previews
}

// Context label mapping
const CONTEXT_LABELS: Record<ReasonContext, string> = {
  treatment: 'Treatment',
  prevention: 'Prevention',
  prophylaxis: 'Prophylaxis',
  pep: 'nPEP',
  prep: 'PrEP',
  other: 'Other',
};

// Context colors for badges
const CONTEXT_COLORS: Record<ReasonContext, string> = {
  treatment: 'bg-blue-100 text-blue-800 border-blue-300',
  prevention: 'bg-green-100 text-green-800 border-green-300',
  prophylaxis: 'bg-orange-100 text-orange-800 border-orange-300',
  pep: 'bg-red-100 text-red-800 border-red-300',
  prep: 'bg-purple-100 text-purple-800 border-purple-300',
  other: 'bg-gray-100 text-gray-800 border-gray-300',
};

export const PrintDialog: React.FC<PrintDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  patientName,
  chartNumber,
  patientDateOfBirth,
  medications,
}) => {
  const [options, setOptions] = useState<PrintDialogOptions>({
    printLabels: true,
    printReceipt: true,
    copies: 1,
    labelFormat: 'single',
    preview: false,
    showPreviews: true,
  });
  const [printers, setPrinters] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [labelFormatPerMed, setLabelFormatPerMed] = useState<Record<string, 'single' | 'avery5160'>>({});

  // Load available printers on mount
  useEffect(() => {
    if (isOpen) {
      loadPrinters();
      // Initialize per-medication formats to default
      const initialFormats: Record<string, 'single' | 'avery5160'> = {};
      medications.forEach(med => {
        initialFormats[med.id] = 'single';
      });
      setLabelFormatPerMed(initialFormats);
    }
  }, [isOpen, medications]);

  const loadPrinters = async () => {
    try {
      if (window.electron?.window?.getPrinters) {
        const availablePrinters = await window.electron.window.getPrinters();
        setPrinters(availablePrinters.map((p: any) => p.name || p));
      }
    } catch (error) {
      console.error('Failed to load printers:', error);
    }
  };

  const handleConfirm = () => {
    onConfirm({
      ...options,
      labelFormatPerMedication: labelFormatPerMed,
    });
  };

  const handlePreview = async () => {
    setIsLoading(true);
    try {
      await onConfirm({
        ...options,
        labelFormatPerMedication: labelFormatPerMed,
        preview: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePreview = () => {
    setOptions({ ...options, showPreviews: !options.showPreviews });
  };

  const updateMedicationFormat = (medId: string, format: 'single' | 'avery5160') => {
    setLabelFormatPerMed({
      ...labelFormatPerMed,
      [medId]: format,
    });
  };

  const getContextBadge = (context?: ReasonContext) => {
    if (!context) return null;
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded border ${CONTEXT_COLORS[context]}`}>
        {CONTEXT_LABELS[context]}
      </span>
    );
  };

  const renderLabelPreview = (med: typeof medications[0]) => {
    const format = labelFormatPerMed[med.id] || options.labelFormat;

    if (format === 'avery5160') {
      // Avery 5160 preview (smaller)
      return (
        <div className="border border-gray-300 rounded p-2 bg-white text-xs">
          <div className="font-bold text-sm">{patientName.toUpperCase()}</div>
          <div className="font-semibold text-xs">{med.name.toUpperCase()} {med.strength}</div>
          <div className="flex gap-1 my-1">
            {getContextBadge(med.context)}
          </div>
          <div className="text-gray-700 truncate">{med.directions}</div>
          <div className="text-gray-600 mt-1">
            Qty: {med.quantity} {med.unit} ({med.daySupply || 30}d) | Rx: DRX001
          </div>
          {med.lotNumber && (
            <div className="text-gray-500 text-xs mt-1">Lot: {med.lotNumber}</div>
          )}
          {med.warnings.length > 0 && (
            <div className="text-orange-500 absolute top-1 right-1">
              ⚠ ({med.warnings.length})
            </div>
          )}
        </div>
      );
    }

    // Single 4"x6" label preview
    return (
      <div className="border border-gray-300 rounded p-3 bg-white text-sm space-y-2">
        <div className="text-blue-700 font-semibold text-xs">HYACINTH HEALTH & WELLNESS CLINIC</div>
        <div className="border-b border-gray-200 pb-2">
          <div className="font-bold text-base">{patientName.toUpperCase()}</div>
          <div className="text-xs text-gray-600">Chart: {chartNumber}</div>
        </div>
        <div>
          <div className="font-semibold text-xs">Medication:</div>
          <div className="font-semibold">{med.name.toUpperCase()} {med.strength}</div>
          <div className="text-xs text-gray-600">Strength: {med.strength}</div>
        </div>
        <div>
          <div className="font-bold text-xs">Quantity: {med.quantity} {med.unit} ({med.daySupply || 30}-day supply)</div>
          <div className="text-xs">Rx #: DRX001</div>
        </div>
        <div>
          <div className="font-semibold text-xs">Directions:</div>
          <div className="text-xs">{med.directions}</div>
        </div>
        {med.indication && (
          <div>
            <div className="font-semibold text-xs">For:</div>
            <div className="text-xs">{med.indication}</div>
          </div>
        )}
        <div className="flex gap-1">
          {getContextBadge(med.context)}
        </div>
        {med.warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
            <div className="font-semibold text-xs text-yellow-800 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              IMPORTANT WARNINGS:
            </div>
            {med.warnings.map((warning, i) => (
              <div key={i} className="text-xs text-yellow-700 mt-1">• {warning}</div>
            ))}
          </div>
        )}
        {med.fullInstructions && med.fullInstructions.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2">
            <div className="font-semibold text-xs text-blue-800">PATIENT INSTRUCTIONS:</div>
            {med.fullInstructions.map((instruction, i) => (
              <div key={i} className="text-xs text-blue-700 mt-1">{instruction}</div>
            ))}
          </div>
        )}
        {med.prescribedBy && (
          <div className="text-xs text-gray-600 mt-2 border-t pt-2">
            Prescribed by: {med.prescribedBy}
          </div>
        )}
        {(med.lotNumber || med.expirationDate) && (
          <div className="text-xs text-gray-500 border-t pt-1">
            {med.lotNumber && <span>Lot: {med.lotNumber}</span>}
            {med.expirationDate && <span className="ml-2">Exp: {med.expirationDate}</span>}
          </div>
        )}
      </div>
    );
  };

  const renderReceiptPreview = () => {
    return (
      <div className="border border-gray-300 rounded p-3 bg-white text-xs space-y-2 max-h-64 overflow-y-auto">
        <div className="text-center border-b pb-2">
          <div className="font-bold text-sm text-blue-700">HYACINTH HEALTH & WELLNESS CLINIC</div>
          <div className="text-gray-600">(862) 240-1461</div>
          <div className="font-semibold mt-1">Rx #: DRX001</div>
        </div>

        <div className="border-b pb-2">
          <div className="font-semibold text-xs text-blue-700">PATIENT INFORMATION</div>
          <div className="font-bold">{patientName.toUpperCase()}</div>
          <div>Chart: {chartNumber}</div>
          {patientDateOfBirth && <div>DOB: {patientDateOfBirth}</div>}
        </div>

        {medications.map((med, i) => (
          <div key={med.id} className="border-l-2 border-blue-400 pl-2">
            <div className="font-semibold text-xs text-gray-500">MEDICATION {i + 1} OF {medications.length}</div>
            <div className="font-bold">{med.name.toUpperCase()} {med.strength}</div>
            <div className="flex gap-1 my-1">
              {getContextBadge(med.context)}
              <span className="text-xs font-semibold ml-auto">
                Qty: {med.quantity} {med.unit} ({med.daySupply || 30}d)
              </span>
            </div>
            <div className="font-semibold text-xs">DIRECTIONS:</div>
            <div className="text-xs">{med.directions}</div>
            {med.warnings.length > 0 && (
              <div className="mt-1">
                <div className="font-semibold text-xs text-orange-700 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  WARNINGS:
                </div>
                {med.warnings.map((warning, wi) => (
                  <div key={wi} className="text-xs text-orange-600">☐ {warning}</div>
                ))}
              </div>
            )}
            {med.fullInstructions && med.fullInstructions.length > 0 && (
              <div className="mt-1">
                <div className="font-semibold text-xs text-blue-700">PATIENT INSTRUCTIONS:</div>
                {med.fullInstructions.map((instruction, ii) => (
                  <div key={ii} className="text-xs text-blue-600">• {instruction}</div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="border-t pt-2 space-y-1">
          <div className="font-semibold text-xs text-blue-700">STAFF VERIFICATION</div>
          <div>Dispensed by: _________________</div>
          <div>Verified by: _________________</div>
        </div>

        <div className="border-t pt-2 space-y-1">
          <div className="font-semibold text-xs text-blue-700">PATIENT ACKNOWLEDGMENT</div>
          <div className="text-xs">
            I acknowledge that I have received the above medication(s) and have been
            informed of the proper use, potential side effects, and warnings.
          </div>
          <div>Signature: _________________ Date: _________________</div>
        </div>

        <div className="text-center pt-2 border-t">
          <div className="font-bold text-sm">Rx: DRX001</div>
          <div className="bg-green-50 border border-green-200 inline-block px-2 py-1 rounded text-xs font-semibold text-green-700">
            KEEP THIS FOR YOUR RECORDS
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Print Options</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={togglePreview}
              className="flex items-center gap-1 px-3 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
              title={options.showPreviews ? 'Hide Previews' : 'Show Previews'}
            >
              {options.showPreviews ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {options.showPreviews ? 'Hide' : 'Preview'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className={`grid ${options.showPreviews ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
            {/* Left Column - Options */}
            <div className="space-y-4">
              {/* Patient Info Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-blue-900">Patient Information</h3>
                </div>
                <div className="text-sm text-blue-800">
                  <div className="font-semibold">{patientName}</div>
                  <div className="text-xs">Chart: {chartNumber}</div>
                  {patientDateOfBirth && <div className="text-xs">DOB: {patientDateOfBirth}</div>}
                  <div className="text-xs">{medications.length} medication(s) to print</div>
                </div>
              </div>

              {/* Document Type Selection */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Documents to Print</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.printLabels}
                      onChange={(e) => setOptions({ ...options, printLabels: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <Tag className="h-5 w-5 text-blue-600" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">Medication Labels</span>
                      <p className="text-xs text-gray-500">Print {medications.length} label(s)</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.printReceipt}
                      onChange={(e) => setOptions({ ...options, printReceipt: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <FileText className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">Patient Receipt</span>
                      <p className="text-xs text-gray-500">Dispensing record for patient</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Label Format (if printing labels) */}
              {options.printLabels && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Default Label Format</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${
                      options.labelFormat === 'single' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}>
                      <input
                        type="radio"
                        name="labelFormat"
                        value="single"
                        checked={options.labelFormat === 'single'}
                        onChange={(e) => setOptions({ ...options, labelFormat: e.target.value as 'single' | 'avery5160' })}
                        className="h-4 w-4 text-blue-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">Single Labels</span>
                        <p className="text-xs text-gray-500">4" x 6" individual labels</p>
                      </div>
                    </label>

                    <label className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${
                      options.labelFormat === 'avery5160' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}>
                      <input
                        type="radio"
                        name="labelFormat"
                        value="avery5160"
                        checked={options.labelFormat === 'avery5160'}
                        onChange={(e) => setOptions({ ...options, labelFormat: e.target.value as 'single' | 'avery5160' })}
                        className="h-4 w-4 text-blue-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">Avery 5160</span>
                        <p className="text-xs text-gray-500">30 labels per sheet</p>
                      </div>
                    </label>
                  </div>

                  {/* Per-medication format selection */}
                  {medications.length > 1 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <h4 className="text-xs font-medium text-gray-600 mb-2">Per-Medication Format</h4>
                      <div className="space-y-2">
                        {medications.map(med => (
                          <div key={med.id} className="flex items-center gap-2">
                            <span className="text-xs flex-1 truncate">{med.name}</span>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`format-${med.id}`}
                                value="single"
                                checked={labelFormatPerMed[med.id] === 'single'}
                                onChange={() => updateMedicationFormat(med.id, 'single')}
                                className="h-3 w-3 text-blue-600"
                              />
                              <span className="text-xs">4x6</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`format-${med.id}`}
                                value="avery5160"
                                checked={labelFormatPerMed[med.id] === 'avery5160'}
                                onChange={() => updateMedicationFormat(med.id, 'avery5160')}
                                className="h-3 w-3 text-blue-600"
                              />
                              <span className="text-xs">Avery</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Copies */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Number of Copies</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setOptions({ ...options, copies: Math.max(1, options.copies - 1) })}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-medium text-lg">{options.copies}</span>
                  <button
                    onClick={() => setOptions({ ...options, copies: Math.min(10, options.copies + 1) })}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Printer Selection */}
              {printers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Printer</h3>
                  <select
                    value={options.printerName || ''}
                    onChange={(e) => setOptions({ ...options, printerName: e.target.value || undefined })}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                  >
                    <option value="">Default Printer</option>
                    {printers.map((printer) => (
                      <option key={printer} value={printer}>
                        {printer}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Warning Summary */}
              {medications.some(med => med.warnings.length > 0) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <h3 className="text-sm font-semibold text-yellow-900">Warnings Summary</h3>
                  </div>
                  <div className="text-xs text-yellow-800">
                    {medications.filter(med => med.warnings.length > 0).map(med => (
                      <div key={med.id} className="truncate">
                        {med.name}: {med.warnings.length} warning(s)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Previews */}
            {options.showPreviews && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 sticky top-0 bg-white py-2">Print Preview</h3>

                {/* Label Previews */}
                {options.printLabels && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 mb-2">MEDICATION LABELS</h4>
                    <div className="space-y-3">
                      {medications.map(med => (
                        <div key={med.id} className="relative">
                          {renderLabelPreview(med)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Receipt Preview */}
                {options.printReceipt && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 mb-2">PATIENT RECEIPT</h4>
                    {renderReceiptPreview()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {options.printLabels && <span>{medications.length} label(s)</span>}
            {options.printLabels && options.printReceipt && <span> • </span>}
            {options.printReceipt && <span>1 receipt</span>}
            <span> • {options.copies} copy(ies)</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handlePreview}
              isLoading={isLoading}
              leftIcon={<Eye className="h-4 w-4" />}
            >
              Preview
            </Button>
            <Button
              onClick={handleConfirm}
              isLoading={isLoading}
              leftIcon={<Printer className="h-4 w-4" />}
            >
              Print
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintDialog;
