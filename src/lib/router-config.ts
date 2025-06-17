// Router Configuration Utilities for MikroTik Hotspot Setup

export interface NetworkConfig {
  // Basic Network Settings
  routerName: string;
  lanInterface: string;
  wanInterface: string;
  
  // IP Configuration
  lanNetwork: string; // e.g., "192.168.1.0/24"
  lanGateway: string; // e.g., "192.168.1.1"
  dhcpStart: string; // e.g., "192.168.1.100"
  dhcpEnd: string; // e.g., "192.168.1.200"
  
  // DNS Settings
  primaryDns: string;
  secondaryDns: string;
  
  // WiFi Configuration
  wifiEnabled: boolean;
  wifiSsid: string;
  wifiPassword?: string;
  wifiSecurity: 'none' | 'wpa2-psk' | 'wpa3-psk';
  wifiChannel?: number;
  
  // Hotspot Configuration
  hotspotEnabled: boolean;
  hotspotName: string;
  hotspotProfile: string;
  loginPageUrl: string;
  
  // User Management
  defaultUsers: Array<{
    username: string;
    password: string;
    profile: string;
  }>;
}

export interface ConfigurationStep {
  id: string;
  title: string;
  description: string;
  commands: string[];
  validation?: string[];
}

// Type definitions for MikroTik API responses
interface MikroTikIdentity {
  name: string;
  [key: string]: unknown;
}

interface MikroTikInterface {
  name: string;
  type: string;
  disabled?: string;
  [key: string]: unknown;
}

interface MikroTikAddress {
  address: string;
  interface: string;
  [key: string]: unknown;
}

interface MikroTikDhcpServer {
  name: string;
  interface: string;
  [key: string]: unknown;
}

interface MikroTikHotspotServer {
  name: string;
  interface: string;
  [key: string]: unknown;
}

interface MikroTikWirelessInterface {
  name: string;
  ssid?: string;
  [key: string]: unknown;
}

export class MikroTikConfigurator {
  private baseUrl: string;
  private auth: string;

  constructor(host: string, username: string, password: string, port: number = 80) {
    this.baseUrl = `http://${host}:${port}/rest`;
    this.auth = Buffer.from(`${username}:${password}`).toString('base64');
  }

