# Hyacinth Medication Dispensing System - Enhanced Implementation Plan

## Executive Summary

This plan outlines enhancements to the Hyacinth Medication Dispensing System to:
1. Incorporate new medications with proper inventory tracking (lot numbers, expiration dates)
2. Link dispense reasons to treatment vs. prevention instructions
3. Ensure printed forms meet/exceed paper form standards
4. Generate pharmacy bottle labels that comply with format requirements
5. Adjust instructions dynamically based on dispense reason context

---

## Phase 1: Database Schema Enhancements

### 1.1 New Medication Catalog Table

**File**: `src/main/database/schema.sql`

Create a new table for standardized medication catalog:

```sql
CREATE TABLE IF NOT EXISTS medication_catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medication_name TEXT NOT NULL,
    generic_name TEXT,
    strength TEXT,
    dosage_form TEXT NOT NULL, -- tablet, capsule, injection, etc.
    category TEXT NOT NULL, -- ARV, Antibiotic, Prophylactic, etc.
    ndc_code TEXT UNIQUE,
    default_unit TEXT NOT NULL,
    is_controlled BOOLEAN DEFAULT 0,
    schedule TEXT CHECK (schedule IN ('II', 'III', 'IV', 'V')),
    storage_requirements TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 1.2 Medication Instruction Templates Table

```sql
CREATE TABLE IF NOT EXISTS medication_instruction_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medication_catalog_id INTEGER NOT NULL,
    context TEXT NOT NULL, -- 'treatment', 'prevention', 'prophylaxis', 'pep', 'prep'
    indication TEXT NOT NULL,
    short_dosing TEXT NOT NULL, -- e.g., "Take 1 tablet by mouth once daily"
    full_instructions TEXT, -- Detailed patient instructions
    warnings TEXT, -- JSON array of warning strings
    day_supply_calculation TEXT, -- Formula or multiplier
    common_reasons TEXT, -- JSON array of common dispense reasons
    is_active BOOLEAN DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (medication_catalog_id) REFERENCES medication_catalog(id) ON DELETE CASCADE
);
```

### 1.3 Enhanced Dispense Reasons with Context

```sql
-- Update record_reasons to include context
ALTER TABLE record_reasons ADD COLUMN context TEXT CHECK (context IN ('treatment', 'prevention', 'prophylaxis', 'pep', 'prep', 'other'));
ALTER TABLE record_reasons ADD COLUMN links_to_instruction BOOLEAN DEFAULT 0;
```

### 1.4 Dispensing Line Items Enhancement

```sql
-- Add to dispensing_line_items
ALTER TABLE dispensing_line_items ADD COLUMN instruction_context TEXT;
ALTER TABLE dispensing_line_items ADD COLUMN day_supply INTEGER;
ALTER TABLE dispensing_line_items ADD COLUMN medication_strength TEXT;
ALTER TABLE dispensing_line_items ADD COLUMN warnings TEXT; -- JSON array
```

---

## Phase 2: Medication Catalog and Templates

### 2.1 New Medications to Add

Create seed data for new medications:

| Medication | Strength | Form | Category | Contexts |
|------------|----------|------|----------|----------|
| Biktarvy | 50mg/200mg/25mg | Tablet | ARV | Treatment, nPEP |
| Descovy | 200mg/25mg | Tablet | ARV | PrEP, Treatment |
| Doxycycline | 100mg | Capsule | Antibiotic | Treatment, Doxy-PEP |
| Bactrim DS | 800mg/160mg | Tablet | Antibiotic | Treatment, Prophylaxis |
| Symtuza | 800mg/150mg/200mg/10mg | Tablet | ARV | Treatment |
| Dovato | 50mg/300mg | Tablet | ARV | Treatment |
| Tivicay | 50mg | Tablet | ARV | Treatment |
| Truvada | 200mg/300mg | Tablet | ARV | PrEP, Treatment |
| Juluca | 25mg/300mg | Tablet | ARV | Treatment |
| Cabenuva | 400mg/600mg | Injection | ARV | Treatment |
| Apretude | 600mg | Injection | ARV | PrEP |
| Emtricitabine | 200mg | Capsule | ARV | Treatment |
| Tenofovir DF | 300mg | Tablet | ARV | Treatment |
| Azithromycin | 250mg | Tablet | Antibiotic | Treatment |
| Ceftriaxone | 500mg | Injection | Antibiotic | Treatment |
| Penicillin G Benzathine | 2.4M units | Injection | Antibiotic | Treatment |
| Valacyclovir | 1g | Tablet | Antiviral | Treatment, Prophylaxis |

### 2.2 Context-Specific Instructions Template

**File**: `src/renderer/data/medicationInstructions.ts`

```typescript
export interface MedicationInstruction {
  medicationId: string;
  medicationName: string;
  strength: string;
  context: 'treatment' | 'prevention' | 'prophylaxis' | 'pep' | 'prep';
  indication: string;
  shortDosing: string;
  fullInstructions: string[];
  warnings: string[];
  daySupplyMultiplier: number;
  commonReasons: string[];
}

