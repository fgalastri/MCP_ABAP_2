# SAP Systems Configuration Guide

## Overview

The ADT MCP Server now uses a centralized configuration file (`sap_systems.json`) to manage multiple SAP system credentials. This approach is cleaner, more maintainable, and avoids environment variable complexity.

## Configuration File: `sap_systems.json`

All SAP system credentials are stored in `ADT/sap_systems.json`:

```json
{
  "systems": {
    "DEV": {
      "name": "Development (ON-PREM)",
      "serverName": "abap-adt-onprem",
      "baseUrl": "https://vhnacnc1ci.sap.naturaeco.com:44300",
      "client": "210",
      "username": "your-username",
      "password": "your-password",
      "authMode": "basic",
      "language": "EN",
      "clientSpecificCredentials": {
        "220": {
          "username": "client-220-username",
          "password": "client-220-password"
        }
      }
    },
    "QA": {
      "name": "Quality Assurance (ON-PREM)",
      "serverName": "abap-adt-qa",
      "baseUrl": "https://vhnacnc2cs.sap.naturaeco.com:44300",
      "client": "210",
      "username": "qa-username",
      "password": "qa-password",
      "authMode": "basic",
      "language": "EN"
    },
    "BTP": {
      "name": "BTP Cloud",
      "serverName": "abap-adt-btp",
      "baseUrl": "https://your-btp-system.abap-web.eu10.hana.ondemand.com",
      "client": "100",
      "authMode": "btp",
      "language": "EN",
      "btpCookiesFile": "C:\\path\\to\\btp_cookies.json"
    }
  }
}
```

## Configuration Properties

| Property | Required | Description |
|----------|----------|-------------|
| `name` | Yes | Human-readable system name |
| `serverName` | Yes | MCP server identifier (must match `.cursor/mcp.json` key) |
| `baseUrl` | Yes | SAP system URL |
| `client` | Yes | SAP client number |
| `username` | For basic auth | SAP username |
| `password` | For basic auth | SAP password |
| `authMode` | Yes | Authentication mode: `basic` or `btp` |
| `language` | No | SAP language (default: `EN`) |
| `clientSpecificCredentials` | No | Override credentials for specific clients |
| `btpCookiesFile` | For BTP | Path to BTP cookies file |

## MCP Configuration: `.cursor/mcp.json`

Each MCP server instance specifies which system to use via the `SAP_SYSTEM` environment variable:

```json
{
  "mcpServers": {
    "abap-adt-onprem": {
      "command": "node",
      "args": ["C:\\path\\to\\MCP\\ADT\\server_adt.js"],
      "env": {
        "SAP_SYSTEM": "DEV"
      }
    },
    "abap-adt-qa": {
      "command": "node",
      "args": ["C:\\path\\to\\MCP\\ADT\\server_adt.js"],
      "env": {
        "SAP_SYSTEM": "QA"
      }
    },
    "abap-adt-btp": {
      "command": "node",
      "args": ["C:\\path\\to\\MCP\\ADT\\server_adt.js"],
      "env": {
        "SAP_SYSTEM": "BTP"
      }
    }
  }
}
```

## How It Works

1. **Cursor starts each MCP server** with the `SAP_SYSTEM` environment variable
2. **Server reads `sap_systems.json`** and loads the specified system configuration
3. **Tools are registered** with unique names based on `serverName` from config
4. **All operations use** the credentials and connection details from the config

## Multi-Client Execution

You can execute code in different clients within the same system using the `client` parameter:

```javascript
// Execute in client 210 (default from config)
mcp_abap-adt-onprem_adt_execute_class("ZCL_MY_CLASS")

// Execute in client 220 (using client-specific credentials)
mcp_abap-adt-onprem_adt_execute_class("ZCL_MY_CLASS", { client: "220" })
```

### Client-Specific Credentials

Define credentials for specific clients in `clientSpecificCredentials`:

```json
"DEV": {
  "client": "210",
  "username": "default-user",
  "password": "default-password",
  "clientSpecificCredentials": {
    "220": {
      "username": "client-220-user",
      "password": "client-220-password"
    },
    "300": {
      "username": "client-300-user",
      "password": "client-300-password"
    }
  }
}
```

## Adding New Systems

To add a new SAP system:

1. **Add system to `sap_systems.json`:**
   ```json
   "PROD": {
     "name": "Production",
     "serverName": "abap-adt-prod",
     "baseUrl": "https://prod-system.com:44300",
     "client": "100",
     "username": "prod-user",
     "password": "prod-password",
     "authMode": "basic",
     "language": "EN"
   }
   ```

2. **Add MCP server to `.cursor/mcp.json`:**
   ```json
   "abap-adt-prod": {
     "command": "node",
     "args": ["C:\\path\\to\\MCP\\ADT\\server_adt.js"],
     "env": {
       "SAP_SYSTEM": "PROD"
     }
   }
   ```

3. **Restart Cursor** to load the new server

4. **Use the tools:**
   ```javascript
   mcp_abap-adt-prod_adt_read_source("ZCL_MY_CLASS", "CLASS")
   ```

## Security Notes

⚠️ **IMPORTANT:** `sap_systems.json` contains sensitive credentials!

- **Never commit** this file to version control
- Add to `.gitignore`: `ADT/sap_systems.json`
- Use appropriate file permissions
- Consider using encrypted storage for production

## Log Files

Each system writes to its own log file based on the system key:

- DEV: `adt_debug_dev.log`
- QA: `adt_debug_qa.log`
- BTP: `adt_debug_btp.log`

## Benefits of This Approach

✅ **Single Source of Truth** - All credentials in one file  
✅ **No Environment Variable Complexity** - Simple `SAP_SYSTEM` selector  
✅ **Easy to Add Systems** - Just edit config file  
✅ **Consistent Structure** - Same server code for all systems  
✅ **Client Override Support** - Built-in multi-client execution  
✅ **Clear Logging** - Separate log files per system  

## Troubleshooting

### System Not Found
```
Error: System 'XXX' not found in configuration file
```
**Solution:** Check that the system key in `.cursor/mcp.json` matches a key in `sap_systems.json`

### Tools Not Appearing
**Solution:** Restart Cursor after modifying configuration files

### Wrong System Being Used
**Solution:** Check the log file to confirm which system was loaded. The startup logs show system details.

## Migration from Environment Variables

If you were using the old environment variable approach:

1. **Create `sap_systems.json`** with your systems
2. **Update `.cursor/mcp.json`** to use `SAP_SYSTEM` env var only
3. **Remove old wrapper files** (`server_adt_qa.js`, etc.)
4. **Restart Cursor**
5. **Test each system** to confirm correct configuration


