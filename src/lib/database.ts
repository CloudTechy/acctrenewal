import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Interface definitions
export interface HotspotLocation {
  id: string
  name: string
  display_name: string
  status: 'active' | 'inactive' | 'maintenance'
  description?: string
  address?: string
  city?: string
  state?: string
  country?: string
  timezone?: string
  is_active: boolean
  group_id?: number
  default_owner_id?: string
  registration_enabled?: boolean
  // New customization fields for landing page
  welcome_message?: string
  brand_color_primary?: string
  brand_color_secondary?: string
  contact_phone?: string
  contact_email?: string
  features?: string[] // JSON array stored as JSONB in database
  // Display toggle fields for UI elements
  show_logo?: boolean
  show_location_badge?: boolean
  show_display_name?: boolean
  show_welcome_message?: boolean
  show_description?: boolean
  show_guest_access?: boolean
  show_pin_display?: boolean
  created_at: string
  updated_at: string
}

export interface RouterConfig {
  id: string
  location_id: string
  host: string
  username: string
  password: string // Plain text password - no encryption
  port: number
  api_port: number
  connection_type: 'api' | 'ssh' | 'winbox'
  is_active: boolean
  connection_status: 'connected' | 'disconnected' | 'error' | 'unknown'
  last_connected_at?: string
  last_error?: string
  created_at: string
  updated_at: string
}

// Account Owner and Commission System Interfaces
export interface AccountOwner {
  id: string
  owner_username: string
  name: string
  first_name?: string
  last_name?: string
  email: string
  phone?: string
  commission_rate: number // Percentage (e.g., 10.5 for 10.5%)
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  username: string
  account_owner_id?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  country?: string
  last_service_plan_id?: number
  last_service_plan_name?: string
  last_renewal_date?: string
  wifi_password?: string
  registration_source?: string
  location_id?: string
  is_hotspot_user?: boolean
  created_at: string
  updated_at: string
}

export interface RenewalTransaction {
  id: string
  customer_id: string
  account_owner_id: string
  username: string
  service_plan_id?: number
  service_plan_name?: string
  amount_paid: number
  commission_rate: number
  commission_amount: number
  paystack_reference: string
  payment_status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled'
  renewal_period_days?: number
  renewal_start_date?: string
  renewal_end_date?: string
  payment_method?: string
  customer_location?: string
  transaction_type?: 'renewal' | 'account_creation' // Added missing field
  created_at: string
  updated_at?: string
}

export interface CommissionSummary {
  total_commissions: number
  total_transactions: number
  pending_amount: number
  completed_amount: number
  period_start?: string
  period_end?: string
}

// HOTSPOT LOCATION OPERATIONS

export async function getAllHotspotLocations(): Promise<HotspotLocation[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('hotspot_locations')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching hotspot locations:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Exception in getAllHotspotLocations:', error)
    return []
  }
}

export async function getHotspotLocation(locationId: string): Promise<HotspotLocation | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('hotspot_locations')
      .select('*')
      .eq('id', locationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching hotspot location:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Exception in getHotspotLocation:', error)
    throw error
  }
}

export async function createHotspotLocation(locationData: Partial<HotspotLocation>): Promise<HotspotLocation | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('hotspot_locations')
      .insert({
        ...locationData,
        is_active: true,
        status: 'inactive'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating hotspot location:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Exception in createHotspotLocation:', error)
    throw error
  }
}

export async function updateHotspotLocation(locationId: string, locationData: Partial<HotspotLocation>): Promise<HotspotLocation | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('hotspot_locations')
      .update({
        ...locationData,
        updated_at: new Date().toISOString()
      })
      .eq('id', locationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating hotspot location:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Exception in updateHotspotLocation:', error)
    throw error
  }
}

export async function deleteHotspotLocation(locationId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('hotspot_locations')
      .update({ is_active: false })
      .eq('id', locationId)

    if (error) {
      console.error('Error deleting hotspot location:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Exception in deleteHotspotLocation:', error)
    return false
  }
}

// ROUTER CONFIGURATION OPERATIONS

export async function getRouterConfig(locationId: string): Promise<RouterConfig | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('router_configs')
      .select('*')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // No router config found
      }
      console.error('Error fetching router config:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Exception in getRouterConfig:', error)
    throw error
  }
}