export const MEDICATION_INSTRUCTIONS: MedicationInstruction[] = [
  // Biktarvy Examples
  {
    medicationId: 'biktarvy',
    medicationName: 'Biktarvy',
    strength: '50mg/200mg/25mg',
    context: 'treatment',
    indication: 'HIV-1 Infection',
    shortDosing: 'Take 1 tablet by mouth once daily',
    fullInstructions: [
      'Take at the same time each day',
      'May take with or without food',
      'Do not skip doses - resistance can develop',
      'If you miss a dose, take it as soon as you remember'
    ],
    warnings: [
      'Severe exacerbations of Hepatitis B reported if discontinued',
      'Do not stop without consulting healthcare provider',
      'This medication does not cure HIV or prevent transmission'
    ],
    daySupplyMultiplier: 30,
    commonReasons: ['HIV Treatment', 'Antiretroviral Therapy', 'Initial Regimen']
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
      'Take 2 hours BEFORE or 6 hours AFTER medications containing polyvalent cations',
      'Complete full 28-day course',
      'If you miss doses, resistance can develop'
    ],
    warnings: [
      'Do not miss any doses',
      'Complete entire 28-day course even if you feel well',
      'Follow-up HIV testing required after completion'
    ],
    daySupplyMultiplier: 28,
    commonReasons: ['nPEP', 'HIV Exposure', 'Post-Exposure Prophylaxis']
  },
  // ... additional medications
];
```

---

## Phase 3: Enhanced Dispense Reason System

### 3.1 Updated Reason Types with Context

**File**: `src/renderer/types/index.ts`

```typescript
export type DispenseReason =
  // Treatment reasons
  | 'HIV Treatment - Initial'
  | 'HIV Treatment - Continuation'
  | 'STI Treatment - Chlamydia'
  | 'STI Treatment - Gonorrhea'
  | 'STI Treatment - Syphilis'
  | 'UTI Treatment'
  | 'Other Infection Treatment'
  // Prevention/Prophylaxis reasons
  | 'PrEP - Daily'
  | 'PrEP - On-Demand'
  | 'nPEP - 28 Day Course'
  | 'Doxy-PEP'
  | 'PCP Prophylaxis'
  | 'Toxoplasmosis Prophylaxis'
  | 'Herpes Prophylaxis'
  // Legacy reasons
  | 'Scheduled Medication'
  | 'PRN (As Needed)'
  | 'STAT/Emergency'
  | 'New Order'
  | 'Discharge'
  | 'Transfer'
  | 'Waste';

export type ReasonContext = 'treatment' | 'prevention' | 'prophylaxis' | 'pep' | 'prep' | 'other';

export interface DispenseReasonConfig {
  value: DispenseReason;
  label: string;
  context: ReasonContext;
  color: string;
  linksToInstructions: boolean;
}
```

### 3.2 Reason to Instruction Mapping

**File**: `src/renderer/data/reasonInstructionMapping.ts`

```typescript
export const REASON_INSTRUCTION_MAP: Record<DispenseReason, {
  context: ReasonContext;
  defaultIndication: string;
  instructionPriority: string[]; // Medication IDs in priority order
}> = {
  'nPEP - 28 Day Course': {
    context: 'pep',
    defaultIndication: 'Non-occupational Post-Exposure Prophylaxis',
    instructionPriority: ['biktarvy', 'symtuza', 'descovy']
  },
  'PrEP - Daily': {
    context: 'prep',
    defaultIndication: 'Pre-Exposure Prophylaxis',
    instructionPriority: ['descovy', 'truvada']
  },
  'Doxy-PEP': {
    context: 'prevention',
    defaultIndication: 'STI Post-Exposure Prophylaxis',
    instructionPriority: ['doxycycline']
  },
  // ... more mappings
};
```

---

## Phase 4: UI/UX Enhancements

### 4.1 Enhanced Entry Form Flow

**Current Flow Issues**:
1. Instructions not auto-populated based on reason + medication
2. Day supply not calculated
3. Context (treatment vs prevention) not considered

**Enhanced Flow**:
```
1. Select Patient
   ↓
