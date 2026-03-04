-- ============================================================================
-- Inventory Seed Data for New Medications
-- Hyacinth Medication Dispensing System
-- ============================================================================

-- Temporarily disable foreign keys for seeding
PRAGMA foreign_keys = OFF;

-- Note: This seed data uses received_by=1 which references the admin user
-- The admin should be created by the main seed.ts file

-- ============================================================================
-- Insert Inventory Items for New Medications with Sample Lots
-- ============================================================================

-- Biktarvy - 3 lots with different expiration dates
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Biktarvy', 'BKT2024001', '61958-2001-1', '2026-12-31', 100, 100, 'tablet', 'Gilead Sciences', '2024-01-15', 1, 30, 'A1-B01', 'active'),
('Biktarvy', 'BKT2024002', '61958-2001-1', '2027-06-30', 150, 150, 'tablet', 'Gilead Sciences', '2024-03-01', 1, 30, 'A1-B02', 'active'),
('Biktarvy', 'BKT2024003', '61958-2001-1', '2025-09-15', 75, 75, 'tablet', 'Gilead Sciences', '2024-06-10', 1, 30, 'A1-B03', 'active');

-- Descovy - 2 lots
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Descovy', 'DSV2024001', '61958-1801-1', '2027-03-31', 120, 120, 'tablet', 'Gilead Sciences', '2024-01-20', 1, 30, 'A1-C01', 'active'),
('Descovy', 'DSV2024002', '61958-1801-1', '2026-11-15', 80, 80, 'tablet', 'Gilead Sciences', '2024-05-15', 1, 30, 'A1-C02', 'active');

-- Doxycycline - 4 lots
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Doxycycline', 'DOX2024001', '68180-0565-1', '2025-12-01', 200, 200, 'capsule', 'Generic Pharm', '2024-02-01', 1, 50, 'B1-A01', 'active'),
('Doxycycline', 'DOX2024002', '68180-0565-1', '2026-04-30', 250, 250, 'capsule', 'Generic Pharm', '2024-04-15', 1, 50, 'B1-A02', 'active'),
('Doxycycline', 'DOX2024003', '68180-0565-1', '2025-08-20', 150, 150, 'capsule', 'Generic Pharm', '2024-06-01', 1, 50, 'B1-A03', 'active'),
('Doxycycline', 'DOX2024004', '68180-0565-1', '2026-10-15', 180, 180, 'capsule', 'Generic Pharm', '2024-07-10', 1, 50, 'B1-A04', 'active');

-- Bactrim DS - 3 lots
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Bactrim DS', 'BCT2024001', '54868-4898-0', '2026-02-28', 100, 100, 'tablet', 'Teva Pharma', '2024-01-10', 1, 40, 'B1-B01', 'active'),
('Bactrim DS', 'BCT2024002', '54868-4898-0', '2025-07-15', 120, 120, 'tablet', 'Teva Pharma', '2024-04-20', 1, 40, 'B1-B02', 'active'),
('Bactrim DS', 'BCT2024003', '54868-4898-0', '2027-01-10', 90, 90, 'tablet', 'Teva Pharma', '2024-08-01', 1, 40, 'B1-B03', 'active');

-- Symtuza - 2 lots
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Symtuza', 'SMT2024001', '61958-2201-1', '2026-09-30', 60, 60, 'tablet', 'Janssen Pharma', '2024-02-15', 1, 20, 'A1-D01', 'active'),
('Symtuza', 'SMT2024002', '61958-2201-1', '2027-05-15', 80, 80, 'tablet', 'Janssen Pharma', '2024-06-20', 1, 20, 'A1-D02', 'active');

-- Dovato - 2 lots
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Dovato', 'DVT2024001', '0173-0870-0', '2026-11-20', 70, 70, 'tablet', 'ViiV Healthcare', '2024-03-01', 1, 25, 'A1-E01', 'active'),
('Dovato', 'DVT2024002', '0173-0870-0', '2027-08-30', 100, 100, 'tablet', 'ViiV Healthcare', '2024-07-15', 1, 25, 'A1-E02', 'active');

