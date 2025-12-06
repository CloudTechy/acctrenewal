-- Fix for missing transaction_type column
-- This script ensures the transaction_type column exists in the renewal_transactions table
-- Run this in your Supabase SQL Editor

-- Add transaction_type column if it doesn't exist
ALTER TABLE renewal_transactions 
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) DEFAULT 'renewal' 
CHECK (transaction_type IN ('renewal', 'account_creation'));

-- Create index for better performance when filtering by transaction type
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_type ON renewal_transactions(transaction_type);

-- Create index for better performance when filtering by transaction type and date
CREATE INDEX IF NOT EXISTS idx_renewal_transactions_type_date ON renewal_transactions(transaction_type, created_at);

-- Update existing records to have 'renewal' as default transaction_type
UPDATE renewal_transactions 
SET transaction_type = 'renewal' 
WHERE transaction_type IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'renewal_transactions' 
AND column_name = 'transaction_type';

-- Show sample data to verify
SELECT id, username, amount_paid, transaction_type, created_at 
FROM renewal_transactions 
ORDER BY created_at DESC 
LIMIT 5;
