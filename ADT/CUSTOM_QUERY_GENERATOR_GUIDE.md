# 🔍 Custom Query Generator - Complete Guide

**Tool Name:** `adt_generate_custom_query`  
**Purpose:** Generate complete custom query implementation with Abstract Entity + Query Provider Class  
**Created:** October 23, 2025

---

## 🎯 What It Does

Creates a complete custom query implementation in ONE call:

1. ✅ **Abstract Entity (CDS)** - Defines input parameters + output fields
2. ✅ **Query Provider Class** - Implements `if_rap_query_provider` interface
3. ✅ **Service Definition** (optional) - Exposes the query as OData service
4. ✅ **Activation** - All artifacts activated automatically

**Perfect for:** External APIs, complex aggregations, real-time calculations, ML integrations!

---

## 📋 Quick Start

### Minimal Example

```javascript
adt_generate_custom_query({
  entity_name: "ZCE_PRODUCT_SEARCH",
  query_class_name: "ZCL_PRODUCT_SEARCH_QRY",
  description: "Product Search Custom Query",
  package_name: "ZAPI",
  transport_request: "S4HK900123",
  input_parameters: [
    {
      name: "category",
      type: "abap.char(20)",
      label: "Product Category",
      isKey: true
    }
  ],
  output_fields: [
    {
      name: "product_id",
      type: "abap.char(10)",
      label: "Product ID",
      isKey: true
    },
    {
      name: "product_name",
      type: "abap.char(40)",
      label: "Product Name"
    }
  ],
  create_service: true
})
```

---

## 🔧 Parameters

### Required Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `entity_name` | string | Abstract entity name | `"ZCE_PRODUCT_SEARCH"` |
| `query_class_name` | string | Query provider class | `"ZCL_PRODUCT_SEARCH_QRY"` |
| `description` | string | Description | `"Product Search"` |
| `package_name` | string | Package | `"ZAPI"` or `"$TMP"` |

### Optional Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `transport_request` | string | Transport (empty for `$TMP`) |
| `input_parameters` | array | Filter/input parameters |
| `output_fields` | array | Result fields |
| `create_service` | boolean | Auto-create service definition |
| `service_name` | string | Service name (defaults to `ZAPI_{entity}`) |

### Field Definition Structure

**Input Parameters / Output Fields:**
```javascript
{
  name: "field_name",          // Required
  type: "abap.char(10)",       // Required - ABAP type
  label: "User Label",         // Optional - UI label
  mandatory: false,            // Optional - for input params
  isKey: true                  // Optional - mark as key field
}
```

---

## 📚 Complete Examples

### Example 1: External API Integration

```javascript
adt_generate_custom_query({
  entity_name: "ZCE_WEATHER_API",
  query_class_name: "ZCL_WEATHER_API_QRY",
  description: "Weather API Integration",
  package_name: "ZAPI",
  transport_request: "S4HK900123",
  input_parameters: [
    {
      name: "city",
      type: "abap.char(50)",
      label: "City Name",
      mandatory: true,
      isKey: true
    },
    {
      name: "country_code",
      type: "abap.char(2)",
      label: "Country Code"
    }
  ],
  output_fields: [
    {
      name: "city",
      type: "abap.char(50)",
      label: "City",
      isKey: true
    },
    {
      name: "temperature",
      type: "abap.dec(5,2)",
      label: "Temperature (°C)"
    },
    {
      name: "humidity",
      type: "abap.int4",
      label: "Humidity (%)"
    },
    {
      name: "weather_desc",
      type: "abap.char(100)",
      label: "Weather Description"
    }
  ],
  create_service: true
})
```

**Implementation in Query Class:**
```abap
METHOD if_rap_query_provider~select.
  " Call external weather API
  DATA(http_client) = cl_http_client=>create_by_url( 'https://api.weather.com/...' ).
  http_client->request->set_method( 'GET' ).
  http_client->send( ).
  http_client->receive( ).
  
  " Parse JSON response
  DATA(json) = http_client->response->get_cdata( ).
  DATA lt_result TYPE STANDARD TABLE OF zce_weather_api.
  /ui2/cl_json=>deserialize(
    EXPORTING json = json
    CHANGING data = lt_result ).
  
  io_response->set_data( lt_result ).
ENDMETHOD.
```

