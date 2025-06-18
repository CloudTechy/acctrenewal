# MikroTik RouterOS API Documentation

## Overview

The MikroTik RouterOS API provides programmatic access to configure and manage RouterOS devices remotely. It follows the same command structure as the CLI but uses a binary protocol over TCP for efficient communication.

## 🔧 **API Connection & Authentication**

### Basic Connection
- **Default Port**: 8728 (TCP)
- **Secure Port**: 8729 (TCP with TLS)
- **Transport**: Binary protocol over TCP

### Authentication Process
```javascript
// Modern authentication (RouterOS 6.43+)
{
  command: '/login',
  arguments: {
    '=name': 'admin',
    '=password': 'password123'
  }
}
```

### API Services Configuration
```bash
# Enable API service
/ip service enable api
/ip service set api port=8728

# Enable API-SSL (secure)
/ip service enable api-ssl
/ip service set api-ssl port=8729
```

## 📡 **Network Interface Configuration**

### Bridge Configuration
```bash
# Create bridge
/interface bridge add name=bridge1 protocol-mode=rstp

# Add ports to bridge
/interface bridge port add interface=ether2 bridge=bridge1
/interface bridge port add interface=ether3 bridge=bridge1
/interface bridge port add interface=wlan1 bridge=bridge1
```

### IP Address Configuration
```bash
# Add IP addresses
/ip address add address=192.168.1.1/24 interface=bridge1
/ip address add address=10.0.0.2/30 interface=ether1
```

### DHCP Configuration
```bash
# Create IP pool
/ip pool add name=dhcp-pool ranges=192.168.1.100-192.168.1.200

# Create DHCP network
/ip dhcp-server network add address=192.168.1.0/24 gateway=192.168.1.1 dns-server=192.168.1.1

# Create DHCP server
/ip dhcp-server add interface=bridge1 address-pool=dhcp-pool disabled=no
```

## 🔥 **Firewall & NAT Configuration**

### Basic Firewall Rules
```bash
# Accept established/related connections
/ip firewall filter add chain=input connection-state=established,related action=accept

# Accept ICMP
/ip firewall filter add chain=input protocol=icmp action=accept

# Accept connections from LAN
/ip firewall filter add chain=input in-interface=bridge1 action=accept

# Drop all other input
/ip firewall filter add chain=input action=drop

# Forward chain rules
/ip firewall filter add chain=forward connection-state=established,related action=accept
/ip firewall filter add chain=forward connection-state=new in-interface=bridge1 action=accept
/ip firewall filter add chain=forward action=drop
```

### NAT Configuration
```bash
# Source NAT (masquerade)
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade
```

## 📶 **Wireless Configuration**

### Security Profile
```bash
# Create WPA2 security profile
/interface wireless security-profiles add \
  name=wifi-security \
  authentication-types=wpa2-psk \
  mode=dynamic-keys \
  wpa2-pre-shared-key=MyWiFiPassword123
```

### Wireless Interface Setup
```bash
# Configure wireless interface
/interface wireless set wlan1 \
  mode=ap-bridge \
  band=2ghz-b/g/n \
  channel-width=20/40mhz-Ce \
  frequency=auto \
  ssid=MyNetwork \
  security-profile=wifi-security \
  disabled=no
```

## 🔓 **Hotspot Configuration**

### Hotspot Setup Commands
```bash
# Create hotspot profile
/ip hotspot profile add name=hsprof1 hotspot-address=192.168.1.1

# Create IP pool for hotspot
/ip pool add name=hs-pool ranges=192.168.1.50-192.168.1.99

# Create hotspot server
/ip hotspot add name=hotspot1 interface=wlan1 address-pool=hs-pool profile=hsprof1

# Create hotspot user
/ip hotspot user add name=admin password=admin profile=default
```

### Hotspot with Custom Login Page
```bash
# Upload custom login page files to /hotspot directory
# Files needed: login.html, alogin.html, status.html, logout.html

# Set custom directory
/ip hotspot profile set hsprof1 html-directory=hotspot
```

## 🌐 **Routing Configuration**

### Static Routes
```bash
# Add default route
/ip route add dst-address=0.0.0.0/0 gateway=10.0.0.1

# Add specific routes
/ip route add dst-address=192.168.2.0/24 gateway=192.168.1.254
```

### Dynamic Routing (OSPF)
```bash
# Enable OSPF
/routing ospf instance set default disabled=no

# Add OSPF area
/routing ospf area add name=backbone area-id=0.0.0.0

# Add OSPF network
/routing ospf network add network=192.168.1.0/24 area=backbone
```

## 🔒 **Security Configuration**

### User Management
```bash
# Create new user
/user add name=apiuser password=securepassword group=full

# Create read-only user
/user add name=readonly password=password123 group=read

# Disable default admin (after creating new user)
/user set admin disabled=yes
```

### Service Security
```bash
# Disable unnecessary services
/ip service disable telnet,ftp,www

# Change default ports
/ip service set ssh port=2222
/ip service set winbox port=8292

# Restrict access by IP
/ip service set ssh address=192.168.1.0/24
/ip service set api address=192.168.1.100/32
```

## 📊 **Monitoring & Management**

### System Information
```bash
# Get system info
/system resource print
/system identity print
/system routerboard print
```

