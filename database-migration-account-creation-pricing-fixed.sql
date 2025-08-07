-- Account Creation Pricing Feature Migration (FIXED VERSION)
-- Run this script to add support for per-location account creation pricing
-- 
-- This migration adds new location settings to support:
-- - Enabling/disabling account creation pricing per location
-- - Setting custom pricing for account creation
-- - Adding description text for pricing

BEGIN;

-- ============================================================================
-- ACCOUNT CREATION PRICING SETTINGS
-- ============================================================================

-- These settings will be stored in the existing location_settings table
-- No schema changes needed as the table already supports flexible key-value settings

-- FIXED: Only add example configuration for locations that actually exist
-- We'll add settings for 'rubez' location which we know exists from testing

-- Check if rubez location exists and add pricing settings
DO $$
BEGIN
    -- Only insert if the location exists
    IF EXISTS (SELECT 1 FROM hotspot_locations WHERE id = 'rubez') THEN
        -- Enable pricing for Rubez location with ₦1,700 account creation fee
        INSERT INTO location_settings (location_id, setting_key, setting_value, setting_type, description) VALUES
        ('rubez', 'account_creation_pricing_enabled', 'true', 'boolean', 'Enable paid account creation for this location')
        ON CONFLICT (location_id, setting_key) DO NOTHING;

        INSERT INTO location_settings (location_id, setting_key, setting_value, setting_type, description) VALUES
        ('rubez', 'account_creation_price', '1700', 'number', 'Price in Naira for creating a new account at this location')
        ON CONFLICT (location_id, setting_key) DO NOTHING;

        INSERT INTO location_settings (location_id, setting_key, setting_value, setting_type, description) VALUES
        ('rubez', 'account_creation_description', 'Account setup fee', 'string', 'Description shown to users about the account creation fee')
        ON CONFLICT (location_id, setting_key) DO NOTHING;

        RAISE NOTICE 'Added account creation pricing settings for location: rubez';
    ELSE
        RAISE NOTICE 'Location rubez does not exist, skipping example settings';
    END IF;
END $$;

-- ============================================================================
-- UPDATE RENEWAL TRANSACTIONS TABLE FOR ACCOUNT CREATION TRACKING
-- ============================================================================

-- Add a new column to distinguish between renewal payments and account creation payments
-- This allows us to track and report on account creation revenue separately

ALTER TABLE renewal_transactions 
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) DEFAULT 'renewal' 
CHECK (transaction_type IN ('renewal', 'account_creation'));

-- IMPORTANT: Remove unique constraint on paystack_reference to allow combined payments
-- Combined payments create two transactions (account creation + service plan) with same reference
DROP CONSTRAINT IF EXISTS renewal_transactions_paystack_reference_key;

-- Create a composite unique constraint instead to prevent true duplicates
-- This allows same reference with different transaction types (combined payments)
-- but prevents duplicate transactions of the same type for the same reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_renewal_transactions_reference_type 
ON renewal_transactions(paystack_reference, transaction_type);

-- Add index for better performance when filtering by transaction type
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_type ON renewal_transactions(transaction_type);

-- Add index for better performance when filtering by transaction type and date
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_type_date ON renewal_transactions(transaction_type, created_at);

-- ============================================================================
-- CREATE HELPER FUNCTION FOR ACCOUNT CREATION PRICING
-- ============================================================================

-- Function to get account creation pricing configuration for a location
CREATE OR REPLACE FUNCTION get_account_creation_pricing_config(location_id_param VARCHAR)
RETURNS JSON AS $$
DECLARE
    pricing_enabled BOOLEAN DEFAULT FALSE;
    pricing_amount DECIMAL(10,2) DEFAULT 0;
    pricing_description TEXT DEFAULT '';
    result JSON;
BEGIN
    -- Get pricing enabled setting
    SELECT 
        CASE 
            WHEN setting_value = 'true' THEN TRUE 
            ELSE FALSE 
        END INTO pricing_enabled
    FROM location_settings 
    WHERE location_id = location_id_param 
    AND setting_key = 'account_creation_pricing_enabled';
    
    -- Get pricing amount
    SELECT 
        CAST(setting_value AS DECIMAL(10,2)) INTO pricing_amount
    FROM location_settings 
    WHERE location_id = location_id_param 
    AND setting_key = 'account_creation_price';
    
    -- Get pricing description
    SELECT 
        setting_value INTO pricing_description
    FROM location_settings 
    WHERE location_id = location_id_param 
    AND setting_key = 'account_creation_description';
    
    -- Build result JSON
    result := json_build_object(
        'enabled', COALESCE(pricing_enabled, FALSE),
        'price', COALESCE(pricing_amount, 0),
        'description', COALESCE(pricing_description, ''),
        'location_id', location_id_param
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add comment for the function
COMMENT ON FUNCTION get_account_creation_pricing_config(VARCHAR) IS 'Returns account creation pricing configuration for a location as JSON object';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show existing locations for reference
DO $$
DECLARE
    location_record RECORD;
BEGIN
    RAISE NOTICE '=== Existing Locations ===';
    FOR location_record IN SELECT id, display_name FROM hotspot_locations ORDER BY id LOOP
        RAISE NOTICE 'Location ID: %, Name: %', location_record.id, location_record.display_name;
    END LOOP;
    RAISE NOTICE '';
END $$;

-- Verify the migration completed successfully
DO $$
BEGIN
    RAISE NOTICE '=== Account Creation Pricing Migration Completed ===';
    RAISE NOTICE 'Tables updated:';
    RAISE NOTICE '- renewal_transactions: Added transaction_type column';
    RAISE NOTICE 'Settings structure:';
    RAISE NOTICE '- account_creation_pricing_enabled (boolean)';
    RAISE NOTICE '- account_creation_price (number)';
    RAISE NOTICE '- account_creation_description (string)';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '- get_account_creation_pricing_config()';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Add pricing settings for your specific locations using:';
    RAISE NOTICE '   INSERT INTO location_settings (location_id, setting_key, setting_value, setting_type, description)';
    RAISE NOTICE '   VALUES (''your_location_id'', ''account_creation_pricing_enabled'', ''true'', ''boolean'', ''Enable paid account creation'');';
    RAISE NOTICE '2. Test the pricing configuration API';
    RAISE NOTICE '3. Verify frontend integration';
END $$;

COMMIT; 