### Example 2: Complex Aggregation

```javascript
adt_generate_custom_query({
  entity_name: "ZCE_SALES_ANALYTICS",
  query_class_name: "ZCL_SALES_ANALYTICS_QRY",
  description: "Sales Analytics Dashboard",
  package_name: "ZRPT",
  transport_request: "S4HK900456",
  input_parameters: [
    {
      name: "from_date",
      type: "abap.dats",
      label: "From Date",
      mandatory: true
    },
    {
      name: "to_date",
      type: "abap.dats",
      label: "To Date",
      mandatory: true
    },
    {
      name: "region",
      type: "abap.char(10)",
      label: "Sales Region"
    }
  ],
  output_fields: [
    {
      name: "customer_name",
      type: "abap.char(40)",
      label: "Customer",
      isKey: true
    },
    {
      name: "order_count",
      type: "abap.int4",
      label: "Total Orders"
    },
    {
      name: "total_revenue",
      type: "abap.dec(15,2)",
      label: "Total Revenue"
    },
    {
      name: "avg_order_value",
      type: "abap.dec(15,2)",
      label: "Avg Order Value"
    },
    {
      name: "customer_rank",
      type: "abap.int4",
      label: "Customer Rank"
    }
  ],
  create_service: true,
  service_name: "ZAPI_SALES_DASHBOARD"
})
```

**Implementation:**
```abap
METHOD if_rap_query_provider~select.
  " Complex multi-table aggregation
  SELECT customer~name as customer_name,
         COUNT( DISTINCT orders~order_id ) as order_count,
         SUM( items~amount ) as total_revenue,
         AVG( items~amount ) as avg_order_value,
         RANK( ) OVER( ORDER BY SUM( items~amount ) DESC ) as customer_rank
    FROM zcustomers AS customer
    INNER JOIN zorders AS orders ON customer~id = orders~customer_id
    INNER JOIN zorder_items AS items ON orders~id = items~order_id
    WHERE orders~date BETWEEN @from_date AND @to_date
      AND customer~region IN @region_range
    GROUP BY customer~name
    ORDER BY total_revenue DESC
    INTO CORRESPONDING FIELDS OF TABLE @lt_result
    UP TO @top ROWS
    OFFSET @skip.
    
  io_response->set_data( lt_result ).
ENDMETHOD.
```

### Example 3: Real-Time Inventory

```javascript
adt_generate_custom_query({
  entity_name: "ZCE_INVENTORY_STATUS",
  query_class_name: "ZCL_INVENTORY_QRY",
  description: "Real-Time Inventory Status",
  package_name: "ZMM",
  transport_request: "S4HK900789",
  input_parameters: [
    {
      name: "plant",
      type: "abap.char(4)",
      label: "Plant",
      isKey: true
    },
    {
      name: "material_group",
      type: "abap.char(9)",
      label: "Material Group"
    }
  ],
  output_fields: [
    {
      name: "material_id",
      type: "abap.char(18)",
      label: "Material",
      isKey: true
    },
    {
      name: "current_stock",
      type: "abap.int4",
      label: "Current Stock"
    },
    {
      name: "reserved_qty",
      type: "abap.int4",
      label: "Reserved"
    },
    {
      name: "available_qty",
      type: "abap.int4",
      label: "Available"
    },
    {
      name: "reorder_point",
      type: "abap.int4",
      label: "Reorder Point"
    },
    {
      name: "reorder_needed",
      type: "abap_boolean",
      label: "Reorder?"
    }
  ],
  create_service: true
})
```

