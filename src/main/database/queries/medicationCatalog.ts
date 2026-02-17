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
export function getMedicationsByContext(context: ReasonContext): MedicationCatalogEntry[] {
  const db = getDatabase();
  
  const results = db.prepare(`
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
  `).all(context) as Array<{
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

  return results.map(r => ({
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
 * Get instruction template for a specific medication and context
 */
export function getInstructionTemplateForMedication(
  medicationName: string,
  context: ReasonContext
): InstructionTemplate | null {
  const db = getDatabase();
  
  const result = db.prepare(`
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
    LIMIT 1
  `).get(medicationName, context) as {
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
  } | undefined;

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    medicationCatalogId: result.medicationCatalogId,
    medicationName: result.medicationName,
    strength: result.strength,
    defaultUnit: result.defaultUnit,
    context: result.context,
    indication: result.indication,
    shortDosing: result.shortDosing,
    fullInstructions: result.fullInstructions,
    warnings: result.warnings,
    daySupplyCalculation: result.daySupplyCalculation,
    commonReasons: result.commonReasons,
    isActive: result.isActive === 1,
  };
}

/**
 * Get all instruction templates for a medication (all contexts)
 */
export function getTemplatesForMedication(medicationName: string): InstructionTemplate[] {
  const db = getDatabase();
  
  const results = db.prepare(`
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
  `).all(medicationName) as Array<{
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

  return results.map(r => ({
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
export function getContextsForMedication(medicationName: string): ReasonContext[] {
  const db = getDatabase();
  
  const results = db.prepare(`
    SELECT DISTINCT mit.context
    FROM medication_instruction_templates mit
    JOIN medication_catalog mc ON mit.medication_catalog_id = mc.id
    WHERE mc.medication_name = ? 
      AND mit.is_active = 1
      AND mc.is_active = 1
    ORDER BY mit.context
  `).all(medicationName) as Array<{ context: ReasonContext }>;

  return results.map(r => r.context);
}

/**
 * Get all medications from catalog (for general search)
 */
export function getAllMedicationsFromCatalog(): MedicationCatalogEntry[] {
  const db = getDatabase();
  
  const results = db.prepare(`
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
  `).all() as Array<{
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

  return results.map(r => ({
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
