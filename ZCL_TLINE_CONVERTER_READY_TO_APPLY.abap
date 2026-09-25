**********************************************************************
* Class: ZCL_TLINE_CONVERTER
* Purpose: Convert between TLINE table and String
* Package: ZFG
* Transport: S4HK908550
*
* Usage:
*   DATA(lv_string) = zcl_tline_converter=>tline_to_string( it_tline = lt_lines ).
*   DATA(lt_tline) = zcl_tline_converter=>string_to_tline( iv_string = lv_text ).
**********************************************************************

CLASS zcl_tline_converter DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC .

  PUBLIC SECTION.
    TYPES: BEGIN OF ty_tline,
             tdformat TYPE c LENGTH 2,
             tdline   TYPE c LENGTH 132,
           END OF ty_tline.
    
    TYPES ty_tline_tab TYPE STANDARD TABLE OF ty_tline WITH DEFAULT KEY.

    CLASS-METHODS tline_to_string
      IMPORTING
        it_tline        TYPE ty_tline_tab
        iv_separator    TYPE c LENGTH 1 DEFAULT cl_abap_char_utilities=>newline
      RETURNING
        VALUE(rv_string) TYPE string.

    CLASS-METHODS string_to_tline
      IMPORTING
        iv_string       TYPE string
        iv_separator    TYPE c LENGTH 1 DEFAULT cl_abap_char_utilities=>newline
        iv_line_length  TYPE i DEFAULT 132
      RETURNING
        VALUE(rt_tline) TYPE ty_tline_tab.

  PROTECTED SECTION.
  PRIVATE SECTION.
ENDCLASS.



CLASS zcl_tline_converter IMPLEMENTATION.


  METHOD tline_to_string.
    DATA ls_tline TYPE ty_tline.
    
    CLEAR rv_string.
    
    IF it_tline IS INITIAL.
      RETURN.
    ENDIF.

    LOOP AT it_tline INTO ls_tline.
      IF sy-tabix = 1.
        rv_string = ls_tline-tdline.
      ELSE.
        rv_string = rv_string && iv_separator && ls_tline-tdline.
      ENDIF.
    ENDLOOP.

  ENDMETHOD.


  METHOD string_to_tline.
    DATA: lv_line_length TYPE i,
          lv_offset      TYPE i,
          lv_remaining   TYPE i,
          lv_chunk_len   TYPE i,
          lv_chunk       TYPE string,
          lv_line        TYPE string,
          lt_lines       TYPE STANDARD TABLE OF string.
    
    CLEAR rt_tline.
    
    IF iv_string IS INITIAL.
      RETURN.
    ENDIF.

    lv_line_length = iv_line_length.
    IF lv_line_length <= 0 OR lv_line_length > 132.
      lv_line_length = 132.
    ENDIF.

    IF iv_separator IS NOT INITIAL.
      SPLIT iv_string AT iv_separator INTO TABLE lt_lines.
      
      LOOP AT lt_lines INTO lv_line.
        IF strlen( lv_line ) > lv_line_length.
          lv_offset = 0.
          WHILE lv_offset < strlen( lv_line ).
            lv_remaining = strlen( lv_line ) - lv_offset.
            IF lv_remaining > lv_line_length.
              lv_chunk_len = lv_line_length.
            ELSE.
              lv_chunk_len = lv_remaining.
            ENDIF.
            lv_chunk = substring( val = lv_line off = lv_offset len = lv_chunk_len ).
            APPEND VALUE #( tdformat = '' tdline = lv_chunk ) TO rt_tline.
            lv_offset = lv_offset + lv_line_length.
          ENDWHILE.
        ELSE.
          APPEND VALUE #( tdformat = '' tdline = lv_line ) TO rt_tline.
        ENDIF.
      ENDLOOP.
    ELSE.
      lv_offset = 0.
      WHILE lv_offset < strlen( iv_string ).
        lv_remaining = strlen( iv_string ) - lv_offset.
        IF lv_remaining > lv_line_length.
          lv_chunk_len = lv_line_length.
        ELSE.
          lv_chunk_len = lv_remaining.
        ENDIF.
        lv_chunk = substring( val = iv_string off = lv_offset len = lv_chunk_len ).
        APPEND VALUE #( tdformat = '' tdline = lv_chunk ) TO rt_tline.
        lv_offset = lv_offset + lv_line_length.
      ENDWHILE.
    ENDIF.

  ENDMETHOD.
ENDCLASS.






