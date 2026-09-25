# Data Element Save/Update Feature - Complete Guide

## Date: December 29, 2025

## Overview
Added comprehensive data element save/update functionality and fixed URL encoding bug for creating data elements with domain references. The tool automatically handles the lock → save → unlock workflow, making it as simple as saving a class!

---

## What Was Fixed & Added

### 1. ✅ **URL Encoding Bug Fix in `createDataElement`**
   - **Issue:** Namespaced data elements (like `/COREVIST/_VAR`) failed with 404 when creating with domain references
   - **Cause:** URL wasn't properly encoded: `/sap/bc/adt/ddic/dataelements//corevist/_var` (double slash)
   - **Fix:** Added `encodeURIComponent()` to properly encode: `/sap/bc/adt/ddic/dataelements/%2fcorevist%2f_var`
   - **Impact:** Now works for all data element names, including namespaced ones

### 2. ✅ **New Tool: `adt_save_data_element`**
   - Save or update existing data elements with complete XML structure
   - Automatic lock → save → unlock workflow
   - Update domain references, field labels, and all properties

---

## New MCP Tool: `adt_save_data_element`

### Purpose
Save or update a data element with complete XML structure including:
- Domain reference (typeKind/typeName)
- All field labels (short, medium, long, heading)
- Data type information
- Search help parameters
- All other data element properties

**Key Feature:** Automatically handles lock → save → unlock workflow internally!

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `data_element_xml` | string | ✅ Yes | Complete data element XML structure |
| `transport_request` | string | ❌ No | Optional transport request number |

### Usage Example - Simple!

```javascript
// 1. Build your data element XML with changes
const dataElementXml = `<?xml version="1.0" encoding="UTF-8"?>
<blue:wbobj xmlns:blue="http://www.sap.com/wbobj/dictionary/dtel" 
            xmlns:adtcore="http://www.sap.com/adt/core"
            xmlns:dtel="http://www.sap.com/adt/dictionary/dataelements"
            adtcore:name="/COREVIST/_VAR"
            adtcore:type="DTEL/DE"
            adtcore:description="Setting variable"
            adtcore:language="EN">
  <adtcore:packageRef adtcore:name="/COREVIST/BTP_HC"/>
  <dtel:dataElement>
    <dtel:typeKind>domain</dtel:typeKind>
    <dtel:typeName>/COREVIST/_VAR</dtel:typeName>
    <dtel:dataType>CHAR</dtel:dataType>
    <dtel:dataTypeLength>30</dtel:dataTypeLength>
    <dtel:dataTypeDecimals>0</dtel:dataTypeDecimals>
    <dtel:shortFieldLabel>Var</dtel:shortFieldLabel>
    <dtel:shortFieldLength>10</dtel:shortFieldLength>
    <dtel:shortFieldMaxLength>10</dtel:shortFieldMaxLength>
    <dtel:mediumFieldLabel>Variable</dtel:mediumFieldLabel>
    <dtel:mediumFieldLength>20</dtel:mediumFieldLength>
    <dtel:mediumFieldMaxLength>20</dtel:mediumFieldMaxLength>
    <dtel:longFieldLabel>Setting variable</dtel:longFieldLabel>
    <dtel:longFieldLength>40</dtel:longFieldLength>
    <dtel:longFieldMaxLength>40</dtel:longFieldMaxLength>
    <dtel:headingFieldLabel>Setting variable</dtel:headingFieldLabel>
    <dtel:headingFieldLength>55</dtel:headingFieldLength>
    <dtel:headingFieldMaxLength>55</dtel:headingFieldMaxLength>
    <dtel:searchHelp/>
    <dtel:searchHelpParameter/>
    <dtel:setGetParameter/>
    <dtel:defaultComponentName/>
    <dtel:deactivateInputHistory>false</dtel:deactivateInputHistory>
    <dtel:changeDocument>false</dtel:changeDocument>
    <dtel:leftToRightDirection>false</dtel:leftToRightDirection>
    <dtel:deactivateBIDIFiltering>false</dtel:deactivateBIDIFiltering>
  </dtel:dataElement>
</blue:wbobj>`;

// 2. Save (lock → save → unlock happens automatically!)
await adt_save_data_element({
  data_element_xml: dataElementXml,
  transport_request: "H01K900111" // optional
});

// 3. Activate
await adt_activate({
  objects: [{ name: "/COREVIST/_VAR", type: "DTEL" }]
});

// That's it! ✅
```

