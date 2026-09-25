# 🧹 Cleanup Plan - Remove Confidential & Unused Files

## ✅ KEEP (Essential Files)

### Core MCP Servers
- ✅ `server_adt.js` - Original working server (source of truth)
- ✅ `server_adt_thin_v2.js` - **NEW** Thin client with all 40 tools
- ✅ `server_http_v2.js` - HTTP bridge server (for remote access)
- ✅ `server_launcher.js` - Unified launcher (stdio/HTTP modes)

### Core Services & Utilities
- ✅ `adt-service-base.js` - Base ADT service class
- ✅ `adt-config.js` - Configuration loader
- ✅ `adt-utils.js` - Utility functions

### Thin Client Components
- ✅ `thin-client-adapter.js` - HTTP interceptor
- ✅ `simple-agent.js` - Local agent (in secure-agent/)

### Configuration Files
- ✅ `sap_systems.json` - SAP system configuration
- ✅ `current_system.json` - Active system state
- ✅ `btp_cookies.json` - BTP authentication cookies
- ✅ `package.json` - Node.js dependencies
- ✅ `package-lock.json` - Dependency lock file

### Configuration Templates
- ✅ `sap_systems.json.template` - Template for customers
- ✅ `btp_cookies.json.template` - Template for BTP setup
- ✅ `cursor-config-thin-v2.json` - Cursor MCP config snippet

### Essential Documentation
- ✅ `THIN_CLIENT_V2_COMPLETE.md` - **NEW** Thin client status
- ✅ `README.md` - Main documentation
- ✅ `GETTING_STARTED.md` - Quick start guide
- ✅ `ALWAYS_READ.md` - Critical rules for AI agent (if exists in root)

---

## ❌ REMOVE (Confidential / Unused / Outdated)

### Confidential Customer Data
- ❌ `numen_config.txt` - **CONFIDENTIAL** customer configuration
- ❌ `cookies.json` - Old cookie file
- ❌ All `*.log` files - Debug logs with potentially sensitive data

### Unused/Experimental Servers
- ❌ `server_adt_thin.js` - Old thin client (replaced by V2)
- ❌ `server_http_auto_recovery.js` - Auto-recovery experiment (not used)
- ❌ `server_http_client.js` - HTTP client experiment
- ❌ `server_http.js` - Old HTTP server (replaced by V2)
- ❌ `server_adt.js.backup` - Backup file
- ❌ `server_adt.test.js` - Test file

### Unused Authentication Scripts
- ❌ `authenticate_btp_simple.js`
- ❌ `authenticate_btp.js`
- ❌ `capture_adt_cookies.js`
- ❌ `extract_eclipse_cookies.js`
- ❌ `find_btp_url.js`
- ❌ `get_btp_cookies.js`
- ❌ `refresh_btp_cookies.js`
- ❌ `setup_btp_cookies_manual.js`
- ❌ `verify_btp_cookies.js`

### Unused Test Scripts
- ❌ `test_abap_adt_api_btp.js`
- ❌ `test_btp_connection.js`
- ❌ `test_btp_with_cookies.js`
- ❌ `test_connection.js`
- ❌ `test_mysapsso2.js`
- ❌ `test_read_class.js`
- ❌ `test_which_system.js`

### Unused PowerShell Scripts
- ❌ `find_eclipse_logs.ps1`
- ❌ `restart_http_server.ps1` - Manual restart (can keep if needed)

### Unused Test Files
- ❌ `vitest.config.js`
- ❌ `ZBP_R_RAPTEST01.abap`
- ❌ `ZC_RAPTEST01.ddls`
- ❌ `ZR_RAPTEST01.bdef`
- ❌ `ZR_RAPTEST01.ddls`
- ❌ `ZRAPTEST01_D.ddls`
- ❌ `ZUI_RAPTEST01_O4.srvd`

### Redundant Documentation (Keep only essential)
- ❌ Most of the 100+ .md files (consolidate into essential docs)
- ✅ Keep: README.md, GETTING_STARTED.md, THIN_CLIENT_V2_COMPLETE.md
- ❌ Remove: All other implementation summaries, guides, etc.

