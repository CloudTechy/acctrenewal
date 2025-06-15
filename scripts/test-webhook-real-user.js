import crypto from 'crypto';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to generate Paystack signature
function generatePaystackSignature(payload, secret) {
  const hash = crypto.createHmac('sha512', secret).update(payload).digest('hex');
  return hash;
}

// Test function
async function testWebhookWithRealUser(webhookUrl, secretKey, username) {
  const testWebhookPayload = {
    event: 'charge.success',
    data: {
      id: 123456789,
      domain: 'test',
      status: 'success',
      reference: 'REAL_TEST_' + Date.now(),
      amount: 500000, // 5000 Naira in kobo
      message: null,
      gateway_response: 'Successful',
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      channel: 'card',
      currency: 'NGN',
      ip_address: '192.168.1.1',
      metadata: {
        username: username,
        srvid: '78',
        timeunitexp: 30,
        trafficunitcomb: 4572,
        limitcomb: 1,
        custom_fields: [
          {
            display_name: 'Username',
            variable_name: 'username',
            value: username
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

  const payloadString = JSON.stringify(testWebhookPayload);
  const signature = generatePaystackSignature(payloadString, secretKey);

  console.log('🔍 Testing webhook with real user...');
  console.log('URL:', webhookUrl);
  console.log('Username:', username);
  console.log('Reference:', testWebhookPayload.data.reference);

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
    
    console.log('\n📊 RESULTS:');
    console.log('Response Status:', response.status);
    console.log('Response Body:', result);

    if (response.status === 200) {
      console.log('✅ Webhook test successful!');
      console.log('✅ Credits should have been added to user:', username);
    } else if (response.status === 500 && result.includes('Failed to add credits')) {
      console.log('⚠️  Webhook processed correctly, but RADIUS API failed');
      console.log('This could mean:');
      console.log('- User doesn\'t exist in RADIUS system');
      console.log('- RADIUS API is unreachable');
      console.log('- Account is disabled');
      console.log('But the webhook signature and processing worked! 🎉');
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

console.log('🧪 Webhook Test with Real User');
console.log('================================');
console.log('');

rl.question('Enter a real username from your RADIUS system: ', (username) => {
  if (!username.trim()) {
    console.log('❌ Username is required!');
    rl.close();
    return;
  }

  rl.question('Are you sure you want to test adding credits to "' + username + '"? (y/N): ', (confirm) => {
    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      testWebhookWithRealUser(WEBHOOK_URL, SECRET_KEY, username.trim());
    } else {
      console.log('Test cancelled.');
    }
    rl.close();
  });
});

export { testWebhookWithRealUser }; 