---

## Complete XML Structure

### Data Element XML Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<blue:wbobj xmlns:blue="http://www.sap.com/wbobj/dictionary/dtel" 
            xmlns:adtcore="http://www.sap.com/adt/core"
            xmlns:atom="http://www.w3.org/2005/Atom"
            xmlns:dtel="http://www.sap.com/adt/dictionary/dataelements"
            adtcore:name="{DATA_ELEMENT_NAME}"
            adtcore:type="DTEL/DE"
            adtcore:description="{DESCRIPTION}"
            adtcore:language="EN"
            adtcore:version="new"
            adtcore:abapLanguageVersion="cloudDevelopment"
            adtcore:masterLanguage="EN"
            adtcore:masterSystem="H01"
            adtcore:responsible="{USER}">
  
  <!-- Package Reference -->
  <adtcore:packageRef adtcore:name="{PACKAGE}"/>
  
  <!-- Data Element Content -->
  <dtel:dataElement>
    
    <!-- Domain Reference -->
    <dtel:typeKind>domain</dtel:typeKind>
    <dtel:typeName>{DOMAIN_NAME}</dtel:typeName>
    
    <!-- Data Type Information (inherited from domain) -->
    <dtel:dataType>CHAR</dtel:dataType>
    <dtel:dataTypeLength>30</dtel:dataTypeLength>
    <dtel:dataTypeDecimals>0</dtel:dataTypeDecimals>
    
    <!-- Short Field Label (max 10 chars) -->
    <dtel:shortFieldLabel>Short</dtel:shortFieldLabel>
    <dtel:shortFieldLength>10</dtel:shortFieldLength>
    <dtel:shortFieldMaxLength>10</dtel:shortFieldMaxLength>
    
    <!-- Medium Field Label (max 20 chars) -->
    <dtel:mediumFieldLabel>Medium Label</dtel:mediumFieldLabel>
    <dtel:mediumFieldLength>20</dtel:mediumFieldLength>
    <dtel:mediumFieldMaxLength>20</dtel:mediumFieldMaxLength>
    
    <!-- Long Field Label (max 40 chars) -->
    <dtel:longFieldLabel>Long Field Label</dtel:longFieldLabel>
    <dtel:longFieldLength>40</dtel:longFieldLength>
    <dtel:longFieldMaxLength>40</dtel:longFieldMaxLength>
    
    <!-- Heading Field Label (max 55 chars) -->
    <dtel:headingFieldLabel>Heading Field Label</dtel:headingFieldLabel>
    <dtel:headingFieldLength>55</dtel:headingFieldLength>
    <dtel:headingFieldMaxLength>55</dtel:headingFieldMaxLength>
    
    <!-- Optional: Search Help -->
    <dtel:searchHelp/>
    <dtel:searchHelpParameter/>
    
    <!-- Optional: Set/Get Parameter -->
    <dtel:setGetParameter/>
    
    <!-- Optional: Default Component Name -->
    <dtel:defaultComponentName/>
    
    <!-- Flags -->
    <dtel:deactivateInputHistory>false</dtel:deactivateInputHistory>
    <dtel:changeDocument>false</dtel:changeDocument>
    <dtel:leftToRightDirection>false</dtel:leftToRightDirection>
    <dtel:deactivateBIDIFiltering>false</dtel:deactivateBIDIFiltering>
    
  </dtel:dataElement>
</blue:wbobj>
```

---

## Field Label Length Guidelines

| Label Type | Maximum Length | Usage |
|------------|----------------|-------|
| **Short** | 10 characters | Tight UI spaces, list columns |
| **Medium** | 20 characters | Standard UI fields |
| **Long** | 40 characters | Detailed forms, F1 help |
| **Heading** | 55 characters | Column headers, reports |

### Example Labels for "Customer Number":

```xml
<dtel:shortFieldLabel>Cust. No.</dtel:shortFieldLabel>        <!-- 10 chars -->
<dtel:mediumFieldLabel>Customer Number</dtel:mediumFieldLabel>  <!-- 20 chars -->
<dtel:longFieldLabel>Customer Number</dtel:longFieldLabel>      <!-- 40 chars -->
<dtel:headingFieldLabel>Customer Number</dtel:headingFieldLabel> <!-- 55 chars -->
```

---

## Common Use Cases

### 1. Change Domain Reference

```javascript
// Read current data element
const current = await adt_read_source({ 
  object_name: "ZMATERIAL_ID", 
  object_type: "DTEL" 
});