export async function createRouterConfig(locationId: string, config: {
  host: string;
  username: string;
  password: string;
  port?: number;
  api_port?: number;
  connection_type?: 'api' | 'ssh' | 'winbox';
}): Promise<RouterConfig> {
  try {
    const { data, error } = await supabaseAdmin
      .from('router_configs')
      .insert({
        location_id: locationId,
        host: config.host,
        username: config.username,
        password: config.password, // Store plain text password
        port: config.port || 8728,
        api_port: config.api_port || 80,
        connection_type: config.connection_type || 'api',
        is_active: true,
        connection_status: 'unknown'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating router config:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Exception in createRouterConfig:', error)
    throw error
  }
}

export async function updateRouterConfig(locationId: string, config: {
  host?: string;
  username?: string;
  password?: string;
  port?: number;
  api_port?: number;
  connection_type?: 'api' | 'ssh' | 'winbox';
}): Promise<RouterConfig> {
  try {
    const updateData = {
      ...config,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from('router_configs')
      .update(updateData)
      .eq('location_id', locationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating router config:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Exception in updateRouterConfig:', error)
    throw error
  }
}

export async function updateRouterConnectionStatus(
  locationId: string, 
  status: 'connected' | 'disconnected' | 'error' | 'unknown', 
  lastError?: string
): Promise<boolean> {
  try {
    const updateData: Partial<RouterConfig> = {
      connection_status: status,
      updated_at: new Date().toISOString()
    }

    if (status === 'connected') {
      updateData.last_connected_at = new Date().toISOString()
      updateData.last_error = undefined
    } else if (lastError) {
      updateData.last_error = lastError
    }

    const { error } = await supabaseAdmin
      .from('router_configs')
      .update(updateData)
      .eq('location_id', locationId)

    if (error) {
      console.error('Error updating router connection status:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Exception in updateRouterConnectionStatus:', error)
    return false
  }
}

// ACCOUNT OWNER OPERATIONS

export async function getAllAccountOwners(): Promise<AccountOwner[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('account_owners')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching account owners:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Exception in getAllAccountOwners:', error)
    return []
  }
}

export async function getAccountOwner(ownerId: string): Promise<AccountOwner | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('account_owners')
      .select('*')
      .eq('id', ownerId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching account owner:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Exception in getAccountOwner:', error)
    throw error
  }
}

export async function getAccountOwnerByUsername(username: string): Promise<AccountOwner | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('account_owners')
      .select('*')
      .eq('owner_username', username)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching account owner by username:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Exception in getAccountOwnerByUsername:', error)
    return null
  }
}

// CUSTOMER OPERATIONS

export async function getCustomerByUsername(username: string): Promise<Customer | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('username', username)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching customer by username:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Exception in getCustomerByUsername:', error)
    return null
  }
}

