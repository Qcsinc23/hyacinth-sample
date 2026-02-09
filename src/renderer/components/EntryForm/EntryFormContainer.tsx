import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PatientLookup } from './PatientLookup';
import { MedicationLineItem } from './MedicationLineItem';
import { ReasonSelector } from './ReasonSelector';
import { StaffPinEntry } from './StaffPinEntry';
import { FormActions } from './FormActions';
import { PrintDialog, PrintDialogOptions } from '../PrintDialog';
import { useForm } from '../../hooks/useForm';
import { useDatabase } from '../../hooks/useDatabase';
import { useInventory } from '../../hooks/useInventory';
import type {
  Patient,
  DispenseReason,
  DispensedMedication,
  DispenseRecord,
  ReasonContext,
  MedicationLineItem as MedicationLineItemType,
  LotValidationResult,
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import {
  DISPENSE_REASONS,
  MEDICATION_INSTRUCTION_TEMPLATES,
  findReasonConfig,
  getInstructionTemplate,
  normalizeMedicationId,
} from '../../data/medicationInstructions';
import { AlertTriangle } from 'lucide-react';

interface FormValues {
  patientId: string;
  notes: string;
  reasons: DispenseReason[];
}

interface MedicationLine {
  id: string;
  medicationId: string;
  lotId: string;
  amount: string;
  unit: string;
  // Enhanced fields for context-aware instructions
  instructionData?: {
    context: ReasonContext;
    indication: string;
    shortDosing: string;
    fullInstructions: string[];
    warnings: string[];
    daySupply: number;
    medicationStrength?: string;
  };
  lotValidation?: LotValidationResult;
  contextOverride?: ReasonContext; // Manual override for context
}

interface EntryFormContainerProps {
  onSubmitSuccess?: () => void;
  onViewPatientHistory?: (patient: Patient) => void;
}

export const EntryFormContainer: React.FC<EntryFormContainerProps> = ({ onSubmitSuccess, onViewPatientHistory }) => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [medicationLines, setMedicationLines] = useState<MedicationLine[]>([]);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New state for context-aware dispensing
  const [detectedContext, setDetectedContext] = useState<ReasonContext | null>(null);
  const [instructionDataMap, setInstructionDataMap] = useState<Map<string, MedicationLine['instructionData']>>(new Map());
  const [lotValidationResults, setLotValidationResults] = useState<Map<string, LotValidationResult>>(new Map());
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<{ contexts: ReasonContext[]; reasons: string[] } | null>(null);

  const { staff } = useAuth();
  const { saveDispenseRecord } = useDatabase();
  const { dispenseMedication, validateLotForDispensing, getMedicationById } = useInventory();

  const { values, setValue, reset: resetForm } = useForm<FormValues>({
    initialValues: {
      patientId: '',
      notes: '',
      reasons: [],
    },
    validate: (vals) => {
      const errors: Partial<Record<keyof FormValues, string>> = {};
      if (!selectedPatient) errors.patientId = 'Please select a patient';
      if (medicationLines.length === 0) errors.patientId = 'Please add at least one medication';
      if (vals.reasons.length === 0) errors.reasons = 'Please select at least one reason';
      return errors;
    },
  });

  const handlePatientSelect = (patient: Patient | null) => {
    setSelectedPatient(patient);
    if (patient) {
      setValue('patientId', patient.id);
    }
  };

  const handleAddMedication = () => {
    const newLine: MedicationLine = {
      id: Math.random().toString(36).substr(2, 9),
      medicationId: '',
      lotId: '',
      amount: '',
      unit: '',
    };
    setMedicationLines([...medicationLines, newLine]);
  };

  const handleRemoveMedication = (id: string) => {
    setMedicationLines(medicationLines.filter(line => line.id !== id));
  };

  const handleMedicationChange = async (id: string, field: keyof MedicationLine, value: string) => {
    const updatedLines = medicationLines.map(line =>
      line.id === id ? { ...line, [field]: value } : line
    );
    setMedicationLines(updatedLines);

    // Trigger validation if lot or amount changed
    if (field === 'lotId' || field === 'amount' || field === 'medicationId') {
      const line = updatedLines.find(l => l.id === id);
      if (line && line.medicationId && line.lotId) {
        const quantity = parseFloat(line.amount) || 0;
        await validateLot(id, line.medicationId, line.lotId, quantity);
      }
    }

    // Reload instructions if amount changed (affects day supply)
    if (field === 'amount' && detectedContext) {
      setTimeout(() => loadInstructionsForContext(detectedContext), 0);
    }
  };

  // Handle manual context override for a medication line
  const handleContextOverride = (lineId: string, context: ReasonContext) => {
    setMedicationLines(prev => prev.map(line =>
      line.id === lineId ? { ...line, contextOverride: context } : line
    ));
    if (detectedContext) {
      loadInstructionsForContext(detectedContext);
    }
  };

  const handleReasonsChange = (reasons: DispenseReason[]) => {
    setValue('reasons', reasons);

    // Detect context from reasons
    const detectedContexts = reasons
      .map(reason => findReasonConfig(reason)?.context)
      .filter((ctx): ctx is ReasonContext => ctx !== undefined);

    // Check for conflicting contexts (e.g., treatment + prevention)
    const uniqueContexts = Array.from(new Set(detectedContexts));

    if (uniqueContexts.length > 1) {
      // We have conflicting contexts
      setConflictDetails({
        contexts: uniqueContexts,
        reasons,
      });
      setShowConflictModal(true);
    } else if (uniqueContexts.length === 1) {
      // Single context detected
      setDetectedContext(uniqueContexts[0]);
    } else {
      // No context detected
      setDetectedContext(null);
    }

    // Load instructions for medications when context is determined
    if (detectedContexts.length === 1) {
      loadInstructionsForContext(detectedContexts[0]);
    }
  };

  // Load instructions for all medications based on detected context
  const loadInstructionsForContext = useCallback(async (context: ReasonContext) => {
    const newInstructionDataMap = new Map<string, MedicationLine['instructionData']>();

    for (const line of medicationLines) {
      if (line.medicationId && line.contextOverride) {
        // Use manual override if present
        const template = getInstructionTemplate(line.medicationId, line.contextOverride);
        if (template) {
          const quantity = parseFloat(line.amount) || 0;
          newInstructionDataMap.set(line.id, {
            context: template.context,
            indication: template.indication,
            shortDosing: template.shortDosing,
            fullInstructions: template.fullInstructions,
            warnings: template.warnings,
            daySupply: calculateDaySupply(quantity, template.daySupplyMultiplier),
            medicationStrength: template.strength,
          });
        }
      } else if (line.medicationId) {
        // Use detected context
        const normalizedMedId = normalizeMedicationId(line.medicationId);
        const template = getInstructionTemplate(normalizedMedId, context);
        if (template) {
          const quantity = parseFloat(line.amount) || 0;
          newInstructionDataMap.set(line.id, {
            context: template.context,
            indication: template.indication,
            shortDosing: template.shortDosing,
            fullInstructions: template.fullInstructions,
            warnings: template.warnings,
            daySupply: calculateDaySupply(quantity, template.daySupplyMultiplier),
            medicationStrength: template.strength,
          });
        }
      }
    }

    setInstructionDataMap(newInstructionDataMap);
  }, [medicationLines]);

  // Calculate day supply based on quantity and multiplier
  const calculateDaySupply = (quantity: number, multiplier: number): number => {
    if (quantity <= 0 || multiplier <= 0) return 0;
    return Math.round(quantity / multiplier) * multiplier >= quantity
      ? Math.round(quantity / multiplier)
      : Math.round(quantity / multiplier) + 1;
  };

  // Validate lot when medication and lot are selected
  const validateLot = useCallback(async (lineId: string, medicationId: string, lotId: string, quantity: number) => {
    if (!lotId || !medicationId) {
      setLotValidationResults(prev => {
        const newMap = new Map(prev);
        newMap.delete(lineId);
        return newMap;
      });
      return;
    }

    const validationResult = validateLotForDispensing(lotId, quantity);
    setLotValidationResults(prev => new Map(prev).set(lineId, validationResult));
  }, [validateLotForDispensing]);

  // Context resolution handler for conflicts
  const handleContextResolution = (selectedContext: ReasonContext) => {
    setDetectedContext(selectedContext);
    setShowConflictModal(false);
    loadInstructionsForContext(selectedContext);
  };

  // Load instructions when context changes or medication lines change
  useEffect(() => {
    if (detectedContext && medicationLines.length > 0) {
      loadInstructionsForContext(detectedContext);
    }
  }, [detectedContext, medicationLines.length]); // Only re-run when these specific values change

  // Validate lots when medication/lot selection changes
  useEffect(() => {
    medicationLines.forEach(line => {
      if (line.medicationId && line.lotId) {
        const quantity = parseFloat(line.amount) || 0;
        validateLot(line.id, line.medicationId, line.lotId, quantity);
      }
    });
  }, [medicationLines.map(l => `${l.medicationId}-${l.lotId}-${l.amount}`).join(','), validateLot]);

  const handleSave = async (shouldPrint: boolean = false) => {
    if (!selectedPatient || !staff) return;

    // Validate medication lines are complete
    const incompleteLine = medicationLines.find(line =>
      !line.medicationId || !line.lotId || !line.amount || parseFloat(line.amount) <= 0
    );

    if (incompleteLine) {
      alert('Please complete all medication entries');
      return;
    }

    // Validate all lots before proceeding
    const lotValidationErrors: string[] = [];
    for (const line of medicationLines) {
      const validation = lotValidationResults.get(line.id);
      if (!validation || !validation.valid) {
        lotValidationErrors.push(
          validation?.errors.join(', ') || `Lot validation failed for medication`
        );
      }
    }

    if (lotValidationErrors.length > 0) {
      alert(`Cannot dispense due to lot validation errors:\n\n${lotValidationErrors.join('\n')}`);
      return;
    }

    // Check for expired lots
    for (const [lineId, validation] of lotValidationResults.entries()) {
      if (validation.errors.some(err => err.includes('expired'))) {
        alert('Cannot dispense expired medications. Please select a different lot.');
        return;
      }
    }

    setShowPinEntry(true);
  };

  const handlePinVerified = async () => {
    if (!selectedPatient || !staff) return;

    setIsSubmitting(true);
    setShowPinEntry(false);

    try {
      // Fetch medication details for each line
      const dispensedMedications: DispensedMedication[] = [];

      for (const line of medicationLines) {
        const medication = await getMedicationById(line.medicationId);
        const lotInfo = lotValidationResults.get(line.id)?.lot;
        const instructionData = instructionDataMap.get(line.id);

        dispensedMedications.push({
          id: Math.random().toString(36).substr(2, 9),
          medicationId: line.medicationId,
          medicationName: medication?.name || line.medicationId,
          lotId: line.lotId,
          lotNumber: lotInfo?.lotNumber || line.lotId,
          amount: parseFloat(line.amount),
          unit: line.unit,
          expirationDate: lotInfo?.expirationDate || new Date(),
          // Enhanced fields
          instructionContext: instructionData ? {
            context: instructionData.context,
            indication: instructionData.indication,
            medicationId: line.medicationId,
            priority: 1,
          } : undefined,
          daySupply: instructionData?.daySupply,
          medicationStrength: instructionData?.medicationStrength,
          warnings: instructionData?.warnings,
          instructions: instructionData?.fullInstructions,
        });
      }

      const record: Omit<DispenseRecord, 'id'> = {
        patientId: selectedPatient.id,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        patientChartNumber: selectedPatient.chartNumber,
        medications: dispensedMedications,
        reasons: values.reasons,
        notes: values.notes,
        dispensedBy: staff.id,
        dispensedByName: staff.name,
        dispensedAt: new Date(),
        status: 'active',
      };

      await saveDispenseRecord(record);

      // Deduct from inventory
      for (const line of medicationLines) {
        await dispenseMedication(line.medicationId, line.lotId, parseFloat(line.amount));
      }

      // Show print dialog after successful save
      setShowPrintDialog(true);

      // Don't reset form yet - wait for print dialog
      setIsSubmitting(false);
    } catch (error) {
      console.error('Failed to save record:', error);
      alert('Failed to save dispensing record. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handlePrintConfirm = async (options: PrintDialogOptions) => {
    if (!selectedPatient || !staff) return;

    try {
      const rxNumber = `RX${Date.now().toString().slice(-8)}`;
      const dispenseDate = new Date().toLocaleDateString();

      // Generate label data with instruction information
      if (options.printLabels && window.electron?.print?.label) {
        for (const line of medicationLines) {
          const instructionData = instructionDataMap.get(line.id);
          const lotValidation = lotValidationResults.get(line.id);
          const medication = await getMedicationById(line.medicationId);

          const labelData = {
            patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
            patientChartNumber: selectedPatient.chartNumber,
            medicationName: medication?.name || line.medicationId,
            medicationStrength: instructionData?.medicationStrength || medication?.strength || '',
            quantity: parseFloat(line.amount),
            unit: line.unit,
            daySupply: instructionData?.daySupply || 30,
            directions: instructionData?.shortDosing || 'Take as directed',
            indication: instructionData?.indication || 'As prescribed',
            prescribedBy: 'Dr. Provider',
            dispenseDate,
            rxNumber,
            warnings: instructionData?.warnings || ['Take as directed'],
            lotNumber: lotValidation?.lot?.lotNumber || line.lotId,
            lotExpiration: lotValidation?.lot?.expirationDate?.toLocaleDateString(),
            context: instructionData?.context,
          };

          await window.electron.print.label(labelData, {
            labelFormat: options.labelFormat,
            copies: options.copies,
            preview: options.preview,
            printerName: options.printerName,
          });
        }
      }

      // Generate receipt with full instruction data
      if (options.printReceipt && window.electron?.print?.receipt) {
        const receiptData = {
          receiptNumber: rxNumber,
          patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
          patientChartNumber: selectedPatient.chartNumber,
          patientDob: selectedPatient.dateOfBirth.toLocaleDateString(),
          medications: medicationLines.map(line => {
            const instructionData = instructionDataMap.get(line.id);
            const lotValidation = lotValidationResults.get(line.id);
            const medication = getMedicationById(line.medicationId);

            return {
              name: medication?.name || line.medicationId,
              strength: instructionData?.medicationStrength || medication?.strength || '',
              quantity: parseFloat(line.amount),
              unit: line.unit,
              lotNumber: lotValidation?.lot?.lotNumber || line.lotId,
              directions: instructionData?.shortDosing || 'Take as directed',
              fullInstructions: instructionData?.fullInstructions || [],
              warnings: instructionData?.warnings || [],
              daySupply: instructionData?.daySupply,
              indication: instructionData?.indication,
              context: instructionData?.context,
            };
          }),
          dispensedBy: staff.name,
          dispensedAt: new Date(),
          clinicName: 'Hyacinth Health & Wellness Clinic',
          clinicPhone: '(862) 240-1461',
          notes: values.notes,
          reasons: values.reasons,
        };

        await window.electron.print.receipt(receiptData, {
          copies: options.copies,
          preview: options.preview,
          printerName: options.printerName,
        });
      }

      // Reset form after printing
      setSelectedPatient(null);
      setMedicationLines([]);
      setInstructionDataMap(new Map());
      setLotValidationResults(new Map());
      setDetectedContext(null);
      resetForm();
      setShowPrintDialog(false);

      onSubmitSuccess?.();
    } catch (error) {
      console.error('Print failed:', error);
      alert('Some print jobs may have failed. Please check the print queue.');
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to clear the form?')) {
      setSelectedPatient(null);
      setMedicationLines([]);
      setInstructionDataMap(new Map());
      setLotValidationResults(new Map());
      setDetectedContext(null);
      setShowConflictModal(false);
      setConflictDetails(null);
      resetForm();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">New Dispensing Entry</h2>
          <p className="text-sm text-gray-500 mt-1">Record medication dispensing for a patient</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Patient Lookup */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Patient Information</h3>
            <PatientLookup
              selectedPatient={selectedPatient}
              onSelect={handlePatientSelect}
              enableBarcodeScan={true}
              onViewHistory={onViewPatientHistory}
              showLastDispensed={true}
            />
          </section>

          {/* Medication Lines */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-700">Medications</h3>
              <button
                type="button"
                onClick={handleAddMedication}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Medication
              </button>
            </div>

            <div className="space-y-3">
              {medicationLines.map((line, index) => (
                <MedicationLineItem
                  key={line.id}
                  index={index}
                  line={line}
                  onChange={(field, value) => handleMedicationChange(line.id, field, value)}
                  onRemove={() => handleRemoveMedication(line.id)}
                  instructionData={instructionDataMap.get(line.id)}
                  lotValidation={lotValidationResults.get(line.id)}
                  detectedContext={detectedContext}
                  onContextOverride={(ctx) => handleContextOverride(line.id, ctx)}
                />
              ))}
              {medicationLines.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-500">No medications added yet</p>
                  <button
                    type="button"
                    onClick={handleAddMedication}
                    className="text-blue-600 hover:text-blue-700 font-medium mt-1"
                  >
                    Add your first medication
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Reasons */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Dispensing Reason</h3>
            <ReasonSelector
              selectedReasons={values.reasons}
              onChange={handleReasonsChange}
            />
          </section>

          {/* Notes */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Notes</h3>
            <textarea
              value={values.notes}
              onChange={(e) => setValue('notes', e.target.value)}
              placeholder="Add any additional notes about this dispensing..."
              rows={3}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
            />
          </section>
        </div>

        {/* Form Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <FormActions
            onSaveAndPrint={() => handleSave(true)}
            onSaveOnly={() => handleSave(false)}
            onReset={handleReset}
            isLoading={isSubmitting}
            isValid={selectedPatient !== null && medicationLines.length > 0 && values.reasons.length > 0}
          />
        </div>
      </div>

      {/* PIN Entry Modal */}
      {showPinEntry && (
        <StaffPinEntry
          onVerify={handlePinVerified}
          onCancel={() => setShowPinEntry(false)}
        />
      )}

      {/* Print Dialog */}
      {showPrintDialog && selectedPatient && staff && (
        <PrintDialog
          isOpen={showPrintDialog}
          onClose={() => {
            setShowPrintDialog(false);
            // Reset form even if they close without printing
            setSelectedPatient(null);
            setMedicationLines([]);
            resetForm();
            onSubmitSuccess?.();
          }}
          onConfirm={handlePrintConfirm}
          patientName={`${selectedPatient.firstName} ${selectedPatient.lastName}`}
          chartNumber={selectedPatient.chartNumber}
          medications={medicationLines.map(line => {
            const instructionData = instructionDataMap.get(line.id);
            return {
              name: instructionData?.medicationStrength ? `${line.medicationId} (${instructionData.medicationStrength})` : line.medicationId,
              strength: instructionData?.medicationStrength || '',
              quantity: parseFloat(line.amount),
              unit: line.unit,
              lotNumber: line.lotId,
              directions: instructionData?.shortDosing || 'Take as directed',
              warnings: instructionData?.warnings || [],
              daySupply: instructionData?.daySupply,
            };
          })}
        />
      )}

      {/* Context Conflict Modal */}
      {showConflictModal && conflictDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Conflicting Dispense Contexts Detected
                </h3>
                <p className="text-sm text-gray-600 mt-2">
                  You have selected reasons that indicate different treatment contexts. This may affect the instructions that are displayed.
                </p>
                <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                  <p className="text-sm font-medium text-amber-800">Detected Contexts:</p>
                  <ul className="mt-2 space-y-1">
                    {conflictDetails.contexts.map(ctx => (
                      <li key={ctx} className="text-sm text-amber-700">
                        • {ctx === 'treatment' && 'Treatment - for existing infections'}
                        {ctx === 'prevention' && 'Prevention - for STI prevention'}
                        {ctx === 'prophylaxis' && 'Prophylaxis - for infection prevention'}
                        {ctx === 'pep' && 'PEP - Post-Exposure Prophylaxis'}
                        {ctx === 'prep' && 'PrEP - Pre-Exposure Prophylaxis'}
                        {ctx === 'other' && 'Other - general dispensing'}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  Please select the primary context to use for instruction templates:
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {conflictDetails.contexts.map(ctx => (
                    <button
                      key={ctx}
                      onClick={() => handleContextResolution(ctx)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      {ctx === 'treatment' && 'Treatment'}
                      {ctx === 'prevention' && 'Prevention'}
                      {ctx === 'prophylaxis' && 'Prophylaxis'}
                      {ctx === 'pep' && 'PEP'}
                      {ctx === 'prep' && 'PrEP'}
                      {ctx === 'other' && 'Other'}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setShowConflictModal(false);
                      setConflictDetails(null);
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntryFormContainer;
