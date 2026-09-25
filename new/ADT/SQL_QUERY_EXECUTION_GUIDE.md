# SQL Query Execution Tool - Complete Guide

## Overview

The `adt_execute_sql_query` tool enables direct execution of SQL SELECT statements against SAP systems, providing powerful data exploration, validation, and testing capabilities through the ADT Data Preview API (F8 functionality).

---

## 🎯 **Key Features**

### ✅ **What It Does**
- Executes **read-only** SQL SELECT statements
- Returns structured results with column metadata
- Supports WHERE clauses, JOINs, aggregations, subqueries
- Works with database tables, CDS views, and table functions
- Provides execution time and row count statistics
- Formats results in readable markdown tables

### 🔒 **Security**
- **READ-ONLY**: Only SELECT statements allowed
- Rejects INSERT, UPDATE, DELETE, DROP, CREATE, etc.
- Respects SAP authorization (`S_TABU_NAM`, `S_TABU_DIS`)
- Supports client-specific credentials for multi-client scenarios

### 🚀 **Performance**
- Configurable row limits (1-10,000 rows)
- Returns execution time in milliseconds
- Optimized for data preview (not full exports)
- Use `UP TO n ROWS` in SQL for server-side limiting

---

## 📋 **Tool Signature**

```javascript
adt_execute_sql_query({
  sql_query: string,      // Required: SQL SELECT statement
  max_rows: number,       // Optional: Max rows (default: 100)
  client: string          // Optional: SAP client override
})
```

### **Parameters**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `sql_query` | string | ✅ Yes | - | SQL SELECT statement to execute |
| `max_rows` | number | ❌ No | 100 | Maximum rows to return (1-10,000) |
| `client` | string | ❌ No | Config default | SAP client to query (e.g., "210") |

---

## 🔧 **Usage Examples**

### **Example 1: Simple Table Query**

```javascript
adt_execute_sql_query({
  sql_query: "SELECT matnr, maktx, mtart FROM mara UP TO 5 ROWS"
})
```

**Output:**
```
✅ SQL Query Executed Successfully

Query Summary:
- Total Rows Found: 5
- Rows Returned: 5
- Execution Time: 29.11 ms
- Columns: 3

Column Metadata:
- MATNR (C): Material Number
- MAKTX (C): Material Description
- MTART (C): Material Type

Results Table:
| MATNR | MAKTX | MTART |
| --- | --- | --- |
| 50178299 | Material A | FERT |
| 50264612 | Material B | FERT |
```

---

### **Example 2: Query with WHERE Clause**

```javascript
adt_execute_sql_query({
  sql_query: `
    SELECT 
      matnr, 
      maktx, 
      mtart,
      meins
    FROM mara
    WHERE mtart = 'FERT'
    AND meins = 'EA'
  `,
  max_rows: 10
})
```

---

### **Example 3: Query CDS View**

```javascript
adt_execute_sql_query({
  sql_query: `
    SELECT 
      ID, 
      CHECKFLG, 
      STATUS, 
      MATERIAL, 
      QUANTIDADE
    FROM ZPTP_C_PED_ABAST
    WHERE PEDIDO <> '23423'
  `,
  max_rows: 20
})
```

---

### **Example 4: JOIN Query**

```javascript
adt_execute_sql_query({
  sql_query: `
    SELECT 
      m.matnr,
      m.maktx,
      mb.werks,
      mb.labst
    FROM mara AS m
    INNER JOIN mard AS mb
      ON m.matnr = mb.matnr
    WHERE mb.werks = '1000'
    UP TO 10 ROWS
  `
})
```

---

### **Example 5: Aggregation Query**

```javascript
adt_execute_sql_query({
  sql_query: `
    SELECT 
      werks AS plant,
      COUNT(*) AS material_count,
      SUM(labst) AS total_stock
    FROM mard
    GROUP BY werks
    ORDER BY total_stock DESC
  `,
  max_rows: 50
})
```

---

### **Example 6: Multi-Client Query**

Query data from a specific client (e.g., QA client 210):

