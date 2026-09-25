# 🎯 RAP Actions - Complete Implementation Guide

**Last Updated:** October 24, 2025  
**Status:** ✅ Production Ready  
**Audience:** Developers implementing RAP services with actions (no CRUD operations)

---

## 📚 Table of Contents

1. [What Are RAP Actions?](#what-are-rap-actions)
2. [Architecture Overview](#architecture-overview)
3. [Implementation Steps](#implementation-steps)
4. [Critical Rules & Patterns](#critical-rules--patterns)
5. [Code Templates](#code-templates)
6. [Testing & Deployment](#testing--deployment)
7. [Troubleshooting](#troubleshooting)
8. [Common Mistakes](#common-mistakes)

---

## 🎓 What Are RAP Actions?

**RAP (Restful ABAP Programming) Actions** allow you to expose custom business logic as OData operations without creating full CRUD (Create, Read, Update, Delete) entities.

### Use Cases:
- ✅ Stateless calculations (e.g., calculator, converters)
- ✅ Business process triggers (e.g., approve invoice, send notification)
- ✅ Complex validations or simulations
- ✅ External API integrations (wrapped as actions)
- ✅ Batch operations on existing data

### Key Concepts:
- **Custom Entity**: Defines structure, no persistent table
- **Actions**: Business operations exposed via OData
- **Behavior Definition (BDEF)**: Defines available actions
- **Behavior Implementation**: ABAP logic for each action
- **Service Definition**: Exposes entity & actions as OData

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                      │
│  ZCL_YOUR_LOGIC (Standard ABAP Class)                       │
│  - Contains actual business logic methods                    │
│  - Unit tested independently                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    RAP LAYER (OData Exposure)                │
│                                                              │
│  1. Custom Entity (ZCE_YOUR_API)                            │
│     - Defines structure for actions                          │
│     - No database table                                      │
│     - Links to Query Provider                                │
│                              ↓                               │
│  2. Query Provider Class (ZCL_CE_YOUR_API)                  │
│     - Implements IF_RAP_QUERY_PROVIDER                       │
│     - Usually empty for actions-only APIs                    │
│                              ↓                               │
│  3. Behavior Definition (ZCE_YOUR_API BDEF)                 │
│     - Defines available actions                              │
│     - Links to Behavior Pool Class                           │
│                              ↓                               │
│  4. Behavior Pool Class (ZBP_CE_YOUR_API)                   │
│     - Global class: Empty shell with "FOR BEHAVIOR OF"      │
│     - Local classes (in /includes/implementations):         │
│       • lhc_* (Handler): Implements action logic            │
│       • lsc_* (Saver): Persistence (empty for actions)      │
│                              ↓                               │
│  5. Service Definition (ZSD_YOUR_API)                       │
│     - Exposes custom entity as OData service                 │
│                              ↓                               │
│  6. Service Binding (ZSB_YOUR_API_O4)                       │
│     - Activates & publishes OData service                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
                      OData REST API
```

---

## 🛠️ Implementation Steps

### **Step 1: Create Business Logic Class (Optional but Recommended)**

Create your core business logic in a separate, testable class:

```abap
CLASS zcl_your_logic DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    METHODS calculate
      IMPORTING iv_input TYPE i
      RETURNING VALUE(rv_result) TYPE i
      RAISING cx_sy_zerodivide.
ENDCLASS.

CLASS zcl_your_logic IMPLEMENTATION.
  METHOD calculate.
    " Your business logic here
    rv_result = iv_input * 2.
  ENDMETHOD.
ENDCLASS.
```

**Tool:** `mcp_abap-adt_adt_create_class`

---

### **Step 2: Create Parameter Structures**

Define input and output structures for your actions:

```abap
@EndUserText.label: 'Your Action Input Parameters'
define view entity ZYOUR_ACTION_INPUT as select from dummy
{
  key cast( '' as abap.char(1) ) as dummy_key,
  input_param_1 : abap.dec(15,2),
  input_param_2 : abap.char(50)
}

@EndUserText.label: 'Your Action Result'
define view entity ZYOUR_ACTION_RESULT as select from dummy
{
  key cast( '' as abap.char(1) ) as dummy_key,
  request_id   : sysuuid_x16,
  result_value : abap.dec(15,2),
  status       : abap.char(10),
  message      : abap.char(255)
}
```

**Tool:** `mcp_abap-adt_adt_create_cds_view`

**Common Parameter Patterns:**
- Binary operations: `input_a`, `input_b`
- Unary operations: `input_value` or `input_number`
- Result: Always include `request_id`, `status`, `message`

---

### **Step 3: Create Custom Entity**

```abap
@EndUserText.label: 'Your API - Custom Entity'
@ObjectModel.query.implementedBy: 'ABAP:ZCL_CE_YOUR_API'
define root custom entity ZCE_YOUR_API
{
  key request_id : sysuuid_x16;
  operation      : abap.char(20);
  status         : abap.char(10);
  message        : abap.char(255);
}
```

**Critical:**
- Must be `custom entity` (not `abstract entity`)
- Must be `root` entity
- Must have `@ObjectModel.query.implementedBy`

**Tool:** `mcp_abap-adt_adt_create_cds_view`

---

### **Step 4: Create Query Provider Class**

```abap
CLASS zcl_ce_your_api DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC
  IMPLEMENTING if_rap_query_provider.

  PUBLIC SECTION.
  PROTECTED SECTION.
  PRIVATE SECTION.
ENDCLASS.

CLASS zcl_ce_your_api IMPLEMENTATION.

  METHOD if_rap_query_provider~get_query_results.
    " For actions-only APIs, return empty result set
    DATA(lv_count) = 0.
    io_response->set_total_number_of_records( lv_count ).
    io_response->set_data( VALUE #( ) ).
  ENDMETHOD.

ENDCLASS.
```

**Tool:** `mcp_abap-adt_adt_create_class`

---

### **Step 5: Create Behavior Definition (BDEF)**

```abap
unmanaged implementation in class zbp_ce_your_api unique;
strict ( 2 );

define behavior for ZCE_YOUR_API alias YourAPI
lock master
authorization master ( instance )
{
  field ( readonly ) request_id;

  // Define your actions
  action yourAction parameter zyour_action_input result [1] zyour_action_result;
  action anotherAction parameter zyour_action_input result [1] zyour_action_result;
}
```

**Critical Rules:**
- Use `unmanaged implementation`
- Use `strict ( 2 )` for strict mode
- Add `lock master` and `authorization master ( instance )`
- Use lowercase alias (e.g., `YourAPI`, not `YOUR_API`)
- Mark key fields as `readonly`
- Action result cardinality: `[1]` for single result

**Tool:** `mcp_abap-adt_adt_create_behavior_definition`

---

### **Step 6: Create Behavior Pool Class (Global)**

```abap
CLASS zbp_ce_your_api DEFINITION
  PUBLIC
  ABSTRACT
  FINAL
  FOR BEHAVIOR OF zce_your_api.

ENDCLASS.

CLASS zbp_ce_your_api IMPLEMENTATION.
ENDCLASS.
```

**Critical Pattern:**
- Use `ABSTRACT FINAL`
- Use `FOR BEHAVIOR OF <bdef_name>` (not `<entity_name>`)
- Global class is just a shell
- No `INHERITING FROM` clause
- No sections needed (PUBLIC/PROTECTED/PRIVATE)

**Tool:** `mcp_abap-adt_adt_create_class` (then modify source)

---

### **Step 7: Create Behavior Implementation (Local Classes)**

Save to `/includes/implementations`:

```abap
CLASS lhc_your_api DEFINITION INHERITING FROM cl_abap_behavior_handler.
  PRIVATE SECTION.

    METHODS your_action FOR MODIFY
      IMPORTING keys FOR ACTION yourapi~youraction
      RESULT result.

    METHODS get_instance_authorizations FOR INSTANCE AUTHORIZATION
      IMPORTING keys REQUEST requested_authorizations FOR yourapi RESULT result.

    METHODS read FOR READ
      IMPORTING keys FOR READ yourapi RESULT result.

    METHODS lock FOR LOCK
      IMPORTING keys FOR LOCK yourapi.

ENDCLASS.

CLASS lhc_your_api IMPLEMENTATION.

  METHOD your_action.
    DATA: lo_logic TYPE REF TO zcl_your_logic,
          ls_result TYPE zyour_action_result.

    lo_logic = NEW #( ).

    LOOP AT keys ASSIGNING FIELD-SYMBOL(<key>).
      " Generate request ID
      TRY.
          ls_result-request_id = cl_system_uuid=>create_uuid_x16_static( ).
        CATCH cx_uuid_error.
          " Ignore UUID errors
      ENDTRY.

      " Call business logic
      TRY.
          ls_result-result_value = lo_logic->calculate(
            iv_input = CONV i( <key>-%param-input_param_1 )
          ).
          ls_result-status = 'SUCCESS'.
          ls_result-message = 'Operation completed successfully'.

        CATCH cx_root INTO DATA(lx_error).
          ls_result-status = 'ERROR'.
          ls_result-message = lx_error->get_text( ).
      ENDTRY.

      " Append result (NO %cid for actions!)
      APPEND VALUE #( %param = ls_result ) TO result.
    ENDLOOP.

  ENDMETHOD.

  METHOD get_instance_authorizations.
    " No authorization checks for demo
  ENDMETHOD.

  METHOD read.
    " No read implementation for actions-only API
  ENDMETHOD.

  METHOD lock.
    " No lock implementation for actions-only API
  ENDMETHOD.

ENDCLASS.

CLASS lsc_your_api DEFINITION INHERITING FROM cl_abap_behavior_saver.
  PROTECTED SECTION.
    METHODS finalize REDEFINITION.
    METHODS check_before_save REDEFINITION.
    METHODS save REDEFINITION.
    METHODS cleanup REDEFINITION.
    METHODS cleanup_finalize REDEFINITION.
ENDCLASS.

CLASS lsc_your_api IMPLEMENTATION.

  METHOD finalize.
    " No persistence for actions-only API
  ENDMETHOD.

  METHOD check_before_save.
    " No validation needed
  ENDMETHOD.

  METHOD save.
    " No save needed
  ENDMETHOD.

  METHOD cleanup.
    " No cleanup needed
  ENDMETHOD.

  METHOD cleanup_finalize.
    " No cleanup finalization needed
  ENDMETHOD.

ENDCLASS.
```

**Critical Patterns:**
- Handler class: `lhc_<entity_name>` (lowercase)
- Saver class: `lsc_<entity_name>` (lowercase)
- Use **alias** in action method signature: `yourapi~youraction`
- **NO `%cid`** in result for actions (only `%param`)
- Always catch `cx_uuid_error` when generating UUIDs
- Always include error handling

**Tool:** `mcp_abap-adt_adt_save_local_implementations` ✨ **NEW!**

---

### **Step 8: Activate Behavior Pool & BDEF**

Activate both together:

```javascript
mcp_abap-adt_adt_activate({
  objects: [
    { name: 'ZCE_YOUR_API', type: 'BDEF' },
    { name: 'ZBP_CE_YOUR_API', type: 'CLAS' }
  ]
})
```

**Critical:** BDEF and implementation class must be activated together!

---

### **Step 9: Create Service Definition**

```abap
@EndUserText.label: 'Your API Service'
define service ZSD_YOUR_API {
  expose ZCE_YOUR_API as YourAPI;
}
```

**Tool:** `mcp_abap-adt_adt_create_service_definition`

---

### **Step 10: Create Service Binding (Manual)**

**Currently requires Eclipse ADT:**

1. Right-click `ZSD_YOUR_API` in Eclipse
2. New → Service Binding
3. Choose: **OData V4 - UI**
4. Name: `ZSB_YOUR_API_O4`
5. Activate
6. Click **Publish**

**Future:** MCP tool for service binding creation (planned)

---

## 🎯 Critical Rules & Patterns

### Rule 1: Global vs Local Classes

```
GLOBAL CLASS (zbp_ce_your_api):
  ✅ ABSTRACT FINAL
  ✅ FOR BEHAVIOR OF <bdef_name>
  ❌ NO INHERITING FROM
  ❌ Empty implementation

LOCAL CLASSES (/includes/implementations):
  ✅ lhc_* INHERITING FROM cl_abap_behavior_handler
  ✅ lsc_* INHERITING FROM cl_abap_behavior_saver
  ✅ Contains all actual logic
```

### Rule 2: Action Results

```abap
" ❌ WRONG: Using %cid for action results
APPEND VALUE #( %cid = <key>-%cid %param = ls_result ) TO result.

" ✅ CORRECT: No %cid for actions
APPEND VALUE #( %param = ls_result ) TO result.
```

### Rule 3: Use Aliases

```abap
" In BDEF:
define behavior for ZCE_YOUR_API alias YourAPI

" In local handler:
METHODS your_action FOR MODIFY
  IMPORTING keys FOR ACTION yourapi~youraction  " Use alias (lowercase)
  RESULT result.
```

### Rule 4: UUID Generation

```abap
" Always catch cx_uuid_error
TRY.
    ls_result-request_id = cl_system_uuid=>create_uuid_x16_static( ).
  CATCH cx_uuid_error.
    " Ignore or log error
ENDTRY.
```

### Rule 5: MCP Tools Only

```
❌ NEVER: Direct API calls (axios, curl, etc.)
✅ ALWAYS: Use MCP tools
✅ Missing tool? CREATE IT FIRST, then use it
```

---

## 📋 Code Templates

### Minimal Action Handler Template

```abap
METHOD your_action.
  DATA ls_result TYPE your_result_structure.

  LOOP AT keys ASSIGNING FIELD-SYMBOL(<key>).
    " Generate UUID
    TRY.
        ls_result-request_id = cl_system_uuid=>create_uuid_x16_static( ).
      CATCH cx_uuid_error.
    ENDTRY.

    " Business logic
    TRY.
        " Your logic here
        ls_result-status = 'SUCCESS'.
        ls_result-message = 'Completed'.
      CATCH cx_root INTO DATA(lx_error).
        ls_result-status = 'ERROR'.
        ls_result-message = lx_error->get_text( ).
    ENDTRY.

    APPEND VALUE #( %param = ls_result ) TO result.
  ENDLOOP.
ENDMETHOD.
```

### Error Handling Pattern

```abap
TRY.
    " Your business logic
    ls_result-status = 'SUCCESS'.
    ls_result-message = 'Operation completed successfully'.

  CATCH cx_specific_error.
    ls_result-status = 'ERROR'.
    ls_result-message = 'Specific error message'.

  CATCH cx_root INTO DATA(lx_error).
    ls_result-status = 'ERROR'.
    ls_result-message = lx_error->get_text( ).
ENDTRY.
```

---

## 🧪 Testing & Deployment

### Testing in Postman/REST Client

```http
POST https://your-server:port/sap/opu/odata4/sap/zsd_your_api/srvd/sap/zsb_your_api_o4/0001/YourAPI/yourAction
Content-Type: application/json
Authorization: Basic <base64_credentials>
sap-client: 100

{
  "input_param_1": 10,
  "input_param_2": "test"
}
```

### Expected Response

```json
{
  "value": [
    {
      "request_id": "A1B2C3D4E5F6...",
      "result_value": 20,
      "status": "SUCCESS",
      "message": "Operation completed successfully"
    }
  ]
}
```

### Testing in SAP Gateway Client (Transaction /IWFND/GW_CLIENT)

1. Set Service: `/sap/opu/odata4/sap/zsd_your_api/...`
2. HTTP Method: `POST`
3. Request URI: `.../YourAPI/yourAction`
4. Add body with parameters
5. Execute

---

## 🐛 Troubleshooting

### Error: "Local classes of CL_ABAP_BEHAVIOR_HANDLER can only be derived in Local Definitions"

**Cause:** Global class has `INHERITING FROM cl_abap_behavior_handler`

**Fix:** Remove `INHERITING FROM`, add `FOR BEHAVIOR OF <bdef_name>`

```abap
" ❌ WRONG
CLASS zbp_ce_your_api DEFINITION
  PUBLIC FINAL CREATE PUBLIC
  INHERITING FROM cl_abap_behavior_handler.

" ✅ CORRECT
CLASS zbp_ce_your_api DEFINITION
  PUBLIC ABSTRACT FINAL
  FOR BEHAVIOR OF zce_your_api.
```

---

### Error: "No component exists with the name %CID"

**Cause:** Using `%cid` in action result structure

**Fix:** Remove `%cid`, use only `%param`

```abap
" ❌ WRONG
APPEND VALUE #( %cid = <key>-%cid %param = ls_result ) TO result.

" ✅ CORRECT
APPEND VALUE #( %param = ls_result ) TO result.
```

---

### Error: "abstract was expected, not unmanaged"

**Cause:** Using `custom entity` with `abstract implementation`

**Fix:** Use `unmanaged implementation` for custom entities

```abap
" For custom entities:
unmanaged implementation in class zbp_ce_your_api unique;

" For abstract entities (parameter structures):
" (No behavior definition needed)
```

---

### Error: "The alias should be used instead of entity name"

**Cause:** Using entity name instead of alias in local handler

**Fix:** Use lowercase alias in method signatures

```abap
" BDEF:
define behavior for ZCE_YOUR_API alias YourAPI

" ❌ WRONG in handler:
FOR ACTION zce_your_api~youraction

" ✅ CORRECT:
FOR ACTION yourapi~youraction
```

---

## ❌ Common Mistakes

### Mistake #1: Creating Regular Class Instead of Behavior Pool

**Wrong Approach:**
```abap
CLASS zbp_ce_your_api DEFINITION PUBLIC FINAL CREATE PUBLIC.
```

**Correct Approach:**
```abap
CLASS zbp_ce_your_api DEFINITION
  PUBLIC ABSTRACT FINAL
  FOR BEHAVIOR OF zce_your_api.
```

---

### Mistake #2: Forgetting Lock/Authorization Master

**Wrong BDEF:**
```abap
define behavior for ZCE_YOUR_API alias YourAPI
{
  action yourAction ...;
}
```

**Correct BDEF:**
```abap
define behavior for ZCE_YOUR_API alias YourAPI
lock master
authorization master ( instance )
{
  action yourAction ...;
}
```

---

### Mistake #3: Using Direct API Calls

**❌ NEVER DO THIS:**
```javascript
axios.post('/sap/bc/adt/...')
curl https://sap-server/...
```

**✅ ALWAYS DO THIS:**
```javascript
mcp_abap-adt_adt_save_local_implementations({...})
```

---

## 🎨 Adding UI Action Buttons (For RAP UI Services)

**Scenario:** You have a generated RAP UI Service (CRUD) and want to add action buttons to the Fiori Elements UI.

### When This Applies:
- ✅ You used `adt_generate_rap_ui_service`
- ✅ Generator created a metadata extension (DDLX)
- ✅ You added custom actions to your BDEF
- ✅ Now you want the action button to appear in the UI

### Workflow ⭐ FULLY AUTOMATED:

```javascript
// Step 1: Read existing metadata extension
adt_read_source({ 
  object_name: "ZC_YOUR_VIEW", 
  object_type: "DDLX" 
})

// Step 2: Add action button annotation
// Add to the field where you want the button to appear:
@UI.lineItem: [ 
  { existing annotations... },
  { type: #FOR_ACTION, dataAction: 'yourAction', label: 'Your Action', position: 40 }
]
@UI.identification: [ 
  { existing annotations... },
  { type: #FOR_ACTION, dataAction: 'yourAction', label: 'Your Action', position: 40 }
]
YourField;

// Step 3: Save updated metadata extension
adt_save_source({
  object_name: "ZC_YOUR_VIEW",
  object_type: "DDLX",
  source_code: `<complete updated metadata extension>`
})

// Step 4: Activate
adt_activate({
  objects: [{ name: "ZC_YOUR_VIEW", type: "DDLX" }]
})
```

### Action Button Placement Options:

**1. On a Field (List & Object Page):**
```abap
@UI.lineItem: [ 
  { position: 10, label: 'Field' },
  { type: #FOR_ACTION, dataAction: 'myAction', label: 'Execute' }
]
@UI.identification: [ 
  { position: 10, label: 'Field' },
  { type: #FOR_ACTION, dataAction: 'myAction', label: 'Execute' }
]
MyField;
```

**2. Entity-Level (Toolbar):**
```abap
@UI.identification: [ 
  { type: #FOR_ACTION, dataAction: 'myAction', label: 'Execute Action' }
]
annotate view ZC_MY_VIEW with { }
```

**3. In Facet:**
```abap
@UI.facet: [ 
  {
    id: 'idActions',
    type: #IDENTIFICATION_REFERENCE,
    purpose: #STANDARD,
    position: 10,
    label: 'Actions'
  }
]
```

### Example: ZRAP_MAT Toggle Deletion

**Complete metadata extension with action button:**
```abap
@Metadata.layer: #CORE
@UI: {
  headerInfo: {
    typeName: 'ZC_RAP_MAT', 
    typeNamePlural: 'ZC_RAP_MATs'
  }
}
annotate view ZC_RAP_MAT with
{
  @UI.facet: [ {
    id: 'idIdentification', 
    type: #IDENTIFICATION_REFERENCE, 
    label: 'ZC_RAP_MAT', 
    position: 10 
  } ]
  @UI.lineItem: [ {
    position: 10 , 
    importance: #MEDIUM, 
    label: 'MaterialID'
  } ]
  @UI.identification: [ {
    position: 10 , 
    label: 'MaterialID'
  } ]
  MaterialID;
  
  @UI.lineItem: [ {
    position: 20 , 
    importance: #MEDIUM, 
    label: 'Description'
  } ]
  @UI.identification: [ {
    position: 20 , 
    label: 'Description'
  } ]
  Description;
  
  @UI.lineItem: [ {
    position: 30 , 
    importance: #MEDIUM, 
    label: ''
  } , {
    type: #FOR_ACTION, 
    dataAction: 'toggleDeletion', 
    label: 'Toggle Deletion Flag', 
    position: 40 
  } ]
  @UI.identification: [ {
    position: 30 , 
    label: ''
  } , {
    type: #FOR_ACTION, 
    dataAction: 'toggleDeletion', 
    label: 'Toggle Deletion Flag', 
    position: 40 
  } ]
  Deleted;
  
  @UI.hidden: true
  LocalLastChangedAt;
}
```

**Result:** Button appears on both list report and object page!

### Critical Rules:

1. **Always Read First:** Never create metadata extension from scratch if generator created it
2. **Match Action Name:** `dataAction` must match BDEF action name (case-sensitive!)
3. **Both Annotations:** Include button in both `lineItem` (list) and `identification` (object page)
4. **Complete Content:** When saving, include ALL existing annotations (don't replace!)

**See Also:**
- `ADT/METADATA_EXTENSION_TOOL_COMPLETE.md` - Complete DDLX documentation
- `ZRAP_MAT_COMPLETE_IMPLEMENTATION_GUIDE.md` - Full working example

---

## 📚 Complete Workflow Summary

```
1. Create Business Logic Class
   └─> mcp_abap-adt_adt_create_class

2. Create Parameter Structures (Input/Result)
   └─> mcp_abap-adt_adt_create_cds_view (2-3 times)

3. Create Custom Entity
   └─> mcp_abap-adt_adt_create_cds_view

4. Create Query Provider Class
   └─> mcp_abap-adt_adt_create_class

5. Create Behavior Definition
   └─> mcp_abap-adt_adt_create_behavior_definition

6. Create Behavior Pool Class (Global)
   └─> mcp_abap-adt_adt_create_class
   └─> mcp_abap-adt_adt_save_source (fix to FOR BEHAVIOR OF)

7. Create Local Implementations
   └─> mcp_abap-adt_adt_save_local_implementations ⭐ NEW!

8. Activate BDEF + Class Together
   └─> mcp_abap-adt_adt_activate (both objects)

9. Create Service Definition
   └─> mcp_abap-adt_adt_create_service_definition

10. Create Service Binding
    └─> Manual in Eclipse (for now)

11. Test via OData
    └─> Postman / Gateway Client
```

---

## 🎓 Key Learnings & Best Practices

1. **Separation of Concerns:**
   - Business logic in separate class (testable)
   - RAP layer just wraps and exposes

2. **Always Use MCP Tools:**
   - Never bypass with direct API calls
   - If tool missing, create it first

3. **Test Business Logic First:**
   - Unit test business logic class independently
   - RAP layer should be thin wrapper

4. **Use Meaningful Names:**
   - `ZCE_*` for Custom Entities
   - `ZCL_CE_*` for Query Providers
   - `ZBP_CE_*` for Behavior Pools
   - `ZSD_*` for Service Definitions
   - `ZSB_*` for Service Bindings

5. **Document Your Actions:**
   - Clear action names
   - Meaningful parameter names
   - Include status/message in results

---

## 📖 References

- **SAP RAP Documentation:** https://help.sap.com/docs/btp/sap-abap-restful-application-programming-model
- **ADT MCP Tools:** `ADT/README_NEW.md`
- **MFR (Master File Repository):** `MFR_MASTER_FILE_REPOSITORY.md`
- **Example Implementation:** See `CALCULATOR_API_IMPLEMENTATION.md`

---

**Last Updated:** October 24, 2025  
**Version:** 1.0  
**Status:** ✅ Complete & Production Ready

