-- Change Subscription Migration Script (Fixed)
-- Adds support for tracking plan changes and previous plan information
-- This version checks for existing columns before adding them

BEGIN;

-- ============================================================================
-- RENEWAL_TRANSACTIONS TABLE ENHANCEMENTS (WITH EXISTENCE CHECKS)
-- ============================================================================

-- Function to safely add columns if they don't exist
DO $$
BEGIN
    -- Add transaction_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'renewal_transactions' 
        AND column_name = 'transaction_type'
    ) THEN
        ALTER TABLE renewal_transactions 
        ADD COLUMN transaction_type VARCHAR(30) DEFAULT 'renewal' 
        CHECK (transaction_type IN ('renewal', 'plan_change', 'account_creation', 'upgrade', 'downgrade'));
        
        -- Update existing records to have the 'renewal' transaction type
        UPDATE renewal_transactions 
        SET transaction_type = 'renewal' 
        WHERE transaction_type IS NULL;
    END IF;

    -- Add previous_service_plan_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'renewal_transactions' 
        AND column_name = 'previous_service_plan_id'
    ) THEN
        ALTER TABLE renewal_transactions 
        ADD COLUMN previous_service_plan_id INTEGER;
    END IF;

    -- Add previous_service_plan_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'renewal_transactions' 
        AND column_name = 'previous_service_plan_name'
    ) THEN
        ALTER TABLE renewal_transactions 
        ADD COLUMN previous_service_plan_name VARCHAR(255);
    END IF;

    -- Add change_reason column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'renewal_transactions' 
        AND column_name = 'change_reason'
    ) THEN
        ALTER TABLE renewal_transactions 
        ADD COLUMN change_reason VARCHAR(50) 
        CHECK (change_reason IS NULL OR change_reason IN ('expired_renewal', 'upgrade', 'downgrade', 'plan_switch'));
    END IF;

    -- Add plan_change_metadata column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'renewal_transactions' 
        AND column_name = 'plan_change_metadata'
    ) THEN
        ALTER TABLE renewal_transactions 
        ADD COLUMN plan_change_metadata JSONB;
    END IF;
END $$;

-- ============================================================================
-- USER PLAN HISTORY TABLE (WITH EXISTENCE CHECK)
-- ============================================================================

-- Create table to track detailed plan change history if it doesn't exist
CREATE TABLE IF NOT EXISTS user_plan_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  customer_id UUID,
  previous_plan_id INTEGER,
  previous_plan_name VARCHAR(255),
  new_plan_id INTEGER NOT NULL,
  new_plan_name VARCHAR(255),
  change_reason VARCHAR(50) CHECK (change_reason IN ('upgrade', 'downgrade', 'expired_renewal', 'plan_switch', 'reactivation')),
  transaction_reference VARCHAR(255), -- Link to renewal_transactions
  amount_paid DECIMAL(10,2) DEFAULT 0,
  effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint if customers table exists and constraint doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'customers'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_plan_history' 
        AND constraint_name = 'user_plan_history_customer_id_fkey'
    ) THEN
        ALTER TABLE user_plan_history 
        ADD CONSTRAINT user_plan_history_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE (WITH EXISTENCE CHECKS)
-- ============================================================================

-- Add indexes for efficient querying of plan changes (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_type ON renewal_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_prev_plan ON renewal_transactions(previous_service_plan_id);
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_change_reason ON renewal_transactions(change_reason);
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_username_type ON renewal_transactions(username, transaction_type);

-- Add indexes for user_plan_history table
CREATE INDEX IF NOT EXISTS idx_user_plan_history_username ON user_plan_history(username);
CREATE INDEX IF NOT EXISTS idx_user_plan_history_customer_id ON user_plan_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_user_plan_history_effective_date ON user_plan_history(effective_date);

-- ============================================================================
-- TRIGGERS FOR AUTOMATED TRACKING (WITH EXISTENCE CHECKS)
-- ============================================================================

-- Create or replace function to automatically populate user_plan_history
CREATE OR REPLACE FUNCTION track_plan_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track if this is a plan change transaction
    IF NEW.transaction_type IN ('plan_change', 'upgrade', 'downgrade') THEN
        INSERT INTO user_plan_history (
            username,
            customer_id,
            previous_plan_id,
            previous_plan_name,
            new_plan_id,
            new_plan_name,
            change_reason,
            transaction_reference,
            amount_paid,
            effective_date
        ) VALUES (
            NEW.username,
            NEW.customer_id,
            NEW.previous_service_plan_id,
            NEW.previous_service_plan_name,
            NEW.service_plan_id,
            NEW.service_plan_name,
            NEW.change_reason,
            NEW.paystack_reference,
            NEW.amount_paid,
            NEW.created_at
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to ensure it's up to date
DROP TRIGGER IF EXISTS tr_track_plan_change ON renewal_transactions;
CREATE TRIGGER tr_track_plan_change
    AFTER INSERT OR UPDATE ON renewal_transactions
    FOR EACH ROW
    EXECUTE FUNCTION track_plan_change();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

DO $$
BEGIN
    -- Add comments only if columns exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'renewal_transactions' AND column_name = 'transaction_type'
    ) THEN
        COMMENT ON COLUMN renewal_transactions.transaction_type IS 'Type of transaction: renewal, plan_change, account_creation, upgrade, downgrade';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'renewal_transactions' AND column_name = 'previous_service_plan_id'
    ) THEN
        COMMENT ON COLUMN renewal_transactions.previous_service_plan_id IS 'Service plan ID before the change (for plan_change transactions)';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'renewal_transactions' AND column_name = 'previous_service_plan_name'
    ) THEN
        COMMENT ON COLUMN renewal_transactions.previous_service_plan_name IS 'Service plan name before the change (for plan_change transactions)';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'renewal_transactions' AND column_name = 'change_reason'
    ) THEN
        COMMENT ON COLUMN renewal_transactions.change_reason IS 'Reason for plan change: expired_renewal, upgrade, downgrade, plan_switch';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'renewal_transactions' AND column_name = 'plan_change_metadata'
    ) THEN
        COMMENT ON COLUMN renewal_transactions.plan_change_metadata IS 'Additional metadata for plan changes (JSON format)';
    END IF;
END $$;

-- Add comment to user_plan_history table
COMMENT ON TABLE user_plan_history IS 'Detailed history of all plan changes for users';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check what columns were added/exist
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    CASE 
        WHEN column_name IN ('transaction_type', 'previous_service_plan_id', 'previous_service_plan_name', 'change_reason', 'plan_change_metadata') 
        THEN '✅ Plan Change Column' 
        ELSE 'Existing Column' 
    END as column_status
FROM information_schema.columns 
WHERE table_name = 'renewal_transactions' 
ORDER BY ordinal_position;

-- Verify user_plan_history table exists
SELECT 
    table_name,
    '✅ Plan History Table Created' as status
FROM information_schema.tables 
WHERE table_name = 'user_plan_history';

-- Check indexes
SELECT 
    indexname,
    tablename,
    CASE 
        WHEN indexname LIKE '%plan%' OR indexname LIKE '%type%' OR indexname LIKE '%change%' 
        THEN '✅ Plan Change Index' 
        ELSE 'Existing Index' 
    END as index_status
FROM pg_indexes 
WHERE tablename IN ('renewal_transactions', 'user_plan_history')
ORDER BY tablename, indexname;

COMMIT;

-- Success message
SELECT 
    '🎉 Change subscription database migration completed successfully!' as message,
    'All plan change tracking features are now available.' as details; 