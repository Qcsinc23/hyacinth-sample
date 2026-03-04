-- ============================================================================
-- Medication Catalog Seed Data
-- Hyacinth Medication Dispensing System
-- ============================================================================

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- ============================================================================
-- Insert Medications into Catalog
-- ============================================================================

-- Biktarvy (bictegravir/emtricitabine/tenofovir alafenamide)
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Biktarvy', 'bictegravir/emtricitabine/tenofovir alafenamide', '50mg/200mg/25mg', 'tablet', 'ARV', '61958-2001-1', 'tablet', 0, 'Store at 20°C to 25°C (68°F to 77°F)');

-- Descovy (emtricitabine/tenofovir alafenamide)
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Descovy', 'emtricitabine/tenofovir alafenamide', '200mg/25mg', 'tablet', 'ARV', '61958-1801-1', 'tablet', 0, 'Store at 20°C to 25°C (68°F to 77°F)');

-- Doxycycline
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Doxycycline', 'doxycycline hyclate', '100mg', 'capsule', 'Antibiotic', '68180-0565-1', 'capsule', 0, 'Store below 30°C (86°F); protect from light');

-- Bactrim DS (sulfamethoxazole/trimethoprim)
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Bactrim DS', 'sulfamethoxazole/trimethoprim', '800mg/160mg', 'tablet', 'Antibiotic', '54868-4898-0', 'tablet', 0, 'Store at 20°C to 25°C (68°F to 77°F)');

-- Symtuza (darunavir/cobicistat/emtricitabine/tenofovir alafenamide)
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Symtuza', 'darunavir/cobicistat/emtricitabine/tenofovir alafenamide', '800mg/150mg/200mg/10mg', 'tablet', 'ARV', '61958-2201-1', 'tablet', 0, 'Store at 20°C to 25°C (68°F to 77°F)');

-- Dovato (dolutegravir/lamivudine)
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Dovato', 'dolutegravir/lamivudine', '50mg/300mg', 'tablet', 'ARV', '0173-0870-0', 'tablet', 0, 'Store at 20°C to 25°C (68°F to 77°F)');

-- Tivicay (dolutegravir)
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Tivicay', 'dolutegravir', '50mg', 'tablet', 'ARV', '0173-0840-0', 'tablet', 0, 'Store at 20°C to 25°C (68°F to 77°F)');

-- Truvada (emtricitabine/tenofovir disoproxil fumarate)
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Truvada', 'emtricitabine/tenofovir disoproxil fumarate', '200mg/300mg', 'tablet', 'ARV', '61958-0901-1', 'tablet', 0, 'Store at 25°C (77°F); excursions permitted to 15-30°C (59-86°F)');

-- Juluca (dolutegravir/rilpivirine)
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Juluca', 'dolutegravir/rilpivirine', '25mg/300mg', 'tablet', 'ARV', '0173-0880-0', 'tablet', 0, 'Store at 20°C to 25°C (68°F to 77°F)');

-- Cabenuva (cabotegravir/rilpivirine) - Injection
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Cabenuva', 'cabotegravir/rilpivirine', '400mg/600mg', 'injection', 'ARV', '0007-4893-01', 'vial', 0, 'Store refrigerated at 2°C to 8°C (36°F to 46°F)');

-- Apretude (cabotegravir extended-release) - Injection for PrEP
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Apretude', 'cabotegravir extended-release injectable suspension', '600mg', 'injection', 'ARV', '0007-4985-01', 'vial', 0, 'Store refrigerated at 2°C to 8°C (36°F to 46°F)');

-- Emtricitabine
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Emtricitabine', 'emtricitabine', '200mg', 'capsule', 'ARV', '58168-0215-1', 'capsule', 0, 'Store at 25°C (77°F); excursions permitted to 15-30°C (59-86°F)');

-- Tenofovir DF (tenofovir disoproxil fumarate)
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Tenofovir DF', 'tenofovir disoproxil fumarate', '300mg', 'tablet', 'ARV', '61958-0801-1', 'tablet', 0, 'Store at 25°C (77°F); excursions permitted to 15-30°C (59-86°F)');

