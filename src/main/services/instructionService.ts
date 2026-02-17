/**
 * Instruction Service
 * Handles context detection and instruction selection for medication dispensing
 *
 * This service provides intelligent instruction template selection based on:
 * - Dispense reasons (treatment vs prevention contexts)
 * - Medication-specific instruction templates
 * - Context-specific warnings and dosing information
 */

import { validateLotForDispensing as validateInventoryLot, getLotByNumber, type LotValidationResult } from '../database/queries/inventory';
import { REASON_INSTRUCTION_MAP } from '../../renderer/data/reasonInstructionMapping';
import type { ReasonContext } from '../../renderer/types';
import { getInstructionTemplateForMedication, getTemplatesForMedication, getContextsForMedication } from '../database/queries/medicationCatalog';
import type { InstructionTemplate } from '../database/queries/medicationCatalog';

// ============================================================================
// Type Definitions
// ============================================================================

export interface DispenseReason {
  reasonName: string;
  isCustom: boolean;
}

export interface ReasonContextResult {
  context: ReasonContext;
  confidence: 'high' | 'medium' | 'low';
  conflictingReasons: string[];
  detectedIndications: string[];
  warnings: string[];
}

export interface DispensingLineItemData {
  medicationName: string;
  medicationStrength?: string;
  amountValue: number;
  amountUnit: string;
  lotNumber?: string;
  expirationDate?: string;
  inventoryId?: number;
  dosingInstructions: string;
  daySupply: number;
  warnings: string[];
  instructionContext: ReasonContext;
  indication?: string;
  additionalLabelInfo?: string;
  storageRequirements?: string;
}

export interface InstructionServiceError extends Error {
  code: 'MEDICATION_NOT_FOUND' | 'CONFLICTING_CONTEXTS' | 'INSUFFICIENT_DATA' | 'LOT_NOT_FOUND' | 'LOT_EXPIRED';
  details?: unknown;
}

// ============================================================================
// Context Detection Functions
// ============================================================================

/**
 * Get instruction context from dispense reasons
 * Analyzes the selected reasons to determine the most appropriate context
 */
export function getContextFromReasons(reasons: DispenseReason[]): ReasonContextResult {
  if (reasons.length === 0) {
    return {
      context: 'other',
      confidence: 'low',
      conflictingReasons: [],
      detectedIndications: [],
      warnings: ['No dispense reasons provided - context cannot be determined'],
    };
  }

  const contexts: Map<ReasonContext, number> = new Map();
  const conflictingReasons: string[] = [];
  const detectedIndications: string[] = [];
  const warnings: string[] = [];

  // Count occurrences of each context
  for (const reason of reasons) {
    const config = REASON_INSTRUCTION_MAP[reason.reasonName as keyof typeof REASON_INSTRUCTION_MAP];

    if (config) {
      const count = contexts.get(config.context) || 0;
      contexts.set(config.context, count + 1);

      // Track indications for context linking
      // All reasons can potentially link to instructions
      detectedIndications.push(reason.reasonName);
    } else if (reason.isCustom) {
      // Custom reasons default to 'other' context
      const count = contexts.get('other') || 0;
      contexts.set('other', count + 1);
      warnings.push(`Custom reason "${reason.reasonName}" - context assumed as 'other'`);
    }
  }

  // Determine the most frequent context
  let maxCount = 0;
  let selectedContext: ReasonContext = 'other';

  for (const [context, count] of contexts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      selectedContext = context;
    }
  }

  // Check for conflicting contexts (e.g., treatment + prevention)
  if (contexts.size > 1) {
    const treatmentCount = contexts.get('treatment') || 0;
    const preventionCount = (contexts.get('prevention') || 0) + (contexts.get('prep') || 0) + (contexts.get('pep') || 0) + (contexts.get('prophylaxis') || 0);

    if (treatmentCount > 0 && preventionCount > 0) {
      conflictingReasons.push(
        ...reasons
          .filter(r => {
            const config = REASON_INSTRUCTION_MAP[r.reasonName as keyof typeof REASON_INSTRUCTION_MAP];
            return config && (
              (config.context === 'treatment' && preventionCount > 0) ||
              (['prevention', 'prep', 'pep', 'prophylaxis'].includes(config.context) && treatmentCount > 0)
            );
          })
          .map(r => r.reasonName)
      );
      warnings.push('Conflicting reasons detected: Both treatment and prevention contexts present');
    }
  }

  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low' = 'low';
  const totalReasons = reasons.length;
  const contextRatio = maxCount / totalReasons;

  if (contextRatio === 1 && totalReasons > 0) {
    confidence = 'high';
  } else if (contextRatio >= 0.6) {
    confidence = 'medium';
  } else {
    confidence = 'low';
    warnings.push('Low confidence in context detection - multiple or conflicting reasons present');
  }

  return {
    context: selectedContext,
    confidence,
    conflictingReasons,
    detectedIndications,
    warnings,
  };
}

