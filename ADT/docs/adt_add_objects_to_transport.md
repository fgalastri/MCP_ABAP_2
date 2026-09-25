# adt_add_objects_to_transport Tool Documentation

## Overview

The `adt_add_objects_to_transport` tool allows you to add ABAP objects to transport requests or tasks in SAP BTP systems. This is **essential for BTP development** because BTP systems do not automatically add objects to transports during save operations (unlike traditional on-premise systems).

## When to Use This Tool

### **Required for BTP Systems**
- After creating new ABAP objects (classes, tables, CDS views, etc.)
- After modifying existing objects
- When objects need to be transported to other systems

### **Typical BTP Workflow**
```
1. Create/Modify Object  → adt_save_source
2. Activate Object       → adt_activate  
3. Add to Transport      → adt_add_objects_to_transport ⭐ THIS TOOL
```

## Syntax

```javascript
adt_add_objects_to_transport({
  "transport_number": "H01K900138",
  "objects": [
    {
      "name": "/COREVIST/MY_CLASS",
      "type": "CLAS",
      "pgmid": "R3TR"  // Optional, defaults to R3TR
    }
  ]
})
```

## Parameters

### **transport_number** (Required)
- **Type:** String
- **Description:** Transport request or task number
- **Example:** `"H01K900138"`, `"H01K900028"`
- **Format:** Alphanumeric, typically starts with system ID

### **objects** (Required)
- **Type:** Array of objects
- **Description:** List of ABAP objects to add to the transport

#### Object Properties:

| Property | Required | Type | Description | Example |
|----------|----------|------|-------------|---------|
| `name` | ✅ Yes | String | Object name | `/COREVIST/MY_CLASS` |
| `type` | ✅ Yes | String | Object type | `CLAS`, `TABL`, `DDLS` |
| `pgmid` | ❌ No | String | Program ID (default: `R3TR`) | `R3TR`, `LIMU` |

### **Supported Object Types**

| Type | Description | Example |
|------|-------------|---------|
| `CLAS` | ABAP Class | `/COREVIST/MY_CLASS` |
| `INTF` | Interface | `/COREVIST/IF_MY_INTERFACE` |
| `TABL` | Database Table | `/COREVIST/T_MY_TABLE` |
| `DDLS` | CDS View | `/COREVIST/I_MY_CDS` |
| `BDEF` | Behavior Definition | `/COREVIST/R_MY_BDEF` |
| `DDLX` | Metadata Extension | `/COREVIST/C_MY_MDE` |
| `SRVD` | Service Definition | `/COREVIST/SD_MY_SERVICE` |
| `SRVB` | Service Binding | `/COREVIST/SB_MY_BINDING` |
| `PROG` | Program/Report | `Z_MY_REPORT` |
| `DTEL` | Data Element | `Z_MY_ELEMENT` |
| `DOMA` | Domain | `Z_MY_DOMAIN` |
| `TTYP` | Table Type | `Z_TT_MY_TYPE` |
| `STRU` | Structure | `Z_S_MY_STRUCTURE` |

## Usage Examples

### Example 1: Add Single Class
```javascript
adt_add_objects_to_transport({
  "transport_number": "H01K900138",
  "objects": [
    {
      "name": "/COREVIST/MY_CLASS",
      "type": "CLAS"
    }
  ]
})
```

**Expected Output:**
```
✅ Successfully Added 1 Object(s) to Transport H01K900138

Added Objects:
- ✅ /COREVIST/MY_CLASS (Position: 000003, Lock Status: X)

🎉 All objects have been added to the transport successfully!
```

### Example 2: Add Multiple Objects (Batch)
```javascript
adt_add_objects_to_transport({
  "transport_number": "H01K900138",
  "objects": [
    {
      "name": "/COREVIST/CL_CALCULATOR",
      "type": "CLAS"
    },
    {
      "name": "/COREVIST/T_RESULTS",
      "type": "TABL"
    },
    {
      "name": "/COREVIST/I_CALC_VIEW",
      "type": "DDLS"
    }
  ]
})
```

**Expected Output:**
```
✅ Successfully Added 3 Object(s) to Transport H01K900138

Added Objects:
- ✅ /COREVIST/CL_CALCULATOR (Position: 000004, Lock Status: X)
- ✅ /COREVIST/T_RESULTS (Position: 000005, Lock Status: X)
- ✅ /COREVIST/I_CALC_VIEW (Position: 000006, Lock Status: X)

🎉 All objects have been added to the transport successfully!
```

### Example 3: Add Complete RAP Business Object
```javascript
adt_add_objects_to_transport({
  "transport_number": "H01K900138",
  "objects": [
    { "name": "/COREVIST/T_MATERIAL", "type": "TABL" },
    { "name": "/COREVIST/R_MATERIAL", "type": "DDLS" },
    { "name": "/COREVIST/C_MATERIAL", "type": "DDLS" },
    { "name": "/COREVIST/R_MATERIAL", "type": "BDEF" },
    { "name": "/COREVIST/C_MATERIAL", "type": "BDEF" },
    { "name": "/COREVIST/BP_R_MATERIAL", "type": "CLAS" },
    { "name": "/COREVIST/SD_MATERIAL", "type": "SRVD" },
    { "name": "/COREVIST/SB_MATERIAL_UI", "type": "SRVB" }
  ]
})
```

