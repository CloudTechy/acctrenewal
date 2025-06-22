/**
 * Date utilities for hotspot customer management
 * Handles expiry date calculations for service renewals
 */

/**
 * Calculate new expiry date based on current expiry and days to add
 * Handles three scenarios:
 * 1. Future expiry: Adds days to existing expiry
 * 2. Past expiry: Starts from current date
 * 3. No expiry: Starts from current date
 * 
 * @param {string | null | undefined} currentExpiry - Current expiry date (YYYY-MM-DD HH:MM:SS format)
 * @param {number} daysToAdd - Number of days to add
 * @returns {Date} New expiry date
 */
export function calculateNewExpiry(currentExpiry: string | null | undefined, daysToAdd: number): Date {
  let calculatedExpiry: Date;
  
  if (currentExpiry) {
    const current = new Date(currentExpiry);
    const now = new Date();
    
    // If current expiry is in the future, add to it
    if (current > now) {
      calculatedExpiry = new Date(current);
      calculatedExpiry.setDate(calculatedExpiry.getDate() + daysToAdd);
    } else {
      // If expired, start from now
      calculatedExpiry = new Date();
      calculatedExpiry.setDate(calculatedExpiry.getDate() + daysToAdd);
    }
  } else {
    // No current expiry provided, start from now
    calculatedExpiry = new Date();
    calculatedExpiry.setDate(calculatedExpiry.getDate() + daysToAdd);
  }

  return calculatedExpiry;
}

/**
 * Calculate number of days remaining until expiry
 * @param {string | Date} expiryDate - Expiry date
 * @returns {number} Number of days remaining (negative if expired)
 */
export function calculateDaysRemaining(expiryDate: string | Date): number {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Format date for Radius Manager API (YYYY-MM-DD HH:MM:SS)
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDateForRadiusManager(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Check if a date is in the past
 * @param {string | Date} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export function isDateExpired(date: string | Date): boolean {
  const now = new Date();
  const checkDate = new Date(date);
  return checkDate < now;
}

/**
 * Add days to a date
 * @param {Date} date - Base date
 * @param {number} days - Number of days to add
 * @returns {Date} New date with days added
 */
export function addDaysToDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get current date formatted for Radius Manager
 * @returns {string} Current date in YYYY-MM-DD HH:MM:SS format
 */
export function getCurrentDateForRadiusManager(): string {
  return formatDateForRadiusManager(new Date());
}

/**
 * Calculate expiry date from service plan duration
 * @param {string} currentExpiry - Current expiry date (optional)
 * @param {number} planDurationDays - Service plan duration in days
 * @returns {string} New expiry date formatted for Radius Manager
 */
export function calculateServiceExpiry(currentExpiry: string | null | undefined, planDurationDays: number): string {
  const newExpiryDate = calculateNewExpiry(currentExpiry, planDurationDays);
  return formatDateForRadiusManager(newExpiryDate);
}

/**
 * Validate date format for Radius Manager (YYYY-MM-DD HH:MM:SS)
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if format is valid
 */
export function isValidRadiusManagerDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Calculate same-day expiry for hotspot registration (expires at end of current day)
 * @returns {string} Expiry date set to 23:59:59 of current day, formatted for Radius Manager
 */
export function calculateHotspotSameDayExpiry(): string {
  const now = new Date();
  // Set to end of current day (23:59:59) in local timezone
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  // Format in local time instead of UTC to avoid timezone conversion
  const year = endOfDay.getFullYear();
  const month = String(endOfDay.getMonth() + 1).padStart(2, '0');
  const day = String(endOfDay.getDate()).padStart(2, '0');
  const hours = String(endOfDay.getHours()).padStart(2, '0');
  const minutes = String(endOfDay.getMinutes()).padStart(2, '0');
  const seconds = String(endOfDay.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Calculate trial expiry for hotspot registration (expires at start of current day)
 * This gives immediate access but requires purchase to continue
 * @returns {string} Expiry date set to 00:00:00 of current day, formatted for Radius Manager
 */
export function calculateTrialExpiry(): string {
  const now = new Date();
  // Set to start of current day (00:00:00)
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  
  // Format in local time instead of UTC to avoid timezone conversion
  const year = startOfDay.getFullYear();
  const month = String(startOfDay.getMonth() + 1).padStart(2, '0');
  const day = String(startOfDay.getDate()).padStart(2, '0');
  const hours = String(startOfDay.getHours()).padStart(2, '0');
  const minutes = String(startOfDay.getMinutes()).padStart(2, '0');
  const seconds = String(startOfDay.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get friendly expiry status text
 * @param {string | Date} expiryDate - Expiry date
 * @returns {string} Friendly status text
 */
export function getExpiryStatusText(expiryDate: string | Date): string {
  const daysRemaining = calculateDaysRemaining(expiryDate);
  
  if (daysRemaining < 0) {
    return `Expired ${Math.abs(daysRemaining)} days ago`;
  } else if (daysRemaining === 0) {
    return 'Expires today';
  } else if (daysRemaining === 1) {
    return 'Expires tomorrow';
  } else {
    return `Expires in ${daysRemaining} days`;
  }
} 