-- Azithromycin
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Azithromycin', 'azithromycin dihydrate', '250mg', 'tablet', 'Antibiotic', '68180-0545-5', 'tablet', 0, 'Store below 30°C (86°F)');

-- Ceftriaxone
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Ceftriaxone', 'ceftriaxone sodium', '500mg', 'injection', 'Antibiotic', '0703-0647-11', 'vial', 0, 'Store dry powder at 20°C to 25°C (68°F to 77°F)');

-- Penicillin G Benzathine
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Penicillin G Benzathine', 'penicillin G benzathine', '2.4M units', 'injection', 'Antibiotic', '0025-1081-10', 'vial', 0, 'Store refrigerated at 2°C to 8°C (36°F to 46°F); protect from light');

-- Valacyclovir
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Valacyclovir', 'valacyclovir hydrochloride', '1g', 'tablet', 'Antiviral', '68180-0563-5', 'tablet', 0, 'Store at 20°C to 25°C (68°F to 77°F)');

-- Gentamicin (CDC Gonorrhea alternative regimen)
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Gentamicin', 'gentamicin sulfate', '240mg', 'injection', 'Antibiotic', '0641-6110-10', 'vial', 0, 'Store at 20°C to 25°C (68°F to 77°F)');

-- Levofloxacin (CDC Chlamydia alternative regimen)
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Levofloxacin', 'levofloxacin', '500mg', 'tablet', 'Antibiotic', '68180-0547-1', 'tablet', 0, 'Store below 30°C (86°F); protect from light');

-- Azithromycin 1g packet (CDC Chlamydia single-dose, Gonorrhea dual therapy)
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Azithromycin 1g', 'azithromycin dihydrate', '1g', 'packet', 'Antibiotic', '68180-0546-1', 'packet', 0, 'Store below 30°C (86°F)');

-- Bicillin L-A (Penicillin G Benzathine - brand; CDC Syphilis first-line)
INSERT OR IGNORE INTO medication_catalog (medication_name, generic_name, strength, dosage_form, category, ndc_code, default_unit, is_controlled, storage_requirements) VALUES
('Bicillin L-A', 'penicillin G benzathine', '2.4M units', 'injection', 'Antibiotic', '0005-7792-01', 'vial', 0, 'Store refrigerated at 2°C to 8°C (36°F to 46°F); protect from light');

-- ============================================================================
-- Insert Instruction Templates for Biktarvy
-- ============================================================================

-- Get medication IDs for template insertion (using subqueries)
INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Biktarvy'),
    'treatment',
    'HIV-1 Infection',
    'Take ONE tablet by mouth once daily at the same time each day. CONTINUOUS THERAPY.',
    '["Take with or without food", "Timing: Same time each day for optimal effectiveness", "Missed Dose Guidelines: If within 18 hours of usual time: Take as soon as possible, then next dose at usual time. If 18+ hours after usual time: Skip missed dose, take next dose at usual time", "Vomiting: If within 1 hour of dose, take another tablet; if >1 hour, no replacement needed", "Take 2 hours BEFORE or 6 hours AFTER antacids with aluminum/magnesium", "Alternative with food: Calcium and iron supplements can be taken with Biktarvy if taken with food"]',
    '["⚠️ Take with or without food", "⚠️ Do NOT stop without talking to doctor", "⚠️ Take 2 hrs BEFORE or 6 hrs AFTER antacids", "⚠️ Calcium/iron OK if taken WITH food", "⚠️ Regular lab monitoring required", "⚠️ Hepatitis B: Severe acute exacerbations possible if discontinued"]',
    '30',
    '["HIV Treatment", "Antiretroviral Therapy", "Initial Regimen"]';

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Biktarvy'),
    'pep',
    'nPEP (Non-occupational Post-Exposure Prophylaxis)',
    'Take ONE tablet by mouth once daily for 28 days. START IMMEDIATELY.',
    '["Take with or without food", "Must be started within 72 hours of exposure", "Duration: 28 days of continuous therapy", "Missed Dose: Take as soon as remembered unless within 4 hours of next dose; do not double dose", "Take 2 hours BEFORE or 6 hours AFTER medications containing polyvalent cations (aluminum, calcium, iron, magnesium)", "Alternative for calcium/iron: Can be taken together WITH food", "Tablet can be split for children; both halves must be taken within 10 minutes"]',
    '["⚠️ Do NOT miss doses - resistance can develop", "⚠️ Complete FULL 28 days even if feeling well", "⚠️ Do NOT stop without consulting healthcare provider", "⚠️ Take 2 hrs BEFORE or 6 hrs AFTER antacids", "⚠️ Keep ALL follow-up appointments", "⚠️ Report signs of allergic reaction immediately (rash, fever, difficulty breathing)"]',
    '28',
    '["nPEP", "HIV Exposure", "Post-Exposure Prophylaxis"]';

