/**
 * Dispensing Templates
 * Pre-configured templates for common dispensing scenarios
 */

export interface DispensingTemplate {
  id: string;
  name: string;
  description: string;
  category: 'nPEP' | 'PrEP' | 'Treatment' | 'Prophylaxis' | 'UTI' | 'STI' | 'Other';
  medicationName: string;
  quantity: number;
  daySupply: number;
  unit: string;
  directions: string;
  instructions: string[];
  warnings?: string[];
  commonReasons: string[];
}

/**
 * Common prescription templates for quick dispensing
 */
export const DISPENSING_TEMPLATES: DispensingTemplate[] = [
  {
    id: 'biktarvy-npep-28',
    name: 'Biktarvy nPEP (28 days)',
    description: 'Non-occupational Post-Exposure Prophylaxis - 28 day course',
    category: 'nPEP',
    medicationName: 'Biktarvy (nPEP)',
    quantity: 30,
    daySupply: 28,
    unit: 'tablets',
    directions: 'Take 1 tablet by mouth once daily for 28 days',
    instructions: [
      'Must be started within 72 hours of exposure',
      'Take 2 hours BEFORE or 6 hours AFTER medications containing polyvalent cations (aluminum, calcium, iron, magnesium)',
      'Alternative for calcium/iron: Can be taken together WITH food',
    ],
    warnings: [
      'Do not miss doses; resistance can develop',
      'Do not stop without consulting healthcare provider',
      'Hepatitis B: Severe acute exacerbations possible if discontinued',
    ],
    commonReasons: ['nPEP (non-occupational Post-Exposure Prophylaxis)', 'HIV Exposure'],
  },
  {
    id: 'descovy-prep-30',
    name: 'Descovy PrEP (30 days)',
    description: 'Pre-Exposure Prophylaxis - 30 day supply',
    category: 'PrEP',
    medicationName: 'Descovy (PrEP)',
    quantity: 30,
    daySupply: 30,
    unit: 'tablets',
    directions: 'Take 1 tablet by mouth once daily',
    instructions: [
      'Must be taken EVERY DAY, not just when exposure is anticipated',
      'Time to maximum protection is unknown; use additional prevention measures',
    ],
    warnings: [
      'Descovy for PrEP does NOT protect against other STIs - use condoms',
      'Must be confirmed HIV-negative before starting and every 3 months',
    ],
    commonReasons: ['PrEP (Pre-Exposure Prophylaxis)', 'HIV Prevention'],
  },
  {
    id: 'doxy-pep-2',
    name: 'Doxy-PEP (2 tablets)',
    description: 'STI Post-Exposure Prophylaxis - Single dose',
    category: 'STI',
    medicationName: 'Doxycycline (Doxy-PEP)',
    quantity: 2,
    daySupply: 1,
    unit: 'tablets',
    directions: 'Take 2 tablets by mouth as a single dose within 72 hours after sex',
    instructions: [
      '3-2-1 Rule: Within 3 days (72 hours) of condomless sexual encounter, take 2 tablets (200mg), just 1 time',
      'Take with food and full glass of water',
      'Do NOT lie down for 1 hour after taking',
    ],
    warnings: [
      'Doxy-PEP is NOT 100% protective: Continue using condoms and other prevention',
      'Does NOT prevent gonorrhea consistently',
    ],
    commonReasons: ['Doxy-PEP', 'STI Prevention'],
  },
  {
    id: 'bactrim-uti-14',
    name: 'Bactrim DS UTI Treatment',
    description: 'Urinary Tract Infection - 7 day course',
    category: 'UTI',
    medicationName: 'Bactrim DS (UTI Treatment)',
    quantity: 14,
    daySupply: 7,
    unit: 'tablets',
    directions: 'Take 1 tablet by mouth twice daily for 7 days',
    instructions: [
      'Take with food if stomach upset occurs',
      'Drink plenty of fluids',
    ],
    warnings: [
      'Complete FULL 7 days even if feeling better',
      'Sun sensitivity: May increase risk of sunburn; use sunscreen',
    ],
    commonReasons: ['UTI Treatment', 'Urinary Tract Infection'],
  },
  {
    id: 'bactrim-pcp-30',
    name: 'Bactrim DS PCP Prophylaxis',
    description: 'PCP Prophylaxis - Monthly supply',
    category: 'Prophylaxis',
    medicationName: 'Bactrim DS (PCP Prophylaxis)',
    quantity: 30,
    daySupply: 30,
    unit: 'tablets',
    directions: 'Take 1 tablet by mouth once daily',
    instructions: [
      'Take with food if stomach upset occurs',
      'Drink plenty of fluids to prevent kidney stones',
    ],
    warnings: [
      'Sun sensitivity: May increase risk of sunburn; use sunscreen',
      'Report immediately: Rash, fever, sore throat, unusual bruising/bleeding',
    ],
    commonReasons: ['PCP Prophylaxis', 'Pneumocystis jirovecii pneumonia prevention'],
  },
  {
    id: 'bactrim-toxo-30',
    name: 'Bactrim DS Toxoplasmosis Prophylaxis',
    description: 'Toxoplasmosis Prophylaxis - Monthly supply',
    category: 'Prophylaxis',
    medicationName: 'Bactrim DS (Toxoplasmosis Prophylaxis)',
    quantity: 30,
    daySupply: 30,
    unit: 'tablets',
    directions: 'Take 1 tablet by mouth once daily',
    instructions: [
      'Take with food if stomach upset occurs',
      'Drink plenty of fluids',
    ],
    warnings: [
      'Sun sensitivity: May increase risk of sunburn; use sunscreen',
      'Report rash, fever, or unusual bruising immediately',
    ],
    commonReasons: ['Toxoplasmosis Prophylaxis', 'Toxoplasma gondii prevention'],
  },
  {
    id: 'biktarvy-treatment-30',
    name: 'Biktarvy Treatment (30 days)',
    description: 'HIV Treatment - Initial therapy, 30 day supply',
    category: 'Treatment',
    medicationName: 'Biktarvy (ID - Treatment Naive)',
    quantity: 30,
    daySupply: 30,
    unit: 'tablets',
    directions: 'Take 1 tablet by mouth once daily',
    instructions: [
      'Same time each day for optimal effectiveness',
      'Take 2 hours BEFORE or 6 hours AFTER antacids with aluminum/magnesium',
      'Calcium and iron supplements can be taken with Biktarvy if taken with food',
    ],
    warnings: [
      'Do not stop taking Biktarvy without talking to your doctor',
      'This medicine is not a cure for HIV; you may still develop infections',
    ],
    commonReasons: ['HIV Treatment', 'Antiretroviral Therapy'],
  },
  {
    id: 'descovy-treatment-30',
    name: 'Descovy HIV Treatment (30 days)',
    description: 'HIV Treatment - 30 day supply',
    category: 'Treatment',
    medicationName: 'Descovy (HIV Treatment)',
    quantity: 30,
    daySupply: 30,
    unit: 'tablets',
    directions: 'Take 1 tablet by mouth once daily with other HIV medications',
    instructions: [
      'Must be taken with other HIV medications as prescribed',
    ],
    warnings: [
      'Do not discontinue without provider consultation (Hepatitis B risk)',
      'Report symptoms of lactic acidosis: weakness, muscle pain, difficulty breathing',
    ],
    commonReasons: ['HIV Treatment', 'Antiretroviral Therapy'],
  },
  {
    id: 'symtuza-30',
    name: 'Symtuza (30 days)',
    description: 'Complete HIV regimen - 30 day supply',
    category: 'Treatment',
    medicationName: 'Symtuza',
    quantity: 30,
    daySupply: 30,
    unit: 'tablets',
    directions: 'Take 1 tablet by mouth once daily with food',
    instructions: [
      'MUST be taken WITH FOOD (essential for absorption)',
      'Same time each day',
    ],
    warnings: [
      'Always take with food - improves absorption',
      'Do not miss doses - resistance can develop',
    ],
    commonReasons: ['HIV Treatment', 'Complete Regimen'],
  },
  {
    id: 'dovato-30',
    name: 'Dovato (30 days)',
    description: 'HIV Treatment - 30 day supply',
    category: 'Treatment',
    medicationName: 'Dovato',
    quantity: 30,
    daySupply: 30,
    unit: 'tablets',
    directions: 'Take 1 tablet by mouth once daily',
    instructions: [
      'Same time each day',
    ],
    warnings: [
      'Do not stop treatment without consulting provider',
      'This medication does not cure HIV; infections may still occur',
    ],
    commonReasons: ['HIV Treatment', 'Antiretroviral Therapy'],
  },
  {
    id: 'doxy-chlamydia-14',
    name: 'Doxycycline Chlamydia Treatment',
    description: 'Chlamydia Treatment - 7 day course',
    category: 'STI',
    medicationName: 'Doxycycline (Chlamydia Treatment)',
    quantity: 14,
    daySupply: 7,
    unit: 'capsules',
    directions: 'Take 1 capsule by mouth twice daily for 7 days',
    instructions: [
      'Take with food and full glass of water',
      'Do NOT lie down for 1 hour after taking',
    ],
    warnings: [
      'Complete FULL 7 days even if feeling better',
      'Sexual partners must also be treated',
    ],
    commonReasons: ['Chlamydia Treatment', 'STI Treatment'],
  },
  {
    id: 'doxy-syphilis-28',
    name: 'Doxycycline Syphilis Treatment',
    description: 'Early Syphilis Treatment - 14 day course',
    category: 'STI',
    medicationName: 'Doxycycline (Syphilis Treatment)',
    quantity: 28,
    daySupply: 14,
    unit: 'tablets',
    directions: 'Take 1 tablet by mouth twice daily for 14 days',
    instructions: [
      'Take with food and full glass of water',
      'Do NOT lie down for 1 hour after taking',
    ],
    warnings: [
      'Complete FULL 14 days even if feeling better',
      'Follow-up testing required after treatment',
    ],
    commonReasons: ['Syphilis Treatment', 'STI Treatment'],
  },
];

/**
 * Get template by ID
 */
export const getTemplateById = (id: string): DispensingTemplate | undefined => {
  return DISPENSING_TEMPLATES.find((t) => t.id === id);
};

/**
 * Get templates by category
 */
export const getTemplatesByCategory = (category: DispensingTemplate['category']): DispensingTemplate[] => {
  return DISPENSING_TEMPLATES.filter((t) => t.category === category);
};

/**
 * Get all template categories
 */
export const getTemplateCategories = (): DispensingTemplate['category'][] => {
  return [...new Set(DISPENSING_TEMPLATES.map((t) => t.category))];
};

/**
 * Search templates by name or description
 */
export const searchTemplates = (query: string): DispensingTemplate[] => {
  const lowerQuery = query.toLowerCase();
  return DISPENSING_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.medicationName.toLowerCase().includes(lowerQuery)
  );
};

export default DISPENSING_TEMPLATES;
