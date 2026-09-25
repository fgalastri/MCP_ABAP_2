CLASS zcl_xco_data_element_creation DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC .

  PUBLIC SECTION.
    CONSTANTS: co_package TYPE sxco_package VALUE 'ZXCO_TEST',
               co_transport TYPE sxco_transport VALUE 'S4DK900001',
               co_data_element_name TYPE sxco_ad_object_name VALUE 'ZXCO_DEMO_DTEL',
               co_domain_name TYPE sxco_ad_object_name VALUE 'ZXCO_DEMO_DOMAIN'.

    METHODS: create_data_element
      RETURNING VALUE(rv_message) TYPE string.

  PRIVATE SECTION.
ENDCLASS.

CLASS zcl_xco_data_element_creation IMPLEMENTATION.
  METHOD create_data_element.
    DATA: transport_request TYPE sxco_transport VALUE co_transport.

    TRY.
        IF xco_cp_abap_dictionary=>data_element( co_data_element_name )->exists( ) = abap_true.
          rv_message = |Data element { co_data_element_name } already exists|.
          RETURN.
        ENDIF.

        DATA(lo_put_operation) = xco_cp_generation=>environment->dev_system( transport_request )->create_put_operation( ).

        DATA(lo_form_specification) = lo_put_operation->for-dtel->add_object( co_data_element_name
          )->set_package( co_package
          )->create_form_specification( ).

        lo_form_specification->set_short_description( 'XCO Demo Data Element for Status' ).

        lo_form_specification->set_data_type( xco_cp_abap_dictionary=>domain( co_domain_name ) ).

        lo_form_specification->field_label->short->set_label( 'Status' ).
        lo_form_specification->field_label->medium->set_label( 'Status Code' ).
        lo_form_specification->field_label->long->set_label( 'Status Code Value' ).
        lo_form_specification->field_label->heading->set_label( 'Status' ).

        DATA(lo_result) = lo_put_operation->execute( ).

        IF lo_result->findings->contain_errors( ) = abap_true.
          DATA(findings_objects) = lo_result->findings->get( ).
          LOOP AT findings_objects INTO DATA(finding_object).
            rv_message = rv_message && |Error: { finding_object->message->get_text( ) }. |.
          ENDLOOP.
        ELSE.
          rv_message = |Data element { co_data_element_name } created successfully|.
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

