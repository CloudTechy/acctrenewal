-- EMERGENCY ROLLBACK Script
-- Run this ONLY if the performance migration causes issues
-- This restores all policies to their original unoptimized state

BEGIN;

RAISE NOTICE '=== EMERGENCY ROLLBACK: Restoring Original Policies ===';

-- ============================================================================
-- STEP 1: Remove optimized policies that were created in migration
-- ============================================================================

DROP POLICY IF EXISTS "Optimized hotspot stats access" ON hotspot_stats;
DROP POLICY IF EXISTS "Optimized location settings access" ON location_settings;

-- ============================================================================
-- STEP 2: Restore original individual policies
-- ============================================================================

-- Restore original hotspot_stats policies (unoptimized)
CREATE POLICY "Allow authenticated users to view hotspot stats" ON hotspot_stats
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role full access to hotspot_stats" ON hotspot_stats
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Restore original location_settings policies (unoptimized)
CREATE POLICY "Allow authenticated users to view location settings" ON location_settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role full access to location_settings" ON location_settings
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- STEP 3: Restore ALL other policies to unoptimized versions
-- (Remove the subquery optimization)
-- ============================================================================

-- account_owners policies
ALTER POLICY "Allow authenticated users to view account owners" ON account_owners
    USING (auth.role() = 'authenticated');

ALTER POLICY "Allow service role full access to account_owners" ON account_owners
    USING (auth.jwt() ->> 'role' = 'service_role');

-- customers policies
ALTER POLICY "Allow authenticated users to view customers" ON customers
    USING (auth.role() = 'authenticated');

ALTER POLICY "Allow service role full access to customers" ON customers
    USING (auth.jwt() ->> 'role' = 'service_role');

-- renewal_transactions policies
ALTER POLICY "Allow authenticated users to view renewal transactions" ON renewal_transactions
    USING (auth.role() = 'authenticated');

ALTER POLICY "Allow service role full access to renewal_transactions" ON renewal_transactions
    USING (auth.jwt() ->> 'role' = 'service_role');

-- commission_payments policies
ALTER POLICY "Allow authenticated users to view commission payments" ON commission_payments
    USING (auth.role() = 'authenticated');

ALTER POLICY "Allow service role full access to commission_payments" ON commission_payments
    USING (auth.jwt() ->> 'role' = 'service_role');

-- hotspot_locations policies
ALTER POLICY "Allow authenticated users to view hotspot locations" ON hotspot_locations
    USING (auth.role() = 'authenticated');

ALTER POLICY "Allow service role full access to hotspot_locations" ON hotspot_locations
    USING (auth.jwt() ->> 'role' = 'service_role');

-- router_configs policies
ALTER POLICY "Allow authenticated users to view router configs" ON router_configs
    USING (auth.role() = 'authenticated');

ALTER POLICY "Allow service role full access to router_configs" ON router_configs
    USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- STEP 4: Verify rollback success
-- ============================================================================

DO $$
DECLARE
    policy_count INTEGER;
    table_name TEXT;
    tables_to_check TEXT[] := ARRAY['account_owners', 'customers', 'renewal_transactions', 
                                   'commission_payments', 'hotspot_locations', 'router_configs', 
                                   'location_settings', 'hotspot_stats'];
BEGIN
    RAISE NOTICE '=== ROLLBACK VERIFICATION ===';
    
    -- Check that all tables still have RLS enabled
    FOR table_name IN SELECT unnest(tables_to_check) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c 
            JOIN pg_namespace n ON n.oid = c.relnamespace 
            WHERE n.nspname = 'public' 
            AND c.relname = table_name 
            AND c.relrowsecurity = true
        ) THEN
            RAISE EXCEPTION 'ERROR: Table % does not have RLS enabled!', table_name;
        END IF;
        
        -- Count policies for each table
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = table_name;
        
        RAISE NOTICE 'Table %: % policies active', table_name, policy_count;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'ROLLBACK COMPLETED SUCCESSFULLY!';
    RAISE NOTICE 'All policies have been restored to their original unoptimized state.';
    RAISE NOTICE 'Your database should now work exactly as it did before the migration.';
END $$;

COMMIT; 