import { NextRequest, NextResponse } from 'next/server';
import { getRouterConfig } from '@/lib/database';
import { MikroTikConfigurator, NetworkConfig, validateNetworkConfig } from '@/lib/router-config';

interface ConfigureRouterRequest {
  config: NetworkConfig;
  dryRun?: boolean; // If true, only validate and return steps without executing
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params;
    const body: ConfigureRouterRequest = await request.json();
    const { config, dryRun = false } = body;

    // Validate the network configuration
    const validation = validateNetworkConfig(config);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid configuration',
        details: validation.errors
      }, { status: 400 });
    }

    // Get router connection details from database
    const routerConfig = await getRouterConfig(locationId);
    if (!routerConfig) {
      return NextResponse.json({
        success: false,
        error: 'No router configuration found for this location'
      }, { status: 404 });
    }

    // Create configurator instance
    const configurator = new MikroTikConfigurator(
      routerConfig.host,
      routerConfig.username,
      routerConfig.password,
      routerConfig.api_port
    );

    // Test connection first
    const connectionTest = await configurator.testConnection();
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to router',
        details: connectionTest.error
      }, { status: 503 });
    }

    if (dryRun) {
      // For dry run, just return what would be configured
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: 'Configuration validated successfully',
        routerInfo: connectionTest.identity,
        configurationPreview: {
          routerName: config.routerName,
          network: config.lanNetwork,
          gateway: config.lanGateway,
          dhcpRange: `${config.dhcpStart} - ${config.dhcpEnd}`,
          wifiEnabled: config.wifiEnabled,
          wifiSsid: config.wifiSsid,
          hotspotEnabled: config.hotspotEnabled,
          hotspotName: config.hotspotName,
          loginPageUrl: config.loginPageUrl,
          defaultUsers: config.defaultUsers.length
        }
      });
    }

    // Execute the complete configuration
    console.log(`🚀 Starting router configuration for location: ${locationId}`);
    console.log(`📋 Configuration details:`, {
      routerName: config.routerName,
      network: config.lanNetwork,
      wifiEnabled: config.wifiEnabled,
      hotspotEnabled: config.hotspotEnabled
    });
    
    const result = await configurator.configureCompleteHotspot(config, locationId);

    if (result.success) {
      console.log(`✅ Router configuration completed successfully for ${locationId}`);
      console.log(`📊 Total steps executed: ${result.steps.length}`);
      return NextResponse.json({
        success: true,
        message: 'Router configured successfully',
        steps: result.steps,
        totalSteps: result.steps.length,
        routerInfo: connectionTest.identity
      });
    } else {
      console.error(`❌ Router configuration failed for ${locationId}:`, result.error);
      return NextResponse.json({
        success: false,
        error: 'Configuration failed',
        details: result.error,
        completedSteps: result.steps
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Router configuration error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to retrieve current router configuration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  try {
    const { locationId } = await params;

    // Get router connection details from database
    const routerConfig = await getRouterConfig(locationId);
    if (!routerConfig) {
      return NextResponse.json({
        success: false,
        error: 'No router configuration found for this location'
      }, { status: 404 });
    }

    // Create configurator instance
    const configurator = new MikroTikConfigurator(
      routerConfig.host,
      routerConfig.username,
      routerConfig.password,
      routerConfig.api_port
    );

    // Test connection and get current config
    const connectionTest = await configurator.testConnection();
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to router',
        details: connectionTest.error
      }, { status: 503 });
    }

    const currentConfig = await configurator.getCurrentConfig();

    return NextResponse.json({
      success: true,
      routerInfo: connectionTest.identity,
      currentConfiguration: {
        identity: currentConfig.identity,
        interfaces: currentConfig.interfaces.map(iface => ({
          name: iface.name,
          type: iface.type,
          disabled: iface.disabled === 'true'
        })),
        addresses: currentConfig.addresses.map(addr => ({
          address: addr.address,
          interface: addr.interface
        })),
        dhcpServers: currentConfig.dhcpServers.map(dhcp => ({
          name: dhcp.name,
          interface: dhcp.interface
        })),
        hotspotServers: currentConfig.hotspotServers.map(hotspot => ({
          name: hotspot.name,
          interface: hotspot.interface
        })),
        wirelessInterfaces: currentConfig.wirelessInterfaces.map(wifi => ({
          name: wifi.name,
          ssid: wifi.ssid
        }))
      }
    });

  } catch (error) {
    console.error('Error getting router configuration:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 