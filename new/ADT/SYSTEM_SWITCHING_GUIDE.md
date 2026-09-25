# Dynamic System Switching Guide

## Overview

The ADT MCP Server now supports **dynamic system switching** - switch between DEV, QA, and BTP environments on-the-fly without restarting Cursor!

This feature solves the Cursor MCP routing bug by using a **single MCP server** that can dynamically change which SAP system it connects to.

## How It Works

1. **Single MCP Server**: Only one MCP server (`abap-adt`) runs at a time
2. **State File**: Current system is stored in `ADT/current_system.json`
3. **Dynamic Configuration**: Server reloads configuration when you switch systems
4. **Session Reset**: Clears cookies, CSRF tokens, and reinitializes connection

## Usage

### Switch to a Different System

```javascript
// Switch to QA
mcp_abap-adt_adt_switch_system({ system: "QA" })

// Switch to DEV
mcp_abap-adt_adt_switch_system({ system: "DEV" })

// Switch to BTP
mcp_abap-adt_adt_switch_system({ system: "BTP" })
```

**Case-insensitive:**
- `"DEV"`, `"dev"`, `"Dev"` all work
- `"QA"`, `"qa"`, `"Qa"` all work
- `"BTP"`, `"btp"`, `"Btp"` all work

### Use Any ADT Tool

After switching, all ADT tools automatically use the new system:

```javascript
// Read from current system
mcp_abap-adt_adt_read_source("ZCL_MY_CLASS", "CLASS")

// Create in current system
mcp_abap-adt_adt_create_class("ZCL_NEW_CLASS", "Description", "ZPACKAGE", "S4HK123456")

// Execute in current system
mcp_abap-adt_adt_execute_class("ZCL_TEST")
```

## Configuration

### Single Server Setup

`.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "abap-adt": {
      "command": "node",
      "args": ["C:\\path\\to\\MCP\\ADT\\server_adt.js"],
      "env": {
        "SAP_SYSTEM": "DEV"
      }
    }
  }
}
```

**Note:** `SAP_SYSTEM` sets the initial/default system. You can switch to any system at runtime.

### System Definitions

All systems are defined in `ADT/sap_systems.json`:

```json
{
  "systems": {
    "DEV": { ... },
    "QA": { ... },
    "BTP": { ... }
  }
}
```

See [SAP_SYSTEMS_CONFIG_GUIDE.md](SAP_SYSTEMS_CONFIG_GUIDE.md) for detailed configuration.

## Typical Workflow

### Development Workflow

```javascript
// 1. Start with DEV (default)
mcp_abap-adt_adt_read_source("ZCL_MY_CLASS", "CLASS")

// 2. Make changes, test locally...

// 3. Switch to QA for testing
mcp_abap-adt_adt_switch_system({ system: "QA" })

// 4. Test in QA
mcp_abap-adt_adt_execute_class("ZCL_MY_CLASS")

// 5. Switch back to DEV for more changes
mcp_abap-adt_adt_switch_system({ system: "DEV" })
```

### Multi-Environment Comparison

```javascript
// Read from DEV
mcp_abap-adt_adt_switch_system({ system: "DEV" })
const devCode = await mcp_abap-adt_adt_read_source("ZI_SALES_VIEW", "DDLS")

// Read from QA
mcp_abap-adt_adt_switch_system({ system: "QA" })
const qaCode = await mcp_abap-adt_adt_read_source("ZI_SALES_VIEW", "DDLS")

// Compare results...
```

## State File

**Location:** `ADT/current_system.json`

**Format:**
```json
{
  "activeSystem": "QA",
  "lastSwitched": "2025-11-24T20:00:00.000Z"
}
```

