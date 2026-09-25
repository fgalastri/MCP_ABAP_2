CLASS ltc_zatc_basic_tests DEFINITION FINAL
  FOR TESTING
  RISK LEVEL HARMLESS
  DURATION SHORT.

  PRIVATE SECTION.
    DATA cut TYPE REF TO zatc.

    METHODS:
      setup,
      test_class_instantiation FOR TESTING,
      test_type_definition_exists FOR TESTING,
      test_structure_creation FOR TESTING.

ENDCLASS.

CLASS ltc_zatc_basic_tests IMPLEMENTATION.

  METHOD setup.
    " Create instance of class under test
    cut = NEW #( ).
  ENDMETHOD.

  METHOD test_class_instantiation.
    " Test that the class can be instantiated successfully
    cl_abap_unit_assert=>assert_bound(
      act = cut
      msg = 'Class ZATC should be instantiable'
    ).
  ENDMETHOD.

  METHOD test_type_definition_exists.
    " Test that the type definition exists and can be used
    DATA: lv_parts TYPE zatc=>ty_parts.

    " Initialize the structure
    lv_parts-text = 'Test activation parsing'.

    " Assert the structure can hold data
    cl_abap_unit_assert=>assert_equals(
      act = lv_parts-text
      exp = 'Test activation parsing'
      msg = 'Structure ty_parts should hold text data'
    ).
  ENDMETHOD.

  METHOD test_structure_creation.
    " Test creating and manipulating the structure
    DATA: lt_parts_table TYPE TABLE OF zatc=>ty_parts,
          ls_part TYPE zatc=>ty_parts.

    " Create first entry
    ls_part-text = 'First part'.
    APPEND ls_part TO lt_parts_table.

    " Create second entry
    ls_part-text = 'Second part'.
    APPEND ls_part TO lt_parts_table.

    " Verify table has correct number of entries
    cl_abap_unit_assert=>assert_equals(
      act = lines( lt_parts_table )
      exp = 2
      msg = 'Table should contain 2 entries'
    ).

    " Verify first entry
    READ TABLE lt_parts_table INTO ls_part INDEX 1.
    cl_abap_unit_assert=>assert_equals(
      act = ls_part-text
      exp = 'First part'
      msg = 'First entry should have correct text'
    ).

    " Verify second entry
    READ TABLE lt_parts_table INTO ls_part INDEX 2.
    cl_abap_unit_assert=>assert_equals(
      act = ls_part-text
      exp = 'Second part'
      msg = 'Second entry should have correct text'
    ).
  ENDMETHOD.

ENDCLASS.


CLASS ltc_zatc_edge_cases DEFINITION FINAL
  FOR TESTING
  RISK LEVEL HARMLESS
  DURATION SHORT.

  PRIVATE SECTION.
    METHODS:
      test_empty_structure FOR TESTING,
      test_long_text FOR TESTING,
      test_special_characters FOR TESTING,
      test_unicode_text FOR TESTING.

ENDCLASS.

CLASS ltc_zatc_edge_cases IMPLEMENTATION.

  METHOD test_empty_structure.
    " Test creating an empty structure
    DATA: ls_parts TYPE zatc=>ty_parts.

    " Verify that empty structure has initial value
    cl_abap_unit_assert=>assert_initial(
      act = ls_parts-text
      msg = 'Empty structure should have initial text value'
    ).
  ENDMETHOD.

  METHOD test_long_text.
    " Test with a very long text string
    DATA: ls_parts TYPE zatc=>ty_parts.

    " Create a long text (string type should handle it)
    ls_parts-text = 'This is a very long text that tests the capacity of the string type ' &&
                    'used in the ty_parts structure. String types in ABAP are dynamic and ' &&
                    'can grow to accommodate large amounts of text data without predefined limits. ' &&
                    'This test verifies that the structure can handle such long text values correctly.'.

    " Verify the text is stored correctly
    cl_abap_unit_assert=>assert_not_initial(
      act = ls_parts-text
      msg = 'Long text should be stored in structure'
    ).

    " Verify length is greater than 100 characters
    cl_abap_unit_assert=>assert_true(
      act = COND #( WHEN strlen( ls_parts-text ) > 100 THEN abap_true ELSE abap_false )
      msg = 'Long text should be over 100 characters'
    ).
  ENDMETHOD.

  METHOD test_special_characters.
    " Test with special characters
    DATA: ls_parts TYPE zatc=>ty_parts.

    ls_parts-text = 'Special chars: @#$%^&*()_+-={}[]|:;<>?,./~`'.

    " Verify special characters are preserved
    cl_abap_unit_assert=>assert_equals(
      act = ls_parts-text
      exp = 'Special chars: @#$%^&*()_+-={}[]|:;<>?,./~`'
      msg = 'Special characters should be preserved'
    ).
  ENDMETHOD.

  METHOD test_unicode_text.
    " Test with Unicode characters
    DATA: ls_parts TYPE zatc=>ty_parts.

    ls_parts-text = 'Unicode: Ü Ö Ä ü ö ä ß € ™ © ® ★ ♥ ☺'.

    " Verify Unicode characters are handled
    cl_abap_unit_assert=>assert_not_initial(
      act = ls_parts-text
      msg = 'Unicode text should be stored'
    ).
  ENDMETHOD.

