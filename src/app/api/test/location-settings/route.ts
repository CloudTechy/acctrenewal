import { NextRequest, NextResponse } from 'next/server';
import { setLocationSetting } from '@/lib/database';

/**
 * POST /api/test/location-settings
 * 
 * Test endpoint to configure location-specific service plan settings
 * Used for testing the plan filtering functionality
 */
export async function POST(request: NextRequest) {
  try {
    const { locationId, allowedPlans, defaultPlan } = await request.json();

    if (!locationId || !allowedPlans) {
      return NextResponse.json(
        { 
          success: false,
          error: 'locationId and allowedPlans are required' 
        },
        { status: 400 }
      );
    }

    // Set allowed service plans
    const allowedPlansResult = await setLocationSetting(
      locationId,
      'allowed_service_plans',
      JSON.stringify(allowedPlans),
      'json',
      `Test configuration - allowed service plans for ${locationId}`
    );

    if (!allowedPlansResult) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to set allowed service plans' 
        },
        { status: 500 }
      );
    }

    // Set default service plan if provided
    if (defaultPlan) {
      const defaultPlanResult = await setLocationSetting(
        locationId,
        'default_service_plan',
        defaultPlan,
        'string',
        `Test configuration - default service plan for ${locationId}`
      );

      if (!defaultPlanResult) {
        console.warn('Failed to set default service plan, but allowed plans were set successfully');
      }
    }

    return NextResponse.json({
      success: true,
      message: `Configuration set for location ${locationId}`,
      data: {
        locationId,
        allowedPlans,
        defaultPlan: defaultPlan || 'Not set'
      }
    });

  } catch (error) {
    console.error('Error in test location settings endpoint:', error);
    
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
 * GET /api/test/location-settings?locationId=gefas03
 * 
 * Get current location settings for testing
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    if (!locationId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'locationId parameter is required' 
        },
        { status: 400 }
      );
    }

    // Test the location-specific service plans endpoint
    const servicePlansResponse = await fetch(`${request.nextUrl.origin}/api/locations/${locationId}/service-plans`);
    const servicePlansData = await servicePlansResponse.json();

    return NextResponse.json({
      success: true,
      locationId,
      servicePlans: servicePlansData
    });

  } catch (error) {
    console.error('Error in test location settings GET endpoint:', error);
    
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