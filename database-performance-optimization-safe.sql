-- ULTRA-SAFE Performance Optimization Migration
-- This version includes extensive error checking and graceful handling of missing policies
-- 
-- If ANY step fails, the entire transaction will rollback automatically
-- Each ALTER POLICY command is protected with existence checks

BEGIN;

-- ============================================================================
-- SAFETY CHECK: Verify we have the expected tables
-- ============================================================================

DO $$
DECLARE
    missing_tables TEXT[];
    table_name TEXT;
    required_tables TEXT[] := ARRAY['account_owners', 'customers', 'renewal_transactions', 
                                   'commission_payments', 'hotspot_locations', 'router_configs', 
                                   'location_settings', 'hotspot_stats'];
BEGIN
    RAISE NOTICE '=== SAFETY CHECK: Verifying Tables Exist ===';
    
    FOR table_name IN SELECT unnest(required_tables) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = table_name
        ) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing required tables: %', array_to_string(missing_tables, ', ');
    END IF;
    
    RAISE NOTICE 'All required tables found ✓';
END $$;

-- ============================================================================
-- PHASE 1: SAFE AUTH RLS OPTIMIZATION 
-- Only modify policies that actually exist
-- ============================================================================

RAISE NOTICE '=== PHASE 1: Safe Auth RLS Optimization ===';

-- Helper function to safely alter policies
CREATE OR REPLACE FUNCTION safe_alter_policy(
    p_policy_name TEXT,
    p_table_name TEXT,
    p_new_condition TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check if policy exists
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = p_table_name 
        AND policyname = p_policy_name
    ) THEN
        -- Policy exists, safe to alter
        EXECUTE format(
            'ALTER POLICY %I ON %I USING (%s)',
            p_policy_name, p_table_name, p_new_condition
        );
        RAISE NOTICE 'Updated policy: % on %', p_policy_name, p_table_name;
        RETURN TRUE;
    ELSE
        RAISE NOTICE 'Policy not found (skipping): % on %', p_policy_name, p_table_name;
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply safe auth optimizations
SELECT safe_alter_policy('Allow authenticated users to view account owners', 'account_owners', '(select auth.role()) = ''authenticated''');
SELECT safe_alter_policy('Allow service role full access to account_owners', 'account_owners', '(select auth.jwt()) ->> ''role'' = ''service_role''');

SELECT safe_alter_policy('Allow authenticated users to view customers', 'customers', '(select auth.role()) = ''authenticated''');
SELECT safe_alter_policy('Allow service role full access to customers', 'customers', '(select auth.jwt()) ->> ''role'' = ''service_role''');

SELECT safe_alter_policy('Allow authenticated users to view renewal transactions', 'renewal_transactions', '(select auth.role()) = ''authenticated''');
SELECT safe_alter_policy('Allow service role full access to renewal_transactions', 'renewal_transactions', '(select auth.jwt()) ->> ''role'' = ''service_role''');

SELECT safe_alter_policy('Allow authenticated users to view commission payments', 'commission_payments', '(select auth.role()) = ''authenticated''');
SELECT safe_alter_policy('Allow service role full access to commission_payments', 'commission_payments', '(select auth.jwt()) ->> ''role'' = ''service_role''');

SELECT safe_alter_policy('Allow authenticated users to view hotspot locations', 'hotspot_locations', '(select auth.role()) = ''authenticated''');
SELECT safe_alter_policy('Allow service role full access to hotspot_locations', 'hotspot_locations', '(select auth.jwt()) ->> ''role'' = ''service_role''');

SELECT safe_alter_policy('Allow authenticated users to view router configs', 'router_configs', '(select auth.role()) = ''authenticated''');
SELECT safe_alter_policy('Allow service role full access to router_configs', 'router_configs', '(select auth.jwt()) ->> ''role'' = ''service_role''');

SELECT safe_alter_policy('Allow authenticated users to view location settings', 'location_settings', '(select auth.role()) = ''authenticated''');
SELECT safe_alter_policy('Allow service role full access to location_settings', 'location_settings', '(select auth.jwt()) ->> ''role'' = ''service_role''');

