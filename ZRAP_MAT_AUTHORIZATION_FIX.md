# ZRAP_MAT Authorization Fix - CRITICAL!
**Date:** October 24, 2025  
**Issue:** Handler not implemented: GLOBAL_AUTHORIZATION  
**Status:** ✅ Fix Available

---

## 🚨 The Problem

**Error Message:**
```
CX_RAP_HANDLER_NOT_IMPLEMENTED
Handler not implemented; Method: GLOBAL_AUTHORIZATION, Involved Entities: ZC_RAP_MAT
```

**Root Cause:**
The BDEF has `authorization master( global )` but the behavior implementation class (`ZBP_R_RAP_MAT`) doesn't implement the required `global_authorization` method.

---

## ✅ The Fix

### Step 1: Read Current Local Implementations

```javascript
// Read the current local implementations
// (You may have the toggleDeletion handler already)
```

### Step 2: Add global_authorization Method

**Add to local class definition:**
```abap
CLASS lhc_zr_rap_mat DEFINITION INHERITING FROM cl_abap_behavior_handler.
  PRIVATE SECTION.

    METHODS get_instance_features FOR INSTANCE FEATURES
      IMPORTING keys REQUEST requested_features FOR zr_rap_mat RESULT result.

    METHODS toggledeletion FOR MODIFY
      IMPORTING keys FOR ACTION zr_rap_mat~toggledeletion RESULT result.
      
    " ADD THIS METHOD
    METHODS get_global_authorization FOR GLOBAL AUTHORIZATION
      IMPORTING REQUEST requested_authorizations FOR zr_rap_mat RESULT result.

ENDCLASS.
```

**Add implementation:**
```abap
CLASS lhc_zr_rap_mat IMPLEMENTATION.

  METHOD get_instance_features.
    " Your existing implementation
  ENDMETHOD.

  METHOD toggledeletion.
    " Your existing implementation
  ENDMETHOD.

  " ADD THIS IMPLEMENTATION
  METHOD get_global_authorization.
    " For now, allow all operations
    " In production, add proper authorization checks
    
    IF requested_authorizations-%create = if_abap_behv=>mk-on.
      result-%create = if_abap_behv=>auth-allowed.
    ENDIF.
    
    IF requested_authorizations-%update = if_abap_behv=>mk-on.
      result-%update = if_abap_behv=>auth-allowed.
    ENDIF.
    
    IF requested_authorizations-%delete = if_abap_behv=>mk-on.
      result-%delete = if_abap_behv=>auth-allowed.
    ENDIF.
    
    IF requested_authorizations-%action-toggledeletion = if_abap_behv=>mk-on.
      result-%action-toggledeletion = if_abap_behv=>auth-allowed.
    ENDIF.
    
  ENDMETHOD.

ENDCLASS.
```

---

## 🔧 Complete Fixed Local Implementations

**Here's the complete local implementations file with all methods:**

```abap
CLASS lhc_zr_rap_mat DEFINITION INHERITING FROM cl_abap_behavior_handler.
  PRIVATE SECTION.

    METHODS get_global_authorization FOR GLOBAL AUTHORIZATION
      IMPORTING REQUEST requested_authorizations FOR zr_rap_mat RESULT result.

    METHODS get_instance_features FOR INSTANCE FEATURES
      IMPORTING keys REQUEST requested_features FOR zr_rap_mat RESULT result.

    METHODS toggledeletion FOR MODIFY
      IMPORTING keys FOR ACTION zr_rap_mat~toggledeletion RESULT result.

ENDCLASS.

CLASS lhc_zr_rap_mat IMPLEMENTATION.

  METHOD get_global_authorization.
    " Basic authorization - allow all operations
    " TODO: Implement proper authority checks in production
    
    IF requested_authorizations-%create = if_abap_behv=>mk-on.
      result-%create = if_abap_behv=>auth-allowed.
    ENDIF.
    
    IF requested_authorizations-%update = if_abap_behv=>mk-on.
      result-%update = if_abap_behv=>auth-allowed.
    ENDIF.
    
    IF requested_authorizations-%delete = if_abap_behv=>mk-on.
      result-%delete = if_abap_behv=>auth-allowed.
    ENDIF.
    
    IF requested_authorizations-%action-toggledeletion = if_abap_behv=>mk-on.
      result-%action-toggledeletion = if_abap_behv=>auth-allowed.
    ENDIF.
    
    " Add authorization for draft actions
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
    " Enable toggleDeletion for all instances
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
    ) ).
  ENDMETHOD.

  METHOD toggledeletion.
    " Read current state
    READ ENTITIES OF zr_rap_mat IN LOCAL MODE
      ENTITY zr_rap_mat
        ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(lt_data).

    " Call business logic
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

    " Re-read modified data
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
```

