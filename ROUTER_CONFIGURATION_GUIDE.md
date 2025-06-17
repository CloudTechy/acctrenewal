# MikroTik Router Auto-Configuration System

## 🎯 Overview

This system provides automated MikroTik router configuration for hotspot functionality, allowing you to quickly set up and deploy hotspot locations with minimal manual intervention.

## 🚀 Features

### ✅ **Automated Configuration**
- **Network Setup**: Automatic IP addressing, DHCP, and routing configuration
- **Port Bridging**: All LAN ports (ether2-ether5) bridged, ether1 as WAN
- **WiFi Configuration**: Public wireless access point setup (open network)
- **Hotspot Setup**: Complete captive portal configuration
- **User Management**: Default user creation and profile setup
- **Walled Garden**: Automatic configuration for login page access

### ✅ **Public WiFi Optimized**
- **Open Network**: No WiFi password required for public access
- **Captive Portal**: User authentication through web portal
- **Multiple Port Support**: All LAN ports bridged for maximum connectivity
- **Secure by Design**: Authentication handled at application level

### ✅ **Web-Based Wizard**
- **Step-by-Step Interface**: Guided configuration process
- **Real-time Validation**: Configuration validation before deployment
- **Dry Run Mode**: Test configurations without making changes
- **Progress Tracking**: Visual feedback during configuration deployment

### ✅ **Smart Defaults**
- **Location-Based Configuration**: Automatic IP range assignment per location
- **Secure Defaults**: WPA2 security and strong password generation
- **Best Practices**: Following MikroTik configuration best practices

## 🛠 System Components

### 1. **Router Configuration Library** (`src/lib/router-config.ts`)
- `MikroTikConfigurator` class for router communication
- `NetworkConfig` interface for configuration parameters
- Validation and default generation functions

### 2. **API Endpoints**
- `POST /api/locations/[locationId]/configure` - Deploy configuration
- `GET /api/locations/[locationId]/configure` - Get current configuration

### 3. **Configuration Wizard** (`/configure-router`)
- Interactive web interface for router setup
- Step-by-step configuration process
- Real-time validation and testing

## 📋 Configuration Steps

### Step 1: Location Selection
Choose the hotspot location to configure from your existing locations.

### Step 2: Network Configuration
Configure basic network parameters:
- **Router Name**: Unique identifier for the router
- **LAN Network**: IP network range (e.g., 192.168.1.0/24)
- **Gateway IP**: Router's IP address (e.g., 192.168.1.1)
- **DHCP Range**: IP range for client devices
- **DNS Servers**: Primary and secondary DNS servers

### Step 3: WiFi Configuration
Set up public wireless access point:
- **Enable/Disable WiFi**: Toggle wireless functionality
- **SSID**: Network name visible to clients
- **Security Type**: Recommended 'None' for public WiFi
- **Password**: Optional for secured networks (not recommended for public)
- **Channel**: Optional specific channel selection

**Note**: For public hotspots, open WiFi networks are recommended as users authenticate through the captive portal, not WiFi passwords.

### Step 4: Hotspot Configuration
Configure captive portal:
- **Enable/Disable Hotspot**: Toggle captive portal
- **Hotspot Name**: Internal hotspot server name
- **Profile Name**: Hotspot profile identifier
- **Login Page URL**: URL for custom login page

### Step 5: User Management
Create default hotspot users:
- **Username/Password**: Login credentials
- **Profile**: User profile assignment
- **Add/Remove Users**: Dynamic user management

### Step 6: Review & Deploy
Final review and deployment:
- **Configuration Summary**: Review all settings
- **Dry Run Option**: Test without making changes
- **Deploy Configuration**: Apply settings to router

## 🔧 Technical Implementation

### Network Configuration Process

1. **Router Identity Setup**
   ```bash
   /system identity set name=PHSWEB-Location
   ```

2. **Bridge Creation (All LAN Ports)**
   ```bash
   /interface bridge add name=bridge-lan protocol-mode=rstp
   /interface bridge port add interface=ether2 bridge=bridge-lan
   /interface bridge port add interface=ether3 bridge=bridge-lan
   /interface bridge port add interface=ether4 bridge=bridge-lan
   /interface bridge port add interface=ether5 bridge=bridge-lan
   ```

3. **IP Configuration**
   ```bash
   /ip address add address=192.168.1.1/24 interface=bridge-lan
   ```

4. **DHCP Setup**
   ```bash
   /ip pool add name=dhcp-pool ranges=192.168.1.100-192.168.1.200
   /ip dhcp-server add interface=bridge-lan address-pool=dhcp-pool
   ```

### WiFi Configuration Process (Public Network)

1. **Open Network Setup**
   ```bash
   /interface wireless set wlan1 mode=ap-bridge ssid=PHSWEB-Guest security-profile=default
   ```

2. **Add WiFi to Bridge**
   ```bash
   /interface bridge port add interface=wlan1 bridge=bridge-lan
   ```

**Note**: No security profile creation needed for open networks.

### Hotspot Configuration Process

1. **Hotspot Profile**
   ```bash
   /ip hotspot profile add name=hsprof1 html-directory=hotspot login-by=username,http-chap
   ```

2. **Hotspot Server**
   ```bash
   /ip hotspot add name=hotspot1 interface=bridge-lan profile=hsprof1
   ```

3. **Walled Garden**
   ```bash
   /ip hotspot walled-garden add dst-host=yourdomain.com action=allow
   ```

## 🌐 API Usage

