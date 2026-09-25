# Getting Started with ADT MCP Server

## 🎉 Welcome!

You now have a **complete ADT MCP Server** that enables AI agents to work directly with SAP ABAP systems using Eclipse ADT REST APIs!

---

## 📁 What's Been Created

### Core Files

| File | Purpose |
|------|---------|
| `server_adt.js` | Main MCP server implementation |
| `package.json` | Node.js dependencies and scripts |
| `.gitignore` | Prevents credentials from being committed |

### Documentation

| File | Description | Read This When... |
|------|-------------|-------------------|
| **[README.md](README.md)** | Project overview | You want to understand what this is |
| **[SETUP.md](SETUP.md)** | Installation guide | ⭐ You're setting up for the first time |
| **[USAGE_GUIDE.md](USAGE_GUIDE.md)** | Tool reference | You need detailed tool documentation |
| **[AI_AGENT_CALLS.md](AI_AGENT_CALLS.md)** | AI agent guide | You're building AI workflows |
| **[ADT_DISCOVERY_LOG.md](ADT_DISCOVERY_LOG.md)** | API discovery log | You want to understand the APIs |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System architecture | You want to understand the design |

---

## 🚀 Your Next Steps

### Step 1: Install Dependencies (2 minutes)

```bash
cd ADT
npm install
```

This installs:
- `@modelcontextprotocol/sdk` - MCP protocol
- `axios` - HTTP client for REST APIs
- `fast-xml-parser` - XML parsing for ADT responses

---

### Step 2: Configure SAP Connection (1 minute)

Create a `.env` file in the `ADT` folder:

```bash
# Copy the example (if available)
cp .env.example .env

# Or create manually
cat > .env << 'EOF'
SAP_BASE_URL=https://your-sap-system.com:44301
SAP_USERNAME=your_username
SAP_PASSWORD=your_password
SAP_CLIENT=100
EOF
```

**Replace with your SAP credentials:**
- `SAP_BASE_URL` - Your SAP system URL with port
- `SAP_USERNAME` - Your SAP username
- `SAP_PASSWORD` - Your SAP password
- `SAP_CLIENT` - SAP client number (usually 100, 200, etc.)

⚠️ **The `.env` file is gitignored** - your credentials won't be committed.

---

### Step 3: Test the Server (1 minute)

```bash
npm start
```

**Expected output:**
```
Starting ABAP ADT MCP Server...
Connected to: https://your-sap-system.com:44301
Client: 100
User: your_username
ADT MCP Server ready for connections
```

✅ If you see this, the server is working!

Press `Ctrl+C` to stop the server.

---

### Step 4: Configure Your MCP Client (1 minute)

Choose your AI platform:

#### Option A: Cursor

