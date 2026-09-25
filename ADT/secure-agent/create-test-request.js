/**
 * Create a fresh encrypted test request
 * This simulates what the MCP server would send
 */

const fs = require('fs');
const path = require('path');
const { secureEncrypt } = require('./encryption');

// Load encryption key
const keyFile = path.join(__dirname, 'agent.key');
if (!fs.existsSync(keyFile)) {
  console.error('❌ Encryption key not found. Run: node setup.js');
  process.exit(1);
}

const encryptionKey = fs.readFileSync(keyFile, 'utf8').trim();

// Create a test HTTP call spec (this is what MCP would generate)
const callSpec = {
  method: 'GET',
  url: 'https://{{SAP_HOST}}:{{PORT}}/sap/bc/adt/repository/nodestructure',
  headers: {
    'Accept': 'application/xml',
    'sap-client': '{{CLIENT}}'
  },
  params: {
    parent_name: 'DEVC/K',
    parent_tech_name: 'DEVC/K',
    withShortDescriptions: 'true'
  }
};

// Add query params to URL
const queryString = Object.entries(callSpec.params || {})
  .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
  .join('&');

if (queryString) {
  callSpec.url += '?' + queryString;
}
delete callSpec.params;

console.log('🔐 Creating Fresh Encrypted Request\n');
console.log('Original Call Spec:');
console.log(JSON.stringify(callSpec, null, 2));
console.log();

// Encrypt it (this is what MCP does)
const encryptedRequest = secureEncrypt(callSpec, encryptionKey);

console.log('Encrypted Request:');
console.log(JSON.stringify(encryptedRequest, null, 2));
console.log();

// Save to file
const outputFile = path.join(__dirname, 'test-request.json');
fs.writeFileSync(outputFile, JSON.stringify(encryptedRequest, null, 2), 'utf8');

console.log(`✅ Saved to: ${outputFile}`);
console.log('\n📋 Next step: Test with local agent:');
console.log('   node local-agent.js test-request.json\n');
