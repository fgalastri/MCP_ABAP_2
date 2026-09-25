# Package Reassignment Tool - Complete Guide

## 🎯 Overview

The **`adt_reassign_package`** tool allows you to move ABAP objects from one package to another. This is a refactoring operation that uses Eclipse ADT's native package reassignment functionality.

**What it does:**
- ✅ Moves objects between packages
- ✅ Updates transport requests automatically
- ✅ Handles namespace objects correctly
- ✅ Validates and reports detailed errors
- ✅ Supports all major ABAP object types

**Use Cases:**
- Reorganizing package structure
- Moving objects to new development packages
- Cleaning up misplaced objects
- Package consolidation and refactoring

---

## 🛠️ Tool: `adt_reassign_package`

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `object_name` | string | ✅ | Name of the ABAP object (e.g., `ZCL_MY_CLASS`, `/COREVIST/T_MAT_INC_EXC`) |
| `object_type` | string | ✅ | Object type code (see supported types below) |
| `current_package` | string | ✅ | Current package name (e.g., `/COREVIST/PRODUCT`) |
| `new_package` | string | ✅ | Target package name (e.g., `/COREVIST/_PRODUCT`) |
| `transport_request` | string | ✅ | Transport request number (e.g., `H01K900086`) |
| `description` | string | ❌ | Optional object description (defaults to auto-generated) |

---

## 📦 Supported Object Types

| Type Code | Description | ADT Core Type | Example Name |
|-----------|-------------|---------------|--------------|
| `CLAS` | Class | `CLAS/OC` | `ZCL_MY_CLASS` |
| `INTF` | Interface | `INTF/OI` | `ZIF_MY_INTERFACE` |
| `PROG` | Program/Report | `PROG/P` | `ZREPORT_TEST` |
| `DDLS` | CDS View (Data Definition) | `DDLS/DF` | `Z_I_MATERIAL` |
| `BDEF` | Behavior Definition | `BDEF/BDO` | `Z_R_MATERIAL` |
| `TABL` | Database Table | `TABL/DT` | `ZTBL_MY_TABLE` |
| `TTYP` | Table Type | `TTYP/DA` | `ZTT_MY_TABLE_TYPE` |
| `DTEL` | Data Element | `DTEL/DE` | `Z_MY_DATA_ELEMENT` |
| `DOMA` | Domain | `DOMA/DO` | `Z_MY_DOMAIN` |
| `STRUCT` | Structure | `TABL/DS` | `Z_S_MY_STRUCTURE` |
| `SUSH` | Authorization Default | `SUSH` | `BBF96D7687B5258...` |
| `SCO3` | Outbound Service | `SCO3` | `/COREVIST/PRODUCT_REST` |

---

## 💡 Usage Examples

### Example 1: Move a Class

```json
{
  "object_name": "ZCL_PRODUCT_READER",
  "object_type": "CLAS",
  "current_package": "/COREVIST/PRODUCT",
  "new_package": "/COREVIST/_PRODUCT",
  "transport_request": "H01K900086",
  "description": "Product Reader Class"
}
```

**Result:**
```
✅ Successfully reassigned package for CLAS ZCL_PRODUCT_READER
   From: /COREVIST/PRODUCT
   To: /COREVIST/_PRODUCT
   Transport: H01K900086
```

---

### Example 2: Move a Table Type (Namespace Object)

```json
{
  "object_name": "/COREVIST/T_MAT_INC_EXC",
  "object_type": "TTYP",
  "current_package": "/COREVIST/MATERIALS_INC_EXC",
  "new_package": "/COREVIST/CART",
  "transport_request": "H01K900008"
}
```

**Important:** Namespace objects (starting with `/`) are automatically URL-encoded correctly.

---

### Example 3: Move a CDS View

```json
{
  "object_name": "/COREVIST/AE_MAT_SRCH_USER",
  "object_type": "DDLS",
  "current_package": "/COREVIST/PRODUCT",
  "new_package": "/COREVIST/_PRODUCT",
  "transport_request": "H01K900086"
}
```

---

### Example 4: Move a Behavior Definition

```json
{
  "object_name": "/COREVIST/AE_MAT_SRCH_IN",
  "object_type": "BDEF",
  "current_package": "/COREVIST/PRODUCT",
  "new_package": "/COREVIST/_PRODUCT",
  "transport_request": "H01K900086"
}
```

---

### Example 5: Move an Outbound Service

```json
{
  "object_name": "/COREVIST/PRODUCT_REST",
  "object_type": "SCO3",
  "current_package": "/COREVIST/PRODUCT",
  "new_package": "/COREVIST/_PRODUCT",
  "transport_request": "H01K900086"
}
```