2. Add Medication(s)
   ↓
3. Select Dispense Reason(s)
   ↓
4. [NEW] System detects context from reason
   ↓
5. [NEW] Auto-populate instructions based on medication + context
   ↓
6. [NEW] Calculate day supply from quantity
   ↓
7. [NEW] Show warnings relevant to context
   ↓
8. Review & Confirm
   ↓
9. PIN Verification
   ↓
10. Save & Print
```

### 4.2 New Components Needed

1. **InstructionPreviewCard** (`src/renderer/components/EntryForm/InstructionPreviewCard.tsx`)
   - Shows what will print on label
   - Updates in real-time as selections change
   - Highlights warnings

2. **ContextIndicator** (`src/renderer/components/EntryForm/ContextIndicator.tsx`)
   - Visual badge showing detected context (Treatment vs Prevention)
   - Updates when reasons are selected

3. **DaySupplyCalculator** (`src/renderer/components/EntryForm/DaySupplyCalculator.tsx`)
   - Auto-calculates based on quantity + instruction template
   - Manual override option

### 4.3 Enhanced MedicationLineItem

**File**: `src/renderer/components/EntryForm/MedicationLineItem.tsx`

Add fields:
- Instructions preview (editable)
- Day supply (auto-calculated, editable)
- Warnings display
- Context badge

---

## Phase 5: Print and Label Enhancements

### 5.1 Enhanced Label Format

**File**: `src/main/print/labelPrinter.ts`

**Current Label Fields**:
- Patient name, chart number
- Medication name, strength
- Directions
- Quantity, date, Rx number
- Warnings

**Enhanced Label Requirements** (based on pharmacy standards):

```
┌─────────────────────────────────────────────┐
│ HYACINTH HEALTH & WELLNESS CLINIC          │
│ (862) 240-1461                              │
├─────────────────────────────────────────────┤
│ DOE, JOHN                                   │
│ Chart: 12345                                │
├─────────────────────────────────────────────┤
│ Medication: BIKTARVY                        │
│ Strength: 50mg/200mg/25mg                   │
├─────────────────────────────────────────────┤
│ Quantity: 30 tablets (30-day supply)       │
│ Rx #: RX20240208001                         │
├─────────────────────────────────────────────┤
│ Directions:                                 │
│ Take 1 tablet by mouth once daily           │
│ Complete all 28 days for nPEP               │
├─────────────────────────────────────────────┤
│ For: Non-occupational Post-Exposure         │
│      Prophylaxis                            │
├─────────────────────────────────────────────┤
│ Prescribed by: Dr. Provider                │
│ Dispensed: 02/08/2024                       │
├─────────────────────────────────────────────┤
│ ⚠ IMPORTANT:                               │
│ • Must be started within 72 hours of        │
│   exposure                                  │
│ • Do not miss doses - resistance can        │
│   develop                                   │
│ • Complete full 28-day course               │
│ ─────────────────────────────────────────   │
│ Lot: ABC1234  Exp: 12/2025                  │
└─────────────────────────────────────────────┘
```

### 5.2 Enhanced Receipt Format

**Additional Fields**:
- Dispense context indicator
- Full instructions (not abbreviated)
- All warnings with checkboxes for review
- Staff verification section
- Patient acknowledgment section

### 5.3 Print Service Enhancements

**File**: `src/main/services/printService.ts`

Add:
- Smart context detection
- Dynamic instruction selection
- Warning prioritization based on context
- Multi-label generation with different instructions per medication

---

## Phase 6: Inventory Management

### 6.1 Lot Number Validation

**Requirements**:
- All dispensed medications MUST have lot number
- Expiration date MUST be verified as not expired
- Warning if lot expires within 90 days

**Implementation**:
```typescript
// In useInventory hook
export const validateLotForDispensing = (lotId: string, quantity: number): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const lot = getLotById(lotId);
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check expiration
  const today = new Date();
  const expiration = new Date(lot.expirationDate);
  const daysUntilExpiration = Math.floor((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiration < 0) {
    errors.push('This lot has expired. Cannot dispense.');
  } else if (daysUntilExpiration < 30) {
    warnings.push(`Lot expires in ${daysUntilExpiration} days. Consider using newer stock.`);
  } else if (daysUntilExpiration < 90) {
    warnings.push(`Lot expires in ${daysUntilExpiration} days.`);
  }

  // Check quantity
  if (lot.quantityOnHand < quantity) {
    errors.push(`Insufficient quantity. Available: ${lot.quantityOnHand}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};
```

### 6.2 Inventory Receiving Enhancements

**File**: `src/renderer/components/Inventory/ReceiveStockForm.tsx`

Add fields:
- NDC code lookup
- Expiration date validation
- Medication catalog linking
- Auto-categorization

---

## Phase 7: Implementation Order

### Sprint 1: Database & Foundation
1. Create migration scripts for new tables
2. Add seed data for medication catalog
3. Create instruction templates for all new medications
4. Update type definitions

### Sprint 2: Core Logic
1. Implement reason-to-context mapping
2. Create instruction selection service
3. Build day supply calculator
4. Implement lot validation

### Sprint 3: UI Components
1. Build InstructionPreviewCard
2. Build ContextIndicator
3. Enhance MedicationLineItem
4. Update ReasonSelector with categories

### Sprint 4: Integration
1. Connect form to new instruction system
2. Integrate lot validation into form
3. Add auto-calculation of day supply
4. Implement dynamic warnings

### Sprint 5: Print & Label
1. Enhance label format
2. Update receipt format
3. Add context-based instruction printing
4. Implement multi-medication label handling

### Sprint 6: Testing & Polish
1. End-to-end testing of all scenarios
2. Edge case handling
3. User acceptance testing
4. Documentation

---

## Phase 8: Edge Cases to Handle

### 8.1 Multiple Medications with Different Contexts
**Scenario**: Patient receives Biktarvy for nPEP AND Doxycycline for STI treatment

**Solution**: Each medication line item maintains its own context based on:
1. Primary reason for that medication
2. Override option for manual context selection

### 8.2 Conflicting Reasons
**Scenario**: User selects both "HIV Treatment" AND "nPEP" reasons

**Solution**:
- Show warning dialog
- Require user to clarify context
- System detects incompatibility

### 8.3 Custom Medications
**Scenario**: Medication not in catalog needs instructions

**Solution**:
- Fallback to generic instructions
- Allow manual entry
- Prompt to add to catalog

### 8.4 Expired or Near-Expired Lots
**Scenario**: Only expired lot available

**Solution**:
- Hard block on expired lots
- Warning for near-expired (30 days)
- Require override confirmation

### 8.5 Quantity Mismatch
**Scenario**: Requested quantity doesn't match standard day supply

**Solution**:
- Show calculated day supply
- Allow override with reason
- Flag for pharmacist review

---

## Phase 9: Success Criteria

### Functional Requirements
- [ ] All new medications available in catalog
- [ ] Lot numbers required for all dispensing
- [ ] Expiration dates validated before dispensing
- [ ] Instructions adjust based on dispense context
- [ ] Day supply auto-calculated and accurate
- [ ] Labels include all required information
- [ ] Receipts meet/exceed paper form standards

### Quality Requirements
- [ ] No expired lots can be dispensed
- [ ] All warnings relevant to context displayed
- [ ] Print preview matches actual output
- [ ] Audit trail complete for all transactions

### User Experience Requirements
- [ ] Form flow intuitive with minimal clicks
- [ ] Instructions clear and readable
- [ ] Error messages actionable
- [ ] Print process seamless

---

## Phase 10: Data Migration

### Initial Medication Catalog Seed

Create comprehensive seed file: `src/main/database/seeds/medicationCatalog.sql`

Include all 17+ new medications with:
- NDC codes
- Multiple instruction templates per context
- Complete warning sets
- Day supply calculations

---

## Summary of Key Files to Modify

| File | Changes |
|------|---------|
| `src/main/database/schema.sql` | Add medication_catalog, instruction_templates tables |
| `src/renderer/types/index.ts` | Add DispenseReasonConfig, InstructionContext types |
| `src/renderer/data/medicationInstructions.ts` | New: Instruction templates |
| `src/renderer/data/reasonInstructionMapping.ts` | New: Reason to context mapping |
| `src/renderer/components/EntryForm/EntryFormContainer.tsx` | Add context detection, instruction loading |
| `src/renderer/components/EntryForm/MedicationLineItem.tsx` | Add instruction preview, day supply |
| `src/renderer/components/EntryForm/ReasonSelector.tsx` | Categorize reasons by context |
| `src/renderer/components/EntryForm/InstructionPreviewCard.tsx` | New: Real-time instruction preview |
| `src/main/print/labelPrinter.ts` | Enhanced label format |
| `src/renderer/hooks/useInventory.ts` | Add lot validation |
| `src/main/services/instructionService.ts` | New: Instruction selection logic |
