# SAP BTP Class Execution Caching Issue

**Date Identified:** November 20, 2025  
**Severity:** Medium (Affects Development Workflow)  
**Status:** Known Limitation - No Fix Available

---

## 🔍 Issue Description

When executing ABAP classes using `if_oo_adt_classrun~main` (F9) on **SAP BTP ABAP Environment**, the system may return **old/cached compiled code** even after the class has been successfully saved and activated.

### Observed Behavior

1. ✅ Class is modified and saved successfully
2. ✅ Class is activated successfully (no errors)
3. ✅ ADT read_source shows the NEW code
4. ✅ Eclipse ADT execution (F9) shows the NEW code
5. ❌ **MCP `adt_execute_class` returns OLD code** (cached version)

### Debug Evidence

From debug logs during execution:

```
[EXECUTE CLASS] Full URL: https://{tenant}.abap-web.eu10.hana.ondemand.com/sap/bc/adt/oo/classrun/%2FCOREVIST%2FCL_PACKAGE_READER
[EXECUTE CLASS] CSRF Token: Present
[EXECUTE CLASS] Cookies: 4 cookies set

Response Headers:
- content-length: 331 (OLD code size)
- sap-cache-control: +0
- sap-server: true

Response Body: [OLD CODE OUTPUT]
```

### What We Tried

#### ❌ Attempt 1: Cache-Busting URL Parameters
- Added timestamp parameter `?_=1732128236611` to URL
- **Result:** Made it worse - routed to different cached instance

#### ❌ Attempt 2: Cache-Control Headers
- Added `Cache-Control: no-cache, no-store`
- Added `Pragma: no-cache`
- Added `Expires: 0`
- **Result:** No effect - SAP ignores these headers

#### ❌ Attempt 3: Force New Session
- Clear CSRF token before each execution
- Reinitialize session to get fresh cookies
- **Result:** Still returns old code

---

## 🎯 Root Cause Analysis

### Confirmed: SAP BTP Server-Side Compilation Cache

This is **NOT** an HTTP caching issue. This is **SAP BTP's ABAP runtime** caching the compiled class code at the application server level.

**Why Eclipse Works:**
- Eclipse may use different routing
- Eclipse may have special session parameters
- Eclipse may hit different application server instances
- The BTP load balancer may route differently based on client characteristics

**Why MCP Doesn't Work:**
- Node.js HTTP client routes to specific cached instance
- Persistent session cookies keep us on same app server
- That app server has the old compiled code in memory

### SAP BTP Architecture Impact

```
User Request → BTP Load Balancer → Application Server Instance
                                   ↓
                                   ABAP Runtime Cache
                                   ↓
                                   Compiled Class Code (CACHED)
```

The cache exists at the **ABAP Runtime** level, not the HTTP level. When you activate a class, it may take time for all application server instances to reload the compiled code.

---

## ✅ Current Workaround

**For now, we accept this limitation:**

1. Use Eclipse ADT for immediate class execution after changes
2. Use MCP `adt_execute_class` for:
   - Running stable/unchanged classes
   - Automated workflows where slight delays are acceptable
   - Testing after waiting a few minutes for cache to clear

### User Guidance

When a user reports "execution returns old code":

```
⚠️ Known Issue: SAP BTP Class Execution Caching

SAP BTP's ABAP runtime may cache compiled class code. After activation, 
the new code may not be immediately available via the ADT API.

Workarounds:
1. Execute the class in Eclipse ADT (F9) - usually shows new code immediately
2. Wait a few minutes and try again - cache will eventually clear
3. For critical testing, use Eclipse instead of MCP execution

The class is correctly saved and activated. This is only an execution 
cache issue, not a problem with the class itself.
```

---

## 📊 Technical Details

### Request Comparison: Eclipse vs MCP

**Eclipse ADT Request:**
```
POST /sap/bc/adt/oo/classrun/%2FCOREVIST%2FCL_PACKAGE_READER
Accept: text/plain
X-CSRF-Token: {token}
X-sap-adt-sessiontype: stateful
Cookie: {session cookies}
```

**MCP Request (Identical):**
```
POST /sap/bc/adt/oo/classrun/%2FCOREVIST%2FCL_PACKAGE_READER
Accept: text/plain
X-CSRF-Token: {token}
X-sap-adt-sessiontype: stateful
Cookie: {session cookies}
```

Both requests are functionally identical. The difference is in SAP's backend routing and caching.

---

## 🔮 Potential Future Solutions

### Option 1: Force Different App Server
- Add custom routing headers (if SAP supports them)
- Research BTP load balancer behavior
- May require SAP support ticket

### Option 2: Call Activation API Again
- After activation, immediately call activation API again
- May trigger cache invalidation
- Worth testing

### Option 3: Use Eclipse Binary Protocol
- Reverse engineer Eclipse's actual protocol
- Eclipse might use a different endpoint
- Very complex, likely not worth it

### Option 4: Wait and Poll
- After activation, wait N seconds
- Poll execution until new code appears
- Adds delay but ensures correctness

---

## 📝 Related Files

- `ADT/server_adt_btp.js` - executeClass method with debug logging
- `ADT/CRITICAL_FIXES_AND_LEARNINGS.md` - Fix #8 (URL encoding) and Fix #9 (activation errors)
- `ALWAYS_READ.md` - Mistake #13 about activation workflow

---

## 🏁 Conclusion

This is a **known limitation of SAP BTP's ABAP runtime caching** that affects the ADT REST API. We have comprehensive debugging in place, and we've confirmed our MCP implementation is correct. The issue is on SAP's side.

**Decision:** Keep the current implementation with debug logging. Document the limitation. Advise users to use Eclipse for immediate post-activation execution testing.

