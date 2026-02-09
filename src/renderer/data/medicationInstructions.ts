/**
 * Medication Instructions with Context Awareness
 * Based on Hyacinth Health and Wellness Clinic Documentation
 * Provides context-specific instruction templates for different dispensing scenarios
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type ReasonContext = 'treatment' | 'prevention' | 'prophylaxis' | 'pep' | 'prep' | 'other';

export interface MedicationInstructionTemplate {
  medicationId: string;
  medicationName: string;
  strength: string;
  context: ReasonContext;
  indication: string;
  shortDosing: string;
  fullInstructions: string[];
  warnings: string[];
  daySupplyMultiplier: number;
  commonReasons: string[];
  // For label generation
  additionalLabelInfo?: string;
  // Storage requirements
  storageRequirements?: string;
}

export interface DispenseReason {
  value: string;
  context: ReasonContext;
  linksToInstructions: boolean;
}

export interface ReasonContextResult {
  context: ReasonContext;
  confidence: 'high' | 'medium' | 'low';
  conflictingReasons: string[];
  detectedIndications: string[];
}

// ============================================================================
// Dispense Reasons with Context Mapping
// ============================================================================

export const DISPENSE_REASONS: DispenseReason[] = [
  // Treatment reasons
  { value: 'HIV Treatment - Initial', context: 'treatment', linksToInstructions: true },
  { value: 'HIV Treatment - Continuation', context: 'treatment', linksToInstructions: true },
  { value: 'STI Treatment - Chlamydia', context: 'treatment', linksToInstructions: true },
  { value: 'STI Treatment - Gonorrhea', context: 'treatment', linksToInstructions: true },
  { value: 'STI Treatment - Syphilis', context: 'treatment', linksToInstructions: true },
  { value: 'UTI Treatment', context: 'treatment', linksToInstructions: true },
  { value: 'Other Infection Treatment', context: 'treatment', linksToInstructions: true },

  // Prevention/Prophylaxis reasons
  { value: 'PrEP - Daily', context: 'prep', linksToInstructions: true },
  { value: 'PrEP - On-Demand', context: 'prep', linksToInstructions: true },
  { value: 'nPEP - 28 Day Course', context: 'pep', linksToInstructions: true },
  { value: 'Doxy-PEP', context: 'prevention', linksToInstructions: true },
  { value: 'PCP Prophylaxis', context: 'prophylaxis', linksToInstructions: true },
  { value: 'Toxoplasmosis Prophylaxis', context: 'prophylaxis', linksToInstructions: true },
  { value: 'Herpes Prophylaxis', context: 'prophylaxis', linksToInstructions: true },

  // Legacy reasons
  { value: 'Scheduled Medication', context: 'other', linksToInstructions: false },
  { value: 'PRN (As Needed)', context: 'other', linksToInstructions: false },
  { value: 'STAT/Emergency', context: 'other', linksToInstructions: false },
  { value: 'New Order', context: 'other', linksToInstructions: false },
  { value: 'Discharge', context: 'other', linksToInstructions: false },
  { value: 'Transfer', context: 'other', linksToInstructions: false },
  { value: 'Waste', context: 'other', linksToInstructions: false },
];

// ============================================================================
// Medication Instruction Templates
// ============================================================================

export const MEDICATION_INSTRUCTION_TEMPLATES: MedicationInstructionTemplate[] = [
  // ========================================================================
  // BIKTARVY
  // ========================================================================

  {
    medicationId: 'biktarvy',
    medicationName: 'Biktarvy',
    strength: '50mg/200mg/25mg',
    context: 'treatment',
    indication: 'HIV-1 Infection Treatment',
    shortDosing: 'Take 1 tablet by mouth once daily',
    fullInstructions: [
      'Take at the same time each day',
      'May take with or without food',
      'Do not skip doses - resistance can develop',
      'If you miss a dose, take it as soon as you remember unless it is close to your next dose',
      'Do not stop taking this medication without consulting your healthcare provider',
    ],
    warnings: [
      'Severe exacerbations of Hepatitis B reported if discontinued',
      'Do not stop without consulting healthcare provider',
      'This medication does not cure HIV or prevent transmission',
      'Get refills before running out - virus may increase if stopped',
    ],
    daySupplyMultiplier: 30,
    commonReasons: ['HIV Treatment - Initial', 'HIV Treatment - Continuation'],
    storageRequirements: 'Store in original container with desiccant; keep tightly closed at room temperature',
  },
  {
    medicationId: 'biktarvy',
    medicationName: 'Biktarvy',
    strength: '50mg/200mg/25mg',
    context: 'pep',
    indication: 'nPEP (Non-occupational Post-Exposure Prophylaxis)',
    shortDosing: 'Take 1 tablet by mouth once daily for 28 days',
    fullInstructions: [
      'Must be started within 72 hours of exposure',
      'Take 2 hours BEFORE or 6 hours AFTER medications containing polyvalent cations (antacids, supplements)',
      'Complete full 28-day course',
      'If you miss doses, resistance can develop',
      'Take at the same time each day',
    ],
    warnings: [
      'Do not miss any doses',
      'Complete entire 28-day course even if you feel well',
      'Follow-up HIV testing required after completion',
      'Hepatitis B: Severe exacerbations possible if discontinued',
    ],
    daySupplyMultiplier: 28,
    commonReasons: ['nPEP - 28 Day Course'],
    additionalLabelInfo: 'Complete all 28 days for nPEP',
    storageRequirements: 'Store in original container with desiccant; keep tightly closed at room temperature',
  },

  // ========================================================================
  // DESCOVY
  // ========================================================================

  {
    medicationId: 'descovy',
    medicationName: 'Descovy',
    strength: '200mg/25mg',
    context: 'prep',
    indication: 'HIV-1 Pre-Exposure Prophylaxis (PrEP)',
    shortDosing: 'Take 1 tablet by mouth once daily',
    fullInstructions: [
      'Must be taken EVERY DAY, not just when exposure is anticipated',
      'Take at the same time each day',
      'May take with or without food',
      'Time to maximum protection is unknown; use additional prevention measures',
    ],
    warnings: [
      'Descovy for PrEP does NOT protect against other STIs - use condoms',
      'Must be confirmed HIV-negative before starting and every 3 months',
      'If recent HIV exposure suspected (<1 month), need acute HIV testing before starting',
      'Do not share medication with others',
    ],
    daySupplyMultiplier: 30,
    commonReasons: ['PrEP - Daily', 'PrEP - On-Demand'],
    storageRequirements: 'Store at room temperature in original container',
  },
  {
    medicationId: 'descovy',
    medicationName: 'Descovy',
    strength: '200mg/25mg',
    context: 'treatment',
    indication: 'HIV-1 Treatment (with other antiretrovirals)',
    shortDosing: 'Take 1 tablet by mouth once daily',
    fullInstructions: [
      'Must be taken with other HIV medications as prescribed',
      'Take at the same time each day',
      'May take with or without food',
    ],
    warnings: [
      'Must be taken with other HIV medications',
      'Do not discontinue without provider consultation (Hepatitis B risk)',
      'Report symptoms of lactic acidosis: weakness, muscle pain, difficulty breathing, stomach pain',
    ],
    daySupplyMultiplier: 30,
    commonReasons: ['HIV Treatment - Initial', 'HIV Treatment - Continuation'],
    storageRequirements: 'Store at room temperature in original container',
  },

  // ========================================================================
  // SYMTUZA
  // ========================================================================

  {
    medicationId: 'symtuza',
    medicationName: 'Symtuza',
    strength: '800mg/150mg/200mg/10mg',
    context: 'treatment',
    indication: 'Complete regimen for HIV-1 treatment',
    shortDosing: 'Take 1 tablet by mouth once daily WITH FOOD',
    fullInstructions: [
      'MUST be taken WITH FOOD (essential for absorption)',
      'Take at the same time each day',
      'May be split using tablet-cutter; entire dose must be consumed immediately after splitting',
    ],
    warnings: [
      'Always take with food - improves absorption',
      'Do not miss doses - resistance can develop',
      'Do not alter dose or discontinue without consulting provider',
      'Get refills before running out - virus may increase if stopped',
      'Not recommended during pregnancy',
    ],
    daySupplyMultiplier: 30,
    commonReasons: ['HIV Treatment - Initial', 'HIV Treatment - Continuation'],
    storageRequirements: 'Store at room temperature in original container',
  },

  // ========================================================================
  // DOVATO
  // ========================================================================

  {
    medicationId: 'dovato',
    medicationName: 'Dovato',
    strength: '50mg/300mg',
    context: 'treatment',
    indication: 'Treatment of HIV-1 infection',
    shortDosing: 'Take 1 tablet by mouth once daily',
    fullInstructions: [
      'Take at the same time each day',
      'May take with or without food',
    ],
    warnings: [
      'Do not stop treatment without consulting provider',
      'This medication does not cure HIV; infections may still occur',
      'Multiple drug interactions exist - consult with pharmacist',
    ],
    daySupplyMultiplier: 30,
    commonReasons: ['HIV Treatment - Initial', 'HIV Treatment - Continuation'],
    storageRequirements: 'Store at room temperature in original container',
  },

  // ========================================================================
  // BACTRIM DS
  // ========================================================================

  {
    medicationId: 'bactrim',
    medicationName: 'Bactrim DS',
    strength: '800mg/160mg',
    context: 'prophylaxis',
    indication: 'PCP (Pneumocystis jirovecii pneumonia) prophylaxis',
    shortDosing: 'Take 1 tablet by mouth once daily',
    fullInstructions: [
      'Take with food if stomach upset occurs',
      'Drink plenty of fluids to prevent kidney stones',
      'Take at the same time each day',
    ],
    warnings: [
      'Sun sensitivity: May increase risk of sunburn; use sunscreen',
      'Report immediately: Rash, fever, sore throat, unusual bruising/bleeding, persistent diarrhea',
      'Avoid high-potassium foods and salt substitutes',
      'Serious allergic reactions: Stevens-Johnson syndrome, toxic epidermal necrolysis (rare but serious)',
    ],
    daySupplyMultiplier: 30,
    commonReasons: ['PCP Prophylaxis'],
    storageRequirements: 'Store at room temperature in original container',
  },
  {
    medicationId: 'bactrim',
    medicationName: 'Bactrim DS',
    strength: '800mg/160mg',
    context: 'prophylaxis',
    indication: 'Toxoplasmosis prophylaxis',
    shortDosing: 'Take 1 tablet by mouth once daily',
    fullInstructions: [
      'Take with food if stomach upset occurs',
      'Drink plenty of fluids',
      'Take at the same time each day',
    ],
    warnings: [
      'Sun sensitivity: May increase risk of sunburn; use sunscreen',
      'Report immediately: Rash, fever, unusual bruising',
    ],
    daySupplyMultiplier: 30,
    commonReasons: ['Toxoplasmosis Prophylaxis'],
    storageRequirements: 'Store at room temperature in original container',
  },
  {
    medicationId: 'bactrim',
    medicationName: 'Bactrim DS',
    strength: '800mg/160mg',
    context: 'treatment',
    indication: 'Urinary Tract Infection treatment',
    shortDosing: 'Take 1 tablet by mouth twice daily for 7 days',
    fullInstructions: [
      'Take with food if stomach upset occurs',
      'Drink plenty of fluids',
      'Space doses evenly (every 12 hours)',
    ],
    warnings: [
      'Complete FULL 7 days even if feeling better',
      'Sun sensitivity: May increase risk of sunburn; use sunscreen',
      'Avoid high-potassium foods and salt substitutes',
    ],
    daySupplyMultiplier: 7,
    commonReasons: ['UTI Treatment'],
    storageRequirements: 'Store at room temperature in original container',
  },

  // ========================================================================
  // DOXYCYCLINE
  // ========================================================================

  {
    medicationId: 'doxycycline',
    medicationName: 'Doxycycline',
    strength: '100mg',
    context: 'prevention',
    indication: 'STI Post-Exposure Prophylaxis (Doxy-PEP)',
    shortDosing: 'Take 2 tablets by mouth within 72 hours after sex, with food',
    fullInstructions: [
      '3-2-1 Rule: Within 3 days (72 hours) of condomless sexual encounter, take 2 tablets (200mg), just 1 time',
      'Optimal timing: Most effective within first 24 hours',
      'No more than one dose per 24-hour period',
      'Take with food and full glass of water',
      'Do NOT lie down for 1 hour after taking',
    ],
    warnings: [
      'Doxy-PEP is NOT 100% protective: Continue using condoms and other prevention',
      'Doxy-PEP does NOT prevent: Gonorrhea consistently (variable protection)',
      'Doxy-PEP does prevent: Syphilis (~60-70% reduction), Chlamydia (~60-70% reduction)',
      'Avoid dairy, antacids, iron for 2 hours before and after taking',
      'Use sunscreen - increases sun sensitivity',
      'Regular STI screening: Still needed every 3-6 months',
      'Not recommended for pregnant individuals',
    ],
    daySupplyMultiplier: 1, // Single dose per encounter
    commonReasons: ['Doxy-PEP'],
    additionalLabelInfo: '3-2-1 Rule: 2 tabs within 72hrs, max 1 dose per 24hrs',
    storageRequirements: 'Store at room temperature in original container; protect from light and moisture',
  },
  {
    medicationId: 'doxycycline',
    medicationName: 'Doxycycline',
    strength: '100mg',
    context: 'treatment',
    indication: 'Chlamydia Treatment',
    shortDosing: 'Take 1 capsule by mouth twice daily for 7 days',
    fullInstructions: [
      'Take with food and full glass of water',
      'Do NOT lie down for 1 hour after taking',
      'Space doses evenly (every 12 hours)',
    ],
    warnings: [
      'Complete FULL 7 days even if feeling better',
      'Avoid dairy, antacids, iron for 2 hours before and after taking',
      'Use sunscreen - increases sun sensitivity',
      'Sexual partners must also be treated',
      'No sexual activity until treatment completed',
    ],
    daySupplyMultiplier: 7,
    commonReasons: ['STI Treatment - Chlamydia'],
    storageRequirements: 'Store at room temperature in original container; protect from light and moisture',
  },
  {
    medicationId: 'doxycycline',
    medicationName: 'Doxycycline',
    strength: '100mg',
    context: 'treatment',
    indication: 'Early Syphilis Treatment',
    shortDosing: 'Take 1 tablet by mouth twice daily for 14 days',
    fullInstructions: [
      'Take with food and full glass of water',
      'Do NOT lie down for 1 hour after taking',
      'Space doses evenly (every 12 hours)',
    ],
    warnings: [
      'Complete FULL 14 days even if feeling better',
      'Avoid dairy, antacids, iron for 2 hours before and after taking',
      'Use sunscreen - increases sun sensitivity',
      'Follow-up testing required after treatment',
      'Sexual partners must also be evaluated and treated',
    ],
    daySupplyMultiplier: 14,
    commonReasons: ['STI Treatment - Syphilis'],
    storageRequirements: 'Store at room temperature in original container; protect from light and moisture',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find a reason configuration by value
 */
