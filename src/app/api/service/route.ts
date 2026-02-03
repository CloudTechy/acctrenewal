import { NextRequest, NextResponse } from 'next/server';

// Server-side API configuration (hidden from frontend)
const RADIUS_API_CONFIG = {
  baseUrl: process.env.RADIUS_API_URL || 'http://165.227.177.208/radiusmanager/api/sysapi.php',
  apiuser: process.env.RADIUS_API_USER || 'api',
  apipass: process.env.RADIUS_API_PASS || 'api123'
};

export async function POST(request: NextRequest) {
  try {
    const { srvid } = await request.json();
    
    if (!srvid) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      );
    }

    // Make API call to RADIUS Manager from server-side
    const url = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${RADIUS_API_CONFIG.apiuser}&apipass=${RADIUS_API_CONFIG.apipass}&q=get_srv&srvid=${srvid}`;
    
    console.log('Making RADIUS API call to:', url.replace(RADIUS_API_CONFIG.apipass, '***'));
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`RADIUS API HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('RADIUS API response:', data);
    
    // Return the RADIUS Manager response
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching service data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 