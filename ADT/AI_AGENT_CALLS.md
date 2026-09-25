# AI Agent Guide: How to Call ADT MCP Tools

## 🤖 Overview

This guide is for **AI agents** (like Claude, GPT-4, or custom LLMs) that have access to the ADT MCP server tools. It explains when and how to use each tool effectively.

---

## 🎯 Decision Tree: Which Tool to Use?

```
User wants to...
│
├─ READ code?
│  └─ Use: adt_read_source
│
├─ VALIDATE before saving?
│  └─ Use: adt_check_syntax_unsaved ⭐ RECOMMENDED
│
├─ CREATE new class?
│  └─ Use: adt_create_class → adt_save_source → adt_activate
│
├─ MODIFY single object?
│  └─ Use: adt_update_and_activate ⭐ FAST PATH
│
├─ MODIFY multiple related objects?
│  └─ Use: adt_save_source (×N) → adt_activate ⭐ BATCH
│
├─ CHECK saved code syntax?
│  └─ Use: adt_check_syntax
│
└─ ACTIVATE locked objects?
   └─ Use: adt_activate (unlocks + activates)
```

---

## 📋 Tool Reference

### 1️⃣ `adt_read_source` - Read ABAP Code

**When to use:**
- User asks to "show me", "read", "get", "display" code
- Need current code before making changes
- Analyzing existing code
- Comparing versions

**Parameters:**
```json
{
  "object_name": "ZCL_MY_CLASS",
  "object_type": "CLAS"
}
```

**Object Types:**
- `CLAS` or `CLASS` - ABAP Class
- `INTF` or `INTERFACE` - ABAP Interface  
- `PROG` or `REPORT` - ABAP Program
- `DDLS` or `CDS` - CDS View
- `FUGR` or `FUNCTION_GROUP` - Function Group
- `TABL` or `TABLE` - Database Table

**Example Prompts:**
- ✅ "Show me the code for class ZCL_TEST"
- ✅ "Read the source of program ZMCP_DEMO"
- ✅ "What's in interface ZIF_MY_INTERFACE?"

**Agent Response Pattern:**
```
I'll read the class ZCL_TEST for you.

[Call adt_read_source with appropriate parameters]

Here's the source code:
[Display the returned source code]
```

---

### 2️⃣ `adt_save_source` - Save and Check (Keeps Locked)

**Workflow:** Lock → Save → Syntax Check (object remains 🔒 LOCKED)

**When to use:**
- **Batch operations** - saving multiple related objects
- User explicitly says "save but don't activate"
- Building multiple objects before mass activation
- Want to save and check, activate later

**⚠️ IMPORTANT:** 
- Object remains **LOCKED** after save for batch activation
- Use `adt_activate` to unlock and activate
- For single objects, prefer `adt_update_and_activate`

**Parameters:**
```json
{
  "object_name": "ZCL_MY_CLASS",
  "object_type": "CLAS",
  "source_code": "CLASS zcl_my_class DEFINITION...\n[complete source]"
}
```

**Example Prompts:**
- ✅ "Save this change but don't activate yet"
- ✅ "Update all three classes then activate them together"
- ✅ "Save the class and interface, I'll activate both later"

**Agent Response Pattern (Single):**
```
I'll save the changes to ZCL_MY_CLASS.

[Call adt_save_source]

✅ Saved successfully to transport request S4HK908540.
✅ Syntax check passed.
🔒 Object remains LOCKED - ready for activation.

Next: Use adt_activate to unlock and activate.
```

**Agent Response Pattern (Batch):**
```
I'll save all three classes and then activate them together.

[Call adt_save_source for ZCL_ORDER]
✅ ZCL_ORDER saved (locked 🔒)

[Call adt_save_source for ZCL_INVOICE]
✅ ZCL_INVOICE saved (locked 🔒)

[Call adt_save_source for ZIF_PROCESSOR]
✅ ZIF_PROCESSOR saved (locked 🔒)

[Call adt_activate with all three objects]
🔓 All objects unlocked
✅ All objects activated successfully!
```

---

### 3️⃣ `adt_check_syntax` - Check for Errors