-- ============================================================================
-- Insert Instruction Templates for Descovy
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Descovy'),
    'prep',
    'Pre-Exposure Prophylaxis (PrEP)',
    'Take ONE tablet by mouth once daily. Take EVERY DAY, not just before sex.',
    '["Take with or without food", "For PrEP: Must be taken EVERY DAY, not just when exposure is anticipated", "Missed Dose: Take as soon as remembered; if close to next dose, skip and resume schedule", "Time to maximum protection is unknown; use additional prevention measures", "Must be confirmed HIV-negative before starting and every 3 months"]',
    '["⚠️ Take with or without food", "⚠️ Does NOT protect against other STIs - use condoms", "⚠️ HIV test required every 3 months", "⚠️ Do NOT share with others", "⚠️ Keep ALL follow-up appointments", "⚠️ If recent HIV exposure suspected (<1 month), need acute HIV testing before starting"]',
    '30',
    '["PrEP - Daily", "HIV Prevention", "Pre-Exposure Prophylaxis"]';

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Descovy'),
    'treatment',
    'HIV-1 Infection',
    'Take ONE tablet by mouth once daily with other HIV medications as prescribed.',
    '["Take with or without food", "Take at the same time each day", "Do not skip doses - resistance can develop", "Must be taken WITH other HIV medications", "Do not discontinue without provider consultation (Hepatitis B risk)"]',
    '["⚠️ Take with or without food", "⚠️ Do NOT stop without talking to doctor", "⚠️ Must be taken WITH other HIV medications", "⚠️ Regular kidney function monitoring required", "⚠️ Report muscle pain or weakness immediately", "⚠️ Severe exacerbations of Hepatitis B reported if discontinued"]',
    '30',
    '["HIV Treatment", "Antiretroviral Therapy"]';

-- ============================================================================
-- Insert Instruction Templates for Doxycycline
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Doxycycline'),
    'treatment',
    'Chlamydia Treatment',
    'Take ONE capsule by mouth twice daily for 7 days.',
    '["Take with food and full glass of water", "Do NOT lie down for 1 hour after taking (prevents esophageal irritation)", "Missed Dose: Take as soon as remembered; if close to next dose, skip", "Complete FULL 7 days even if feeling better", "Avoid dairy, antacids, iron, calcium, magnesium for 2 hours"]',
    '["⚠️ Take with food and full glass of water", "⚠️ Do NOT lie down for 1 hour after taking", "⚠️ Complete FULL 7 days even if feeling better", "⚠️ Avoid dairy, antacids, iron for 2 hours", "⚠️ Use sunscreen - increases sun sensitivity"]',
    '7',
    '["STI Treatment - Chlamydia", "Chlamydia Treatment"]';

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Doxycycline'),
    'prevention',
    'Doxy-PEP (STI Post-Exposure Prophylaxis)',
    'Take TWO tablets (200mg) by mouth within 72 hours AFTER condomless sex. Maximum ONE dose per 24 hours.',
    '["3-2-1 Rule: 3: Within 3 days (72 hours) of condomless sexual encounter. 2: Take 2 tablets (200 mg total). 1: Just 1 time - no more than one dose per 24-hour period", "Optimal timing: Most effective within first 24 hours", "Take with food and full glass of water", "Do NOT lie down for 1 hour after taking", "Avoid dairy, antacids, iron for 2 hours"]',
    '["⚠️ Take with food and full glass of water", "⚠️ Do NOT lie down for 1 hour after taking", "⚠️ Does NOT protect against all STIs - use condoms", "⚠️ Avoid dairy, antacids, iron for 2 hours", "⚠️ Use sunscreen - increases sun sensitivity", "⚠️ Doxy-PEP is NOT 100% protective - continue using condoms"]',
    '1',
    '["Doxy-PEP", "STI Prevention"]';

