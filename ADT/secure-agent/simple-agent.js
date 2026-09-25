/**
 * Simplified Local Agent (NO ENCRYPTION - for testing)
 * 
 * Purpose: Execute HTTP call specifications from MCP
 * This version skips encryption to test the core functionality first
 */

import axios from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, '../sap_systems.json');
const CURRENT_SYSTEM_FILE = path.join(__dirname, '../current_system.json');

/**
 * Load local SAP credentials
 */
function loadCredentials() {
  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  
  // Get current system
  let currentSystem = 'DEV';
  if (fs.existsSync(CURRENT_SYSTEM_FILE)) {
    const currentSystemData = JSON.parse(fs.readFileSync(CURRENT_SYSTEM_FILE, 'utf8'));
    currentSystem = currentSystemData.activeSystem || currentSystemData.system || 'DEV';
  }
  
  // Skip BTP for now
  if (currentSystem === 'BTP') {
    currentSystem = 'DEV';
  }
  
  const systemConfig = config.systems[currentSystem];
  
  return {
    system: currentSystem,
    baseUrl: systemConfig.baseUrl,
    username: systemConfig.username,
    password: systemConfig.password,
    client: systemConfig.client,
    rejectUnauthorized: systemConfig.rejectUnauthorized !== false
  };
}

/**
 * Replace template variables in strings
 */
function replaceVars(str, credentials) {
  if (!str) return str;
  
  // Convert to string if not already
  const strValue = String(str);
  
  const match = credentials.baseUrl.match(/^(https?):\/\/([^:]+):(\d+)/);
  if (!match) return strValue;
  
  const [, protocol, host, port] = match;
  
  return strValue
    .replace(/\{\{SAP_HOST\}\}/g, host)
    .replace(/\{\{PORT\}\}/g, port)
    .replace(/\{\{PROTOCOL\}\}/g, protocol)
    .replace(/\{\{CLIENT\}\}/g, credentials.client);
}

/**
 * Execute a call specification
 */
async function executeCall(callSpec) {
  try {
    const credentials = loadCredentials();
    
    console.error(`\n[SIMPLE AGENT] System: ${credentials.system}`);
    console.error(`[SIMPLE AGENT] Base URL: ${credentials.baseUrl}`);
    console.error(`[SIMPLE AGENT] Client: ${credentials.client}`);
    console.error(`[SIMPLE AGENT] Executing: ${callSpec.method} ${callSpec.url}\n`);
    
    // Replace template variables
    const url = replaceVars(callSpec.url, credentials);
    const headers = {};
    for (const [key, value] of Object.entries(callSpec.headers || {})) {
      headers[key] = replaceVars(value, credentials);
    }
    
    // Add authentication
    const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
    headers['Authorization'] = `Basic ${auth}`;
    
    // Add client if not present
    if (!headers['sap-client']) {
      headers['sap-client'] = credentials.client;
    }
    
    // Execute
    const response = await axios({
      method: callSpec.method,
      url: url,
      headers: headers,
      data: callSpec.body,
      params: callSpec.params,
      timeout: 300000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        keepAlive: true
      }),
      validateStatus: null // Don't throw on any status
    });
    
    console.error(`[SIMPLE AGENT] Response: ${response.status} ${response.statusText}`);
    
    // Log error details for non-2xx responses
    if (response.status >= 400) {
      console.error(`[SIMPLE AGENT] ERROR RESPONSE: ${response.status}`);
      console.error(`[SIMPLE AGENT] ERROR DATA: ${JSON.stringify(response.data).substring(0, 500)}`);
    }
    console.error('');
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    };
    
  } catch (error) {
    console.error(`[SIMPLE AGENT] Error: ${error.message}`);
    console.error(`[SIMPLE AGENT] Error code: ${error.code}`);
    if (error.response) {
      console.error(`[SIMPLE AGENT] Error response status: ${error.response.status}`);
      console.error(`[SIMPLE AGENT] Error response data: ${JSON.stringify(error.response.data).substring(0, 500)}`);
    }
    console.error('');
    
    return {
      error: true,
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    };
  }
}

// Export
export { executeCall };

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.length < 3) {
    console.log('Simple Agent - Test Mode (No Encryption)\n');
    console.log('Usage: node simple-agent.js <call-spec.json>\n');
    console.log('Example call-spec.json:');
    console.log(JSON.stringify({
      method: 'GET',
      url: 'https://{{SAP_HOST}}:{{PORT}}/sap/bc/adt/repository/informationsystem/search',
      params: {
        operation: 'quickSearch',
        query: 'ZCL_TEST',
        maxResults: 10
      },
      headers: {
        'Accept': 'application/xml'
      }
    }, null, 2));
    process.exit(0);
  }
  
  const callSpecFile = process.argv[2];
  const callSpec = JSON.parse(fs.readFileSync(callSpecFile, 'utf8'));
  
  executeCall(callSpec)
    .then(response => {
      console.log('✅ Response:');
      console.log(JSON.stringify(response, null, 2));
      
      if (response.error) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Fatal error:', error.message);
      process.exit(1);
    });
}
