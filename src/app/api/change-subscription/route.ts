import { NextRequest, NextResponse } from 'next/server';
import { 
  validatePlanChange, 
  getPlanChangeType,
  PlanChangeRequest,
  UserAccountInfo 
} from '@/lib/plan-change-utils';
import { ServicePlan } from '@/lib/plan-filters';
import { supabaseAdmin } from '@/lib/supabase';

// DMA Radius Manager API configuration
const RADIUS_API_CONFIG = {
  baseUrl: process.env.RADIUS_API_URL || 'http://161.35.46.125/radiusmanager/api/sysapi.php',
  apiuser: process.env.RADIUS_API_USER || 'api',
  apipass: process.env.RADIUS_API_PASS || 'api123'
};

interface ChangeSubscriptionRequest {
  username: string;
  newServicePlanId: string;
  locationId?: string;
}

interface ChangeSubscriptionResponse {
  success: boolean;
  message: string;
  data?: {
    username: string;
    previousPlan: ServicePlan;
    newPlan: ServicePlan;
    transactionId: string;
    accountStatus: string;
  };
  error?: string;
}

interface RadiusUserData {
  enableuser: number;
  srvid: number;
  expiry: string;
  [key: string]: unknown;
}

export async function POST(request: NextRequest): Promise<NextResponse<ChangeSubscriptionResponse>> {
  try {
    const body: ChangeSubscriptionRequest = await request.json();
    const { username, newServicePlanId, locationId } = body;

    // Validate basic request
    if (!username || !newServicePlanId) {
      return NextResponse.json({
        success: false,
        message: 'Username and new service plan ID are required',
        error: 'INVALID_REQUEST'
      }, { status: 400 });
    }

    console.log(`Processing plan change request for user: ${username}, new plan: ${newServicePlanId}`);

    // Step 1: Get current user data from DMA Radius Manager
    const currentUserData = await getUserDataFromRadius(username);
    if (!currentUserData.success) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch current user data',
        error: currentUserData.error
      }, { status: 404 });
    }

    // Step 2: Get current service plan details
    const currentPlan = await getServicePlanFromRadius(currentUserData.data.srvid.toString());
    if (!currentPlan.success) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch current plan details',
        error: currentPlan.error
      }, { status: 500 });
    }

    // Step 3: Get available service plans (with location filtering if provided)
    const availablePlans = await getAvailableServicePlans(locationId);
    if (!availablePlans.success) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch available plans',
        error: availablePlans.error
      }, { status: 500 });
    }

    // Step 4: Find the new plan
    const newPlan = availablePlans.plans.find(plan => plan.srvid === newServicePlanId);
    if (!newPlan) {
      return NextResponse.json({
        success: false,
        message: 'Selected plan is not available',
        error: 'PLAN_NOT_FOUND'
      }, { status: 400 });
    }

    // Step 5: Build user account info for validation
    const userAccountInfo: UserAccountInfo = {
      username,
      enableuser: currentUserData.data.enableuser,
      srvid: currentUserData.data.srvid,
      expiry: currentUserData.data.expiry || '',
      accountStatus: getAccountStatus(currentUserData.data),
      isOnFreePlan: parseFloat(String(currentPlan.plan.unitprice || '0')) === 0,
      currentPlan: currentPlan.plan
    };

    console.log('🔍 Account Status Debug:');
    console.log('- Expiry Date:', currentUserData.data.expiry);
    console.log('- Enable User:', currentUserData.data.enableuser);
    console.log('- Calculated Status:', userAccountInfo.accountStatus);
    console.log('- Is Free Plan:', userAccountInfo.isOnFreePlan);

    // Step 6: Validate the plan change request (simplified - no payment validation)
    const changeRequest: PlanChangeRequest = {
      username,
      currentPlanId: currentPlan.plan.srvid,
      newPlanId: newServicePlanId,
      locationId
    };

    const validation = validatePlanChange(changeRequest, userAccountInfo, availablePlans.plans);
    console.log('✅ Validation Result:', validation);
    
    if (!validation.isValid) {
      console.log('❌ Validation failed:', validation.errors);
      return NextResponse.json({
        success: false,
        message: validation.errors.join(', '),
        error: 'VALIDATION_FAILED'
      }, { status: 400 });
    }

    // Step 7: Execute the plan change via DMA Radius Manager (NO PAYMENT REQUIRED)
    console.log(`🔄 Changing plan from ${currentPlan.plan.srvid} to ${newServicePlanId}`);
    const planChangeResult = await changePlanViaRadius(username, newServicePlanId);
    if (!planChangeResult.success) {
      return NextResponse.json({
        success: false,
        message: 'Failed to update plan in DMA Radius Manager',
        error: planChangeResult.error
      }, { status: 500 });
    }

    // Step 8: Record the FREE plan change transaction (₦0 amount)
    const changeType = getPlanChangeType(currentPlan.plan, newPlan);
    const transactionId = await recordPlanChangeTransaction({
      username,
      previousPlan: currentPlan.plan,
      newPlan,
      changeType,
      amount: 0 // ₦0 for plan changes - payment happens during renewal
    });

    console.log(`✅ Plan change successful! Transaction ID: ${transactionId}`);

    // Step 9: Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully changed plan from ${currentPlan.plan.srvname} to ${newPlan.srvname}. Use the Renew button to add credits.`,
      data: {
        username,
        previousPlan: currentPlan.plan,
        newPlan,
        transactionId,
        accountStatus: getAccountStatus(currentUserData.data),
        message: 'Plan changed successfully. Click Renew to add time and data credits.'
      }
    });

  } catch (error) {
    console.error('Error in change subscription endpoint:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper functions

async function getUserDataFromRadius(username: string): Promise<{
  success: boolean;
  data: RadiusUserData;
  error?: string;
}> {
  try {
    const url = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${RADIUS_API_CONFIG.apiuser}&apipass=${RADIUS_API_CONFIG.apipass}&q=get_userdata&username=${encodeURIComponent(username)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data[0] === 0) {
      // Combine user data from data[1] with expiry from root level
      const userData = {
        ...data[1],
        expiry: data.expiry || data[1].expiry || '' // Prefer root level expiry, fallback to nested
      } as RadiusUserData;
      
      return { success: true, data: userData };
    } else {
      return { 
        success: false, 
        data: {} as RadiusUserData,
        error: data[1] || 'User not found' 
      };
    }
  } catch (error) {
    return { 
      success: false,
      data: {} as RadiusUserData,
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function getServicePlanFromRadius(srvid: string): Promise<{
  success: boolean;
  plan: ServicePlan;
  error?: string;
}> {
  try {
    const url = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${RADIUS_API_CONFIG.apiuser}&apipass=${RADIUS_API_CONFIG.apipass}&q=get_srv&srvid=${srvid}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data[0] === 0 && data[1] && data[1].length > 0) {
      return { success: true, plan: data[1][0] as ServicePlan };
    } else {
      return { 
        success: false, 
        plan: {} as ServicePlan,
        error: 'Service plan not found' 
      };
    }
  } catch (error) {
    return { 
      success: false,
      plan: {} as ServicePlan,
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function getAvailableServicePlans(locationId?: string): Promise<{
  success: boolean;
  plans: ServicePlan[];
  error?: string;
}> {
  try {
    let url: string;
    
    if (locationId) {
      // Use location-specific endpoint
      url = `/api/locations/${locationId}/service-plans`;
    } else {
      // Use global endpoint
      url = '/api/radius/service-plans';
    }
    
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${url}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      return { success: true, plans: data.plans || [] };
    } else {
      return { success: false, plans: [], error: data.error };
    }
  } catch (error) {
    return { 
      success: false, 
      plans: [],
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function changePlanViaRadius(username: string, newSrvId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const url = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${RADIUS_API_CONFIG.apiuser}&apipass=${RADIUS_API_CONFIG.apipass}&q=edit_user&username=${encodeURIComponent(username)}&srvid=${newSrvId}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data[0] === 0) {
      return { success: true };
    } else {
      return { success: false, error: data[1] || 'Failed to update user plan' };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Remove unused functions that are no longer needed for plan changes

async function recordPlanChangeTransaction(data: {
  username: string;
  previousPlan: ServicePlan;
  newPlan: ServicePlan;
  changeType: 'upgrade' | 'downgrade' | 'plan_switch';
  amount: number;
}): Promise<string> {
  try {
    const { data: insertData, error } = await supabaseAdmin
      .from('renewal_transactions')
      .insert({
        username: data.username,
        service_plan_id: parseInt(data.newPlan.srvid),
        service_plan_name: data.newPlan.srvname,
        previous_service_plan_id: parseInt(data.previousPlan.srvid),
        previous_service_plan_name: data.previousPlan.srvname,
        amount_paid: data.amount,
        commission_rate: 0.00, // No commission on free plan changes
        commission_amount: 0.00,
        paystack_reference: `plan_change_${Date.now()}`,
        payment_status: 'success',
        transaction_type: 'plan_change',
        change_reason: data.changeType,
        plan_change_metadata: {
          previous_plan: data.previousPlan,
          new_plan: data.newPlan,
          change_type: data.changeType,
          note: 'Free plan change - payment will be processed during renewal'
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error recording plan change transaction:', error);
      return 'failed';
    }

    return insertData.id;
  } catch (error) {
    console.error('Error recording plan change transaction:', error);
    return 'failed';
  }
}

function getAccountStatus(userData: RadiusUserData): 'ACTIVE' | 'EXPIRED' | 'INACTIVE' {
  const isUserEnabled = userData.enableuser === 1;
  const expiryDate = userData.expiry;
  
  let isExpired = false;
  if (expiryDate && expiryDate !== '0000-00-00' && expiryDate !== '0000-00-00 00:00:00') {
    try {
      const expiry = new Date(expiryDate);
      const now = new Date();
      isExpired = expiry < now;
    } catch {
      isExpired = false;
    }
  }
  
  if (!isUserEnabled) {
    return 'INACTIVE';
  } else if (isExpired) {
    return 'EXPIRED';
  } else {
    return 'ACTIVE';
  }
} 