-- ============================================================================
-- Insert Instruction Templates for Bactrim DS
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Bactrim DS'),
    'treatment',
    'Urinary Tract Infection',
    'Take ONE tablet by mouth twice daily for 7 days.',
    '["Take with or without food (food may reduce stomach upset)", "Hydration: Drink plenty of fluids to prevent kidney stones", "Missed Dose: Take as soon as remembered; if close to next dose, skip and resume schedule", "Complete FULL 7 days even if feeling better"]',
    '["⚠️ Take with food if stomach upset occurs", "⚠️ Drink plenty of water", "⚠️ Complete FULL 7 days even if feeling better", "⚠️ Avoid high-potassium foods and salt substitutes", "⚠️ Use sunscreen - may increase sun sensitivity"]',
    '7',
    '["UTI Treatment", "Urinary Tract Infection"]';

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Bactrim DS'),
    'prophylaxis',
    'PCP Prophylaxis',
    'Take ONE tablet by mouth once daily.',
    '["Take with or without food (food may reduce stomach upset)", "Hydration: Drink plenty of fluids to prevent kidney stones", "Missed Dose: Take as soon as remembered; if close to next dose, skip and resume schedule", "Complete full course even if feeling better"]',
    '["⚠️ Take with food if stomach upset occurs", "⚠️ Drink plenty of water", "⚠️ Avoid high-potassium foods and salt substitutes", "⚠️ Avoid alcohol", "⚠️ Use sunscreen - may increase sun sensitivity", "⚠️ Report rash, fever, sore throat, unusual bruising/bleeding immediately"]',
    '30',
    '["PCP Prophylaxis", "Pneumocystis Prevention"]';

-- ============================================================================
-- Insert Additional Bactrim Templates
-- ============================================================================

-- Bactrim DS (Toxoplasmosis Prophylaxis)
INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Bactrim DS'),
    'prophylaxis',
    'Toxoplasmosis Prevention',
    'Take ONE tablet by mouth once daily.',
    '["Take with or without food (food may reduce stomach upset)", "Hydration: Drink plenty of fluids to prevent kidney stones", "Missed Dose: Take as soon as remembered; if close to next dose, skip and resume schedule"]',
    '["⚠️ Take with food if stomach upset occurs", "⚠️ Drink plenty of water", "⚠️ Avoid high-potassium foods and salt substitutes", "⚠️ Avoid alcohol", "⚠️ Report rash, fever, or unusual bruising immediately"]',
    '30',
    '["Toxoplasmosis Prophylaxis", "Toxoplasmosis Prevention"]';

-- ============================================================================
-- Insert Additional Doxycycline Templates
-- ============================================================================

-- Doxycycline (Syphilis Treatment)
INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Doxycycline'),
    'treatment',
    'Early Syphilis Treatment',
    'Take ONE tablet by mouth twice daily for 14 days.',
    '["Take with food and full glass of water", "Do NOT lie down for 1 hour after taking", "Complete FULL 14 days even if feeling better", "Avoid dairy, antacids, iron for 2 hours"]',
    '["⚠️ Take with food and full glass of water", "⚠️ Do NOT lie down for 1 hour after taking", "⚠️ Complete FULL 14 days even if feeling better", "⚠️ Avoid dairy, antacids, iron for 2 hours", "⚠️ Follow-up testing required after treatment"]',
    '14',
    '["STI Treatment - Syphilis", "Early Syphilis", "Syphilis Treatment"]';

