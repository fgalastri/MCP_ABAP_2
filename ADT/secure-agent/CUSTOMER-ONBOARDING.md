# 🚀 Customer Onboarding Guide
## ABAP Development Tools MCP Server

**Welcome!** This guide will help you get started in **15 minutes**.

---

## 📋 Pre-requisites Checklist

Before you begin, ensure you have:

- [ ] **SAP S/4 HANA access** (username, password, system URL)
- [ ] **Network access** to SAP system (inside VPN or whitelisted)
- [ ] **Node.js 16+** installed ([download](https://nodejs.org/))
- [ ] **Cursor IDE** installed ([download](https://cursor.sh/))
- [ ] **API Key** from us (check your email)
- [ ] **License Agreement** signed (sent to legal@your-company.com)

---

## ⏱️ Quick Setup (15 minutes)

### Step 1: Install Node.js Dependencies (2 min)

```bash
cd ADT/secure-agent
npm install axios
```

### Step 2: Configure SAP Credentials (3 min)

Edit `ADT/sap_systems.json`:

```json
{
  "systems": {
    "DEV": {
      "baseUrl": "https://your-sap-server.company.com:44300",
      "username": "YOUR_SAP_USERNAME",
      "password": "YOUR_SAP_PASSWORD",
      "client": "210",
      "language": "EN",
      "rejectUnauthorized": false
    }
  }
}
```

⚠️ **Important:**
- Replace `your-sap-server.company.com` with your actual SAP host
- Use your **personal SAP credentials** (same as SAP GUI)
- This file **stays on your machine** (never shared with MCP)

### Step 3: Run Setup Script (2 min)

```bash
node setup.js
```

Expected output:
```
✅ Setup Complete!
📍 Found 1 SAP system(s): DEV
✅ Encryption test PASSED
✅ Example saved: example-encrypted-request.json
```

### Step 4: Test Connection (3 min)

```bash
node local-agent.js example-encrypted-request.json
```

Expected output:
```
[LOCAL AGENT] Verified request: GET https://...
[LOCAL AGENT] Response: 200 OK
✅ Connection test successful!
```

### Step 5: Configure Cursor MCP (5 min)

Edit Cursor settings (`.cursor/mcp_settings.json` or via UI):

```json
{
  "mcpServers": {
    "abap-adt": {
      "command": "node",
      "args": ["C:/path/to/ADT/server_adt.js"],
      "env": {
        "MCP_API_KEY": "YOUR_API_KEY_HERE",
        "MCP_MODE": "secure"
      }
    }
  }
}
```

⚠️ **Important:**
- Replace `YOUR_API_KEY_HERE` with the API key we sent you
- Update the path to `server_adt.js`

### Step 6: Restart Cursor & Test (1 min)

1. **Restart Cursor IDE**
2. **Open a new chat**
3. **Ask:** "Please list all ABAP classes starting with ZCL_"
4. **Verify:** You should see results from your SAP system!

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] ✅ Node.js installed (`node --version` shows v16+)
- [ ] ✅ Dependencies installed (`node_modules/` folder exists)
- [ ] ✅ SAP credentials configured (`sap_systems.json` edited)
- [ ] ✅ Setup script successful (`agent.key` file created)
- [ ] ✅ Connection test passed (200 OK response)
- [ ] ✅ Cursor MCP configured (API key added)
- [ ] ✅ Cursor restarted (MCP server loaded)
- [ ] ✅ Test query successful (SAP data returned)

---

## 🎓 Training & Next Steps

### 1. **Try Basic Operations**

Ask Cursor:
- "Read the source code of class ZCL_MY_CLASS"
- "List all tables starting with Z"
- "Show me the first 10 records from table MARA"
- "Create a new class ZCL_TEST with a method hello_world"

### 2. **Explore RAP Development**

Ask Cursor:
- "Generate a RAP business object for table ZTABLE"
- "Create a parameter app with validation and determination"
- "Add a custom query to my RAP object"

### 3. **Advanced Workflows**

Ask Cursor:
- "Find all classes that implement interface ZIF_MY_INTERFACE"
- "Create a class with ABAP Unit tests"
- "Refactor this code to use modern ABAP syntax"

---

## 🔐 Security Best Practices

### ✅ **DO:**
- ✅ Keep `agent.key` secure (never commit to git)
- ✅ Use strong SAP passwords
- ✅ Rotate API keys every 90 days
- ✅ Keep software updated
- ✅ Use VPN when accessing SAP
- ✅ Enable 2FA on your account (when available)

### ❌ **DON'T:**
- ❌ Share your API key with others
- ❌ Commit `sap_systems.json` to version control
- ❌ Use shared SAP accounts
- ❌ Disable SSL verification in production
- ❌ Store credentials in plain text (use environment variables in prod)
- ❌ Share encrypted requests publicly (they contain your specs)

---

## 📊 Usage Limits

Your subscription includes:

| Tier | Requests/Day | Requests/Minute | Support |
|------|--------------|-----------------|---------|
| **Free** | 100 | 10 | Community |
| **Professional** | 10,000 | 100 | Email (48h) |
| **Enterprise** | Unlimited | 1,000 | Priority (4h) |

**Monitor your usage:**
- Dashboard: https://portal.your-company.com
- Email alerts: Enabled by default
- API: GET /api/usage (with API key)

---

## 🐛 Common Issues & Solutions

### Issue: "Encryption key file not found"
**Cause:** Setup script not run  
**Solution:**
```bash
node setup.js
```

### Issue: "401 Unauthorized"
**Cause:** Invalid SAP credentials  
**Solution:**
1. Verify username/password in `sap_systems.json`
2. Test login via SAP GUI
3. Check password hasn't expired

### Issue: "ECONNREFUSED" or "ETIMEDOUT"
**Cause:** Cannot reach SAP system  
**Solution:**
1. Check VPN is connected
2. Ping SAP server: `ping your-sap-server.com`
3. Check firewall rules
4. Verify port 44300 is open

### Issue: "Invalid API key"
**Cause:** API key not configured or invalid  
**Solution:**
1. Check API key in Cursor settings
2. Verify it matches the one we sent you
3. Check subscription status (may have expired)

### Issue: "Timestamp expired"
**Cause:** System clocks out of sync  
**Solution:**
1. Sync system clock with NTP
2. Check time zone settings
3. Restart MCP server

### Issue: Tools not showing in Cursor
**Cause:** MCP server not loaded  
**Solution:**
1. Restart Cursor IDE completely
2. Check Cursor logs (Help → Show Logs)
3. Verify `server_adt.js` path is correct

---

## 🆘 Getting Help

### Self-Service Resources
- 📖 **Documentation:** [https://docs.your-company.com](https://docs.your-company.com)
- 💬 **Community Forum:** [https://community.your-company.com](https://community.your-company.com)
- 📹 **Video Tutorials:** [https://youtube.com/@yourcompany](https://youtube.com/@yourcompany)
- 🐛 **GitHub Issues:** [https://github.com/yourcompany/mcp](https://github.com/yourcompany/mcp)

### Contacting Support

**Professional Tier:**
- 📧 Email: support@your-company.com
- ⏰ Response: Within 48 hours
- 🕐 Hours: Mon-Fri, 9am-5pm

**Enterprise Tier:**
- 📧 Email: enterprise@your-company.com
- 📞 Phone: +1-xxx-xxx-xxxx
- ⏰ Response: Within 4 hours
- 🕐 Hours: 24/7 for critical issues

**When contacting support, include:**
1. Your API key (first 10 characters only)
2. Error message (full text)
3. Steps to reproduce
4. Cursor/Node.js version
5. Operating system

---

## 📅 Onboarding Timeline

| Day | Activity | Duration |
|-----|----------|----------|
| **Day 1** | Setup & Installation | 15 min |
| **Day 1** | Test connection & basic queries | 30 min |
| **Day 2-3** | Explore features & capabilities | 2-3 hours |
| **Week 1** | Training (self-paced or guided) | 4 hours |
| **Week 2** | Real project work | Ongoing |
| **Month 1** | Feedback session with us | 30 min |

---

## 🎉 Success Metrics

After 1 month, you should see:
- ✅ **50% faster ABAP development** (vs manual coding)
- ✅ **80% reduction in syntax errors** (AI catches mistakes)
- ✅ **100% RAP adoption** (easy with generator)
- ✅ **Higher code quality** (AI suggests best practices)
- ✅ **Better documentation** (AI generates comments)

Track your progress:
- Dashboard: https://portal.your-company.com/metrics
- Weekly email reports
- Monthly review calls (Enterprise tier)

---

## 📝 License Compliance

**Reminder:**
- One API key per user (no sharing)
- API key tied to your subscription
- Usage monitored and enforced
- Violations may result in suspension

**Audit Trail:**
- All requests logged (for your security)
- Usage reports available
- Anomaly detection (unusual patterns flagged)

---

## 🌟 What's Next?

### Week 1: Foundation
- [ ] Complete setup
- [ ] Understand basic operations
- [ ] Try example queries
- [ ] Join community forum

### Week 2-4: Exploration
- [ ] Build first RAP app
- [ ] Refactor legacy code
- [ ] Create ABAP Unit tests
- [ ] Share learnings with team

### Month 2+: Mastery
- [ ] Develop custom workflows
- [ ] Train colleagues
- [ ] Provide feedback for roadmap
- [ ] Become power user!

---

## 💬 Feedback

We'd love to hear from you!

**Share your experience:**
- 📧 Email: feedback@your-company.com
- 📊 Survey: [https://survey.your-company.com](https://survey.your-company.com)
- 💬 Community: [https://community.your-company.com](https://community.your-company.com)

**Feature requests:**
- 🎯 Roadmap: [https://roadmap.your-company.com](https://roadmap.your-company.com)
- 💡 Upvote features
- 💬 Submit ideas

---

**Welcome to the future of ABAP development!** 🚀

**Questions?** Email: onboarding@your-company.com  
**Need help?** Book a call: [https://calendly.com/yourcompany](https://calendly.com/yourcompany)
