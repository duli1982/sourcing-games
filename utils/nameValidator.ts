/**
 * Name Validation Utilities
 * Provides profanity filtering, character validation, and normalization
 */

// Basic profanity list - extend this list as needed
const PROFANITY_LIST = [
  'damn', 'hell', 'crap', 'shit', 'fuck', 'ass', 'bitch', 'bastard',
  'piss', 'dick', 'cock', 'pussy', 'whore', 'slut', 'fag', 'nigger',
  'chink', 'spic', 'kike', 'retard', 'nazi', 'hitler', 'rape',
  // Add variations and l33t speak
  'sh1t', 'fuk', 'fck', 'b1tch', 'a$$', 'azz', 'phuck',
];

/**
 * Checks if a name contains profanity
 * @param name - The name to check
 * @returns true if profanity is detected, false otherwise
 */
export function containsProfanity(name: string): boolean {
  const lowerName = name.toLowerCase().replace(/[áàäâãåāăąæ]/g, 'a')
    .replace(/[éèëêēėęě]/g, 'e')
    .replace(/[íìïîīįı]/g, 'i')
    .replace(/[óòöôõōőø]/g, 'o')
    .replace(/[úùüûūůű]/g, 'u')
    .replace(/[çćč]/g, 'c')
    .replace(/[ñńň]/g, 'n')
    .replace(/[śšş]/g, 's')
    .replace(/[žźż]/g, 'z')
    .replace(/[ł]/g, 'l')
    .replace(/[đď]/g, 'd')
    .replace(/[ř]/g, 'r')
    .replace(/[ť]/g, 't')
    .replace(/ß/g, 'ss');

  // Only check for whole word matches to avoid false positives with international names
  return PROFANITY_LIST.some(word => {
    // Strict word boundary matching - must be surrounded by spaces or start/end of string
    const regex = new RegExp(`(^|\\s)${word}(\\s|$)`, 'i');
    return regex.test(lowerName);
  });
}

/**
 * Validates that name contains only allowed characters
 * Allows: letters (including accented), spaces, hyphens, apostrophes
 * @param name - The name to validate
 * @returns true if valid, false otherwise
 */
export function hasValidCharacters(name: string): boolean {
  // Allow letters (including Unicode letters), spaces, hyphens, apostrophes
  const validPattern = /^[\p{L}\s\-']+$/u;
  return validPattern.test(name);
}

/**
 * Normalizes a name for case-insensitive comparison
 * Converts to lowercase and trims whitespace
 * @param name - The name to normalize
 * @returns normalized name
 */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Validates a name against all rules
 * @param name - The name to validate
 * @returns object with isValid and error message if invalid
 */
export function validateName(name: string): { isValid: boolean; error?: string } {
  const trimmed = name.trim();

  // Check length
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }

  if (trimmed.length > 50) {
    return { isValid: false, error: 'Name must be less than 50 characters' };
  }

  // Check characters
  if (!hasValidCharacters(trimmed)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }

  // Check profanity
  if (containsProfanity(trimmed)) {
    return { isValid: false, error: 'Please choose a more appropriate name' };
  }

  return { isValid: true };
}
