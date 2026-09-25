# 🎯 Custom Query Web API - Step-by-Step Workflow

## Overview

This document describes how to create a **RAP Web API Service with Custom Query** using individual ADT MCP tools. This approach provides maximum control and allows for resumable workflows.

---

## 📋 What We're Building

A complete Web API service for custom business logic:

```
Custom Query Web API
├── Abstract Entity (CDS)       → Defines the data structure (no DB table)
├── Query Provider Class        → Implements the custom logic
├── Service Definition          → Exposes the entity as a service
└── Service Binding (OData V4)  → Makes it accessible via HTTP/OData
```

**Use Cases:**
- External API integrations
- Complex multi-table queries
- Real-time calculations
- Machine learning integrations
- Custom business logic

---

## 🛠️ Step-by-Step Workflow

### **Step 1: Create Abstract Entity**

**Purpose:** Define the data structure for input parameters and output fields.

**Tool:** `adt_create_cds_view`

**Example:**
```javascript
adt_create_cds_view({
  cds_name: "ZCE_PRODUCT_SEARCH",
  description: "Product Search Custom Query",
  package_name: "ZFG",
  transport_request: "S4HK908550",
  ddl_source: `@EndUserText.label: 'Product Search Custom Query'
@ObjectModel.query.implementedBy: 'ABAP:ZCL_PRODUCT_SEARCH_QRY'
define custom entity ZCE_PRODUCT_SEARCH
{
  // Input Parameters (filters)
  @Consumption.filter: { mandatory: false }
  @EndUserText.label: 'Product Type'
  key product_type : abap.char(4);
  
  @Consumption.filter: { mandatory: false }
  @EndUserText.label: 'Minimum Price'
      min_price    : abap.dec(15,2);
  
  // Output Fields
  @EndUserText.label: 'Product ID'
  key product_id   : abap.char(18);
  
  @EndUserText.label: 'Product Name'
      product_name : abap.char(40);
  
  @EndUserText.label: 'Price'
      price        : abap.dec(15,2);
  
  @EndUserText.label: 'Currency'
      currency     : abap.char(5);
}`
})
```

**Key Annotations:**
- `@ObjectModel.query.implementedBy`: Points to the query provider class
- `@Consumption.filter`: Marks fields as input filters
- `key`: Key fields (at least one required)

**Naming Convention:** `ZCE_*` (Custom Entity)

---

### **Step 2: Activate Abstract Entity**

**Purpose:** Make the entity available for reference by the query provider class.

**Tool:** `adt_activate`

**Example:**
```javascript
adt_activate({
  objects: [
    { name: "ZCE_PRODUCT_SEARCH", type: "DDLS" }
  ]
})
```

**⚠️ CRITICAL:** Must activate BEFORE creating the query class, or the class will have syntax errors (unknown type).

---

### **Step 3: Create Query Provider Class**

**Purpose:** Create the skeleton class that will implement the custom logic.

**Tool:** `adt_create_class`

**Example:**
```javascript
adt_create_class({
  class_name: "ZCL_PRODUCT_SEARCH_QRY",
  description: "Product Search Query Provider",
  package_name: "ZFG",
  transport_request: "S4HK908550"
})
```

**Naming Convention:** `ZCL_*_QRY` (Query Provider Class)

---

### **Step 4: Implement Query Provider Logic**

**Purpose:** Add the query implementation with `if_rap_query_provider` interface.

**Tool:** `adt_save_source` or `adt_update_and_activate`

**Example:**
```javascript
adt_update_and_activate({
  object_name: "ZCL_PRODUCT_SEARCH_QRY",
  object_type: "CLAS",
  source_code: `CLASS zcl_product_search_qry DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    INTERFACES if_rap_query_provider.

  PROTECTED SECTION.
  PRIVATE SECTION.
ENDCLASS.



CLASS zcl_product_search_qry IMPLEMENTATION.

  METHOD if_rap_query_provider~select.

    " 1. Get paging parameters
    DATA(top) = io_request->get_paging( )->get_page_size( ).
    DATA(skip) = io_request->get_paging( )->get_offset( ).
    DATA(requested_fields) = io_request->get_requested_elements( ).
    DATA(sort_order) = io_request->get_sort_elements( ).

    " 2. Get filter parameters
    TRY.
        DATA(filter_conditions) = io_request->get_filter( )->get_as_ranges( ).
        
        " Extract specific filters
        DATA(product_type_range) = VALUE #( filter_conditions[ name = 'PRODUCT_TYPE' ]-range OPTIONAL ).
        DATA(min_price_range) = VALUE #( filter_conditions[ name = 'MIN_PRICE' ]-range OPTIONAL ).

      CATCH cx_rap_query_filter_no_range.
        " No filters provided
    ENDTRY.

    " 3. Implement your custom query logic
    DATA lt_result TYPE STANDARD TABLE OF zce_product_search.

    " Example: Query from I_Product
    SELECT 
      product AS product_id,
      producttype AS product_type,
      productname AS product_name,
      netweight AS price,
      weightunit AS currency
    FROM i_product
    WHERE producttype IN @product_type_range
    INTO CORRESPONDING FIELDS OF TABLE @lt_result
    UP TO @top ROWS
    OFFSET @skip.

    " 4. Set response data
    io_response->set_data( lt_result ).

    " 5. Set total count (for paging)
    IF io_request->is_total_numb_of_rec_requested( ).
      io_response->set_total_number_of_records( lines( lt_result ) ).
    ENDIF.

  ENDMETHOD.

ENDCLASS.`
})
```

