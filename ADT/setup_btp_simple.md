# BTP Setup - Super Simple Manual Method

**Goal:** Get BTP working WITHOUT breaking on-premise

**Safety:** Both systems run independently - one can't affect the other

---

## 🍪 Final Cookie Attempt (5 minutes)

### Instructions:

1. **Open browser to BTP:**
   ```
   https://72bf6203-9328-4888-af10-ea65eeb72d78.abap.eu10.hana.ondemand.com
   ```

2. **Log in completely** (wait for page to fully load)

3. **Press F12** → **Network tab**

4. **Refresh the page** (F5)

5. **Click on the FIRST request** (should be to the BTP domain)

6. **In Request Headers, find "cookie:"** 

7. **Copy EVERYTHING after "cookie: "**

   Example of what to copy:
   ```
   sap-usercontext=sap-language=EN&sap-client=100; JSESSIONID=abc; _VCAP_ID_=xyz
   ```

8. **Run this command:**
   ```bash
   cd C:\Users\FabianoGalastri\Cursor\MCP\ADT
   node setup_btp_cookies_manual.js
   ```

9. **Paste the cookie string when prompted**

10. **Test:**
    ```bash
    node test_btp_with_cookies.js
    ```

---

## If Cookies Don't Work (Backup Plan)

### Option B: OAuth Client Setup (~1 hour)

I'll guide you through BTP Cockpit to set up proper OAuth:

1. **BTP Cockpit** → Your subaccount
2. **Security** → **OAuth**
3. **Create OAuth Client**
   - Name: `cursor-mcp-adt`
   - Grant Types: `authorization_code`, `refresh_token`
   - Redirect URI: `http://localhost:8765/callback`
4. **Copy Client ID + Secret**
5. **Update MCP config with OAuth credentials**
6. **Automated authentication forever!**

---

## 🛡️ Safety Guarantees

### What CAN'T Break:
- ✅ Your on-premise system (completely separate config)
- ✅ Existing MCP server code (no changes made)
- ✅ Your Eclipse setup (we're just reading, not changing)
- ✅ Cursor configuration (both servers can coexist)

### What We're Testing:
- 🧪 BTP cookie authentication (experimental)
- 🧪 New BTP server config (separate from on-premise)

### Fallback:
If BTP doesn't work:
- Just use `abap-adt-onprem` server
- Everything works as before
- Try BTP OAuth setup when you have more time

---

## Usage Examples

### Use On-Premise (Guaranteed to Work):
```
"Use the abap-adt-onprem server to read class CL_ABAP_TYPEDESCR"
```

### Try BTP (Experimental):
```
"Use the abap-adt-btp server to list objects in package $TMP"
```

### If BTP fails:
- Just use on-premise
- No harm done
- Both systems independent

---

**Ready to try?** This is completely safe - worst case, BTP doesn't work and you keep using on-premise! 🛡️

