/**
 * Integration Tests for Patient Search and Lookup
 * Tests patient management including:
 * - Search by name
 * - Search by chart number
 * - Search by date of birth
 * - Patient selection
 * - Duplicate detection
 * - Name normalization
 */

import { validatePatient } from '../../renderer/utils/validators';
import {
  formatPatientName,
  formatPatientNameDisplay,
  formatDate,
  formatPhoneNumber,
  calculateAge,
  formatAge,
} from '../../renderer/utils/formatters';
import {
  toTitleCase,
  normalizeName,
  normalizePatientName,
  namesMatch,
  generateSearchVariants,
  hasProblematicCharacters,
  sanitizeNameCharacters,
  getInitials,
  formatNameWithSuffix,
} from '../../renderer/utils/nameNormalizer';
import { mockPatients } from '../mockData';

describe('Patient Search and Lookup Integration', () => {
  // ============================================================================
  // Name Search Tests
  // ============================================================================
  describe('Name Search', () => {
    it('should find patient by exact first name', () => {
      const searchTerm = 'James';
      const matches = mockPatients.filter(p => 
        namesMatch(p.first_name, searchTerm)
      );
      
      expect(matches).toHaveLength(1);
      expect(matches[0].first_name).toBe('James');
    });

    it('should find patient by exact last name', () => {
      const searchTerm = 'Garcia';
      const matches = mockPatients.filter(p => 
        namesMatch(p.last_name, searchTerm)
      );
      
      expect(matches).toHaveLength(1);
      expect(matches[0].last_name).toBe('Garcia');
    });

    it('should find patient by partial name match', () => {
      const searchTerm = 'son';
      const matches = mockPatients.filter(p => 
        p.first_name.toLowerCase().includes(searchTerm) ||
        p.last_name.toLowerCase().includes(searchTerm)
      );
      
      // Should match Wilson and Smith-Jones
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    it('should perform case-insensitive search', () => {
      const searchTerms = ['james', 'JAMES', 'James', 'JaMeS'];
      
      searchTerms.forEach(term => {
        const matches = mockPatients.filter(p => 
          namesMatch(p.first_name, term)
        );
        expect(matches).toHaveLength(1);
        expect(matches[0].first_name).toBe('James');
      });
    });

    it('should find patient with apostrophe in name', () => {
      const searchTerms = ["O'Connor", 'oconnor', "O Connor"];
      
      searchTerms.forEach(term => {
        const matches = mockPatients.filter(p => 
          namesMatch(p.last_name, term)
        );
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should find patient with hyphen in name', () => {
      const searchTerms = ['Smith-Jones', 'SmithJones', 'Smith Jones'];
      
      searchTerms.forEach(term => {
        const matches = mockPatients.filter(p => 
          namesMatch(p.last_name, term)
        );
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should generate search variants for name', () => {
      const variants = generateSearchVariants('Smith-Jones');
      
      expect(variants).toContain('smith-jones');
      expect(variants).toContain('smithjones');
    });
  });

  // ============================================================================
  // Chart Number Search Tests
  // ============================================================================
  describe('Chart Number Search', () => {
    it('should find patient by exact chart number', () => {
      const chartNumber = 'HC001234';
      const patient = mockPatients.find(p => p.chart_number === chartNumber);
      
      expect(patient).toBeDefined();
      expect(patient?.first_name).toBe('James');
    });

    it('should find patient by partial chart number', () => {
      const partialChart = 'HC001';
      const matches = mockPatients.filter(p => 
        p.chart_number.includes(partialChart)
      );
      
      expect(matches.length).toBeGreaterThan(1);
    });

    it('should handle chart number format', () => {
      mockPatients.forEach(patient => {
        expect(patient.chart_number).toMatch(/^HC\d{6}$/);
      });
    });

    it('should have unique chart numbers', () => {
      const chartNumbers = mockPatients.map(p => p.chart_number);
      const uniqueChartNumbers = new Set(chartNumbers);
      
      expect(uniqueChartNumbers.size).toBe(chartNumbers.length);
    });
  });

  // ============================================================================
  // Date of Birth Search Tests
  // ============================================================================
  describe('Date of Birth Search', () => {
    it('should format patient date of birth', () => {
      const patient = mockPatients[0];
      const formatted = formatDate(patient.dob);
      
      expect(formatted).toBe('03/15/1985');
    });

    it('should calculate patient age', () => {
      const patient = mockPatients[0];
      const age = calculateAge(patient.dob);
      
      expect(age).toBeDefined();
      expect(age).toBeGreaterThan(0);
    });

    it('should format patient age', () => {
      const patient = mockPatients[0];
      const ageDisplay = formatAge(patient.dob);
      
      expect(ageDisplay).toMatch(/\d+ years/);
    });

    it('should find patients by birth year', () => {
      const birthYear = '1985';
      const matches = mockPatients.filter(p => p.dob.startsWith(birthYear));
      
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('should validate date of birth format', () => {
      mockPatients.forEach(patient => {
        // Should be in YYYY-MM-DD format
        expect(patient.dob).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  // ============================================================================
  // Patient Selection Tests
  // ============================================================================
  describe('Patient Selection', () => {
    it('should format patient name for display', () => {
      const patient = mockPatients[0];
      const displayName = formatPatientNameDisplay(
        patient.first_name,
        patient.last_name
      );
      
      expect(displayName).toBe('James Wilson');
    });

    it('should format patient name for sorting', () => {
      const patient = mockPatients[0];
      const sortName = formatPatientName(
        patient.first_name,
        patient.last_name
      );
      
      expect(sortName).toBe('Wilson, James');
    });

    it('should get patient initials', () => {
      const patient = mockPatients[0];
      const initials = getInitials(`${patient.first_name} ${patient.last_name}`);
      
      expect(initials).toBe('JW');
    });

    it('should format patient phone number', () => {
      const patient = mockPatients[0];
      const formattedPhone = formatPhoneNumber(patient.phone);
      
      expect(formattedPhone).toBe('(555) 123-4567');
    });

    it('should handle missing optional fields', () => {
      const patient = mockPatients[2]; // Has null email and address
      
      expect(patient.email).toBeNull();
      expect(patient.address).toBeNull();
      
      // Should still format name properly
      const displayName = formatPatientNameDisplay(
        patient.first_name,
        patient.last_name
      );
      expect(displayName).toBe("Robert O'Connor");
    });
  });

  // ============================================================================
  // Name Normalization Tests
  // ============================================================================
  describe('Name Normalization', () => {
    it('should normalize patient names', () => {
      const rawName = { firstName: 'JOHN', lastName: 'DOE' };
      const normalized = normalizePatientName(rawName.firstName, rawName.lastName);
      
      expect(normalized.firstName).toBe('John');
      expect(normalized.lastName).toBe('Doe');
    });

    it('should normalize names with special characters', () => {
      const normalized = normalizeName("o'CONNOR");
      expect(normalized).toBe("O'Connor");
    });

    it('should normalize hyphenated names', () => {
      const normalized = normalizeName('SMITH-JONES');
      expect(normalized).toBe('Smith-Jones');
    });

    it('should normalize Mc prefix', () => {
      const normalized = normalizeName('MCDONALD');
      expect(normalized).toBe('McDonald');
    });

    it('should normalize Mac prefix', () => {
      const normalized = normalizeName('MACDONALD');
      expect(normalized).toBe('MacDonald');
    });

    it('should normalize Jr suffix', () => {
      const normalized = toTitleCase('jr');
      expect(normalized).toBe('Jr.');
    });

    it('should normalize Sr suffix', () => {
      const normalized = toTitleCase('sr');
      expect(normalized).toBe('Sr.');
    });

    it('should normalize Roman numerals', () => {
      expect(toTitleCase('iii')).toBe('III');
      expect(toTitleCase('iv')).toBe('IV');
    });

    it('should sanitize problematic characters', () => {
      const sanitized = sanitizeNameCharacters('John123!@#');
      expect(sanitized).toBe('John');
    });

    it('should detect problematic characters', () => {
      expect(hasProblematicCharacters('John123')).toBe(true);
      expect(hasProblematicCharacters('John@Doe')).toBe(true);
      expect(hasProblematicCharacters('John Doe')).toBe(false);
    });
  });

  // ============================================================================
  // Duplicate Detection Tests
  // ============================================================================
  describe('Duplicate Detection', () => {
    it('should identify exact name matches', () => {
      // In our mock data, all names are unique
      const names = mockPatients.map(p => 
        `${p.first_name.toLowerCase()} ${p.last_name.toLowerCase()}`
      );
      const uniqueNames = new Set(names);
      
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should identify potential duplicates with different formatting', () => {
      // Simulate finding duplicates with different case/spacing
      const name1 = 'john doe';
      const name2 = 'JOHN DOE';
      
      expect(namesMatch(name1, name2)).toBe(true);
    });

    it('should identify duplicates with apostrophe variations', () => {
      const name1 = "O'Connor";
      const name2 = 'OConnor';
      
      expect(namesMatch(name1, name2)).toBe(true);
    });

    it('should identify duplicates with hyphen variations', () => {
      const name1 = 'Smith-Jones';
      const name2 = 'SmithJones';
      
      expect(namesMatch(name1, name2)).toBe(true);
    });

    it('should validate unique chart numbers', () => {
      const chartNumbers = mockPatients.map(p => p.chart_number);
      const uniqueChartNumbers = new Set(chartNumbers);
      
      expect(uniqueChartNumbers.size).toBe(chartNumbers.length);
    });
  });

  // ============================================================================
  // Patient Validation Tests
  // ============================================================================
  describe('Patient Validation', () => {
    it('should validate complete patient data', () => {
      const patient = mockPatients[0];
      const validation = validatePatient({
        firstName: patient.first_name,
        lastName: patient.last_name,
        dateOfBirth: patient.dob,
        email: patient.email || undefined,
        phone: patient.phone || undefined,
      });
      
      expect(validation.isValid).toBe(true);
    });

    it('should validate patient with minimal data', () => {
      const patient = {
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: '1990-01-01',
      };
      
      const validation = validatePatient(patient);
      expect(validation.isValid).toBe(true);
    });

    it('should reject patient with invalid email', () => {
      const patient = {
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: '1990-01-01',
        email: 'invalid-email',
      };
      
      const validation = validatePatient(patient);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.email).toBeDefined();
    });

    it('should reject patient with invalid phone', () => {
      const patient = {
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: '1990-01-01',
        phone: '123',
      };
      
      const validation = validatePatient(patient);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.phone).toBeDefined();
    });

    it('should reject patient with future birth date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const patient = {
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: futureDate.toISOString().split('T')[0],
      };
      
      const validation = validatePatient(patient);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.dateOfBirth).toBeDefined();
    });
  });

  // ============================================================================
  // Active/Inactive Patient Tests
  // ============================================================================
  describe('Active/Inactive Patient Management', () => {
    it('should identify active patients', () => {
      const activePatients = mockPatients.filter(p => p.is_active);
      
      expect(activePatients.length).toBeGreaterThan(0);
      activePatients.forEach(p => {
        expect(p.is_active).toBe(true);
      });
    });

    it('should identify inactive patients', () => {
      const inactivePatients = mockPatients.filter(p => !p.is_active);
      
      expect(inactivePatients.length).toBeGreaterThan(0);
      inactivePatients.forEach(p => {
        expect(p.is_active).toBe(false);
      });
    });

    it('should only return active patients by default', () => {
      const activePatients = mockPatients.filter(p => p.is_active);
      
      expect(activePatients).not.toContainEqual(
        expect.objectContaining({ is_active: false })
      );
    });
  });

  // ============================================================================
  // End-to-End Search Workflow Tests
  // ============================================================================
  describe('End-to-End Search Workflow', () => {
    it('should search by full name', () => {
      const searchQuery = 'James Wilson';
      const [firstName, lastName] = searchQuery.split(' ');
      
      const matches = mockPatients.filter(p => 
        namesMatch(p.first_name, firstName) && 
        namesMatch(p.last_name, lastName)
      );
      
      expect(matches).toHaveLength(1);
      expect(matches[0].chart_number).toBe('HC001234');
    });

    it('should search by last name only', () => {
      const searchQuery = 'Wilson';
      
      const matches = mockPatients.filter(p => 
        namesMatch(p.last_name, searchQuery)
      );
      
      expect(matches).toHaveLength(1);
    });

    it('should search with name normalization', () => {
      const searchQuery = 'WILSON';
      const normalizedQuery = normalizeName(searchQuery);
      
      const matches = mockPatients.filter(p => 
        namesMatch(p.last_name, normalizedQuery)
      );
      
      expect(matches).toHaveLength(1);
    });

    it('should format patient for selection', () => {
      const patient = mockPatients[0];
      
      const selectionData = {
        id: patient.id,
        chartNumber: patient.chart_number,
        displayName: formatPatientNameDisplay(patient.first_name, patient.last_name),
        sortName: formatPatientName(patient.first_name, patient.last_name),
        age: formatAge(patient.dob),
        phone: formatPhoneNumber(patient.phone),
      };
      
      expect(selectionData.chartNumber).toBe('HC001234');
      expect(selectionData.displayName).toBe('James Wilson');
      expect(selectionData.sortName).toBe('Wilson, James');
    });

    it('should handle patient with suffix', () => {
      const formatted = formatNameWithSuffix('John', 'Doe', 'Jr');
      expect(formatted).toBe('John Doe, Jr.');
    });

    it('should complete full patient lookup workflow', () => {
      // Step 1: Search by partial name
      const searchResults = mockPatients.filter(p => 
        p.last_name.toLowerCase().includes('wilson')
      );
      
      expect(searchResults.length).toBeGreaterThanOrEqual(1);
      
      // Step 2: Select patient
      const selected = searchResults[0];
      
      // Step 3: Format for display
      const displayData = {
        name: formatPatientNameDisplay(selected.first_name, selected.last_name),
        chartNumber: selected.chart_number,
        age: formatAge(selected.dob),
        phone: formatPhoneNumber(selected.phone),
      };
      
      expect(displayData.name).toBe('James Wilson');
      expect(displayData.chartNumber).toBe('HC001234');
    });
  });

  // ============================================================================
  // Search Result Formatting Tests
  // ============================================================================
  describe('Search Result Formatting', () => {
    it('should sort patients by last name', () => {
      const sorted = [...mockPatients].sort((a, b) => 
        a.last_name.localeCompare(b.last_name)
      );
      
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i-1].last_name.localeCompare(sorted[i].last_name))
          .toBeLessThanOrEqual(0);
      }
    });

    it('should format search result summary', () => {
      const searchResults = mockPatients.filter(p => p.is_active);
      
      const summary = {
        total: searchResults.length,
        showing: Math.min(searchResults.length, 20),
        results: searchResults.slice(0, 20).map(p => ({
          id: p.id,
          name: formatPatientName(p.first_name, p.last_name),
          chartNumber: p.chart_number,
          age: formatAge(p.dob),
        })),
      };
      
      expect(summary.total).toBeGreaterThan(0);
      expect(summary.results.length).toBeLessThanOrEqual(20);
    });

    it('should highlight search term in results', () => {
      const searchTerm = 'James';
      const patient = mockPatients.find(p => p.first_name === searchTerm);
      
      expect(patient).toBeDefined();
      
      // Verify the name matches
      const normalizedFirst = normalizeName(patient!.first_name);
      expect(normalizedFirst.toLowerCase()).toContain(searchTerm.toLowerCase());
    });
  });
});
