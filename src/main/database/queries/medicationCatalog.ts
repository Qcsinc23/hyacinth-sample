/**
 * Medication Catalog Queries
 * Query medication catalog and instruction templates from database
 */

import { getDatabase } from '../db';
import type { ReasonContext } from '../../../shared/types';

/**
 * Medication catalog entry with instruction template info
 */
export interface MedicationCatalogEntry {
  id: number;
  medicationName: string;
  genericName: string | null;
  strength: string | null;
  dosageForm: string;
  category: string;
  ndcCode: string | null;
  defaultUnit: string;
  isControlled: boolean;
  schedule: string | null;
  storageRequirements: string | null;
  isActive: boolean;
}

/**
 * Instruction template from database
 */
export interface InstructionTemplate {
  id: number;
  medicationCatalogId: number;
  medicationName: string;
  strength: string | null;
  defaultUnit: string;
  context: ReasonContext;
  indication: string;
  shortDosing: string;
  fullInstructions: string; // JSON string
  warnings: string; // JSON string
  daySupplyCalculation: string;
  commonReasons: string; // JSON string
  isActive: boolean;
}

/**
 * Get medications that have instruction templates for a specific context
 */
export function getMedicationsByContext(
  context: ReasonContext,
): MedicationCatalogEntry[] {
  const db = getDatabase();

  const results = db
    .prepare(
      `
    SELECT DISTINCT 
      mc.id,
      mc.medication_name as medicationName,
      mc.generic_name as genericName,
      mc.strength,
      mc.dosage_form as dosageForm,
      mc.category,
      mc.ndc_code as ndcCode,
      mc.default_unit as defaultUnit,
      mc.is_controlled as isControlled,
      mc.schedule,
      mc.storage_requirements as storageRequirements,
      mc.is_active as isActive
    FROM medication_catalog mc
    JOIN medication_instruction_templates mit ON mc.id = mit.medication_catalog_id
    WHERE mit.context = ? 
      AND mc.is_active = 1 
      AND mit.is_active = 1
    ORDER BY mc.medication_name
  `,
    )
    .all(context) as Array<{
    id: number;
    medicationName: string;
    genericName: string | null;
    strength: string | null;
    dosageForm: string;
    category: string;
    ndcCode: string | null;
    defaultUnit: string;
    isControlled: number;
    schedule: string | null;
    storageRequirements: string | null;
    isActive: number;
  }>;

  return results.map((r) => ({
    id: r.id,
    medicationName: r.medicationName,
    genericName: r.genericName,
    strength: r.strength,
    dosageForm: r.dosageForm,
    category: r.category,
    ndcCode: r.ndcCode,
    defaultUnit: r.defaultUnit,
    isControlled: r.isControlled === 1,
    schedule: r.schedule,
    storageRequirements: r.storageRequirements,
    isActive: r.isActive === 1,
  }));
}

function mapResultToTemplate(r: {
  id: number;
  medicationCatalogId: number;
  medicationName: string;
  strength: string | null;
  defaultUnit: string;
  context: ReasonContext;
  indication: string;
  shortDosing: string;
  fullInstructions: string;
  warnings: string;
  daySupplyCalculation: string;
  commonReasons: string;
  isActive: number;
}): InstructionTemplate {
  return {
    id: r.id,
    medicationCatalogId: r.medicationCatalogId,
    medicationName: r.medicationName,
    strength: r.strength,
    defaultUnit: r.defaultUnit,
    context: r.context,
    indication: r.indication,
    shortDosing: r.shortDosing,
    fullInstructions: r.fullInstructions,
    warnings: r.warnings,
    daySupplyCalculation: r.daySupplyCalculation,
    commonReasons: r.commonReasons,
    isActive: r.isActive === 1,
  };
}

/**
 * Get instruction template for a specific medication, context, and optional reason.
 * When reason is provided and multiple templates exist for (medication, context),
 * returns the one whose common_reasons JSON array contains the reason.
 */
