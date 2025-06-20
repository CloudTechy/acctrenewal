# Create User Implementation Task List

## Overview
This document outlines the implementation steps for enhancing the hotspot user registration system with location-based group ID and owner assignment, plus fixing the expiry date validation issue.

## Current Issues Identified
1. **Expiry Date Error**: "Expiry date is invalid!" - API expects date format but we're not sending expiry parameter
2. **Missing Location Context**: Registration form doesn't capture location information
3. **Missing Group ID**: No group ID assignment based on location
4. **Missing Owner Assignment**: No owner assignment for commission tracking

## Required Database Schema Changes

### 1. Extend `hotspot_locations` Table
```sql
ALTER TABLE hotspot_locations ADD COLUMN group_id INTEGER;
ALTER TABLE hotspot_locations ADD COLUMN default_owner_id UUID REFERENCES account_owners(id);
ALTER TABLE hotspot_locations ADD COLUMN registration_enabled BOOLEAN DEFAULT true;
```

### 2. Update Sample Data
```sql
-- Add group IDs and default owners for existing locations
UPDATE hotspot_locations SET group_id = 1, default_owner_id = (SELECT id FROM account_owners LIMIT 1) WHERE id = 'awka';
```

## Implementation Tasks

### Phase 1: Database & API Layer Updates

#### Task 1.1: Update Database Schema
- [ ] Create migration file for `hotspot_locations` table extensions
- [ ] Add `group_id` column (INTEGER)
- [ ] Add `default_owner_id` column (UUID, FK to account_owners)
- [ ] Add `registration_enabled` column (BOOLEAN, default true)
- [ ] Update existing location data with default values

#### Task 1.2: Update Database Interface Functions
**File**: `src/lib/database.ts`
- [ ] Update `HotspotLocation` interface to include new fields
- [ ] Modify `createHotspotLocation()` to handle new fields
- [ ] Modify `updateHotspotLocation()` to handle new fields
- [ ] Add `getLocationWithOwner()` function to fetch location with owner details

#### Task 1.3: Create Owner Management API
**File**: `src/app/api/owners/route.ts` (already exists, verify functionality)
- [ ] Ensure GET endpoint returns all active account owners
- [ ] Verify response format for dropdown population

### Phase 2: Frontend Location Management Updates

#### Task 2.1: Update Add Location Form
**File**: `src/app/hotspot/page.tsx`
- [ ] Add Group ID input field (number input)
- [ ] Add Owner selection dropdown (populated from `/api/owners`)
- [ ] Add Registration Enabled toggle
- [ ] Update form validation
- [ ] Update `handleAddLocation()` to include new fields

#### Task 2.2: Update Location Display
**File**: `src/app/hotspot/page.tsx`
- [ ] Display group ID in location cards
- [ ] Display assigned owner name in location cards
- [ ] Show registration status (enabled/disabled)
- [ ] Add edit functionality for location settings

### Phase 3: Registration System Enhancement

#### Task 3.1: Add Location Context to Registration
**File**: `src/app/hotspot/[locationId]/page.tsx`
- [ ] Pass location ID to registration page via URL parameter
- [ ] Update "Create Hotspot Account" button to include location context
- [ ] Modify registration link: `/hotspot/register?location=${locationId}`

#### Task 3.2: Update Registration Page
**File**: `src/app/hotspot/register/page.tsx`
- [ ] Extract location ID from URL parameters
- [ ] Fetch location details including group_id and owner
- [ ] Display location-specific branding/information
- [ ] Pass location context through registration flow
- [ ] Update registration data state to include location info

#### Task 3.3: Fix Expiry Date Issue
**File**: `src/app/api/radius/register-user/route.ts`
- [ ] Add expiry date calculation (current date + service plan duration)
- [ ] Format expiry date correctly for Radius Manager API
- [ ] Add `groupid` parameter from location data
- [ ] Add `owner` parameter from location data
- [ ] Update URL construction with new parameters

### Phase 4: API Endpoints Enhancement

#### Task 4.1: Create Location Details API
**File**: `src/app/api/locations/[locationId]/details/route.ts`
- [ ] Create new endpoint to fetch location with owner details
- [ ] Include group_id, owner information, and registration settings
- [ ] Used by registration page to get location context

#### Task 4.2: Update Registration API
**File**: `src/app/api/radius/register-user/route.ts`
- [ ] Accept `locationId` parameter in request body
- [ ] Fetch location details including group_id and owner
- [ ] Calculate proper expiry date based on service plan
- [ ] Include all required parameters in Radius Manager API call:
  - `groupid` (from location)
  - `owner` (from location)
  - `expiry` (calculated date in YYYY-MM-DD format)

### Phase 5: Service Plan Integration

