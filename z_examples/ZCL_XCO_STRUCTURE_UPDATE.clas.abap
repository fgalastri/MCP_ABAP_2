CLASS zcl_xco_structure_update DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC .

  PUBLIC SECTION.
    CONSTANTS: co_package TYPE sxco_package VALUE 'ZXCO_TEST',
               co_transport TYPE sxco_transport VALUE 'S4DK900001',
               co_structure_name TYPE sxco_ad_object_name VALUE 'ZXCO_DEMO_STRUCTURE'.

    METHODS: update_structure
      RETURNING VALUE(rv_message) TYPE string.

  PRIVATE SECTION.
ENDCLASS.

CLASS zcl_xco_structure_update IMPLEMENTATION.
  METHOD update_structure.
    DATA: transport_request TYPE sxco_transport VALUE co_transport.

    TRY.
        IF xco_cp_abap_dictionary=>structure( co_structure_name )->exists( ) = abap_false.
          rv_message = |ERROR: Structure { co_structure_name } does not exist|.
          RETURN.
        ENDIF.

        DATA(lo_patch_operation) = xco_cp_generation=>environment->dev_system( transport_request )->create_patch_operation( ).

        DATA(lo_object_to_patch) = lo_patch_operation->for-tabl-for-structure->add_object( co_structure_name ).

        " CRITICAL FIX: Use get_change_specification first, then create if initial
        DATA(lo_change_specification) = lo_object_to_patch->get_change_specification( ).
        IF lo_change_specification IS INITIAL.
          lo_change_specification = lo_object_to_patch->create_change_specification( ).
        ENDIF.

        " Add new components to the structure
        DATA(lo_update_section) = lo_change_specification->for-update.

        lo_update_section->add_component( 'LAST_MODIFIED_BY' )->set_type( 
          xco_cp_abap_dictionary=>built_in_type->char( 12 ) ).

        lo_update_section->add_component( 'LAST_MODIFIED_DATE' )->set_type( 
          xco_cp_abap_dictionary=>built_in_type->dats ).

        lo_update_section->add_component( 'LAST_MODIFIED_TIME' )->set_type( 
          xco_cp_abap_dictionary=>built_in_type->tims ).

        lo_update_section->add_component( 'VERSION_NUMBER' )->set_type( 
          xco_cp_abap_dictionary=>built_in_type->numc( 10 ) ).

        lo_update_section->add_component( 'PRIORITY' )->set_type( 
          xco_cp_abap_dictionary=>built_in_type->numc( 2 ) ).

        DATA(lo_result) = lo_patch_operation->execute( ).

        IF lo_result->findings->contain_errors( ) = abap_true.
          DATA(findings_objects) = lo_result->findings->get( ).
          LOOP AT findings_objects INTO DATA(finding_object).
            rv_message = rv_message && |Error: { finding_object->message->get_text( ) }. |.
          ENDLOOP.
        ELSE.
          rv_message = |Structure { co_structure_name } updated successfully with new components|.
        ENDIF.

      CATCH cx_xco_gen_patch_exception INTO DATA(patch_exc).
        DATA(messages) = patch_exc->if_xco_news~get_messages( ).
        LOOP AT messages INTO DATA(lo_msg).
          DATA(typ) = lo_msg->get_type( )->value.
          DATA(txt) = lo_msg->get_text( ).
          rv_message = rv_message && |{ typ }: { txt }. |.
        ENDLOOP.

      CATCH cx_root INTO DATA(exc).
        rv_message = |Exception: { exc->get_text( ) }|.
    ENDTRY.
  ENDMETHOD.
ENDCLASS.
