# Client Parameter Feature Guide

**Feature Added:** November 22, 2025  
**Server:** On-Premise ADT MCP Server Only  
**Status:** ✅ Implemented

---

## 🎯 Purpose

Enable executing ABAP code and running unit tests in **different SAP clients** while developing in your default client. This is essential when:
- 📦 Development is in client **210** (development client)
- 🗄️ Test data exists in client **300** (test client)
- 🌍 Production data is in client **100** (production client)

**Key Principle:** ABAP code is client-independent (stored in repository), but **execution accesses client-specific data**.

---

## ✅ Tools with Client Parameter

### 1. **`adt_execute_class`** - Execute Class (F9)
Run a class's `if_oo_adt_classrun~main` method in a specific client.

**Usage:**
```javascript
// Execute in default client (210 from config)
adt_execute_class({
  class_name: "ZCL_CUSTOMER_REPORT"
})

// Execute in test client with test data
adt_execute_class({
  class_name: "ZCL_CUSTOMER_REPORT",
  client: "300"  // Override to use client 300's data
})

// Execute in production client to see production results
adt_execute_class({
  class_name: "ZCL_DATA_ANALYZER",
  client: "100"  // Use production client's data
})
```

**Example LLM Prompt:**
> "Execute the class ZCL_CUSTOMER_REPORT in client 300 to test with test data"

---

### 2. **`adt_run_tests`** - Run ABAP Unit Tests
Run unit tests in a specific client (useful if tests depend on client-specific data or configuration).

**Usage:**
```javascript
// Run tests in default client (210)
adt_run_tests({
  object_name: "ZCL_SALES_PROCESSOR",
  object_type: "CLAS"
})

// Run tests in test client
adt_run_tests({
  object_name: "ZCL_SALES_PROCESSOR",
  object_type: "CLAS",
  client: "300"  // Run tests with client 300's data
})
```

**Example LLM Prompt:**
> "Run the unit tests for ZCL_SALES_PROCESSOR in client 300 where we have the test configuration"

---

## ❌ Tools WITHOUT Client Parameter

These tools do **NOT** have a `client` parameter because they work with client-independent repository objects:

### Development/Write Operations
- ✏️ `adt_save_source` - Save code (always to dev client)
- 🔓 `adt_activate` - Activate objects (always in dev client)
- 📝 `adt_read_source` - Read code (client-independent)
- ✅ `adt_check_syntax` - Check syntax (client-independent)
- 🔨 `adt_create_*` - All creation tools (always in dev client)

**Why?** Development operations modify the **repository**, which is shared across all clients. Only the **configured development client** should be used for creating/modifying objects.

---

## 🔧 Technical Implementation

### Configuration (`.cursor/mcp.json`)

#### Basic Configuration (Same Credentials for All Clients)
```json
{
  "mcpServers": {
    "abap-adt-onprem": {
      "command": "node",
      "args": ["C:\\...\\server_adt.js"],
      "env": {
        "SAP_BASE_URL": "https://sap-server:44300",
        "SAP_USERNAME": "375551999",
        "SAP_PASSWORD": "B2Rise@fabiano2025",
        "SAP_CLIENT": "210",  // DEFAULT development client
        "SAP_AUTH_MODE": "basic",
        "SAP_LANGUAGE": "EN"
      }
    }
  }
}
```

#### Advanced Configuration (Different Credentials Per Client)
```json
{
  "mcpServers": {
    "abap-adt-onprem": {
      "command": "node",
      "args": ["C:\\...\\server_adt.js"],
      "env": {
        "SAP_BASE_URL": "https://sap-server:44300",
        "SAP_USERNAME": "375551999",
        "SAP_PASSWORD": "B2Rise@fabiano2025",
        "SAP_CLIENT": "210",
        "SAP_AUTH_MODE": "basic",
        "SAP_LANGUAGE": "EN",
        // Client-specific credentials (optional)
        "SAP_CLIENT_220_USERNAME": "user220",
        "SAP_CLIENT_220_PASSWORD": "password220",
        "SAP_CLIENT_300_USERNAME": "user300",
        "SAP_CLIENT_300_PASSWORD": "password300"
      }
    }
  }
}
```

