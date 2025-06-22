-- Hotspot Registration Database Migration
-- Run this in your Supabase SQL Editor to add hotspot registration support
-- IMPORTANT: This extends existing tables without breaking current functionality

-- ============================================================================
-- BACKUP RECOMMENDATION: Create a backup before running this migration
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. EXTEND CUSTOMERS TABLE (CRITICAL)
-- Add hotspot-specific fields to existing customers table
-- ============================================================================

-- Add new columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS wifi_password VARCHAR(4); -- 4-digit unencrypted password
ALTER TABLE customers ADD COLUMN IF NOT EXISTS registration_source VARCHAR(50) DEFAULT 'manual'; -- 'hotspot_registration', 'manual', 'import'
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location_id VARCHAR(50); -- Track registration location
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_hotspot_user BOOLEAN DEFAULT false; -- Quick filter for hotspot users

-- Add foreign key constraint for location_id (if hotspot_locations table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hotspot_locations') THEN
        ALTER TABLE customers ADD CONSTRAINT fk_customers_location_id 
        FOREIGN KEY (location_id) REFERENCES hotspot_locations(id);
    END IF;
END $$;

-- Add indexes for performance on new fields
CREATE INDEX IF NOT EXISTS idx_customers_location_id ON customers(location_id);
CREATE INDEX IF NOT EXISTS idx_customers_is_hotspot_user ON customers(is_hotspot_user);
CREATE INDEX IF NOT EXISTS idx_customers_registration_source ON customers(registration_source);

-- ============================================================================
-- 2. EXTEND HOTSPOT_LOCATIONS TABLE
-- Add group ID and owner assignment fields
-- ============================================================================

-- Add new columns to hotspot_locations table
ALTER TABLE hotspot_locations ADD COLUMN IF NOT EXISTS group_id INTEGER;
ALTER TABLE hotspot_locations ADD COLUMN IF NOT EXISTS default_owner_id UUID;
ALTER TABLE hotspot_locations ADD COLUMN IF NOT EXISTS registration_enabled BOOLEAN DEFAULT true;

-- Add foreign key constraint for default_owner_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_owners') THEN
        ALTER TABLE hotspot_locations ADD CONSTRAINT fk_hotspot_locations_default_owner_id 
        FOREIGN KEY (default_owner_id) REFERENCES account_owners(id);
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_hotspot_locations_group_id ON hotspot_locations(group_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_locations_default_owner_id ON hotspot_locations(default_owner_id);
CREATE INDEX IF NOT EXISTS idx_hotspot_locations_registration_enabled ON hotspot_locations(registration_enabled);

-- ============================================================================
-- 3. UPDATE SAMPLE DATA (SAFE - ONLY IF RECORDS EXIST)
-- Add default values for existing locations
-- ============================================================================

-- Update existing Awka location with default values (if it exists)
UPDATE hotspot_locations 
SET 
    group_id = 1,
    default_owner_id = (SELECT id FROM account_owners WHERE is_active = true LIMIT 1),
    registration_enabled = true
WHERE id = 'awka' AND group_id IS NULL;

-- ============================================================================
-- 4. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN customers.wifi_password IS '4-digit unencrypted password for hotspot access and future customer portal';
COMMENT ON COLUMN customers.registration_source IS 'Source of customer registration: hotspot_registration, manual, import';
COMMENT ON COLUMN customers.location_id IS 'Location where customer registered (for hotspot users)';
COMMENT ON COLUMN customers.is_hotspot_user IS 'Flag to identify customers who registered via hotspot';

COMMENT ON COLUMN hotspot_locations.group_id IS 'Radius Manager group ID for users registered at this location';
COMMENT ON COLUMN hotspot_locations.default_owner_id IS 'Default account owner for commission tracking';
COMMENT ON COLUMN hotspot_locations.registration_enabled IS 'Whether new user registration is enabled for this location';

-- ============================================================================
-- 5. VERIFY MIGRATION SUCCESS
-- ============================================================================

-- Display summary of changes
DO $$
DECLARE
    customer_count INTEGER;
    location_count INTEGER;
    owner_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO customer_count FROM customers;
    SELECT COUNT(*) INTO location_count FROM hotspot_locations;
    SELECT COUNT(*) INTO owner_count FROM account_owners WHERE is_active = true;
    
    RAISE NOTICE '=== MIGRATION COMPLETED SUCCESSFULLY ===';
    RAISE NOTICE 'Customers table: % records (all preserved)', customer_count;
    RAISE NOTICE 'Hotspot locations: % records', location_count;
    RAISE NOTICE 'Active account owners: % records', owner_count;
    RAISE NOTICE '';
    RAISE NOTICE 'New fields added to customers table:';
    RAISE NOTICE '- wifi_password (VARCHAR(4))';
    RAISE NOTICE '- registration_source (VARCHAR(50))';
    RAISE NOTICE '- location_id (VARCHAR(50))';
    RAISE NOTICE '- is_hotspot_user (BOOLEAN)';
    RAISE NOTICE '';
    RAISE NOTICE 'New fields added to hotspot_locations table:';
    RAISE NOTICE '- group_id (INTEGER)';
    RAISE NOTICE '- default_owner_id (UUID)';
    RAISE NOTICE '- registration_enabled (BOOLEAN)';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Update application code to use new fields';
    RAISE NOTICE '2. Test hotspot registration flow';
    RAISE NOTICE '3. Verify commission dashboard still works';
    RAISE NOTICE '4. Configure group IDs and owners for each location';
END $$;

COMMIT; 