-- ============================================================================
-- Insert Instruction Templates for Symtuza
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Symtuza'),
    'treatment',
    'HIV-1 Infection',
    'Take ONE tablet by mouth once daily WITH FOOD.',
    '["MUST be taken WITH FOOD (essential for absorption)", "Timing: Same time each day", "Tablet splitting: May be split using tablet-cutter; entire dose must be consumed immediately after splitting", "Missed Dose: Take as soon as remembered unless close to next dose; do not double", "Do not miss doses - resistance can develop", "Do not alter dose or discontinue without consulting provider"]',
    '["⚠️ MUST take WITH FOOD", "⚠️ Do NOT miss doses - resistance can develop", "⚠️ Do NOT stop without talking to doctor", "⚠️ Report rash, fever, or mouth sores immediately", "⚠️ Many drug interactions - check before new meds", "⚠️ Contains sulfa - allergy warning", "⚠️ Severe skin reactions possible - seek immediate care"]',
    '30',
    '["HIV Treatment", "Antiretroviral Therapy"]';

-- ============================================================================
-- Insert Instruction Templates for Dovato
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Dovato'),
    'treatment',
    'HIV-1 Infection',
    'Take ONE tablet by mouth once daily at the same time each day.',
    '["Can be taken with or without food", "Timing: Same time each day", "Missed Dose: If >4 hours until next dose: Take missed dose immediately. If <4 hours until next dose: Skip missed dose, resume regular schedule. Do not double dose", "Polyvalent cation antacids: Take 2 hours AFTER or 6 hours BEFORE Dovato"]',
    '["⚠️ Take with or without food", "⚠️ Do NOT stop without talking to doctor", "⚠️ Take antacids 2 hrs AFTER or 6 hrs BEFORE", "⚠️ Report signs of allergic reaction immediately", "⚠️ Regular lab monitoring required", "⚠️ Hepatitis B reactivation possible if discontinued"]',
    '30',
    '["HIV Treatment", "Antiretroviral Therapy", "Initial Regimen"]';

-- ============================================================================
-- Insert Instruction Templates for Tivicay
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Tivicay'),
    'treatment',
    'HIV-1 Infection',
    'Take 1 tablet by mouth once daily',
    '["May take with or without food", "Take at the same time each day", "Do not skip doses - resistance can develop"]',
    '["Hepatitis B reactivation possible if discontinued", "Do not stop without consulting healthcare provider"]',
    '30',
    '["HIV Treatment", "Antiretroviral Therapy"]';

-- ============================================================================
-- Insert Instruction Templates for Truvada
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Truvada'),
    'prep',
    'Pre-Exposure Prophylaxis (PrEP)',
    'Take 1 tablet by mouth once daily',
    '["Take at the same time each day", "May take with or without food", "Do not skip doses for maximum protection", "Get tested for HIV every 3 months"]',
    '["Must be HIV-negative before starting", "Does not prevent other STIs", "Requires regular kidney function monitoring"]',
    '30',
    '["PrEP - Daily", "HIV Prevention"]';

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Truvada'),
    'treatment',
    'HIV-1 Infection',
    'Take 1 tablet by mouth once daily',
    '["Take at the same time each day", "May take with or without food", "Do not skip doses - resistance can develop"]',
    '["Severe exacerbations of Hepatitis B reported if discontinued", "Lactic acidosis risk", "Do not stop without consulting healthcare provider"]',
    '30',
    '["HIV Treatment", "Antiretroviral Therapy"]';

-- ============================================================================
-- Insert Instruction Templates for Juluca
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Juluca'),
    'treatment',
    'HIV-1 Infection',
    'Take 1 tablet by mouth once daily',
    '["Take with a meal", "Do not take with antacids", "Take at the same time each day"]',
    '["Severe exacerbations of Hepatitis B reported if discontinued", "Do not stop without consulting healthcare provider"]',
    '30',
    '["HIV Treatment", "Antiretroviral Therapy", "Switch Therapy"]';