// Parse XML, change domain reference
const updatedXml = changeTypeName(current.source, "MATNR"); // Change to MATNR domain

// Save and activate
await adt_save_data_element({ data_element_xml: updatedXml });
await adt_activate({ objects: [{ name: "ZMATERIAL_ID", type: "DTEL" }] });
```

### 2. Update Field Labels

```javascript
const updatedXml = `...
<dtel:shortFieldLabel>Mat. No.</dtel:shortFieldLabel>
<dtel:mediumFieldLabel>Material Number</dtel:mediumFieldLabel>
<dtel:longFieldLabel>Material Number (Legacy ID)</dtel:longFieldLabel>
<dtel:headingFieldLabel>Material Number (Legacy ID)</dtel:headingFieldLabel>
...`;

await adt_save_data_element({ data_element_xml: updatedXml });
await adt_activate({ objects: [{ name: "ZMATERIAL_ID", type: "DTEL" }] });
```

### 3. Add Search Help

```javascript
const xmlWithSearchHelp = `...
<dtel:searchHelp>MAT1</dtel:searchHelp>
<dtel:searchHelpParameter>MATNR</dtel:searchHelpParameter>
...`;

await adt_save_data_element({ data_element_xml: xmlWithSearchHelp });
await adt_activate({ objects: [{ name: "ZMATERIAL_ID", type: "DTEL" }] });
```

---

## Workflow Comparison

### ❌ Old Manual Workflow (if you had to do it manually)
```javascript
// Would need manual lock/unlock (if tool existed)
const lock = await adt_lock_object({ object_name: "Z_DTEL", object_type: "DTEL" });
await adt_save_data_element({ data_element_xml: xml, lock_handle: lock.lockHandle });
await adt_unlock({ objects: [{ name: "Z_DTEL", type: "DTEL" }] });
await adt_activate({ objects: [{ name: "Z_DTEL", type: "DTEL" }] });
```

### ✅ New Automatic Workflow (current implementation)
```javascript
// Lock → save → unlock happens automatically!
await adt_save_data_element({ data_element_xml: xml });
await adt_activate({ objects: [{ name: "Z_DTEL", type: "DTEL" }] });
// ✅ Much simpler!
```

---

## Benefits

### ✅ What You Can Do Now:
1. **Change Domain References** - Switch from one domain to another
2. **Update Field Labels** - Modify all label types programmatically
3. **Add Search Helps** - Link search help programmatically
4. **Mass Updates** - Update multiple data elements in a loop
5. **Automatic Locking** - No need to manually lock/unlock
6. **Create with Domains** - Fixed bug for namespaced objects

### 🆚 Comparison with createDataElement:
- `adt_create_data_element`: Creates new data elements with optional domain reference ✅ (bug fixed!)
- `adt_save_data_element`: Updates existing data elements with complete definition ✅ (new!)

Both tools work together:
- Use `adt_create_data_element` to create the data element initially (now works with domain references!)
- Use `adt_save_data_element` to make changes after creation

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Data element locked by another user | Someone else is editing | Wait or contact user |
| 404 Not Found | Data element doesn't exist | Create data element first with `adt_create_data_element` |
| 403 Forbidden | No authorization | Check user permissions |
| Invalid XML | Malformed XML structure | Validate XML syntax |
| Domain doesn't exist | Referenced domain not found | Create domain first or use existing one |

### Automatic Error Recovery

The tool automatically unlocks the data element if an error occurs during save, preventing lock leaks!

---

## Testing Results

### Test 1: BTP System - Namespaced Data Element ✅

**Test Case:** Update data element `/COREVIST/_VAR` with domain reference

**Before:**
```xml
<dtel:typeKind>domain</dtel:typeKind>
<dtel:typeName/> ❌ EMPTY!
<dtel:shortFieldLabel/> ❌ EMPTY!
```

**After:**
```xml
<dtel:typeKind>domain</dtel:typeKind>
<dtel:typeName>/COREVIST/_VAR</dtel:typeName> ✅
<dtel:shortFieldLabel>Var</dtel:shortFieldLabel> ✅
<dtel:mediumFieldLabel>Variable</dtel:mediumFieldLabel> ✅
<dtel:longFieldLabel>Setting variable</dtel:longFieldLabel> ✅
```

**Result:** ✅ SUCCESS - Domain reference and all labels saved!

---

### Test 2: DEV (NC1) System - Standard Data Element ✅

**Test Case:** Create `ZTESTMCP_DE` with domain `MATNR` in package `$TMP`

**Configuration:**
- Domain: MATNR (SAP standard domain)
- Package: $TMP (local)
- Labels: All configured

**Result:**
```xml
<dtel:typeKind>domain</dtel:typeKind>
<dtel:typeName>MATNR</dtel:typeName> ✅
<dtel:dataType>CHAR</dtel:dataType> ✅
<dtel:dataTypeLength>000040</dtel:dataTypeLength> ✅
<dtel:shortFieldLabel>Material</dtel:shortFieldLabel> ✅
<dtel:mediumFieldLabel>Material Number</dtel:mediumFieldLabel> ✅
```

**Result:** ✅ SUCCESS - Works perfectly on on-premise system!

---

### Cross-System Compatibility ✅

| System | Test Scenario | Result |
|--------|--------------|--------|
| **BTP Cloud** | Namespaced data element (`/COREVIST/_VAR`) | ✅ Works |
| **BTP Cloud** | Domain reference update | ✅ Works |
| **DEV (NC1)** | Standard data element (`ZTESTMCP_DE`) | ✅ Works |
| **DEV (NC1)** | SAP domain reference (`MATNR`) | ✅ Works |

---

## API Details

### Create Endpoint (POST)
```
POST /sap/bc/adt/ddic/dataelements?corrNr={transport}
Content-Type: application/vnd.sap.adt.dataelements.v2+xml
```

### Update Endpoint (PUT)
```
PUT /sap/bc/adt/ddic/dataelements/{encoded_name}?lockHandle={handle}&corrNr={transport}
Content-Type: application/vnd.sap.adt.dataelements.v2+xml
Accept: application/vnd.sap.adt.dataelements.v1+xml, application/vnd.sap.adt.dataelements.v2+xml
```

### Lock Endpoint (POST)
```
POST /sap/bc/adt/ddic/dataelements/{encoded_name}?_action=LOCK&accessMode=MODIFY
```

### Unlock Endpoint (POST)
```
POST /sap/bc/adt/ddic/dataelements/{encoded_name}?_action=UNLOCK&lockHandle={handle}
```

---

## Files Modified

1. **server_adt.js**
   - Fixed URL encoding in `createDataElement()` method (~line 1772)
   - Added `saveDataElement()` method with automatic lock/unlock workflow (~line 2084)
   - Added `adt_save_data_element` tool registration (~line 4607)
   - Added case handler for `adt_save_data_element` (~line 6125)

---

## Key Implementation Details

### URL Encoding Fix
```javascript
// Before (BUG):
const updateUrl = `/sap/bc/adt/ddic/dataelements/${dataElementName.toLowerCase()}?lockHandle=${lockHandle}`;
// Result: /sap/bc/adt/ddic/dataelements//corevist/_var ❌

