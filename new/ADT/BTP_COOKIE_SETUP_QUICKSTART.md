# BTP Cookie Authentication - Quick Start Guide

**Date:** November 4, 2025  
**Time to Complete:** ~10 minutes  
**Difficulty:** ⭐⭐☆☆☆ (Easy)

---

## 🎯 What You'll Achieve

Connect your MCP server to SAP BTP by reusing Eclipse ADT's authenticated session through cookies.

**Result:** Your Cursor AI can read/write ABAP code on your BTP system! 🚀

---

## 📋 Prerequisites

✅ **You must have:**
- Eclipse ADT installed
- Successfully connected to BTP via Eclipse at least once
- Eclipse ADT currently connected to your BTP system

⚠️ **Important:** Keep Eclipse open and connected to BTP throughout this process!

---

## 🚀 Step-by-Step Setup

### Step 1: Enable Eclipse Communication Log (5 minutes)

This is the **EASIEST** method to extract cookies:

1. **Open Eclipse ADT**
2. **Go to:** `Window` → `Preferences`
3. **Search for:** `Communication Log` (in the search box)
4. **Find:** `ABAP Development` → `Communication Log`
5. **Enable:** ☑ `Record communication to local files`
6. **Set location:** Choose a folder (e.g., `C:\eclipse_logs`)
   - Click `Browse` and create a new folder
   - Remember this location!
7. **Click:** `Apply and Close`

![Eclipse Communication Log Settings]
```
Window → Preferences → ABAP Development → Communication Log
☑ Record communication to local files
Location: C:\eclipse_logs
```

---

### Step 2: Generate a Request to BTP (1 minute)

You need to trigger Eclipse to make a request so the log captures the cookies:

**Option A: Refresh an existing object**
1. In Project Explorer, right-click any ABAP object (class, program, etc.)
2. Select `Refresh`

**Option B: Open an object**
1. Press `Ctrl+Shift+A` (Open ABAP Development Object)
2. Type any object name (e.g., `CL_ABAP_TYPEDESCR`)
3. Press Enter

**Option C: Expand a package**
1. In Project Explorer, expand any package
2. Eclipse will fetch the contents

**Result:** Eclipse makes a request to BTP → Communication log captures it!

---

### Step 3: Find the Log File (2 minutes)

1. **Open File Explorer**
2. **Navigate to:** The folder you chose in Step 1 (e.g., `C:\eclipse_logs`)
3. **Look for:** The newest `.xml` file (sorted by date)
   - Example: `1730736542_GET_sap_bc_adt_repository_nodestructure.xml`
4. **Open it with:** Notepad, VS Code, or any text editor

---

### Step 4: Extract the Cookies (2 minutes)

1. **In the log file, press `Ctrl+F`** (Find)
2. **Search for:** `set-cookie`
3. **You'll find lines like this:**
   ```xml
   <ResponseHeader name="set-cookie">sap-usercontext=sap-language=EN&amp;sap-client=100; path=/</ResponseHeader>
   <ResponseHeader name="set-cookie">SAP_SESSIONID_H01_100=Xv4f8j2kL9mN6pQ3rT1wY5uZ7aB0cD2eF4g; path=/</ResponseHeader>
   <ResponseHeader name="set-cookie">sap-contextid=SID:ANON:H01_100:rTyU9iKlMnP2qWsX3vY8zA; path=/</ResponseHeader>
   ```

4. **Extract the cookie values** (the part between `>` and `; path=/`):
   - `sap-usercontext=sap-language=EN&sap-client=100`
   - `SAP_SESSIONID_H01_100=Xv4f8j2kL9mN6pQ3rT1wY5uZ7aB0cD2eF4g`
   - `sap-contextid=SID:ANON:H01_100:rTyU9iKlMnP2qWsX3vY8zA`

**Note:** Replace `&amp;` with `&` if you see it in the cookies!

---

### Step 5: Create the Cookies File (2 minutes)

1. **Navigate to:** `C:\Users\FabianoGalastri\Cursor\MCP\ADT`
2. **Create new file:** `btp_cookies.json`
3. **Paste this template:**
   ```json
   {
     "cookies": [
       "PASTE_YOUR_FIRST_COOKIE_HERE",
       "PASTE_YOUR_SECOND_COOKIE_HERE",
       "PASTE_YOUR_THIRD_COOKIE_HERE"
     ]
   }
   ```

