/**
 * Service Plan Filtering Utilities
 * 
 * This module provides functionality to filter service plans based on
 * location-specific configurations stored in the location_settings table.
 */

/**
 * Interface for service plan data structure
 * Matches the structure returned from RADIUS Manager API
 */
export interface ServicePlan {
  srvid: string;
  srvname: string;
  descr: string;
  downrate: string;
  uprate: string;
  limitdl: string;
  limituptime: string;
  unitprice: string;
  timebaseexp: string;
  timeunitexp: string;
  enableservice: string;
  // Add other fields as needed - allow string, number, boolean, or null values
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Result interface for plan filtering operations
 */
export interface PlanFilterResult {
  success: boolean;
  plans: ServicePlan[];
  totalPlans: number;
  filteredPlans: number;
  locationId: string;
  configurationUsed: 'location_specific' | 'fallback_all' | 'fallback_enabled';
  errors?: string[];
}

/**
 * Filter service plans based on location-specific configuration
 * 
 * @param allPlans - Array of all available service plans from RADIUS Manager
 * @param allowedPlansConfig - Configuration string from location settings (JSON array or comma-separated)
 * @param locationId - Location identifier for logging and debugging
 * @returns Filtered array of service plans
 */
export function filterPlansByLocation(
  allPlans: ServicePlan[],
  allowedPlansConfig: string | null,
  locationId: string
): PlanFilterResult {
  const result: PlanFilterResult = {
    success: true,
    plans: [],
    totalPlans: allPlans.length,
    filteredPlans: 0,
    locationId,
    configurationUsed: 'fallback_all',
    errors: []
  };

  // First, filter out disabled plans from all plans
  const enabledPlans = allPlans.filter(plan => 
    plan.enableservice === "1"
  );

  // If no location-specific configuration, return all enabled plans (backward compatibility)
  if (!allowedPlansConfig || allowedPlansConfig.trim() === '') {
    console.log(`No plan restrictions for location ${locationId}, returning all enabled plans`);
    result.plans = enabledPlans;
    result.filteredPlans = enabledPlans.length;
    result.configurationUsed = 'fallback_enabled';
    return result;
  }

  let allowedPlanIds: string[] = [];

  try {
    // Parse the configuration - support multiple formats
    allowedPlanIds = parseAllowedPlansConfig(allowedPlansConfig);
    
    if (allowedPlanIds.length === 0) {
      console.warn(`Empty plan configuration for location ${locationId}`);
      result.plans = [];
      result.filteredPlans = 0;
      result.configurationUsed = 'location_specific';
      result.errors = ['Configuration specifies no allowed plans'];
      return result;
    }

  } catch (error) {
    console.error(`Error parsing allowed plans for location ${locationId}:`, error);
    
    // Fallback to all enabled plans if config is malformed
    result.plans = enabledPlans;
    result.filteredPlans = enabledPlans.length;
    result.configurationUsed = 'fallback_enabled';
    result.errors = [`Configuration parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`];
    return result;
  }

  // Filter plans based on allowed IDs
  const filteredPlans = enabledPlans.filter(plan => 
    allowedPlanIds.includes(plan.srvid.toString())
  );

  // Log filtering results
  console.log(
    `Location ${locationId}: ${filteredPlans.length} of ${enabledPlans.length} enabled plans available (${allPlans.length} total)`
  );

  if (filteredPlans.length === 0) {
    console.warn(`No plans match configuration for location ${locationId}. Allowed IDs: ${allowedPlanIds.join(', ')}`);
    result.errors = [`No plans match the configured allowed plan IDs: ${allowedPlanIds.join(', ')}`];
  }

  result.plans = filteredPlans;
  result.filteredPlans = filteredPlans.length;
  result.configurationUsed = 'location_specific';
  result.success = filteredPlans.length > 0;

  return result;
}

/**
 * Parse allowed plans configuration string into array of plan IDs
 * Supports multiple formats:
 * - JSON array: ["33", "34", "35"]
 * - Comma-separated string: "33,34,35"
 * - Space-separated string: "33 34 35"
 * 
 * @param configString - Configuration string to parse
 * @returns Array of plan ID strings
 */
export function parseAllowedPlansConfig(configString: string): string[] {
  if (!configString || configString.trim() === '') {
    return [];
  }

  const trimmed = configString.trim();

  try {
    // Try parsing as JSON first
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(id => id.toString().trim()).filter(id => id !== '');
      }
      throw new Error('JSON is not an array');
    }

    // Try parsing as comma-separated values
    if (trimmed.includes(',')) {
      return trimmed.split(',')
        .map(id => id.toString().trim())
        .filter(id => id !== '');
    }

    // Try parsing as space-separated values
    if (trimmed.includes(' ')) {
      return trimmed.split(/\s+/)
        .map(id => id.toString().trim())
        .filter(id => id !== '');
    }

    // Single value
    return [trimmed];

  } catch (error) {
    throw new Error(`Invalid configuration format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate that plan IDs exist in the available plans
 * 
 * @param allowedPlanIds - Array of plan IDs to validate
 * @param availablePlans - Array of available plans to check against
 * @returns Object with validation results
 */
export function validatePlanIds(
  allowedPlanIds: string[],
  availablePlans: ServicePlan[]
): {
  valid: string[];
  invalid: string[];
  isValid: boolean;
} {
  const availablePlanIds = availablePlans.map(plan => plan.srvid.toString());
  
  const valid = allowedPlanIds.filter(id => availablePlanIds.includes(id));
  const invalid = allowedPlanIds.filter(id => !availablePlanIds.includes(id));

  return {
    valid,
    invalid,
    isValid: invalid.length === 0
  };
}

/**
 * Get plan by ID from an array of plans
 * 
 * @param plans - Array of plans to search
 * @param planId - Plan ID to find
 * @returns Found plan or null
 */
export function getPlanById(plans: ServicePlan[], planId: string): ServicePlan | null {
  return plans.find(plan => plan.srvid.toString() === planId.toString()) || null;
}

/**
 * Sort plans by priority/order for display
 * Default order: Free plans first, then by price ascending
 * 
 * @param plans - Array of plans to sort
 * @returns Sorted array of plans
 */
export function sortPlansByPriority(plans: ServicePlan[]): ServicePlan[] {
  return [...plans].sort((a, b) => {
    const priceA = parseFloat(a.unitprice) || 0;
    const priceB = parseFloat(b.unitprice) || 0;
    
    // Free plans (price = 0) come first
    if (priceA === 0 && priceB !== 0) return -1;
    if (priceA !== 0 && priceB === 0) return 1;
    
    // Then sort by price ascending
    return priceA - priceB;
  });
}

/**
 * Find the best default plan from filtered plans
 * Priority: Free plan > Lowest price plan > First plan
 * 
 * @param plans - Array of filtered plans
 * @returns Best default plan or null if no plans
 */
export function findDefaultPlan(plans: ServicePlan[]): ServicePlan | null {
  if (plans.length === 0) return null;
  
  // Look for free plans first
  const freePlans = plans.filter(plan => parseFloat(plan.unitprice) === 0);
  if (freePlans.length > 0) {
    return freePlans[0];
  }
  
  // Otherwise, find the lowest price plan
  const sortedPlans = sortPlansByPriority(plans);
  return sortedPlans[0];
} 