export async function createOrUpdateCustomer(customerData: Partial<Customer>): Promise<Customer> {
  try {
    // Try to find existing customer first
    if (customerData.username) {
      const existingCustomer = await getCustomerByUsername(customerData.username)
      
      if (existingCustomer) {
        // Update existing customer
        const { data, error } = await supabaseAdmin
          .from('customers')
          .update({
            ...customerData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCustomer.id)
          .select()
          .single()

        if (error) {
          console.error('Error updating customer:', error)
          throw error
        }

        return data
      }
    }

    // Create new customer
    const { data, error } = await supabaseAdmin
      .from('customers')
      .insert({
        ...customerData
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating customer:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Exception in createOrUpdateCustomer:', error)
    throw error
  }
}

// TRANSACTION AND COMMISSION OPERATIONS

export async function createRenewalTransaction(transactionData: Partial<RenewalTransaction>): Promise<RenewalTransaction> {
  try {
    const { data, error } = await supabaseAdmin
      .from('renewal_transactions')
      .insert({
        ...transactionData,
        created_at: transactionData.created_at || new Date().toISOString(),
        payment_status: transactionData.payment_status || 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating renewal transaction:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Exception in createRenewalTransaction:', error)
    throw error
  }
}

export async function getOwnerCommissions(
  ownerId: string, 
  startDate?: string, 
  endDate?: string
): Promise<RenewalTransaction[]> {
  try {
    let query = supabaseAdmin
      .from('renewal_transactions')
      .select('*')
      .eq('account_owner_id', ownerId)
      .order('created_at', { ascending: false })

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching owner commissions:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Exception in getOwnerCommissions:', error)
    return []
  }
}

export async function getOwnerStats(ownerId: string, startDate?: string, endDate?: string): Promise<CommissionSummary & { monthlyCommissions: number; activeCustomers: number }> {
  try {
    // Get ALL transactions for this owner (no date filter for totals)
    const { data: allTransactions, error: allError } = await supabaseAdmin
      .from('renewal_transactions')
      .select('amount_paid, commission_amount, payment_status, username, created_at')
      .eq('account_owner_id', ownerId)

    if (allError) {
      console.error('Error fetching all owner transactions:', allError)
      return {
        total_commissions: 0,
        total_transactions: 0,
        pending_amount: 0,
        completed_amount: 0,
        monthlyCommissions: 0,
        activeCustomers: 0
      }
    }

    // Get transactions for the specific period if dates provided
    let periodTransactions = allTransactions || []
    
    if (startDate || endDate) {
      periodTransactions = (allTransactions || []).filter(t => {
        const transactionDate = new Date(t.created_at)
        const isAfterStart = !startDate || transactionDate >= new Date(startDate)
        const isBeforeEnd = !endDate || transactionDate <= new Date(endDate)
        return isAfterStart && isBeforeEnd
      })
    }

    // Calculate stats for all time
    const completedAll = (allTransactions || []).filter(t => t.payment_status === 'success')
    const pendingAll = (allTransactions || []).filter(t => t.payment_status === 'pending')

    // Calculate stats for the period
    const completedPeriod = periodTransactions.filter(t => t.payment_status === 'success')
    const uniqueCustomers = new Set(periodTransactions.map(t => t.username)).size

    return {
      total_commissions: completedAll.reduce((sum, t) => sum + (Number(t.commission_amount) || 0), 0),
      total_transactions: (allTransactions || []).length,
      pending_amount: pendingAll.reduce((sum, t) => sum + (Number(t.commission_amount) || 0), 0),
      completed_amount: completedAll.reduce((sum, t) => sum + (Number(t.commission_amount) || 0), 0),
      monthlyCommissions: completedPeriod.reduce((sum, t) => sum + (Number(t.commission_amount) || 0), 0),
      activeCustomers: uniqueCustomers
    }
  } catch (error) {
    console.error('Exception in getOwnerStats:', error)
    return {
      total_commissions: 0,
      total_transactions: 0,
      pending_amount: 0,
      completed_amount: 0,
      monthlyCommissions: 0,
      activeCustomers: 0
    }
  }
}

// HOTSPOT CUSTOMER OPERATIONS

export async function createHotspotCustomer(customerData: {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  wifi_password: string;
  location_id: string;
  account_owner_id: string;
  last_service_plan_id?: number;
  last_service_plan_name?: string;
}): Promise<Customer> {
  try {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .insert({
        ...customerData,
        registration_source: 'hotspot_registration',
        is_hotspot_user: true,
        last_renewal_date: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating hotspot customer:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Exception in createHotspotCustomer:', error)
    throw error
  }
}

/**
 * Get customer's WiFi PIN by phone number
 * Used specifically for fetching the actual PIN from database for SMS notifications
 */
export async function getCustomerWiFiPin(phoneNumber: string): Promise<string | null> {
  try {
    const customer = await getCustomerByUsername(phoneNumber);
    return customer?.wifi_password || null;
  } catch (error) {
    console.error('Error getting customer WiFi PIN:', error);
    return null;
  }
}

export async function getHotspotCustomerCountByLocation(locationId: string): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .eq('is_hotspot_user', true)

    if (error) {
      console.error('Error getting hotspot customer count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Exception in getHotspotCustomerCountByLocation:', error)
    return 0
  }
}

export async function getHotspotCustomerCounts(): Promise<Record<string, { hotspot: number }>> {
  try {
    // Get hotspot customer counts by location
    const { data: hotspotData, error: hotspotError } = await supabaseAdmin
      .from('customers')
      .select('location_id')
      .eq('is_hotspot_user', true)
      .not('location_id', 'is', null)

    if (hotspotError) {
      console.error('Error getting hotspot customer counts:', hotspotError)
      return {}
    }

    // Count by location
    const counts: Record<string, { hotspot: number }> = {}

    // Count hotspot customers
    hotspotData?.forEach(customer => {
      if (customer.location_id) {
        if (!counts[customer.location_id]) {
          counts[customer.location_id] = { hotspot: 0 }
        }
        counts[customer.location_id].hotspot++
      }
    })

    return counts
  } catch (error) {
    console.error('Exception in getHotspotCustomerCounts:', error)
    return {}
  }
}

export async function getLocationWithOwner(locationId: string): Promise<(HotspotLocation & { owner?: AccountOwner }) | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('hotspot_locations')
      .select(`
        *,
        account_owners!fk_hotspot_locations_default_owner_id (
          id,
          owner_username,
          name,
          first_name,
          last_name,
          email,
          commission_rate,
          is_active
        )
      `)
      .eq('id', locationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('Error fetching location with owner:', error)
      throw error
    }

    // Transform the response to match our interface
    const location = data as HotspotLocation & { 
      account_owners?: AccountOwner | null 
    }
    const result: HotspotLocation & { owner?: AccountOwner } = {
      id: location.id,
      name: location.name,
      display_name: location.display_name,
      status: location.status,
      description: location.description,
      address: location.address,
      city: location.city,
      state: location.state,
      country: location.country,
      timezone: location.timezone,
      is_active: location.is_active,
      group_id: location.group_id,
      default_owner_id: location.default_owner_id,
      registration_enabled: location.registration_enabled,
      created_at: location.created_at,
      updated_at: location.updated_at
    }

    if (location.account_owners) {
      result.owner = location.account_owners
    }

    return result
  } catch (error) {
    console.error('Exception in getLocationWithOwner:', error)
    throw error
  }
}

// UTILITY FUNCTIONS

export function calculateCommission(amount: number, commissionRate: number): number {
  return Math.round((amount * commissionRate / 100) * 100) / 100; // Round to 2 decimal places
}

// LOCATION SETTINGS MANAGEMENT FUNCTIONS

/**
 * Interface for location setting entries
 */
export interface LocationSetting {
  id: string;
  location_id: string;
  setting_key: string;
  setting_value: string;
  setting_type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get a specific setting value for a location
 * @param locationId - The location ID to get setting for
 * @param settingKey - The setting key to retrieve
 * @returns The setting value as string, or null if not found
 */
export async function getLocationSetting(
  locationId: string, 
  settingKey: string
): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('location_settings')
      .select('setting_value, setting_type')
      .eq('location_id', locationId)
      .eq('setting_key', settingKey)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - setting doesn't exist
        return null;
      }
      console.error('Error fetching location setting:', error);
      return null;
    }

    return data?.setting_value || null;
  } catch (error) {
    console.error('Error in getLocationSetting:', error);
    return null;
  }
}

/**
 * Set/update a location setting
 * @param locationId - The location ID to set setting for
 * @param settingKey - The setting key to set
 * @param settingValue - The setting value to store
 * @param settingType - The type of the setting value
 * @param description - Optional description of the setting
 * @returns true if successful, false otherwise
 */
export async function setLocationSetting(
  locationId: string,
  settingKey: string,
  settingValue: string,
  settingType: 'string' | 'json' | 'number' | 'boolean' = 'string',
  description?: string
): Promise<boolean> {
  try {
    // Validate JSON if type is json
    if (settingType === 'json') {
      try {
        JSON.parse(settingValue);
      } catch (parseError) {
        console.error('Invalid JSON value provided for setting:', settingKey, parseError);
        return false;
      }
    }

    const { error } = await supabaseAdmin
      .from('location_settings')
      .upsert({
        location_id: locationId,
        setting_key: settingKey,
        setting_value: settingValue,
        setting_type: settingType,
        description,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'location_id,setting_key'
      });

    if (error) {
      console.error('Error setting location setting:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in setLocationSetting:', error);
    return false;
  }
}

/**
 * Get all settings for a specific location
 * @param locationId - The location ID to get settings for
 * @returns Array of location settings or empty array if none found
 */
export async function getLocationSettings(locationId: string): Promise<LocationSetting[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('location_settings')
      .select('*')
      .eq('location_id', locationId)
      .order('setting_key');

    if (error) {
      console.error('Error fetching location settings:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getLocationSettings:', error);
    return [];
  }
}

/**
 * Delete a specific location setting
 * @param locationId - The location ID
 * @param settingKey - The setting key to delete
 * @returns true if successful, false otherwise
 */
export async function deleteLocationSetting(
  locationId: string,
  settingKey: string
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('location_settings')
      .delete()
      .eq('location_id', locationId)
      .eq('setting_key', settingKey);

    if (error) {
      console.error('Error deleting location setting:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteLocationSetting:', error);
    return false;
  }
} 

// ACCOUNT CREATION PRICING HELPER FUNCTIONS

/**
 * Interface for account creation pricing configuration
 */
export interface AccountCreationPricingConfig {
  enabled: boolean;
  price: number;
  description: string;
  locationId: string;
}

/**
 * Get account creation pricing configuration for a location
 * @param locationId - The location ID to get pricing config for
 * @returns AccountCreationPricingConfig object with pricing settings
 */
export async function getAccountCreationPricingConfig(
  locationId: string
): Promise<AccountCreationPricingConfig> {
  try {
    // Get all pricing-related settings for the location
    const settings = await Promise.all([
      getLocationSetting(locationId, 'account_creation_pricing_enabled'),
      getLocationSetting(locationId, 'account_creation_price'),
      getLocationSetting(locationId, 'account_creation_description')
    ]);

    const [enabledSetting, priceSetting, descriptionSetting] = settings;

    // Parse and return configuration
    return {
      enabled: enabledSetting === 'true',
      price: priceSetting ? parseFloat(priceSetting) : 0,
      description: descriptionSetting || '',
      locationId
    };
  } catch (error) {
    console.error('Error fetching account creation pricing config:', error);
    return {
      enabled: false,
      price: 0,
      description: '',
      locationId
    };
  }
}

/**
 * Set account creation pricing configuration for a location
 * @param locationId - The location ID to set pricing config for
 * @param config - The pricing configuration to set
 * @returns true if successful, false otherwise
 */
export async function setAccountCreationPricingConfig(
  locationId: string,
  config: Partial<AccountCreationPricingConfig>
): Promise<boolean> {
  try {
    const operations = [];

    // Set enabled status if provided
    if (config.enabled !== undefined) {
      operations.push(
        setLocationSetting(
          locationId,
          'account_creation_pricing_enabled',
          config.enabled.toString(),
          'boolean',
          'Enable paid account creation for this location'
        )
      );
    }

    // Set price if provided
    if (config.price !== undefined) {
      operations.push(
        setLocationSetting(
          locationId,
          'account_creation_price',
          config.price.toString(),
          'number',
          'Price in Naira for creating a new account at this location'
        )
      );
    }

    // Set description if provided
    if (config.description !== undefined) {
      operations.push(
        setLocationSetting(
          locationId,
          'account_creation_description',
          config.description,
          'string',
          'Description shown to users about the account creation fee'
        )
      );
    }

    // Execute all operations
    const results = await Promise.all(operations);
    
    // Return true only if all operations succeeded
    return results.every(result => result === true);
  } catch (error) {
    console.error('Error setting account creation pricing config:', error);
    return false;
  }
}

/**
 * Check if account creation pricing is enabled for a location
 * @param locationId - The location ID to check
 * @returns true if pricing is enabled, false otherwise
 */
export async function isAccountCreationPricingEnabled(locationId: string): Promise<boolean> {
  try {
    const config = await getAccountCreationPricingConfig(locationId);
    return config.enabled;
  } catch (error) {
    console.error('Error checking account creation pricing status:', error);
    return false;
  }
}

/**
 * Get account creation price for a location
 * @param locationId - The location ID to get price for
 * @returns price in Naira, or 0 if pricing is disabled or not configured
 */
export async function getAccountCreationPrice(locationId: string): Promise<number> {
  try {
    const config = await getAccountCreationPricingConfig(locationId);
    return config.enabled ? config.price : 0;
  } catch (error) {
    console.error('Error getting account creation price:', error);
    return 0;
  }
} 