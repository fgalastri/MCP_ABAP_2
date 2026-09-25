# 🔧 Service Definition Creation Tool

## ✅ **Tool: `adt_create_service_definition`**

Creates a new Service Definition (SRVD) in SAP using the ADT REST API.

---

## 📋 **What is a Service Definition?**

A **Service Definition** defines which CDS entities are exposed as a business service. It acts as a contract between your data model and the service binding (OData API).

### **Purpose**
- Expose CDS views as services
- Group related entities
- Define service boundaries
- Prepare for OData exposure

### **Typical Use Cases**
1. **Custom Query APIs** - Expose Abstract Entities
2. **RAP Services** - Expose C-Layer CDS views
3. **Data Services** - Expose standard CDS views
4. **Composite Services** - Combine multiple entities

---

## 🚀 **Usage**

### **Basic Syntax**

```javascript
adt_create_service_definition({
  service_name: "ZAPI_MY_SERVICE",
  description: "My Service Description",
  package_name: "ZPACKAGE",
  transport_request: "S4HK908550",  // Optional for local objects
  ddl_source: `@EndUserText.label: 'My Service'
define service ZAPI_MY_SERVICE {
  expose ZCE_MY_ENTITY as MyEntity;
}`
})
```

---

## 📝 **Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `service_name` | string | ✅ Yes | Service definition name (e.g., `ZAPI_PRODUCT`) |
| `description` | string | ✅ Yes | Service description |
| `package_name` | string | ✅ Yes | Package name (e.g., `ZFG`, `$TMP`) |
| `transport_request` | string | ⚠️ Conditional | Transport request number. Required for non-local packages |
| `ddl_source` | string | ⚙️ Optional | Complete DDL source code. If provided, creates a fully defined service |

---

## 🎯 **Two Creation Modes**

### **Mode 1: Metadata Only** (No DDL Source)

Creates the service definition object without DDL source. You'll need to add the source later.

```javascript
adt_create_service_definition({
  service_name: "ZAPI_PRODUCT",
  description: "Product API Service",
  package_name: "ZFG",
  transport_request: "S4HK908550"
  // No ddl_source provided
})
```

**Result:**
- ✅ Service Definition created
- ⚠️ No DDL source - needs to be added manually
- ⚠️ Cannot be activated yet

---

### **Mode 2: Complete Definition** (With DDL Source) ⭐ **Recommended**

Creates the service definition with DDL source. Ready to activate!

```javascript
adt_create_service_definition({
  service_name: "ZAPI_PRODUCT",
  description: "Product API Service",
  package_name: "ZFG",
  transport_request: "S4HK908550",
  ddl_source: `@EndUserText.label: 'Product API Service'
define service ZAPI_PRODUCT {
  expose ZCE_PRODUCT as Product;
  expose ZCE_CATEGORY as Category;
}`
})
```

**Result:**
- ✅ Service Definition created
- ✅ DDL source added
- ✅ Ready to activate with `adt_activate`

---

## 📊 **DDL Source Examples**

### **Example 1: Single Entity Exposure**

```sql
@EndUserText.label: 'Material Search API'
define service ZAPI_MATERIAL_SEARCH {
  expose ZCE_MATERIAL_SEARCH as MaterialSearch;
}
```

---

### **Example 2: Multiple Entities**

```sql
@EndUserText.label: 'Sales Order API'
define service ZAPI_SALES_ORDER {
  expose ZCE_SALES_ORDER as SalesOrder;
  expose ZCE_SALES_ITEM as SalesItem;
  expose ZCE_CUSTOMER as Customer;
}
```

---

### **Example 3: With Associations**

```sql
@EndUserText.label: 'Product Catalog API'
define service ZAPI_PRODUCT_CATALOG {
  expose ZI_Product as Product;
  expose ZI_ProductCategory as Category;
  expose ZI_ProductSupplier as Supplier;
}
```

---

### **Example 4: Custom Entity (Abstract Entity)**

```sql
@EndUserText.label: 'Custom Query API'
define service ZAPI_CUSTOM_QUERY {
  expose ZCE_EXTERNAL_DATA as ExternalData;
}
```

---

## 🔄 **Complete Workflow**

### **Step 1: Create Service Definition**

