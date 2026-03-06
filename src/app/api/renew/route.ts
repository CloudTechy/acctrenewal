import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// RADIUS API Configuration
const RADIUS_API_CONFIG = {
  baseUrl: process.env.RADIUS_API_URL || 'http://165.227.177.208/radiusmanager/api/sysapi.php',
  apiuser: process.env.RADIUS_API_USER || 'apiconnekt',
  apipass: process.env.RADIUS_API_PASS || 'C0nNekt123',
};

interface RenewalRequest {
  reference: string;
  username: string;
  srvid: number;
  timeunitexp: number;
  trafficunitcomb?: number;
  limitcomb?: number;
  currentExpiry?: string; // Add current user expiry for proper date calculation
  timebaseexp?: string; // days | months from service plan
}

type RenewalUnit = 'day' | 'month';

interface PaystackVerificationResult {
  verified: boolean;
  amountNaira: number;
}

interface ExistingRenewalTransaction {
  id: string;
  payment_status: string | null;
  renewal_end_date: string | null;
}

// Map RADIUS numeric codes to unit strings
// RADIUS returns: 1="day", 3="month", etc.
const mapRadiusTimebaseToUnit = (value?: string | number): RenewalUnit => {
  const str = String(value || '1').toLowerCase().trim();
  
  // Handle numeric codes from RADIUS
  if (str === '1' || str === 'day' || str === 'days') return 'day';
  if (str === '3' || str === 'month' || str === 'months') return 'month';
  if (str === '2' || str === 'week' || str === 'weeks') return 'day'; // Map weeks to days
  
  // Handle text values
  if (str.startsWith('month')) return 'month';
  if (str.startsWith('week')) return 'day'; // Weeks as days
  
  return 'day'; // Default to day
};

const normalizeRenewalUnit = (value?: string): RenewalUnit => {
  return mapRadiusTimebaseToUnit(value);
};

// Verify Paystack transaction
const verifyPaystackTransaction = async (reference: string): Promise<PaystackVerificationResult> => {
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Paystack verification failed:', response.statusText);
      return { verified: false, amountNaira: 0 };
    }

    const data = await response.json();
    console.log('Paystack verification response:', data);

    const verified = data.status === true && data.data?.status === 'success';
    const amountNaira = Number(data.data?.amount || 0) / 100;

    return { verified, amountNaira };
  } catch (error) {
    console.error('Error verifying Paystack transaction:', error);
    return { verified: false, amountNaira: 0 };
  }
};

const getExistingRenewalTransaction = async (reference: string): Promise<ExistingRenewalTransaction | null> => {
  const { data, error } = await supabaseAdmin
    .from('renewal_transactions')
    .select('id, payment_status, renewal_end_date')
    .eq('paystack_reference', reference)
    .maybeSingle();

  if (error) {
    console.error('Error checking existing renewal transaction:', error);
    return null;
  }

  return data ?? null;
};

// Get or create customer for analytics
const getOrCreateCustomer = async (username: string): Promise<{ id: string | null; account_owner_id: string | null }> => {
  try {
    // Try to find existing customer
    const { data: existing } = await supabaseAdmin
      .from('customers')
      .select('id, account_owner_id')
      .eq('username', username)
      .maybeSingle();

    if (existing) {
      return { id: existing.id, account_owner_id: existing.account_owner_id };
    }

    // Create new customer if not found
    const { data: newCustomer, error: createError } = await supabaseAdmin
      .from('customers')
      .insert({ username })
      .select('id, account_owner_id')
      .maybeSingle();

    if (createError) {
      console.error('Error creating customer:', createError);
      return { id: null, account_owner_id: null };
    }

    return { 
      id: newCustomer?.id || null, 
      account_owner_id: newCustomer?.account_owner_id || null 
    };
  } catch (error) {
    console.error('Error in getOrCreateCustomer:', error);
    return { id: null, account_owner_id: null };
  }
};

