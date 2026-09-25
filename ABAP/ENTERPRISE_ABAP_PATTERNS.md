# Enterprise ABAP Patterns - From SAP Standard Code Analysis

## 🎯 PROCESS MANAGER PATTERN

**Use Case**: Centralized workflow orchestration and document lifecycle management

```abap
class ZCL_PROCESS_MANAGER definition
  public
  create public.

public section.
  methods EXECUTE_ACTION
    importing IV_ACTION type STRING
             IV_ACTION_VARIANT type STRING optional
    raising CX_PROCESS_ERROR.
  
  methods EXECUTE_PROCESS_STEP
    importing IV_PROCESS_STEP type STRING
             IV_VARIANT type STRING optional
    raising CX_PROCESS_ERROR.

protected section.
  methods IS_PATTERN_FULFILLED
    importing IV_PATTERN type STRING
             IV_STATUS type STRING
    returning value(RV_FULFILLED) type ABAP_BOOL.
```

**Key Benefits**:
- Single point of control for complex workflows
- Dynamic method resolution with `CALL METHOD object->(method_name)`
- Status pattern matching for conditional logic
- Built-in authorization and validation

---

## 🏭 WRAPPER PATTERN FOR SYSTEM APIS

**Use Case**: Testable abstractions around system classes and BADI calls

```abap
" Interface for testability
interface IF_TYPE_WRAPPER.
  methods CREATE_STRUCTURE
    importing IT_COMPONENTS type ABAP_COMPONENT_TAB
    returning value(RO_STRUCTURE) type ref to CL_ABAP_STRUCTDESCR
    raising CX_TYPE_ERROR.
endinterface.

" Wrapper implementation
class CL_TYPE_WRAPPER definition
  public
  final
  create public.

public section.
  interfaces IF_TYPE_WRAPPER.
endclass.

class CL_TYPE_WRAPPER implementation.
  method IF_TYPE_WRAPPER~CREATE_STRUCTURE.
    TRY.
      ro_structure = cl_abap_structdescr=>get( it_components ).
    CATCH cx_sy_struct_creation INTO DATA(lx_creation).
      RAISE EXCEPTION TYPE cx_type_error
        EXPORTING previous = lx_creation.
    ENDTRY.
  endmethod.
endclass.
```

**Key Benefits**:
- Enables unit testing by mocking system dependencies
- Consistent exception handling across system API calls
- Clean separation between business logic and system APIs

---

## 🌍 LOCALIZATION CONSTANTS PATTERN

**Use Case**: Country-specific business rules and configurations

```abap
class CL_CONSTANTS_BR definition
  public
  abstract
  final
  create public.

public section.
  constants:
    BEGIN OF sc_document_type,
      nfe TYPE string VALUE 'NFE',
      cte TYPE string VALUE 'CTE',
      cte_os TYPE string VALUE 'CTE_OS',
    END OF sc_document_type.

  constants:
    BEGIN OF sc_status_codes,
      authorized TYPE i VALUE 100,
      canceled TYPE i VALUE 101,
      rejected TYPE i VALUE 102,
    END OF sc_status_codes.

  constants:
    BEGIN OF sc_message_icons,
      error TYPE iconname VALUE '@8O@',
      warning TYPE iconname VALUE '@8R@',
      success TYPE iconname VALUE '@01@',
    END OF sc_message_icons.
endclass.
```

**Key Benefits**:
- Centralized country-specific business rules
- Easy maintenance and updates
- Consistent values across the application
- Clear separation of localization concerns

---

## 🔧 BADI WRAPPER PATTERN

**Use Case**: Standardized BADI integration with error handling

```abap
interface IF_BADI_WRAPPER.
  methods CALL_CALCULATE_AMOUNT
    importing IO_BADI type ref to BADI_INTERFACE
             IO_DOCUMENT type ref to DOCUMENT_CLASS
    returning value(RV_AMOUNT) type CURR15_2
    raising CX_BADI_ERROR.
endinterface.

class CL_BADI_WRAPPER definition
  public
  final
  create public.

public section.
  interfaces IF_BADI_WRAPPER.
endclass.

class CL_BADI_WRAPPER implementation.
  method IF_BADI_WRAPPER~CALL_CALCULATE_AMOUNT.
    DATA lt_bapiret TYPE bapirettab.
    
    CALL BADI io_badi->calculate_amount
      EXPORTING io_document = io_document
      IMPORTING ev_amount = rv_amount
               et_bapiret = lt_bapiret.
    
    IF cl_bapiret_utils=>check_for_errors( lt_bapiret ) = abap_true.
      RAISE EXCEPTION TYPE cx_badi_error
        EXPORTING mt_bapiret = lt_bapiret.
    ENDIF.
  endmethod.
endclass.
```