**When to use:**
- After saving, before activating
- User asks "is this correct?"
- Debugging syntax errors
- Validating code quality

**Parameters:**
```json
{
  "object_name": "ZCL_MY_CLASS",
  "object_type": "CLAS",
  "version": "inactive"
}
```

**Version Options:**
- `"inactive"` - Check saved but not activated code (most common)
- `"active"` - Check currently activated version

**Example Prompts:**
- ✅ "Check if this code has errors"
- ✅ "Validate the syntax"
- ✅ "Is there anything wrong with this class?"

**Agent Response Pattern:**
```
I'll check the syntax of ZCL_MY_CLASS.

[Call adt_check_syntax]

[If no errors:]
✅ Syntax check passed! No errors found.
The code is ready to be activated.

[If errors found:]
❌ Found 2 syntax errors:
1. Line 42: Type "STRINGG" is unknown (did you mean "STRING"?)
2. Line 58: Method "PROCES" not found (did you mean "PROCESS"?)

Would you like me to fix these errors?
```

---

### 4️⃣ `adt_activate` - Unlock and Activate

**Workflow:** Unlock → Activate (supports BATCH activation)

**When to use:**
- After saving with `adt_save_source` (which keeps objects locked)
- **Batch activation** - activate multiple related objects together
- User says "activate this" or "activate these"
- Code is already saved and syntax-checked

**⚡ BATCH SUPPORT:** This tool can unlock and activate multiple objects in one operation - much faster than activating one by one!

**Parameters:**
```json
{
  "objects": [
    { "name": "ZCL_MY_CLASS", "type": "CLAS" },
    { "name": "ZIF_MY_INTERFACE", "type": "INTF" },
    { "name": "ZCL_ANOTHER_CLASS", "type": "CLAS" }
  ]
}
```

**Example Prompts:**
- ✅ "Activate the class"
- ✅ "Make these changes live"
- ✅ "Activate ZCL_TEST_1, ZCL_TEST_2, and ZIF_TEST together"
- ✅ "Activate all three classes"

**Agent Response Pattern (Single):**
```
I'll unlock and activate ZCL_MY_CLASS.

[Call adt_activate with one object]

✅ Successfully activated 1 object:
🔓 Unlocked: CLAS ZCL_MY_CLASS
✅ Activated: CLAS ZCL_MY_CLASS

The object is now active and ready to use!
```

**Agent Response Pattern (Batch):**
```
I'll unlock and activate all three objects together.

[Call adt_activate with multiple objects]

✅ Successfully activated 3 objects:
🔓 Unlocked: CLAS ZCL_ORDER
🔓 Unlocked: CLAS ZCL_INVOICE
🔓 Unlocked: INTF ZIF_PROCESSOR
✅ All activated and ready to use!
```

**Error Handling:**
```
[If failed:]
❌ Activation failed due to errors:
[List errors]

Let me fix these errors and try again...
```

---

### 5️⃣ `adt_update_and_activate` - Complete Workflow ⭐

**Workflow:** Lock → Save → Unlock → Check → Activate

**When to use:**
- ⭐ **RECOMMENDED for SINGLE object modifications**
- User wants to update and make live immediately
- Simple, one-step operation
- Automatically handles all steps

**⚠️ For multiple objects:** Use `adt_save_source` (×N) + `adt_activate` for batch efficiency

**This tool does:**
1. Lock the object
2. Save the source code
3. Unlock the object
4. Check syntax
5. Activate if no errors

**Parameters:**
```json
{
  "object_name": "ZCL_MY_CLASS",
  "object_type": "CLAS",
  "source_code": "CLASS zcl_my_class DEFINITION...\n[complete source]"
}
```

**Example Prompts:**
- ✅ "Update this class" (most common)
- ✅ "Fix this bug and activate"
- ✅ "Add this method to the class"
- ✅ "Change the implementation"

**Agent Response Pattern:**
```
I'll update and activate ZCL_MY_CLASS for you.

[Call adt_update_and_activate]

[If successful:]
✅ Successfully completed all steps:
1. ✅ Locked object
2. ✅ Saved source code (Transport: S4HK908540)
3. ✅ Syntax check passed
4. ✅ Activated
5. ✅ Unlocked

The changes are now live in your SAP system!

[If failed:]
❌ Operation failed at step 3 (syntax check):
- Line 42: Type "STRINGG" is unknown

I found the issue. Let me fix it...
[Read current source, fix error, retry]
```

