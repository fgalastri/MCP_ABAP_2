# SOFTWARE LICENSE AGREEMENT
## ABAP Development Tools MCP Server

**Version:** 1.0  
**Effective Date:** January 15, 2026  
**Licensor:** [YOUR COMPANY NAME]  
**Product:** ABAP Development Tools Model Context Protocol (MCP) Server

---

## 1. GRANT OF LICENSE

Subject to the terms and conditions of this Agreement, Licensor grants to Customer a **non-exclusive, non-transferable, revocable license** to use the Software solely for Customer's internal business purposes.

### 1.1 Authorized Use
- Use of the Software by authorized employees and contractors
- Installation on Customer's designated systems
- Integration with SAP S/4HANA systems owned or licensed by Customer
- Use with AI coding assistants (Cursor IDE, VS Code, etc.)

### 1.2 Restrictions
Customer shall NOT:
- **Reverse engineer, decompile, or disassemble** the Software or any component thereof
- **Create derivative works** based on the Software
- **Remove or modify** any proprietary notices, labels, or marks
- **Distribute, sublicense, rent, lease, or lend** the Software to third parties
- **Use the Software** to provide services to third parties (SaaS model)
- **Share API keys** or authentication credentials with unauthorized parties
- **Bypass or circumvent** any security measures or usage limitations

---

## 2. INTELLECTUAL PROPERTY RIGHTS

### 2.1 Ownership
The Software, including all source code, object code, documentation, algorithms, user interfaces, and all intellectual property rights therein, is and shall remain the **exclusive property** of Licensor.

### 2.2 Confidentiality
Customer acknowledges that the Software contains **trade secrets and confidential information** of Licensor. Customer shall:
- Maintain the confidentiality of the Software
- Not disclose the Software's implementation details to third parties
- Limit access to authorized personnel only
- Implement reasonable security measures to protect the Software

### 2.3 Protected Elements
The following are specifically protected:
- ✅ AI orchestration logic and workflows
- ✅ Prompt engineering techniques
- ✅ Error recovery algorithms
- ✅ Multi-step operation sequences
- ✅ Performance optimizations
- ✅ Integration patterns
- ✅ Documentation and training materials

### 2.4 Non-Protected Elements
Customer acknowledges that certain elements are **publicly known** or **inherently discoverable**:
- SAP ADT REST API endpoints (documented by SAP)
- HTTP request/response formats (SAP standard)
- XML/JSON schemas (SAP public specifications)

---

## 3. API KEY AND AUTHENTICATION

### 3.1 API Key Issuance
- Licensor shall provide Customer with unique API key(s)
- API keys are **customer-specific** and tied to subscription
- API keys enable access to the remote MCP server

### 3.2 API Key Security
Customer shall:
- **Keep API keys confidential** (treat as passwords)
- **Not share API keys** with unauthorized parties
- **Immediately notify Licensor** if API key is compromised
- **Rotate API keys** periodically as recommended

### 3.3 API Key Revocation
Licensor reserves the right to **revoke API keys**:
- Upon termination of this Agreement
- If Customer violates terms of this Agreement
- If suspicious activity is detected
- For security reasons (with reasonable notice)

---

## 4. DATA AND PRIVACY

### 4.1 Customer Data
- **SAP credentials remain local** - never transmitted to Licensor
- **Customer source code** may be transmitted (encrypted) for processing
- **Metadata** (usage statistics, error logs) may be collected

### 4.2 Data Usage by Licensor
Licensor may collect and use:
- **Usage statistics** (requests per day, tool usage patterns)
- **Performance metrics** (response times, error rates)
- **Error logs** (for debugging and improvement)
- **Aggregated analytics** (anonymized across all customers)

Licensor shall NOT:
- Store or log SAP credentials
- Share customer-specific data with third parties
- Use customer data for competitive purposes

### 4.3 Data Security
Licensor shall implement **industry-standard security measures**:
- TLS 1.3 encryption for all network traffic
- AES-256-GCM encryption for sensitive data
- Secure key management practices
- Regular security audits
- Incident response procedures

---

## 5. SUBSCRIPTION AND FEES

### 5.1 Subscription Tiers
- **Free Tier:** Limited usage (100 requests/day)
- **Professional:** Standard usage (10,000 requests/day)
- **Enterprise:** Unlimited usage + premium support

### 5.2 Payment Terms
- Subscription fees are **annual** (billed annually)
- Fees are **non-refundable** except as required by law
- Automatic renewal unless cancelled 30 days before renewal

### 5.3 Usage Limits
Each tier includes:
- Maximum requests per day/minute
- Maximum concurrent users
- Maximum data transfer limits

Exceeding limits may result in:
- Temporary throttling
- Upgrade requirement
- Additional fees

---

