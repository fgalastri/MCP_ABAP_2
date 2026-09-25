# HTTP MCP Client Setup Guide

## Overview

This guide shows you how to configure Cursor to use the **HTTP MCP server** instead of (or alongside) the local stdio server.

This is useful when:
- The HTTP server is running on a remote machine
- You want to share one MCP server across multiple Cursor instances
- You want to access a centralized SAP connection

---

## Architecture

```
Cursor (Your Machine)
  ↓
HTTP MCP Client (server_http_client.js)
  ↓ HTTP/REST
HTTP MCP Server (server_http_v2.js)
  ↓ JSON-RPC
MCP Backend (server_adt.js)
  ↓
SAP System
```

---

## Step 1: Configure Cursor

Edit your Cursor MCP configuration file:

**Location**: `C:\Users\<YourName>\.cursor\mcp.json`

### Option A: Replace Local Server with HTTP Client

```json
{
  "mcpServers": {
    "abap-adt-http": {
      "command": "node",
      "args": ["C:\\Users\\FabianoGalastri\\Cursor\\MCP\\ADT\\server_http_client.js"],
      "env": {
        "HTTP_BASE_URL": "http://localhost:3000",
        "HTTP_API_KEY": "natura-mcp-2026"
      }
    }
  }
}
```

### Option B: Keep Both (Local + HTTP)

```json
{
  "mcpServers": {
    "abap-adt": {
      "command": "node",
      "args": ["C:\\Users\\FabianoGalastri\\Cursor\\MCP\\ADT\\server_adt.js"],
      "env": {
        "SAP_SYSTEM": "DEV"
      }
    },
    "abap-adt-http": {
      "command": "node",
      "args": ["C:\\Users\\FabianoGalastri\\Cursor\\MCP\\ADT\\server_http_client.js"],
      "env": {
        "HTTP_BASE_URL": "http://localhost:3000",
        "HTTP_API_KEY": "natura-mcp-2026"
      }
    }
  }
}
```

---

## Step 2: Restart Cursor

After editing the configuration:

1. **Close Cursor completely**
2. **Restart Cursor**
3. The HTTP client will connect automatically

---

## Step 3: Verify Connection

In Cursor, the tools will now be available with the prefix:

- **Local server**: `mcp_abap-adt_*` (if you kept it)
- **HTTP client**: `mcp_abap-adt-http_*`

Example tools:
- `mcp_abap-adt-http_adt_read_source`
- `mcp_abap-adt-http_adt_execute_sql_query`
- `mcp_abap-adt-http_adt_switch_system`

---

## Configuration Options

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `HTTP_BASE_URL` | URL of HTTP MCP server | `http://localhost:3000` |
| `HTTP_API_KEY` | API key for authentication | `natura-mcp-2026` |

### Remote Server

To connect to a remote HTTP server:

```json
{
  "mcpServers": {
    "abap-adt-http": {
      "command": "node",
      "args": ["C:\\Users\\FabianoGalastri\\Cursor\\MCP\\ADT\\server_http_client.js"],
      "env": {
        "HTTP_BASE_URL": "http://remote-server-ip:3000",
        "HTTP_API_KEY": "natura-mcp-2026"
      }
    }
  }
}
```

---

## Testing

### Test 1: Check if Client Connects

Create a new chat in Cursor and ask:
```
Can you list the available MCP tools?
```

You should see tools like:
- `mcp_abap-adt-http_adt_read_source`
- `mcp_abap-adt-http_adt_execute_sql_query`
- etc.

### Test 2: Execute a Tool

Ask Cursor:
```
Please execute a SQL query to get 3 rows from table T000
```

Cursor should use the HTTP client to execute the query.

---

## Troubleshooting

### Issue: Tools not appearing

**Solution:**
1. Check that HTTP server is running: `http://localhost:3000/health`
2. Verify API key is correct in mcp.json
3. Restart Cursor completely
4. Check Cursor logs for errors

### Issue: Connection timeout

**Solution:**
1. Verify HTTP server is accessible
2. Check firewall settings
3. Increase timeout in `server_http_client.js` (line with `timeout: 60000`)

### Issue: Authentication failed

**Solution:**
1. Verify `HTTP_API_KEY` matches the server's key
2. Check server logs: `ADT/adt_http_dev.log`

---

## Comparison: Local vs HTTP

| Feature | Local (stdio) | HTTP Client |
|---------|---------------|-------------|
| **Speed** | Fastest | Fast (small HTTP overhead) |
| **Setup** | Simple | Requires HTTP server |
| **Remote Access** | No | Yes |
| **Shared** | No | Yes (multiple users) |
| **Use Case** | Single user | Team/Remote access |

---

## Example: Full Configuration

Here's a complete example with both local and HTTP:

```json
{
  "mcpServers": {
    "abap-adt": {
      "command": "node",
      "args": ["C:\\Users\\FabianoGalastri\\Cursor\\MCP\\ADT\\server_adt.js"],
      "env": {
        "SAP_SYSTEM": "DEV"
      }
    },
    "abap-adt-http": {
      "command": "node",
      "args": ["C:\\Users\\FabianoGalastri\\Cursor\\MCP\\ADT\\server_http_client.js"],
      "env": {
        "HTTP_BASE_URL": "http://localhost:3000",
        "HTTP_API_KEY": "natura-mcp-2026"
      }
    }
  }
}
```

**Result**: You'll have both sets of tools available:
- `mcp_abap-adt_*` (local, direct)
- `mcp_abap-adt-http_*` (via HTTP)

---

## Next Steps

1. ✅ Configure Cursor with HTTP client
2. ✅ Restart Cursor
3. ✅ Test connection
4. ✅ Use tools normally

---

**Your Cursor will now access the HTTP MCP server just like the local one!** 🎉
