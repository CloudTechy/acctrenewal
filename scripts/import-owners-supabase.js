/**
 * Script to import account owners from owners.md into Supabase
 * Run with: node scripts/import-owners-supabase.js
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Parse owners.md file
function parseOwnersFile() {
  try {
    const filePath = path.join(__dirname, '..', 'owners.md');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // Skip header line
    const dataLines = lines.slice(1);
    
    const owners = [];
    
    dataLines.forEach((line) => {
      const parts = line.split('\t').map(part => part.trim());
      
      if (parts.length >= 1) {
        const ownerUsername = parts[0];
        const firstName = parts[1] || '';
        const lastName = parts[2] || '';
        
        // Skip empty or admin entries
        if (!ownerUsername || ownerUsername === 'admin') {
          return;
        }
        
        // Construct full name
        let fullName = '';
        let email = '';
        
        if (firstName && lastName) {
          fullName = `${firstName} ${lastName}`.trim();
        } else if (firstName) {
          fullName = firstName;
        }
        
        // Check if owner username is an email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(ownerUsername)) {
          email = ownerUsername;
          if (!fullName) {
            // Extract name from email if no name provided
            fullName = ownerUsername.split('@')[0].replace(/[._]/g, ' ');
          }
        }
        
        const ownerData = {
          owner_username: ownerUsername,
          name: fullName || ownerUsername, // Use username as fallback
          first_name: firstName || null,
          last_name: lastName || null,
          email: email || null,
          commission_rate: 10.00, // Default 10%
          is_active: true
        };
        
        owners.push(ownerData);
      }
    });
    
    return owners;
  } catch (error) {
    console.error('Error parsing owners file:', error);
    return [];
  }
}

// Insert owner into Supabase
async function insertOwner(ownerData) {
  try {
    const { data, error } = await supabase
      .from('account_owners')
      .insert(ownerData)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

// Main function
async function importOwners() {
  console.log('🚀 Starting Supabase owner import process...\n');
  
  // Test Supabase connection
  try {
    const { count, error } = await supabase
      .from('account_owners')
      .select('*', { count: 'exact', head: true });
      
    if (error) {
      console.error('❌ Failed to connect to Supabase:', error.message);
      process.exit(1);
    }
    console.log('✅ Connected to Supabase successfully');
    console.log(`📊 Current owners in database: ${count || 0}\n`);
  } catch (error) {
    console.error('❌ Supabase connection error:', error.message);
    process.exit(1);
  }
  
  const owners = parseOwnersFile();
  console.log(`📁 Found ${owners.length} owners to import:\n`);
  
  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;
  
  for (const [index, owner] of owners.entries()) {
    const progress = `[${index + 1}/${owners.length}]`;
    
    try {
      const { data, error } = await insertOwner(owner);
      
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`⏭️  ${progress} ${owner.owner_username} - Already exists, skipping`);
          skipCount++;
        } else {
          console.error(`❌ ${progress} ${owner.owner_username} - Error: ${error.message}`);
          errorCount++;
        }
      } else {
        console.log(`✅ ${progress} ${owner.owner_username} - ${data.name} (${data.commission_rate}%)`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ ${progress} ${owner.owner_username} - Exception: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log('\n📊 Import Summary:');
  console.log(`✅ Successfully imported: ${successCount}`);
  console.log(`⏭️  Already existed: ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📁 Total processed: ${owners.length}`);
  
  if (successCount > 0) {
    console.log('\n🎉 Owner import completed successfully!');
    console.log('Next steps:');
    console.log('1. Check your Supabase dashboard to verify the data');
    console.log('2. Test a customer renewal to see commission tracking in action');
    console.log('3. Assign customers to owners for commission tracking');
  }
}

// Run the import
if (require.main === module) {
  importOwners().catch((error) => {
    console.error('💥 Import failed:', error);
    process.exit(1);
  });
}

module.exports = { parseOwnersFile, importOwners }; 