# Eclipse ABAP MCP Plugin - Development Guide

## Prerequisites

### Required Software

1. **Eclipse IDE for RCP and RAP Developers**
   - Download from: https://www.eclipse.org/downloads/packages/
   - Version: 2023-09 or later
   - Includes PDE (Plugin Development Environment)

2. **Java Development Kit**
   - Version: Java 17 or later
   - Set JAVA_HOME environment variable

3. **Maven** (Optional, for command-line builds)
   - Version: 3.8 or later
   - Tycho version: 4.0.4

4. **Node.js** (for MCP servers)
   - Version: 18 or later
   - Required to run MCP servers

### MCP Server Setup

Ensure your MCP server is configured and accessible:

```bash
# Example: abap-validator-remote server
cd /path/to/abap-validator-server
npm install
node index.js
```

## Project Structure

```
eclipse-abap-mcp-plugin/
├── bundles/
│   └── com.sap.abap.mcp.core/          # Main plugin bundle
│       ├── META-INF/
│       │   └── MANIFEST.MF              # Bundle manifest
│       ├── plugin.xml                   # Extension point definitions
│       ├── build.properties             # Build configuration
│       ├── pom.xml                      # Maven build config
│       └── src/
│           └── com/sap/abap/mcp/
│               ├── client/              # MCP client
│               │   └── McpClient.java
│               ├── core/                # Plugin activator
│               │   └── Activator.java
│               ├── handlers/            # Command handlers
│               │   ├── ValidateClassHandler.java
│               │   ├── ExecuteMethodHandler.java
│               │   └── CreateRapServiceHandler.java
│               └── ui/                  # UI components
│                   ├── views/
│                   │   └── McpConsoleView.java
│                   ├── wizards/
│                   │   ├── CreateRapServiceWizard.java
│                   │   └── CreateRapServiceWizardPage.java
│                   └── preferences/
│                       └── McpPreferencePage.java
├── pom.xml                              # Parent POM
└── README.md
```

## Development Workflow

### 1. Import Project into Eclipse

1. Launch Eclipse IDE for RCP and RAP Developers
2. File → Import → Existing Projects into Workspace
3. Select the `eclipse-abap-mcp-plugin` directory
4. Check "Search for nested projects"
5. Click Finish

### 2. Configure Target Platform

The target platform defines which Eclipse version to build against:

1. Window → Preferences → Plug-in Development → Target Platform
2. The project uses Eclipse 2023-09 (defined in parent pom.xml)
3. Eclipse will automatically resolve dependencies via Tycho

### 3. Run Plugin in Development Mode

1. Right-click on `com.sap.abap.mcp.core` project
2. Run As → Eclipse Application
3. A new Eclipse instance launches with your plugin loaded
4. Test functionality in this runtime workbench

### 4. Debug Plugin

1. Set breakpoints in Java code
2. Right-click on `com.sap.abap.mcp.core` project
3. Debug As → Eclipse Application
4. Debug in host Eclipse, test in runtime workbench

## Key Components Explained

### 1. MCP Client (`McpClient.java`)

The core MCP client handles JSON-RPC communication:

- **Protocol**: JSON-RPC 2.0 over stdio
- **Initialization**: Establishes connection with server
- **Tool Calling**: Invokes MCP tools (e.g., validate_abap_method)
- **Async Handling**: CompletableFuture for non-blocking calls

Key methods:
```java
// Start MCP server
client.start("node", new String[]{"server.js"}, envVars);

// Call tool
CompletableFuture<JsonObject> result = client.callTool("tool_name", args);

// Validate ABAP
client.validateAbapMethod(className, code, method, params);
```

### 2. Extension Points (`plugin.xml`)

Defines how the plugin extends Eclipse:

- **Commands**: Actions users can trigger
- **Handlers**: Java classes that execute commands
- **Menus**: Where commands appear in UI
- **Views**: Custom UI panels
- **Wizards**: Multi-step dialogs
- **Preferences**: Configuration pages

Example command definition:
```xml
<command
    id="com.sap.abap.mcp.commands.validateClass"
    name="Validate ABAP Class"
    categoryId="com.sap.abap.mcp.commands.category">
</command>
```

### 3. Command Handlers

Handlers execute when users trigger commands:

**ValidateClassHandler.java**:
- Gets selected file from Eclipse workspace
- Reads ABAP code
- Calls MCP client to validate
- Displays results in console

**CreateRapServiceHandler.java**:
- Opens wizard dialog
- Collects user input
- Generates ABAP code
- Sends to MCP for execution

### 4. UI Components

**McpConsoleView**: 
- Displays MCP operation output
- Similar to Eclipse Console view

**CreateRapServiceWizard**:
- Multi-page wizard for RAP service creation
- Collects: table name, package, transport
- Generates complete RAP stack

**McpPreferencePage**:
- Configure MCP server connection
- Store: command, server path, SAP credentials

## Building the Plugin

### Option 1: Build in Eclipse

1. Project → Clean
2. Project → Build Project
3. The plugin is compiled automatically

### Option 2: Build with Maven/Tycho

```bash
cd eclipse-abap-mcp-plugin
mvn clean verify
```

This produces:
- `target/` directory with compiled classes
- `.jar` file for distribution