**Pattern:** `SAP_CLIENT_<CLIENT_NUMBER>_USERNAME` and `SAP_CLIENT_<CLIENT_NUMBER>_PASSWORD`

### How It Works

**Default Behavior:**
- All operations use `SAP_CLIENT: "210"` from config
- Uses `SAP_USERNAME` and `SAP_PASSWORD` credentials
- HTTP header: `sap-client: 210`
- Uses shared axios instance with cached session and CSRF token

**With Client Override (Same Credentials):**
```javascript
adt_execute_class({ 
  class_name: "ZCL_TEST", 
  client: "300" 
})
```
- HTTP header: `sap-client: 300` (overrides default)
- Uses default `SAP_USERNAME` and `SAP_PASSWORD`
- Uses shared axios instance with cached session
- Code executes in client 300's context
- Accesses client 300's data (tables, config, etc.)

**With Client Override (Client-Specific Credentials):**
```javascript
adt_execute_class({ 
  class_name: "ZCL_TEST", 
  client: "220" 
})
```
If `SAP_CLIENT_220_USERNAME` and `SAP_CLIENT_220_PASSWORD` are configured:
- **Creates a FRESH axios instance** (no session contamination)
- **Fetches a fresh CSRF token** for client 220
- HTTP header: `sap-client: 220`
- Uses `SAP_CLIENT_220_USERNAME` and `SAP_CLIENT_220_PASSWORD` credentials
- **Completely isolated session** from default client
- Code executes in client 220's context with client 220's credentials

**🔑 Key Technical Detail:** When using client-specific credentials, the system creates completely fresh HTTP sessions to avoid cookie/CSRF token contamination between clients. This ensures true client isolation.

### Code Changes

**Key Methods Added:**

1. **`getClientSpecificCsrfToken(client, username, password)`**
```javascript
async getClientSpecificCsrfToken(client, username, password) {
  // CRITICAL: Create FRESH axios instance (no shared session state)
  const freshAxios = axios.create({
    baseURL: SAP_CONFIG.baseUrl,
    timeout: 300000,
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
      keepAlive: true
    })
  });
  
  // Fetch CSRF token with client-specific credentials
  const response = await freshAxios.get('/sap/bc/adt/discovery', {
    headers: {
      'X-CSRF-Token': 'Fetch',
      'sap-client': client,
      'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
    }
  });
  
  return {
    csrfToken: response.headers['x-csrf-token'],
    cookies: response.headers['set-cookie'] || []
  };
}
```

2. **`executeClass(className, client = null)` - Updated**
```javascript
async executeClass(className, client = null) {
  const headers = {
    'Accept': 'text/plain',
    'X-sap-adt-sessiontype': 'stateful'
  };
  
  if (client) {
    headers['sap-client'] = client;
    
    // Check for client-specific credentials
    const clientUsername = process.env[`SAP_CLIENT_${client}_USERNAME`];
    const clientPassword = process.env[`SAP_CLIENT_${client}_PASSWORD`];
    
    if (clientUsername && clientPassword) {
      // Get fresh CSRF token for this client
      const { csrfToken, cookies } = await this.getClientSpecificCsrfToken(
        client, clientUsername, clientPassword
      );
      
      // Set headers with client-specific auth
      headers['Authorization'] = `Basic ${Buffer.from(
        `${clientUsername}:${clientPassword}`
      ).toString('base64')}`;
      headers['X-CSRF-Token'] = csrfToken;
      headers['Cookie'] = cookies.map(c => c.split(';')[0]).join('; ');
      
      // CRITICAL: Use FRESH axios instance (no session contamination)
      const freshAxios = axios.create({
        baseURL: SAP_CONFIG.baseUrl,
        timeout: 300000,
        httpsAgent: new https.Agent({ rejectUnauthorized: false, keepAlive: true })
      });
      
      return await freshAxios.post(executeUrl, '', { headers });
    } else {
      // Use default credentials with shared session
      await this.getCsrfToken();
      headers['X-CSRF-Token'] = this.csrfToken;
      // Update usercontext cookie for client override
    }
  } else {
    // Default client - use shared session
    await this.getCsrfToken();
    headers['X-CSRF-Token'] = this.csrfToken;
  }
  
  return await this.client.post(executeUrl, '', { headers });
}
```