## Response Format

### Success Response
```
✅ Successfully Added {count} Object(s) to Transport {transport_number}

Added Objects:
- ✅ {object_name} (Position: {position}, Lock Status: {status})
...

🎉 All objects have been added to the transport successfully!
```

**Response Fields:**
- **Position:** The position of the object in the transport (e.g., `000003`)
- **Lock Status:** `X` = locked for editing, indicates successful addition

### Partial Success Response
```
⚠️ Addition Completed with Issues

Transport: H01K900138
Results:
- ✅ Successfully added: 2 object(s)
- ❌ Errors: 1 object(s)

Detailed Results:
✅ /COREVIST/CLASS_A - Added successfully (Position: 000004)
✅ /COREVIST/CLASS_B - Added successfully (Position: 000005)
❌ /COREVIST/CLASS_C - ADT_TM_COMMON_EXCEPTION: Transport routing restriction

Error Details:

Object: /COREVIST/CLASS_C
Error: ADT_TM_COMMON_EXCEPTION: Transport objects from package X to target Y only
HTTP Status: 400
SAP Message: SCTS_ADT_MSG/009
```

### Error Response
```
❌ Failed to Add Objects to Transport H01K900138

Error: {error_message}
HTTP Status: {status_code}
SAP Message: {message_id}/{message_number}
```

## Common Error Scenarios

### 1. Transport Routing Restriction

**Error Message:**
```
ADT_TM_COMMON_EXCEPTION: Transport objects from package /COREVIST/_PAYMENT_TERMS to target H04 only
HTTP Status: 400
SAP Message: SCTS_ADT_MSG/009
```

**Cause:** The object's package is configured to transport only to a specific target system.

**Solution:**
- Use a different transport with the correct target (e.g., one targeting H04)
- Move the object to a compatible package
- Contact your transport administrator to adjust transport routes

### 2. Object Not Found

**Error Message:**
```
Object /COREVIST/NONEXISTENT not found
HTTP Status: 404
```

**Cause:** The object doesn't exist in the system.

**Solution:**
- Verify the object name spelling
- Check if the object was successfully created/saved
- Use `adt_read_source` to verify object exists

### 3. Authentication Error

**Error Message:**
```
Unauthorized
HTTP Status: 401
```

**Cause:** BTP session cookies have expired.

**Solution:**
- Renew BTP credentials using the credential renewal workflow
- Ask to renew credentials with fresh cookies from browser

### 4. Object Already in Transport

**Error Message:**
```
Object already locked in another transport
HTTP Status: 400
```

**Cause:** The object is already locked in a different transport.

**Solution:**
- Check which transport the object is in
- Use that transport instead, or remove it from the other transport first

## Integration with Development Workflow

### Complete Object Creation Workflow

```javascript
// Step 1: Create the class
adt_create_class({
  "class_name": "/COREVIST/CL_NEW_CLASS",
  "description": "My New Class",
  "package_name": "/COREVIST/TEMP",
  "transport_request": "H01K900138",
  "final": true,
  "visibility": "public"
})

// Step 2: Save the source code
adt_save_source({
  "object_name": "/COREVIST/CL_NEW_CLASS",
  "object_type": "CLAS",
  "source_code": "CLASS /corevist/cl_new_class DEFINITION..."
})

// Step 3: Activate the class
adt_activate({
  "objects": [
    {
      "name": "/COREVIST/CL_NEW_CLASS",
      "type": "CLAS"
    }
  ]
})

// Step 4: Add to transport (BTP ONLY - this step is automatic on-premise)
adt_add_objects_to_transport({
  "transport_number": "H01K900138",
  "objects": [
    {
      "name": "/COREVIST/CL_NEW_CLASS",
      "type": "CLAS"
    }
  ]
})
```

### RAP Business Object Creation Workflow

