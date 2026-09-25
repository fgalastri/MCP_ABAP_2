"! <p class="shorttext synchronized" lang="EN">
"!  XCO Transparent Table Creation - Working Example
"! </p>
"!
"! Complete working example for creating transparent tables using XCO library.
"! Demonstrates proper field creation, currency field references, and error handling.
"! Successfully validated and executed in target environment.
CLASS zcl_xco_transparent_table DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    INTERFACES if_oo_adt_classrun.

    METHODS create_transparent_table
      IMPORTING
        iv_dummy TYPE c DEFAULT 'X'
      RETURNING
        VALUE(rv_message) TYPE string.

  PROTECTED SECTION.
  PRIVATE SECTION.
    CONSTANTS:
      co_package TYPE sxco_package VALUE 'ZFG_TEST1',
      co_transport TYPE c LENGTH 20 VALUE 'NC1K902580',
      co_table_name TYPE sxco_dbt_object_name VALUE 'ZXCO_DEMO_TABLE'.
ENDCLASS.

CLASS zcl_xco_transparent_table IMPLEMENTATION.
  METHOD if_oo_adt_classrun~main.
    DATA(result) = create_transparent_table( ).
    out->write( result ).
  ENDMETHOD.

  METHOD create_transparent_table.
    TRY.
        " Check if table already exists
        DATA(lo_table) = xco_cp_abap_dictionary=>database_table( co_table_name ).
        IF lo_table->exists( ) = abap_true.
          rv_message = |ERROR: Table { co_table_name } already exists|.
          RETURN.
        ENDIF.

        " Create PUT operation for transparent table
        DATA(lo_put_operation) = xco_cp_generation=>environment->dev_system( co_transport )->create_put_operation( ).

        " Add database table object
        DATA(lo_form_specification) = lo_put_operation->for-tabl-for-database_table->add_object( co_table_name
          )->set_package( co_package
          )->create_form_specification( ).

        " Set table description
        lo_form_specification->set_short_description( 'XCO Demo Transparent Table' ).

        " Add client field (standard for transparent tables)
        lo_form_specification->add_field( 'CLIENT'
          )->set_type( xco_cp_abap_dictionary=>built_in_type->clnt
          )->set_key_indicator(
          )->set_not_null( ).

        " Add primary key fields
        lo_form_specification->add_field( 'ID'
          )->set_type( xco_cp_abap_dictionary=>built_in_type->char( 10 )
          )->set_key_indicator(
          )->set_not_null( ).

        " Add data fields
        lo_form_specification->add_field( 'DESCRIPTION'
          )->set_type( xco_cp_abap_dictionary=>built_in_type->char( 60 ) ).

        DATA(lo_amount_field) = lo_form_specification->add_field( 'AMOUNT'
          )->set_type( xco_cp_abap_dictionary=>built_in_type->curr( iv_length = 15 iv_decimals = 2 ) ).
        lo_amount_field->currency_quantity->set_reference_table( co_table_name )->set_reference_field( 'CURRENCY' ).

        lo_form_specification->add_field( 'CURRENCY'
          )->set_type( xco_cp_abap_dictionary=>built_in_type->cuky ).

        lo_form_specification->add_field( 'CREATED_DATE'
          )->set_type( xco_cp_abap_dictionary=>built_in_type->dats ).

        lo_form_specification->add_field( 'CREATED_TIME'
          )->set_type( xco_cp_abap_dictionary=>built_in_type->tims ).

        lo_form_specification->add_field( 'STATUS'
          )->set_type( xco_cp_abap_dictionary=>built_in_type->char( 1 ) ).

        " Note: Technical settings can be added if needed:
        " lo_form_specification->technical_settings->set_data_class(...)
        " ->set_size_category(...)->set_buffering(...)

        " Execute the operation
        DATA(result) = lo_put_operation->execute( ).

        " Check for errors
        IF result->findings->contain_errors( ).
          DATA(findings_objects) = result->findings->get( ).
          LOOP AT findings_objects INTO DATA(finding_object).
            rv_message = |ERROR: { finding_object->message->get_text( ) }|.
            RETURN.
          ENDLOOP.
        ENDIF.

        " Success - table created
        rv_message = |SUCCESS: Transparent table { co_table_name } created successfully|.

      CATCH cx_xco_gen_put_exception INTO DATA(exc).
        DATA(lt_msgs) = exc->if_xco_news~get_messages( ).
        LOOP AT lt_msgs INTO DATA(lo_msg).
          rv_message = |ERROR: { lo_msg->get_text( ) }|.
          RETURN.
        ENDLOOP.

      CATCH cx_root INTO DATA(root_exc).
        rv_message = |ERROR: Unexpected exception - { root_exc->get_text( ) }|.
    ENDTRY.
  ENDMETHOD.

ENDCLASS.
