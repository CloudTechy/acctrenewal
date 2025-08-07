import { NextRequest, NextResponse } from 'next/server';
import { getLocationWithOwner, createHotspotCustomer, getAccountCreationPricingConfig } from '@/lib/database';
import { calculateServiceExpiry, calculateTrialExpiry } from '@/lib/date-utils';
import { generateHotspotPassword } from '@/lib/password-utils';
import { supabaseAdmin } from '@/lib/supabase';

// Enhanced payment verification function for combined payments
async function verifyAccountCreationPayment(reference: string): Promise<{
  success: boolean; 
  error?: string;
  servicePlanDetails?: {
    srvid: number;
    srvname: string;
    timeunitexp: number;
    trafficunitcomb: number;
    limitcomb: number;
  };
}> {
  try {
    // Check if successful transaction exists for this reference
    const { data: transactions, error } = await supabaseAdmin
      .from('renewal_transactions')
      .select('*')
      .eq('paystack_reference', reference)
      .eq('payment_status', 'success')
      .order('created_at', { ascending: false });

    if (error || !transactions || transactions.length === 0) {
      return { 
        success: false, 
        error: 'No valid payment found for this reference' 
      };
    }

    // Check for account creation transaction
    const accountCreationTransaction = transactions.find(t => t.transaction_type === 'account_creation');
    if (!accountCreationTransaction) {
      return { 
        success: false, 
        error: 'Account creation payment not found' 
      };
    }

    // Check for service plan transaction (combined payment)
    const servicePlanTransaction = transactions.find(t => 
      t.transaction_type === 'renewal' && t.service_plan_id > 0
    );

    if (servicePlanTransaction) {
      // Combined payment - return service plan details
      return { 
        success: true,
        servicePlanDetails: {
          srvid: servicePlanTransaction.service_plan_id || 0,
          srvname: servicePlanTransaction.service_plan_name || 'Unknown Plan',
          timeunitexp: servicePlanTransaction.renewal_period_days || 0,
          trafficunitcomb: 0, // Will be fetched from RADIUS if needed
          limitcomb: 0 // Will be fetched from RADIUS if needed
        }
      };
    }

    // Account creation only payment
    return { success: true };
  } catch (error) {
    console.error('Error verifying account creation payment:', error);
    return { success: false, error: 'Database error during payment verification' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();

    const {
      username,
      password,
      firstname,
      lastname,
      email,
      address,
      city,
      state,
      phone,
      srvid,
      enabled = 1,
      acctype = 0,
      locationId, // New: location context
      paymentReference // New: payment reference for paid accounts
    } = userData;

    // Validate required fields
    if (!username || !password || !firstname || !lastname || !email || !srvid) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      );
    }

    // Fetch location details if locationId is provided
    let locationData = null;
    let pricingConfig = null;
    let paymentServicePlanDetails = null; // Store service plan details from payment verification
    
    if (locationId) {
      try {
        // Get both location data and pricing configuration
        [locationData, pricingConfig] = await Promise.all([
          getLocationWithOwner(locationId),
          getAccountCreationPricingConfig(locationId)
        ]);
        
        if (!locationData) {
          return NextResponse.json(
            { error: 'Location not found' },
            { status: 400 }
          );
        }
        
        // Check if registration is enabled for this location
        if (!locationData.registration_enabled) {
          return NextResponse.json(
            { error: 'Registration is disabled for this location' },
            { status: 400 }
          );
        }

        // Check if account creation pricing is enabled
        if (pricingConfig.enabled) {
          // NEW: Get the selected service plan to check if it's free
          let selectedServicePlan = null;
          if (srvid) {
            try {
              // Use the correct RADIUS API format instead of the wrong endpoint
              const radiusBaseUrl = process.env.RADIUS_API_URL?.replace('/api/sysapi.php', '') || '';
              const servicePlanUrl = `${radiusBaseUrl}/api/sysapi.php?apiuser=${process.env.RADIUS_API_USER}&apipass=${process.env.RADIUS_API_PASS}&q=get_srv&srvid=${srvid}`;
              
              console.log('Fetching service plan for payment validation:', servicePlanUrl.replace(process.env.RADIUS_API_PASS || '', '***'));
              
              const servicePlanResponse = await fetch(servicePlanUrl);
              
              if (servicePlanResponse.ok) {
                const servicePlanData = await servicePlanResponse.json();
                console.log('Service plan response for payment validation:', servicePlanData);
                
                // Parse RADIUS response format: [0, [{plan_data}]]
                if (Array.isArray(servicePlanData) && servicePlanData.length >= 2) {
                  const resultCode = servicePlanData[0];
                  const serviceDataArray = servicePlanData[1];
                  
                  if (resultCode === 0 && Array.isArray(serviceDataArray) && serviceDataArray.length > 0) {
                    selectedServicePlan = serviceDataArray[0];
                    console.log('Parsed service plan for validation:', {
                      srvid: selectedServicePlan.srvid,
                      srvname: selectedServicePlan.srvname,
                      unitprice: selectedServicePlan.unitprice,
                      unitpriceadd: selectedServicePlan.unitpriceadd,
                      unitpricetax: selectedServicePlan.unitpricetax,
                      unitpriceaddtax: selectedServicePlan.unitpriceaddtax
                    });
                  }
                }
              }
            } catch (error) {
              console.warn('Could not fetch service plan details for payment validation:', error);
            }
          }
          
          // Calculate the total service plan price
          const servicePlanPrice = selectedServicePlan ? 
            parseFloat(selectedServicePlan.unitprice || '0') + 
            parseFloat(selectedServicePlan.unitpriceadd || '0') + 
            parseFloat(selectedServicePlan.unitpricetax || '0') + 
            parseFloat(selectedServicePlan.unitpriceaddtax || '0') : 0;
          
          console.log('Service plan price calculation:', {
            selectedServicePlan: !!selectedServicePlan,
            unitprice: selectedServicePlan?.unitprice,
            unitpriceadd: selectedServicePlan?.unitpriceadd,
            unitpricetax: selectedServicePlan?.unitpricetax,
            unitpriceaddtax: selectedServicePlan?.unitpriceaddtax,
            totalPrice: servicePlanPrice
          });
          
          // Only require payment if the service plan has a cost (not free)
          const requiresPayment = servicePlanPrice > 0;
          
          console.log('Payment requirement decision:', {
            servicePlanPrice,
            requiresPayment,
            pricingEnabled: pricingConfig.enabled
          });
          
          if (requiresPayment) {
            if (!paymentReference) {
              return NextResponse.json(
                {
                  error: 'Payment required for account creation with paid service plan',
                  requiresPayment: true,
                  pricingConfig: {
                    price: pricingConfig.price,
                    description: pricingConfig.description,
                    servicePlanPrice: servicePlanPrice,
                    totalAmount: pricingConfig.price + servicePlanPrice
                  }
                },
                { status: 402 } // Payment Required
              );
            }
            
            try {
              const paymentVerification = await verifyAccountCreationPayment(paymentReference);
              if (!paymentVerification.success) {
                return NextResponse.json(
                  {
                    error: 'Payment verification failed. Please complete payment before creating account.',
                    requiresPayment: true,
                    paymentError: paymentVerification.error
                  },
                  { status: 402 }
                );
              }
              if (paymentVerification.servicePlanDetails) {
                paymentServicePlanDetails = paymentVerification.servicePlanDetails;
                if (srvid && paymentServicePlanDetails.srvid.toString() !== srvid) {
                  return NextResponse.json(
                    {
                      error: 'Service plan mismatch. The service plan you paid for does not match the requested plan.',
                      requiresPayment: true,
                      paidServicePlan: {
                        id: paymentServicePlanDetails.srvid,
                        name: paymentServicePlanDetails.srvname
                      }
                    },
                    { status: 400 }
                  );
                }
              }
            } catch (paymentError) {
              console.error('Error verifying account creation payment:', paymentError);
              return NextResponse.json(
                {
                  error: 'Unable to verify payment. Please try again.',
                  requiresPayment: true,
                  details: paymentError instanceof Error ? paymentError.message : 'Unknown payment verification error'
                },
                { status: 500 }
              );
            }
          } else {
            // Free service plan - no payment required, log this for transparency
            console.log(`Account creation for free service plan (${srvid}) - no payment required`);
          }
        }

      } catch (error) {
        console.error('Error fetching location data:', error);
        return NextResponse.json(
          { error: 'Failed to fetch location information' },
          { status: 500 }
        );
      }
    }

    // Fetch service plan details for expiry calculation
    let servicePlan = null;
    try {
      const servicePlansResponse = await fetch(`${process.env.RADIUS_API_URL}?apiuser=${process.env.RADIUS_API_USER}&apipass=${process.env.RADIUS_API_PASS}&q=get_srv&srvid=${srvid}`);
      const servicePlansData = await servicePlansResponse.json();
      
      if (servicePlansData && servicePlansData.length > 0) {
        servicePlan = servicePlansData[0];
      }
    } catch (error) {
      console.error('Error fetching service plan:', error);
    }

    const apiUser = process.env.RADIUS_API_USER;
    const apiPass = process.env.RADIUS_API_PASS;
    const baseUrl = process.env.RADIUS_API_URL;

    if (!apiUser || !apiPass || !baseUrl) {
      return NextResponse.json(
        { error: 'Radius Manager configuration missing' },
        { status: 500 }
      );
    }

    // Extract base URL without the specific endpoint
    const radiusBaseUrl = baseUrl.replace('/api/sysapi.php', '');

    // Calculate expiry date - prioritize service plan from payment verification for combined payments
    let expiryDate;
    
    if (paymentServicePlanDetails && paymentServicePlanDetails.timeunitexp > 0) {
      // Combined payment with service plan - use the paid service plan duration
      expiryDate = calculateServiceExpiry(null, paymentServicePlanDetails.timeunitexp);
      console.log(`Using paid service plan expiry: ${paymentServicePlanDetails.timeunitexp} days`);
    } else if (servicePlan && servicePlan.timeunitexp !== undefined) {
      // Regular service plan (no payment or account creation only payment)
      const planDays = parseInt(servicePlan.timeunitexp);
      if (!isNaN(planDays) && planDays >= 0) {
        // Use service plan duration (including 0 for data-only plans)
        expiryDate = calculateServiceExpiry(null, planDays);
      } else {
        // Invalid service plan duration - use trial expiry
        expiryDate = calculateTrialExpiry();
      }
    } else {
      // No service plan or undefined duration - use trial expiry (00:00:00 of current day)
      expiryDate = calculateTrialExpiry();
    }

    // Use provided password or generate 4-digit if not provided
    const finalPassword = password || generateHotspotPassword();

    // Construct the API URL for creating new user with all required parameters
    const params = new URLSearchParams({
      apiuser: apiUser,
      apipass: apiPass,
      q: 'new_user',
      username,
      password: finalPassword,
      enabled: enabled.toString(),
      acctype: acctype.toString(),
      srvid,
      firstname,
      lastname,
      email,
      phone: phone || username,
      ...(address && { address }),
      ...(city && { city }),
      ...(state && { state }),
      ...(expiryDate && { expiry: expiryDate }), // Add expiry date
      ...(locationData?.group_id && { groupid: locationData.group_id.toString() }), // Add group ID
      ...(locationData?.owner?.owner_username && { owner: locationData.owner.owner_username }) // Add owner
    });

    const apiUrl = `${radiusBaseUrl}/api/sysapi.php?${params.toString()}`;

    console.log('Register User API URL:', apiUrl); // Debug log

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to register user with Radius Manager');
    }

    const data = await response.json();
    
    console.log('Register User API Response:', data); // Debug log
    
    // Check if the registration was successful
    if (data[0] === 0) {
      // Success - now create customer record in local database
      try {
        if (locationData) {
          const customerData = {
            username,
            first_name: firstname,
            last_name: lastname,
            email,
            phone: phone || username,
            address: address || '',
            city: city || '',
            state: state || '',
            wifi_password: finalPassword, // Store 4-digit password
            location_id: locationId,
            account_owner_id: locationData.default_owner_id || '',
            last_service_plan_id: parseInt(srvid),
            last_service_plan_name: servicePlan?.srvname || 'Unknown Plan'
          };

          await createHotspotCustomer(customerData);
          console.log('Customer record created successfully');
        }
      } catch (error) {
        console.error('Error creating customer record:', error);
        // Don't fail the registration if customer record creation fails
        // The user is already created in Radius Manager
      }

      return NextResponse.json({
        success: true,
        message: data[1] || 'User registered successfully',
        user: {
          username,
          firstname,
          lastname,
          email,
          password: finalPassword,
          location: locationData?.display_name || 'Unknown Location',
          expiryDate
        }
      });
    } else {
      // Error from Radius Manager
      return NextResponse.json({
        success: false,
        error: data[1] || 'Registration failed'
      });
    }

  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
} 