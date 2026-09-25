"! <p class="shorttext synchronized" lang="EN">
"!  XCO Structure Creation - Working Example
"! </p>
"!
"! Complete working example for creating structures using XCO library.
"! Demonstrates proper field creation, include handling, and error handling.
"! Based on successful transparent table creation pattern.
CLASS zcl_xco_structure_creation DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    INTERFACES if_oo_adt_classrun.

    METHODS create_structure
      IMPORTING
        iv_dummy TYPE c DEFAULT 'X'
      RETURNING
        VALUE(rv_message) TYPE string.

  PROTECTED SECTION.
  PRIVATE SECTION.
    CONSTANTS:
      co_package TYPE sxco_package VALUE 'ZFG_TEST1',
      co_transport TYPE c LENGTH 20 VALUE 'NC1K902580',
      co_structure_name TYPE sxco_ad_object_name VALUE 'ZXCO_DEMO_STRUCTURE'.
ENDCLASS.

CLASS zcl_xco_structure_creation IMPLEMENTATION.
  METHOD if_oo_adt_classrun~main.
    DATA(result) = create_structure( ).
    out->write( result ).
  ENDMETHOD.

  METHOD create_structure.
    TRY.
        " Check if structure already exists
        DATA(lo_structure) = xco_cp_abap_dictionary=>structure( co_structure_name ).
        IF lo_structure->exists( ) = abap_true.
          rv_message = |ERROR: Structure { co_structure_name } already exists|.
          RETURN.
        ENDIF.

        " Create PUT operation for structure
        DATA(lo_put_operation) = xco_cp_generation=>environment->dev_system( co_transport )->create_put_operation( ).

        " Add structure object
        DATA(lo_form_specification) = lo_put_operation->for-tabl-for-structure->add_object( co_structure_name
          )->set_package( co_package
          )->create_form_specification( ).

        " Set structure description
        lo_form_specification->set_short_description( 'XCO Demo Structure' ).

        " Add components to structure
        " Client field (standard for many structures)
        lo_form_specification->add_component( 'CLIENT' )->set_type( xco_cp_abap_dictionary=>built_in_type->clnt ).

        " ID field
        lo_form_specification->add_component( 'ID' )->set_type( xco_cp_abap_dictionary=>built_in_type->char( 10 ) ).

        " Description field
        lo_form_specification->add_component( 'DESCRIPTION' )->set_type( xco_cp_abap_dictionary=>built_in_type->char( 60 ) ).

        " Amount field with currency reference
        DATA(lo_amount_component) = lo_form_specification->add_component( 'AMOUNT' )->set_type( 
          xco_cp_abap_dictionary=>built_in_type->curr( iv_length = 15 iv_decimals = 2 ) ).
        
        " Set currency reference for amount field
        lo_amount_component->currency_quantity->set_reference_table( co_structure_name )->set_reference_field( 'CURRENCY' ).

        " Currency field
        lo_form_specification->add_component( 'CURRENCY' )->set_type( xco_cp_abap_dictionary=>built_in_type->cuky ).

        " Quantity field with unit reference
        DATA(lo_quantity_component) = lo_form_specification->add_component( 'QUANTITY' )->set_type( 
          xco_cp_abap_dictionary=>built_in_type->quan( iv_length = 13 iv_decimals = 3 ) ).
        
        " Set unit reference for quantity field
        lo_quantity_component->currency_quantity->set_reference_table( co_structure_name )->set_reference_field( 'UNIT' ).

        " Unit field (length 3 for unit fields)
        lo_form_specification->add_component( 'UNIT' )->set_type( xco_cp_abap_dictionary=>built_in_type->unit( 3 ) ).

        " Date fields
        lo_form_specification->add_component( 'CREATED_DATE' )->set_type( xco_cp_abap_dictionary=>built_in_type->dats ).
        lo_form_specification->add_component( 'CREATED_TIME' )->set_type( xco_cp_abap_dictionary=>built_in_type->tims ).

        " Status field
        lo_form_specification->add_component( 'STATUS' )->set_type( xco_cp_abap_dictionary=>built_in_type->char( 1 ) ).

        " Flag field
        lo_form_specification->add_component( 'ACTIVE_FLAG' )->set_type( xco_cp_abap_dictionary=>built_in_type->char( 1 ) ).

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

        rv_message = |SUCCESS: Structure { co_structure_name } created successfully with 10 components|.

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
