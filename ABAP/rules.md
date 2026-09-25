# ABAP Development Rules and Best Practices

> **⚠️ CRITICAL REMINDER: ALWAYS read the `ALWAYS_READ.md` file before generating any code or making changes!**

## Critical Rules

### ABAP Validation Rules
- **Send only method source code** to ABAP validator, never complete class definitions
- **Preserve all functionality** when fixing syntax errors, never remove code to make validation pass
- **Check both STATUS and MESSAGE** when interpreting MCP server responses
  - STATUS="ERROR" with data in MESSAGE field often indicates successful operation with parsing issue
  - Real errors show error messages in MESSAGE field, not data content
- **Never add comments to XCO generation code** as they cause parsing errors

### Implementation Rules
- **Use complete XCO implementations**, never create placeholder methods
- **Follow correct XCO API patterns**:
  - For CLASSES: Use `lo_form_spec->definition->section-public->add_type()`
  - For INTERFACES: Use `lo_form_specification->add_type()` directly
- **Restore full functionality** after any temporary simplifications for debugging
- **Document all learning progress** including fixes, changes, patterns, and troubleshooting steps

### Code History Management
- **Store XCO code history** before each ABAP validator call
- **Store direct call code history** for all ABAP code execution attempts
- **Use proper naming conventions** for history files with timestamps and purpose descriptions

## Workflow Guidelines

1. **Read the rules first** before any action
2. **Identify the task scope** - method source only, not full classes
3. **Check examples first** - verify correct XCO API patterns before implementation
4. **Store code history** before every validator call
5. **Validate properly** - check both STATUS and MESSAGE content
6. **Verify functionality** - ensure all requirements are met

## Available Resources

- **SAP Docs MCP Server** - For ABAP syntax, XCO APIs, and best practices
- **Example Code** - Check z_examples folder for correct implementation patterns
- **Documentation** - Refer to specialized guides for detailed topics:
  - [MCP Server Configuration](./mcp_server_configuration.md)
  - [XCO Implementation Guide](./xco_implementation_guide.md)
  - [ABAP Coding Standards](./abap_coding_standards.md)

## Common Issues and Solutions

### MCP Server Issues
- **Parsing issues** - Check MESSAGE field content even when STATUS="ERROR"
- **Validation failures** - Ensure method source code is sent without class wrappers
- **XCO generation errors** - Remove all comments from XCO code

### Implementation Issues
- **Method unknown errors** - Verify correct XCO API pattern for classes vs interfaces
- **Functionality loss** - Ensure all requirements are restored after debugging
- **Documentation gaps** - Update learning session files after each significant change

For detailed information on specific topics, please refer to the specialized documentation guides.