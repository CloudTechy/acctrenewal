import { NextRequest, NextResponse } from 'next/server';

// Server-side API configuration (hidden from frontend)
const RADIUS_API_CONFIG = {
  baseUrl: process.env.RADIUS_API_URL || 'http://165.227.177.208/radiusmanager/api/sysapi.php',
  apiuser: process.env.RADIUS_API_USER || 'api',
  apipass: process.env.RADIUS_API_PASS || 'api123'
};

export async function POST(request: NextRequest) {
  try {
    // Log environment check
    console.log('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      RADIUS_API_URL: process.env.RADIUS_API_URL ? 'SET' : 'MISSING',
      RADIUS_API_USER: process.env.RADIUS_API_USER ? 'SET' : 'MISSING',
      RADIUS_API_PASS: process.env.RADIUS_API_PASS ? 'SET' : 'MISSING'
    });

    const { username } = await request.json();
    
    if (!username) {
      console.log('Bad request: Username is required');
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    console.log('Processing request for username:', username);

    // Make API call to RADIUS Manager from server-side
    const url = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${RADIUS_API_CONFIG.apiuser}&apipass=${RADIUS_API_CONFIG.apipass}&q=get_userdata&username=${encodeURIComponent(username)}`;
    
    console.log('RADIUS API Configuration:', {
      baseUrl: RADIUS_API_CONFIG.baseUrl,
      apiuser: RADIUS_API_CONFIG.apiuser,
      hasApipass: !!RADIUS_API_CONFIG.apipass
    });
    console.log('Making RADIUS API call to:', url.replace(RADIUS_API_CONFIG.apipass, '***'));
    console.log('Using credentials:', { apiuser: RADIUS_API_CONFIG.apiuser, apipass: '***' });
    
    // Add fetch options for better error handling
    const fetchOptions: RequestInit = {
      method: 'GET',
      headers: {
        'User-Agent': 'PHSWEB-NextJS-App/1.0',
      },
      // For development only - in production, ensure proper SSL certificates
      ...(process.env.NODE_ENV === 'development' && {
        // Note: Only for development - remove in production
      })
    };
    
    const response = await fetch(url, fetchOptions);
    
    console.log('RADIUS API response status:', response.status);
    console.log('RADIUS API response ok:', response.ok);
    console.log('RADIUS API response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.error(`RADIUS API HTTP error! status: ${response.status}`);
      console.error('Response headers:', response.headers);
      
      // Try to get error details
      const errorText = await response.text();
      console.error('Error response body:', errorText);
      
      return NextResponse.json(
        { 
          error: `RADIUS API error: ${response.status}`,
          details: errorText,
          statusText: response.statusText,
          url: url.replace(RADIUS_API_CONFIG.apipass, '***') // Include URL for debugging
        },
        { status: 500 }
      );
    }
    
    const responseText = await response.text();
    console.log('RADIUS API raw response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('RADIUS API parsed response:', data);
      console.log('Response type:', typeof data);
      console.log('Is array:', Array.isArray(data));
    } catch (parseError) {
      console.error('Failed to parse RADIUS API response as JSON:', parseError);
      console.error('Raw response was:', responseText);
      return NextResponse.json(
        { 
          error: 'Invalid JSON response from RADIUS API',
          rawResponse: responseText 
        },
        { status: 500 }
      );
    }
    
    // Return the RADIUS Manager response
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching user data:', error);
    
    // Enhanced error reporting
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCause = error instanceof Error && 'cause' in error ? error.cause : null;
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch user data', 
        details: errorMessage,
        cause: errorCause,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 