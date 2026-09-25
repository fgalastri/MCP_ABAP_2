# ABAP Method Validation MCP Server

A Model Context Protocol (MCP) server that connects Cursor to your SAP ABAP system for dynamic method validation and execution.

## 🚀 Features

- **Validate ABAP Methods**: Test method calls without execution
- **Execute ABAP Methods**: Run methods and get results
- **Generate ABAP Classes**: Create properly formatted ABAP class code
- **SAP Integration**: Direct connection to your SAP system via OData
- **Secure Authentication**: Environment-based configuration
- **Cursor Ready**: Full MCP protocol support

## 📋 Prerequisites

- Python 3.8+
- Access to SAP ABAP system with your RAP service deployed
- Cursor IDE (for MCP integration)

## 🛠️ Installation

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure SAP connection:**
   ```bash
   cp env.example .env
   # Edit .env with your SAP system details
   ```

3. **Test the server:**
   ```bash
   python abap_mcp_server.py
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with your SAP system details:

```env
SAP_BASE_URL=https://your-sap-system.com:8000
SAP_USERNAME=your_username
SAP_PASSWORD=your_password
SAP_CLIENT=100
```

### Cursor Integration

Add to your Cursor MCP configuration (`~/.cursor/mcp_servers.json`):

```json
{
  "mcpServers": {
    "abap-method-validator": {
      "command": "python",
      "args": ["C:/path/to/your/abap_mcp_server.py"],
      "env": {
        "SAP_BASE_URL": "https://your-sap-system.com:8000",
        "SAP_USERNAME": "your_username",
        "SAP_PASSWORD": "your_password",
        "SAP_CLIENT": "100"
      }
    }
  }
}
```

## 🔧 Available Tools

### 1. validate_abap_method
Validates ABAP method calls without executing them.

**Parameters:**
- `class_name`: ABAP class name
- `method_name`: Method to validate
- `parameters`: Array of method parameters
- `class_code`: Optional ABAP class source code

### 2. execute_abap_method
Executes ABAP method calls and returns results.

**Parameters:**
- `class_name`: ABAP class name
- `method_name`: Method to execute
- `parameters`: Array of method parameters
- `class_code`: Optional ABAP class source code

### 3. create_abap_class
Generates properly formatted ABAP class code.

**Parameters:**
- `class_name`: Name for the new class
- `methods`: Array of method definitions

## 📝 Usage Examples

### Example 1: Create an ABAP Class
```json
{
  "class_name": "ZTEST_CALCULATOR",
  "methods": [
    {
      "name": "add",
      "parameters": "IMPORTING iv_a TYPE i iv_b TYPE i RETURNING VALUE(rv_result) TYPE i",
      "implementation": "rv_result = iv_a + iv_b."
    }
  ]
}
```

### Example 2: Validate a Method
```json
{
  "class_name": "ZTEST_CALCULATOR",
  "method_name": "add",
  "parameters": [
    {"name": "IV_A", "direction": "IMPORTING", "value": "5"},
    {"name": "IV_B", "direction": "IMPORTING", "value": "3"},
    {"name": "RV_RESULT", "direction": "RETURNING", "value": ""}
  ],
  "class_code": "CLASS ZTEST_CALCULATOR DEFINITION..."
}
```

## 🔗 SAP System Requirements

Your SAP system must have the following components activated:

1. **RAP Service**: `ZSB_MCP_METHOD_VALIDATE`
2. **Behavior Class**: `ZBP_C_MCP_METHOD_VALIDATE`
3. **Core Validation Class**: `ZMCP_METHOD_VALIDATE`
4. **Data Dictionary Types**: All ZMCP_* structures and table types

## 🛡️ Security

- Never commit `.env` files to version control
- Use service accounts with minimal required permissions
- Consider using SAP's OAuth2 for production environments
- Validate all input parameters before processing

## 🐛 Troubleshooting

### Connection Issues
- Verify SAP system URL and credentials
- Check network connectivity and firewall settings
- Ensure OData service is published and accessible

### Authentication Problems
- Verify username/password combination
- Check SAP client number
- Ensure user has proper authorizations

### Service Errors
- Verify RAP service is activated in SAP
- Check behavior implementation class exists
- Validate Data Dictionary objects are activated

## 📊 Logging

The server provides detailed logging:
- Connection status and CSRF token handling
- Request/response details for debugging
- Error messages with stack traces

Set log level in the script:
```python
logging.basicConfig(level=logging.DEBUG)  # For detailed logs
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with your SAP system
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review SAP system logs
3. Verify MCP server configuration
4. Test individual components in isolation

---

**Happy ABAP Development with Cursor! 🎉**
