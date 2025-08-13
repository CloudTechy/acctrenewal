import { NextRequest, NextResponse } from 'next/server';
import { generateHotspotPassword } from '@/lib/password-utils';

// DMA Radius Manager API configuration
const RADIUS_API_CONFIG = {
  baseUrl: process.env.RADIUS_API_URL || 'http://161.35.46.125/radiusmanager/api/sysapi.php',
  apiuser: process.env.RADIUS_API_USER || 'api',
  apipass: process.env.RADIUS_API_PASS || 'api123'
};

interface ResetWiFiPinRequest {
  username: string;
  phone: string;
}

interface ResetWiFiPinResponse {
  success: boolean;
  message: string;
  newPin?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ResetWiFiPinResponse>> {
  try {
    const { username, phone }: ResetWiFiPinRequest = await request.json();

    if (!username || !phone) {
      return NextResponse.json(
        { success: false, message: 'Username and phone number are required' },
        { status: 400 }
      );
    }

    // Generate new 4-digit PIN
    const newPin = generateHotspotPassword();
    
    // Extract base URL without the specific endpoint
    const radiusBaseUrl = RADIUS_API_CONFIG.baseUrl.replace('/api/sysapi.php', '');

    // Update user password in DMA Radius Manager using edit_user API
    const editUserParams = new URLSearchParams({
      apiuser: RADIUS_API_CONFIG.apiuser,
      apipass: RADIUS_API_CONFIG.apipass,
      q: 'edit_user',
      username,
      password: newPin
    });

    const editUserUrl = `${radiusBaseUrl}/api/sysapi.php?${editUserParams.toString()}`;
    
    console.log('Updating WiFi PIN for user:', username);
    console.log('Edit User API URL:', editUserUrl.replace(RADIUS_API_CONFIG.apipass, '***'));

    const editUserResponse = await fetch(editUserUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!editUserResponse.ok) {
      throw new Error('Failed to update user password in Radius Manager');
    }

    const editUserData = await editUserResponse.json();
    
    // Check if the password update was successful
    if (editUserData[0] !== 0) {
      return NextResponse.json({
        success: false,
        message: editUserData[1] || 'Failed to update WiFi PIN in Radius Manager'
      }, { status: 400 });
    }

    console.log('WiFi PIN updated successfully in Radius Manager');

    // Send SMS confirmation with new PIN
    // Optimized message format to fit within 1 SMS page (160 chars)
    const smsMessage = `WiFi PIN reset successfully! New PIN: ${newPin}. Login: ${username}. Contact support if not requested. Thank you for using sabiwifi.com`;
    
    const smsParams = new URLSearchParams({
      apiuser: RADIUS_API_CONFIG.apiuser,
      apipass: RADIUS_API_CONFIG.apipass,
      q: 'send_sms',
      recp: phone,
      body: smsMessage
    });

    const smsUrl = `${radiusBaseUrl}/api/sysapi.php?${smsParams.toString()}`;
    
    console.log('Sending SMS confirmation to:', phone);
    console.log('SMS API URL:', smsUrl.replace(RADIUS_API_CONFIG.apipass, '***'));

    const smsResponse = await fetch(smsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!smsResponse.ok) {
      console.warn('Failed to send SMS confirmation (HTTP error), but PIN was updated successfully');
    } else {
      const smsData = await smsResponse.json();
      if (smsData[0] === 0) {
        console.log('SMS confirmation sent successfully');
      } else {
        console.warn('SMS sending failed:', smsData[1]);
        console.warn('SMS Error Details:', {
          errorCode: smsData[0],
          errorMessage: smsData[1],
          phone: phone,
          messageLength: smsMessage.length
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'WiFi PIN reset successfully. New PIN has been sent to your phone.',
      newPin: newPin
    });

  } catch (error) {
    console.error('Error resetting WiFi PIN:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to reset WiFi PIN. Please try again.' 
      },
      { status: 500 }
    );
  }
}