```javascript
// 1. Generate RAP UI Service (creates multiple objects)
adt_generate_rap_ui_service({
  "table_name": "Z_MY_TABLE",
  "package_name": "/COREVIST/TEMP",
  "transport_request": "H01K900138"
})

// 2. Activate all generated objects
adt_activate({
  "objects": [
    { "name": "ZI_MY_TABLE", "type": "DDLS" },
    { "name": "ZC_MY_TABLE", "type": "DDLS" },
    { "name": "ZI_MY_TABLE", "type": "BDEF" },
    { "name": "ZC_MY_TABLE", "type": "BDEF" },
    { "name": "ZBP_I_MY_TABLE", "type": "CLAS" },
    { "name": "ZUI_MY_TABLE_O4", "type": "SRVD" },
    { "name": "ZUI_MY_TABLE_O4", "type": "SRVB" }
  ]
})

// 3. Add all objects to transport (BTP ONLY)
adt_add_objects_to_transport({
  "transport_number": "H01K900138",
  "objects": [
    { "name": "ZI_MY_TABLE", "type": "DDLS" },
    { "name": "ZC_MY_TABLE", "type": "DDLS" },
    { "name": "ZI_MY_TABLE", "type": "BDEF" },
    { "name": "ZC_MY_TABLE", "type": "BDEF" },
    { "name": "ZBP_I_MY_TABLE", "type": "CLAS" },
    { "name": "ZUI_MY_TABLE_O4", "type": "SRVD" },
    { "name": "ZUI_MY_TABLE_O4", "type": "SRVB" }
  ]
})
```

## Best Practices

### ✅ DO:
- **Add objects immediately after activation** to keep transport organized
- **Use batch operations** when adding multiple related objects
- **Verify object names** before adding (use `adt_read_source` to confirm)
- **Keep related objects together** in the same transport
- **Document transport contents** for easier troubleshooting

### ❌ DON'T:
- **Don't mix unrelated objects** in the same transport
- **Don't forget this step** in BTP (objects won't be transported!)
- **Don't use expired sessions** (renew credentials if you get 401 errors)
- **Don't add objects to wrong transport** (check target system)

## Troubleshooting

### Problem: "Error: undefined"
**Solution:** Restart Cursor to reload the MCP server

### Problem: Objects not appearing in transport
**Solution:** 
1. Check if the object was successfully added (look for position number)
2. Verify transport number is correct
3. Refresh the transport view in Eclipse/ADT

### Problem: "Package X only transports to Y"
**Solution:**
1. Check package transport layer configuration
2. Use correct transport for the target system
3. Contact transport administrator if routes need adjustment

### Problem: Slow performance
**Solution:**
1. Add objects in batches of 10-20 at a time
2. Check network connection to BTP
3. Verify BTP system performance

## Technical Details

### HTTP Request Details
- **Method:** `PUT`
- **Endpoint:** `/sap/bc/adt/cts/transportrequests/{transport_number}`
- **Content-Type:** `text/plain`
- **Accept:** `application/vnd.sap.adt.transportorganizer.v1+xml`
- **Authentication:** BTP cookies (MYSAPSSO2, JSESSIONID, __VCAP_ID__)
- **CSRF Token:** Required

### XML Request Format
```xml
<?xml version="1.0" encoding="ASCII"?>
<tm:root xmlns:tm="http://www.sap.com/cts/adt/tm" 
         tm:number="H01K900138" 
         tm:useraction="addobject">
  <tm:request>
    <tm:abap_object tm:name="/COREVIST/MY_CLASS" 
                    tm:pgmid="R3TR" 
                    tm:type="CLAS"/>
  </tm:request>
</tm:root>
```

### XML Response Format (Success)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<tm:root xmlns:tm="http://www.sap.com/cts/adt/tm" 
         tm:useraction="addobject" 
         tm:number="H01K900138">
  <tm:request>
    <tm:abap_object tm:pgmid="R3TR" 
                    tm:type="CLAS" 
                    tm:name="/COREVIST/MY_CLASS" 
                    tm:position="000003" 
                    tm:lock_status="X"/>
  </tm:request>
</tm:root>
```

## Related Tools

| Tool | Description | When to Use |
|------|-------------|-------------|
| `adt_save_source` | Save object source code | Before activation |
| `adt_activate` | Activate objects | After saving |
| `adt_remove_objects_from_transport` | Remove objects from transport | To correct mistakes |
| `adt_list_package_objects` | List objects in package | To find objects to add |
| `adt_where_used_list` | Find object usage | Impact analysis |

## FAQ

**Q: Is this tool needed for on-premise systems?**  
A: No, on-premise systems automatically add objects to transports during save operations.

**Q: Can I add objects to a released transport?**  
A: No, the transport must be modifiable. Released transports cannot be modified.

**Q: What happens if I forget to add objects to transport?**  
A: The objects will remain only in your development system and won't be transported to QA/Production.

**Q: Can I add objects from different packages?**  
A: Yes, as long as the transport target is compatible with all packages' routing rules.

**Q: How do I find my transport number?**  
A: Use the Transport Organizer in Eclipse/ADT, or ask your transport coordinator.

## Support

For issues, questions, or enhancements:
- Check the debug logs: `ADT/adt_debug_btp.log`
- Verify BTP connection: Use `adt_read_source` with `/COREVIST/_USER`
- Renew credentials if needed: Follow the credential renewal workflow

---

**Version:** 1.0  
**Last Updated:** 2026-01-01  
**Compatibility:** SAP BTP ABAP Environment  
**Required:** BTP authentication cookies (MYSAPSSO2, JSESSIONID, __VCAP_ID__)

