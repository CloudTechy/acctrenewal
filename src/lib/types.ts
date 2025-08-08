/**
 * Unified Type Definitions for Account Renewal System
 * 
 * This file provides consistent type definitions across the application
 * for service plans, user data, and plan change functionality.
 */

// Base ServicePlan interface that includes all possible fields
export interface ServicePlan {
  // Core identification
  code: number;
  srvid: string | number;
  srvname?: string;
  
  // Network rates  
  downrate?: string | number;
  uprate?: string | number;
  
  // Pricing
  unitprice?: string | number;
  unitpriceadd?: string | number;
  unitpricetax?: string | number;
  unitpriceaddtax?: string | number;
  totalPrice?: number; // Calculated total price
  
  // Time and traffic limits
  timeunitexp?: string | number; // Duration in days
  trafficunitdl?: string | number;
  trafficunitul?: string | number;
  trafficunitcomb?: string | number;
  limitdl?: string | number;
  limitul?: string | number;
  limitcomb?: string | number;
  limitexpiration?: string | number;
  limituptime?: string | number;
  
  // Service configuration
  enableservice?: string | number; // "1" for enabled, "0" for disabled
  poolname?: string;
  descr?: string;
  timebaseexp?: string | number;
  
  // API response
  str?: string;
}

// User data from DMA Radius Manager
export interface UserData {
  code: number;
  enableuser?: number;
  srvid?: number;
  firstname?: string;
  lastname?: string;
  email?: string;
  company?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  credits?: number;
  expiry?: string;
  dlbytes?: number;
  ulbytes?: number;
  totalbytes?: number;
  onlinetime?: number;
  str?: string;
}

// Paystack configuration interface
export interface PaystackConfig {
  reference: string;
  email: string;
  amount: number;
  publicKey: string;
  key?: string;
  currency?: string;
  metadata?: {
    custom_fields?: Array<{
      display_name: string;
      variable_name: string;
      value: string;
    }>;
    [key: string]: unknown;
  };
}

// Paystack response interface
export interface PaystackResponse {
  reference: string;
  status: string;
  trans?: string;
  transaction?: string;
  trxref?: string;
  message?: string;
}

// Account status type
export type AccountStatus = 'ACTIVE' | 'EXPIRED' | 'INACTIVE';

// Plan change transaction types
export type TransactionType = 'renewal' | 'plan_change' | 'account_creation' | 'upgrade' | 'downgrade';
export type ChangeReason = 'expired_renewal' | 'upgrade' | 'downgrade' | 'plan_switch' | 'reactivation';

// Plan change interfaces (re-exported from plan-change-utils)
export interface PlanChangeRequest {
  username: string;
  currentPlanId: string;
  newPlanId: string;
  paymentReference?: string;
  locationId?: string;
}

export interface PlanChangeValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PlanChangeEligibility {
  canChange: boolean;
  reason: string;
  eligiblePlans: ServicePlan[];
  restrictions?: string[];
}

export interface UserAccountInfo {
  username: string;
  enableuser: number;
  srvid: number;
  expiry: string;
  accountStatus: AccountStatus;
  isOnFreePlan: boolean;
  currentPlan?: ServicePlan;
}

// Database transaction record
export interface RenewalTransaction {
  id: string;
  username: string;
  service_plan_id: number;
  service_plan_name: string;
  previous_service_plan_id?: number;
  previous_service_plan_name?: string;
  amount_paid: number;
  commission_rate: number;
  commission_amount: number;
  paystack_reference: string;
  payment_status: string;
  transaction_type: TransactionType;
  change_reason?: ChangeReason;
  plan_change_metadata?: Record<string, unknown>;
  customer_id?: string;
  created_at: string;
  updated_at: string;
}

// Plan history record
export interface UserPlanHistory {
  id: string;
  username: string;
  customer_id?: string;
  previous_plan_id?: number;
  previous_plan_name?: string;
  new_plan_id: number;
  new_plan_name?: string;
  change_reason?: ChangeReason;
  transaction_reference?: string;
  amount_paid: number;
  effective_date: string;
  created_at: string;
} 