---

## 🔄 Common Workflows

### Workflow 1: Simple Code Change (RECOMMENDED)

```
User: "Add a method GET_STATUS to class ZCL_ORDER"

Agent Actions:
1. Read current source: adt_read_source
2. Add method to source code
3. Update and activate: adt_update_and_activate

Total: 2 tool calls
```

**Code Example:**
```typescript
// Step 1: Read current code
const currentCode = await callTool('adt_read_source', {
  object_name: 'ZCL_ORDER',
  object_type: 'CLAS'
});

// Step 2: Modify code (AI does this)
const modifiedCode = addMethod(currentCode, 'GET_STATUS');

// Step 3: Update and activate
const result = await callTool('adt_update_and_activate', {
  object_name: 'ZCL_ORDER',
  object_type: 'CLAS',
  source_code: modifiedCode
});
```

---

### Workflow 2: Cautious Approach (Check First)

```
User: "Update ZCL_TEST but check syntax first"

Agent Actions:
1. Read current source: adt_read_source
2. Make changes
3. Save: adt_save_source
4. Check syntax: adt_check_syntax
5. If OK, activate: adt_activate

Total: 4-5 tool calls
```

**When to use:** User is cautious, code is complex, or making risky changes.

---

### Workflow 3: Fix Syntax Errors

```
User: "Fix the errors in ZCL_TEST"

Agent Actions:
1. Check syntax: adt_check_syntax
2. Read source: adt_read_source
3. Fix errors in code
4. Update and activate: adt_update_and_activate

Total: 3 tool calls
```

---

### Workflow 4: Mass Activation

```
User: "Activate all my classes"

Agent Actions:
1. Get list of objects (from conversation context)
2. Activate all: adt_activate with multiple objects

Total: 1 tool call
```

**Code Example:**
```typescript
await callTool('adt_activate', {
  objects: [
    { name: 'ZCL_CLASS_1', type: 'CLAS' },
    { name: 'ZCL_CLASS_2', type: 'CLAS' },
    { name: 'ZIF_INTERFACE_1', type: 'INTF' }
  ]
});
```

---

## 🎯 Best Practices for AI Agents

### 1. Always Use Complete Source Code

```typescript
// ❌ DON'T: Send partial source
await callTool('adt_save_source', {
  object_name: 'ZCL_TEST',
  object_type: 'CLAS',
  source_code: 'METHOD xyz...' // WRONG!
});

// ✅ DO: Read full source, modify, send complete
const fullSource = await callTool('adt_read_source', {...});
const modifiedSource = modifyEntireSource(fullSource);
await callTool('adt_update_and_activate', {
  source_code: modifiedSource // Complete source
});
```

---

### 2. Handle Errors Gracefully

```typescript
const result = await callTool('adt_update_and_activate', {...});

if (!result.success) {
  // Check which step failed
  const syntaxStep = result.steps.find(s => s.step === 'syntax_check');
  
  if (syntaxStep && syntaxStep.result.hasErrors) {
    // Extract error messages
    const errors = syntaxStep.result.messages;
    
    // Tell user about errors
    respond(`Found ${errors.length} syntax errors. Let me fix them...`);
    
    // Fix errors and retry
    const fixedCode = fixSyntaxErrors(sourceCode, errors);
    await callTool('adt_update_and_activate', {
      source_code: fixedCode
    });
  }
}
```

---

### 3. Preserve Code Formatting

```typescript
// ✅ Maintain ABAP formatting conventions
const modifiedCode = originalCode
  .replace(/METHOD get_data\./i, 'METHOD get_data.\n    DATA lv_result TYPE string.')
  .replace(/ENDMETHOD\./i, '    rv_result = lv_result.\n  ENDMETHOD.');

// Keep:
// - Case sensitivity (ABAP is case-insensitive but conventions matter)
// - Indentation (2 spaces per level)
// - Empty lines for readability
// - Comments
```

---

### 4. Provide Context in Responses

