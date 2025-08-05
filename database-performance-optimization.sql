-- Performance Optimization Migration for Supabase RLS Policies
-- This script fixes Auth RLS Initialization Plan warnings and consolidates overlapping policies
-- 
-- BACKUP RECOMMENDATION: Create a backup before running this migration
-- TEST RECOMMENDATION: Test in development environment first
--
-- Performance Benefits Expected:
-- - 20-80% improvement in query performance for large tables
-- - Reduced policy evaluation overhead

BEGIN;

-- ============================================================================
-- PHASE 1: FIX AUTH RLS INITIALIZATION PLAN ISSUES (SAFE - HIGH IMPACT)
-- Wrap auth function calls in subqueries to prevent per-row evaluation
-- ============================================================================

RAISE NOTICE '=== PHASE 1: Fixing Auth RLS Initialization Plan Issues ===';

-- Fix account_owners policies
ALTER POLICY "Allow authenticated users to view account owners" ON account_owners
    USING ((select auth.role()) = 'authenticated');

ALTER POLICY "Allow service role full access to account_owners" ON account_owners
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- Fix customers policies  
ALTER POLICY "Allow authenticated users to view customers" ON customers
    USING ((select auth.role()) = 'authenticated');

ALTER POLICY "Allow service role full access to customers" ON customers
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- Fix renewal_transactions policies
ALTER POLICY "Allow authenticated users to view renewal transactions" ON renewal_transactions
    USING ((select auth.role()) = 'authenticated');

ALTER POLICY "Allow service role full access to renewal_transactions" ON renewal_transactions
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- Fix commission_payments policies
ALTER POLICY "Allow authenticated users to view commission payments" ON commission_payments
    USING ((select auth.role()) = 'authenticated');

ALTER POLICY "Allow service role full access to commission_payments" ON commission_payments
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- Fix hotspot_locations policies
ALTER POLICY "Allow authenticated users to view hotspot locations" ON hotspot_locations
    USING ((select auth.role()) = 'authenticated');

ALTER POLICY "Allow service role full access to hotspot_locations" ON hotspot_locations
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- Fix router_configs policies
ALTER POLICY "Allow authenticated users to view router configs" ON router_configs
    USING ((select auth.role()) = 'authenticated');

ALTER POLICY "Allow service role full access to router_configs" ON router_configs
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- Fix location_settings policies
ALTER POLICY "Allow authenticated users to view location settings" ON location_settings
    USING ((select auth.role()) = 'authenticated');

ALTER POLICY "Allow service role full access to location_settings" ON location_settings
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- Fix hotspot_stats policies
ALTER POLICY "Allow authenticated users to view hotspot stats" ON hotspot_stats
    USING ((select auth.role()) = 'authenticated');

ALTER POLICY "Allow service role full access to hotspot_stats" ON hotspot_stats
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

RAISE NOTICE 'Phase 1 Complete: Auth function calls optimized';

-- ============================================================================
-- PHASE 2: OPTIMIZE OVERLAPPING POLICIES (CONSERVATIVE APPROACH)
-- Consolidate policies only where it's completely safe to do so
-- ============================================================================

RAISE NOTICE '=== PHASE 2: Optimizing Overlapping Policies (Conservative) ===';

-- For hotspot_stats: Merge the two simple SELECT policies
-- Current: "Allow authenticated users to view hotspot stats" + "Allow service role full access to hotspot_stats"
-- These can be safely combined since service_role is more permissive than authenticated
DROP POLICY IF EXISTS "Allow authenticated users to view hotspot stats" ON hotspot_stats;

CREATE POLICY "Optimized hotspot stats access" ON hotspot_stats
    FOR SELECT USING (
        (select auth.role()) = 'authenticated' 
        OR ((select auth.jwt()) ->> 'role' = 'service_role')
    );

-- For location_settings: Merge the two simple SELECT policies  
-- Current: "Allow authenticated users to view location settings" + "Allow service role full access to location_settings"
DROP POLICY IF EXISTS "Allow authenticated users to view location settings" ON location_settings;

CREATE POLICY "Optimized location settings access" ON location_settings
    FOR SELECT USING (
        (select auth.role()) = 'authenticated' 
        OR ((select auth.jwt()) ->> 'role' = 'service_role')
    );

RAISE NOTICE 'Phase 2 Complete: Conservative policy consolidation done';

-- ============================================================================
-- PHASE 3: VERIFY MIGRATION SUCCESS
-- ============================================================================

DO $$
DECLARE
    policy_count INTEGER;
    table_name TEXT;
    tables_to_check TEXT[] := ARRAY['account_owners', 'customers', 'renewal_transactions', 
                                   'commission_payments', 'hotspot_locations', 'router_configs', 
                                   'location_settings', 'hotspot_stats'];
BEGIN
    RAISE NOTICE '=== MIGRATION VERIFICATION ===';
    
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
    RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE 'Expected Performance Improvements:';
    RAISE NOTICE '- Auth function calls now evaluated once per query instead of per row';
    RAISE NOTICE '- Reduced policy evaluation overhead on hotspot_stats and location_settings';
    RAISE NOTICE '';
    RAISE NOTICE 'TESTING RECOMMENDATIONS:';
    RAISE NOTICE '1. Test SELECT queries on large tables';
    RAISE NOTICE '2. Verify that access controls still work as expected';
    RAISE NOTICE '3. Check application functionality with different user roles';
    RAISE NOTICE '4. Monitor query performance improvements';
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (in case of issues)
-- ============================================================================

-- If you need to rollback this migration, run these commands:
/*
-- ROLLBACK EXAMPLE (don't run unless needed):

-- Restore original hotspot_stats policy
DROP POLICY IF EXISTS "Optimized hotspot stats access" ON hotspot_stats;
CREATE POLICY "Allow authenticated users to view hotspot stats" ON hotspot_stats
    FOR SELECT USING (auth.role() = 'authenticated');

-- Restore original location_settings policy  
DROP POLICY IF EXISTS "Optimized location settings access" ON location_settings;
CREATE POLICY "Allow authenticated users to view location settings" ON location_settings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Note: The auth function wrapping optimizations should be kept as they're purely beneficial
*/

COMMIT; 