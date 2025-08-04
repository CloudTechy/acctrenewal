import { NextRequest, NextResponse } from 'next/server';
import { getLocationWithOwner, getLocationSetting, setLocationSetting } from '@/lib/database';
import { ServicePlan } from '@/lib/plan-filters';

/**
 * GET /api/admin/locations/[locationId]/plans
 * 
 * Get current plan configuration for a location
 * Returns available plans and current location configuration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params;

    // Validate location parameter
    if (!locationId || locationId.trim() === '') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Location ID is required' 
        },
        { status: 400 }
      );
    }

    console.log(`Getting plan configuration for location: ${locationId}`);

    // Step 1: Validate location exists and is active
    const location = await getLocationWithOwner(locationId);
    
    if (!location) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Location not found' 
        },
        { status: 404 }
      );
    }

    // Step 2: Fetch all available service plans from RADIUS Manager
    const allPlansResponse = await fetchAllServicePlansFromRadius();
    
    if (!allPlansResponse.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch service plans from RADIUS Manager',
          details: allPlansResponse.error
        },
        { status: 502 }
      );
    }

    // Step 3: Get current location configuration
    const allowedPlansConfig = await getLocationSetting(locationId, 'allowed_service_plans');
    const defaultPlanConfig = await getLocationSetting(locationId, 'default_service_plan');

    // Parse allowed plans configuration
    let allowedPlanIds: string[] = [];
    if (allowedPlansConfig) {
      try {
        allowedPlanIds = JSON.parse(allowedPlansConfig);
      } catch (error) {
        console.warn(`Invalid JSON in allowed_service_plans for ${locationId}:`, error);
      }
    }

    // Filter to only enabled plans
    const enabledPlans = allPlansResponse.plans.filter(plan => plan.enableservice === "1");

    // Prepare response
    const response = {
      success: true,
      location: {
        id: location.id,
        name: location.name,
        display_name: location.display_name,
        city: location.city,
        state: location.state
      },
      allPlans: enabledPlans,
      currentConfiguration: {
        hasConfiguration: allowedPlansConfig !== null,
        allowedPlanIds: allowedPlanIds,
        defaultPlanId: defaultPlanConfig,
        allowedPlans: enabledPlans.filter(plan => allowedPlanIds.includes(plan.srvid))
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in admin location plans GET endpoint:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/locations/[locationId]/plans
 * 
 * Update plan configuration for a location
 * Body: { allowedPlanIds: string[], defaultPlanId?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params;
    const { allowedPlanIds, defaultPlanId } = await request.json();

    // Validate location parameter
    if (!locationId || locationId.trim() === '') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Location ID is required' 
        },
        { status: 400 }
      );
    }

    // Validate request body
    if (!Array.isArray(allowedPlanIds)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'allowedPlanIds must be an array' 
        },
        { status: 400 }
      );
    }

    console.log(`Updating plan configuration for location: ${locationId}`);

    // Step 1: Validate location exists
    const location = await getLocationWithOwner(locationId);
    
    if (!location) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Location not found' 
        },
        { status: 404 }
      );
    }

    // Step 2: Validate plan IDs exist in RADIUS Manager
    const allPlansResponse = await fetchAllServicePlansFromRadius();
    
    if (!allPlansResponse.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to validate plans with RADIUS Manager',
          details: allPlansResponse.error
        },
        { status: 502 }
      );
    }

    const enabledPlans = allPlansResponse.plans.filter(plan => plan.enableservice === "1");
    const availablePlanIds = enabledPlans.map(plan => plan.srvid);
    
    // Validate all requested plan IDs exist
    const invalidPlanIds = allowedPlanIds.filter(id => !availablePlanIds.includes(id));
    if (invalidPlanIds.length > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: `Invalid plan IDs: ${invalidPlanIds.join(', ')}`,
          availablePlanIds: availablePlanIds
        },
        { status: 400 }
      );
    }

    // Validate default plan ID if provided
    if (defaultPlanId && !allowedPlanIds.includes(defaultPlanId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Default plan ID must be in the list of allowed plans' 
        },
        { status: 400 }
      );
    }

    // Step 3: Update location settings
    const operations = [];

    if (allowedPlanIds.length === 0) {
      // Remove configuration to show all plans
      const deleteResult = await setLocationSetting(
        locationId,
        'allowed_service_plans',
        '',
        'json'
      );
      operations.push({ setting: 'allowed_service_plans', action: 'removed', success: deleteResult });
    } else {
      // Set allowed plans
      const allowedResult = await setLocationSetting(
        locationId,
        'allowed_service_plans',
        JSON.stringify(allowedPlanIds),
        'json',
        `Admin configured allowed service plans for ${locationId}`
      );
      operations.push({ setting: 'allowed_service_plans', action: 'updated', success: allowedResult });
    }

    // Set or remove default plan
    if (defaultPlanId) {
      const defaultResult = await setLocationSetting(
        locationId,
        'default_service_plan',
        defaultPlanId,
        'string',
        `Admin configured default service plan for ${locationId}`
      );
      operations.push({ setting: 'default_service_plan', action: 'updated', success: defaultResult });
    } else {
      // Remove default plan setting
      const removeDefaultResult = await setLocationSetting(
        locationId,
        'default_service_plan',
        '',
        'string'
      );
      operations.push({ setting: 'default_service_plan', action: 'removed', success: removeDefaultResult });
    }

    // Check if all operations succeeded
    const failedOperations = operations.filter(op => !op.success);
    if (failedOperations.length > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Some configuration updates failed',
          operations: operations
        },
        { status: 500 }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: `Plan configuration updated for location ${locationId}`,
      data: {
        locationId,
        allowedPlanIds: allowedPlanIds.length > 0 ? allowedPlanIds : 'All plans',
        defaultPlanId: defaultPlanId || 'Auto-selected',
        operations: operations
      }
    });

  } catch (error) {
    console.error('Error in admin location plans POST endpoint:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch all service plans from RADIUS Manager API
 * Reuses the same logic as the location-specific endpoint
 */
async function fetchAllServicePlansFromRadius(): Promise<{
  success: boolean;
  plans: ServicePlan[];
  error?: string;
}> {
  try {
    // Get environment variables
    const apiUser = process.env.RADIUS_API_USER;
    const apiPass = process.env.RADIUS_API_PASS;
    const baseUrl = process.env.RADIUS_API_URL;

    if (!apiUser || !apiPass || !baseUrl) {
      return {
        success: false,
        plans: [],
        error: 'RADIUS Manager configuration missing'
      };
    }

    // Extract base URL without the specific endpoint
    const radiusBaseUrl = baseUrl.replace('/api/sysapi.php', '');

    // Construct the API URL for getting service plans
    const apiUrl = `${radiusBaseUrl}/api/sysapi.php?apiuser=${apiUser}&apipass=${apiPass}&q=get_srv`;

    console.log('Fetching service plans from RADIUS Manager API for admin');

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('RADIUS Manager service plans response received for admin');
    
    // Check if the response is successful
    if (data[0] === 0) {
      // Success - data[1] contains the service plans array
      const plans = Array.isArray(data[1]) ? data[1] : [];
      
      return {
        success: true,
        plans
      };
    } else {
      // Error from RADIUS Manager
      return {
        success: false,
        plans: [],
        error: data[1] || 'Failed to fetch service plans from RADIUS Manager'
      };
    }

  } catch (error) {
    console.error('Error fetching service plans from RADIUS Manager for admin:', error);
    
    return {
      success: false,
      plans: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 