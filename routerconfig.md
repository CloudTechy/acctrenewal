# MikroTik Router Configuration Guide for Hotspot Testing

## 🎯 **Objective**
Configure your MikroTik router to redirect users to location-specific landing pages when they connect to your WiFi hotspot.

## 📋 **Prerequisites**
- MikroTik Router with RouterOS 6.40+ (hAP ac2, hEX, RB4011, etc.)
- Access to router via Winbox, WebFig, or SSH
- Internet connection on WAN port (ether1)
- Your PHSWEB application running and accessible from the internet

## 🌐 **Network Overview**

```
Internet → WAN (ether1) → MikroTik Router → WiFi/LAN → Client Devices
                                      ↓
                             Captive Portal redirects to:
                             http://192.168.50.14:3000/hotspot/awka
```

## ⚙️ **Step 1: Basic Network Configuration**

### 1.1 Connect to Router
- **Winbox**: Already connected as shown in your screenshot
- **Web Interface**: Navigate to your router's IP in browser
- **SSH**: `ssh admin@[ROUTER_IP]`

### 1.2 Set Router Identity
```bash
/system identity set name="PHSWEB-Awka-Router"
```

### 1.3 Configure WAN Interface (Internet Connection)
```bash
# Set ether1 as WAN with DHCP client (for most ISPs)
/ip dhcp-client add interface=ether1 disabled=no

# Alternative: Static IP configuration
# /ip address add address=YOUR_STATIC_IP/24 interface=ether1
# /ip route add gateway=YOUR_GATEWAY
```

### 1.4 Configure LAN Network
```bash
# Create bridge for LAN ports
/interface bridge add name=bridge-lan

# Add LAN ports to bridge (ether2-ether5)
/interface bridge port add bridge=bridge-lan interface=ether2
/interface bridge port add bridge=bridge-lan interface=ether3
/interface bridge port add bridge=bridge-lan interface=ether4
/interface bridge port add bridge=bridge-lan interface=ether5

# Set LAN IP address (adjust based on your current network)
/ip address add address=192.168.1.1/24 interface=bridge-lan
```

## 📶 **Step 2: WiFi Configuration**

### 2.1 Configure Wireless Interface
```bash
# Set WiFi mode and SSID
/interface wireless set wlan1 mode=ap-bridge ssid="PHSWEB-Free-WiFi" disabled=no

# Set WiFi security (Open network for public hotspot)
/interface wireless security-profiles set default mode=none

# Apply security profile
/interface wireless set wlan1 security-profile=default

# Add WiFi to LAN bridge
/interface bridge port add bridge=bridge-lan interface=wlan1

# Set WiFi channel (optional, auto is usually fine)
/interface wireless set wlan1 channel-width=20/40mhz-XX frequency=auto
```

### 2.2 Enable WiFi
```bash
/interface wireless enable wlan1
```

## 🔥 **Step 3: Hotspot Configuration**

### 3.1 Create Hotspot Server
```bash
# Create hotspot server on the LAN bridge
/ip hotspot add name=hotspot-awka interface=bridge-lan address-pool=dhcp_pool1 profile=hsprof1

# Alternative quick setup (interactive)
/ip hotspot setup
# Follow prompts:
# - hotspot interface: bridge-lan
# - local address: 192.168.1.1/24
# - address pool: 192.168.1.100-192.168.1.200
# - certificate: none
# - SMTP server: (leave blank)
# - DNS servers: 8.8.8.8,8.8.4.4
# - DNS name: phsweb.local
# - name of local hotspot user: admin
```

### 3.2 Configure DHCP Pool
```bash
# Create DHCP address pool for hotspot clients
/ip pool add name=dhcp_pool1 ranges=192.168.1.100-192.168.1.200

# Create DHCP server
/ip dhcp-server add name=dhcp-lan interface=bridge-lan address-pool=dhcp_pool1 disabled=no
/ip dhcp-server network add address=192.168.1.0/24 gateway=192.168.1.1 dns-server=8.8.8.8,8.8.4.4
```

### 3.3 Configure Hotspot Profile
```bash
# Modify hotspot profile for redirection
/ip hotspot profile set hsprof1 html-directory=hotspot html-directory-override=""

# Set login page redirect URL to your application
/ip hotspot profile set hsprof1 login-by=cookie,http-post http-proxy="" 
```

## 🌍 **Step 4: Configure Captive Portal Redirection**

### 4.1 Set Hotspot Login Page
```bash
# Configure hotspot to redirect to your development server
/ip hotspot profile set hsprof1 \
    html-directory=hotspot \
    login-by=cookie,http-post \
    use-radius=no

# Set walled garden for your development server
/ip hotspot walled-garden add dst-host=192.168.50.14 action=allow
/ip hotspot walled-garden add dst-host=localhost action=allow
```

