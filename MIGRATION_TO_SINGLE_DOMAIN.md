# 🔄 Migration Guide: Moving to Single Domain (sabiwifi.com)

## 📋 Overview

This guide migrates your hotspot system from the subdomain architecture (`hotspot.sabiwifi.com`, `admin.sabiwifi.com`) to a clean single-domain setup where everything is served from `sabiwifi.com` directly.

## ✅ Benefits of Single Domain

- **Better User Experience**: No confusing redirects (`sabiwifi.com` stays `sabiwifi.com`)
- **Cleaner Branding**: One domain to remember
- **Simplified Management**: Single nginx configuration
- **No More 403 Errors**: Direct access to renewal page

## 🚀 Migration Steps

### Step 1: Backup Current Configuration

```bash
# On your production server (139.59.162.145)
sudo cp /etc/nginx/sites-available/phsweb-https /etc/nginx/sites-available/phsweb-https.backup.$(date +%Y%m%d)
sudo cp nginx.conf nginx.conf.backup.$(date +%Y%m%d)
```

### Step 2: Deploy New Nginx Configuration

```bash
# Replace current nginx configuration
sudo cp phsweb-single-domain.conf /etc/nginx/sites-available/phsweb-single-domain

# Test configuration
sudo nginx -t

# If test passes, enable new configuration
sudo ln -sf /etc/nginx/sites-available/phsweb-single-domain /etc/nginx/sites-enabled/sabiwifi
sudo unlink /etc/nginx/sites-enabled/phsweb-https  # Remove old config

# Reload nginx
sudo systemctl reload nginx
```

### Step 3: Update Application Environment

```bash
# Update .env.local on production server
NEXT_PUBLIC_APP_URL=https://sabiwifi.com
NEXT_PUBLIC_ADMIN_URL=https://sabiwifi.com
NEXT_PUBLIC_API_URL=https://sabiwifi.com

# Rebuild and restart application
npm run build
pm2 restart phsweb-renewal
```

## 🔧 MikroTik Router Updates

**CRITICAL:** You need to update all MikroTik routers to use the new domain.

### Step 4.1: Update Walled Garden Rules

**Run on each MikroTik router:**

```bash
# Remove old subdomain entries
/ip hotspot walled-garden remove [find dst-host="hotspot.sabiwifi.com"]
/ip hotspot walled-garden remove [find dst-host="admin.sabiwifi.com"]

# Add new main domain entry
/ip hotspot walled-garden add dst-host=sabiwifi.com action=allow
/ip hotspot walled-garden add dst-host=*.sabiwifi.com action=allow

# Keep HTTPS and payment service entries
/ip hotspot walled-garden add dst-port=443 action=allow protocol=tcp
/ip hotspot walled-garden add dst-host=api.paystack.co action=allow
/ip hotspot walled-garden add dst-host=js.paystack.co action=allow

# Verify walled garden rules
/ip hotspot walled-garden print
```

### Step 4.2: Update Hotspot Login Pages

**Update login.html on each router** to use new domain:

#### **For Awka Router (replace 'awka' with actual location):**

```html
<!DOCTYPE html>
<html>
<head>
    <title>PHSWEB Hotspot - Redirecting...</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
</head>
<body>
    <div style="text-align: center; margin-top: 50px; font-family: Arial, sans-serif;">
        <h1>🔒 PHSWEB Secure Hotspot</h1>
        <p>Connecting to secure login page...</p>
        <p>If you are not redirected automatically, <a href="https://sabiwifi.com/hotspot/awka?test=true">click here</a>.</p>
        <div style="margin-top: 20px;">
            <div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #28a745; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        </div>
    </div>
    <style>
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    </style>
    <script>
        // Force HTTPS redirect
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            location.replace('https:' + window.location.href.substring(window.location.protocol.length));
        }
        
        // Get MikroTik parameters
        function getUrlParameter(name) {
            name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
            var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
            var results = regex.exec(location.search);
            return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
        }
        
        // Build secure redirect URL with all parameters
        const linkOrig = getUrlParameter('link-orig-esc') || getUrlParameter('target') || '';
        const mac = getUrlParameter('mac') || '';
        const ip = getUrlParameter('ip') || '';
        const username = getUrlParameter('username') || '';
        
        // REPLACE 'awka' with actual location ID for each router
        const locationId = 'awka';
        
        const params = new URLSearchParams();
        if (linkOrig) params.append('link-orig-esc', linkOrig);
        if (mac) params.append('mac', mac);
        if (ip) params.append('ip', ip);
        if (username) params.append('username', username);
        
        // NEW SINGLE DOMAIN URL
        const redirectUrl = `https://sabiwifi.com/hotspot/${locationId}?${params.toString()}`;
        
        // Redirect after 3 seconds
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 3000);
    </script>
</body>
</html>
```

#### **Update for Each Location:**

- **Awka Router:** Replace `'awka'` in the JavaScript
- **Lagos Router:** Replace with `'lagos'`
- **Abuja Router:** Replace with `'abuja'`
- **Kano Router:** Replace with `'kano'`
- **Ibadan Router:** Replace with `'ibadan'`

### Step 4.3: Router Configuration Script

**Create this script to update multiple routers:**

```bash
#!/bin/bash
# update-routers-single-domain.sh

