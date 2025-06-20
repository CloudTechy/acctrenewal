import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();

    const {
      username,
      password,
      firstname,
      lastname,
      email,
      address,
      city,
      state,
      phone,
      srvid,
      enabled = 1,
      acctype = 0
    } = userData;

    // Validate required fields
    if (!username || !password || !firstname || !lastname || !email || !srvid) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      );
    }

    const apiUser = process.env.RADIUS_API_USER;
    const apiPass = process.env.RADIUS_API_PASS;
    const baseUrl = process.env.RADIUS_API_URL;

    if (!apiUser || !apiPass || !baseUrl) {
      return NextResponse.json(
        { error: 'Radius Manager configuration missing' },
        { status: 500 }
      );
    }

    // Extract base URL without the specific endpoint
    const radiusBaseUrl = baseUrl.replace('/api/sysapi.php', '');

    // Construct the API URL for creating new user - using correct endpoint
    const params = new URLSearchParams({
      apiuser: apiUser,
      apipass: apiPass,
      q: 'new_user',
      username,
      password,
      enabled: enabled.toString(),
      acctype: acctype.toString(),
      srvid,
      firstname,
      lastname,
      email,
      phone: phone || username,
      ...(address && { address }),
      ...(city && { city }),
      ...(state && { state })
    });

    const apiUrl = `${radiusBaseUrl}/api/sysapi.php?${params.toString()}`;

    console.log('Register User API URL:', apiUrl); // Debug log

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to register user');
    }

    const data = await response.json();
    
    console.log('Register User API Response:', data); // Debug log
    
    // Check if the registration was successful
    if (data[0] === 0) {
      // Success
      return NextResponse.json({
        success: true,
        message: data[1] || 'User registered successfully',
        user: {
          username,
          firstname,
          lastname,
          email
        }
      });
    } else {
      // Error from Radius Manager
      return NextResponse.json({
        success: false,
        error: data[1] || 'Registration failed'
      });
    }

  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
} 