import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createRenewalTransaction, getCustomerByUsername, createOrUpdateCustomer, getAccountOwnerByUsername, getLocationWithOwner, createHotspotCustomer } from '@/lib/database';
import { supabaseAdmin } from '@/lib/supabase';

// RADIUS API Configuration
const RADIUS_API_CONFIG = {
  baseUrl: process.env.RADIUS_API_URL || 'https://portal1.phsweb.ng/api/sysapi.php',
  apiuser: process.env.RADIUS_API_USER || 'phsweb',
  apipass: process.env.RADIUS_API_PASS || '',
};

// Paystack webhook event types
interface PaystackWebhookEvent {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: {
      custom_fields?: Array<{
        display_name: string;
        variable_name: string;
        value: string;
      }>;
      username?: string;
      srvid?: string;
      timeunitexp?: number;
      trafficunitcomb?: number;
      limitcomb?: number;
      [key: string]: string | number | boolean | null | undefined | Array<{
        display_name: string;
        variable_name: string;
        value: string;
      }>;
    };
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: Record<string, unknown>;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
    };
  };
}

// Verify Paystack webhook signature
function verifyPaystackSignature(payload: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error('PAYSTACK_SECRET_KEY not configured');
    return false;
  }

  const hash = crypto.createHmac('sha512', secret).update(payload).digest('hex');
  return hash === signature;
}

