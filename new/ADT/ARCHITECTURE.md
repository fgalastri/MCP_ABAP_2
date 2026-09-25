# Eclipse ABAP MCP Plugin - Architecture

## Overview

This plugin integrates Model Context Protocol (MCP) servers into Eclipse IDE, enabling ABAP developers to validate, execute, and create ABAP artifacts directly from Eclipse.

## High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                         Eclipse IDE                                │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              Eclipse Plugin Framework (OSGi)                  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │         com.sap.abap.mcp.core Plugin Bundle                   │ │
│  │                                                                │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │  UI Layer (SWT/JFace)                                   │ │ │
│  │  │  ├─ Commands & Handlers                                 │ │ │
│  │  │  ├─ Views (Console, Operations)                         │ │ │
│  │  │  ├─ Wizards (RAP Service Creator)                       │ │ │
│  │  │  └─ Preferences (Configuration)                         │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │                          ↕                                    │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │  Business Logic Layer                                   │ │ │
│  │  │  ├─ McpClientManager (Connection Mgmt)                  │ │ │
│  │  │  ├─ CodeGenerator (XCO Code Gen)                        │ │ │
│  │  │  └─ ResultParser (Response Processing)                  │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │                          ↕                                    │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │  MCP Client Layer                                       │ │ │
│  │  │  ├─ McpClient (JSON-RPC Protocol)                       │ │ │
│  │  │  ├─ Request/Response Handling                           │ │ │
│  │  │  └─ Tool Invocation                                     │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
                              ↕
                   JSON-RPC over stdio/HTTP
                              ↕
┌───────────────────────────────────────────────────────────────────┐
│                       MCP Server (Node.js)                         │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  MCP Protocol Handler                                         │ │
│  │  ├─ initialize / initialized                                 │ │
│  │  ├─ tools/list                                               │ │
│  │  └─ tools/call                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                              ↕                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  ABAP Tools                                                   │ │
│  │  ├─ validate_abap_method                                     │ │
│  │  ├─ validate_abap_program                                    │ │
│  │  ├─ get_table_metadata                                       │ │
│  │  └─ get_cds_source                                           │ │
│  └──────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
                              ↕
                         SAP RFC/HTTP
                              ↕
┌───────────────────────────────────────────────────────────────────┐
│                         SAP System (ABAP)                          │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  ABAP Runtime                                                 │ │
│  │  ├─ Syntax Check                                             │ │
│  │  ├─ Code Execution                                           │ │
│  │  └─ Repository Operations                                    │ │
│  └──────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. UI Layer

#### Commands & Handlers
- **Purpose**: Define and handle user actions
- **Components**:
  - `ValidateClassHandler`: Validates ABAP class syntax and executes
  - `ExecuteMethodHandler`: Executes specific ABAP methods with parameters
  - `CreateRapServiceHandler`: Launches RAP service creation wizard

#### Views
- **McpConsoleView**: Displays MCP operation output
- **Future**: Operations history, connection status

#### Wizards
- **CreateRapServiceWizard**: Multi-step RAP service creation
  - Page 1: Entity configuration (table name, package)
  - Page 2: Field selection
  - Page 3: Behavior options
  - Page 4: Service configuration

#### Preferences
- **McpPreferencePage**: Configure MCP connection
  - MCP command (node executable)
  - Server path
  - SAP credentials
  - Connection options

### 2. Business Logic Layer

#### McpClientManager
```java
public class McpClientManager {
    // Singleton pattern for client lifecycle
    - getInstance(): McpClientManager
    - getClient(): McpClient
    - shutdown(): void
    
    // Manages:
    - Client lifecycle (start/stop)
    - Configuration loading
    - Connection pooling
    - Error handling
}
```

#### CodeGenerator (Future)
- Generates XCO-based ABAP code
- Templates for common patterns
- RAP service generation
- CDS view generation

#### ResultParser
- Parses MCP responses
- Extracts errors and warnings
- Formats for display
- Creates Eclipse markers