// ============================================================================
// Instruction Template Functions
// ============================================================================

/**
 * Get instruction template for medication + context
 * Returns the most appropriate template or null if not found
 * Uses database queries instead of hardcoded templates
 */
export function getInstructionTemplate(
  medicationName: string,
  context: ReasonContext
): InstructionTemplate | null {
  // Query database for instruction template
  const template = getInstructionTemplateForMedication(medicationName, context);
  
  if (template) {
    return template;
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
    const fallback = getInstructionTemplateForMedication(medicationName, fallbackContext);
    if (fallback) {
      return fallback;
    }
  }

  // Return null if no template found
  return null;
}

/**
 * Get all available contexts for a medication
 */
export function getAvailableContextsForMedication(medicationName: string): ReasonContext[] {
  return getContextsForMedication(medicationName);
}

/**
 * Get all instruction templates for a medication
 */
export function getAllTemplatesForMedication(medicationName: string): InstructionTemplate[] {
  return getTemplatesForMedication(medicationName);
}

// ============================================================================
// Day Supply Calculation
// ============================================================================

/**
 * Calculate day supply from quantity and instruction template
 * Uses the template's daySupplyCalculation string to determine multiplier
 */
export function calculateDaySupply(
  quantity: number,
  template: InstructionTemplate | null
): number {
  if (!template || quantity <= 0) {
    // Default fallback: assume 30-day supply
    return 30;
  }

  // Parse multiplier from daySupplyCalculation string
  const multiplier = parseDaySupplyMultiplier(template.daySupplyCalculation);
  
  if (multiplier > 0) {
    return Math.max(1, Math.round(quantity / multiplier));
  }

  // Fallback: estimate based on once-daily dosing
  return Math.max(1, Math.round(quantity));
}

/**
 * Estimate day supply for custom medication (no template available)
 */
export function estimateDaySupplyForCustomMedication(
  medicationName: string,
  quantity: number
): number {
  // Common patterns for estimation
  const lowerName = medicationName.toLowerCase();

  // As-needed medications typically have longer day supply
  if (lowerName.includes('prn') || lowerName.includes('as needed')) {
    return 30;
  }

  // Antibiotics typically 7-14 days
  if (lowerName.includes('antibiotic') || lowerName.includes('infection')) {
    if (quantity <= 10) return 7;
    if (quantity <= 20) return 10;
    return 14;
  }

  // Chronic medications typically 30 days
  return 30;
}

// ============================================================================
// Warning Functions
// ============================================================================

/**
 * Get warnings for medication + context
 * Returns relevant warnings based on the context
 */
export function getWarnings(medicationName: string, context: ReasonContext): string[] {
  const template = getInstructionTemplate(medicationName, context);

  if (!template) {
    return ['No specific warnings available for this medication'];
  }

  // Parse warnings from JSON string if needed
  let warnings: string[] = [];
  if (typeof template.warnings === 'string') {
    try {
      warnings = JSON.parse(template.warnings);
    } catch {
      warnings = [template.warnings];
    }
  } else if (Array.isArray(template.warnings)) {
    warnings = template.warnings;
  }

  // Add context-specific warnings
  switch (context) {
    case 'pep':
      warnings.push('PEP must be started within 72 hours of exposure');
      warnings.push('Complete full course even if feeling well');
      break;
    case 'prep':
      warnings.push('PrEP does not protect against other STIs');
      warnings.push('HIV testing required every 3 months');
      break;
    case 'treatment':
      warnings.push('Do not stop medication without consulting provider');
      break;
    case 'prophylaxis':
      warnings.push('Take as directed for full protection');
      break;
  }

  return warnings;
}

