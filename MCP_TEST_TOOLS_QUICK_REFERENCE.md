# 🧪 MCP Test Tools - Quick Reference

## New MCP Tools Added

### 1. `adt_save_testclass_source`
**Purpose:** Upload test classes to SAP

**Syntax:**
```javascript
adt_save_testclass_source({
  class_name: "CLASS_NAME",
  source_code: "..." // Complete test class code
})
```

**What it does:**
- Locks the class
- Saves test class include to `/sap/bc/adt/oo/classes/{name}/includes/testclasses`
- Runs syntax check
- Keeps class LOCKED for activation

**Example:**
```javascript
adt_save_testclass_source({
  class_name: "ZATC",
  source_code: `CLASS ltc_test DEFINITION FINAL FOR TESTING...`
})
```

---

### 2. `adt_run_tests`
**Purpose:** Execute ABAP Unit tests and get results

**Syntax:**
```javascript
adt_run_tests({
  object_name: "CLASS_NAME",
  object_type: "CLAS"  // Optional, defaults to CLAS
})
```

**What it does:**
- Executes all test classes for the object
- Parses XML results
- Returns formatted summary with:
  - Pass/fail counts
  - Execution times
  - Detailed failure information

**Example:**
```javascript
adt_run_tests({
  object_name: "ZATC"
})
```

**Output:**
```
🧪 Test Results for ZATC

Summary:
- Total Tests: 11
- ✅ Passed: 10
- ❌ Failed: 1
- ⏱️  Total Time: 0.040s

Test Classes (4):
✅ LTC_ZATC_BASIC_TESTS (3 tests)
  ✅ TEST_CLASS_INSTANTIATION (0.000s)
  ✅ TEST_STRUCTURE_CREATION (0.000s)
  ✅ TEST_TYPE_DEFINITION_EXISTS (0.000s)
...
```

---

## Complete Workflow Example

### **Scenario:** Create a new class with tests

```javascript
// Step 1: Create the class
adt_create_class({
  class_name: "ZCL_CALCULATOR",
  description: "Simple calculator",
  package_name: "$TMP",
  transport_request: ""
})

// Step 2: Add main class code
adt_save_source({
  object_name: "ZCL_CALCULATOR",
  object_type: "CLAS",
  source_code: `CLASS zcl_calculator DEFINITION PUBLIC FINAL.
  PUBLIC SECTION.
    METHODS add
      IMPORTING iv_a TYPE i
                iv_b TYPE i
      RETURNING VALUE(rv_result) TYPE i.
ENDCLASS.

CLASS zcl_calculator IMPLEMENTATION.
  METHOD add.
    rv_result = iv_a + iv_b.
  ENDMETHOD.
ENDCLASS.`
})

// Step 3: Add test classes
adt_save_testclass_source({
  class_name: "ZCL_CALCULATOR",
  source_code: `CLASS ltc_calculator_test DEFINITION FINAL FOR TESTING
  RISK LEVEL HARMLESS
  DURATION SHORT.
  
  PRIVATE SECTION.
    DATA cut TYPE REF TO zcl_calculator.
    
    METHODS:
      setup,
      test_add FOR TESTING.
ENDCLASS.

CLASS ltc_calculator_test IMPLEMENTATION.
  METHOD setup.
    cut = NEW #( ).
  ENDMETHOD.
  
  METHOD test_add.
    DATA(result) = cut->add( iv_a = 5 iv_b = 3 ).
    cl_abap_unit_assert=>assert_equals(
      act = result
      exp = 8
      msg = 'Addition should work correctly'
    ).
  ENDMETHOD.
ENDCLASS.`
})

// Step 4: Activate everything
adt_activate({
  objects: [{ name: "ZCL_CALCULATOR", type: "CLAS" }]
})

// Step 5: Run tests
adt_run_tests({
  object_name: "ZCL_CALCULATOR"
})
```

---

## Common Use Cases

### **Use Case 1: Add tests to existing class**
```javascript
// 1. Create test code locally
// 2. Upload tests
adt_save_testclass_source({
  class_name: "ZCL_EXISTING",
  source_code: "..."
})

// 3. Activate
adt_activate({
  objects: [{ name: "ZCL_EXISTING", type: "CLAS" }]
})

// 4. Run tests
adt_run_tests({ object_name: "ZCL_EXISTING" })
```

