-- Account Creation Pricing Feature Migration
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

-- Add sample configuration for demonstration (can be customized per location)
-- Note: These are just examples and can be removed after implementation

-- Example: Enable pricing for Awka location with ₦5,000 account creation fee
INSERT INTO location_settings (location_id, setting_key, setting_value, setting_type, description) VALUES
('awka', 'account_creation_pricing_enabled', 'false', 'boolean', 'Enable paid account creation for this location')
ON CONFLICT (location_id, setting_key) DO NOTHING;

INSERT INTO location_settings (location_id, setting_key, setting_value, setting_type, description) VALUES
('awka', 'account_creation_price', '5000', 'number', 'Price in Naira for creating a new account at this location')
ON CONFLICT (location_id, setting_key) DO NOTHING;

INSERT INTO location_settings (location_id, setting_key, setting_value, setting_type, description) VALUES
('awka', 'account_creation_description', 'One-time account setup fee includes WiFi access configuration and initial setup', 'string', 'Description shown to users about the account creation fee')
ON CONFLICT (location_id, setting_key) DO NOTHING;

-- ============================================================================
-- UPDATE RENEWAL TRANSACTIONS TABLE FOR ACCOUNT CREATION TRACKING
-- ============================================================================

-- Add a new column to distinguish between renewal payments and account creation payments
-- This allows us to track and report on account creation revenue separately

ALTER TABLE renewal_transactions 
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) DEFAULT 'renewal' 
CHECK (transaction_type IN ('renewal', 'account_creation'));

-- Add index for better performance when filtering by transaction type
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_type ON renewal_transactions(transaction_type);

-- Add index for better performance when filtering by transaction type and date
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_type_date ON renewal_transactions(transaction_type, created_at);

-- Update comment to reflect the expanded use of this table
COMMENT ON TABLE renewal_transactions IS 'Tracks both renewal payments and account creation payments for commission and revenue tracking';
COMMENT ON COLUMN renewal_transactions.transaction_type IS 'Type of transaction: renewal (existing account) or account_creation (new account setup fee)';

-- ============================================================================
-- CREATE FUNCTION TO GET ACCOUNT CREATION PRICING CONFIG
-- ============================================================================

-- Helper function to easily retrieve account creation pricing configuration for a location
-- Returns a JSON object with all pricing settings
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

-- Verify the migration completed successfully
DO $$
BEGIN
    RAISE NOTICE '=== Account Creation Pricing Migration Completed ===';
    RAISE NOTICE 'Tables updated:';
    RAISE NOTICE '- renewal_transactions: Added transaction_type column';
    RAISE NOTICE 'Settings added:';
    RAISE NOTICE '- account_creation_pricing_enabled';
    RAISE NOTICE '- account_creation_price';
    RAISE NOTICE '- account_creation_description';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '- get_account_creation_pricing_config()';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update backend APIs to use new settings';
    RAISE NOTICE '2. Update frontend location management interface';
    RAISE NOTICE '3. Update registration flow to handle pricing';
    RAISE NOTICE '4. Test the complete implementation';
END $$;

COMMIT; 