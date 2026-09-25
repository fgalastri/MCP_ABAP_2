# 🚀 HTTP Thin Client V2 - Deployment Guide

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ CURSOR (Anywhere in the world)                                  │
│                                                                 │
│  User works with AI agent in Cursor                            │
│  Connects to remote MCP via HTTP                               │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTPS (secure)
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ REMOTE CLOUD SERVER (Your infrastructure)                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ server_http_thin_v2.js                                  │  │
│  │ (HTTP Bridge)                                            │  │
│  │                                                           │  │
│  │ ✅ 40 Tools exposed via HTTP                            │  │
│  │ ✅ All your proprietary ADT logic                       │  │
│  │ ✅ API key authentication                               │  │
│  └────────────────┬────────────────────────────────────────┘  │
│                   │ spawns & controls                          │
│                   ↓                                            │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ server_adt_thin_v2.js                                   │  │
│  │ (Stdio mode - child process)                            │  │
│  │                                                           │  │
│  │ ✅ All 40 thin_v2_* tools                               │  │
│  │ ✅ ALL ADT logic (from server_adt.js)                  │  │
│  │ ✅ Generates HTTP call specs                           │  │
│  └────────────────┬────────────────────────────────────────┘  │
└───────────────────┼──────────────────────────────────────────┘
                    │ returns call spec
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│ CUSTOMER'S LOCAL MACHINE (Inside VPN)                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ simple-agent.js (HTTP server)                           │  │
│  │                                                           │  │
│  │ ✅ Receives call spec from Cursor                       │  │
│  │ ✅ Adds local credentials (stays here!)                │  │
│  │ ✅ Executes HTTP call to S/4                           │  │
│  │ ✅ Returns raw response                                 │  │
│  └────────────────┬────────────────────────────────────────┘  │
└───────────────────┼──────────────────────────────────────────┘
                    │ HTTP request (inside VPN)
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│ S/4 HANA SYSTEM (Inside VPN)                                    │
│                                                                 │
│  ✅ Receives ADT REST API call                                 │
│  ✅ Processes request                                          │
│  ✅ Returns ABAP data                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Components

### 1. **Remote Cloud Server** (Your Infrastructure)

**File:** `server_http_thin_v2.js`  
**Location:** Remote cloud server (AWS, Azure, GCP, etc.)  
**Purpose:** Exposes your proprietary MCP tools via HTTP  

**What it does:**
- ✅ Runs as HTTP server (port 3000 by default)
- ✅ Spawns `server_adt_thin_v2.js` as child process
- ✅ Communicates with thin client via JSON-RPC
- ✅ Exposes 40 tools via REST API
- ✅ API key authentication
- ✅ **Your proprietary code stays here!**

---

### 2. **Local Agent** (Customer's Machine)

**File:** `simple-agent.js`  
**Location:** Customer's local machine (inside VPN)  
**Purpose:** Executes HTTP calls to S/4 HANA  

**What it does:**
- ✅ Runs as HTTP server (port 3000 by default)
- ✅ Receives call specs from Cursor
- ✅ Adds local SAP credentials
- ✅ Executes HTTP call to S/4
- ✅ Returns raw response
- ✅ **Credentials never leave customer's network!**

---

### 3. **Cursor** (User's IDE)

**Configuration:** `mcp.json` (updated to use HTTP)  
**Purpose:** Connects to remote MCP server  

---

## 🚀 Deployment Steps

### **Step 1: Deploy Remote MCP Server (Cloud)**

```bash
# On your cloud server
cd ADT

# Install dependencies (if not already)
npm install

# Set environment variables
export HTTP_PORT=3000
export HTTP_API_KEY="your-secret-api-key-here"
export SAP_SYSTEM="DEV"  # or QA

# Start the HTTP thin client server
node server_http_thin_v2.js

# Or use PM2 for production
pm2 start server_http_thin_v2.js --name "mcp-thin-v2"
```

**Expected Output:**
```
═══════════════════════════════════════════════════════════════
  🚀 ABAP ADT Thin Client MCP Server - HTTP Bridge Mode
═══════════════════════════════════════════════════════════════

  ✅ HTTP Server:           http://localhost:3000
  ✅ MCP Backend:           Thin Client V2 (stdio mode)
  ✅ SAP System:            DEV
  ✅ Base URL:              https://10.204.34.80:44300
  ✅ Client:                210

  🏗️  Architecture:
     • Remote:              This HTTP server (proprietary code)
     • Local:               simple-agent.js (inside VPN)
     • Cursor:              Connects via HTTP from anywhere

  📍 Endpoints:
     • Health:              GET  /health
     • List Tools:          GET  /api/tools
     • Execute Tool:        POST /api/tools/{tool_name}

  🔐 Authentication:        ENABLED

  📊 Tools Available:       40 thin_v2_* tools

═══════════════════════════════════════════════════════════════
```

---

### **Step 2: Configure Local Agent (Customer)**

```bash
# On customer's local machine (inside VPN)
cd ADT/secure-agent

# Update config (if needed)
# Edit simple-agent.js to set port, etc.

# Start the local agent
node simple-agent.js

# Or use PM2
pm2 start simple-agent.js --name "sap-agent"
```

**Expected Output:**
```
Local Agent listening on port 3000
Ready to execute HTTP calls to S/4 HANA
```

---

### **Step 3: Configure Cursor (Customer)**

