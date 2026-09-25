# Setup From Scratch - Complete Guide

This guide will walk you through setting up the ABAP ADT MCP Server from a fresh clone of this repository.

## Prerequisites

- **Node.js** 18+ installed
- **Cursor IDE** installed
- **SAP System Access** (DEV/QA/BTP)
- **Git** installed

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/VAEES/abap-validator-mcp.git
cd abap-validator-mcp/ADT
```

---

## Step 2: Install Dependencies

```bash
npm install
```

This will install:
- `@modelcontextprotocol/sdk` - MCP SDK
- `axios` - HTTP client
- `fast-xml-parser` - XML parsing

---

## Step 3: Configure SAP Systems

### 3.1 Create `sap_systems.json`

Copy the template and fill in your credentials:

```bash
# Windows
copy sap_systems.json.template sap_systems.json

# Linux/Mac
cp sap_systems.json.template sap_systems.json
```

### 3.2 Edit `sap_systems.json`

Open `sap_systems.json` and replace placeholders:

```json
{
  "DEV": {
    "serverName": "abap-adt-onprem",
    "systemId": "Development (ON-PREM)",
    "baseUrl": "https://your-sap-server.com:44300",  // ⬅️ CHANGE THIS
    "username": "YOUR_USERNAME",                      // ⬅️ CHANGE THIS
    "password": "YOUR_PASSWORD",                      // ⬅️ CHANGE THIS
    "client": "100",                                  // ⬅️ CHANGE THIS
    "authMode": "basic",
    "language": "EN"
  }
}
```

**Key Fields:**
- `baseUrl` - Your SAP server URL (with port)
- `username` - Your SAP username
- `password` - Your SAP password
- `client` - SAP client number (e.g., "100", "210")

**Optional - Multi-Client:**
```json
{
  "DEV": {
    ...
    "clientSpecificCredentials": {
      "200": {
        "username": "USER_FOR_CLIENT_200",
        "password": "PASSWORD_FOR_CLIENT_200"
      }
    }
  }
}
```

---

## Step 4: Configure BTP (Optional)

**Only if you have SAP BTP access:**

### 4.1 Create `btp_cookies.json`

```bash
# Windows
copy btp_cookies.json.template btp_cookies.json

# Linux/Mac
cp btp_cookies.json.template btp_cookies.json
```

### 4.2 Get BTP Cookies

See [CAPTURE_BTP_COOKIES_BROWSER.md](CAPTURE_BTP_COOKIES_BROWSER.md) for detailed instructions.

**Quick Steps:**
1. Open your BTP system in Chrome/Edge
2. Log in successfully
3. Open DevTools (F12) → Application → Cookies
4. Copy these cookies:
   - `MYSAPSSO2`
   - `JSESSIONID`
   - `__VCAP_ID__`
   - `sap-usercontext`

5. Paste into `btp_cookies.json`:

```json
{
  "cookies": [
    "MYSAPSSO2=your_actual_token_here",
    "JSESSIONID=your_actual_session_id_here",
    "__VCAP_ID__=your_actual_vcap_id_here",
    "sap-usercontext=sap-language=EN&sap-client=100"
  ]
}
```

---

## Step 5: Configure Cursor MCP

### 5.1 Find Cursor Config Location

**Windows:**
```
C:\Users\<YourUsername>\.cursor\mcp.json
```

**Mac:**
```
~/.cursor/mcp.json
```

**Linux:**
```
~/.cursor/mcp.json
```

### 5.2 Edit `.cursor/mcp.json`

If file doesn't exist, create it:

```json
{
  "mcpServers": {
    "abap-adt": {
      "command": "node",
      "args": ["C:\\path\\to\\abap-validator-mcp\\ADT\\server_adt.js"],
      "env": {
        "SAP_SYSTEM": "DEV"
      }
    }
  }
}
```

**⚠️ IMPORTANT:** 
- Use **absolute path** to `server_adt.js`
- On Windows, use double backslashes `\\` or forward slashes `/`
- Set `SAP_SYSTEM` to your default system ("DEV", "QA", or "BTP")

**Example (Windows):**
```json
{
  "mcpServers": {
    "abap-adt": {
      "command": "node",
      "args": ["C:\\Users\\John\\Projects\\abap-validator-mcp\\ADT\\server_adt.js"],
      "env": {
        "SAP_SYSTEM": "DEV"
      }
    }
  }
}
```

---

## Step 6: Test the Connection

### 6.1 Restart Cursor

Close and reopen Cursor IDE completely.

### 6.2 Test MCP Connection

Open Cursor and try:

```javascript
// Test reading a class
mcp_abap-adt_adt_read_source("CL_ABAP_TYPEDESCR", "CLASS")
```

**Expected Result:** ✅ Class source code displayed

---

## Step 7: Test System Switching

```javascript
// Switch to DEV
mcp_abap-adt_adt_switch_system({ system: "DEV" })

