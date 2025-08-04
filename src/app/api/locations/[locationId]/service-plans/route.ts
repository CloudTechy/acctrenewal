import { NextRequest, NextResponse } from 'next/server';
import { getLocationWithOwner, getLocationSetting } from '@/lib/database';
import { filterPlansByLocation, sortPlansByPriority, ServicePlan } from '@/lib/plan-filters';

/**
 * GET /api/locations/[locationId]/service-plans
 * 
 * Fetch service plans filtered by location-specific configuration
 * Returns only plans that are allowed for the specified location
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

    console.log(`Fetching service plans for location: ${locationId}`);

    // Step 1: Validate location exists and is active
    const location = await getLocationWithOwner(locationId);
    
    if (!location) {
      console.log(`Location not found: ${locationId}`);
      return NextResponse.json(
        { 
          success: false,
          error: 'Location not found' 
        },
        { status: 404 }
      );
    }

    if (!location.is_active) {
      console.log(`Location is inactive: ${locationId}`);
      return NextResponse.json(
        { 
          success: false,
          error: 'Location is not active' 
        },
        { status: 403 }
      );
    }

    // Step 2: Fetch all available service plans from RADIUS Manager
    const allPlans = await fetchAllServicePlansFromRadius();
    
    if (!allPlans.success) {
      console.error(`Failed to fetch plans from RADIUS Manager: ${allPlans.error}`);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch service plans from RADIUS Manager',
          details: allPlans.error
        },
        { status: 502 }
      );
    }

    // Step 3: Get location-specific plan restrictions
    const allowedPlansConfig = await getLocationSetting(locationId, 'allowed_service_plans');
    
    console.log(`Location ${locationId} allowed plans config:`, allowedPlansConfig);

    // Step 4: Filter plans based on location settings
    const filterResult = filterPlansByLocation(
      allPlans.plans,
      allowedPlansConfig,
      locationId
    );

    // Step 5: Sort filtered plans by priority (free plans first, then by price)
    const sortedPlans = sortPlansByPriority(filterResult.plans);

    // Step 6: Prepare response with metadata
    const response = {
      success: true,
      plans: sortedPlans,
      metadata: {
        location: {
          id: location.id,
          name: location.display_name,
          city: location.city,
          state: location.state
        },
        filtering: {
          totalAvailable: filterResult.totalPlans,
          enabledPlans: allPlans.plans.filter(plan => plan.enableservice === "1").length,
          filteredPlans: filterResult.filteredPlans,
          configurationUsed: filterResult.configurationUsed,
          hasLocationConfig: allowedPlansConfig !== null
        },
        errors: filterResult.errors || []
      }
    };

    console.log(
      `Location ${locationId}: Returning ${sortedPlans.length} plans ` +
      `(${filterResult.configurationUsed} configuration)`
    );

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in location service plans endpoint:', error);
    
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
 * This function reuses the existing RADIUS Manager integration
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

    console.log('Fetching service plans from RADIUS Manager API');

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
    
    console.log('RADIUS Manager service plans response received');
    
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
    console.error('Error fetching service plans from RADIUS Manager:', error);
    
    return {
      success: false,
      plans: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 