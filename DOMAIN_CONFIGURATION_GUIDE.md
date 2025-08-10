# 🌐 Domain Configuration Guide

This guide explains how to properly configure domains for the PHSWEB hotspot system to avoid `net::ERR_NAME_NOT_RESOLVED` errors and ensure consistent user experience.

## 🚨 Problem Fixed

**Issue**: Users clicking "Go to Hotspot Portal" were getting `net::ERR_NAME_NOT_RESOLVED` error because of hardcoded URLs pointing to non-existent domains.

**Root Cause**: Domain mismatch between:
- Frontend hardcoded URLs (`http://hotspot.phsweb.net/login`)
- MikroTik configuration (`https://sabiwifi.com/hotspot/location`)
- SMS messages (outdated URLs)

## ✅ Solution Implemented

### 1. Environment Variable Configuration

Set these environment variables in your `.env.local` file:

```env
# Primary domain configuration
NEXT_PUBLIC_APP_URL=https://sabiwifi.com

# Optional: If using subdomains (legacy setup)
NEXT_PUBLIC_ADMIN_URL=https://sabiwifi.com
NEXT_PUBLIC_API_URL=https://sabiwifi.com
```

### 2. Files Updated

#### Frontend Registration Page (`src/app/hotspot/register/page.tsx`)
- ✅ **Before**: Hardcoded `http://hotspot.phsweb.net/login`
- ✅ **After**: Dynamic URL using `process.env.NEXT_PUBLIC_APP_URL` with location-specific routing

#### SMS Utility (`src/lib/sms-utils.ts`)
- ✅ **Before**: Hardcoded `http://hotspot.phsweb.net/login`
- ✅ **After**: Uses `process.env.NEXT_PUBLIC_APP_URL` with fallback to `https://sabiwifi.com`

#### MikroTik Login Page (`login.html`)
- ✅ **Before**: Development URL `http://10.255.0.4:3000/hotspot/gefas01`
- ✅ **After**: Production URL `https://sabiwifi.com/hotspot/gefas01`

## 🎯 How It Works Now

### User Registration Flow
1. User registers for hotspot account
2. Registration success page shows "Go to Hotspot Portal" button
3. Button dynamically redirects to: `${NEXT_PUBLIC_APP_URL}/hotspot/${location}`
4. Example: `https://sabiwifi.com/hotspot/awka`

### SMS Notification
1. Welcome SMS sent to user
2. SMS contains: "Connect to WiFi and visit: https://sabiwifi.com"
3. User can access the main site and navigate to their location's hotspot login

### MikroTik Router Flow
1. User connects to WiFi network
2. Captive portal redirects to MikroTik's login.html
3. login.html redirects to: `https://sabiwifi.com/hotspot/${location}`
4. User lands on the proper login page with all MikroTik parameters

## 🔧 MikroTik Router Configuration

### Update Your Router's login.html
Upload this content to your MikroTik router's `/flash/hotspot/login.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>PHSWEB Hotspot</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script>
        // Enhanced redirect with CHAP parameters for secure authentication
        // Update this URL to match your actual domain and location
        window.location.href = 'https://sabiwifi.com/hotspot/YOUR_LOCATION_ID?' + 
            'link-login=' + encodeURIComponent('$(link-login)') +
            '&link-orig=' + encodeURIComponent('$(link-orig)') +
            '&mac=' + encodeURIComponent('$(mac)') +
            '&ip=' + encodeURIComponent('$(ip)') +
            '&username=' + encodeURIComponent('$(username)') +
            '&error=' + encodeURIComponent('$(error)') +
            '&chap-challenge=' + encodeURIComponent('$(chap-challenge)') +
            '&chap-id=' + encodeURIComponent('$(chap-id)');
    </script>
</head>
<body>
    <div style="text-align: center; margin-top: 50px; font-family: Arial, sans-serif;">
        <h1>🌐 PHSWEB Hotspot</h1>
        <p>Redirecting to PHSWEB login page...</p>
        <p style="color: #28a745; font-size: 12px;">🔒 Secure CHAP Authentication Enabled</p>
        <p>If you are not redirected automatically, <a href="https://sabiwifi.com/hotspot/YOUR_LOCATION_ID?test=true">click here for test mode</a>.</p>
    </div>
</body>
</html>
```

**Important**: Replace `YOUR_LOCATION_ID` with your actual location ID (e.g., `awka`, `lagos`, `abuja`).

### Walled Garden Configuration
Ensure your MikroTik router allows access to your domain:

```bash
/ip hotspot walled-garden add dst-host=sabiwifi.com action=allow
/ip hotspot walled-garden add dst-host=*.sabiwifi.com action=allow
```

## 🏢 Environment-Specific Configuration

### Development
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Staging
```env
NEXT_PUBLIC_APP_URL=https://staging.sabiwifi.com
```

### Production
```env
NEXT_PUBLIC_APP_URL=https://sabiwifi.com
```

## 🚀 Testing the Fix

### 1. Test Registration Flow
1. Go to `/hotspot/register?location=awka`
2. Complete registration
3. Click "Go to Hotspot Portal"
4. Should redirect to: `https://sabiwifi.com/hotspot/awka`

### 2. Test SMS Content
1. Register a new user
2. Check SMS content contains: "Connect to WiFi and visit: https://sabiwifi.com"

### 3. Test MikroTik Redirect
1. Connect to hotspot WiFi
2. Should redirect to: `https://sabiwifi.com/hotspot/YOUR_LOCATION`
3. Should include all MikroTik parameters in URL

## 🛠️ Troubleshooting

### Error: `net::ERR_NAME_NOT_RESOLVED`
- **Cause**: Domain doesn't exist or DNS not configured
- **Solution**: Verify `NEXT_PUBLIC_APP_URL` points to accessible domain

### Error: Page not found (404)
- **Cause**: Location ID mismatch or route doesn't exist
- **Solution**: Verify location exists in database and route is configured

### Error: Missing MikroTik parameters
- **Cause**: login.html not passing parameters correctly
- **Solution**: Update MikroTik login.html with proper parameter passing

## 📝 Migration Checklist

- [x] Update frontend registration page URLs
- [x] Update SMS utility URLs
- [x] Update MikroTik login.html template
- [x] Document environment variable configuration
- [ ] Set proper `NEXT_PUBLIC_APP_URL` in production environment
- [ ] Update all MikroTik routers with new login.html
- [ ] Test complete user flow end-to-end
- [ ] Update any documentation with new URLs

## 🔗 Related Files

- `src/app/hotspot/register/page.tsx` - Registration success page
- `src/lib/sms-utils.ts` - SMS notification utility
- `login.html` - MikroTik login page template
- `src/lib/router-config.ts` - Router configuration utility
- `.env.local` - Environment variables