// Read something from DEV
mcp_abap-adt_adt_read_source("YOUR_CLASS_NAME", "CLASS")

// Switch to QA (if configured)
mcp_abap-adt_adt_switch_system({ system: "QA" })

// Read from QA
mcp_abap-adt_adt_read_source("YOUR_CLASS_NAME", "CLASS")
```

**Expected Result:** ✅ Different data from each system

---

## Troubleshooting

### Issue: "Cannot find module"

**Solution:**
```bash
cd ADT
npm install
```

### Issue: "Connection failed" or 401 Unauthorized

**Solution:**
1. Check `sap_systems.json` credentials
2. Verify SAP server URL and port
3. Test in Eclipse ADT first
4. Check if user has ADT authorization (`S_DEVELOP`)

### Issue: MCP server not starting

**Solution:**
1. Check Cursor logs:
   - Windows: `%APPDATA%\Cursor\logs`
   - Mac: `~/Library/Application Support/Cursor/logs`
2. Verify Node.js is in PATH:
   ```bash
   node --version
   ```
3. Check `.cursor/mcp.json` syntax (must be valid JSON)

### Issue: BTP authentication fails

**Solution:**
1. Cookies expire - recapture them (see Step 4.2)
2. Check `btpCookiesFile` path in `sap_systems.json`
3. See [BTP_COOKIE_SETUP_QUICKSTART.md](BTP_COOKIE_SETUP_QUICKSTART.md)

---

## File Structure Checklist

After setup, you should have:

```
abap-validator-mcp/ADT/
├── node_modules/           ✅ (after npm install)
├── sap_systems.json        ✅ (YOU CREATE - contains credentials)
├── btp_cookies.json        ✅ (optional, for BTP)
├── current_system.json     ✅ (auto-created by system switching)
├── package.json            ✅ (from git)
├── server_adt.js           ✅ (from git)
├── adt-config.js           ✅ (from git)
├── adt-service-base.js     ✅ (from git)
├── adt-utils.js            ✅ (from git)
├── README.md               ✅ (from git)
└── *.template files        ✅ (from git - templates)
```

---

## Security Best Practices

### ⚠️ NEVER Commit These Files:
- ❌ `sap_systems.json` - Contains passwords
- ❌ `btp_cookies.json` - Contains session tokens
- ❌ `current_system.json` - State file
- ❌ `*.log` files - May contain sensitive data

### ✅ Files Safe to Commit:
- ✅ `*.template` files - No credentials
- ✅ `*.md` documentation
- ✅ `*.js` source code (no secrets)
- ✅ `package.json`

---

## Next Steps

Once setup is complete:

1. **Read the guides:**
   - [SYSTEM_SWITCHING_GUIDE.md](SYSTEM_SWITCHING_GUIDE.md) - Switch between DEV/QA/BTP
   - [CLIENT_PARAMETER_GUIDE.md](CLIENT_PARAMETER_GUIDE.md) - Multi-client execution
   - [ENHANCED_TOOLS_COMPLETE_GUIDE.md](ENHANCED_TOOLS_COMPLETE_GUIDE.md) - All 34 tools

2. **Try the features:**
   - Create classes, CDS views, packages
   - Execute classes in different systems
   - Generate RAP UI services
   - Create custom queries

3. **Explore examples:**
   - Check the documentation folder
   - Try example workflows in guides

---

## Getting Help

**Documentation:**
- Main README: [README.md](README.md)
- Quick Start: [QUICK_START.md](QUICK_START.md)
- All guides: [INDEX.md](INDEX.md)

**Troubleshooting:**
- [ACTIVATION_TROUBLESHOOTING_GUIDE.md](ACTIVATION_TROUBLESHOOTING_GUIDE.md)
- [CRITICAL_FIXES_AND_LEARNINGS.md](CRITICAL_FIXES_AND_LEARNINGS.md)

**Issues:**
- Open an issue on GitHub
- Check existing documentation

---

## Summary

✅ **You should now have:**
- MCP server installed and configured
- SAP system credentials configured
- Cursor connected to your SAP systems
- Ability to switch between DEV/QA/BTP instantly
- Access to all 34 ADT tools

🎉 **Ready to start developing!**


