interface WelcomeSMSData {
  firstName: string;
  phone: string;
  password: string;
  locationName?: string;
}

export function generateWelcomeSMS(data: WelcomeSMSData): string {
  const { firstName, phone, password, locationName } = data;
  
  const location = locationName ? ` for ${locationName}` : '';
  
  const message = `Welcome ${firstName}! Your WiFi account${location} is ready. 
Login: ${phone}
PIN: ${password}
Add credit: phsweb.app
connect to hotspot: hotspot1.phsweb.net
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