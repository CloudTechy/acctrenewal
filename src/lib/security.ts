/**
 * Security utilities for input validation and sanitization
 * Protects against XMRig and other cryptomining attacks by:
 * - Validating all user inputs
 * - Sanitizing strings used in commands and URLs
 * - Encrypting sensitive data (router credentials)
 */

import crypto from 'crypto';

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment or generate one
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required for secure password storage');
  }
  
  // Ensure key is exactly 32 bytes
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== ENCRYPTION_KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be ${ENCRYPTION_KEY_LENGTH * 2} hex characters (${ENCRYPTION_KEY_LENGTH} bytes)`);
  }
  
  return keyBuffer;
}

/**
 * Encrypt sensitive data (e.g., router passwords)
 */
export function encryptPassword(password: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return: iv + authTag + encrypted (all in hex)
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

/**
 * Decrypt sensitive data
 */
export function decryptPassword(encryptedData: string): string {
  const key = getEncryptionKey();
  
  // Extract iv, authTag, and encrypted data
  const ivHex = encryptedData.slice(0, IV_LENGTH * 2);
  const authTagHex = encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2);
  const encryptedHex = encryptedData.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Validate and sanitize username
 * Prevents command injection through usernames
 */
export function sanitizeUsername(username: string): string {
  if (!username || typeof username !== 'string') {
    throw new Error('Invalid username: must be a non-empty string');
  }
  
  // Remove any characters that could be used for injection
  // Allow only alphanumeric, underscore, hyphen, and dot
  const sanitized = username.replace(/[^a-zA-Z0-9_.-]/g, '');
  
  if (sanitized.length === 0) {
    throw new Error('Invalid username: contains only invalid characters');
  }
  
  if (sanitized.length > 64) {
    throw new Error('Invalid username: too long (max 64 characters)');
  }
  
  return sanitized;
}

/**
 * Validate service plan ID
 * Ensures srvid is a valid integer to prevent injection
 */
export function validateServicePlanId(srvid: unknown): number {
  const parsed = parseInt(String(srvid), 10);
  
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error('Invalid service plan ID: must be a positive integer');
  }
  
  if (parsed > 999999) {
    throw new Error('Invalid service plan ID: value too large');
  }
  
  return parsed;
}

/**
 * Validate days parameter
 * Ensures days is a valid positive number
 */
export function validateDays(days: unknown): number {
  const parsed = parseInt(String(days), 10);
  
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error('Invalid days: must be a positive integer');
  }
  
  if (parsed > 3650) { // Max ~10 years
    throw new Error('Invalid days: value too large (max 3650 days)');
  }
  
  return parsed;
}

/**
 * Validate traffic amount in bytes
 */
export function validateTraffic(traffic: unknown): number {
  const parsed = parseInt(String(traffic), 10);
  
  if (isNaN(parsed) || parsed < 0) {
    throw new Error('Invalid traffic: must be a non-negative integer');
  }
  
  // Max 1 PB (petabyte) - reasonable upper limit
  if (parsed > 1000000000000000) {
    throw new Error('Invalid traffic: value too large');
  }
  
  return parsed;
}

/**
 * Validate IP address format
 */
export function validateIpAddress(ip: string): string {
  if (!ip || typeof ip !== 'string') {
    throw new Error('Invalid IP address: must be a non-empty string');
  }
  
  // IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) {
    throw new Error('Invalid IP address format');
  }
  
  // Validate each octet
  const octets = ip.split('.');
  for (const octet of octets) {
    const num = parseInt(octet, 10);
    if (num < 0 || num > 255) {
      throw new Error('Invalid IP address: octet out of range');
    }
  }
  
  return ip;
}

/**
 * Validate CIDR notation (e.g., "192.168.1.0/24")
 */
export function validateCidr(cidr: string): string {
  if (!cidr || typeof cidr !== 'string') {
    throw new Error('Invalid CIDR: must be a non-empty string');
  }
  
  const parts = cidr.split('/');
  if (parts.length !== 2) {
    throw new Error('Invalid CIDR format: must be in format x.x.x.x/mask');
  }
  
  validateIpAddress(parts[0]);
  
  const mask = parseInt(parts[1], 10);
  if (isNaN(mask) || mask < 0 || mask > 32) {
    throw new Error('Invalid CIDR mask: must be between 0 and 32');
  }
  
  return cidr;
}

/**
 * Sanitize hostname/SSID
 * Prevents injection through network names
 */
export function sanitizeHostname(hostname: string): string {
  if (!hostname || typeof hostname !== 'string') {
    throw new Error('Invalid hostname: must be a non-empty string');
  }
  
  // Allow alphanumeric, hyphen, underscore, and space
  const sanitized = hostname.replace(/[^a-zA-Z0-9-_ ]/g, '');
  
  if (sanitized.length === 0) {
    throw new Error('Invalid hostname: contains only invalid characters');
  }
  
  if (sanitized.length > 63) {
    throw new Error('Invalid hostname: too long (max 63 characters)');
  }
  
  return sanitized;
}

/**
 * Validate port number
 */
export function validatePort(port: unknown): number {
  const parsed = parseInt(String(port), 10);
  
  if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error('Invalid port: must be between 1 and 65535');
  }
  
  return parsed;
}

/**
 * Sanitize router password for MikroTik commands
 * Prevents command injection through password field
 */
export function sanitizeRouterPassword(password: string): string {
  if (!password || typeof password !== 'string') {
    throw new Error('Invalid password: must be a non-empty string');
  }
  
  // Check for dangerous characters
  const dangerousChars = /[;|&$`<>(){}[\]'"\\]/;
  if (dangerousChars.test(password)) {
    throw new Error('Invalid password: contains forbidden characters');
  }
  
  if (password.length < 8) {
    throw new Error('Invalid password: must be at least 8 characters');
  }
  
  if (password.length > 128) {
    throw new Error('Invalid password: too long (max 128 characters)');
  }
  
  return password;
}

