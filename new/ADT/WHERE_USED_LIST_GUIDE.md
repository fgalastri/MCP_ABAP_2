# Where-Used List Tool Guide

## 🎯 Overview

The **Where-Used List Tool** (`adt_where_used_list`) finds all references to an ABAP object across the SAP system. This is essential for **impact analysis** before making changes to existing code, ensuring you understand which other objects depend on the object you're modifying.

---

## 🔧 Tool Details

### Tool Name
`adt_where_used_list`

### Purpose
Find where an ABAP object is being used (where-used list). Returns all references to the specified object across the system. Useful for impact analysis before making changes.

---

## 📋 Parameters

### Required Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `object_name` | string | Name of the ABAP object | `ZCL_MY_CLASS`, `ZCE_ACTIVITY_STATUS`, `ZI_MY_INTERFACE` |
| `object_type` | string | Object type code | `CLAS`, `INTF`, `DDLS`, `PROG`, `TABL`, etc. |

### Supported Object Types

| Object Type Code | Description |
|-----------------|-------------|
| `CLAS` or `CLASS` | ABAP Class |
| `INTF` or `INTERFACE` | ABAP Interface |
| `PROG` or `REPORT` | ABAP Program/Report |
| `DDLS` or `CDS` | CDS View |
| `TABL` or `TABLE` | Database Table |
| `FUGR` or `FUNCTION_GROUP` | Function Group |
| `DTEL` or `DATA_ELEMENT` | Data Element |
| `DOMA` or `DOMAIN` | Domain |

---

## 📤 Return Value

### Success Response

```json
{
  "success": true,
  "numberOfResults": 2,
  "resultDescription": "[S4H] Where-Used List: ZCL_ACTIVITY_STATUS_QUERY (Class)",
  "references": [
    {
      "uri": "/sap/bc/adt/ddic/ddl/sources/zce_activity_status",
      "parentUri": "/sap/bc/adt/packages/zusertools",
      "isResult": false,
      "canHaveChildren": true,
      "usageInformation": "gradeDirect,includeProductive",
      "name": "ZCE_ACTIVITY_STATUS",
      "type": "DDLS/DF",
      "packageName": "ZUSERTOOLS",
      "description": null
    },
    {
      "uri": "/sap/bc/adt/oo/classes/zcl_activity_status_query",
      "parentUri": "/sap/bc/adt/packages/zusertools",
      "isResult": false,
      "canHaveChildren": false,
      "usageInformation": null,
      "name": "ZCL_ACTIVITY_STATUS_QUERY",
      "type": "CLAS/OC",
      "packageName": "ZUSERTOOLS",
      "description": null
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | `true` if the operation succeeded |
| `numberOfResults` | number | Total number of references found |
| `resultDescription` | string | Human-readable description of the search result |
| `references` | array | List of objects that reference the searched object |
| `references[].uri` | string | ADT URI of the referencing object |
| `references[].parentUri` | string | URI of the parent object (package, etc.) |
| `references[].isResult` | boolean | Whether this is a direct result |
| `references[].canHaveChildren` | boolean | Whether this object can have child references |
| `references[].usageInformation` | string | Usage details (e.g., "gradeDirect,includeProductive") |
| `references[].name` | string | Name of the referencing object |
| `references[].type` | string | Object type code (e.g., "CLAS/OC", "DDLS/DF") |
| `references[].packageName` | string | Package where the object belongs |
| `references[].description` | string | Object description (if available) |

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information",
  "hint": "Suggestion for fixing the error",
  "numberOfResults": 0,
  "references": []
}
```

---

## 💡 Usage Examples

### Example 1: Check Usage of a Class Before Modification

**Scenario:** You want to modify `ZCL_ACTIVITY_STATUS_QUERY` but need to understand its impact first.

```json
{
  "tool": "adt_where_used_list",
  "arguments": {
    "object_name": "ZCL_ACTIVITY_STATUS_QUERY",
    "object_type": "CLAS"
  }
}
```

