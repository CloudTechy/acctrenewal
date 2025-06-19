-- Sample data for testing the commission dashboard
-- Run this in your Supabase SQL Editor after running the main schema

-- First, insert some account owners from the owners.md file
INSERT INTO account_owners (owner_username, name, first_name, last_name, email, commission_rate, is_active) VALUES
('ojika.emmanuel', 'Emma Ojika', 'Emma', 'Ojika', 'emma@example.com', 12.50, true),
('adafredricks', 'Adaora Fredrick', 'Adaora', 'Fredrick', 'adaora@example.com', 10.00, true),
('conwuemelie', 'Chinedu Onwuemelie', 'Chinedu', 'Onwuemelie', 'chinedu@example.com', 15.00, true),
('christopher@phsweb.ng', 'Christopher Ubong Udoh', 'Christopher', 'Udoh', 'christopher@phsweb.ng', 8.00, true),
('emekandukwe@phsweb.ng', 'Chukwuemeka Ndukwe', 'Chukwuemeka', 'Ndukwe', 'emeka@phsweb.ng', 11.00, true)
ON CONFLICT (owner_username) DO UPDATE SET
  name = EXCLUDED.name,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  commission_rate = EXCLUDED.commission_rate;

-- Insert some sample customers
INSERT INTO customers (username, account_owner_id, first_name, last_name, email, phone, city) VALUES
('customer001', (SELECT id FROM account_owners WHERE owner_username = 'ojika.emmanuel'), 'John', 'Doe', 'john@example.com', '08012345678', 'Lagos'),
('customer002', (SELECT id FROM account_owners WHERE owner_username = 'ojika.emmanuel'), 'Jane', 'Smith', 'jane@example.com', '08087654321', 'Abuja'),
('customer003', (SELECT id FROM account_owners WHERE owner_username = 'adafredricks'), 'Mike', 'Johnson', 'mike@example.com', '08098765432', 'Port Harcourt'),
('customer004', (SELECT id FROM account_owners WHERE owner_username = 'conwuemelie'), 'Sarah', 'Williams', 'sarah@example.com', '08076543210', 'Awka'),
('customer005', (SELECT id FROM account_owners WHERE owner_username = 'christopher@phsweb.ng'), 'David', 'Brown', 'david@example.com', '08054321098', 'Enugu'),
('customer006', (SELECT id FROM account_owners WHERE owner_username = 'emekandukwe@phsweb.ng'), 'Lisa', 'Davis', 'lisa@example.com', '08032109876', 'Calabar')
ON CONFLICT (username) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email;

-- Insert sample renewal transactions with different dates and amounts
INSERT INTO renewal_transactions (
  customer_id, 
  account_owner_id, 
  username, 
  service_plan_name, 
  amount_paid, 
  commission_rate, 
  commission_amount, 
  paystack_reference, 
  payment_status,
  renewal_period_days,
  created_at
) VALUES
-- Recent transactions (last 30 days)
((SELECT id FROM customers WHERE username = 'customer001'), (SELECT id FROM account_owners WHERE owner_username = 'ojika.emmanuel'), 'customer001', 'AWK 7 Days N8,500 Unlimited Plan', 25000.00, 12.50, 3125.00, 'ref_' || generate_random_uuid(), 'success', 30, NOW() - INTERVAL '5 days'),
((SELECT id FROM customers WHERE username = 'customer002'), (SELECT id FROM account_owners WHERE owner_username = 'ojika.emmanuel'), 'customer002', 'AWK N25,000 FAMILY PLAN', 25000.00, 12.50, 3125.00, 'ref_' || generate_random_uuid(), 'success', 30, NOW() - INTERVAL '10 days'),
((SELECT id FROM customers WHERE username = 'customer003'), (SELECT id FROM account_owners WHERE owner_username = 'adafredricks'), 'customer003', 'Monthly Business Plan', 50000.00, 10.00, 5000.00, 'ref_' || generate_random_uuid(), 'success', 30, NOW() - INTERVAL '3 days'),
((SELECT id FROM customers WHERE username = 'customer004'), (SELECT id FROM account_owners WHERE owner_username = 'conwuemelie'), 'customer004', 'Premium Home Plan', 35000.00, 15.00, 5250.00, 'ref_' || generate_random_uuid(), 'success', 30, NOW() - INTERVAL '7 days'),

