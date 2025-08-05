-- RLS Policy Diagnostics Script
-- Run this FIRST to see your current policy state
-- This helps us understand what exists before making changes

-- ============================================================================
-- CURRENT POLICY INVENTORY
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN (
        'account_owners', 'customers', 'renewal_transactions', 
        'commission_payments', 'hotspot_locations', 'router_configs', 
        'location_settings', 'hotspot_stats', 'admin_users', 'audit_logs'
    )
ORDER BY tablename, policyname;

-- ============================================================================
-- RLS STATUS CHECK
-- ============================================================================

SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
    AND c.relname IN (
        'account_owners', 'customers', 'renewal_transactions', 
        'commission_payments', 'hotspot_locations', 'router_configs', 
        'location_settings', 'hotspot_stats', 'admin_users', 'audit_logs'
    )
ORDER BY c.relname;

-- ============================================================================
-- POLICY COUNT SUMMARY
-- ============================================================================

SELECT 
    tablename,
    COUNT(*) as policy_count,
    array_agg(policyname ORDER BY policyname) as policy_names
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN (
        'account_owners', 'customers', 'renewal_transactions', 
        'commission_payments', 'hotspot_locations', 'router_configs', 
        'location_settings', 'hotspot_stats', 'admin_users', 'audit_logs'
    )
GROUP BY tablename
ORDER BY tablename; 