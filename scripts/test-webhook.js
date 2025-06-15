import crypto from 'crypto';

// Test webhook payload simulation
const testWebhookPayload = {
  event: 'charge.success',
  data: {
    id: 123456789,
    domain: 'test',
    status: 'success',
    reference: 'TEST_' + Date.now(),
    amount: 500000, // 5000 Naira in kobo
    message: null,
    gateway_response: 'Successful',
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    channel: 'card',
    currency: 'NGN',
    ip_address: '192.168.1.1',
    metadata: {
      username: 'testuser',
      srvid: '78',
      timeunitexp: 30,
      trafficunitcomb: 4572,
      limitcomb: 1,
      custom_fields: [
        {
          display_name: 'Username',
          variable_name: 'username',
          value: 'testuser'
        },
        {
          display_name: 'Service Plan ID',
          variable_name: 'srvid',
          value: '78'
        },
        {
          display_name: 'Validity Period',
          variable_name: 'timeunitexp',
          value: '30'
        }
      ]
    },
    customer: {
      id: 123456,
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      customer_code: 'CUS_test123',
      phone: '+2348012345678',
      metadata: {}
    },
    authorization: {
      authorization_code: 'AUTH_test123',
      bin: '408408',
      last4: '4081',
      exp_month: '12',
      exp_year: '2030',
      channel: 'card',
      card_type: 'visa',
      bank: 'TEST BANK',
      country_code: 'NG',
      brand: 'visa',
      reusable: true,
      signature: 'SIG_test123'
    }
  }
};

// Function to generate Paystack signature
function generatePaystackSignature(payload, secret) {
  const hash = crypto.createHmac('sha512', secret).update(payload).digest('hex');
  return hash;
}

// Test function
async function testWebhook(webhookUrl, secretKey) {
  const payloadString = JSON.stringify(testWebhookPayload);
  const signature = generatePaystackSignature(payloadString, secretKey);

  console.log('Testing webhook...');
  console.log('URL:', webhookUrl);
  console.log('Payload:', payloadString);
  console.log('Signature:', signature);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': signature,
        'User-Agent': 'Paystack-Webhook-Test'
      },
      body: payloadString
    });

    const result = await response.text();
    console.log('Response Status:', response.status);
    console.log('Response Body:', result);

    if (response.ok) {
      console.log('✅ Webhook test successful!');
    } else {
      console.log('❌ Webhook test failed!');
    }
  } catch (error) {
    console.error('❌ Webhook test error:', error.message);
  }
}

// Usage
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://75ea-102-91-35-74.ngrok-free.app/api/webhook/paystack';
const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_a11a42a8e399e24db114b6f84fe71bb71aff3510';

// Run test if this is the main module
testWebhook(WEBHOOK_URL, SECRET_KEY);

export { testWebhookPayload, generatePaystackSignature, testWebhook }; 