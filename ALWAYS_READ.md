# ALWAYS READ - CRITICAL RULES BEFORE EVERY STEP

**🚨 READ THIS FILE BEFORE EVERY ACTION - NO EXCEPTIONS**

## 9 CRITICAL MISTAKES THAT MUST NEVER HAPPEN:

### ❌ MISTAKE #1: SENDING WHOLE CLASS CODE TO ABAP-VALIDATOR
- **WRONG**: Sending complete class definitions to `mcp_abap-validator_validate_abap_method`
- **CORRECT**: Send ONLY pure method source code without class wrappers
- **XCO APPROACH**: Generate ONLY the method source code that contains XCO operations
- **RULE**: Never wrap method source in CLASS...ENDCLASS when using abap-validator

### ❌ MISTAKE #2: REMOVING CODE TO MAKE SYNTAX PASS
- **WRONG**: Taking out code or simplifying logic to avoid syntax errors
- **CORRECT**: Fix the actual syntax issues while preserving ALL functionality
- **RULE**: Never lose functionality to make code pass validation
- **APPROACH**: Identify root cause of syntax errors and fix them properly

### ❌ MISTAKE #3: CLAIMING SUCCESS WHEN VALIDATION SHOWS ERRORS
- **WRONG**: Saying "everything is correct" when STATUS="ERROR" from abap-validator
- **CORRECT**: STATUS="ERROR" ALWAYS means real problems that must be fixed
- **RULE**: Task is ONLY successful when STATUS="SUCCESS" AND all functionality preserved
- **VALIDATION**: Both syntax correctness AND functional correctness are required

### ❌ MISTAKE #4: ADDING COMMENTS TO XCO GENERATION CODE
- **WRONG**: Adding comments (lines starting with " or * or inline comments) to XCO generation code
- **CORRECT**: Generate ONLY executable ABAP code without any comments
- **RULE**: Comments cause parsing errors and validation failures in XCO operations
- **APPROACH**: Remove ALL comments from XCO method source code before validation/execution

### ❌ MISTAKE #5: CREATING PLACEHOLDER/SIMPLIFIED IMPLEMENTATIONS
- **WRONG**: Creating placeholder methods like "rv_result = 'placeholder'" instead of real XCO code
- **WRONG**: Simplifying complex logic to "make it work" instead of implementing full functionality
- **CORRECT**: Use the COMPLETE XCO-based implementation from the local .clas.abap file
- **RULE**: NEVER create placeholder implementations - always use the full, real XCO code
- **APPROACH**: Copy the complete method implementations from ZCL_METADATA_SERVICE_XCO.clas.abap
- **CRITICAL**: When deploying to target system, use ALL the real XCO API calls, not simplified versions

### ❌ MISTAKE #6: WRONG XCO API PATTERNS FOR CLASSES VS INTERFACES
- **WRONG**: Using lo_form_specification->add_type() for classes (causes "Method ADD_TYPE unknown" error)
- **CORRECT**: For CLASSES: Use lo_form_spec->definition->section-public->add_type()
- **CORRECT**: For INTERFACES: Use lo_form_specification->add_type() directly
- **RULE**: Always check z_examples folder for correct XCO API patterns before implementation
- **CRITICAL**: Class and Interface form specifications have different APIs for type creation

### ❌ MISTAKE #7: SYNTAX VALIDATION VS FUNCTIONAL VALIDATION
- **WRONG**: Declaring success based only on STATUS="SUCCESS" from syntax validation
- **CORRECT**: Functional validation requires executing methods with real parameters and verifying actual returned data
- **PATTERN**: 1) Test syntax validation, 2) Execute with real parameters, 3) Verify actual results match expectations
- **RULE**: A method can have perfect syntax but return wrong data or fail functionally
- **VALIDATION**: Both syntax correctness AND functional correctness are required for true success

