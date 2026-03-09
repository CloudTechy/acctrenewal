import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Environment validation
const validateEnvironment = () => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Critical: Paystack (required for payment verification)
  const paystackKey = process.env.PAYSTACK_SECRET_KEY || '';
  
  if (!paystackKey) {
    errors.push('PAYSTACK_SECRET_KEY not configured');
  } else if (paystackKey.length < 20) {
    // Paystack keys are typically 50+ chars (JWT format or sk_* format)
    errors.push('PAYSTACK_SECRET_KEY appears to be invalid (too short)');
  } else if (paystackKey.includes('your_') || paystackKey.includes('placeholder')) {
    errors.push('PAYSTACK_SECRET_KEY still contains placeholder value');
  }
  
  // Optional: Supabase (only needed for analytics/tracking)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'not-set';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'not-set';
  const isSupabaseConfigured = supabaseUrl && !supabaseUrl.includes('your-project') && !supabaseUrl.includes('dummy') && supabaseServiceKey !== 'dummy_service_role';
  
  if (!isSupabaseConfigured) {
    warnings.push('Supabase not configured - renewals will work but transactions won\'t be logged');
  }
  
  console.log('[ENV_CHECK] Configuration status:', {
    paystackKeyLength: paystackKey.length,
    paystackConfigured: errors.length === 0,
    paystackKeyPrefix: paystackKey ? paystackKey.substring(0, 10) : 'not-set',
    supabaseConfigured: isSupabaseConfigured,
    supabaseUrl: isSupabaseConfigured ? supabaseUrl : 'not-configured'
  });
  
  if (errors.length > 0) {
    console.error('[ENV_CHECK] CRITICAL configuration errors:', errors);
  }
  
  if (warnings.length > 0) {
    console.warn('[ENV_CHECK] Configuration warnings:', warnings);
  }
  
  return { errors, warnings };
};

// Validate on module load
const envValidation = validateEnvironment();

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
  const verificationUrl = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;
  
  try {
    console.log('[PAYMENT_VERIFY] Starting verification', { 
      reference, 
      timestamp: new Date().toISOString(),
      url: verificationUrl,
      secretKeyPrefix: process.env.PAYSTACK_SECRET_KEY?.substring(0, 10) || 'NOT_SET'
    });

    if (!process.env.PAYSTACK_SECRET_KEY) {
      console.error('[PAYMENT_VERIFY] CRITICAL: PAYSTACK_SECRET_KEY not configured');
      return { verified: false, amountNaira: 0 };
    }

    const response = await fetch(verificationUrl, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    console.log('[PAYMENT_VERIFY] Paystack API response', {
      httpStatus: response.status,
      httpStatusText: response.statusText,
      paystackStatus: data.status,
      transactionStatus: data.data?.status,
      amount: data.data?.amount,
      amountNaira: Number(data.data?.amount || 0) / 100,
      currency: data.data?.currency,
      message: data.message,
      reference: reference,
      responseOk: response.ok
    });

    if (!response.ok) {
      console.error('[PAYMENT_VERIFY] API error', {
        status: response.status,
        statusText: response.statusText,
        message: data.message,
        reference: reference,
        fullResponse: JSON.stringify(data)
      });
      return { verified: false, amountNaira: 0 };
    }

    const verified = data.status === true && data.data?.status === 'success';
    const amountNaira = Number(data.data?.amount || 0) / 100;

    console.log('[PAYMENT_VERIFY] Verification result', {
      verified,
      amountNaira,
      reference
    });

    return { verified, amountNaira };
  } catch (error) {
    console.error('[PAYMENT_VERIFY] Exception occurred', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      reference: reference
    });
    return { verified: false, amountNaira: 0 };
  }
};

const getExistingRenewalTransaction = async (reference: string): Promise<ExistingRenewalTransaction | null> => {
  // Check if Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const isSupabaseConfigured = supabaseUrl && !supabaseUrl.includes('your-project') && !supabaseUrl.includes('dummy');
  
  if (!isSupabaseConfigured) {
    console.log('[EXISTING_TRANSACTION] Supabase not configured, skipping idempotency check');
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('renewal_transactions')
      .select('id, payment_status, renewal_end_date')
      .eq('paystack_reference', reference)
      .maybeSingle();

    if (error) {
      console.error('[EXISTING_TRANSACTION] Error checking existing renewal transaction:', {
        reference,
        error,
        message: error.message,
        details: error.details
      });
      return null;
    }

    return data ?? null;
  } catch (error) {
    console.error('[EXISTING_TRANSACTION] Exception checking existing transaction:', { reference, error });
    return null;
  }
};