**Notes:**
- Automatically created/updated when you switch systems
- Persists between Cursor restarts
- Added to `.gitignore` (don't commit it)

## Features

### ✅ Advantages Over Multi-Server Approach

| Feature | Multi-Server (broken) | System Switching (works!) |
|---------|----------------------|--------------------------|
| **Switch systems** | ❌ Requires Cursor restart | ✅ Instant, no restart |
| **Tool routing** | ❌ Broken in Cursor | ✅ Works perfectly |
| **Resource usage** | ❌ 3+ Node processes | ✅ 1 Node process |
| **Configuration** | ❌ Complex, 3 servers | ✅ Simple, 1 server |
| **Session isolation** | ✅ Automatic | ✅ Automatic (clears on switch) |

### What Happens When You Switch

1. **State file updated** - New system saved to `current_system.json`
2. **Configuration reloaded** - Reads system details from `sap_systems.json`
3. **Logging updated** - Switches to appropriate log file
4. **Session cleared** - Removes all cookies and CSRF tokens
5. **Axios reconfigured** - Updates baseURL, client, credentials
6. **Ready!** - Next tool call uses the new system

### What Gets Switched

- **Base URL** - Different SAP host
- **Credentials** - Username/password for that system
- **Client** - SAP client number
- **Session** - Fresh session cookies
- **CSRF Token** - Fresh token for the new system
- **Log file** - Separate log per system

## Troubleshooting

### Switch Doesn't Work

**Symptoms:** After switching, still connected to old system

**Solution:**
1. Check if switch succeeded (look for ✅ message)
2. Verify `current_system.json` shows correct system
3. Check log file for errors
4. Try switching again

### Invalid System Error

**Symptoms:** `❌ Invalid System`

**Solution:**
- Use only: `"DEV"`, `"QA"`, or `"BTP"`
- Check spelling and quotes
- System must exist in `sap_systems.json`

### Connection Fails After Switch

**Symptoms:** Tools fail after switching

**Solutions:**
1. **Check credentials** - Verify system credentials in `sap_systems.json`
2. **Check network** - Ensure you can reach the target system
3. **Check client** - Verify SAP client number is correct
4. **Switch back** - Return to working system and try again

## Comparison with Multi-Client Execution

### System Switching vs Client Override

| Feature | System Switching | Client Override |
|---------|-----------------|----------------|
| **Changes system** | ✅ Different host/URL | ❌ Same host |
| **Changes credentials** | ✅ Different user | ⚠️ Optional |
| **Changes client** | ✅ Different client | ✅ Different client |
| **Session** | ✅ Fresh session | ⚠️ Fresh for override only |
| **Use case** | DEV → QA → PROD | Testing in different clients |

**When to use each:**
- **System Switching**: Move between environments (DEV, QA, PROD)
- **Client Override**: Stay in same environment, different client (e.g., client 210 → 220)
- **Both**: Switch to QA, then execute in client 300:
  ```javascript
  mcp_abap-adt_adt_switch_system({ system: "QA" })
  mcp_abap-adt_adt_execute_class("ZCL_TEST", { client: "300" })
  ```

## Log Files

Each system logs to its own file:
- **DEV**: `adt_debug_dev.log`
- **QA**: `adt_debug_qa.log`
- **BTP**: `adt_debug_btp.log`

Logs automatically switch when you change systems.

## Examples

### Example 1: Development Cycle

```javascript
// Work in DEV
mcp_abap-adt_adt_read_source("ZCL_SALES", "CLASS")
mcp_abap-adt_adt_save_source("ZCL_SALES", "CLASS", "...code...")
mcp_abap-adt_adt_activate([{ name: "ZCL_SALES", type: "CLAS" }])

// Test in DEV
mcp_abap-adt_adt_execute_class("ZCL_SALES")

// Verify in QA
mcp_abap-adt_adt_switch_system({ system: "QA" })
mcp_abap-adt_adt_execute_class("ZCL_SALES")

// Check in production (BTP)
mcp_abap-adt_adt_switch_system({ system: "BTP" })
mcp_abap-adt_adt_execute_class("ZCL_SALES")
```

### Example 2: Environment Comparison

```javascript
// Compare CDS view across environments
const systems = ["DEV", "QA", "BTP"];
const results = {};

for (const sys of systems) {
  mcp_abap-adt_adt_switch_system({ system: sys })
  results[sys] = await mcp_abap-adt_adt_read_source("ZI_SALES_DATA", "DDLS")
}

// Analyze differences...
```

### Example 3: Multi-Client + Multi-System

```javascript
// Execute in DEV client 210 (default)
mcp_abap-adt_adt_execute_class("ZCL_TEST")

// Execute in DEV client 220
mcp_abap-adt_adt_execute_class("ZCL_TEST", { client: "220" })

// Switch to QA, execute in client 210
mcp_abap-adt_adt_switch_system({ system: "QA" })
mcp_abap-adt_adt_execute_class("ZCL_TEST")

// QA client 300
mcp_abap-adt_adt_execute_class("ZCL_TEST", { client: "300" })
```

## Migration from Multi-Server Setup

If you were using the old multi-server approach:

**Before:**
```json
{
  "mcpServers": {
    "abap-adt-onprem": { ... },
    "abap-adt-qa": { ... },
    "abap-adt-btp": { ... }
  }
}
```

**After:**
```json
{
  "mcpServers": {
    "abap-adt": { ... }
  }
}
```

**Tool names change:**
- ❌ `mcp_abap-adt-onprem_adt_read_source` → ✅ `mcp_abap-adt_adt_read_source`
- ❌ `mcp_abap-adt-qa_adt_read_source` → ✅ `mcp_abap-adt_adt_read_source`

**Workflow change:**
- ❌ Call different tool names for different systems
- ✅ Switch system first, then use same tool name

## Benefits

✅ **No Cursor Restart** - Switch systems in seconds  
✅ **Works Around Routing Bug** - Single server = no routing issues  
✅ **Lower Resource Usage** - One Node process instead of three  
✅ **Simpler Configuration** - One server definition  
✅ **Same Tool Names** - No confusion about which tools to use  
✅ **Full Isolation** - Fresh sessions when switching  
✅ **Persistent State** - Remember last system across restarts  

## Technical Details

### How It Works Internally

1. **State File Check** - Server reads `current_system.json` on startup
2. **Initial Load** - Loads config for current system
3. **Tool Call** - `adt_switch_system` updates state file
4. **Configuration Reload** - Reloads `sap_systems.json` for new system
5. **Service Update** - Updates axios client, credentials, session
6. **Next Request** - Uses new system automatically

### Thread Safety

- State file writes are synchronous (blocking)
- Only one request processed at a time (Node.js single-threaded)
- No race conditions between switch and other operations

### Performance

- **Switch time:** < 100ms
- **First request after switch:** Establishes new session (~500-1000ms)
- **Subsequent requests:** Normal speed

## See Also

- [SAP_SYSTEMS_CONFIG_GUIDE.md](SAP_SYSTEMS_CONFIG_GUIDE.md) - System configuration
- [CLIENT_PARAMETER_GUIDE.md](CLIENT_PARAMETER_GUIDE.md) - Multi-client execution
- [MULTI_ENVIRONMENT_GUIDE.md](MULTI_ENVIRONMENT_GUIDE.md) - Old multi-server approach (deprecated)


