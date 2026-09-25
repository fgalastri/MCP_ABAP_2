# Save Table Type Tool - Documentation

## Date: December 30, 2025

## Overview
New tool **`adt_save_table_type`** that saves/updates table type definitions in SAP systems. Similar to `adt_save_domain` and `adt_save_data_element`, it automatically handles locking, saving, and unlocking.

---

## Tool: `adt_save_table_type`

### Purpose
- Save/Update table type definitions with complete XML structure
- Modify row type, access type, and key definitions
- Update range table types
- Automatic lock → save → unlock workflow

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `table_type_xml` | string | ✅ Yes | Complete table type XML structure |
| `transport_request` | string | ❌ No | Transport request number (uses object's transport if not provided) |

---

## XML Structure

### Complete Table Type XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ttyp:tableType xmlns:ttyp="http://www.sap.com/dictionary/tabletype" 
                xmlns:adtcore="http://www.sap.com/adt/core" 
                xmlns:atom="http://www.w3.org/2005/Atom" 
                adtcore:name="/COREVIST/_RT_VKORG" 
                adtcore:type="TTYP/DA" 
                adtcore:description="Range table of sales org"
                adtcore:language="EN" 
                adtcore:abapLanguageVersion="cloudDevelopment">
  
  <!-- Row Type Definition -->
  <ttyp:rowType>
    <ttyp:typeKind>rangeTypeOnDataelement</ttyp:typeKind>
    <ttyp:typeName>VKORG</ttyp:typeName>
    <ttyp:builtInType>
      <ttyp:dataType>CHAR</ttyp:dataType>
      <ttyp:length>4</ttyp:length>
      <ttyp:decimals>0</ttyp:decimals>
    </ttyp:builtInType>
    <ttyp:rangeType>/COREVIST/_RS_VKORG</ttyp:rangeType>
  </ttyp:rowType>
  
  <!-- Table Configuration -->
  <ttyp:initialRowCount>0</ttyp:initialRowCount>
  <ttyp:accessType>standard</ttyp:accessType>
  
  <!-- Primary Key -->
  <ttyp:primaryKey ttyp:isVisible="true" ttyp:isEditable="true">
    <ttyp:definition>standard</ttyp:definition>
    <ttyp:kind>nonUnique</ttyp:kind>
    <ttyp:components ttyp:isVisible="false"/>
    <ttyp:alias/>
  </ttyp:primaryKey>
  
  <!-- Secondary Keys -->
  <ttyp:secondaryKeys ttyp:isVisible="true" ttyp:isEditable="true">
    <ttyp:allowed>notSpecified</ttyp:allowed>
  </ttyp:secondaryKeys>
  
</ttyp:tableType>
```

---

## Key Fields

### Row Type (`<ttyp:rowType>`)

| Field | Description | Values |
|-------|-------------|--------|
| `typeKind` | Type of row | `dictionaryType`, `predefinedAbapType`, `refToPredefinedAbapType`, `refToDictionaryType`, `refToClassOrInterfaceType`, `rangeTypeOnPredefinedType`, `rangeTypeOnDataelement` |
| `typeName` | Name of the type | Data element name, structure name, etc. |
| `rangeType` | Range type structure | For range tables only |

### Access Type (`<ttyp:accessType>`)

| Value | Description |
|-------|-------------|
| `standard` | Standard table (unordered, allows duplicates) |
| `sorted` | Sorted table (ordered, can have unique/non-unique key) |
| `hashed` | Hashed table (unique key required) |
| `index` | Index table |
| `notSpecified` | Not specified |

### Primary Key (`<ttyp:primaryKey>`)

| Field | Values | Description |
|-------|--------|-------------|
| `definition` | `standard`, `rowType`, `keyComponents`, `empty`, `notSpecified` | How the key is defined |
| `kind` | `unique`, `nonUnique`, `notSpecified` | Whether key is unique |

---

## Usage Examples

### Example 1: Update Range Table Type

```javascript
// Read existing table type
const source = await adt_read_source({
  object_name: "/COREVIST/_RT_VKORG",
  object_type: "TTYP"
});

// Modify the XML (e.g., change description)
const modifiedXml = source.source.replace(
  'adtcore:description="Range table of sales org"',
  'adtcore:description="Range table of sales organization"'
);

// Save the table type
const result = await adt_save_table_type({
  table_type_xml: modifiedXml,
  transport_request: "H01K900048"
});

// Activate
await adt_activate({
  objects: [{ name: "/COREVIST/_RT_VKORG", type: "TTYP" }]
});
```

### Example 2: Change Access Type

```javascript
// Read table type
const source = await adt_read_source({
  object_name: "/COREVIST/_TT_CUSTOMER",
  object_type: "TTYP"
});

// Change from standard to sorted
const modifiedXml = source.source.replace(
  '<ttyp:accessType>standard</ttyp:accessType>',
  '<ttyp:accessType>sorted</ttyp:accessType>'
);

// Also update primary key to unique for sorted table
const finalXml = modifiedXml.replace(
  '<ttyp:kind>nonUnique</ttyp:kind>',
  '<ttyp:kind>unique</ttyp:kind>'
);

// Save
await adt_save_table_type({
  table_type_xml: finalXml
});
```

### Example 3: Update Row Type

```javascript
// Read table type
const source = await adt_read_source({
  object_name: "/COREVIST/_TT_MATERIALS",
  object_type: "TTYP"
});

// Change row type from one data element to another
const modifiedXml = source.source.replace(
  '<ttyp:typeName>MATNR</ttyp:typeName>',
  '<ttyp:typeName>MATERIAL</ttyp:typeName>'
);

// Save
await adt_save_table_type({
  table_type_xml: modifiedXml,
  transport_request: "H01K900048"
});
```

---

## Workflow

### Automatic Workflow
```
1. Extract table type name from XML
2. Lock table type (TTYP)
3. Save table type with PUT request
4. Unlock table type
5. Return success/error
```

### On Error
- Automatically unlocks the table type
- Returns detailed error information
- Provides hints for common issues

---

## API Details

### Endpoint
```
PUT /sap/bc/adt/ddic/tabletypes/{name}?lockHandle={handle}&corrNr={transport}
```

### Request Headers
```
X-CSRF-Token: {token}
Accept: application/vnd.sap.adt.tabletype.v1+xml
Content-Type: application/vnd.sap.adt.tabletype.v1+xml; charset=utf-8
```

### URL Encoding
- Table type name is URL-encoded (important for namespaced types like `/COREVIST/_RT_VKORG`)
- Uses `encodeURIComponent()` and lowercase conversion

---

## Common Table Type Structures

### 1. Range Table on Data Element
```xml
<ttyp:rowType>
  <ttyp:typeKind>rangeTypeOnDataelement</ttyp:typeKind>
  <ttyp:typeName>VKORG</ttyp:typeName>
  <ttyp:builtInType>
    <ttyp:dataType>CHAR</ttyp:dataType>
    <ttyp:length>4</ttyp:length>
    <ttyp:decimals>0</ttyp:decimals>
  </ttyp:builtInType>
  <ttyp:rangeType>/COREVIST/_RS_VKORG</ttyp:rangeType>
</ttyp:rowType>
```

### 2. Standard Table of Dictionary Type
```xml
<ttyp:rowType>
  <ttyp:typeKind>dictionaryType</ttyp:typeKind>
  <ttyp:typeName>/COREVIST/_S_CUSTOMER</ttyp:typeName>
</ttyp:rowType>
<ttyp:accessType>standard</ttyp:accessType>
```

### 3. Sorted Table with Unique Key
```xml
<ttyp:accessType>sorted</ttyp:accessType>
<ttyp:primaryKey>
  <ttyp:definition>keyComponents</ttyp:definition>
  <ttyp:kind>unique</ttyp:kind>
  <ttyp:components>CUSTOMER_ID</ttyp:components>
</ttyp:primaryKey>
```

### 4. Hashed Table
```xml
<ttyp:accessType>hashed</ttyp:accessType>
<ttyp:primaryKey>
  <ttyp:definition>keyComponents</ttyp:definition>
  <ttyp:kind>unique</ttyp:kind>
  <ttyp:components>MATERIAL_ID</ttyp:components>
</ttyp:primaryKey>
```

---

## Error Handling

### Common Errors

| Error | Reason | Solution |
|-------|--------|----------|
| `ExceptionResourceLocked` | Table type locked by another user | Unlock or wait for lock release |
| `ExceptionResourceNotFound` | Table type doesn't exist | Create table type first |
| `InvalidXMLStructure` | Malformed XML | Check XML syntax and structure |
| `TransportRequestLocked` | Transport is locked | Use different transport or unlock |
| `ReferencedTypeNotFound` | Row type/range type doesn't exist | Create referenced type first |

### Error Response Example
```json
{
  "success": false,
  "error": "ExceptionResourceLocked",
  "httpStatus": 423,
  "details": {
    "message": "Table type is locked by user CB9980000040"
  },
  "hint": "Check table type lock status and XML structure"
}
```

---

## Implementation Details

### Method Signature
```javascript
async saveTableType(tableTypeXml, transportRequest = null)
```

### Files Modified
1. **ADT/server_adt.js**
   - Added `saveTableType()` method (~line 2173)
   - Added `adt_save_table_type` tool registration (~line 4857)
   - Added case handler (~line 6443)

### Tool Registration
```javascript
{
  name: 'adt_save_table_type',
  description: 'Save/Update a Table Type with complete XML structure...',
  inputSchema: {
    type: 'object',
    properties: {
      table_type_xml: {
        type: 'string',
        description: 'Complete table type XML structure...'
      },
      transport_request: {
        type: 'string',
        description: 'Optional: Transport request number...'
      }
    },
    required: ['table_type_xml']
  }
}
```

---

## Benefits

✅ **Automated Workflow** - Automatic lock/unlock handling  
✅ **URL Encoding** - Correct handling of namespaced objects  
✅ **Error Recovery** - Automatic unlock on error  
✅ **Flexible** - Optional transport request parameter  
✅ **Complete** - Supports all table type configurations  
✅ **Safe** - Validates XML and handles errors gracefully  

---

## Next Steps After Saving

1. **Activate the table type:**
```javascript
await adt_activate({
  objects: [{ name: "/COREVIST/_RT_VKORG", type: "TTYP" }]
});
```

2. **Check where used:**
```javascript
await adt_where_used_list({
  object_name: "/COREVIST/_RT_VKORG",
  object_type: "TTYP"
});
```

3. **Read to verify:**
```javascript
await adt_read_source({
  object_name: "/COREVIST/_RT_VKORG",
  object_type: "TTYP"
});
```

---

## Related Tools

- `adt_create_table_type` - Create new table types
- `adt_read_source` - Read table type XML
- `adt_activate` - Activate table types
- `adt_save_domain` - Save domains
- `adt_save_data_element` - Save data elements
- `adt_where_used_list` - Find where table type is used

---

## Status
✅ **IMPLEMENTED AND READY TO TEST**

**Please restart the MCP server** to use the new `adt_save_table_type` tool!



