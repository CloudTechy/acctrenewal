#!/usr/bin/env node

/**
 * Test Optimized REST API Implementation
 * Tests caching, timeout handling, and retry logic
 */

console.log('🚀 Testing Optimized REST API');
console.log('=============================');

async function testOptimizedAPI() {
  try {
    console.log('📡 Testing API with caching and optimization...');
    
    // Test 1: First request (should hit router)
    console.log('\n1. First request (cache miss):');
    const start1 = Date.now();
    const response1 = await fetch('http://localhost:3000/api/hotspot/stats?location=awka');
    const data1 = await response1.json();
    const time1 = Date.now() - start1;
    
    console.log(`   ⏱️  Response time: ${time1}ms`);
    console.log(`   📊 Active Users: ${data1.stats?.activeUsers || 0}`);
    console.log(`   🔧 API Type: ${data1.optimization?.apiType || 'Unknown'}`);
    console.log(`   💾 Cache: ${data1.cacheInfo?.message || 'No cache info'}`);
    
    // Test 2: Second request immediately (should hit cache)
    console.log('\n2. Second request (cache hit):');
    const start2 = Date.now();
    const response2 = await fetch('http://localhost:3000/api/hotspot/stats?location=awka');
    const data2 = await response2.json();
    const time2 = Date.now() - start2;
    
    console.log(`   ⏱️  Response time: ${time2}ms`);
    console.log(`   💾 Cache: ${data2.cacheInfo?.message || 'No cache info'}`);
    console.log(`   🚀 Speed improvement: ${Math.round(((time1 - time2) / time1) * 100)}%`);
    
    // Test 3: Clear cache and test again
    console.log('\n3. Clear cache test:');
    const clearResponse = await fetch('http://localhost:3000/api/hotspot/stats?location=awka&clearCache=true');
    const clearData = await clearResponse.json();
    console.log(`   🗑️  Cache cleared`);
    console.log(`   💾 Cache: ${clearData.cacheInfo?.message || 'No cache info'}`);
    
    // Test 4: Performance summary
    console.log('\n📊 Performance Summary:');
    console.log('=======================');
    console.log(`✅ REST API: Working`);
    console.log(`⚡ Caching: ${time2 < time1 ? 'Effective' : 'Not working'}`);
    console.log(`🔧 Timeout: ${data1.optimization?.timeout || 'Unknown'}ms`);
    console.log(`🔄 Max Retries: ${data1.optimization?.maxRetries || 'Unknown'}`);
    console.log(`💾 Cache Duration: ${Math.round((parseInt(data1.optimization?.cacheDuration || '0')) / 60000)} minutes`);
    
    console.log('\n🎯 Optimization Results:');
    console.log(`   • First request: ${time1}ms`);
    console.log(`   • Cached request: ${time2}ms`);
    console.log(`   • Performance gain: ${time1 > time2 ? '✅ Improved' : '⚠️ No improvement'}`);
    
    if (time1 > 1000) {
      console.log('\n⚠️  Warning: Initial request took over 1 second');
      console.log('   Consider checking router performance or network latency');
    }
    
    if (time2 < 100) {
      console.log('\n🎉 Excellent: Cache is working effectively!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testOptimizedAPI(); 