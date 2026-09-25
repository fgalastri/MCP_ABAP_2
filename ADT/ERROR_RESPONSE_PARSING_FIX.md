# 🔧 ADT Error Response Parsing - Fix Required

**Issue:** SAP returns XML error responses but we're just JSON.stringify-ing them instead of parsing to extract the actual error message.

---

## 🐛 CURRENT PROBLEM

### What We're Doing (Wrong):
```javascript
**Details:**
${result.details ? JSON.stringify(result.details, null, 2) : 'No additional details'}
```

**Output:**
```
**Details:**
"<?xml version=\"1.0\" encoding=\"utf-8\"?><exc:exception xmlns:exc=\"http://www.sap.com/abapxml/types/communicationframework\">..."
```

### What We Should Do (Right):
Parse the XML and extract the human-readable error message!

---

## ✅ SOLUTION

### Add Error Parser Function

**Location:** `ADT/server_adt.js` (add near top with other utilities)

```javascript
/**
 * Parse SAP ADT error response (XML) and extract meaningful error message
 * @param {string|object} errorData - Error response from SAP (XML string or object)
 * @returns {string} - Human-readable error message
 */
function parseAdtError(errorData) {
  if (!errorData) return 'No error details available';
  
  // If already a string, check if it's XML
  if (typeof errorData === 'string') {
    // Check if it's XML
    if (errorData.trim().startsWith('<?xml') || errorData.trim().startsWith('<')) {
      try {
        const parsed = xmlParser.parse(errorData);
        
        // Try to extract exception message
        if (parsed['exc:exception']) {
          const exception = parsed['exc:exception'];
          const message = exception['message'] || exception['localizedMessage'] || exception['@_message'];
          const type = exception['type'] || exception['@_type'];
          
          if (message && type) {
            return `${type}: ${message}`;
          } else if (message) {
            return message;
          }
          
          // Try to get T100 message details
          if (exception['properties'] && exception['properties']['entry']) {
            const entries = Array.isArray(exception['properties']['entry']) 
              ? exception['properties']['entry'] 
              : [exception['properties']['entry']];
              
            const t100 = {};
            for (const entry of entries) {
              const key = entry['@_key'];
              const value = entry['#text'] || '';
              if (key && key.startsWith('T100KEY-')) {
                t100[key.replace('T100KEY-', '')] = value;
              }
            }
            
            if (t100.ID && t100.NO) {
              return `${message || 'Error'} (Message ${t100.ID}/${t100.NO})`;
            }
          }
        }
        
        // Try to extract messages from other common SAP error formats
        if (parsed['errors'] && parsed['errors']['error']) {
          const errors = Array.isArray(parsed['errors']['error']) 
            ? parsed['errors']['error'] 
            : [parsed['errors']['error']];
          return errors.map(e => e.message || e['@_message'] || '').join('; ');
        }
        
      } catch (parseError) {
        // If XML parsing fails, return raw string (might be HTML error)
        // Extract plain text if it's HTML
        if (errorData.includes('<html') || errorData.includes('<HTML')) {
          // Try to extract meaningful text from HTML
          const textMatch = errorData.match(/<body[^>]*>(.*?)<\/body>/is);
          if (textMatch) {
            return textMatch[1].replace(/<[^>]+>/g, '').trim();
          }
        }
        return errorData.substring(0, 500); // First 500 chars of raw response
      }
    }
    
    // Not XML, return as-is (might be plain text error)
    return errorData;
  }
  
  // If it's an object, try to extract message
  if (typeof errorData === 'object') {
    return JSON.stringify(errorData, null, 2);
  }
  
  return String(errorData);
}
```

---

## 🔄 UPDATE ALL ERROR HANDLERS

### Pattern to Replace:

