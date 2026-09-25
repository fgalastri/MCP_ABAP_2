CLASS zcl_xco_simple_demo DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC .

  PUBLIC SECTION.
    METHODS: test_method
      IMPORTING
        iv_input TYPE string
      EXPORTING
        ev_result TYPE string.

ENDCLASS.

CLASS zcl_xco_simple_demo IMPLEMENTATION.

  METHOD test_method.
    ev_result = |Processed: { iv_input }|.
  ENDMETHOD.

ENDCLASS.