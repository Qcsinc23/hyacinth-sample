/**
 * Reason to Instruction Mapping
 * Maps each dispense reason to its context and priority medication instructions
 * Based on Hyacinth Health and Wellness Clinic Documentation
 */

import type { DispenseReason, ReasonContext } from '../types';

/**
 * Reason instruction mapping interface
 */
export interface ReasonInstructionMapping {
  context: ReasonContext;
  defaultIndication: string;
  instructionPriority: string[]; // Medication IDs in priority order
  requiresDuration: boolean; // Whether this reason typically has a set duration
  defaultDurationDays?: number; // Default duration if applicable
}

/**
 * Complete mapping of dispense reasons to their instruction configurations
 */
export const REASON_INSTRUCTION_MAP: Record<DispenseReason, ReasonInstructionMapping> = {
  // ==========================================================================
  // HIV TREATMENT REASONS
  // ==========================================================================

  'HIV Treatment - Initial': {
    context: 'treatment',
    defaultIndication: 'HIV-1 Infection - Initial Regimen',
    instructionPriority: ['biktarvy', 'symtuza', 'dovato', 'juluca', 'truvada'],
    requiresDuration: false,
  },

  'HIV Treatment - Continuation': {
    context: 'treatment',
    defaultIndication: 'HIV-1 Infection - Ongoing Treatment',
    instructionPriority: ['biktarvy', 'symtuza', 'dovato', 'juluca', 'truvada'],
    requiresDuration: false,
  },

  // ==========================================================================
  // STI TREATMENT REASONS
  // ==========================================================================

  'STI Treatment - Chlamydia': {
    context: 'treatment',
    defaultIndication: 'Chlamydia trachomatis Infection',
    instructionPriority: ['doxycycline', 'azithromycin'],
    requiresDuration: true,
    defaultDurationDays: 7,
  },

  'STI Treatment - Gonorrhea': {
    context: 'treatment',
    defaultIndication: 'Neisseria gonorrhoeae Infection',
    instructionPriority: ['ceftriaxone', 'azithromycin'],
    requiresDuration: true,
    defaultDurationDays: 1,
  },

  'STI Treatment - Syphilis': {
    context: 'treatment',
    defaultIndication: 'Treponema pallidum Infection (Syphilis)',
    instructionPriority: ['penicillin-g-benzathine', 'doxycycline'],
    requiresDuration: true,
    defaultDurationDays: 14,
  },

  'STI Treatment - Multiple': {
    context: 'treatment',
    defaultIndication: 'Multiple STI Infections',
    instructionPriority: ['ceftriaxone', 'azithromycin', 'doxycycline'],
    requiresDuration: true,
    defaultDurationDays: 7,
  },

  // ==========================================================================
  // OTHER INFECTION TREATMENTS
  // ==========================================================================

  'UTI Treatment': {
    context: 'treatment',
    defaultIndication: 'Urinary Tract Infection',
    instructionPriority: ['bactrim', 'doxycycline', 'azithromycin'],
    requiresDuration: true,
    defaultDurationDays: 7,
  },

  'Skin Infection Treatment': {
    context: 'treatment',
    defaultIndication: 'Skin and Soft Tissue Infection',
    instructionPriority: ['doxycycline', 'bactrim', 'azithromycin'],
    requiresDuration: true,
    defaultDurationDays: 7,
  },

  'Respiratory Infection Treatment': {
    context: 'treatment',
    defaultIndication: 'Respiratory Tract Infection',
    instructionPriority: ['azithromycin', 'doxycycline'],
    requiresDuration: true,
    defaultDurationDays: 7,
  },

  'Other Infection Treatment': {
    context: 'treatment',
    defaultIndication: 'Infection Treatment',
    instructionPriority: ['doxycycline', 'azithromycin', 'bactrim'],
    requiresDuration: true,
    defaultDurationDays: 7,
  },

  // ==========================================================================
  // PrEP REASONS
  // ==========================================================================

  'PrEP - Daily': {
    context: 'prep',
    defaultIndication: 'HIV-1 Pre-Exposure Prophylaxis (Daily)',
    instructionPriority: ['descovy', 'truvada', 'apretude'],
    requiresDuration: false,
  },

  'PrEP - On-Demand': {
    context: 'prep',
    defaultIndication: 'HIV-1 Pre-Exposure Prophylaxis (Event-Driven/2-1-1)',
    instructionPriority: ['descovy', 'truvada'],
    requiresDuration: false,
  },

  'PrEP - Event-Driven': {
    context: 'prep',
    defaultIndication: 'HIV-1 Pre-Exposure Prophylaxis (Event-Driven)',
    instructionPriority: ['descovy', 'truvada'],
    requiresDuration: false,
  },

  // ==========================================================================
  // PEP REASONS
  // ==========================================================================

  'nPEP - 28 Day Course': {
    context: 'pep',
    defaultIndication: 'Non-occupational Post-Exposure Prophylaxis (nPEP)',
    instructionPriority: ['biktarvy', 'symtuza', 'descovy', 'truvada'],
    requiresDuration: true,
    defaultDurationDays: 28,
  },

  'nPEP - Occupational': {
    context: 'pep',
    defaultIndication: 'Occupational Post-Exposure Prophylaxis',
    instructionPriority: ['biktarvy', 'symtuza', 'descovy', 'truvada'],
    requiresDuration: true,
    defaultDurationDays: 28,
  },

  // ==========================================================================
  // PREVENTION REASONS
  // ==========================================================================

  'Doxy-PEP': {
    context: 'prevention',
    defaultIndication: 'STI Post-Exposure Prophylaxis (Doxy-PEP)',
    instructionPriority: ['doxycycline'],
    requiresDuration: false,
  },

  // ==========================================================================
  // PROPHYLAXIS REASONS
  // ==========================================================================

  'PCP Prophylaxis': {
    context: 'prophylaxis',
    defaultIndication: 'Pneumocystis jirovecii Pneumonia (PCP) Prophylaxis',
    instructionPriority: ['bactrim'],
    requiresDuration: false,
  },

  'Toxoplasmosis Prophylaxis': {
    context: 'prophylaxis',
    defaultIndication: 'Toxoplasma gondii Prophylaxis',
    instructionPriority: ['bactrim'],
    requiresDuration: false,
  },

  'MAC Prophylaxis': {
    context: 'prophylaxis',
    defaultIndication: 'Mycobacterium avium Complex (MAC) Prophylaxis',
    instructionPriority: ['azithromycin', 'bactrim'],
    requiresDuration: false,
  },

  'Herpes Prophylaxis': {
    context: 'prophylaxis',
    defaultIndication: 'Herpes Simplex Virus Prophylaxis',
    instructionPriority: ['valacyclovir'],
    requiresDuration: false,
  },

  'Fungal Prophylaxis': {
    context: 'prophylaxis',
    defaultIndication: 'Fungal Infection Prophylaxis',
    instructionPriority: ['fluconazole'],
    requiresDuration: false,
  },

  // ==========================================================================
  // GENERAL/OTHER REASONS
  // ==========================================================================

  'Scheduled Medication': {
    context: 'other',
    defaultIndication: 'Scheduled Medication Dispensing',
    instructionPriority: [], // No specific instructions for general scheduled meds
    requiresDuration: false,
  },

  'PRN (As Needed)': {
    context: 'other',
    defaultIndication: 'As Needed (PRN) Medication',
    instructionPriority: [], // No specific instructions for PRN meds
    requiresDuration: false,
  },

  'STAT/Emergency': {
    context: 'other',
    defaultIndication: 'Emergency/STAT Medication',
    instructionPriority: [], // Context-dependent
    requiresDuration: false,
  },

  'New Order': {
    context: 'other',
    defaultIndication: 'New Medication Order',
    instructionPriority: [], // Varies by medication
    requiresDuration: false,
  },

  'Discharge': {
    context: 'other',
    defaultIndication: 'Discharge Medication',
    instructionPriority: [], // Varies by medication
    requiresDuration: false,
  },

  'Transfer': {
    context: 'other',
    defaultIndication: 'Transfer Medication',
    instructionPriority: [], // Varies by medication
    requiresDuration: false,
  },

  'Waste': {
    context: 'other',
    defaultIndication: 'Medication Waste Documentation',
    instructionPriority: [], // No instructions for waste
    requiresDuration: false,
  },
};