Update `~/.cursor/mcp.json` (or workspace `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "abap-adt-thin-v2-remote": {
      "command": "node",
      "args": [
        "PATH_TO_THIN_CLIENT_HTTP_BRIDGE/cursor-http-client.js"
      ],
      "env": {
        "MCP_SERVER_URL": "https://your-cloud-server.com:3000",
        "MCP_API_KEY": "your-secret-api-key-here",
        "LOCAL_AGENT_URL": "http://localhost:3000"
      }
    }
  }
}
```

---

## 🔐 Security Configuration

### **API Key Authentication**

```bash
# Generate a strong API key
export HTTP_API_KEY=$(openssl rand -hex 32)

# Start server with auth
HTTP_API_KEY="your-key-here" node server_http_thin_v2.js
```

### **HTTPS (Production)**

Use a reverse proxy (nginx, Apache) or cloud load balancer:

```nginx
# nginx example
server {
    listen 443 ssl;
    server_name mcp.yourcompany.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🧪 Testing the Deployment

### **1. Health Check**

```bash
curl https://your-cloud-server.com:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "server": "ABAP ADT Thin Client MCP Server (HTTP Bridge Mode)",
  "mode": "thin-client-v2",
  "system": "DEV",
  "baseUrl": "https://10.204.34.80:44300",
  "client": "210",
  "mcpStatus": "running",
  "timestamp": "2026-01-15T12:00:00.000Z",
  "architecture": {
    "remote": "This HTTP server (proprietary code)",
    "local": "simple-agent.js (executes HTTP calls inside VPN)",
    "cursor": "Connects to this HTTP server from anywhere"
  }
}
```

### **2. List Tools**

```bash
curl -H "X-API-Key: your-key-here" \
  https://your-cloud-server.com:3000/api/tools
```

### **3. Execute Tool**

```bash
curl -X POST \
  -H "X-API-Key: your-key-here" \
  -H "Content-Type: application/json" \
  -d '{"object_name":"ZCL_TEST","object_type":"CLAS"}' \
  https://your-cloud-server.com:3000/api/tools/thin_v2_read_source
```

---

## 📊 Architecture Benefits

### **For You (Service Provider)**
✅ **Code Protection:** All proprietary ADT logic stays on your remote server  
✅ **Control:** You manage updates, security, and access  
✅ **Monetization:** Charge per API call, subscription, etc.  
✅ **No Leakage:** Customer only gets HTTP call specs (no logic)  

### **For Customer**
✅ **Security:** SAP credentials never leave their network  
✅ **VPN Friendly:** Local agent inside VPN, no external access needed  
✅ **Simple:** Just run local agent, configure Cursor  
✅ **Transparent:** Can inspect HTTP calls if needed  

---

## 🔄 Update Flow

### **When You Update Your Code:**
1. Update `server_adt_thin_v2.js` on remote server
2. Restart `server_http_thin_v2.js`
3. **No customer action needed!**

### **When Customer Updates Credentials:**
1. Update `ADT/sap_systems.json` locally
2. Restart `simple-agent.js`
3. **No remote changes needed!**

---

## 🚨 Troubleshooting

### **Remote Server Not Starting**

```bash
# Check logs
tail -f ADT/adt_http_thin_v2_dev.log

# Check if port is in use
lsof -i :3000

# Test manually
node server_http_thin_v2.js
```

### **Local Agent Not Reachable**

```bash
# Test local agent
curl http://localhost:3000/health

# Check firewall
sudo ufw status

# Check process
ps aux | grep simple-agent
```

### **Authentication Failing**

```bash
# Verify API key
echo $HTTP_API_KEY

# Test with correct key
curl -H "X-API-Key: correct-key" \
  https://your-server.com:3000/health
```

---

## 📈 Production Recommendations

### **1. Use Process Manager**
```bash
pm2 start server_http_thin_v2.js --name mcp-thin-v2
pm2 startup
pm2 save
```

### **2. Enable Logging**
```bash
pm2 logs mcp-thin-v2
pm2 logs mcp-thin-v2 --err  # errors only
```

### **3. Monitor Health**
```bash
# Add to cron
* * * * * curl -f http://localhost:3000/health || pm2 restart mcp-thin-v2
```

### **4. Use HTTPS**
- Never expose HTTP in production
- Use reverse proxy or cloud load balancer
- Enable SSL/TLS

### **5. Rate Limiting**
```javascript
// In server_http_thin_v2.js
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api', limiter);
```

---

## ✅ Deployment Checklist

### **Remote Server**
- [ ] `server_http_thin_v2.js` deployed
- [ ] Environment variables set
- [ ] API key generated and secure
- [ ] HTTPS configured
- [ ] Process manager (PM2) configured
- [ ] Firewall rules configured
- [ ] Monitoring enabled
- [ ] Logs configured

### **Local Agent (Customer)**
- [ ] `simple-agent.js` deployed
- [ ] SAP credentials configured
- [ ] Agent running and accessible
- [ ] VPN access confirmed
- [ ] S/4 connectivity tested

### **Cursor (Customer)**
- [ ] `mcp.json` configured
- [ ] MCP server URL set
- [ ] API key configured
- [ ] Local agent URL set
- [ ] Connection tested

---

## 🎉 Summary

**You now have a production-ready, secure, thin client MCP architecture!**

- ✅ **40 tools** available remotely
- ✅ **Your code protected** on cloud server
- ✅ **Customer credentials safe** on local machine
- ✅ **VPN friendly** - local agent inside firewall
- ✅ **Scalable** - add customers easily
- ✅ **Monetizable** - charge for API access

**The thin client V2 is ready for production deployment!** 🚀