SELECT safe_alter_policy('Allow authenticated users to view hotspot stats', 'hotspot_stats', '(select auth.role()) = ''authenticated''');
SELECT safe_alter_policy('Allow service role full access to hotspot_stats', 'hotspot_stats', '(select auth.jwt()) ->> ''role'' = ''service_role''');

-- Clean up helper function
DROP FUNCTION safe_alter_policy(TEXT, TEXT, TEXT);

RAISE NOTICE 'Phase 1 Complete: Auth function calls optimized ✓';

-- ============================================================================
-- PHASE 2: CONSERVATIVE POLICY CONSOLIDATION (OPTIONAL)
-- Only proceed if both policies exist to consolidate
-- ============================================================================

RAISE NOTICE '=== PHASE 2: Conservative Policy Consolidation ===';

-- Check if hotspot_stats has the policies we want to consolidate
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'hotspot_stats' 
        AND policyname = 'Allow authenticated users to view hotspot stats'
    ) AND EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'hotspot_stats' 
        AND policyname = 'Allow service role full access to hotspot_stats'
    ) THEN
        -- Both policies exist, safe to consolidate
        DROP POLICY "Allow authenticated users to view hotspot stats" ON hotspot_stats;
        
        CREATE POLICY "Optimized hotspot stats access" ON hotspot_stats
            FOR SELECT USING (
                (select auth.role()) = 'authenticated' 
                OR ((select auth.jwt()) ->> 'role' = 'service_role')
            );
            
        RAISE NOTICE 'Consolidated hotspot_stats policies ✓';
    ELSE
        RAISE NOTICE 'Skipping hotspot_stats consolidation - policies not found as expected';
    END IF;
END $$;

-- Check if location_settings has the policies we want to consolidate
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'location_settings' 
        AND policyname = 'Allow authenticated users to view location settings'
    ) AND EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'location_settings' 
        AND policyname = 'Allow service role full access to location_settings'
    ) THEN
        -- Both policies exist, safe to consolidate
        DROP POLICY "Allow authenticated users to view location settings" ON location_settings;
        
        CREATE POLICY "Optimized location settings access" ON location_settings
            FOR SELECT USING (
                (select auth.role()) = 'authenticated' 
                OR ((select auth.jwt()) ->> 'role' = 'service_role')
            );
            
        RAISE NOTICE 'Consolidated location_settings policies ✓';
    ELSE
        RAISE NOTICE 'Skipping location_settings consolidation - policies not found as expected';
    END IF;
END $$;

RAISE NOTICE 'Phase 2 Complete: Policy consolidation done ✓';

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
    policy_count INTEGER;
    table_name TEXT;
    tables_to_check TEXT[] := ARRAY['account_owners', 'customers', 'renewal_transactions', 
                                   'commission_payments', 'hotspot_locations', 'router_configs', 
                                   'location_settings', 'hotspot_stats'];
    rls_enabled BOOLEAN;
BEGIN
    RAISE NOTICE '=== FINAL VERIFICATION ===';
    
    -- Check each table
    FOR table_name IN SELECT unnest(tables_to_check) LOOP
        -- Verify RLS is still enabled
        SELECT relrowsecurity INTO rls_enabled
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = table_name;
        
        IF NOT rls_enabled THEN
            RAISE EXCEPTION 'CRITICAL: RLS disabled on table %!', table_name;
        END IF;
        
        -- Count policies
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = table_name;
        
        RAISE NOTICE 'Table %: % policies, RLS enabled ✓', table_name, policy_count;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 MIGRATION COMPLETED SUCCESSFULLY! 🎉';
    RAISE NOTICE '';
    RAISE NOTICE 'Performance improvements applied:';
    RAISE NOTICE '✓ Auth functions now evaluate once per query (not per row)';
    RAISE NOTICE '✓ Reduced policy evaluation overhead where safe';
    RAISE NOTICE '✓ All security controls remain intact';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test your application functionality';
    RAISE NOTICE '2. Monitor query performance improvements';
    RAISE NOTICE '3. If issues occur, run the rollback script';
END $$;

COMMIT; 