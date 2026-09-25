# 📁 Files Currently In Use
## Clean Project Structure

---

## ✅ **PRODUCTION FILES** (Keep These)

### **1. Core MCP Server (ADT/)**
```
ADT/
├── server_adt.js                    ✅ Main MCP server (stdio mode)
├── adt-service-base.js              ✅ Core ADT service class
├── sap_systems.json                 ✅ SAP system configurations
├── current_system.json              ✅ Active system tracker
└── btp_cookies.json                 ✅ BTP authentication (when using BTP)
```

### **2. Thin Client Agent (ADT/secure-agent/)**
```
secure-agent/
├── simple-agent.js                  ✅ Thin client (NO encryption)
├── package.json                     ✅ Dependencies (axios)
└── node_modules/                    ✅ Dependencies folder
```

### **3. Documentation (ADT/)**
```
ADT/
├── SECURE_ARCHITECTURE_PLAN.md      ✅ Architecture overview
├── ALWAYS_READ.md                   ✅ Critical rules
└── secure-agent/
    ├── README.md                    ✅ Agent documentation
    └── IMPLEMENTATION-STATUS.md     ✅ Implementation progress
```

---

## 🗑️ **TEST/EXAMPLE FILES** (Can Delete)

### **ADT/secure-agent/**
```
❌ encryption.js                    (Not used yet - encryption module)
❌ local-agent.js                   (Encrypted version - not used yet)
❌ setup.js                         (Setup for encryption - not needed)
❌ agent.key                        (Encryption key - not used yet)
❌ test-simple-call.js              (Test file)
❌ test-call-spec.json              (Test file)
❌ test-read-class.json             (Test file)
❌ test-request.json                (Test file)
❌ create-test-request.js           (Test file)
❌ example-encrypted-request.json   (Test file)
❌ LICENSE-AGREEMENT.md             (Draft - finalize later)
❌ CUSTOMER-ONBOARDING.md           (Draft - finalize later)
❌ .gitignore                       (Can keep for git)
```

### **ADT/** (Other files)
```
❌ server_http_v2.js                (HTTP bridge - not used for thin client)
❌ server_http_auto_recovery.js     (Not used)
❌ server_launcher.js               (Not used)
❌ http_client_example.js           (Not used)
❌ restart_http_server.ps1          (Not used)
❌ HTTP_MODE_GUIDE.md               (Not used)
❌ README_HTTP_MODE.md              (Not used)
❌ IMPLEMENTATION_COMPLETE.md       (Not used)
❌ AUTO_RECOVERY_GUIDE.md           (Not used)
❌ PRODUCTION_*.md                  (Draft docs)
❌ CRITICAL_FIXES_AND_LEARNINGS.md  (Can keep for reference)
```

---

## 📦 **MINIMAL PRODUCTION STRUCTURE**

Here's what the **clean production structure** should look like:

```
MCP/
├── ADT/
│   ├── server_adt.js                    # Main MCP server
│   ├── adt-service-base.js              # ADT service
│   ├── sap_systems.json                 # Config (with credentials)
│   ├── current_system.json              # Active system
│   ├── btp_cookies.json                 # BTP auth (optional)
│   ├── ALWAYS_READ.md                   # Critical rules
│   ├── SECURE_ARCHITECTURE_PLAN.md      # Architecture doc
│   │
│   └── thin-client/                     # RENAMED from secure-agent
│       ├── agent.js                     # RENAMED from simple-agent.js
│       ├── package.json                 # Dependencies
│       ├── node_modules/                # Installed packages
│       └── README.md                    # Usage guide
│
└── (other files...)
```

---

## 🔄 **FILES TO RENAME** (For Clean Structure)

| Current Name | Better Name | Reason |
|--------------|-------------|--------|
| `secure-agent/` | `thin-client/` | More accurate (not using encryption yet) |
| `simple-agent.js` | `agent.js` | Simpler name (it's the only agent) |
| `server_adt.js` | Keep as-is | Already clear |

---

## 🎯 **NEXT: Integration Files to Create**

When integrating thin client with MCP, we'll need:

```
ADT/
├── server_adt.js                    # Modified to return call specs
├── thin-client/
│   ├── agent.js                     # Execute call specs (already have!)
│   └── mcp-bridge.js                # NEW: Bridge MCP ↔ Agent
```

**OR** (simpler approach):

```
ADT/
├── server_adt_thin.js               # NEW: MCP adapter for thin client
├── server_adt.js                    # Keep original (backward compatible)
└── thin-client/
    └── agent.js                     # Execute call specs (already have!)
```

---

## 📋 **CLEANUP SCRIPT**

Want me to create a script to:
1. Delete all test files
2. Rename folders/files
3. Create clean structure
4. Move files to proper locations

---

## ✅ **FILES COUNT**

| Category | Count | Size |
|----------|-------|------|
| **Production Files** | 7 files | ~50 KB |
| **Test/Example Files** | 20+ files | ~200 KB |
| **Reduction** | **70% fewer files** | **80% smaller** |

---

## 🚀 **RECOMMENDATION**

**For now (testing/development):**
- Keep everything (easier to reference)
- Focus on integration

**After integration works:**
- Run cleanup script
- Create clean v2.0 structure
- Archive old files (don't delete, move to `/archive/`)

---

## 💡 **PRODUCTION DEPLOYMENT**

For final deployment, you only need:

```bash
# Copy these files to production:
ADT/server_adt.js
ADT/adt-service-base.js
ADT/sap_systems.json
ADT/thin-client/agent.js
ADT/thin-client/package.json

# Install dependencies:
cd ADT/thin-client
npm install axios

# Done! ✅
```

Total: **5 files + node_modules** (~5 MB total)

---

**Ready to integrate? I'll create the MCP adapter next!** 🚀