ENDCLASS.


CLASS ltc_zatc_performance DEFINITION FINAL
  FOR TESTING
  RISK LEVEL HARMLESS
  DURATION MEDIUM.

  PRIVATE SECTION.
    METHODS:
      test_bulk_structure_creation FOR TESTING.

ENDCLASS.

CLASS ltc_zatc_performance IMPLEMENTATION.

  METHOD test_bulk_structure_creation.
    " Test creating many structures in a table
    DATA: lt_parts_table TYPE TABLE OF zatc=>ty_parts,
          ls_part TYPE zatc=>ty_parts.

    " Create 1000 entries
    DO 1000 TIMES.
      ls_part-text = |Entry number { sy-index }|.
      APPEND ls_part TO lt_parts_table.
    ENDDO.

    " Verify all entries were created
    cl_abap_unit_assert=>assert_equals(
      act = lines( lt_parts_table )
      exp = 1000
      msg = 'Should create 1000 entries successfully'
    ).

    " Verify first entry
    READ TABLE lt_parts_table INTO ls_part INDEX 1.
    cl_abap_unit_assert=>assert_equals(
      act = ls_part-text
      exp = 'Entry number 1'
      msg = 'First entry should be correct'
    ).

    " Verify last entry
    READ TABLE lt_parts_table INTO ls_part INDEX 1000.
    cl_abap_unit_assert=>assert_equals(
      act = ls_part-text
      exp = 'Entry number 1000'
      msg = 'Last entry should be correct'
    ).
  ENDMETHOD.

ENDCLASS.


CLASS ltc_zatc_integration DEFINITION FINAL
  FOR TESTING
  RISK LEVEL HARMLESS
  DURATION SHORT.

  PRIVATE SECTION.
    DATA cut TYPE REF TO zatc.

    METHODS:
      setup,
      test_class_with_structure FOR TESTING,
      test_sorting_table FOR TESTING,
      test_filtering_table FOR TESTING.

ENDCLASS.

CLASS ltc_zatc_integration IMPLEMENTATION.

  METHOD setup.
    cut = NEW #( ).
  ENDMETHOD.

  METHOD test_class_with_structure.
    " Test using the class and its type definition together
    DATA: lt_parts TYPE TABLE OF zatc=>ty_parts,
          ls_part TYPE zatc=>ty_parts.

    " Verify class instance exists
    cl_abap_unit_assert=>assert_bound(
      act = cut
      msg = 'Class instance should exist'
    ).

    " Use the type definition from the class
    ls_part-text = 'Testing activation parsing fix'.
    APPEND ls_part TO lt_parts.

    " Verify data was added
    cl_abap_unit_assert=>assert_not_initial(
      act = lt_parts
      msg = 'Table should contain data'
    ).
  ENDMETHOD.

  METHOD test_sorting_table.
    " Test sorting a table of ty_parts structures
    DATA: lt_parts TYPE TABLE OF zatc=>ty_parts,
          ls_part TYPE zatc=>ty_parts.

    " Add entries in reverse order
    ls_part-text = 'Zebra'.
    APPEND ls_part TO lt_parts.

    ls_part-text = 'Alpha'.
    APPEND ls_part TO lt_parts.

    ls_part-text = 'Beta'.
    APPEND ls_part TO lt_parts.

    " Sort the table
    SORT lt_parts BY text ASCENDING.

    " Verify first entry after sorting
    READ TABLE lt_parts INTO ls_part INDEX 1.
    cl_abap_unit_assert=>assert_equals(
      act = ls_part-text
      exp = 'Alpha'
      msg = 'After sorting, first entry should be Alpha'
    ).

    " Verify last entry after sorting
    READ TABLE lt_parts INTO ls_part INDEX 3.
    cl_abap_unit_assert=>assert_equals(
      act = ls_part-text
      exp = 'Zebra'
      msg = 'After sorting, last entry should be Zebra'
    ).
  ENDMETHOD.

  METHOD test_filtering_table.
    " Test filtering a table of ty_parts structures
    DATA: lt_parts TYPE TABLE OF zatc=>ty_parts,
          lt_filtered TYPE TABLE OF zatc=>ty_parts,
          ls_part TYPE zatc=>ty_parts.

    " Add test entries
    ls_part-text = 'Test activation'.
    APPEND ls_part TO lt_parts.

    ls_part-text = 'Production data'.
    APPEND ls_part TO lt_parts.

    ls_part-text = 'Test parsing'.
    APPEND ls_part TO lt_parts.

    " Filter entries containing 'Test'
    LOOP AT lt_parts INTO ls_part WHERE text CS 'Test'.
      APPEND ls_part TO lt_filtered.
    ENDLOOP.

    " Verify filtered table has correct number of entries
    cl_abap_unit_assert=>assert_equals(
      act = lines( lt_filtered )
      exp = 2
      msg = 'Should have 2 entries containing Test'
    ).
  ENDMETHOD.

ENDCLASS.