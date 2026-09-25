CLASS zcl_xco_table_type_creation DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC .

  PUBLIC SECTION.
    CONSTANTS: co_package TYPE sxco_package VALUE 'ZXCO_TEST',
               co_transport TYPE sxco_transport VALUE 'S4DK900001',
               co_table_type_name TYPE sxco_ad_object_name VALUE 'ZXCO_TT_DEMO_TABLE',
               co_structure_name TYPE sxco_ad_object_name VALUE 'ZXCO_DEMO_STRUCTURE'.

    METHODS: create_table_type
      RETURNING VALUE(rv_message) TYPE string.

  PRIVATE SECTION.
ENDCLASS.

CLASS zcl_xco_table_type_creation IMPLEMENTATION.
  METHOD create_table_type.
    DATA: transport_request TYPE sxco_transport VALUE co_transport.

    TRY.
        IF xco_cp_abap_dictionary=>table_type( co_table_type_name )->exists( ) = abap_true.
          rv_message = |Table type { co_table_type_name } already exists|.
          RETURN.
        ENDIF.

        DATA(lo_put_operation) = xco_cp_generation=>environment->dev_system( transport_request )->create_put_operation( ).

        DATA(lo_form_specification) = lo_put_operation->for-ttyp->add_object( co_table_type_name
          )->set_package( co_package
          )->create_form_specification( ).

        lo_form_specification->set_short_description( 'XCO Demo Table Type for Structure' ).

        lo_form_specification->set_row_type( xco_cp_abap_dictionary=>structure( co_structure_name ) ).

        lo_form_specification->set_access( xco_table_type=>access->standard_table ).

        lo_form_specification->set_key_definition( xco_table_type=>key_definition->user_defined ).

        lo_form_specification->set_primary_key( xco_table_type=>primary_key->non_unique ).

        lo_form_specification->set_initial_number_of_rows( 100 ).

        DATA(lo_result) = lo_put_operation->execute( ).

        IF lo_result->findings->contain_errors( ) = abap_true.
          DATA(findings_objects) = lo_result->findings->get( ).
          LOOP AT findings_objects INTO DATA(finding_object).
            rv_message = rv_message && |Error: { finding_object->message->get_text( ) }. |.
          ENDLOOP.
        ELSE.
          rv_message = |Table type { co_table_type_name } created successfully|.
        ENDIF.

      CATCH cx_xco_gen_put_exception INTO DATA(put_exc).
        DATA(messages) = put_exc->if_xco_news~get_messages( ).
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