// After (FIXED):
const encodedDataElementName = encodeURIComponent(dataElementName.toLowerCase());
const updateUrl = `/sap/bc/adt/ddic/dataelements/${encodedDataElementName}?lockHandle=${lockHandle}`;
// Result: /sap/bc/adt/ddic/dataelements/%2fcorevist%2f_var ✅
```

### Automatic Workflow
The `saveDataElement` method automatically:
1. **Locks** the data element using `lockObject()`
2. **Saves** the XML with the lock handle via PUT request
3. **Unlocks** the data element using `unlockObject()`
4. **Error Recovery**: If save fails, data element is automatically unlocked

### Consistent with Existing Tools
Follows the same pattern as `adt_save_domain` and `adt_save_source` - all handle locking internally for user convenience.

---

## Status
✅ **IMPLEMENTED, TESTED, AND READY TO USE**

The `adt_save_data_element` tool and URL encoding fix are now available for:
- Updating data elements with domain references
- Changing field labels
- Adding search helps
- Creating data elements with domains (bug fixed!)

All functionality tested and working on both BTP Cloud and on-premise systems!

---

## Related Tools & Documentation
- `adt_create_data_element` - Create new data elements
- `adt_save_domain` - Save/update domains (see DOMAIN_SAVE_UPDATE_GUIDE.md)
- `adt_read_source` - Read data element XML
- `adt_activate` - Activate data elements