```javascript
const result = await adt_create_service_definition({
  service_name: "ZAPI_PRODUCT",
  description: "Product API Service",
  package_name: "ZFG",
  transport_request: "S4HK908550",
  ddl_source: `@EndUserText.label: 'Product API Service'
define service ZAPI_PRODUCT {
  expose ZCE_PRODUCT as Product;
}`
});
```

---

### **Step 2: Activate Service Definition**

```javascript
const activation = await adt_activate({
  objects: [
    { name: "ZAPI_PRODUCT", type: "SRVD" }
  ]
});
```

---

### **Step 3: Create Service Binding** (Manual)

Currently done manually in Eclipse ADT or SAP GUI.

---

## ✅ **Success Response**

```json
{
  "success": true,
  "message": "✅ Successfully Created Complete Service Definition ZAPI_PRODUCT",
  "serviceName": "ZAPI_PRODUCT",
  "description": "Product API Service",
  "package": "ZFG",
  "transport": "S4HK908550",
  "ddlSourceAdded": true,
  "uri": "/sap/bc/adt/ddic/srvd/sources/zapi_product"
}
```

---

## ❌ **Error Handling**

### **Error 1: Service Already Exists**

```
Error: Resource Service Definition ZAPI_PRODUCT does already exist
HTTP Status: 400
```

**Solution:** Use a different name or delete the existing service definition.

---

### **Error 2: Entity Not Found (During Activation)**

```
Error: Entity 'ZCE_PRODUCT' does not exist
```

**Solution:** Ensure the exposed entity exists and is activated before activating the service definition.

---

### **Error 3: Transport Required**

```
Error: Transport request required for non-local package
HTTP Status: 400
```

**Solution:** Provide a valid transport request number or use `$TMP` for local development.

---

### **Error 4: Invalid DDL Syntax**

```
Error: Syntax error in DDL source
```

**Solution:** Validate your DDL syntax. Common issues:
- Missing semicolon
- Invalid entity names
- Incorrect annotations

---

## 🎨 **Common Patterns**

### **Pattern 1: Custom Query Service**

```javascript
// Step 1: Generate Custom Query
await adt_generate_custom_query({
  entity_name: "ZCE_PRODUCT_SEARCH",
  query_class_name: "ZCL_PRODUCT_SEARCH_QRY",
  description: "Product Search Query",
  package_name: "ZFG",
  transport_request: "S4HK908550",
  output_fields: [...]
});

// Step 2: Create Service Definition
await adt_create_service_definition({
  service_name: "ZAPI_PRODUCT_SEARCH",
  description: "Product Search API",
  package_name: "ZFG",
  transport_request: "S4HK908550",
  ddl_source: `@EndUserText.label: 'Product Search API'
define service ZAPI_PRODUCT_SEARCH {
  expose ZCE_PRODUCT_SEARCH as ProductSearch;
}`
});

// Step 3: Activate
await adt_activate({
  objects: [
    { name: "ZAPI_PRODUCT_SEARCH", type: "SRVD" }
  ]
});
```

---

### **Pattern 2: RAP Service Exposure**

```javascript
// After generating RAP UI Service
await adt_create_service_definition({
  service_name: "ZAPI_MATERIAL_WEB",
  description: "Material Web API",
  package_name: "ZFG",
  transport_request: "S4HK908550",
  ddl_source: `@EndUserText.label: 'Material Web API'
define service ZAPI_MATERIAL_WEB {
  expose ZC_MATERIAL as Material;
}`
});
```

---

### **Pattern 3: Composite Service**

```javascript
await adt_create_service_definition({
  service_name: "ZAPI_SALES_COMPOSITE",
  description: "Sales Composite API",
  package_name: "ZFG",
  transport_request: "S4HK908550",
  ddl_source: `@EndUserText.label: 'Sales Composite API'
define service ZAPI_SALES_COMPOSITE {
  expose ZI_SalesOrder as SalesOrder;
  expose ZI_SalesItem as SalesItem;
  expose ZI_Customer as Customer;
  expose ZI_Product as Product;
}`
});
```

---

## 🔍 **Behind the Scenes**

### **ADT API Calls**

The tool makes the following API calls:

#### **1. Create Metadata** (POST)
```
POST /sap/bc/adt/ddic/srvd/sources?corrNr={transport}
Content-Type: application/vnd.sap.adt.ddic.srvd.v3+xml
```

