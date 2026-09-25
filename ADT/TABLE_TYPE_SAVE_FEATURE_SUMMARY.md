# Save Table Type Tool - Quick Reference

## Date: December 30, 2025

## 🎯 Summary

New MCP tool **`adt_save_table_type`** for saving/updating table type definitions in SAP systems. Handles locking, saving, and unlocking automatically.

---

## 🚀 Quick Start

### Basic Usage
```javascript
// Read existing table type
const source = await adt_read_source({
  object_name: "/COREVIST/_RT_VKORG",
  object_type: "TTYP"
});

// Modify the XML
const modifiedXml = source.source.replace(
  'old description',
  'new description'
);

// Save table type
await adt_save_table_type({
  table_type_xml: modifiedXml,
  transport_request: "H01K900048" // Optional
});

// Activate
await adt_activate({
  objects: [{ name: "/COREVIST/_RT_VKORG", type: "TTYP" }]
});
```

---

## 📋 Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `table_type_xml` | ✅ Yes | Complete table type XML structure |
| `transport_request` | ❌ No | Transport request (uses object's transport if not provided) |

---

## 🔧 Table Type Components

### Access Types
- `standard` - Standard table (unordered)
- `sorted` - Sorted table (ordered)
- `hashed` - Hashed table (unique key required)

### Row Type Kinds
- `dictionaryType` - Structure or table type
- `rangeTypeOnDataelement` - Range table on data element
- `rangeTypeOnPredefinedType` - Range table on ABAP type
- `refToDictionaryType` - Reference to dictionary type

### Primary Key
- `definition`: `standard`, `rowType`, `keyComponents`, `empty`
- `kind`: `unique`, `nonUnique`

---

## 💡 Common Use Cases

### 1. Change Description
```javascript
const modified = xml.replace(
  'adtcore:description="Old desc"',
  'adtcore:description="New desc"'
);
```

### 2. Change Access Type
```javascript
const modified = xml.replace(
  '<ttyp:accessType>standard</ttyp:accessType>',
  '<ttyp:accessType>sorted</ttyp:accessType>'
);
```

### 3. Update Row Type
```javascript
const modified = xml.replace(
  '<ttyp:typeName>OLD_TYPE</ttyp:typeName>',
  '<ttyp:typeName>NEW_TYPE</ttyp:typeName>'
);
```

### 4. Make Key Unique
```javascript
const modified = xml.replace(
  '<ttyp:kind>nonUnique</ttyp:kind>',
  '<ttyp:kind>unique</ttyp:kind>'
);
```

---

## ✅ Workflow

```
1. Extract table type name from XML
   ↓
2. Lock table type (TTYP)
   ↓
3. Save with PUT request
   ↓
4. Unlock table type
   ↓
5. Return success/error
```

**On Error:** Automatically unlocks the table type

---

## 🔍 API Details

**Endpoint:**
```
PUT /sap/bc/adt/ddic/tabletypes/{name}?lockHandle={handle}&corrNr={transport}
```

**Headers:**
```
Accept: application/vnd.sap.adt.tabletype.v1+xml
Content-Type: application/vnd.sap.adt.tabletype.v1+xml
```

---

## ❌ Common Errors

| Error | Reason | Solution |
|-------|--------|----------|
| `ExceptionResourceLocked` | Locked by another user | Unlock or wait |
| `ExceptionResourceNotFound` | Table type doesn't exist | Create first |
| `InvalidXMLStructure` | Malformed XML | Check syntax |
| `ReferencedTypeNotFound` | Row/range type missing | Create referenced type |

---

## 📊 Example XML Structure

```xml
<ttyp:tableType adtcore:name="/COREVIST/_RT_VKORG" 
                adtcore:description="Range table of sales org">
  
  <ttyp:rowType>
    <ttyp:typeKind>rangeTypeOnDataelement</ttyp:typeKind>
    <ttyp:typeName>VKORG</ttyp:typeName>
    <ttyp:rangeType>/COREVIST/_RS_VKORG</ttyp:rangeType>
  </ttyp:rowType>
  
  <ttyp:accessType>standard</ttyp:accessType>
  
  <ttyp:primaryKey>
    <ttyp:definition>standard</ttyp:definition>
    <ttyp:kind>nonUnique</ttyp:kind>
  </ttyp:primaryKey>
  
</ttyp:tableType>
```

---

## 🎁 Benefits

✅ **Automatic Lock/Unlock** - No manual lock management  
✅ **URL Encoding** - Handles namespaced objects correctly  
✅ **Error Recovery** - Unlocks on error  
✅ **Flexible** - Optional transport parameter  
✅ **Complete** - All table type configurations supported  

---

## 🔗 Related Tools

- `adt_create_table_type` - Create new table types
- `adt_read_source` - Read table type XML
- `adt_activate` - Activate changes
- `adt_save_domain` - Save domains
- `adt_save_data_element` - Save data elements

---

## 📂 Files Modified

1. **ADT/server_adt.js**
   - Added `saveTableType()` method
   - Added tool registration
   - Added case handler

2. **ADT/TABLE_TYPE_SAVE_GUIDE.md**
   - Comprehensive documentation

3. **ADT/TABLE_TYPE_SAVE_FEATURE_SUMMARY.md**
   - This quick reference

---

## ✅ Status

**IMPLEMENTED - READY TO TEST**

**Next Step:** Restart the MCP server to use the new tool!

---

## 🎉 Quick Test

```javascript
// 1. Read existing table type
const source = await adt_read_source({
  object_name: "/COREVIST/_RT_VKORG",
  object_type: "TTYP"
});

// 2. Save (even without changes, to test workflow)
const result = await adt_save_table_type({
  table_type_xml: source.source
});

// 3. Check result
console.log(result.success ? "✅ Success!" : "❌ Failed");

// 4. Activate if successful
if (result.success) {
  await adt_activate({
    objects: [{ name: "/COREVIST/_RT_VKORG", type: "TTYP" }]
  });
}
```

---

**The `adt_save_table_type` tool is ready to use!** 🚀



