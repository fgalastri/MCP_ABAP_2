/**
 * Minimal Local Agent for Secure MCP Architecture
 * 
 * Purpose: Execute encrypted HTTP call specifications against S/4 HANA
 * Size: ~100 lines (minimal by design)
 * 
 * What it does:
 * 1. Receives encrypted HTTP call spec from MCP
 * 2. Verifies signature (prevent tampering)
 * 3. Decrypts spec
 * 4. Adds user credentials (from local config - NEVER from MCP!)
 * 5. Executes HTTP call to S/4
 * 6. Returns response
 * 
 * What it DOESN'T do:
 * - Store or log credentials
 * - Send credentials to MCP
 * - Contain ADT business logic
 * - Make decisions about what to call
 */

const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { secureDecrypt } = require('./encryption');

// Configuration file path
const CONFIG_FILE = path.join(__dirname, '../sap_systems.json');
const ENCRYPTION_KEY_FILE = path.join(__dirname, 'agent.key');

/**
 * Load local SAP credentials
 * CRITICAL: These never leave this machine!
 */
function loadLocalCredentials() {
  try {
    const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(configData);
    
    // Get current system from current_system.json or default to DEV
    const currentSystemFile = path.join(__dirname, '../current_system.json');
    let currentSystem = 'DEV'; // Default to DEV
    
    if (fs.existsSync(currentSystemFile)) {
      try {
        const currentSystemData = fs.readFileSync(currentSystemFile, 'utf8');
        const currentSystemJson = JSON.parse(currentSystemData);
        const parsedSystem = currentSystemJson.activeSystem || currentSystemJson.system || 'DEV';
        // Only use if it's not BTP (BTP uses local mode)
        if (parsedSystem !== 'BTP') {
          currentSystem = parsedSystem;
        }
      } catch (error) {
        console.log(`[LOCAL AGENT] Warning: Could not read current_system.json, using DEV`);
      }
    }
    
    console.log(`[LOCAL AGENT] Using SAP system: ${currentSystem}`);
    const systemConfig = config.systems[currentSystem];
    
    if (!systemConfig) {
      throw new Error(`System ${currentSystem} not found in configuration`);
    }
    
    return {
      baseUrl: systemConfig.baseUrl,
      username: systemConfig.username,
      password: systemConfig.password,
      client: systemConfig.client,
      rejectUnauthorized: systemConfig.rejectUnauthorized !== false
    };
  } catch (error) {
    throw new Error(`Failed to load credentials: ${error.message}`);
  }
}

/**
 * Load encryption key for agent
 */
function loadEncryptionKey() {
  try {
    if (!fs.existsSync(ENCRYPTION_KEY_FILE)) {
      throw new Error('Encryption key file not found. Run setup first.');
    }
    
    return fs.readFileSync(ENCRYPTION_KEY_FILE, 'utf8').trim();
  } catch (error) {
    throw new Error(`Failed to load encryption key: ${error.message}`);
  }
}

/**
 * Replace template variables in URL
 * E.g., https://{{SAP_HOST}}:{{PORT}}/... → https://10.204.34.80:44300/...
 */
function replaceTemplateVariables(str, credentials) {
  if (!str) return str;
  
  const baseUrlParts = credentials.baseUrl.match(/^(https?):\/\/([^:]+):(\d+)/);
  
  if (!baseUrlParts) {
    throw new Error(`Invalid base URL format: ${credentials.baseUrl}`);
  }
  
  const [, protocol, host, port] = baseUrlParts;
  
  return str
    .replace(/\{\{SAP_HOST\}\}/g, host)
    .replace(/\{\{PORT\}\}/g, port)
    .replace(/\{\{PROTOCOL\}\}/g, protocol)
    .replace(/\{\{CLIENT\}\}/g, credentials.client);
}

/**
 * Execute an encrypted HTTP call specification
 * 
 * @param {Object} secureRequest - Encrypted request from MCP
 * @returns {Object} HTTP response from S/4 HANA
 */
async function executeSecureCall(secureRequest) {
  try {
    // Load encryption key
    const encryptionKey = loadEncryptionKey();
    
    // Decrypt and verify (includes signature check and timestamp validation)
    console.log('[LOCAL AGENT] Decrypting and verifying request...');
    const callSpec = secureDecrypt(secureRequest, encryptionKey, {
      maxAgeSeconds: 60,
      checkTimestamp: true,
      checkSignature: true
    });
    
    console.log(`[LOCAL AGENT] Verified request: ${callSpec.method} ${callSpec.url}`);
    
    // Load local credentials (NEVER from MCP!)
    const credentials = loadLocalCredentials();
    
    // Replace template variables in URL
    const url = replaceTemplateVariables(callSpec.url, credentials);
    
    // Replace template variables in headers
    const headers = {};
    for (const [key, value] of Object.entries(callSpec.headers || {})) {
      headers[key] = replaceTemplateVariables(value, credentials);
    }
    
    // Add Authorization header with local credentials
    const authString = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
    headers['Authorization'] = `Basic ${authString}`;
    
    // Add sap-client header if not present
    if (!headers['sap-client']) {
      headers['sap-client'] = credentials.client;
    }
    
    console.log(`[LOCAL AGENT] Executing: ${callSpec.method} ${url}`);
    
    // Execute HTTP call to S/4 HANA
    const response = await axios({
      method: callSpec.method,
      url: url,
      headers: headers,
      data: callSpec.body,
      timeout: 300000, // 5 minutes
      httpsAgent: new https.Agent({
        rejectUnauthorized: credentials.rejectUnauthorized,
        keepAlive: true
      }),
      validateStatus: null // Don't throw on any status code
    });
    
    console.log(`[LOCAL AGENT] Response: ${response.status} ${response.statusText}`);
    
    // Return response (without credentials!)
    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    };
    
  } catch (error) {
    console.error('[LOCAL AGENT] Error:', error.message);
    
    // Return error (without exposing credentials)
    return {
      error: true,
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText
    };
  }
}

/**
 * MCP Tool Interface
 * This is called by the MCP server when Cursor makes a tool request
 */
async function handleToolCall(toolName, args) {
  if (toolName === 'execute_sap_call') {
    return await executeSecureCall(args);
  } else {
    throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Export functions
module.exports = {
  executeSecureCall,
  handleToolCall,
  loadLocalCredentials,
  loadEncryptionKey
};

// CLI mode for testing
if (require.main === module) {
  console.log('🚀 Local Agent - Test Mode\n');
  
  // Check if we have an encrypted request as argument
  if (process.argv.length > 2) {
    const encryptedRequestFile = process.argv[2];
    
    console.log(`Reading encrypted request from: ${encryptedRequestFile}`);
    
    const secureRequest = JSON.parse(fs.readFileSync(encryptedRequestFile, 'utf8'));
    
    executeSecureCall(secureRequest)
      .then(response => {
        console.log('\n✅ Response:', JSON.stringify(response, null, 2));
      })
      .catch(error => {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
      });
  } else {
    console.log('Usage: node local-agent.js <encrypted-request.json>');
    console.log('\nThis agent executes encrypted HTTP call specifications from the MCP.');
    console.log('It adds local SAP credentials and executes the call to S/4 HANA.');
    console.log('\n✅ Credentials stay local (never sent to MCP)');
    console.log('✅ Request signature verified (tamper-proof)');
    console.log('✅ Timestamp validated (replay-proof)');
  }
}
