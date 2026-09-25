# Transport Object Removal Guide

## 🎯 Overview

The `adt_remove_objects_from_transport` tool allows you to remove ABAP objects from transport requests and tasks via the ADT REST API. This is useful for cleaning up transports, removing accidentally added objects, or managing transport contents before release.

**🌐 Availability:** BTP Server (`abap-adt-btp`) only

---

## 📋 Tool Information

### Tool Name
`adt_remove_objects_from_transport`

### Purpose
Remove one or more ABAP objects from a transport request or task.

### API Endpoint
```
PUT /sap/bc/adt/cts/transportrequests/{transport_number}
```

### Authentication Required
✅ Yes - Valid BTP session cookies required

---

## 🔧 Parameters

### Required Parameters

#### `transport_number` (string)
- **Description:** The transport request or task number
- **Format:** Alphanumeric (e.g., `H01K900054`, `S4HK908550`)
- **Example:** `"H01K900054"`

#### `objects` (array)
- **Description:** Array of objects to remove from the transport
- **Minimum Items:** 1
- **Each object contains:**

| Field | Type | Required | Description | Default | Example |
|-------|------|----------|-------------|---------|---------|
| `name` | string | ✅ Yes | Object name | - | `/COREVIST/CLFN_PRODUCT_READER` |
| `type` | string | ✅ Yes | Object type (CLAS, TABL, etc.) | - | `CLAS` |
| `pgmid` | string | ❌ No | Program ID | `R3TR` | `R3TR` |
| `obj_desc` | string | ❌ No | Object description | - | `Product Reader Class` |
| `position` | string | ⚠️ **CRITICAL** | Object position in transport | - | `000003` |

### ⚠️ CRITICAL: Position Attribute

**The `position` attribute is REQUIRED for successful removal!**

- The SAP ADT API will return HTTP 200 OK even without position, but **won't actually remove the object**
- You **must** provide the exact position of the object in the transport
- Position format: 6-digit string with leading zeros (e.g., `000001`, `000003`, `000043`)

**To find the position:**
1. Use Eclipse Transport Organizer to view the transport
2. The position is shown in the object list (usually starting from 000001)
3. Or GET the transport via ADT API: `GET /sap/bc/adt/cts/transportrequests/{transport_number}`
4. Parse the XML to find the `tm:position` attribute for your object

---

## 💡 Usage Examples

### Example 1: Remove Single Class

```json
{
  "transport_number": "H01K900067",
  "objects": [
    {
      "name": "/COREVIST/PRODUCT_READER",
      "type": "CLAS",
      "pgmid": "R3TR",
      "position": "000003"
    }
  ]
}
```

**Note:** The position `000003` means this object is the 3rd item in the transport.

### Example 2: Remove Multiple Objects (Sequential Removal)

```json
{
  "transport_number": "H01K900054",
  "objects": [
    {
      "name": "/COREVIST/CLFN_PRODUCT_READER",
      "type": "CLAS",
      "pgmid": "R3TR",
      "position": "000001"
    }
  ]
}
```

**Important:** When removing multiple objects, remove them **one at a time** starting from the first. After removing position `000001`, the next object in the list automatically becomes the new position `000001`.

**Workflow for multiple removals:**
1. Remove object at position `000001`
2. Get updated transport list
3. Remove next object (now at position `000001`)
4. Repeat until all desired objects are removed

### Example 3: Remove with Position

```json
{
  "transport_number": "H01K900054",
  "objects": [
    {
      "name": "/COREVIST/OPEN_ITEMS_SRV_SCM        0001",
      "type": "GCPM",
      "pgmid": "R3TR",
      "obj_desc": "SAP Gateway OData Client Proxy - Proxy Model",
      "position": "000043"
    }
  ]
}
```

---

## ✅ Success Response

### All Objects Removed Successfully

```
✅ Successfully Removed 1 Object(s) from Transport H01K900054

Removed Objects:
- ✅ /COREVIST/CLFN_PRODUCT_READER (Status: 200)

🎉 All objects have been removed from the transport successfully!
```

