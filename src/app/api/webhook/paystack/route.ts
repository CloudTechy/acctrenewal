import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createRenewalTransaction, getCustomerByUsername, createOrUpdateCustomer, getAccountOwnerByUsername } from '@/lib/database';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  sanitizeUsername, 
  validateServicePlanId, 
  validateDays, 
  validateTraffic,
  checkRateLimit,
  validatePaystackReference
} from '@/lib/security';
import { rateLimitResponse, validateWebhookSource } from '@/lib/auth-middleware';

// RADIUS API Configuration
const RADIUS_API_CONFIG = {
  baseUrl: process.env.RADIUS_API_URL || 'http://165.227.177.208/radiusmanager/api/sysapi.php',
  apiuser: process.env.RADIUS_API_USER || 'apiconnekt',
  apipass: process.env.RADIUS_API_PASS || 'C0nNekt123',
};

// Paystack webhook event types
interface PaystackWebhookEvent {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: {
      custom_fields?: Array<{
        display_name: string;
        variable_name: string;
        value: string;
      }>;
      username?: string;
      srvid?: string;
      timeunitexp?: number;
      trafficunitcomb?: number;
      limitcomb?: number;
      [key: string]: string | number | boolean | null | undefined | Array<{
        display_name: string;
        variable_name: string;
        value: string;
      }>;
    };
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: Record<string, unknown>;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
    };
  };
}

// Verify Paystack webhook signature
function verifyPaystackSignature(payload: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error('PAYSTACK_SECRET_KEY not configured');
    return false;
  }

  const hash = crypto.createHmac('sha512', secret).update(payload).digest('hex');
  return hash === signature;
}

