import { NextRequest, NextResponse } from 'next/server';

interface SMSRequest {
  recp: string; // recipient phone number
  body: string; // message body
}

export async function POST(request: NextRequest) {
  try {
    const { recp, body }: SMSRequest = await request.json();

    if (!recp || !body) {
      return NextResponse.json(
        { success: false, error: 'Recipient phone number and message body are required' },
        { status: 400 }
      );
    }

    // Prepare the DMA API URL with parameters
    const apiUrl = new URL(process.env.RADIUS_API_URL!);
    apiUrl.searchParams.append('apiuser', process.env.RADIUS_API_USER!);
    apiUrl.searchParams.append('apipass', process.env.RADIUS_API_PASS!);
    apiUrl.searchParams.append('q', 'send_sms');
    apiUrl.searchParams.append('recp', recp);
    apiUrl.searchParams.append('body', body);

    // Make the API call to DMA
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('DMA API Response:', result); // Debug logging

    // Handle the actual DMA API response format
    let isSuccess = false;
    let message = '';

    if (Array.isArray(result) && result.length > 0) {
      try {
        // The API returns an array where:
        // result[0] = status code (not reliable for SMS)
        // result[1] = JSON string with actual SMS result
        let parsedResult;
        
        if (result.length > 1 && typeof result[1] === 'string') {
          // Parse the JSON string from result[1]
          parsedResult = JSON.parse(result[1]);
          console.log('Parsed SMS result from result[1]:', parsedResult);
        } else {
          // Fallback: try to parse result[0] if result[1] doesn't exist
          parsedResult = JSON.parse(result[0]);
          console.log('Parsed SMS result from result[0]:', parsedResult);
        }
        
        if (parsedResult.result === 'ACCEPT') {
          isSuccess = true;
          message = `SMS sent successfully (Task ID: ${parsedResult.taskID || 'N/A'})`;
        } else {
          isSuccess = false;
          message = parsedResult.result || 'Failed to send SMS';
        }
      } catch (parseError) {
        // Fallback to treating as array format [code, str]
        console.log('Failed to parse JSON response, treating as array:', parseError);
        isSuccess = result[0] === 0;
        message = result[1] || (isSuccess ? 'SMS sent successfully' : 'Failed to send SMS');
      }
    } else if (typeof result === 'object' && result !== null) {
      // Direct object format (backup)
      isSuccess = result.result === 'ACCEPT' || result.result === 'SUCCESS';
      message = isSuccess 
        ? `SMS sent successfully (Task ID: ${result.taskID || 'N/A'})` 
        : result.result || 'Failed to send SMS';
    } else {
      // Fallback for unexpected formats
      isSuccess = false;
      message = 'Unexpected response format from SMS service';
    }

    if (isSuccess) {
      return NextResponse.json({
        success: true,
        message: message,
        data: result
      });
    } else {
      return NextResponse.json({
        success: false,
        error: message
      }, { status: 400 });
    }

  } catch (error) {
    console.error('SMS API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while sending SMS' },
      { status: 500 }
    );
  }
} 