export function findReasonConfig(reasonValue: string): DispenseReason | undefined {
  return DISPENSE_REASONS.find(r => r.value === reasonValue);
}

/**
 * Get all unique contexts from available reasons
 */
export function getAvailableContexts(): ReasonContext[] {
  return [...new Set(DISPENSE_REASONS.map(r => r.context))];
}

/**
 * Get instruction template for medication + context
 * This is a convenience wrapper that can be called from the renderer
 */
export function getInstructionTemplate(
  medicationId: string,
  context: ReasonContext
): MedicationInstructionTemplate | null {
  // Normalize the medication ID
  const normalizedId = normalizeMedicationId(medicationId);

  // Find all templates for this medication
  const templates = MEDICATION_INSTRUCTION_TEMPLATES.filter(
    t => t.medicationId === normalizedId
  );

  if (templates.length === 0) {
    return null;
  }

  // Find exact context match
  const exactMatch = templates.find(t => t.context === context);
  if (exactMatch) {
    return exactMatch;
  }

  // Fallback logic for related contexts
  const contextMap: Record<ReasonContext, ReasonContext[]> = {
    treatment: ['treatment'],
    prevention: ['prevention', 'prophylaxis'],
    prophylaxis: ['prophylaxis', 'prevention'],
    pep: ['pep'],
    prep: ['prep'],
    other: ['treatment', 'prevention', 'prophylaxis', 'pep', 'prep'],
  };

  const fallbackContexts = contextMap[context] || [];
  for (const fallbackContext of fallbackContexts) {
    const fallback = templates.find(t => t.context === fallbackContext);
    if (fallback) {
      return fallback;
    }
  }

  // Return first template as last resort
  return templates[0];
}


