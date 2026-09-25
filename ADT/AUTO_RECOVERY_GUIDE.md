# HTTP MCP Server - Auto-Recovery Guide

## 🎯 Overview

Two solutions for handling SAP session timeouts:

1. **Quick Restart Script** - Manual restart when connection drops
2. **Auto-Recovery Server** - Automatic detection and recovery

---

## 🔧 Solution 1: Quick Restart Script (Manual)

### When to Use
- You notice "Session Timed Out" errors
- Connection to SAP drops
- Quick fix needed

### How to Use

#### Option A: Double-click the file
1. Navigate to `ADT` folder
2. Right-click `restart_http_server.ps1`
3. Select "Run with PowerShell"

#### Option B: Run from PowerShell
```powershell
cd C:\Users\FabianoGalastri\Cursor\MCP\ADT
.\restart_http_server.ps1
```

#### Option C: Create Desktop Shortcut
1. Right-click on Desktop → New → Shortcut
2. Location: 
   ```
   powershell.exe -ExecutionPolicy Bypass -File "C:\Users\FabianoGalastri\Cursor\MCP\ADT\restart_http_server.ps1"
   ```
3. Name it: "Restart MCP Server"
4. Double-click whenever needed!

---

## 🤖 Solution 2: Auto-Recovery Server (Automatic)

### Features
- ✅ Automatic detection of SAP session timeouts
- ✅ Auto-restart of backend connection
- ✅ HTTP server stays running continuously
- ✅ Detailed recovery logging
- ✅ Manual restart API endpoint

### How to Use

#### Start Auto-Recovery Server
```powershell
cd C:\Users\FabianoGalastri\Cursor\MCP\ADT

$env:HTTP_PORT="3000"
$env:HTTP_API_KEY="natura-mcp-2026"
$env:REQUIRE_AUTH="true"
$env:SAP_SYSTEM="DEV"

node server_http_auto_recovery.js
```

#### What It Does
The server monitors for these error patterns:
- `Session Timed Out`
- `ETIMEDOUT`
- `ECONNREFUSED`
- `401 Unauthorized`
- `403 Forbidden`

When detected, it automatically:
1. Logs the error
2. Stops the backend MCP process
3. Waits 3 seconds
4. Restarts the backend
5. Continues serving requests

#### Monitor Status
```powershell
# Check health
Invoke-RestMethod -Uri "http://localhost:3000/health"

# Output includes:
# - status: ok
# - httpServer: running
# - mcpBackend: running/stopped
# - restartCount: number of automatic restarts
# - lastRestart: timestamp of last restart
# - autoRecovery: enabled
```

#### Manual Restart via API
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/restart" `
  -Method POST `
  -Headers @{"x-api-key"="natura-mcp-2026"}
```

---

## 📝 Update Cursor Configuration

For auto-recovery server, update your Cursor MCP config:

**File**: `C:\Users\FabianoGalastri\.cursor\mcp.json`

```json
{
  "mcpServers": {
    "abap-adt-http": {
      "command": "node",
      "args": ["C:\\Users\\FabianoGalastri\\Cursor\\MCP\\ADT\\server_http_auto_recovery.js"],
      "env": {
        "HTTP_BASE_URL": "http://localhost:3000",
        "HTTP_API_KEY": "natura-mcp-2026",
        "SAP_SYSTEM": "DEV"
      }
    }
  }
}
```

**Note**: Change `server_http_v2.js` to `server_http_auto_recovery.js` in the args array.

---

## 🎯 Recommended Approach

### For Development (Active Work)
Use **Auto-Recovery Server** - it handles connection drops automatically without any manual intervention.

### For Quick Fixes
Keep the **Restart Script** on your Desktop for emergency restarts.

---

## 🔍 Troubleshooting

### Auto-Recovery Not Working?

1. **Check logs**
   - Auto-recovery logs all restart events
   - Look for `🔄` (recovery) and `✅` (success) symbols

2. **Verify health endpoint**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/health"
   ```

3. **Check restart count**
   - If `restartCount` is increasing, auto-recovery is working
   - If stuck at 0, check for errors in console

### Session Still Timing Out?

1. **SAP System Issue**
   - Check if SAP system (10.204.34.80:44300) is accessible
   - Try pinging the server
   - Verify credentials haven't changed

2. **Network Issue**
   - VPN connection might be down
   - Firewall might be blocking

3. **Manual Restart**
   - Use restart script or API endpoint
   - If still failing, check SAP system availability

---

## 📊 Comparison

| Feature | Manual Restart | Auto-Recovery |
|---------|---------------|---------------|
| Detects session timeout | ❌ Manual | ✅ Automatic |
| Restarts connection | ✅ Yes | ✅ Yes |
| Requires action | ✅ Yes | ❌ No |
| Logs events | ⚠️ Basic | ✅ Detailed |
| HTTP server uptime | ⚠️ Interrupted | ✅ Continuous |
| Best for | Quick fixes | Production use |

---

## 🚀 Next Steps

1. **Try Auto-Recovery First**
   - Start `server_http_auto_recovery.js`
   - Test with a few operations
   - Monitor health endpoint

2. **Create Desktop Shortcut**
   - For manual restart script
   - Keep as backup option

3. **Update Cursor Config**
   - Point to auto-recovery server
   - Restart Cursor
   - Enjoy seamless operation!

---

**Questions?** Just ask! 😊
