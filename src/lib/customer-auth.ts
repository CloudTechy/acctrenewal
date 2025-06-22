/**
 * Customer authentication utilities for hotspot customer portal
 * Handles customer login and authentication for WiFi password management
 */

import { getCustomerByUsername } from './database';
import { validateHotspotPassword } from './password-utils';

export interface CustomerAuthResult {
  success: boolean;
  customer?: {
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    wifi_password?: string;
    location_id?: string;
    last_service_plan_name?: string;
    last_renewal_date?: string;
  };
  error?: string;
}

/**
 * Authenticate customer using phone number and 4-digit PIN
 * @param {string} phoneNumber - Customer's phone number (username)
 * @param {string} pin - 4-digit PIN password
 * @returns {Promise<CustomerAuthResult>} Authentication result
 */
export async function authenticateCustomer(phoneNumber: string, pin: string): Promise<CustomerAuthResult> {
  try {
    // Validate PIN format
    if (!validateHotspotPassword(pin)) {
      return {
        success: false,
        error: 'Invalid PIN format. Please enter a 4-digit PIN.'
      };
    }

    // Get customer from database
    const customer = await getCustomerByUsername(phoneNumber);
    
    if (!customer) {
      return {
        success: false,
        error: 'Customer not found. Please check your phone number.'
      };
    }

    // Check if customer is a hotspot user
    if (!customer.is_hotspot_user) {
      return {
        success: false,
        error: 'This account is not a hotspot account.'
      };
    }

    // Verify PIN
    if (customer.wifi_password !== pin) {
      return {
        success: false,
        error: 'Incorrect PIN. Please try again.'
      };
    }

    // Return successful authentication
    return {
      success: true,
      customer: {
        id: customer.id,
        username: customer.username,
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        wifi_password: customer.wifi_password,
        location_id: customer.location_id,
        last_service_plan_name: customer.last_service_plan_name,
        last_renewal_date: customer.last_renewal_date
      }
    };

  } catch (error) {
    console.error('Error authenticating customer:', error);
    return {
      success: false,
      error: 'Authentication failed. Please try again later.'
    };
  }
}

/**
 * Get customer by credentials (phone + PIN)
 * @param {string} phoneNumber - Customer's phone number
 * @param {string} pin - 4-digit PIN password
 * @returns {Promise<CustomerAuthResult>} Customer data if authenticated
 */
export async function getCustomerByCredentials(phoneNumber: string, pin: string): Promise<CustomerAuthResult> {
  return await authenticateCustomer(phoneNumber, pin);
}

/**
 * Update customer's WiFi password (4-digit PIN)
 * @param {string} customerId - Customer ID
 * @param {string} newPin - New 4-digit PIN
 * @param {string} currentPin - Current PIN for verification
 * @returns {Promise<{ success: boolean; error?: string }>} Update result
 */
export async function updateCustomerPassword(
  customerId: string, 
  newPin: string, 
  currentPin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate new PIN format
    if (!validateHotspotPassword(newPin)) {
      return {
        success: false,
        error: 'Invalid PIN format. Please enter a 4-digit PIN.'
      };
    }

    // Validate current PIN format
    if (!validateHotspotPassword(currentPin)) {
      return {
        success: false,
        error: 'Invalid current PIN format.'
      };
    }

    // TODO: Implement password update logic
    // This would require:
    // 1. Verify current PIN
    // 2. Update database with new PIN
    // 3. Update Radius Manager with new password
    
    console.log('Password update requested for customer:', customerId);
    console.log('This functionality will be implemented in future versions');
    
    return {
      success: false,
      error: 'Password update feature is not yet available. Please contact support.'
    };

  } catch (error) {
    console.error('Error updating customer password:', error);
    return {
      success: false,
      error: 'Failed to update password. Please try again later.'
    };
  }
}

/**
 * Validate customer session (for future session management)
 * @param {string} sessionToken - Session token
 * @returns {Promise<{ valid: boolean; customerId?: string }>} Session validation result
 */
export async function validateCustomerSession(sessionToken: string): Promise<{ valid: boolean; customerId?: string }> {
  // TODO: Implement session validation logic
  // This would require:
  // 1. Session storage (Redis/Database)
  // 2. Token validation
  // 3. Expiry checking
  
  console.log('Session validation requested for token:', sessionToken);
  console.log('This functionality will be implemented in future versions');
  
  return {
    valid: false
  };
}

/**
 * Generate customer session token (for future session management)
 * @param {string} customerId - Customer ID
 * @returns {Promise<{ token: string; expiresAt: Date }>} Session token and expiry
 */
export async function generateCustomerSession(customerId: string): Promise<{ token: string; expiresAt: Date }> {
  // TODO: Implement session generation logic
  // This would require:
  // 1. Token generation (JWT or random)
  // 2. Session storage
  // 3. Expiry management
  
  console.log('Session generation requested for customer:', customerId);
  console.log('This functionality will be implemented in future versions');
  
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry
  
  return {
    token: 'placeholder-token',
    expiresAt
  };
}

/**
 * Check if customer account is active and valid
 * @param {string} phoneNumber - Customer's phone number
 * @returns {Promise<{ active: boolean; reason?: string }>} Account status
 */
export async function checkCustomerAccountStatus(phoneNumber: string): Promise<{ active: boolean; reason?: string }> {
  try {
    const customer = await getCustomerByUsername(phoneNumber);
    
    if (!customer) {
      return {
        active: false,
        reason: 'Account not found'
      };
    }

    if (!customer.is_hotspot_user) {
      return {
        active: false,
        reason: 'Not a hotspot account'
      };
    }

    // TODO: Add more validation checks:
    // 1. Account suspension status
    // 2. Service expiry status
    // 3. Payment status
    
    return {
      active: true
    };

  } catch (error) {
    console.error('Error checking customer account status:', error);
    return {
      active: false,
      reason: 'Error checking account status'
    };
  }
} 