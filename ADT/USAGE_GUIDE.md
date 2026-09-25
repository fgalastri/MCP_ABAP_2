# ADT MCP Server - Usage Guide

## 🎯 Overview

The **ADT MCP Server** (`server_adt.js`) provides direct access to SAP ABAP systems using Eclipse ADT (ABAP Development Tools) REST APIs. Unlike the OData4-based approach, this bypasses custom services and uses the same APIs that Eclipse ADT uses internally.

---

## 🚀 Quick Start

### Prerequisites

1. **Node.js 18+** installed
2. **SAP system** with ADT enabled (NetWeaver 7.50+)
3. **SAP credentials** with appropriate authorization
4. **MCP SDK** installed (`@modelcontextprotocol/sdk`)

### Installation

```bash
cd ADT
npm install @modelcontextprotocol/sdk axios fast-xml-parser
```

### Configuration

Set environment variables or edit `server_adt.js`:

```bash
export SAP_BASE_URL="https://your-sap-system.com:port"
export SAP_USERNAME="your_username"
export SAP_PASSWORD="your_password"
export SAP_CLIENT="100"
```

### Running the Server

```bash
# Standalone test
node server_adt.js

# With MCP client (Cursor, Claude Desktop, etc.)
# Add to MCP client configuration - see below
```

---

## 🛠️ Available Tools

### 1. `adt_read_source`

**Purpose:** Read ABAP object source code from SAP system

**Parameters:**
- `object_name` (string, required): Name of ABAP object (e.g., `ZCL_MY_CLASS`)
- `object_type` (string, required): Object type - `CLAS`, `INTF`, `PROG`, `DDLS`, `FUGR`, `TABL`

**Example:**
```json
{
  "object_name": "ZCL_TEST_CLASS",
  "object_type": "CLAS"
}
```

**Returns:**
- Complete source code
- Object metadata
- Success/error status

**Use Cases:**
- Read existing code for analysis
- Get current state before modifications
- Compare versions
- Extract code patterns

---

### 2. `adt_save_source`

**Purpose:** Save ABAP object source code (Lock → Save → Unlock)

**Parameters:**
- `object_name` (string, required): Name of ABAP object
- `object_type` (string, required): Object type
- `source_code` (string, required): Complete ABAP source code

**Example:**
```json
{
  "object_name": "ZCL_MY_CLASS",
  "object_type": "CLAS",
  "source_code": "CLASS zcl_my_class DEFINITION...\n..."
}
```

**Returns:**
- Lock handle
- Transport request number
- Save status
- Unlock confirmation

**Important:**
- ⚠️ This saves but does NOT activate
- Source is saved as "inactive" version
- Must call `adt_activate` separately to activate
- Automatically handles locking/unlocking

---

### 3. `adt_check_syntax`

**Purpose:** Check syntax of saved ABAP object

**Parameters:**
- `object_name` (string, required): Name of ABAP object
- `object_type` (string, required): Object type
- `version` (string, optional): `"active"` or `"inactive"` (default: `"inactive"`)

**Example:**
```json
{
  "object_name": "ZCL_MY_CLASS",
  "object_type": "CLAS",
  "version": "inactive"
}
```

**Returns:**
- List of errors, warnings, info messages
- Each message includes:
  - Type: `E` (Error), `W` (Warning), `I` (Info)
  - Line number and column
  - Error text
  - URI to source location
- `hasErrors` flag (true if any type `E` messages)

**Use Cases:**
- Validate before activation
- Check for syntax errors
- Get compiler warnings
- Find code issues with line numbers

---

### 4. `adt_activate`

**Purpose:** Activate one or more ABAP objects

**Parameters:**
- `objects` (array, required): List of objects to activate
  - Each object has:
    - `name` (string): Object name
    - `type` (string): Object type

**Example:**
```json
{
  "objects": [
    { "name": "ZCL_MY_CLASS", "type": "CLAS" },
    { "name": "ZIF_MY_INTERFACE", "type": "INTF" }
  ]
}
```

**Returns:**
- Activation status (success/failure)
- Check execution status
- Generation execution status
- Error messages if activation failed

**Important:**
- Automatically runs syntax check first (preaudit)
- Will NOT activate if syntax errors found
- Can activate multiple objects in one call
- Returns detailed error messages with line numbers

---

### 5. `adt_update_and_activate`

**Purpose:** Complete workflow - Lock → Save → Syntax Check → Activate → Unlock

**Parameters:**
- `object_name` (string, required): Name of ABAP object
- `object_type` (string, required): Object type
- `source_code` (string, required): Complete ABAP source code

**Example:**
```json
{
  "object_name": "ZCL_MY_CLASS",
  "object_type": "CLAS",
  "source_code": "CLASS zcl_my_class DEFINITION...\n..."
}
```

**Returns:**
- Step-by-step execution results
- Overall success/failure status
- Detailed error information if any step fails