---

### Example 6: Move Local Object (No Transport)

```json
{
  "object_name": "ZTEST_CLASS",
  "object_type": "CLAS",
  "current_package": "$TMP",
  "new_package": "$ZLOCALDEV",
  "transport_request": ""
}
```

**Note:** Local packages (starting with `$`) don't require transport requests. The tool automatically omits the transport when detecting local packages.

---

## ⚠️ Common Errors and Solutions

### Error 1: "Object directory entry locked for request/task"

**Error Message:**
```
refactoringError: [object Object] (Message TK/760)
Object directory entry /COREVIST/T_MAT_INC_EXC locked for request/task H01K900009
```

**Cause:** The object is already locked in another transport request.

**Solutions:**
1. **Remove from the locking transport:**
   ```json
   {
     "tool": "adt_remove_objects_from_transport",
     "transport_number": "H01K900009",
     "objects": [{"name": "/COREVIST/T_MAT_INC_EXC", "type": "TTYP"}]
   }
   ```

2. **Unlock the object:**
   ```json
   {
     "tool": "adt_unlock",
     "objects": [{"name": "/COREVIST/T_MAT_INC_EXC", "type": "TTYP"}]
   }
   ```

3. **Use the correct transport:** If the object should stay in that transport, use that transport number instead.

---

### Error 2: "Transport request does not contain a modifiable task"

**Error Message:**
```
refactoringError: [object Object] (Message RFAC_ADT/14)
Transport request H01K900009 does not contain a modifiable task for user CB9980000040
```

**Cause:** The provided transport request doesn't have a task assigned to your user.

**Solutions:**
1. **Get the request number (not task):** Use the parent request instead of the task number.
2. **Use a different transport:** Provide a transport where you have a modifiable task.
3. **Create a new task:** In SE09/SE10, create a new task under the request.

---

### Error 3: "No authorization for changing the package"

**Error Message:**
```
refactoringError: [object Object] (Message TR/48)
No authorization for changing the package
```

**Cause:** You don't have authorization to move objects between these specific packages, usually because they belong to different software components.

**Solutions:**
1. **Request authorization:** Contact your SAP Basis team to grant S_DEVELOP authorization for the target package.
2. **Check software components:** Verify both packages are in the same software component or you have cross-component authorization.
3. **Use correct transport:** Some organizations restrict certain transports - verify you're using an approved transport.

**Note:** This is a SAP authorization limitation, not a tool error.

---

### Error 4: "Local object is edited without a request"

**Error Message:**
```
refactoringError: [object Object] (Message TK/481)
Local object is edited without a request
```

**Cause:** You provided a transport request for a local object (package starting with `$`).

**Solution:** Remove the transport request or use an empty string for local objects:
```json
{
  "transport_request": ""
}
```

The tool automatically handles this if `current_package` starts with `$`.

---

### Error 5: "uriMappingError"

**Error Message:**
```
uriMappingError: [object Object] (Message SADT_TOOLS_CORE/4)
```

**Cause:** The object URI is incorrect or the object type is not supported.

**Solutions:**
1. **Verify object type:** Use one of the supported types listed above.
2. **Check object name:** Ensure the object name is correct and exists.
3. **Update tool:** Ensure you're using the latest version with all object type mappings.

---

### Error 6: "CSRF token validation failed"

**Error Message:**
```
CSRF token validation failed
```

**Cause:** Your session has expired or the CSRF token is invalid.

**Solution:** Re-authenticate:
```bash
node ADT/authenticate_btp_simple.js
```

---

### Error 7: "Session has expired" (BTP only)

**Error Message:**
```
BTP Session has expired. Please re-authenticate using: node ADT/authenticate_btp_simple.js
```

**Cause:** Your BTP session cookies have expired.

**Solution:**
```bash
node ADT/authenticate_btp_simple.js
```

---

## 🎓 Best Practices

### 1. Check Object Locks First

Before reassigning, check if the object is locked:

```json
{
  "tool": "adt_where_used_list",
  "object_name": "ZCL_MY_CLASS",
  "object_type": "CLAS"
}
```

### 2. Use Correct Transport Type

- **Development objects:** Use development/customizing transport (e.g., `H01K900086`)
- **Local objects ($TMP):** Use empty string `""`
- **Cross-system:** Ensure transport is releasable

### 3. Verify Package Names

- ✅ Use exact package names (case-sensitive)
- ✅ Include namespace prefix if applicable (e.g., `/COREVIST/`)
- ✅ Verify packages exist in the system

### 4. Handle Namespace Objects Carefully