```javascript
adt_execute_sql_query({
  sql_query: "SELECT * FROM zkna1_custom WHERE kunnr LIKE 'C%'",
  max_rows: 100,
  client: "210"
})
```

---

## 📊 **Response Structure**

### **Success Response**

```javascript
{
  success: true,
  totalRows: 12,                    // Total rows found (before limit)
  executionTime: 29.105,            // Execution time in ms
  columns: [                        // Column metadata
    {
      name: "MATNR",
      type: "C",                    // ABAP type (C=CHAR, N=NUMC, P=PACKED, etc.)
      description: "Material Number",
      isKeyAttribute: false,
      isKeyFigure: false
    },
    // ... more columns
  ],
  rows: [                           // Result rows
    {
      "MATNR": "50178299",
      "MAKTX": "Material A",
      // ... more fields
    },
    // ... more rows
  ],
  executedQuery: "SELECT ...",      // The actual SQL executed by SAP
  originalQuery: "SELECT ..."       // Your original query
}
```

### **Error Response**

```javascript
{
  success: false,
  error: "Syntax error in SQL statement",
  httpStatus: 400,
  hint: "Check SQL syntax and ensure you have authorization to read the data",
  sqlQuery: "SELECT ...",
  details: { /* ADT error details */ }
}
```

---

## 🎨 **ABAP Data Types**

The tool returns SAP ABAP data types in the `columns.type` field:

| Type | Description | Example |
|------|-------------|---------|
| `C` | Character (CHAR) | "Material A" |
| `N` | Numeric Character (NUMC) | "12345" |
| `D` | Date (YYYYMMDD) | "20250103" |
| `T` | Time (HHMMSS) | "143025" |
| `I` | Integer (INT4) | 42 |
| `P` | Packed Number (DEC) | 123.45 |
| `X` | Hexadecimal (RAW) | Binary data |
| `g` | String (STRING) | Long text |

---

## 🛠️ **Advanced Features**

### **1. Row Limiting**

**Client-Side Limit (max_rows):**
```javascript
adt_execute_sql_query({
  sql_query: "SELECT * FROM mara",
  max_rows: 100  // ADT API limits response to 100 rows
})
```

**Server-Side Limit (UP TO):**
```javascript
adt_execute_sql_query({
  sql_query: "SELECT * FROM mara UP TO 50 ROWS",
  max_rows: 100  // Will return 50 rows (server limit applies first)
})
```

**Best Practice:** Use `UP TO n ROWS` for better performance

---

### **2. Handling Large Result Sets**

For large datasets, paginate using `OFFSET`:

```javascript
// Page 1
adt_execute_sql_query({
  sql_query: "SELECT * FROM mara ORDER BY matnr OFFSET 0 UP TO 100 ROWS"
})

// Page 2
adt_execute_sql_query({
  sql_query: "SELECT * FROM mara ORDER BY matnr OFFSET 100 UP TO 100 ROWS"
})
```

---

### **3. Formatted Output**

The tool automatically formats results as markdown tables:

- ✅ Truncates long values (> 50 chars)
- ✅ Shows first 20 rows in table (full data available in response)
- ✅ Displays metadata (types, descriptions)
- ✅ Includes execution statistics

---

### **4. Case Insensitivity**

SQL keywords and table names are case-insensitive:

```javascript
// All valid
"SELECT * FROM MARA"
"select * from mara"
"SeLeCt * FrOm MaRa"
```

---

### **5. Field Qualification**

Use `~` for table qualification (ABAP syntax):

```javascript
adt_execute_sql_query({
  sql_query: `
    SELECT 
      ZPTP_C_PED_ABAST~ID,
      ZPTP_C_PED_ABAST~MATERIAL,
      ZPTP_C_PED_ABAST~QUANTIDADE
    FROM ZPTP_C_PED_ABAST
  `
})
```

Or standard SQL dot notation:

```javascript
"SELECT m.matnr, m.maktx FROM mara AS m"
```

---

## 🔍 **Common Use Cases**

### **1. Data Validation**

Verify data after RAP service operations:

```javascript
// After creating a record via RAP
adt_execute_sql_query({
  sql_query: `
    SELECT * 
    FROM ZRAP_MATERIAL 
    WHERE material_id = '50264612'
  `
})
```

---

### **2. Testing Business Logic**

Check calculated fields:

```javascript
adt_execute_sql_query({
  sql_query: `
    SELECT 
      material,
      quantidade,
      quantped,
      (quantidade - quantped) AS difference
    FROM ZPTP_C_PED_ABAST
    WHERE quantidade <> quantped
  `
})
```

---

### **3. Cross-System Comparison**

Compare data between DEV and QA:

```javascript
// In DEV
adt_switch_system({ system: "DEV" })
const devData = adt_execute_sql_query({
  sql_query: "SELECT COUNT(*) AS count FROM ZMATERIAL"
})

// In QA
adt_switch_system({ system: "QA" })
const qaData = adt_execute_sql_query({
  sql_query: "SELECT COUNT(*) AS count FROM ZMATERIAL"
})
```

---

### **4. Data Exploration**

Discover table structure and sample data:

```javascript
// Get sample data with all fields
adt_execute_sql_query({
  sql_query: "SELECT * FROM ZTBL_MY_TABLE UP TO 5 ROWS"
})
```

---

### **5. Performance Testing**

Measure query execution time:

```javascript
adt_execute_sql_query({
  sql_query: `
    SELECT COUNT(*) AS total
    FROM very_large_table
    WHERE complex_condition = 'X'
  `
})
// Check executionTime in response
```

---

## ⚠️ **Limitations & Restrictions**

### **1. Read-Only**
- ❌ Cannot execute INSERT, UPDATE, DELETE
- ❌ Cannot execute DDL (CREATE, DROP, ALTER)
- ❌ Cannot call stored procedures (CALL)
- ✅ Only SELECT statements allowed

### **2. Row Limits**
- Maximum: 10,000 rows per query
- Default: 100 rows
- Use pagination for larger datasets

### **3. Authorization**
- Requires `S_TABU_NAM` (table authorization)
- Requires `S_TABU_DIS` (table display authorization)
- Respects table authorization groups

### **4. Timeout**
- Query timeout: 5 minutes (300 seconds)
- Use WHERE clauses and indexes for performance

### **5. Special Characters**
- Escape single quotes: `'O''REILLY'` (not `'O'REILLY'`)
- Use Unicode-safe strings

---

## 🐛 **Troubleshooting**

### **Error: "Only SELECT statements are allowed"**

**Cause:** Query contains non-SELECT statement

**Solution:**
```javascript
// ❌ Wrong
"INSERT INTO table VALUES (...)"
"UPDATE table SET ..."

// ✅ Correct
"SELECT * FROM table"
```

---

### **Error: "Syntax error in SQL statement"**

**Cause:** Invalid SQL syntax

**Solution:**
- Check for typos in table/field names
- Verify SQL keywords (WHERE, FROM, etc.)
- Test query in Eclipse Data Preview (F8) first

---

### **Error: "Authorization check failed"**

**Cause:** Missing authorization for table

**Solution:**
- Check `S_TABU_NAM` authorization
- Contact SAP Basis team
- Use a different user with authorization

---

### **Error: "Table or view not found"**

**Cause:** Table/CDS view doesn't exist or not visible

**Solution:**
```javascript
// Check table existence
adt_execute_sql_query({
  sql_query: "SELECT tabname FROM dd02l WHERE tabname LIKE 'ZMATERIAL%'"
})
```

---

### **Empty Result Set**

**Cause:** Query returns no rows (valid scenario)

**Response:**
```
Total Rows Found: 0
Rows Returned: 0
```

**Solution:**
- Verify WHERE conditions
- Check if data exists in the system/client

---

### **Execution Timeout**

**Cause:** Query takes > 5 minutes

**Solution:**
- Add WHERE clause to filter data
- Use indexes (check with `SE11` or `ST05`)
- Limit rows with `UP TO n ROWS`
- Split into smaller queries

---

## 🎓 **Best Practices**

