import { NextRequest, NextResponse } from 'next/server';
import { 
  getAccountCreationPricingConfig, 
  createRenewalTransaction,
  getLocationWithOwner
} from '@/lib/database';

/**
 * Account Creation Payment API
 * Handles payment processing for paid account creation
 */

interface AccountCreationPaymentRequest {
  locationId: string;
  userInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  servicePlanId?: number; // NEW: Selected service plan for combined billing
  paymentReference?: string; // For payment verification
  action: 'initiate' | 'verify';
}

interface PaystackInitiateResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerificationResponse {
  success: boolean;
  data?: {
    amount: number;
    status: string;
    paid_at: string;
    reference: string;
    metadata: Record<string, unknown>;
  };
  error?: string;
}

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface ServicePlanDetails {
  srvid: number;
  srvname: string;
  unitprice: number;
  unitpriceadd: number;
  unitpricetax: number;
  unitpriceaddtax: number;
  totalPrice: number;
  timeunitexp: number;
  trafficunitcomb: number;
  limitcomb: number;
  enableservice: string;
}

// Helper functions
async function fetchServicePlanDetails(servicePlanId: number): Promise<ServicePlanDetails | null> {
  try {
    const apiUser = process.env.RADIUS_API_USER;
    const apiPass = process.env.RADIUS_API_PASS;
    const baseUrl = process.env.RADIUS_API_URL;

    if (!apiUser || !apiPass || !baseUrl) {
      console.error('RADIUS API configuration missing');
      return null;
    }

    const radiusBaseUrl = baseUrl.replace('/api/sysapi.php', '');
    const apiUrl = `${radiusBaseUrl}/api/sysapi.php?apiuser=${apiUser}&apipass=${apiPass}&q=get_srv&srvid=${servicePlanId}`;

    console.log('Fetching service plan details for ID:', servicePlanId);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch service plan:', response.statusText);
      return null;
    }

    const data = await response.json();

    // Parse RADIUS response: [0, [{"srvid":"33","srvname":"30 Days Unlimited",...}]]
    if (Array.isArray(data) && data.length >= 2) {
      const resultCode = data[0];
      const serviceDataArray = data[1];
      
      if (resultCode === 0 && Array.isArray(serviceDataArray) && serviceDataArray.length > 0) {
        const servicePlan = serviceDataArray[0];
        
        // Check if service is enabled
        if (servicePlan.enableservice !== "1") {
          console.error('Service plan is disabled:', servicePlanId);
          return null;
        }

        const unitprice = parseFloat(servicePlan.unitprice) || 0;
        const unitpriceadd = parseFloat(servicePlan.unitpriceadd) || 0;
        const unitpricetax = parseFloat(servicePlan.unitpricetax) || 0;
        const unitpriceaddtax = parseFloat(servicePlan.unitpriceaddtax) || 0;

        return {
          srvid: parseInt(servicePlan.srvid),
          srvname: servicePlan.srvname || 'Unknown Plan',
          unitprice,
          unitpriceadd,
          unitpricetax,
          unitpriceaddtax,
          totalPrice: unitprice + unitpriceadd + unitpricetax + unitpriceaddtax,
          timeunitexp: parseInt(servicePlan.timeunitexp) || 0,
          trafficunitcomb: parseInt(servicePlan.trafficunitcomb) || 0,
          limitcomb: parseInt(servicePlan.limitcomb) || 0,
          enableservice: servicePlan.enableservice
        };
      }
    }

    console.error('Invalid service plan response format:', data);
    return null;
  } catch (error) {
    console.error('Error fetching service plan details:', error);
    return null;
  }
}

function generatePaystackReference(prefix: string, firstName: string, lastName: string): string {
  const timestamp = Date.now();
  const cleanFirstName = firstName.replace(/\s+/g, '_');
  const cleanLastName = lastName.replace(/\s+/g, '_');
  return `${prefix}_${timestamp}_${cleanFirstName}_${cleanLastName}`;
}

