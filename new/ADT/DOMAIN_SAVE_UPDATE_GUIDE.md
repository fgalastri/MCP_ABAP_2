# Domain Save/Update Feature - Complete Guide

## Date: December 29, 2025

## Overview
Added comprehensive domain save/update functionality that allows saving complete domain definitions including data types, lengths, decimals, and **fixed values** via XML structure. The tool automatically handles the lock → save → unlock workflow, making it as simple as saving a class!

---

## New MCP Tool: `adt_save_domain`

### Purpose
Save or update a domain with complete XML structure including:
- Type information (data type, length, decimals)
- Output information (formatting, conversion exits)
- **Value information (fixed values with low/high ranges and descriptions)**

**Key Feature:** Automatically handles lock → save → unlock workflow internally!

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain_xml` | string | ✅ Yes | Complete domain XML structure |
| `transport_request` | string | ❌ No | Optional transport request number |

### Usage Example - Simple!

```javascript
// 1. Build complete domain XML with your changes
const domainXml = `<?xml version="1.0" encoding="UTF-8"?>
<doma:domain xmlns:doma="http://www.sap.com/dictionary/domain" 
             xmlns:adtcore="http://www.sap.com/adt/core"
             adtcore:name="/COREVIST/_CLASSNAME"
             adtcore:type="DOMA/DD"
             adtcore:description="Class name"
             adtcore:language="EN">
  <adtcore:packageRef adtcore:name="/COREVIST/BTP_HC"/>
  <doma:content>
    <doma:typeInformation>
      <doma:datatype>CHAR</doma:datatype>
      <doma:length>40</doma:length>
      <doma:decimals>0</doma:decimals>
    </doma:typeInformation>
    <doma:outputInformation>
      <doma:length>0</doma:length>
      <doma:style/>
      <doma:conversionExit/>
      <doma:signExists>false</doma:signExists>
      <doma:lowercase>false</doma:lowercase>
      <doma:ampmFormat>false</doma:ampmFormat>
    </doma:outputInformation>
    <doma:valueInformation>
      <doma:valueTableRef adtcore:name=""/>
      <doma:appendExists>false</doma:appendExists>
      <doma:fixValues>
        <doma:fixValue>
          <doma:low>1</doma:low>
          <doma:text>Test Value</doma:text>
        </doma:fixValue>
        <doma:fixValue>
          <doma:low>2</doma:low>
          <doma:text>Another Value</doma:text>
        </doma:fixValue>
      </doma:fixValues>
    </doma:valueInformation>
  </doma:content>
</doma:domain>`;

// 2. Save (lock → save → unlock happens automatically!)
await adt_save_domain({
  domain_xml: domainXml,
  transport_request: "H01K900111" // optional
});

// 3. Activate the domain
await adt_activate({
  objects: [{ name: "/COREVIST/_CLASSNAME", type: "DOMA" }]
});

// That's it! ✅
```

---

## XML Structure Details

### Complete Domain XML Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<doma:domain xmlns:doma="http://www.sap.com/dictionary/domain" 
             xmlns:adtcore="http://www.sap.com/adt/core"
             adtcore:name="{DOMAIN_NAME}"
             adtcore:type="DOMA/DD"
             adtcore:description="{DESCRIPTION}"
             adtcore:language="EN"
             adtcore:version="new"
             adtcore:abapLanguageVersion="cloudDevelopment"
             adtcore:masterLanguage="EN"
             adtcore:masterSystem="H01"
             adtcore:responsible="{USER}">
  
  <!-- Package Reference -->
  <adtcore:packageRef adtcore:name="{PACKAGE}"/>
  
  <!-- Domain Content -->
  <doma:content>
    
    <!-- Type Information -->
    <doma:typeInformation>
      <doma:datatype>CHAR|NUMC|INT4|DEC|etc</doma:datatype>
      <doma:length>000030</doma:length>
      <doma:decimals>000000</doma:decimals>
    </doma:typeInformation>
    
    <!-- Output Information -->
    <doma:outputInformation>
      <doma:length>000000</doma:length>
      <doma:style>00</doma:style>
      <doma:conversionExit/> <!-- e.g., ALPHA for leading zeros -->
      <doma:signExists>false</doma:signExists>
      <doma:lowercase>false</doma:lowercase>
      <doma:ampmFormat>false</doma:ampmFormat>
    </doma:outputInformation>
    
    <!-- Value Information -->
    <doma:valueInformation>
      <doma:valueTableRef adtcore:name=""/> <!-- Optional value table -->
      <doma:appendExists>false</doma:appendExists>
      
      <!-- Fixed Values -->
      <doma:fixValues>
        <doma:fixValue>
          <doma:position>0001</doma:position> <!-- Auto-assigned by system -->
          <doma:low>VALUE1</doma:low>
          <doma:high/> <!-- For ranges -->
          <doma:text>Description for VALUE1</doma:text>
        </doma:fixValue>
        <doma:fixValue>
          <doma:position>0002</doma:position>
          <doma:low>VALUE2</doma:low>
          <doma:high/>
          <doma:text>Description for VALUE2</doma:text>
        </doma:fixValue>
      </doma:fixValues>
    </doma:valueInformation>
    
  </doma:content>
</doma:domain>
```

