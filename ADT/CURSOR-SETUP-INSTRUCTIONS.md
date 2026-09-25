# 🚀 Add Thin Client MCP to Cursor

## Quick Setup (2 Minutes)

### **Step 1: Open Cursor Settings**

1. Open **Cursor IDE**
2. Press `Ctrl + Shift + P` (or `Cmd + Shift + P` on Mac)
3. Type: **"Preferences: Open User Settings (JSON)"**
4. Click on it

### **Step 2: Add MCP Configuration**

Find the `"mcpServers"` section (or create it if it doesn't exist).

**Add this configuration:**

```json
{
  "mcpServers": {
    "abap-adt-thin": {
      "command": "node",
      "args": ["C:\\Users\\FabianoGalastri\\Cursor\\MCP\\ADT\\server_adt_thin.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**⚠️ Important Notes:**
- Use **double backslashes** (`\\`) in Windows paths
- Or use forward slashes (`/`) - both work
- Keep your existing MCP servers if you have any

### **Complete Example:**

If you already have MCP servers:

```json
{
  "mcpServers": {
    "abap-adt": {
      "command": "node",
      "args": ["C:\\Users\\FabianoGalastri\\Cursor\\MCP\\ADT\\server_adt.js"]
    },
    "abap-adt-thin": {
      "command": "node",
      "args": ["C:\\Users\\FabianoGalastri\\Cursor\\MCP\\ADT\\server_adt_thin.js"]
    }
  }
}
```

### **Step 3: Save and Restart Cursor**

1. **Save** the settings file (`Ctrl + S`)
2. **Completely close Cursor** (not just the window - quit the app)
3. **Restart Cursor**

### **Step 4: Verify MCP is Loaded**

1. Open a new chat in Cursor
2. Look for the MCP server indicator (bottom right or in chat interface)
3. You should see **"abap-adt-thin"** listed

---

## 🧪 **Test It!**

### **Test 1: Read ABAP Class**

In Cursor chat, type:

```
Please read the source code of class ZBP_TT2
```

**Expected Result:**
- Should show the ABAP class source code
- Should complete in 2-5 seconds

### **Test 2: SQL Query**

In Cursor chat, type:

```
Please show me the first 10 records from table MARA
```

**Expected Result:**
- Should execute SQL query
- Should show table with results

---

## ✅ **Success Indicators**

You'll know it's working when:

1. ✅ Cursor shows MCP server as "connected"
2. ✅ Chat recognizes the ABAP tools
3. ✅ Queries return real SAP data
4. ✅ No authentication errors

---

## 🐛 **Troubleshooting**

### **Issue: MCP server not showing**
**Solution:** 
- Check the file path is correct
- Make sure to use double backslashes `\\`
- Restart Cursor completely

### **Issue: "Command not found"**
**Solution:**
- Verify Node.js is installed: `node --version`
- Check the path to `server_adt_thin.js` is correct

### **Issue: "Connection failed"**
**Solution:**
- Check if server starts manually:
  ```bash
  cd C:\Users\FabianoGalastri\Cursor\MCP\ADT
  node server_adt_thin.js
  ```
- Look for errors in the output

### **Issue: "401 Unauthorized" or credential errors**
**Solution:**
- Verify `sap_systems.json` has correct credentials
- Test thin client directly:
  ```bash
  cd C:\Users\FabianoGalastri\Cursor\MCP\ADT\secure-agent
  node test-simple-call.js
  ```

---

## 📊 **Behind the Scenes**

When you run a query, here's what happens:

```
1. You type in Cursor chat
   ↓
2. Cursor calls MCP tool (e.g., adt_read_source)
   ↓
3. server_adt_thin.js receives the request
   ↓
4. thin-client-adapter.js intercepts HTTP call
   ↓
5. simple-agent.js adds credentials (locally!)
   ↓
6. HTTP call to SAP (inside VPN)
   ↓
7. Response flows back to Cursor
   ↓
8. You see the result! 🎉
```

**Time:** ~2-5 seconds end-to-end

---

## 🎯 **Available Tools (Right Now)**

### **1. adt_read_source**
Read ABAP object source code

**Example:**
- "Read class ZCL_TEST"
- "Show me the code for program ZTEST"
- "Read interface ZIF_MY_INTERFACE"

### **2. adt_execute_sql_query**
Execute SQL SELECT queries

**Example:**
- "Show first 10 records from MARA"
- "Query table EKKO where EBELN starts with '4500'"
- "SELECT count(*) from MARA"

---

## 🚀 **Next Steps (After Success)**

Once it's working, we'll add:

1. ✅ Create tools (classes, interfaces, programs)
2. ✅ Update tools (save and activate)
3. ✅ RAP generator tools
4. ✅ Search tools
5. ✅ Package management tools
6. ✅ All 40+ tools from main server!

**This will take ~15 minutes to add all tools.**

---

## 💡 **Pro Tips**

- **Use specific object names** - "Read class ZBP_TT2" works better than "show me a class"
- **Be explicit** - "Execute SQL: SELECT * FROM mara UP TO 10 ROWS"
- **Check the logs** - If something fails, check ADT debug logs in `ADT/` folder

---

## 🎉 **You're Ready!**

Follow the steps above and let me know:
- ✅ Did Cursor recognize the MCP server?
- ✅ Did the test queries work?
- ❌ Any errors or issues?

**Good luck!** 🚀
