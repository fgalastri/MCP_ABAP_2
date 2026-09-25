# List Package Objects Tool - Documentation

## Date: December 29, 2025

## Overview
New tool `adt_list_package_objects` that lists all objects in a package or filters by specific object type. Perfect for exploring packages, discovering dependencies, and planning refactoring.

---

## Tool: `adt_list_package_objects`

### Purpose
- List all objects in a package (data elements, classes, domains, tables, CDS views, etc.)
- Filter by specific object type
- Get object names, descriptions, types, and URIs

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `package_name` | string | ✅ Yes | Package name (e.g., `/COREVIST/BTP_HC`, `$TMP`, `ZPACKAGE`) |
| `object_type` | string | ❌ No | Optional filter by object type (leave empty to get all objects) |

### Supported Object Types

| Type | Description | Group |
|------|-------------|-------|
| `CLAS` / `CLASS` | ABAP Classes | SOURCE_LIBRARY |
| `INTF` / `INTERFACE` | ABAP Interfaces | SOURCE_LIBRARY |
| `DTEL` / `DATA_ELEMENT` | Data Elements | DICTIONARY |
| `DOMA` / `DOMAIN` | Domains | DICTIONARY |
| `TABL` / `TABLE` | Database Tables | DICTIONARY |
| `TTYP` / `TABLE_TYPE` | Table Types | DICTIONARY |
| `DDLS` / `CDS` | CDS Views | CORE_DATA_SERVICES |
| `BDEF` / `BEHAVIOR_DEFINITION` | Behavior Definitions | CORE_DATA_SERVICES |
| `PROG` / `PROGRAM` | Programs/Reports | PROGRAMS |
| `FUGR` / `FUNCTION_GROUP` | Function Groups | PROGRAMS |

---

## Usage Examples

### 1. List All Objects in a Package

```javascript
// Get everything in the package
const result = await adt_list_package_objects({
  package_name: "/COREVIST/BTP_HC"
});

// Returns grouped by type:
// - CLAS (15 objects)
//   - /COREVIST/CL_CLASS1 - Description
//   - /COREVIST/CL_CLASS2 - Description
// - DTEL (51 objects)
//   - /COREVIST/_ACTUAL_VALUE - Actual value
//   - /COREVIST/_AREA - Corevist module
// - DOMA (45 objects)
//   ...
```

### 2. Filter by Data Elements Only

```javascript
// Get only data elements
const result = await adt_list_package_objects({
  package_name: "/COREVIST/BTP_HC",
  object_type: "DTEL"
});

// Returns:
// 1. /COREVIST/_ACTUAL_VALUE - Actual value
// 2. /COREVIST/_AREA - Corevist module
// 3. /COREVIST/_BUSINESS_OBJECT - Business object
// ...
```

### 3. Filter by Classes

```javascript
// Get only classes
const result = await adt_list_package_objects({
  package_name: "ZPACKAGE",
  object_type: "CLAS"
});
```

### 4. Filter by CDS Views

```javascript
// Get only CDS views
const result = await adt_list_package_objects({
  package_name: "/COREVIST/BTP_HC",
  object_type: "DDLS"
});
```

---

## Response Structure

### Success Response

```javascript
{
  success: true,
  packageName: "/COREVIST/BTP_HC",
  objectType: "DTEL" | "CLAS" | "ALL",
  objectCount: 51,
  objects: [
    {
      name: "/COREVIST/_ACTUAL_VALUE",
      type: "DTEL/DE",
      description: "Actual value",
      package: "/COREVIST/BTP_HC",
      uri: "/sap/bc/adt/ddic/dataelements/%2fcorevist%2f_actual_value"
    },
    // ... more objects
  ]
}
```

### Error Response

```javascript
{
  success: false,
  error: "Error message",
  httpStatus: 404,
  details: {...},
  hint: "..."
}
```

---

## Use Cases

### 1. **Package Exploration**
```javascript
// Explore a new package
const all = await adt_list_package_objects({ 
  package_name: "/COREVIST/BTP_HC" 
});
// See all object types and counts
```

### 2. **Find All Data Elements**
```javascript
// Find all data elements in a package
const dtels = await adt_list_package_objects({ 
  package_name: "/COREVIST/BTP_HC",
  object_type: "DTEL"
});
// Returns 51 data elements with names and descriptions
```

### 3. **Discover All Classes**
```javascript
// Find all classes for refactoring
const classes = await adt_list_package_objects({
  package_name: "ZPACKAGE",
  object_type: "CLAS"
});
// Get list of all classes to analyze
```

### 4. **List All CDS Views**
```javascript
// Find all CDS views for documentation
const cdsViews = await adt_list_package_objects({
  package_name: "/COREVIST/BTP_HC",
  object_type: "DDLS"
});
```

### 5. **Mass Operations**
```javascript
// Get all data elements, then update them
const result = await adt_list_package_objects({
  package_name: "/COREVIST/BTP_HC",
  object_type: "DTEL"
});

for (const obj of result.objects) {
  // Read, modify, save each data element
  const source = await adt_read_source({
    object_name: obj.name,
    object_type: "DTEL"
  });
  // ... process and save ...
}
```

---

## API Details

