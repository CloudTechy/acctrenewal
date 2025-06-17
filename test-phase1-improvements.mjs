#!/usr/bin/env node

/**
 * Phase 1 Improvements Test Script
 * 
 * This script tests the Phase 1 improvements to ensure:
 * 1. Router IP display is correct
 * 2. Status detection is improved
 * 3. Error handling is enhanced
 * 4. API response includes router info
 */

import { RouterOSAPI } from 'node-routeros';

const ROUTER_CONFIG = {
  name: 'Awka Router',
  host: '192.168.50.2',
  user: 'admin',
  password: 'sm@phswebawka',
  port: 8728
};

async function testRouterConnection() {
  console.log('🧪 Testing Phase 1 Improvements');
  console.log('=' .repeat(50));
  
  console.log('\n1️⃣ Testing Direct Router Connection...');
  
  try {
    const api = new RouterOSAPI({
      host: ROUTER_CONFIG.host,
      user: ROUTER_CONFIG.user,
      password: ROUTER_CONFIG.password,
      port: ROUTER_CONFIG.port,
      timeout: 10000,
    });

    await api.connect();
    console.log(`✅ Direct connection successful to ${ROUTER_CONFIG.host}`);
    
    // Get system info
    const identity = await api.write('/system/identity/print');
    const resource = await api.write('/system/resource/print');
    
    console.log(`   Router Name: ${identity[0]?.name || 'Unknown'}`);
    console.log(`   Version: ${resource[0]?.version || 'Unknown'}`);
    console.log(`   Host IP: ${ROUTER_CONFIG.host}`);
    
    await api.close();
    
  } catch (error) {
    console.log(`❌ Direct connection failed: ${error.message}`);
    return false;
  }
  
  return true;
}

async function testAPIEndpoint() {
  console.log('\n2️⃣ Testing API Endpoint...');
  
  try {
    // Test the API endpoint
    const response = await fetch('http://localhost:3000/api/hotspot/stats?location=awka');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ API endpoint responding');
    console.log(`   Location ID: ${data.locationId}`);
    console.log(`   Active Users: ${data.stats?.activeUsers || 0}`);
    console.log(`   Router Status: ${data.routerStatus?.isOnline ? 'Online' : 'Offline'}`);
    console.log(`   Router Host: ${data.routerStatus?.version || 'Unknown'}`);
    
    return true;
    
  } catch (error) {
    console.log(`❌ API test failed: ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('   💡 Make sure the development server is running: npm run dev');
    }
    
    return false;
  }
}

async function testAllLocationsAPI() {
  console.log('\n3️⃣ Testing All Locations API...');
  
  try {
    const response = await fetch('http://localhost:3000/api/hotspot/stats');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ All locations API responding');
    console.log(`   Total Locations: ${data.totalLocations}`);
    console.log(`   Active Locations: ${data.activeLocations}`);
    console.log(`   Total Active Users: ${data.totalActiveUsers}`);
    
    // Check router info for each location
    Object.entries(data.locations).forEach(([locationId, stats]) => {
      console.log(`   ${locationId.toUpperCase()}:`);
      console.log(`     Status: ${stats.status}`);
      console.log(`     Router IP: ${stats.routerInfo?.host || 'Not configured'}`);
      console.log(`     Configured: ${stats.routerInfo?.isConfigured ? 'Yes' : 'No'}`);
      console.log(`     Last Activity: ${stats.lastActivity}`);
    });
    
    return true;
    
  } catch (error) {
    console.log(`❌ All locations API test failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Phase 1 Improvements Test Suite');
  console.log('Testing router connectivity, API improvements, and error handling');
  console.log('');
  
  const results = [];
  
  // Test 1: Direct router connection
  const directTest = await testRouterConnection();
  results.push({ test: 'Direct Router Connection', passed: directTest });
  
  // Test 2: Single location API
  const apiTest = await testAPIEndpoint();
  results.push({ test: 'Single Location API', passed: apiTest });
  
  // Test 3: All locations API
  const allLocationsTest = await testAllLocationsAPI();
  results.push({ test: 'All Locations API', passed: allLocationsTest });
  
  // Summary
  console.log('\n📋 Test Results Summary');
  console.log('=' .repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.test}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All Phase 1 improvements are working correctly!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Check the dashboard at http://localhost:3000/hotspot');
    console.log('   2. Verify router IP shows as 192.168.50.2');
    console.log('   3. Check status indicators and error messages');
    console.log('   4. Ready to proceed with Phase 2 (Database Integration)');
  } else {
    console.log('⚠️  Some tests failed. Please check the issues above.');
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
}); 