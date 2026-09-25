/**
 * Simple test - HTTP call WITHOUT encryption
 * Just to verify the basic HTTP execution works
 */

const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load SAP config
const configFile = path.join(__dirname, '../sap_systems.json');
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

// Use DEV system with HOSTNAME (not IP)
const systemConfig = config.systems.DEV;

console.log('🧪 Simple HTTP Call Test (No Encryption)\n');
console.log('═══════════════════════════════════════\n');
console.log('Target System: DEV');
console.log(`Base URL: ${systemConfig.baseUrl}`);
console.log(`Username: ${systemConfig.username}`);
console.log(`Client: ${systemConfig.client}\n`);

// Test call spec
const callSpec = {
  method: 'GET',
  url: `${systemConfig.baseUrl}/sap/bc/adt/repository/informationsystem/search`,
  params: {
    operation: 'quickSearch',
    query: 'ZCL_TEST',
    maxResults: 10
  }
};

console.log('📞 Making HTTP call...');
console.log(`${callSpec.method} ${callSpec.url}`);
console.log(`Params: ${JSON.stringify(callSpec.params)}\n`);

// Add authentication
const auth = Buffer.from(`${systemConfig.username}:${systemConfig.password}`).toString('base64');

axios({
  method: callSpec.method,
  url: callSpec.url,
  params: callSpec.params,
  headers: {
    'Authorization': `Basic ${auth}`,
    'Accept': 'application/xml',
    'sap-client': systemConfig.client
  },
  timeout: 30000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false, // For dev/test only
    keepAlive: true
  })
})
.then(response => {
  console.log('✅ SUCCESS!\n');
  console.log(`Status: ${response.status} ${response.statusText}`);
  console.log(`Content-Type: ${response.headers['content-type']}`);
  console.log(`Content-Length: ${response.data.length} bytes\n`);
  
  // Show first 500 characters of response
  const preview = String(response.data).substring(0, 500);
  console.log('Response Preview:');
  console.log('─────────────────');
  console.log(preview);
  if (response.data.length > 500) {
    console.log('... (truncated)');
  }
  console.log('─────────────────\n');
  
  console.log('🎉 Basic HTTP calling works!');
  console.log('✅ Ready to add encryption layer next.\n');
})
.catch(error => {
  console.log('❌ FAILED!\n');
  
  if (error.response) {
    console.log(`Status: ${error.response.status} ${error.response.statusText}`);
    console.log(`Message: ${error.response.data}`);
  } else if (error.request) {
    console.log('Error: No response received');
    console.log(`Details: ${error.message}`);
  } else {
    console.log(`Error: ${error.message}`);
  }
  
  console.log('\n💡 Troubleshooting:');
  console.log('   - Check VPN connection');
  console.log('   - Verify SAP credentials in sap_systems.json');
  console.log('   - Try accessing SAP GUI to verify credentials\n');
  
  process.exit(1);
});