// ============================================================================
// Short Dosing Functions
// ============================================================================

/**
 * Get short dosing instructions for label
 * Returns concise dosing information suitable for pharmacy labels
 */
export function getShortDosing(
  medicationName: string,
  context: ReasonContext,
  quantity?: number
): string {
  const template = getInstructionTemplate(medicationName, context);

  if (!template) {
    return 'Take as directed by healthcare provider';
  }

  let dosing = template.shortDosing;

  // Add quantity context if provided
  if (quantity !== undefined && template.daySupplyCalculation) {
    // Parse day supply from calculation string
    const multiplier = parseDaySupplyMultiplier(template.daySupplyCalculation);
    const daySupply = quantity > 0 && multiplier > 0 ? Math.round(quantity / multiplier) : 0;
    if (daySupply > 0 && daySupply <= 365) {
      dosing += ` (${daySupply}-day supply)`;
    }
  }

  return dosing;
}

/**
 * Get full instructions formatted for patient education
 */
export function getFullInstructions(medicationName: string, context: ReasonContext): string[] {
  const template = getInstructionTemplate(medicationName, context);

  if (!template) {
    return ['Consult your healthcare provider for specific instructions'];
  }

  // Parse full instructions from JSON string if needed
  if (typeof template.fullInstructions === 'string') {
    try {
      return JSON.parse(template.fullInstructions);
    } catch {
      return [template.fullInstructions];
    }
  } else if (Array.isArray(template.fullInstructions)) {
    return template.fullInstructions;
  }
  
  return [];
}

// Helper to parse day supply multiplier from calculation string
function parseDaySupplyMultiplier(calculation: string): number {
  if (!calculation) return 1;
  
  const match = calculation.match(/(\d+(?:\.\d+)?)\s*(?:tablet|cap|pill|dose|unit).*?(?:per|\/)\s*day/i);
  if (match) {
    return parseFloat(match[1]);
  }
  
  const numMatch = calculation.match(/(\d+(?:\.\d+)?)/);
  return numMatch ? parseFloat(numMatch[1]) : 1;
}

// ============================================================================
// Dispensing Line Item Population
// ============================================================================

/**
 * Auto-populate dispensing line item with instruction data
 * This is the main integration function that combines all services
 */
export async function populateLineItemInstructions(
  medicationName: string,
  lotId: string | number,
  reasons: DispenseReason[],
  quantity: number
): Promise<DispensingLineItemData> {
  // Get context from reasons
  const contextResult = getContextFromReasons(reasons);

  // Validate lot using inventory module
  let lotValidation: LotValidationResult;

  if (typeof lotId === 'string') {
    // If lot number is provided, look up the lot first
    const lot = getLotByNumber(lotId);
    if (lot) {
      lotValidation = validateInventoryLot(lot.id, quantity);
    } else {
      lotValidation = {
        valid: false,
        errors: [`Lot not found: ${lotId}`],
        warnings: [],
      };
    }
  } else {
    // Use the inventory module's validation directly
    lotValidation = validateInventoryLot(lotId, quantity);
  }

  // Check validation result
  if (!lotValidation.valid) {
    const error: InstructionServiceError = new Error(
      lotValidation.errors.join('; ')
    ) as InstructionServiceError;
    error.code = lotValidation.errors.some(e => e.includes('expired')) ? 'LOT_EXPIRED' : 'LOT_NOT_FOUND';
    throw error;
  }

  const inventory = lotValidation.lot!;

  // Get instruction template from database
  const template = getInstructionTemplate(medicationName, contextResult.context);

  // Build dosing instructions
  let dosingInstructions: string;
  let daySupply: number;
  let warnings: string[] = [];
  let indication: string | undefined;
  let additionalLabelInfo: string | undefined;
  let storageRequirements: string | undefined;
  let medicationStrength: string | undefined;

  if (template) {
    dosingInstructions = template.shortDosing;
    daySupply = calculateDaySupply(quantity, template);
    
    // Parse warnings from JSON
    if (typeof template.warnings === 'string') {
      try {
        warnings = JSON.parse(template.warnings);
      } catch {
        warnings = [template.warnings];
      }
    } else if (Array.isArray(template.warnings)) {
      warnings = template.warnings;
    }
    
    indication = template.indication;
    medicationStrength = template.strength || undefined;

    // Add context-specific info to dosing
    const multiplier = parseDaySupplyMultiplier(template.daySupplyCalculation);
    if (template.context === 'pep' && multiplier === 28) {
      dosingInstructions += ' for 28 days - Complete full course';
    } else if (template.context === 'treatment' && multiplier <= 14) {
      dosingInstructions += ` - Complete all ${multiplier} days`;
    }
  } else {
    // Custom medication fallback
    dosingInstructions = 'Take as directed by healthcare provider';
    daySupply = estimateDaySupplyForCustomMedication(medicationName, quantity);
    warnings = ['Custom medication - verify dosing with prescriber'];
    warnings.push(...contextResult.warnings);
  }

  // Add context detection warnings if any
  if (contextResult.warnings.length > 0) {
    warnings.push(...contextResult.warnings);
  }

  return {
    medicationName: inventory.medication_name,
    medicationStrength,
    amountValue: quantity,
    amountUnit: inventory.unit,
    lotNumber: typeof lotId === 'string' ? lotId : undefined,
    expirationDate: inventory.expiration_date,
    inventoryId: inventory.id,
    dosingInstructions,
    daySupply,
    warnings,
    instructionContext: contextResult.context,
    indication,
    additionalLabelInfo,
    storageRequirements,
  };
}