export function getInstructionTemplateForMedication(
  medicationName: string,
  context: ReasonContext,
  reason?: string,
): InstructionTemplate | null {
  const db = getDatabase();

  const results = db
    .prepare(
      `
    SELECT 
      mit.id,
      mit.medication_catalog_id as medicationCatalogId,
      mc.medication_name as medicationName,
      mc.strength,
      mc.default_unit as defaultUnit,
      mit.context,
      mit.indication,
      mit.short_dosing as shortDosing,
      mit.full_instructions as fullInstructions,
      mit.warnings,
      mit.day_supply_calculation as daySupplyCalculation,
      mit.common_reasons as commonReasons,
      mit.is_active as isActive
    FROM medication_instruction_templates mit
    JOIN medication_catalog mc ON mit.medication_catalog_id = mc.id
    WHERE mc.medication_name = ? 
      AND mit.context = ? 
      AND mit.is_active = 1
      AND mc.is_active = 1
    ORDER BY mit.id
  `,
    )
    .all(medicationName, context) as Array<{
    id: number;
    medicationCatalogId: number;
    medicationName: string;
    strength: string | null;
    defaultUnit: string;
    context: ReasonContext;
    indication: string;
    shortDosing: string;
    fullInstructions: string;
    warnings: string;
    daySupplyCalculation: string;
    commonReasons: string;
    isActive: number;
  }>;

  if (results.length === 0) {
    return null;
  }

  if (results.length === 1) {
    return mapResultToTemplate(results[0]);
  }

  // Multiple templates - use reason to pick best match
  if (reason && reason.trim()) {
    const reasonLower = reason.trim().toLowerCase();
    for (const r of results) {
      try {
        const commonReasons = JSON.parse(r.commonReasons || '[]') as string[];
        const match = commonReasons.some(
          (cr) => cr && cr.toLowerCase().includes(reasonLower),
        );
        if (match) return mapResultToTemplate(r);
      } catch {
        // Invalid JSON - skip
      }
    }
    // Also try matching indication (e.g. "Chlamydia" in "Chlamydia Treatment")
    for (const r of results) {
      if (r.indication && r.indication.toLowerCase().includes(reasonLower)) {
        return mapResultToTemplate(r);
      }
    }
  }

  return mapResultToTemplate(results[0]);
}


/**
 * Get all instruction templates for a medication (all contexts)
 */
export function getTemplatesForMedication(
  medicationName: string,
): InstructionTemplate[] {
  const db = getDatabase();

  const results = db
    .prepare(
      `
    SELECT 
      mit.id,
      mit.medication_catalog_id as medicationCatalogId,
      mc.medication_name as medicationName,
      mc.strength,
      mc.default_unit as defaultUnit,
      mit.context,
      mit.indication,
      mit.short_dosing as shortDosing,
      mit.full_instructions as fullInstructions,
      mit.warnings,
      mit.day_supply_calculation as daySupplyCalculation,
      mit.common_reasons as commonReasons,
      mit.is_active as isActive
    FROM medication_instruction_templates mit
    JOIN medication_catalog mc ON mit.medication_catalog_id = mc.id
    WHERE mc.medication_name = ? 
      AND mit.is_active = 1
      AND mc.is_active = 1
    ORDER BY mit.context
  `,
    )
    .all(medicationName) as Array<{
    id: number;
    medicationCatalogId: number;
    medicationName: string;
    strength: string | null;
    defaultUnit: string;
    context: ReasonContext;
    indication: string;
    shortDosing: string;
    fullInstructions: string;
    warnings: string;
    daySupplyCalculation: string;
    commonReasons: string;
    isActive: number;
  }>;

  return results.map((r) => ({
    id: r.id,
    medicationCatalogId: r.medicationCatalogId,
    medicationName: r.medicationName,
    strength: r.strength,
    defaultUnit: r.defaultUnit,
    context: r.context,
    indication: r.indication,
    shortDosing: r.shortDosing,
    fullInstructions: r.fullInstructions,
    warnings: r.warnings,
    daySupplyCalculation: r.daySupplyCalculation,
    commonReasons: r.commonReasons,
    isActive: r.isActive === 1,
  }));
}

/**
 * Get contexts available for a medication
 */
export function getContextsForMedication(
  medicationName: string,
): ReasonContext[] {
  const db = getDatabase();

  const results = db
    .prepare(
      `
    SELECT DISTINCT mit.context
    FROM medication_instruction_templates mit
    JOIN medication_catalog mc ON mit.medication_catalog_id = mc.id
    WHERE mc.medication_name = ? 
      AND mit.is_active = 1
      AND mc.is_active = 1
    ORDER BY mit.context
  `,
    )
    .all(medicationName) as Array<{ context: ReasonContext }>;

  return results.map((r) => r.context);
}

