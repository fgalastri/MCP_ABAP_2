**********************************************************************
* Unit Tests for ZCL_TLINE_CONVERTER
* Test Class to be added to ZCL_TLINE_CONVERTER
* Location: Local Test Classes (testclasses include)
**********************************************************************

CLASS ltc_tline_converter DEFINITION FINAL FOR TESTING
  DURATION SHORT
  RISK LEVEL HARMLESS.

  PRIVATE SECTION.
    METHODS:
      test_tline_to_string_basic FOR TESTING,
      test_tline_to_string_empty FOR TESTING,
      test_tline_to_string_multi FOR TESTING,
      test_string_to_tline_basic FOR TESTING,
      test_string_to_tline_empty FOR TESTING,
      test_string_to_tline_long FOR TESTING,
      test_string_to_tline_no_sep FOR TESTING,
      test_round_trip FOR TESTING.
ENDCLASS.


CLASS ltc_tline_converter IMPLEMENTATION.

  METHOD test_tline_to_string_basic.
    " Test basic conversion of single TLINE to string
    DATA lt_tline TYPE zcl_tline_converter=>ty_tline_tab.
    
    APPEND VALUE #( tdformat = '' tdline = 'Hello World' ) TO lt_tline.
    
    DATA(lv_result) = zcl_tline_converter=>tline_to_string( 
      it_tline = lt_tline 
      iv_separator = ' '
    ).
    
    cl_abap_unit_assert=>assert_equals(
      act = lv_result
      exp = 'Hello World'
      msg = 'Single line conversion failed'
    ).
  ENDMETHOD.

  METHOD test_tline_to_string_empty.
    " Test with empty TLINE table
    DATA lt_tline TYPE zcl_tline_converter=>ty_tline_tab.
    
    DATA(lv_result) = zcl_tline_converter=>tline_to_string( 
      it_tline = lt_tline 
    ).
    
    cl_abap_unit_assert=>assert_initial(
      act = lv_result
      msg = 'Empty TLINE should return empty string'
    ).
  ENDMETHOD.

  METHOD test_tline_to_string_multi.
    " Test with multiple TLINE entries
    DATA lt_tline TYPE zcl_tline_converter=>ty_tline_tab.
    
    APPEND VALUE #( tdformat = '' tdline = 'Line 1' ) TO lt_tline.
    APPEND VALUE #( tdformat = '' tdline = 'Line 2' ) TO lt_tline.
    APPEND VALUE #( tdformat = '' tdline = 'Line 3' ) TO lt_tline.
    
    DATA(lv_result) = zcl_tline_converter=>tline_to_string( 
      it_tline = lt_tline
      iv_separator = cl_abap_char_utilities=>newline
    ).
    
    cl_abap_unit_assert=>assert_char_cp(
      act = lv_result
      exp = '*Line 1*Line 2*Line 3*'
      msg = 'Multi-line conversion failed'
    ).
  ENDMETHOD.

  METHOD test_string_to_tline_basic.
    " Test basic string to TLINE conversion
    DATA(lv_string) = 'Hello World'.
    
    DATA(lt_result) = zcl_tline_converter=>string_to_tline( 
      iv_string = lv_string
      iv_separator = ''
      iv_line_length = 132
    ).
    
    cl_abap_unit_assert=>assert_equals(
      act = lines( lt_result )
      exp = 1
      msg = 'Should create one TLINE entry'
    ).
    
    cl_abap_unit_assert=>assert_equals(
      act = lt_result[ 1 ]-tdline
      exp = 'Hello World'
      msg = 'Content should match'
    ).
  ENDMETHOD.

  METHOD test_string_to_tline_empty.
    " Test with empty string
    DATA(lv_string) = ''.
    
    DATA(lt_result) = zcl_tline_converter=>string_to_tline( 
      iv_string = lv_string
    ).
    
    cl_abap_unit_assert=>assert_initial(
      act = lt_result
      msg = 'Empty string should return empty table'
    ).
  ENDMETHOD.

  METHOD test_string_to_tline_long.
    " Test with long string exceeding line length
    DATA(lv_string) = repeat( val = 'A' occ = 300 ).
    
    DATA(lt_result) = zcl_tline_converter=>string_to_tline( 
      iv_string = lv_string
      iv_separator = ''
      iv_line_length = 132
    ).
    
    cl_abap_unit_assert=>assert_equals(
      act = lines( lt_result )
      exp = 3
      msg = '300 characters should create 3 lines of 132 chars'
    ).
    
    cl_abap_unit_assert=>assert_equals(
      act = strlen( lt_result[ 1 ]-tdline )
      exp = 132
      msg = 'First line should be 132 characters'
    ).
  ENDMETHOD.

  METHOD test_string_to_tline_no_sep.
    " Test without separator (split by length only)
    DATA(lv_string) = 'ABCDEFGHIJKLMNOP'.
    
    DATA(lt_result) = zcl_tline_converter=>string_to_tline( 
      iv_string = lv_string
      iv_separator = ''
      iv_line_length = 5
    ).
    
    cl_abap_unit_assert=>assert_equals(
      act = lines( lt_result )
      exp = 4
      msg = '16 chars with length 5 should create 4 lines'
    ).
    
    cl_abap_unit_assert=>assert_equals(
      act = lt_result[ 1 ]-tdline
      exp = 'ABCDE'
      msg = 'First line should be ABCDE'
    ).
    
    cl_abap_unit_assert=>assert_equals(
      act = lt_result[ 4 ]-tdline
      exp = 'P'
      msg = 'Last line should be P'
    ).
  ENDMETHOD.

  METHOD test_round_trip.
    " Test conversion both ways (string -> tline -> string)
    DATA lt_tline TYPE zcl_tline_converter=>ty_tline_tab.
    DATA(lv_original) = 'Line 1' && cl_abap_char_utilities=>newline &&
                       'Line 2' && cl_abap_char_utilities=>newline &&
                       'Line 3'.
    
    " Convert string to TLINE
    lt_tline = zcl_tline_converter=>string_to_tline( 
      iv_string = lv_original
      iv_separator = cl_abap_char_utilities=>newline
    ).
    
    " Convert back to string
    DATA(lv_result) = zcl_tline_converter=>tline_to_string( 
      it_tline = lt_tline
      iv_separator = cl_abap_char_utilities=>newline
    ).
    
    cl_abap_unit_assert=>assert_equals(
      act = lv_result
      exp = lv_original
      msg = 'Round-trip conversion should preserve content'
    ).
  ENDMETHOD.

ENDCLASS.






