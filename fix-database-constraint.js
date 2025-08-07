// Fix database constraint for combined payments
// This script provides instructions to remove the unique constraint on paystack_reference 
// to allow multiple transactions per reference (account creation + service plan)

console.log('🔧 Database Constraint Fix Instructions');
console.log('=====================================');
console.log('');
console.log('The current error is due to a unique constraint on paystack_reference');
console.log('that prevents multiple transactions with the same reference.');
console.log('');
console.log('For combined payments, we need to allow:');
console.log('- One transaction for account creation (transaction_type=\'account_creation\')');
console.log('- One transaction for service plan (transaction_type=\'renewal\')');
console.log('- Both with the same paystack_reference');
console.log('');
console.log('📋 Manual fix required in Supabase SQL Editor:');
console.log('');
console.log('-- Remove unique constraint');
console.log('ALTER TABLE renewal_transactions DROP CONSTRAINT IF EXISTS renewal_transactions_paystack_reference_key;');
console.log('');
console.log('-- Add transaction_type column');
console.log('ALTER TABLE renewal_transactions ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) DEFAULT \'renewal\' CHECK (transaction_type IN (\'renewal\', \'account_creation\'));');
console.log('');
console.log('-- Create composite unique constraint');
console.log('CREATE UNIQUE INDEX IF NOT EXISTS idx_renewal_transactions_reference_type ON renewal_transactions(paystack_reference, transaction_type);');
console.log('');
console.log('-- Add performance indexes');
console.log('CREATE INDEX IF NOT EXISTS idx_renewal_transactions_type ON renewal_transactions(transaction_type);');
console.log('CREATE INDEX IF NOT EXISTS idx_renewal_transactions_type_date ON renewal_transactions(transaction_type, created_at);');
console.log('');
console.log('🔄 Alternative: Test without the fix');
console.log('The webhook has been improved to handle constraint violations gracefully.');
console.log('');
console.log('✅ Ready to test payment flow with metadata fixes!'); 