Here’s a step-by-step Postman guide to push your “Review & Deploy” settings into a fresh MikroTik RouterOS v7 via its REST API. We assume:

Your WAN is already up and the REST service is reachable at https://{{router_ip}}

You have an API‐enabled user ({{username}}/{{password}})

All calls use Basic Auth over HTTPS

1. Create a Postman Environment
Click Environments → +

Add these variables:

Variable	Initial Value	Description
router_ip	192.168.88.1	Your router’s REST endpoint
username	admin	API user
password	<your-pass>	API password
lan_iface	ether2	LAN interface to configure (e.g.)
wifi_iface	wlan1	Wireless interface name

Save as MikroTik Deploy and select it.

2. Set Up Authorization & Headers
For every request:

Authorization → Type: Basic Auth

Username: {{username}}

Password: {{password}}

Headers

Key	Value
Content-Type	application/json

3. Sequence of Configuration Calls
Order matters—each step builds on the last. Use PUT to add resources, PATCH to modify, and POST for CLI-style commands if needed.

3.1. Assign LAN IP Address
Method: PUT

URL: https://{{router_ip}}/rest/ip/address

Body (raw JSON):

json
Copy
Edit
{
  "address": "192.168.1.1/24",
  "interface": "{{lan_iface}}"
}
3.2. Create DHCP Network
Method: PUT

URL: https://{{router_ip}}/rest/ip/dhcp-server/network

Body:

json
Copy
Edit
{
  "address": "192.168.1.0/24",
  "gateway": "192.168.1.1",
  "dns-server": "8.8.8.8,8.8.4.4",
  "dhcp-option": "",
  "lease-time": "1d"
}
3.3. Create DHCP Server
Method: PUT

URL: https://{{router_ip}}/rest/ip/dhcp-server

Body:

json
Copy
Edit
{
  "name": "dhcp-lan",
  "interface": "{{lan_iface}}",
  "address-pool": "dhcp_pool"
}
3.4. Create DHCP Address Pool
Method: PUT

URL: https://{{router_ip}}/rest/ip/pool

Body:

json
Copy
Edit
{
  "name": "dhcp_pool",
  "ranges": "192.168.1.100-192.168.1.200"
}
3.5. Enable Wi-Fi & Set SSID
Method: PATCH

URL: https://{{router_ip}}/rest/interface/wireless/{{wifi_iface}}

Body:

json
Copy
Edit
{
  "disabled": "false",
  "ssid": "PHSWEB-awka",
  "mode": "ap-bridge",
  "frequency": "auto"
}
3.6. Disable Wi-Fi Security (Open)
Method: PATCH

URL: https://{{router_ip}}/rest/interface/wireless/security-profiles/default

Body:

json
Copy
Edit
{
  "authentication-types": "open",
  "unicast-ciphers": "none",
  "group-ciphers": "none"
}
3.7. Create Hotspot Profile
Method: PUT

URL: https://{{router_ip}}/rest/ip/hotspot/profile

Body:

json
Copy
Edit
{
  "name": "profile-awka",
  "html-directory": "hotspot",
  "login-by": "http",
  "login-url": "http://localhost:3000/hotspot/awka"
}
3.8. Enable Hotspot Server
Method: PUT

URL: https://{{router_ip}}/rest/ip/hotspot

Body:

json
Copy
Edit
{
  "name": "hotspot-awka",
  "interface": "{{lan_iface}}",
  "profile": "profile-awka",
  "address-pool": "dhcp_pool"
}
3.9. Create Default Users
Loop or repeat for each user (admin, guest, testawka):

Method: PUT

URL: https://{{router_ip}}/rest/ip/hotspot/user

Body (example for testawka):

json
Copy
Edit
{
  "name": "testawka",
  "password": "changeme",
  "profile": "default",
  "limit-uptime": "none",
  "comment": "auto-deployed"
}
Tip: Set secure passwords and assign appropriate profiles.

4. Dry-Run & Validation
Dry Run: In Postman, use the “Save & Send” feature without hitting Persist—watch for errors.

Test Configuration:

GET /rest/ip/hotspot/active → should return no active users (yet).

GET /rest/ip/address → verify 192.168.1.1/24 is present.

