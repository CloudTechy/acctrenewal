import { NextRequest, NextResponse } from 'next/server';

interface RenewalRequest {
  reference: string;
  username: string;
  srvid: number;
  timeunitexp: number;
  trafficunitcomb?: number;
  limitcomb?: number;
  currentExpiry?: string; // Add current user expiry for proper date calculation
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

export async function POST(request: NextRequest) {
  try {
    const body: RenewalRequest = await request.json();
    const { reference, username, srvid, timeunitexp, trafficunitcomb, limitcomb, currentExpiry } = body;

    console.log('Main API renewal request received:', { 
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

    // WEBHOOK-ONLY PROCESSING: Main API no longer processes payments
    // This prevents double processing since webhooks are more reliable
    console.log('🚫 Main API processing disabled - using webhook-only processing for reliability');
    console.log('Payment will be processed by Paystack webhook automatically');
    
    // Verify payment exists (for validation) but don't process it
    const isPaymentVerified = await verifyPaystackTransaction(reference);
    if (!isPaymentVerified) {
      return NextResponse.json({ 
        error: 'Payment verification failed' 
      }, { status: 400 });
    }

    console.log('✅ Payment verified - webhook will handle processing');

    // Return success response indicating webhook processing
    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully. Account renewal will be processed automatically via webhook.',
      reference: reference,
      username: username,
      processing_method: 'webhook',
      note: 'Credits will be added to your account within a few seconds via our secure webhook system.'
    }, { status: 200 });

  } catch (error) {
    console.error('Main API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'Payment processing failed. Please contact support if your payment was successful but account was not renewed.'
    }, { status: 500 });
  }
} 