**Implementation with Business Logic:**
```abap
METHOD if_rap_query_provider~select.
  " Get base inventory data
  SELECT material~matnr as material_id,
         stock~labst as current_stock,
         stock~reserved as reserved_qty
    FROM mara AS material
    INNER JOIN mard AS stock ON material~matnr = stock~matnr
    WHERE stock~werks = @plant
      AND material~matkl IN @material_group_range
    INTO TABLE @DATA(lt_inventory).
  
  " Calculate available and reorder status
  LOOP AT lt_inventory INTO DATA(ls_inv).
    DATA(ls_result) TYPE zce_inventory_status.
    ls_result-material_id = ls_inv-material_id.
    ls_result-current_stock = ls_inv-current_stock.
    ls_result-reserved_qty = ls_inv-reserved_qty.
    ls_result-available_qty = ls_inv-current_stock - ls_inv-reserved_qty.
    
    " Get reorder point from custom table
    SELECT SINGLE reorder_point
      FROM zreorder_config
      WHERE matnr = @ls_inv-material_id
      INTO @ls_result-reorder_point.
    
    " Check if reorder needed
    ls_result-reorder_needed = xsdbool( ls_result-available_qty < ls_result-reorder_point ).
    
    APPEND ls_result TO lt_result.
  ENDLOOP.
  
  io_response->set_data( lt_result ).
ENDMETHOD.
```

### Example 4: Machine Learning Integration

```javascript
adt_generate_custom_query({
  entity_name: "ZCE_CUSTOMER_INSIGHTS",
  query_class_name: "ZCL_ML_INSIGHTS_QRY",
  description: "AI-Powered Customer Insights",
  package_name: "ZML",
  input_parameters: [
    {
      name: "customer_id",
      type: "abap.char(10)",
      label: "Customer ID",
      isKey: true
    }
  ],
  output_fields: [
    {
      name: "customer_id",
      type: "abap.char(10)",
      label: "Customer ID",
      isKey: true
    },
    {
      name: "churn_probability",
      type: "abap.dec(5,2)",
      label: "Churn Risk (%)"
    },
    {
      name: "lifetime_value",
      type: "abap.dec(15,2)",
      label: "Lifetime Value"
    },
    {
      name: "next_purchase_days",
      type: "abap.int4",
      label: "Next Purchase (days)"
    },
    {
      name: "recommended_products",
      type: "abap.char(200)",
      label: "Recommendations"
    }
  ],
  create_service: true
})
```

---

## 🎓 Generated Code Structure

### Abstract Entity (ZCE_*)

```ddl
@EndUserText.label: 'Product Search Custom Query'
@ObjectModel.query.implementedBy: 'ABAP:ZCL_PRODUCT_SEARCH_QRY'
define custom entity ZCE_PRODUCT_SEARCH
{
  @Consumption.filter: { mandatory: false }
  @EndUserText.label: 'Product Category'
  key category : abap.char(20);
  
  @EndUserText.label: 'Product ID'
  key product_id : abap.char(10);
  
  @EndUserText.label: 'Product Name'
  product_name : abap.char(40);
}
```

### Query Provider Class (ZCL_*_QRY)

```abap
CLASS zcl_product_search_qry DEFINITION
  PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    INTERFACES if_rap_query_provider.
ENDCLASS.

CLASS zcl_product_search_qry IMPLEMENTATION.
  METHOD if_rap_query_provider~select.
    " Get filter parameters
    TRY.
        DATA(filter_conditions) = io_request->get_filter( )->get_as_ranges( ).
      CATCH cx_rap_query_filter_no_range.
    ENDTRY.

    " YOUR CUSTOM LOGIC HERE
    DATA lt_result TYPE STANDARD TABLE OF zce_product_search.
    
    " Return results
    io_response->set_data( lt_result ).
    
    " Optional: Set total count
    IF io_request->is_total_numb_of_rec_requested( ).
      io_response->set_total_number_of_records( lines( lt_result ) ).
    ENDIF.
  ENDMETHOD.
ENDCLASS.
```

### Service Definition (ZAPI_*)

```abap
@EndUserText.label: 'Product Search Custom Query Service'
define service ZAPI_PRODUCT_SEARCH {
  expose ZCE_PRODUCT_SEARCH as productSearch;
}
```

---

## 🔍 ABAP Type Reference

Common ABAP types for field definitions:

