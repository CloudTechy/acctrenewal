-- Add support for MAC address account types
-- This migration adds the necessary columns to support MAC address based accounts
-- alongside the existing phone number based accounts

-- Add new columns to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS account_type VARCHAR(10) DEFAULT 'phone' CHECK (account_type IN ('phone', 'mac')),
ADD COLUMN IF NOT EXISTS device_description TEXT,
ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17);

-- Add index on mac_address for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_mac_address ON customers(mac_address) WHERE mac_address IS NOT NULL;

-- Add index on account_type for filtering
CREATE INDEX IF NOT EXISTS idx_customers_account_type ON customers(account_type);

-- Add unique constraint on mac_address to prevent duplicate MAC addresses
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_mac_address_unique ON customers(mac_address) WHERE mac_address IS NOT NULL;

-- Add comments to document the new columns
COMMENT ON COLUMN customers.account_type IS 'Type of account: phone (traditional phone/PIN) or mac (MAC address based)';
COMMENT ON COLUMN customers.device_description IS 'Description of the device for MAC accounts (e.g., Samsung Smart TV Living Room)';
COMMENT ON COLUMN customers.mac_address IS 'MAC address for MAC-based accounts, normalized to XX:XX:XX:XX:XX:XX format';

-- Update existing records to have account_type = 'phone' if not already set
UPDATE customers 
SET account_type = 'phone' 
WHERE account_type IS NULL;

-- Make account_type NOT NULL after setting defaults
ALTER TABLE customers 
ALTER COLUMN account_type SET NOT NULL;
