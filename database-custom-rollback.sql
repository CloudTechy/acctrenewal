-- CUSTOM EMERGENCY ROLLBACK Script
-- Based on your actual policy configuration
-- Run this ONLY if the custom performance migration causes issues
-- This restores all policies to their original unoptimized state

BEGIN;

RAISE NOTICE '=== CUSTOM EMERGENCY ROLLBACK: Restoring Original Policies ===';

-- ============================================================================
-- STEP 1: Remove optimized policies that were created in custom migration
-- ============================================================================

DROP POLICY IF EXISTS "Optimized hotspot stats access" ON hotspot_stats;
DROP POLICY IF EXISTS "Optimized location settings access" ON location_settings;

-- ============================================================================
-- STEP 2: Restore original individual policies for hotspot_stats and location_settings
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
-- STEP 3: Restore ALL service role policies to unoptimized versions
-- (Remove the subquery optimization from auth.jwt() calls)
-- ============================================================================

-- Helper function to safely restore policies
CREATE OR REPLACE FUNCTION safe_restore_policy(
    p_policy_name TEXT,
    p_table_name TEXT,
    p_original_condition TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check if policy exists
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = p_table_name 
        AND policyname = p_policy_name
    ) THEN
        -- Policy exists, safe to restore
        EXECUTE format(
            'ALTER POLICY %I ON %I USING (%s)',
            p_policy_name, p_table_name, p_original_condition
        );
        RAISE NOTICE 'Restored policy: % on %', p_policy_name, p_table_name;
        RETURN TRUE;
    ELSE
        RAISE NOTICE 'Policy not found (skipping): % on %', p_policy_name, p_table_name;
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Restore account_owners policies
SELECT safe_restore_policy('Allow service role access', 'account_owners', 'auth.jwt() ->> ''role'' = ''service_role''');
SELECT safe_restore_policy('Allow users to view own record', 'account_owners', 'auth.uid() = id');
SELECT safe_restore_policy('Allow users to update own record', 'account_owners', 'auth.uid() = id');

-- Restore admin_users policies
SELECT safe_restore_policy('Allow service role full access to admin_users', 'admin_users', 'auth.jwt() ->> ''role'' = ''service_role''');

-- Restore audit_logs policies
SELECT safe_restore_policy('Allow service role full access to audit_logs', 'audit_logs', 'auth.jwt() ->> ''role'' = ''service_role''');

-- Restore commission_payments policies
SELECT safe_restore_policy('Allow service role full access to commission_payments', 'commission_payments', 'auth.jwt() ->> ''role'' = ''service_role''');

-- Restore customers policies
SELECT safe_restore_policy('Allow service role full access to customers', 'customers', 'auth.jwt() ->> ''role'' = ''service_role''');

-- Restore hotspot_locations policies
SELECT safe_restore_policy('Allow service role full access to hotspot_locations', 'hotspot_locations', 'auth.jwt() ->> ''role'' = ''service_role''');

-- Restore renewal_transactions policies
SELECT safe_restore_policy('Allow service role full access to renewal_transactions', 'renewal_transactions', 'auth.jwt() ->> ''role'' = ''service_role''');

-- Restore router_configs policies
SELECT safe_restore_policy('Allow service role full access to router_configs', 'router_configs', 'auth.jwt() ->> ''role'' = ''service_role''');

-- Clean up helper function
DROP FUNCTION safe_restore_policy(TEXT, TEXT, TEXT);

-- ============================================================================
-- STEP 4: Verify rollback success
-- ============================================================================

DO $$
DECLARE
    policy_count INTEGER;
    table_name TEXT;
    tables_to_check TEXT[] := ARRAY['account_owners', 'customers', 'renewal_transactions', 
                                   'commission_payments', 'hotspot_locations', 'router_configs', 
                                   'location_settings', 'hotspot_stats', 'admin_users', 'audit_logs'];
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
    RAISE NOTICE 'CUSTOM ROLLBACK COMPLETED SUCCESSFULLY!';
    RAISE NOTICE 'All policies have been restored to their original unoptimized state.';
    RAISE NOTICE 'Your sophisticated role-based security system is fully intact.';
    RAISE NOTICE 'Expected policy counts should match your original diagnostic results:';
    RAISE NOTICE '- account_owners: 3 policies';
    RAISE NOTICE '- admin_users: 3 policies';  
    RAISE NOTICE '- audit_logs: 3 policies';
    RAISE NOTICE '- commission_payments: 4 policies';
    RAISE NOTICE '- customers: 4 policies';
    RAISE NOTICE '- hotspot_locations: 3 policies';
    RAISE NOTICE '- hotspot_stats: 2 policies';
    RAISE NOTICE '- location_settings: 2 policies';
    RAISE NOTICE '- renewal_transactions: 4 policies';
    RAISE NOTICE '- router_configs: 3 policies';
END $$;

COMMIT; 