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

-- HOTSPOT MANAGEMENT TABLES --

-- Hotspot Locations table
CREATE TABLE hotspot_locations (
  id VARCHAR(50) PRIMARY KEY, -- e.g., 'awka', 'lagos', 'abuja'
  name VARCHAR(100) NOT NULL, -- e.g., 'Awka', 'Lagos'
  display_name VARCHAR(200) NOT NULL, -- e.g., 'PHSWEB Awka Branch'
  status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'maintenance')),
  description TEXT,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Nigeria',
  timezone VARCHAR(50) DEFAULT 'Africa/Lagos',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Router Configurations table
CREATE TABLE router_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  location_id VARCHAR(50) REFERENCES hotspot_locations(id) ON DELETE CASCADE,
  host VARCHAR(45) NOT NULL, -- IP address or hostname
  username VARCHAR(50) NOT NULL,
  password_encrypted TEXT NOT NULL, -- Encrypted password
  port INTEGER DEFAULT 8728, -- MikroTik API port
  api_port INTEGER DEFAULT 80, -- HTTP API port
  connection_type VARCHAR(20) DEFAULT 'api' CHECK (connection_type IN ('api', 'ssh', 'winbox')),
  is_active BOOLEAN DEFAULT true,
  last_connected_at TIMESTAMP WITH TIME ZONE,
  connection_status VARCHAR(20) DEFAULT 'unknown' CHECK (connection_status IN ('connected', 'disconnected', 'error', 'unknown')),
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id) -- One router config per location
);

-- Location Settings table (for customizable settings per location)
CREATE TABLE location_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  location_id VARCHAR(50) REFERENCES hotspot_locations(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, setting_key)
);

-- Hotspot Statistics table (for storing historical data)
CREATE TABLE hotspot_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  location_id VARCHAR(50) REFERENCES hotspot_locations(id) ON DELETE CASCADE,
  active_users INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  bytes_in BIGINT DEFAULT 0,
  bytes_out BIGINT DEFAULT 0,
  uptime_seconds INTEGER DEFAULT 0,
  cpu_load DECIMAL(5,2),
  memory_usage DECIMAL(5,2),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Hotspot indexes
CREATE INDEX idx_hotspot_locations_status ON hotspot_locations(status);
CREATE INDEX idx_hotspot_locations_active ON hotspot_locations(is_active);
CREATE INDEX idx_router_configs_location_id ON router_configs(location_id);
CREATE INDEX idx_router_configs_active ON router_configs(is_active);
CREATE INDEX idx_router_configs_status ON router_configs(connection_status);
CREATE INDEX idx_location_settings_location_key ON location_settings(location_id, setting_key);
CREATE INDEX idx_hotspot_stats_location_time ON hotspot_stats(location_id, recorded_at);

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

-- Hotspot triggers
CREATE TRIGGER update_hotspot_locations_updated_at BEFORE UPDATE ON hotspot_locations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_router_configs_updated_at BEFORE UPDATE ON router_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_location_settings_updated_at BEFORE UPDATE ON location_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE account_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payments ENABLE ROW LEVEL SECURITY;

-- Hotspot RLS
ALTER TABLE hotspot_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE router_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspot_stats ENABLE ROW LEVEL SECURITY;

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

-- Hotspot RLS policies
CREATE POLICY "Allow authenticated users to view hotspot locations" ON hotspot_locations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view router configs" ON router_configs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view location settings" ON location_settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view hotspot stats" ON hotspot_stats
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

-- Hotspot service role policies
CREATE POLICY "Allow service role full access to hotspot_locations" ON hotspot_locations
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service role full access to router_configs" ON router_configs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service role full access to location_settings" ON location_settings
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service role full access to hotspot_stats" ON hotspot_stats
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Insert initial data for existing Awka location
INSERT INTO hotspot_locations (id, name, display_name, status, city, state) VALUES
('awka', 'Awka', 'PHSWEB Awka Branch', 'active', 'Awka', 'Anambra');

-- Insert the existing router configuration (password will be encrypted in application)
INSERT INTO router_configs (location_id, host, username, password_encrypted, api_port, is_active) VALUES
('awka', '192.168.50.2', 'admin', 'encrypted_password_placeholder', 80, true); 