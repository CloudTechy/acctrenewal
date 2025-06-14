-- Commission Tracking System Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Account Owners table
CREATE TABLE account_owners (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_username VARCHAR UNIQUE NOT NULL, -- From owners.md "owner" column
  name VARCHAR NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  email VARCHAR UNIQUE,
  phone VARCHAR,
  commission_rate DECIMAL(5,2) DEFAULT 10.00, -- 10% default
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table (to track which owner they belong to)
CREATE TABLE customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username VARCHAR UNIQUE NOT NULL, -- RADIUS username
  account_owner_id UUID REFERENCES account_owners(id),
  first_name VARCHAR,
  last_name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  address TEXT,
  city VARCHAR,
  state VARCHAR,
  country VARCHAR,
  -- Store last known service info for analytics
  last_service_plan_id INTEGER,
  last_service_plan_name VARCHAR,
  last_renewal_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Renewal Transactions table
CREATE TABLE renewal_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  account_owner_id UUID REFERENCES account_owners(id),
  username VARCHAR NOT NULL,
  service_plan_id INTEGER, -- srvid from RADIUS
  service_plan_name VARCHAR,
  amount_paid DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  paystack_reference VARCHAR UNIQUE NOT NULL,
  payment_status VARCHAR DEFAULT 'pending',
  renewal_period_days INTEGER,
  renewal_start_date TIMESTAMP WITH TIME ZONE,
  renewal_end_date TIMESTAMP WITH TIME ZONE,
  -- Additional analytics fields
  payment_method VARCHAR DEFAULT 'paystack',
  customer_location VARCHAR, -- City from customer data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commission Payments table (for tracking monthly payments to owners)
CREATE TABLE commission_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  account_owner_id UUID REFERENCES account_owners(id),
  payment_period_start DATE NOT NULL,
  payment_period_end DATE NOT NULL,
  total_renewals INTEGER NOT NULL DEFAULT 0,
  total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_status VARCHAR DEFAULT 'pending', -- pending, paid, cancelled
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_reference VARCHAR,
  payment_method VARCHAR, -- bank_transfer, paystack, etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_customers_username ON customers(username);
CREATE INDEX idx_customers_owner_id ON customers(account_owner_id);
CREATE INDEX idx_renewal_transactions_customer_id ON renewal_transactions(customer_id);
CREATE INDEX idx_renewal_transactions_owner_id ON renewal_transactions(account_owner_id);
CREATE INDEX idx_renewal_transactions_created_at ON renewal_transactions(created_at);
CREATE INDEX idx_renewal_transactions_paystack_ref ON renewal_transactions(paystack_reference);
CREATE INDEX idx_commission_payments_owner_id ON commission_payments(account_owner_id);
CREATE INDEX idx_commission_payments_period ON commission_payments(payment_period_start, payment_period_end);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_account_owners_updated_at BEFORE UPDATE ON account_owners 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_commission_payments_updated_at BEFORE UPDATE ON commission_payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE account_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payments ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (to be refined based on authentication requirements)
-- For now, allow all authenticated users to read, admins to write
CREATE POLICY "Allow authenticated users to view account owners" ON account_owners
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view customers" ON customers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view renewal transactions" ON renewal_transactions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view commission payments" ON commission_payments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to do everything (for API operations)
CREATE POLICY "Allow service role full access to account_owners" ON account_owners
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service role full access to customers" ON customers
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service role full access to renewal_transactions" ON renewal_transactions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service role full access to commission_payments" ON commission_payments
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role'); 