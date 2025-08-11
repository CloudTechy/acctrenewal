import { NextRequest, NextResponse } from 'next/server';
import { getCustomerWiFiPin } from '@/lib/database';

/**
 * API endpoint to fetch customer's WiFi PIN by phone number
 * Used for ensuring SMS notifications contain the correct PIN for paid accounts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phone');

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const pin = await getCustomerWiFiPin(phoneNumber);
    
    if (!pin) {
      return NextResponse.json(
        { error: 'Customer not found or PIN not available' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      pin: pin
    });

  } catch (error) {
    console.error('Error fetching customer PIN:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