| Type | Description | Example |
|------|-------------|---------|
| `abap.char(N)` | Character field, length N | `abap.char(40)` |
| `abap.numc(N)` | Numeric character, length N | `abap.numc(10)` |
| `abap.int4` | Integer (4 bytes) | `abap.int4` |
| `abap.dec(P,D)` | Decimal (P=precision, D=decimals) | `abap.dec(15,2)` |
| `abap.curr(P,D)` | Currency field | `abap.curr(15,2)` |
| `abap.quan(P,D)` | Quantity field | `abap.quan(13,3)` |
| `abap.dats` | Date (YYYYMMDD) | `abap.dats` |
| `abap.tims` | Time (HHMMSS) | `abap.tims` |
| `abap.cuky` | Currency key | `abap.cuky` |
| `abap.unit` | Unit of measure | `abap.unit` |
| `abap.string(N)` | String field | `abap.string(0)` |
| `abap_boolean` | Boolean | `abap_boolean` |

---

## 💡 Best Practices

### 1. Naming Conventions

- **Entity:** `ZCE_*` (Custom Entity)
- **Query Class:** `ZCL_*_QRY` or `ZCL_*_QUERY`
- **Service:** `ZAPI_*` (for APIs) or `ZSRV_*`

### 2. Input Parameters

- Mark the first parameter as `isKey: true`
- Use `mandatory: true` for required filters
- Use appropriate ABAP types (char, dec, dats, etc.)

### 3. Output Fields

- Always have at least one key field (`isKey: true`)
- Provide meaningful labels
- Use semantic types (curr, quan, dats)

### 4. Performance

- Always implement paging (`top` and `skip`)
- Consider caching for expensive operations
- Use database indexes where possible

### 5. Error Handling

```abap
METHOD if_rap_query_provider~select.
  TRY.
      " Your logic
      io_response->set_data( lt_result ).
    CATCH cx_root INTO DATA(lx_error).
      " Log error
      io_response->set_data( VALUE #( ) ).
  ENDTRY.
ENDMETHOD.
```

---

## 🆚 When to Use

### Use Custom Query When:

✅ Data from external APIs  
✅ Complex multi-table joins  
✅ Real-time calculations  
✅ Machine learning predictions  
✅ Custom aggregations  
✅ Mix multiple data sources  
✅ Read-only scenarios  

### Use Standard RAP When:

✅ Simple CRUD operations  
✅ Data from single table  
✅ Standard filtering sufficient  
✅ Need draft support  
✅ Transactional operations  

---

## 📊 Comparison: Standard RAP vs Custom Query

| Feature | Standard RAP | Custom Query |
|---------|--------------|--------------|
| **Data Source** | Database table | Any source (API, calc, etc.) |
| **CRUD** | ✅ Full support | ❌ Read-only |
| **Draft** | ✅ Yes | ❌ No |
| **Custom Logic** | Limited | ✅ Unlimited |
| **Performance** | Database optimized | Depends on implementation |
| **Complexity** | Low | Medium |
| **Use Case** | Standard apps | APIs, analytics, integrations |

---

## 🐛 Troubleshooting

### Issue: "Entity already exists"

**Solution:** Use a different entity name or delete existing one

### Issue: "Type not found: abap.xyz"

**Solution:** Use correct ABAP type syntax (e.g., `abap.char(10)`)

### Issue: "Filter extraction fails"

**Solution:** Check filter parameter names match entity definition (case-sensitive!)

### Issue: "No data returned"

**Solution:** Implement the `if_rap_query_provider~select` method logic!

---

## 🎯 Next Steps After Generation

1. ✅ **Edit the query class** - Implement custom logic
2. ✅ **Test with Data Preview** - F8 in Eclipse ADT
3. ✅ **Create Service Binding** - If not auto-created
4. ✅ **Add Error Handling** - Try-catch blocks
5. ✅ **Optimize Performance** - Add paging, caching
6. ✅ **Document Your Logic** - Comments in code

---

## 📚 Resources

- [RAP Artifacts Anatomy](./RAP_ARTIFACTS_ANATOMY.md)
- [RAP UI Service Generator](./RAP_UI_SERVICE_GENERATOR.md)
- SAP Documentation: if_rap_query_provider interface
- SAP Community: Custom Queries examples

---

**Created:** October 23, 2025  
**Tool:** `adt_generate_custom_query`  
**Status:** ✅ **Production Ready**

**Happy Custom Query Building!** 🚀


