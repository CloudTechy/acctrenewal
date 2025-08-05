-- CUSTOM Performance Optimization Migration (SIMPLIFIED)
-- This version focuses on core functionality without problematic formatting

BEGIN;

-- ============================================================================
-- SAFETY CHECK: Verify tables exist
-- ============================================================================

DO $$
DECLARE
    missing_tables TEXT[];
    current_table TEXT;
    required_tables TEXT[] := ARRAY['account_owners', 'customers', 'renewal_transactions', 
                                   'commission_payments', 'hotspot_locations', 'router_configs', 
                                   'location_settings', 'hotspot_stats', 'admin_users', 'audit_logs'];
BEGIN
    RAISE NOTICE 'SAFETY CHECK: Verifying Tables Exist';
    
    FOR current_table IN SELECT unnest(required_tables) LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = current_table
        ) THEN
            missing_tables := array_append(missing_tables, current_table);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing required tables: %', array_to_string(missing_tables, ', ');
    END IF;
    
    RAISE NOTICE 'All required tables found';
END $$;

-- ============================================================================
-- PHASE 1: OPTIMIZE AUTH FUNCTION CALLS
-- ============================================================================

-- Helper function to safely alter policies
CREATE OR REPLACE FUNCTION safe_alter_policy_custom(
    p_policy_name TEXT,
    p_table_name TEXT,
    p_new_condition TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = p_table_name 
        AND policyname = p_policy_name
    ) THEN
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

-- Apply optimizations
SELECT safe_alter_policy_custom('Allow service role access', 'account_owners', '(select auth.jwt()) ->> ''role'' = ''service_role''');
SELECT safe_alter_policy_custom('Allow users to view own record', 'account_owners', '(select auth.uid()) = id');
SELECT safe_alter_policy_custom('Allow users to update own record', 'account_owners', '(select auth.uid()) = id');

SELECT safe_alter_policy_custom('Allow service role full access to admin_users', 'admin_users', '(select auth.jwt()) ->> ''role'' = ''service_role''');
SELECT safe_alter_policy_custom('Allow service role full access to audit_logs', 'audit_logs', '(select auth.jwt()) ->> ''role'' = ''service_role''');
SELECT safe_alter_policy_custom('Allow service role full access to commission_payments', 'commission_payments', '(select auth.jwt()) ->> ''role'' = ''service_role''');
SELECT safe_alter_policy_custom('Allow service role full access to customers', 'customers', '(select auth.jwt()) ->> ''role'' = ''service_role''');
SELECT safe_alter_policy_custom('Allow service role full access to hotspot_locations', 'hotspot_locations', '(select auth.jwt()) ->> ''role'' = ''service_role''');
SELECT safe_alter_policy_custom('Allow authenticated users to view hotspot stats', 'hotspot_stats', '(select auth.role()) = ''authenticated''');
SELECT safe_alter_policy_custom('Allow service role full access to hotspot_stats', 'hotspot_stats', '(select auth.jwt()) ->> ''role'' = ''service_role''');
SELECT safe_alter_policy_custom('Allow authenticated users to view location settings', 'location_settings', '(select auth.role()) = ''authenticated''');
SELECT safe_alter_policy_custom('Allow service role full access to location_settings', 'location_settings', '(select auth.jwt()) ->> ''role'' = ''service_role''');
SELECT safe_alter_policy_custom('Allow service role full access to renewal_transactions', 'renewal_transactions', '(select auth.jwt()) ->> ''role'' = ''service_role''');
SELECT safe_alter_policy_custom('Allow service role full access to router_configs', 'router_configs', '(select auth.jwt()) ->> ''role'' = ''service_role''');

-- Clean up
DROP FUNCTION safe_alter_policy_custom(TEXT, TEXT, TEXT);

-- ============================================================================
-- PHASE 2: CONSOLIDATE POLICIES
-- ============================================================================

-- Consolidate hotspot_stats policies
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
        DROP POLICY "Allow authenticated users to view hotspot stats" ON hotspot_stats;
        
        CREATE POLICY "Optimized hotspot stats access" ON hotspot_stats
            FOR SELECT USING (
                (select auth.role()) = 'authenticated' 
                OR ((select auth.jwt()) ->> 'role' = 'service_role')
            );
            
        RAISE NOTICE 'Consolidated hotspot_stats policies';
    ELSE
        RAISE NOTICE 'Skipping hotspot_stats consolidation - policies not found';
    END IF;
END $$;

-- Consolidate location_settings policies
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
        DROP POLICY "Allow authenticated users to view location settings" ON location_settings;
        
        CREATE POLICY "Optimized location settings access" ON location_settings
            FOR SELECT USING (
                (select auth.role()) = 'authenticated' 
                OR ((select auth.jwt()) ->> 'role' = 'service_role')
            );
            
        RAISE NOTICE 'Consolidated location_settings policies';
    ELSE
        RAISE NOTICE 'Skipping location_settings consolidation - policies not found';
    END IF;
END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
    policy_count INTEGER;
    current_table TEXT;
    tables_to_check TEXT[] := ARRAY['account_owners', 'customers', 'renewal_transactions', 
                                   'commission_payments', 'hotspot_locations', 'router_configs', 
                                   'location_settings', 'hotspot_stats', 'admin_users', 'audit_logs'];
    rls_enabled BOOLEAN;
BEGIN
    RAISE NOTICE 'FINAL VERIFICATION';
    
    FOR current_table IN SELECT unnest(tables_to_check) LOOP
        SELECT relrowsecurity INTO rls_enabled
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = current_table;
        
        IF NOT rls_enabled THEN
            RAISE EXCEPTION 'CRITICAL: RLS disabled on table %!', current_table;
        END IF;
        
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = current_table;
        
        RAISE NOTICE 'Table %: % policies, RLS enabled', current_table, policy_count;
    END LOOP;
    
    RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE 'Performance improvements applied to auth functions';
    RAISE NOTICE 'Policy consolidation completed where possible';
    RAISE NOTICE 'Test your application functionality';
END $$;

COMMIT; 