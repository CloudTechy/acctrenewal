/**
 * Plan Change Utility Functions
 * 
 * This module provides core functionality for handling subscription plan changes,
 * including validation, eligibility checking, and business logic for plan switching.
 */

import { ServicePlan } from '@/lib/plan-filters';

// Types for plan change functionality
export interface PlanChangeRequest {
  username: string;
  currentPlanId: string;
  newPlanId: string;
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
  accountStatus: 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  isOnFreePlan: boolean;
  currentPlan?: ServicePlan;
}

export interface PlanComparison {
  current: ServicePlan;
  new: ServicePlan;
  isUpgrade: boolean;
  priceDifference: number;
  featureChanges: {
    speed: { current: string; new: string; improved: boolean };
    data: { current: string; new: string; improved: boolean };
    duration: { current: number; new: number; improved: boolean };
    price: { current: number; new: number; difference: number };
  };
}

/**
 * Check if a user is eligible for plan changes
 */
export function checkPlanChangeEligibility(
  userInfo: UserAccountInfo,
  availablePlans: ServicePlan[]
): PlanChangeEligibility {
  // Only check if account is completely disabled
  if (userInfo.enableuser === 0) {
    return {
      canChange: false,
      reason: 'Account is disabled.',
      eligiblePlans: [],
      restrictions: ['Account disabled']
    };
  }

  // Filter eligible plans (exclude current plan and only enabled plans)
  const eligiblePlans = availablePlans.filter(plan => 
    plan.enableservice === "1" && // Only enabled plans
    plan.srvid !== userInfo.srvid.toString() // Exclude current plan
  );

  // Allow plan changes for all account types (EXPIRED, ACTIVE, INACTIVE)
  const accountTypeMessages = {
    'EXPIRED': 'Account is expired. You can renew with any available plan.',
    'ACTIVE': 'Active account can change to any available plan.',
    'INACTIVE': 'Account can be reactivated with any available plan.'
  };

  return {
    canChange: eligiblePlans.length > 0,
    reason: accountTypeMessages[userInfo.accountStatus] || 'Account can change to any available plan.',
    eligiblePlans,
    restrictions: eligiblePlans.length === 0 ? ['No plans available'] : []
  };
}

/**
 * Validate a plan change request
 */
