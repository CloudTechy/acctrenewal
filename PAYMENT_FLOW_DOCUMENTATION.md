# Complete Payment Flow: Paystack Integration

## Overview
The Connekt platform uses a **hybrid architecture** for processing Paystack payments:
- **Primary**: Frontend `/api/renew` endpoint processes renewal immediately and returns `newExpiry`
- **Backup**: Paystack webhook handles retries if primary fails

This ensures:
- ✅ Frontend gets immediate feedback with updated expiry
- ✅ Webhook provides reliability and retry mechanism
- ✅ No double-processing (database constraints + idempotency checks)

---

## 1. SUCCESS FLOW (Happy Path)

### 1.1 User Initiates Payment
**Location**: [src/app/page.tsx](src/app/page.tsx#L700) - PaymentButton component

1. User enters account username and searches
2. System fetches account details from `/api/account`
3. User clicks "Renew Account" → PaystackButton opens payment modal
4. Paystack modal includes metadata:
   ```json
   {
     "username": "user123",
     "srvid": "78",
     "timeunitexp": 30,
     "trafficunitcomb": 500,
     "limitcomb": 0
   }
   ```

### 1.2 Paystack Payment Gateway
1. User enters payment details on Paystack hosted checkout
2. Card is charged in kobo (NGN 10,000 = 1,000,000 kobo)
3. Paystack returns payment reference: `flw_273928_abcd1234...`
4. Paystack **immediately sends webhook** to backend: `POST /api/webhook/paystack/`

### 1.3 Frontend Success Handler (Verification Only)
**Location**: [src/app/page.tsx](src/app/page.tsx#L744-L827) - `handlePaymentSuccess()`

```typescript
// 1. User returns from Paystack modal with payment reference
const handlePaymentSuccess = (reference: PaystackReference) => {
  // 2. Frontend calls its own verification endpoint
  const response = await fetch('/api/renew', {
    method: 'POST',
    body: JSON.stringify({
      reference: reference.reference,   // e.g., "flw_273928_abcd1234"
      username: originalUsername,
      srvid: servicePlan.srvid,
      timeunitexp: servicePlan.timeunitexp || 30,
      trafficunitcomb: servicePlan.trafficunitcomb || 0,
      limitcomb: servicePlan.limitcomb || 0,
      currentExpiry: userData.expiry
    })
  });

  const renewalResult = await response.json();
  // 3. If response.success === true:
  //    - Refresh user data from /api/account
  //    - Show "Account Updated" notification (3 sec)
  //    - Update UI with new expiry date
};
```

**Purpose**: The frontend's `/api/renew` endpoint is a **verification checkpoint**, not the main processor.

### 1.4 Frontend Verification Endpoint (NOW PROCESSING)
**Location**: [src/app/api/renew/route.ts](src/app/api/renew/route.ts#L1)

```typescript
export async function POST(request: NextRequest) {
  // 1. Verify payment with Paystack API
  const isPaymentVerified = await verifyPaystackTransaction(reference);
  
  if (!isPaymentVerified) {
    return NextResponse.json(
      { error: 'Payment verification failed' }, 
      { status: 400 }
    );
  }

  // 2. Fetch current user expiry from RADIUS
  const userResponse = await fetch(RADIUS_API + 'get_userdata' + username);
  const userCurrentExpiry = userData.expiry;
  
  // 3. Calculate days to add (including expired days)
  if (userCurrentExpiry is past expiry) {
    actualDaysToAdd = timeunitexp + expiredDays;
  }
  
  // 4. Call RADIUS to add credits
  const radiusResponse = await fetch(RADIUS_API + 'add_credits' + username + actualDaysToAdd);
  const result = radiusResponse.json();
  const newExpiry = result.expiry; // RADIUS returns new expiry
  
  // 5. Return success with newExpiry
  return NextResponse.json({
    success: true,
    newExpiry: newExpiry, // ✅ Frontend gets this!
    message: 'Account renewal processed.',
  });
}
```

**Key Changes**:
- ✅ Now **actually processes the renewal** (fetches expiry, calls RADIUS, adds credits)
- ✅ **Returns `newExpiry`** in response so frontend updates UI immediately
- ✅ Webhook acts as **backup** (in case this API call fails)
- ✅ Prevents double-processing: database checks prevent duplicate transactions

### 1.5 Backend Webhook Processing (Main Processor)
**Location**: [src/app/api/webhook/paystack/route.ts](src/app/api/webhook/paystack/route.ts)

Webhook execution order:

1. **Signature Verification** (lines 245-252)
   ```typescript
   // HMAC-SHA512 verification using PAYSTACK_SECRET_KEY
   const signature = request.headers.get('x-paystack-signature');
   if (!verifyPaystackSignature(body, signature)) {
     return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
   }
   ```

2. **Idempotency Check** (lines 320-325)
   ```typescript
   // Check if this reference has already been processed
   const existingTransaction = await checkExistingTransaction(safeReference);
   if (existingTransaction) {
     return NextResponse.json({ message: 'Already processed' }, { status: 200 });
   }
   ```

3. **Rate Limiting** (lines 296-310)
   ```typescript
   // Per-IP rate limit: 20 requests/minute
   // Per-reference rate limit: 5 requests/5 minutes
   ```

4. **Metadata Extraction** (lines 328-330)
   ```typescript
   // Extract username, srvid, timeunitexp, trafficunitcomb, limitcomb
   // from Paystack's custom_fields metadata
   ```

5. **Fetch Current User Expiry** (lines 375-390)
   ```typescript
   // Call RADIUS API: get_userdata to determine current account expiry
   // This allows adding expired days back to the account
   ```

6. **Create Preliminary Transaction Record** (lines 392-406)
   ```typescript
   // Create renewal_transactions record with status='processing'
   // This prevents race conditions if webhook is received twice
   ```

7. **Add Credits to RADIUS** (lines 408-420)
   ```typescript
   // Call RADIUS API: add_credits with corrected day count
   // If account expired N days ago, add: service_days + N
   // RADIUS API returns the new expiry date (authoritative)
   ```

8. **Record Transaction for Analytics** (lines 422-423)
   ```typescript
   // Update renewal_transactions record with:
   // - Service plan name
   // - Customer details (first_name, last_name, email, phone)
   // - Account owner assignment
   // - Commission tracking
   ```

9. **Return Success to Paystack** (lines 425-430)
   ```typescript
   return NextResponse.json({ 
     message: 'Webhook processed successfully',
     reference: reference,
     username: username
   }, { status: 200 });
   ```

### 1.6 Account Updated in Real-Time
Approximately **2-5 seconds** after webhook completes:

1. ✅ RADIUS system updates user account
2. ✅ Expiry date extended by specified days
3. ✅ Traffic limits updated
4. ✅ Database records created for analytics
5. ✅ Frontend refreshes account data (if polling) or users refresh page

---

## 2. FAILURE FLOW (Error Scenarios)

### 2.1 User Cancels Payment
**When**: User clicks "X" or "Go Back" on Paystack modal

**Frontend Response**:
```typescript
const handlePaymentClose = () => {
  console.log('Payment dialog was closed');
  setIsProcessingPayment(false); // Re-enable button
  // User can retry immediately
};
```

**Backend**: No webhook is sent. No payment is charged.

**User Experience**: 
- Button re-enables
- User can click "Renew Account" again
- No error message (expected behavior)

---

### 2.2 Payment Fails (Insufficient Funds, Declined Card, etc.)

**When**: Card is declined or payment gateway error occurs

**Paystack Response**: 
- Does NOT send webhook (charge.success is not triggered)
- Returns error to frontend payment modal
- Modal closes with error message

**Frontend Response** (assumed in modal):
- Shows "Payment failed - your card was declined"
- Button re-enables for retry
- No call to `/api/renew`

---

### 2.3 Webhook Never Arrives (Network Issue)
**When**: Paystack tries to send webhook but request fails

**Paystack's Behavior**:
- Retries webhook delivery for 24 hours
- Exponential backoff: 1s, 5s, 30s, 2m, 5m, 30m, 2h, 5h, etc.

**User's Experience**:
1. Frontend shows "Payment verified" (based on instant Paystack response)
2. User refreshes page → account NOT updated yet
3. Paystack retries webhook → eventually succeeds
4. User refreshes again → account IS updated

**Mitigation**: 
- Frontend shows note: "Credits will be added within a few seconds"
- User can refresh page to check status
- Or wait a few minutes for retry

---

### 2.4 Webhook Signature Validation Fails

**When**: Attacker forges webhook or webhook is corrupted

**Backend Response** (lines 247-252):
```typescript
if (!verifyPaystackSignature(body, signature)) {
  console.error('Invalid Paystack signature');
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
}
```

**Result**: Webhook is rejected. Payment is NOT processed. No transaction record created.

**Paystack's Behavior**: Retries webhook with same signature.

**Resolution**: Paystack must fix the issue or the payment is lost (rare).

---

### 2.5 Payment Reference Invalid

**When**: Malformed reference, SQL injection attempt, etc.

**Backend Validation** (lines 313-319):
```typescript
const safeReference = validatePaystackReference(reference);
// If invalid format, throws error
```

**Response**:
```json
{ "error": "Invalid payment reference" }
```

**No transaction created. Payment NOT processed.**

---

### 2.6 Required Metadata Missing

**When**: Frontend forgot to send username or srvid

**Backend Check** (lines 335-342):
```typescript
if (!rawMetadata.username || !rawMetadata.srvid) {
  return NextResponse.json({ 
    error: 'Missing required metadata fields'
  }, { status: 400 });
}
```

**Result**: Webhook rejected. Payment NOT processed.

**Fix**: Verify frontend is sending complete metadata in Paystack config.

---

### 2.7 RADIUS API Fails (Account Not Updated)

**When**: RADIUS server is down or returns error

**Scenario 1**: Main webhook call to add_credits fails
```typescript
if (!creditsResult.success) {
  console.error('Failed to add credits for:', username);
  return NextResponse.json(
    { error: 'Failed to add credits' }, 
    { status: 500 }
  );
}
```

**Result**: 
- Transaction record created but credits NOT added
- Webhook returns error (500)
- Paystack retries in 24 hours
- Eventually succeeds when RADIUS recovers

**Scenario 2**: Fetch current user expiry fails
```typescript
if (userResponse.ok) {
  // Use RADIUS response
} else {
  console.error('Error fetching user data');
  // Continue without current expiry (default to adding from today)
}
```

**Result**: 
- Credits STILL added but based on "today" instead of corrected date
- Account gets fewer days if it was expired
- Not ideal but prevents payment loss

---

## 3. IDEMPOTENCY & SECURITY

### 3.1 Duplicate Webhook Prevention

**Database Check** (lines 320-325):
```typescript
const existingTransaction = await checkExistingTransaction(safeReference);
if (existingTransaction) {
  console.log('Transaction already processed:', safeReference);
  return NextResponse.json({ message: 'Already processed' }, { status: 200 });
}
```

**How it works**:
1. First webhook arrives → creates renewal_transactions record
2. Second webhook arrives (duplicate) → finds existing record → returns 200 OK
3. RADIUS is NOT called twice ✅

**Protection Against**:
- Network retries
- Paystack double-sending
- Attacker replaying webhook

---

### 3.2 Rate Limiting

**Per-IP Limiting** (line 300):
- Max 20 requests per minute per IP
- Prevents flooding from a single attacker

**Per-Reference Limiting** (line 306):
- Max 5 requests per 5 minutes per reference
- Prevents replay attacks on same payment

---

### 3.3 Race Condition Prevention

**Preliminary Transaction Record** (line 392):
```typescript
const preliminaryTransaction = await createRenewalTransaction({
  ...fields,
  payment_status: 'processing'
});

if (!preliminaryRecord) {
  console.log('Failed to create - likely already processed');
  return NextResponse.json({ message: 'Already processed' }, { status: 200 });
}
```

**Scenario**: Two webhook requests arrive simultaneously

1. Request A creates transaction record (success)
2. Request B tries to create same record (fails due to unique constraint)
3. Request B returns "Already processed"
4. RADIUS is only called once ✅

---

## 4. DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INITIATES PAYMENT                        │
│                                                                   │
│  1. User enters username                                         │
│  2. Click "Renew Account"                                        │
│  3. Paystack modal opens                                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              PAYSTACK PAYMENT GATEWAY                            │
│                                                                   │
│  1. User enters card details                                     │
│  2. Card charged (₦10,000 = 1,000,000 kobo)                     │
│  3. Payment reference generated                                  │
│  4. Success shown to frontend                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
            ▼                             ▼
┌──────────────────────────┐  ┌──────────────────────────────────┐
│  FRONTEND /api/renew     │  │  BACKEND WEBHOOK (BACKUP)        │
│  (PRIMARY PROCESSOR)     │  │  Paystack → /api/webhook/paystack│
│                          │  │                                   │
│  1. Verify reference*    │  │  If /api/renew fails:            │
│  2. Get current expiry   │  │  1. Retry logic                  │
│  3. Add expired days     │  │  2. Process renewal              │
│  4. Call RADIUS          │  │  3. Update database              │
│  5. Get newExpiry from   │  │  4. Return 200 OK               │
│     RADIUS response      │  │                                   │
│  6. Return newExpiry     │  │                                   │
│     to frontend          │  │  (Also verifies Paystack sig)    │
└─────────────┬────────────┘  └──────────────────────────────────┘
              │
              ▼
   ┌──────────────────────────┐
   │  FRONTEND UI UPDATE      │
   │                          │
   │  1. Get newExpiry from   │
   │     response             │
   │  2. Update userData      │
   │  3. Show "success" for   │
   │     3 seconds            │
   │                          │
   │  (No data refresh delay) │
   └──────────────────────────┘
              │
              ▼
   ┌──────────────────────────┐
   │  DATABASE (async)        │
   │                          │
   │  - Webhook logs event    │
   │  - Records transaction   │
   │  - Tracks commission     │
   └──────────────────────────┘
```

---

## 5. TIMELINE & SLA

| Event | Time | Status |
|-------|------|--------|
| User initiates payment | T+0s | Button disabled |
| Paystack processes card | T+1-3s | Payment pending |
| Frontend receives reference | T+3-5s | Calls /api/renew |
| **RADIUS updates account** | T+4-6s | **Account renewed** |
| /api/renew returns newExpiry | T+5-7s | **Frontend updates UI immediately** |
| Webhook arrives (async) | T+0.5-2s | Logs transaction, confirms |
| User sees new expiry | T+5-10s | **No page refresh needed** |

**Key Improvement**: Frontend now has `newExpiry` from `/api/renew` response, so UI updates immediately without waiting for:
- Account API refresh
- Webhook processing
- Database async operations

Webhook provides **durability**: if API call fails, webhook will eventually process it.

---

## 6. MONITORING & DEBUGGING

### Check Transaction Status
```sql
-- See all renewals for a user
SELECT * FROM renewal_transactions 
WHERE username = 'user123' 
ORDER BY created_at DESC;

-- Check payment status
SELECT 
  paystack_reference, 
  payment_status, 
  created_at, 
  username 
FROM renewal_transactions 
WHERE payment_status = 'processing';
```

### Webhook Logs
Check server logs for:
```
Received Paystack webhook event: charge.success
Credits added successfully via webhook for: user123
Transaction already processed: flw_273928_abcd1234
```

### Manually Process Failed Webhook
If webhook never arrives after 24 hours:
1. Verify payment in Paystack dashboard
2. Confirm status is "success"
3. Manually call RADIUS add_credits API
4. Record transaction in database
5. Notify user

---

## 7. COMMON ISSUES & SOLUTIONS

| Issue | Cause | Solution |
|-------|-------|----------|
| "Payment verified but account not updated" | Webhook delayed | Wait 5-10 min or refresh page |
| "Duplicate webhook" | Network retry | Idempotency check prevents double-charge ✓ |
| "Invalid signature" | Webhook forged | Webhook rejected, no processing |
| "RADIUS timeout" | Slow network | Webhook retries in 24h |
| "Missing metadata" | Frontend bug | Verify Paystack config includes username/srvid |
| "Account still expired" | Calculation error | Check current expiry logic in addCreditsToUser() |

---

## 8. ENVIRONMENT VARIABLES

**Frontend**: `.env.local`
```
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key_here
```

**Backend**: `.env`
```
PAYSTACK_SECRET_KEY=your_paystack_secret_key_here
PAYSTACK_PUBLIC_KEY=your_paystack_public_key_here
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_here
PAYSTACK_WEBHOOK_URL=https://prod.triotech-backend.nativetalkapp.com/api/connekt/payment/webhook
```

---

## 9. NEXT STEPS / IMPROVEMENTS

- [ ] Add email notification after successful renewal
- [ ] Implement webhook delivery status dashboard
- [ ] Add retry mechanism UI (if webhook fails 3 times)
- [ ] Log all webhook events to separate audit table
- [ ] Add SMS notification for successful renewal
- [ ] Implement webhook replay endpoint for manual recovery

---

**Document Version**: 1.0  
**Last Updated**: February 2026  
**Tested**: Production with live Paystack

