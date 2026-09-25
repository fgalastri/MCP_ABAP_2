**********************************************************************
* COMPLETE LOCAL IMPLEMENTATIONS FOR ZBP_R_RAP_MAT
* CORRECTED: Keeps generator-created get_global_authorizations method
* ADDS: toggleDeletion action handler and get_instance_features
**********************************************************************

CLASS lhc_zr_rap_mat DEFINITION INHERITING FROM cl_abap_behavior_handler.
  PRIVATE SECTION.

    " ✅ Generator created this - keep it and implement it properly
    METHODS get_global_authorizations FOR GLOBAL AUTHORIZATION
      IMPORTING
        REQUEST requested_authorizations FOR zr_rap_mat
      RESULT result.

    " ✅ Add this for dynamic button enablement
    METHODS get_instance_features FOR INSTANCE FEATURES
      IMPORTING keys REQUEST requested_features FOR zr_rap_mat RESULT result.

    " ✅ Add this for your custom action
    METHODS toggledeletion FOR MODIFY
      IMPORTING keys FOR ACTION zr_rap_mat~toggledeletion RESULT result.

ENDCLASS.

CLASS lhc_zr_rap_mat IMPLEMENTATION.

  METHOD get_global_authorizations.
    " ✅ Implement authorization - allow all for development
    " TODO: Add real AUTHORITY-CHECK for production
    
    IF requested_authorizations-%create = if_abap_behv=>mk-on.
      result-%create = if_abap_behv=>auth-allowed.
    ENDIF.
    
    IF requested_authorizations-%update = if_abap_behv=>mk-on.
      result-%update = if_abap_behv=>auth-allowed.
    ENDIF.
    
    IF requested_authorizations-%delete = if_abap_behv=>mk-on.
      result-%delete = if_abap_behv=>auth-allowed.
    ENDIF.
    
    " Authorization for custom action
    IF requested_authorizations-%action-toggledeletion = if_abap_behv=>mk-on.
      result-%action-toggledeletion = if_abap_behv=>auth-allowed.
    ENDIF.
    
    " Authorization for draft actions
    IF requested_authorizations-%action-edit = if_abap_behv=>mk-on.
      result-%action-edit = if_abap_behv=>auth-allowed.
    ENDIF.
    
    IF requested_authorizations-%action-activate = if_abap_behv=>mk-on.
      result-%action-activate = if_abap_behv=>auth-allowed.
    ENDIF.
    
    IF requested_authorizations-%action-discard = if_abap_behv=>mk-on.
      result-%action-discard = if_abap_behv=>auth-allowed.
    ENDIF.
    
    IF requested_authorizations-%action-resume = if_abap_behv=>mk-on.
      result-%action-resume = if_abap_behv=>auth-allowed.
    ENDIF.
    
    IF requested_authorizations-%action-prepare = if_abap_behv=>mk-on.
      result-%action-prepare = if_abap_behv=>auth-allowed.
    ENDIF.
    
  ENDMETHOD.

  METHOD get_instance_features.
    " ✅ Enable toggleDeletion button for all valid records
    READ ENTITIES OF zr_rap_mat IN LOCAL MODE
      ENTITY zr_rap_mat
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(lt_entities).

    result = VALUE #( FOR ls_entity IN lt_entities (
      %tky = ls_entity-%tky
      %action-toggledeletion = COND #( 
        WHEN ls_entity-materialid IS NOT INITIAL 
        THEN if_abap_behv=>fc-o-enabled 
        ELSE if_abap_behv=>fc-o-disabled 
      )
      %features-%update = COND #(
        WHEN ls_entity-materialid IS NOT INITIAL
        THEN if_abap_behv=>fc-o-enabled
        ELSE if_abap_behv=>fc-o-disabled
      )
      %features-%delete = COND #(
        WHEN ls_entity-materialid IS NOT INITIAL
        THEN if_abap_behv=>fc-o-enabled
        ELSE if_abap_behv=>fc-o-disabled
      )
    ) ).
  ENDMETHOD.

  METHOD toggledeletion.
    " ✅ Custom action implementation
    " Read current state
    READ ENTITIES OF zr_rap_mat IN LOCAL MODE
      ENTITY zr_rap_mat
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(lt_data).

    " Call business logic for each record
    LOOP AT lt_data ASSIGNING FIELD-SYMBOL(<ls_data>).
      DATA(ls_result) = zcl_rap_mat_logic=>toggle_deletion( 
        iv_material_id = <ls_data>-materialid 
      ).

      IF ls_result-success = abap_true.
        " Success message
        APPEND VALUE #( 
          %tky = <ls_data>-%tky
          %msg = new_message( 
            id = 'SY'
            number = '001'
            v1 = ls_result-message
            severity = if_abap_behv_message=>severity-success 
          )
        ) TO reported-zr_rap_mat.
      ELSE.
        " Error message
        APPEND VALUE #( 
          %tky = <ls_data>-%tky
          %msg = new_message( 
            id = 'SY'
            number = '001'
            v1 = ls_result-message
            severity = if_abap_behv_message=>severity-error 
          )
        ) TO reported-zr_rap_mat.
      ENDIF.

      APPEND VALUE #( %tky = <ls_data>-%tky ) TO result.
    ENDLOOP.

    " Re-read modified data to return updated state
    READ ENTITIES OF zr_rap_mat IN LOCAL MODE
      ENTITY zr_rap_mat
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT lt_data.

    " Return updated records
    result = VALUE #( 
      FOR ls_data IN lt_data
      ( %tky = ls_data-%tky
        %param = ls_data ) 
    ).

  ENDMETHOD.

ENDCLASS.