// Add credits to user via RADIUS Manager
async function addCreditsToUser(
  username: string,
  daysToAdd: number,
  trafficToAdd: number = 0,
  currentExpiry?: string
): Promise<{ success: boolean; newExpiry?: string }> {
  try {
    console.log('🔍 [DEBUG] addCreditsToUser called with:', {
      username,
      daysToAdd,
      daysToAdd_type: typeof daysToAdd,
      trafficToAdd,
      currentExpiry
    });
    
    console.log(`Adding ${daysToAdd} days to user ${username}`);
    if (currentExpiry) {
      console.log(`User current expiry: ${currentExpiry}`);
    }

    // Calculate the correct number of days to add based on current expiry
    let actualDaysToAdd = daysToAdd;
    
    if (currentExpiry) {
      const expiryDate = new Date(currentExpiry);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
      
      // If account has expired, add the expired days to ensure full service period
      if (expiryDate < today) {
        const expiredDays = Math.ceil((today.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24));
        actualDaysToAdd = daysToAdd + expiredDays;
        console.log(`Account expired ${expiredDays} days ago. Adding ${actualDaysToAdd} days total (${daysToAdd} service + ${expiredDays} expired)`);
      } else {
        console.log(`Account expires in the future. Adding ${daysToAdd} days as planned`);
      }
    } else {
      console.log(`No current expiry provided. Adding ${daysToAdd} days from today`);
    }

    const url = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${RADIUS_API_CONFIG.apiuser}&apipass=${RADIUS_API_CONFIG.apipass}&q=add_credits&username=${encodeURIComponent(username)}&dlbytes=0&ulbytes=0&totalbytes=${trafficToAdd}&expiry=${actualDaysToAdd}&unit=DAY&onlinetime=0`;

    console.log('Adding credits to user via webhook:', username);
    console.log('- Service plan days:', daysToAdd);
    console.log('- Actual days to add:', actualDaysToAdd);
    console.log('- Traffic to add (bytes):', trafficToAdd);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'PHSWEB-NextJS-App/1.0',
      },
    });

    if (!response.ok) {
      console.error('RADIUS add_credits failed via webhook:', response.statusText);
      return { success: false };
    }

    const result = await response.text();
    console.log('RADIUS add_credits response via webhook:', result);

    try {
      const parsedResult = JSON.parse(result);
      if (Array.isArray(parsedResult) && parsedResult.length >= 2) {
        const resultCode = parsedResult[0];
        const resultData = parsedResult[1];

        if (resultCode === 0) {
          console.log('Credits added successfully via webhook');
          
          // Use RADIUS API response as the authoritative expiry date
          // This ensures consistency between webhook and RADIUS system
          const apiExpiry = resultData.expiry;
          console.log(`RADIUS API set expiry to: ${apiExpiry}`);
          
          return { 
            success: true, 
            newExpiry: apiExpiry // Use RADIUS response, not internal calculation
          };
        } else {
          console.error('RADIUS add_credits failed with code:', resultCode, resultData);
          return { success: false };
        }
      } else {
        console.error('Unexpected RADIUS API response format via webhook:', parsedResult);
        return { success: false };
      }
    } catch (parseError) {
      console.error('Error parsing RADIUS response via webhook:', parseError);
      return { success: false };
    }
  } catch (error) {
    console.error('Error adding credits to user via webhook:', error);
    return { success: false };
  }
}

// Create user in RADIUS Manager - FIXED: No initial expiry for combined payments
async function createRadiusUser(userInfo: {
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  srvid: string;
  timeunitexp: number; // Duration info for reference, but not used for initial expiry
  locationData?: {
    group_id?: number;
    owner?: {
      owner_username: string;
    };
  };
  isFromCombinedPayment?: boolean; // NEW: Flag to indicate combined payment
}): Promise<{ success: boolean; message?: string }> {
  try {
    const radiusBaseUrl = RADIUS_API_CONFIG.baseUrl.replace('/api/sysapi.php', '');
    
    // 🔧 FIX: For combined payments, don't set initial expiry
    // Let addCreditsToUser handle ALL credit application to prevent double crediting
    let expiryDate: string | undefined;
    
    if (userInfo.isFromCombinedPayment) {
      // For combined payments: Create user with minimal access (1 hour)
      // This allows immediate login while payment processing completes
      const minimalExpiry = new Date();
      minimalExpiry.setHours(minimalExpiry.getHours() + 1); // 1 hour minimal access
      expiryDate = minimalExpiry.toISOString().slice(0, 19).replace('T', ' ');
      
      console.log('🔧 [FIX] Combined payment detected - creating user with minimal expiry:', expiryDate);
      console.log('🔧 [FIX] Full service credits will be applied by addCreditsToUser to prevent double crediting');
    } else {
      // For non-combined payments (account creation only): Use original logic
      if (userInfo.timeunitexp > 0) {
        // Calculate future date from today
        const expiryDateTime = new Date();
        expiryDateTime.setDate(expiryDateTime.getDate() + userInfo.timeunitexp);
        expiryDate = expiryDateTime.toISOString().slice(0, 19).replace('T', ' '); // Format: YYYY-MM-DD HH:mm:ss
      } else {
        // For unlimited plans, set far future date
        const expiryDateTime = new Date();
        expiryDateTime.setFullYear(expiryDateTime.getFullYear() + 10); // 10 years from now
        expiryDate = expiryDateTime.toISOString().slice(0, 19).replace('T', ' ');
      }
    }
    
    // Construct the API URL for creating new user
    const params = new URLSearchParams({
      apiuser: RADIUS_API_CONFIG.apiuser,
      apipass: RADIUS_API_CONFIG.apipass,
      q: 'new_user',
      username: userInfo.username,
      password: userInfo.password,
      enabled: '1',
      acctype: '0',
      srvid: userInfo.srvid,
      simuse: '2', // Set simultaneous use to 2
      firstname: userInfo.firstname,
      lastname: userInfo.lastname,
      email: userInfo.email,
      phone: userInfo.phone,
      expiry: expiryDate, // Use calculated expiry (minimal for combined payments)
      ...(userInfo.address && { address: userInfo.address }),
      ...(userInfo.city && { city: userInfo.city }),
      ...(userInfo.state && { state: userInfo.state }),
      ...(userInfo.locationData?.group_id && { groupid: userInfo.locationData.group_id.toString() }),
      ...(userInfo.locationData?.owner?.owner_username && { owner: userInfo.locationData.owner.owner_username })
    });

    const apiUrl = `${radiusBaseUrl}/api/sysapi.php?${params.toString()}`;
    
    console.log('Creating RADIUS user via webhook:', userInfo.username, 'with expiry:', expiryDate);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PHSWEB-NextJS-App/1.0',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to create user with Radius Manager');
    }

    const data = await response.json();
    console.log('RADIUS user creation response:', data);
    
    // Check if the registration was successful
    if (data[0] === 0) {
      console.log('RADIUS user created successfully:', userInfo.username);
      return { success: true, message: data[1] || 'User created successfully' };
    } else {
      console.error('RADIUS user creation failed:', data[1]);
      return { success: false, message: data[1] || 'User creation failed' };
    }

  } catch (error) {
    console.error('Error creating RADIUS user:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Extract metadata from Paystack payment with enhanced combined payment detection
function extractPaymentMetadata(event: PaystackWebhookEvent) {
  const metadata = event.data.metadata;
  console.log('Webhook received metadata:', metadata);
  
  let username = '';
  let srvid = '';
  let timeunitexp = 30; // default
  let trafficunitcomb = 0;
  let limitcomb = 0;
  let purpose = ''; // To detect account creation payments
  let locationId = ''; // Location context for account creation
  let customerEmail = ''; // NEW: Extract email from metadata
  
  // NEW: Enhanced fields for combined payment detection
  let accountCreationFee = 0;
  let servicePlanPrice = 0;
  let servicePlanName = '';
  let isCombinedPayment = false;

  // Extract from custom_fields if available
  if (metadata.custom_fields && Array.isArray(metadata.custom_fields)) {
    console.log('Extracting from custom_fields:', metadata.custom_fields);
    for (const field of metadata.custom_fields) {
      console.log(`Processing field: ${field.variable_name} = ${field.value}`);
      switch (field.variable_name) {
        case 'username':
        case 'phone': // Phone is the username in our system
          username = field.value;
          break;
        case 'email':
          customerEmail = field.value;
          break;
        case 'srvid':
          srvid = field.value;
          break;
        case 'timeunitexp':
          console.log('🔍 [DEBUG] Webhook - processing timeunitexp field:', {
            field_value: field.value,
            field_value_type: typeof field.value,
            parseInt_result: parseInt(field.value),
            parseInt_or_30: parseInt(field.value) || 30
          });
          timeunitexp = parseInt(field.value) || 30;
          break;
        case 'trafficunitcomb':
          trafficunitcomb = parseInt(field.value) || 0;
          break;
        case 'limitcomb':
          limitcomb = parseInt(field.value) || 0;
          break;
        case 'purpose':
          purpose = field.value;
          break;
        case 'location_id':
          locationId = field.value;
          break;
        // NEW: Combined payment specific fields
        case 'account_creation_fee':
          accountCreationFee = parseFloat(field.value) || 0;
          break;
        case 'service_plan_price':
          servicePlanPrice = parseFloat(field.value) || 0;
          break;
        case 'service_plan_name':
          servicePlanName = field.value;
          break;
      }
    }
  }

  // Also check direct metadata properties
  username = username || (typeof metadata.username === 'string' ? metadata.username : '');
  customerEmail = customerEmail || (typeof metadata.email === 'string' ? metadata.email : '');
  srvid = srvid || (typeof metadata.srvid === 'string' ? metadata.srvid : '');
  timeunitexp = timeunitexp || (typeof metadata.timeunitexp === 'number' ? metadata.timeunitexp : 30);
  trafficunitcomb = trafficunitcomb || (typeof metadata.trafficunitcomb === 'number' ? metadata.trafficunitcomb : 0);
  limitcomb = limitcomb || (typeof metadata.limitcomb === 'number' ? metadata.limitcomb : 0);
  purpose = purpose || (typeof metadata.purpose === 'string' ? metadata.purpose : '');
  locationId = locationId || (typeof metadata.location_id === 'string' ? metadata.location_id : '');

  // Detect combined payment
  isCombinedPayment = purpose === 'Combined Account Creation & Service Plan' && 
                     accountCreationFee > 0 && 
                     servicePlanPrice > 0 && 
                     !!srvid && 
                     !!servicePlanName;

  console.log('Metadata extraction results:', {
    username,
    customerEmail,
    srvid,
    purpose,
    locationId,
    accountCreationFee,
    servicePlanPrice,
    servicePlanName,
    isCombinedPayment,
    timeunitexp,
    trafficunitcomb,
    limitcomb
  });

  return {
    username,
    customerEmail,
    srvid,
    timeunitexp,
    trafficunitcomb,
    limitcomb,
    purpose,
    locationId,
    // NEW: Combined payment detection results
    isCombinedPayment,
    accountCreationFee,
    servicePlanPrice,
    servicePlanName,
    paymentBreakdown: isCombinedPayment ? {
      accountCreation: {
        amount: accountCreationFee,
        type: 'account_creation'
      },
      servicePlan: {
        amount: servicePlanPrice,
        type: 'renewal',
        planId: srvid,
        planName: servicePlanName,
        duration: timeunitexp
      }
    } : null
  };
}

// NEW: Handle account creation payments
async function handleAccountCreationPayment(event: PaystackWebhookEvent, locationId: string) {
  try {
    const { reference } = event.data;
    const paymentAmount = event.data.amount / 100; // Convert from kobo to naira

    // Get customer information from metadata
    const metadata = event.data.metadata;
    let customerPhone = '';
    
    if (metadata.custom_fields && Array.isArray(metadata.custom_fields)) {
      for (const field of metadata.custom_fields) {
        if (field.variable_name === 'phone') {
          customerPhone = field.value;
        }
      }
    }

    // Get location data for commission calculation
    let locationData = null;
    if (locationId) {
      try {
        locationData = await getLocationWithOwner(locationId);
      } catch (error) {
        console.error('Error fetching location data for account creation:', error);
      }
    }

    // Create transaction record for account creation
    try {
      const commissionRate = locationData?.owner?.commission_rate || 10.00;
      const transactionData = {
        username: customerPhone || 'Unknown', // Use phone as username
        service_plan_id: 0, // Account creation doesn't have service plan
        service_plan_name: 'Account Creation',
        amount_paid: paymentAmount,
        commission_rate: commissionRate,
        commission_amount: (paymentAmount * commissionRate) / 100,
        paystack_reference: reference,
        payment_status: 'success' as const,
        renewal_period_days: 0, // Account creation doesn't add days
        renewal_start_date: new Date().toISOString(),
        renewal_end_date: new Date().toISOString(),
        customer_location: locationData?.city || '',
        transaction_type: 'account_creation' as const,
        account_owner_id: locationData?.default_owner_id
      };

      await createRenewalTransaction(transactionData);
      console.log('Account creation transaction recorded:', reference);

      return NextResponse.json({
        success: true,
        message: 'Account creation payment processed successfully',
        reference: reference
      });

    } catch (transactionError) {
      console.error('Error recording account creation transaction:', transactionError);
      return NextResponse.json({
        success: false,
        error: 'Failed to record transaction'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error processing account creation payment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process account creation payment'
    }, { status: 500 });
  }
}

// NEW: Handle combined account creation and service plan payments (SIMPLIFIED)
// 🔧 [DOUBLE CREDIT FIX] This function has been updated to prevent double crediting:
// 
// BEFORE FIX:
// 1. createRadiusUser() set initial expiry: TODAY + timeunitexp (e.g., +30 days)
// 2. addCreditsToUser() added more time: EXISTING_EXPIRY + timeunitexp (e.g., +30 more days) 
// 3. RESULT: 60 days instead of 30 days (double crediting)
//
// AFTER FIX:
// 1. createRadiusUser() sets minimal expiry: TODAY + 1 hour (for combined payments only)
// 2. addCreditsToUser() adds full service time: MINIMAL_EXPIRY + timeunitexp (e.g., +30 days)
// 3. RESULT: 30 days as expected (correct crediting)
//
// This fix ONLY affects combined payments. Regular renewals are unchanged and continue to work correctly.
async function handleCombinedPayment(event: PaystackWebhookEvent, paymentDetails: {
  accountCreationFee: number;
  servicePlanPrice: number;
  servicePlanName: string;
  locationId: string;
  username: string;
  customerEmail: string;
  srvid: string;
  timeunitexp: number;
  trafficunitcomb: number;
  limitcomb: number;
}) {
  try {
    const { reference } = event.data;
    const paymentAmount = event.data.amount / 100; // Convert from kobo to naira

    // Get customer information from metadata
    const metadata = event.data.metadata;
    let customerPhone = '';
    
    if (metadata.custom_fields && Array.isArray(metadata.custom_fields)) {
      for (const field of metadata.custom_fields) {
        if (field.variable_name === 'phone') {
          customerPhone = field.value;
        }
      }
    }

    // Get location data for commission calculation
    let locationData = null;
    if (paymentDetails.locationId) {
      try {
        locationData = await getLocationWithOwner(paymentDetails.locationId);
      } catch (error) {
        console.error('Error fetching location data for combined payment:', error);
      }
    }

    // SIMPLIFIED: Create single transaction for the total combined amount
    try {
      const commissionRate = locationData?.owner?.commission_rate || 10.00;
      
      const combinedTransactionData = {
        username: customerPhone || paymentDetails.username,
        service_plan_id: parseInt(paymentDetails.srvid) || 0,
        service_plan_name: `${paymentDetails.servicePlanName} + Account Setup`,
        amount_paid: paymentAmount, // Total combined amount
        commission_rate: commissionRate,
        commission_amount: (paymentAmount * commissionRate) / 100,
        paystack_reference: reference,
        payment_status: 'success' as const,
        renewal_period_days: paymentDetails.timeunitexp,
        renewal_start_date: new Date().toISOString(),
        renewal_end_date: new Date(Date.now() + paymentDetails.timeunitexp * 24 * 60 * 60 * 1000).toISOString(),
        customer_location: locationData?.city || '',
        transaction_type: 'renewal' as const, // Treat as renewal since we're applying service plan
        account_owner_id: locationData?.default_owner_id
      };

      const transactionResult = await createRenewalTransaction(combinedTransactionData);

      console.log('Combined payment transaction recorded:', {
        reference,
        transactionId: transactionResult?.id,
        totalAmount: paymentAmount,
        servicePlanName: paymentDetails.servicePlanName,
        accountSetupIncluded: true
      });

      // Apply service credits to the account (This is the main goal)
      // STEP 1: Check if user already exists in RADIUS
      console.log('Checking if RADIUS user already exists:', paymentDetails.username);
      const userExists = await checkRadiusUserExists(paymentDetails.username);
      
      // Initialize variables that might be needed later
      const password = Math.floor(1000 + Math.random() * 9000).toString();
      let firstname = 'User';
      let lastname = 'Account';
      
      // 🔧 [FIX] Declare currentUserExpiry outside conditional blocks for scope
      let currentUserExpiry: string | undefined;
      
      if (userExists) {
        console.log('RADIUS user already exists, skipping user creation and proceeding to credit application');
      } else {
        // STEP 1A: Create the user in RADIUS first (with metadata from payment)
        let customerName = '';
        const customerAddress = '';
        const customerCity = '';
        const customerState = '';
        
        // Extract customer details from metadata
        if (metadata.custom_fields && Array.isArray(metadata.custom_fields)) {
          for (const field of metadata.custom_fields) {
            if (field.variable_name === 'customer_name') {
              customerName = field.value;
            }
          }
        }
        
        // Parse customer name
        const nameParts = customerName.split(' ');
        firstname = nameParts[0] || 'User';
        lastname = nameParts.slice(1).join(' ') || 'Account';
        
        console.log('Creating RADIUS user for combined payment:', {
          username: paymentDetails.username,
          firstname,
          lastname,
          srvid: paymentDetails.srvid,
          timeunitexp: paymentDetails.timeunitexp,
          email: paymentDetails.customerEmail
        });
        
        const userCreationResult = await createRadiusUser({
          username: paymentDetails.username,
          password: password,
          firstname: firstname,
          lastname: lastname,
          email: paymentDetails.customerEmail,
          phone: paymentDetails.username,
          address: customerAddress,
          city: customerCity,
          state: customerState,
          srvid: paymentDetails.srvid,
          timeunitexp: paymentDetails.timeunitexp, // Pass the timeunitexp
          locationData: locationData ? {
            group_id: locationData.group_id,
            owner: locationData.owner ? {
              owner_username: locationData.owner.owner_username
            } : undefined
          } : undefined,
          isFromCombinedPayment: true // Indicate this is a combined payment
        });
        
        if (!userCreationResult.success) {
          console.error('Failed to create RADIUS user for combined payment:', userCreationResult.message);
          return NextResponse.json({
            success: false,
            error: 'Failed to create user account',
            details: userCreationResult.message
          }, { status: 500 });
        }
        
        console.log('RADIUS user created successfully, now adding service credits...');
        
        // Record the customer in our local database if location data is available
        if (locationData) {
          try {
            await createHotspotCustomer({
              username: paymentDetails.username,
              first_name: firstname,
              last_name: lastname,
              email: paymentDetails.customerEmail,
              phone: paymentDetails.username,
              address: customerAddress || '',
              city: customerCity || '',
              state: customerState || '',
              wifi_password: password,
              location_id: paymentDetails.locationId,
              account_owner_id: locationData.default_owner_id || '',
              last_service_plan_id: parseInt(paymentDetails.srvid),
              last_service_plan_name: paymentDetails.servicePlanName
            });

            console.log('Customer record created successfully for combined payment');
          } catch (error) {
            console.error('Failed to create customer record for combined payment:', error);
            // Continue processing - user exists in RADIUS
          }
        }
      }
      
      // 🔧 [FIX] Get current user expiry AFTER user creation (or for existing user) but BEFORE adding credits
      // This ensures we start from the correct current expiry to prevent double crediting
      try {
        const userUrl = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${RADIUS_API_CONFIG.apiuser}&apipass=${RADIUS_API_CONFIG.apipass}&q=get_userdata&username=${encodeURIComponent(paymentDetails.username)}`;
        const userResponse = await fetch(userUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'PHSWEB-NextJS-App/1.0',
          },
        });

        if (userResponse.ok) {
          const userResult = await userResponse.text();
          const userData = JSON.parse(userResult);
          
          // Parse RADIUS response to get current expiry
          if (typeof userData === 'object' && userData !== null) {
            const resultCode = userData["0"];
            if (resultCode === 0 && userData.expiry) {
              currentUserExpiry = userData.expiry;
              console.log('🔧 [FIX] Current user expiry before adding credits:', currentUserExpiry);
            }
          }
        }
      } catch (userError) {
        console.error('Error fetching user data before adding credits:', userError);
        // Continue without current expiry - addCreditsToUser will add from today
      }

      const trafficToAdd = paymentDetails.limitcomb === 0 ? 0 : paymentDetails.trafficunitcomb * 1048576; // Convert MB to bytes
      
      console.log('🔧 [FIX] About to call addCreditsToUser with current expiry:', {
        username: paymentDetails.username,
        timeunitexp_from_paymentDetails: paymentDetails.timeunitexp,
        timeunitexp_type: typeof paymentDetails.timeunitexp,
        trafficToAdd,
        currentUserExpiry: currentUserExpiry
      });
      
      const creditsResult = await addCreditsToUser(
        paymentDetails.username, 
        paymentDetails.timeunitexp, 
        trafficToAdd,
        currentUserExpiry // Pass the current expiry to prevent double crediting
      );

      if (creditsResult.success) {
        console.log('Service credits applied successfully for combined payment:', {
          username: paymentDetails.username,
          daysAdded: paymentDetails.timeunitexp,
          trafficAdded: trafficToAdd,
          newExpiry: creditsResult.newExpiry,
          totalAmountPaid: paymentAmount
        });

        // Update transaction with actual expiry from RADIUS
        if (creditsResult.newExpiry && transactionResult) {
          try {
            const { error: updateError } = await supabaseAdmin
              .from('renewal_transactions')
              .update({ 
                renewal_end_date: creditsResult.newExpiry 
              })
              .eq('id', transactionResult.id);

            if (updateError) {
              console.error('Error updating transaction expiry:', updateError);
            } else {
              console.log('Transaction updated with actual expiry:', creditsResult.newExpiry);
            }
          } catch (updateError) {
            console.error('Exception updating transaction expiry:', updateError);
          }
        }
      } else {
        console.error('Failed to apply service credits for combined payment:', {
          username: paymentDetails.username,
          error: 'RADIUS credit application failed'
        });
        
        // Even if credit application fails, we still return success for payment processing
        console.warn('Combined payment processed but manual credit application may be required');
      }

      return NextResponse.json({
        success: true,
        message: 'Combined payment processed successfully',
        reference: reference,
        transaction: {
          id: transactionResult?.id,
          amount: paymentAmount,
          servicePlan: paymentDetails.servicePlanName
        },
        user: {
          username: paymentDetails.username,
          password: password,
          servicePlan: paymentDetails.servicePlanName,
          daysAdded: paymentDetails.timeunitexp,
          newExpiry: creditsResult.newExpiry
        }
      });

    } catch (transactionError) {
      console.error('Error recording combined payment transaction:', transactionError);
      return NextResponse.json({
        success: false,
        error: 'Failed to record transaction'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error processing combined payment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process combined payment'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      console.error('Missing Paystack signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify signature
    if (!verifyPaystackSignature(body, signature)) {
      console.error('Invalid Paystack signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Parse the webhook event
    const event: PaystackWebhookEvent = JSON.parse(body);
    
    // Handle double-encoded metadata from Paystack
    // Paystack sometimes sends metadata as a JSON string instead of an object
    if (typeof event.data.metadata === 'string') {
      try {
        event.data.metadata = JSON.parse(event.data.metadata);
        console.log('Parsed double-encoded metadata from Paystack');
      } catch (parseError) {
        console.error('Failed to parse metadata string:', parseError);
        // Continue with string metadata - extractPaymentMetadata will handle it
      }
    }
    
    console.log('Received Paystack webhook event:', event.event, 'Reference:', event.data.reference);

    // Handle successful charge event
    if (event.event === 'charge.success') {
      const { reference } = event.data;
      
      // Check if this transaction has already been processed (idempotency check)
      const existingTransaction = await checkExistingTransaction(reference);
      if (existingTransaction) {
        console.log('Transaction already processed:', reference);
        return NextResponse.json({ message: 'Already processed' }, { status: 200 });
      }

      // Extract payment metadata
      const { username, srvid, timeunitexp, trafficunitcomb, limitcomb, purpose, locationId, isCombinedPayment, accountCreationFee, servicePlanPrice, servicePlanName, customerEmail } = extractPaymentMetadata(event);

      // Enhanced logging for payment type classification
      console.log('Payment metadata extracted:', {
        reference,
        purpose,
        isCombinedPayment,
        accountCreationFee: isCombinedPayment ? accountCreationFee : 'N/A',
        servicePlanPrice: isCombinedPayment ? servicePlanPrice : 'N/A',
        servicePlanName: isCombinedPayment ? servicePlanName : 'N/A',
        paymentType: isCombinedPayment ? 'COMBINED' : (purpose === 'Account Creation' ? 'ACCOUNT_CREATION_ONLY' : 'RENEWAL_ONLY')
      });

      // Route to appropriate handler based on payment type
      if (isCombinedPayment) {
        console.log('Processing combined payment (account creation + service plan):', reference);
        return await handleCombinedPayment(event, {
          accountCreationFee,
          servicePlanPrice,
          servicePlanName,
          locationId,
          username,
          customerEmail,
          srvid,
          timeunitexp,
          trafficunitcomb,
          limitcomb
        });
      } else if (purpose === 'Account Creation') {
        console.log('Processing account creation only payment:', reference);
        return await handleAccountCreationPayment(event, locationId);
      }

      // Original renewal payment processing
      if (!username || !srvid) {
        console.error('Missing required metadata for renewal payment:', { username, srvid });
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      try {
        // Get current user data to determine existing expiry
        let currentExpiry: string | undefined;
        
        try {
          const userUrl = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${RADIUS_API_CONFIG.apiuser}&apipass=${RADIUS_API_CONFIG.apipass}&q=get_userdata&username=${encodeURIComponent(username)}`;
          const userResponse = await fetch(userUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'PHSWEB-NextJS-App/1.0',
            },
          });

          if (userResponse.ok) {
            const userResult = await userResponse.text();
            const userData = JSON.parse(userResult);
            
            // Parse RADIUS response to get current expiry
            if (typeof userData === 'object' && userData !== null) {
              const resultCode = userData["0"];
              if (resultCode === 0 && userData.expiry) {
                currentExpiry = userData.expiry;
                console.log('Current user expiry from RADIUS:', currentExpiry);
              }
            }
          }
        } catch (userError) {
          console.error('Error fetching user data for expiry:', userError);
          // Continue without current expiry - will default to adding from now
        }

        // Create a preliminary transaction record to prevent race conditions
        // This will fail if the main API already created one
        try {
          const paymentAmount = event.data.amount / 100; // Convert from kobo to naira
          
          const preliminaryTransaction = {
            username: username,
            service_plan_id: parseInt(srvid) || 0,
            service_plan_name: `Service Plan ${srvid}`,
            amount_paid: paymentAmount,
            commission_rate: 0, // Will be updated later
            commission_amount: 0, // Will be updated later
            paystack_reference: event.data.reference,
            payment_status: 'processing' as const, // Mark as processing initially
            renewal_period_days: timeunitexp,
            renewal_start_date: new Date().toISOString(),
            renewal_end_date: new Date(Date.now() + timeunitexp * 24 * 60 * 60 * 1000).toISOString(),
            customer_location: '',
            transaction_type: 'renewal' as const, // Add missing transaction_type
          };

          const preliminaryRecord = await createRenewalTransaction(preliminaryTransaction);
          if (!preliminaryRecord) {
            console.log('Failed to create preliminary transaction record - likely already processed');
            return NextResponse.json({ message: 'Already processed' }, { status: 200 });
          }
          console.log('Created preliminary transaction record:', preliminaryRecord.id);
        } catch (transactionError: any) {
          // Better error handling: differentiate between duplicate transaction and other errors
          const errorCode = transactionError?.code;
          const errorMessage = transactionError?.message || '';
          
          // Check if it's a duplicate key violation (23505 = unique_violation)
          if (errorCode === '23505' || errorMessage.includes('duplicate key') || errorMessage.includes('paystack_reference_key')) {
            console.log('Transaction already exists (duplicate key prevented):', transactionError);
            return NextResponse.json({ message: 'Already processed' }, { status: 200 });
          }
          
          // For other errors (schema issues, connection problems, etc.), log and return error
          console.error('Error creating preliminary transaction record:', {
            code: errorCode,
            message: errorMessage,
            error: transactionError
          });
          
          // Return 500 so Paystack will retry the webhook
          return NextResponse.json({ 
            error: 'Failed to process transaction',
            message: 'Database error occurred. Please contact support if issue persists.'
          }, { status: 500 });
        }

        // Add credits to user account
        const trafficToAdd = limitcomb === 0 ? 0 : trafficunitcomb * 1048576; // Convert MB to bytes
        const creditsResult = await addCreditsToUser(username, timeunitexp, trafficToAdd, currentExpiry);

        if (!creditsResult.success) {
          console.error('Failed to add credits for:', username);
          return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
        }

        console.log('Credits added successfully via webhook for:', username);

        // Record transaction for commission tracking
        await recordTransaction(event, creditsResult.newExpiry);

        return NextResponse.json({ 
          message: 'Webhook processed successfully',
          reference: reference,
          username: username
        }, { status: 200 });

      } catch (error) {
        console.error('Error processing webhook:', error);
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
      }
    }

    // Handle other events (optional)
    console.log('Unhandled webhook event:', event.event);
    return NextResponse.json({ message: 'Event noted' }, { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Check if transaction already exists (for idempotency)
async function checkExistingTransaction(reference: string): Promise<boolean> {
  try {
    // Check if transaction already exists in database
    const { data: existingTransactions } = await supabaseAdmin
      .from('renewal_transactions')
      .select('id, paystack_reference')
      .eq('paystack_reference', reference)
      .limit(1);

    if (existingTransactions && existingTransactions.length > 0) {
      console.log('Transaction already exists in database:', reference);
      return true;
    }

    console.log('No existing transaction found for reference:', reference);
    return false;
  } catch (error) {
    console.error('Error checking existing transaction:', error);
    // If we can't check, assume it doesn't exist to avoid blocking legitimate payments
    return false;
  }
}

// Check if user exists in RADIUS Manager
async function checkRadiusUserExists(username: string): Promise<boolean> {
  try {
    const userUrl = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${RADIUS_API_CONFIG.apiuser}&apipass=${RADIUS_API_CONFIG.apipass}&q=get_userdata&username=${encodeURIComponent(username)}`;
    const userResponse = await fetch(userUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'PHSWEB-NextJS-App/1.0',
      },
    });

    if (userResponse.ok) {
      const userResult = await userResponse.text();
      const userData = JSON.parse(userResult);
      
      // Parse RADIUS response to check if user exists
      if (Array.isArray(userData) && userData.length >= 2) {
        const resultCode = userData[0];
        return resultCode === 0; // 0 means user found, 1 means user not found
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false; // Assume user doesn't exist if check fails
  }
}

// Record transaction in database
async function recordTransaction(event: PaystackWebhookEvent, newExpiry?: string) {
  try {
    const { username, srvid, timeunitexp } = extractPaymentMetadata(event);
    const paymentAmount = event.data.amount / 100; // Convert from kobo to naira

    // Get service plan details to get the actual service plan name
    let servicePlanName = `Service Plan ${srvid}`;
    try {
      const serviceUrl = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${RADIUS_API_CONFIG.apiuser}&apipass=${RADIUS_API_CONFIG.apipass}&q=get_srv&srvid=${srvid}`;
      const serviceResponse = await fetch(serviceUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'PHSWEB-NextJS-App/1.0',
        },
      });

      if (serviceResponse.ok) {
        const serviceResult = await serviceResponse.text();
        const serviceData = JSON.parse(serviceResult);
        
        // Parse service plan response: [0, [{"srvid":"78","srvname":"test-unlimited-25K",...}]]
        if (Array.isArray(serviceData) && serviceData.length >= 2) {
          const resultCode = serviceData[0];
          const serviceDataArray = serviceData[1];
          
          if (resultCode === 0 && Array.isArray(serviceDataArray) && serviceDataArray.length > 0) {
            const servicePlan = serviceDataArray[0];
            servicePlanName = servicePlan.srvname || `Service Plan ${srvid}`;
            console.log(`Service plan name: ${servicePlanName}`);
          }
        }
      }
    } catch (serviceError) {
      console.error('Error fetching service plan details:', serviceError);
      servicePlanName = `Service Plan ${srvid}`; // Fallback
    }

    // Get user data from RADIUS API to extract owner information and customer details
    let radiusOwner = '';
    let customerData: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
    } = {};
    
    try {
      const radiusUrl = `${RADIUS_API_CONFIG.baseUrl}?apiuser=${RADIUS_API_CONFIG.apiuser}&apipass=${RADIUS_API_CONFIG.apipass}&q=get_userdata&username=${encodeURIComponent(username)}`;
      const radiusResponse = await fetch(radiusUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'PHSWEB-NextJS-App/1.0',
        },
      });

      if (radiusResponse.ok) {
        const radiusResult = await radiusResponse.text();
        const radiusData = JSON.parse(radiusResult);
        
        // Parse RADIUS response (same format as in user API)
        if (typeof radiusData === 'object' && radiusData !== null) {
          const resultCode = radiusData["0"];
          const userData = radiusData["1"];
          
          if (resultCode === 0 && userData) {
            radiusOwner = userData.owner || '';
            customerData = {
              first_name: userData.firstname || '',
              last_name: userData.lastname || '',
              email: userData.email || '',
              phone: userData.phone || userData.mobile || '',
              address: userData.address || '',
              city: userData.city || '',
              state: userData.state || '',
              country: userData.country || '',
            };
            
            console.log(`Customer ${username} has owner: ${radiusOwner}`);
          }
        }
      }
    } catch (radiusError) {
      console.error('Error fetching RADIUS user data:', radiusError);
      // Continue without owner assignment if RADIUS fails
    }

    // Get or create customer with enhanced data
    let customer = await getCustomerByUsername(username);
    
    if (customer) {
      // Update existing customer with latest data from RADIUS
      const updateData: {
        username: string;
        last_renewal_date: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        account_owner_id?: string;
      } = {
        ...customerData,
        username: username,
        last_renewal_date: new Date().toISOString(),
      };
      
      // If customer doesn't have an owner but RADIUS has one, assign it
      if (!customer.account_owner_id && radiusOwner) {
        const owner = await getAccountOwnerByUsername(radiusOwner);
        if (owner) {
          updateData.account_owner_id = owner.id;
          console.log(`Assigning customer ${username} to owner ${owner.name} (${radiusOwner})`);
        }
      }
      
      const updatedCustomer = await createOrUpdateCustomer(updateData);
      if (updatedCustomer) {
        customer = updatedCustomer;
      }
    } else {
      // Create new customer record
      console.log('Customer not found in database - creating new record');
      
      const newCustomerData: {
        username: string;
        last_renewal_date: string;
        first_name?: string;
        last_name?: string;
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        account_owner_id?: string;
      } = {
        username: username,
        ...customerData,
        last_renewal_date: new Date().toISOString(),
      };
      
      // Assign owner if found in RADIUS
      if (radiusOwner) {
        const owner = await getAccountOwnerByUsername(radiusOwner);
        if (owner) {
          newCustomerData.account_owner_id = owner.id;
          console.log(`Creating customer ${username} with owner ${owner.name} (${radiusOwner})`);
        } else {
          console.log(`Warning: Owner '${radiusOwner}' from RADIUS not found in database`);
        }
      }
      
      const newCustomer = await createOrUpdateCustomer(newCustomerData);
      if (newCustomer) {
        customer = newCustomer;
      }
    }

    // Get account owner for commission calculation
    let accountOwner = null;
    let commissionAmount = 0;
    
    if (customer?.account_owner_id) {
      try {
        const { getAccountOwner, calculateCommission } = await import('@/lib/database');
        accountOwner = await getAccountOwner(customer.account_owner_id);
        if (accountOwner && paymentAmount > 0) {
          commissionAmount = calculateCommission(paymentAmount, accountOwner.commission_rate);
          console.log(`Commission calculated: ${commissionAmount} (${accountOwner.commission_rate}% of ${paymentAmount}) for owner: ${accountOwner.name}`);
        }
      } catch (commissionError) {
        console.error('Error fetching account owner by username:', commissionError);
        // Fallback to simple 10% calculation
        commissionAmount = paymentAmount * 0.1;
      }
    } else {
      console.log('No owner assigned to customer - no commission will be tracked');
    }

    // Update the existing preliminary transaction record
    const updateData = {
      customer_id: customer?.id,
      account_owner_id: customer?.account_owner_id,
      service_plan_name: servicePlanName, // Use actual service plan name
      commission_rate: accountOwner ? accountOwner.commission_rate : 0,
      commission_amount: commissionAmount,
      payment_status: 'success' as const, // Update from 'processing' to 'success'
      renewal_end_date: newExpiry || new Date(Date.now() + timeunitexp * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Update the existing transaction
    const { data: updatedTransaction } = await supabaseAdmin
      .from('renewal_transactions')
      .update(updateData)
      .eq('paystack_reference', event.data.reference)
      .select('id')
      .single();

    console.log('Transaction updated via webhook:', updatedTransaction?.id);

  } catch (error) {
    console.error('Error updating transaction via webhook:', error);
    // Don't throw - we don't want to fail the webhook for database issues
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}