### **1. Use Explicit Column Names**

```javascript
// ✅ Good: Clear, maintainable
"SELECT matnr, maktx, mtart FROM mara"

// ❌ Avoid: Returns too many columns
"SELECT * FROM mara"
```

---

### **2. Always Limit Rows**

```javascript
// ✅ Good: Server-side limit
"SELECT * FROM large_table UP TO 100 ROWS"

// ⚠️ OK: Client-side limit
adt_execute_sql_query({
  sql_query: "SELECT * FROM large_table",
  max_rows: 100
})

// ❌ Bad: Potentially millions of rows
"SELECT * FROM large_table"
```

---

### **3. Use WHERE Clauses**

```javascript
// ✅ Good: Filtered query
"SELECT * FROM mara WHERE mtart = 'FERT' AND werks = '1000'"

// ❌ Bad: Full table scan
"SELECT * FROM mara"
```

---

### **4. Test Complex Queries First**

Test in Eclipse Data Preview (F8) before using the tool:

1. Open Eclipse ADT
2. Right-click table/CDS view → Open With → Data Preview
3. Enter your SQL in freestyle mode
4. Verify results
5. Copy to `adt_execute_sql_query`

---

### **5. Handle Large Numbers Carefully**

ABAP packed numbers (type `P`) may lose precision:

```javascript
// For financial calculations
"SELECT CAST(amount AS DECIMAL(15,2)) AS amount FROM table"
```

---

## 🔗 **Integration with Other Tools**

### **With System Switching**

```javascript
// Switch to QA
adt_switch_system({ system: "QA" })

// Query QA data
adt_execute_sql_query({
  sql_query: "SELECT * FROM ZPTP_C_PED_ABAST WHERE status = 'Pendente'"
})

// Switch back to DEV
adt_switch_system({ system: "DEV" })
```

---

### **With RAP Services**

```javascript
// 1. Create record via RAP
adt_create_class("ZCL_MY_TEST", "Test Class", "ZPACKAGE", "S4HK908550")

// 2. Verify creation
adt_execute_sql_query({
  sql_query: "SELECT COUNT(*) FROM tadir WHERE obj_name = 'ZCL_MY_TEST'"
})
```

---

### **With Class Execution**

```javascript
// 1. Execute business logic
adt_execute_class("ZCL_DATA_PROCESSOR", "210")

// 2. Verify results
adt_execute_sql_query({
  sql_query: "SELECT * FROM ZPROCESSED_DATA WHERE processed_date = TODAY()",
  client: "210"
})
```

---

## 📈 **Performance Tips**

1. **Use Indexes:** Ensure WHERE clause fields are indexed
2. **Server-Side Limits:** Use `UP TO n ROWS` in SQL
3. **Selective Columns:** Only select needed columns
4. **Avoid Functions:** `WHERE field = value` (not `WHERE UPPER(field) = 'VALUE'`)
5. **Use Buffered Tables:** Faster for small reference tables

---

## 🎉 **Summary**

The `adt_execute_sql_query` tool provides powerful SQL query capabilities:

✅ **Read-only** data access (secure)  
✅ **Flexible** (WHERE, JOIN, GROUP BY, etc.)  
✅ **Multi-client** support  
✅ **Rich metadata** (types, descriptions)  
✅ **Formatted output** (markdown tables)  
✅ **Performance metrics** (execution time, row counts)  

**Perfect for:**
- Data validation after RAP operations
- Testing business logic
- Cross-system data comparison
- Data exploration and analysis
- Debugging and troubleshooting

---

## 📚 **Related Documentation**

- [CLIENT_PARAMETER_GUIDE.md](CLIENT_PARAMETER_GUIDE.md) - Multi-client execution
- [SYSTEM_SWITCHING_GUIDE.md](SYSTEM_SWITCHING_GUIDE.md) - Switching between systems
- [ENHANCED_TOOLS_COMPLETE_GUIDE.md](ENHANCED_TOOLS_COMPLETE_GUIDE.md) - All 35 tools

---

**Happy Querying! 🚀**