### ❌ MISTAKE #8: BLAMING ENVIRONMENT WHEN CODE DOESN'T WORK
- **WRONG**: Claiming "environment limitations" when methods don't return data
- **CORRECT**: If no data is returned from abap-validator calls, the issue is INCORRECT CODE, not environment
- **RULE**: The validator works perfectly - always ensure methods have proper RETURNING parameters and assign values
- **EXAMPLE**: rv_result = 'some_value' is required to return data, not just executing SELECT without returning

### ❌ MISTAKE #9: INCORRECT ABAP-VALIDATOR CALLING PATTERN
- **WRONG**: Sending parameters array when calling mcp_abap-validator_validate_abap_method
- **CORRECT**: Send ONLY pure method source code in class_code parameter
- **RULE**: The rv_message parameter already exists in the target class method signature
- **PATTERN**: Send class_name + method_name + class_code with pure implementation only

### ❌ MISTAKE #10: RAISING ABSTRACT EXCEPTION CLASSES (NEW - Oct 24, 2025)
- **WRONG**: Using abstract exception classes like `cx_sy_arithmetic_error`
- **CORRECT**: Use concrete exception classes like `cx_sy_arg_out_of_domain`
- **RULE**: Cannot raise instances of abstract exception classes in ABAP
- **ERROR MESSAGE**: "Instances of the abstract class 'XXX' cannot be generated"
- **SOLUTION**: Replace with concrete subclass (check SE24 hierarchy)
- **EXAMPLES**:
  - ❌ cx_sy_arithmetic_error → ✅ cx_sy_arg_out_of_domain
  - ❌ cx_root → ✅ Use specific concrete exception
  - ❌ cx_static_check → ✅ Use concrete subclass

### ❌ MISTAKE #11: IGNORING LOCK STATE IN ADT OPERATIONS (NEW - Oct 24, 2025)
- **WRONG**: Trying to save when object is locked (causes 403 error)
- **CORRECT**: Activate first to unlock, then save again
- **RULE**: adt_save_source LOCKS the object, adt_activate UNLOCKS it
- **PATTERN**: Save → Activate → (modify) → Save → Activate
- **RECOVERY**: If locked, call adt_activate to unlock (even if activation fails)
- **NOTE**: Failed activation still unlocks the object

### ❌ MISTAKE #12: CALLING SAP APIS DIRECTLY (NEW - Oct 24, 2025)
- **WRONG**: Using axios, fetch, curl, or terminal commands to call SAP APIs directly
- **CORRECT**: ALWAYS use MCP tools (adt_* or validate_abap_* tools)
- **RULE**: Never bypass MCP - if tool doesn't exist, CREATE IT FIRST
- **PATTERN**: Check MCP tool → If missing, create new tool → Use tool → Document
- **WHY**: MCP provides consistent error handling, auth, logging, and reusability
- **EXAMPLES**:
  - ❌ axios.post('/sap/bc/adt/...')
  - ❌ curl https://sap-server/...
  - ✅ mcp_abap-adt_adt_save_source(...)
  - ✅ Create new MCP tool if needed

### ❌ MISTAKE #13: ACTIVATING WITHOUT INACTIVE VERSION (NEW - Nov 20, 2025)
- **WRONG**: Trying to activate an object when no inactive version exists
- **CORRECT**: ALWAYS save first to create inactive version, THEN activate
- **SYMPTOM**: "Unknown error" on activation, `activationExecuted="false"` in logs
- **ROOT CAUSE**: SAP has nothing to activate if no inactive version exists
- **PATTERN**: Save → Creates inactive version → Activate → Promotes to active
- **RULE**: Always use `adt_save_source` before `adt_activate`
- **EXAMPLES**:
  - ❌ adt_activate() → "Unknown error" (no inactive version)
  - ✅ adt_save_source() → adt_activate() → Success
  - ✅ adt_update_and_activate() → Does both automatically

### ⚠️ KNOWN LIMITATION #14: SAP BTP CLASS EXECUTION CACHING (NEW - Nov 20, 2025)
- **SYMPTOM**: After activating a class on BTP, `adt_execute_class` returns OLD code
- **ROOT CAUSE**: SAP BTP's ABAP runtime caches compiled classes at server level
- **NOT A BUG**: This is SAP BTP behavior, not an MCP issue
- **EVIDENCE**: Eclipse F9 also sometimes shows old code; `adt_read_source` shows new code
- **WORKAROUND**: 
  - Use Eclipse F9 for immediate post-activation testing
  - Wait a few minutes for BTP cache to clear
  - Use MCP execution for stable/unchanged classes
