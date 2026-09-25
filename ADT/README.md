# Eclipse ABAP MCP Plugin

An Eclipse plugin that integrates Model Context Protocol (MCP) servers for ABAP development, enabling direct validation and creation of ABAP artifacts from Eclipse IDE.

## Features

### Core MCP Integration
- **MCP Client Integration**: Connect to MCP servers via stdio or HTTP
- **ABAP Validation**: Validate ABAP classes and programs against target SAP systems
- **Artifact Creation**: Create ABAP repository objects using XCO framework
- **Eclipse Integration**: Context menus, views, and wizards for seamless workflow

### AI Agent (Cursor-like Capabilities)
- **AI Chat Interface**: Interactive chat view for natural language queries
- **ADT Integration**: Read/write ABAP objects directly from SAP system
- **ABAP Operations**: Syntax check, activation, object creation via AI
- **Context-Aware**: Understands current file, selection, and project
- **Tool Execution**: AI can perform multi-step ABAP workflows
- **LLM Support**: Claude, OpenAI, or local LLM integration

### Available ABAP Object Creation Tools
- **📦 Packages** - Create development packages with hierarchy ⭐ NEW (Nov 2025)
- **Classes & Interfaces** - Create ABAP OO objects
- **CDS Views** - Create complete CDS views with DDL
- **Data Dictionary** - Create domains, data elements, structures, table types
- **RAP Services** - Generate complete RAP UI services
- **Custom Queries** - Generate abstract entities with query providers
- **Service Definitions & Bindings** - Create and manage OData services
- **And more...** - 33 tools available for comprehensive ABAP development

See [ENHANCED_TOOLS_COMPLETE_GUIDE.md](ENHANCED_TOOLS_COMPLETE_GUIDE.md) for complete tool documentation.

### 📚 Documentation Guides
- **[ENHANCED_TOOLS_COMPLETE_GUIDE.md](ENHANCED_TOOLS_COMPLETE_GUIDE.md)** - All creation tools
- **[ACTIVATION_TROUBLESHOOTING_GUIDE.md](ACTIVATION_TROUBLESHOOTING_GUIDE.md)** - Activation errors ⭐ NEW
- **[SAP_BTP_CLASS_EXECUTION_CACHING_ISSUE.md](SAP_BTP_CLASS_EXECUTION_CACHING_ISSUE.md)** - BTP execution caching ⭐ NEW
- **[CRITICAL_FIXES_AND_LEARNINGS.md](CRITICAL_FIXES_AND_LEARNINGS.md)** - Known issues & solutions
- **[USAGE_GUIDE_MCP.md](USAGE_GUIDE_MCP.md)** - MCP server usage

## Architecture

```
Eclipse Plugin (Java)
  ├── MCP Client (JSON-RPC)
  ├── ABAP Tools Integration
  ├── UI Components (SWT)
  └── Configuration Management
       ↓
MCP Server (Node.js/Python)
       ↓
SAP System (ABAP)
```

## Requirements

- Eclipse IDE 2023-09 or later
- Java 17 or later
- Node.js (for MCP servers)
- Access to SAP system with ABAP Cloud/XCO

## Project Structure

```
eclipse-abap-mcp-plugin/
├── bundles/
│   └── com.sap.abap.mcp.core/          # Core plugin
│       ├── META-INF/
│       │   └── MANIFEST.MF
│       ├── plugin.xml
│       └── src/
│           └── com/sap/abap/mcp/
│               ├── client/              # MCP client implementation
│               ├── handlers/            # Eclipse command handlers
│               ├── ui/                  # UI components
│               └── config/              # Configuration
├── features/
│   └── com.sap.abap.mcp.feature/       # Feature definition
├── releng/
│   └── com.sap.abap.mcp.target/        # Target platform
└── pom.xml                              # Maven/Tycho build
```

## Getting Started

### 1. Import Project into Eclipse

1. Open Eclipse IDE for RCP and RAP Developers
2. File → Import → Existing Projects into Workspace
3. Select this directory
4. Check "Search for nested projects"

### 2. Configure MCP Server

Edit `mcp-config.json`:

```json
{
  "mcpServers": {
    "abap-validator": {
      "command": "node",
      "args": ["path/to/abap-validator-server/index.js"],
      "env": {
        "SAP_HOST": "your-sap-host",
        "SAP_USER": "your-username"
      }
    }
  }
}
```

### 3. Run Plugin in Test Instance

1. Right-click on plugin project
2. Run As → Eclipse Application
3. New Eclipse instance opens with plugin loaded

## Usage

### Validate ABAP Class

1. Right-click on ABAP class file
2. Select **ABAP MCP → Validate Class**
3. View results in Console or Problems view

### Create RAP Service

1. File → New → Other → ABAP → RAP Service (MCP)
2. Fill wizard with entity details
3. Click Finish to generate complete RAP stack

## Development

### Build with Maven/Tycho

```bash
mvn clean verify
```

### Debug

1. Set breakpoints in Java code
2. Launch as Eclipse Application (Debug mode)
3. Debug in host Eclipse instance

## Configuration

### MCP Server Settings

Preferences → ABAP → MCP Settings:
- Server command and arguments
- Environment variables
- Connection timeout
- Logging level

## Contributing

This is a starting point for MCP integration in Eclipse. Contributions welcome!

## License

MIT License (or your preferred license)

