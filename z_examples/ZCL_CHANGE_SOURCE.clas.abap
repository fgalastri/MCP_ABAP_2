CLASS zcl_change_source DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC .


  PUBLIC SECTION.
    INTERFACES if_oo_adt_classrun.
ENDCLASS.



CLASS zcl_change_source IMPLEMENTATION.
  METHOD if_oo_adt_classrun~main.
    DATA transport_request TYPE c LENGTH 20 VALUE 'NC1K902580'.
    " TODO: variable is assigned but never used (ABAP cleaner)
    DATA messages          TYPE bapiret2_tab.

    TRY.
        DATA(patch_operation) = xco_cp_generation=>environment->dev_system( transport_request )->for-clas->create_patch_operation( ).
        DATA(object_to_patch) = patch_operation->add_object( 'ZCOPY_TEST3' ).

        " Add new method with CHANGING parameter
        " TODO: variable is assigned but never used (ABAP cleaner)
        DATA(lo_new_method) = object_to_patch->for-update->definition->section-public->add_method(
                                  'METHOD_WITH_CUSTOM_TYPES' ).

        DATA method_source TYPE if_xco_gen_clas_s_fo_i_method=>tt_source.
        APPEND |    " New method implementation with changing parameter| TO method_source.

        object_to_patch->for-insert->implementation->add_method( 'METHOD_WITH_CUSTOM_TYPES' )->set_source( method_source ).

        " Execute the patch operation
        DATA(result) = patch_operation->execute( ).

        " Check for errors
        IF result->findings->contain_errors( ).
          " TODO: variable is assigned but never used (ABAP cleaner)
          DATA(error) = abap_true.
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