```typescript
// ❌ DON'T: Just say "Done"
respond("✅ Done");

// ✅ DO: Provide details
respond(`
✅ Successfully updated and activated ZCL_ORDER

Changes made:
- Added method GET_STATUS returning TYPE string
- Method returns order status from VBAK table
- Added error handling for missing orders

The class is now active in your SAP system (Transport: S4HK908540).
`);
```

---

### 5. Confirm Before Destructive Operations

```typescript
// If user says "delete this method"
if (isDestructiveChange) {
  respond(`
I'll remove the method PROCESS_DATA from ZCL_ORDER.

⚠️  This will:
- Delete 45 lines of code
- Affect any code that calls this method
- Require transport request

Should I proceed? (yes/no)
  `);
  
  // Wait for confirmation before proceeding
}
```

---

## 📝 Response Templates

### Success Response Template

```markdown
✅ **Successfully [action] [object_type] [object_name]**

**What I did:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Details:**
- Transport Request: [transport_number]
- Lines of code: [count]
- [Any other relevant info]

**The changes are now live in your SAP system!**
```

---

### Error Response Template

```markdown
❌ **Failed to [action] [object_type] [object_name]**

**Error:** [error_message]

**What happened:**
- [Explanation of error]
- [Why it failed]

**How to fix:**
1. [Step 1]
2. [Step 2]

Would you like me to:
- Try to fix this automatically
- Show you the error details
- Suggest an alternative approach
```

---

### Syntax Error Response Template

```markdown
⚠️  **Found [count] syntax error(s) in [object_name]**

**Errors:**
1. **Line [line]:** [error_text]
   Current: `[wrong_code]`
   Should be: `[correct_code]`

2. **Line [line]:** [error_text]
   [Explanation]

**Would you like me to fix these errors and try again?**
```

---

## 🧪 Testing & Validation

### Before Making Changes

```typescript
// 1. Verify object exists
const readResult = await callTool('adt_read_source', {...});
if (!readResult.success) {
  respond("❌ Object doesn't exist. Should I create it?");
  return;
}

// 2. Check if object is already locked
// (ADT will return error if locked, handle gracefully)

// 3. Validate user intent
if (isAmbiguous(userRequest)) {
  askForClarification();
  return;
}
```

---

### After Making Changes

```typescript
// 1. Confirm changes were applied
const newSource = await callTool('adt_read_source', {...});
if (newSource.includes(expectedChange)) {
  respond("✅ Changes confirmed!");
} else {
  respond("⚠️  Changes may not have been applied correctly.");
}

// 2. Suggest testing
respond(`
✅ Changes are live!

**Next steps:**
- Test the changes in your SAP system
- Check transaction SE24 for class ZCL_TEST
- Run unit tests if available
`);
```

---

## 🎓 Learning Examples

### Example 1: Add Method to Class

**User:** "Add a method GET_DATE to class ZCL_UTILS that returns today's date"

**Agent Thinking:**
1. Need to read current class source
2. Add method definition and implementation
3. Update and activate

**Agent Code:**
```typescript
// Read current source
const { source } = await callTool('adt_read_source', {
  object_name: 'ZCL_UTILS',
  object_type: 'CLAS'
});

// Add method to PUBLIC SECTION definition
const modifiedSource = source.replace(
  /PUBLIC SECTION\./i,
  `PUBLIC SECTION.
    METHODS get_date
      RETURNING VALUE(rv_date) TYPE datum.`
);

// Add method implementation
const finalSource = modifiedSource.replace(
  /CLASS \w+ IMPLEMENTATION\./i,
  `CLASS zcl_utils IMPLEMENTATION.
  METHOD get_date.
    rv_date = sy-datum.
  ENDMETHOD.`
);

// Update and activate
const result = await callTool('adt_update_and_activate', {
  object_name: 'ZCL_UTILS',
  object_type: 'CLAS',
  source_code: finalSource
});
```

**Agent Response:**
```
✅ Successfully added method GET_DATE to class ZCL_UTILS!

**Changes made:**
- Added method definition to PUBLIC SECTION
- Returns TYPE datum (SAP date format)
- Implementation uses sy-datum (current date)

The class is now active and ready to use!

**Example usage:**
```abap
DATA(lo_utils) = NEW zcl_utils( ).
DATA(lv_today) = lo_utils->get_date( ).
WRITE: / lv_today.
```
```

