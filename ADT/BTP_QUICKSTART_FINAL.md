# 🚀 BTP MCP Server - Quick Start Guide

## 📋 Overview

This guide will help you get your BTP ABAP system working with the MCP server in **under 5 minutes**.

The approach: **Capture cookies from your browser** after a successful BTP login, then use them in the MCP server.

---

## 🎯 Step-by-Step Instructions

### **Step 1: Open Browser and Developer Tools**

1. Open **Chrome** or **Edge**
2. Press **F12** to open Developer Tools
3. Click on the **Network** tab
4. ✅ **Check "Preserve log"** (very important!)

---

### **Step 2: Login to BTP ADT API**

In the browser address bar, navigate to:
```
https://abap-cloud-subaccount-frankfurt.abap.eu10.hana.ondemand.com/sap/bc/adt/discovery
```

- Complete the BTP OAuth/SAML login flow
- Wait until you see the XML response or success message

---

### **Step 3: Capture the Cookies**

In the Network tab (Developer Tools):

1. **Find the request** to `/sap/bc/adt/discovery`
   - It should show status **200 OK** (green)
   
2. **Click on that request**

3. **Go to the "Headers" tab** (scroll down if needed)

4. **Find "Request Headers"** section

5. **Locate the "Cookie:" header** (it will be long!)

6. **Copy the ENTIRE cookie value**
   - Example format:
   ```
   sap-usercontext=sap-client=100; SAP_SESSIONID_S4H_100=LongValueHere; MYSAPSSO2=AnotherLongValue; sap-language=EN
   ```

---

### **Step 4: Format and Save Cookies**

1. Open the file: `C:\Users\FabianoGalastri\Cursor\MCP\ADT\btp_cookies.json`

2. Split the cookies by semicolon (`;`) and save as JSON array:

**Example:**

If your copied cookies are:
```
sap-usercontext=sap-client=100; SAP_SESSIONID_S4H_100=abc123; MYSAPSSO2=xyz789
```

Save them as:
```json
[
  "sap-usercontext=sap-client=100",
  "SAP_SESSIONID_S4H_100=abc123",
  "MYSAPSSO2=xyz789"
]
```

**Important:**
- Each cookie is a separate string
- Keep the `name=value` format
- Remove any trailing semicolons
- Must be valid JSON array

---

### **Step 5: Verify Cookies Work**

Run the verification script:

```powershell
cd C:\Users\FabianoGalastri\Cursor\MCP\ADT
node verify_btp_cookies.js
```

**Expected output:**
```
✅ Loaded cookies from btp_cookies.json
📝 Found 3 cookie(s)

🔍 Testing BTP ADT API...
📡 Test 1: ADT Discovery Endpoint
   Status: 200 OK
   ✅ SUCCESS! Cookies are valid!

✨ GREAT NEWS! Your BTP cookies are working! ✨
```

**If you get 401 Unauthorized:**
- Cookies are expired or invalid
- Go back to Step 2 and capture fresh cookies
- Make sure you're copying from the ADT API request, not the login page

---

### **Step 6: Update Cursor MCP Configuration**

Open: `C:\Users\FabianoGalastri\.cursor\mcp.json`

Add or update the ADT server configuration:

```json
{
  "mcpServers": {
    "abap-adt-btp": {
      "command": "node",
      "args": ["C:\\Users\\FabianoGalastri\\Cursor\\MCP\\ADT\\server_adt.js"],
      "env": {
        "SAP_BASE_URL": "https://abap-cloud-subaccount-frankfurt.abap.eu10.hana.ondemand.com",
        "SAP_CLIENT": "100",
        "SAP_LANGUAGE": "EN",
        "SAP_AUTH_MODE": "btp",
        "BTP_COOKIES_FILE": "C:\\Users\\FabianoGalastri\\Cursor\\MCP\\ADT\\btp_cookies.json"
      }
    }
  }
}
```

**Key settings:**
- ✅ `SAP_AUTH_MODE=btp` (tells the server to use BTP authentication)
- ✅ `BTP_COOKIES_FILE` points to your cookies file
- ✅ No username/password needed for BTP!

---

### **Step 7: Restart Cursor**

1. Close Cursor completely
2. Reopen Cursor
3. Open your MCP workspace: `C:\Users\FabianoGalastri\Cursor\MCP`

---

### **Step 8: Test the MCP Server**

In Cursor, try asking:
```
"Read the source code of class ZCL_CALCULATOR"
```

Or:
```
"List all custom CDS views starting with Z"
```

**If it works:**
🎉 Congratulations! Your BTP MCP server is ready!

**If it doesn't work:**
- Check the MCP logs in Cursor (View → Output → MCP)
- Verify cookies are still valid (run `verify_btp_cookies.js` again)
- Cookies might have expired - capture fresh ones

---

## 🔄 When Cookies Expire

BTP cookies typically expire after:
- Session timeout (30-60 minutes of inactivity)
- Logout
- System maintenance

**To refresh:**
1. Login again in browser (Step 2)
2. Capture new cookies (Step 3)
3. Update `btp_cookies.json` (Step 4)
4. No need to restart Cursor - the server will reload cookies automatically!

---

## 📁 Files Reference

| File | Purpose |
|------|---------|
| `btp_cookies.json` | Stores your BTP session cookies |
| `verify_btp_cookies.js` | Tests if cookies are valid |
| `server_adt.js` | Main MCP server (supports both BTP and on-premise) |
| `CAPTURE_BTP_COOKIES_BROWSER.md` | Detailed cookie capture guide |

---

## 🆘 Troubleshooting

### Problem: 401 Unauthorized
**Solution:** Cookies expired or invalid. Capture fresh cookies.

### Problem: Can't find Cookie header in browser
**Solution:** 
- Make sure "Preserve log" is checked
- Try refreshing the page after login
- Look for `/sap/bc/adt/discovery` request specifically

### Problem: JSON parse error in btp_cookies.json
**Solution:**
- Check JSON syntax (use jsonlint.com)
- Make sure it's an array: `[...]`
- Remove trailing commas
- Each cookie must be a quoted string

### Problem: MCP server not starting
**Solution:**
- Check Cursor MCP logs
- Verify file paths in mcp.json are correct
- Make sure Node.js is installed: `node --version`

---

## ✨ You're All Set!

Once everything is working, you can:
- Create ABAP classes, tables, CDS views
- Read and modify source code
- Run syntax checks and tests
- Generate RAP services
- All from Cursor AI chat! 🤖

**Pro tip:** Keep your browser tab with the BTP ADT API open. When cookies expire, just refresh that tab and capture new cookies!

---

**Need help?** Check the detailed guides:
- `CAPTURE_BTP_COOKIES_BROWSER.md` - Cookie capture details
- `BTP_AUTHENTICATION_GUIDE.md` - Full authentication documentation
- `ADT_MCP_READY.md` - MCP server capabilities

Happy coding! 🚀