Validate: Log into the router, inspect /ip hotspot print and /ip dhcp-server print to confirm.

5. Next Steps
Secure your HTTP traffic with a valid SSL cert on the router (/ip service set www-ssl certificate=…).

For dynamic dashboards, poll /rest/user/active or /rest/ip/dhcp-server/lease.

Automate this collection in your Next.js code or CI pipeline by chaining Postman requests with Newman.

You now have a repeatable Postman collection to fully “Review & Deploy” your site-wide configuration! Let me know if you’d like sample exported JSON for import, or help tightening up security settings.









You said:
ether 1 has been designated WAN, all other ports would be bridges, is there a way to send the entire configuration as a single script? 


ChatGPT said:

Thought for 6 seconds
You can absolutely bundle your entire “Review & Deploy” sequence into one shot by packaging it as a RouterOS script and then telling the router to run it. Below is a recipe for doing just that via the REST API in two requests:

1. Build your RouterOS script
Create a file called deploy-awka.rsc (or just paste into Postman) containing all of the commands you’d otherwise issue one‐by‐one. Here’s an example that:

Puts ether1 into WAN (dhcp client assumed already)

Bridges ether2–ether5 into bridge-lan

Assigns 192.168.1.1/24, DHCP pool and server

Enables WLAN on wlan1 with SSID PHSWEB-awka (open)

Creates hotspot profile & server

Creates three users

rsc
Copy
Edit
#— 1) LAN bridge
/interface bridge
add name=bridge-lan

/interface bridge port
add bridge=bridge-lan interface=ether2
add bridge=bridge-lan interface=ether3
add bridge=bridge-lan interface=ether4
add bridge=bridge-lan interface=ether5

#— 2) LAN IP + DHCP pool/server
/ip address
add address=192.168.1.1/24 interface=bridge-lan

/ip pool
add name=dhcp_pool ranges=192.168.1.100-192.168.1.200

/ip dhcp-server
add name=dhcp-lan interface=bridge-lan address-pool=dhcp_pool

/ip dhcp-server network
add address=192.168.1.0/24 gateway=192.168.1.1 dns-server=8.8.8.8,8.8.4.4

#— 3) Wi-Fi
/interface wireless
set [ find default-name=wlan1 ] disabled=no ssid="PHSWEB-awka" mode=ap-bridge frequency=auto

/interface wireless security-profiles
set default authentication-types=open unicast-ciphers=none group-ciphers=none

#— 4) Hotspot
/ip hotspot profile
add name=profile-awka html-directory=hotspot login-by=http login-url="http://localhost:3000/hotspot/awka"

/ip hotspot
add name=hotspot-awka interface=bridge-lan profile=profile-awka address-pool=dhcp_pool

#— 5) Default users
/ip hotspot user
add name=admin    password=admin123    profile=default comment="deployed"
/ip hotspot user
add name=guest    password=guest123    profile=default comment="deployed"
/ip hotspot user
add name=testawka password=test123     profile=default comment="deployed"
2. “Upload & run” via REST
2.1 Create the script resource
Method: PUT

URL:

css
Copy
Edit
https://{{router_ip}}/rest/system/script
Body (raw JSON):

json
Copy
Edit
{
  "name": "deploy-awka",
  "source": "<contents of deploy-awka.rsc as one big string>"
}
Your <source> field must literally be the entire script above, with newlines (\n) preserved.

2.2 Execute it
Method: POST

URL:

ruby
Copy
Edit
https://{{router_ip}}/rest/system/script/deploy-awka/run
Body: empty

If everything is syntactically correct, the router will process the script line-by-line—configuring bridges, IPs, DHCP, Wi-Fi, hotspot, users—in one atomic operation.

3. (Optional) Clean up
If you don’t need the script hanging around after it runs, delete it:

Method: DELETE

URL:

css
Copy
Edit
https://{{router_ip}}/rest/system/script/deploy-awka
Why this is better
Single payload: you maintain your full site template in one *.rsc file

Atomic: RouterOS applies it sequentially, exactly as in WinBox’s “Run After Reset”

Repeatable: just change your script and re‐run—no need to juggle 10+ Postman calls