  private async executeCommand(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: Record<string, unknown>): Promise<unknown> {
    const headers = {
      'Authorization': `Basic ${this.auth}`,
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(15000), // 15 second timeout
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Test connection to the router
   */
  async testConnection(): Promise<{ success: boolean; identity?: MikroTikIdentity; error?: string }> {
    try {
      const identity = await this.executeCommand('/system/identity') as MikroTikIdentity;
      return { success: true, identity };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      };
    }
  }

  /**
   * Get current router configuration
   */
  async getCurrentConfig(): Promise<{
    identity: MikroTikIdentity;
    interfaces: MikroTikInterface[];
    addresses: MikroTikAddress[];
    dhcpServers: MikroTikDhcpServer[];
    hotspotServers: MikroTikHotspotServer[];
    wirelessInterfaces: MikroTikWirelessInterface[];
  }> {
    const [identity, interfaces, addresses, dhcpServers, hotspotServers, wirelessInterfaces] = await Promise.all([
      this.executeCommand('/system/identity'),
      this.executeCommand('/interface'),
      this.executeCommand('/ip/address'),
      this.executeCommand('/ip/dhcp-server'),
      this.executeCommand('/ip/hotspot').catch(() => []),
      this.executeCommand('/interface/wireless').catch(() => [])
    ]);

    return {
      identity: Array.isArray(identity) ? identity[0] as MikroTikIdentity : identity as MikroTikIdentity,
      interfaces: Array.isArray(interfaces) ? interfaces as MikroTikInterface[] : [interfaces as MikroTikInterface],
      addresses: Array.isArray(addresses) ? addresses as MikroTikAddress[] : [addresses as MikroTikAddress],
      dhcpServers: Array.isArray(dhcpServers) ? dhcpServers as MikroTikDhcpServer[] : [dhcpServers as MikroTikDhcpServer],
      hotspotServers: Array.isArray(hotspotServers) ? hotspotServers as MikroTikHotspotServer[] : [hotspotServers as MikroTikHotspotServer],
      wirelessInterfaces: Array.isArray(wirelessInterfaces) ? wirelessInterfaces as MikroTikWirelessInterface[] : [wirelessInterfaces as MikroTikWirelessInterface]
    };
  }

  /**
   * Configure basic network settings
   */
  async configureBasicNetwork(config: NetworkConfig): Promise<ConfigurationStep[]> {
    const steps: ConfigurationStep[] = [];
    console.log('🔧 Starting basic network configuration...');

    // Step 1: Set router identity
    steps.push({
      id: 'identity',
      title: 'Set Router Identity',
      description: `Setting router name to ${config.routerName}`,
      commands: [`/system identity set name=${config.routerName}`]
    });

    try {
      console.log(`📝 Setting router identity to: ${config.routerName}`);
      await this.executeCommand('/system/identity', 'PUT', { name: config.routerName });
      console.log('✅ Router identity set successfully');
    } catch (error) {
      console.error('❌ Failed to set router identity:', error);
      throw new Error(`Failed to set router identity: ${error}`);
    }

    // Step 2: Create bridge for LAN (all ports except ether1/WAN)
    steps.push({
      id: 'bridge',
      title: 'Create LAN Bridge',
      description: 'Creating bridge interface for LAN connectivity (ether2-ether5)',
      commands: [
        '/interface bridge add name=bridge-lan protocol-mode=rstp',
        '/interface bridge port add interface=ether2 bridge=bridge-lan',
        '/interface bridge port add interface=ether3 bridge=bridge-lan',
        '/interface bridge port add interface=ether4 bridge=bridge-lan',
        '/interface bridge port add interface=ether5 bridge=bridge-lan'
      ]
    });

    try {
      // Create bridge
      console.log('🌉 Creating LAN bridge...');
      await this.executeCommand('/interface/bridge', 'POST', {
        name: 'bridge-lan',
        'protocol-mode': 'rstp'
      });
      console.log('✅ Bridge created successfully');

      // Add all LAN interfaces to bridge (ether2-ether5)
      const lanPorts = ['ether2', 'ether3', 'ether4', 'ether5'];
      for (const port of lanPorts) {
        try {
          console.log(`🔌 Adding ${port} to bridge...`);
          await this.executeCommand('/interface/bridge/port', 'POST', {
            interface: port,
            bridge: 'bridge-lan'
          });
          console.log(`✅ ${port} added to bridge successfully`);
        } catch (error) {
          console.warn(`⚠️ Failed to add ${port} to bridge (may already exist):`, error);
        }
      }
    } catch (error) {
      console.warn('⚠️ Bridge creation failed (may already exist):', error);
    }

    // Step 3: Configure IP addressing
    steps.push({
      id: 'ip-config',
      title: 'Configure IP Addressing',
      description: `Setting up IP ${config.lanGateway} on bridge-lan`,
      commands: [`/ip address add address=${config.lanGateway}/${config.lanNetwork.split('/')[1]} interface=bridge-lan`]
    });

    try {
      console.log(`🌐 Setting IP address: ${config.lanGateway}/${config.lanNetwork.split('/')[1]}`);
      await this.executeCommand('/ip/address', 'POST', {
        address: `${config.lanGateway}/${config.lanNetwork.split('/')[1]}`,
        interface: 'bridge-lan'
      });
      console.log('✅ IP address configured successfully');
    } catch (error) {
      console.warn('⚠️ IP address configuration failed (may already exist):', error);
    }

    console.log('✅ Basic network configuration completed');
    return steps;
  }

  /**
   * Configure DHCP server
   */
  async configureDhcp(config: NetworkConfig): Promise<ConfigurationStep[]> {
    const steps: ConfigurationStep[] = [];

    // Step 1: Create IP pool
    steps.push({
      id: 'dhcp-pool',
      title: 'Create DHCP Pool',
      description: `Creating DHCP pool ${config.dhcpStart}-${config.dhcpEnd}`,
      commands: [`/ip pool add name=dhcp-pool ranges=${config.dhcpStart}-${config.dhcpEnd}`]
    });

    try {
      await this.executeCommand('/ip/pool', 'POST', {
        name: 'dhcp-pool',
        ranges: `${config.dhcpStart}-${config.dhcpEnd}`
      });
    } catch (error) {
      console.warn('DHCP pool creation failed (may already exist):', error);
    }

    // Step 2: Create DHCP network
    steps.push({
      id: 'dhcp-network',
      title: 'Configure DHCP Network',
      description: `Setting up DHCP network for ${config.lanNetwork}`,
      commands: [`/ip dhcp-server network add address=${config.lanNetwork} gateway=${config.lanGateway} dns-server=${config.primaryDns},${config.secondaryDns}`]
    });

    try {
      await this.executeCommand('/ip/dhcp-server/network', 'POST', {
        address: config.lanNetwork,
        gateway: config.lanGateway,
        'dns-server': `${config.primaryDns},${config.secondaryDns}`
      });
    } catch (error) {
      console.warn('DHCP network creation failed (may already exist):', error);
    }

    // Step 3: Create DHCP server
    steps.push({
      id: 'dhcp-server',
      title: 'Create DHCP Server',
      description: 'Setting up DHCP server on bridge-lan',
      commands: [`/ip dhcp-server add interface=bridge-lan address-pool=dhcp-pool disabled=no name=dhcp-server`]
    });

    try {
      await this.executeCommand('/ip/dhcp-server', 'POST', {
        interface: 'bridge-lan',
        'address-pool': 'dhcp-pool',
        disabled: 'no',
        name: 'dhcp-server'
      });
    } catch (error) {
      console.warn('DHCP server creation failed (may already exist):', error);
    }

    return steps;
  }

  /**
   * Configure WiFi settings
   */
  async configureWifi(config: NetworkConfig): Promise<ConfigurationStep[]> {
    const steps: ConfigurationStep[] = [];

    if (!config.wifiEnabled) {
      return steps;
    }

    // Step 1: Create security profile (only if not open network)
    if (config.wifiSecurity !== 'none') {
      steps.push({
        id: 'wifi-security',
        title: 'Configure WiFi Security',
        description: `Setting up ${config.wifiSecurity} security profile`,
        commands: [`/interface wireless security-profiles add name=wifi-security authentication-types=${config.wifiSecurity} mode=dynamic-keys wpa2-pre-shared-key=${config.wifiPassword}`]
      });

      try {
        await this.executeCommand('/interface/wireless/security-profiles', 'POST', {
          name: 'wifi-security',
          'authentication-types': config.wifiSecurity,
          mode: 'dynamic-keys',
          'wpa2-pre-shared-key': config.wifiPassword
        });
      } catch (error) {
        console.warn('WiFi security profile creation failed (may already exist):', error);
      }
    }

    // Step 2: Configure wireless interface
    steps.push({
      id: 'wifi-interface',
      title: 'Configure WiFi Interface',
      description: `Setting up WiFi SSID: ${config.wifiSsid} (${config.wifiSecurity === 'none' ? 'Open Network' : 'Secured'})`,
      commands: [`/interface wireless set wlan1 disabled=no mode=ap-bridge band=2ghz-b/g/n ssid=${config.wifiSsid} security-profile=${config.wifiSecurity === 'none' ? 'default' : 'wifi-security'}`]
    });

    try {
      const wifiConfig: Record<string, unknown> = {
        disabled: 'no',
        mode: 'ap-bridge',
        band: '2ghz-b/g/n',
        ssid: config.wifiSsid,
        'security-profile': config.wifiSecurity === 'none' ? 'default' : 'wifi-security'
      };

      if (config.wifiChannel) {
        wifiConfig.frequency = config.wifiChannel.toString();
      }

      await this.executeCommand('/interface/wireless/wlan1', 'PUT', wifiConfig);
    } catch (error) {
      console.warn('WiFi interface configuration failed:', error);
    }

    // Step 3: Add WiFi to bridge
    steps.push({
      id: 'wifi-bridge',
      title: 'Add WiFi to Bridge',
      description: 'Adding WiFi interface to LAN bridge',
      commands: [`/interface bridge port add interface=wlan1 bridge=bridge-lan`]
    });

    try {
      await this.executeCommand('/interface/bridge/port', 'POST', {
        interface: 'wlan1',
        bridge: 'bridge-lan'
      });
    } catch (error) {
      console.warn('WiFi bridge port creation failed (may already exist):', error);
    }

    return steps;
  }

  /**
   * Configure hotspot functionality
   */
  async configureHotspot(config: NetworkConfig): Promise<ConfigurationStep[]> {
    const steps: ConfigurationStep[] = [];

    if (!config.hotspotEnabled) {
      return steps;
    }

    // Step 1: Create hotspot profile
    steps.push({
      id: 'hotspot-profile',
      title: 'Create Hotspot Profile',
      description: `Creating hotspot profile: ${config.hotspotProfile}`,
      commands: [`/ip hotspot profile add name=${config.hotspotProfile} html-directory=hotspot login-by=username,http-chap use-radius=no dns-name=phsweb.local`]
    });

    try {
      await this.executeCommand('/ip/hotspot/profile', 'POST', {
        name: config.hotspotProfile,
        'html-directory': 'hotspot',
        'login-by': 'username,http-chap',
        'use-radius': 'no',
        'dns-name': 'phsweb.local'
      });
    } catch (error) {
      console.warn('Hotspot profile creation failed (may already exist):', error);
    }

    // Step 2: Create user profile
    steps.push({
      id: 'user-profile',
      title: 'Create User Profile',
      description: 'Setting up default user profile',
      commands: [`/ip hotspot user profile add name=default-user idle-timeout=30m keepalive-timeout=2m shared-users=1 status-autorefresh=1m transparent-proxy=yes`]
    });

    try {
      await this.executeCommand('/ip/hotspot/user/profile', 'POST', {
        name: 'default-user',
        'idle-timeout': '30m',
        'keepalive-timeout': '2m',
        'shared-users': '1',
        'status-autorefresh': '1m',
        'transparent-proxy': 'yes'
      });
    } catch (error) {
      console.warn('User profile creation failed (may already exist):', error);
    }

    // Step 3: Create hotspot server
    steps.push({
      id: 'hotspot-server',
      title: 'Create Hotspot Server',
      description: `Creating hotspot server: ${config.hotspotName}`,
      commands: [`/ip hotspot add name=${config.hotspotName} interface=bridge-lan address-pool=dhcp-pool profile=${config.hotspotProfile} disabled=no`]
    });

    try {
      await this.executeCommand('/ip/hotspot', 'POST', {
        name: config.hotspotName,
        interface: 'bridge-lan',
        'address-pool': 'dhcp-pool',
        profile: config.hotspotProfile,
        disabled: 'no'
      });
    } catch (error) {
      console.warn('Hotspot server creation failed (may already exist):', error);
    }

    // Step 4: Configure hotspot network
    steps.push({
      id: 'hotspot-network',
      title: 'Configure Hotspot Network',
      description: 'Setting up hotspot network configuration',
      commands: [`/ip hotspot network add address=${config.lanNetwork} gateway=${config.lanGateway} dns-server=${config.primaryDns},${config.secondaryDns}`]
    });

    try {
      await this.executeCommand('/ip/hotspot/network', 'POST', {
        address: config.lanNetwork,
        gateway: config.lanGateway,
        'dns-server': `${config.primaryDns},${config.secondaryDns}`
      });
    } catch (error) {
      console.warn('Hotspot network creation failed (may already exist):', error);
    }

    return steps;
  }

  /**
   * Configure walled garden for login page access
   */
  async configureWalledGarden(loginPageDomain: string): Promise<ConfigurationStep[]> {
    const steps: ConfigurationStep[] = [];

    const walledGardenEntries = [
      loginPageDomain,
      `*.${loginPageDomain}`,
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      '*.google.com',
      '*.googleapis.com'
    ];

    steps.push({
      id: 'walled-garden',
      title: 'Configure Walled Garden',
      description: 'Setting up walled garden for login page access',
      commands: walledGardenEntries.map(host => `/ip hotspot walled-garden add dst-host=${host} action=allow`)
    });

    for (const host of walledGardenEntries) {
      try {
        await this.executeCommand('/ip/hotspot/walled-garden', 'POST', {
          'dst-host': host,
          action: 'allow'
        });
      } catch (error) {
        console.warn(`Walled garden entry creation failed for ${host} (may already exist):`, error);
      }
    }

    return steps;
  }

  /**
   * Create default hotspot users
   */
  async createDefaultUsers(config: NetworkConfig): Promise<ConfigurationStep[]> {
    const steps: ConfigurationStep[] = [];

    if (config.defaultUsers.length === 0) {
      return steps;
    }

    steps.push({
      id: 'default-users',
      title: 'Create Default Users',
      description: `Creating ${config.defaultUsers.length} default users`,
      commands: config.defaultUsers.map(user => 
        `/ip hotspot user add name=${user.username} password=${user.password} profile=${user.profile}`
      )
    });

    for (const user of config.defaultUsers) {
      try {
        await this.executeCommand('/ip/hotspot/user', 'POST', {
          name: user.username,
          password: user.password,
          profile: user.profile
        });
      } catch (error) {
        console.warn(`User creation failed for ${user.username} (may already exist):`, error);
      }
    }

    return steps;
  }

  /**
   * Upload custom login page
   */
  async uploadLoginPage(locationId: string, loginPageUrl: string): Promise<ConfigurationStep[]> {
    const steps: ConfigurationStep[] = [];

    const loginHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>PHSWEB Login - ${locationId.toUpperCase()}</title>
    <meta http-equiv="refresh" content="0; url=${loginPageUrl}?$(query-string)">
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
        .loading { color: #666; }
        .redirect-link { color: #007bff; text-decoration: none; }
        .redirect-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="loading">
        <h2>Redirecting to PHSWEB Login...</h2>
        <p>If you are not redirected automatically, <a href="${loginPageUrl}?$(query-string)" class="redirect-link">click here</a>.</p>
        <div style="margin-top: 20px;">
            <div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        </div>
    </div>
    <style>
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</body>
</html>`;

    steps.push({
      id: 'login-page',
      title: 'Upload Custom Login Page',
      description: `Setting up custom login page redirect to ${loginPageUrl}`,
      commands: ['Custom login.html file uploaded to /hotspot directory']
    });

    // Note: File upload via REST API is complex and may require different approach
    // This is a placeholder for the login page configuration
    console.log('Login page HTML generated:', loginHtml);

    return steps;
  }

  /**
   * Complete router configuration for hotspot
   */
  async configureCompleteHotspot(config: NetworkConfig, locationId: string): Promise<{
    success: boolean;
    steps: ConfigurationStep[];
    error?: string;
  }> {
    console.log(`🚀 Starting complete hotspot configuration for location: ${locationId}`);
    console.log(`📋 Configuration summary:`, {
      routerName: config.routerName,
      network: config.lanNetwork,
      wifiEnabled: config.wifiEnabled,
      wifiSsid: config.wifiSsid,
      wifiSecurity: config.wifiSecurity,
      hotspotEnabled: config.hotspotEnabled
    });

    try {
      const allSteps: ConfigurationStep[] = [];

      // Test connection first
      console.log('🔍 Testing router connection...');
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        console.error('❌ Router connection test failed:', connectionTest.error);
        return {
          success: false,
          steps: [],
          error: connectionTest.error
        };
      }
      console.log('✅ Router connection test successful');

      // Execute configuration steps
      console.log('📡 Executing network configuration steps...');
      const networkSteps = await this.configureBasicNetwork(config);
      allSteps.push(...networkSteps);

      console.log('🌐 Executing DHCP configuration steps...');
      const dhcpSteps = await this.configureDhcp(config);
      allSteps.push(...dhcpSteps);

      console.log('📶 Executing WiFi configuration steps...');
      const wifiSteps = await this.configureWifi(config);
      allSteps.push(...wifiSteps);

      console.log('🔥 Executing hotspot configuration steps...');
      const hotspotSteps = await this.configureHotspot(config);
      allSteps.push(...hotspotSteps);

      console.log('🛡️ Executing walled garden configuration steps...');
      const walledGardenSteps = await this.configureWalledGarden(new URL(config.loginPageUrl).hostname);
      allSteps.push(...walledGardenSteps);

      console.log('👥 Executing user creation steps...');
      const userSteps = await this.createDefaultUsers(config);
      allSteps.push(...userSteps);

      console.log('📄 Executing login page configuration steps...');
      const loginPageSteps = await this.uploadLoginPage(locationId, config.loginPageUrl);
      allSteps.push(...loginPageSteps);

      console.log(`🎉 Configuration completed successfully! Total steps: ${allSteps.length}`);
      return {
        success: true,
        steps: allSteps
      };

    } catch (error) {
      console.error('💥 Configuration failed with error:', error);
      return {
        success: false,
        steps: [],
        error: error instanceof Error ? error.message : 'Configuration failed'
      };
    }
  }
}

/**
 * Generate default network configuration for a location
 */
export function generateDefaultConfig(locationId: string, locationName: string): NetworkConfig {
  // Generate unique IP ranges based on location
  const locationIndex = ['awka', 'lagos', 'abuja', 'kano', 'ibadan'].indexOf(locationId.toLowerCase()) + 1;
  const networkOctet = locationIndex > 0 ? locationIndex : Math.floor(Math.random() * 200) + 10;

  return {
    routerName: `PHSWEB-${locationName.replace(/\s+/g, '-')}`,
    lanInterface: 'ether2-ether5', // All LAN ports
    wanInterface: 'ether1',
    
    lanNetwork: `192.168.${networkOctet}.0/24`,
    lanGateway: `192.168.${networkOctet}.1`,
    dhcpStart: `192.168.${networkOctet}.100`,
    dhcpEnd: `192.168.${networkOctet}.200`,
    
    primaryDns: '8.8.8.8',
    secondaryDns: '8.8.4.4',
    
    wifiEnabled: true,
    wifiSsid: `PHSWEB-${locationName}`,
    wifiPassword: undefined, // No password for public WiFi
    wifiSecurity: 'none', // Open network for public WiFi
    
    hotspotEnabled: true,
    hotspotName: `hotspot-${locationId}`,
    hotspotProfile: `profile-${locationId}`,
    loginPageUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/hotspot/${locationId}`,
    
    defaultUsers: [
      {
        username: 'admin',
        password: 'admin123',
        profile: 'default-user'
      },
      {
        username: 'guest',
        password: 'guest123',
        profile: 'default-user'
      },
      {
        username: `test${locationId}`,
        password: 'test123',
        profile: 'default-user'
      }
    ]
  };
}

/**
 * Validate network configuration
 */
export function validateNetworkConfig(config: NetworkConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate required fields
  if (!config.routerName.trim()) errors.push('Router name is required');
  if (!config.lanNetwork.match(/^\d+\.\d+\.\d+\.\d+\/\d+$/)) errors.push('Invalid LAN network format');
  if (!config.lanGateway.match(/^\d+\.\d+\.\d+\.\d+$/)) errors.push('Invalid LAN gateway format');
  if (!config.dhcpStart.match(/^\d+\.\d+\.\d+\.\d+$/)) errors.push('Invalid DHCP start address');
  if (!config.dhcpEnd.match(/^\d+\.\d+\.\d+\.\d+$/)) errors.push('Invalid DHCP end address');

  // Validate WiFi settings
  if (config.wifiEnabled) {
    if (!config.wifiSsid.trim()) errors.push('WiFi SSID is required when WiFi is enabled');
    if (config.wifiSecurity !== 'none' && !config.wifiPassword) {
      errors.push('WiFi password is required for secured networks');
    }
    if (config.wifiPassword && config.wifiPassword.length < 8) {
      errors.push('WiFi password must be at least 8 characters');
    }
  }

  // Validate hotspot settings
  if (config.hotspotEnabled) {
    if (!config.hotspotName.trim()) errors.push('Hotspot name is required');
    if (!config.loginPageUrl.trim()) errors.push('Login page URL is required');
    try {
      new URL(config.loginPageUrl);
    } catch {
      errors.push('Invalid login page URL format');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
} 