-- Tivicay - 2 lots
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Tivicay', 'TVC2024001', '0173-0840-0', '2026-05-15', 85, 85, 'tablet', 'ViiV Healthcare', '2024-01-25', 1, 25, 'A1-F01', 'active'),
('Tivicay', 'TVC2024002', '0173-0840-0', '2027-02-28', 110, 110, 'tablet', 'ViiV Healthcare', '2024-05-10', 1, 25, 'A1-F02', 'active');

-- Truvada - 3 lots
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Truvada', 'TRV2024001', '61958-0901-1', '2025-10-31', 90, 90, 'tablet', 'Gilead Sciences', '2024-02-10', 1, 30, 'A1-G01', 'active'),
('Truvada', 'TRV2024002', '61958-0901-1', '2026-08-15', 130, 130, 'tablet', 'Gilead Sciences', '2024-06-05', 1, 30, 'A1-G02', 'active'),
('Truvada', 'TRV2024003', '61958-0901-1', '2027-04-20', 95, 95, 'tablet', 'Gilead Sciences', '2024-08-20', 1, 30, 'A1-G03', 'active');

-- Juluca - 1 lot
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Juluca', 'JLC2024001', '0173-0880-0', '2026-12-15', 50, 50, 'tablet', 'ViiV Healthcare', '2024-03-20', 1, 15, 'A1-H01', 'active');

-- Cabenuva - 2 lots (injections)
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Cabenuva', 'CBN2024001', '0007-4893-01', '2025-11-30', 20, 20, 'vial', 'ViiV Healthcare', '2024-02-28', 1, 10, 'C1-A01', 'active'),
('Cabenuva', 'CBN2024002', '0007-4893-01', '2026-07-20', 25, 25, 'vial', 'ViiV Healthcare', '2024-07-01', 1, 10, 'C1-A02', 'active');

-- Apretude - 2 lots (injections for PrEP)
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Apretude', 'APR2024001', '0007-4985-01', '2026-04-10', 15, 15, 'vial', 'ViiV Healthcare', '2024-01-30', 1, 8, 'C1-B01', 'active'),
('Apretude', 'APR2024002', '0007-4985-01', '2027-01-25', 20, 20, 'vial', 'ViiV Healthcare', '2024-06-15', 1, 8, 'C1-B02', 'active');

-- Emtricitabine - 2 lots
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Emtricitabine', 'EMC2024001', '58168-0215-1', '2026-06-30', 100, 100, 'capsule', 'Generic Pharm', '2024-03-10', 1, 30, 'A1-I01', 'active'),
('Emtricitabine', 'EMC2024002', '58168-0215-1', '2027-03-15', 120, 120, 'capsule', 'Generic Pharm', '2024-07-05', 1, 30, 'A1-I02', 'active');

-- Tenofovir DF - 2 lots
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Tenofovir DF', 'TDF2024001', '61958-0801-1', '2026-09-15', 110, 110, 'tablet', 'Gilead Sciences', '2024-04-01', 1, 30, 'A1-J01', 'active'),
('Tenofovir DF', 'TDF2024002', '61958-0801-1', '2027-06-01', 90, 90, 'tablet', 'Gilead Sciences', '2024-08-10', 1, 30, 'A1-J02', 'active');

-- Azithromycin - 3 lots
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Azithromycin', 'AZM2024001', '68180-0545-5', '2025-09-30', 150, 150, 'tablet', 'Pfizer', '2024-02-20', 1, 40, 'B1-C01', 'active'),
('Azithromycin', 'AZM2024002', '68180-0545-5', '2026-05-15', 200, 200, 'tablet', 'Pfizer', '2024-05-25', 1, 40, 'B1-C02', 'active'),
('Azithromycin', 'AZM2024003', '68180-0545-5', '2027-02-28', 175, 175, 'tablet', 'Pfizer', '2024-08-15', 1, 40, 'B1-C03', 'active');

