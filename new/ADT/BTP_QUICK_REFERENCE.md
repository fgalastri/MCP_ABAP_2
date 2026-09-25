# 🍪 BTP Authentication - Quick Reference Card

## One Command to Get Started

```bash
node get_btp_cookies.js
```

---

## The 3 Cookies You Need

From the `/reentranceticket` request in browser Network tab:

| Cookie | Location | Example |
|--------|----------|---------|
| **MYSAPSSO2** | Response Headers: `expect-mysapsso2` | `4dPFyErh2r3IwPsBdeFHHn74vak=` |
| **JSESSIONID** | Request Headers: `cookie:` line | `s%3AR3w1z9w6YaxMXrtqjXw9...` |
| **__VCAP_ID__** | Request Headers: `cookie:` line | `3f3c87d8-b91c-45ab-531c-f2bf` |

---

## Workflow

```
1. Run: node get_btp_cookies.js
   ↓
2. Open browser, F12, Network tab
   ↓
3. Navigate to URL (shown by script)
   ↓
4. Login to BTP
   ↓
5. Find /reentranceticket request
   ↓
6. Copy 3 cookies (script prompts you)
   ↓
7. Script saves to btp_cookies.json
   ↓
8. Restart MCP server in Cursor
   ↓
9. Done! ✅
```

---

## Files Overview

| File | What It Is |
|------|------------|
| **`get_btp_cookies.js`** | Main script - run this! |
| **`btp_cookies.json`** | Your saved cookies (auto-generated) |
| **`BTP_SETUP_GUIDE.md`** | Complete documentation |
| **`test_btp_connection.js`** | Test if cookies work |

---

## When Things Go Wrong

| Problem | Solution |
|---------|----------|
| 401 errors | Cookies expired - run `get_btp_cookies.js` again |
| Can't find `/reentranceticket` | Check "Preserve log" is ON in Network tab |
| Still getting login redirect | Restart MCP server in Cursor |
| Cookies don't verify | Ignore warning, restart MCP server, try anyway |

---

## MCP Server Restart

```
Ctrl+Shift+P → "MCP: Restart Server" → abap-adt-btp
```

---

## Quick Test

After setup, test with:
```
@abap-adt-btp read source of class /COREVIST/DELIVERY
```

---

**Print this and keep it handy!** 📌





