---

## 🎯 Quick Fix Commands

```javascript
// Save the fixed local implementations
adt_save_local_implementations({
  class_name: "ZBP_R_RAP_MAT",
  source_code: `<complete code above>`
})

// Activate
adt_activate({
  objects: [
    { name: "ZBP_R_RAP_MAT", type: "CLAS" },
    { name: "ZR_RAP_MAT", type: "BDEF" }
  ]
})
```

---

## 📚 Understanding Authorization Methods

### Global Authorization
- **When:** Called ONCE at the start of the request
- **Purpose:** Check if user has general permission for operations
- **Controls:** Create, Update, Delete, Actions at entity level

### Instance Authorization (Optional)
- **When:** Called for EACH instance
- **Purpose:** Check if user can modify THIS SPECIFIC record
- **Use Case:** Record-level security (e.g., only owner can edit)

### Example with Real Authority Checks:

```abap
METHOD get_global_authorization.
  " Real-world example with authority checks
  
  IF requested_authorizations-%create = if_abap_behv=>mk-on.
    AUTHORITY-CHECK OBJECT 'Z_MAT_OBJ'
      ID 'ACTVT' FIELD '01'.  " 01 = Create
    
    result-%create = COND #( 
      WHEN sy-subrc = 0 
      THEN if_abap_behv=>auth-allowed 
      ELSE if_abap_behv=>auth-unauthorized 
    ).
  ENDIF.
  
  IF requested_authorizations-%update = if_abap_behv=>mk-on.
    AUTHORITY-CHECK OBJECT 'Z_MAT_OBJ'
      ID 'ACTVT' FIELD '02'.  " 02 = Change
    
    result-%update = COND #( 
      WHEN sy-subrc = 0 
      THEN if_abap_behv=>auth-allowed 
      ELSE if_abap_behv=>auth-unauthorized 
    ).
  ENDIF.
  
  " ... similar for other operations
ENDMETHOD.
```

---

## ⚠️ Important Notes

1. **Development Simplification:**
   - The provided fix allows ALL operations for simplicity
   - Perfect for development and testing
   - ⚠️ **Must add real authority checks for production!**

2. **Authorization Objects:**
   - Create authorization objects in PFCG (transaction)
   - Check them in `get_global_authorization`
   - Use standard activities: 01=Create, 02=Change, 03=Display, 06=Delete

3. **Instance-Level Security:**
   - If needed, add `get_instance_authorization` method
   - Check per-record permissions (e.g., only creator can delete)

---

## 🎓 Why This Happened

**Generator Behavior:**
- Generator creates BDEF with `authorization master( global )`
- But doesn't generate the authorization handler in local implementations
- This is intentional - authorization logic is business-specific
- You MUST add it manually after generation

**Critical Learning:**
> Always implement authorization handlers after using the generator!  
> Even if just allowing all operations for development.

---

## ✅ Verification

After applying the fix:

1. **Activate the class**
2. **Test the service:**
   - Open Fiori Elements preview
   - Try to create/edit/delete records
   - Should work without authorization errors
3. **Check logs:**
   - No more CX_RAP_HANDLER_NOT_IMPLEMENTED
   - Service loads successfully

---

## 📖 Update Documentation

**This fix needs to be added to:**
- `ZRAP_MAT_COMPLETE_IMPLEMENTATION_GUIDE.md` - Add as Step 6.5
- `RAP_WORKFLOW_DECISION_TREE.md` - Add authorization note
- `MFR_MASTER_FILE_REPOSITORY.md` - Add to critical rules

---

**Status:** ✅ Fix Ready to Apply  
**Priority:** CRITICAL - Service won't work without this  
**Estimated Fix Time:** 2 minutes

