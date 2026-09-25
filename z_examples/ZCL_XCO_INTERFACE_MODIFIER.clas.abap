"! <p class="shorttext synchronized" lang="EN">
"!  XCO Interface Modification - Working Example
"! </p>
"!
"! Complete working example for modifying interfaces using XCO library.
"! Demonstrates adding methods, updating method parameters, and changing constants.
"! Based on successful class modification pattern.
CLASS zcl_xco_interface_modifier DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    INTERFACES if_oo_adt_classrun.

    METHODS modify_interface
      IMPORTING
        iv_dummy TYPE c DEFAULT 'X'
      RETURNING
        VALUE(rv_message) TYPE string.

  PROTECTED SECTION.
  PRIVATE SECTION.
    CONSTANTS:
      co_package TYPE sxco_package VALUE 'ZFG_TEST1',
      co_transport TYPE c LENGTH 20 VALUE 'NC1K902580',
      co_interface_name TYPE sxco_ao_object_name VALUE 'ZIF_XCO_DEMO_INTERFACE'.
ENDCLASS.

CLASS zcl_xco_interface_modifier IMPLEMENTATION.
  METHOD if_oo_adt_classrun~main.
    DATA(result) = modify_interface( ).
    out->write( result ).
  ENDMETHOD.

  METHOD modify_interface.
    TRY.
        " Check if interface exists
        DATA(lo_interface) = xco_cp_abap=>interface( co_interface_name ).
        IF lo_interface->exists( ) = abap_false.
          rv_message = |ERROR: Interface { co_interface_name } does not exist|.
          RETURN.
        ENDIF.

        " Create PATCH operation for interface
        DATA(lo_patch_operation) = xco_cp_generation=>environment->dev_system( co_transport )->create_patch_operation( ).

        " Add interface object to patch
        DATA(lo_object_to_patch) = lo_patch_operation->for-intf->add_object( co_interface_name ).

        " 1. Add a new type
        lo_object_to_patch->for-insert->add_type( 'TY_NEW_STATUS' )->for( xco_cp_abap=>type-built_in->string ).

        " 2. Add a new constant
        lo_object_to_patch->for-insert->add_constant( 'CO_STATUS_PENDING' )->set_type( xco_cp_abap=>type-built_in->string
          )->set_string_value( |'PENDING'| ).

        " 3. Update existing constant (change its value)
        lo_object_to_patch->for-update->add_constant( 'CO_STATUS_ACTIVE' )->set_type( xco_cp_abap=>type-built_in->string
          )->set_string_value( |'ACTIVE_NEW'| ).

        " 4. Add a new method
        DATA(lo_new_method) = lo_object_to_patch->for-insert->add_method( 'PROCESS_STATUS' ).
        lo_new_method->add_importing_parameter( 'IV_OLD_STATUS' )->set_type( xco_cp_abap=>interface( co_interface_name )->type( 'TY_NEW_STATUS' ) ).
        lo_new_method->add_importing_parameter( 'IV_NEW_STATUS' )->set_type( xco_cp_abap=>interface( co_interface_name )->type( 'TY_NEW_STATUS' ) ).
        lo_new_method->add_returning_parameter( 'RV_SUCCESS' )->set_type( xco_cp_abap=>type-built_in->string ).

        " 5. Update existing method (add new parameter)
        DATA(lo_update_method) = lo_object_to_patch->for-update->add_method( 'GET_DATA' ).
        lo_update_method->add_importing_parameter( 'IV_INCLUDE_INACTIVE' )->set_type( xco_cp_abap=>type-built_in->string ).

        " 6. Add another method with complex parameters
        DATA(lo_complex_method) = lo_object_to_patch->for-insert->add_method( 'BULK_PROCESS' ).
        lo_complex_method->add_importing_parameter( 'IT_INPUT_DATA' )->set_type( xco_cp_abap=>interface( co_interface_name )->type( 'TT_DATA_TABLE' ) ).
        lo_complex_method->add_changing_parameter( 'CT_STATUS_LOG' )->set_type( xco_cp_abap=>interface( co_interface_name )->type( 'TT_DATA_TABLE' ) ).
        lo_complex_method->add_exporting_parameter( 'EV_PROCESSED_COUNT' )->set_type( xco_cp_abap=>type-built_in->i ).
        lo_complex_method->add_returning_parameter( 'RV_RESULT' )->set_type( xco_cp_abap=>type-built_in->string ).

        " Execute the modification
        DATA(lo_result) = lo_patch_operation->execute( ).

        " Check for errors
        IF lo_result->findings->contain_errors( ) = abap_true.
          DATA(findings_objects) = lo_result->findings->get( ).
          LOOP AT findings_objects INTO DATA(finding_object).
            rv_message = |ERROR: { finding_object->message->get_text( ) }|.
            RETURN.
          ENDLOOP.
        ENDIF.

        rv_message = |SUCCESS: Interface { co_interface_name } modified successfully - added types, constants, and methods|.

      CATCH cx_xco_gen_patch_exception INTO DATA(lx_patch_exception).
        DATA(lt_messages) = lx_patch_exception->if_xco_news~get_messages( ).
        LOOP AT lt_messages INTO DATA(lo_msg).
          DATA(lv_msg_text) = lo_msg->get_text( ).
          DATA(lv_msg_type) = lo_msg->get_type( )->value.
          rv_message = |ERROR: { lv_msg_type } - { lv_msg_text }|.
          RETURN.
        ENDLOOP.

      CATCH cx_root INTO DATA(lx_root).
        rv_message = |ERROR: { lx_root->get_text( ) }|.
    ENDTRY.
  ENDMETHOD.
ENDCLASS.

