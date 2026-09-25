*&---------------------------------------------------------------------*
*& Current Code Being Sent to ABAP Validator
*& Last Updated: 2025-09-15 22:18
*& Status: PATCH operation - Using correct XCO pattern from target system
*&---------------------------------------------------------------------*

* This is the EXACT code being sent to mcp_abap-validator_validate_abap_method
* It will be inserted into ZCL_MCP_UPDATER=>PROCESS method in the target system

DATA: lv_transport_request TYPE sxco_transport VALUE '',
      lv_package TYPE sxco_package VALUE '$TMP'.

TRY.
    DATA(lo_put_operation) = xco_cp_generation=>environment->local( )->create_put_operation( ).
    
    DATA(lo_form_specification) = lo_put_operation->for-clas->add_object( 'ZCL_HELLO_WORLD_TARGET' )->set_package( lv_package )->create_form_specification( ).
    
    lo_form_specification->set_short_description( 'Hello World Test Class' ).
    lo_form_specification->definition->set_final( ).
    
    DATA(lo_result) = lo_put_operation->execute( ).
    
    IF lo_result->findings->contain_errors( ) = abap_true.
      DATA(findings_objects) = lo_result->findings->get( ).
      LOOP AT findings_objects INTO DATA(finding_object).
        rv_message = rv_message && |Error: { finding_object->message->get_text( ) }. |.
      ENDLOOP.
    ELSE.
      rv_message = |SUCCESS: Hello World class created successfully|.
    ENDIF.
    
  CATCH cx_sy_import_format_error INTO DATA(import_exc).
    rv_message = |Import format error: { import_exc->get_text( ) }|.
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

*&---------------------------------------------------------------------*
*& NOTES:
*& - rv_message is the return parameter from ZCL_MCP_UPDATER=>PROCESS
*& - Transport 'H01K900048' and Package 'ZMCP_TESTS' are hardcoded
*& - Target class name: 'ZCL_HELLO_WORLD_TARGET'
*& - Current Issue: CX_SY_IMPORT_FORMAT_ERROR not handled
*&---------------------------------------------------------------------*