### 4.2 Create Custom Login Page (Development Configuration)
```bash
# Create simple redirect login page
/file print
# Upload custom login.html to the router's hotspot directory
```

**Create `login.html` file content for your development setup:**
```html
<!DOCTYPE html>
<html>
<head>
    <title>PHSWEB Hotspot</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script>
        // Redirect to your development server with ALL required MikroTik parameters
        window.location.href = 'http://192.168.50.14:3000/hotspot/awka?' + 
            'link-login=' + encodeURIComponent('$(link-login)') +
            '&link-orig=' + encodeURIComponent('$(link-orig)') +
            '&mac=' + encodeURIComponent('$(mac)') +
            '&ip=' + encodeURIComponent('$(ip)') +
            '&username=' + encodeURIComponent('$(username)') +
            '&error=' + encodeURIComponent('$(error)');
    </script>
</head>
<body>
    <div style="text-align: center; margin-top: 50px; font-family: Arial, sans-serif;">
        <h1>🌐 PHSWEB Hotspot</h1>
        <p>Redirecting to PHSWEB login page...</p>
        <p>If you are not redirected automatically, <a href="http://192.168.50.14:3000/hotspot/awka?test=true">click here for test mode</a>.</p>
        <div style="margin-top: 20px;">
            <div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        </div>
    </div>
    <style>
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</body>
</html>
```

### 4.3 Configure Walled Garden for Development
```bash
# Allow access to your development server
/ip hotspot walled-garden add dst-host=192.168.50.14 action=allow

# Allow access to Next.js development server
/ip hotspot walled-garden add dst-port=3000 action=allow

# Allow localhost access (if needed)
/ip hotspot walled-garden add dst-host=localhost action=allow
```

## 🔧 **Step 5: API Configuration for Remote Management**

### 5.1 Enable REST API
```bash
# Enable REST API service
/ip service set www port=80 disabled=no

# For HTTPS (recommended for production)
/ip service set www-ssl port=443 disabled=no certificate=auto
```

### 5.2 Enable RouterOS API
```bash
# Enable traditional API (for node-routeros)
/ip service set api port=8728 disabled=no
```

### 5.3 Create API User
```bash
# Create dedicated user for API access
/user add name=api-user password=dev-password-123 group=read

# For full management access (be careful!)
/user add name=api-admin password=dev-admin-123 group=full
```

## 🧪 **Step 6: Testing Configuration**

### 6.1 Test Basic Connectivity
```bash
# Check interfaces
/interface print

# Check IP addresses
/ip address print

# Check hotspot status
/ip hotspot print

# Check active users
/ip hotspot active print
```

### 6.2 Test WiFi Connection
1. Connect device to "PHSWEB-Free-WiFi"
2. Open browser and navigate to any website
3. Should be redirected to captive portal
4. Should redirect to your application at `http://192.168.50.14:3000/hotspot/awka`

### 6.3 Test API Connectivity
```bash
# Test from your development machine
curl -u api-user:dev-password-123 http://[ROUTER_IP]/rest/system/identity

# Test RouterOS API (if using node-routeros)
# Use the test endpoints in your application
```

## 🎯 **Step 7: Integration with PHSWEB Application**

### 7.1 Configure Router in Database
Access your application at `http://192.168.50.14:3000/hotspot` and add router configuration:

