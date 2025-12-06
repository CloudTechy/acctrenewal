-- Migration: Add transaction_type column and related fields
-- Purpose: Support different payment types (renewal, account_creation, plan_change)
-- Date: 2025-01-24
-- Status: Applied successfully

-- Add transaction_type column to support different payment types
BEGIN;

-- Add transaction_type column if it doesn't exist
ALTER TABLE renewal_transactions 
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(30) DEFAULT 'renewal' 
CHECK (transaction_type IN ('renewal', 'plan_change', 'account_creation', 'upgrade', 'downgrade'));

-- Update existing records to have 'renewal' as default transaction_type
UPDATE renewal_transactions 
SET transaction_type = 'renewal' 
WHERE transaction_type IS NULL;

-- Add previous_service_plan_id column if it doesn't exist (for plan changes)
ALTER TABLE renewal_transactions 
ADD COLUMN IF NOT EXISTS previous_service_plan_id INTEGER;

-- Add previous_service_plan_name column if it doesn't exist
ALTER TABLE renewal_transactions 
ADD COLUMN IF NOT EXISTS previous_service_plan_name VARCHAR(255);

-- Add change_reason column if it doesn't exist
ALTER TABLE renewal_transactions 
ADD COLUMN IF NOT EXISTS change_reason VARCHAR(50) 
CHECK (change_reason IS NULL OR change_reason IN ('expired_renewal', 'upgrade', 'downgrade', 'plan_switch'));

-- Add plan_change_metadata column if it doesn't exist
ALTER TABLE renewal_transactions 
ADD COLUMN IF NOT EXISTS plan_change_metadata JSONB;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_type ON renewal_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_prev_plan ON renewal_transactions(previous_service_plan_id);
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_change_reason ON renewal_transactions(change_reason);
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_username_type ON renewal_transactions(username, transaction_type);

-- Add helpful comments
COMMENT ON COLUMN renewal_transactions.transaction_type IS 'Type of transaction: renewal, plan_change, account_creation, upgrade, downgrade';
COMMENT ON COLUMN renewal_transactions.previous_service_plan_id IS 'Service plan ID before the change (for plan_change transactions)';
COMMENT ON COLUMN renewal_transactions.previous_service_plan_name IS 'Service plan name before the change (for plan_change transactions)';
COMMENT ON COLUMN renewal_transactions.change_reason IS 'Reason for plan change: expired_renewal, upgrade, downgrade, plan_switch';
COMMENT ON COLUMN renewal_transactions.plan_change_metadata IS 'Additional metadata for plan changes (JSON format)';

COMMIT;