/**
 * Get reasons that link to instructions for a specific context
 */
export function getInstructionReasonsForContext(context: ReasonContext): string[] {
  return DISPENSE_REASONS
    .filter(r => r.context === context && r.linksToInstructions)
    .map(r => r.value);
}

/**
 * Get all medication IDs that have instruction templates
 */
export function getAvailableMedicationIds(): string[] {
  return [...new Set(MEDICATION_INSTRUCTION_TEMPLATES.map(t => t.medicationId))];
}

/**
 * Get medication names that have instruction templates
 */
export function getAvailableMedicationNames(): string[] {
  return [...new Set(MEDICATION_INSTRUCTION_TEMPLATES.map(t => t.medicationName))];
}

/**
 * Normalize medication name to ID for lookup
 * Handles various naming conventions and partial matches
 */
export function normalizeMedicationId(medicationName: string): string {
  const normalized = medicationName.toLowerCase().trim();

  // Direct matches
  for (const template of MEDICATION_INSTRUCTION_TEMPLATES) {
    if (template.medicationId.toLowerCase() === normalized) {
      return template.medicationId;
    }
    if (template.medicationName.toLowerCase() === normalized) {
      return template.medicationId;
    }
  }

  // Partial matches for medications with qualifiers in parentheses
  const baseName = normalized.split('(')[0].trim().replace(/\s+/g, '');
  for (const template of MEDICATION_INSTRUCTION_TEMPLATES) {
    const templateBase = template.medicationId.toLowerCase().replace(/\s+/g, '');
    if (templateBase.includes(baseName) || baseName.includes(templateBase)) {
      return template.medicationId;
    }
  }

  return normalized;
}

export default MEDICATION_INSTRUCTION_TEMPLATES;