### Partial Success

```
⚠️ Removal Completed with Issues

Transport: H01K900054
Results:
- ✅ Successfully removed: 2 object(s)
- ❌ Errors: 1 object(s)

Detailed Results:
✅ /COREVIST/CLFN_PRODUCT_READER - Removed successfully (Status: 200)
✅ ZTBL_MY_TABLE - Removed successfully (Status: 200)
❌ ZIF_MY_INTERFACE - Object not found in transport

Objects with Errors:
- ZIF_MY_INTERFACE: Object not found in transport (HTTP 404)
```

---

## ❌ Error Scenarios

### Error 1: Object Not in Transport

**Error Message:**
```
❌ Failed to Remove Objects from Transport H01K900054
Error: Object not found in transport
```

**Causes:**
- Object doesn't exist in the specified transport
- Wrong object name or type
- Object already removed

**Solution:**
- Verify the object is actually in the transport
- Check object name spelling (case-sensitive)
- Verify correct transport number

---

### Error 2: No Authorization

**Error Message:**
```
❌ Failed to Remove Objects from Transport H01K900054
Error: You do not have authorization to modify this transport
```

**Causes:**
- User doesn't own the transport
- Missing authorization to modify transports
- Transport is locked or released

**Solution:**
- Verify you have authority object `S_CTS_ADMI`
- Check if you're the owner of the transport
- Ensure transport is still modifiable (not released)

---

### Error 3: Transport Released

**Error Message:**
```
❌ Failed to Remove Objects from Transport H01K900054
Error: Transport is already released
```

**Causes:**
- Transport has been released and can no longer be modified

**Solution:**
- Use a different, unreleased transport
- Contact basis team if you need to modify a released transport (rare case)

---

### Error 4: Invalid XML Format

**Error Message:**
```
❌ Failed to Remove Objects from Transport H01K900054
Error: Check of condition failed
```

**Causes:**
- Invalid XML structure sent to ADT API
- Missing required attributes
- Empty attribute values where not allowed

**Solution:**
- Ensure all required fields are provided
- Don't pass empty strings for optional fields (use undefined/null instead)
- This is typically a tool bug - report if encountered

---

## 🔍 Common Use Cases

### Use Case 1: Clean Up Accidentally Added Object

**Scenario:** You accidentally added a test class to a production transport

**Solution:**
```json
{
  "transport_number": "H01K900123",
  "objects": [
    {
      "name": "ZCL_TEST_SHOULD_NOT_BE_HERE",
      "type": "CLAS",
      "pgmid": "R3TR"
    }
  ]
}
```

---

### Use Case 2: Remove All Objects Before Reusing Transport

**Scenario:** You want to reuse a transport but need to remove all current objects first

**Solution:** Call the tool multiple times, or use a batch removal:
```json
{
  "transport_number": "H01K900123",
  "objects": [
    { "name": "ZCL_OLD_CLASS_1", "type": "CLAS", "pgmid": "R3TR" },
    { "name": "ZCL_OLD_CLASS_2", "type": "CLAS", "pgmid": "R3TR" },
    { "name": "ZTBL_OLD_TABLE", "type": "TABL", "pgmid": "R3TR" }
  ]
}
```

---

### Use Case 3: Remove Object That Should Be in Different Transport

**Scenario:** Object was added to wrong transport layer

**Solution:**
1. Remove from wrong transport:
```json
{
  "transport_number": "H01K900111",
  "objects": [
    { "name": "ZCL_MY_CLASS", "type": "CLAS", "pgmid": "R3TR" }
  ]
}
```

2. Then add to correct transport using Eclipse or `adt_save_source`

---

## 🛠️ Technical Details

### XML Request Format

The tool generates XML in this format:

