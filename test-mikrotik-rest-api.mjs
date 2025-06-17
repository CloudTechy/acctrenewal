#!/usr/bin/env node

/**
 * Comprehensive MikroTik API Testing Script
 * Tests both RouterOS API (port 8728) and REST API (port 80/443)
 * Helps identify configuration issues and provides solutions
 */

import { RouterOSAPI } from 'node-routeros';

// Test configuration
const TEST_CONFIG = {
  host: '192.168.50.2',
  user: 'admin',
  password: 'sm@phswebawka',
  routerOSPort: 8728,
  restApiPort: 80,
  restApiPortSSL: 443,
};

console.log('🔧 MikroTik API Comprehensive Test');
console.log('=====================================');
console.log(`Router: ${TEST_CONFIG.host}`);
console.log(`User: ${TEST_CONFIG.user}`);
console.log('');

/**
 * Test RouterOS API (Binary Protocol)
 */
async function testRouterOSAPI() {
  console.log('📡 Testing RouterOS API (Port 8728)...');
  
  try {
    const api = new RouterOSAPI({
      host: TEST_CONFIG.host,
      user: TEST_CONFIG.user,
      password: TEST_CONFIG.password,
      port: TEST_CONFIG.routerOSPort,
      timeout: 10000,
    });

    // Connect
    await api.connect();
    console.log('✅ RouterOS API: Connected successfully');

    // Test basic commands
    const identity = await api.write('/system/identity/print');
    console.log(`   Router Name: ${identity[0]?.name || 'Unknown'}`);
    
    const resource = await api.write('/system/resource/print');
    const res = resource[0] || {};
    console.log(`   Version: ${res.version || 'Unknown'}`);
    console.log(`   Uptime: ${res.uptime || 'Unknown'}`);

    // Check services
    console.log('   Checking services...');
    const services = await api.write('/ip/service/print');
    
    const wwwService = services.find(s => s.name === 'www');
    const wwwSslService = services.find(s => s.name === 'www-ssl');
    const apiService = services.find(s => s.name === 'api');
    
    console.log(`   - API Service: ${apiService?.disabled === 'false' ? '✅ Enabled' : '❌ Disabled'} (Port: ${apiService?.port || 'Unknown'})`);
    console.log(`   - WWW Service: ${wwwService?.disabled === 'false' ? '✅ Enabled' : '❌ Disabled'} (Port: ${wwwService?.port || 'Unknown'})`);
    console.log(`   - WWW-SSL Service: ${wwwSslService?.disabled === 'false' ? '✅ Enabled' : '❌ Disabled'} (Port: ${wwwSslService?.port || 'Unknown'})`);

    await api.close();
    return {
      success: true,
      version: res.version,
      services: { www: wwwService, wwwSsl: wwwSslService, api: apiService }
    };

  } catch (error) {
    console.log(`❌ RouterOS API: Failed - ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test REST API (HTTP)
 */
async function testRestAPI(port = 80, useHttps = false) {
  const protocol = useHttps ? 'https' : 'http';
  const url = `${protocol}://${TEST_CONFIG.host}:${port}/rest/system/identity`;
  
  console.log(`🌐 Testing REST API (${protocol.toUpperCase()} Port ${port})...`);
  
  try {
    const auth = 'Basic ' + Buffer.from(`${TEST_CONFIG.user}:${TEST_CONFIG.password}`).toString('base64');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
      },
      // For HTTPS with self-signed certificates
      ...(useHttps && { 
        agent: new (await import('https')).Agent({ 
          rejectUnauthorized: false 
        })
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ REST API: Connected successfully`);
      console.log(`   Router Name: ${data[0]?.name || 'Unknown'}`);
      return { success: true, data };
    } else {
      console.log(`❌ REST API: HTTP ${response.status} - ${response.statusText}`);
      return { success: false, status: response.status, statusText: response.statusText };
    }

  } catch (error) {
    console.log(`❌ REST API: Failed - ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test network connectivity
 */
async function testConnectivity() {
  console.log('🔌 Testing Network Connectivity...');
  
  try {
    // Test basic connectivity
    await fetch(`http://${TEST_CONFIG.host}`, {
      method: 'HEAD',
      timeout: 5000,
    });
    console.log('✅ Network: Router is reachable');
    return true;
  } catch (error) {
    console.log(`❌ Network: Router unreachable - ${error.message}`);
    return false;
  }
}

/**
 * Provide configuration recommendations
 */
function provideRecommendations(routerOSResult, restResult) {
  console.log('\n💡 Configuration Recommendations:');
  console.log('=====================================');

  if (!routerOSResult.success) {
    console.log('🔧 RouterOS API Issues:');
    console.log('   1. Check if API service is enabled:');
    console.log('      /ip service enable api');
    console.log('      /ip service set api port=8728');
    console.log('   2. Check firewall rules for port 8728');
    console.log('   3. Verify credentials');
    console.log('');
  }

  if (!restResult.success) {
    console.log('🔧 REST API Issues:');
    console.log('   1. Enable WWW service for HTTP REST API:');
    console.log('      /ip service enable www');
    console.log('      /ip service set www port=80');
    console.log('');
    console.log('   2. OR enable WWW-SSL service for HTTPS REST API:');
    console.log('      /ip service enable www-ssl');
    console.log('      /ip service set www-ssl port=443');
    console.log('');
    console.log('   3. Check RouterOS version (REST API requires v7.1beta4+)');
    console.log('   4. Check firewall rules for port 80/443');
    console.log('');
  }

  if (routerOSResult.success && routerOSResult.services) {
    const { www, wwwSsl } = routerOSResult.services;
    
    if (www?.disabled !== 'false' && wwwSsl?.disabled !== 'false') {
      console.log('⚠️  REST API Not Available:');
      console.log('   Neither WWW nor WWW-SSL service is enabled.');
      console.log('   Enable one of them to use REST API:');
      console.log('   - For HTTP: /ip service enable www');
      console.log('   - For HTTPS: /ip service enable www-ssl');
      console.log('');
    }
  }

  console.log('📋 Recommended Configuration for Development:');
  console.log('   1. Use RouterOS API (more stable, fewer dependencies)');
  console.log('   2. Set MIKROTIK_USE_REST_API=false in .env.local');
  console.log('   3. Ensure API service is enabled on router');
  console.log('');
}

/**
 * Main test function
 */
async function runTests() {
  try {
    // Test network connectivity first
    const isReachable = await testConnectivity();
    if (!isReachable) {
      console.log('\n❌ Cannot reach router. Check network connectivity.');
      return;
    }

    console.log('');

    // Test RouterOS API
    const routerOSResult = await testRouterOSAPI();
    console.log('');

    // Test REST API (HTTP)
    const restResultHTTP = await testRestAPI(80, false);
    console.log('');

    // Test REST API (HTTPS)
    const restResultHTTPS = await testRestAPI(443, true);
    console.log('');

    // Provide recommendations
    provideRecommendations(routerOSResult, restResultHTTP);

    // Summary
    console.log('📊 Test Summary:');
    console.log('================');
    console.log(`RouterOS API (8728): ${routerOSResult.success ? '✅ Working' : '❌ Failed'}`);
    console.log(`REST API HTTP (80): ${restResultHTTP.success ? '✅ Working' : '❌ Failed'}`);
    console.log(`REST API HTTPS (443): ${restResultHTTPS.success ? '✅ Working' : '❌ Failed'}`);
    console.log('');

    if (routerOSResult.success) {
      console.log('🎯 Recommendation: Use RouterOS API for now');
      console.log('   Set MIKROTIK_USE_REST_API=false in .env.local');
    } else {
      console.log('⚠️  Both APIs failed. Check router configuration.');
    }

  } catch (error) {
    console.error('❌ Test script failed:', error);
  }
}

// Run tests
runTests().catch(console.error); 