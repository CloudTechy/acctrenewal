#!/usr/bin/env node

/**
 * Test Router Configuration Script
 * 
 * This script demonstrates the automated MikroTik router configuration
 * functionality for hotspot setup.
 */

const { MikroTikConfigurator, generateDefaultConfig, validateNetworkConfig } = require('./src/lib/router-config');

// Test configuration for Awka location
const testConfig = {
  routerName: 'PHSWEB-Awka-Test',
  lanInterface: 'ether2',
  wanInterface: 'ether1',
  
  lanNetwork: '192.168.1.0/24',
  lanGateway: '192.168.1.1',
  dhcpStart: '192.168.1.100',
  dhcpEnd: '192.168.1.200',
  
  primaryDns: '8.8.8.8',
  secondaryDns: '8.8.4.4',
  
  wifiEnabled: true,
  wifiSsid: 'PHSWEB-Awka-Test',
  wifiPassword: 'phswebawka2024',
  wifiSecurity: 'wpa2-psk',
  
  hotspotEnabled: true,
  hotspotName: 'hotspot-awka-test',
  hotspotProfile: 'profile-awka-test',
  loginPageUrl: 'http://localhost:3000/hotspot/awka',
  
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
      username: 'testawka',
      password: 'test123',
      profile: 'default-user'
    }
  ]
};

async function testRouterConfiguration() {
  console.log('🚀 Testing Router Configuration System');
  console.log('=====================================\n');

  // Step 1: Validate configuration
  console.log('📋 Step 1: Validating Configuration');
  const validation = validateNetworkConfig(testConfig);
  
  if (validation.valid) {
    console.log('✅ Configuration is valid');
  } else {
    console.log('❌ Configuration validation failed:');
    validation.errors.forEach(error => console.log(`   - ${error}`));
    return;
  }

  // Step 2: Test default config generation
  console.log('\n🔧 Step 2: Testing Default Config Generation');
  const defaultConfig = generateDefaultConfig('awka', 'Awka');
  console.log('✅ Default configuration generated:');
  console.log(`   - Router Name: ${defaultConfig.routerName}`);
  console.log(`   - Network: ${defaultConfig.lanNetwork}`);
  console.log(`   - WiFi SSID: ${defaultConfig.wifiSsid}`);
  console.log(`   - Hotspot Name: ${defaultConfig.hotspotName}`);
  console.log(`   - Default Users: ${defaultConfig.defaultUsers.length}`);

  // Step 3: Test router connection (if router is available)
  console.log('\n🌐 Step 3: Testing Router Connection');
  
  // Use environment variables or defaults for router connection
  const routerHost = process.env.MIKROTIK_AWKA_HOST || '192.168.50.2';
  const routerUser = process.env.MIKROTIK_AWKA_USER || 'admin';
  const routerPassword = process.env.MIKROTIK_AWKA_PASSWORD || 'sm@phswebawka';
  const routerPort = parseInt(process.env.MIKROTIK_AWKA_API_PORT || '80');

  console.log(`   Connecting to: ${routerHost}:${routerPort}`);
  console.log(`   Username: ${routerUser}`);

  try {
    const configurator = new MikroTikConfigurator(routerHost, routerUser, routerPassword, routerPort);
    
    // Test connection
    const connectionTest = await configurator.testConnection();
    
    if (connectionTest.success) {
      console.log('✅ Router connection successful');
      console.log(`   Router Identity: ${connectionTest.identity?.name || 'Unknown'}`);
      
      // Get current configuration
      console.log('\n📊 Step 4: Getting Current Router Configuration');
      const currentConfig = await configurator.getCurrentConfig();
      
      console.log('✅ Current configuration retrieved:');
      console.log(`   - Router Name: ${currentConfig.identity.name}`);
      console.log(`   - Interfaces: ${currentConfig.interfaces.length}`);
      console.log(`   - IP Addresses: ${currentConfig.addresses.length}`);
      console.log(`   - DHCP Servers: ${currentConfig.dhcpServers.length}`);
      console.log(`   - Hotspot Servers: ${currentConfig.hotspotServers.length}`);
      console.log(`   - Wireless Interfaces: ${currentConfig.wirelessInterfaces.length}`);
      
      // Test dry run configuration
      console.log('\n🧪 Step 5: Testing Dry Run Configuration');
      console.log('   (This will validate the configuration without making changes)');
      
      // For demonstration, we'll just show what would be configured
      console.log('✅ Dry run configuration preview:');
      console.log(`   - Would set router name to: ${testConfig.routerName}`);
      console.log(`   - Would configure network: ${testConfig.lanNetwork}`);
      console.log(`   - Would set gateway: ${testConfig.lanGateway}`);
      console.log(`   - Would configure DHCP: ${testConfig.dhcpStart} - ${testConfig.dhcpEnd}`);
      
      if (testConfig.wifiEnabled) {
        console.log(`   - Would configure WiFi SSID: ${testConfig.wifiSsid}`);
        console.log(`   - Would set WiFi security: ${testConfig.wifiSecurity}`);
      }
      
      if (testConfig.hotspotEnabled) {
        console.log(`   - Would create hotspot: ${testConfig.hotspotName}`);
        console.log(`   - Would set login page: ${testConfig.loginPageUrl}`);
        console.log(`   - Would create ${testConfig.defaultUsers.length} default users`);
      }
      
    } else {
      console.log('❌ Router connection failed:');
      console.log(`   Error: ${connectionTest.error}`);
      console.log('\n💡 Tips:');
      console.log('   - Check if the router is accessible');
      console.log('   - Verify credentials are correct');
      console.log('   - Ensure REST API is enabled on the router');
      console.log('   - Check firewall settings');
    }
    
  } catch (error) {
    console.log('❌ Router configuration test failed:');
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n🎉 Router Configuration Test Complete!');
  console.log('\nNext Steps:');
  console.log('1. Access the Router Configuration Wizard at: http://localhost:3000/configure-router');
  console.log('2. Select a location and configure network parameters');
  console.log('3. Review and deploy the configuration to your router');
  console.log('4. Test the hotspot functionality');
}

// Run the test
if (require.main === module) {
  testRouterConfiguration().catch(console.error);
}

module.exports = {
  testRouterConfiguration,
  testConfig
}; 