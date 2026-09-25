CLASS zcl_class_modifier DEFINITION
  PUBLIC FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    INTERFACES if_oo_adt_classrun.

    METHODS modify_existing_class
      IMPORTING
        iv_dummy TYPE c DEFAULT 'X'
      EXPORTING
        error    TYPE abap_boolean
        messages TYPE bapiret2_tab.

  PROTECTED SECTION.
  PRIVATE SECTION.
ENDCLASS.

CLASS zcl_class_modifier IMPLEMENTATION.
  METHOD if_oo_adt_classrun~main.
    modify_existing_class(
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
      out->write( 'ZCOPY_TEST3 class modified successfully!' ).
    ENDIF.
  ENDMETHOD.

  METHOD modify_existing_class.
    DATA transport_request TYPE c LENGTH 20  VALUE 'NC1K902580'.
    DATA classname         TYPE c LENGTH 30  VALUE 'ZCOPY_TEST3'.

    " Check if class exists - we need it to exist for modification
    DATA(class) = xco_cp_abap=>class( to_upper( classname ) ).
    IF class->exists( ) = abap_false.
      DATA(ls_message) = VALUE bapiret2( type    = 'E'
                                         message = 'Class ZCOPY_TEST3 does not exist - create it first' ).
      APPEND ls_message TO messages.
      error = abap_true.
      RETURN.
    ENDIF.

    TRY.
        " Create PATCH operation for modifying existing class - CORRECT SYNTAX
        DATA(patch_operation) = xco_cp_generation=>environment->dev_system( transport_request )->for-clas->create_patch_operation( ).
        DATA(object_to_patch) = patch_operation->add_object( classname ).

        " Add new method with CHANGING parameter
        DATA(lo_new_method) = object_to_patch->for-insert->definition->section-public->add_method( 'NEW_METHOD_WITH_CHANGING' ).
        lo_new_method->set_short_description( 'New method with changing parameter' ).
        
        " Add changing parameter - this demonstrates a parameter type we haven't used yet
        lo_new_method->add_changing_parameter( 'CV_DATA' )->set_type( xco_cp_abap=>type-built_in->string ).
        
        " Add importing parameter for completeness
        lo_new_method->add_importing_parameter( 'IV_MODE' )->set_type( xco_cp_abap=>type-built_in->string ).

        " Remove an existing method - assume METHOD_NO_PARAMS exists
        object_to_patch->for-delete->definition->section-public->add_method( 'METHOD_NO_PARAMS' ).

        " Add implementation for the new method
        DATA method_source TYPE if_xco_gen_clas_s_fo_i_method=>tt_source.
        APPEND |    " New method implementation with changing parameter| TO method_source.
        APPEND |    CASE iv_mode.| TO method_source.
        APPEND |      WHEN 'U'.| TO method_source.
        APPEND |        cv_data = to_upper( cv_data ).| TO method_source.
        APPEND |      WHEN 'L'.| TO method_source.
        APPEND |        cv_data = to_lower( cv_data ).| TO method_source.
        APPEND |      WHEN OTHERS.| TO method_source.
        APPEND |        cv_data = 'Modified: ' && cv_data.| TO method_source.
        APPEND |    ENDCASE.| TO method_source.
        
        object_to_patch->for-insert->implementation->add_method( 'NEW_METHOD_WITH_CHANGING' )->set_source( method_source ).

        " Add another new method to demonstrate multiple additions
        DATA(lo_method2) = object_to_patch->for-insert->definition->section-public->add_method( 'VALIDATE_DATA' ).
        lo_method2->set_short_description( 'Data validation method' ).
        
        " Add parameters with different types
        lo_method2->add_importing_parameter( 'IV_INPUT' )->set_type( xco_cp_abap=>type-built_in->string ).
        lo_method2->add_returning_parameter( 'RV_VALID' )->set_type( xco_cp_abap=>type-built_in->string ).

        " Implementation for validation method
        DATA validation_source TYPE if_xco_gen_clas_s_fo_i_method=>tt_source.
        APPEND |    " Simple validation logic| TO validation_source.
        APPEND |    IF strlen( iv_input ) > 0 AND iv_input CN ' '.| TO validation_source.
        APPEND |      rv_valid = 'X'.| TO validation_source.
        APPEND |    ELSE.| TO validation_source.
        APPEND |      rv_valid = ' '.| TO validation_source.
        APPEND |    ENDIF.| TO validation_source.
        
        object_to_patch->for-insert->implementation->add_method( 'VALIDATE_DATA' )->set_source( validation_source ).

        " Execute the patch operation
        DATA(result) = patch_operation->execute( ).

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
                                           message = 'Class ZCOPY_TEST3 modified successfully - added methods with changing parameters' ).
          APPEND ls_success_msg TO messages.
        ENDIF.

      CATCH cx_xco_gen_patch_exception INTO DATA(exc).
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
ENDCLASS.