-- ============================================================================
-- Insert Instruction Templates for Cabenuva
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Cabenuva'),
    'treatment',
    'HIV-1 Infection',
    'Administer by intramuscular injection once monthly',
    '["Initial loading dose: 2 injections 1 month apart", "Maintenance: 1 injection monthly", "Must be administered by healthcare professional", "Continue oral therapy for first month"]',
    '["Must be administered by healthcare professional", "Do not miss scheduled injections", "Injection site reactions common", "Hepatitis B reactivation possible"]',
    '30',
    '["HIV Treatment", "Antiretroviral Therapy", "Long-Acting Regimen"]';

-- ============================================================================
-- Insert Instruction Templates for Apretude
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Apretude'),
    'prep',
    'Pre-Exposure Prophylaxis (PrEP)',
    'Administer by intramuscular injection once every 2 months',
    '["Initial: 2 injections 1 month apart", "Maintenance: 1 injection every 2 months", "Must be administered by healthcare professional", "Get tested for HIV every 3 months"]',
    '["Must be HIV-negative before starting", "Does not prevent other STIs", "Requires regular HIV testing", "Injection site reactions common"]',
    '60',
    '["PrEP - Long Acting", "HIV Prevention"]';

-- ============================================================================
-- Insert Instruction Templates for Emtricitabine
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Emtricitabine'),
    'treatment',
    'HIV-1 Infection',
    'Take 1 capsule by mouth once daily',
    '["Take at the same time each day", "May take with or without food", "Do not skip doses - resistance can develop"]',
    '["Severe exacerbations of Hepatitis B reported if discontinued", "Lactic acidosis risk", "Do not stop without consulting healthcare provider"]',
    '30',
    '["HIV Treatment", "Antiretroviral Therapy"]';

-- ============================================================================
-- Insert Instruction Templates for Tenofovir DF
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Tenofovir DF'),
    'treatment',
    'HIV-1 Infection',
    'Take 1 tablet by mouth once daily',
    '["Take at the same time each day", "May take with or without food", "Do not skip doses - resistance can develop"]',
    '["Severe exacerbations of Hepatitis B reported if discontinued", "Lactic acidosis risk", "Kidney function monitoring required", "Do not stop without consulting healthcare provider"]',
    '30',
    '["HIV Treatment", "Antiretroviral Therapy"]';

-- ============================================================================
-- Insert Instruction Templates for Azithromycin
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Azithromycin'),
    'treatment',
    'Chlamydia - Alternative Regimen (CDC 2021)',
    'Take 1g (four 250mg tablets) by mouth as a single dose.',
    '["Single dose for uncomplicated urogenital chlamydia", "May take with or without food (food may reduce GI upset)", "Preferred alternative when doxycycline adherence is a concern", "Complete full dose - do not split"]',
    '["⚠️ May cause diarrhea or stomach upset", "⚠️ Avoid if history of ventricular arrhythmias", "⚠️ Report irregular heartbeat, severe diarrhea, or allergic reaction", "⚠️ Less effective for rectal chlamydia - doxycycline preferred"]',
    '1',
    '["STI Treatment - Chlamydia", "Chlamydia Alternative"]';

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Azithromycin'),
    'treatment',
    'Bacterial Infection',
    'Take 2 tablets by mouth on day 1, then 1 tablet daily for 4 days',
    '["Take at the same time each day", "May take with or without food", "Complete full course as prescribed"]',
    '["May cause diarrhea", "Get medical help for irregular heartbeat", "May interact with other medications"]',
    '5',
    '["Respiratory Infection", "Skin Infection"]';

