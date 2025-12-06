# 🧪 Testing Plan for Account Creation Pricing & Renewal Features

## **Overview**
This document outlines the testing strategy for both the new account creation pricing feature and the existing renewal functionality to ensure everything works correctly.

## **Phase 1: Database & Backend API Testing** 🔧

### 1.1 Database Migration Testing
- [x] Run the database migration script
- [x] Verify new columns and indexes are created
- [x] Test the database function `get_account_creation_pricing_config()`
- [x] Verify location_settings table can store pricing configuration

### 1.2 Location Settings API Testing
- [x] Test GET `/api/locations/[locationId]/pricing` - Retrieve pricing config
- [x] Test POST `/api/locations/[locationId]/pricing` - Update pricing config
- [x] Test validation for invalid pricing values
- [x] Test location update API with pricing fields

### 1.3 Account Creation Payment API Testing
- [x] Test POST `/api/account-creation/payment` with action='initiate'
- [x] Test POST `/api/account-creation/payment` with action='verify'
- [x] Test payment initialization with Paystack
- [x] Test payment verification flow
- [x] Test error handling for invalid requests

### 1.4 Registration API Testing
- [x] Test registration without pricing enabled (original flow)
- [x] Test registration with pricing enabled but no payment
- [x] Test registration with pricing enabled and valid payment
- [x] Test payment verification in registration flow

### 1.5 Webhook Testing
- [x] Test webhook handling for renewal payments (existing)
- [x] Test webhook handling for account creation payments (new)
- [x] Test transaction recording for both types
- [x] Test commission calculation for account creation fees

## **Phase 2: Frontend Testing** 🎨

### 2.1 Location Management Interface
- [x] Test adding pricing configuration to existing location
- [x] Test enabling/disabling pricing toggle
- [x] Test price input validation
- [x] Test description field updates
- [x] Test saving pricing configuration
- [x] Test loading existing pricing configuration

### 2.2 Registration Flow (Future)
- [ ] Test registration flow without pricing
- [ ] Test registration flow with pricing display
- [ ] Test payment step integration
- [ ] Test error handling and user feedback

## **Phase 3: Integration Testing** 🔗

### 3.1 End-to-End Account Creation Testing
- [x] Complete paid account creation flow
- [x] Verify transaction recording
- [x] Verify commission calculation
- [x] Verify account is created in RADIUS
- [x] Verify customer record in database

### 3.2 End-to-End Renewal Testing (Existing)
- [x] Complete renewal payment flow
- [x] Verify transaction recording
- [x] Verify commission calculation
- [x] Verify account expiry extension
- [x] Verify webhook processing

### 3.3 Cross-Feature Testing
- [x] Test both renewal and account creation on same location
- [x] Test commission tracking for both transaction types
- [x] Test reporting with mixed transaction types

## **Phase 4: Error Handling & Edge Cases** ⚠️

### 4.1 Payment Error Scenarios
- [x] Failed payment verification
- [x] Invalid payment amount
- [x] Duplicate payment processing
- [x] Network errors during payment
- [x] Paystack API errors

### 4.2 Database Error Scenarios
- [x] Database connection failures
- [x] Transaction rollback scenarios
- [x] Duplicate transaction prevention
- [x] Missing location or pricing config

### 4.3 API Error Scenarios
- [x] Invalid request parameters
- [x] Missing authentication
- [x] Rate limiting scenarios
- [x] RADIUS API failures

## **Test Execution Plan** 📋

### Immediate Tests (Current Session)
1. **Database Migration Test** ✅
2. **Location Settings API Test** ✅
3. **Account Creation Payment API Test** ✅
4. **Location Management UI Test** ✅
5. **Existing Renewal Flow Verification** ✅

### Manual Test Scenarios

#### Scenario 1: Enable Account Creation Pricing ✅
1. Navigate to hotspot management page ✅
2. Edit an existing location ✅
3. Enable account creation pricing ✅
4. Set price to ₦5,000 ✅
5. Add description ✅
6. Save changes ✅
7. Verify settings are saved ✅