4. **Replace with your actual cookies:**
   ```json
   {
     "cookies": [
       "sap-usercontext=sap-language=EN&sap-client=100",
       "SAP_SESSIONID_H01_100=Xv4f8j2kL9mN6pQ3rT1wY5uZ7aB0cD2eF4g",
       "sap-contextid=SID:ANON:H01_100:rTyU9iKlMnP2qWsX3vY8zA"
     ]
   }
   ```

5. **Save the file**

**⚠️ Important:** 
- Use **double quotes** (`"`) not single quotes (`'`)
- Separate cookies with **commas**
- Keep the JSON format exactly as shown

---

### Step 6: Test the Cookies (1 minute)

1. **Open PowerShell**
2. **Navigate to ADT folder:**
   ```powershell
   cd C:\Users\FabianoGalastri\Cursor\MCP\ADT
   ```

3. **Run the test script:**
   ```powershell
   node test_btp_with_cookies.js
   ```

4. **Expected output:**
   ```
   🔍 Testing BTP Connection with Extracted Cookies...
   
   ✅ Loaded 3 cookie(s)
   ✅ SUCCESS! System information retrieved!
      System ID: H01
      User: CB9980000040
      Full Name: Fabiano Galastri
   
   🎉 SUCCESS! Your cookies are working perfectly!
   ```

**If you see errors:**
- ❌ `401 Unauthorized` → Cookies expired or wrong cookies
- ❌ `File not found` → Check file path and name (`btp_cookies.json`)
- ❌ `Invalid format` → Check JSON syntax (commas, quotes)

---

### Step 7: Update Cursor Configuration (2 minutes)

1. **Open Cursor Settings**
2. **Go to:** MCP Configuration
3. **Add or update the BTP server:**

```json
{
  "mcpServers": {
    "abap-adt-btp": {
      "command": "node",
      "args": ["C:\\Users\\FabianoGalastri\\Cursor\\MCP\\ADT\\server_adt.js"],
      "env": {
        "SAP_BASE_URL": "https://72bf6203-9328-4888-af10-ea65eeb72d78.abap.eu10.hana.ondemand.com",
        "SAP_CLIENT": "100",
        "SAP_AUTH_MODE": "btp",
        "SAP_LANGUAGE": "EN"
      }
    }
  }
}
```

4. **Save the configuration**
5. **Restart Cursor** (or reload the MCP servers)

---

### Step 8: Test in Cursor! (2 minutes)

**Try these commands:**

```
Use the abap-adt-btp server to read class CL_ABAP_TYPEDESCR
```

```
Use the abap-adt-btp server to list objects in package $TMP
```

```
Use the abap-adt-btp server to create a simple test class ZCL_BTP_TEST
```

**✅ Success indicators:**
- No authentication errors
- Objects are read successfully
- You can create/modify code

---

## 🔄 Cookie Lifecycle

### When do cookies expire?

- **Typical lifetime:** 30 minutes of inactivity
- **Maximum lifetime:** When Eclipse disconnects or ~8 hours

### How to refresh cookies?

**Option 1: Quick Refresh (while Eclipse is open)**
1. Refresh any object in Eclipse (generates new request)
2. Extract cookies from new log file
3. Update `btp_cookies.json`
4. MCP server automatically reloads them

**Option 2: Reconnect Eclipse**
1. Disconnect from BTP in Eclipse
2. Reconnect (triggers fresh authentication)
3. Extract cookies
4. Update `btp_cookies.json`

**💡 Pro Tip:** Keep Eclipse open to maintain the session!

---

## 🚨 Troubleshooting

### Problem: "401 Unauthorized" when testing cookies

**Causes:**
- Cookies have expired
- Eclipse disconnected from BTP
- Wrong cookies were copied
- Cookies from a different BTP system

**Solutions:**
1. Check Eclipse is still connected to BTP
2. Extract fresh cookies (repeat Steps 2-5)
3. Verify the cookies are from the correct BTP system URL
4. Try opening an object in Eclipse before extracting

---

### Problem: "File not found: btp_cookies.json"

**Causes:**
- File not in the correct location
- File name has typo
- File saved with wrong extension

