-- Helper script to add account creation pricing settings for any location
-- Usage: Replace 'YOUR_LOCATION_ID' with your actual location ID

-- First, check what locations exist in your database
SELECT 'Available locations:' as info;
SELECT id, display_name, city, state 
FROM hotspot_locations 
ORDER BY id;

-- Add pricing settings for a specific location (replace 'YOUR_LOCATION_ID')
-- Example for 'rubez' location:

DO $$
DECLARE
    target_location_id VARCHAR := 'rubez'; -- CHANGE THIS TO YOUR LOCATION ID
    pricing_enabled VARCHAR := 'true';      -- 'true' or 'false'
    pricing_amount VARCHAR := '1700';       -- Price in Naira
    pricing_desc VARCHAR := 'Account setup fee'; -- Description
BEGIN
    -- Check if location exists
    IF EXISTS (SELECT 1 FROM hotspot_locations WHERE id = target_location_id) THEN
        
        -- Add pricing enabled setting
        INSERT INTO location_settings (location_id, setting_key, setting_value, setting_type, description) 
        VALUES (target_location_id, 'account_creation_pricing_enabled', pricing_enabled, 'boolean', 'Enable paid account creation for this location')
        ON CONFLICT (location_id, setting_key) 
        DO UPDATE SET 
            setting_value = EXCLUDED.setting_value,
            updated_at = CURRENT_TIMESTAMP;

        -- Add pricing amount setting
        INSERT INTO location_settings (location_id, setting_key, setting_value, setting_type, description) 
        VALUES (target_location_id, 'account_creation_price', pricing_amount, 'number', 'Price in Naira for creating a new account at this location')
        ON CONFLICT (location_id, setting_key) 
        DO UPDATE SET 
            setting_value = EXCLUDED.setting_value,
            updated_at = CURRENT_TIMESTAMP;

        -- Add pricing description setting
        INSERT INTO location_settings (location_id, setting_key, setting_value, setting_type, description) 
        VALUES (target_location_id, 'account_creation_description', pricing_desc, 'string', 'Description shown to users about the account creation fee')
        ON CONFLICT (location_id, setting_key) 
        DO UPDATE SET 
            setting_value = EXCLUDED.setting_value,
            updated_at = CURRENT_TIMESTAMP;

        RAISE NOTICE 'Successfully added/updated pricing settings for location: %', target_location_id;
        RAISE NOTICE 'Enabled: %, Price: ₦%, Description: %', pricing_enabled, pricing_amount, pricing_desc;
        
    ELSE
        RAISE NOTICE 'ERROR: Location % does not exist in hotspot_locations table', target_location_id;
        RAISE NOTICE 'Available locations are listed above.';
    END IF;
END $$;

-- Verify the settings were added
SELECT 'Current pricing settings:' as info;
SELECT 
    ls.location_id,
    hl.display_name,
    ls.setting_key,
    ls.setting_value,
    ls.setting_type
FROM location_settings ls
JOIN hotspot_locations hl ON ls.location_id = hl.id
WHERE ls.setting_key LIKE 'account_creation_%'
ORDER BY ls.location_id, ls.setting_key; 