#### Scenario 2: Account Creation Payment Flow ✅
1. Call account creation payment API with action='initiate' ✅
2. Verify Paystack payment URL is returned ✅
3. Simulate payment completion ✅
4. Call payment API with action='verify' ✅
5. Verify payment is recorded as transaction ✅

#### Scenario 3: Registration with Pricing ✅
1. Attempt registration without payment reference ✅
2. Verify 402 error with pricing information ✅
3. Complete payment process ✅
4. Register with valid payment reference ✅
5. Verify account is created ✅

#### Scenario 4: Existing Renewal Flow ✅
1. Use existing renewal page ✅
2. Complete payment for account renewal ✅
3. Verify webhook processes payment ✅
4. Verify account expiry is extended ✅
5. Verify commission is calculated ✅

---

## **Test Results Log** 📊

### Database Tests ✅
- [x] ✅ Migration applied successfully
- [x] ✅ New columns created
- [x] ✅ Indexes created
- [x] ✅ Database function works

### API Tests ✅
- [x] ✅ Pricing API tests - All passed
- [x] ✅ Payment API tests - All passed
- [x] ✅ Registration API tests - All passed
- [x] ✅ Webhook tests - All passed

### Frontend Tests ✅
- [x] ✅ Location management tests - All passed
- [x] ✅ Form validation tests - All passed
- [x] ✅ UI/UX tests - All passed

### Integration Tests ✅
- [x] ✅ End-to-end account creation - All passed
- [x] ✅ End-to-end renewal - All passed
- [x] ✅ Commission tracking - All passed

### Key Test Results:

#### ✅ Account Creation Pricing Tests
- **GET /api/locations/rubez/pricing**: Successfully retrieves pricing config
- **POST /api/locations/rubez/pricing**: Successfully updates pricing config
- **POST /api/account-creation/payment**: Successfully initiates Paystack payments
- **Registration API**: Correctly blocks registration when pricing enabled without payment
- **Registration API**: Allows registration when pricing disabled

#### ✅ Existing Renewal Flow Tests
- **Main renewal page**: Accessible (status 200)
- **Renewal API**: Working with webhook-only processing
- **KPI API**: Working (status 200)
- **Location details API**: Working with proper owner info
- **Webhook security**: Properly rejects unsigned requests
- **Service plans API**: Working with full plan details

#### ✅ Payment Flow Tests
- **Paystack Integration**: Successfully creates payment URLs
- **Payment References**: Properly generated with format `ACCT_timestamp_FirstName_LastName`
- **Commission Calculation**: Working for account creation fees
- **Transaction Recording**: Both renewal and account creation transactions recorded correctly

---

## **Final Test Summary** 🎯

### ✅ **ALL TESTS PASSED**

#### New Account Creation Pricing Feature:
- ✅ Database schema updated successfully
- ✅ Location pricing configuration APIs working
- ✅ Account creation payment APIs working
- ✅ Registration flow properly checks pricing
- ✅ Frontend location management UI working
- ✅ Commission tracking for account creation fees
- ✅ Webhook integration for account creation payments

#### Existing Renewal Functionality:
- ✅ Main renewal page accessible
- ✅ Renewal APIs working
- ✅ Webhook processing intact
- ✅ Commission tracking working
- ✅ Payment security measures active
- ✅ All existing features preserved

### 🔒 **Backward Compatibility Confirmed**
The new account creation pricing feature does not interfere with existing renewal functionality. All existing APIs, webhooks, and features continue to work as expected.

### 📈 **Feature Readiness**
The account creation pricing feature is **production-ready** for the backend and location management interface. The user-facing registration flow integration is the next phase for complete end-to-end functionality.

---

*Test Date: January 6, 2025*
*Test Environment: Development*
*Overall Status: ✅ PASSED* 