#### Task 5.1: Update Service Plans API
**File**: `src/app/api/radius/service-plans/route.ts`
- [ ] Ensure service plans include duration information
- [ ] Add plan duration to response for expiry calculation

#### Task 5.2: Expiry Date Calculation Logic
**File**: `src/app/api/radius/register-user/route.ts`
- [ ] Create utility function to calculate expiry date
- [ ] Handle different service plan durations (days/months)
- [ ] Format date as YYYY-MM-DD HH:MM:SS or YYYY-MM-DD based on API requirements

### Phase 6: Database Integration for Commission Tracking

#### Task 6.1: Create Customer Record
**File**: `src/app/api/radius/register-user/route.ts`
- [ ] After successful Radius Manager registration, create customer record
- [ ] Link customer to account owner for commission tracking
- [ ] Store location information for analytics

#### Task 6.2: Update Customer Database Functions
**File**: `src/lib/database.ts`
- [ ] Add `createCustomerFromRegistration()` function
- [ ] Link to account owner and location
- [ ] Store registration source as 'hotspot_registration'

## Implementation Details

### Expiry Date Format Research
Based on the DMA API documentation found, the expiry format should be:
- Format: `YYYY-MM-DD` or `YYYY-MM-DD HH:MM:SS`
- Example: `2024-11-03` or `2024-11-03 20:00:00`

### Group ID and Owner Parameters
- `groupid`: Integer value representing the user group
- `owner`: String value representing the account owner username

### API URL Construction Example
```javascript
const params = new URLSearchParams({
  apiuser: apiUser,
  apipass: apiPass,
  q: 'new_user',
  username,
  password,
  enabled: enabled.toString(),
  acctype: acctype.toString(),
  srvid,
  groupid: locationData.group_id.toString(),
  owner: locationData.owner_username,
  expiry: calculateExpiryDate(selectedPlan),
  firstname,
  lastname,
  email,
  phone: phone || username,
  ...(address && { address }),
  ...(city && { city }),
  ...(state && { state })
});
```

### Expiry Date Calculation Function
```javascript
function calculateExpiryDate(servicePlan) {
  const now = new Date();
  const expiryDate = new Date(now);
  
  // Add service plan duration (assuming duration is in days)
  expiryDate.setDate(now.getDate() + (servicePlan.duration || 30));
  
  // Format as YYYY-MM-DD HH:MM:SS
  return expiryDate.toISOString().slice(0, 19).replace('T', ' ');
}
```

## Testing Plan

### Phase 7: Testing & Validation

#### Task 7.1: Database Testing
- [ ] Test location creation with new fields
- [ ] Verify owner dropdown population
- [ ] Test location updates

#### Task 7.2: Registration Flow Testing
- [ ] Test registration with location context
- [ ] Verify group ID and owner assignment
- [ ] Test expiry date calculation
- [ ] Validate Radius Manager API integration

#### Task 7.3: Integration Testing
- [ ] Test complete flow from location selection to user creation
- [ ] Verify commission tracking database entries
- [ ] Test error handling and validation

## File Summary

### Files to Modify:
1. `src/lib/database.ts` - Database functions and interfaces
2. `src/app/hotspot/page.tsx` - Location management dashboard
3. `src/app/hotspot/[locationId]/page.tsx` - Individual login pages
4. `src/app/hotspot/register/page.tsx` - Registration form
5. `src/app/api/radius/register-user/route.ts` - Registration API
6. `src/app/api/locations/[locationId]/route.ts` - Location details API

### Files to Create:
1. `src/app/api/locations/[locationId]/details/route.ts` - Location with owner details
2. Database migration file for schema updates

## Priority Order

1. **High Priority**: Fix expiry date issue (immediate business impact)
2. **High Priority**: Add location context to registration
3. **Medium Priority**: Update location management with group ID and owner
4. **Medium Priority**: Implement commission tracking integration
5. **Low Priority**: Enhanced UI and validation

## Estimated Timeline

- **Phase 1-2**: 2-3 days (Database and location management)
- **Phase 3**: 2-3 days (Registration system updates)
- **Phase 4**: 1-2 days (API enhancements)
- **Phase 5-6**: 2-3 days (Service plan integration and commission tracking)
- **Phase 7**: 1-2 days (Testing and validation)

**Total Estimated Time**: 8-13 days

## Dependencies

1. Access to Radius Manager API documentation for parameter validation
2. Service plan duration information from Radius Manager
3. Account owners data populated in database
4. Testing environment with MikroTik router integration

## Notes

- The expiry date issue should be addressed first as it's blocking user registration
- Location context is critical for proper group ID and owner assignment
- Commission tracking integration will enable proper business analytics
- All changes should maintain backward compatibility with existing locations 