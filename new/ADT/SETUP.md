# ADT MCP Server - Quick Setup

## 🚀 5-Minute Setup

### Step 1: Install Dependencies

```bash
cd ADT
npm install
```

This will install:
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `axios` - HTTP client for SAP REST API calls
- `fast-xml-parser` - XML parsing for ADT responses

---

### Step 2: Configure SAP Connection

**Option A: Environment Variables** (Recommended)

```bash
# Create .env file (will be gitignored)
cat > .env << 'EOF'
SAP_BASE_URL=https://your-sap-system.com:44301
SAP_USERNAME=your_username
SAP_PASSWORD=your_password
SAP_CLIENT=100
EOF
```

**Option B: Edit server_adt.js**

Edit lines 20-24 in `server_adt.js`:

```javascript
const SAP_CONFIG = {
  baseUrl: 'https://your-sap-system.com:44301',
  username: 'YOUR_USERNAME',
  password: 'YOUR_PASSWORD',
  client: '100'
};
```

⚠️ **Security Warning:** Don't commit passwords to Git!

---

### Step 3: Test Connection

```bash
# Run server in test mode
node server_adt.js
```

**Expected Output:**
```
Starting ABAP ADT MCP Server...
Connected to: https://your-sap-system.com:44301
Client: 100
User: your_username
ADT MCP Server ready for connections
```

If you see this, your server is ready! Press Ctrl+C to stop.

---

### Step 4: Configure MCP Client

Choose your MCP client:

#### For Cursor

1. Open workspace settings (`.cursor/mcp.json`)
2. Add server configuration:

```json
{
  "mcpServers": {
    "abap-adt": {
      "command": "node",
      "args": ["/full/path/to/ADT/server_adt.js"],
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

3. Restart Cursor
4. Look for "MCP" icon in sidebar

#### For Claude Desktop

1. Open config file:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

2. Add server:

```json
{
  "mcpServers": {
    "abap-adt": {
      "command": "node",
      "args": ["C:\\full\\path\\to\\ADT\\server_adt.js"],
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

3. Restart Claude Desktop

---

### Step 5: Test with Simple Command

In Cursor or Claude Desktop:

**Prompt:**
```
Use the adt_read_source tool to read the source code of ABAP class ZCL_TEST
```

**Expected Response:**
```
✅ Successfully Read CLAS ZCL_TEST

[Source code will be displayed]
```

---

## 🔧 Troubleshooting

### Issue: "Cannot find module '@modelcontextprotocol/sdk'"

**Solution:**
```bash
cd ADT
npm install
```

---

### Issue: "CSRF token request failed"

**Possible Causes:**
1. Wrong URL/credentials
2. SAP system not accessible
3. User doesn't have authorization

**Solution:**
```bash
# Test SAP connection manually
curl -k -u username:password https://your-sap-system:44301/sap/bc/adt/discovery
```

Should return XML with system info.

---

### Issue: "Object not found (404)"

**Causes:**
- Object doesn't exist
- Wrong object name (check case)
- Wrong object type

**Solution:**
- Verify object exists in SAP (SE24, SE80, etc.)
- Check object name spelling
- Try with different object

---

### Issue: Server starts but tools don't appear in Cursor

**Solutions:**

1. **Check MCP server status:**
   - Look for MCP icon in Cursor sidebar
   - Should show "abap-adt" server connected

2. **Check logs:**
   - Cursor: View → Output → MCP
   - Look for errors

3. **Verify path:**
   - Must be absolute path to `server_adt.js`
   - Windows: Use `C:\\path\\to\\...`
   - macOS/Linux: Use `/full/path/to/...`

4. **Restart Cursor**

---

## 📊 Verify Installation

Run this checklist:

```bash
cd ADT

# 1. Check Node.js version (should be 18+)
node --version

# 2. Check dependencies installed
npm list @modelcontextprotocol/sdk axios fast-xml-parser

# 3. Test server starts
node server_adt.js
# Press Ctrl+C after seeing "ready for connections"

# 4. Check SAP connectivity
curl -k -u username:password https://your-sap:44301/sap/bc/adt/discovery
```

All green? You're ready to go! ✅

---

## 🎯 Next Steps

### Test Each Tool

1. **Read Source:**
   ```
   Use adt_read_source to read class ZCL_HELLO_WORLD
   ```

2. **Check Syntax:**
   ```
   Check syntax of class ZCL_TEST using adt_check_syntax
   ```

3. **Save and Activate:**
   ```
   Read ZCL_TEST, add a comment, and activate it using adt_update_and_activate
   ```

### Learn More

- **Usage Guide:** `USAGE_GUIDE.md` - Detailed tool documentation
- **AI Agent Guide:** `AI_AGENT_CALLS.md` - How AI should use tools
- **API Discovery:** `ADT_DISCOVERY_LOG.md` - All discovered REST APIs
- **Architecture:** `ARCHITECTURE.md` - System design

---

## 📁 File Structure

```
ADT/
├── server_adt.js              ← MCP server (main file)
├── package.json               ← Dependencies
├── SETUP.md                   ← This file
├── USAGE_GUIDE.md            ← Tool documentation
├── AI_AGENT_CALLS.md         ← AI agent instructions
├── ADT_DISCOVERY_LOG.md      ← REST API discoveries
├── ARCHITECTURE.md           ← System architecture
└── README.md                 ← Project overview
```

---

## 🔐 Security Best Practices

### For Development

✅ **DO:**
- Use environment variables
- Add `.env` to `.gitignore`
- Use HTTPS (even with self-signed certs in dev)

❌ **DON'T:**
- Commit credentials to Git
- Share credentials in chat logs
- Use HTTP (unencrypted)

### For Production

✅ **DO:**
- Use secure credential storage (OS keychain, vault)
- Enable certificate verification
- Use VPN for external access
- Rotate passwords regularly
- Use service accounts with minimal permissions

❌ **DON'T:**
- Store passwords in config files
- Disable SSL verification in production
- Use personal accounts
- Share credentials across environments

---

## 📞 Getting Help

### Check Logs

**Server logs:**
```bash
# Run with debug output
NODE_DEBUG=mcp node server_adt.js 2> server.log
```

**Cursor MCP logs:**
- View → Output → MCP

### Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `ECONNREFUSED` | Can't connect to SAP | Check URL, network, VPN |
| `401 Unauthorized` | Wrong credentials | Check username/password |
| `403 Forbidden` | No authorization | Check SAP permissions (S_DEVELOP) |
| `404 Not Found` | Object doesn't exist | Verify object name and type |
| `CSRF token failed` | Token issue | Usually temporary, retry |

---

## ✅ Installation Complete!

You should now have:
- ✅ ADT MCP server installed
- ✅ SAP connection configured
- ✅ MCP client configured (Cursor/Claude)
- ✅ Tools available to AI agent

**Test it out:**

In Cursor or Claude Desktop, try:
```
Show me the source code of ABAP class ZCL_HELLO_WORLD using the ADT tools
```

If it works, congratulations! 🎉 You're ready to start developing ABAP with AI assistance!

---

## 🚀 What's Next?

### Beginner Tasks

1. Read a few classes to understand structure
2. Check syntax of existing objects
3. Make a simple change (add comment) and activate

### Intermediate Tasks

4. Add a new method to existing class
5. Fix syntax errors with AI help
6. Create a new class from scratch

### Advanced Tasks

7. Refactor code with AI assistance
8. Generate classes based on requirements
9. Build complete RAP services
10. Automate ABAP development workflows

---

**Happy Coding!** 🚀