---

## Common Data Types

| Data Type | Description | Example Length |
|-----------|-------------|----------------|
| `CHAR` | Character string | 30, 40, 255 |
| `NUMC` | Numeric text | 10, 20 |
| `INT4` | 4-byte integer | - |
| `INT8` | 8-byte integer | - |
| `DEC` | Packed number | 15,2 (length,decimals) |
| `CURR` | Currency field | 13,2 |
| `QUAN` | Quantity field | 13,3 |
| `DATS` | Date (YYYYMMDD) | 8 |
| `TIMS` | Time (HHMMSS) | 6 |
| `STRING` | Dynamic string | 0 |

---

## Fixed Values Examples

### Simple Fixed Values

```xml
<doma:fixValues>
  <doma:fixValue>
    <doma:low>X</doma:low>
    <doma:text>Yes</doma:text>
  </doma:fixValue>
  <doma:fixValue>
    <doma:low></doma:low>
    <doma:text>No</doma:text>
  </doma:fixValue>
</doma:fixValues>
```

### Fixed Values with Ranges

```xml
<doma:fixValues>
  <doma:fixValue>
    <doma:low>A</doma:low>
    <doma:high>C</doma:high>
    <doma:text>Range A to C</doma:text>
  </doma:fixValue>
  <doma:fixValue>
    <doma:low>X</doma:low>
    <doma:high>Z</doma:high>
    <doma:text>Range X to Z</doma:text>
  </doma:fixValue>
</doma:fixValues>
```

### Numeric Fixed Values

```xml
<doma:fixValues>
  <doma:fixValue>
    <doma:low>1</doma:low>
    <doma:text>Option 1</doma:text>
  </doma:fixValue>
  <doma:fixValue>
    <doma:low>2</doma:low>
    <doma:text>Option 2</doma:text>
  </doma:fixValue>
  <doma:fixValue>
    <doma:low>3</doma:low>
    <doma:text>Option 3</doma:text>
  </doma:fixValue>
</doma:fixValues>
```

---

## Workflow Comparison

### ❌ Old Manual Workflow (if you had to lock manually)
```javascript
// Step 1: Lock
const lock = await adt_lock_object({ object_name: "Z_DOMAIN", object_type: "DOMA" });

// Step 2: Build XML
const xml = `...`;

// Step 3: Save with lock handle
await adt_save_domain({ domain_xml: xml, lock_handle: lock.lockHandle });

// Step 4: Unlock
await adt_unlock({ objects: [{ name: "Z_DOMAIN", type: "DOMA" }] });

// Step 5: Activate
await adt_activate({ objects: [{ name: "Z_DOMAIN", type: "DOMA" }] });
```

### ✅ New Automatic Workflow (current implementation)
```javascript
// Step 1: Build XML with your changes
const xml = `...`;

// Step 2: Save (lock → save → unlock happens automatically!)
await adt_save_domain({
  domain_xml: xml,
  transport_request: "H01K900111" // optional
});

// Step 3: Activate
await adt_activate({ objects: [{ name: "Z_DOMAIN", type: "DOMA" }] });

// ✅ Much simpler! No manual lock/unlock needed!
```

---

## API Details

### Endpoint
```
PUT /sap/bc/adt/ddic/domains/{name}?lockHandle={handle}&corrNr={transport}
```

### Request Headers
```
X-CSRF-Token: {token}
Accept: application/vnd.sap.adt.domains.v1+xml, application/vnd.sap.adt.domains.v2+xml
Content-Type: application/vnd.sap.adt.domains.v2+xml; charset=utf-8
```

### Request Body
Complete domain XML structure

### Response
- **Success (200)**: Returns updated domain XML
- **Error (4xx/5xx)**: Returns error details

---

## Common Use Cases

### 1. Add Fixed Values to Existing Domain
```javascript
// Read current domain
const current = await adt_read_source({ 
  object_name: "Z_DOMAIN", 
  object_type: "DOMA" 
});

// Parse XML, add fixed values section
const updatedXml = addFixedValuesToXml(current.source, [
  { low: "A", text: "Active" },
  { low: "I", text: "Inactive" }
]);

// Save and activate (lock/unlock automatic!)
await adt_save_domain({ 
  domain_xml: updatedXml,
  transport_request: "H01K900111" 
});
await adt_activate({ objects: [{ name: "Z_DOMAIN", type: "DOMA" }] });
```

### 2. Change Domain Data Type
```javascript
// Modify type from CHAR(10) to CHAR(30)
const updatedXml = `...
<doma:typeInformation>
  <doma:datatype>CHAR</doma:datatype>
  <doma:length>30</doma:length>  <!-- Changed from 10 -->
  <doma:decimals>0</doma:decimals>
