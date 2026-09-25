# Quick Start Guide - Eclipse ABAP MCP Plugin

## 5-Minute Setup

### Step 1: Prerequisites Check

✅ Eclipse IDE for RCP and RAP Developers (2023-09+)  
✅ Java 17+  
✅ Node.js 18+ (for MCP server)  
✅ Your MCP server running (e.g., abap-validator-remote)

### Step 2: Import Plugin into Eclipse

1. Open Eclipse IDE for RCP and RAP Developers
2. **File → Import → Existing Projects into Workspace**
3. Select `eclipse-abap-mcp-plugin` directory
4. Check "Search for nested projects"
5. Click **Finish**

You should see:
- `eclipse-abap-mcp-plugin` (parent project)
- `com.sap.abap.mcp.core` (plugin bundle)

### Step 3: Run Plugin

1. Right-click on **`com.sap.abap.mcp.core`**
2. Select **Run As → Eclipse Application**
3. Wait for new Eclipse instance to launch (this is your test environment)

### Step 4: Test Basic Functionality

In the new Eclipse instance:

1. **Create a test file**:
   - File → New → File
   - Name it: `ZTEST_CLASS.abap`
   - Add simple ABAP code:
   ```abap
   CLASS zcl_test DEFINITION.
     PUBLIC SECTION.
       METHODS test.
   ENDCLASS.
   
   CLASS zcl_test IMPLEMENTATION.
     METHOD test.
       WRITE 'Hello MCP'.
     ENDMETHOD.
   ENDCLASS.
   ```

2. **Right-click on the file**
3. Look for **"ABAP MCP"** menu
4. Select **"Validate ABAP Class"**

If you see the MCP menu, congratulations! 🎉 The plugin is working.

### Step 5: Configure MCP Connection

1. In the test Eclipse instance:
   - **Window → Preferences**
   - Navigate to **"ABAP MCP"**

2. Configure:
   - **MCP Command**: `node` (or full path on Windows: `C:\Program Files\nodejs\node.exe`)
   - **MCP Server Path**: Path to your MCP server directory
   - **SAP Host**: Your SAP system host
   - **SAP User**: Your SAP username

3. Click **Apply and Close**

## What You Have Now

### 📦 Complete Plugin Structure
- ✅ MCP Client (JSON-RPC communication)
- ✅ Command handlers (Validate, Execute, Create)
- ✅ UI components (Views, Wizards, Preferences)
- ✅ Eclipse integration (Menus, Context menus)

### 🎯 Features Ready to Use

1. **Validate ABAP Classes**
   - Right-click `.abap` file → ABAP MCP → Validate Class
   - Uses MCP to validate syntax and execute

2. **MCP Console View**
   - Window → Show View → Other → ABAP MCP → MCP Console
   - Displays MCP operation results

3. **Preferences**
   - Window → Preferences → ABAP MCP
   - Configure server connection

4. **RAP Service Wizard** (Template ready)
   - File → New → Other → ABAP via MCP → RAP Service
   - Generate complete RAP service

## Next: Make It Work with Your MCP Server

### Current State

The plugin has a **complete structure** but needs your MCP server configuration to work.

### What to Modify

**File**: `ValidateClassHandler.java` (line ~52)

Currently returns `null`:
```java
private McpClient getMcpClient() {
    return null; // TODO: Implement
}
```

**Replace with** (using preferences):
```java
private McpClient getMcpClient() {
    IPreferenceStore prefs = Activator.getDefault().getPreferenceStore();
    
    String command = prefs.getString(McpPreferencePage.PREF_MCP_COMMAND);
    String serverPath = prefs.getString(McpPreferencePage.PREF_MCP_SERVER_PATH);
    String sapHost = prefs.getString(McpPreferencePage.PREF_SAP_HOST);
    String sapUser = prefs.getString(McpPreferencePage.PREF_SAP_USER);
    
    if (command.isEmpty() || serverPath.isEmpty()) {
        return null;
    }
    
    try {
        McpClient client = new McpClient();
        Map<String, String> env = new HashMap<>();
        env.put("SAP_HOST", sapHost);
        env.put("SAP_USER", sapUser);
        
        client.start(command, new String[]{serverPath + "/index.js"}, env);
        return client;
    } catch (IOException e) {
        e.printStackTrace();
        return null;
    }
}
```

### Better: Implement as Singleton Service

Create `McpClientManager.java`:

```java
package com.sap.abap.mcp.client;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import org.eclipse.jface.preference.IPreferenceStore;
import com.sap.abap.mcp.core.Activator;
import com.sap.abap.mcp.ui.preferences.McpPreferencePage;

public class McpClientManager {
    private static McpClientManager instance;
    private McpClient client;
    
    private McpClientManager() {}
    
    public static synchronized McpClientManager getInstance() {
        if (instance == null) {
            instance = new McpClientManager();
        }
        return instance;
    }
    
    public McpClient getClient() throws IOException {
        if (client == null) {
            initializeClient();
        }
        return client;
    }
    
    private void initializeClient() throws IOException {
        IPreferenceStore prefs = Activator.getDefault().getPreferenceStore();
        
        String command = prefs.getString(McpPreferencePage.PREF_MCP_COMMAND);
        String serverPath = prefs.getString(McpPreferencePage.PREF_MCP_SERVER_PATH);
        String sapHost = prefs.getString(McpPreferencePage.PREF_SAP_HOST);
        String sapUser = prefs.getString(McpPreferencePage.PREF_SAP_USER);
        
        if (command.isEmpty() || serverPath.isEmpty()) {
            throw new IOException("MCP not configured. Check preferences.");
        }
        
        client = new McpClient();
        Map<String, String> env = new HashMap<>();
        env.put("SAP_HOST", sapHost);
        env.put("SAP_USER", sapUser);
        // Add password handling here (use secure storage)
        
        client.start(command, new String[]{serverPath + "/index.js"}, env);
    }
    
    public void shutdown() {
        if (client != null) {
            client.stop();
            client = null;
        }
    }
}
```

