-- ============================================================================
-- HOTSPOT DISPLAY TOGGLES MIGRATION
-- Add toggle fields for controlling visibility of hotspot login page elements
-- ============================================================================

-- Add new columns to hotspot_locations table for display control
ALTER TABLE hotspot_locations ADD COLUMN IF NOT EXISTS show_logo BOOLEAN DEFAULT true;
ALTER TABLE hotspot_locations ADD COLUMN IF NOT EXISTS show_location_badge BOOLEAN DEFAULT true;
ALTER TABLE hotspot_locations ADD COLUMN IF NOT EXISTS show_display_name BOOLEAN DEFAULT true;
ALTER TABLE hotspot_locations ADD COLUMN IF NOT EXISTS show_welcome_message BOOLEAN DEFAULT true;
ALTER TABLE hotspot_locations ADD COLUMN IF NOT EXISTS show_description BOOLEAN DEFAULT true;
ALTER TABLE hotspot_locations ADD COLUMN IF NOT EXISTS show_guest_access BOOLEAN DEFAULT true;
ALTER TABLE hotspot_locations ADD COLUMN IF NOT EXISTS show_pin_display BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_hotspot_locations_display_toggles ON hotspot_locations(show_logo, show_location_badge, show_display_name, show_welcome_message, show_description, show_guest_access, show_pin_display);

-- Add comments for documentation
COMMENT ON COLUMN hotspot_locations.show_logo IS 'Toggle to show/hide the PHSWEB logo on login page';
COMMENT ON COLUMN hotspot_locations.show_location_badge IS 'Toggle to show/hide the location badge on login page';
COMMENT ON COLUMN hotspot_locations.show_display_name IS 'Toggle to show/hide the display name on login page';
COMMENT ON COLUMN hotspot_locations.show_welcome_message IS 'Toggle to show/hide the welcome message on login page';
COMMENT ON COLUMN hotspot_locations.show_description IS 'Toggle to show/hide the description on login page';
COMMENT ON COLUMN hotspot_locations.show_guest_access IS 'Toggle to show/hide the guest access button on login page';
COMMENT ON COLUMN hotspot_locations.show_pin_display IS 'Toggle to show/hide the PIN display in registration success page (for SMS delivery issues)';

-- Update existing locations to have all elements visible by default, except PIN display (only show when needed)
UPDATE hotspot_locations 
SET 
    show_logo = true,
    show_location_badge = true,
    show_display_name = true,
    show_welcome_message = true,
    show_description = true,
    show_guest_access = true,
    show_pin_display = false
WHERE show_logo IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES (Optional - for testing)
-- ============================================================================

-- View all locations with their display toggle settings
-- SELECT id, name, display_name, show_logo, show_location_badge, show_display_name, show_welcome_message, show_description, show_guest_access, show_pin_display FROM hotspot_locations; 