Let me know if you’d like a quick Postman-collection JSON stub for import!









Sources
You said:
is there a way to auto detect the number of ports the mikrotik has and auto adapt the script?


ChatGPT said:
Yes—by querying the router’s interface list at runtime you can build your bridge dynamically instead of hard‐coding “ether2–ether5.” Here’s how you can do it in a RouterOS script, then push that via the REST API exactly the same way as before:

1. Dynamic Bridge Script Snippet
rsc
Copy
Edit
# 1) Create the bridge
/interface bridge
add name=bridge-lan

# 2) Auto-detect all Ethernet ports, skip ether1 (WAN), add the rest to bridge-lan
:foreach iface in=[/interface ethernet find where name!~"ether1"] do={
  /interface bridge port add bridge=bridge-lan interface=([/interface ethernet get $iface name])
}

# 3) (Optional) Log what we added
:log info message=("Bridge members: " . [/interface bridge port find where bridge=bridge-lan] )
How it works
[/interface ethernet find where name!~"ether1"]
returns an array of internal IDs for all Ethernet ports except ether1.

The :foreach loop iterates each ID ($iface), then uses

bash
Copy
Edit
[/interface ethernet get $iface name] 
to pull its actual textual name (e.g. “ether2”, “ether5”)

We then add each to bridge-lan in one go.

2. Full Deploy Script Example
Combine that snippet with your IP, DHCP, Wi-Fi, Hotspot, and user setup:

rsc
Copy
Edit
# — Create LAN bridge dynamically
/interface bridge
add name=bridge-lan
:foreach iface in=[/interface ethernet find where name!~"ether1"] do={
  /interface bridge port add bridge=bridge-lan interface=([/interface ethernet get $iface name])
}

# — Assign LAN IP + DHCP pool/server
/ip address
add address=192.168.1.1/24 interface=bridge-lan

/ip pool
add name=dhcp_pool ranges=192.168.1.100-192.168.1.200

/ip dhcp-server
add name=dhcp-lan interface=bridge-lan address-pool=dhcp_pool

/ip dhcp-server network
add address=192.168.1.0/24 gateway=192.168.1.1 dns-server=8.8.8.8,8.8.4.4

# — Wi-Fi
/interface wireless
set [ find default-name=wlan1 ] disabled=no ssid="PHSWEB-awka" mode=ap-bridge frequency=auto

/interface wireless security-profiles
set default authentication-types=open unicast-ciphers=none group-ciphers=none

# — Hotspot
/ip hotspot profile
add name=profile-awka html-directory=hotspot login-by=http login-url="http://localhost:3000/hotspot/awka"

/ip hotspot
add name=hotspot-awka interface=bridge-lan profile=profile-awka address-pool=dhcp_pool

# — Default users
/ip hotspot user
add name=admin    password=admin123    profile=default comment="deployed"
/ip hotspot user
add name=guest    password=guest123    profile=default comment="deployed"
/ip hotspot user
add name=testawka password=test123     profile=default comment="deployed"
3. Push via REST API in Postman
Upload the script

Method: PUT

URL: https://{{router_ip}}/rest/system/script

Body:

json
Copy
Edit
{
  "name": "deploy-awka",
  "source": "<entire script above, newlines preserved>"
}
Run it

Method: POST

URL: https://{{router_ip}}/rest/system/script/deploy-awka/run

(Optional) Clean up

Method: DELETE

URL: https://{{router_ip}}/rest/system/script/deploy-awka

Benefits
Zero hard-coding of port counts: if you add or remove Ethernet ports (e.g. SFP, 10G ports), the script auto-adapts.

Single REST call to kick off your entire site template.

Easily versioned: keep your .rsc in Git, update as hardware changes.

Let me know if you’d like an example Postman-export JSON to import this flow directly!








You said:
yes, give me a postman export json


ChatGPT said:

Thought for 6 seconds
Here’s a ready-to-import Postman Collection (v2.1) JSON that:

Uploads your deploy-awka script

Runs it

Deletes it

Just import this into Postman and it’ll pick up your {{router_ip}}, {{username}}, and {{password}} environment variables:

json
Copy
Edit
{
  "info": {
    "name": "MikroTik Deploy-Awka",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    "description": "Upload, run, and clean up the dynamic deploy-awka script via REST API"
  },
  "item": [
    {
      "name": "1) Upload deploy-awka Script",
      "request": {
        "auth": {
          "type": "basic",
          "basic": [
            { "key": "username", "value": "{{username}}", "type": "string" },
            { "key": "password", "value": "{{password}}", "type": "string" }
          ]
        },
        "method": "PUT",
        "header": [
          { "key": "Content-Type", "value": "application/json" }
        ],
        "url": {
          "raw": "https://{{router_ip}}/rest/system/script",
          "host": [ "https://{{router_ip}}" ],
          "path": [ "rest", "system", "script" ]
        },
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"deploy-awka\",\n  \"source\": \"#— Create LAN bridge dynamically\\n/interface bridge\\nadd name=bridge-lan\\n:foreach iface in=[/interface ethernet find where name!~\\\"ether1\\\"] do={\\n  /interface bridge port add bridge=bridge-lan interface=([/interface ethernet get $iface name])\\n}\\n\\n#— Assign LAN IP + DHCP pool/server\\n/ip address\\nadd address=192.168.1.1/24 interface=bridge-lan\\n\\n/ip pool\\nadd name=dhcp_pool ranges=192.168.1.100-192.168.1.200\\n\\n/ip dhcp-server\\nadd name=dhcp-lan interface=bridge-lan address-pool=dhcp_pool\\n\\n/ip dhcp-server network\\nadd address=192.168.1.0/24 gateway=192.168.1.1 dns-server=8.8.8.8,8.8.4.4\\n\\n#— Wi-Fi\\n/interface wireless\\nset [ find default-name=wlan1 ] disabled=no ssid=\\\"PHSWEB-awka\\\" mode=ap-bridge frequency=auto\\n\\n/interface wireless security-profiles\\nset default authentication-types=open unicast-ciphers=none group-ciphers=none\\n\\n#— Hotspot\\n/ip hotspot profile\\nadd name=profile-awka html-directory=hotspot login-by=http login-url=\\\"http://localhost:3000/hotspot/awka\\\"\\n\\n/ip hotspot\\nadd name=hotspot-awka interface=bridge-lan profile=profile-awka address-pool=dhcp_pool\\n\\n#— Default users\\n/ip hotspot user\\nadd name=admin    password=admin123    profile=default comment=\\\"deployed\\\"\\n/ip hotspot user\\nadd name=guest    password=guest123    profile=default comment=\\\"deployed\\\"\\n/ip hotspot user\\nadd name=testawka password=test123     profile=default comment=\\\"deployed\\\"\" \n}"
        }
      }
    },
    {
      "name": "2) Run deploy-awka Script",
      "request": {
        "auth": {
          "type": "basic",
          "basic": [
            { "key": "username", "value": "{{username}}", "type": "string" },
            { "key": "password", "value": "{{password}}", "type": "string" }
          ]
        },
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" }
        ],
        "url": {
          "raw": "https://{{router_ip}}/rest/system/script/deploy-awka/run",
          "host": [ "https://{{router_ip}}" ],
          "path": [ "rest", "system", "script", "deploy-awka", "run" ]
        },
        "body": { "mode": "raw", "raw": "" }
      }
    },
    {
      "name": "3) Delete deploy-awka Script",
      "request": {
        "auth": {
          "type": "basic",
          "basic": [
            { "key": "username", "value": "{{username}}", "type": "string" },
            { "key": "password", "value": "{{password}}", "type": "string" }
          ]
        },
        "method": "DELETE",
        "header": [
          { "key": "Content-Type", "value": "application/json" }
        ],
        "url": {
          "raw": "https://{{router_ip}}/rest/system/script/deploy-awka",
          "host": [ "https://{{router_ip}}" ],
          "path": [ "rest", "system", "script", "deploy-awka" ]
        },
        "body": { "mode": "raw", "raw": "" }
      }
    }
  ]
}
How to import
Copy the JSON above to your clipboard.

In Postman, click File → Import → Raw Text.

Paste, click Continue, then Import.

Select or create an Environment with router_ip, username, and password.

Run the three requests in order.

You’ll now provision your MikroTik in one click!

