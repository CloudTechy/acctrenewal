-- Update router_configs table to use plain text passwords
-- Run this in your Supabase SQL editor

-- Step 1: Rename the encrypted password column to plain text password
ALTER TABLE router_configs RENAME COLUMN password_encrypted TO password;

-- Step 2: Update existing encrypted passwords to plain text
-- WARNING: This will replace all existing encrypted passwords with the plain text version
UPDATE router_configs 
SET password = 'sm@phswebawka' 
WHERE location_id = 'awka';

-- Step 3: Add a comment to the column to indicate it's plain text
COMMENT ON COLUMN router_configs.password IS 'Plain text password - no encryption (for debugging)';

-- Optional: If you want to clear connection status to retest
UPDATE router_configs 
SET connection_status = 'unknown', 
    last_connected_at = NULL, 
    last_error = NULL;

-- Verify the changes
SELECT location_id, host, username, password, connection_status 
FROM router_configs 
WHERE is_active = true; 