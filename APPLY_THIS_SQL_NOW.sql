-- ============================================================================
-- CRITICAL FIX: Add missing transaction_type column
-- ============================================================================
-- 
-- HOW TO RUN THIS:
-- 1. Go to: https://supabase.com/dashboard/project/orjlfkpczzzqysvzwfuf/editor
-- 2. Click "New Query"
-- 3. Copy and paste ALL of this SQL
-- 4. Click "Run" or press Ctrl+Enter
-- 5. You should see "Success. No rows returned"
--
-- This will immediately fix payment processing and enable commission tracking
-- ============================================================================

-- Add transaction_type column if it doesn't exist
ALTER TABLE renewal_transactions 
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) DEFAULT 'renewal' 
CHECK (transaction_type IN ('renewal', 'account_creation'));

-- Create indexes for better performance when filtering by transaction type
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_type ON renewal_transactions(transaction_type);

-- Create index for better performance when filtering by transaction type and date
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_type_date ON renewal_transactions(transaction_type, created_at);

-- Update existing records to have 'renewal' as default transaction_type
UPDATE renewal_transactions 
SET transaction_type = 'renewal' 
WHERE transaction_type IS NULL;

-- ============================================================================
-- VERIFICATION: Check that the column was added correctly
-- ============================================================================

SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'renewal_transactions' 
AND column_name = 'transaction_type';

-- Expected result: Should show transaction_type column with VARCHAR(20) type

-- ============================================================================
-- SAMPLE DATA: View recent transactions to confirm
-- ============================================================================

SELECT 
    id, 
    username, 
    amount_paid, 
    transaction_type,
    payment_status,
    created_at 
FROM renewal_transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- Expected result: Should show transactions with transaction_type = 'renewal'

-- ============================================================================
-- SUCCESS! After running this SQL:
-- ✅ Payment processing will work
-- ✅ Customers will be credited correctly  
-- ✅ Owner commissions will be tracked
-- ✅ Dashboard will display transaction history
-- ============================================================================
