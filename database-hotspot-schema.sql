-- Hotspot Management Database Schema - Additional Tables Only
-- Run this in your Supabase SQL Editor if you already have the commission tracking tables

-- HOTSPOT MANAGEMENT TABLES --

-- Hotspot Locations table
CREATE TABLE IF NOT EXISTS hotspot_locations (
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
CREATE TABLE IF NOT EXISTS router_configs (
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
CREATE TABLE IF NOT EXISTS location_settings (
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
CREATE TABLE IF NOT EXISTS hotspot_stats (
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
CREATE INDEX IF NOT EXISTS idx_hotspot_locations_status ON hotspot_locations(status);
CREATE INDEX IF NOT EXISTS idx_hotspot_locations_active ON hotspot_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_router_configs_location_id ON router_configs(location_id);
CREATE INDEX IF NOT EXISTS idx_router_configs_active ON router_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_router_configs_status ON router_configs(connection_status);
CREATE INDEX IF NOT EXISTS idx_location_settings_location_key ON location_settings(location_id, setting_key);
CREATE INDEX IF NOT EXISTS idx_hotspot_stats_location_time ON hotspot_stats(location_id, recorded_at);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at (only for new tables)
CREATE TRIGGER update_hotspot_locations_updated_at BEFORE UPDATE ON hotspot_locations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_router_configs_updated_at BEFORE UPDATE ON router_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_location_settings_updated_at BEFORE UPDATE ON location_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies for new tables
ALTER TABLE hotspot_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE router_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspot_stats ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for hotspot tables
CREATE POLICY "Allow authenticated users to view hotspot locations" ON hotspot_locations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view router configs" ON router_configs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view location settings" ON location_settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view hotspot stats" ON hotspot_stats
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to do everything (for API operations)
CREATE POLICY "Allow service role full access to hotspot_locations" ON hotspot_locations
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service role full access to router_configs" ON router_configs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service role full access to location_settings" ON location_settings
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service role full access to hotspot_stats" ON hotspot_stats
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Insert initial data for existing Awka location (only if it doesn't exist)
INSERT INTO hotspot_locations (id, name, display_name, status, city, state) 
SELECT 'awka', 'Awka', 'PHSWEB Awka Branch', 'active', 'Awka', 'Anambra'
WHERE NOT EXISTS (SELECT 1 FROM hotspot_locations WHERE id = 'awka');

-- Insert the existing router configuration (password will be encrypted in application)
INSERT INTO router_configs (location_id, host, username, password_encrypted, api_port, is_active) 
SELECT 'awka', '192.168.50.2', 'admin', 'encrypted_password_placeholder', 80, true
WHERE NOT EXISTS (SELECT 1 FROM router_configs WHERE location_id = 'awka');

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Hotspot management tables created successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update the router_configs table with your actual encrypted password';
    RAISE NOTICE '2. Test the /hotspot endpoint in your application';
    RAISE NOTICE '3. Add more locations through the UI';
END $$; 