// Add credits to user via RADIUS Manager
async function addCreditsToUser(
  username: string,
  daysToAdd: number,
  trafficToAdd: number = 0,
  currentExpiry?: string
): Promise<{ success: boolean; newExpiry?: string }> {
  try {
    // Validate and sanitize all inputs
    const safeUsername = sanitizeUsername(username);
    const safeDays = validateDays(daysToAdd);
    const safeTraffic = validateTraffic(trafficToAdd);
    
    console.log(`Adding ${safeDays} days to user ${safeUsername}`);
    if (currentExpiry) {
      console.log(`User current expiry: ${currentExpiry}`);
    }

    // Calculate the correct number of days to add based on current expiry
    let actualDaysToAdd = safeDays;
    
    if (currentExpiry) {
      const expiryDate = new Date(currentExpiry);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
      
      // If account has expired, add the expired days to ensure full service period
      if (expiryDate < today) {
        const expiredDays = Math.ceil((today.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24));
        actualDaysToAdd = safeDays + expiredDays;
        console.log(`Account expired ${expiredDays} days ago. Adding ${actualDaysToAdd} days total (${safeDays} service + ${expiredDays} expired)`);
      } else {
        console.log(`Account expires in the future. Adding ${safeDays} days as planned`);
      }
    } else {
      console.log(`No current expiry provided. Adding ${safeDays} days from today`);
    }

    // Build URL with validated parameters matching Postman documentation
    // According to Postman: q=add_credits&username=user&expiry=1&unit=day
    const url = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${encodeURIComponent(RADIUS_API_CONFIG.apiuser)}&apipass=${encodeURIComponent(RADIUS_API_CONFIG.apipass)}&q=add_credits&username=${encodeURIComponent(safeUsername)}&expiry=${actualDaysToAdd}&unit=day`;

    console.log('Adding credits to user via webhook:', safeUsername);
    console.log('- Service plan days:', safeDays);
    console.log('- Actual days to add:', actualDaysToAdd);
    console.log('- Traffic to add (bytes):', safeTraffic);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Connekt-NextJS-App/1.0',
      },
    });

    if (!response.ok) {
      console.error('RADIUS add_credits failed via webhook:', response.statusText);
      return { success: false };
    }

    const result = await response.text();
    console.log('RADIUS add_credits response via webhook:', result);

    try {
      const parsedResult = JSON.parse(result);
      if (Array.isArray(parsedResult) && parsedResult.length >= 2) {
        const resultCode = parsedResult[0];
        const resultData = parsedResult[1];

        if (resultCode === 0) {
          console.log('Credits added successfully via webhook');
          
          // Use RADIUS API response as the authoritative expiry date
          // This ensures consistency between webhook and RADIUS system
          const apiExpiry = resultData.expiry;
          console.log(`RADIUS API set expiry to: ${apiExpiry}`);
          
          return { 
            success: true, 
            newExpiry: apiExpiry // Use RADIUS response, not internal calculation
          };
        } else {
          console.error('RADIUS add_credits failed with code:', resultCode, resultData);
          return { success: false };
        }
      } else {
        console.error('Unexpected RADIUS API response format via webhook:', parsedResult);
        return { success: false };
      }
    } catch (parseError) {
      console.error('Error parsing RADIUS response via webhook:', parseError);
      return { success: false };
    }
  } catch (error) {
    console.error('Error adding credits to user via webhook:', error);
    return { success: false };
  }
}

// Extract metadata from Paystack payment
function extractPaymentMetadata(event: PaystackWebhookEvent) {
  const metadata = event.data.metadata;
  let username = '';
  let srvid = '';
  let timeunitexp = 30; // default
  let trafficunitcomb = 0;
  let limitcomb = 0;

  // Extract from custom_fields if available
  if (metadata.custom_fields && Array.isArray(metadata.custom_fields)) {
    for (const field of metadata.custom_fields) {
      switch (field.variable_name) {
        case 'username':
          username = field.value;
          break;
        case 'srvid':
          srvid = field.value;
          break;
        case 'timeunitexp':
          timeunitexp = parseInt(field.value) || 30;
          break;
        case 'trafficunitcomb':
          trafficunitcomb = parseInt(field.value) || 0;
          break;
        case 'limitcomb':
          limitcomb = parseInt(field.value) || 0;
          break;
      }
    }
  }

  // Also check direct metadata properties
  username = username || (typeof metadata.username === 'string' ? metadata.username : '');
  srvid = srvid || (typeof metadata.srvid === 'string' ? metadata.srvid : '');
  timeunitexp = timeunitexp || (typeof metadata.timeunitexp === 'number' ? metadata.timeunitexp : 30);
  trafficunitcomb = trafficunitcomb || (typeof metadata.trafficunitcomb === 'number' ? metadata.trafficunitcomb : 0);
  limitcomb = limitcomb || (typeof metadata.limitcomb === 'number' ? metadata.limitcomb : 0);

  return {
    username,
    srvid,
    timeunitexp,
    trafficunitcomb,
    limitcomb
  };
}

export async function POST(request: NextRequest) {
  try {
    // Validate webhook source IP (if enabled)
    if (!validateWebhookSource(request)) {
      console.error('Webhook request from unauthorized source');
      return NextResponse.json({ error: 'Unauthorized source' }, { status: 403 });
    }

    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      console.error('Missing Paystack signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify signature
    if (!verifyPaystackSignature(body, signature)) {
      console.error('Invalid Paystack signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Parse the webhook event
    const event: PaystackWebhookEvent = JSON.parse(body);
    
    // Handle double-encoded metadata from Paystack
    // Paystack sometimes sends metadata as a JSON string instead of an object
    if (typeof event.data.metadata === 'string') {
      try {
        event.data.metadata = JSON.parse(event.data.metadata);
        console.log('Parsed double-encoded metadata from Paystack');
      } catch (parseError) {
        console.error('Failed to parse metadata string:', parseError);
        // Continue with string metadata - extractPaymentMetadata will handle it
      }
    }
    
    console.log('Received Paystack webhook event:', event.event, 'Reference:', event.data.reference);

    // Handle successful charge event
    if (event.event === 'charge.success') {
      const { reference } = event.data;
      
      // Get client IP for rate limiting
      const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                       request.headers.get('x-real-ip') ||
                       'unknown';
      
      // Rate limiting per IP to prevent flooding with different references
      if (checkRateLimit(`webhook:ip:${clientIp}`, 20, 60000)) { // Max 20 requests per minute per IP
        console.error('Rate limit exceeded for IP:', clientIp);
        return rateLimitResponse(60);
      }
      
      // Validate payment reference
      let safeReference: string;
      try {
        safeReference = validatePaystackReference(reference);
      } catch (error) {
        console.error('Invalid payment reference:', error);
        return NextResponse.json({ error: 'Invalid payment reference' }, { status: 400 });
      }
      
      // Rate limiting per reference to prevent replay attacks
      if (checkRateLimit(`webhook:ref:${safeReference}`, 5, 300000)) { // Max 5 attempts per 5 minutes per reference
        console.error('Rate limit exceeded for reference:', safeReference);
        return rateLimitResponse(300);
      }
      
      // Check if this transaction has already been processed (idempotency check)
      const existingTransaction = await checkExistingTransaction(safeReference);
      if (existingTransaction) {
        console.log('Transaction already processed:', safeReference);
        return NextResponse.json({ message: 'Already processed' }, { status: 200 });
      }

      // Extract and validate payment metadata
      const rawMetadata = extractPaymentMetadata(event);
      
      // Check for required fields first
      if (!rawMetadata.username || !rawMetadata.srvid) {
        console.error('Missing required metadata fields:', { 
          hasUsername: !!rawMetadata.username, 
          hasSrvid: !!rawMetadata.srvid 
        });
        return NextResponse.json({ 
          error: 'Missing required metadata fields (username and srvid required)' 
        }, { status: 400 });
      }
      
      // Validate all metadata fields
      let username: string, srvid: number, timeunitexp: number, trafficunitcomb: number, limitcomb: number;
      try {
        username = sanitizeUsername(rawMetadata.username);
        srvid = validateServicePlanId(rawMetadata.srvid);
        timeunitexp = validateDays(rawMetadata.timeunitexp);
        trafficunitcomb = validateTraffic(rawMetadata.trafficunitcomb);
        limitcomb = validateTraffic(rawMetadata.limitcomb); // Also validate limitcomb
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'unknown error';
        console.error('Invalid metadata values:', errorMessage);
        return NextResponse.json({ error: `Invalid metadata: ${errorMessage}` }, { status: 400 });
      }

      try {
        // Get current user data to determine existing expiry
        let currentExpiry: string | undefined;
        
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
            
            // Parse RADIUS response to get current expiry
            if (typeof userData === 'object' && userData !== null) {
              const resultCode = userData["0"];
              if (resultCode === 0 && userData.expiry) {
                currentExpiry = userData.expiry;
                console.log('Current user expiry from RADIUS:', currentExpiry);
              }
            }
          }
        } catch (userError) {
          console.error('Error fetching user data for expiry:', userError);
          // Continue without current expiry - will default to adding from now
        }

        // Create a preliminary transaction record to prevent race conditions
        // This will fail if the main API already created one
        try {
          const paymentAmount = event.data.amount / 100; // Convert from kobo to naira
          
          const preliminaryTransaction = {
            username: username,
            service_plan_id: srvid, // Already validated as number
            service_plan_name: `Service Plan ${srvid}`,
            amount_paid: paymentAmount,
            commission_rate: 0, // Will be updated later
            commission_amount: 0, // Will be updated later
            paystack_reference: event.data.reference,
            payment_status: 'processing' as const, // Mark as processing initially
            renewal_period_days: timeunitexp,
            renewal_start_date: new Date().toISOString(),
            renewal_end_date: new Date(Date.now() + timeunitexp * 24 * 60 * 60 * 1000).toISOString(),
            customer_location: '',
          };

          const preliminaryRecord = await createRenewalTransaction(preliminaryTransaction);
          if (!preliminaryRecord) {
            console.log('Failed to create preliminary transaction record - likely already processed');
            return NextResponse.json({ message: 'Already processed' }, { status: 200 });
          }
          console.log('Created preliminary transaction record:', preliminaryRecord.id);
        } catch (transactionError) {
          console.log('Transaction already exists (race condition prevented):', transactionError);
          return NextResponse.json({ message: 'Already processed' }, { status: 200 });
        }

        // Add credits to user account
        const trafficToAdd = limitcomb === 0 ? 0 : trafficunitcomb * 1048576; // Convert MB to bytes
        const creditsResult = await addCreditsToUser(username, timeunitexp, trafficToAdd, currentExpiry);

        if (!creditsResult.success) {
          console.error('Failed to add credits for:', username);
          return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
        }

        console.log('Credits added successfully via webhook for:', username);

        // Record transaction for commission tracking
        await recordTransaction(event, creditsResult.newExpiry);

        return NextResponse.json({ 
          message: 'Webhook processed successfully',
          reference: reference,
          username: username
        }, { status: 200 });

      } catch (error) {
        console.error('Error processing webhook:', error);
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
      }
    }

    // Handle other events (optional)
    console.log('Unhandled webhook event:', event.event);
    return NextResponse.json({ message: 'Event noted' }, { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Check if transaction already exists (for idempotency)
async function checkExistingTransaction(reference: string): Promise<boolean> {
  try {
    // Check if transaction already exists in database
    const { data: existingTransactions } = await supabaseAdmin
      .from('renewal_transactions')
      .select('id, paystack_reference')
      .eq('paystack_reference', reference)
      .limit(1);

    if (existingTransactions && existingTransactions.length > 0) {
      console.log('Transaction already exists in database:', reference);
      return true;
    }

    console.log('No existing transaction found for reference:', reference);
    return false;
  } catch (error) {
    console.error('Error checking existing transaction:', error);
    // If we can't check, assume it doesn't exist to avoid blocking legitimate payments
    return false;
  }
}

// Record transaction in database
async function recordTransaction(event: PaystackWebhookEvent, newExpiry?: string) {
  try {
    const { username, srvid, timeunitexp } = extractPaymentMetadata(event);
    const paymentAmount = event.data.amount / 100; // Convert from kobo to naira

    // Get service plan details to get the actual service plan name
    let servicePlanName = `Service Plan ${srvid}`;
    try {
      const serviceUrl = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${RADIUS_API_CONFIG.apiuser}&apipass=${RADIUS_API_CONFIG.apipass}&q=get_srv&srvid=${srvid}`;
      const serviceResponse = await fetch(serviceUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Connekt-NextJS-App/1.0',
        },
      });

      if (serviceResponse.ok) {
        const serviceResult = await serviceResponse.text();
        const serviceData = JSON.parse(serviceResult);
        
        // Parse service plan response: [0, [{"srvid":"78","srvname":"test-unlimited-25K",...}]]
        if (Array.isArray(serviceData) && serviceData.length >= 2) {
          const resultCode = serviceData[0];
          const serviceDataArray = serviceData[1];
          
          if (resultCode === 0 && Array.isArray(serviceDataArray) && serviceDataArray.length > 0) {
            const servicePlan = serviceDataArray[0];
            servicePlanName = servicePlan.srvname || `Service Plan ${srvid}`;
            console.log(`Service plan name: ${servicePlanName}`);
          }
        }
      }
    } catch (serviceError) {
      console.error('Error fetching service plan details:', serviceError);
      servicePlanName = `Service Plan ${srvid}`; // Fallback
    }

    // Get user data from RADIUS API to extract owner information and customer details
    let radiusOwner = '';
    let customerData: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
    } = {};
    
    try {
      const radiusUrl = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${RADIUS_API_CONFIG.apiuser}&apipass=${RADIUS_API_CONFIG.apipass}&q=get_userdata&username=${encodeURIComponent(username)}`;
      const radiusResponse = await fetch(radiusUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Connekt-NextJS-App/1.0',
        },
      });

      if (radiusResponse.ok) {
        const radiusResult = await radiusResponse.text();
        const radiusData = JSON.parse(radiusResult);
        
        // Parse RADIUS response (same format as in user API)
        if (typeof radiusData === 'object' && radiusData !== null) {
          const resultCode = radiusData["0"];
          const userData = radiusData["1"];
          
          if (resultCode === 0 && userData) {
            radiusOwner = userData.owner || '';
            customerData = {
              first_name: userData.firstname || '',
              last_name: userData.lastname || '',
              email: userData.email || '',
              phone: userData.phone || userData.mobile || '',
              address: userData.address || '',
              city: userData.city || '',
              state: userData.state || '',
              country: userData.country || '',
            };
            
            console.log(`Customer ${username} has owner: ${radiusOwner}`);
          }
        }
      }
    } catch (radiusError) {
      console.error('Error fetching RADIUS user data:', radiusError);
      // Continue without owner assignment if RADIUS fails
    }

    // Get or create customer with enhanced data
    let customer = await getCustomerByUsername(username);
    
    if (customer) {
      // Update existing customer with latest data from RADIUS
      const updateData: {
        username: string;
        last_renewal_date: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        account_owner_id?: string;
      } = {
        ...customerData,
        username: username,
        last_renewal_date: new Date().toISOString(),
      };
      
      // If customer doesn't have an owner but RADIUS has one, assign it
      if (!customer.account_owner_id && radiusOwner) {
        const owner = await getAccountOwnerByUsername(radiusOwner);
        if (owner) {
          updateData.account_owner_id = owner.id;
          console.log(`Assigning customer ${username} to owner ${owner.name} (${radiusOwner})`);
        }
      }
      
      const updatedCustomer = await createOrUpdateCustomer(updateData);
      if (updatedCustomer) {
        customer = updatedCustomer;
      }
    } else {
      // Create new customer record
      console.log('Customer not found in database - creating new record');
      
      const newCustomerData: {
        username: string;
        last_renewal_date: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        account_owner_id?: string;
      } = {
        username: username,
        ...customerData,
        last_renewal_date: new Date().toISOString(),
      };
      
      // Assign owner if found in RADIUS
      if (radiusOwner) {
        const owner = await getAccountOwnerByUsername(radiusOwner);
        if (owner) {
          newCustomerData.account_owner_id = owner.id;
          console.log(`Creating customer ${username} with owner ${owner.name} (${radiusOwner})`);
        } else {
          console.log(`Warning: Owner '${radiusOwner}' from RADIUS not found in database`);
        }
      }
      
      const newCustomer = await createOrUpdateCustomer(newCustomerData);
      if (newCustomer) {
        customer = newCustomer;
      }
    }

    // Get account owner for commission calculation
    let accountOwner = null;
    let commissionAmount = 0;
    
    if (customer?.account_owner_id) {
      try {
        const { getAccountOwner, calculateCommission } = await import('@/lib/database');
        accountOwner = await getAccountOwner(customer.account_owner_id);
        if (accountOwner && paymentAmount > 0) {
          commissionAmount = calculateCommission(paymentAmount, accountOwner.commission_rate);
          console.log(`Commission calculated: ${commissionAmount} (${accountOwner.commission_rate}% of ${paymentAmount}) for owner: ${accountOwner.name}`);
        }
      } catch (commissionError) {
        console.error('Error fetching account owner by username:', commissionError);
        // Fallback to simple 10% calculation
        commissionAmount = paymentAmount * 0.1;
      }
    } else {
      console.log('No owner assigned to customer - no commission will be tracked');
    }

    // Update the existing preliminary transaction record
    const updateData = {
      customer_id: customer?.id,
      account_owner_id: customer?.account_owner_id,
      service_plan_name: servicePlanName, // Use actual service plan name
      commission_rate: accountOwner ? accountOwner.commission_rate : 0,
      commission_amount: commissionAmount,
      payment_status: 'success' as const, // Update from 'processing' to 'success'
      renewal_end_date: newExpiry || new Date(Date.now() + timeunitexp * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Update the existing transaction
    const { data: updatedTransaction } = await supabaseAdmin
      .from('renewal_transactions')
      .update(updateData)
      .eq('paystack_reference', event.data.reference)
      .select('id')
      .single();

    console.log('Transaction updated via webhook:', updatedTransaction?.id);

  } catch (error) {
    console.error('Error updating transaction via webhook:', error);
    // Don't throw - we don't want to fail the webhook for database issues
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}