---

### Example 2: Fix Syntax Error

**User:** "Why is ZCL_TEST not activating?"

**Agent Actions:**
```typescript
// Check syntax
const syntaxResult = await callTool('adt_check_syntax', {
  object_name: 'ZCL_TEST',
  object_type: 'CLAS',
  version: 'inactive'
});

if (syntaxResult.hasErrors) {
  // Read source to fix
  const { source } = await callTool('adt_read_source', {
    object_name: 'ZCL_TEST',
    object_type: 'CLAS'
  });
  
  // Fix errors
  let fixedSource = source;
  for (const error of syntaxResult.messages) {
    if (error.text.includes('Type "STRINGG" is unknown')) {
      fixedSource = fixedSource.replace(/STRINGG/g, 'STRING');
    }
  }
  
  // Update and activate
  await callTool('adt_update_and_activate', {
    object_name: 'ZCL_TEST',
    object_type: 'CLAS',
    source_code: fixedSource
  });
}
```

**Agent Response:**
```
I found the issue! ZCL_TEST has a syntax error:

❌ **Line 42:** Type "STRINGG" is unknown
   You have a typo - should be "STRING" (one G)

I've fixed this error and activated the class.

✅ **Class ZCL_TEST is now active!**
```

---

## 🚀 Advanced Patterns

### Pattern 1: Batch Processing

```typescript
async function processMultipleClasses(classNames) {
  const results = [];
  
  for (const className of classNames) {
    const result = await callTool('adt_update_and_activate', {
      object_name: className,
      object_type: 'CLAS',
      source_code: generateSourceFor(className)
    });
    
    results.push(result);
  }
  
  // Summarize
  const successful = results.filter(r => r.success).length;
  respond(`✅ Successfully processed ${successful}/${classNames.length} classes.`);
}
```

---

### Pattern 2: Interactive Modification

```typescript
async function interactiveModification(className) {
  // 1. Show current code
  const { source } = await callTool('adt_read_source', {
    object_name: className,
    object_type: 'CLAS'
  });
  
  respond(`Current code:\n\`\`\`abap\n${source}\n\`\`\``);
  
  // 2. Ask what to change
  const changes = await askUser("What would you like to change?");
  
  // 3. Apply changes
  const modifiedSource = applyChanges(source, changes);
  
  // 4. Show diff
  respond(`Here's what will change:\n${showDiff(source, modifiedSource)}`);
  
  // 5. Confirm
  const confirmed = await askUser("Apply these changes? (yes/no)");
  
  if (confirmed === 'yes') {
    await callTool('adt_update_and_activate', {
      object_name: className,
      object_type: 'CLAS',
      source_code: modifiedSource
    });
  }
}
```

---

## 📚 Quick Reference

| User Intent | Tool to Use | Example |
|-------------|-------------|---------|
| "Show me..." | `adt_read_source` | "Show me class ZCL_TEST" |
| "Add method..." | `adt_update_and_activate` | "Add method GET_STATUS" |
| "Fix error..." | `adt_check_syntax` + `adt_update_and_activate` | "Fix the syntax errors" |
| "Save only" | `adt_save_source` | "Save but don't activate" |
| "Activate" | `adt_activate` | "Activate these classes" |
| "Check syntax" | `adt_check_syntax` | "Check for errors" |

---

## ✅ Checklist for AI Agents

Before calling any tool:
- [ ] Understand user intent clearly
- [ ] Choose appropriate tool (prefer `adt_update_and_activate` for modifications)
- [ ] Have all required parameters
- [ ] Know the object type

When modifying code:
- [ ] Read current source first
- [ ] Modify complete source (not partial)
- [ ] Preserve formatting
- [ ] Handle errors gracefully
- [ ] Confirm success to user

After completion:
- [ ] Provide clear status (success/failure)
- [ ] Explain what was done
- [ ] Show transport request number
- [ ] Suggest next steps

---

**Ready to start?** Use these patterns and your AI agent will be a pro at ABAP development! 🚀


