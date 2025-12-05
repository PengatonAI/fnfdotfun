/**
 * Security utilities for input validation and sanitization
 */

/**
 * Sanitize user input to prevent XSS attacks
 * Removes HTML tags and escapes special characters
 */
export function sanitizeString(input: string | null | undefined, maxLength?: number): string {
  if (!input) return '';
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Escape special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  // Trim and enforce max length
  sanitized = sanitized.trim();
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Validate username format (alphanumeric, underscore, 3-20 chars)
 */
export function isValidUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username.trim());
}

/**
 * Validate crew name format (alphanumeric, spaces, basic punctuation, 1-100 chars)
 */
export function isValidCrewName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 100) return false;
  // Allow alphanumeric, spaces, hyphens, underscores, and basic punctuation
  const crewNameRegex = /^[a-zA-Z0-9\s\-_.,!?]+$/;
  return crewNameRegex.test(trimmed);
}

/**
 * Validate description (max 500 chars, allow basic formatting)
 */
export function isValidDescription(description: string | null | undefined): boolean {
  if (description === null || description === undefined) return true;
  if (typeof description !== 'string') return false;
  return description.length <= 500;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string | null | undefined): boolean {
  if (url === null || url === undefined) return true;
  if (typeof url !== 'string') return false;
  if (url.trim().length === 0) return true; // Allow empty strings
  
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate wallet address format (basic check)
 */
export function isValidWalletAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim().toLowerCase();
  // Basic validation: EVM addresses are 42 chars (0x + 40 hex), Solana are 32-44 base58
  // This is a basic check - more specific validation should be done per chain
  return trimmed.length >= 32 && trimmed.length <= 44 && /^[a-z0-9]+$/.test(trimmed.replace(/^0x/, ''));
}

/**
 * Sanitize and validate crew name
 */
export function sanitizeCrewName(name: string): string {
  const sanitized = sanitizeString(name, 100);
  if (!isValidCrewName(sanitized)) {
    throw new Error('Invalid crew name format');
  }
  return sanitized.trim();
}

/**
 * Sanitize and validate username
 */
export function sanitizeUsername(username: string): string {
  const trimmed = username.trim();
  if (!isValidUsername(trimmed)) {
    throw new Error('Invalid username format');
  }
  return trimmed;
}

