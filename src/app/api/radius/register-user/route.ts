import { NextRequest, NextResponse } from 'next/server';
import { getLocationWithOwner, createHotspotCustomer } from '@/lib/database';
import { calculateServiceExpiry, calculateTrialExpiry } from '@/lib/date-utils';
import { generateHotspotPassword } from '@/lib/password-utils';

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
      locationId // New: location context
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
    if (locationId) {
      try {
        locationData = await getLocationWithOwner(locationId);
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

    // Calculate expiry date - use trial expiry (00:00:00 of current day) as default
    // Respect service plan duration only if explicitly configured (including 0 days for data-only plans)
    let expiryDate;
    
    if (servicePlan && servicePlan.timeunitexp !== undefined) {
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