### Endpoint
```
POST /sap/bc/adt/repository/informationsystem/virtualfolders/contents
```

### Request Headers
```
X-CSRF-Token: {token}
Accept: application/vnd.sap.adt.repository.virtualfolders.result.v1+xml
Content-Type: application/vnd.sap.adt.repository.virtualfolders.request.v1+xml
```

### Request Body (All Objects)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<vfs:virtualFoldersRequest xmlns:vfs="http://www.sap.com/adt/ris/virtualFolders" 
                          objectSearchPattern="*">
  <vfs:preselection facet="package">
    <vfs:value>/COREVIST/BTP_HC</vfs:value>
  </vfs:preselection>
  <vfs:facetorder/>
</vfs:virtualFoldersRequest>
```

### Request Body (Filtered by Type - Data Elements)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<vfs:virtualFoldersRequest xmlns:vfs="http://www.sap.com/adt/ris/virtualFolders" 
                          objectSearchPattern="*">
  <vfs:preselection facet="package">
    <vfs:value>/COREVIST/BTP_HC</vfs:value>
  </vfs:preselection>
  <vfs:preselection facet="group">
    <vfs:value>DICTIONARY</vfs:value>
  </vfs:preselection>
  <vfs:preselection facet="type">
    <vfs:value>DTEL</vfs:value>
  </vfs:preselection>
  <vfs:facetorder/>
</vfs:virtualFoldersRequest>
```

### Response
```xml
<?xml version="1.0" encoding="UTF-8"?>
<vfs:virtualFoldersResult xmlns:vfs="http://www.sap.com/adt/ris/virtualFolders" 
                         objectCount="51">
  <vfs:object uri="/sap/bc/adt/ddic/dataelements/%2fcorevist%2f_actual_value" 
              name="/COREVIST/_ACTUAL_VALUE" 
              package="/COREVIST/BTP_HC" 
              type="DTEL/DE" 
              text="Actual value">
    ...
  </vfs:object>
  <!-- ... more objects ... -->
</vfs:virtualFoldersResult>
```

---

## Object Type Mapping

The tool automatically maps common names to ADT types and groups:

| Input | ADT Type | Group |
|-------|----------|-------|
| `DTEL`, `DATA_ELEMENT` | `DTEL` | `DICTIONARY` |
| `DOMA`, `DOMAIN` | `DOMA` | `DICTIONARY` |
| `TABL`, `TABLE` | `TABL` | `DICTIONARY` |
| `TTYP`, `TABLE_TYPE` | `TTYP` | `DICTIONARY` |
| `CLAS`, `CLASS` | `CLAS` | `SOURCE_LIBRARY` |
| `INTF`, `INTERFACE` | `INTF` | `SOURCE_LIBRARY` |
| `DDLS`, `CDS` | `DDLS` | `CORE_DATA_SERVICES` |
| `BDEF`, `BEHAVIOR_DEFINITION` | `BDEF` | `CORE_DATA_SERVICES` |
| `PROG`, `PROGRAM` | `PROG` | `PROGRAMS` |
| `FUGR`, `FUNCTION_GROUP` | `FUGR` | `PROGRAMS` |

---

## Benefits

✅ **Package Discovery** - Quickly explore what's in a package  
✅ **Type Filtering** - Focus on specific object types  
✅ **Mass Operations** - Get list of objects for bulk processing  
✅ **Documentation** - Generate package documentation  
✅ **Refactoring** - Identify objects before refactoring  
✅ **Impact Analysis** - See all objects in a package  
✅ **Flexible** - Get all objects or filter by type  

---

## Common Workflows

### Workflow 1: Explore Package
```javascript
// 1. See what's in the package
const all = await adt_list_package_objects({ 
  package_name: "/COREVIST/BTP_HC" 
});

// 2. Focus on data elements
const dtels = await adt_list_package_objects({ 
  package_name: "/COREVIST/BTP_HC",
  object_type: "DTEL"
});

// 3. Read specific data element
const source = await adt_read_source({
  object_name: dtels.objects[0].name,
  object_type: "DTEL"
});
```

### Workflow 2: Mass Update
```javascript
// 1. Get all data elements
const result = await adt_list_package_objects({
  package_name: "/COREVIST/BTP_HC",
  object_type: "DTEL"
});

// 2. Update each one
for (const obj of result.objects) {
  const source = await adt_read_source({
    object_name: obj.name,
    object_type: "DTEL"
  });
  
  // Modify XML...
  const updatedXml = modifyLabels(source.source);
  
  await adt_save_data_element({ data_element_xml: updatedXml });
  await adt_activate({ objects: [{ name: obj.name, type: "DTEL" }] });
}
```

---

## Files Modified

1. **server_adt.js**
   - Added `listPackageObjects()` method (~line 2174)
   - Added `adt_list_package_objects` tool registration (~line 5410)
   - Added case handler (~line 8119)

---

## Status
✅ **IMPLEMENTED AND READY TO USE**

The `adt_list_package_objects` tool is now available for exploring packages and discovering objects!

---

## Related Tools
- `adt_read_source` - Read object source code
- `adt_where_used_list` - Find where objects are used
- `adt_save_data_element` - Update data elements
- `adt_save_domain` - Update domains

