# ABAP Coding Standards

## Naming Conventions

### General Rules
- Use descriptive names that clearly indicate purpose
- Avoid abbreviations unless widely understood
- Maintain consistent naming across the project

### Specific Naming Patterns
- **Classes**: `ZCL_*` for implementation classes, `ZIF_*` for interfaces
- **Tables**: `Z*` for custom tables
- **Variables**:
  - `lv_*` for local variables
  - `lt_*` for local tables
  - `ls_*` for local structures
  - `lr_*` for local references
  - `iv_*`, `cv_*`, `ev_*` for importing, changing, exporting parameters
  - `rv_*` for returning values

## Code Structure

### Methods
- Keep methods focused on a single responsibility
- Limit method size to 100 lines where possible
- Use meaningful parameter names
- Document method purpose and parameters

### Classes
- Follow object-oriented design principles
- Use inheritance appropriately
- Implement interfaces for common behaviors
- Separate public and private sections clearly

## Error Handling

### Exception Handling
- Use class-based exceptions (`CX_*`)
- Handle exceptions at the appropriate level
- Provide meaningful error messages
- Log errors with sufficient context

### Input Validation
- Validate all input parameters
- Check for edge cases
- Handle null/empty values appropriately

## Performance Considerations

### Database Access
- Minimize database calls
- Use appropriate WHERE clauses
- Consider using CDS views for complex queries
- Implement proper buffering strategies

### Memory Management
- Free resources when no longer needed
- Avoid unnecessary data copies
- Use appropriate internal table types

## Documentation

### Code Comments
- Document complex logic
- Explain "why" not just "what"
- Keep comments up-to-date with code changes
- Use consistent comment style

### Method Documentation
- Document purpose, parameters, and return values
- Include examples for complex methods
- Document exceptions that may be raised

## Testing

### Unit Tests
- Write tests for all business logic
- Test edge cases and error conditions
- Maintain test independence
- Keep tests simple and focused

### Test Data
- Use representative test data
- Avoid dependencies on production data
- Clean up test data after tests

## Security

### Authorization Checks
- Implement proper authorization checks
- Never hard-code credentials
- Validate user input to prevent injection attacks
- Use secure storage for sensitive data

## SAP-Specific Guidelines

### BAPIs and Function Modules
- Use BAPIs over direct table access when available
- Handle return parameters properly
- Commit work after successful BAPI calls

### SAP Dictionary Objects
- Follow SAP naming conventions for dictionary objects
- Document fields and relationships
- Consider data element reuse

## Code Quality

### Readability
- Use consistent indentation
- Break complex expressions into simpler ones
- Use meaningful variable names
- Format code consistently

### Maintainability
- Avoid code duplication
- Refactor complex methods
- Keep dependencies minimal
- Document design decisions

## Version Control

### Commit Messages
- Write clear, descriptive commit messages
- Reference issue numbers when applicable
- Keep commits focused on single changes
- Document breaking changes

### Code Reviews
- Review all code changes
- Check for adherence to standards
- Verify functionality and performance
- Provide constructive feedback