**Why Fresh Axios Instances?**
- Prevents cookie contamination between client 210 and client 220 sessions
- Ensures CSRF tokens are client-specific
- Provides true session isolation for different clients

---

## 📊 Use Cases

### Use Case 1: Testing with Real Data
```
Scenario: You develop in client 210, but test data is maintained in client 300

Solution:
1. Develop code in client 210 (default)
   - adt_save_source() → client 210
   - adt_activate() → client 210

2. Execute with test data from client 300
   - adt_execute_class({ ..., client: "300" }) → uses client 300 data

Result: Code is developed in 210, but runs with data from 300
```

### Use Case 2: Production Validation
```
Scenario: Validate code behavior with production data (read-only execution)

Solution:
- adt_execute_class({ 
    class_name: "ZCL_DATA_ANALYZER", 
    client: "100" 
  })

Result: See actual production results without affecting production client
```

### Use Case 3: Multi-Client Testing
```
Scenario: Test behavior across different clients (dev, test, prod)

Solution:
1. Execute in dev: adt_execute_class({ class_name: "ZCL_TEST" })
2. Execute in test: adt_execute_class({ class_name: "ZCL_TEST", client: "300" })
3. Execute in prod: adt_execute_class({ class_name: "ZCL_TEST", client: "100" })

Result: Compare results across all clients to identify client-specific issues
```

---

## ⚠️ Important Notes

### 1. **BTP Systems**
This feature is **ON-PREMISE ONLY**. BTP systems typically have a single client (100) and don't require this functionality.

### 2. **Security Considerations**
- You must have authorization to execute code in the target client
- SAP will enforce standard authorization checks (S_DEVELOP, etc.)
- Use production client access responsibly (read-only validation)

### 3. **Development Best Practices**
- ✅ **Always develop in the configured development client** (210)
- ✅ **Use client parameter only for execution/testing**
- ❌ **Never save/activate in non-dev clients** (not supported anyway)

### 4. **Default Behavior Unchanged**
If you don't specify `client` parameter:
- ✅ Everything works exactly as before
- ✅ Uses default client from configuration
- ✅ Backward compatible with all existing workflows

---

## 🧪 Testing the Feature

After restarting Cursor to load the new MCP server:

```javascript
// Test 1: Execute in default client
adt_execute_class({ class_name: "ZCL_MY_CLASS" })
// Expected: Runs in client 210 (default)

// Test 2: Execute in different client
adt_execute_class({ class_name: "ZCL_MY_CLASS", client: "300" })
// Expected: Runs in client 300

// Check logs to verify:
// [EXECUTE CLASS] 🎯 Client: 300 (override)
```

---

## 🎓 LLM Usage Examples

### Example 1: Direct Client Specification
**User:** "Execute ZCL_SALES_REPORT in client 300"

**LLM:** 
```javascript
adt_execute_class({
  class_name: "ZCL_SALES_REPORT",
  client: "300"
})
```

### Example 2: Testing Workflow
**User:** "Run the class in both test and production to compare results"

**LLM:** 
```javascript
// Execute in test client
adt_execute_class({
  class_name: "ZCL_DATA_PROCESSOR",
  client: "300"
})

// Execute in production client
adt_execute_class({
  class_name: "ZCL_DATA_PROCESSOR",
  client: "100"
})
```

### Example 3: Default Behavior
**User:** "Execute ZCL_MY_REPORT"

**LLM:** 
```javascript
// Uses default client (210) - no client parameter needed
adt_execute_class({
  class_name: "ZCL_MY_REPORT"
})
```

---

## 📝 Summary

| Aspect | Details |
|--------|---------|
| **Tools Modified** | `adt_execute_class`, `adt_run_tests` |
| **Parameter** | `client` (optional string, e.g., "300") |
| **Default** | Uses `SAP_CLIENT` from config if not specified |
| **System** | On-Premise only (not BTP) |
| **Impact** | Zero impact on existing workflows (backward compatible) |
| **Use Case** | Execute/test code with data from different clients |

---

**Status:** ✅ Ready to use after restarting Cursor to load the updated MCP server.

