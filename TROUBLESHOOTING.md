# MikroTik Integration Troubleshooting Guide

## 🎯 **Issue Resolved: Build Error Fixed**

The original `source-map-support` module error has been **successfully resolved**! Here's what was fixed:

### ✅ **What Was Fixed**
1. **Dynamic Import**: Changed from static import to dynamic import of `node-routeros`
2. **Server-Side Only**: Ensured MikroTik API only runs on server-side (API routes)
3. **Dependencies**: Added `source-map-support` package
4. **Type Safety**: Added proper TypeScript handling for third-party library

### ✅ **Current Status**
- ✅ Build successful (`npm run build` works)
- ✅ Development server starts (`npm run dev` works)
- ✅ No more `source-map-support` errors
- ✅ TypeScript compilation successful

## 🧪 **Manual Testing Steps**

### Step 1: Test Your Router Connectivity

1. **Update the test script** with your actual router details:
   ```bash
   # Edit test-mikrotik-connection.js
   # Update the TEST_ROUTERS array with your router IPs and credentials
   ```

2. **Run the connection test**:
   ```bash
   npm run test-mikrotik
   ```

3. **Expected output for successful connection**:
   ```
   🔄 Testing connection to Awka Router (192.168.1.1)...
   ✅ Connected to Awka Router
   📊 Getting system information...
      Router Name: MikroTik
      Version: 7.x.x
      Uptime: 1d2h3m4s
      CPU Load: 5%
   🌐 Testing hotspot functionality...
      Hotspot Servers: 1
      Active Users: 3
      Total Users: 25
   ✅ Awka Router test completed successfully
   ```

### Step 2: Test the API Endpoints

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Test the hotspot stats API**:
   ```bash
   # Test all locations
   curl http://localhost:3000/api/hotspot/stats
   
   # Test specific location
   curl http://localhost:3000/api/hotspot/stats?location=awka
   ```

3. **Test router connection**:
   ```bash
   curl -X POST http://localhost:3000/api/hotspot/stats \
     -H "Content-Type: application/json" \
     -d '{
       "host": "192.168.1.1",
       "user": "admin",
       "password": "your-password",
       "port": 8728
     }'
   ```

### Step 3: Test the Frontend Dashboard

1. **Open the hotspot dashboard**:
   ```
   http://localhost:3000/hotspot
   ```

2. **Check for real-time data**:
   - Should show actual router data instead of mock data
   - Auto-refresh every 30 seconds
   - Connection status indicators

## 🔧 **Common Issues & Solutions**

### Issue 1: Connection Timeout
**Symptoms**: `Connection timeout` or `ECONNREFUSED`
**Solutions**:
```bash
# Check network connectivity
ping 192.168.1.1

# Check if API port is open
telnet 192.168.1.1 8728

# Enable API service on MikroTik
/ip service enable api
/ip service set api port=8728
```

### Issue 2: Authentication Failed
**Symptoms**: `Authentication failed` or `Login failed`
**Solutions**:
```bash
# Check credentials on MikroTik
/user print

# Create API user if needed
/user add name=api-user password=secure-password group=full

# Test login via Winbox/WebFig first
```

### Issue 3: Permission Denied
**Symptoms**: `Permission denied` for hotspot commands
**Solutions**:
```bash
# Check user permissions
/user group print

# Add hotspot permissions
/user group set api-group policy=api,read,write,policy,test,winbox,password,web,sniff,sensitive,romon
```

### Issue 4: Firewall Blocking
**Symptoms**: Connection works locally but not remotely
**Solutions**:
```bash
# Check firewall rules
/ip firewall filter print

# Add API access rule
/ip firewall filter add chain=input protocol=tcp dst-port=8728 action=accept comment="API Access"
```

### Issue 5: SSL/TLS Issues
**Symptoms**: Certificate errors or SSL handshake failures
**Solutions**:
```bash
# Use regular API port instead of API-SSL
port: 8728  # instead of 8729

# Or configure certificates properly
/certificate import file-name=your-cert.crt
```

## 🌐 **Network Configuration Checklist**

### Router Requirements
- [ ] MikroTik RouterOS 6.0 or higher
- [ ] API service enabled (`/ip service enable api`)
- [ ] API port accessible (default 8728)
- [ ] User with sufficient permissions
- [ ] Network connectivity from your server

### Firewall Configuration
```bash
# Allow API access
/ip firewall filter add chain=input protocol=tcp dst-port=8728 action=accept

# Allow web access for hotspot pages
/ip firewall filter add chain=input protocol=tcp dst-port=80 action=accept
/ip firewall filter add chain=input protocol=tcp dst-port=443 action=accept
```

### User Permissions
```bash
# Create dedicated API user
/user add name=hotspot-api password=secure-password group=full

# Or create custom group with minimal permissions
/user group add name=hotspot-group policy=api,read,write,test
/user add name=hotspot-api password=secure-password group=hotspot-group
```

## 📊 **Environment Variables Setup**

Update your `.env.local` file with working router credentials:

```env
# Awka Location
MIKROTIK_AWKA_HOST=192.168.1.1
MIKROTIK_AWKA_USER=admin
MIKROTIK_AWKA_PASSWORD=your-password
MIKROTIK_AWKA_PORT=8728

# Lagos Location
MIKROTIK_LAGOS_HOST=192.168.2.1
MIKROTIK_LAGOS_USER=admin
MIKROTIK_LAGOS_PASSWORD=your-password
MIKROTIK_LAGOS_PORT=8728

# Abuja Location
MIKROTIK_ABUJA_HOST=192.168.3.1
MIKROTIK_ABUJA_USER=admin
MIKROTIK_ABUJA_PASSWORD=your-password
MIKROTIK_ABUJA_PORT=8728
```

## 🚀 **Next Steps for Automation**

Once manual testing is successful:

1. **Phase 1**: Verify real-time monitoring works
2. **Phase 2**: Implement router configuration wizard
3. **Phase 3**: Add automated hotspot setup
4. **Phase 4**: Deploy location-specific branding

## 📞 **Getting Help**

If you encounter issues:

1. **Check the console logs** in your browser developer tools
2. **Check the server logs** in your terminal
3. **Run the test script** to isolate connection issues
4. **Verify router configuration** using Winbox/WebFig
5. **Test network connectivity** using ping/telnet

## 🔍 **Debug Commands**

### Test Router Connectivity
```bash
# Basic connectivity
ping 192.168.1.1

# API port check
telnet 192.168.1.1 8728

# Test with curl (if HTTP API is enabled)
curl -u admin:password http://192.168.1.1/rest/system/identity
```

### MikroTik Debug Commands
```bash
# Check API service
/ip service print where name=api

# Check active API sessions
/system logging add topics=api

# Monitor API traffic
/log print where topics~"api"
```

### Application Debug
```bash
# Check API endpoint
curl -v http://localhost:3000/api/hotspot/stats

# Check environment variables
node -e "console.log(process.env.MIKROTIK_AWKA_HOST)"

# Test connection script
npm run test-mikrotik
```

---

**Remember**: The build error is now fixed! Focus on testing the actual router connectivity and API functionality. 