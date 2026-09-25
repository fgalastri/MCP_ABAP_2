# ADT API Requests for Postman Testing

Test these requests **in sequence** to replicate the ADT workflow.

## Prerequisites

### Base Configuration
- **Base URL**: `https://your-sap-system:44301`
- **SAP Client**: `400`
- **Username**: Your SAP username
- **Password**: Your SAP password

### Global Headers (Add to ALL requests)
```
Authorization: Basic <base64(username:password)>
sap-client: 400
Connection: keep-alive
```

**IMPORTANT**: In Postman, use the same "session" by keeping cookies between requests:
1. Go to Postman Settings → General
2. Enable "Automatically follow redirects"
3. Enable "Send cookies with redirects"

---

## Request 1: Get Reentrance Ticket

**Purpose**: Establish ADT session (first call after login)

**Method**: `GET`

**URL**: 
```
https://your-sap-system:44301/sap/bc/adt/security/reentranceticket
```

**Headers**:
```
Authorization: Basic <base64(username:password)>
sap-client: 400
Accept: application/xml,text/plain,*/*
Connection: keep-alive
sap-adt-request-id: <generate-random-uuid-without-dashes>
```

**Body**: None

**Expected Response**: 
- Status: 200 OK
- Body: Plain text ticket value (e.g., `01234567890ABCDEF...`)
- Look for `set-cookie` headers - save these cookies!

**Save from response**:
- All cookies (will be used in subsequent requests)

---

## Request 2: Get CSRF Token

**Purpose**: Get CSRF token for write operations

**Method**: `GET`

**URL**: 
```
https://your-sap-system:44301/sap/bc/adt/repository/informationsystem/virtualfolders/contents
```

**Headers**:
```
Authorization: Basic <base64(username:password)>
sap-client: 400
Accept: application/xml,text/plain,*/*
Connection: keep-alive
X-CSRF-Token: Fetch
sap-adt-request-id: <generate-NEW-random-uuid-without-dashes>
Cookie: <paste-all-cookies-from-request-1>
```

**Body**: None

**Expected Response**: 
- Status: 400 (yes, error is expected!)
- Look in **response headers** for `x-csrf-token`

**Save from response**:
- `x-csrf-token` header value (you'll need this for write operations)

---

## Request 3: LOCK Object

**Purpose**: Lock an ABAP class for modification

**Method**: `POST`

**URL**: 
```
https://your-sap-system:44301/sap/bc/adt/oo/classes/zcl_adt_test_003/source/main?_action=LOCK&accessMode=MODIFY
```

**Replace `zcl_adt_test_003` with your class name (lowercase)**

**Headers**:
```
Authorization: Basic <base64(username:password)>
sap-client: 400
Accept: application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result;q=0.8, application/vnd.sap.as+xml;charset=UTF-8;dataname=com.sap.adt.lock.result2;q=0.9
Content-Type: application/xml
Connection: keep-alive
X-CSRF-Token: <paste-token-from-request-2>
X-sap-adt-profiling: server-time
sap-adt-request-id: <generate-NEW-random-uuid-without-dashes>
Cookie: <paste-all-cookies-from-request-1>
```

**Body**: Empty string (or leave blank)

**Expected Response**: 
- Status: 200 OK
- Body: XML with lock information

**Example Response**:
```xml
<?xml version="1.0" encoding="utf-8"?>
<asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
  <asx:values>
    <DATA>
      <LOCK_HANDLE>Uxxxxxxx...</LOCK_HANDLE>
      <CORRNR>S4HK908550</CORRNR>
      <CORRUSER>YOUR_USER</CORRUSER>
      <CORRTEXT>Transport text</CORRTEXT>
      <MODIFICATION_SUPPORT>Modification</MODIFICATION_SUPPORT>
      <IS_LOCAL>X</IS_LOCAL>
    </DATA>
  </asx:values>
</asx:abap>
```

**Save from response**:
- `LOCK_HANDLE` value (critical for next request!)
- `CORRNR` value (transport request number)

---

## Request 4: SAVE Source Code (PUT)

**Purpose**: Save ABAP source code using the lock handle

**Method**: `PUT`

**URL**: 
```
https://your-sap-system:44301/sap/bc/adt/oo/classes/zcl_adt_test_003/source/main?lockHandle=<paste-lock-handle>&corrNr=S4HK908550
```

**Replace**:
- `zcl_adt_test_003` with your class name (lowercase)
- `<paste-lock-handle>` with the actual `LOCK_HANDLE` from Request 3
- `S4HK908550` with your transport request (or omit `&corrNr=...` for local objects in `$TMP`)

**Headers**:
```
Authorization: Basic <base64(username:password)>
sap-client: 400
Accept: text/plain
Content-Type: text/plain; charset=utf-8
Connection: keep-alive
X-CSRF-Token: <paste-token-from-request-2>
X-sap-adt-profiling: server-time
sap-adt-request-id: <generate-NEW-random-uuid-without-dashes>
Cookie: <paste-all-cookies-from-request-1>
```

**Body** (Plain Text):
```abap
CLASS zcl_adt_test_003 DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC .

  PUBLIC SECTION.
    METHODS: test_method.
  PROTECTED SECTION.
  PRIVATE SECTION.
ENDCLASS.



CLASS zcl_adt_test_003 IMPLEMENTATION.
  METHOD test_method.
    WRITE: / 'Hello from ADT MCP!'.
  ENDMETHOD.
ENDCLASS.
```

**Expected Response**: 
- Status: 200 OK (if successful)
- Status: 423 (if lock handle is invalid - this is the error we're debugging!)
- Status: 403 (if CSRF token is missing/invalid)

---

## Troubleshooting Tips

### If you get 423 "Invalid Lock Handle":
1. ✅ Verify you're using the **exact same cookies** from Request 1 in ALL requests
2. ✅ Check the `LOCK_HANDLE` is copied correctly (no extra spaces)
3. ✅ Ensure you're testing from the **same Postman instance** (don't close/reopen between requests)
4. ✅ The lock might expire if you wait too long between Request 3 and 4 (test quickly!)

### If you get 403 "CSRF token validation failed":
1. ✅ Verify the `X-CSRF-Token` header is present in Request 4
2. ✅ Check the token value is copied correctly from Request 2
3. ✅ Ensure cookies are being sent

### If you get 401 "Unauthorized":
1. ✅ Check your Basic Auth credentials are correct
2. ✅ Verify `sap-client` header is `400`

### Key Differences from Eclipse (What We Removed):
- ❌ **NO** `sap-adt-connection-id` header (Eclipse doesn't send this!)
- ✅ **YES** `sap-adt-request-id` header (new UUID for each request)
- ✅ **YES** cookies from initial session
- ✅ **YES** `Connection: keep-alive` to reuse TCP connection

---

## UUID Generator

For `sap-adt-request-id`, generate a new UUID for each request and remove dashes.

**JavaScript example**:
```javascript
const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
  const r = Math.random() * 16 | 0;
  const v = c == 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});
const requestId = uuid.replace(/-/g, ''); // Remove dashes
```

**Online tool**: https://www.uuidgenerator.net/ (then remove dashes manually)

---

## Expected Sequence

1. **Request 1** → Get reentrance ticket → Save cookies
2. **Request 2** → Get CSRF token (from 400 error response) → Save token
3. **Request 3** → Lock object → Save lock handle
4. **Request 4** → Save source code using lock handle → Should succeed!

If Request 4 fails with 423, the problem is likely:
- Cookies not being sent
- Using a different TCP connection (not keep-alive)
- SAP server configuration issue

Good luck! 🚀



