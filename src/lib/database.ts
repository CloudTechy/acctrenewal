import { createClient } from '@supabase/supabase-js'

// Use dummy values for build if real credentials not provided
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_service_role'

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

// UTILITY FUNCTIONS

export function calculateCommission(amount: number, commissionRate: number): number {
  return Math.round((amount * commissionRate / 100) * 100) / 100; // Round to 2 decimal places
} 