```xml
<?xml version="1.0" encoding="ASCII"?>
<tm:root xmlns:tm="http://www.sap.com/cts/adt/tm" 
         tm:number="H01K900067" 
         tm:useraction="removeobject">
  <tm:request>
    <tm:abap_object tm:name="/COREVIST/PRODUCT_READER" 
                    tm:pgmid="R3TR" 
                    tm:type="CLAS"
                    tm:position="000003"/>
  </tm:request>
</tm:root>
```

**Critical Notes:**
- ⚠️ **The `tm:position` attribute is required for actual removal**
- Without position, SAP returns 200 OK but doesn't remove the object
- The `obj_desc` attribute is optional

---

### HTTP Headers

```
PUT /sap/bc/adt/cts/transportrequests/H01K900067
Accept: application/vnd.sap.adt.transportorganizer.v1+xml
Content-Type: text/plain
X-CSRF-Token: {token}
x-sap-security-session: use
sap-client: 100
sap-language: EN
Cookie: {BTP session cookies}
```

**Header Notes:**
- `Content-Type: text/plain` is required (not XML content-type)
- `x-sap-security-session: use` maintains session state
- `sap-client` and `sap-language` are automatically added

---

### Object Types Supported

| Type | Description | Example |
|------|-------------|---------|
| `CLAS` | ABAP Class | `ZCL_MY_CLASS` |
| `INTF` | ABAP Interface | `ZIF_MY_INTERFACE` |
| `TABL` | Database Table | `ZTBL_MY_TABLE` |
| `PROG` | ABAP Program/Report | `ZREPORT_TEST` |
| `DDLS` | CDS View | `ZI_MY_CDS_VIEW` |
| `FUGR` | Function Group | `ZFUNCTION_GROUP` |
| `GCPM` | Gateway Proxy Model | `/NAMESPACE/SERVICE_0001` |
| `SRVD` | Service Definition | `ZSD_MY_SERVICE` |
| `SRVB` | Service Binding | `ZSB_MY_SERVICE` |
| `BDEF` | Behavior Definition | `ZR_MY_BDEF` |

---

## ⚠️ Important Notes

### Authorization Requirements
- ✅ You must have authorization to modify the transport (owner or authorized user)
- ✅ Authorization object `S_CTS_ADMI` typically required
- ✅ Transport must be in modifiable status (not released)

### Batch Operations
- ✅ **Supported:** You can remove multiple objects in one call
- ✅ **Independent:** Each removal is processed independently
- ✅ **Partial Success:** If one fails, others continue
- ✅ **Detailed Results:** You get status for each object

### BTP Only
- ⚠️ **Currently only available in BTP server** (`abap-adt-btp`)
- ⚠️ Requires valid BTP session cookies
- ⚠️ On-premise support may be added in future

---

## 🔗 Related Tools

### `adt_save_source`
Use this to **add** objects to transports (opposite of removal)

### `adt_activate`
After removing wrong objects, use this to activate correct objects

### `adt_where_used_list`
Check where an object is used before removing it from transport

---

## 📊 Workflow Example

### Complete Transport Cleanup Workflow

**Goal:** Remove wrong class from transport, add correct one

**Steps:**

1. **Check what's currently in transport** (using Eclipse SE09 or Transport Organizer)

2. **Remove wrong object:**
```json
{
  "transport_number": "H01K900123",
  "objects": [
    { "name": "ZCL_WRONG_CLASS", "type": "CLAS", "pgmid": "R3TR" }
  ]
}
```

3. **Verify removal was successful** (check response)

4. **Add correct object:**
```json
{
  "tool": "adt_save_source",
  "arguments": {
    "object_name": "ZCL_CORRECT_CLASS",
    "object_type": "CLAS",
    "source_code": "CLASS zcl_correct_class DEFINITION..."
  }
}
```

5. **Activate the correct object:**
```json
{
  "tool": "adt_activate",
  "arguments": {
    "objects": [
      { "name": "ZCL_CORRECT_CLASS", "type": "CLAS" }
    ]
  }
}
```

---

## 🧪 Testing