ROUTERS=(
    "10.255.0.2"    # Awka
    "10.255.0.3"    # Lagos
    "10.255.0.4"    # Abuja
    "10.255.0.5"    # Kano
    "10.255.0.6"    # Ibadan
)

USERNAME="admin"
PASSWORD="your-router-password"

for router in "${ROUTERS[@]}"; do
    echo "Updating router $router..."
    
    # SSH into router and update walled garden
    sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$USERNAME@$router" << 'EOF'
        /ip hotspot walled-garden remove [find dst-host="hotspot.sabiwifi.com"]
        /ip hotspot walled-garden remove [find dst-host="admin.sabiwifi.com"]
        /ip hotspot walled-garden add dst-host=sabiwifi.com action=allow
        /ip hotspot walled-garden print
EOF
    
    echo "Router $router updated successfully"
done
```

## 🌐 New URL Structure

After migration, your URL structure will be:

### **Public Access (No VPN Required):**
- **Main Renewal Page:** `https://sabiwifi.com/`
- **Terms & Privacy:** `https://sabiwifi.com/terms`, `https://sabiwifi.com/privacy`
- **Public APIs:** `https://sabiwifi.com/api/renew`, `https://sabiwifi.com/api/webhook`

### **VPN-Only Access:**
- **Admin Dashboard:** `https://sabiwifi.com/dashboard`
- **Hotspot Login Pages:** `https://sabiwifi.com/hotspot/awka` (from routers only)
- **Admin APIs:** `https://sabiwifi.com/api/admin/*`

## ✅ Testing Checklist

### Step 5.1: Test Public Access
```bash
# Test main renewal page (should work from anywhere)
curl -I https://sabiwifi.com/
# Expected: 200 OK

# Test public API
curl -I https://sabiwifi.com/api/renew
# Expected: 200 OK or 405 Method Not Allowed (normal for GET on POST endpoint)
```

### Step 5.2: Test VPN-Protected Routes
```bash
# Test admin routes (should be blocked without VPN)
curl -I https://sabiwifi.com/dashboard
# Expected: 403 Forbidden (if not on VPN)

# Test hotspot routes (should be blocked without VPN)
curl -I https://sabiwifi.com/hotspot/awka
# Expected: 403 Forbidden (if not on VPN)
```

### Step 5.3: Test from Router Network
```bash
# From a MikroTik router or VPN connection
curl -I https://sabiwifi.com/hotspot/awka
# Expected: 200 OK
```

## 🔄 Rollback Plan

If issues occur, you can quickly rollback:

```bash
# Restore old nginx configuration
sudo ln -sf /etc/nginx/sites-available/phsweb-https /etc/nginx/sites-enabled/sabiwifi
sudo nginx -t && sudo systemctl reload nginx

# Restore old environment variables
NEXT_PUBLIC_APP_URL=https://hotspot.sabiwifi.com
NEXT_PUBLIC_ADMIN_URL=https://admin.sabiwifi.com
NEXT_PUBLIC_API_URL=https://hotspot.sabiwifi.com

# Rebuild app
npm run build && pm2 restart phsweb-renewal
```

## 📊 Migration Benefits Summary

### **Before (Subdomain Architecture):**
```
sabiwifi.com → hotspot.sabiwifi.com → admin.sabiwifi.com → 403 Forbidden
```

### **After (Single Domain):**
```
sabiwifi.com → ✅ Public Renewal Page (Direct Access)
```

### **User Experience:**
- ✅ No confusing redirects
- ✅ Clean, memorable URL
- ✅ Faster page loads (no redirects)
- ✅ Better SEO (single domain)

### **Technical Benefits:**
- ✅ Simplified nginx configuration
- ✅ Easier SSL certificate management
- ✅ Consolidated logging
- ✅ Reduced DNS complexity

## ⚠️ Important Notes

1. **Router Updates Required:** All MikroTik routers must be updated to use the new domain
2. **Gradual Migration:** You can run both configurations temporarily during migration
3. **SSL Certificate:** Your existing SSL certificate already covers `sabiwifi.com`
4. **DNS:** No DNS changes required (sabiwifi.com already points to your server)

## 🆘 Troubleshooting

### Issue: 403 Forbidden on Public Pages
```bash
# Check nginx configuration
sudo nginx -t
# Check if location blocks are correctly ordered
```

### Issue: Hotspot Login Not Working
```bash
# Verify router walled garden rules
/ip hotspot walled-garden print
# Ensure sabiwifi.com is allowed
```

### Issue: Admin Dashboard Not Accessible
```bash
# Check VPN connection
ip addr show wg0
# Verify you're on 10.255.0.x network
```

---

**📅 Estimated Migration Time:** 2-3 hours
**🔧 Required Downtime:** 5-10 minutes (nginx reload only)
**✅ Rollback Time:** 2-3 minutes if needed
