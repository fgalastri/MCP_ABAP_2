# 🚀 **Quick Reference: 5 New Creation Tools**

## **Tool List**

| Tool | Object Type | Naming Convention |
|------|-------------|-------------------|
| `adt_create_interface` | Interface | ZIF_* |
| `adt_create_program` | Program/Report | Z* |
| `adt_create_cds_view` | CDS View | Z_* |
| `adt_create_data_element` | Data Element | Z_* |
| `adt_create_domain` | Domain | Z_* |

---

## **1. Interface Creation**

```javascript
adt_create_interface({
  interface_name: "ZIF_MY_INTERFACE",
  description: "My Interface",
  package_name: "ZPACKAGE",
  transport_request: "S4HK908550"
})
```

**Next:** Use `adt_save_source` + `adt_activate`

---

## **2. Program Creation**

```javascript
adt_create_program({
  program_name: "ZTEST_REPORT",
  description: "Test Report",
  package_name: "ZPACKAGE",
  transport_request: "S4HK908550",
  program_type: "1"  // Optional: 1=Executable, I=Include, M=Module Pool
})
```

**Program Types:**
- `1` = Executable Program
- `I` = Include
- `M` = Module Pool
- `S` = Subroutine
- `F` = Function Group

**Next:** Use `adt_save_source` + `adt_activate`

---

## **3. CDS View Creation**

```javascript
adt_create_cds_view({
  cds_name: "Z_MY_CDS_VIEW",
  description: "My CDS View",
  package_name: "ZPACKAGE",
  transport_request: "S4HK908550"
})
```

**Next:** Use `adt_save_source` (object_type: "DDLS") + `adt_activate`

---

## **4. Data Element Creation**

```javascript
adt_create_data_element({
  data_element_name: "Z_MY_DTEL",
  description: "My Data Element",
  package_name: "ZPACKAGE",
  transport_request: "S4HK908550"
})
```

**Next:** Use SE11 or ADT DDIC editor to define:
- Domain reference or built-in type
- Field labels
- Search help

---

## **5. Domain Creation**

```javascript
adt_create_domain({
  domain_name: "Z_MY_DOMAIN",
  description: "My Domain",
  package_name: "ZPACKAGE",
  transport_request: "S4HK908550"
})
```

**Next:** Use SE11 or ADT DDIC editor to define:
- Data type (CHAR, NUMC, INT, etc.)
- Length and decimals
- Value range

---

## **Common Parameters**

All tools require:
- `*_name`: Object name (follows naming convention)
- `description`: Object description
- `package_name`: Package (e.g., ZPACKAGE, $TMP for local)
- `transport_request`: Transport request number

---

## **Workflow Pattern**

### **For Source-Based Objects** (Interface, Program, CDS)
1. Create metadata: `adt_create_*`
2. Add source code: `adt_save_source`
3. Check syntax: `adt_check_syntax` (optional)
4. Activate: `adt_activate`

### **For DDIC Objects** (Data Element, Domain)
1. Create metadata: `adt_create_*`
2. Define attributes: Use SE11 or ADT DDIC editor
3. Activate: Use SE11 or ADT

---

## **Error Handling**

All tools return:
- ✅ **Success:** Formatted message with details + next steps
- ❌ **Failure:** Error message + HTTP status + possible reasons

Common failure reasons:
- Object already exists
- Transport request doesn't exist or is locked
- Package doesn't exist or no authorization
- Invalid object name format

---

## **Testing Checklist**

Before production use, test each tool:

- [ ] Interface creation
- [ ] Program creation (executable)
- [ ] Program creation (include)
- [ ] CDS View creation
- [ ] Data Element creation
- [ ] Domain creation

Test in `$TMP` package first for safety.

---

## **Integration with Existing Tools**

These new tools integrate seamlessly with:
- `adt_save_source` - Add source code
- `adt_read_source` - Read source code
- `adt_check_syntax` - Check syntax
- `adt_activate` - Activate objects
- `adt_run_tests` - Run unit tests
- `adt_save_testclass_source` - Add test classes

---

## **Status: ⚠️ RESTART REQUIRED**

**The MCP server must be restarted to load these new tools.**

```bash
cd ADT && node server_adt.js
```

---

**Ready to use after restart!** 🎉

