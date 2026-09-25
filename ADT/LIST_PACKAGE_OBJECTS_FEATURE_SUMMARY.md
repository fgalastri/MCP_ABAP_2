# List Package Objects Tool - Quick Reference

## Date: December 29, 2025

## 🎯 Summary

New MCP tool **`adt_list_package_objects`** that lists all objects in a SAP package or filters by specific object type. Perfect for package exploration, mass operations, and dependency analysis.

---

## 🚀 Quick Start

### List ALL Objects in a Package
```javascript
adt_list_package_objects({ 
  package_name: "/COREVIST/BTP_HC" 
});
// Returns: 79 total objects, grouped by type
```

### List Only Data Elements
```javascript
adt_list_package_objects({ 
  package_name: "/COREVIST/BTP_HC",
  object_type: "DTEL"
});
// Returns: 51 data elements with names and descriptions
```

### List Only Classes
```javascript
adt_list_package_objects({ 
  package_name: "ZPACKAGE",
  object_type: "CLAS"
});
// Returns: List of all classes in the package
```

---

## 📋 Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `package_name` | ✅ Yes | Package to search | `/COREVIST/BTP_HC`, `$TMP`, `ZPACKAGE` |
| `object_type` | ❌ No | Filter by type (leave empty for all) | `DTEL`, `CLAS`, `DOMA`, `DDLS`, etc. |

---

## 🔧 Supported Object Types

| Type | Description |
|------|-------------|
| `CLAS` / `CLASS` | ABAP Classes |
| `INTF` / `INTERFACE` | ABAP Interfaces |
| `DTEL` / `DATA_ELEMENT` | Data Elements |
| `DOMA` / `DOMAIN` | Domains |
| `TABL` / `TABLE` | Database Tables |
| `TTYP` / `TABLE_TYPE` | Table Types |
| `DDLS` / `CDS` | CDS Views |
| `BDEF` / `BEHAVIOR_DEFINITION` | Behavior Definitions |
| `PROG` / `PROGRAM` | Programs/Reports |
| `FUGR` / `FUNCTION_GROUP` | Function Groups |

---

## ✅ Test Results

### Test 1: BTP - Data Elements Only
```
Package: /COREVIST/BTP_HC
Filter: DTEL
Result: ✅ 51 data elements found
```

**Sample Output:**
```
1. /COREVIST/_ACTUAL_VALUE - Actual value
2. /COREVIST/_AREA - Corevist module
3. /COREVIST/_BUSINESS_OBJECT - Business object
4. /COREVIST/_CLASSNAME - Class name
...
```

### Test 2: BTP - All Objects (No Filter)
```
Package: /COREVIST/BTP_HC
Filter: ALL
Result: ✅ 79 total objects found
```

**Sample Output (Grouped by Type):**
```
### BDEF/BDO (1 objects)
- /COREVIST/_I_CACHE - Cache control behavior

### CLAS/OC (2 objects)
- /COREVIST/_BP_I_CACHE - Behavior Implementation
- /COREVIST/_CACHE_HANDLER - Cache handler

### DDLS/DF (1 objects)
- /COREVIST/_I_CACHE - Cache control

### DOMA/DD (19 objects)
- /COREVIST/_AREA - Setting area
- /COREVIST/_BUSINESS_OBJECT - Business object
...

### DTEL/DE (51 objects)
- /COREVIST/_ACTUAL_VALUE - Actual value
- /COREVIST/_AREA - Corevist module
...
```

### Test 3: BTP - Classes Only
```
Package: /COREVIST/BTP_HC
Filter: CLAS
Result: ✅ 2 classes found
```

**Sample Output:**
```
1. /COREVIST/_BP_I_CACHE - Behavior Implementation for /COREVIST/_I_CACHE
2. /COREVIST/_CACHE_HANDLER - Cache handler
```

### Test 4: On-Premise (NC1) - Domains in $TMP
```
Package: $TMP
Filter: DOMA
Result: ✅ 249 domains found
```

---

## 💡 Use Cases

### 1. Package Exploration
Quickly see what's inside a package:
```javascript
const all = await adt_list_package_objects({ 
  package_name: "/COREVIST/BTP_HC" 
});
// Shows all object types and counts
```

### 2. Mass Data Element Update
Find all data elements, then update them:
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
  
  // Modify and save...
  await adt_save_data_element({ data_element_xml: updatedXml });
  await adt_activate({ objects: [{ name: obj.name, type: "DTEL" }] });
}
```

### 3. Discover All CDS Views
```javascript
const cdsViews = await adt_list_package_objects({
  package_name: "/COREVIST/BTP_HC",
  object_type: "DDLS"
});
// Use for documentation or analysis
```

### 4. Find All Classes for Refactoring
```javascript
const classes = await adt_list_package_objects({
  package_name: "ZPACKAGE",
  object_type: "CLAS"
});
// Identify classes before major refactoring
```

---

## 📊 Response Structure

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

---

## 🔄 Common Workflows

### Workflow 1: Explore → Focus → Read
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

### Workflow 2: List → Mass Update → Activate
```javascript
// 1. Get all domains
const domains = await adt_list_package_objects({
  package_name: "/COREVIST/BTP_HC",
  object_type: "DOMA"
});

// 2. Update each domain
for (const domain of domains.objects) {
  // Read, modify, save, activate
}
```

---

## 🛠️ Technical Details

### ADT API Endpoint
```
POST /sap/bc/adt/repository/informationsystem/virtualfolders/contents
```

### Request Headers
```
X-CSRF-Token: {token}
Accept: application/vnd.sap.adt.repository.virtualfolders.result.v1+xml
Content-Type: application/vnd.sap.adt.repository.virtualfolders.request.v1+xml
```

### Request Body (Filtered by Type)
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

---

## 🎁 Benefits

✅ **Fast Package Exploration** - See all objects at once  
✅ **Flexible Filtering** - Get all or filter by type  
✅ **Mass Operations** - Perfect for bulk updates  
✅ **Auto-Grouping** - Objects grouped by type when showing all  
✅ **Cross-System** - Works on BTP and on-premise  
✅ **No Manual Listing** - Automated object discovery  

---

## 📂 Files Modified

1. **ADT/server_adt.js**
   - Added `listPackageObjects()` method
   - Added `adt_list_package_objects` tool registration
   - Added case handler with grouping logic

2. **ADT/LIST_PACKAGE_OBJECTS_GUIDE.md**
   - Comprehensive documentation with examples

3. **ADT/LIST_PACKAGE_OBJECTS_FEATURE_SUMMARY.md**
   - This quick reference document

---

## 🔗 Related Tools

- `adt_read_source` - Read object source code after discovery
- `adt_where_used_list` - Find where objects are used
- `adt_save_data_element` - Update data elements in bulk
- `adt_save_domain` - Update domains in bulk
- `adt_activate` - Activate objects after changes

---

## ✅ Status

**FULLY TESTED AND PRODUCTION READY**

Tested on:
- ✅ BTP System (cloud) - 79 objects, grouped display
- ✅ BTP System - Data elements filter (51 objects)
- ✅ BTP System - Classes filter (2 objects)
- ✅ NC1 System (on-premise) - Domains in $TMP (249 objects)

---

## 🎉 Bottom Line

The `adt_list_package_objects` tool is your **package explorer** for SAP development. Use it to:
- Discover what's in a package
- Filter by object type
- Prepare for mass operations
- Document package contents
- Analyze dependencies

**Simple, flexible, and powerful!** 🚀

