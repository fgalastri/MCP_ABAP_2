CLASS zcl_method_remover DEFINITION
  PUBLIC FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    INTERFACES if_oo_adt_classrun.

    METHODS remove_methods_from_class
      IMPORTING
        iv_dummy TYPE c DEFAULT 'X'
      EXPORTING
        error    TYPE abap_boolean
        messages TYPE bapiret2_tab.

  PROTECTED SECTION.
  PRIVATE SECTION.
ENDCLASS.

CLASS zcl_method_remover IMPLEMENTATION.
  METHOD if_oo_adt_classrun~main.
    remove_methods_from_class(
      EXPORTING
        iv_dummy = 'X'
      IMPORTING
        error    = DATA(error)
        messages = DATA(messages)
    ).

    IF error = abap_true.
      LOOP AT messages INTO DATA(message).
        out->write( |{ message-type }: { message-message }| ).
      ENDLOOP.
    ELSE.
      out->write( 'Methods removed from ZCOPY_TEST3 successfully!' ).
    ENDIF.
  ENDMETHOD.

  METHOD remove_methods_from_class.
    DATA transport_request TYPE c LENGTH 20 VALUE 'NC1K902580'.
    DATA classname         TYPE c LENGTH 30 VALUE 'ZCOPY_TEST3'.

    " Check if class exists
    DATA(class) = xco_cp_abap=>class( to_upper( classname ) ).
    IF class->exists( ) = abap_false.
      DATA(ls_message) = VALUE bapiret2( type    = 'E'
                                         message = 'Class ZCOPY_TEST3 does not exist - create it first' ).
      APPEND ls_message TO messages.
      error = abap_true.
      RETURN.
    ENDIF.

    TRY.
        " Read existing methods from the class to see what we can remove
        DATA(existing_methods) = class->definition->section-public->components->method->all->get( ).
        
        " Create PATCH operation for removing methods from existing class
        DATA(patch_operation) = xco_cp_generation=>environment->dev_system( transport_request )->for-clas->create_patch_operation( ).
        DATA(object_to_patch) = patch_operation->add_object( classname ).

        " Remove multiple methods - demonstrate different method removal scenarios
        " Method 1: Remove a method we know exists (from our previous examples)
        object_to_patch->for-delete->definition->section-public->add_method( 'NEW_METHOD_WITH_CHANGING' ).
        
        " Method 2: Remove another method
        object_to_patch->for-delete->definition->section-public->add_method( 'VALIDATE_DATA' ).
        
        " Method 3: Remove a method that might exist from the original class creation
        object_to_patch->for-delete->definition->section-public->add_method( 'METHOD_WITH_BUILTIN_PARAMS' ).

        " Execute the patch operation
        DATA(result) = patch_operation->execute( ).

        " Check for errors
        IF result->findings->contain_errors( ).
          error = abap_true.
          DATA(findings_objects) = result->findings->get( ).
          LOOP AT findings_objects INTO DATA(finding_object).
            DATA(ls_error_msg) = VALUE bapiret2( type    = 'E'
                                                 message = finding_object->message->get_text( ) ).
            APPEND ls_error_msg TO messages.
          ENDLOOP.
        ELSE.
          " Success message with details about what was removed
          DATA(ls_success_msg) = VALUE bapiret2(
            type    = 'S'
            message = 'Methods successfully removed from ZCOPY_TEST3: NEW_METHOD_WITH_CHANGING, VALIDATE_DATA, METHOD_WITH_BUILTIN_PARAMS' ).
          APPEND ls_success_msg TO messages.
          
          " Add informational message about remaining methods
          DATA(ls_info_msg) = VALUE bapiret2(
            type    = 'I'
            message = 'Use class->definition->section-public->components->method->all->get() to check remaining methods' ).
          APPEND ls_info_msg TO messages.
        ENDIF.

      CATCH cx_xco_gen_patch_exception INTO DATA(exc).
        error = abap_true.
        DATA(lt_msgs) = exc->if_xco_news~get_messages( ).
        LOOP AT lt_msgs INTO DATA(lo_msg).
          DATA(txt) = lo_msg->get_text( ).
          DATA(ls_exc_msg) = VALUE bapiret2( type    = 'E'
                                             message = txt ).
          APPEND ls_exc_msg TO messages.
        ENDLOOP.
    ENDTRY.
  ENDMETHOD.
ENDCLASS.
