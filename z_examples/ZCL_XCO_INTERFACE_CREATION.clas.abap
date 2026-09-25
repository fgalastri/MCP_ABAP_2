"! <p class="shorttext synchronized" lang="EN">
"!  XCO Interface Creation - Working Example
"! </p>
"!
"! Complete working example for creating interfaces using XCO library.
"! Demonstrates proper type creation, method definitions, and error handling.
"! Based on successful class creation pattern.
CLASS zcl_xco_interface_creation DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    INTERFACES if_oo_adt_classrun.

    METHODS create_interface
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

CLASS zcl_xco_interface_creation IMPLEMENTATION.
  METHOD if_oo_adt_classrun~main.
    DATA(result) = create_interface( ).
    out->write( result ).
  ENDMETHOD.

  METHOD create_interface.
    TRY.
        " Check if interface already exists
        DATA(lo_interface) = xco_cp_abap=>interface( co_interface_name ).
        IF lo_interface->exists( ) = abap_true.
          rv_message = |ERROR: Interface { co_interface_name } already exists|.
          RETURN.
        ENDIF.

        " Create PUT operation for interface
        DATA(lo_put_operation) = xco_cp_generation=>environment->dev_system( co_transport )->create_put_operation( ).

        " Add interface object
        DATA(lo_form_specification) = lo_put_operation->for-intf->add_object( co_interface_name
          )->set_package( co_package
          )->create_form_specification( ).

        " Set interface description
        lo_form_specification->set_short_description( 'XCO Demo Interface' ).

        " Add types to interface
        " Simple type
        lo_form_specification->add_type( 'TY_ID' )->for( xco_cp_abap=>type-built_in->string ).

        " Structure type
        DATA(lo_structure_type) = lo_form_specification->add_type( 'TY_DATA_STRUCTURE' ).
        lo_structure_type->for_structure( VALUE if_xco_gen_ao_s_fo_c_type=>tt_component(
          ( name = 'ID' type = xco_cp_abap=>type-built_in->string )
          ( name = 'DESCRIPTION' type = xco_cp_abap=>type-built_in->string )
          ( name = 'AMOUNT' type = xco_cp_abap=>type-built_in->decfloat16 )
          ( name = 'CREATED_DATE' type = xco_cp_abap=>type-built_in->d )
          ( name = 'ACTIVE_FLAG' type = xco_cp_abap=>type-built_in->string )
        ) ).

        " Table type
        lo_form_specification->add_type( 'TT_DATA_TABLE' )->for_table_type( 
          xco_cp_abap=>interface( co_interface_name )->type( 'TY_DATA_STRUCTURE' ) ).

        " Add constants to interface
        lo_form_specification->add_constant( 'CO_STATUS_ACTIVE' )->set_type( xco_cp_abap=>type-built_in->string
          )->set_string_value( |'ACTIVE'| ).
        lo_form_specification->add_constant( 'CO_STATUS_INACTIVE' )->set_type( xco_cp_abap=>type-built_in->string
          )->set_string_value( |'INACTIVE'| ).

        " Add methods to interface
        " Simple method with importing parameter
        DATA(lo_method1) = lo_form_specification->add_method( 'GET_DATA' ).
        lo_method1->add_importing_parameter( 'IV_ID' )->set_type( xco_cp_abap=>interface( co_interface_name )->type( 'TY_ID' ) ).
        lo_method1->add_returning_parameter( 'RV_RESULT' )->set_type( xco_cp_abap=>interface( co_interface_name )->type( 'TY_DATA_STRUCTURE' ) ).

        " Method with table parameter
        DATA(lo_method2) = lo_form_specification->add_method( 'PROCESS_DATA_TABLE' ).
        lo_method2->add_importing_parameter( 'IT_DATA' )->set_type( xco_cp_abap=>interface( co_interface_name )->type( 'TT_DATA_TABLE' ) ).
        lo_method2->add_exporting_parameter( 'ET_RESULTS' )->set_type( xco_cp_abap=>interface( co_interface_name )->type( 'TT_DATA_TABLE' ) ).
        lo_method2->add_returning_parameter( 'RV_COUNT' )->set_type( xco_cp_abap=>type-built_in->i ).

        " Method with changing parameter
        DATA(lo_method3) = lo_form_specification->add_method( 'VALIDATE_DATA' ).
        lo_method3->add_changing_parameter( 'CS_DATA' )->set_type( xco_cp_abap=>interface( co_interface_name )->type( 'TY_DATA_STRUCTURE' ) ).
        lo_method3->add_returning_parameter( 'RV_VALID' )->set_type( xco_cp_abap=>type-built_in->string ).

        " Method with multiple parameters
        DATA(lo_method4) = lo_form_specification->add_method( 'CREATE_ENTRY' ).
        lo_method4->add_importing_parameter( 'IV_ID' )->set_type( xco_cp_abap=>interface( co_interface_name )->type( 'TY_ID' ) ).
        lo_method4->add_importing_parameter( 'IV_DESCRIPTION' )->set_type( xco_cp_abap=>type-built_in->string ).
        lo_method4->add_importing_parameter( 'IV_AMOUNT' )->set_type( xco_cp_abap=>type-built_in->decfloat16 ).
        lo_method4->add_exporting_parameter( 'ES_RESULT' )->set_type( xco_cp_abap=>interface( co_interface_name )->type( 'TY_DATA_STRUCTURE' ) ).
        lo_method4->add_returning_parameter( 'RV_SUCCESS' )->set_type( xco_cp_abap=>type-built_in->string ).

        " Execute the creation
        DATA(lo_result) = lo_put_operation->execute( ).

        " Check for errors
        IF lo_result->findings->contain_errors( ) = abap_true.
          DATA(findings_objects) = lo_result->findings->get( ).
          LOOP AT findings_objects INTO DATA(finding_object).
            rv_message = |ERROR: { finding_object->message->get_text( ) }|.
            RETURN.
          ENDLOOP.
        ENDIF.

        rv_message = |SUCCESS: Interface { co_interface_name } created successfully with types, constants and methods|.

      CATCH cx_xco_gen_put_exception INTO DATA(lx_put_exception).
        DATA(lt_messages) = lx_put_exception->if_xco_news~get_messages( ).
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
