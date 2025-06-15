import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createRenewalTransaction, getCustomerByUsername, createOrUpdateCustomer, getAccountOwnerByUsername } from '@/lib/database';

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

// RADIUS Manager configuration
const RADIUS_API_CONFIG = {
  baseUrl: process.env.RADIUS_API_URL || 'http://161.35.46.125/radiusmanager/api/sysapi.php',
  apiuser: process.env.RADIUS_API_USER || 'api',
  apipass: process.env.RADIUS_API_PASS || 'api123'
};

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
  trafficToAdd: number = 0
): Promise<{ success: boolean; newExpiry?: string }> {
  try {
    const url = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${RADIUS_API_CONFIG.apiuser}&apipass=${RADIUS_API_CONFIG.apipass}&q=add_credits&username=${encodeURIComponent(username)}&dlbytes=0&ulbytes=0&totalbytes=${trafficToAdd}&expiry=${daysToAdd}&unit=DAY&onlinetime=0`;

    console.log('Adding credits to user via webhook:', username);
    console.log('- Days to add:', daysToAdd);
    console.log('- Traffic to add (bytes):', trafficToAdd);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'PHSWEB-NextJS-App/1.0',
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
          
          // Calculate new expiry date
          const newExpiry = new Date();
          newExpiry.setDate(newExpiry.getDate() + daysToAdd);
          
          return { 
            success: true, 
            newExpiry: newExpiry.toISOString()
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
    console.log('Received Paystack webhook event:', event.event, 'Reference:', event.data.reference);

    // Handle successful charge event
    if (event.event === 'charge.success') {
      const { reference } = event.data;
      
      // Check if this transaction has already been processed (idempotency check)
      const existingTransaction = await checkExistingTransaction(reference);
      if (existingTransaction) {
        console.log('Transaction already processed:', reference);
        return NextResponse.json({ message: 'Already processed' }, { status: 200 });
      }

      // Extract payment metadata
      const { username, srvid, timeunitexp, trafficunitcomb, limitcomb } = extractPaymentMetadata(event);

      if (!username || !srvid) {
        console.error('Missing required metadata:', { username, srvid });
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      try {
        // Add credits to user account
        const trafficToAdd = limitcomb === 0 ? 0 : trafficunitcomb * 1048576; // Convert MB to bytes
        const creditsResult = await addCreditsToUser(username, timeunitexp, trafficToAdd);

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
    // This is a simplified check - you should implement this in your database layer
    // For now, we'll assume the createRenewalTransaction function handles duplicates
    console.log('Checking existing transaction for reference:', reference);
    return false;
  } catch (error) {
    console.error('Error checking existing transaction:', error);
    return false;
  }
}

// Record transaction in database
async function recordTransaction(event: PaystackWebhookEvent, newExpiry?: string) {
  try {
    const { username, srvid, timeunitexp } = extractPaymentMetadata(event);
    const paymentAmount = event.data.amount / 100; // Convert from kobo to naira

    // Get or create customer
    let customer = await getCustomerByUsername(username);
    if (!customer) {
      customer = await createOrUpdateCustomer({
        username: username,
        email: event.data.customer.email,
        first_name: event.data.customer.first_name || '',
        last_name: event.data.customer.last_name || '',
        phone: event.data.customer.phone || ''
      });
    }

    // Get account owner (if assigned)
    const accountOwner = await getAccountOwnerByUsername(username);
    const commissionAmount = accountOwner ? (paymentAmount * 0.1) : 0; // 10% commission

    // Create transaction record
    const transactionData = {
      customer_id: customer?.id,
      account_owner_id: accountOwner?.id,
      username: username,
      service_plan_id: parseInt(srvid) || 0,
      service_plan_name: `Service Plan ${srvid}`,
      amount_paid: paymentAmount,
      commission_rate: accountOwner ? 10.00 : 0,
      commission_amount: commissionAmount,
      paystack_reference: event.data.reference,
      payment_status: 'success',
      renewal_period_days: timeunitexp,
      renewal_start_date: new Date().toISOString(),
      renewal_end_date: newExpiry || new Date(Date.now() + timeunitexp * 24 * 60 * 60 * 1000).toISOString(),
      customer_location: '',
    };

    const transaction = await createRenewalTransaction(transactionData);
    console.log('Transaction recorded via webhook:', transaction?.id);

  } catch (error) {
    console.error('Error recording transaction via webhook:', error);
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