/**
 * Get all medications from catalog (for general search)
 */
export function getAllMedicationsFromCatalog(): MedicationCatalogEntry[] {
  const db = getDatabase();

  const results = db
    .prepare(
      `
    SELECT 
      id,
      medication_name as medicationName,
      generic_name as genericName,
      strength,
      dosage_form as dosageForm,
      category,
      ndc_code as ndcCode,
      default_unit as defaultUnit,
      is_controlled as isControlled,
      schedule,
      storage_requirements as storageRequirements,
      is_active as isActive
    FROM medication_catalog
    WHERE is_active = 1
    ORDER BY medication_name
  `,
    )
    .all() as Array<{
    id: number;
    medicationName: string;
    genericName: string | null;
    strength: string | null;
    dosageForm: string;
    category: string;
    ndcCode: string | null;
    defaultUnit: string;
    isControlled: number;
    schedule: string | null;
    storageRequirements: string | null;
    isActive: number;
  }>;

  return results.map((r) => ({
    id: r.id,
    medicationName: r.medicationName,
    genericName: r.genericName,
    strength: r.strength,
    dosageForm: r.dosageForm,
    category: r.category,
    ndcCode: r.ndcCode,
    defaultUnit: r.defaultUnit,
    isControlled: r.isControlled === 1,
    schedule: r.schedule,
    storageRequirements: r.storageRequirements,
    isActive: r.isActive === 1,
  }));
}

/**
 * Get all instruction templates (for admin editing)
 */
export function getAllInstructionTemplates(): InstructionTemplate[] {
  const db = getDatabase();

  const results = db
    .prepare(
      `
    SELECT 
      mit.id,
      mit.medication_catalog_id as medicationCatalogId,
      mc.medication_name as medicationName,
      mc.strength,
      mc.default_unit as defaultUnit,
      mit.context,
      mit.indication,
      mit.short_dosing as shortDosing,
      mit.full_instructions as fullInstructions,
      mit.warnings,
      mit.day_supply_calculation as daySupplyCalculation,
      mit.common_reasons as commonReasons,
      mit.is_active as isActive
    FROM medication_instruction_templates mit
    JOIN medication_catalog mc ON mit.medication_catalog_id = mc.id
    WHERE mit.is_active = 1 AND mc.is_active = 1
    ORDER BY mc.medication_name, mit.indication
  `,
    )
    .all() as Array<{
    id: number;
    medicationCatalogId: number;
    medicationName: string;
    strength: string | null;
    defaultUnit: string;
    context: ReasonContext;
    indication: string;
    shortDosing: string;
    fullInstructions: string;
    warnings: string;
    daySupplyCalculation: string;
    commonReasons: string;
    isActive: number;
  }>;

  return results.map((r) => ({
    id: r.id,
    medicationCatalogId: r.medicationCatalogId,
    medicationName: r.medicationName,
    strength: r.strength,
    defaultUnit: r.defaultUnit,
    context: r.context,
    indication: r.indication,
    shortDosing: r.shortDosing,
    fullInstructions: r.fullInstructions,
    warnings: r.warnings,
    daySupplyCalculation: r.daySupplyCalculation,
    commonReasons: r.commonReasons,
    isActive: r.isActive === 1,
  }));
}

/**
 * Update instruction template (short dosing, full instructions, warnings)
 */
export function updateInstructionTemplate(
  id: number,
  updates: { shortDosing?: string; fullInstructions?: string; warnings?: string },
): boolean {
  const db = getDatabase();
  const parts: string[] = ["updated_at = datetime('now')"];
  const vals: (string | number)[] = [];

  if (updates.shortDosing !== undefined) {
    parts.push('short_dosing = ?');
    vals.push(updates.shortDosing);
  }
  if (updates.fullInstructions !== undefined) {
    parts.push('full_instructions = ?');
    vals.push(updates.fullInstructions);
  }
  if (updates.warnings !== undefined) {
    parts.push('warnings = ?');
    vals.push(updates.warnings);
  }

  if (vals.length === 0) return false;
  vals.push(id);
  const stmt = db.prepare(
    `UPDATE medication_instruction_templates SET ${parts.join(', ')} WHERE id = ?`,
  );
  const result = stmt.run(...vals);
  return (result as { changes: number }).changes > 0;
}
