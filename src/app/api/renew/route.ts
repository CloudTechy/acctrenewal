import { NextRequest, NextResponse } from 'next/server';

// Server-side API configuration (same as user API for consistency)
const RADIUS_API_CONFIG = {
  baseUrl: process.env.RADIUS_API_URL || 'http://161.35.46.125/radiusmanager/api/sysapi.php',
  apiuser: process.env.RADIUS_API_USER || 'api',
  apipass: process.env.RADIUS_API_PASS || 'api123'
};

interface RenewalRequest {
  reference: string;
  username: string;
  srvid: number;
  timeunitexp: number;
  trafficunitcomb?: number; // Add traffic unit for combined traffic plans
}

interface AddCreditsResponse {
  success: boolean;
  newExpiry?: string;
  data?: {
    dlbytes: number;
    ulbytes: number;
    totalbytes: number;
    onlinetime: number;
  };
}

// Verify Paystack transaction
const verifyPaystackTransaction = async (reference: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Paystack verification failed:', response.statusText);
      return false;
    }

    const data = await response.json();
    console.log('Paystack verification response:', data);
    
    return data.status === true && data.data.status === 'success';
  } catch (error) {
    console.error('Error verifying Paystack transaction:', error);
    return false;
  }
};

// Add credits to user via RADIUS Manager (handles both time and traffic credits)
const addCreditsToUser = async (
  username: string, 
  daysToAdd: number, 
  trafficToAdd: number = 0
): Promise<AddCreditsResponse> => {
  try {
    // Build URL with query parameters (same as other RADIUS API calls)
    const url = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${RADIUS_API_CONFIG.apiuser}&apipass=${RADIUS_API_CONFIG.apipass}&q=add_credits&username=${encodeURIComponent(username)}&dlbytes=0&ulbytes=0&totalbytes=${trafficToAdd}&expiry=${daysToAdd}&unit=DAY&onlinetime=0`;

    console.log('Adding credits to user:', username, 'with', daysToAdd, 'days and', trafficToAdd, 'bytes of traffic');
    console.log('Using RADIUS API endpoint:', RADIUS_API_CONFIG.baseUrl);
    console.log('Making RADIUS API call to:', url.replace(RADIUS_API_CONFIG.apipass, '***'));

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'PHSWEB-NextJS-App/1.0',
      },
    });

    if (!response.ok) {
      console.error('RADIUS add_credits failed:', response.statusText);
      return { success: false };
    }

    const result = await response.text();
    console.log('RADIUS add_credits response:', result);
    
    // Parse response - success returns [0, dlbytes, ulbytes, totalbytes, onlinetime, expirydate]
    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed) && parsed[0] === 0) {
        // Success - extract the new expiry date from response
        const newExpiry = parsed[5]; // expirydate is at index 5
        console.log('Credits added successfully, new expiry:', newExpiry);
        return { 
          success: true, 
          newExpiry: newExpiry,
          data: {
            dlbytes: parsed[1],
            ulbytes: parsed[2], 
            totalbytes: parsed[3],
            onlinetime: parsed[4]
          }
        };
      } else {
        console.error('RADIUS add_credits error:', parsed[1] || 'Unknown error');
        return { success: false };
      }
    } catch (parseError) {
      console.error('Error parsing add_credits response:', parseError);
      return { success: false };
    }
  } catch (error) {
    console.error('Error adding credits to user:', error);
    return { success: false };
  }
};

export async function POST(request: NextRequest) {
  try {
    const body: RenewalRequest = await request.json();
    const { reference, username, srvid, timeunitexp, trafficunitcomb } = body;

    console.log('Processing renewal:', { reference, username, srvid, timeunitexp, trafficunitcomb });

    // Validate required fields
    if (!reference || !username || !srvid || !timeunitexp) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Step 1: Verify payment with Paystack
    const isPaymentVerified = await verifyPaystackTransaction(reference);
    if (!isPaymentVerified) {
      return NextResponse.json({ 
        error: 'Payment verification failed' 
      }, { status: 400 });
    }

    console.log('Payment verified successfully');

    // Step 2: Add credits to user account
    // - For unlimited plans: only add time (days)
    // - For traffic-based plans: add both time and traffic
    const trafficToAdd = trafficunitcomb || 0; // Use traffic unit from service plan, default to 0 for unlimited
    
    const addCreditsResult = await addCreditsToUser(username, timeunitexp, trafficToAdd);
    if (!addCreditsResult.success) {
      return NextResponse.json({ 
        error: 'Failed to add credits to account' 
      }, { status: 500 });
    }

    console.log('Account renewal completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Account renewed successfully',
      newExpiry: addCreditsResult.newExpiry,
      remainingData: addCreditsResult.data,
      reference: reference,
      creditsAdded: {
        days: timeunitexp,
        traffic: trafficToAdd
      }
    });

  } catch (error) {
    console.error('Renewal API error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
} 