-- Azithromycin 1g packet - Gonorrhea dual therapy, Chlamydia single dose
INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Azithromycin 1g'),
    'treatment',
    'Gonorrhea Dual Therapy (CDC 2021)',
    'Take 2g (entire packet) by mouth as a single dose. MUST be given with Ceftriaxone 500mg IM.',
    '["Given with ceftriaxone for gonorrhea - NEVER use azithromycin alone for gonorrhea", "Single dose - take entire packet", "May take with or without food", "Observe for 30 min if given in clinic"]',
    '["⚠️ Do NOT use alone for gonorrhea - always with ceftriaxone", "⚠️ May cause GI upset - take with food if needed", "⚠️ Report severe diarrhea or allergic reaction"]',
    '1',
    '["STI Treatment - Gonorrhea", "Gonorrhea Dual Therapy"]';

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Azithromycin 1g'),
    'treatment',
    'Chlamydia - Single Dose (CDC 2021)',
    'Take 1g (entire packet) by mouth as a single dose.',
    '["Single dose for uncomplicated urogenital chlamydia", "May take with or without food", "Preferred when doxycycline adherence is a concern", "Complete full dose"]',
    '["⚠️ May cause diarrhea or stomach upset", "⚠️ Avoid if history of ventricular arrhythmias", "⚠️ Report irregular heartbeat or severe diarrhea"]',
    '1',
    '["STI Treatment - Chlamydia", "Chlamydia Alternative"]';

-- ============================================================================
-- Insert Instruction Templates for Ceftriaxone
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Ceftriaxone'),
    'treatment',
    'Uncomplicated Gonorrhea (CDC 2021)',
    'Inject 500mg intramuscularly as a single dose. If chlamydia not excluded: Add doxycycline 100mg PO BID x 7 days.',
    '["Single dose for uncomplicated urogenital, rectal, or pharyngeal gonorrhea", "For persons weighing ≥150 kg: Use 1 gram IM", "If chlamydial infection not excluded: Concurrent doxycycline 100mg PO twice daily x 7 days", "Administer in upper outer quadrant of buttock (gluteal IM)", "Observe patient for 30 minutes post-injection"]',
    '["⚠️ Allergic reactions possible - especially penicillin/cephalosporin allergy", "⚠️ Do not use with calcium-containing IV solutions", "⚠️ Must be administered by healthcare professional", "⚠️ Test of cure recommended for pharyngeal gonorrhea"]',
    '1',
    '["STI Treatment - Gonorrhea", "Gonorrhea Treatment", "CDC Recommended Regimen"]';

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Ceftriaxone'),
    'treatment',
    'Bacterial Infection',
    'Administer by intramuscular or intravenous injection once daily',
    '["Must be administered by healthcare professional", "Duration depends on infection type", "Reconstitute with appropriate diluent"]',
    '["Allergic reactions possible - especially penicillin allergy", "May cause gallbladder problems", "Do not use with calcium-containing solutions"]',
    '7',
    '["Respiratory Infection", "Sepsis Treatment"]';

-- ============================================================================
-- Insert Instruction Templates for Penicillin G Benzathine & Bicillin L-A
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Penicillin G Benzathine'),
    'treatment',
    'Early Syphilis (CDC 2021)',
    'Administer 2.4 million units by deep intramuscular injection as a single dose.',
    '["Single dose for primary, secondary, or early latent syphilis (<1 year)", "Inject deep IM in upper outer quadrant of buttock", "May divide into 2 injections of 1.2M units each buttock", "Warm to room temperature before injection; inject slowly over 20-30 seconds", "Observe patient 15-20 minutes (30 min if allergy history)"]',
    '["⚠️ Severe allergic reactions possible (anaphylaxis) - penicillin allergy", "⚠️ Jarisch-Herxheimer reaction may occur within 24 hours", "⚠️ Must be administered by healthcare professional", "⚠️ Never give IV - injection injury risk"]',
    '1',
    '["STI Treatment - Syphilis", "Primary Syphilis", "Secondary Syphilis", "Early Latent Syphilis"]';

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Penicillin G Benzathine'),
    'treatment',
    'Syphilis',
    'Administer 2.4 million units by intramuscular injection as single dose',
    '["Must be administered by healthcare professional", "Single dose for primary/secondary syphilis", "Deep intragluteal injection required"]',
    '["Severe allergic reactions possible (anaphylaxis)", "Must monitor for penicillin allergy", "Jarisch-Herxheimer reaction may occur"]',
    '1',
    '["STI Treatment - Syphilis"]';

