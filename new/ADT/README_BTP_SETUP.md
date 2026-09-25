# BTP Authentication Setup - Quick Start

## 🚀 One Command to Rule Them All

```bash
node get_btp_cookies.js
```

That's it! Follow the prompts and you'll have BTP authentication working in 5 minutes.

---

## 📚 Full Documentation

See [BTP_SETUP_GUIDE.md](./BTP_SETUP_GUIDE.md) for complete instructions.

---

## 📁 Files You Need to Know About

### ✅ Active Files (Use These!)

| File | Purpose |
|------|---------|
| `get_btp_cookies.js` | **Main script** - Run this to get cookies |
| `test_btp_connection.js` | Test your BTP connection |
| `btp_cookies.json` | Your saved cookies (auto-generated) |
| `BTP_SETUP_GUIDE.md` | Complete setup guide |
| `server_adt_btp.js` | MCP server for BTP |

### 📦 Archived Files

Old scripts and docs are in `_archived/` folder. You can safely ignore them.

---

## 🔄 When Cookies Expire

Just run the script again:
```bash
node get_btp_cookies.js
```

Then restart MCP server in Cursor (Ctrl+Shift+P → "MCP: Restart Server" → abap-adt-btp)

---

## ❓ Need Help?

1. Read [BTP_SETUP_GUIDE.md](./BTP_SETUP_GUIDE.md)
2. Check if cookies expired (run `get_btp_cookies.js` again)
3. Make sure MCP server is restarted after updating cookies

---

**Last Updated:** November 5, 2025





















