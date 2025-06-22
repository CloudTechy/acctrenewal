-- ============================================================================
-- HOTSPOT LANDING PAGE CUSTOMIZATION MIGRATION
-- Add fields for dynamic landing page customization
-- ============================================================================

-- Add new columns to hotspot_locations table for landing page customization
ALTER TABLE hotspot_locations ADD COLUMN IF NOT EXISTS welcome_message TEXT;
ALTER TABLE hotspot_locations ADD COLUMN IF NOT EXISTS brand_color_primary VARCHAR(50) DEFAULT 'from-blue-600 to-purple-600';
ALTER TABLE hotspot_locations ADD COLUMN IF NOT EXISTS brand_color_secondary VARCHAR(50) DEFAULT 'from-blue-50 to-purple-50';
ALTER TABLE hotspot_locations ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
ALTER TABLE hotspot_locations ADD COLUMN IF NOT EXISTS contact_email VARCHAR(100);
ALTER TABLE hotspot_locations ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '["High-Speed Internet", "24/7 Support", "Secure Connection"]'::jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_hotspot_locations_brand_colors ON hotspot_locations(brand_color_primary, brand_color_secondary);
CREATE INDEX IF NOT EXISTS idx_hotspot_locations_contact ON hotspot_locations(contact_phone, contact_email);

-- Add comments for documentation
COMMENT ON COLUMN hotspot_locations.welcome_message IS 'Custom welcome message for the hotspot landing page';
COMMENT ON COLUMN hotspot_locations.brand_color_primary IS 'Primary brand color gradient for buttons and highlights';
COMMENT ON COLUMN hotspot_locations.brand_color_secondary IS 'Secondary brand color gradient for backgrounds';
COMMENT ON COLUMN hotspot_locations.contact_phone IS 'Contact phone number displayed on landing page';
COMMENT ON COLUMN hotspot_locations.contact_email IS 'Contact email displayed on landing page';
COMMENT ON COLUMN hotspot_locations.features IS 'JSON array of features to display on landing page';

-- Update existing Awka location with sample customization data (if it exists)
UPDATE hotspot_locations 
SET 
    welcome_message = 'Welcome to PHSWEB Awka!',
    brand_color_primary = 'from-blue-600 to-purple-600',
    brand_color_secondary = 'from-blue-50 to-purple-50',
    contact_phone = '+234-XXX-XXX-XXXX',
    contact_email = 'awka@phsweb.com',
    features = '["High-Speed Internet", "24/7 Support", "Secure Connection"]'::jsonb
WHERE id = 'awka' AND welcome_message IS NULL;

-- Sample data for other common locations
INSERT INTO hotspot_locations (id, name, display_name, welcome_message, brand_color_primary, contact_email, features) VALUES
('lagos', 'Lagos', 'PHSWEB Lagos Island', 'Welcome to PHSWEB Lagos!', 'from-green-600 to-teal-600', 'lagos@phsweb.com', '["Ultra-Fast Internet", "Premium Support", "Business Grade"]'::jsonb),
('abuja', 'Abuja', 'PHSWEB Abuja Central', 'Welcome to PHSWEB Abuja!', 'from-orange-600 to-red-600', 'abuja@phsweb.com', '["Reliable Connection", "Government Grade", "24/7 Monitoring"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    welcome_message = EXCLUDED.welcome_message,
    brand_color_primary = EXCLUDED.brand_color_primary,
    contact_email = EXCLUDED.contact_email,
    features = EXCLUDED.features;

-- ============================================================================
-- VERIFICATION QUERIES (Optional - for testing)
-- ============================================================================

-- View all locations with their customization settings
-- SELECT id, name, display_name, welcome_message, brand_color_primary, contact_phone, contact_email, features FROM hotspot_locations;

-- Test JSON features array
-- SELECT id, name, features, jsonb_array_length(features) as feature_count FROM hotspot_locations WHERE features IS NOT NULL; 