## 6. SUPPORT AND MAINTENANCE

### 6.1 Updates
Licensor shall provide:
- **Bug fixes** (critical security issues within 48 hours)
- **Feature updates** (included in subscription)
- **SAP compatibility** (support for new SAP releases)

### 6.2 Support Levels
- **Free Tier:** Community support (best effort)
- **Professional:** Email support (48-hour response)
- **Enterprise:** Priority support + dedicated account manager

---

## 7. WARRANTY AND LIABILITY

### 7.1 Limited Warranty
Licensor warrants that the Software shall **substantially conform** to its documentation for 90 days from license activation.

### 7.2 Disclaimer
EXCEPT AS EXPRESSLY PROVIDED ABOVE, THE SOFTWARE IS PROVIDED **"AS IS"** WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

### 7.3 Limitation of Liability
IN NO EVENT SHALL LICENSOR BE LIABLE FOR:
- **Indirect, incidental, special, or consequential damages**
- **Loss of profits, data, or business interruption**
- **Damages exceeding fees paid in the 12 months prior to claim**

### 7.4 SAP System Access
Customer acknowledges:
- Software accesses SAP systems on Customer's behalf
- Customer is responsible for SAP system security
- Customer is responsible for SAP license compliance
- Licensor is not responsible for SAP system issues

---

## 8. TERM AND TERMINATION

### 8.1 Term
This Agreement begins upon Customer's acceptance and continues until terminated.

### 8.2 Termination by Customer
Customer may terminate:
- With 30 days written notice
- Immediately if Licensor breaches Agreement

### 8.3 Termination by Licensor
Licensor may terminate immediately if Customer:
- Violates reverse engineering restrictions
- Shares API keys with unauthorized parties
- Exceeds usage limits without upgrade
- Fails to pay fees (after 30-day cure period)
- Uses Software for illegal purposes

### 8.4 Effect of Termination
Upon termination:
- Customer's license is **immediately revoked**
- API keys are **deactivated**
- Customer shall **cease all use** of the Software
- Customer shall **delete or return** all copies of the Software
- Outstanding fees remain **due and payable**

### 8.5 Survival
The following sections survive termination:
- Section 2 (Intellectual Property)
- Section 4 (Data and Privacy)
- Section 7 (Warranty and Liability)
- Section 9 (General Provisions)

---

## 9. GENERAL PROVISIONS

### 9.1 Entire Agreement
This Agreement constitutes the entire agreement between the parties and supersedes all prior agreements.

### 9.2 Amendments
Licensor may amend this Agreement with 30 days notice. Continued use constitutes acceptance.

### 9.3 Governing Law
This Agreement shall be governed by the laws of [YOUR JURISDICTION], without regard to conflict of law principles.

### 9.4 Dispute Resolution
Any disputes shall be resolved through:
1. Good faith negotiation (30 days)
2. Mediation (if negotiation fails)
3. Binding arbitration (if mediation fails)

### 9.5 Severability
If any provision is found invalid, the remainder shall remain in full force.

### 9.6 Assignment
Customer may not assign this Agreement without Licensor's written consent.

### 9.7 Force Majeure
Neither party shall be liable for delays caused by circumstances beyond reasonable control.

---

## 10. ACCEPTANCE

By using the Software, installing the Local Agent, or using an API key, Customer acknowledges that Customer has read, understood, and agrees to be bound by this Agreement.

**Customer Acceptance:**
- Date: _____________________
- Company: _____________________
- Authorized Signature: _____________________
- Name (Print): _____________________
- Title: _____________________

**Licensor:**
- Date: January 15, 2026
- Company: [YOUR COMPANY NAME]
- Authorized Representative: _____________________

---

## APPENDIX A: DEFINITIONS

- **Software:** The ABAP Development Tools MCP Server, including all components, documentation, and updates
- **Local Agent:** The minimal client software that executes encrypted HTTP specifications
- **API Key:** Authentication credential provided by Licensor
- **Customer:** The individual or entity licensed to use the Software
- **SAP System:** SAP S/4HANA or other SAP system accessed via the Software
- **Encrypted Spec:** Encrypted HTTP call specification transmitted between MCP and Local Agent

---

## APPENDIX B: ACCEPTABLE USE POLICY

### Prohibited Uses
- Malicious activity (hacking, unauthorized access)
- Excessive automated requests (beyond subscription limits)
- Sharing API keys (each user requires own license)
- Competitive analysis or benchmarking (without permission)
- Creating competing products

### Enforcement
Violations may result in:
- Warning (first offense)
- Temporary suspension (second offense)
- Immediate termination (severe or repeated violations)
- Legal action (if warranted)

---

**Questions?** Contact: legal@[your-company].com  
**Version History:** v1.0 (January 15, 2026) - Initial release