/**
 * Get the context for a given dispense reason
 */
export function getReasonContext(reason: DispenseReason): ReasonContext {
  return REASON_INSTRUCTION_MAP[reason]?.context || 'other';
}

/**
 * Get the default indication for a given dispense reason
 */
export function getReasonIndication(reason: DispenseReason): string {
  return REASON_INSTRUCTION_MAP[reason]?.defaultIndication || '';
}

/**
 * Get instruction priority for a given dispense reason
 */
export function getInstructionPriority(reason: DispenseReason): string[] {
  return REASON_INSTRUCTION_MAP[reason]?.instructionPriority || [];
}

/**
 * Check if a reason requires a specific duration
 */
export function reasonRequiresDuration(reason: DispenseReason): boolean {
  return REASON_INSTRUCTION_MAP[reason]?.requiresDuration || false;
}

/**
 * Get default duration for a reason (if applicable)
 */
export function getDefaultDuration(reason: DispenseReason): number | undefined {
  return REASON_INSTRUCTION_MAP[reason]?.defaultDurationDays;
}

/**
 * Get all reasons that belong to a specific context
 */
export function getReasonsByContext(context: ReasonContext): DispenseReason[] {
  return Object.entries(REASON_INSTRUCTION_MAP)
    .filter(([_, mapping]) => mapping.context === context)
    .map(([reason]) => reason as DispenseReason);
}