**Solutions:**
1. Verify file is in: `C:\Users\FabianoGalastri\Cursor\MCP\ADT\btp_cookies.json`
2. Make sure it's named exactly `btp_cookies.json` (not `.txt.json`)
3. Check Windows isn't hiding the extension

---

### Problem: "Invalid JSON format"

**Common mistakes:**
```json
// ❌ WRONG: Missing comma
{
  "cookies": [
    "cookie1"
    "cookie2"
  ]
}

// ❌ WRONG: Single quotes
{
  'cookies': [
    'cookie1'
  ]
}

// ❌ WRONG: Trailing comma
{
  "cookies": [
    "cookie1",
  ]
}

// ✅ CORRECT:
{
  "cookies": [
    "cookie1",
    "cookie2"
  ]
}
```

---

### Problem: Can't find Communication Log in Eclipse

**Solution:**
1. Make sure you have Eclipse ADT (not standard Eclipse)
2. Update Eclipse ADT to latest version
3. Alternative: Use Window → Show View → Other → ABAP → Communication Log

---

### Problem: No set-cookie headers in log file

**Causes:**
- Eclipse is reusing existing session
- Log is from a different request
- Communication log isn't recording properly

**Solutions:**
1. Disconnect and reconnect to BTP in Eclipse
2. Make sure Communication Log is enabled and location is writable
3. Try a different action (open object vs. refresh)

---

## 📊 Quick Reference

### Cookie File Location
```
C:\Users\FabianoGalastri\Cursor\MCP\ADT\btp_cookies.json
```

### Test Script
```bash
cd C:\Users\FabianoGalastri\Cursor\MCP\ADT
node test_btp_with_cookies.js
```

### Extract Cookies Helper
```bash
cd C:\Users\FabianoGalastri\Cursor\MCP\ADT
node extract_eclipse_cookies.js
```

### Cookie Format
```json
{
  "cookies": [
    "cookie-name=cookie-value",
    "cookie-name-2=cookie-value-2"
  ]
}
```

---

## 🎓 Understanding the Process

**Why do we need Eclipse cookies?**
- BTP uses OAuth/SAML authentication
- This requires a browser login flow
- Eclipse handles this automatically
- We "borrow" Eclipse's authenticated session

**Is this secure?**
- Cookies are authentication tokens (like passwords)
- Keep `btp_cookies.json` private
- Don't commit it to Git (.gitignore it!)
- Cookies expire automatically (good for security)

**Why not use OAuth directly?**
- We will! This is the quick "Phase 1" solution
- OAuth client setup takes longer
- This gets you working immediately
- We can upgrade to OAuth later without breaking anything

---

## ✅ Checklist

Before asking for help, verify:

- [ ] Eclipse ADT is installed and working
- [ ] You can connect to BTP via Eclipse
- [ ] Eclipse is currently connected to BTP
- [ ] Communication Log is enabled
- [ ] You triggered a request in Eclipse (refresh/open object)
- [ ] Log file was created in the specified folder
- [ ] You found `set-cookie` headers in the log
- [ ] You copied the cookie values (not the whole XML line)
- [ ] `btp_cookies.json` is in the correct location
- [ ] JSON format is valid (no extra commas, correct quotes)
- [ ] Test script confirms cookies work
- [ ] Cursor MCP configuration is updated

---

## 🚀 Next Steps

Once this is working:

1. **Test all ADT operations:**
   - Read classes, CDS views, programs
   - Create new objects
   - Modify existing code
   - Activate objects

2. **Set up automatic cookie refresh:**
   - We can add a helper script
   - Monitors Eclipse log folder
   - Auto-updates `btp_cookies.json`

3. **Upgrade to OAuth client (optional):**
   - No Eclipse dependency
   - Automated authentication
   - Longer-lived tokens

---

## 📞 Getting Help

If you're stuck after following this guide:

1. **Check the logs:**
   - `ADT/adt_debug.log` - MCP server logs
   - Eclipse Communication Log - Request/response details

2. **Run the helper script:**
   ```bash
   node extract_eclipse_cookies.js
   ```
   It provides detailed instructions and checks for existing cookies.

3. **Verify Eclipse connection:**
   - Can you open/edit objects in Eclipse?
   - Is the connection to BTP active?

---

**You're all set! Happy coding with SAP BTP! 🎉**