For namespace objects like `/COREVIST/MY_CLASS`:
- ✅ Include the `/` prefix in `object_name`
- ✅ Tool automatically handles URL encoding
- ❌ Don't manually encode the name

### 5. Group Related Objects

When moving multiple objects, move them together in the same transport:

```json
// Move class
{
  "object_name": "ZCL_PRODUCT_READER",
  "object_type": "CLAS",
  "transport_request": "H01K900086",
  ...
}

// Move related interface
{
  "object_name": "ZIF_PRODUCT_READER",
  "object_type": "INTF",
  "transport_request": "H01K900086",  // Same transport!
  ...
}
```

### 6. Consider Dependencies

Before moving objects, use `adt_where_used_list` to understand dependencies:

```json
{
  "tool": "adt_where_used_list",
  "object_name": "ZCL_MY_CLASS",
  "object_type": "CLAS"
}
```

This helps you identify related objects that should move together.

---

## 🔄 Complete Workflow Examples

### Workflow 1: Clean Package Reorganization

**Scenario:** Move a class and its dependencies to a new package structure.

**Step 1:** Identify dependencies
```json
{
  "tool": "adt_where_used_list",
  "object_name": "ZCL_PRODUCT_READER",
  "object_type": "CLAS"
}
```

**Step 2:** Check if locked
```json
{
  "tool": "adt_where_used_list",
  "object_name": "ZCL_PRODUCT_READER",
  "object_type": "CLAS"
}
```

**Step 3:** Move the class
```json
{
  "tool": "adt_reassign_package",
  "object_name": "ZCL_PRODUCT_READER",
  "object_type": "CLAS",
  "current_package": "/COREVIST/OLD_PRODUCT",
  "new_package": "/COREVIST/PRODUCT",
  "transport_request": "H01K900086"
}
```

**Step 4:** Move related objects (interface, CDS views, etc.)

---

### Workflow 2: Fix Misplaced Object

**Scenario:** An object was created in the wrong package and needs to be moved.

**Step 1:** Remove from wrong transport (if applicable)
```json
{
  "tool": "adt_remove_objects_from_transport",
  "transport_number": "H01K900009",
  "objects": [
    {
      "name": "ZCL_MY_CLASS",
      "type": "CLAS",
      "position": "000003"
    }
  ]
}
```

**Step 2:** Unlock if needed
```json
{
  "tool": "adt_unlock",
  "objects": [{"name": "ZCL_MY_CLASS", "type": "CLAS"}]
}
```

**Step 3:** Move to correct package
```json
{
  "tool": "adt_reassign_package",
  "object_name": "ZCL_MY_CLASS",
  "object_type": "CLAS",
  "current_package": "$TMP",
  "new_package": "/COREVIST/PRODUCT",
  "transport_request": "H01K900086"
}
```

---

### Workflow 3: Bulk Package Reassignment

**Scenario:** Move multiple objects from one package to another.

```json
// Object 1: Class
{
  "tool": "adt_reassign_package",
  "object_name": "/COREVIST/CLFN_PRODUCT_SCM",
  "object_type": "CLAS",
  "current_package": "/COREVIST/PRODUCT",
  "new_package": "/COREVIST/_PRODUCT",
  "transport_request": "H01K900086"
}

// Object 2: Interface
{
  "tool": "adt_reassign_package",
  "object_name": "/COREVIST/IF_CLFN_PRODUCT",
  "object_type": "INTF",
  "current_package": "/COREVIST/PRODUCT",
  "new_package": "/COREVIST/_PRODUCT",
  "transport_request": "H01K900086"
}

// Object 3: CDS View
{
  "tool": "adt_reassign_package",
  "object_name": "/COREVIST/AE_MAT_SRCH_USER",
  "object_type": "DDLS",
  "current_package": "/COREVIST/PRODUCT",
  "new_package": "/COREVIST/_PRODUCT",
  "transport_request": "H01K900086"
}

// Object 4: Behavior Definition
{
  "tool": "adt_reassign_package",
  "object_name": "/COREVIST/AE_MAT_SRCH_IN",
  "object_type": "BDEF",
  "current_package": "/COREVIST/PRODUCT",
  "new_package": "/COREVIST/_PRODUCT",
  "transport_request": "H01K900086"
}
```

**Benefits:**
- ✅ All objects in same transport
- ✅ Maintains relationships
- ✅ Single release/import in target system

---

## 🔍 Technical Details

### URI Mapping

The tool automatically constructs correct ADT URIs for each object type:

| Object Type | URI Pattern | Example |
|-------------|-------------|---------|
| CLAS | `/sap/bc/adt/oo/classes/{name}` | `/sap/bc/adt/oo/classes/zcl_my_class` |
| INTF | `/sap/bc/adt/oo/interfaces/{name}` | `/sap/bc/adt/oo/interfaces/zif_my_interface` |
| DDLS | `/sap/bc/adt/ddic/ddl/sources/{name}` | `/sap/bc/adt/ddic/ddl/sources/z_i_material` |
| BDEF | `/sap/bc/adt/bo/behaviordefinitions/{name}` | `/sap/bc/adt/bo/behaviordefinitions/z_r_material` |
| TTYP | `/sap/bc/adt/ddic/tabletypes/{name}` | `/sap/bc/adt/ddic/tabletypes/%2fcorevist%2ft_mat` |
| SUSH | `/sap/bc/adt/aps/iam/sush/{name}` | `/sap/bc/adt/aps/iam/sush/bbf96d7687b5258...` |
| SCO3 | `/sap/bc/adt/aps/cloud/com/sco3/{name}` | `/sap/bc/adt/aps/cloud/com/sco3/%2fcorevist%2fapi` |

**Note:** Names are automatically URL-encoded (e.g., `/COREVIST/MY_CLASS` becomes `%2fcorevist%2fmy_class`).

---

### XML Payload Structure

The tool generates XML payloads matching Eclipse ADT's format:

```xml
<?xml version="1.0" encoding="ASCII"?>
<generic:genericRefactoring xmlns:adtcore="http://www.sap.com/adt/core" xmlns:generic="http://www.sap.com/adt/refactoring/genericrefactoring">
  <generic:title>Change Package Assignment of {object_name}</generic:title>
  <generic:adtObjectUri>{object_uri}</generic:adtObjectUri>
  <generic:affectedObjects>
    <generic:affectedObject adtcore:description="{description}" adtcore:name="{object_name}" adtcore:packageName="{current_package}" adtcore:type="{adt_core_type}" adtcore:uri="{object_uri}">
      <generic:userContent></generic:userContent>
      <generic:changePackageDelta>
        <generic:newPackage>{new_package}</generic:newPackage>
      </generic:changePackageDelta>
    </generic:affectedObject>
  </generic:affectedObjects>
  <generic:transport>{transport_request}</generic:transport>
  <generic:ignoreSyntaxErrorsAllowed>false</generic:ignoreSyntaxErrorsAllowed>
  <generic:ignoreSyntaxErrors>false</generic:ignoreSyntaxErrors>
  <generic:userContent></generic:userContent>
</generic:genericRefactoring>
```

---

## 🔐 Authorization Requirements

### Required SAP Authorizations

To reassign packages, you need:

1. **S_DEVELOP** - Development authorization
   - Activity: `01` (Create), `02` (Change)
   - Object Type: Specific to object being moved
   - Package: Both source and target packages

2. **S_TCODE** - Transaction authorization
   - Transaction: `SE80`, `SE09`, `SE10`

3. **S_TRANSPRT** - Transport authorization
   - Transport request: Change authorization for the specified transport

### Authorization Checks

The tool respects SAP authorization:
- ✅ Objects can only be moved if authorized
- ✅ Transport requests must be modifiable by user
- ✅ Package access must be granted
- ❌ Cross-software-component moves may require special authorization

---

## 📊 Comparison with Manual Package Assignment

| Aspect | Manual (SE80/SE24) | `adt_reassign_package` Tool |
|--------|-------------------|----------------------------|
| **Speed** | Slow (multiple clicks) | Fast (single API call) |
| **Batch** | One at a time | Scriptable for bulk |
| **Accuracy** | Manual entry errors | Automated, validated |
| **Logging** | No built-in log | Detailed success/error logs |
| **Integration** | Manual only | Can integrate with CI/CD |
| **Error Handling** | Generic messages | Detailed, actionable errors |
| **Namespace Objects** | Manual encoding | Automatic URL encoding |

---

## 🚀 Advanced Use Cases

### Use Case 1: CI/CD Integration

Automate package structure during development:

```javascript
// Example: Node.js script for CI/CD
const objectsToMove = [
  { name: 'ZCL_CLASS1', type: 'CLAS' },
  { name: 'ZCL_CLASS2', type: 'CLAS' },
  { name: 'ZIF_INTERFACE1', type: 'INTF' }
];

for (const obj of objectsToMove) {
  await mcpClient.callTool('adt_reassign_package', {
    object_name: obj.name,
    object_type: obj.type,
    current_package: 'ZDEV',
    new_package: 'ZPROD',
    transport_request: process.env.TRANSPORT_REQUEST
  });
}
```

