CLASS zcl_copy_test1_complete DEFINITION
  PUBLIC FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    INTERFACES if_oo_adt_classrun.

    METHODS create_complete_copy_class
      IMPORTING
        iv_dummy TYPE c DEFAULT 'X'
      EXPORTING
        error    TYPE abap_boolean
        messages TYPE bapiret2_tab.

  PROTECTED SECTION.
  PRIVATE SECTION.
    METHODS get_local_type_reference
      IMPORTING
        iv_type_name TYPE string
      RETURNING
        VALUE(ro_type_reference) TYPE REF TO if_xco_gen_ao_type_attribute.
ENDCLASS.

CLASS zcl_copy_test1_complete IMPLEMENTATION.
  METHOD if_oo_adt_classrun~main.
    create_complete_copy_class(
      EXPORTING
        iv_dummy = 'X'
      IMPORTING
        error    = DATA(error)
        messages = DATA(messages)
    ).

    IF error = abap_true.
      LOOP AT messages INTO DATA(message).
        out->write( |{ message-type }: { message-message }| ).
      ENDLOOP.
    ELSE.
      out->write( 'ZCOPY_TEST1 class created successfully with all types!' ).
    ENDIF.
  ENDMETHOD.

  METHOD create_complete_copy_class.
    " TODO: parameter IV_DUMMY is never used (ABAP cleaner)

    DATA transport_request TYPE c LENGTH 20  VALUE 'NC1K902580'.
    DATA classname         TYPE c LENGTH 30  VALUE 'ZCOPY_TEST2'.
    DATA package           TYPE sxco_package VALUE 'ZFG_TEST1'.

    " Check if class already exists
    DATA(class) = xco_cp_abap=>class( to_upper( classname ) ).
    IF class->exists( ) = abap_true.
      DATA(ls_message) = VALUE bapiret2( type    = 'E'
                                         message = 'Class ZCOPY_TEST1 already exists' ).
      APPEND ls_message TO messages.
      error = abap_true.
      RETURN.
    ENDIF.

    TRY.
        " Create the class with all types from original
        DATA(operation) = xco_cp_generation=>environment->dev_system( transport_request )->create_put_operation( ).
        DATA(lo_spec) = operation->for-clas->add_object( classname )->set_package( package )->create_form_specification( ).

        " Set class description
        lo_spec->set_short_description( 'Copy of LE914 Parameter Accessor' ).

        " Add all basic types with exact same names as original
        lo_spec->definition->section-public->add_type( 'CHAR1' )->for( xco_cp_abap=>type-built_in->c( 1 ) ).

        lo_spec->definition->section-public->add_type( 'CHAR3' )->for( xco_cp_abap=>type-built_in->c( 3 ) ).

        DATA(seila) = lo_spec->definition->section-public->add_type( 'CHAR4' )->for( xco_cp_abap=>type-built_in->c( 4 ) ).


        DATA lt_components TYPE if_xco_gen_ao_s_fo_c_type=>tt_component.

        " Build the component definition
        lt_components = VALUE #(
          ( name = 'FIELD1'    " name of first component
            type = xco_cp_abap=>type-built_in->string )  " built‑in type STRING
          ( name = 'FIELD2'
            type = xco_cp_abap=>type-built_in->i )        " built‑in type INT4 (i)
        ).

        " First create the structure type
        lo_spec->definition->section-public->add_type( 'TY_CUSTOM_STRUCTURE' )->for_structure( lt_components ).

        " Add data attribute using the custom structure type
        " Use a simple string-based approach by creating a custom type reference
        DATA(lo_custom_type) = xco_cp_abap=>class( classname )->type( 'TY_CUSTOM_STRUCTURE' ).
        lo_spec->definition->section-public->add_data( 'DATA_TEST1' )->set_type(
          EXPORTING
            io_type = lo_custom_type
        ).

        " Add another attribute using built-in type
        lo_spec->definition->section-public->add_data( 'DATA_TEST2' )->set_type(
          EXPORTING
            io_type = xco_cp_abap=>type-built_in->string
        ).

        " Create custom parameter structure for method 3
        DATA lt_param_components TYPE if_xco_gen_ao_s_fo_c_type=>tt_component.
        lt_param_components = VALUE #(
          ( name = 'PARAM_STRING'
            type = xco_cp_abap=>type-built_in->string )
          ( name = 'PARAM_INTEGER'
            type = xco_cp_abap=>type-built_in->i )
          ( name = 'PARAM_DATE'
            type = xco_cp_abap=>type-built_in->d )
        ).
        lo_spec->definition->section-public->add_type( 'TY_METHOD_PARAMS' )->for_structure( lt_param_components ).

        " Method 1: Simple method without parameters
        DATA(lo_method1) = lo_spec->definition->section-public->add_method( 'METHOD_NO_PARAMS' ).
        lo_method1->set_short_description( 'Simple method without parameters' ).

        " Method 2: Method with importing and exporting parameters (all built-in types)
        DATA(lo_method2) = lo_spec->definition->section-public->add_method( 'METHOD_WITH_BUILTIN_PARAMS' ).
        lo_method2->set_short_description( 'Method with built-in type parameters' ).
        
        " Add importing parameters
        lo_method2->add_importing_parameter( 'IV_STRING' )->set_type(
          EXPORTING
            io_type = xco_cp_abap=>type-built_in->string
        ).
        lo_method2->add_importing_parameter( 'IV_INTEGER' )->set_type(
          EXPORTING
            io_type = xco_cp_abap=>type-built_in->i
        ).
        lo_method2->add_importing_parameter( 'IV_DATE' )->set_type(
          EXPORTING
            io_type = xco_cp_abap=>type-built_in->d
        ).
        DATA(lo_char1_type) = xco_cp_abap=>class( classname )->type( 'CHAR1' ).
        lo_method2->add_importing_parameter( 'IV_BOOLEAN' )->set_type(
          EXPORTING
            io_type = lo_char1_type
        ).
        
        " Add exporting parameters
        lo_method2->add_exporting_parameter( 'EV_RESULT' )->set_type(
          EXPORTING
            io_type = xco_cp_abap=>type-built_in->string
        ).
        lo_method2->add_exporting_parameter( 'EV_COUNT' )->set_type(
          EXPORTING
            io_type = xco_cp_abap=>type-built_in->i
        ).

        " Method 3: Method with custom type importing and returning parameters
        DATA(lo_method3) = lo_spec->definition->section-public->add_method( 'METHOD_WITH_CUSTOM_TYPES' ).
        lo_method3->set_short_description( 'Method with custom type parameters' ).
        
        " Add importing parameter with custom structure type
        DATA(lo_custom_param_type) = xco_cp_abap=>class( classname )->type( 'TY_METHOD_PARAMS' ).
        lo_method3->add_importing_parameter( 'IS_PARAMS' )->set_type(
          EXPORTING
            io_type = lo_custom_param_type
        ).
        
        " Add returning parameter with custom structure type
        lo_method3->add_returning_parameter( 'RS_RESULT' )->set_type(
          EXPORTING
            io_type = lo_custom_type
        ).

        " Add method implementations
        lo_spec->implementation->add_method( 'METHOD_NO_PARAMS' )->set_source( VALUE #(
          ( |    " Simple method implementation| )
          ( |    " This method demonstrates a parameterless method| )
          ( |    MESSAGE 'Method executed successfully' TYPE 'I'.| )
        ) ).

        lo_spec->implementation->add_method( 'METHOD_WITH_BUILTIN_PARAMS' )->set_source( VALUE #(
          ( |    " Method with built-in parameters implementation| )
          ( |    ev_result = 'Result: ' && iv_string && ' - ' && iv_integer && ' - ' && iv_date.| )
          ( |    IF iv_boolean = 'X'.| )
          ( |      ev_count = iv_integer * 2.| )
          ( |    ELSE.| )
          ( |      ev_count = iv_integer.| )
          ( |    ENDIF.| )
        ) ).

        lo_spec->implementation->add_method( 'METHOD_WITH_CUSTOM_TYPES' )->set_source( VALUE #(
          ( |    " Method with custom types implementation| )
          ( |    rs_result-field1 = 'Processed: ' && is_params-param_string.| )
          ( |    rs_result-field2 = is_params-param_integer + 100.| )
        ) ).

        " Execute the operation
        DATA(result) = operation->execute( ).

        " Check for errors
        IF result->findings->contain_errors( ).
          error = abap_true.
          DATA(findings_objects) = result->findings->get( ).
          LOOP AT findings_objects INTO DATA(finding_object).
            DATA(ls_error_msg) = VALUE bapiret2( type    = 'E'
                                                 message = finding_object->message->get_text( ) ).
            APPEND ls_error_msg TO messages.
          ENDLOOP.
        ELSE.
          DATA(ls_success_msg) = VALUE bapiret2(
                                           type    = 'S'
                                           message = 'Class ZCOPY_TEST1 created successfully with all basic types' ).
          APPEND ls_success_msg TO messages.
        ENDIF.

      CATCH cx_xco_gen_put_exception INTO DATA(exc).
        error = abap_true.
        DATA(lt_msgs) = exc->if_xco_news~get_messages( ).
        LOOP AT lt_msgs INTO DATA(lo_msg).
          DATA(txt) = lo_msg->get_text( ).
          DATA(ls_exc_msg) = VALUE bapiret2( type    = 'E'
                                             message = txt ).
          APPEND ls_exc_msg TO messages.
        ENDLOOP.
    ENDTRY.
  ENDMETHOD.

  METHOD get_local_type_reference.
    " This method is no longer needed - keeping for compatibility
    " Use xco_cp_abap=>class( classname )->type( iv_type_name ) instead
    ro_type_reference = xco_cp_abap=>type-built_in->string.
  ENDMETHOD.
ENDCLASS.