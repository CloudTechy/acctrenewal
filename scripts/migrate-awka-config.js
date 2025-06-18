#!/usr/bin/env node

/**
 * Migration script to populate database with existing Awka router configuration
 * Run this script to migrate from environment variables to database storage
 */

const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// We need to use require for the database functions since this is a CommonJS script
async function migrateAwkaConfig() {
  console.log('🚀 Starting Awka configuration migration...');

  try {
    // Import the database functions dynamically
    const { 
      createHotspotLocation, 
      createRouterConfig, 
      encryptPassword,
      getHotspotLocation,
      getRouterConfig 
    } = await import('../src/lib/database.js');

    // Check if location already exists
    const existingLocation = await getHotspotLocation('awka');
    
    if (!existingLocation) {
      // Create Awka location
      console.log('📍 Creating Awka location...');
      const location = await createHotspotLocation({
        id: 'awka',
        name: 'Awka',
        display_name: 'PHSWEB Awka Branch',
        status: 'active',
        description: 'Main branch in Awka, Anambra State',
        city: 'Awka',
        state: 'Anambra',
        country: 'Nigeria',
        is_active: true
      });

      if (location) {
        console.log('✅ Awka location created successfully');
      } else {
        console.error('❌ Failed to create Awka location');
        return;
      }
    } else {
      console.log('📍 Awka location already exists, skipping...');
    }

    // Check if router config already exists
    const existingConfig = await getRouterConfig('awka');
    
    if (!existingConfig) {
      // Create router configuration from environment variables
      console.log('🔧 Creating router configuration...');
      
      const host = process.env.MIKROTIK_AWKA_HOST || '192.168.50.2';
      const username = process.env.MIKROTIK_AWKA_USER || 'admin';
      const password = process.env.MIKROTIK_AWKA_PASSWORD || 'sm@phswebawka';
      const port = parseInt(process.env.MIKROTIK_AWKA_PORT || '8728');
      const apiPort = 80; // REST API port

      const config = await createRouterConfig({
        location_id: 'awka',
        host,
        username,
        password_encrypted: encryptPassword(password),
        port,
        api_port: apiPort,
        connection_type: 'api',
        is_active: true,
        connection_status: 'unknown'
      });

      if (config) {
        console.log('✅ Router configuration created successfully');
        console.log(`   - Host: ${host}`);
        console.log(`   - Username: ${username}`);
        console.log(`   - Port: ${port}`);
        console.log(`   - API Port: ${apiPort}`);
      } else {
        console.error('❌ Failed to create router configuration');
        return;
      }
    } else {
      console.log('🔧 Router configuration already exists, skipping...');
    }

    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Test the hotspot management dashboard at /hotspot');
    console.log('2. Verify that router stats are loading from the database');
    console.log('3. Add more locations through the dashboard interface');
    console.log('');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateAwkaConfig(); 