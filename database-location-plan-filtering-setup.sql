-- Location-Specific Plan Filtering Setup
-- Run this script to configure initial location plan settings
-- 
-- This script sets up sample configurations for locations to demonstrate
-- the location-specific service plan filtering functionality

BEGIN;

-- ============================================================================
-- LOCATION PLAN FILTERING CONFIGURATION
-- ============================================================================

-- Clear any existing plan configuration settings (for clean setup)
DELETE FROM location_settings 
WHERE setting_key IN ('allowed_service_plans', 'default_service_plan');

-- ============================================================================
-- AWKA LOCATION CONFIGURATION
-- Basic internet plans for general public access
-- ============================================================================

INSERT INTO location_settings (location_id, setting_key, setting_value, setting_type, description) VALUES
('awka', 'allowed_service_plans', '["33", "34", "35"]', 'json', 'Service plans available at Awka location - Basic plans for general access'),
('awka', 'default_service_plan', '33', 'string', 'Default plan auto-selected for new registrations at Awka - Free plan');

-- ============================================================================
-- SAMPLE ADDITIONAL LOCATIONS (uncomment and modify as needed)
-- ============================================================================

-- Lagos location - Premium location with more plan options
-- INSERT INTO location_settings (location_id, setting_key, setting_value, setting_type, description) VALUES
-- ('lagos', 'allowed_service_plans', '["33", "34", "35", "36", "37"]', 'json', 'Service plans available at Lagos location - Extended plan options'),
-- ('lagos', 'default_service_plan', '34', 'string', 'Default plan auto-selected for new registrations at Lagos');

-- Abuja location - Business area with premium plans only
-- INSERT INTO location_settings (location_id, setting_key, setting_value, setting_type, description) VALUES
-- ('abuja', 'allowed_service_plans', '["36", "37", "38"]', 'json', 'Service plans available at Abuja location - Premium plans only'),
-- ('abuja', 'default_service_plan', '36', 'string', 'Default plan auto-selected for new registrations at Abuja');

-- ============================================================================
-- VERIFICATION AND TESTING
-- ============================================================================

-- Display the configured settings
DO $$
DECLARE
    config_count INTEGER;
    location_record RECORD;
BEGIN
    -- Count total configurations
    SELECT COUNT(*) INTO config_count 
    FROM location_settings 
    WHERE setting_key IN ('allowed_service_plans', 'default_service_plan');
    
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'LOCATION PLAN FILTERING SETUP COMPLETED';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Total configuration entries: %', config_count;
    RAISE NOTICE '';
    
    -- Show configuration for each location
    FOR location_record IN 
        SELECT DISTINCT location_id 
        FROM location_settings 
        WHERE setting_key IN ('allowed_service_plans', 'default_service_plan')
        ORDER BY location_id
    LOOP
        RAISE NOTICE 'Location: %', location_record.location_id;
        
        -- Show allowed plans
        DECLARE
            allowed_plans TEXT;
            default_plan TEXT;
        BEGIN
            SELECT setting_value INTO allowed_plans 
            FROM location_settings 
            WHERE location_id = location_record.location_id 
            AND setting_key = 'allowed_service_plans';
            
            SELECT setting_value INTO default_plan 
            FROM location_settings 
            WHERE location_id = location_record.location_id 
            AND setting_key = 'default_service_plan';
            
            RAISE NOTICE '  - Allowed Plans: %', COALESCE(allowed_plans, 'Not configured');
            RAISE NOTICE '  - Default Plan: %', COALESCE(default_plan, 'Not configured');
            RAISE NOTICE '';
        END;
    END LOOP;
    
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Verify configurations by querying location_settings table';
    RAISE NOTICE '2. Test API endpoints with location-specific plan filtering';
    RAISE NOTICE '3. Add configurations for additional locations as needed';
    RAISE NOTICE '4. Update application code to use location-specific endpoints';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- HELPER QUERIES FOR TESTING
-- ============================================================================

-- Query to view all location plan configurations
-- SELECT 
--     ls.location_id,
--     hl.display_name,
--     ls.setting_key,
--     ls.setting_value,
--     ls.description
-- FROM location_settings ls
-- JOIN hotspot_locations hl ON ls.location_id = hl.id
-- WHERE ls.setting_key IN ('allowed_service_plans', 'default_service_plan')
-- ORDER BY ls.location_id, ls.setting_key;

-- Query to get allowed plans for a specific location (example for 'awka')
-- SELECT setting_value 
-- FROM location_settings 
-- WHERE location_id = 'awka' 
-- AND setting_key = 'allowed_service_plans';

COMMIT; 