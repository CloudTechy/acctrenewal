interface WelcomeSMSData {
  firstName: string;
  phone: string;
  password: string;
  locationName?: string;
}

export function generateWelcomeSMS(data: WelcomeSMSData): string {
  const { firstName, phone, password, locationName } = data;
  
  const location = locationName ? ` for ${locationName}` : '';
  
  // Use environment variable for the domain, with fallback to sabiwifi.com
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sabiwifi.com';
  
  const message = `Welcome ${firstName}! Your WiFi account${location} is ready. 
Login: ${phone}
PIN: ${password}
Connect to WiFi and visit: ${baseUrl}

Enjoy fast internet!`;

  return message;
}

export function sendWelcomeSMS(phoneNumber: string, welcomeMessage: string) {
  return fetch('/api/sms/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recp: phoneNumber,
      body: welcomeMessage
    })
  });
} 