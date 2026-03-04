import React, { useState, useEffect, useCallback } from 'react';
import { PatientLookup } from './PatientLookup';
import { MedicationLineItem } from './MedicationLineItem';
import { ReasonSelector } from './ReasonSelector';
import { StaffPinEntry } from './StaffPinEntry';
import { InstructionPreviewCard } from './InstructionPreviewCard';
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
  LotValidationResult,
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import {
  findReasonConfig,
  normalizeMedicationId,
} from '../../data/medicationInstructions';
import { getInstructionPriority } from '../../data/reasonInstructionMapping';
import { ChevronLeft, ChevronRight, Check, User, Pill, FileText } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  contextOverride?: ReasonContext;
  /** User overrides - flow to printed label */
  customDirections?: string;
  customQuantity?: number;
}

interface InstructionTemplate {
  context: ReasonContext;
  indication: string;
  shortDosing: string;
  fullInstructions: string[] | string;
  warnings: string[] | string;
  daySupplyCalculation?: string;
  strength?: string;
}

interface EntryFormContainerProps {
  onSubmitSuccess?: () => void;
  onViewPatientHistory?: (patient: Patient) => void;
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

type Step = 'patient' | 'medications' | 'reason' | 'review';

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'patient', label: 'Patient', icon: <User className="h-4 w-4" /> },
  { key: 'medications', label: 'Medications', icon: <Pill className="h-4 w-4" /> },
  { key: 'reason', label: 'Reason & Notes', icon: <FileText className="h-4 w-4" /> },
  { key: 'review', label: 'Review', icon: <Check className="h-4 w-4" /> },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const EntryFormContainer: React.FC<EntryFormContainerProps> = ({
  onSubmitSuccess,
  onViewPatientHistory,
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('patient');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [medicationLines, setMedicationLines] = useState<MedicationLine[]>([]);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Context-aware state
  const [detectedContext, setDetectedContext] = useState<ReasonContext | null>(null);
  const [instructionDataMap, setInstructionDataMap] = useState<Map<string, MedicationLine['instructionData']>>(new Map());
  const [lotValidationResults, setLotValidationResults] = useState<Map<string, LotValidationResult>>(new Map());
  const [selectedMedicationName, setSelectedMedicationName] = useState<string | undefined>(undefined);

  const { staff } = useAuth();
  const { saveDispenseRecord } = useDatabase();
  const { inventory, dispenseMedication, validateLotForDispensing, getMedicationById } = useInventory();

  const { values, setValue, reset: resetForm } = useForm<FormValues>({
    initialValues: { patientId: '', notes: '', reasons: [] },
    validate: (vals) => {
      const errors: Partial<Record<keyof FormValues, string>> = {};
      if (!selectedPatient) errors.patientId = 'Please select a patient';
      if (medicationLines.length === 0) errors.patientId = 'Please add at least one medication';
      if (vals.reasons.length === 0) errors.reasons = 'Please select at least one reason';
      return errors;
    },
  });

  // ---------------------------------------------------------------------------
  // Step navigation helpers
  // ---------------------------------------------------------------------------

  const stepIndex = STEPS.findIndex(s => s.key === currentStep);

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 'patient':
        return selectedPatient !== null;
      case 'medications':
        return medicationLines.length > 0 && medicationLines.every(
          l => l.medicationId && l.lotId && l.amount && parseFloat(l.amount) > 0
        );
      case 'reason':
        return values.reasons.length > 0;
      case 'review':
        return false; // last step
      default:
        return false;
    }
  };

  const goNext = () => {
    const idx = stepIndex;
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1].key);
    }
  };

  const goBack = () => {
    const idx = stepIndex;
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1].key);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers (preserved from original logic)
  // ---------------------------------------------------------------------------

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
    // Use functional updater to avoid stale-closure when multiple fields
    // are updated in quick succession (e.g. medicationId + lotId + unit)
    setMedicationLines(prev =>
      prev.map(line => (line.id === id ? { ...line, [field]: value } : line))
    );

    // Update selected medication name
    if (field === 'medicationId') {
      if (value) {
        try {
          const medication = await getMedicationById(value);
          setSelectedMedicationName(medication?.name);
        } catch {
          setSelectedMedicationName(undefined);
        }
      } else {
        // Check remaining lines for a medication
        setMedicationLines(prev => {
          const firstMedLine = prev.find(l => l.medicationId);
          if (firstMedLine) {
            getMedicationById(firstMedLine.medicationId)
              .then(med => setSelectedMedicationName(med?.name))
              .catch(() => setSelectedMedicationName(undefined));
          } else {
            setSelectedMedicationName(undefined);
          }
          return prev; // no mutation, just reading
        });
      }
    }

    // Trigger lot validation -- read latest state via functional access
    if (field === 'lotId' || field === 'amount' || field === 'medicationId') {
      setTimeout(() => {
        setMedicationLines(prev => {
          const line = prev.find(l => l.id === id);
          if (line && line.medicationId && line.lotId) {
            const quantity = parseFloat(line.amount) || 0;
            validateLot(id, line.medicationId, line.lotId, quantity);
          }
          return prev; // no mutation
        });
      }, 0);
    }

    // Load instructions when context and medication exist
    if (field === 'medicationId' && value && detectedContext) {
      setTimeout(() => loadInstructionsForContext(detectedContext, values.reasons), 100);
    }
    if (field === 'amount' && detectedContext) {
      setTimeout(() => loadInstructionsForContext(detectedContext, values.reasons), 0);
    }
  };

  /**
   * Batch-update multiple fields on a medication line in a single state update.
   * Prevents stale-closure when MedicationSelector sets medId + lotId + unit together.
   */
  const handleBatchMedicationChange = async (id: string, updates: Partial<Record<'medicationId' | 'lotId' | 'amount' | 'unit', string>>) => {
    setMedicationLines(prev =>
      prev.map(line => (line.id === id ? { ...line, ...updates } : line))
    );

    // Update selected medication name
    if (updates.medicationId !== undefined) {
      if (updates.medicationId) {
        try {
          const medication = await getMedicationById(updates.medicationId);
          setSelectedMedicationName(medication?.name);
        } catch {
          setSelectedMedicationName(undefined);
        }
      } else {
        setSelectedMedicationName(undefined);
      }
    }

    // Trigger lot validation
    if (updates.lotId || updates.amount || updates.medicationId) {
      setTimeout(() => {
        setMedicationLines(prev => {
          const line = prev.find(l => l.id === id);
          if (line && line.medicationId && line.lotId) {
            const quantity = parseFloat(line.amount) || 0;
            validateLot(id, line.medicationId, line.lotId, quantity);
          }
          return prev;
        });
      }, 0);
    }

    // Load instructions when context and medication exist
    if (updates.medicationId && detectedContext) {
      setTimeout(() => loadInstructionsForContext(detectedContext, values.reasons), 100);
    }
  };

  const handleReasonsChange = async (reasons: DispenseReason[]) => {
    setValue('reasons', reasons);

    const detectedContexts = reasons
      .map(reason => findReasonConfig(reason)?.context)
      .filter((ctx): ctx is ReasonContext => ctx !== undefined);

    const uniqueContexts = Array.from(new Set(detectedContexts));

    if (uniqueContexts.length >= 1) {
      const newContext = uniqueContexts[0];
      setDetectedContext(newContext);
      await loadInstructionsForContext(newContext, reasons);
    } else {
      setDetectedContext(null);
    }
  };

  // Pick best reason for a medication (reason that lists this med in instructionPriority)
  const pickBestReasonForMedication = useCallback(
    (medicationName: string, reasons: DispenseReason[]): string | undefined => {
      if (reasons.length === 0) return undefined;
      const normId = normalizeMedicationId(medicationName);
      for (const r of reasons) {
        const priority = getInstructionPriority(r);
        if (priority.some((p) => normalizeMedicationId(p) === normId)) return r;
      }
      return reasons[0];
    },
    [],
  );

  // Load instructions for all medications based on detected context and selected reasons
  const loadInstructionsForContext = useCallback(
    async (context: ReasonContext, reasons: DispenseReason[] = []) => {
      const newInstructionDataMap = new Map<string, MedicationLine['instructionData']>();

      for (const line of medicationLines) {
        if (!line.medicationId) continue;
        try {
          const medication = await getMedicationById(line.medicationId);
          if (!medication) continue;
          const useContext = line.contextOverride || context;
          const reason = pickBestReasonForMedication(medication.name, reasons);

          if (window.electron?.instruction?.getTemplateForMedication && useContext) {
            const templateRaw = await window.electron.instruction.getTemplateForMedication(
              medication.name,
              useContext,
              reason,
            );
            const template = templateRaw as InstructionTemplate | null;
            if (template) {
              const fullInstructions = typeof template.fullInstructions === 'string'
                ? JSON.parse(template.fullInstructions)
                : Array.isArray(template.fullInstructions)
                ? template.fullInstructions
                : [];
              const warnings = typeof template.warnings === 'string'
                ? JSON.parse(template.warnings)
                : Array.isArray(template.warnings)
                ? template.warnings
                : [];
              const quantity = parseFloat(line.amount) || 0;
              const daySupplyMultiplier = parseDaySupplyMultiplier(template.daySupplyCalculation || '');
              const daySupply = quantity > 0 && daySupplyMultiplier > 0
                ? Math.round(quantity / daySupplyMultiplier)
                : 0;

              newInstructionDataMap.set(line.id, {
                context: template.context,
                indication: template.indication,
                shortDosing: template.shortDosing,
                fullInstructions,
                warnings,
                daySupply,
                medicationStrength: template.strength || undefined,
              });
            }
          }
        } catch (error) {
          console.error(`Failed to load instructions for medication ${line.medicationId}:`, error);
        }
      }
    setInstructionDataMap(newInstructionDataMap);
  }, [medicationLines, getMedicationById, pickBestReasonForMedication]);

  const parseDaySupplyMultiplier = (calculation: string): number => {
    if (!calculation) return 1;
    const match = calculation.match(/(\d+(?:\.\d+)?)\s*(?:tablet|cap|pill|dose|unit).*?(?:per|\/)\s*day/i);
    if (match) return parseFloat(match[1]);
    const numMatch = calculation.match(/(\d+(?:\.\d+)?)/);
    return numMatch ? parseFloat(numMatch[1]) : 1;
  };

  const validateLot = useCallback(async (lineId: string, medicationId: string, lotId: string, quantity: number) => {
    if (!lotId || !medicationId) {
      setLotValidationResults(prev => { const m = new Map(prev); m.delete(lineId); return m; });
      return;
    }
    const validationResult = validateLotForDispensing(lotId, quantity);
    setLotValidationResults(prev => new Map(prev).set(lineId, validationResult));
  }, [validateLotForDispensing]);

  // Re-validate lots on change
  useEffect(() => {
    medicationLines.forEach(line => {
      if (line.medicationId && line.lotId) {
        const quantity = parseFloat(line.amount) || 0;
        validateLot(line.id, line.medicationId, line.lotId, quantity);
      }
    });
  }, [medicationLines.map(l => `${l.medicationId}-${l.lotId}-${l.amount}`).join(','), validateLot]);

  // Load instructions when context, reasons, or lines change
  useEffect(() => {
    if (detectedContext && medicationLines.length > 0) {
      loadInstructionsForContext(detectedContext, values.reasons);
    }
  }, [detectedContext, medicationLines.length, values.reasons, loadInstructionsForContext]);

  // ---------------------------------------------------------------------------
  // Submit flow
  // ---------------------------------------------------------------------------

  const handleSave = async () => {
    if (!selectedPatient || !staff) return;

    const incompleteLine = medicationLines.find(
      line => !line.medicationId || !line.lotId || !line.amount || parseFloat(line.amount) <= 0
    );
    if (incompleteLine) {
      alert('Please complete all medication entries');
      return;
    }

    // Validate lots
    const lotErrors: string[] = [];
    for (const line of medicationLines) {
      const v = lotValidationResults.get(line.id);
      if (!v || !v.valid) {
        lotErrors.push(v?.errors.join(', ') || 'Lot validation failed');
      }
    }
    if (lotErrors.length > 0) {
      alert(`Cannot dispense:\n\n${lotErrors.join('\n')}`);
      return;
    }

    setShowPinEntry(true);
  };

  const handlePinVerified = async () => {
    if (!selectedPatient || !staff) return;
    setIsSubmitting(true);
    setShowPinEntry(false);

    try {
      const dispensedMedications: DispensedMedication[] = [];
      for (const line of medicationLines) {
        const medication = await getMedicationById(line.medicationId);
        const lotInfo = lotValidationResults.get(line.id)?.lot;
        const instrData = instructionDataMap.get(line.id);

        dispensedMedications.push({
          id: Math.random().toString(36).substr(2, 9),
          medicationId: line.medicationId,
          medicationName: medication?.name || line.medicationId,
          lotId: line.lotId,
          lotNumber: lotInfo?.lotNumber || line.lotId,
          amount: parseFloat(line.amount),
          unit: line.unit,
          expirationDate: lotInfo?.expirationDate || new Date(),
          instructionContext: instrData ? {
            context: instrData.context,
            indication: instrData.indication,
            medicationId: line.medicationId,
            priority: 1,
          } : undefined,
          daySupply: instrData?.daySupply,
          medicationStrength: instrData?.medicationStrength,
          warnings: instrData?.warnings,
          instructions: instrData?.fullInstructions,
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
        status: 'completed',
      };

      await saveDispenseRecord(record);
      for (const line of medicationLines) {
        await dispenseMedication(line.medicationId, line.lotId, parseFloat(line.amount));
      }

      setShowPrintDialog(true);
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

      const buildLabelData = async (line: (typeof medicationLines)[0]) => {
        const instrData = instructionDataMap.get(line.id);
        const lotVal = lotValidationResults.get(line.id);
        const medication = await getMedicationById(line.medicationId);
        return {
          patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
          patientChartNumber: selectedPatient.chartNumber,
          medicationName: medication?.name || line.medicationId,
          medicationStrength: instrData?.medicationStrength || medication?.strength || '',
          dosageForm: medication?.dosageForm,
          quantity: (line.customQuantity ?? parseFloat(line.amount)) || 1,
          unit: line.unit,
          daySupply: instrData?.daySupply || 30,
          directions: (line.customDirections ?? instrData?.shortDosing) || 'Take as directed',
          indication: instrData?.indication || 'As prescribed',
          prescribedBy: staff?.name || 'Attending Clinician',
          dispenseDate: new Date().toLocaleDateString(),
          rxNumber,
          warnings: instrData?.warnings || ['Take as directed'],
          fullWarnings: instrData?.warnings || ['Take as directed'],
          lotNumber: lotVal?.lot?.lotNumber || line.lotId,
          expirationDate: lotVal?.lot?.expirationDate?.toLocaleDateString(),
          instructionContext: instrData?.context || 'treatment',
        };
      };

      const printOpts = {
        copies: options.copies,
        preview: options.preview,
        printerName: options.printerName,
      };

      if (options.printLabels && (window.electron?.print?.label || window.electron?.print?.labelSheet)) {
        const formatOf = (lineId: string) =>
          options.labelFormatPerMedication?.[lineId] ?? options.labelFormat;

        const averyLines = medicationLines.filter((l) => formatOf(l.id) === 'avery5160');
        const singleLines = medicationLines.filter((l) => formatOf(l.id) === 'single');

        if (averyLines.length > 0 && window.electron?.print?.labelSheet) {
          const averyLabels = await Promise.all(averyLines.map(buildLabelData));
          const result = await window.electron.print.labelSheet(averyLabels, {
            ...printOpts,
            labelFormat: 'avery5160',
          });
          if (result && typeof result === 'object' && (result as { success?: boolean }).success === false) {
            throw new Error((result as { error?: string }).error ?? 'Label sheet failed');
          }
        }

        for (const line of singleLines) {
          if (window.electron?.print?.label) {
            const labelData = await buildLabelData(line);
            await window.electron.print.label(labelData, {
              ...printOpts,
              labelFormat: 'single',
            });
          }
        }
      }

      if (options.printReceipt && window.electron?.print?.receipt) {
        await window.electron.print.receipt(
          {
            receiptNumber: rxNumber,
            patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
            patientChartNumber: selectedPatient.chartNumber,
            patientDob: selectedPatient.dateOfBirth.toLocaleDateString(),
            medications: medicationLines.map(line => {
              const instrData = instructionDataMap.get(line.id);
              const lotVal = lotValidationResults.get(line.id);
              return {
                name: line.medicationId,
                strength: instrData?.medicationStrength || '',
                quantity: (line.customQuantity ?? parseFloat(line.amount)) || 1,
                unit: line.unit,
                lotNumber: lotVal?.lot?.lotNumber || line.lotId,
                directions: (line.customDirections ?? instrData?.shortDosing) || 'Take as directed',
                fullInstructions: instrData?.fullInstructions || [],
                warnings: instrData?.warnings || [],
                daySupply: instrData?.daySupply,
                indication: instrData?.indication,
                context: instrData?.context,
              };
            }),
            dispensedBy: staff.name,
            dispensedAt: new Date(),
            clinicName: 'Hyacinth Health & Wellness Clinic',
            clinicPhone: '(862) 240-1461',
            notes: values.notes,
            reasons: values.reasons,
          },
          { copies: options.copies, preview: options.preview, printerName: options.printerName }
        );
      }

      // Reset and close only when actually printing (not preview)
      if (!options.preview) {
        handleFullReset();
        setShowPrintDialog(false);
        onSubmitSuccess?.();
      }
    } catch (error) {
      console.error('Print failed:', error);
      alert(options.preview ? 'Preview failed. Please try again.' : 'Some print jobs may have failed. Check the print queue.');
    }
  };

  const handleFullReset = () => {
    setSelectedPatient(null);
    setMedicationLines([]);
    setInstructionDataMap(new Map());
    setLotValidationResults(new Map());
    setDetectedContext(null);
    setSelectedMedicationName(undefined);
    setCurrentStep('patient');
    resetForm();
  };

  const handleReset = () => {
    if (confirm('Clear the entire form and start over?')) {
      handleFullReset();
    }
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-6">
      {STEPS.map((step, idx) => {
        const isActive = step.key === currentStep;
        const isCompleted = idx < stepIndex;
        return (
          <React.Fragment key={step.key}>
            {idx > 0 && (
              <div className={`flex-1 h-px mx-2 ${isCompleted ? 'bg-blue-500' : 'bg-gray-200'}`} />
            )}
            <button
              type="button"
              onClick={() => {
                // Allow clicking completed steps to go back
                if (idx <= stepIndex) setCurrentStep(step.key);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : isCompleted
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-400'
              }`}
              disabled={idx > stepIndex}
            >
              {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.icon}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );

  const renderPatientStep = () => (
    <section>
      <h3 className="text-sm font-medium text-gray-700 mb-3">Search or scan a patient</h3>
      <PatientLookup
        selectedPatient={selectedPatient}
        onSelect={handlePatientSelect}
        enableBarcodeScan={true}
        onViewHistory={onViewPatientHistory}
        showLastDispensed={true}
      />
    </section>
  );

  const renderMedicationsStep = () => (
    <section>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-700">Add medications to dispense</h3>
        <button
          type="button"
          onClick={handleAddMedication}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          + Add Medication
        </button>
      </div>

      <div className="space-y-2">
        {medicationLines.map((line, index) => (
          <MedicationLineItem
            key={line.id}
            index={index}
            line={line}
            onChange={(field, value) => handleMedicationChange(line.id, field, value)}
            onBatchChange={(updates) => handleBatchMedicationChange(line.id, updates)}
            onRemove={() => handleRemoveMedication(line.id)}
            lotValidation={lotValidationResults.get(line.id)}
            detectedContext={detectedContext}
            selectedReasons={values.reasons}
          />
        ))}
        {medicationLines.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <p className="text-gray-400 text-sm">No medications added yet</p>
            <button
              type="button"
              onClick={handleAddMedication}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm mt-1"
            >
              Add your first medication
            </button>
          </div>
        )}
      </div>
    </section>
  );

  const renderReasonStep = () => (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Dispensing Reason</h3>
        <ReasonSelector
          selectedReasons={values.reasons}
          onChange={handleReasonsChange}
          selectedMedicationName={selectedMedicationName}
        />
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Notes (optional)</h3>
        <textarea
          value={values.notes}
          onChange={(e) => setValue('notes', e.target.value)}
          placeholder="Additional notes about this dispensing..."
          rows={2}
          className="w-full rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2"
        />
      </div>
    </section>
  );

  const renderReviewStep = () => (
    <section className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Review before submitting</h3>

      {/* Patient summary */}
      {selectedPatient && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Patient</p>
          <p className="font-medium text-gray-900">
            {selectedPatient.firstName} {selectedPatient.lastName}
          </p>
          <p className="text-sm text-gray-600">
            Chart: {selectedPatient.chartNumber}
          </p>
        </div>
      )}

      {/* Medications summary */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
          Medications ({medicationLines.length})
        </p>
        {medicationLines.map((line) => {
          const instrData = instructionDataMap.get(line.id);
          const lotVal = lotValidationResults.get(line.id);
          return (
            <div key={line.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
              <div>
                <span className="font-medium text-gray-900 text-sm">
                  {instrData?.medicationStrength
                    ? `${line.medicationId} (${instrData.medicationStrength})`
                    : line.medicationId}
                </span>
                {lotVal?.lot?.lotNumber && (
                  <span className="text-xs text-gray-500 ml-2">
                    Lot: {lotVal.lot.lotNumber}
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-700">
                {line.amount} {line.unit}
              </span>
            </div>
          );
        })}
      </div>

      {/* Reasons summary */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Reason(s)</p>
        <p className="text-sm text-gray-900">{values.reasons.join(', ')}</p>
      </div>

      {/* Notes summary */}
      {values.notes && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-gray-900">{values.notes}</p>
        </div>
      )}

      {/* WYSIWYG label preview - editable before print */}
      {Array.from(instructionDataMap.entries()).some(([, d]) => d) && (
        <details className="bg-blue-50 rounded-lg border border-blue-200" open>
          <summary className="px-3 py-2 text-sm font-medium text-blue-800 cursor-pointer">
            Label preview — edit directions or quantity before printing
          </summary>
          <div className="px-3 pb-3 pt-2 flex flex-wrap gap-4">
            {medicationLines.map((line) => {
              const data = instructionDataMap.get(line.id);
              if (!data) return null;
              const medication = inventory?.find((m) => m.id === line.medicationId);
              return (
                <InstructionPreviewCard
                  key={line.id}
                  medicationName={(medication?.name ?? line.medicationId) || ''}
                  strength={data.medicationStrength || ''}
                  form={medication?.dosageForm}
                  indication={data.indication}
                  instructions={data.fullInstructions}
                  directions={line.customDirections ?? data.shortDosing}
                  warnings={data.warnings}
                  daySupply={data.daySupply}
                  quantity={(line.customQuantity ?? parseFloat(line.amount)) || 1}
                  unit={line.unit}
                  context={data.context}
                  patientFirstName={selectedPatient?.firstName}
                  patientLastName={selectedPatient?.lastName}
                  onSaveOverrides={(overrides) => {
                    setMedicationLines((prev) =>
                      prev.map((l) => {
                        if (l.id !== line.id) return l;
                        const updates: Partial<MedicationLine> = {
                          customDirections: overrides.customDirections ?? l.customDirections,
                          customQuantity: overrides.customQuantity ?? l.customQuantity,
                        };
                        if (overrides.customQuantity !== undefined) {
                          updates.amount = String(overrides.customQuantity);
                        }
                        return { ...l, ...updates };
                      })
                    );
                  }}
                  initialOverrides={{
                    customDirections: line.customDirections,
                    customQuantity: line.customQuantity,
                  }}
                />
              );
            })}
          </div>
        </details>
      )}
    </section>
  );

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Header */}
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Dispensing Entry</h2>
        </div>

        {/* Step indicator */}
        <div className="px-5 pt-5">
          {renderStepIndicator()}
        </div>

        {/* Step content */}
        <div className="px-5 pb-5">
          {currentStep === 'patient' && renderPatientStep()}
          {currentStep === 'medications' && renderMedicationsStep()}
          {currentStep === 'reason' && renderReasonStep()}
          {currentStep === 'review' && renderReviewStep()}
        </div>

        {/* Navigation footer */}
        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex items-center justify-between">
          <div>
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Reset
            </button>

            {currentStep !== 'review' ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext()}
                className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  canGoNext()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Save & Print'}
                </button>
              </div>
            )}
          </div>
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
            handleFullReset();
            onSubmitSuccess?.();
          }}
          onConfirm={handlePrintConfirm}
          patientName={`${selectedPatient.firstName} ${selectedPatient.lastName}`}
          chartNumber={selectedPatient.chartNumber}
          medications={medicationLines.map(line => {
            const instrData = instructionDataMap.get(line.id);
            const lotVal = lotValidationResults.get(line.id);
            return {
              id: line.id,
              name: line.medicationId,
              strength: instrData?.medicationStrength || '',
              quantity: parseFloat(line.amount),
              unit: line.unit,
              lotNumber: lotVal?.lot?.lotNumber || line.lotId,
              expirationDate: lotVal?.lot?.expirationDate?.toLocaleDateString(),
              directions: instrData?.shortDosing || 'Take as directed',
              fullInstructions: instrData?.fullInstructions || [],
              warnings: instrData?.warnings || [],
              context: detectedContext || instrData?.context,
              indication: instrData?.indication,
              daySupply: instrData?.daySupply,
              prescribedBy: staff?.name || 'Dr. Provider',
            };
          })}
        />
      )}
    </div>
  );
};

export default EntryFormContainer;