#### **2. Lock Service Definition** (POST)
```
POST /sap/bc/adt/ddic/srvd/sources/{name}?_action=LOCK&accessMode=MODIFY
```

#### **3. Save DDL Source** (PUT)
```
PUT /sap/bc/adt/ddic/srvd/sources/{name}/source/main?lockHandle={handle}&corrNr={transport}
Content-Type: text/plain; charset=utf-8
```

#### **4. Unlock** (POST)
```
POST /sap/bc/adt/ddic/srvd/sources/{name}?_action=UNLOCK&lockHandle={handle}
```

---

## 📊 **Comparison with Other Tools**

| Feature | `adt_create_service_definition` | `adt_generate_rap_ui_service` |
|---------|--------------------------------|-------------------------------|
| **Creates** | Service Definition only | Service Definition + 6 other artifacts |
| **DDL Source** | ✅ Optional | ✅ Included |
| **Activation** | Manual with `adt_activate` | Automatic |
| **Flexibility** | ⭐⭐⭐⭐⭐ High | ⭐⭐⭐ Medium |
| **Use Case** | Custom services, API design | Complete RAP UI applications |
| **Control** | Full control | SAP-generated |

---

## 💡 **Best Practices**

### **1. Always Provide DDL Source**
```javascript
// ✅ Good - Complete definition
adt_create_service_definition({
  service_name: "ZAPI_PRODUCT",
  description: "Product API",
  package_name: "ZFG",
  transport_request: "S4HK908550",
  ddl_source: "..." // Always provide this
});

// ❌ Avoid - Incomplete
adt_create_service_definition({
  service_name: "ZAPI_PRODUCT",
  description: "Product API",
  package_name: "ZFG",
  transport_request: "S4HK908550"
  // No ddl_source - needs manual work
});
```

---

### **2. Use Meaningful Aliases**
```sql
-- ✅ Good - Clear aliases
define service ZAPI_PRODUCT {
  expose ZCE_PRODUCT as Product;
  expose ZCE_CATEGORY as Category;
}

-- ❌ Avoid - No aliases (uses technical names)
define service ZAPI_PRODUCT {
  expose ZCE_PRODUCT;
  expose ZCE_CATEGORY;
}
```

---

### **3. Group Related Entities**
```sql
-- ✅ Good - Logically grouped
define service ZAPI_SALES_ORDER {
  expose ZI_SalesOrder as SalesOrder;
  expose ZI_SalesItem as Item;
  expose ZI_Customer as Customer;
}

-- ❌ Avoid - Unrelated entities
define service ZAPI_MIXED {
  expose ZI_SalesOrder;
  expose ZI_Employee;
  expose ZI_Warehouse;
}
```

---

### **4. Follow Naming Conventions**
```
Format: {Z|Y}API_{BUSINESS_AREA}[_{VERSION}]

Examples:
- ZAPI_PRODUCT
- ZAPI_SALES_ORDER
- ZAPI_MATERIAL_SEARCH
- ZAPI_CUSTOMER_V2
```

---

## 🔗 **Related Tools**

- **`adt_generate_custom_query`** - Generate Abstract Entity + Query Provider
- **`adt_generate_rap_ui_service`** - Generate complete RAP UI Service
- **`adt_activate`** - Activate service definition
- **`adt_read_source`** - Read service definition source
- **`adt_update_and_activate`** - Update existing service definition

---

## 📚 **Related Documentation**

- [CUSTOM_QUERY_COMPLETE_WORKFLOW.md](./CUSTOM_QUERY_COMPLETE_WORKFLOW.md) - Complete workflow
- [CUSTOM_QUERY_GENERATOR_GUIDE.md](./CUSTOM_QUERY_GENERATOR_GUIDE.md) - Custom Query tool
- [RAP_UI_SERVICE_GENERATOR.md](./RAP_UI_SERVICE_GENERATOR.md) - RAP UI Service tool
- [README_NEW.md](./README_NEW.md) - All MCP ADT tools

---

## 🎉 **Summary**

The `adt_create_service_definition` tool provides:

- ✅ **Fast** service definition creation
- ✅ **Flexible** - supports any CDS entity
- ✅ **Complete** - creates with DDL source
- ✅ **Reliable** - proper locking and error handling
- ✅ **Integrated** - works with other MCP ADT tools

Perfect for building custom APIs, exposing RAP services, and creating flexible OData endpoints!

