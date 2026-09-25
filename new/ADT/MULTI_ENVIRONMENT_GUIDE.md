# Multi-Environment SAP Systems Guide

**Feature:** Multiple MCP Server Instances for Different SAP Environments  
**Date:** November 24, 2025  
**Status:** ✅ Production Ready

---

## 🎯 Overview

Execute and test ABAP code across **multiple SAP environments** (DEV, QA, PROD) with different hosts, clients, and credentials - all from the same Cursor workspace!

### Architecture:
```
Cursor Workspace
    ↓
MCP Configuration (.cursor/mcp.json)
    ├─► abap-adt-onprem (DEV) → https://dev-host:44300 (Client 210)
    ├─► abap-adt-qa (QA)       → https://qa-host:44300  (Client 100)
    └─► abap-adt-btp (BTP)     → https://btp-host       (Client 100)
```

---

## 🔧 Configuration

### Step 1: Update `.cursor/mcp.json`

Add a new MCP server instance for each SAP environment:

```json
{
  "mcpServers": {
    "abap-adt-onprem": {
      "command": "node",
      "args": ["C:\\Path\\To\\server_adt.js"],
      "env": {
        "SAP_BASE_URL": "https://dev-host:44300",
        "SAP_USERNAME": "dev_user",
        "SAP_PASSWORD": "dev_pass",
        "SAP_CLIENT": "210",
        "SAP_AUTH_MODE": "basic",
        "SAP_LANGUAGE": "EN"
      }
    },
    "abap-adt-qa": {
      "command": "node",
      "args": ["C:\\Path\\To\\server_adt.js"],
      "env": {
        "SAP_BASE_URL": "https://qa-host:44300",
        "SAP_USERNAME": "qa_user",
        "SAP_PASSWORD": "qa_pass",
        "SAP_CLIENT": "100",
        "SAP_AUTH_MODE": "basic",
        "SAP_LANGUAGE": "EN"
      }
    },
    "abap-adt-prod": {
      "command": "node",
      "args": ["C:\\Path\\To\\server_adt.js"],
      "env": {
        "SAP_BASE_URL": "https://prod-host:44300",
        "SAP_USERNAME": "prod_user_readonly",
        "SAP_PASSWORD": "prod_pass",
        "SAP_CLIENT": "100",
        "SAP_AUTH_MODE": "basic",
        "SAP_LANGUAGE": "EN"
      }
    }
  }
}
```

### Step 2: Restart Cursor

After updating `mcp.json`, **restart Cursor** to load the new MCP server instances.

---

## 💡 Usage

### Tool Naming Pattern:

Each MCP server instance gets its own set of tools with the format:
```
mcp_<server-name>_<tool-name>
```

### Available Tools Per Environment:

| Environment | Server Name | Example Tool |
|------------|-------------|--------------|
| **DEV** | `abap-adt-onprem` | `mcp_abap-adt-onprem_adt_execute_class` |
| **QA** | `abap-adt-qa` | `mcp_abap-adt-qa_adt_execute_class` |
| **PROD** | `abap-adt-prod` | `mcp_abap-adt-prod_adt_execute_class` |
| **BTP** | `abap-adt-btp` | `mcp_abap-adt-btp_adt_execute_class` |

---

## 📝 Examples

### Example 1: Execute Class in Different Environments

**DEV Environment:**
```javascript
// Execute in DEV (vhnacnc1ci.sap.naturaeco.com, Client 210)
mcp_abap-adt-onprem_adt_execute_class({
  class_name: "ZCL_SALES_REPORT"
})
```

**QA Environment:**
```javascript
// Execute in QA (qa-host, Client 100)
mcp_abap-adt-qa_adt_execute_class({
  class_name: "ZCL_SALES_REPORT"
})
```

**PROD Environment (Read-Only):**
```javascript
// Execute in PROD with production data
mcp_abap-adt-prod_adt_execute_class({
  class_name: "ZCL_SALES_REPORT"
})
```

### Example 2: Compare Data Across Environments

```javascript
// Execute in DEV
const devResult = mcp_abap-adt-onprem_adt_execute_class({
  class_name: "ZCL_COMPARE_PKG_HEADER"
})

// Execute in QA
const qaResult = mcp_abap-adt-qa_adt_execute_class({
  class_name: "ZCL_COMPARE_PKG_HEADER"
})

// Compare results
console.log("DEV Records:", devResult)
console.log("QA Records:", qaResult)
```

### Example 3: Development Workflow

