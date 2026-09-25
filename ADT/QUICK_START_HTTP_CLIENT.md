# Quick Start: Access HTTP MCP Server from Cursor

## 🎯 What This Does

Allows you to use the HTTP MCP server from Cursor, just like you use the local server now.

---

## ⚡ Quick Setup (3 Steps)

### Step 1: Edit Cursor Configuration

Open: `C:\Users\FabianoGalastri\.cursor\mcp.json`

Add this configuration:

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

### Step 2: Restart Cursor

Close and reopen Cursor completely.

### Step 3: Test It

In Cursor, ask:
```
Please read the source of class ZPTP_BP_R_PED_BASE_STAGE using the HTTP server
```

---

## ✅ Done!

You can now use the HTTP MCP server from Cursor!

**Tools available**:
- `mcp_abap-adt-http_adt_read_source`
- `mcp_abap-adt-http_adt_execute_sql_query`
- `mcp_abap-adt-http_adt_switch_system`
- All other 40+ tools

---

## 🔧 Configuration Details

**Current Setup**:
- **HTTP Server**: Running on `http://localhost:3000`
- **API Key**: `natura-mcp-2026`
- **SAP System**: DEV (can switch to QA or BTP)

**To use remote server**, change `HTTP_BASE_URL` to:
```json
"HTTP_BASE_URL": "http://remote-ip:3000"
```

---

## 📝 Full Documentation

See `HTTP_CLIENT_SETUP.md` for complete details.
