/**
 * Script to import account owners from owners.md into Supabase
 * Run with: node scripts/import-owners.js
 */

const fs = require('fs');
const path = require('path');

// Parse owners.md file
function parseOwnersFile() {
  try {
    const filePath = path.join(__dirname, '..', 'owners.md');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    // Skip header line
    const dataLines = lines.slice(1);
    
    const owners = [];
    
    dataLines.forEach((line, index) => {
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

// Main function
async function importOwners() {
  console.log('Starting owner import process...');
  
  const owners = parseOwnersFile();
  console.log(`Found ${owners.length} owners to import:`);
  
  // Display parsed owners for verification
  owners.forEach((owner, index) => {
    console.log(`${index + 1}. ${owner.owner_username} - ${owner.name}`);
    if (owner.email) {
      console.log(`   Email: ${owner.email}`);
    }
  });
  
  console.log('\n--- Sample Owner Data Structure ---');
  console.log(JSON.stringify(owners[0], null, 2));
  
  console.log('\nTo complete the import:');
  console.log('1. Set up your Supabase project');
  console.log('2. Run the database-schema.sql in Supabase SQL Editor');
  console.log('3. Update SUPABASE environment variables in .env.local');
  console.log('4. Create the actual insertion script with Supabase client');
  console.log('5. Run the import script');
}

// Run the import
if (require.main === module) {
  importOwners().catch(console.error);
}

module.exports = { parseOwnersFile, importOwners }; 