---

### Use Case 2: Package Cleanup Script

Identify and move misplaced objects:

```javascript
// Pseudo-code for package cleanup
const misplacedObjects = await findMisplacedObjects();

for (const obj of misplacedObjects) {
  const correctPackage = determineCorrectPackage(obj);
  
  await mcpClient.callTool('adt_reassign_package', {
    object_name: obj.name,
    object_type: obj.type,
    current_package: obj.current_package,
    new_package: correctPackage,
    transport_request: CLEANUP_TRANSPORT
  });
}
```

---

### Use Case 3: Refactoring Assistant

Move related objects together based on dependencies:

```javascript
// Get all objects that use a specific class
const dependencies = await mcpClient.callTool('adt_where_used_list', {
  object_name: 'ZCL_CORE_CLASS',
  object_type: 'CLAS'
});

// Move core class and all dependent classes to new package
const allObjects = [mainObject, ...dependencies];

for (const obj of allObjects) {
  await mcpClient.callTool('adt_reassign_package', {
    object_name: obj.name,
    object_type: obj.type,
    current_package: obj.package,
    new_package: 'ZNEW_PACKAGE',
    transport_request: REFACTOR_TRANSPORT
  });
}
```

---

## 🐛 Troubleshooting

### Tool Not Found

**Issue:** MCP client doesn't recognize `adt_reassign_package`

**Solution:**
1. Verify you're using the correct server (BTP or standard)
2. Restart MCP client
3. Check server logs for registration errors
4. Ensure latest version of `server_adt_btp.js` or `server_adt.js`

---

### Unexpected Errors

**Issue:** Getting unfamiliar error messages

**Solution:**
1. Check `rawError` field in response for SAP's original error
2. Enable debug logging: Set `DEBUG=true` in environment
3. Review SAP system logs (ST22, SM21)
4. Verify object exists and is accessible

---

### Performance Issues

**Issue:** Package reassignment takes too long

**Causes:**
- Large dependency tree
- Network latency
- SAP system load

**Solutions:**
- Move objects in smaller batches
- Schedule during off-peak hours
- Check network connectivity
- Contact SAP Basis for system performance

---

## 📚 Related Tools

### Complementary ADT Tools

1. **`adt_where_used_list`** - Find dependencies before moving
2. **`adt_remove_objects_from_transport`** - Clean up transport before reassignment
3. **`adt_unlock`** - Release locks on objects
4. **`adt_read_source`** - Verify object before moving

### Recommended Workflow Tools

```json
// Step 1: Check dependencies
{"tool": "adt_where_used_list", "object_name": "ZCL_MY_CLASS", "object_type": "CLAS"}

// Step 2: Remove from old transport (if needed)
{"tool": "adt_remove_objects_from_transport", ...}

// Step 3: Unlock (if needed)
{"tool": "adt_unlock", "objects": [...]}

// Step 4: Reassign package
{"tool": "adt_reassign_package", ...}
```

---

## 📝 Summary

### Quick Reference

| Task | Command | Key Points |
|------|---------|------------|
| **Move Class** | `adt_reassign_package` | Use `CLAS` type |
| **Move Interface** | `adt_reassign_package` | Use `INTF` type |
| **Move CDS View** | `adt_reassign_package` | Use `DDLS` type |
| **Move Local Object** | `adt_reassign_package` | Empty transport for `$TMP` |
| **Fix Locked Object** | `adt_unlock` first | Then reassign |
| **Check Dependencies** | `adt_where_used_list` | Before moving |

---

### When to Use This Tool

✅ **DO use when:**
- Reorganizing package structure
- Moving misplaced objects
- Consolidating related objects
- Refactoring package hierarchy
- Automating package management

❌ **DON'T use when:**
- Object is actively being edited
- No proper authorization
- Transport is already released
- Cross-system conflicts exist

---

## 🎯 Next Steps

1. **Test with simple object:** Start with a test class in `$TMP`
2. **Try namespace objects:** Test with real development objects
3. **Batch operations:** Script multiple object moves
4. **Integrate workflows:** Combine with other ADT tools
5. **Automate:** Build package cleanup/reorganization scripts

---

## 📖 Additional Resources

- **Main Guide:** `USAGE_GUIDE_MCP.md` - All ADT tools
- **Transport Tool:** `TRANSPORT_REMOVAL_GUIDE.md` - Remove objects from transports
- **Where-Used:** `WHERE_USED_LIST_GUIDE.md` - Find dependencies
- **Architecture:** `ARCHITECTURE.md` - System design

---

**Ready to reorganize your packages?** Start with the examples above! 🚀








