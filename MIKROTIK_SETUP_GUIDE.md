# MikroTik Hotspot Setup Guide for PHSWEB System

This guide will help you set up a MikroTik router to work with the PHSWEB hotspot system for testing and production use.

## Prerequisites

- MikroTik router with RouterOS 6.40+ (recommended 7.x)
- Access to router via Winbox, WebFig, or SSH
- Basic understanding of MikroTik configuration
- Your Next.js application running (locally or deployed)

## Step 1: Basic Router Configuration

### 1.1 Connect to Your MikroTik Router

**Via Winbox:**
1. Download Winbox from mikrotik.com
2. Connect to your router's IP (default: 192.168.88.1)
3. Login with admin credentials

**Via WebFig:**
1. Open browser and go to router's IP
2. Login with admin credentials

**Via SSH:**
```bash
ssh admin@192.168.88.1
```

### 1.2 Basic Network Setup

```bash
# Set up bridge for LAN and WLAN
/interface bridge add name=bridge-local

# Add ethernet and wireless interfaces to bridge
/interface bridge port
add bridge=bridge-local interface=ether2
add bridge=bridge-local interface=wlan1

# Set up IP address for the bridge
/ip address add address=192.168.1.1/24 interface=bridge-local

# Configure DHCP server
/ip pool add name=dhcp-pool ranges=192.168.1.100-192.168.1.200
/ip dhcp-server add address-pool=dhcp-pool disabled=no interface=bridge-local name=dhcp-server
/ip dhcp-server network add address=192.168.1.0/24 gateway=192.168.1.1 dns-server=8.8.8.8,8.8.4.4
```

## Step 2: WiFi Configuration

### 2.1 Configure Wireless Interface

```bash
# Set up wireless security profile
/interface wireless security-profiles
add name=hotspot-profile mode=none

# Configure wireless interface
/interface wireless
set [ find default-name=wlan1 ] disabled=no mode=ap-bridge band=2ghz-b/g/n \
    ssid="PHSWEB-Guest" security-profile=hotspot-profile
```

### 2.2 Enable Wireless Interface

```bash
/interface wireless enable wlan1
```

## Step 3: Hotspot Configuration

### 3.1 Create Hotspot Profile

```bash
# Create hotspot profile
/ip hotspot profile
add name=hsprof1 html-directory=hotspot login-by=username,http-chap \
    use-radius=no dns-name=phsweb.local

# Create user profile
/ip hotspot user profile
add name=default-user idle-timeout=30m keepalive-timeout=2m \
    shared-users=1 status-autorefresh=1m transparent-proxy=yes
```

### 3.2 Set Up Hotspot Server

```bash
# Create hotspot server
/ip hotspot
add address-pool=dhcp-pool disabled=no interface=bridge-local name=hotspot1 \
    profile=hsprof1
```

### 3.3 Configure Hotspot Network

```bash
# Set up hotspot network
/ip hotspot network
add address=192.168.1.0/24 gateway=192.168.1.1 dns-server=8.8.8.8,8.8.4.4
```

## Step 4: Integration with PHSWEB System

### 4.1 Configure Walled Garden

Add your domain to the walled garden so users can access the login page:

```bash
# Replace yourdomain.com with your actual domain
/ip hotspot walled-garden
add dst-host=yourdomain.com action=allow
add dst-host=*.yourdomain.com action=allow

# If testing locally, add your local IP
add dst-host=192.168.1.100 action=allow  # Replace with your dev machine IP
add dst-host=localhost action=allow

# Allow essential services
add dst-host=*.google.com action=allow
add dst-host=*.googleapis.com action=allow
add dst-host=fonts.googleapis.com action=allow
add dst-host=fonts.gstatic.com action=allow
```

### 4.2 Create Custom Login Page

**Method 1: File Upload (Recommended)**

1. Connect to router via FTP or Winbox Files
2. Navigate to `/flash/hotspot/`
3. Replace `login.html` with:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>PHSWEB Login</title>
    <meta http-equiv="refresh" content="0; url=https://yourdomain.com/hotspot/awka?$(query-string)">
</head>
<body>
    <div style="text-align: center; margin-top: 50px; font-family: Arial, sans-serif;">
        <h2>Redirecting to PHSWEB Login...</h2>
        <p>If you are not redirected automatically, <a href="https://yourdomain.com/hotspot/awka?$(query-string)">click here</a>.</p>
    </div>
</body>
</html>
```

**Method 2: RouterOS Command**

```bash
# Create login.html via command line
/file print
/file set login.html contents='<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>PHSWEB Login</title>
    <meta http-equiv="refresh" content="0; url=https://yourdomain.com/hotspot/awka?$(query-string)">
</head>
<body>
    <div style="text-align: center; margin-top: 50px; font-family: Arial, sans-serif;">
        <h2>Redirecting to PHSWEB Login...</h2>
        <p>If you are not redirected automatically, <a href="https://yourdomain.com/hotspot/awka?$(query-string)">click here</a>.</p>
    </div>
</body>
</html>'
```

### 4.3 Create Test Users

```bash
# Create test users for development
/ip hotspot user
add name=testuser password=testpass profile=default-user
add name=demo password=demo123 profile=default-user
add name=guest password=guest123 profile=default-user
```

## Step 5: RADIUS Integration (Optional)

If you want to integrate with your existing RADIUS server:

### 5.1 Configure RADIUS Client

```bash
# Add RADIUS server
/radius
add address=YOUR_RADIUS_SERVER_IP secret=YOUR_RADIUS_SECRET service=hotspot

