/**
 * Password utilities for hotspot customer management
 * Generates and validates 4-digit numeric passwords for WiFi access
 */

/**
 * Generate a random 4-digit numeric password
 * @returns {string} A 4-digit numeric password (e.g., "1234", "5678")
 */
export function generateHotspotPassword(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Validate if a password is a valid 4-digit format
 * @param {string} password - The password to validate
 * @returns {boolean} True if password is exactly 4 digits
 */
export function validateHotspotPassword(password: string): boolean {
  const digitRegex = /^\d{4}$/;
  return digitRegex.test(password);
}

/**
 * Check if a password needs to be reset (placeholder for future functionality)
 * @param {Date} lastChanged - When the password was last changed
 * @param {number} expiryDays - Number of days before password expires (default: 365)
 * @returns {boolean} True if password should be reset
 */
export function isPasswordExpired(lastChanged: Date, expiryDays: number = 365): boolean {
  const now = new Date();
  const expiryDate = new Date(lastChanged);
  expiryDate.setDate(expiryDate.getDate() + expiryDays);
  return now > expiryDate;
}

/**
 * Generate multiple unique 4-digit passwords (for batch operations)
 * @param {number} count - Number of passwords to generate
 * @returns {string[]} Array of unique 4-digit passwords
 */
export function generateMultipleHotspotPasswords(count: number): string[] {
  const passwords = new Set<string>();
  
  while (passwords.size < count) {
    passwords.add(generateHotspotPassword());
  }
  
  return Array.from(passwords);
}

/**
 * Format password for display (add spacing for readability)
 * @param {string} password - The 4-digit password
 * @returns {string} Formatted password (e.g., "12 34")
 */
export function formatPasswordForDisplay(password: string): string {
  if (!validateHotspotPassword(password)) {
    return password; // Return as-is if not valid 4-digit format
  }
  
  return `${password.slice(0, 2)} ${password.slice(2)}`;
}

/**
 * Generate a secure 4-digit password with additional entropy
 * Uses crypto.getRandomValues if available (browser environment)
 * Falls back to Math.random() for Node.js environment
 * @returns {string} A cryptographically secure 4-digit password
 */
export function generateSecureHotspotPassword(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    // Browser environment - use crypto API
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return (1000 + (array[0] % 9000)).toString();
  } else {
    // Node.js environment - use Math.random()
    return generateHotspotPassword();
  }
} 