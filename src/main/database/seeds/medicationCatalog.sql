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

-- ============================================================================
-- Insert Instruction Templates for Biktarvy
-- ============================================================================

-- Get medication IDs for template insertion (using subqueries)
INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Biktarvy'),
    'treatment',
    'HIV-1 Infection',
    'Take 1 tablet by mouth once daily',
    '["Take at the same time each day", "May take with or without food", "Do not skip doses - resistance can develop", "If you miss a dose, take it as soon as you remember"]',
    '["Severe exacerbations of Hepatitis B reported if discontinued", "Do not stop without consulting healthcare provider", "This medication does not cure HIV or prevent transmission"]',
    '30',
    '["HIV Treatment", "Antiretroviral Therapy", "Initial Regimen"]';

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Biktarvy'),
    'pep',
    'nPEP (Non-occupational Post-Exposure Prophylaxis)',
    'Take 1 tablet by mouth once daily for 28 days',
    '["Must be started within 72 hours of exposure", "Take 2 hours BEFORE or 6 hours AFTER medications containing polyvalent cations", "Complete full 28-day course", "If you miss doses, resistance can develop"]',
    '["Do not miss any doses", "Complete entire 28-day course even if you feel well", "Follow-up HIV testing required after completion"]',
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
    'Take 1 tablet by mouth once daily',
    '["Take at the same time each day", "May take with or without food", "Do not skip doses for maximum protection", "Get tested for HIV every 3 months"]',
    '["Must be HIV-negative before starting", "Does not prevent other STIs", "Requires regular kidney function monitoring"]',
    '30',
    '["PrEP - Daily", "HIV Prevention", "Pre-Exposure Prophylaxis"]';

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Descovy'),
    'treatment',
    'HIV-1 Infection',
    'Take 1 tablet by mouth once daily',
    '["Take at the same time each day", "May take with or without food", "Do not skip doses - resistance can develop"]',
    '["Severe exacerbations of Hepatitis B reported if discontinued", "Do not stop without consulting healthcare provider"]',
    '30',
    '["HIV Treatment", "Antiretroviral Therapy"]';

-- ============================================================================
-- Insert Instruction Templates for Doxycycline
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Doxycycline'),
    'treatment',
    'Bacterial Infection',
    'Take 1 capsule by mouth twice daily for 7 days',
    '["Take with plenty of water", "May take with food if stomach upset occurs", "Do not take with antacids or dairy products", "Complete full course as prescribed"]',
    '["May cause increased sensitivity to sunlight", "Do not use in children under 8 years", "Can make birth control pills less effective"]',
    '7',
    '["STI Treatment - Chlamydia", "Respiratory Infection", "Skin Infection"]';

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Doxycycline'),
    'prevention',
    'Doxy-PEP (STI Post-Exposure Prophylaxis)',
    'Take 2 capsules by mouth within 24 hours after sex, then 1 capsule twice daily for 2 days',
    '["Take first dose within 24 hours after condomless sex", "Take with plenty of water", "May take with food", "Do not take with antacids or dairy"]',
    '["Only for Doxy-PEP - not for treatment", "Do not use as a substitute for condoms", "May cause increased sensitivity to sunlight"]',
    '3',
    '["Doxy-PEP", "STI Prevention"]';

-- ============================================================================
-- Insert Instruction Templates for Bactrim DS
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Bactrim DS'),
    'treatment',
    'Bacterial Infection',
    'Take 1 tablet by mouth twice daily',
    '["Take with plenty of water", "May take with food", "Complete full course as prescribed", "Drink extra fluids to prevent kidney stones"]',
    '["Severe allergic reactions possible", "May cause low blood sodium", "Not for use in late pregnancy"]',
    '7',
    '["UTI Treatment", "Skin Infection", "Respiratory Infection"]';

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Bactrim DS'),
    'prophylaxis',
    'PCP Prophylaxis',
    'Take 1 tablet by mouth daily',
    '["Take at the same time each day", "May take with food", "Drink extra fluids", "Do not skip doses"]',
    '["Regular blood monitoring required", "May cause low blood cell counts", "Seek care for fever or sore throat"]',
    '30',
    '["PCP Prophylaxis", "Pneumocystis Prevention"]';

-- ============================================================================
-- Insert Instruction Templates for Symtuza
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Symtuza'),
    'treatment',
    'HIV-1 Infection',
    'Take 1 tablet by mouth once daily',
    '["Take with food", "Take at the same time each day", "Do not skip doses - resistance can develop"]',
    '["Severe exacerbations of Hepatitis B reported if discontinued", "Do not stop without consulting healthcare provider", "Contains sulfa - allergy warning"]',
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
    'Take 1 tablet by mouth once daily',
    '["May take with or without food", "Take at the same time each day", "Do not skip doses - resistance can develop"]',
    '["Severe exacerbations of Hepatitis B reported if discontinued", "Do not stop without consulting healthcare provider"]',
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
    'Bacterial Infection',
    'Take 2 tablets by mouth on day 1, then 1 tablet daily for 4 days',
    '["Take at the same time each day", "May take with or without food", "Complete full course as prescribed"]',
    '["May cause diarrhea", "Get medical help for irregular heartbeat", "May interact with other medications"]',
    '5',
    '["STI Treatment - Chlamydia", "Respiratory Infection", "Skin Infection"]';

-- ============================================================================
-- Insert Instruction Templates for Ceftriaxone
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Ceftriaxone'),
    'treatment',
    'Bacterial Infection',
    'Administer by intramuscular or intravenous injection once daily',
    '["Must be administered by healthcare professional", "Duration depends on infection type", "Reconstitute with appropriate diluent"]',
    '["Allergic reactions possible - especially penicillin allergy", "May cause gallbladder problems", "Do not use with calcium-containing solutions"]',
    '7',
    '["STI Treatment - Gonorrhea", "Respiratory Infection", "Sepsis Treatment"]';

-- ============================================================================
-- Insert Instruction Templates for Penicillin G Benzathine
-- ============================================================================

INSERT OR IGNORE INTO medication_instruction_templates (medication_catalog_id, context, indication, short_dosing, full_instructions, warnings, day_supply_calculation, common_reasons)
SELECT
    (SELECT id FROM medication_catalog WHERE medication_name = 'Penicillin G Benzathine'),
    'treatment',
    'Syphilis',
    'Administer 2.4 million units by intramuscular injection as single dose',
    '["Must be administered by healthcare professional", "Single dose for primary/secondary syphilis", "Deep intragluteal injection required"]',
    '["Severe allergic reactions possible (anaphylaxis)", "Must monitor for penicillin allergy", "Jarisch-Herxheimer reaction may occur"]',
    '1',
    '["STI Treatment - Syphilis", "Primary Syphilis", "Secondary Syphilis"]';

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