**Key Benefits**:
- Consistent error handling across all BADI calls
- BAPIRET to exception conversion
- Centralized BADI management
- Testability through interface abstraction

---

## 🎭 COMPONENT FACTORY PATTERN

**Use Case**: Dynamic UI component creation based on configuration

```abap
interface IF_COMPONENT_FACTORY.
  methods CREATE
    importing IV_COMPONENT_TYPE type STRING
             IV_CONTEXT type STRING
    returning value(RO_COMPONENT) type ref to IF_UI_COMPONENT
    raising CX_FACTORY_ERROR.
endinterface.

class CL_COMPONENT_FACTORY definition
  public
  create public.

public section.
  interfaces IF_COMPONENT_FACTORY.

private section.
  data MO_CONFIG type ref to IF_COMPONENT_CONFIG.
endclass.

class CL_COMPONENT_FACTORY implementation.
  method IF_COMPONENT_FACTORY~CREATE.
    DATA lv_class_name TYPE string.
    
    CASE iv_component_type.
      WHEN 'BUTTON_SAVE'.
        lv_class_name = 'CL_UI_BUTTON_SAVE'.
      WHEN 'BUTTON_CANCEL'.
        lv_class_name = 'CL_UI_BUTTON_CANCEL'.
      WHEN 'GRID_ALV'.
        lv_class_name = 'CL_UI_GRID_ALV'.
      WHEN OTHERS.
        " Check configuration for custom components
        lv_class_name = mo_config->get_component_class(
          iv_type = iv_component_type
          iv_context = iv_context ).
    ENDCASE.
    
    IF lv_class_name IS INITIAL.
      RAISE EXCEPTION TYPE cx_factory_error
        EXPORTING component_type = iv_component_type.
    ENDIF.
    
    CREATE OBJECT ro_component TYPE (lv_class_name).
  endmethod.
endclass.
```

**Key Benefits**:
- Runtime component creation flexibility
- Configuration-driven extensibility
- Clean separation of creation logic
- Support for custom components

---

## 🚨 ENTERPRISE EXCEPTION HANDLING

**Use Case**: Structured exception hierarchy with message integration

```abap
" Base exception class
class CX_BUSINESS_ERROR definition
  public
  inheriting from CX_STATIC_CHECK
  create public.

public section.
  interfaces IF_T100_MESSAGE.
  data MT_BAPIRET type BAPIRET2_TAB read-only.
  data MV_CONTEXT type STRING read-only.

  methods CONSTRUCTOR
    importing TEXTID like IF_T100_MESSAGE=>T100KEY optional
             PREVIOUS like PREVIOUS optional
             MT_BAPIRET type BAPIRET2_TAB optional
             MV_CONTEXT type STRING optional.
endclass.

" Specific exception classes
class CX_PROCESS_ERROR definition
  public
  inheriting from CX_BUSINESS_ERROR
  create public.

public section.
  constants:
    BEGIN OF process_step_failed,
      msgid TYPE symsgid VALUE 'ZPROCESS',
      msgno TYPE symsgno VALUE '001',
      attr1 TYPE scx_attrname VALUE 'MV_PROCESS_STEP',
    END OF process_step_failed.
    
  data MV_PROCESS_STEP type STRING read-only.
endclass.
```

**Key Benefits**:
- T100 message system integration
- Multiple message support via BAPIRET2_TAB
- Context information for debugging
- Structured exception hierarchy

---

## 🛠️ BAPIRET UTILITIES PATTERN

**Use Case**: Standardized message handling and conversion utilities