-- Bicillin L-A (brand) - same as Penicillin G Benzathine
INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Bicillin L-A'),
    'treatment',
    'Early Syphilis (CDC 2021)',
    'Administer 2.4 million units by deep intramuscular injection as a single dose.',
    '["Single dose for primary, secondary, or early latent syphilis (<1 year)", "Inject deep IM in upper outer quadrant of buttock", "May divide into 2 injections of 1.2M units each buttock", "Warm to room temperature before injection; inject slowly over 20-30 seconds", "Observe patient 15-20 minutes (30 min if allergy history)"]',
    '["⚠️ Severe allergic reactions possible (anaphylaxis) - penicillin allergy", "⚠️ Jarisch-Herxheimer reaction may occur within 24 hours", "⚠️ Must be administered by healthcare professional", "⚠️ Never give IV - injection injury risk"]',
    '1',
    '["STI Treatment - Syphilis", "Primary Syphilis", "Secondary Syphilis", "Early Latent Syphilis"]';

-- ============================================================================
-- Insert Instruction Templates for Gentamicin & Levofloxacin (CDC STI Alternatives)
-- ============================================================================

-- Gentamicin - CDC Gonorrhea Alternative (cephalosporin allergy)
INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Gentamicin'),
    'treatment',
    'Gonorrhea - Alternative Regimen (CDC 2021)',
    'Inject 240mg intramuscularly as a single dose. MUST be given with Azithromycin 2g PO.',
    '["For patients with cephalosporin allergy only", "Single dose - must be combined with Azithromycin 2g PO", "Inject IM in upper outer quadrant of buttock", "Observe patient for 30 minutes post-injection", "Renal function consideration - check if impaired"]',
    '["⚠️ CDC Alternative Regimen - use only when ceftriaxone contraindicated", "⚠️ MUST be given with Azithromycin 2g PO - never alone", "⚠️ Observe patient for 30 minutes post-injection", "⚠️ Ototoxicity and nephrotoxicity risk - avoid if renal impairment"]',
    '1',
    '["STI Treatment - Gonorrhea", "Gonorrhea Alternative", "Cephalosporin Allergy"]';

-- Levofloxacin - CDC Chlamydia Alternative
INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Levofloxacin'),
    'treatment',
    'Chlamydia - Alternative Regimen (CDC 2021)',
    'Take 1 tablet (500mg) by mouth once daily for 7 days.',
    '["Alternative when doxycycline and azithromycin not suitable", "Take at same time each day", "Take with or without food", "Do NOT take with antacids, sucralfate, or multivitamins containing iron/zinc - separate by 2 hours", "Complete FULL 7 days even if feeling better"]',
    '["⚠️ Do NOT take with antacids - separate by at least 2 hours", "⚠️ May increase sun sensitivity - use sunscreen", "⚠️ Avoid in pregnancy - tendon rupture risk", "⚠️ Stop and contact provider if tendon pain or swelling", "⚠️ Complete FULL 7 days even if feeling better"]',
    '7',
    '["STI Treatment - Chlamydia", "Chlamydia Alternative"]';

-- ============================================================================
-- Insert Instruction Templates for Valacyclovir
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Valacyclovir'),
    'treatment',
    'Herpes Simplex Infection',
    'Take 2 tablets by mouth twice daily for 1 day',
    '["Take at the first sign of outbreak", "May take with or without food", "Stay hydrated while taking"]',
    '["Start treatment at first symptom", "May cause headache or nausea", "Does not cure herpes, reduces outbreaks"]',
    '1',
    '["Herpes Treatment", "Cold Sores", "Genital Herpes"]';

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Valacyclovir'),
    'prophylaxis',
    'Herpes Prophylaxis',
    'Take 1 tablet by mouth once daily',
    '["Take at the same time each day", "May take with or without food", "Stay hydrated"]',
    '["Does not cure herpes", "May reduce transmission to partners", "Regular monitoring recommended"]',
    '30',
    '["Herpes Prophylaxis", "Outbreak Prevention"]';
