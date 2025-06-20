import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
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

    // Construct the API URL for checking user - using query parameters like the PHP example
    const apiUrl = `${radiusBaseUrl}/api/sysapi.php?apiuser=${apiUser}&apipass=${apiPass}&q=get_userdata&username=${encodeURIComponent(username)}`;

    console.log('API URL:', apiUrl); // Debug log

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check user');
    }

    const data = await response.json();
    
    console.log('API Response:', data); // Debug log
    
    // Return the response as-is from Radius Manager
    // [1, "User not found!"] means user doesn't exist (good)
    // [0, {...user data...}] means user exists (already registered)
    return NextResponse.json({
      code: data[0],
      message: data[1],
      success: true
    });

  } catch (error) {
    console.error('Error checking user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 