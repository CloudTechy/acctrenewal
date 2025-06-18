#!/usr/bin/env node

/**
 * MikroTik Connection Test Script
 * 
 * This script helps you test connectivity to your MikroTik routers
 * before implementing the full automation system.
 * 
 * Usage:
 *   node test-mikrotik-connection.js
 * 
 * Make sure to update the router configurations below with your actual router details.
 */

import { RouterOSAPI } from 'node-routeros';

// Test router configurations
// Update these with your actual router details
const TEST_ROUTERS = [
  {
    name: 'Awka Router',
    host: '192.168.50.2',  // Replace with your router IP
    user: 'admin',        // Replace with your username
    password: 'sm@phswebawka', // Replace with your password
    port: 8728
  },
  // Add more routers as needed
];

async function testRouterConnection(config) {
  console.log(`\n🔄 Testing connection to ${config.name} (${config.host})...`);
  
  try {
    const api = new RouterOSAPI({
      host: config.host,
      user: config.user,
      password: config.password,
      port: config.port,
      timeout: 10000,
    });

    // Connect to router
    await api.connect();
    console.log(`✅ Connected to ${config.name}`);

    // Test basic commands
    console.log(`📊 Getting system information...`);
    
    // Get system identity
    const identity = await api.write('/system/identity/print');
    console.log(`   Router Name: ${identity[0]?.name || 'Unknown'}`);
    
    // Get system resource info
    const resource = await api.write('/system/resource/print');
    const res = resource[0] || {};
    console.log(`   Version: ${res.version || 'Unknown'}`);
    console.log(`   Uptime: ${res.uptime || 'Unknown'}`);
    console.log(`   CPU Load: ${res['cpu-load'] || 'Unknown'}%`);
    
    // Test hotspot commands
    console.log(`🌐 Testing hotspot functionality...`);
    
    try {
      // Get hotspot servers
      const hotspotServers = await api.write('/ip/hotspot/print');
      console.log(`   Hotspot Servers: ${hotspotServers.length}`);
      
      if (hotspotServers.length > 0) {
        // Get active users only if hotspot is configured
        const activeUsers = await api.write('/ip/hotspot/active/print');
        console.log(`   Active Users: ${activeUsers.length}`);
        
        // Get all hotspot users
        const allUsers = await api.write('/ip/hotspot/user/print');
        console.log(`   Total Users: ${allUsers.length}`);
      } else {
        console.log(`   ⚠️  No hotspot servers configured yet`);
        console.log(`   💡 This router is ready for hotspot configuration!`);
      }
      
    } catch (hotspotError) {
      if (hotspotError.message.includes('!empty') || hotspotError.errno === 'UNKNOWNREPLY') {
        console.log(`   ⚠️  Hotspot not configured yet (empty response)`);
        console.log(`   💡 This is normal for a new router - ready for setup!`);
      } else {
        console.log(`   ⚠️  Hotspot error: ${hotspotError.message}`);
      }
    }
    
    // Close connection
    await api.close();
    console.log(`✅ ${config.name} test completed successfully`);
    
    return { success: true, name: config.name };
    
  } catch (error) {
    console.log(`❌ Failed to connect to ${config.name}: ${error.message}`);
    return { success: false, name: config.name, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 Starting MikroTik Router Connection Tests');
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const router of TEST_ROUTERS) {
    const result = await testRouterConnection(router);
    results.push(result);
  }
  
  // Summary
  console.log('\n📋 Test Summary');
  console.log('=' .repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful connections: ${successful.length}`);
  successful.forEach(r => console.log(`   - ${r.name}`));
  
  if (failed.length > 0) {
    console.log(`❌ Failed connections: ${failed.length}`);
    failed.forEach(r => console.log(`   - ${r.name}: ${r.error}`));
  }
  
  console.log('\n💡 Next Steps:');
  if (successful.length > 0) {
    console.log('   1. Update your .env.local file with working router credentials');
    console.log('   2. Test the API endpoint: http://localhost:3000/api/hotspot/stats');
    console.log('   3. Check the hotspot dashboard: http://localhost:3000/hotspot');
  }
  
  if (failed.length > 0) {
    console.log('   1. Check router IP addresses and network connectivity');
    console.log('   2. Verify username and password credentials');
    console.log('   3. Ensure MikroTik API service is enabled on the router');
    console.log('   4. Check firewall rules allow API access on port 8728');
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
MikroTik Connection Test Script

Usage:
  node test-mikrotik-connection.js

Before running:
1. Update the TEST_ROUTERS array with your actual router details
2. Make sure your routers have API service enabled:
   /ip service enable api
   /ip service set api port=8728

3. Ensure network connectivity to your routers
4. Install dependencies: npm install node-routeros

Options:
  --help, -h    Show this help message
  `);
  process.exit(0);
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
}); 