// Get or create customer for analytics
const getOrCreateCustomer = async (username: string): Promise<{ id: string | null; account_owner_id: string | null }> => {
  try {
    console.log('[GET_OR_CREATE_CUSTOMER] Starting for username:', username);
    
    // Check if Supabase is properly configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isSupabaseConfigured = supabaseUrl && !supabaseUrl.includes('your-project') && !supabaseUrl.includes('dummy');
    
    if (!isSupabaseConfigured) {
      console.warn('[GET_OR_CREATE_CUSTOMER] Supabase not configured, skipping database operations');
      // Return dummy values to allow payment processing without database
      return { 
        id: `temp_${username.replace(/[^a-zA-Z0-9]/g, '_')}`, 
        account_owner_id: null 
      };
    }
    
    // Try to find existing customer
    const { data: existing, error: findError } = await supabaseAdmin
      .from('customers')
      .select('id, account_owner_id')
      .eq('username', username)
      .maybeSingle();

    if (findError) {
      console.error('[GET_OR_CREATE_CUSTOMER] Error finding customer:', { 
        username, 
        error: findError,
        code: findError.code,
        message: findError.message 
      });
    }

    if (existing) {
      console.log('[GET_OR_CREATE_CUSTOMER] Found existing customer:', { 
        username, 
        id: existing.id, 
        accountOwnerId: existing.account_owner_id 
      });
      return { id: existing.id, account_owner_id: existing.account_owner_id };
    }

    console.log('[GET_OR_CREATE_CUSTOMER] No existing customer, creating new...');
    
    // Create new customer if not found
    const { data: newCustomer, error: createError } = await supabaseAdmin
      .from('customers')
      .insert({ username })
      .select('id, account_owner_id')
      .maybeSingle();

    if (createError) {
      console.error('[GET_OR_CREATE_CUSTOMER] Error creating customer:', { 
        username, 
        error: createError,
        code: createError.code,
        message: createError.message,
        details: createError.details,
        hint: createError.hint
      });
      return { id: null, account_owner_id: null };
    }

    console.log('[GET_OR_CREATE_CUSTOMER] Created new customer:', { 
      username, 
      id: newCustomer?.id, 
      accountOwnerId: newCustomer?.account_owner_id 
    });

    return { 
      id: newCustomer?.id || null, 
      account_owner_id: newCustomer?.account_owner_id || null 
    };
  } catch (error) {
    console.error('[GET_OR_CREATE_CUSTOMER] Exception:', { username, error });
    return { id: null, account_owner_id: null };
  }
};

const updateRenewalTransactionStatus = async (
  reference: string,
  paymentStatus: 'success' | 'failed',
  newExpiry?: string | null
) => {
  // Check if Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const isSupabaseConfigured = supabaseUrl && !supabaseUrl.includes('your-project') && !supabaseUrl.includes('dummy');
  
  if (!isSupabaseConfigured) {
    console.log('[UPDATE_TRANSACTION] Supabase not configured, skipping database update', { 
      reference, 
      paymentStatus, 
      newExpiry 
    });
    return;
  }

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
    console.error('[UPDATE_TRANSACTION] Error updating renewal transaction status:', error);
  } else {
    console.log('[UPDATE_TRANSACTION] Successfully updated transaction:', { reference, paymentStatus });
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
      console.error('[RENEW_API] Missing required fields', { reference, username, srvid, timeunitexp });
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'Please ensure all payment information is included'
      }, { status: 400 });
    }

    // Check critical environment configuration (Paystack only)
    if (envValidation.errors.length > 0) {
      console.error('[RENEW_API] CRITICAL environment configuration error', { errors: envValidation.errors });
      return NextResponse.json({ 
        error: 'Server configuration error. Please contact support.',
        details: envValidation.errors.join(', ')
      }, { status: 500 });
    }
    
    // Log warnings but proceed (Supabase is optional)
    if (envValidation.warnings.length > 0) {
      console.warn('[RENEW_API] Configuration warnings (non-blocking):', envValidation.warnings);
    }

    // Verify payment exists with Paystack before processing
    const verification = await verifyPaystackTransaction(reference);
    if (!verification.verified) {
      console.error('[RENEW_API] Payment verification failed', { reference, username });
      return NextResponse.json({ 
        error: 'Payment verification failed. Please contact support with your payment reference.',
        reference: reference,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log('[RENEW_API] Payment verified successfully', {
      reference,
      amountNaira: verification.amountNaira
    });

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
    console.log('[RENEW_API] Customer info retrieved:', { 
      username, 
      customerId: customerInfo.id, 
      accountOwnerId: customerInfo.account_owner_id,
      hasValidIds: customerInfo.id !== null
    });

    // Check if Supabase is configured for database operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isSupabaseConfigured = supabaseUrl && !supabaseUrl.includes('your-project') && !supabaseUrl.includes('dummy');

    if (!isSupabaseConfigured) {
      console.warn('[RENEW_API] Supabase not configured - skipping database transaction creation');
      console.log('[RENEW_API] Proceeding with RADIUS credit addition only...');
    } else {
      // Only try database operations if Supabase is configured
      if (!customerInfo.id || customerInfo.id.startsWith('temp_')) {
        console.error('[RENEW_API] CRITICAL: Could not get/create customer record', { username });
        return NextResponse.json({
          success: false,
          error: 'Customer record could not be created. Please contact support.',
        }, { status: 500 });
      }

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

        console.error('[RENEW_API] Error creating preliminary renewal transaction:', {
          error: createError,
          code: createError.code,
          message: createError.message,
          details: createError.details,
          hint: createError.hint,
          username,
          reference,
          customerId: customerInfo.id,
          accountOwnerId: customerInfo.account_owner_id
        });
        return NextResponse.json({
          success: false,
          error: 'Could not initialize renewal transaction. Please try again.',
          debug: process.env.NODE_ENV === 'development' ? {
            dbError: createError.message,
            code: createError.code
          } : undefined
        }, { status: 500 });
      }
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