# Hotspot Display Toggles Implementation

## Overview
This implementation adds individual toggle controls for each UI element in the hotspot login page header section, allowing administrators to reduce visual clutter by selectively hiding elements.

## Database Changes

### New Fields Added to `hotspot_locations` Table:
- `show_logo` (BOOLEAN) - Toggle PHSWEB logo visibility
- `show_location_badge` (BOOLEAN) - Toggle location name badge visibility  
- `show_display_name` (BOOLEAN) - Toggle main location title visibility
- `show_welcome_message` (BOOLEAN) - Toggle welcome message visibility
- `show_description` (BOOLEAN) - Toggle description text visibility
- `show_guest_access` (BOOLEAN) - Toggle guest access button visibility

### Migration Required:
Run `database-migration-display-toggles.sql` to add the new fields with default values of `true` (all elements visible).

## Implementation Details

### 1. Database Layer (`src/lib/database.ts`)
- Updated `HotspotLocation` interface with new boolean fields
- All existing locations default to showing all elements

### 2. API Layer (`src/app/api/locations/[locationId]/route.ts`)
- Enhanced PUT endpoint to handle display toggle updates
- Supports partial updates for individual toggle states

### 3. Hotspot Login Page (`src/app/hotspot/[locationId]/page.tsx`)
- **Conditional Rendering**: Each header element wrapped in conditional display logic
- **Fallback Handling**: Default to visible if toggle value is undefined
- **Interface Updates**: Added display toggle properties to `LocationInfo` interface

### 4. Admin Interface (`src/app/hotspot/page.tsx`)
- **Add Location Form**: New "Display Settings" section with 6 toggle switches
- **Edit Location Form**: Same toggle controls for existing locations
- **Form State Management**: Toggle values included in both new and edit location workflows

## UI Components

### Toggle Controls
Each toggle includes:
- **Label**: Clear description of the UI element
- **Help Text**: Explains what the toggle controls
- **Switch UI**: Professional toggle switch with blue active state
- **Responsive Layout**: Organized in clean grid layout

### Toggleable Elements
1. **PHSWEB Logo** - Company branding at top
2. **Location Badge** - Colored pill with location name
3. **Display Name** - Main location title (h1)
4. **Welcome Message** - Custom greeting text
5. **Description** - Additional descriptive text
6. **Guest Access Button** - Quick guest login option

## Usage Examples

### Minimal Clean Look:
- Hide: Logo, Location Badge, Description, Guest Access
- Show: Display Name, Welcome Message
- Result: Clean, focused login form

### Business Professional:
- Show: Logo, Display Name, Description
- Hide: Location Badge, Welcome Message, Guest Access
- Result: Formal, corporate appearance

### Maximum Simplicity:
- Show: Display Name only
- Hide: All other elements
- Result: Ultra-minimal interface

### Guest-Focused Setup:
- Show: Logo, Display Name, Guest Access
- Hide: Location Badge, Welcome Message, Description
- Result: Streamlined for guest users

## Business Benefits

### 1. **Customizable Branding**
- Different locations can have different presentation styles
- Match local market preferences
- Professional flexibility

### 2. **Reduced Visual Clutter**
- Remove unnecessary elements for cleaner UI
- Improve user focus on login process
- Better mobile experience

### 3. **Marketing Flexibility**
- Seasonal adjustments (hide/show elements)
- A/B testing different presentations
- Location-specific customization

### 4. **Operational Control**
- Real-time updates without developer intervention
- Location managers can adjust their own presentation
- Centralized control with local flexibility

### 5. **Access Control**
- Hide guest access for premium-only locations
- Show guest access for public/demo locations
- Control user experience per location type

## Technical Architecture

### Frontend Flow:
1. Admin sets toggle values in management interface
2. Values saved to database via API
3. Hotspot login page fetches location data
4. UI elements conditionally rendered based on toggles
5. Real-time updates when settings change

### Default Behavior:
- New locations: All elements visible by default
- Existing locations: All elements visible (migration handles this)
- Undefined values: Default to visible (fail-safe)

### Performance Considerations:
- Minimal overhead (simple boolean checks)
- Database indexed for efficient queries
- No additional API calls required

## Migration Instructions

### For Existing Installations:
1. Run `database-migration-display-toggles.sql`
2. Deploy updated codebase
3. Existing locations will show all elements by default
4. Customize individual locations through admin UI

### For New Installations:
- All features available immediately
- Default configuration shows all elements
- Ready for customization

## Future Enhancements

### Potential Additions:
- **Element Ordering**: Drag-and-drop reordering of visible elements
- **Custom CSS Classes**: Add custom styling per location
- **Conditional Display**: Show/hide based on time, user type, etc.
- **Template System**: Save and apply display presets
- **Preview Mode**: Real-time preview before saving changes

### Advanced Features:
- **Mobile-specific toggles**: Different settings for mobile vs desktop
- **User role visibility**: Show different elements to different user types
- **Analytics integration**: Track which configurations perform best
- **Bulk operations**: Apply settings to multiple locations at once

This implementation provides granular control over hotspot login page presentation while maintaining backward compatibility and providing a smooth upgrade path. 