</doma:typeInformation>
...`;

await adt_save_domain({ domain_xml: updatedXml });
await adt_activate({ objects: [{ name: "Z_DOMAIN", type: "DOMA" }] });
```

### 3. Add Conversion Exit
```javascript
// Add ALPHA conversion exit (leading zeros)
const xmlWithConversionExit = `...
<doma:outputInformation>
  <doma:length>0</doma:length>
  <doma:style>00</doma:style>
  <doma:conversionExit>ALPHA</doma:conversionExit>  <!-- Added -->
  <doma:signExists>false</doma:signExists>
  <doma:lowercase>false</doma:lowercase>
  <doma:ampmFormat>false</doma:ampmFormat>
</doma:outputInformation>
...`;

await adt_save_domain({ domain_xml: xmlWithConversionExit });
await adt_activate({ objects: [{ name: "Z_DOMAIN", type: "DOMA" }] });
```

---

## Benefits

### ✅ What You Can Do Now:
1. **Add Fixed Values** - Define dropdown value lists
2. **Change Data Types** - Modify CHAR to NUMC, change lengths
3. **Add Conversion Exits** - ALPHA, MATN1, etc.
4. **Set Value Tables** - Link to check tables
5. **Complete Control** - Full XML manipulation
6. **Automatic Locking** - No need to manually lock/unlock!

### 🆚 Comparison with createDomain:
- `adt_create_domain`: Creates new domains with basic data type only
- `adt_save_domain`: Updates existing domains with **complete** definition including fixed values

Both tools work together:
- Use `adt_create_domain` to create the domain initially
- Use `adt_save_domain` to add fixed values and make advanced changes

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Domain locked by another user | Someone else is editing | Wait or contact user |
| 404 Not Found | Domain doesn't exist | Create domain first with `adt_create_domain` |
| 403 Forbidden | No authorization | Check user permissions |
| Invalid XML | Malformed XML structure | Validate XML syntax |
| Transport locked | Transport is already released | Use different transport |

### Automatic Error Recovery

The tool automatically unlocks the domain if an error occurs during save, preventing lock leaks!

---

## Files Modified

1. **server_adt.js**
   - Added `saveDomain()` method with automatic lock/unlock workflow (~line 2011)
   - Added `adt_save_domain` tool registration (~line 4478)
   - Added case handler for `adt_save_domain` (~line 5943)

## Key Implementation Details

### Automatic Workflow
The `saveDomain` method automatically:
1. **Locks** the domain using `lockObject()`
2. **Saves** the XML with the lock handle via PUT request
3. **Unlocks** the domain using `unlockObject()`
4. **Error Recovery**: If save fails, domain is automatically unlocked

### URL Encoding Fix
Domain names (especially namespaced like `/COREVIST/xxx`) are properly URL-encoded using `encodeURIComponent()` to avoid 404 errors.

### Consistent with Existing Tools
Follows the same pattern as `adt_save_source` - both handle locking internally for user convenience.

---

## Testing

### Real Test Case - SUCCESSFUL ✅
```javascript
// Test: Change domain /COREVIST/_CLASSNAME
// - Length: 30 → 40
// - Add fixed value: "2" = "AI Assistant Added This Value"

// Read current domain
const current = await adt_read_source({
  object_name: "/COREVIST/_CLASSNAME",
  object_type: "DOMA"
});
// Before: length=000030, 1 fixed value

// Build updated XML (length 40, 2 fixed values)
const updatedXml = `...`; // (see full XML above)

// Save (automatic lock → save → unlock)
const result = await adt_save_domain({
  domain_xml: updatedXml,
  transport_request: "H01K900111"
});
// Result: ✅ Successfully Saved Domain /COREVIST/_CLASSNAME
// Workflow Completed: Domain locked → saved → unlocked

// Activate
await adt_activate({
  objects: [{ name: "/COREVIST/_CLASSNAME", type: "DOMA" }]
});
// Result: ✅ Successfully Activated 1 Object(s)

// Verify changes
const updated = await adt_read_source({
  object_name: "/COREVIST/_CLASSNAME",
  object_type: "DOMA"
});
// After: length=000040 ✅, 2 fixed values ✅
// - Position 0001: "1" = "test value"
// - Position 0002: "2" = "AI Assistant Added This Value" ✅
```

### Test Results
- ✅ Length changed from 30 to 40
- ✅ Fixed value added successfully
- ✅ Domain activated without errors
- ✅ Changes persisted in SAP system
- ✅ Timestamp updated: 2025-12-29T17:39:53Z

---

## Status
✅ **IMPLEMENTED AND READY TO USE**

The `adt_save_domain` tool is now available for updating domains with complete XML structures including fixed values!

---

## Related Documentation
- Domain Creation: Use `adt_create_domain` for initial creation
- Object Locking: Use `adt_lock_object` before saving
- Object Activation: Use `adt_activate` after saving
- Reading Domains: Use `adt_read_source` to get current XML