**BEFORE:**
```javascript
} else {
  responseText = `❌ **Failed to Create Table ${args.table_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**Possible reasons:**
- Table already exists
- Transport request doesn't exist or is locked

**Details:**
${result.details ? JSON.stringify(result.details, null, 2) : 'No additional details'}
`;
}
```

**AFTER:**
```javascript
} else {
  const parsedError = parseAdtError(result.details);
  
  responseText = `❌ **Failed to Create Table ${args.table_name}**

**Error:** ${result.error}
**HTTP Status:** ${result.httpStatus || 'Unknown'}

**SAP Error Message:**
${parsedError}

**Possible reasons:**
- Table already exists
- Transport request doesn't exist or is locked
- Package doesn't exist or no authorization
- Invalid table name format
`;
}
```

---

## 📋 TOOLS TO UPDATE

Apply this pattern to ALL tool error handlers:

1. ✅ `adt_create_table`
2. ✅ `adt_create_class`
3. ✅ `adt_create_interface`
4. ✅ `adt_create_program`
5. ✅ `adt_create_cds_view`
6. ✅ `adt_create_service_definition`
7. ✅ `adt_create_service_binding`
8. ✅ `adt_create_data_element`
9. ✅ `adt_create_domain`
10. ✅ `adt_create_table_type`
11. ✅ `adt_create_structure`
12. ✅ `adt_create_behavior_definition`
13. ✅ `adt_save_source`
14. ✅ `adt_update_and_activate`
15. ✅ `adt_activate`
16. ✅ `adt_generate_rap_ui_service`
17. ✅ `adt_generate_custom_query`

---

## 📊 BEFORE vs AFTER EXAMPLES

### Example 1: Package Doesn't Exist

**BEFORE:**
```
**Details:**
"<?xml version=\"1.0\" encoding=\"utf-8\"?><exc:exception xmlns:exc=\"http://www.sap.com/abapxml/types/communicationframework\"><namespace id=\"com.sap.adt\"/><type id=\"ExceptionResourceLockConflict\"/><message lang=\"EN\">Package ZFG1 does not exist</message>..."
```

**AFTER:**
```
**SAP Error Message:**
ExceptionResourceLockConflict: Package ZFG1 does not exist (Message TR/414)
```

### Example 2: Table Already Exists

**BEFORE:**
```
**Details:**
"<?xml version=\"1.0\" encoding=\"utf-8\"?><exc:exception xmlns:exc=\"http://www.sap.com/abapxml/types/communicationframework\"><type id=\"ExceptionResourceAlreadyExists\"/><message lang=\"EN\">Resource Data Definition ZRAP_MAT already exists</message>..."
```

**AFTER:**
```
**SAP Error Message:**
ExceptionResourceAlreadyExists: Resource Data Definition ZRAP_MAT already exists
```

### Example 3: Session Timeout (HTML)

**BEFORE:**
```
**Details:**
"400 Session Timed Out\r\n\r\n 2025-10-24 14:37:34"
```

**AFTER:**
```
**SAP Error Message:**
400 Session Timed Out
2025-10-24 14:37:34
```

---

## 🎯 BENEFITS

1. **Clearer Error Messages:**
   - Users see actual SAP error, not XML dump
   - Faster problem identification
   - Better debugging experience

2. **Consistent Error Format:**
   - All tools show errors the same way
   - Easy to parse error patterns
   - Better for error handling in agents

3. **Handles Multiple Formats:**
   - XML error responses (most common)
   - HTML error responses (session timeouts)
   - Plain text errors
   - JSON error responses

4. **Extracts Additional Context:**
   - Error type (ExceptionResourceAlreadyExists, etc.)
   - T100 message IDs for SAP documentation lookup
   - Localized messages in user's language

---

## 🚀 IMPLEMENTATION PLAN

### Phase 1: Add Parser Function (15 mins)
```javascript
// Add parseAdtError function to server_adt.js
// Test with known error XML strings
```

### Phase 2: Update Tool Handlers (1 hour)
```javascript
// Update all 17 tool handlers to use parseAdtError
// Test each tool with error scenarios
```

### Phase 3: Test Error Scenarios (30 mins)
```javascript
// Create table that already exists
// Use invalid package name
// Use locked transport
// Trigger session timeout
// Verify all show clear error messages
```

### Phase 4: Document (15 mins)
```javascript
// Update tool documentation with error message examples
// Add troubleshooting guide with common errors
// Update MFR with error handling improvements
```

---

## 📝 TESTING CHECKLIST

- [ ] Parse XML exception with message
- [ ] Parse XML exception with localizedMessage
- [ ] Parse T100 message details
- [ ] Handle HTML error responses
- [ ] Handle plain text errors
- [ ] Handle JSON error objects
- [ ] Handle null/undefined errorData
- [ ] Handle malformed XML gracefully
- [ ] Extract error type when available
- [ ] Limit very long error messages

---

## 💡 ADDITIONAL IMPROVEMENTS

### 1. Add Error Code Lookup
```javascript
const ERROR_CODES = {
  'ExceptionResourceAlreadyExists': 'Object already exists in the system',
  'ExceptionResourceLockConflict': 'Object is locked or package/transport issue',
  'ExceptionUnprocessableEntity': 'Invalid data or business rule violation',
  'SessionTimedOut': 'SAP session expired - retry operation'
};
```

### 2. Add Actionable Suggestions
```javascript
const ERROR_ACTIONS = {
  'ExceptionResourceAlreadyExists': [
    'Check if object exists: adt_read_source',
    'Delete existing object first',
    'Use different name'
  ],
  'ExceptionResourceLockConflict': [
    'Verify package exists in system',
    'Check transport request is open',
    'Verify user authorization'
  ]
};
```

### 3. Add Error History
```javascript
// Track common errors to improve UX
const errorHistory = [];
function logError(tool, error, parsedMessage) {
  errorHistory.push({
    timestamp: new Date(),
    tool,
    error,
    parsedMessage
  });
}
```

---

**Status:** 🔴 HIGH PRIORITY - Improves error visibility significantly  
**Effort:** ~2 hours total  
**Impact:** Better debugging for all users and agents