/**
 * Get context detection result from selected reasons
 * Returns the dominant context and any conflicts
 */
export interface ContextDetectionResult {
  detectedContext: ReasonContext;
  confidence: 'high' | 'medium' | 'low';
  conflictingReasons: DispenseReason[];
  allContexts: ReasonContext[];
}

export function detectContextFromReasons(reasons: DispenseReason[]): ContextDetectionResult {
  if (reasons.length === 0) {
    return {
      detectedContext: 'other',
      confidence: 'low',
      conflictingReasons: [],
      allContexts: [],
    };
  }

  // Get all unique contexts from selected reasons
  const contexts = [...new Set(reasons.map(r => getReasonContext(r)))];

  // Check for conflicts (multiple different contexts)
  const conflictingReasons: DispenseReason[] = [];
  if (contexts.length > 1) {
    // Find reasons that don't match the most common context
    const contextCounts = reasons.reduce((acc, r) => {
      const ctx = getReasonContext(r);
      acc[ctx] = (acc[ctx] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantContext = Object.entries(contextCounts).sort((a, b) => b[1] - a[1])[0][0] as ReasonContext;

    reasons.forEach(r => {
      if (getReasonContext(r) !== dominantContext) {
        conflictingReasons.push(r);
      }
    });
  }

  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (contexts.length === 1 && reasons.length > 0) {
    confidence = 'high';
  } else if (contexts.length > 1 && contexts.length <= 2) {
    confidence = 'medium';
  } else if (contexts.length > 2) {
    confidence = 'low';
  }

  // Use the first context as detected (or most common if multiple)
  const detectedContext = contexts[0] || 'other';

  return {
    detectedContext,
    confidence,
    conflictingReasons,
    allContexts: contexts,
  };
}

export default REASON_INSTRUCTION_MAP;