export function validatePlanChange(
  request: PlanChangeRequest,
  userInfo: UserAccountInfo,
  availablePlans: ServicePlan[]
): PlanChangeValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (!request.username || request.username.trim() === '') {
    errors.push('Username is required');
  }

  if (!request.newPlanId || request.newPlanId.trim() === '') {
    errors.push('New plan ID is required');
  }

  if (!request.currentPlanId || request.currentPlanId.trim() === '') {
    errors.push('Current plan ID is required');
  }

  // Check if new plan exists and is enabled
  const newPlan = availablePlans.find(plan => 
    plan.srvid === request.newPlanId && plan.enableservice === "1"
  );

  if (!newPlan) {
    errors.push('Selected plan is not available or has been disabled');
  }

  // Check if user is trying to "change" to the same plan
  if (request.currentPlanId === request.newPlanId) {
    errors.push('Cannot change to the same plan. Use renewal instead.');
  }

  // Check eligibility
  const eligibility = checkPlanChangeEligibility(userInfo, availablePlans);
  if (!eligibility.canChange) {
    errors.push(eligibility.reason);
  }

  // Check if selected plan is in eligible plans
  if (newPlan && eligibility.canChange) {
    const isEligible = eligibility.eligiblePlans.some(plan => plan.srvid === newPlan.srvid);
    if (!isEligible) {
      errors.push('Selected plan is not eligible for your account type');
    }
  }

  // NOTE: Payment validation removed - all plan changes are now free
  // Payment will be handled during renewal of the new plan

  // Warnings for downgrades (if applicable)
  if (newPlan && userInfo.currentPlan) {
    const currentPrice = parseFloat(String(userInfo.currentPlan.unitprice || '0'));
    const newPrice = parseFloat(String(newPlan.unitprice || '0'));
    
    if (newPrice < currentPrice) {
      warnings.push('This is a downgrade. You may lose some features and benefits.');
    }
    
    if (newPrice > currentPrice) {
      warnings.push(`Plan upgrade detected. New plan costs ₦${newPrice}. Use the Renew button to activate.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get available upgrade options for a user
 */
export function getAvailableUpgrades(
  userInfo: UserAccountInfo,
  availablePlans: ServicePlan[]
): ServicePlan[] {
  const eligibility = checkPlanChangeEligibility(userInfo, availablePlans);
  return eligibility.eligiblePlans;
}

/**
 * Compare two plans and return comparison details
 */
export function comparePlans(currentPlan: ServicePlan, newPlan: ServicePlan): PlanComparison {
  const currentUnitPrice = parseFloat(String(currentPlan.unitprice || '0'));
  const currentUnitTax = parseFloat(String(currentPlan.unitpricetax || '0'));
  const currentPrice = currentUnitPrice + currentUnitTax;
  
  const newUnitPrice = parseFloat(String(newPlan.unitprice || '0'));
  const newUnitTax = parseFloat(String(newPlan.unitpricetax || '0'));
  const newPrice = newUnitPrice + newUnitTax;
  
  const priceDifference = newPrice - currentPrice;
  const isUpgrade = newPrice > currentPrice;
  
  const currentSpeed = parseFloat(String(currentPlan.downrate || '0'));
  const newSpeed = parseFloat(String(newPlan.downrate || '0'));
  const currentDuration = parseInt(String(currentPlan.timeunitexp || '0'));
  const newDuration = parseInt(String(newPlan.timeunitexp || '0'));

  return {
    current: currentPlan,
    new: newPlan,
    isUpgrade,
    priceDifference,
    featureChanges: {
      speed: {
        current: formatSpeed(currentSpeed),
        new: formatSpeed(newSpeed),
        improved: newSpeed > currentSpeed
      },
      data: {
        current: formatDataLimit(currentPlan),
        new: formatDataLimit(newPlan),
        improved: isDataLimitBetter(currentPlan, newPlan)
      },
      duration: {
        current: currentDuration,
        new: newDuration,
        improved: newDuration > currentDuration
      },
      price: {
        current: currentPrice,
        new: newPrice,
        difference: priceDifference
      }
    }
  };
}

/**
 * Check if user is on a free plan
 */
export function isOnFreePlan(plan: ServicePlan): boolean {
  const unitPrice = parseFloat(String(plan.unitprice || '0'));
  const unitTax = parseFloat(String(plan.unitpricetax || '0'));
  const totalPrice = unitPrice + unitTax;
  return totalPrice === 0;
}

/**
 * Determine plan change type
 */
export function getPlanChangeType(
  currentPlan: ServicePlan,
  newPlan: ServicePlan
): 'upgrade' | 'downgrade' | 'plan_switch' {
  const currentPrice = parseFloat(String(currentPlan.unitprice || '0'));
  const newPrice = parseFloat(String(newPlan.unitprice || '0'));

  if (newPrice > currentPrice) {
    return 'upgrade';
  } else if (newPrice < currentPrice) {
    return 'downgrade';
  } else {
    return 'plan_switch';
  }
}

/**
 * Calculate total cost for plan change
 */
export function calculatePlanChangeCost(
  newPlan: ServicePlan,
  prorationDays?: number
): {
  baseCost: number;
  tax: number;
  totalCost: number;
  prorationApplied: boolean;
} {
  const baseCost = parseFloat(String(newPlan.unitprice || '0'));
  const tax = parseFloat(String(newPlan.unitpricetax || '0'));
  let finalBaseCost = baseCost;

  // Apply proration if specified (for mid-cycle upgrades)
  let prorationApplied = false;
  if (prorationDays && prorationDays > 0) {
    const planDuration = parseInt(String(newPlan.timeunitexp || '30'));
    finalBaseCost = (baseCost * prorationDays) / planDuration;
    prorationApplied = true;
  }

  return {
    baseCost: finalBaseCost,
    tax,
    totalCost: finalBaseCost + tax,
    prorationApplied
  };
}

// Helper functions

function formatSpeed(speedKbps: number): string {
  if (speedKbps === 0) return 'Unlimited';
  if (speedKbps >= 1000000) return `${speedKbps / 1000000}Gbps`;
  if (speedKbps >= 1000) return `${speedKbps / 1000}Mbps`;
  return `${speedKbps}Kbps`;
}

function formatDataLimit(plan: ServicePlan): string {
  const limit = parseFloat(String(plan.trafficunitcomb || '0'));
  if (limit === 0) return 'Unlimited';
  
  if (limit >= 1000000000) return `${(limit / 1000000000).toFixed(1)}GB`;
  if (limit >= 1000000) return `${(limit / 1000000).toFixed(1)}MB`;
  return `${limit}KB`;
}

function isDataLimitBetter(currentPlan: ServicePlan, newPlan: ServicePlan): boolean {
  const currentLimit = parseFloat(String(currentPlan.trafficunitcomb || '0'));
  const newLimit = parseFloat(String(newPlan.trafficunitcomb || '0'));
  
  // If either is unlimited (0), unlimited is better
  if (newLimit === 0 && currentLimit > 0) return true;
  if (currentLimit === 0 && newLimit > 0) return false;
  
  // Both have limits, higher is better
  return newLimit > currentLimit;
} 