-- Ceftriaxone - 3 lots (injections)
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Ceftriaxone', 'CFR2024001', '0703-0647-11', '2025-08-15', 50, 50, 'vial', 'Generic Pharm', '2024-01-15', 1, 20, 'C1-C01', 'active'),
('Ceftriaxone', 'CFR2024002', '0703-0647-11', '2026-03-31', 60, 60, 'vial', 'Generic Pharm', '2024-06-20', 1, 20, 'C1-C02', 'active'),
('Ceftriaxone', 'CFR2024003', '0703-0647-11', '2026-11-10', 55, 55, 'vial', 'Generic Pharm', '2024-09-01', 1, 20, 'C1-C03', 'active');

-- Penicillin G Benzathine - 3 lots (injections)
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Penicillin G Benzathine', 'PNC2024001', '0025-1081-10', '2025-07-31', 40, 40, 'vial', 'Pfizer', '2024-02-05', 1, 15, 'C1-D01', 'active'),
('Penicillin G Benzathine', 'PNC2024002', '0025-1081-10', '2026-02-15', 45, 45, 'vial', 'Pfizer', '2024-06-10', 1, 15, 'C1-D02', 'active'),
('Penicillin G Benzathine', 'PNC2024003', '0025-1081-10', '2026-09-20', 35, 35, 'vial', 'Pfizer', '2024-09-10', 1, 15, 'C1-D03', 'active');

-- Valacyclovir - 2 lots
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Valacyclovir', 'VCL2024001', '68180-0563-5', '2026-01-31', 80, 80, 'tablet', 'Generic Pharm', '2024-03-15', 1, 25, 'B1-D01', 'active'),
('Valacyclovir', 'VCL2024002', '68180-0563-5', '2027-05-20', 100, 100, 'tablet', 'Generic Pharm', '2024-08-25', 1, 25, 'B1-D02', 'active');

-- Gentamicin - CDC Gonorrhea alternative (injections)
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Gentamicin', 'GTM2024001', '0641-6110-10', '2025-12-31', 30, 30, 'vial', 'Generic Pharm', '2024-04-01', 1, 15, 'C1-E01', 'active'),
('Gentamicin', 'GTM2024002', '0641-6110-10', '2026-06-30', 35, 35, 'vial', 'Generic Pharm', '2024-08-15', 1, 15, 'C1-E02', 'active');

-- Levofloxacin - CDC Chlamydia alternative
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Levofloxacin', 'LVX2024001', '68180-0547-1', '2026-03-15', 80, 80, 'tablet', 'Generic Pharm', '2024-02-20', 1, 25, 'B1-E01', 'active'),
('Levofloxacin', 'LVX2024002', '68180-0547-1', '2026-11-30', 90, 90, 'tablet', 'Generic Pharm', '2024-07-01', 1, 25, 'B1-E02', 'active');

-- Azithromycin 1g - Chlamydia single-dose, Gonorrhea dual therapy
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Azithromycin 1g', 'AZM1G2024001', '68180-0546-1', '2025-10-31', 50, 50, 'packet', 'Pfizer', '2024-03-01', 1, 20, 'B1-F01', 'active'),
('Azithromycin 1g', 'AZM1G2024002', '68180-0546-1', '2026-05-15', 60, 60, 'packet', 'Pfizer', '2024-07-15', 1, 20, 'B1-F02', 'active');

-- Bicillin L-A - Syphilis (brand penicillin G benzathine)
INSERT OR IGNORE INTO inventory (
    medication_name, lot_number, ndc_code, expiration_date,
    quantity_received, quantity_on_hand, unit, supplier,
    received_date, received_by, reorder_threshold, storage_location, status
) VALUES
('Bicillin L-A', 'BCL2024001', '0005-7792-01', '2025-09-30', 25, 25, 'vial', 'Pfizer', '2024-02-10', 1, 10, 'C1-F01', 'active'),
('Bicillin L-A', 'BCL2024002', '0005-7792-01', '2026-04-15', 30, 30, 'vial', 'Pfizer', '2024-06-20', 1, 10, 'C1-F02', 'active');

-- Re-enable foreign key support
PRAGMA foreign_keys = ON;
