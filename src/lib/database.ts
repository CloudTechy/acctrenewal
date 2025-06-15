import { supabaseAdmin, AccountOwner, Customer, RenewalTransaction, CommissionPayment } from './supabase'

// Account Owner operations
export async function getAccountOwner(ownerId: string): Promise<AccountOwner | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('account_owners')
      .select('*')
      .eq('id', ownerId)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching account owner:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Exception in getAccountOwner:', error)
    return null
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
      console.error('Error fetching account owner by username:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Exception in getAccountOwnerByUsername:', error)
    return null
  }
}

export async function getAllAccountOwners(): Promise<AccountOwner[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('account_owners')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching all account owners:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Exception in getAllAccountOwners:', error)
    return []
  }
}

// Customer operations
export async function getCustomerByUsername(username: string): Promise<Customer | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('username', username)
      .single()

    if (error) {
      console.error('Error fetching customer by username:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Exception in getCustomerByUsername:', error)
    return null
  }
}

export async function createOrUpdateCustomer(customerData: Partial<Customer>): Promise<Customer | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .upsert(customerData, { 
        onConflict: 'username',
        ignoreDuplicates: false 
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating/updating customer:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Exception in createOrUpdateCustomer:', error)
    return null
  }
}

export async function assignCustomerToOwner(username: string, ownerId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('customers')
      .update({ 
        account_owner_id: ownerId,
        updated_at: new Date().toISOString()
      })
      .eq('username', username)

    if (error) {
      console.error('Error assigning customer to owner:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Exception in assignCustomerToOwner:', error)
    return false
  }
}

// Renewal Transaction operations
export async function createRenewalTransaction(transactionData: Partial<RenewalTransaction>): Promise<RenewalTransaction | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('renewal_transactions')
      .insert(transactionData)
      .select()
      .single()

    if (error) {
      console.error('Error creating renewal transaction:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Exception in createRenewalTransaction:', error)
    return null
  }
}

export async function updateRenewalTransactionStatus(
  paystackReference: string, 
  status: string
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('renewal_transactions')
      .update({ payment_status: status })
      .eq('paystack_reference', paystackReference)

    if (error) {
      console.error('Error updating renewal transaction status:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Exception in updateRenewalTransactionStatus:', error)
    return false
  }
}

// Commission calculations
export function calculateCommission(amount: number, rate: number): number {
  return Math.round((amount * rate / 100) * 100) / 100 // Round to 2 decimal places
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
      .eq('payment_status', 'success')
      .order('created_at', { ascending: false })

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      // Add time to end date to include the full day
      const endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999)
      query = query.lte('created_at', endDateTime.toISOString())
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

// Analytics functions
export async function getOwnerStats(ownerId: string): Promise<{
  totalCommissions: number
  totalTransactions: number
  monthlyCommissions: number
  activeCustomers: number
}> {
  try {
    // Get total commissions and transactions
    const { data: transactions, error: transError } = await supabaseAdmin
      .from('renewal_transactions')
      .select('commission_amount')
      .eq('account_owner_id', ownerId)
      .eq('payment_status', 'success')

    if (transError) {
      console.error('Error fetching owner transactions:', transError)
      return { totalCommissions: 0, totalTransactions: 0, monthlyCommissions: 0, activeCustomers: 0 }
    }

    const totalCommissions = transactions?.reduce((sum, t) => sum + t.commission_amount, 0) || 0
    const totalTransactions = transactions?.length || 0

    // Get current month commissions
    const currentMonthStart = new Date()
    currentMonthStart.setDate(1)
    currentMonthStart.setHours(0, 0, 0, 0)

    const { data: monthlyTrans, error: monthlyError } = await supabaseAdmin
      .from('renewal_transactions')
      .select('commission_amount')
      .eq('account_owner_id', ownerId)
      .eq('payment_status', 'success')
      .gte('created_at', currentMonthStart.toISOString())

    if (monthlyError) {
      console.error('Error fetching monthly transactions:', monthlyError)
    }

    const monthlyCommissions = monthlyTrans?.reduce((sum, t) => sum + t.commission_amount, 0) || 0

    // Get active customers count
    const { count: activeCustomers, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('account_owner_id', ownerId)

    if (customerError) {
      console.error('Error fetching customer count:', customerError)
    }

    return {
      totalCommissions,
      totalTransactions,
      monthlyCommissions,
      activeCustomers: activeCustomers || 0
    }
  } catch (error) {
    console.error('Exception in getOwnerStats:', error)
    return { totalCommissions: 0, totalTransactions: 0, monthlyCommissions: 0, activeCustomers: 0 }
  }
}

// Commission Payment operations
export async function createCommissionPayment(paymentData: Partial<CommissionPayment>): Promise<CommissionPayment | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('commission_payments')
      .insert(paymentData)
      .select()
      .single()

    if (error) {
      console.error('Error creating commission payment:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Exception in createCommissionPayment:', error)
    return null
  }
} 