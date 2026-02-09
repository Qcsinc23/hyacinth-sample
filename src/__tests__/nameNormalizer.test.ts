/**
 * Unit Tests for Name Normalizer
 * Tests all name normalization functions from nameNormalizer.ts
 */

import {
  toTitleCase,
  normalizeWhitespace,
  removeDuplicateWords,
  normalizeName,
  normalizePatientName,
  sanitizeNameCharacters,
  hasProblematicCharacters,
  cleanNameForStorage,
  generateSearchVariants,
  namesMatch,
  getInitials,
  formatNameWithSuffix,
} from '../renderer/utils/nameNormalizer';

describe('nameNormalizer', () => {
  // ============================================================================
  // Title Case Tests
  // ============================================================================
  describe('toTitleCase', () => {
    it('should convert lowercase to title case', () => {
      expect(toTitleCase('john doe')).toBe('John Doe');
    });

    it('should convert uppercase to title case', () => {
      expect(toTitleCase('JOHN DOE')).toBe('John Doe');
    });

    it('should handle mixed case', () => {
      expect(toTitleCase('jOhN dOe')).toBe('John Doe');
    });

    it('should handle hyphenated names', () => {
      expect(toTitleCase('mary-jane smith-jones')).toBe('Mary-Jane Smith-Jones');
    });

    it('should handle names with apostrophes', () => {
      expect(toTitleCase("o'connor d'angelo")).toBe("O'Connor D'Angelo");
    });

    it('should handle Mc prefix', () => {
      expect(toTitleCase('mcdonald')).toBe('McDonald');
    });

    it('should handle Mac prefix', () => {
      expect(toTitleCase('macdonald')).toBe('MacDonald');
    });

    it('should handle Jr suffix', () => {
      expect(toTitleCase('smith jr')).toBe('Smith Jr.');
    });

    it('should handle Sr suffix', () => {
      expect(toTitleCase('smith sr')).toBe('Smith Sr.');
    });

    it('should handle Roman numeral suffixes', () => {
      expect(toTitleCase('kennedy ii')).toBe('Kennedy II');
      expect(toTitleCase('kennedy iii')).toBe('Kennedy III');
      expect(toTitleCase('kennedy iv')).toBe('Kennedy IV');
      expect(toTitleCase('kennedy v')).toBe('Kennedy V');
    });

    it('should handle empty string', () => {
      expect(toTitleCase('')).toBe('');
    });

    it('should handle single character', () => {
      expect(toTitleCase('a')).toBe('A');
    });

    it('should handle multiple spaces', () => {
      expect(toTitleCase('john   doe')).toBe('John Doe');
    });
  });

  // ============================================================================
  // Whitespace Normalization Tests
  // ============================================================================
  describe('normalizeWhitespace', () => {
    it('should trim leading and trailing whitespace', () => {
      expect(normalizeWhitespace('  hello  ')).toBe('hello');
    });

    it('should collapse multiple spaces to single space', () => {
      expect(normalizeWhitespace('hello    world')).toBe('hello world');
    });

    it('should handle tabs and newlines', () => {
      expect(normalizeWhitespace('hello\t\tworld')).toBe('hello world');
      expect(normalizeWhitespace('hello\n\nworld')).toBe('hello world');
    });

    it('should handle empty string', () => {
      expect(normalizeWhitespace('')).toBe('');
    });

    it('should handle string with only whitespace', () => {
      expect(normalizeWhitespace('   ')).toBe('');
    });
  });

  // ============================================================================
  // Duplicate Word Removal Tests
  // ============================================================================
  describe('removeDuplicateWords', () => {
    it('should remove duplicate words', () => {
      expect(removeDuplicateWords('the the quick brown fox')).toBe('the quick brown fox');
    });

    it('should be case insensitive', () => {
      expect(removeDuplicateWords('The the quick Quick')).toBe('The quick');
    });

    it('should handle no duplicates', () => {
      expect(removeDuplicateWords('the quick brown fox')).toBe('the quick brown fox');
    });

    it('should handle empty string', () => {
      expect(removeDuplicateWords('')).toBe('');
    });

    it('should preserve word order', () => {
      expect(removeDuplicateWords('beta alpha beta gamma')).toBe('beta alpha gamma');
    });
  });

  // ============================================================================
  // Name Normalization Tests
  // ============================================================================
  describe('normalizeName', () => {
    it('should normalize simple name', () => {
      expect(normalizeName('  JOHN doe  ')).toBe('John Doe');
    });

    it('should handle empty string', () => {
      expect(normalizeName('')).toBe('');
    });

    it('should handle complex name', () => {
      expect(normalizeName('  o\'CONNOR  ')).toBe("O'Connor");
    });
  });

  // ============================================================================
  // Patient Name Normalization Tests
  // ============================================================================
  describe('normalizePatientName', () => {
    it('should normalize both first and last names', () => {
      const result = normalizePatientName('  john  ', '  DOE  ');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });

    it('should handle hyphenated names', () => {
      const result = normalizePatientName('mary-jane', 'smith-jones');
      expect(result.firstName).toBe('Mary-Jane');
      expect(result.lastName).toBe('Smith-Jones');
    });

    it('should handle apostrophes', () => {
      const result = normalizePatientName("d'arcy", "o'brien");
      expect(result.firstName).toBe("D'Arcy");
      expect(result.lastName).toBe("O'Brien");
    });
  });

  // ============================================================================
  // Character Sanitization Tests
  // ============================================================================
  describe('sanitizeNameCharacters', () => {
    it('should remove numbers', () => {
      expect(sanitizeNameCharacters('John123')).toBe('John');
    });

    it('should remove special characters', () => {
      expect(sanitizeNameCharacters('John@Doe!')).toBe('JohnDoe');
    });

    it('should keep letters', () => {
      expect(sanitizeNameCharacters('John')).toBe('John');
    });

    it('should keep spaces', () => {
      expect(sanitizeNameCharacters('John Doe')).toBe('John Doe');
    });

    it('should keep hyphens', () => {
      expect(sanitizeNameCharacters('Smith-Jones')).toBe('Smith-Jones');
    });

    it('should keep apostrophes', () => {
      expect(sanitizeNameCharacters("O'Connor")).toBe("O'Connor");
    });

    it('should handle empty string', () => {
      expect(sanitizeNameCharacters('')).toBe('');
    });
  });

  // ============================================================================
  // Problematic Character Detection Tests
  // ============================================================================
  describe('hasProblematicCharacters', () => {
    it('should detect numbers', () => {
      expect(hasProblematicCharacters('John123')).toBe(true);
    });

    it('should detect special punctuation', () => {
      expect(hasProblematicCharacters('John@Doe')).toBe(true);
      expect(hasProblematicCharacters('John#Doe')).toBe(true);
    });

    it('should detect excessive whitespace', () => {
      expect(hasProblematicCharacters('John  Doe')).toBe(true);
    });

    it('should return false for valid names', () => {
      expect(hasProblematicCharacters('John Doe')).toBe(false);
      expect(hasProblematicCharacters("O'Connor-Smith")).toBe(false);
    });

    it('should handle empty string', () => {
      expect(hasProblematicCharacters('')).toBe(false);
    });
  });

  // ============================================================================
  // Storage Cleaning Tests
  // ============================================================================
  describe('cleanNameForStorage', () => {
    it('should clean and normalize name', () => {
      expect(cleanNameForStorage('  john123@  ')).toBe('John');
    });

    it('should handle special characters', () => {
      expect(cleanNameForStorage('o\'connor!')).toBe("O'Connor");
    });

    it('should handle empty string', () => {
      expect(cleanNameForStorage('')).toBe('');
    });
  });

  // ============================================================================
  // Search Variant Generation Tests
  // ============================================================================
  describe('generateSearchVariants', () => {
    it('should generate lowercase variant', () => {
      const variants = generateSearchVariants('John Doe');
      expect(variants).toContain('john doe');
    });

    it('should generate no-space variant', () => {
      const variants = generateSearchVariants('John Doe');
      expect(variants).toContain('johndoe');
    });

    it('should generate no-hyphen variant', () => {
      const variants = generateSearchVariants('Smith-Jones');
      expect(variants).toContain('smithjones');
    });

    it('should generate no-apostrophe variant', () => {
      const variants = generateSearchVariants("O'Connor");
      expect(variants).toContain('oconnor');
    });

    it('should return empty array for empty string', () => {
      expect(generateSearchVariants('')).toEqual([]);
    });

    it('should return unique variants only', () => {
      const variants = generateSearchVariants('John');
      expect(new Set(variants).size).toBe(variants.length);
    });
  });

  // ============================================================================
  // Name Matching Tests
  // ============================================================================
  describe('namesMatch', () => {
    it('should match identical names', () => {
      expect(namesMatch('John Doe', 'John Doe')).toBe(true);
    });

    it('should match case insensitively', () => {
      expect(namesMatch('JOHN DOE', 'john doe')).toBe(true);
    });

    it('should match ignoring spaces', () => {
      expect(namesMatch('JohnDoe', 'John Doe')).toBe(true);
    });

    it('should match ignoring hyphens', () => {
      expect(namesMatch('Smith-Jones', 'SmithJones')).toBe(true);
    });

    it('should match ignoring apostrophes', () => {
      expect(namesMatch("O'Connor", 'OConnor')).toBe(true);
    });

    it('should not match different names', () => {
      expect(namesMatch('John Doe', 'Jane Doe')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(namesMatch('', 'John')).toBe(false);
      expect(namesMatch('John', '')).toBe(false);
    });
  });

  // ============================================================================
  // Initials Extraction Tests
  // ============================================================================
  describe('getInitials', () => {
    it('should get initials from full name', () => {
      expect(getInitials('John Michael Doe')).toBe('JMD');
    });

    it('should handle two names', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    it('should handle single name', () => {
      expect(getInitials('Cher')).toBe('C');
    });

    it('should handle empty string', () => {
      expect(getInitials('')).toBe('');
    });

    it('should handle multiple spaces', () => {
      expect(getInitials('John   Doe')).toBe('JD');
    });
  });

  // ============================================================================
  // Name with Suffix Formatting Tests
  // ============================================================================
  describe('formatNameWithSuffix', () => {
    it('should format name with Jr suffix', () => {
      expect(formatNameWithSuffix('John', 'Doe', 'Jr')).toBe('John Doe, Jr.');
    });

    it('should format name with Sr suffix', () => {
      expect(formatNameWithSuffix('John', 'Doe', 'Sr')).toBe('John Doe, Sr.');
    });

    it('should format name with III suffix', () => {
      expect(formatNameWithSuffix('John', 'Doe', 'III')).toBe('John Doe, III');
    });

    it('should format name without suffix', () => {
      expect(formatNameWithSuffix('John', 'Doe')).toBe('John Doe');
    });

    it('should normalize names with suffix', () => {
      expect(formatNameWithSuffix('JOHN', 'DOE', 'JR')).toBe('John Doe, Jr.');
    });
  });
});
