/**
 * Complete Medication Data with Dosing Instructions
 * Based on Hyacinth Health and Wellness Clinic Documentation
 */

export interface MedicationDetails {
  id: string;
  name: string;
  genericName: string;
  strength: string;
  form: string;
  indication: string;
  category: string;
  
  // Dosing Information
  standardDose: string;
  frequency: string;
  duration: string;
  
  // Administration
  withFood: 'yes' | 'no' | 'either' | 'required';
  specialInstructions: string[];
  missedDoseInstructions: string;
  
  // Warnings and Interactions
  warnings: string[];
  drugInteractions: string[];
  
  // Patient Counseling
  counselingPoints: string[];
  
  // Monitoring
  monitoringRequirements: string[];
  
  // Special Populations
  renalConsiderations: string;
  hepaticConsiderations: string;
  pregnancyCategory: string;
  
  // Storage
  storageInstructions: string;
  
  // Default Dispensing
  defaultQuantity: number;
  defaultDaySupply: number;
  unit: string;
}

export const MEDICATIONS_DATA: Record<string, MedicationDetails> = {
  // BIKTARVY (nPEP)
  'Biktarvy (nPEP)': {
    id: 'biktarvy-npep',
    name: 'Biktarvy (nPEP)',
    genericName: 'Bictegravir/Emtricitabine/Tenofovir Alafenamide (BIC/FTC/TAF)',
    strength: '50mg/200mg/25mg',
    form: 'tablet',
    indication: 'Non-occupational Post-Exposure Prophylaxis (nPEP) for HIV',
    category: 'ARV',
    standardDose: '1 tablet once daily',
    frequency: 'Once daily',
    duration: '28 days of continuous therapy',
    withFood: 'either',
    specialInstructions: [
      'Must be started within 72 hours of exposure',
      'Take 2 hours BEFORE or 6 hours AFTER medications containing polyvalent cations (aluminum, calcium, iron, magnesium)',
      'Alternative for calcium/iron: Can be taken together WITH food',
      'Tablet can be split for children; both halves must be taken within 10 minutes',
    ],
    missedDoseInstructions: 'Take as soon as remembered unless within 4 hours of next dose; do not double dose',
    warnings: [
      'Do not miss doses; resistance can develop',
      'Do not stop without consulting healthcare provider',
      'Hepatitis B: Severe acute exacerbations possible if discontinued; requires close monitoring',
    ],
    drugInteractions: [
      'Contraindicated: Dofetilide, Rifampin, St. John\'s wort',
      'Take 2 hours BEFORE or 6 hours AFTER antacids containing aluminum/magnesium',
      'Calcium/iron OK if taken WITH food',
    ],
    counselingPoints: [
      'Do not miss doses; resistance can develop',
      'Do not stop without consulting healthcare provider',
      'Common side effects: Diarrhea, nausea, headache',
      'Report signs of allergic reaction immediately (rash, fever, difficulty breathing)',
    ],
    monitoringRequirements: [
      'HIV testing at baseline and completion',
      'Hepatitis B screening',
    ],
    renalConsiderations: 'eCrCl ≥30 mL/min: Standard dose. eCrCl <30 mL/min (not on HD): Not recommended. On hemodialysis: Standard dose, take AFTER dialysis on dialysis days.',
    hepaticConsiderations: 'Child-Pugh A or B: Standard dose. Child-Pugh C: Not recommended.',
    pregnancyCategory: 'Consult provider - pregnancy registry available',
    storageInstructions: 'Store in original container with desiccant; keep tightly closed at room temperature',
    defaultQuantity: 30,
    defaultDaySupply: 28,
    unit: 'tablets',
  },

  // BIKTARVY (ID - Treatment Naive)
  'Biktarvy (ID - Treatment Naive)': {
    id: 'biktarvy-id',
    name: 'Biktarvy (ID - Treatment Naive)',
    genericName: 'Bictegravir/Emtricitabine/Tenofovir Alafenamide (BIC/FTC/TAF)',
    strength: '50mg/200mg/25mg',
    form: 'tablet',
    indication: 'Initial treatment of HIV-1 infection (treatment-naive patients)',
    category: 'ARV',
    standardDose: '1 tablet once daily',
    frequency: 'Once daily',
    duration: 'Continuous therapy',
    withFood: 'either',
    specialInstructions: [
      'Same time each day for optimal effectiveness',
      'Take 2 hours BEFORE or 6 hours AFTER antacids with aluminum/magnesium',
      'Calcium and iron supplements can be taken with Biktarvy if taken with food',
    ],
    missedDoseInstructions: 'If within 18 hours of usual time: Take as soon as possible, then next dose at usual time. If 18+ hours after usual time: Skip missed dose, take next dose at usual time.',
    warnings: [
      'Do not stop taking Biktarvy without talking to your doctor - especially important for patients with Hepatitis B co-infection',
      'This medicine is not a cure for HIV; you may still develop infections',
      'Hepatitis B: Severe acute exacerbations possible if discontinued',
    ],
    drugInteractions: [
      'Contraindicated: Rifampicin, St. John\'s wort',
      'Take 2 hours BEFORE or 6 hours AFTER antacids with aluminum/magnesium',
    ],
    counselingPoints: [
      'Do not stop taking Biktarvy without talking to your doctor',
      'This medicine is not a cure for HIV; you may still develop infections',
      'Regular monitoring required: kidney function, liver function',
      'Store in original container with desiccant; keep tightly closed',
      'Common side effects: Depression, abnormal dreams, headache, dizziness, diarrhea, nausea, fatigue',
    ],
    monitoringRequirements: [
      'Regular kidney function monitoring',
      'Regular liver function monitoring',
      'HIV viral load and CD4 counts',
    ],
    renalConsiderations: 'Not recommended for severe renal impairment (eCrCl 15-30 mL/min)',
    hepaticConsiderations: 'Child-Pugh A or B: Standard dose. Child-Pugh C: Not recommended.',
    pregnancyCategory: 'Pregnancy registry available; discuss risks/benefits with provider',
    storageInstructions: 'Store in original container with desiccant; keep tightly closed at room temperature',
    defaultQuantity: 30,
    defaultDaySupply: 30,
    unit: 'tablets',
  },

  // DESCOVY (PrEP)
  'Descovy (PrEP)': {
    id: 'descovy-prep',
    name: 'Descovy (PrEP)',
    genericName: 'Emtricitabine/Tenofovir Alafenamide (FTC/TAF)',
    strength: '200mg/25mg',
    form: 'tablet',
    indication: 'HIV-1 Pre-Exposure Prophylaxis (PrEP)',
    category: 'PrEP',
    standardDose: '1 tablet once daily',
    frequency: 'Once daily',
    duration: 'Continuous daily use',
    withFood: 'either',
    specialInstructions: [
      'Must be taken EVERY DAY, not just when exposure is anticipated',
      'Time to maximum protection is unknown; use additional prevention measures',
    ],
    missedDoseInstructions: 'Take as soon as remembered; if close to next dose, skip and resume schedule',
    warnings: [
      'Descovy for PrEP does NOT protect against other STIs - use condoms',
      'Must be confirmed HIV-negative before starting and every 3 months',
      'If recent HIV exposure suspected (<1 month), need acute HIV testing before starting',
    ],
    drugInteractions: [
      'Avoid concurrent use with nephrotoxic agents (NSAIDs)',
    ],
    counselingPoints: [
      'Descovy for PrEP does NOT protect against other STIs - use condoms',
      'Must be confirmed HIV-negative before starting and every 3 months',
      'Time to maximum protection is unknown; use additional prevention measures',
      'Do not share medication with others',
      'If recent HIV exposure suspected (<1 month), need acute HIV testing before starting',
    ],
    monitoringRequirements: [
      'HIV screening: Before initiation and every 3 months',
      'Serum creatinine/eGFR: Before initiation and periodically',
      'Urine glucose/protein: Before initiation and periodically',
      'Hepatitis B screening: Before initiation',
      'STI screening: Every 3 months',
    ],
    renalConsiderations: 'eCrCl ≥30 mL/min: Standard dosing. eCrCl 15-30 mL/min: Not recommended. ESRD (<15 mL/min) not on HD: Not recommended. On hemodialysis: Take after completion of dialysis.',
    hepaticConsiderations: 'No dose adjustment for mild-moderate hepatic impairment',
    pregnancyCategory: 'Discuss with provider',
    storageInstructions: 'Store at room temperature in original container',
    defaultQuantity: 30,
    defaultDaySupply: 30,
    unit: 'tablets',
  },

  // DESCOVY (HIV Treatment)
  'Descovy (HIV Treatment)': {
    id: 'descovy-treatment',
    name: 'Descovy (HIV Treatment)',
    genericName: 'Emtricitabine/Tenofovir Alafenamide (FTC/TAF)',
    strength: '200mg/25mg',
    form: 'tablet',
    indication: 'HIV-1 Treatment (with other antiretrovirals)',
    category: 'ARV',
    standardDose: '1 tablet once daily',
    frequency: 'Once daily',
    duration: 'Continuous therapy',
    withFood: 'either',
    specialInstructions: [
      'Must be taken with other HIV medications as prescribed',
    ],
    missedDoseInstructions: 'Take as soon as remembered; if close to next dose, skip and resume schedule',
    warnings: [
      'Must be taken with other HIV medications',
      'Do not discontinue without provider consultation (Hepatitis B risk)',
      'Report symptoms of lactic acidosis: weakness, muscle pain, difficulty breathing, stomach pain',
    ],
    drugInteractions: [
      'Avoid concurrent use with nephrotoxic agents (NSAIDs)',
    ],
    counselingPoints: [
      'Must be taken with other HIV medications',
      'Do not discontinue without provider consultation (Hepatitis B risk)',
      'Report symptoms of lactic acidosis: weakness, muscle pain, difficulty breathing, stomach pain',
    ],
    monitoringRequirements: [
      'Hepatitis B screening: Before initiation',
      'Serum creatinine/eGFR: Before and during treatment',
      'Urine glucose/protein: Before and during treatment',
    ],
    renalConsiderations: 'eCrCl ≥30 mL/min: Standard dosing. eCrCl 15-30 mL/min: Not recommended. On hemodialysis: Take after completion of dialysis.',
    hepaticConsiderations: 'No dose adjustment for mild-moderate hepatic impairment',
    pregnancyCategory: 'Discuss with provider',
    storageInstructions: 'Store at room temperature in original container',
    defaultQuantity: 30,
    defaultDaySupply: 30,
    unit: 'tablets',
  },

  // SYMTUZA
  'Symtuza': {
    id: 'symtuza',
    name: 'Symtuza',
    genericName: 'Darunavir/Cobicistat/Emtricitabine/Tenofovir Alafenamide (DRV/COBI/FTC/TAF)',
    strength: '800mg/150mg/200mg/10mg',
    form: 'tablet',
    indication: 'Complete regimen for HIV-1 treatment in adults',
    category: 'ARV',
    standardDose: '1 tablet once daily',
    frequency: 'Once daily',
    duration: 'Continuous therapy',
    withFood: 'required',
    specialInstructions: [
      'MUST be taken WITH FOOD (essential for absorption)',
      'Same time each day',
      'May be split using tablet-cutter; entire dose must be consumed immediately after splitting',
    ],
    missedDoseInstructions: 'Take as soon as remembered unless close to next dose; do not double',
    warnings: [
      'Always take with food - improves absorption',
      'Do not miss doses - resistance can develop',
      'Do not alter dose or discontinue without consulting provider',
      'Get refills before running out - virus may increase if stopped',
    ],
    drugInteractions: [
      'Contraindicated with multiple drugs - consult full prescribing information',
      'Not recommended during pregnancy (lower drug exposures in 2nd/3rd trimesters)',
    ],
    counselingPoints: [
      'Always take with food',
      'Do not miss doses - resistance can develop',
      'Do not alter dose or discontinue without consulting provider',
      'Get refills before running out',
      'Common side effects: Diarrhea, rash, nausea, fatigue, headache, abdominal discomfort, flatulence',
    ],
    monitoringRequirements: [
      'Hepatitis B screening: Before initiation',
      'Serum creatinine/eGFR: Before and during treatment',
      'Urine glucose/protein: Before and during treatment',
      'Liver function tests: Before and during treatment',
      'Serum phosphorus: If chronic kidney disease',
    ],
    renalConsiderations: 'Not recommended: Severe renal impairment (CrCl <30 mL/min)',
    hepaticConsiderations: 'Not recommended: Severe hepatic impairment (Child-Pugh Class C)',
    pregnancyCategory: 'Not recommended during pregnancy',
    storageInstructions: 'Store at room temperature in original container',
    defaultQuantity: 30,
    defaultDaySupply: 30,
    unit: 'tablets',
  },

  // DOVATO
  'Dovato': {
    id: 'dovato',
    name: 'Dovato',
    genericName: 'Dolutegravir/Lamivudine (DTG/3TC)',
    strength: '50mg/300mg',
    form: 'tablet',
    indication: 'Treatment of HIV-1 infection in adults and adolescents',
    category: 'ARV',
    standardDose: '1 tablet once daily',
    frequency: 'Once daily',
    duration: 'Continuous therapy',
    withFood: 'either',
    specialInstructions: [
      'Same time each day',
    ],
    missedDoseInstructions: 'If >4 hours until next dose: Take missed dose immediately. If <4 hours until next dose: Skip missed dose, resume regular schedule. Do not double dose.',
    warnings: [
      'Do not stop treatment without consulting provider',
      'This medication does not cure HIV; infections may still occur',
    ],
    drugInteractions: [
      'When co-administered with certain drugs, dolutegravir dose should be increased to 50mg TWICE daily: Rifampicin, Carbamazepine, Oxcarbazepine, Phenytoin, Phenobarbital, St. John\'s wort, Etravirine, Efavirenz, Nevirapine, Tipranavir/ritonavir',
      'Polyvalent cation antacids: Take 2 hours AFTER or 6 hours BEFORE Dovato',
    ],
    counselingPoints: [
      'Do not stop treatment without consulting provider',
      'This medication does not cure HIV; infections may still occur',
      'Regular monitoring required for kidney and liver function',
      'Common side effects: Headache, diarrhea, nausea, insomnia, fatigue',
    ],
    monitoringRequirements: [
      'Regular kidney function monitoring',
      'Regular liver function monitoring',
    ],
    renalConsiderations: 'CrCl ≥50 mL/min: Standard dosing. CrCl 30-49 mL/min: May use with monitoring. CrCl <30 mL/min: Not recommended.',
    hepaticConsiderations: 'No dose adjustment for mild-moderate hepatic impairment. Not studied in severe hepatic impairment.',
    pregnancyCategory: 'Discuss with provider',
    storageInstructions: 'Store at room temperature in original container',
    defaultQuantity: 30,
    defaultDaySupply: 30,
    unit: 'tablets',
  },

  // BACTRIM DS (PCP Prophylaxis)
  'Bactrim DS (PCP Prophylaxis)': {
    id: 'bactrim-pcp',
    name: 'Bactrim DS (PCP Prophylaxis)',
    genericName: 'Trimethoprim/Sulfamethoxazole (TMP/SMX)',
    strength: '160mg/800mg',
    form: 'tablet',
    indication: 'PCP (Pneumocystis jirovecii pneumonia) prophylaxis',
    category: 'Antibiotic',
    standardDose: '1 tablet once daily',
    frequency: 'Once daily',
    duration: 'Continuous prophylaxis',
    withFood: 'either',
    specialInstructions: [
      'Take with food if stomach upset occurs',
      'Drink plenty of fluids to prevent kidney stones',
    ],
    missedDoseInstructions: 'Take as soon as remembered; if close to next dose, skip and resume schedule',
    warnings: [
      'Complete full course even if feeling better',
      'Sun sensitivity: May increase risk of sunburn; use sunscreen',
      'Report immediately: Rash, fever, sore throat, unusual bruising/bleeding, persistent diarrhea',
      'Serious allergic reactions: Stevens-Johnson syndrome, toxic epidermal necrolysis (rare but serious)',
    ],
    drugInteractions: [
      'Warfarin: May increase INR - monitor closely',
      'ACE inhibitors/ARBs: Increased hyperkalemia risk',
      'Methotrexate: Increased toxicity risk',
      'Phenytoin: May alter levels',
    ],
    counselingPoints: [
      'Take with food if stomach upset occurs',
      'Drink plenty of water',
      'Avoid high-potassium foods and salt substitutes',
      'Avoid alcohol',
      'Use sunscreen - may increase sun sensitivity',
    ],
    monitoringRequirements: [
      'Regular blood counts may be needed with prolonged use',
    ],
    renalConsiderations: 'Severe renal impairment: Dose adjustment required',
    hepaticConsiderations: 'Use with caution in severe hepatic impairment',
    pregnancyCategory: 'Avoid near term (risk of kernicterus)',
    storageInstructions: 'Store at room temperature in original container',
    defaultQuantity: 30,
    defaultDaySupply: 30,
    unit: 'tablets',
  },

  // BACTRIM DS (Toxoplasmosis Prophylaxis)
  'Bactrim DS (Toxoplasmosis Prophylaxis)': {
    id: 'bactrim-toxo',
    name: 'Bactrim DS (Toxoplasmosis Prophylaxis)',
    genericName: 'Trimethoprim/Sulfamethoxazole (TMP/SMX)',
    strength: '160mg/800mg',
    form: 'tablet',
    indication: 'Toxoplasmosis prophylaxis',
    category: 'Antibiotic',
    standardDose: '1 tablet once daily',
    frequency: 'Once daily',
    duration: 'Continuous prophylaxis',
    withFood: 'either',
    specialInstructions: [
      'Take with food if stomach upset occurs',
      'Drink plenty of fluids',
    ],
    missedDoseInstructions: 'Take as soon as remembered; if close to next dose, skip and resume schedule',
    warnings: [
      'Sun sensitivity: May increase risk of sunburn; use sunscreen',
      'Report immediately: Rash, fever, unusual bruising',
    ],
    drugInteractions: [
      'Warfarin: May increase INR - monitor closely',
      'ACE inhibitors/ARBs: Increased hyperkalemia risk',
    ],
    counselingPoints: [
      'Take with food if stomach upset occurs',
      'Drink plenty of water',
      'Avoid high-potassium foods and salt substitutes',
      'Avoid alcohol',
      'Report rash, fever, or unusual bruising immediately',
    ],
    monitoringRequirements: [
      'Regular blood counts may be needed with prolonged use',
    ],
    renalConsiderations: 'Severe renal impairment: Dose adjustment required',
    hepaticConsiderations: 'Use with caution in severe hepatic impairment',
    pregnancyCategory: 'Avoid near term (risk of kernicterus)',
    storageInstructions: 'Store at room temperature in original container',
    defaultQuantity: 30,
    defaultDaySupply: 30,
    unit: 'tablets',
  },

  // BACTRIM DS (UTI Treatment)
  'Bactrim DS (UTI Treatment)': {
    id: 'bactrim-uti',
    name: 'Bactrim DS (UTI Treatment)',
    genericName: 'Trimethoprim/Sulfamethoxazole (TMP/SMX)',
    strength: '160mg/800mg',
    form: 'tablet',
    indication: 'Urinary Tract Infection treatment',
    category: 'Antibiotic',
    standardDose: '1 tablet twice daily for 7 days',
    frequency: 'Twice daily',
    duration: '7 days',
    withFood: 'either',
    specialInstructions: [
      'Take with food if stomach upset occurs',
      'Drink plenty of fluids',
    ],
    missedDoseInstructions: 'Take as soon as remembered; if close to next dose, skip and resume schedule',
    warnings: [
      'Complete FULL 7 days even if feeling better',
      'Sun sensitivity: May increase risk of sunburn; use sunscreen',
    ],
    drugInteractions: [
      'Warfarin: May increase INR - monitor closely',
      'ACE inhibitors/ARBs: Increased hyperkalemia risk',
    ],
    counselingPoints: [
      'Take with food if stomach upset occurs',
      'Drink plenty of water',
      'Complete FULL 7 days even if feeling better',
      'Avoid high-potassium foods and salt substitutes',
      'Use sunscreen - may increase sun sensitivity',
    ],
    monitoringRequirements: [],
    renalConsiderations: 'Severe renal impairment: Dose adjustment required',
    hepaticConsiderations: 'Use with caution in severe hepatic impairment',
    pregnancyCategory: 'Avoid near term (risk of kernicterus)',
    storageInstructions: 'Store at room temperature in original container',
    defaultQuantity: 14,
    defaultDaySupply: 7,
    unit: 'tablets',
  },

  // DOXYCYCLINE (Doxy-PEP)
  'Doxycycline (Doxy-PEP)': {
    id: 'doxy-pep',
    name: 'Doxycycline (Doxy-PEP)',
    genericName: 'Doxycycline',
    strength: '100mg',
    form: 'tablet',
    indication: 'STI Post-Exposure Prophylaxis (Doxy-PEP)',
    category: 'Antibiotic',
    standardDose: '200mg single dose (2 tablets) within 72 hours after sex',
    frequency: 'As needed (max once per 24 hours)',
    duration: 'Single dose per encounter',
    withFood: 'yes',
    specialInstructions: [
      '3-2-1 Rule: Within 3 days (72 hours) of condomless sexual encounter, take 2 tablets (200mg), just 1 time - no more than one dose per 24-hour period',
      'Optimal timing: Most effective within first 24 hours',
      'Can be taken daily if needed for frequent sexual encounters',
    ],
    missedDoseInstructions: 'Take as soon as possible within 72 hours of exposure',
    warnings: [
      'Doxy-PEP is NOT 100% protective: Continue using condoms and other prevention',
      'Doxy-PEP does NOT prevent: Gonorrhea consistently (variable protection)',
      'Doxy-PEP does prevent: Syphilis (~60-70% reduction), Chlamydia (~60-70% reduction)',
    ],
    drugInteractions: [
      'Dairy products: Avoid within 2 hours (calcium reduces absorption)',
      'Antacids: Avoid within 2 hours (aluminum/magnesium reduce absorption)',
      'Iron supplements: Avoid within 2 hours (iron reduces absorption)',
      'Calcium supplements: Avoid within 2 hours (calcium reduces absorption)',
      'Magnesium supplements: Avoid within 2 hours (magnesium reduces absorption)',
    ],
    counselingPoints: [
      'Take with food and full glass of water',
      'Do NOT lie down for 1 hour after taking (prevents esophageal irritation)',
      'Does NOT protect against all STIs - use condoms',
      'Avoid dairy, antacids, iron for 2 hours',
      'Use sunscreen - increases sun sensitivity',
      'Regular STI screening: Still needed every 3-6 months',
      'Safe to take with HIV PrEP medications',
      'Not recommended for pregnant individuals',
    ],
    monitoringRequirements: [
      'Regular STI screening: Every 3-6 months',
    ],
    renalConsiderations: 'Use with caution in severe renal impairment',
    hepaticConsiderations: 'Use with caution in severe liver disease',
    pregnancyCategory: 'Not recommended for pregnant individuals',
    storageInstructions: 'Store at room temperature in original container; protect from light and moisture',
    defaultQuantity: 4,
    defaultDaySupply: 2,
    unit: 'tablets',
  },

  // DOXYCYCLINE (Chlamydia Treatment)
  'Doxycycline (Chlamydia Treatment)': {
    id: 'doxy-chlamydia',
    name: 'Doxycycline (Chlamydia Treatment)',
    genericName: 'Doxycycline',
    strength: '100mg',
    form: 'capsule',
    indication: 'Chlamydia Treatment',
    category: 'Antibiotic',
    standardDose: '1 capsule twice daily for 7 days',
    frequency: 'Twice daily',
    duration: '7 days',
    withFood: 'yes',
    specialInstructions: [
      'Take with food and full glass of water',
      'Do NOT lie down for 1 hour after taking',
    ],
    missedDoseInstructions: 'Take as soon as remembered; if close to next dose, skip',
    warnings: [
      'Complete FULL 7 days even if feeling better',
    ],
    drugInteractions: [
      'Dairy products: Avoid within 2 hours',
      'Antacids: Avoid within 2 hours',
      'Iron supplements: Avoid within 2 hours',
      'Calcium supplements: Avoid within 2 hours',
      'Magnesium supplements: Avoid within 2 hours',
    ],
    counselingPoints: [
      'Take with food and full glass of water',
      'Do NOT lie down for 1 hour after taking',
      'Complete FULL 7 days even if feeling better',
      'Avoid dairy, antacids, iron for 2 hours',
      'Use sunscreen - increases sun sensitivity',
      'Sexual partners must also be treated',
      'No sexual activity until treatment completed',
    ],
    monitoringRequirements: [
      'Test of cure recommended in some cases',
    ],
    renalConsiderations: 'Use with caution in severe renal impairment',
    hepaticConsiderations: 'Use with caution in severe liver disease',
    pregnancyCategory: 'Contraindicated (tooth discoloration, bone growth effects)',
    storageInstructions: 'Store at room temperature in original container; protect from light and moisture',
    defaultQuantity: 14,
    defaultDaySupply: 7,
    unit: 'capsules',
  },

  // DOXYCYCLINE (Syphilis Treatment)
  'Doxycycline (Syphilis Treatment)': {
    id: 'doxy-syphilis',
    name: 'Doxycycline (Syphilis Treatment)',
    genericName: 'Doxycycline',
    strength: '100mg',
    form: 'tablet',
    indication: 'Early Syphilis Treatment',
    category: 'Antibiotic',
    standardDose: '1 tablet twice daily for 14 days',
    frequency: 'Twice daily',
    duration: '14 days',
    withFood: 'yes',
    specialInstructions: [
      'Take with food and full glass of water',
      'Do NOT lie down for 1 hour after taking',
    ],
    missedDoseInstructions: 'Take as soon as remembered; if close to next dose, skip',
    warnings: [
      'Complete FULL 14 days even if feeling better',
    ],
    drugInteractions: [
      'Dairy products: Avoid within 2 hours',
      'Antacids: Avoid within 2 hours',
      'Iron supplements: Avoid within 2 hours',
      'Calcium supplements: Avoid within 2 hours',
      'Magnesium supplements: Avoid within 2 hours',
    ],
    counselingPoints: [
      'Take with food and full glass of water',
      'Do NOT lie down for 1 hour after taking',
      'Complete FULL 14 days even if feeling better',
      'Avoid dairy, antacids, iron for 2 hours',
      'Use sunscreen - increases sun sensitivity',
      'Follow-up testing required after treatment',
      'Sexual partners must also be evaluated and treated',
    ],
    monitoringRequirements: [
      'Follow-up RPR/VDRL testing required after treatment',
      'Clinical evaluation for treatment response',
    ],
    renalConsiderations: 'Use with caution in severe renal impairment',
    hepaticConsiderations: 'Use with caution in severe liver disease',
    pregnancyCategory: 'Contraindicated (tooth discoloration, bone growth effects)',
    storageInstructions: 'Store at room temperature in original container; protect from light and moisture',
    defaultQuantity: 28,
    defaultDaySupply: 14,
    unit: 'tablets',
  },
};

export default MEDICATIONS_DATA;