1. Open your workspace
2. Create or edit `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "abap-adt": {
      "command": "node",
      "args": ["/full/path/to/MCP/ADT/server_adt.js"],
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

3. **Important:** Use the **full absolute path** to `server_adt.js`
4. Restart Cursor

#### Option B: Claude Desktop

1. Find your config file:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux:** `~/.config/Claude/claude_desktop_config.json`

2. Add or edit the configuration:

```json
{
  "mcpServers": {
    "abap-adt": {
      "command": "node",
      "args": ["C:\\full\\path\\to\\MCP\\ADT\\server_adt.js"],
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

### Step 5: Test with AI! (1 minute)

Open Cursor or Claude Desktop and try:

```
Use the adt_read_source tool to read the source code of ABAP class ZCL_HELLO_WORLD
```

**Expected response:**
```
✅ Successfully Read CLAS ZCL_HELLO_WORLD

[Source code will be displayed here]
```

🎉 **It works!** You're ready to start using AI for ABAP development!

---

## 🎯 What Can You Do Now?

### Read ABAP Code

```
Show me the source code of class ZCL_TEST
```

The AI will use `adt_read_source` to fetch and display the code.

---

### Modify ABAP Code

```
Add a method GET_STATUS to class ZCL_ORDER that returns a string
```

The AI will:
1. Read the current source
2. Add the method
3. Use `adt_update_and_activate` to save and activate

---

### Fix Syntax Errors

```
Check class ZCL_TEST for errors and fix them
```

The AI will:
1. Use `adt_check_syntax` to find errors
2. Read the source
3. Fix the errors
4. Update and activate

---

### Check Code Quality

```
Is the code in ZCL_MY_CLASS correct? Check for syntax errors.
```

The AI will use `adt_check_syntax` to validate.

---

## 📚 Learn More

### For Quick Reference

- **Tool Documentation:** [USAGE_GUIDE.md](USAGE_GUIDE.md)
- **AI Patterns:** [AI_AGENT_CALLS.md](AI_AGENT_CALLS.md)

### For Deep Dives

- **API Discovery:** [ADT_DISCOVERY_LOG.md](ADT_DISCOVERY_LOG.md)
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)

### For Troubleshooting

- **Common Issues:** [SETUP.md](SETUP.md) - Troubleshooting section
- **Error Reference:** [USAGE_GUIDE.md](USAGE_GUIDE.md) - Error Handling section

---

## 🔧 Available Tools

| Tool | Use Case | Example |
|------|----------|---------|
| `adt_read_source` | Read ABAP code | "Show me class ZCL_TEST" |
| `adt_save_source` | Save without activating | "Save my changes for review" |
| `adt_check_syntax` | Check for errors | "Check for syntax errors" |
| `adt_activate` | Activate objects | "Activate these classes" |
| `adt_update_and_activate` ⭐ | Complete workflow | "Update this class" |

**Recommended:** Use `adt_update_and_activate` for most modifications - it handles everything automatically!

---

## 💡 Pro Tips

### Tip 1: Let AI Do the Heavy Lifting

Instead of:
```
Read ZCL_TEST, then save it with changes, then check syntax, then activate
```

Just say:
```
Add method GET_DATA to class ZCL_TEST
```

The AI will handle all the steps!

---

### Tip 2: Batch Operations

```
Add logging to classes ZCL_CLASS1, ZCL_CLASS2, and ZCL_CLASS3
```

The AI can process multiple objects in sequence.

---

### Tip 3: Error Recovery

If something fails, just ask the AI to fix it:

```
The activation failed. Can you fix the errors?
```

The AI will check syntax, identify errors, fix them, and retry.

---

## 🐛 Troubleshooting Quick Reference

### Problem: Server won't start

**Check:**
```bash
node --version  # Should be 18+
npm install     # Reinstall dependencies
```

---

### Problem: Can't connect to SAP

**Check:**
```bash
# Test connectivity
curl -k https://your-sap:44301/sap/bc/adt/discovery

# Check:
# - VPN connected?
# - URL correct?
# - Credentials correct?
```

---

### Problem: Tools don't appear in Cursor

**Solutions:**
1. Check MCP config has absolute path
2. Restart Cursor
3. Check View → Output → MCP for errors
4. Verify server starts with `npm start`

---

### Problem: "Object not found"

**Check:**
- Object exists in SAP (SE24, SE80)
- Object name spelling is correct
- Object type is correct (`CLAS` for classes, etc.)

---

## 🎓 Example Workflows

### Example 1: Add a Method

**You:** "Add a method GET_TIMESTAMP to class ZCL_UTILS that returns the current date and time"

**AI:**
1. Reads current source using `adt_read_source`
2. Adds method definition and implementation
3. Updates and activates using `adt_update_and_activate`
4. Confirms: "✅ Method added and activated!"

**Time:** ~10 seconds

---

### Example 2: Fix Bugs

**You:** "Class ZCL_TEST won't activate. Can you fix it?"

**AI:**
1. Checks syntax using `adt_check_syntax`
2. Identifies errors (e.g., typo: `STRINGG` instead of `STRING`)
3. Reads source, fixes errors
4. Updates and activates
5. Confirms: "✅ Fixed syntax error and activated!"

**Time:** ~15 seconds

---

### Example 3: Refactor Code

**You:** "Refactor class ZCL_ORDER to use modern ABAP syntax"

**AI:**
1. Reads current source
2. Analyzes code style
3. Modernizes syntax (inline declarations, functional operators, etc.)
4. Updates and activates
5. Shows: "✅ Refactored to modern ABAP!"

**Time:** ~30 seconds

---

## 🚀 What's Next?

### Beginner

1. ✅ Complete setup (you're here!)
2. Try reading a few classes
3. Make a simple change (add a comment)
4. Check syntax of existing code

### Intermediate

5. Add new methods to classes
6. Fix syntax errors with AI help
7. Refactor code
8. Work with multiple object types

### Advanced

9. Build complete RAP services
10. Generate code from requirements
11. Automate development workflows
12. Integrate with CI/CD

---

## 📞 Getting Help

### Check Documentation

1. **Setup issues?** → [SETUP.md](SETUP.md)
2. **Tool questions?** → [USAGE_GUIDE.md](USAGE_GUIDE.md)
3. **AI patterns?** → [AI_AGENT_CALLS.md](AI_AGENT_CALLS.md)

### Check Logs

```bash
# Server logs
npm start 2> server.log

# Cursor logs
# View → Output → MCP
```

### Common Solutions

| Issue | Solution |
|-------|----------|
| Connection timeout | Check VPN, SAP system running |
| 401 Unauthorized | Check credentials |
| 403 Forbidden | Check SAP authorizations (S_DEVELOP) |
| 404 Not Found | Check object exists |
| Lock error | Unlock in Eclipse/SE24 |

---

## ✅ Success Checklist

After setup, you should be able to:

- [ ] Server starts with `npm start`
- [ ] MCP client shows "abap-adt" connected
- [ ] AI can read ABAP classes
- [ ] AI can modify ABAP classes
- [ ] AI can check syntax
- [ ] AI can activate objects

**All checked?** Congratulations! 🎉 You're ready for AI-powered ABAP development!

---

## 🎉 You're All Set!

You now have:
- ✅ Working ADT MCP Server
- ✅ Connected to your SAP system
- ✅ Integrated with AI agent (Cursor/Claude)
- ✅ Complete documentation
- ✅ Example workflows

**Start developing ABAP with AI assistance!**

### Suggested First Tasks

1. **Read a class you know well** - Verify it works
2. **Add a simple comment** - Test modification workflow
3. **Add a new method** - Test AI code generation
4. **Fix a syntax error** - Test error handling

---

## 📊 Setup Summary

| Step | Time | Status |
|------|------|--------|
| 1. Install dependencies | 2 min | ✅ |
| 2. Configure SAP | 1 min | ✅ |
| 3. Test server | 1 min | ✅ |
| 4. Configure MCP client | 1 min | ✅ |
| 5. Test with AI | 1 min | ✅ |
| **Total** | **~5 min** | **🎉 Done!** |

---

**Happy Coding with AI!** 🚀

*Questions? Check the documentation files in this folder!*