**Key Interface Method:** `if_rap_query_provider~select`
- `io_request`: Input (filters, paging, sorting)
- `io_response`: Output (data, total count)

---

### **Step 5: Create Service Definition**

**Purpose:** Define which entities are exposed in the service.

**Tool:** `adt_create_cds_view` with `objectType: 'SRVD'` (if supported) OR create manually

**Example DDL:**
```abap
@EndUserText.label: 'Product Search API'
define service ZAPI_PRODUCT_SEARCH {
  expose ZCE_PRODUCT_SEARCH as ProductSearch;
}
```

**Naming Convention:** `ZAPI_*` (API Service)

**⚠️ Note:** Service Definition creation via ADT API may require specific endpoints. Check if `adt_create_cds_view` with `objectType: 'SRVD'` works, otherwise create manually in Eclipse.

---

### **Step 6: Activate Service Definition**

**Tool:** `adt_activate`

**Example:**
```javascript
adt_activate({
  objects: [
    { name: "ZAPI_PRODUCT_SEARCH", type: "SRVD" }
  ]
})
```

---

### **Step 7: Create Service Binding**

**Purpose:** Publish the service as an OData V4 endpoint.

**⚠️ Note:** Service Binding creation is typically done in Eclipse, as there's no standard ADT API endpoint for programmatic creation (as of S/4HANA 2023).

**Manual Steps in Eclipse:**
1. Right-click package → New → Other → Service Binding
2. Name: `ZAPI_PRODUCT_SEARCH_O4`
3. Binding Type: `OData V4 - Web API`
4. Service Definition: `ZAPI_PRODUCT_SEARCH`
5. Save & Activate

**Naming Convention:** `ZAPI_*_O4` (OData V4 Web API)

---

### **Step 8: Test the Service**

**In Eclipse:**
1. Open service binding `ZAPI_PRODUCT_SEARCH_O4`
2. Click "Publish" (if not already published)
3. Click "Preview" for the entity

**Via OData Client (Postman, etc.):**
```
GET /sap/opu/odata4/sap/zapi_product_search_o4/srvd/sap/zapi_product_search/0001/ProductSearch
  ?$filter=product_type eq 'FERT'
  &$top=10
```

---

## ✅ Verification Checklist

After each step, verify:

- [ ] **Step 1-2:** Abstract entity exists and is active
  - `adt_check_syntax` on entity returns no errors
  
- [ ] **Step 3-4:** Query provider class exists and is active
  - `adt_check_syntax` on class returns no errors
  - Class can reference the abstract entity type
  
- [ ] **Step 5-6:** Service definition exists and is active
  - Can be viewed in Eclipse
  
- [ ] **Step 7:** Service binding is published
  - Service URL is accessible
  
- [ ] **Step 8:** End-to-end test works
  - Data is returned via OData call

---

## 🔧 Troubleshooting

### Issue: "Type ZCE_* is unknown" in query class

**Cause:** Abstract entity not activated before class creation.

**Fix:**
1. Activate the abstract entity: `adt_activate({ objects: [{ name: "ZCE_*", type: "DDLS" }] })`
2. Re-save and activate the class

### Issue: Service definition not created

**Cause:** `adt_create_cds_view` may not support `objectType: 'SRVD'`.

**Fix:** Create service definition manually in Eclipse or implement dedicated ADT endpoint.

### Issue: No data returned in query

**Cause:** Query logic not implemented or filters not applied correctly.

**Fix:** 
1. Add debug statements in the `select` method
2. Check filter field names match entity definition (case-sensitive)
3. Verify data exists in source tables

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    OData V4 Client                       │
│                (Browser, Postman, Fiori)                 │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP GET/POST
                        ↓
┌─────────────────────────────────────────────────────────┐
│              Service Binding (ZAPI_*_O4)                 │
│                   OData V4 - Web API                     │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│          Service Definition (ZAPI_*)                     │
│         expose ZCE_* as EntityName                       │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│           Abstract Entity (ZCE_*)                        │
│     @ObjectModel.query.implementedBy                     │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│      Query Provider Class (ZCL_*_QRY)                    │
│    implements if_rap_query_provider                      │
│                                                           │
│  - External APIs                                         │
│  - Complex queries                                       │
│  - Real-time calculations                                │
│  - Machine learning                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🎓 Key Learnings

1. **Activation Order Matters:** Abstract entity MUST be activated before creating the query class.

2. **Interface is Key:** `if_rap_query_provider~select` is where all the magic happens.

3. **Type Reference:** Query class uses `TYPE STANDARD TABLE OF <entity_name>` to reference the abstract entity.

4. **Service Binding:** Currently requires manual creation in Eclipse (no ADT API available).

5. **Naming Conventions:**
   - Abstract Entity: `ZCE_*`
   - Query Class: `ZCL_*_QRY`
   - Service Definition: `ZAPI_*`
   - Service Binding: `ZAPI_*_O4`

---

## 📚 Related Documentation

- [CUSTOM_QUERY_GENERATOR_GUIDE.md](./CUSTOM_QUERY_GENERATOR_GUIDE.md) - Automated tool (for reference)
- [RAP_ARTIFACTS_ANATOMY.md](./RAP_ARTIFACTS_ANATOMY.md) - RAP UI Service artifacts
- [ROADMAP_REMAINING_OBJECTS.md](./ROADMAP_REMAINING_OBJECTS.md) - Implementation roadmap

---

**Created:** October 23, 2025  
**Last Updated:** October 23, 2025  
**Version:** 1.0