**Response:**
```
🔍 **Where-Used List: CLAS ZCL_ACTIVITY_STATUS_QUERY**

**Total References Found:** 2
**Description:** [S4H] Where-Used List: ZCL_ACTIVITY_STATUS_QUERY (Class)

**Referenced Objects:**

1. **ZCE_ACTIVITY_STATUS** (DDLS/DF)
   - URI: `/sap/bc/adt/ddic/ddl/sources/zce_activity_status`
   - Package: ZUSERTOOLS
   - Usage: gradeDirect,includeProductive

2. **ZCL_ACTIVITY_STATUS_QUERY** (CLAS/OC)
   - URI: `/sap/bc/adt/oo/classes/zcl_activity_status_query`
   - Package: ZUSERTOOLS
```

**Interpretation:**
- The class is used by CDS view `ZCE_ACTIVITY_STATUS`
- Changes to the class may affect the CDS view behavior
- Review the CDS view before making changes

---

### Example 2: Find All References to an Interface

**Scenario:** You're refactoring an interface and need to know all classes that implement it.

```json
{
  "tool": "adt_where_used_list",
  "arguments": {
    "object_name": "ZIF_PROCESSOR",
    "object_type": "INTF"
  }
}
```

---

### Example 3: Check Table Usage

**Scenario:** Before modifying a table structure, check which programs/CDS views use it.

```json
{
  "tool": "adt_where_used_list",
  "arguments": {
    "object_name": "ZTT_MATERIAL",
    "object_type": "TABL"
  }
}
```

---

## 🎯 Use Cases

### 1. Impact Analysis Before Changes
**When:** Before modifying, deleting, or renaming an object
**Benefit:** Understand which other objects will be affected

```typescript
// Workflow:
// 1. Check where-used list
const whereUsed = await callTool('adt_where_used_list', {
  object_name: 'ZCL_MY_CLASS',
  object_type: 'CLAS'
});

// 2. Inform user of impact
if (whereUsed.numberOfResults > 0) {
  respond(`⚠️ This class is used by ${whereUsed.numberOfResults} other objects:
  ${whereUsed.references.map(r => `- ${r.name}`).join('\n')}
  
  Changes may affect these objects. Proceed?`);
}

// 3. Only proceed after confirmation
```

---

### 2. Dependency Mapping
**When:** Understanding system architecture or dependencies
**Benefit:** Visualize how objects are connected

---

### 3. Refactoring Safety
**When:** Planning a large refactoring
**Benefit:** Ensure all dependent code is updated together

```typescript
// Before refactoring:
const refs = await callTool('adt_where_used_list', {
  object_name: 'ZIF_OLD_API',
  object_type: 'INTF'
});

// Create a list of objects to update
const objectsToUpdate = refs.references.map(r => ({
  name: r.name,
  type: r.type
}));

// Update all dependent objects in batch
```

---

### 4. Documentation Generation
**When:** Generating system documentation
**Benefit:** Automatically include usage information

---

## 🔍 Technical Details

### ADT API Endpoint

```
POST /sap/bc/adt/repository/informationsystem/usageReferences?uri={encoded_object_uri}
```

**Headers:**
- `X-CSRF-Token`: CSRF token (automatically handled)
- `Accept`: `application/vnd.sap.adt.repository.usagereferences.result.v1+xml`
- `Content-Type`: `application/vnd.sap.adt.repository.usagereferences.request.v1+xml`

**Request Body:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<usagereferences:usageReferenceRequest xmlns:usagereferences="http://www.sap.com/adt/ris/usageReferences">
  <usagereferences:affectedObjects/>
</usagereferences:usageReferenceRequest>
```

**Response Format:**
XML with `usageReferences:usageReferenceResult` containing:
- `@numberOfResults`: Total count
- `@resultDescription`: Description
- `usageReferences:referencedObjects`: Array of referencing objects

---

## 🚨 Common Errors

### Error 1: Object Not Found

**Error:**
```
❌ Error: Object not found
HTTP Status: 404
```

**Causes:**
- Object doesn't exist in the system
- Wrong object name (check spelling/case)
- Wrong object type

**Solution:**
- Verify object exists using `adt_read_source`
- Check object name spelling
- Ensure correct object type code

---

### Error 2: Object Type Not Supported

**Error:**
```
❌ Error: Invalid object type
```

**Solution:**
- Check the supported object types list
- Use the correct type code (e.g., `CLAS` not `CLASS` for some operations, though both are accepted)

---

## ✅ Best Practices

### 1. Always Check Before Major Changes

```typescript
// ✅ DO: Check usage before modifying
const whereUsed = await callTool('adt_where_used_list', {
  object_name: 'ZCL_PROCESSOR',
  object_type: 'CLAS'
});