// ============================================================================
// Lot Validation (using inventory module)
// ============================================================================

/**
 * Validate lot for dispensing
 * Delegates to the inventory module's validateLotForDispensing function
 * Supports both lot ID (number) and lot number (string)
 */
export function validateLotForDispensing(
  lotId: string | number,
  quantity: number
): LotValidationResult {
  let lotValidation: LotValidationResult;

  if (typeof lotId === 'string') {
    // If lot number is provided, look up the lot first
    const lot = getLotByNumber(lotId);
    if (lot) {
      lotValidation = validateLotForDispensingFromInventory(lot.id, quantity);
    } else {
      lotValidation = {
        valid: false,
        errors: [`Lot not found: ${lotId}`],
        warnings: [],
      };
    }
  } else {
    // Use the inventory module's validation directly
    lotValidation = validateLotForDispensingFromInventory(lotId, quantity);
  }

  return lotValidation;
}

// Internal wrapper to avoid name collision - delegates to inventory module
function validateLotForDispensingFromInventory(lotId: number, quantity: number): LotValidationResult {
  // Calls the aliased import from inventory queries
  return validateInventoryLot(lotId, quantity);
}

// ============================================================================
// Batch Processing
// ============================================================================

/**
 * Populate multiple line items at once
 * Useful for multi-medication dispensing scenarios
 */
export async function populateMultipleLineItems(
  items: Array<{
    medicationName: string;
    lotId: string | number;
    quantity: number;
  }>,
  reasons: DispenseReason[]
): Promise<{
  items: DispensingLineItemData[];
  globalWarnings: string[];
  errors: Array<{ index: number; error: string }>;
}> {
  const contextResult = getContextFromReasons(reasons);
  const populatedItems: DispensingLineItemData[] = [];
  const errors: Array<{ index: number; error: string }> = [];
  const globalWarnings: string[] = [];

  // Check for context conflicts
  if (contextResult.conflictingReasons.length > 0) {
    globalWarnings.push(
      `Conflicting contexts detected: ${contextResult.conflictingReasons.join(', ')}`
    );
  }

  // Process each item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const populated = await populateLineItemInstructions(
        item.medicationName,
        item.lotId,
        reasons,
        item.quantity
      );
      populatedItems.push(populated);
    } catch (error) {
      errors.push({
        index: i,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    items: populatedItems,
    globalWarnings,
    errors,
  };
}

// ============================================================================
// Export
// ============================================================================

export default {
  getContextFromReasons,
  getInstructionTemplate,
  calculateDaySupply,
  estimateDaySupplyForCustomMedication,
  getWarnings,
  getShortDosing,
  getFullInstructions,
  populateLineItemInstructions,
  validateLotForDispensing,
  populateMultipleLineItems,
  getAvailableContextsForMedication,
  getAllTemplatesForMedication,
};