### Unused Folders
- ❌ `_archived/` - Already archived
- ❌ `docs/` - If redundant with main docs
- ❌ `RAP_GENERATOR/` - If not used
- ❌ `secure-agent/` - **REVIEW** Keep encryption.js, local-agent.js, simple-agent.js only

### Unused Config Files
- ❌ `cursor_mcp_config_dual_system.json` - Old config
- ❌ `CURSOR_MCP_CONFIG_EXAMPLE.json` - Redundant
- ❌ `cursor_mcp_config.json` - Old config
- ❌ `cursor-mcp-config-thin.json` - Old thin client config
- ❌ `mcp.json.template` - Redundant
- ❌ `http_client_example.js` - Example file

---

## 🔍 Review Before Deleting

### Secure Agent Folder
Review `secure-agent/` and keep only:
- ✅ `simple-agent.js` - **ESSENTIAL** Local HTTP executor
- ✅ `encryption.js` - If encryption will be used later
- ❌ Everything else (setup scripts, test files, docs)

### Documentation Folder
Review `docs/` and consolidate into:
- ✅ One main README
- ✅ One getting started guide
- ✅ One thin client guide
- ❌ Remove all other redundant docs

---

## 📋 Cleanup Commands

```powershell
# Navigate to ADT folder
cd C:\Users\FabianoGalastri\Cursor\MCP\ADT

# Remove confidential files
Remove-Item numen_config.txt, cookies.json -Force

# Remove log files
Remove-Item *.log -Force

# Remove unused servers
Remove-Item server_adt_thin.js, server_http_auto_recovery.js, server_http_client.js, server_http.js, server_adt.js.backup, server_adt.test.js -Force

# Remove unused auth scripts
Remove-Item authenticate_*.js, capture_*.js, extract_*.js, find_*.js, get_*.js, refresh_*.js, setup_btp_*.js, verify_*.js -Force

# Remove unused test scripts
Remove-Item test_*.js -Force

# Remove unused test files
Remove-Item vitest.config.js, Z*.abap, Z*.ddls, Z*.bdef, Z*.srvd -Force

# Remove unused config files
Remove-Item cursor_mcp_config*.json, CURSOR_MCP_CONFIG_EXAMPLE.json, mcp.json.template, http_client_example.js -Force

# Remove PowerShell scripts (except restart if needed)
Remove-Item find_*.ps1 -Force

# Archive documentation (move to _archived/)
# (Manual review recommended)
```

---

## ✅ Final Structure (After Cleanup)

```
ADT/
├── server_adt.js                    # Original working server
├── server_adt_thin_v2.js            # Thin client V2 (40 tools)
├── server_http_v2.js                # HTTP bridge
├── server_launcher.js               # Launcher
├── adt-service-base.js              # Core service
├── adt-config.js                    # Config loader
├── adt-utils.js                     # Utilities
├── thin-client-adapter.js           # Thin client adapter
├── sap_systems.json                 # SAP config
├── current_system.json              # Active system
├── btp_cookies.json                 # BTP cookies
├── package.json                     # Dependencies
├── sap_systems.json.template        # Template
├── btp_cookies.json.template        # Template
├── cursor-config-thin-v2.json       # Cursor config
├── README.md                        # Main docs
├── GETTING_STARTED.md               # Quick start
├── THIN_CLIENT_V2_COMPLETE.md       # Thin client docs
├── CLEANUP_PLAN.md                  # This file
└── secure-agent/
    ├── simple-agent.js              # Local agent
    └── encryption.js                # (Optional) Encryption
```

---

## 🎯 User Decision Required

**Please confirm:**
1. ✅ Remove all confidential files (numen_config.txt, logs)?
2. ✅ Remove all unused test/auth scripts?
3. ✅ Remove all redundant documentation (keep only 3 main docs)?
4. ✅ Clean up secure-agent folder (keep only simple-agent.js)?
5. ❓ Keep or remove `restart_http_server.ps1`?

**After confirmation, I'll execute the cleanup!** 🧹
