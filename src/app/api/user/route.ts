import { NextRequest, NextResponse } from 'next/server';

// Server-side API configuration (hidden from frontend)
const RADIUS_API_CONFIG = {
  baseUrl: process.env.RADIUS_API_URL || 'http://161.35.46.125/radiusmanager/api/sysapi.php',
  apiuser: process.env.RADIUS_API_USER || 'api',
  apipass: process.env.RADIUS_API_PASS || 'api123'
};

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Make API call to RADIUS Manager from server-side
    const url = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${RADIUS_API_CONFIG.apiuser}&apipass=${RADIUS_API_CONFIG.apipass}&q=get_userdata&username=${encodeURIComponent(username)}`;
    
    console.log('Making RADIUS API call to:', url.replace(RADIUS_API_CONFIG.apipass, '***'));
    console.log('Using credentials:', { apiuser: RADIUS_API_CONFIG.apiuser, apipass: '***' });
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`RADIUS API HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
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
      return NextResponse.json(
        { error: 'Invalid JSON response from RADIUS API' },
        { status: 500 }
      );
    }
    
    // Return the RADIUS Manager response
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 