```javascript
// 1. Develop in DEV
mcp_abap-adt-onprem_adt_update_and_activate({
  object_name: "ZCL_NEW_FEATURE",
  object_type: "CLAS",
  source_code: "... your code ..."
})

// 2. Test in DEV
mcp_abap-adt-onprem_adt_execute_class({
  class_name: "ZCL_NEW_FEATURE"
})

// 3. Transport to QA (manual SAP transport)

// 4. Validate in QA
mcp_abap-adt-qa_adt_execute_class({
  class_name: "ZCL_NEW_FEATURE"
})

// 5. Run unit tests in QA
mcp_abap-adt-qa_adt_run_tests({
  object_name: "ZCL_NEW_FEATURE",
  object_type: "CLAS"
})
```

---

## 🎓 LLM Prompts

### Prompt 1: Simple Execution
**User:** "Execute ZCL_SALES_REPORT in QA"

**LLM:**
```javascript
mcp_abap-adt-qa_adt_execute_class({
  class_name: "ZCL_SALES_REPORT"
})
```

### Prompt 2: Cross-Environment Comparison
**User:** "Run the comparison class in both DEV and QA to see the differences"

**LLM:**
```javascript
// Execute in DEV environment
mcp_abap-adt-onprem_adt_execute_class({
  class_name: "ZCL_COMPARISON"
})

// Execute in QA environment
mcp_abap-adt-qa_adt_execute_class({
  class_name: "ZCL_COMPARISON"
})
```

### Prompt 3: Read Source from QA
**User:** "Show me the active version of ZCL_PROCESSOR in QA"

**LLM:**
```javascript
mcp_abap-adt-qa_adt_read_source({
  object_name: "ZCL_PROCESSOR",
  object_type: "CLAS"
})
```

---

## ⚙️ Configuration Options

### Common Settings:

```json
{
  "SAP_BASE_URL": "https://host:port",     // Required
  "SAP_USERNAME": "username",              // Required
  "SAP_PASSWORD": "password",              // Required
  "SAP_CLIENT": "100",                     // Required
  "SAP_AUTH_MODE": "basic",                // Required (basic auth)
  "SAP_LANGUAGE": "EN"                     // Optional (default: EN)
}
```

### Client-Specific Credentials (Optional):

If a QA environment has multiple clients with different credentials:

```json
{
  "abap-adt-qa": {
    "env": {
      "SAP_BASE_URL": "https://qa-host:44300",
      "SAP_USERNAME": "qa_user",
      "SAP_PASSWORD": "qa_pass",
      "SAP_CLIENT": "100",
      // Additional client credentials
      "SAP_CLIENT_200_USERNAME": "user_200",
      "SAP_CLIENT_200_PASSWORD": "pass_200"
    }
  }
}
```

Then use:
```javascript
mcp_abap-adt-qa_adt_execute_class({
  class_name: "ZCL_TEST",
  client: "200"  // Override to client 200
})
```

---

## 🔒 Security Best Practices

### 1. **Production Access**
- ✅ Use **read-only** credentials for production
- ✅ Grant only `S_DEVELOP` display authorization
- ❌ Never save/activate in production via MCP

### 2. **Credential Management**
- ✅ Store credentials securely in `mcp.json` (local file)
- ✅ Don't commit `mcp.json` to version control
- ✅ Use different passwords for each environment

### 3. **Development vs. Execution**
- ✅ **Develop in DEV only** - use `abap-adt-onprem` for all write operations
- ✅ **Execute/test in any environment** - use appropriate server for read operations
- ❌ **Never develop in QA/PROD** - these should be read-only

### Recommended Tool Usage by Environment:

| Tool Category | DEV | QA | PROD |
|--------------|-----|-----|------|
| `adt_create_*` | ✅ | ❌ | ❌ |
| `adt_save_source` | ✅ | ❌ | ❌ |
| `adt_activate` | ✅ | ❌ | ❌ |
| `adt_execute_class` | ✅ | ✅ | ✅ (read-only) |
| `adt_run_tests` | ✅ | ✅ | ✅ (read-only) |
| `adt_read_source` | ✅ | ✅ | ✅ |

---

## 📊 Use Cases

### Use Case 1: Validate Transport
```
Scenario: Code transported from DEV to QA, need to validate

Workflow:
1. Read source in QA to confirm transport
   → mcp_abap-adt-qa_adt_read_source(...)
   
2. Execute in QA with QA data
   → mcp_abap-adt-qa_adt_execute_class(...)
   
3. Run unit tests in QA
   → mcp_abap-adt-qa_adt_run_tests(...)
```

### Use Case 2: Production Validation
```
Scenario: Validate code behavior with production data

Workflow:
1. Execute report in PROD (read-only)
   → mcp_abap-adt-prod_adt_execute_class(...)
   
2. Compare results with DEV
   → Compare outputs from PROD vs DEV execution
```

