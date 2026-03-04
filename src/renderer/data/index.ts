export { default as MEDICATIONS_DATA } from './medications';
export type { MedicationDetails } from './medications';

export {
  DISPENSING_TEMPLATES,
  getTemplateById,
  getTemplatesByCategory,
  getTemplateCategories,
  searchTemplates,
} from './dispensingTemplates';
export type { DispensingTemplate } from './dispensingTemplates';

// Medication Instructions
export {
  MEDICATION_INSTRUCTION_TEMPLATES,
  DISPENSE_REASONS,
  findReasonConfig,
  getAvailableContexts,
  getInstructionReasonsForContext,
  getAvailableMedicationIds,
  getAvailableMedicationNames,
  normalizeMedicationId,
} from './medicationInstructions';
export type {
  MedicationInstructionTemplate,
  DispenseReason as MedicationDispenseReason,
  ReasonContextResult,
} from './medicationInstructions';

// Reason Instruction Mapping
export {
  REASON_INSTRUCTION_MAP,
  getReasonContext,
  getReasonIndication,
  getInstructionPriority,
  reasonRequiresDuration,
  getDefaultDuration,
  getReasonsByContext,
  detectContextFromReasons,
} from './reasonInstructionMapping';
export type {
  ReasonInstructionMapping,
  ContextDetectionResult,
} from './reasonInstructionMapping';