### Interface Statistics
```bash
# Monitor interfaces
/interface print stats
/interface monitor-traffic interface=ether1 duration=10
```

### Active Connections
```bash
# View active users
/ip hotspot active print
/interface wireless registration-table print
```

## 🔄 **API Command Structure**

### Command Format
Every API command consists of:
1. **Command Word**: Starts with `/` (e.g., `/interface/wireless/set`)
2. **Attribute Words**: Start with `=` (e.g., `=name=wlan1`)
3. **Query Words**: Start with `?` (e.g., `?type=ether`)
4. **API Attribute Words**: Start with `.` (e.g., `.tag=12345`)

### Common Commands

#### Print (List) Items
```bash
/interface print
/ip address print
/ip firewall filter print
```

#### Add New Items
```bash
/ip address add address=192.168.1.1/24 interface=ether1
/interface bridge add name=bridge1
```

#### Modify Existing Items
```bash
/interface set ether1 disabled=no
/ip address set 0 address=192.168.1.2/24
```

#### Remove Items
```bash
/ip address remove 0
/interface bridge remove bridge1
```

### Query Examples
```bash
# Find specific interfaces
/interface print ?type=ether

# Find disabled interfaces  
/interface print ?disabled=yes

# Complex queries with operators
/ip firewall filter print ?chain=input ?action=accept
```

## 🚀 **Complete Router Setup Script**

### Basic Router Configuration
```bash
# System identification
/system identity set name=RouterLocation-001

# Create bridge for LAN
/interface bridge add name=bridge-lan protocol-mode=rstp

# Add LAN ports to bridge
/interface bridge port add interface=ether2 bridge=bridge-lan
/interface bridge port add interface=ether3 bridge=bridge-lan
/interface bridge port add interface=ether4 bridge=bridge-lan
/interface bridge port add interface=ether5 bridge=bridge-lan

# Configure IP addresses
/ip address add address=192.168.1.1/24 interface=bridge-lan

# Setup DHCP
/ip pool add name=dhcp-pool ranges=192.168.1.100-192.168.1.200
/ip dhcp-server network add address=192.168.1.0/24 gateway=192.168.1.1 dns-server=8.8.8.8,8.8.4.4
/ip dhcp-server add interface=bridge-lan address-pool=dhcp-pool disabled=no name=dhcp-server

# Configure NAT
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade

# Basic firewall
/ip firewall filter add chain=input connection-state=established,related action=accept
/ip firewall filter add chain=input in-interface=bridge-lan action=accept
/ip firewall filter add chain=input protocol=icmp action=accept
/ip firewall filter add chain=input action=drop

# DNS settings
/ip dns set servers=8.8.8.8,8.8.4.4 allow-remote-requests=yes
```

## 🔧 **Automated Configuration via API**

### JavaScript/Node.js Example
```javascript
const RouterOSAPI = require('node-routeros').RouterOSAPI;

const api = new RouterOSAPI({
    host: '192.168.1.1',
    user: 'admin',
    password: 'password',
    port: 8728
});

// Connect and configure
api.connect().then(() => {
    // Create bridge
    return api.write('/interface/bridge/add', {
        '=name': 'bridge1'
    });
}).then(() => {
    // Add IP address
    return api.write('/ip/address/add', {
        '=address': '192.168.1.1/24',
        '=interface': 'bridge1'
    });
}).then(() => {
    console.log('Configuration complete');
}).catch(err => {
    console.error('Error:', err);
});
```

## 📋 **Error Handling**

### Common Error Categories
- **Category 0**: Missing item or command
- **Category 1**: Argument value failure  
- **Category 2**: Execution interrupted
- **Category 3**: Scripting failure
- **Category 4**: General failure
- **Category 5**: API related failure

### Error Response Format
```json
{
  "type": "!trap",
  "category": "1",
  "message": "input does not match any value of interface"
}
```

## 🔐 **Security Best Practices**

### API Security
1. **Use API-SSL** for encrypted connections
2. **Create dedicated API users** with minimal permissions
3. **Restrict API access by IP address**
4. **Use strong passwords** for API users
5. **Monitor API connections** in logs
6. **Disable API when not needed**

### Network Security
```bash
# Restrict API access
/ip service set api address=10.0.0.100/32

# Enable API logging
/system logging add topics=api action=memory

# Monitor connections
/log print where topics~"api"
```

## 📈 **Performance Considerations**

### Connection Optimization
- **Reuse connections** when possible
- **Use connection pooling** for multiple operations
- **Batch commands** to reduce round trips
- **Set appropriate timeouts** (10s connection, 5s query)

### Resource Monitoring
```bash
# Monitor system resources
/system resource print
/system resource monitor duration=10

# Monitor CPU and memory
/system health print
```

## 🛠 **Advanced Features**

### Scripting Support
```bash
# Create script
/system script add name=backup-config source={
    /export file=daily-backup
    /tool e-mail send to=admin@company.com subject="Backup" file=daily-backup.rsc
}

# Schedule script
/system scheduler add name=daily-backup on-event=backup-config interval=1d
```

### Custom Functions
```bash
# Function to reset interface
:global resetInterface do={
    :local int $1;
    /interface disable $int;
    :delay 2s;
    /interface enable $int;
}
```

This comprehensive API documentation provides everything needed to programmatically configure MikroTik routers from basic networking to advanced features like hotspots and wireless access points. 