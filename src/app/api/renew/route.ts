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
  trafficunitcomb?: number;
  limitcomb?: number;
  currentExpiry?: string; // Add current user expiry for proper date calculation
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

// Convert traffic units to bytes based on service plan configuration
const convertTrafficToBytes = (trafficValue: number, limitValue: number): number => {
  // If limitValue is 0, it's an unlimited plan - no data to add
  if (limitValue === 0) {
    return 0;
  }
  
  // trafficunitcomb is typically in MB (based on screenshots showing 4572)
  // Convert MB to bytes: 1 MB = 1,048,576 bytes
  const bytesValue = trafficValue * 1048576;
  
  console.log(`Converting traffic: ${trafficValue} MB -> ${bytesValue} bytes`);
  return bytesValue;
};

// Calculate proper expiry date based on current expiry and days to add
const calculateNewExpiry = (currentExpiry: string | undefined, daysToAdd: number): Date => {
  const now = new Date();
  let baseDate = now;
  let totalDaysToAdd = daysToAdd;
  
  if (currentExpiry && currentExpiry !== '0000-00-00' && currentExpiry !== '0000-00-00 00:00:00') {
    try {
      const currentExpiryDate = new Date(currentExpiry);
      
      // If current expiry is in the future, use it as base date
      if (currentExpiryDate > now) {
        baseDate = currentExpiryDate;
        console.log(`Current expiry ${currentExpiry} is in future, adding ${daysToAdd} days to it`);
      } else {
        // Calculate calendar days between expired date and current date
        // Use date-only comparison to avoid timezone and time-of-day issues
        const currentExpiryDateOnly = new Date(currentExpiryDate.getFullYear(), currentExpiryDate.getMonth(), currentExpiryDate.getDate());
        const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Calculate the difference in days using UTC to avoid timezone issues
        const timeDiff = nowDateOnly.getTime() - currentExpiryDateOnly.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        
        // Only add gap days if the account is actually expired (daysDiff > 0)
        const gapDays = Math.max(0, daysDiff);
        
        // Total days to add = gap days + service plan days
        totalDaysToAdd = gapDays + daysToAdd;
        
        console.log(`Current expiry ${currentExpiry} is in past`);
        console.log(`Days expired (gap): ${gapDays}`);
        console.log(`Service plan days: ${daysToAdd}`);
        console.log(`Total days to add from current date: ${totalDaysToAdd}`);
      }
    } catch (parseError) {
      console.log(`Invalid expiry date ${currentExpiry}, using current date as base:`, parseError);
    }
  } else {
    console.log(`No valid expiry date provided, using current date as base`);
  }
  
  // Add the calculated number of days to the base date
  const newExpiry = new Date(baseDate);
  newExpiry.setDate(newExpiry.getDate() + totalDaysToAdd);
  
  return newExpiry;
};

// Add credits to user via RADIUS Manager (handles both time and traffic credits)
const addCreditsToUser = async (
  username: string, 
  daysToAdd: number, 
  trafficToAdd: number = 0,
  currentExpiry?: string
): Promise<AddCreditsResponse> => {
  try {
    // Calculate proper expiry based on current expiry and days to add
    const newExpiryDate = calculateNewExpiry(currentExpiry, daysToAdd);
    const formattedExpiry = newExpiryDate.toISOString().slice(0, 19).replace('T', ' '); // Format: YYYY-MM-DD HH:MM:SS
    
    // Calculate the actual days to send to RADIUS API
    // This should be the total days from current date to new expiry
    const now = new Date();
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const newExpiryDateOnly = new Date(newExpiryDate.getFullYear(), newExpiryDate.getMonth(), newExpiryDate.getDate());
    
    const timeDiff = newExpiryDateOnly.getTime() - nowDateOnly.getTime();
    const totalDaysForRadius = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    console.log(`Calculated new expiry: ${formattedExpiry} (adding ${daysToAdd} days)`);
    console.log(`Total days to send to RADIUS API: ${totalDaysForRadius}`);
    
    // Build URL with query parameters (same as other RADIUS API calls)
    // For add_credits API: dlbytes=0, ulbytes=0, totalbytes=dataAmount, expiry=days, unit=DAY, onlinetime=0
    const url = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${RADIUS_API_CONFIG.apiuser}&apipass=${RADIUS_API_CONFIG.apipass}&q=add_credits&username=${encodeURIComponent(username)}&dlbytes=0&ulbytes=0&totalbytes=${trafficToAdd}&expiry=${totalDaysForRadius}&unit=DAY&onlinetime=0`;

    console.log('Adding credits to user:', username);
    console.log('- Days to add:', daysToAdd);
    console.log('- Traffic to add (bytes):', trafficToAdd);
    console.log('- Calculated new expiry:', formattedExpiry);
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
        const responseExpiry = parsed[5]; // expirydate is at index 5
        console.log('Credits added successfully, response expiry:', responseExpiry);
        
        // Use the calculated expiry as it's more reliable than the API response
        return { 
          success: true, 
          newExpiry: formattedExpiry, // Use our calculated expiry
          data: {
            dlbytes: parsed[1] || 0,
            ulbytes: parsed[2] || 0, 
            totalbytes: parsed[3] || 0,
            onlinetime: parsed[4] || 0
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
    const { reference, username, srvid, timeunitexp, trafficunitcomb, limitcomb, currentExpiry } = body;

    console.log('Processing renewal:', { 
      reference, 
      username, 
      srvid, 
      timeunitexp, 
      trafficunitcomb, 
      limitcomb,
      currentExpiry 
    });

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

    // Step 2: Calculate traffic to add based on service plan
    // - For unlimited plans (limitcomb = 0): only add time (days)
    // - For traffic-based plans: add both time and traffic
    const isUnlimitedPlan = !limitcomb || limitcomb === 0;
    const trafficToAdd = isUnlimitedPlan ? 0 : convertTrafficToBytes(trafficunitcomb || 0, limitcomb || 0);
    
    console.log('Service plan analysis:');
    console.log('- Is unlimited plan:', isUnlimitedPlan);
    console.log('- Traffic unit from plan:', trafficunitcomb);
    console.log('- Limit combined:', limitcomb);
    console.log('- Traffic to add (bytes):', trafficToAdd);
    
    // Step 3: Add credits to user account
    const addCreditsResult = await addCreditsToUser(username, timeunitexp, trafficToAdd, currentExpiry);
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
        trafficBytes: trafficToAdd,
        trafficMB: isUnlimitedPlan ? 'unlimited' : Math.round(trafficToAdd / 1048576)
      },
      planType: isUnlimitedPlan ? 'unlimited' : 'limited'
    });

  } catch (error) {
    console.error('Renewal API error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
} 