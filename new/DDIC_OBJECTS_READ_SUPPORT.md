# DDIC Objects Read Support - Data Elements, Domains & Table Types

## Summary
Added support for reading Data Elements (DTEL), Domains (DOMA), and Table Types (TTYP) via ADT REST API. These DDIC objects return XML metadata instead of plain text source code.

## Changes Made

### 1. Updated `adt-service-base.js` - `buildSourceUri()` method
**File:** `ADT/adt-service-base.js`

Added DTEL and DOMA to the list of objects that don't append `/source/main` to their URI:

```javascript
case 'SRVB':
case 'SERVICE_BINDING':
case 'DTEL':
case 'DATA_ELEMENT':
case 'DOMA':
case 'DOMAIN':
case 'TTYP':
case 'TABLE_TYPE':
  return uri; // Service Bindings, Data Elements, Domains, and Table Types don't have /source/main
```

### 2. Updated `server_adt.js` - `readSource()` method
**File:** `ADT/server_adt.js`

Added proper Accept headers and XML handling for DDIC objects:

```javascript
// Determine Accept header based on object type
let acceptHeader = 'text/plain';
const objTypeUpper = objectType.toUpperCase();

if (objTypeUpper === 'DTEL' || objTypeUpper === 'DATA_ELEMENT') {
  acceptHeader = 'application/vnd.sap.adt.dataelements.v2+xml';
} else if (objTypeUpper === 'DOMA' || objTypeUpper === 'DOMAIN') {
  acceptHeader = 'application/vnd.sap.adt.domains.v2+xml';
} else if (objTypeUpper === 'TTYP' || objTypeUpper === 'TABLE_TYPE') {
  acceptHeader = 'application/vnd.sap.adt.tabletype.v1+xml';
}
```

## API Endpoints

### Data Element
- **Endpoint:** `/sap/bc/adt/ddic/dataelements/{name}`
- **Accept Header:** `application/vnd.sap.adt.dataelements.v2+xml`
- **HTTP Method:** GET
- **Response Format:** XML

**Example Response Structure:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<blue:wbobj xmlns:blue="http://www.sap.com/wbobj/dictionary/dtel" 
            xmlns:adtcore="http://www.sap.com/adt/core"
            adtcore:name="/COREVIST/EXPECTED_VALUE"
            adtcore:type="DTEL/DE"
            adtcore:description="Expected value">
  <dtel:dataElement xmlns:dtel="http://www.sap.com/adt/dictionary/dataelements">
    <dtel:typeKind>domain</dtel:typeKind>
    <dtel:typeName>TEXT70</dtel:typeName>
    <dtel:dataType>CHAR</dtel:dataType>
    <dtel:dataTypeLength>000070</dtel:dataTypeLength>
    <dtel:dataTypeDecimals>000000</dtel:dataTypeDecimals>
    <dtel:shortFieldLabel>Exp.value</dtel:shortFieldLabel>
    <dtel:mediumFieldLabel>Expected value</dtel:mediumFieldLabel>
    <dtel:longFieldLabel>Expected value</dtel:longFieldLabel>
    <dtel:headingFieldLabel>Expected value</dtel:headingFieldLabel>
  </dtel:dataElement>
</blue:wbobj>
```

### Domain
- **Endpoint:** `/sap/bc/adt/ddic/domains/{name}`
- **Accept Header:** `application/vnd.sap.adt.domains.v2+xml`
- **HTTP Method:** GET
- **Response Format:** XML

**Example Response Structure:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<doma:domain xmlns:doma="http://www.sap.com/dictionary/domain"
             xmlns:adtcore="http://www.sap.com/adt/core"
             adtcore:name="/COREVIST/GROUP"
             adtcore:type="DOMA/DD"
             adtcore:description="Settings group">
  <doma:content>
    <doma:typeInformation>
      <doma:datatype>CHAR</doma:datatype>
      <doma:length>000040</doma:length>
      <doma:decimals>000000</doma:decimals>
    </doma:typeInformation>
    <doma:outputInformation>
      <doma:length>000040</doma:length>
      <doma:style>00</doma:style>
      <doma:lowercase>false</doma:lowercase>
    </doma:outputInformation>
    <doma:valueInformation>
      <doma:fixValues/>
    </doma:valueInformation>
  </doma:content>
</doma:domain>
```

### Table Type
- **Endpoint:** `/sap/bc/adt/ddic/tabletypes/{name}`
- **Accept Header:** `application/vnd.sap.adt.tabletype.v1+xml`
- **HTTP Method:** GET
- **Response Format:** XML

**Example Response Structure:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<ttyp:tableType xmlns:ttyp="http://www.sap.com/dictionary/tabletype"
                xmlns:adtcore="http://www.sap.com/adt/core"
                adtcore:name="/COREVIST/RT_SPART"
                adtcore:type="TTYP/DA"
                adtcore:description="Range table of division">
  <ttyp:rowType>
    <ttyp:typeKind>rangeTypeOnDataelement</ttyp:typeKind>
    <ttyp:typeName>SPART</ttyp:typeName>
    <ttyp:builtInType>
      <ttyp:dataType>CHAR</ttyp:dataType>
      <ttyp:length>000002</ttyp:length>
      <ttyp:decimals>000000</ttyp:decimals>
    </ttyp:builtInType>
    <ttyp:rangeType>/COREVIST/RS_SPART</ttyp:rangeType>
  </ttyp:rowType>
  <ttyp:accessType>standard</ttyp:accessType>
  <ttyp:primaryKey>
    <ttyp:definition>standard</ttyp:definition>
    <ttyp:kind>nonUnique</ttyp:kind>
  </ttyp:primaryKey>
</ttyp:tableType>
```

## Usage

### MCP Tool Call
```javascript
// Read Data Element
mcp_abap-adt_adt_read_source("/COREVIST/EXPECTED_VALUE", "DTEL")

// Read Domain
mcp_abap-adt_adt_read_source("/COREVIST/GROUP", "DOMA")

// Read Table Type
mcp_abap-adt_adt_read_source("/COREVIST/OBJECT_TABLE", "TTYP")
```

### Response Format
The response includes a flag `isDdicMetadata: true` to indicate that the source is XML metadata rather than ABAP source code:

```javascript
{
  success: true,
  source: "<?xml version=\"1.0\"...", // XML content
  objectName: "/COREVIST/EXPECTED_VALUE",
  objectType: "DTEL",
  isDdicMetadata: true
}
```

## Testing

### Syntax Check
```bash
cd ADT
node --check adt-service-base.js
node --check server_adt.js
```

Both files pass syntax validation ✅

### Manual Test
After restarting the MCP server:
```javascript
mcp_abap-adt_adt_read_source("/COREVIST/BUSINESS_OBJECT", "DTEL")
```

Should return XML metadata with data element definition.

## Notes

1. **XML Format:** Data Elements and Domains return structured XML metadata, not ABAP source code
2. **Both Systems:** This works in both BTP and On-Premise systems
3. **Object Types:** Supports both short (`DTEL`, `DOMA`) and long (`DATA_ELEMENT`, `DOMAIN`) type names
4. **Future Enhancement:** Could add XML parsing to present data in a more readable format

## Related Files
- `ADT/adt-service-base.js` - Base service with URI building logic
- `ADT/server_adt.js` - Main server with readSource implementation
- `ADT/adt-utils.js` - Error parsing utilities (unchanged)

## Date
January 15, 2025

## Tested Systems
- ✅ BTP (Cloud ABAP)
- ⏳ DEV (On-Premise) - Pending test


