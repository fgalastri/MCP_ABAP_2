# 🚀 Quick Start: BTP Authentication

## Run This Command:

```bash
node authenticate_btp_simple.js
```

## Then Follow These Steps:

1. **The server will start** and show you a URL
2. **Copy the URL** (it will look like this):
   ```
   https://72bf6203-9328-4888-af10-ea65eeb72d78.abap-web.eu10.hana.ondemand.com/sap/bc/adt/core/http/reentranceticket?redirect-url=http://localhost:8765/adt/redirect
   ```

3. **Paste it in your browser** (Chrome, Edge, etc.)

4. **Log in to BTP** (if not already logged in)

5. **Wait for redirect** - You'll be sent back to `localhost:8765`

6. **Cookies captured!** - The script will save them automatically

## What Happens:

✅ Local server captures the reentrance ticket  
✅ Exchanges it for ADT session cookies  
✅ Saves to `btp_cookies.json`  
✅ Ready to use!  

## After Success:

Test the cookies:
```bash
node test_btp_with_cookies.js
```

If successful, update your Cursor MCP config and you're done!

---

**Ready? Run the command above!** 🎉

