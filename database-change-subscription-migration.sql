-- Change Subscription Migration Script
-- Adds support for tracking plan changes and previous plan information

BEGIN;

-- ============================================================================
-- RENEWAL_TRANSACTIONS TABLE ENHANCEMENTS
-- ============================================================================

-- Add transaction_type column to differentiate between renewals and plan changes
ALTER TABLE renewal_transactions 
ADD COLUMN transaction_type VARCHAR(30) DEFAULT 'renewal' 
CHECK (transaction_type IN ('renewal', 'plan_change', 'account_creation', 'upgrade', 'downgrade'));

-- Add previous plan tracking columns
ALTER TABLE renewal_transactions 
ADD COLUMN previous_service_plan_id INTEGER,
ADD COLUMN previous_service_plan_name VARCHAR(255);

-- Add plan change reason tracking
ALTER TABLE renewal_transactions 
ADD COLUMN change_reason VARCHAR(50) 
CHECK (change_reason IS NULL OR change_reason IN ('expired_renewal', 'upgrade', 'downgrade', 'plan_switch'));

-- Add metadata for plan change details
ALTER TABLE renewal_transactions 
ADD COLUMN plan_change_metadata JSONB;

-- Update existing records to have the 'renewal' transaction type
UPDATE renewal_transactions 
SET transaction_type = 'renewal' 
WHERE transaction_type IS NULL;

-- ============================================================================
-- OPTIONAL: USER PLAN HISTORY TABLE (for detailed tracking)
-- ============================================================================

-- Create table to track detailed plan change history
CREATE TABLE IF NOT EXISTS user_plan_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  previous_plan_id INTEGER,
  previous_plan_name VARCHAR(255),
  new_plan_id INTEGER NOT NULL,
  new_plan_name VARCHAR(255),
  change_reason VARCHAR(50) CHECK (change_reason IN ('upgrade', 'downgrade', 'expired_renewal', 'plan_switch', 'reactivation')),
  transaction_reference VARCHAR(255), -- Link to renewal_transactions
  amount_paid DECIMAL(10,2) DEFAULT 0,
  effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for efficient queries
  INDEX idx_user_plan_history_username (username),
  INDEX idx_user_plan_history_customer_id (customer_id),
  INDEX idx_user_plan_history_effective_date (effective_date)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Add indexes for efficient querying of plan changes
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_type ON renewal_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_prev_plan ON renewal_transactions(previous_service_plan_id);
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_change_reason ON renewal_transactions(change_reason);
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_username_type ON renewal_transactions(username, transaction_type);

-- ============================================================================
-- TRIGGERS FOR AUTOMATED TRACKING
-- ============================================================================

-- Function to automatically populate user_plan_history when renewal_transactions is updated
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

-- Create trigger
DROP TRIGGER IF EXISTS tr_track_plan_change ON renewal_transactions;
CREATE TRIGGER tr_track_plan_change
    AFTER INSERT OR UPDATE ON renewal_transactions
    FOR EACH ROW
    EXECUTE FUNCTION track_plan_change();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN renewal_transactions.transaction_type IS 'Type of transaction: renewal, plan_change, account_creation, upgrade, downgrade';
COMMENT ON COLUMN renewal_transactions.previous_service_plan_id IS 'Service plan ID before the change (for plan_change transactions)';
COMMENT ON COLUMN renewal_transactions.previous_service_plan_name IS 'Service plan name before the change (for plan_change transactions)';
COMMENT ON COLUMN renewal_transactions.change_reason IS 'Reason for plan change: expired_renewal, upgrade, downgrade, plan_switch';
COMMENT ON COLUMN renewal_transactions.plan_change_metadata IS 'Additional metadata for plan changes (JSON format)';

COMMENT ON TABLE user_plan_history IS 'Detailed history of all plan changes for users';

-- ============================================================================
-- SAMPLE QUERIES FOR VERIFICATION
-- ============================================================================

-- Query to check schema changes
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'renewal_transactions' 
-- AND column_name IN ('transaction_type', 'previous_service_plan_id', 'previous_service_plan_name', 'change_reason', 'plan_change_metadata');

-- Query to verify user_plan_history table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'user_plan_history';

COMMIT;

-- Success message
SELECT 'Change subscription database migration completed successfully!' as message; 