const updateRenewalTransactionStatus = async (
  reference: string,
  paymentStatus: 'success' | 'failed',
  newExpiry?: string | null
) => {
  const updatePayload: {
    payment_status: 'success' | 'failed';
    renewal_end_date?: string;
  } = {
    payment_status: paymentStatus,
  };

  if (newExpiry) {
    updatePayload.renewal_end_date = newExpiry;
  }

  const { error } = await supabaseAdmin
    .from('renewal_transactions')
    .update(updatePayload)
    .eq('paystack_reference', reference);

  if (error) {
    console.error('Error updating renewal transaction status:', error);
  }
};

export async function POST(request: NextRequest) {
  try {
    const body: RenewalRequest = await request.json();
    const { reference, username, srvid, timeunitexp, trafficunitcomb, limitcomb, currentExpiry, timebaseexp } = body;

    const renewalPeriod = Number(timeunitexp);
    const servicePlanId = Number(srvid);
    const renewalUnit = normalizeRenewalUnit(timebaseexp);

    console.log('Main API renewal request received:', { 
      reference, 
      username, 
      srvid, 
      timeunitexp, 
      trafficunitcomb, 
      limitcomb,
      currentExpiry,
      timebaseexp,
      renewalUnit,
    });

    // Validate required fields
    if (!reference || !username || !Number.isFinite(servicePlanId) || servicePlanId <= 0 || !Number.isFinite(renewalPeriod) || renewalPeriod <= 0) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Verify payment exists with Paystack before processing
    const verification = await verifyPaystackTransaction(reference);
    if (!verification.verified) {
      return NextResponse.json({ 
        error: 'Payment verification failed' 
      }, { status: 400 });
    }

    // Idempotency guard: ensure same reference cannot process twice
    const existingTransaction = await getExistingRenewalTransaction(reference);
    if (existingTransaction) {
      if (existingTransaction.payment_status === 'success') {
        return NextResponse.json({
          success: true,
          message: 'Payment already processed for this reference.',
          reference,
          username,
          newExpiry: existingTransaction.renewal_end_date,
          processing_method: 'idempotent',
          idempotent: true,
        }, { status: 200 });
      }

      if (existingTransaction.payment_status === 'processing' || existingTransaction.payment_status === 'pending') {
        return NextResponse.json({
          success: true,
          message: 'Payment for this reference is already being processed.',
          reference,
          username,
          processing_method: 'idempotent',
          idempotent: true,
        }, { status: 200 });
      }

      return NextResponse.json({
        success: false,
        error: 'Payment reference already exists with failed status. Please contact support.',
        reference,
        username,
        processing_method: 'idempotent',
        idempotent: true,
      }, { status: 409 });
    }

    // Get or create customer for database record
    const customerInfo = await getOrCreateCustomer(username);

    const { error: createError } = await supabaseAdmin
      .from('renewal_transactions')
      .insert({
        username,
        customer_id: customerInfo.id,
        account_owner_id: customerInfo.account_owner_id,
        service_plan_id: servicePlanId,
        amount_paid: verification.amountNaira,
        commission_rate: 0,
        commission_amount: 0,
        paystack_reference: reference,
        payment_status: 'processing',
        renewal_period_days: renewalPeriod,
        renewal_start_date: new Date().toISOString(),
      });

    if (createError) {
      if (createError.code === '23505') {
        const duplicateTransaction = await getExistingRenewalTransaction(reference);
        return NextResponse.json({
          success: true,
          message: 'Payment already processed for this reference.',
          reference,
          username,
          newExpiry: duplicateTransaction?.renewal_end_date || null,
          processing_method: 'idempotent',
          idempotent: true,
        }, { status: 200 });
      }

      console.error('Error creating preliminary renewal transaction:', createError);
      return NextResponse.json({
        success: false,
        error: 'Could not initialize renewal transaction. Please try again.',
      }, { status: 500 });
    }

    console.log('✅ Payment verified - processing renewal immediately...');

    // Process the renewal immediately to get newExpiry for frontend
    let newExpiry: string | null = null;
    
    try {
      // Get current user expiry from RADIUS (parameter might not have it)
      let userCurrentExpiry = currentExpiry;
      
      try {
        const userUrl = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${RADIUS_API_CONFIG.apiuser}&apipass=${RADIUS_API_CONFIG.apipass}&q=get_userdata&username=${encodeURIComponent(username)}`;
        const userResponse = await fetch(userUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Connekt-NextJS-App/1.0',
          },
        });

        if (userResponse.ok) {
          const userResult = await userResponse.text();
          const userData = JSON.parse(userResult);
          if (typeof userData === 'object' && userData !== null) {
            const resultCode = userData["0"];
            const responseExpiry = userData.expiry || userData["1"]?.expiry;
            if (resultCode === 0 && responseExpiry) {
              userCurrentExpiry = responseExpiry;
              console.log('Current user expiry from RADIUS:', userCurrentExpiry);
            }
          }
        }
      } catch (userError) {
        console.error('Error fetching user data for expiry:', userError);
      }

      // Calculate actual units to add
      // Only add elapsed expired days when the plan is day-based.
      let actualUnitsToAdd = renewalPeriod;
      if (renewalUnit === 'day' && userCurrentExpiry) {
        const expiryDate = new Date(userCurrentExpiry);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (expiryDate < today) {
          const expiredDays = Math.ceil((today.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24));
          actualUnitsToAdd = renewalPeriod + expiredDays;
          console.log(`Account expired ${expiredDays} days ago. Adding ${actualUnitsToAdd} days total`);
        }
      }

      // Call RADIUS to add credits
      const radiusUrl = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${encodeURIComponent(RADIUS_API_CONFIG.apiuser)}&apipass=${encodeURIComponent(RADIUS_API_CONFIG.apipass)}&q=add_credits&username=${encodeURIComponent(username)}&expiry=${actualUnitsToAdd}&unit=${renewalUnit}`;
      
      const radiusResponse = await fetch(radiusUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Connekt-NextJS-App/1.0',
        },
      });

      if (radiusResponse.ok) {
        const radiusResult = await radiusResponse.text();
        const result = JSON.parse(radiusResult);
        
        if (Array.isArray(result) && result.length >= 2) {
          const resultCode = result[0];
          const resultData = result[1];
          
          if (resultCode === 0) {
            newExpiry = resultData.expiry;
            console.log('Credits added successfully, new expiry:', newExpiry);
          } else {
            console.error('Failed to add credits:', resultCode, resultData);
            await updateRenewalTransactionStatus(reference, 'failed');
            return NextResponse.json({
              success: false,
              error: 'Failed to renew account on RADIUS server.',
              reference,
              username,
            }, { status: 502 });
          }
        }
      } else {
        console.error('RADIUS API error:', radiusResponse.statusText);
        await updateRenewalTransactionStatus(reference, 'failed');
        return NextResponse.json({
          success: false,
          error: 'RADIUS server did not accept renewal request.',
          reference,
          username,
        }, { status: 502 });
      }
    } catch (error) {
      console.error('Error processing renewal:', error);
      await updateRenewalTransactionStatus(reference, 'failed');
      return NextResponse.json({
        success: false,
        error: 'Renewal processing failed. Please contact support.',
        reference,
        username,
      }, { status: 500 });
    }

    await updateRenewalTransactionStatus(reference, 'success', newExpiry);

    // Return success response with newExpiry for immediate frontend update
    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully. Account renewal processed.',
      reference: reference,
      username: username,
      newExpiry: newExpiry, // Return new expiry if we got it
      processing_method: 'direct',
      renewalUnit,
      idempotent: false,
      note: 'Your account has been renewed successfully.'
    }, { status: 200 });

  } catch (error) {
    console.error('Main API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'Payment processing failed. Please contact support if your payment was successful but account was not renewed.'
    }, { status: 500 });
  }
} 