### 3. MCP Client Layer

#### McpClient
```java
public class McpClient {
    // Connection management
    - start(command, args, env): void
    - stop(): void
    - initialize(): void
    
    // Tool invocation
    - callTool(name, args): CompletableFuture<JsonObject>
    - validateAbapMethod(...): CompletableFuture<JsonObject>
    
    // Protocol handling
    - sendRequest(method, params): CompletableFuture
    - sendNotification(method, params): void
    - readResponses(): void  // Background thread
}
```

**Key Features**:
- Async communication via CompletableFuture
- JSON-RPC 2.0 protocol
- stdio transport (can extend to HTTP/WebSocket)
- Thread-safe request/response mapping
- Exception handling with McpException

### 4. Extension Points

Defined in `plugin.xml`:

```xml
Extension Points Used:
├─ org.eclipse.ui.commands       (Define commands)
├─ org.eclipse.ui.handlers       (Command handlers)
├─ org.eclipse.ui.menus          (Menu contributions)
├─ org.eclipse.ui.views          (Custom views)
├─ org.eclipse.ui.preferencePages (Preferences)
└─ org.eclipse.ui.newWizards     (Creation wizards)
```

## Data Flow

### Validate ABAP Class Flow

```
User → Right-click file → ABAP MCP → Validate Class
  ↓
ValidateClassHandler.execute()
  ↓
Read file content from Eclipse workspace
  ↓
McpClientManager.getInstance().getClient()
  ↓
McpClient.validateAbapMethod(className, code, ...)
  ↓
Build JSON-RPC request:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "mcp_abap-validator-remote_validate_abap_method",
    "arguments": {
      "class_name": "ZCL_TEST",
      "class_code": "CLASS zcl_test...",
      "method_name": null
    }
  }
}
  ↓
Send via stdio to MCP server
  ↓
MCP server processes request
  ↓
SAP system validates & executes
  ↓
MCP server returns response:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "Syntax check passed..."
    }]
  }
}
  ↓
McpClient receives response (background thread)
  ↓
CompletableFuture.complete(result)
  ↓
Handler processes result
  ↓
Display in McpConsoleView
  ↓
Show success/error dialog
```

### Create RAP Service Flow

```
User → File → New → Other → ABAP via MCP → RAP Service
  ↓
CreateRapServiceWizard opens
  ↓
User fills pages:
  - Table name: ZMMT_PARAMS
  - Package: ZMMT
  - Transport: DEVK900123
  ↓
Wizard.performFinish()
  ↓
Generate XCO code using templates
  ↓
McpClient.validateAbapMethod(className, xcoCode, methodName, null)
  ↓
MCP server executes XCO code
  ↓
SAP system creates artifacts:
  - Table
  - Draft table
  - Interface view
  - Projection view
  - Behavior definition
  - Service definition
  - Service binding
  ↓
Results displayed in console
  ↓
Success dialog with artifact list
```

## Threading Model

### Main Thread (Eclipse UI Thread)
- All UI operations
- Command handlers (initial call)
- View updates
- Dialog display

### Background Thread (MCP Reader)
- Reads JSON-RPC responses from MCP server
- Parses JSON
- Completes CompletableFutures
- Runs continuously while client is active

### Async Operations
```java
// Handler code (runs on UI thread)
client.validateAbapMethod(...)
    .thenAccept(result -> {
        // This runs on reader thread
        shell.getDisplay().asyncExec(() -> {
            // This runs on UI thread
            updateUI(result);
        });
    })
    .exceptionally(ex -> {
        // Error handling
        return null;
    });
```

## Configuration Management

### Preference Store
Eclipse preference store (scoped to workspace):

```java
IPreferenceStore prefs = Activator.getDefault().getPreferenceStore();

// Store
prefs.setValue(McpPreferencePage.PREF_MCP_COMMAND, "node");

// Retrieve
String command = prefs.getString(McpPreferencePage.PREF_MCP_COMMAND);
```

