/**
 * Team utility functions
 * Handles invite code generation and team-related helpers
 */

/**
 * Generate a random 8-character alphanumeric invite code
 * Format: XXXX-XXXX for readability
 * Example: AB7K-9M2P
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters (0, O, I, 1)
  let code = '';

  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];

    // Add hyphen after 4th character
    if (i === 3) {
      code += '-';
    }
  }

  return code;
}

/**
 * Validate invite code format
 * Must be 8 characters (alphanumeric) with optional hyphen
 */
export function isValidInviteCode(code: string): boolean {
  // Remove hyphen for validation
  const cleanCode = code.replace('-', '');

  // Check length (8 characters)
  if (cleanCode.length !== 8) {
    return false;
  }

  // Check if all characters are alphanumeric
  const regex = /^[A-Z0-9]+$/i;
  return regex.test(cleanCode);
}

/**
 * Format invite code with hyphen for display
 * Input: "AB7K9M2P" or "AB7K-9M2P"
 * Output: "AB7K-9M2P"
 */
export function formatInviteCode(code: string): string {
  const cleanCode = code.replace('-', '').toUpperCase();

  if (cleanCode.length !== 8) {
    return code; // Return as-is if invalid length
  }

  return `${cleanCode.slice(0, 4)}-${cleanCode.slice(4)}`;
}

/**
 * Calculate team average score from member scores
 */
export function calculateTeamAverage(memberScores: number[]): number {
  if (memberScores.length === 0) {
    return 0;
  }

  const sum = memberScores.reduce((acc, score) => acc + score, 0);
  return Math.round(sum / memberScores.length);
}

/**
 * Validate team name
 * Must be 3-50 characters, alphanumeric with spaces and basic punctuation
 */
export function isValidTeamName(name: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = name.trim();

  if (trimmed.length < 3) {
    return { valid: false, error: 'Team name must be at least 3 characters' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Team name must be 50 characters or less' };
  }

  // Allow letters, numbers, spaces, hyphens, underscores, and ampersands
  const regex = /^[a-zA-Z0-9\s\-_&]+$/;
  if (!regex.test(trimmed)) {
    return {
      valid: false,
      error: 'Team name can only contain letters, numbers, spaces, and basic punctuation',
    };
  }

  return { valid: true };
}

/**
 * Get team member role display text
 */
export function getRoleDisplayText(role: 'owner' | 'admin' | 'member'): string {
  const roleMap: Record<string, string> = {
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
  };

  return roleMap[role] || 'Member';
}

/**
 * Get team member role badge color
 */
export function getRoleBadgeColor(role: 'owner' | 'admin' | 'member'): string {
  const colorMap: Record<string, string> = {
    owner: 'bg-purple-500 text-white',
    admin: 'bg-blue-500 text-white',
    member: 'bg-gray-500 text-white',
  };

  return colorMap[role] || 'bg-gray-500 text-white';
}
