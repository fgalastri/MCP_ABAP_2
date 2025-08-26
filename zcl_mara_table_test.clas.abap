CLASS zcl_mara_table_test DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC .

  PUBLIC SECTION.
    METHODS: process_mara_data
      IMPORTING 
        it_mara_input TYPE mara_tt
      EXPORTING
        et_marc_output TYPE marc_tt.

  PROTECTED SECTION.
  PRIVATE SECTION.

ENDCLASS.

CLASS zcl_mara_table_test IMPLEMENTATION.

  METHOD process_mara_data.
    " Select MARC data based on materials from input
    DATA: lr_matnr TYPE RANGE OF matnr,
          ls_matnr LIKE LINE OF lr_matnr.
    
    " Extract material numbers from input and build range table
    LOOP AT it_mara_input INTO DATA(ls_mara).
      ls_matnr-sign = 'I'.
      ls_matnr-option = 'EQ'.
      ls_matnr-low = ls_mara-matnr.
      CLEAR ls_matnr-high.
      APPEND ls_matnr TO lr_matnr.
    ENDLOOP.
    
    " Select MARC records for these materials
    IF lr_matnr IS NOT INITIAL.
      SELECT * FROM marc
        INTO TABLE et_marc_output
        WHERE matnr IN lr_matnr.
    ENDIF.
    
  ENDMETHOD.

ENDCLASS.
