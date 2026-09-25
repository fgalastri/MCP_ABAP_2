# 🌐 Capture BTP ADT Cookies from Browser

## Step-by-Step Guide

### 1. **Open Browser Developer Tools**
- Press `F12` or right-click → "Inspect"
- Go to the **Network** tab
- ✅ Check "Preserve log" (important!)

### 2. **Do the Full Login Flow**
Navigate to your BTP ADT API endpoint:
```
https://abap-cloud-subaccount-frankfurt.abap.eu10.hana.ondemand.com/sap/bc/adt/discovery
```

- Complete the OAuth/SAML login
- Wait until you see a successful response (XML or success page)

### 3. **Find the ADT API Request**
In the Network tab:
- Look for a request to `/sap/bc/adt/discovery` or `/sap/bc/adt/core/http/sessions`
- Click on it
- Go to the **Headers** tab

### 4. **Copy ALL Request Cookies**
Scroll down to "Request Headers" section:
- Find the `Cookie:` header
- Copy the ENTIRE value (might be long!)

Example format:
```
sap-usercontext=sap-client=100; SAP_SESSIONID_XXX_100=...; MYSAPSSO2=...; sap-language=EN
```

### 5. **Save to btp_cookies.json**
The cookies should be in this exact format:
```json
[
  "sap-usercontext=sap-client=100",
  "SAP_SESSIONID_XXX_100=...",
  "MYSAPSSO2=...",
  "sap-language=EN"
]
```

**Each cookie is a separate string in the array!**

## 🎯 What We're Looking For

The most important cookies are:
- ✅ **SAP_SESSIONID_XXX_100** (or similar with your client number)
- ✅ **MYSAPSSO2** (SSO ticket)
- ✅ **sap-usercontext** (client/language info)

## ⚠️ Important Notes

1. **Domain matters**: Cookies must be from the ADT API domain:
   - ✅ `abap-cloud-subaccount-frankfurt.abap.eu10.hana.ondemand.com`
   - ❌ NOT from `accounts.sap.com` or BTP cockpit

2. **Timing**: Capture cookies immediately after successful login (they expire!)

3. **Format**: Must be in JSON array format, one cookie per string

## 📝 Example Result

```json
[
  "sap-usercontext=sap-client=100",
  "SAP_SESSIONID_S4H_100=SomeLongSessionValue",
  "MYSAPSSO2=AnotherLongSSOTicket",
  "sap-language=EN"
]
```

---

Once you have these cookies, the MCP server will work! 🚀

