/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllHotspotLocations, 
  getRouterConfig, 
  updateRouterConnectionStatus 
} from '@/lib/database';

// Helper function to get router stats using REST API
async function getRouterStats(host: string, username: string, password: string, port: number = 80) {
  const baseUrl = `http://${host}:${port}/rest`;
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  
  console.log(`Connecting to MikroTik REST API: ${baseUrl}`);
  
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
  };

  try {
    // Test connection with system identity
    const identityResponse = await fetch(`${baseUrl}/system/identity`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!identityResponse.ok) {
      const errorText = await identityResponse.text();
      throw new Error(`HTTP ${identityResponse.status}: ${identityResponse.statusText} - ${errorText}`);
    }

    // Get system resource info
    const resourceResponse = await fetch(`${baseUrl}/system/resource`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10000),
    });

    // Get hotspot active users
    const hotspotResponse = await fetch(`${baseUrl}/ip/hotspot/active`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10000),
    });

    const identity = await identityResponse.json();
    const resource = resourceResponse.ok ? await resourceResponse.json() : [{}]
    const hotspotUsers = hotspotResponse.ok ? await hotspotResponse.json() : []

    console.log('✅ REST API connection successful');

    const resourceData = Array.isArray(resource) ? resource[0] : resource

    return {
      connected: true,
      method: 'REST API',
      identity: Array.isArray(identity) ? identity[0] : identity,
      uptime: resourceData?.uptime || '0s',
      version: resourceData?.version || 'Unknown',
      cpuLoad: parseFloat(resourceData?.['cpu-load']) || 0,
      freeMemory: parseInt(resourceData?.['free-memory']) || 0,
      totalMemory: parseInt(resourceData?.['total-memory']) || 0,
      activeUsers: Array.isArray(hotspotUsers) ? hotspotUsers.length : 0,
      users: Array.isArray(hotspotUsers) ? hotspotUsers : []
    }
  } catch (error) {
    console.error('REST API Error:', {
      url: baseUrl,
      username,
      port,
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location');

    // Get all locations
    const locations = await getAllHotspotLocations();
    const responseData: Record<string, any> = {};

    // If specific location requested
    if (locationId) {
      const location = locations.find(l => l.id === locationId);
      if (!location) {
        return NextResponse.json(
          { error: `Location not found: ${locationId}` },
          { status: 404 }
        );
      }

      const routerConfig = await getRouterConfig(locationId);
      if (!routerConfig) {
        return NextResponse.json({
          locationId,
          error: 'No router configuration found',
          stats: {
            activeUsers: 0,
            totalUsers: 0,
            lastActivity: 'No router configured',
          },
          routerStatus: {
            isOnline: false,
            uptime: 'Unknown',
            version: 'Unknown',
            cpuLoad: 0,
            freeMemory: 0,
            totalMemory: 0,
          },
          timestamp: new Date().toISOString()
        });
      }

      try {
        const stats = await getRouterStats(
          routerConfig.host,
          routerConfig.username,
          routerConfig.password,
          routerConfig.api_port
        );

        // Update connection status
        await updateRouterConnectionStatus(locationId, 'connected');

        return NextResponse.json({
          locationId,
          stats: {
            activeUsers: stats.activeUsers,
            totalUsers: stats.activeUsers,
            lastActivity: new Date().toISOString(),
          },
          routerStatus: {
            isOnline: true,
            uptime: stats.uptime,
            version: stats.version,
            cpuLoad: stats.cpuLoad,
            freeMemory: stats.freeMemory,
            totalMemory: stats.totalMemory,
          },
          timestamp: new Date().toISOString(),
          apiType: stats.method
        });

      } catch (error) {
        console.error(`Error connecting to router for ${locationId}:`, error);
        
        // Update connection status to error
        await updateRouterConnectionStatus(
          locationId, 
          'error',
          error instanceof Error ? error.message : 'Connection failed'
        );

        return NextResponse.json({
          locationId,
          error: 'Failed to connect to router',
          details: error instanceof Error ? error.message : 'Unknown error',
          stats: {
            activeUsers: 0,
            totalUsers: 0,
            lastActivity: 'Connection failed',
          },
          routerStatus: {
            isOnline: false,
            uptime: 'Unknown',
            version: 'Unknown',
            cpuLoad: 0,
            freeMemory: 0,
            totalMemory: 0,
          },
          timestamp: new Date().toISOString(),
          apiType: 'REST API'
        });
      }
    }

    // Get stats for all locations
    let totalActiveUsers = 0;
    let activeLocations = 0;

    for (const location of locations) {
      const routerConfig = await getRouterConfig(location.id);
      
      if (!routerConfig) {
        responseData[location.id] = {
          error: 'No router configuration',
          stats: {
            activeUsers: 0,
            totalUsers: 0,
            lastActivity: 'No router configured',
          },
          routerStatus: {
            isOnline: false,
            uptime: 'Unknown',
            version: 'Unknown',
            cpuLoad: 0,
            freeMemory: 0,
            totalMemory: 0,
          }
        };
        continue;
      }

      try {
        const stats = await getRouterStats(
          routerConfig.host,
          routerConfig.username,
          routerConfig.password,
          routerConfig.api_port
        );

        // Update connection status
        await updateRouterConnectionStatus(location.id, 'connected');

        responseData[location.id] = {
          stats: {
            activeUsers: stats.activeUsers,
            totalUsers: stats.activeUsers,
            lastActivity: new Date().toISOString(),
          },
          routerStatus: {
            isOnline: true,
            uptime: stats.uptime,
            version: stats.version,
            cpuLoad: stats.cpuLoad,
            freeMemory: stats.freeMemory,
            totalMemory: stats.totalMemory,
          }
        };

        totalActiveUsers += stats.activeUsers;
        activeLocations++;

      } catch (error) {
        console.error(`Error connecting to router for ${location.id}:`, error);
        
        // Update connection status to error
        await updateRouterConnectionStatus(
          location.id, 
          'error',
          error instanceof Error ? error.message : 'Connection failed'
        );

        responseData[location.id] = {
          error: 'Failed to connect to router',
          details: error instanceof Error ? error.message : 'Unknown error',
          stats: {
            activeUsers: 0,
            totalUsers: 0,
            lastActivity: 'Connection failed',
          },
          routerStatus: {
            isOnline: false,
            uptime: 'Unknown',
            version: 'Unknown',
            cpuLoad: 0,
            freeMemory: 0,
            totalMemory: 0,
          }
        };
      }
    }

    return NextResponse.json({
      locations: responseData,
      timestamp: new Date().toISOString(),
      totalActiveUsers,
      totalLocations: locations.length,
      activeLocations,
      apiType: 'REST API'
    });

  } catch (error) {
    console.error('Error in GET /api/hotspot/stats:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST endpoint to test connection to a specific router
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { host, user, password, port } = body;

    if (!host || !user || !password) {
      return NextResponse.json(
        { error: 'Missing required connection parameters' },
        { status: 400 }
      );
    }

    try {
      const stats = await getRouterStats(host, user, password, port || 80);
      
      return NextResponse.json({
        connected: true,
        host,
        stats,
        timestamp: new Date().toISOString(),
        apiType: stats.method
      });
    } catch (error) {
      return NextResponse.json({
        connected: false,
        host,
        error: error instanceof Error ? error.message : 'Connection failed',
        timestamp: new Date().toISOString(),
        apiType: 'REST API'
      });
    }

  } catch (error) {
    console.error('Connection test error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 