### Secure Storage (Future)
For passwords:

```java
ISecurePreferences securePrefs = SecurePreferencesFactory.getDefault();
ISecurePreferences node = securePrefs.node("com.sap.abap.mcp");
node.put("password", password, true);
```

## Error Handling

### Levels
1. **Protocol Errors**: JSON-RPC errors from MCP server
2. **Tool Errors**: Errors returned by MCP tools
3. **Connection Errors**: Server unavailable, timeout
4. **SAP Errors**: ABAP syntax errors, runtime errors

### Strategy
```java
try {
    JsonObject result = client.validateAbapMethod(...).get();
    // Handle success
} catch (McpException e) {
    // MCP protocol error
    JsonObject error = e.getError();
    String message = error.get("message").getAsString();
} catch (ExecutionException e) {
    // Tool execution error
    Throwable cause = e.getCause();
} catch (InterruptedException e) {
    // Thread interrupted
} catch (IOException e) {
    // Connection error
}
```

## Extension Points for Future Development

### 1. Custom Tool Handlers
```java
public interface IToolHandler {
    String getToolName();
    void handleResult(JsonObject result);
}
```

### 2. Code Templates
```java
public interface ICodeTemplate {
    String getName();
    String generate(Map<String, Object> context);
}
```

### 3. Result Formatters
```java
public interface IResultFormatter {
    String format(JsonObject result);
}
```

## Dependencies

### Eclipse Platform
- `org.eclipse.core.runtime`: Plugin framework
- `org.eclipse.ui`: UI framework
- `org.eclipse.core.resources`: Workspace resources
- `org.eclipse.ui.ide`: IDE components
- `org.eclipse.ui.console`: Console view

### Third-Party
- `com.google.gson`: JSON parsing

### Optional (Future)
- `com.sap.adt.tools.core`: ADT integration
- `org.eclipse.jgit`: Git integration

## Build & Packaging

### Maven/Tycho
- Parent POM: Defines Tycho version, target platform
- Bundle POM: Plugin-specific configuration
- Target platform: Eclipse 2023-09
- Output: OSGi bundle (.jar)

### Deployment Options
1. **Drop-in**: Copy .jar to Eclipse plugins/ folder
2. **Update Site**: P2 repository for installation
3. **Eclipse Marketplace**: Public distribution

## Security Considerations

### Current
- ⚠️ Credentials in plain text (preferences)
- ⚠️ No encryption for MCP communication

### Planned
- ✅ Eclipse Secure Storage for passwords
- ✅ SSL/TLS for HTTP transport
- ✅ Token-based authentication
- ✅ Credential validation

## Performance Considerations

### Current
- Single MCP client instance
- Synchronous tool calls (with async handling)
- No caching

### Optimizations
- Connection pooling
- Request caching
- Batch operations
- Progress monitoring for long operations

## Testing Strategy

### Unit Tests
- McpClient protocol handling
- JSON parsing
- Handler logic

### Integration Tests
- Full flow with mock MCP server
- Error scenarios

### UI Tests
- SWTBot for UI automation
- Wizard validation
- Preference persistence

## Monitoring & Debugging

### Logging
```java
// Add logging to McpClient
private static final Logger LOGGER = Logger.getLogger(McpClient.class.getName());

LOGGER.info("Sending request: " + json);
LOGGER.severe("Error: " + e.getMessage());
```

### Eclipse Error Log
All exceptions logged to Eclipse Error Log view

### Debug Mode
- Set breakpoints
- Launch as Debug
- Inspect variables
- Step through code

## Summary

This architecture provides:
- ✅ Clean separation of concerns
- ✅ Extensible design
- ✅ Async operation support
- ✅ Eclipse platform integration
- ✅ MCP protocol compliance
- ✅ Error handling at all levels
- ✅ Configuration management
- ✅ Future-proof extension points

The plugin is production-ready in structure, requiring only MCP connection implementation to become fully functional.