**Workflow:**
1. **Lock** object for modification
2. **Save** source code with transport request
3. **Syntax Check** the saved code
4. **Activate** if no errors
5. **Unlock** object (always, even on error)

**Use Cases:**
- ✅ **Recommended for most use cases**
- Single call for complete update
- Automatic error handling
- Always unlocks even on failure

---

## 📖 Supported Object Types

| Type Code | Description | Read | Write | Activate |
|-----------|-------------|------|-------|----------|
| `CLAS` or `CLASS` | ABAP Class | ✅ | ✅ | ✅ |
| `INTF` or `INTERFACE` | ABAP Interface | ✅ | ✅ | ✅ |
| `PROG` or `REPORT` | ABAP Program/Report | ✅ | ✅ | ✅ |
| `DDLS` or `CDS` | CDS View | ✅ | ✅ | ✅ |
| `FUGR` or `FUNCTION_GROUP` | Function Group | ✅ | ✅ | ✅ |
| `TABL` or `TABLE` | Database Table | ✅ | ⚠️ | ✅ |

**Note:** Table structures might require special handling for write operations.

---

## 🔧 Configuration for MCP Clients

### Cursor Configuration

Add to `.cursor/mcp.json` or workspace settings:

```json
{
  "mcpServers": {
    "abap-adt": {
      "command": "node",
      "args": ["/path/to/ADT/server_adt.js"],
      "env": {
        "SAP_BASE_URL": "https://your-sap-system.com:44301",
        "SAP_USERNAME": "your_username",
        "SAP_PASSWORD": "your_password",
        "SAP_CLIENT": "100"
      }
    }
  }
}
```

### Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "abap-adt": {
      "command": "node",
      "args": ["/path/to/ADT/server_adt.js"],
      "env": {
        "SAP_BASE_URL": "https://your-sap-system.com:44301",
        "SAP_USERNAME": "your_username",
        "SAP_PASSWORD": "your_password",
        "SAP_CLIENT": "100"
      }
    }
  }
}
```

### Custom MCP Client

```javascript
const { spawn } = require('child_process');

