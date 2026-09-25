# ALWAYS_READ Reminder Implementation

## Overview
Added automatic reminder to all MCP tool descriptions to ensure the AI agent reads `ALWAYS_READ.md` before using any tool.

## Implementation Date
January 13, 2026

## What Was Changed

### 1. Helper Function Added
**Location:** `ADT/server_adt.js` (line 72-79)

```javascript
/**
 * Helper function to prepend ALWAYS_READ reminder to all tool descriptions
 * This ensures the AI agent sees the reminder BEFORE calling any tool
 */
function prependAlwaysReadReminder(description) {
  const reminder = `⚠️ CRITICAL: Before using this tool, read ALWAYS_READ.md for mandatory rules and patterns. `;
  return reminder + description;
}
```

### 2. Applied to All Tool Descriptions
**Total tools updated:** 41 tools

All tool descriptions now start with:
```
⚠️ CRITICAL: Before using this tool, read ALWAYS_READ.md for mandatory rules and patterns.
```

### 3. Example
**Before:**
```javascript
{
  name: 'adt_create_class',
  description: 'Create a new ABAP class in SAP system...'
}
```

**After:**
```javascript
{
  name: 'adt_create_class',
  description: prependAlwaysReadReminder('Create a new ABAP class in SAP system...')
}
```

**LLM sees:**
```
⚠️ CRITICAL: Before using this tool, read ALWAYS_READ.md for mandatory rules and patterns. Create a new ABAP class in SAP system...
```

## Why This Approach?

### ✅ Correct: Reminder in Tool Description (BEFORE execution)
- LLM sees the reminder when **deciding** which tool to call
- LLM can read ALWAYS_READ.md **before** making the tool call
- Ensures correct parameters and patterns are used from the start

### ❌ Wrong: Reminder in Tool Response (AFTER execution)
- Tool has already been called (too late!)
- LLM already made decisions without reading the rules
- Can lead to incorrect usage patterns

## Benefits

1. **Proactive Guidance:** LLM is reminded before every tool call
2. **Consistent Enforcement:** All 41 tools have the same reminder
3. **Reduced Errors:** LLM reads critical rules before acting
4. **No Manual Intervention:** Automatic reminder on every tool

## Testing

After implementation, restart MCP server and verify:
```javascript
// LLM will see this in tool list:
{
  name: 'adt_execute_sql_query',
  description: '⚠️ CRITICAL: Before using this tool, read ALWAYS_READ.md for mandatory rules and patterns. 📊 Execute SQL SELECT Query...'
}
```

## Files Modified
- `ADT/server_adt.js` - Added helper function and updated all 41 tool descriptions

## Maintenance
When adding new tools, ensure the description uses:
```javascript
description: prependAlwaysReadReminder('Your tool description here')
```
