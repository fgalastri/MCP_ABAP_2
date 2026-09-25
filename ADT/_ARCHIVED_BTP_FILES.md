# 📦 Archived/Redundant BTP Files

These files are **OLD** and **NOT NEEDED** anymore. You can safely ignore or delete them.

## ❌ Old Scripts (Don't Use These!)

| File | Why It's Archived | Replaced By |
|------|-------------------|-------------|
| `authenticate_btp_simple.js` | Automated server approach - didn't work reliably | `get_btp_cookies.js` |
| `authenticate_btp.js` | Another automated approach - redundant | `get_btp_cookies.js` |
| `capture_adt_cookies.js` | Overcomplicated capture tool | `get_btp_cookies.js` |
| `setup_btp_cookies_manual.js` | Manual paste - less user-friendly | `get_btp_cookies.js` |
| `refresh_btp_cookies.js` | Original version | `get_btp_cookies.js` (renamed/improved) |
| `verify_btp_cookies.js` | Separate verification - now built into main script | `get_btp_cookies.js` |
| `test_mysapsso2.js` | Debug tool - not needed for normal use | - |
| `find_btp_url.js` | Debug tool - not needed | - |
| `extract_eclipse_cookies.js` | Eclipse-specific - doesn't work for BTP | - |

## ❌ Old Documentation (Don't Read These!)

| File | Why It's Archived | Replaced By |
|------|-------------------|-------------|
| `CAPTURE_BTP_COOKIES_BROWSER.md` | Old instructions | `BTP_SETUP_GUIDE.md` |
| `BTP_QUICKSTART_FINAL.md` | "Final" but actually not final! | `BTP_SETUP_GUIDE.md` |
| `START_BTP_AUTH.md` | Outdated approach | `BTP_SETUP_GUIDE.md` |
| `setup_btp_simple.md` | OAuth setup - too complex for now | `BTP_SETUP_GUIDE.md` |
| `BTP_COOKIE_REALITY_CHECK.md` | Historical discussion doc | `BTP_SETUP_GUIDE.md` |
| `BTP_IMPLEMENTATION_COMPLETE.md` | Technical implementation details | (For developers only) |
| `BTP_COOKIE_SETUP_QUICKSTART.md` | Another "quickstart" | `BTP_SETUP_GUIDE.md` |
| `BTP_AUTHENTICATION_STATUS.md` | Historical status doc | `BTP_SETUP_GUIDE.md` |
| `BTP_AUTHENTICATION_GUIDE.md` | Old auth guide | `BTP_SETUP_GUIDE.md` |
| `BTP_SETUP_COMPLETE.md` | "Complete" but actually incomplete | `BTP_SETUP_GUIDE.md` |
| `BTP_VARIABLE_RENAME_SUMMARY.md` | Developer notes - not for users | (For developers only) |

---

## ✅ What You SHOULD Use

### Scripts:
- **`get_btp_cookies.js`** - The ONE script you need!
- **`test_btp_connection.js`** - Test your connection

### Documentation:
- **`BTP_SETUP_GUIDE.md`** - Complete setup guide
- **`README_BTP_SETUP.md`** - Quick start reference

---

## 🗑️ Cleanup (Optional)

If you want to clean up your directory, you can safely delete all the files listed above.

**Quick cleanup command:**
```powershell
# Move old scripts to archive folder
Move-Item -Path "authenticate_btp_simple.js","authenticate_btp.js","capture_adt_cookies.js","setup_btp_cookies_manual.js","refresh_btp_cookies.js","verify_btp_cookies.js","test_mysapsso2.js","find_btp_url.js","extract_eclipse_cookies.js" -Destination "_archived\"

# Move old documentation to archive folder  
Move-Item -Path "CAPTURE_BTP_COOKIES_BROWSER.md","BTP_QUICKSTART_FINAL.md","START_BTP_AUTH.md","setup_btp_simple.md","BTP_COOKIE_REALITY_CHECK.md","BTP_COOKIE_SETUP_QUICKSTART.md","BTP_AUTHENTICATION_STATUS.md","BTP_AUTHENTICATION_GUIDE.md","BTP_SETUP_COMPLETE.md" -Destination "_archived\"
```

**Or just ignore them** - they won't interfere with your work!

---

**Last Updated:** November 5, 2025





