const mcpProcess = spawn('node', ['/path/to/ADT/server_adt.js'], {
  env: {
    ...process.env,
    SAP_BASE_URL: 'https://your-sap-system.com:44301',
    SAP_USERNAME: 'your_username',
    SAP_PASSWORD: 'your_password',
    SAP_CLIENT: '100'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});
```

---

## 💡 Usage Examples

### Example 1: Read and Modify a Class

**Step 1: Read current source**
```json
{
  "tool": "adt_read_source",
  "arguments": {
    "object_name": "ZCL_MY_CLASS",
    "object_type": "CLAS"
  }
}
```

**Step 2: Modify source code (in your editor/AI)**

**Step 3: Save and activate**
```json
{
  "tool": "adt_update_and_activate",
  "arguments": {
    "object_name": "ZCL_MY_CLASS",
    "object_type": "CLAS",
    "source_code": "CLASS zcl_my_class DEFINITION...\n[modified code]"
  }
}
```

---

### Example 2: Check Syntax Before Activation

```json
// Step 1: Save without activating
{
  "tool": "adt_save_source",
  "arguments": {
    "object_name": "ZCL_MY_CLASS",
    "object_type": "CLAS",
    "source_code": "..."
  }
}

// Step 2: Check syntax
{
  "tool": "adt_check_syntax",
  "arguments": {
    "object_name": "ZCL_MY_CLASS",
    "object_type": "CLAS",
    "version": "inactive"
  }
}

// Step 3: If no errors, activate
{
  "tool": "adt_activate",
  "arguments": {
    "objects": [
      { "name": "ZCL_MY_CLASS", "type": "CLAS" }
    ]
  }
}
```

---

### Example 3: Mass Activation

```json
{
  "tool": "adt_activate",
  "arguments": {
    "objects": [
      { "name": "ZCL_CLASS_1", "type": "CLAS" },
      { "name": "ZCL_CLASS_2", "type": "CLAS" },
      { "name": "ZIF_INTERFACE_1", "type": "INTF" },
      { "name": "Z_CDS_VIEW_1", "type": "DDLS" }
    ]
  }
}
```

---

## 🔍 Error Handling

### Common Errors

#### 1. Object Not Found (404)
```
Error: Failed to read source
HTTP Status: 404
```

**Causes:**
- Object doesn't exist
- Wrong object name (check case)
- Wrong object type

**Solution:**
- Verify object exists in SAP system
- Check object name spelling
- Ensure correct object type

---

#### 2. Lock Failed (403)
```
Error: Lock failed - User XYZ is currently editing object
HTTP Status: 403
```

**Causes:**
- Object already locked by another user
- You have object locked in another session
- Object is being edited in Eclipse

**Solution:**
- Wait for other user to finish
- Unlock object in Eclipse/SAP GUI
- Use SE09 to release locks

---

#### 3. Syntax Errors
```
Status: processed
Has Errors: true
Messages:
- [E] Line 42: Type "STRINGG" is unknown
```

**Causes:**
- ABAP syntax errors in source code
- Unknown types/methods
- Missing declarations

**Solution:**
- Fix syntax errors shown in messages
- Check line numbers provided
- Use `adt_check_syntax` to validate before activation

---

#### 4. Authorization Issues
```
Error: No authorization for operation
HTTP Status: 403
```

**Causes:**
- Missing S_DEVELOP authorization
- No change authorization for package
- Transport request restrictions

**Solution:**
- Request proper authorizations
- Use correct transport request
- Check with basis team

---

## 🔐 Security Considerations

### Credentials Storage

**⚠️ IMPORTANT:** Never commit credentials to Git!

**Recommended approaches:**

1. **Environment Variables** (Best for production)
```bash
export SAP_USERNAME="..."
export SAP_PASSWORD="..."
```

2. **Separate Config File** (Add to .gitignore)
```javascript
// config.local.js (gitignored)
export default {
  username: 'your_user',
  password: 'your_pass'
};
```

3. **Secure Storage** (Eclipse Secure Storage, OS Keychain)

4. **SSO/OAuth** (If SAP supports it)

### Network Security

- ✅ Use HTTPS (TLS/SSL)
- ✅ Verify certificates in production
- ⚠️ `rejectUnauthorized: false` only for development
- ✅ Use VPN for external access

---

## 🎯 Best Practices

### 1. Always Unlock

```javascript
// Always use try-finally for manual locking
try {
  const lock = await lockObject(...);
  await saveSource(...);
} finally {
  await unlockObject(...); // Always unlock!
}
```

**Or:** Use `adt_update_and_activate` which handles this automatically.

---

### 2. Check Syntax Before Activation

```javascript
// Don't activate blindly
const syntaxResult = await checkSyntax(...);
if (syntaxResult.hasErrors) {
  console.log('Fix these errors first:', syntaxResult.messages);
  return;
}
await activate(...);
```

---

### 3. Use Complete Source Code

```javascript
// ❌ DON'T: Send partial source
await saveSource('ZCL_TEST', 'CLAS', 'METHOD xyz...');

// ✅ DO: Always send complete source
const fullSource = await readSource('ZCL_TEST', 'CLAS');
const modifiedSource = modifySource(fullSource);
await saveSource('ZCL_TEST', 'CLAS', modifiedSource);
```

---

### 4. Handle Errors Gracefully

```javascript
const result = await adtUpdateAndActivate(...);
if (!result.success) {
  // Check which step failed
  const failedStep = result.steps.find(s => !s.result.success);
  console.log(`Failed at step: ${failedStep.step}`);
  console.log(`Error: ${failedStep.result.error}`);
}
```

---

## 📊 Comparison: ADT vs OData4

| Feature | ADT Server | OData4 Server |
|---------|-----------|---------------|
| **Read Source** | ✅ Direct API | ✅ Via custom service |
| **Write Source** | ✅ Direct API | ⚠️ Limited support |
| **Syntax Check** | ✅ Native ADT | ⚠️ Custom implementation |
| **Activation** | ✅ Native ADT | ⚠️ Custom implementation |
| **Locking** | ✅ Built-in | ❌ Not supported |
| **Transport Requests** | ✅ Automatic | ⚠️ Manual |
| **Multiple Objects** | ✅ Mass activation | ❌ One at a time |
| **Setup Required** | ❌ None (uses ADT) | ✅ Custom services needed |
| **Reliability** | ✅ High (SAP standard) | ⚠️ Depends on custom code |

**Recommendation:** Use **ADT Server** for production, OData4 server for validation/execution.

---

## 🚀 Next Steps

1. **Test Connection**
   ```bash
   node server_adt.js
   # Test with simple read operation
   ```

2. **Configure MCP Client**
   - Add to Cursor or Claude Desktop
   - Test basic read operation

3. **Try Examples**
   - Read existing class
   - Modify and save
   - Check syntax
   - Activate

4. **Build Workflows**
   - Create AI agent instructions
   - Set up automation
   - Integrate with CI/CD

---

## 📚 Additional Resources

- **ADT Discovery Log:** `ADT_DISCOVERY_LOG.md` - All discovered APIs
- **Architecture:** `ARCHITECTURE.md` - System design
- **AI Agent Guide:** `AI_AGENT_CALLS.md` - How AI should use these tools
- **Quick Answers:** `QUICK_ANSWER_MCP_VS_ADT.md` - Decision guide

---

## 🐛 Troubleshooting

### Server Won't Start

**Check:**
1. Node.js version (18+)
2. Dependencies installed (`npm install`)
3. Environment variables set
4. SAP system accessible

### Connection Timeouts

**Check:**
1. SAP system is running
2. Network connectivity
3. Firewall rules
4. VPN connected

### CSRF Token Errors

**Solution:**
- Token is automatically managed
- If issues persist, check SAP configuration
- Ensure user has proper authorization

---

**Ready to start?** Follow the Quick Start guide above! 🚀



