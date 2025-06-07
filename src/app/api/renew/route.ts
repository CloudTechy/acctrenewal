import { NextRequest, NextResponse } from 'next/server';

interface RenewalRequest {
  reference: string;
  username: string;
  srvid: number;
  timeunitexp: number;
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

// Add credits to user via RADIUS Manager (automatically handles expiry extension)
const addCreditsToUser = async (username: string, daysToAdd: number): Promise<AddCreditsResponse> => {
  try {
    const formData = new FormData();
    formData.append('apiuser', process.env.RADIUS_API_USER || '');
    formData.append('apipass', process.env.RADIUS_API_PASS || '');
    formData.append('q', 'add_credits');
    formData.append('username', username);
    formData.append('dlbytes', '0');  // No download traffic to add
    formData.append('ulbytes', '0');  // No upload traffic to add  
    formData.append('totalbytes', '0'); // No total traffic to add
    formData.append('expiry', daysToAdd.toString()); // Number of days to add
    formData.append('unit', 'DAY');   // Unit is days
    formData.append('onlinetime', '0'); // No online time to add

    console.log('Adding credits to user:', username, 'with', daysToAdd, 'days');

    const response = await fetch('http://161.35.46.125/radiusmanager/api/sysapi.php', {
      method: 'POST',
      body: formData,
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
    const { reference, username, srvid, timeunitexp } = body;

    console.log('Processing renewal:', { reference, username, srvid, timeunitexp });

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

    // Step 2: Add credits (days) to user account - RADIUS Manager handles the expiry logic
    const addCreditsResult = await addCreditsToUser(username, timeunitexp);
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
      reference: reference
    });

  } catch (error) {
    console.error('Renewal API error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
} 