- **WHAT DOESN'T WORK**: Cache-busting, new sessions, cache headers - none fix this
- **DOCUMENTATION**: See `ADT/SAP_BTP_CLASS_EXECUTION_CACHING_ISSUE.md` for full analysis
- **RULE**: Don't try to "fix" this - it's a SAP BTP limitation, advise user to use Eclipse

## MANDATORY WORKFLOW FOR EVERY STEP:

1. **READ THIS FILE FIRST** - Before any action
2. **READ THE README** - Check ADT/README.md for project overview, available tools, and latest features
3. **USE MCP TOOLS ONLY** - Never make direct API calls (axios, curl, terminal commands)
4. **Identify what you're doing** - Method source only, not full classes
5. **Preserve all functionality** - Never remove code to pass syntax
6. **Fix real issues** - Don't work around problems  
7. **Use COMPLETE implementations** - Never create placeholders, use full XCO code from local files
8. **Check z_examples first** - Always verify correct XCO API patterns before implementation
9. **CHECK WITH ABAPLINT** - ALWAYS run read_lints tool on generated code to check for syntax errors
10. **VALIDATE WITH ABAP-VALIDATOR** - ALWAYS call mcp_abap-validator tool to validate code in target system
11. **UPDATE TARGET** - After successful validation, ensure code is properly deployed/updated in target
12. **Validate properly** - STATUS="SUCCESS" is the only success criteria
13. **Check functionality** - Ensure all original features remain
14. **USE CONCRETE EXCEPTIONS** - Never raise abstract exception classes (use concrete subclasses)
15. **MANAGE LOCKS** - Remember: save locks, activate unlocks (use adt_activate if 403 error)
16. **MISSING TOOL?** - If MCP tool doesn't exist, CREATE IT FIRST, then use it

## MANDATORY CODE VALIDATION SEQUENCE:

**EVERY TIME YOU GENERATE CODE:**
1. **Generate the code** - Create/modify the ABAP file
2. **Check with abaplint** - Use read_lints tool on the specific file path
3. **Fix abaplint errors** - Resolve any syntax/style issues found
4. **Validate with abap-validator** - Use mcp_abap-validator tool to test in target system
5. **Fix validation errors** - Address any runtime/compilation issues
6. **Update target** - Ensure code is properly deployed and functional
7. **Confirm success** - Only declare success when STATUS="SUCCESS" AND functionality verified

## 📚 DOCUMENTATION RESOURCES:

**ALWAYS CHECK THESE FILES FOR CONTEXT:**
- **ADT/README.md** - Project overview, available tools (33 tools), latest features
- **ADT/ENHANCED_TOOLS_COMPLETE_GUIDE.md** - Complete guide for all creation tools
- **ADT/CLIENT_PARAMETER_GUIDE.md** ⭐ NEW (Nov 22, 2025) - Execute code in different clients
- **ADT/ACTIVATION_TROUBLESHOOTING_GUIDE.md** - Activation "Unknown error" solutions
- **ADT/SAP_BTP_CLASS_EXECUTION_CACHING_ISSUE.md** - BTP class execution caching (known limitation)
- **ADT/USAGE_GUIDE_MCP.md** - MCP server usage and available tools
- **ADT/BATCH_WORKFLOW.md** - Batch operations and workflows
- **ADT/CRITICAL_FIXES_AND_LEARNINGS.md** - Known issues and solutions (10 fixes documented)

## ENFORCEMENT:

- **Before every tool call**: Read this file
- **Before every code change**: Read this file  
- **Before every validation**: Read this file
- **Before declaring success**: Read this file
- **When starting a new task**: Check the README and relevant documentation

**NO EXCEPTIONS - ALWAYS READ THIS FILE FIRST**
