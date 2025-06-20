import { NextResponse } from 'next/server';

export async function GET() {
  try {
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

    // Construct the API URL for getting service plans - using correct endpoint
    const apiUrl = `${radiusBaseUrl}/api/sysapi.php?apiuser=${apiUser}&apipass=${apiPass}&q=get_srv`;

    console.log('Service Plans API URL:', apiUrl); // Debug log

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch service plans');
    }

    const data = await response.json();
    
    console.log('Service Plans API Response:', data); // Debug log
    
    // Check if the response is successful
    if (data[0] === 0) {
      // Success - data[1] contains the service plans array
      const plans = Array.isArray(data[1]) ? data[1] : [];
      
      return NextResponse.json({
        success: true,
        plans: plans
      });
    } else {
      // Error from Radius Manager
      return NextResponse.json({
        success: false,
        error: data[1] || 'Failed to fetch service plans'
      });
    }

  } catch (error) {
    console.error('Error fetching service plans:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
} 