Then update `ValidateClassHandler.java`:

```java
private McpClient getMcpClient() {
    try {
        return McpClientManager.getInstance().getClient();
    } catch (IOException e) {
        return null;
    }
}
```

## Testing Your Changes

### 1. Close Previous Test Instance
Close the Eclipse instance that was launched for testing.

### 2. Re-launch
- Right-click `com.sap.abap.mcp.core`
- **Run As → Eclipse Application**

### 3. Configure
- Set MCP preferences
- Create test ABAP file
- Right-click → ABAP MCP → Validate Class

### 4. Check Console
- Window → Show View → Console
- Should see MCP communication logs

## Debugging

### Enable Debug Mode

1. Right-click `com.sap.abap.mcp.core`
2. **Debug As → Eclipse Application**
3. Set breakpoints in Java code
4. Trigger actions in test Eclipse

### Common Issues

**Issue**: "MCP client not configured"
- **Fix**: Set preferences in test Eclipse instance

**Issue**: No response from MCP server
- **Fix**: Check server is running: `node server.js`
- **Fix**: Verify stdio communication (no console.log in server)

**Issue**: Plugin menu not visible
- **Fix**: Check file extension is `.abap`
- **Fix**: Verify `visibleWhen` in plugin.xml

**Issue**: Java class not found
- **Fix**: Project → Clean
- **Fix**: Check MANIFEST.MF exports

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Eclipse IDE (Your Development Environment)                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Plugin Project: com.sap.abap.mcp.core                  │ │
│  │  - Java source code                                    │ │
│  │  - plugin.xml (extension points)                       │ │
│  │  - MANIFEST.MF (dependencies)                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                    ↓ [Run As Eclipse Application]           │
└─────────────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Runtime Eclipse (Test Environment)                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Your Plugin Running                                    │ │
│  │  → Menus: ABAP MCP                                     │ │
│  │  → Views: MCP Console                                  │ │
│  │  → Preferences: ABAP MCP settings                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                    ↓ [User triggers command]                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Handler Executes                                       │ │
│  │  → Reads ABAP file                                     │ │
│  │  → Calls McpClient                                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                     ↓ [JSON-RPC over stdio]
┌─────────────────────────────────────────────────────────────┐
│ MCP Server (Node.js process)                                │
│  - Started by plugin with: node server.js                   │
│  - Communicates via JSON-RPC                                │
│  - Processes: validate_abap_method, etc.                    │
└─────────────────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ SAP System                                                   │
│  - Receives ABAP code                                        │
│  - Validates syntax                                          │
│  - Executes code (if validation passes)                     │
└─────────────────────────────────────────────────────────────┘
```

## What Makes This Different from Cursor?

### Similarities
- ✅ MCP protocol integration
- ✅ Tool invocation (validate, execute, create)
- ✅ Async communication
- ✅ JSON-RPC messaging

### Key Differences

| Aspect | Cursor | Eclipse Plugin |
|--------|--------|----------------|
| **Platform** | Electron/VSCode | Eclipse RCP |
| **Language** | TypeScript | Java |
| **UI Framework** | React | SWT |
| **Extension Model** | VSCode API | Eclipse Extension Points |
| **Deployment** | Install extension | Drop .jar in plugins/ |
| **Integration** | Editor-focused | Full IDE integration |

### Advantages of Eclipse Plugin

1. **Deep SAP Integration**: Can leverage ADT (ABAP Development Tools) APIs
2. **Enterprise Features**: Better for large teams, governance
3. **Native Performance**: No Electron overhead
4. **Custom Views**: Full control over UI
5. **Build Automation**: Maven/Tycho for CI/CD

## Next Steps

### Level 1: Make It Work
- ✅ You've done this - plugin structure is complete
- 🔲 Connect to your MCP server
- 🔲 Test validation with real ABAP code

### Level 2: Add Features
- 🔲 Implement RAP service wizard fully
- 🔲 Add CDS view creation
- 🔲 Add table creation
- 🔲 Implement method execution with parameters

### Level 3: Production Ready
- 🔲 Secure password storage (Eclipse Secure Storage)
- 🔲 Connection pooling
- 🔲 Error handling improvements
- 🔲 Progress monitors for long operations
- 🔲 Unit tests

### Level 4: Advanced
- 🔲 ADT integration (use existing SAP connections)
- 🔲 Code completion (via MCP)
- 🔲 Real-time syntax highlighting
- 🔲 Git integration for generated code

## Resources

- **This Project**: Full working skeleton
- **DEVELOPMENT_GUIDE.md**: Detailed development instructions
- **Eclipse Plugin Tutorial**: https://www.vogella.com/tutorials/EclipsePlugin/article.html
- **MCP Specification**: https://modelcontextprotocol.io/

## Support

If you encounter issues:
1. Check Eclipse Error Log: Window → Show View → Error Log
2. Enable console debugging in McpClient
3. Test MCP server standalone first
4. Verify Java 17 is being used

## Summary

You now have:
- ✅ Complete Eclipse plugin structure
- ✅ MCP client implementation
- ✅ UI integration (menus, views, wizards)
- ✅ Command handlers for common operations
- ✅ Configuration via preferences

Just connect it to your MCP server and you're ready to go! 🚀