- **Location ID**: `awka`
- **Host**: `[YOUR_ROUTER_IP]` (check your router's actual IP)
- **Username**: `api-user`
- **Password**: `dev-password-123`
- **API Port**: `80` (for REST API)
- **Connection Type**: `api`

### 7.2 Test Integration
1. Visit `http://192.168.50.14:3000/hotspot` in your application
2. Should show "Awka" location with live stats
3. Active users should match those on the router
4. Connection status should show "Connected"

### 7.3 Test End-to-End Flow (Development)
1. Connect device to WiFi
2. Open browser → should redirect to captive portal
3. Captive portal → should redirect to `http://192.168.50.14:3000/hotspot/awka`
4. User should see location-specific landing page
5. After login, user should have internet access

## 🔒 **Step 8: Development Security Setup**

### 8.1 Basic Router Security (Development)
```bash
# Change default admin password
/user set admin password=dev-admin-password

# Keep services enabled for development
/ip service print

# Allow access from your development network
/ip service set www address=192.168.50.0/24
/ip service set api address=192.168.50.0/24
```

### 8.2 Development Firewall Configuration
```bash
# Allow established connections
/ip firewall filter add chain=input connection-state=established,related action=accept

# Allow your development machine to access API
/ip firewall filter add chain=input src-address=192.168.50.14 protocol=tcp dst-port=80,8728 action=accept

# Allow hotspot clients
/ip firewall filter add chain=input in-interface=bridge-lan action=accept

# Allow all for development (remove in production)
/ip firewall filter add chain=input src-address=192.168.50.0/24 action=accept
```

## 📝 **Development Configuration Summary**

After completing these steps, your development setup will be:

- **WiFi Network**: `PHSWEB-Free-WiFi` (Open)
- **Router IP**: `[YOUR_ROUTER_IP]`
- **Dev Server**: `http://192.168.50.14:3000`
- **Hotspot Redirect**: `http://192.168.50.14:3000/hotspot/awka`
- **API Access**: REST API on port 80, RouterOS API on port 8728
- **Application Integration**: Live stats and user management

## 🔧 **Development Testing Commands**

### Quick Commands for Your Router:

```bash
# 1. Configure walled garden for development server
/ip hotspot walled-garden add dst-host=192.168.50.14 action=allow

# 2. Check hotspot configuration
/ip hotspot print
/ip hotspot profile print

# 3. Make sure hotspot is active
/ip hotspot enable numbers=0

# 4. Test with a client device
/ip hotspot active print

# 5. Check walled garden entries
/ip hotspot walled-garden print
```

## 🎉 **Development Testing Steps**

### **Method 1: Direct Test Mode**
1. **Open browser**: `http://192.168.50.14:3000/hotspot/awka?test=true`
2. **Should show**: Location-specific landing page with test mode banner
3. **Test login**: Enter any username/password, should show test completion

### **Method 2: Full MikroTik Integration Test**
1. **Connect device to WiFi**: `PHSWEB-Free-WiFi`
2. **Open browser**: Try to visit any website
3. **Should redirect**: To your development server
4. **Should show**: Real hotspot login page with MikroTik parameters
5. **Test login**: Use router's configured users

### **Method 3: Dashboard Integration Test**
1. **Open dashboard**: `http://192.168.50.14:3000/hotspot`
2. **Add router config**: Using your router's actual IP and credentials
3. **Test connection**: Should show "Connected" status
4. **Check live stats**: Should display real user counts

---

**🎯 Development Success Indicators:**
- Test mode works: ✅ `http://192.168.50.14:3000/hotspot/awka?test=true`
- WiFi redirection works: ✅ Auto-redirects to development server
- Dashboard integration works: ✅ Shows live router stats
- End-to-end flow works: ✅ Complete login process functional

## 🎯 **Step 9: Public Access Setup**

### 9.1 Port Forwarding (if behind NAT)
If your router is behind another router/modem:
```bash
# On your main router/modem, forward these ports to your MikroTik:
# Port 80 → MikroTik_IP:80 (for REST API)
# Port 8728 → MikroTik_IP:8728 (for RouterOS API)
```

### 9.2 Dynamic DNS (Optional)
```bash
# Configure DDNS if you don't have static IP
/ip cloud set ddns-enabled=yes
/ip cloud print
# Note the DNS name for external access
```

## 📝 **Configuration Summary**

After completing these steps, your setup will be:

- **WiFi Network**: `PHSWEB-Free-WiFi` (Open)
- **Router IP**: `192.168.1.1`
- **DHCP Range**: `192.168.1.100-200`
- **Hotspot**: Redirects to `/hotspot/awka`
- **API Access**: REST API on port 80, RouterOS API on port 8728
- **Application Integration**: Live stats and user management

## 🔧 **Troubleshooting**

### Common Issues:
1. **No Internet**: Check WAN connection and gateway
2. **No WiFi**: Ensure wireless interface is enabled
3. **No Captive Portal**: Check hotspot configuration
4. **API Connection Failed**: Verify API service and credentials
5. **Redirect Not Working**: Check walled garden and HTML directory

### Debug Commands:
```bash
/log print where topics~"hotspot"
/ip hotspot active print
/ip hotspot host print
/interface monitor-traffic wlan1
```

## 🚀 **Next Steps**

1. Test the configuration following Step 6
2. Configure multiple locations (lagos, abuja) with different SSIDs
3. Set up user authentication in your application
4. Monitor performance through the dashboard
5. Configure bandwidth limiting and user profiles

---

**📞 Support**: If you encounter issues, check the router logs and ensure all services are running. Test each component individually before testing the full flow.

**🎉 Success Indicator**: When a device connects to WiFi and opens a browser, it should automatically redirect to `https://yourdomain.com/hotspot/awka` with the location-specific landing page. 