-- Older transactions (for total calculations)
((SELECT id FROM customers WHERE username = 'customer001'), (SELECT id FROM account_owners WHERE owner_username = 'ojika.emmanuel'), 'customer001', 'AWK 7 Days N8,500 Unlimited Plan', 25000.00, 12.50, 3125.00, 'ref_' || generate_random_uuid(), 'success', 30, NOW() - INTERVAL '35 days'),
((SELECT id FROM customers WHERE username = 'customer005'), (SELECT id FROM account_owners WHERE owner_username = 'christopher@phsweb.ng'), 'customer005', 'Standard Plan', 20000.00, 8.00, 1600.00, 'ref_' || generate_random_uuid(), 'success', 30, NOW() - INTERVAL '45 days'),
((SELECT id FROM customers WHERE username = 'customer006'), (SELECT id FROM account_owners WHERE owner_username = 'emekandukwe@phsweb.ng'), 'customer006', 'Enterprise Plan', 75000.00, 11.00, 8250.00, 'ref_' || generate_random_uuid(), 'success', 30, NOW() - INTERVAL '60 days'),

-- Some pending transactions
((SELECT id FROM customers WHERE username = 'customer002'), (SELECT id FROM account_owners WHERE owner_username = 'ojika.emmanuel'), 'customer002', 'AWK N25,000 FAMILY PLAN', 25000.00, 12.50, 3125.00, 'ref_' || generate_random_uuid(), 'pending', 30, NOW() - INTERVAL '2 days'),
((SELECT id FROM customers WHERE username = 'customer004'), (SELECT id FROM account_owners WHERE owner_username = 'conwuemelie'), 'customer004', 'Premium Home Plan', 35000.00, 15.00, 5250.00, 'ref_' || generate_random_uuid(), 'pending', 30, NOW() - INTERVAL '1 day');

-- Update customer last renewal info
UPDATE customers SET 
  last_service_plan_name = rt.service_plan_name,
  last_renewal_date = rt.created_at
FROM renewal_transactions rt 
WHERE customers.id = rt.customer_id 
AND rt.created_at = (
  SELECT MAX(created_at) 
  FROM renewal_transactions rt2 
  WHERE rt2.customer_id = customers.id
);

-- Display summary of inserted data
SELECT 
  'Account Owners' as table_name,
  COUNT(*) as record_count
FROM account_owners
WHERE is_active = true

UNION ALL

SELECT 
  'Customers' as table_name,
  COUNT(*) as record_count
FROM customers

UNION ALL

SELECT 
  'Renewal Transactions' as table_name,
  COUNT(*) as record_count
FROM renewal_transactions

UNION ALL

SELECT 
  'Success Transactions' as table_name,
  COUNT(*) as record_count
FROM renewal_transactions
WHERE payment_status = 'success';

-- Show commission summary by owner
SELECT 
  ao.name,
  ao.owner_username,
  ao.commission_rate,
  COUNT(rt.id) as total_transactions,
  COUNT(CASE WHEN rt.payment_status = 'success' THEN 1 END) as successful_transactions,
  SUM(CASE WHEN rt.payment_status = 'success' THEN rt.commission_amount ELSE 0 END) as total_commissions,
  SUM(CASE WHEN rt.payment_status = 'success' AND rt.created_at >= NOW() - INTERVAL '30 days' THEN rt.commission_amount ELSE 0 END) as last_30_days_commissions
FROM account_owners ao
LEFT JOIN renewal_transactions rt ON ao.id = rt.account_owner_id
WHERE ao.is_active = true
GROUP BY ao.id, ao.name, ao.owner_username, ao.commission_rate
ORDER BY total_commissions DESC; 