### Option 3: Export Plugin

1. File → Export → Plug-in Development → Deployable plug-ins and fragments
2. Select `com.sap.abap.mcp.core`
3. Choose destination directory
4. Click Finish

This creates a `.jar` file you can drop into any Eclipse installation's `plugins/` folder.

## Testing

### Manual Testing

1. Launch runtime workbench (Run As → Eclipse Application)
2. Create or open an ABAP file (.abap extension)
3. Right-click → ABAP MCP → Validate Class
4. Check console for output

### Automated Testing

To add JUnit tests:

1. Create test fragment project
2. Add dependency to `com.sap.abap.mcp.core`
3. Write JUnit 5 tests
4. Run as JUnit Plug-in Test

Example:
```java
@Test
public void testMcpClientInitialization() {
    McpClient client = new McpClient();
    assertNotNull(client);
}
```

## Common Development Tasks

### Add New Command

1. **Define command in plugin.xml**:
```xml
<command
    id="com.sap.abap.mcp.commands.newCommand"
    name="My New Command"
    categoryId="com.sap.abap.mcp.commands.category">
</command>
```

2. **Create handler class**:
```java
public class NewCommandHandler extends AbstractHandler {
    @Override
    public Object execute(ExecutionEvent event) {
        // Implementation
        return null;
    }
}
```

3. **Register handler**:
```xml
<handler
    class="com.sap.abap.mcp.handlers.NewCommandHandler"
    commandId="com.sap.abap.mcp.commands.newCommand">
</handler>
```

4. **Add to menu**:
```xml
<command
    commandId="com.sap.abap.mcp.commands.newCommand"
    style="push">
</command>
```

### Add New MCP Tool

1. **Add method to McpClient.java**:
```java
public CompletableFuture<JsonObject> callNewTool(String param) {
    Map<String, Object> args = new HashMap<>();
    args.put("parameter", param);
    return callTool("mcp_server_tool_name", args);
}
```

2. **Use in handler**:
```java
client.callNewTool(value)
    .thenAccept(result -> handleResult(result))
    .exceptionally(ex -> handleError(ex));
```

### Add New View

1. **Define view in plugin.xml**:
```xml
<view
    class="com.sap.abap.mcp.ui.views.MyView"
    id="com.sap.abap.mcp.views.myView"
    name="My View">
</view>
```

2. **Create view class**:
```java
public class MyView extends ViewPart {
    @Override
    public void createPartControl(Composite parent) {
        // Create UI components
    }
    
    @Override
    public void setFocus() {
        // Set focus
    }
}
```

## Advanced Topics

### MCP Client Service

For production, implement MCP client as an OSGi service:

```java
@Component
public class McpClientService {
    private McpClient client;
    
    @Activate
    public void activate() {
        // Start client from preferences
        initializeClient();
    }
    
    @Deactivate
    public void deactivate() {
        if (client != null) {
            client.stop();
        }
    }
    
    public McpClient getClient() {
        return client;
    }
}
```

### ADT Integration

To integrate with ABAP Development Tools:

1. Add ADT dependencies to MANIFEST.MF:
```
Require-Bundle: com.sap.adt.tools.core,
 com.sap.adt.communication
```

2. Use ADT APIs for SAP system connection:
```java
IProject project = ...; // Get ABAP project
ISystemConnection connection = SystemConnectionsManager.getSystemConnection(project);
```

### Background Jobs

For long-running operations:

```java
Job job = new Job("MCP Operation") {
    @Override
    protected IStatus run(IProgressMonitor monitor) {
        monitor.beginTask("Processing...", 100);
        
        // Do work
        client.callTool(...).get();
        
        monitor.done();
        return Status.OK_STATUS;
    }
};
job.schedule();
```

## Troubleshooting

### Plugin Not Loading

- Check MANIFEST.MF for syntax errors
- Verify all dependencies are available
- Check Eclipse Error Log (Window → Show View → Error Log)

### MCP Connection Issues

- Verify MCP server is running
- Check stdio communication (no console output from server)
- Enable logging in McpClient
- Test with command-line MCP client first

### Class Loading Issues

- Ensure proper Bundle-ClassPath in MANIFEST.MF
- Check for missing dependencies
- Use `Import-Package` instead of `Require-Bundle` when possible

## Resources

- Eclipse Plugin Development: https://www.vogella.com/tutorials/EclipsePlugin/article.html
- Eclipse RCP: https://wiki.eclipse.org/Rich_Client_Platform
- Tycho Build: https://eclipse.dev/tycho/
- MCP Specification: https://modelcontextprotocol.io/

## Next Steps

1. **Implement MCP Client Service**: Convert singleton to OSGi service
2. **Add Error Handling**: Better exception handling and user feedback
3. **Implement Wizards**: Complete RAP service wizard implementation
4. **Add Testing**: Unit tests and integration tests
5. **ADT Integration**: Leverage existing ABAP tools
6. **Performance**: Connection pooling, caching
7. **Security**: Secure credential storage
8. **Documentation**: JavaDoc and user guide

## Contributing

When contributing:
1. Follow Eclipse coding conventions
2. Add JavaDoc to public APIs
3. Update plugin.xml for new extensions
4. Test in runtime workbench
5. Update this guide with new features