### Use Case 3: Cross-Environment Debugging
```
Scenario: Code works in DEV but fails in QA

Workflow:
1. Execute in DEV → Works
   → mcp_abap-adt-onprem_adt_execute_class(...)
   
2. Execute in QA → Fails
   → mcp_abap-adt-qa_adt_execute_class(...)
   
3. Read source in both environments
   → Compare versions to identify differences
```

---

## ⚠️ Important Notes

### 1. **Tool Names Are Environment-Specific**
- Each environment has its own set of tools
- Tool names include the server name: `mcp_<server>_<tool>`
- You must use the correct tool for the target environment

### 2. **Sessions Are Independent**
- Each MCP server instance maintains its own session
- Cookies, CSRF tokens, locks are environment-specific
- No cross-contamination between environments

### 3. **Same Server Code, Different Config**
- All environments use the same `server_adt.js` code
- Only the configuration (host, credentials, client) differs
- No code changes needed to add new environments

### 4. **Restart Required**
- After adding/modifying MCP server configs in `mcp.json`
- Cursor must be restarted to load changes
- You'll see the new tools appear in the tool list

---

## 🧪 Testing After Setup

After adding the QA configuration and restarting Cursor:

### Test 1: List Available Tools
```
Look for new tools starting with "mcp_abap-adt-qa_"
```

### Test 2: Execute Simple Class
```javascript
mcp_abap-adt-qa_adt_execute_class({
  class_name: "ZCL_HELLO_WORLD"
})
```

### Test 3: Read Source
```javascript
mcp_abap-adt-qa_adt_read_source({
  object_name: "ZCL_HELLO_WORLD",
  object_type: "CLAS"
})
```

---

## 🎛️ Advanced Configuration

### Different Server Versions:

If QA uses a different ADT API version or setup:

```json
{
  "abap-adt-qa": {
    "command": "node",
    "args": ["C:\\Path\\To\\server_adt_qa.js"],  // Custom server
    "env": { ... }
  }
}
```

### BTP-Specific Setup:

BTP environments use a different server implementation:

```json
{
  "abap-adt-btp-dev": {
    "command": "node",
    "args": ["C:\\Path\\To\\server_adt_btp.js"],  // BTP server
    "env": {
      "SAP_BASE_URL": "https://dev-instance.abap-web.eu10.hana.ondemand.com",
      "SAP_CLIENT": "100",
      "SAP_BTP_COOKIES_FILE": "C:\\Path\\To\\btp_dev_cookies.json"
    }
  }
}
```

---

## 🆚 Multi-Environment vs. Multi-Client

| Feature | Multi-Environment | Multi-Client |
|---------|------------------|--------------|
| **Purpose** | Different SAP systems | Different clients in same system |
| **Configuration** | Multiple MCP servers | Single MCP server with client param |
| **Host** | Different hosts | Same host |
| **Credentials** | Different credentials | Can be same or different |
| **Tool Names** | `mcp_server-name_tool` | Same tool, `client` parameter |
| **Use Case** | DEV → QA → PROD | Dev client → Test client |

### When to Use Each:

**Multi-Environment (This Guide):**
- ✅ Separate SAP systems (DEV, QA, PROD)
- ✅ Different hosts
- ✅ Cross-system validation
- ✅ Transport validation

**Multi-Client (CLIENT_PARAMETER_GUIDE.md):**
- ✅ Same SAP system
- ✅ Different clients (e.g., 210, 220, 300)
- ✅ Client-specific data testing
- ✅ Quick client switching

---

## 📚 Related Documentation

- **[CLIENT_PARAMETER_GUIDE.md](CLIENT_PARAMETER_GUIDE.md)** - Multi-client execution on same system
- **[ENHANCED_TOOLS_COMPLETE_GUIDE.md](ENHANCED_TOOLS_COMPLETE_GUIDE.md)** - All available tools
- **[USAGE_GUIDE_MCP.md](USAGE_GUIDE_MCP.md)** - General MCP usage

---

## ✅ Quick Start Checklist

- [ ] Add new MCP server entry in `.cursor/mcp.json`
- [ ] Fill in QA host, credentials, and client
- [ ] Save the file
- [ ] Restart Cursor
- [ ] Verify new tools appear (look for `mcp_abap-adt-qa_*`)
- [ ] Test with simple execution: `mcp_abap-adt-qa_adt_execute_class`
- [ ] Start using cross-environment validation!

---

## 🎉 Benefits

✅ **No Context Switching** - Execute in any environment from Cursor  
✅ **Data Validation** - Compare results across DEV/QA/PROD  
✅ **Transport Validation** - Verify code after transport  
✅ **Production Insights** - Read production data safely  
✅ **Unified Workflow** - Same tools, different targets  
✅ **Complete Isolation** - Independent sessions per environment  

---

**Status:** ✅ Production Ready  
**Last Updated:** November 24, 2025