# Enable RADIUS for hotspot
/ip hotspot profile
set hsprof1 use-radius=yes
```

### 5.2 Configure RADIUS Attributes

```bash
# Configure RADIUS settings
/radius incoming
set accept=yes port=3799
```

## Step 6: Testing Configuration

### 6.1 Local Development Testing

If testing with local development server:

1. **Find your development machine's IP:**
   ```bash
   # On Windows
   ipconfig
   
   # On Mac/Linux
   ifconfig
   ```

2. **Update walled garden:**
   ```bash
   /ip hotspot walled-garden
   add dst-host=192.168.1.100 action=allow  # Replace with your dev machine IP
   add dst-host=localhost:3000 action=allow
   ```

3. **Update login.html:**
   ```html
   <meta http-equiv="refresh" content="0; url=http://192.168.1.100:3000/hotspot/awka?$(query-string)">
   ```

### 6.2 Test the Hotspot

1. **Connect a device to the WiFi network** (PHSWEB-Guest)
2. **Open a web browser** and try to visit any website
3. **You should be redirected** to your PHSWEB login page
4. **Enter test credentials** (testuser/testpass)
5. **Verify successful login** and internet access

## Step 7: Multi-Location Setup

For multiple locations, repeat the setup with different:

- **Location IDs:** awka, lagos, abuja, etc.
- **IP Ranges:** 192.168.1.0/24, 192.168.2.0/24, etc.
- **SSIDs:** PHSWEB-Awka, PHSWEB-Lagos, etc.

### Example for Lagos Location:

```bash
# Different IP range for Lagos
/ip address add address=192.168.2.1/24 interface=bridge-local

# Different SSID
/interface wireless set wlan1 ssid="PHSWEB-Lagos"

# Update login.html
# url=https://yourdomain.com/hotspot/lagos?$(query-string)
```

## Step 8: Troubleshooting

### 8.1 Common Issues

**Users can't access login page:**
- Check walled garden configuration
- Verify DNS resolution
- Test login URL directly

**Login page loads but authentication fails:**
- Check user credentials
- Verify RADIUS configuration (if used)
- Check hotspot profile settings

**No internet after login:**
- Check NAT rules
- Verify routing configuration
- Check firewall rules

### 8.2 Debug Commands

```bash
# Check hotspot status
/ip hotspot active print

# Check user sessions
/ip hotspot user print

# Check logs
/log print where topics~"hotspot"

# Test walled garden
/ip hotspot walled-garden print
```

### 8.3 Useful Monitoring Commands

```bash
# Monitor active users
/ip hotspot active print interval=2

# Monitor user traffic
/ip hotspot user print stats

# Check system resources
/system resource print
```

## Step 9: Production Deployment

### 9.1 Security Considerations

```bash
# Change default passwords
/user set admin password=STRONG_PASSWORD

# Disable unnecessary services
/ip service disable telnet,ftp,www

# Enable only necessary services
/ip service enable ssh,winbox,www-ssl

# Configure firewall
/ip firewall filter
add chain=input action=accept protocol=icmp
add chain=input action=accept connection-state=established,related
add chain=input action=accept src-address=192.168.1.0/24
add chain=input action=drop
```

### 9.2 Backup Configuration

```bash
# Export configuration
/export file=backup-config

# Create system backup
/system backup save name=system-backup
```

## Step 10: Integration with PHSWEB Dashboard

### 10.1 Add Location in Dashboard

1. Access your PHSWEB hotspot management page
2. Click "Add Location"
3. Fill in details:
   - **Location ID:** awka
   - **Location Name:** Awka
   - **Display Name:** PHSWEB Awka Branch
   - **Router IP:** 192.168.1.1

### 10.2 Test Integration

1. **Access management dashboard:** `http://localhost:3000/hotspot`
2. **Verify location appears** in the list
3. **Test login URL** by clicking the external link
4. **Monitor user activity** through the dashboard

## Configuration Files

Save these configurations for easy deployment:

**basic-config.rsc:**
```bash
# Basic MikroTik configuration for PHSWEB Hotspot
/interface bridge add name=bridge-local
/interface bridge port add bridge=bridge-local interface=ether2
/interface bridge port add bridge=bridge-local interface=wlan1
/ip address add address=192.168.1.1/24 interface=bridge-local
/ip pool add name=dhcp-pool ranges=192.168.1.100-192.168.1.200
/ip dhcp-server add address-pool=dhcp-pool disabled=no interface=bridge-local name=dhcp-server
/ip dhcp-server network add address=192.168.1.0/24 gateway=192.168.1.1 dns-server=8.8.8.8,8.8.4.4
/interface wireless security-profiles add name=hotspot-profile mode=none
/interface wireless set wlan1 disabled=no mode=ap-bridge band=2ghz-b/g/n ssid="PHSWEB-Guest" security-profile=hotspot-profile
/ip hotspot profile add name=hsprof1 html-directory=hotspot login-by=username,http-chap use-radius=no dns-name=phsweb.local
/ip hotspot user profile add name=default-user idle-timeout=30m keepalive-timeout=2m shared-users=1 status-autorefresh=1m transparent-proxy=yes
/ip hotspot add address-pool=dhcp-pool disabled=no interface=bridge-local name=hotspot1 profile=hsprof1
/ip hotspot network add address=192.168.1.0/24 gateway=192.168.1.1 dns-server=8.8.8.8,8.8.4.4
/ip hotspot walled-garden add dst-host=yourdomain.com action=allow
/ip hotspot user add name=testuser password=testpass profile=default-user
```

That's it! Your MikroTik router should now be configured to work with the PHSWEB hotspot system. Remember to replace placeholder values with your actual domain and IP addresses. 