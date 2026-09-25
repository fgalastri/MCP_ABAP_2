*&---------------------------------------------------------------------*
*& ABAP Unit Test Class Template
*& Use this as the standard template for all ABAP unit test classes
*&---------------------------------------------------------------------*

CLASS ltc_<classname>_tests DEFINITION FINAL FOR TESTING
  DURATION SHORT
  RISK LEVEL HARMLESS.

  PRIVATE SECTION.
    " Class under test instance
    DATA mo_cut TYPE REF TO <classname>.

    " Setup method - runs before each test
    METHODS setup.

    " Test methods - one per test case
    METHODS test_method_name FOR TESTING.
    METHODS test_edge_case FOR TESTING.
    METHODS test_exception_case FOR TESTING.

ENDCLASS.


CLASS ltc_<classname>_tests IMPLEMENTATION.

  METHOD setup.
    " Create instance of class under test
    mo_cut = NEW #( ).
  ENDMETHOD.

  METHOD test_method_name.
    " Arrange
    DATA(lv_input) = 'test_value'.

    " Act
    DATA(lv_result) = mo_cut->method_name( iv_param = lv_input ).

    " Assert
    cl_abap_unit_assert=>assert_equals(
      act = lv_result
      exp = 'expected_value'
      msg = 'Description of what should happen'
    ).
  ENDMETHOD.

  METHOD test_edge_case.
    " Test with edge case values (empty, zero, negative, etc.)
    DATA(lv_result) = mo_cut->method_name( iv_param = '' ).

    cl_abap_unit_assert=>assert_initial(
      act = lv_result
      msg = 'Empty input should return initial value'
    ).
  ENDMETHOD.

  METHOD test_exception_case.
    " Test that exceptions are raised correctly
    TRY.
        DATA(lv_result) = mo_cut->method_name( iv_param = 'invalid' ).
        cl_abap_unit_assert=>fail( 'Should raise exception for invalid input' ).
      CATCH cx_some_exception.
        " Expected exception - test passes
    ENDTRY.
  ENDMETHOD.

ENDCLASS.

*&---------------------------------------------------------------------*
*& CRITICAL SYNTAX RULES:
*& 1. CLASS name DEFINITION FINAL FOR TESTING (one line)
*& 2. DURATION SHORT (separate line)
*& 3. RISK LEVEL HARMLESS (separate line)
*& 4. Use setup method with mo_cut instance variable
*& 5. Use inline declarations: DATA(var) = ...
*& 6. Test methods: METHODS name FOR TESTING
*&---------------------------------------------------------------------*