### Test Scenario 1: Valid Removal
```json
{
  "transport_number": "H01K900054",
  "objects": [
    {
      "name": "/COREVIST/CLFN_PRODUCT_READER",
      "type": "CLAS",
      "pgmid": "R3TR"
    }
  ]
}
```

**Expected:** ✅ Success - object removed

---

### Test Scenario 2: Object Not in Transport
```json
{
  "transport_number": "H01K900054",
  "objects": [
    {
      "name": "ZCL_DOES_NOT_EXIST",
      "type": "CLAS",
      "pgmid": "R3TR"
    }
  ]
}
```

**Expected:** ❌ Error - object not found

---

### Test Scenario 3: Batch Removal
```json
{
  "transport_number": "H01K900054",
  "objects": [
    { "name": "ZCL_CLASS_1", "type": "CLAS", "pgmid": "R3TR" },
    { "name": "ZCL_CLASS_2", "type": "CLAS", "pgmid": "R3TR" },
    { "name": "ZTBL_TABLE_1", "type": "TABL", "pgmid": "R3TR" }
  ]
}
```

**Expected:** ✅ Detailed results for each object

---

## 🐛 Troubleshooting

### Issue: API Returns 200 OK But Object Not Removed ⚠️

**Cause:** Missing or incorrect `position` attribute

**Symptoms:**
- Tool reports success (HTTP 200)
- But object is still in transport when you check Eclipse
- No error message, but removal didn't happen

**Solution:**
1. **Always provide the position attribute**
2. Find the correct position:
   - Open Eclipse Transport Organizer
   - Expand the transport
   - Note the object's position in the list
3. Use that exact position in your removal call
4. Verify removal by refreshing Eclipse

**Example of the problem:**
```json
// ❌ WITHOUT position - returns 200 but doesn't remove!
{
  "name": "/COREVIST/PRODUCT_READER",
  "type": "CLAS",
  "pgmid": "R3TR"
}

// ✅ WITH position - actually removes the object!
{
  "name": "/COREVIST/PRODUCT_READER",
  "type": "CLAS",
  "pgmid": "R3TR",
  "position": "000003"
}
```

---

### Issue: "Error: undefined"

**Cause:** Internal error in tool processing

**Solution:**
1. Check the debug log: `ADT/adt_debug_btp.log`
2. Look for detailed error messages
3. Verify all parameters are correct
4. Ensure BTP cookies are valid

---

### Issue: "401 Unauthorized"

**Cause:** BTP session cookies expired

**Solution:**
1. Refresh cookies using `node ADT/get_btp_cookies.js`
2. Update `ADT/btp_cookies.json`
3. Restart MCP server in Cursor
4. Try again

---

### Issue: "Transport not found"

**Cause:** Invalid transport number

**Solution:**
1. Verify transport exists in system (SE09)
2. Check transport number spelling
3. Ensure you have access to that transport

---

## 📖 Additional Resources

- **ADT API Documentation:** Internal SAP ADT REST API
- **Transport Organizer (SE09):** View transport contents
- **USAGE_GUIDE_MCP.md:** Complete tool reference
- **BTP_COOKIE_SETUP_QUICKSTART.md:** Cookie setup guide

---

## ✨ Version History

### Version 1.1 (November 5, 2025) - Critical Fix
- ⚠️ **CRITICAL DISCOVERY:** Position attribute is required for actual removal
- ✅ Updated documentation with position requirement
- ✅ Updated all examples to include position
- ✅ Added troubleshooting section for "200 OK but not removed" issue
- ✅ Clarified sequential removal workflow

### Version 1.0 (November 5, 2025)
- ✅ Initial implementation
- ✅ Support for single and batch removal
- ✅ Detailed error handling
- ✅ BTP server support
- ✅ Added `x-sap-security-session` header
- ✅ Changed Content-Type to `text/plain`
- ✅ Comprehensive documentation

---

**Need help?** Check `USAGE_GUIDE_MCP.md` or the debug logs at `ADT/adt_debug_btp.log`