```abap
class CL_BAPIRET_UTILS definition
  public
  final
  create private.

public section.
  class-methods BUILD_FROM_EXCEPTION
    importing IX_EXCEPTION type ref to CX_ROOT
             IV_MSGTY type SYMSGTY default 'E'
    returning value(RS_BAPIRET) type BAPIRET2.

  class-methods CHECK_FOR_ERRORS
    importing IT_BAPIRET type BAPIRETTAB
    returning value(RV_HAS_ERRORS) type ABAP_BOOL.

  class-methods DISPLAY_MESSAGES
    importing IT_BAPIRET type BAPIRETTAB
             IV_TITLE type STRING optional.

  class-methods BUILD_FROM_SY
    returning value(RS_BAPIRET) type BAPIRET2.
endclass.

class CL_BAPIRET_UTILS implementation.
  method BUILD_FROM_EXCEPTION.
    DATA lo_t100_msg TYPE REF TO if_t100_message.
    
    TRY.
      lo_t100_msg ?= ix_exception.
      
      MESSAGE ID lo_t100_msg->t100key-msgid
            TYPE iv_msgty
          NUMBER lo_t100_msg->t100key-msgno
            WITH sy-msgv1 sy-msgv2 sy-msgv3 sy-msgv4
            INTO rs_bapiret-message.
            
      rs_bapiret-type = sy-msgty.
      rs_bapiret-id = sy-msgid.
      rs_bapiret-number = sy-msgno.
      rs_bapiret-message_v1 = sy-msgv1.
      rs_bapiret-message_v2 = sy-msgv2.
      rs_bapiret-message_v3 = sy-msgv3.
      rs_bapiret-message_v4 = sy-msgv4.
      
    CATCH cx_sy_move_cast_error.
      rs_bapiret-message = ix_exception->get_text( ).
      rs_bapiret-type = iv_msgty.
    ENDTRY.
  endmethod.

  method CHECK_FOR_ERRORS.
    LOOP AT it_bapiret TRANSPORTING NO FIELDS
      WHERE type = 'E' OR type = 'A' OR type = 'X'.
      rv_has_errors = abap_true.
      EXIT.
    ENDLOOP.
  endmethod.
endclass.
```

**Key Benefits**:
- Standardized exception to BAPIRET conversion
- Consistent error checking across applications
- Integrated message display functionality
- Support for various message sources (SY, T100, exceptions)

---

## 🎯 DYNAMIC EVENT HANDLING PATTERN

**Use Case**: Flexible event processing with runtime method resolution

```abap
class CL_EVENT_HANDLER definition
  public
  create public.

public section.
  methods SET_HANDLER
    importing IO_HANDLER type ref to OBJECT
             IV_EVENT_TYPE type STRING.

  methods TRIGGER_EVENT
    importing IV_EVENT_TYPE type STRING
             IT_PARAMETERS type ABAP_PARMBIND_TAB optional
    raising CX_EVENT_ERROR.

private section.
  types: BEGIN OF ty_handler,
           event_type TYPE string,
           handler TYPE REF TO object,
           method_name TYPE string,
         END OF ty_handler.
  
  data MT_HANDLERS type TABLE OF ty_handler.
endclass.

class CL_EVENT_HANDLER implementation.
  method TRIGGER_EVENT.
    DATA ls_handler TYPE ty_handler.
    
    READ TABLE mt_handlers INTO ls_handler
      WITH KEY event_type = iv_event_type.
    
    IF sy-subrc <> 0.
      RAISE EXCEPTION TYPE cx_event_error
        EXPORTING event_type = iv_event_type.
    ENDIF.
    
    TRY.
      CALL METHOD ls_handler-handler->(ls_handler-method_name)
        PARAMETER-TABLE it_parameters.
        
    CATCH cx_sy_dyn_call_param_missing INTO DATA(lx_param).
      RAISE EXCEPTION TYPE cx_event_error
        EXPORTING previous = lx_param.
    CATCH cx_sy_dyn_call_illegal_method INTO DATA(lx_method).
      RAISE EXCEPTION TYPE cx_event_error
        EXPORTING previous = lx_method.
    ENDTRY.
  endmethod.
endclass.
```

**Key Benefits**:
- Runtime event handler registration
- Flexible parameter passing
- Comprehensive error handling for dynamic calls
- Decoupled event processing

---

## 📋 IMPLEMENTATION CHECKLIST

When implementing these enterprise patterns:

### ✅ **Architecture**
- [ ] Use interfaces for all major components
- [ ] Implement wrapper classes for system dependencies
- [ ] Create abstract base classes for common functionality
- [ ] Separate concerns with clear module boundaries

### ✅ **Error Handling**
- [ ] Create structured exception hierarchy
- [ ] Integrate with T100 message system
- [ ] Provide BAPIRET utilities for message handling
- [ ] Convert technical errors to business-friendly messages

### ✅ **Localization**
- [ ] Centralize country-specific constants
- [ ] Use BADI wrapper pattern for customization points
- [ ] Implement authority check wrappers
- [ ] Support multiple business models

### ✅ **Testing**
- [ ] Design with dependency injection
- [ ] Use interface-based abstractions
- [ ] Implement wrapper classes for system APIs
- [ ] Create comprehensive test scenarios

### ✅ **Performance**
- [ ] Use configuration-driven approaches
- [ ] Implement lazy loading where appropriate
- [ ] Cache frequently accessed data
- [ ] Optimize database access patterns

These patterns represent **proven enterprise-grade solutions** from SAP's standard codebase, providing robust foundations for scalable, maintainable ABAP applications.
