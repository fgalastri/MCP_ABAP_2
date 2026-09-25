CLASS zcl_xco_class_with_tests DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC .

  PUBLIC SECTION.
    CONSTANTS: co_package TYPE sxco_package VALUE 'ZFG_TEST1',
               co_transport TYPE sxco_transport VALUE 'NC1K902580',
               co_class_name TYPE sxco_ao_object_name VALUE 'ZCL_XCO_DEMO_WITH_TESTS'.

    METHODS: create_class_with_tests
      RETURNING VALUE(rv_message) TYPE string.

  PRIVATE SECTION.
ENDCLASS.

CLASS zcl_xco_class_with_tests IMPLEMENTATION.
  METHOD create_class_with_tests.
    DATA: lv_transport_request TYPE sxco_transport VALUE co_transport.

    TRY.
        IF xco_cp_abap=>class( co_class_name )->exists( ) = abap_true.
          rv_message = |Class { co_class_name } already exists|.
          RETURN.
        ENDIF.

        DATA(lo_put_operation) = xco_cp_generation=>environment->dev_system( lv_transport_request )
          ->create_put_operation( ).

        DATA(lo_form_specification) = lo_put_operation->for-clas->add_object( co_class_name
          )->set_package( co_package )->create_form_specification( ).

        lo_form_specification->set_short_description( 'XCO Demo Class with Test Classes' ).

        " Configure class definition
        lo_form_specification->definition->set_final( ).
        lo_form_specification->definition->set_create_visibility( xco_cp_abap=>class_create_visibility->public ).

        " Add a simple type
        lo_form_specification->definition->add_type( 'TY_STATUS' )->for( xco_cp_abap=>type-built_in->string ).

        " Add a data attribute
        lo_form_specification->definition->section-public->add_data( 'gv_counter' )
          ->set_type( xco_cp_abap=>type-built_in->i ).

        " Add a method to test
        DATA(lo_method) = lo_form_specification->definition->section-public->add_method( 'calculate_sum' ).
        lo_method->add_importing_parameter( 'iv_number1' )->set_type( xco_cp_abap=>type-built_in->i ).
        lo_method->add_importing_parameter( 'iv_number2' )->set_type( xco_cp_abap=>type-built_in->i ).
        lo_method->add_returning_parameter( 'rv_result' )->set_type( xco_cp_abap=>type-built_in->i ).

        " Add method implementation
        DATA lt_method_source TYPE if_xco_gen_clas_s_fo_i_method=>tt_source.
        APPEND |    rv_result = iv_number1 + iv_number2.| TO lt_method_source.
        lo_form_specification->implementation->add_method( 'calculate_sum' )->set_source( lt_method_source ).

        " Add a test class
        DATA(lo_test_class) = lo_form_specification->add_test_class( 'LTC_CALCULATOR_TEST' ).

        " Configure test class definition
        lo_test_class->definition->set_final( ).
        lo_test_class->definition->set_for_testing( ).
        lo_test_class->definition->set_duration( xco_cp_abap_unit=>duration->short ).
        lo_test_class->definition->set_risk_level( xco_cp_abap_unit=>risk_level->harmless ).

        " Add test method
        DATA(lo_test_method) = lo_test_class->definition->section-private->add_method( 'test_calculate_sum' ).
        lo_test_method->set_for_testing( ).

        " Add test method implementation
        DATA lt_test_method_source TYPE if_xco_gen_clas_s_fo_i_method=>tt_source.
        APPEND |    DATA(lo_cut) = NEW zcl_xco_demo_with_tests( ).| TO lt_test_method_source.
        APPEND |    | TO lt_test_method_source.
        APPEND |    DATA(lv_result) = lo_cut->calculate_sum( iv_number1 = 5 iv_number2 = 3 ).| TO lt_test_method_source.
        APPEND |    | TO lt_test_method_source.
        APPEND |    cl_abap_unit_assert=>assert_equals(| TO lt_test_method_source.
        APPEND |      act = lv_result| TO lt_test_method_source.
        APPEND |      exp = 8| TO lt_test_method_source.
        APPEND |      msg = 'Sum calculation failed'| TO lt_test_method_source.
        APPEND |    ).| TO lt_test_method_source.
        lo_test_class->implementation->add_method( 'test_calculate_sum' )->set_source( lt_test_method_source ).

        " Add another test class for edge cases
        DATA(lo_test_class2) = lo_form_specification->add_test_class( 'LTC_EDGE_CASES' ).

        lo_test_class2->definition->set_final( ).
        lo_test_class2->definition->set_for_testing( ).
        lo_test_class2->definition->set_duration( xco_cp_abap_unit=>duration->short ).
        lo_test_class2->definition->set_risk_level( xco_cp_abap_unit=>risk_level->harmless ).

        DATA(lo_edge_test_method) = lo_test_class2->definition->section-private->add_method( 'test_negative_numbers' ).
        lo_edge_test_method->set_for_testing( ).

        DATA edge_test_source TYPE if_xco_gen_clas_s_fo_i_method=>tt_source.
        APPEND |    DATA(lo_cut) = NEW zcl_xco_demo_with_tests( ).| TO edge_test_source.
        APPEND |    | TO edge_test_source.
        APPEND |    DATA(lv_result) = lo_cut->calculate_sum( iv_number1 = -5 iv_number2 = 3 ).| TO edge_test_source.
        APPEND |    | TO edge_test_source.
        APPEND |    cl_abap_unit_assert=>assert_equals(| TO edge_test_source.
        APPEND |      act = lv_result| TO edge_test_source.
        APPEND |      exp = -2| TO edge_test_source.
        APPEND |      msg = 'Negative number calculation failed'| TO edge_test_source.
        APPEND |    ).| TO edge_test_source.
        lo_test_class2->implementation->add_method( 'test_negative_numbers' )->set_source( edge_test_source ).

        DATA(lo_result) = lo_put_operation->execute( ).

        IF lo_result->findings->contain_errors( ) = abap_true.
          DATA(findings_objects) = lo_result->findings->get( ).
          LOOP AT findings_objects INTO DATA(finding_object).
            rv_message = rv_message && |Error: { finding_object->message->get_text( ) }. |.
          ENDLOOP.
        ELSE.
          rv_message = |SUCCESS: Class { co_class_name } created with 2 test classes | &&
                       |(LTC_CALCULATOR_TEST, LTC_EDGE_CASES)|.
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