/**
 * Validate URL for webhook/API endpoints
 */
export function validateUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL: must be a non-empty string');
  }
  
  try {
    const parsed = new URL(url);
    
    // Only allow http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid URL: only http and https protocols are allowed');
    }
    
    return url;
  } catch {
    throw new Error('Invalid URL format');
  }
}

/**
 * Rate limiting store (in-memory for simple implementation)
 * In production, use Redis or similar distributed cache
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit for a given key
 * @param key - Unique identifier (e.g., IP address, reference)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if rate limit exceeded
 */
export function checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || record.resetTime < now) {
    // Create new record or reset expired one
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return false;
  }
  
  if (record.count >= maxRequests) {
    return true; // Rate limit exceeded
  }
  
  record.count++;
  return false;
}

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Validate payment reference format
 */
export function validatePaystackReference(reference: string): string {
  if (!reference || typeof reference !== 'string') {
    throw new Error('Invalid payment reference: must be a non-empty string');
  }
  
  // Paystack references are typically alphanumeric with underscores/hyphens
  const sanitized = reference.replace(/[^a-zA-Z0-9_-]/g, '');
  
  if (sanitized.length === 0) {
    throw new Error('Invalid payment reference: contains only invalid characters');
  }
  
  if (sanitized !== reference) {
    throw new Error('Invalid payment reference: contains forbidden characters');
  }
  
  return reference;
}

/**
 * Validate metadata from external sources
 */
export function validateMetadata(metadata: unknown): Record<string, string | number | boolean> {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  
  const validated: Record<string, string | number | boolean> = {};
  
  // Only accept known safe fields
  const allowedFields = ['username', 'srvid', 'timeunitexp', 'trafficunitcomb', 'limitcomb'];
  
  for (const field of allowedFields) {
    const value = (metadata as Record<string, unknown>)[field];
    if (value !== undefined && value !== null) {
      // Convert to safe types
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        validated[field] = value;
      }
    }
  }
  
  return validated;
}
