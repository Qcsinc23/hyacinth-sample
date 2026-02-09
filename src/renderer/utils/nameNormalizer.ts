/**
 * Name Normalization Utilities
 * 
 * Provides functions for normalizing patient names including
 * title case conversion, trimming, and deduplication.
 */

/**
 * Convert string to title case (first letter of each word uppercase)
 */
export const toTitleCase = (input: string): string => {
  if (!input) return '';
  
  return input
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      if (word.length === 0) return word;
      
      // Handle hyphenated names
      if (word.includes('-')) {
        return word
          .split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join('-');
      }
      
      // Handle apostrophes (O'Connor, D'Angelo)
      if (word.includes("'")) {
        const parts = word.split("'");
        return parts
          .map((part, index) => {
            if (index === 0) {
              return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
            }
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join("'");
      }
      
      // Handle Mc and Mac prefixes
      if (word.toLowerCase().startsWith('mc')) {
        return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
      }
      if (word.toLowerCase().startsWith('mac') && word.length > 3) {
        return 'Mac' + word.charAt(3).toUpperCase() + word.slice(4).toLowerCase();
      }
      
      // Handle Jr, Sr, II, III, etc. suffixes
      const suffixes = ['jr', 'sr', 'ii', 'iii', 'iv', 'v'];
      const lowerWord = word.toLowerCase();
      if (suffixes.includes(lowerWord)) {
        return lowerWord === 'jr' ? 'Jr.' : 
               lowerWord === 'sr' ? 'Sr.' : 
               word.toUpperCase();
      }
      
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Trim whitespace from start and end of string
 * Also removes extra internal whitespace
 */
export const normalizeWhitespace = (input: string): string => {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/\s+/g, ' '); // Replace multiple spaces with single space
};

/**
 * Remove duplicate words from a string
 */
export const removeDuplicateWords = (input: string): string => {
  if (!input) return '';
  
  const words = input.split(/\s+/);
  const seen = new Set<string>();
  const result: string[] = [];
  
  for (const word of words) {
    const lowerWord = word.toLowerCase();
    if (!seen.has(lowerWord)) {
      seen.add(lowerWord);
      result.push(word);
    }
  }
  
  return result.join(' ');
};

/**
 * Normalize a full name: trim, title case, deduplicate
 */
export const normalizeName = (input: string): string => {
  if (!input) return '';
  
  let normalized = normalizeWhitespace(input);
  normalized = toTitleCase(normalized);
  
  return normalized;
};

/**
 * Normalize patient name fields
 */
export const normalizePatientName = (firstName: string, lastName: string): {
  firstName: string;
  lastName: string;
} => {
  return {
    firstName: normalizeName(firstName),
    lastName: normalizeName(lastName),
  };
};

/**
 * Remove special characters except for valid name characters
 * Valid: letters, spaces, hyphens, apostrophes
 */
export const sanitizeNameCharacters = (input: string): string => {
  if (!input) return '';
  
  // Keep only letters, spaces, hyphens, and apostrophes
  return input.replace(/[^a-zA-Z\s\-'']/g, '');
};

/**
 * Check if a name contains potentially problematic characters
 */
export const hasProblematicCharacters = (input: string): boolean => {
  if (!input) return false;
  
  // Check for numbers
  if (/\d/.test(input)) return true;
  
  // Check for excessive punctuation
  if (/[!@#$%^&*()_+=\[\]{};:"\\|,.<>\/?]/.test(input)) return true;
  
  // Check for excessive whitespace
  if (/\s{2,}/.test(input)) return true;
  
  return false;
};

/**
 * Clean and normalize a name for database storage
 */
export const cleanNameForStorage = (input: string): string => {
  if (!input) return '';
  
  let cleaned = sanitizeNameCharacters(input);
  cleaned = normalizeWhitespace(cleaned);
  cleaned = toTitleCase(cleaned);
  
  return cleaned;
};

/**
 * Generate search variants for a name
 * Useful for searching with different capitalizations
 */
export const generateSearchVariants = (name: string): string[] => {
  if (!name) return [];
  
  const variants = new Set<string>();
  
  const normalized = name.toLowerCase().trim();
  variants.add(normalized);
  variants.add(normalized.replace(/\s+/g, '')); // No spaces
  variants.add(normalized.replace(/-/g, '')); // No hyphens
  variants.add(normalized.replace(/'/g, '')); // No apostrophes
  
  return Array.from(variants);
};

/**
 * Compare two names for similarity (case-insensitive)
 */
export const namesMatch = (name1: string, name2: string): boolean => {
  if (!name1 || !name2) return false;
  
  const normalizeForComparison = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z]/g, ''); // Remove all non-letters
  };
  
  return normalizeForComparison(name1) === normalizeForComparison(name2);
};

/**
 * Extract initials from a name
 */
export const getInitials = (name: string): string => {
  if (!name) return '';
  
  return name
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
};

/**
 * Format name for display with proper suffix
 */
export const formatNameWithSuffix = (
  firstName: string,
  lastName: string,
  suffix?: string
): string => {
  const normalized = normalizePatientName(firstName, lastName);
  let fullName = `${normalized.firstName} ${normalized.lastName}`;
  
  if (suffix) {
    const normalizedSuffix = suffix.toLowerCase() === 'jr' ? 'Jr.' :
                             suffix.toLowerCase() === 'sr' ? 'Sr.' :
                             suffix;
    fullName += `, ${normalizedSuffix}`;
  }
  
  return fullName;
};