async function verifyPaystackPayment(reference: string): Promise<PaystackVerificationResponse> {
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!result.status) {
      return {
        success: false,
        error: result.message || 'Payment verification failed'
      };
    }

    return {
      success: true,
      data: {
        amount: result.data.amount,
        status: result.data.status,
        paid_at: result.data.paid_at,
        reference: result.data.reference,
        metadata: result.data.metadata
      }
    };
  } catch (error) {
    console.error('Error verifying Paystack payment:', error);
    return {
      success: false,
      error: 'Network error during payment verification'
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AccountCreationPaymentRequest = await request.json();
    const { locationId, userInfo, servicePlanId, paymentReference, action } = body;

    // Validate required fields
    if (!locationId || !userInfo?.firstName || !userInfo?.lastName || !userInfo?.email || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get location and pricing configuration
    const [pricingConfig, locationData] = await Promise.all([
      getAccountCreationPricingConfig(locationId),
      getLocationWithOwner(locationId)
    ]);

    if (!locationData) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Check if pricing is enabled
    if (!pricingConfig.enabled) {
      return NextResponse.json(
        { error: 'Account creation pricing is not enabled for this location' },
        { status: 400 }
      );
    }

    // Check if price is valid
    if (pricingConfig.price <= 0) {
      return NextResponse.json(
        { error: 'Invalid pricing configuration' },
        { status: 400 }
      );
    }

    if (action === 'initiate') {
      // Validate required fields for payment initiation
      if (!locationId || !userInfo || !userInfo.firstName || !userInfo.lastName || !userInfo.email || !userInfo.phone) {
        return NextResponse.json(
          { 
            error: 'Missing required fields: locationId, firstName, lastName, email, phone',
            success: false 
          },
          { status: 400 }
        );
      }

      // NEW: Validate service plan and check if it's free
      let servicePlanDetails: ServicePlanDetails | null = null;
      let servicePlanPrice = 0;
      
      if (servicePlanId) {
        servicePlanDetails = await fetchServicePlanDetails(servicePlanId);
        if (!servicePlanDetails) {
          return NextResponse.json(
            { 
              error: 'Invalid service plan selected',
              success: false 
            },
            { status: 400 }
          );
        }
        
        servicePlanPrice = servicePlanDetails.totalPrice;
        
        // Prevent payment initiation for free service plans
        if (servicePlanPrice === 0) {
          return NextResponse.json(
            { 
              error: 'Payment not required for free service plans. Please proceed with direct account creation.',
              success: false,
              code: 'FREE_PLAN_NO_PAYMENT',
              servicePlan: {
                id: servicePlanDetails.srvid,
                name: servicePlanDetails.srvname,
                price: servicePlanPrice
              }
            },
            { status: 400 }
          );
        }
      }

      return await initiatePayment(locationId, userInfo, servicePlanDetails);
    } else if (action === 'verify') {
      if (!paymentReference) {
        return NextResponse.json(
          { error: 'Payment reference is required for verification' },
          { status: 400 }
        );
      }
      return await verifyPayment(paymentReference, locationId, userInfo);
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "initiate" or "verify"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in account creation payment API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Initiate payment with Paystack
 */
async function initiatePayment(
  locationId: string,
  userInfo: UserInfo,
  servicePlanDetails: ServicePlanDetails | null
) {
  try {
    // Get pricing configuration for the location
    const pricingConfig = await getAccountCreationPricingConfig(locationId);
    if (!pricingConfig) {
      return NextResponse.json(
        { error: 'Pricing configuration not found for this location' },
        { status: 500 }
      );
    }

    // Calculate combined amount: account creation fee + service plan price
    const accountCreationFee = pricingConfig.price;
    const servicePlanPrice = servicePlanDetails?.totalPrice || 0;
    const totalAmount = accountCreationFee + servicePlanPrice;

    // Generate unique reference
    const reference = generatePaystackReference('ACCT', userInfo.firstName, userInfo.lastName);
    
    // Prepare custom fields for Paystack metadata
    const customFields = [
      {
        display_name: "Purpose",
        variable_name: "purpose",
        value: servicePlanDetails ? "Combined Account Creation & Service Plan" : "Account Creation"
      },
      {
        display_name: "Location",
        variable_name: "location",
        value: locationId // Use locationId directly
      },
      {
        display_name: "Customer Name",
        variable_name: "customer_name",
        value: `${userInfo.firstName} ${userInfo.lastName}`
      },
      {
        display_name: "Phone",
        variable_name: "phone",
        value: userInfo.phone
      },
      {
        display_name: "Location ID",
        variable_name: "location_id",
        value: locationId
      },
      {
        display_name: "Account Creation Fee",
        variable_name: "account_creation_fee",
        value: accountCreationFee.toString()
      }
    ];

    // Add service plan details to metadata if available
    if (servicePlanDetails) {
      customFields.push(
        {
          display_name: "Service Plan ID",
          variable_name: "srvid",
          value: servicePlanDetails.srvid.toString()
        },
        {
          display_name: "Service Plan Name",
          variable_name: "service_plan_name",
          value: servicePlanDetails.srvname
        },
        {
          display_name: "Service Plan Price",
          variable_name: "service_plan_price",
          value: servicePlanDetails.totalPrice.toString()
        },
        {
          display_name: "Service Plan Duration",
          variable_name: "timeunitexp",
          value: servicePlanDetails.timeunitexp.toString()
        },
        {
          display_name: "Traffic Limit",
          variable_name: "trafficunitcomb",
          value: servicePlanDetails.trafficunitcomb.toString()
        },
        {
          display_name: "Traffic Type",
          variable_name: "limitcomb",
          value: servicePlanDetails.limitcomb.toString()
        }
      );
    }

    // Prepare Paystack payment initialization for POPUP/MODAL (not redirect)
    const paystackData = {
      email: userInfo.email,
      amount: Math.round(totalAmount * 100), // Convert to kobo
      reference: reference,
      metadata: {
        custom_fields: customFields
      },
      // Remove callback_url for popup integration
      channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
    };

    // Initialize payment with Paystack
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackData),
    });

    const paystackResult: PaystackInitiateResponse = await paystackResponse.json();

    if (!paystackResult.status) {
      console.error('Paystack initialization failed:', paystackResult);
      return NextResponse.json(
        { error: 'Payment initialization failed' },
        { status: 500 }
      );
    }

    // Prepare response data for popup integration
    const responseData = {
      authorization_url: paystackResult.data.authorization_url, // Keep for compatibility
      access_code: paystackResult.data.access_code,
      reference: paystackResult.data.reference,
      amount: totalAmount, // Amount in Naira for popup
      accountCreationFee,
      servicePlanPrice,
      totalAmount,
      description: pricingConfig.description,
      location: locationId,
      breakdown: {
        accountCreation: {
          amount: accountCreationFee,
          description: pricingConfig.description
        },
        ...(servicePlanDetails && {
          servicePlan: {
            amount: servicePlanPrice,
            name: servicePlanDetails.srvname,
            duration: `${servicePlanDetails.timeunitexp} days`,
            id: servicePlanDetails.srvid
          }
        })
      }
    };

    // Return payment initialization response
    return NextResponse.json({
      success: true,
      message: servicePlanDetails 
        ? 'Combined payment initialized successfully' 
        : 'Payment initialized successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Error initiating payment:', error);
    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}

/**
 * Verify payment with Paystack
 */
async function verifyPayment(
  reference: string,
  locationId: string,
  userInfo: UserInfo
) {
  try {
    // Get pricing configuration and location data
    const [pricingConfig, locationData] = await Promise.all([
      getAccountCreationPricingConfig(locationId),
      getLocationWithOwner(locationId)
    ]);
    
    if (!pricingConfig) {
      return NextResponse.json(
        { error: 'Pricing configuration not found for this location' },
        { status: 500 }
      );
    }

    // Verify payment with Paystack
    const verificationResult = await verifyPaystackPayment(reference);

    if (!verificationResult.success || !verificationResult.data) {
      return NextResponse.json(
        { 
          error: verificationResult.error || 'Payment verification failed',
          success: false 
        },
        { status: 400 }
      );
    }

    const paymentData = verificationResult.data;

    // Calculate expected combined amount
    const accountCreationFee = pricingConfig.price;
    const servicePlanPrice = 0; // No service plan for verification
    const expectedTotalAmount = accountCreationFee + servicePlanPrice;
    const expectedAmountKobo = Math.round(expectedTotalAmount * 100); // Convert to kobo

    // Verify payment amount matches expected amount
    if (paymentData.amount !== expectedAmountKobo) {
      return NextResponse.json(
        {
          error: `Payment amount mismatch. Expected ₦${expectedTotalAmount.toLocaleString()}, but received ₦${(paymentData.amount / 100).toLocaleString()}`,
          success: false
        },
        { status: 400 }
      );
    }

    // Record transaction in renewal_transactions table for commission tracking
    try {
      // In this case, it's just the account creation transaction
      const transactionData = {
        username: userInfo.phone,
        service_plan_id: 0,
        service_plan_name: 'Account Creation',
        amount_paid: accountCreationFee,
        commission_rate: locationData?.owner?.commission_rate || 10.00,
        commission_amount: (accountCreationFee * (locationData?.owner?.commission_rate || 10.00)) / 100,
        paystack_reference: reference,
        payment_status: 'success' as const,
        renewal_period_days: 0,
        renewal_start_date: new Date().toISOString(),
        renewal_end_date: new Date().toISOString(),
        customer_location: locationData?.city || locationId,
        transaction_type: 'account_creation' as const,
        account_owner_id: locationData?.owner?.id || locationData?.default_owner_id
      };

      await createRenewalTransaction(transactionData);
      console.log('Account creation transaction recorded:', reference);
    } catch (transactionError) {
      console.error('Error recording transaction:', transactionError);
      // Don't fail the payment verification due to transaction recording issues
      // The payment was successful, transaction recording is for tracking purposes
    }

    // Return success response with payment details
    const responseData = {
      reference: paymentData.reference,
      amount: paymentData.amount / 100, // Convert back to Naira
      status: paymentData.status,
      paid_at: paymentData.paid_at,
      location: locationData?.display_name || locationId,
      canProceedWithRegistration: true,
      breakdown: {
        accountCreation: {
          amount: accountCreationFee,
          description: pricingConfig.description
        },
        servicePlan: {
          amount: servicePlanPrice,
          name: 'Account Creation',
          duration: '0 days',
          id: 0
        }
      }
    };

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during payment verification',
        success: false 
      },
      { status: 500 }
    );
  }
} 