# 🚀 BTP Authentication Setup Guide

This is the **ONLY** guide you need to set up BTP authentication for the MCP ABAP ADT tools.

---

## ✅ Quick Setup (5 minutes)

### Step 1: Run the Cookie Capture Script

```bash
cd C:\Users\FabianoGalastri\Cursor\MCP\ADT
node get_btp_cookies.js
```

The script will guide you through the process.

---

### Step 2: Get Cookies from Browser

1. **Open your browser** (Chrome/Edge) and press **F12**
2. Go to **Network** tab and ✅ check **"Preserve log"**
3. **Navigate to** (the script will show you the URL):
   ```
   https://YOUR-BTP-SYSTEM.abap-web.eu10.hana.ondemand.com/sap/bc/adt/core/http/reentranceticket?redirect-url=http://localhost:59717/adt/redirect
   ```
4. **Log in to BTP** (complete OAuth/SAML flow)
5. **Wait for redirect** to localhost (might show error - that's OK!)

---

### Step 3: Find the Cookies

In the Network tab:
1. **Find the request** to `/sap/bc/adt/core/http/reentranceticket`
2. **Click on it**

Then extract these **3 values**:

#### 📥 Response Headers:
- Find: **`expect-mysapsso2`**
- Copy the entire value

#### 📤 Request Headers (Cookie line):
- Find the **`cookie:`** line
- Look for: **`JSESSIONID=...`** (copy value after `=`)
- Look for: **`__VCAP_ID__=...`** (copy value after `=`)

---

### Step 4: Paste into Script

The script (`get_btp_cookies.js`) will ask you for these 3 values:
1. MYSAPSSO2 token (from `expect-mysapsso2`)
2. JSESSIONID value
3. __VCAP_ID__ value

The script will:
- ✅ Save them to `btp_cookies.json`
- ✅ Verify they work
- ✅ Show success message

---

### Step 5: Restart MCP Server

In Cursor:
1. Press `Ctrl+Shift+P`
2. Type: **"MCP: Restart Server"**
3. Select: **abap-adt-btp**

**Done!** 🎉

---

## 🧪 Testing

Test your connection:
```bash
node test_btp_connection.js
```

Or in Cursor, ask the AI:
```
@abap-adt-btp read the source of class ZCL_HELLO_WORLD
```

---

## 🔄 When Cookies Expire

Symptoms:
- Getting 401 errors
- Redirected to login page
- "Authentication Required" messages

**Solution:** Just run the script again:
```bash
node get_btp_cookies.js
```

Then restart the MCP server.

---

## 📝 Cookie File Location

The cookies are saved in:
```
C:\Users\FabianoGalastri\Cursor\MCP\ADT\btp_cookies.json
```

Format:
```json
[
  "MYSAPSSO2=your-long-sso-token",
  "JSESSIONID=your-session-id",
  "__VCAP_ID__=your-vcap-id",
  "sap-usercontext=sap-client=100"
]
```

---

## ❓ Troubleshooting

### "Can't find the reentranceticket request"
- Make sure "Preserve log" is checked
- Look for requests starting with `/sap/bc/adt/`
- The request might be named differently - look for one with cookies

### "Cookies not working after save"
- Make sure you restarted the MCP server in Cursor
- Check that `btp_cookies.json` has valid JSON format
- Try getting fresh cookies

### "Still getting login redirect"
- Cookies must be from the **abap-web** domain (not abap.eu10)
- Make sure all 3 cookies are present
- Check if cookies expired (they last ~30-60 minutes)

---

## 🎯 Summary

**One script:** `get_btp_cookies.js`  
**One file:** `btp_cookies.json`  
**One action:** Restart MCP server  

That's it! 🚀





