### Deploy Configuration
```javascript
POST /api/locations/awka/configure
{
  "config": {
    "routerName": "PHSWEB-Awka",
    "lanNetwork": "192.168.1.0/24",
    "lanGateway": "192.168.1.1",
    "wifiEnabled": true,
    "wifiSsid": "PHSWEB-Awka",
    "hotspotEnabled": true,
    "loginPageUrl": "https://yourdomain.com/hotspot/awka"
  },
  "dryRun": false
}
```

### Response
```javascript
{
  "success": true,
  "message": "Router configured successfully",
  "steps": [
    {
      "id": "identity",
      "title": "Set Router Identity",
      "description": "Setting router name to PHSWEB-Awka",
      "commands": ["/system identity set name=PHSWEB-Awka"]
    }
  ],
  "totalSteps": 15
}
```

## 🔒 Security Considerations

### Public WiFi Security
- **Open WiFi Network**: No WiFi password required
- **Captive Portal Authentication**: Users authenticate through web portal
- **Application-Level Security**: Authentication handled by hotspot system
- **Session Management**: User sessions managed through MikroTik hotspot

### Network Isolation
- **WAN Separation**: ether1 dedicated to WAN connection
- **LAN Bridging**: All client-facing ports bridged together
- **VLAN Support**: Can be extended for network segmentation if needed

### Router Access
- Use strong passwords for router access
- Limit API access to specific IP addresses
- Enable HTTPS for web interface access

### WiFi Security
- Default to WPA2-PSK or WPA3-PSK
- Generate strong WiFi passwords
- Regular password rotation

### Hotspot Security
- Secure user credential storage
- Session timeout configuration
- Bandwidth limiting per user

## 🚀 Getting Started

### Prerequisites
1. **MikroTik Router** with RouterOS 6.40+
2. **REST API Enabled** on the router
3. **Network Connectivity** between server and router
4. **Router Credentials** with sufficient permissions

### Quick Setup

1. **Access the Configuration Wizard**
   ```
   http://localhost:3000/configure-router
   ```

2. **Select Location**
   Choose from existing hotspot locations

3. **Configure Parameters**
   Follow the step-by-step wizard

4. **Test Configuration**
   Use dry run mode to validate settings

5. **Deploy Configuration**
   Apply settings to the router

### Environment Variables
```env
# Router Connection Details
MIKROTIK_AWKA_HOST=192.168.50.2
MIKROTIK_AWKA_USER=admin
MIKROTIK_AWKA_PASSWORD=your-password
MIKROTIK_AWKA_API_PORT=80

# Application Settings
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## 📊 Default Configurations

### Network Defaults by Location
- **Awka**: 192.168.1.0/24
- **Lagos**: 192.168.2.0/24
- **Abuja**: 192.168.3.0/24
- **Kano**: 192.168.4.0/24
- **Ibadan**: 192.168.5.0/24

### WiFi Defaults
- **SSID Pattern**: PHSWEB-{LocationName}
- **Security**: None (Open Network)
- **Password**: Not required for public WiFi
- **Bridge**: Added to bridge-lan with all other LAN ports

### Port Configuration
- **WAN Port**: ether1 (not bridged)
- **LAN Ports**: ether2, ether3, ether4, ether5 (all bridged)
- **WiFi**: wlan1 (bridged with LAN ports)

### Hotspot Defaults
- **Profile Pattern**: profile-{locationId}
- **Server Pattern**: hotspot-{locationId}
- **Login URL**: {APP_URL}/hotspot/{locationId}

## 🔧 Troubleshooting

### Common Issues

#### Connection Failed
```
Error: Failed to connect to router
```
**Solutions:**
- Verify router IP address and port
- Check network connectivity
- Ensure REST API is enabled
- Verify credentials

#### Configuration Timeout
```
Error: Request timeout after 15000ms
```
**Solutions:**
- Check router performance
- Reduce configuration complexity
- Increase timeout values
- Verify router resources

#### Invalid Configuration
```
Error: Invalid configuration - WiFi password required
```
**Solutions:**
- Review configuration parameters
- Use configuration validation
- Check required fields
- Follow format requirements

### Debug Commands

#### Test Router Connection
```bash
curl -u admin:password http://192.168.50.2:80/rest/system/identity
```

#### Check Current Configuration
```bash
curl -u admin:password http://192.168.50.2:80/rest/ip/hotspot
```

#### Monitor Configuration Progress
Check browser developer tools for API responses and error details.

## 📈 Advanced Features

### Custom Configuration Templates
Create location-specific configuration templates for consistent deployments.

### Bulk Configuration
Configure multiple routers simultaneously with different parameters.

### Configuration Backup
Automatic backup of router configurations before making changes.

### Monitoring Integration
Real-time monitoring of configured routers and automatic health checks.

## 🎯 Next Steps

1. **Test the Configuration Wizard**
   - Access `/configure-router`
   - Select a location
   - Configure network parameters
   - Deploy to router

2. **Verify Hotspot Functionality**
   - Connect to WiFi network
   - Test captive portal redirect
   - Verify login page functionality

3. **Monitor Router Status**
   - Check connection status in dashboard
   - Monitor active users
   - Review system performance

4. **Scale to Multiple Locations**
   - Configure additional routers
   - Implement consistent settings
   - Monitor network performance

## 📞 Support

For technical support or questions about the router configuration system:

- **Documentation**: Review this guide and API documentation
- **Logs**: Check browser developer tools and server logs
- **Testing**: Use dry run mode to validate configurations
- **Community**: Consult MikroTik documentation and forums

---

**🎉 Congratulations!** You now have a complete automated router configuration system for your hotspot network. The system handles everything from basic network setup to advanced hotspot configuration, making it easy to deploy and manage multiple locations. 