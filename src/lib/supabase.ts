import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database types
export interface AccountOwner {
  id: string
  name: string
  email: string
  phone?: string
  commission_rate: number
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
  created_at: string
  updated_at: string
}

export interface RenewalTransaction {
  id: string
  customer_id?: string
  account_owner_id?: string
  username: string
  service_plan_id?: number
  service_plan_name?: string
  amount_paid: number
  commission_rate: number
  commission_amount: number
  paystack_reference: string
  payment_status: string
  renewal_period_days?: number
  renewal_start_date?: string
  renewal_end_date?: string
  created_at: string
}

export interface CommissionPayment {
  id: string
  account_owner_id: string
  payment_period_start: string
  payment_period_end: string
  total_renewals: number
  total_revenue: number
  total_commission: number
  payment_status: string
  payment_date?: string
  payment_reference?: string
  created_at: string
} 