if (whereUsed.numberOfResults > 10) {
  respond(`⚠️ Warning: This class is heavily used (${whereUsed.numberOfResults} references).
  Consider the impact of your changes carefully.`);
}
```

---

### 2. Document Dependencies

```typescript
// Generate dependency documentation
const deps = await callTool('adt_where_used_list', {...});
const doc = `## Dependencies

This object is used by:
${deps.references.map(r => `- ${r.name} (${r.type}) in ${r.packageName}`).join('\n')}
`;
```

---

### 3. Use for Refactoring Workflows

```typescript
// Step 1: Check current usage
const currentRefs = await callTool('adt_where_used_list', {
  object_name: 'ZIF_OLD',
  object_type: 'INTF'
});

// Step 2: Create new interface
await callTool('adt_create_interface', {
  interface_name: 'ZIF_NEW',
  ...
});

// Step 3: Update all references
for (const ref of currentRefs.references) {
  await updateReference(ref.name, ref.type, 'ZIF_OLD', 'ZIF_NEW');
}

// Step 4: Verify no remaining references
const newRefs = await callTool('adt_where_used_list', {
  object_name: 'ZIF_OLD',
  object_type: 'INTF'
});

if (newRefs.numberOfResults === 0) {
  respond('✅ All references updated. Safe to delete old interface.');
}
```

---

## 🔄 Integration with Other Tools

### Workflow: Safe Refactoring

```
1. adt_where_used_list → Find all references
2. adt_read_source → Read each referencing object
3. Modify code → Update references
4. adt_save_source → Save changes (multiple objects)
5. adt_activate → Activate all together
6. adt_where_used_list → Verify no broken references
```

---

## 📊 Comparison with SE11/SE80

| Feature | ADT Tool | SE11/SE80 |
|---------|----------|-----------|
| **Speed** | ✅ Fast (API call) | ⚠️ Slower (GUI navigation) |
| **Automation** | ✅ Can be automated | ❌ Manual only |
| **Integration** | ✅ Works with other tools | ❌ Standalone |
| **API Access** | ✅ Available via MCP | ❌ GUI only |
| **Batch Operations** | ✅ Easy to script | ❌ One at a time |

---

## 🚀 Quick Reference

| User Intent | Tool Call |
|-------------|-----------|
| "Where is ZCL_TEST used?" | `adt_where_used_list` with `CLAS` |
| "What references this CDS view?" | `adt_where_used_list` with `DDLS` |
| "Check impact before deleting" | `adt_where_used_list` first |
| "Find all dependents" | `adt_where_used_list` |

---

## 📚 Related Documentation

- **USAGE_GUIDE.md**: General guide for all ADT tools
- **AI_AGENT_CALLS.md**: How AI agents should use these tools
- **PROGRAMS_AND_INCLUDES_GUIDE.md**: Reading programs and includes
- **FUNCTION_MODULE_READING_GUIDE.md**: Reading function modules

---

## ✅ Checklist for Usage

Before using this tool:
- [ ] Know the exact object name
- [ ] Verify the object type code
- [ ] Understand what the results mean

When interpreting results:
- [ ] Count total references (`numberOfResults`)
- [ ] Review each reference type and package
- [ ] Consider usage information (`gradeDirect`, etc.)
- [ ] Plan changes based on impact

After getting results:
- [ ] Document findings
- [ ] Plan refactoring approach if needed
- [ ] Update dependent objects if modifying
- [ ] Re-check after changes to verify

---

**Ready to use?** Start by checking where your objects are used! 🔍


