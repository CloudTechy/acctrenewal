import { NextRequest, NextResponse } from 'next/server';
import { getRouterConfig } from '@/lib/database';

interface HotspotServer {
  '.id': string;
  name: string;
  disabled?: string;
  interface?: string;
  profile?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  let action: string | undefined;
  
  try {
    const paramsResolved = await params;
    action = paramsResolved.action;
    
    if (action !== 'enable' && action !== 'disable') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "enable" or "disable"' },
        { status: 400 }
      );
    }

    const { locationId, hotspotName } = await request.json();
    
    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    // Get router configuration for the location
    const routerConfig = await getRouterConfig(locationId);
    
    if (!routerConfig) {
      return NextResponse.json(
        { error: 'No router configuration found for this location' },
        { status: 404 }
      );
    }

    const host = routerConfig.host;
    const username = routerConfig.username;
    const password = routerConfig.password; // Plain text password from database
    const port = routerConfig.api_port || 80;
    const hotspotServerName = hotspotName || 'hotspot1'; // Default hotspot name

    // Use MikroTik REST API to enable/disable hotspot
    const baseUrl = `http://${host}:${port}/rest`;
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };

    try {
      // First, get the list of hotspot servers to find the correct one
      const hotspotListResponse = await fetch(`${baseUrl}/ip/hotspot`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (!hotspotListResponse.ok) {
        throw new Error(`Failed to get hotspot list: ${hotspotListResponse.statusText}`);
      }

      const hotspotServers: HotspotServer[] = await hotspotListResponse.json();
      
      // Find the hotspot server by name
      const targetHotspot = Array.isArray(hotspotServers) 
        ? hotspotServers.find((server: HotspotServer) => server.name === hotspotServerName)
        : null;

      if (!targetHotspot) {
        return NextResponse.json(
          { error: `Hotspot server "${hotspotServerName}" not found on router` },
          { status: 404 }
        );
      }

      // Use the hotspot ID to enable/disable it
      const hotspotId = targetHotspot['.id'];
      
      // Method 1: Using REST API PATCH to update the disabled field
      const updateResponse = await fetch(`${baseUrl}/ip/hotspot/${hotspotId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          disabled: action === 'disable' ? 'true' : 'false'
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!updateResponse.ok) {
        // Method 2: Fallback to RouterOS API command style
        try {
          const commandUrl = `${baseUrl}/ip/hotspot/${action}`;
          const commandResponse = await fetch(commandUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              numbers: hotspotId
            }),
            signal: AbortSignal.timeout(10000),
          });

          if (!commandResponse.ok) {
            throw new Error(`Both methods failed to ${action} hotspot`);
          }
        } catch {
          throw new Error(`Failed to ${action} hotspot: ${updateResponse.statusText}`);
        }
      }

      // Verify the change was applied
      const verifyResponse = await fetch(`${baseUrl}/ip/hotspot/${hotspotId}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(5000),
      });

      let verificationResult: HotspotServer | null = null;
      if (verifyResponse.ok) {
        verificationResult = await verifyResponse.json();
      }

      return NextResponse.json({
        success: true,
        message: `Hotspot "${hotspotServerName}" ${action}d successfully`,
        locationId,
        hotspotName: hotspotServerName,
        action,
        routerHost: host,
        verification: verificationResult ? {
          disabled: verificationResult.disabled === 'true',
          name: verificationResult.name
        } : null
      });

    } catch (apiError) {
      console.error(`MikroTik API error for ${action} operation:`, apiError);
      return NextResponse.json(
        { 
          error: `Failed to ${action} hotspot on router: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`,
          locationId,
          routerHost: host
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error(`Error in hotspot ${action || 'unknown'} operation:`, error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 