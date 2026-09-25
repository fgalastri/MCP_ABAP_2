CLASS zcl_hello_world_xco DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC .

  PUBLIC SECTION.
    METHODS: create_hello_world_class
      IMPORTING
        iv_class_name TYPE string
      EXPORTING
        ev_result TYPE string.

  PROTECTED SECTION.
  PRIVATE SECTION.

ENDCLASS.

CLASS zcl_hello_world_xco IMPLEMENTATION.

  METHOD create_hello_world_class.
    DATA: transport_request TYPE sxco_transport VALUE 'NC1K902580',
          package_name TYPE sxco_package VALUE 'ZFG_TEST1'.

    TRY.
        DATA(lo_put_operation) = xco_cp_generation=>environment->dev_system( transport_request )->create_put_operation( ).
        DATA(lo_form_specification) = lo_put_operation->for-clas->add_object( 'ZCL_HELLO_WORLD_TARGET'
          )->set_package( package_name )->create_form_specification( ).
        lo_form_specification->set_short_description( 'Hello World Test Class' ).
        lo_form_specification->add_data( 'MV_TEST' )->set_type( xco_cp_abap=>type-built_in->string ).
        DATA(lo_result) = lo_put_operation->execute( ).
        
        IF lo_result->findings->contain_errors( ) = abap_true.
          DATA(findings_objects) = lo_result->findings->get( ).
          LOOP AT findings_objects INTO DATA(finding_object).
            ev_result = ev_result && |Error: { finding_object->message->get_text( ) }. |.
          ENDLOOP.
        ELSE.
          ev_result = |SUCCESS: Hello World class created successfully|.
        ENDIF.
        
      CATCH cx_sy_import_format_error INTO DATA(import_exc).
        ev_result = |Import format error: { import_exc->get_text( ) }|.
      CATCH cx_xco_gen_put_exception INTO DATA(put_exc).
        DATA(messages) = put_exc->if_xco_news~get_messages( ).
        LOOP AT messages INTO DATA(lo_msg).
          DATA(typ) = lo_msg->get_type( )->value.
          DATA(txt) = lo_msg->get_text( ).
          ev_result = ev_result && |{ typ }: { txt }. |.
        ENDLOOP.
        
      CATCH cx_root INTO DATA(exc).
        ev_result = |Exception: { exc->get_text( ) }|.
    ENDTRY.

  ENDMETHOD.

ENDCLASS.