### **Use Case 2: Update and re-test**
```javascript
// 1. Update main class
adt_save_source({
  object_name: "ZCL_MY_CLASS",
  object_type: "CLAS",
  source_code: "... updated code ..."
})

// 2. Update tests if needed
adt_save_testclass_source({
  class_name: "ZCL_MY_CLASS",
  source_code: "... updated tests ..."
})

// 3. Activate
adt_activate({
  objects: [{ name: "ZCL_MY_CLASS", type: "CLAS" }]
})

// 4. Run tests
adt_run_tests({ object_name: "ZCL_MY_CLASS" })
```

### **Use Case 3: Batch testing multiple classes**
```javascript
// Run tests on multiple classes
for (const className of ["ZCL_CLASS1", "ZCL_CLASS2", "ZCL_CLASS3"]) {
  const result = await adt_run_tests({ object_name: className });
  console.log(result);
}
```

---

## Test Class Template

```abap
CLASS ltc_<descriptive_name> DEFINITION FINAL
  FOR TESTING
  RISK LEVEL HARMLESS
  DURATION SHORT.
  
  PRIVATE SECTION.
    DATA cut TYPE REF TO <your_class>.
    
    METHODS:
      setup,
      test_<what_you_test> FOR TESTING,
      test_<another_test> FOR TESTING.
      
ENDCLASS.

CLASS ltc_<descriptive_name> IMPLEMENTATION.
  
  METHOD setup.
    " Initialize test fixture
    cut = NEW #( ).
  ENDMETHOD.
  
  METHOD test_<what_you_test>.
    " Arrange
    DATA(input) = 'test_value'.
    
    " Act
    DATA(result) = cut->method_under_test( input ).
    
    " Assert
    cl_abap_unit_assert=>assert_equals(
      act = result
      exp = 'expected_value'
      msg = 'Descriptive failure message'
    ).
  ENDMETHOD.
  
ENDCLASS.
```

---

## Assertion Methods

### **Most Common:**
```abap
" Equality
cl_abap_unit_assert=>assert_equals( act = result exp = expected )

" Boolean
cl_abap_unit_assert=>assert_true( act = condition )
cl_abap_unit_assert=>assert_false( act = condition )

" Object references
cl_abap_unit_assert=>assert_bound( act = object_ref )
cl_abap_unit_assert=>assert_not_bound( act = object_ref )

" Initial/empty
cl_abap_unit_assert=>assert_initial( act = variable )
cl_abap_unit_assert=>assert_not_initial( act = variable )

" Exceptions
cl_abap_unit_assert=>assert_exception( )
```

---

## Test Attributes

### **Risk Levels:**
- `RISK LEVEL HARMLESS` - No data changes
- `RISK LEVEL DANGEROUS` - Test data changes
- `RISK LEVEL CRITICAL` - Production data changes

### **Durations:**
- `DURATION SHORT` - < 1 minute
- `DURATION MEDIUM` - 1-5 minutes
- `DURATION LONG` - > 5 minutes

---

## Troubleshooting

### **Issue: "setup cannot be FOR TESTING"**
**Solution:** Remove `FOR TESTING` from setup method
```abap
" ❌ Wrong
METHODS: setup FOR TESTING

" ✅ Correct
METHODS: setup
```

### **Issue: "No component exists with name PART-TEXT"**
**Solution:** Use correct field access syntax
```abap
" ❌ Wrong (with hyphen in loop)
LOOP AT table INTO part WHERE part-field = value.

" ✅ Correct
LOOP AT table INTO part WHERE field = value.
```

### **Issue: Test not found**
**Solution:** Ensure test method has `FOR TESTING` attribute
```abap
METHODS: test_my_function FOR TESTING.
```

---

## Best Practices

1. ✅ **One assertion per test** - Tests should be focused
2. ✅ **Descriptive names** - `test_add_returns_sum` not `test1`
3. ✅ **Use setup for initialization** - DRY principle
4. ✅ **Test edge cases** - Empty, null, boundary values
5. ✅ **Independent tests** - Tests should not depend on each other
6. ✅ **Clear failure messages** - Help debugging

---

## Quick Commands

```javascript
// Upload tests
adt_save_testclass_source({ class_name: "ZCL_X", source_code: "..." })

// Activate
adt_activate({ objects: [{ name: "ZCL_X", type: "CLAS" }] })

// Run tests
adt_run_tests({ object_name: "ZCL_X" })

// Check syntax first
adt_check_syntax({ object_name: "ZCL_X", object_type: "CLAS" })
```

---

**💡 Pro Tip:** Always run `adt_check_syntax` before running tests to catch syntax errors early!

**📚 Full Documentation:** See `ZATC_TEST_SESSION_SUMMARY.md` for complete details.

