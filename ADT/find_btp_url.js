/**
 * Interactive BTP URL Finder
 * 
 * This script helps you test different URL formats to find the correct one.
 */

import axios from 'axios';
import https from 'https';

console.log('═══════════════════════════════════════════════════');
console.log('🔍 BTP ABAP System URL Finder');
console.log('═══════════════════════════════════════════════════\n');

console.log('Let\'s find your correct BTP ABAP system URL!\n');

console.log('📋 Common URL patterns for BTP ABAP:\n');
console.log('1. https://[guid].abap.eu10.hana.ondemand.com');
console.log('2. https://[guid].abap.us10.hana.ondemand.com');
console.log('3. https://[guid].abap.eu20.hana.ondemand.com');
console.log('4. https://[custom-subdomain].abap.eu10.hana.ondemand.com\n');

console.log('═══════════════════════════════════════════════════');
console.log('📖 HOW TO FIND YOUR URL:');
console.log('═══════════════════════════════════════════════════\n');

console.log('🔧 Method 1: From Eclipse ADT');
console.log('   1. Open Eclipse');
console.log('   2. Find your BTP project in Project Explorer');
console.log('   3. Right-click → Properties');
console.log('   4. Look for "Service URL" or "System URL"\n');

console.log('🌐 Method 2: From BTP Cockpit');
console.log('   1. Go to https://cockpit.btp.cloud.sap/');
console.log('   2. Open your Subaccount');
console.log('   3. Services → Instances and Subscriptions');
console.log('   4. Find your ABAP Environment instance');
console.log('   5. Copy the API Endpoint\n');

console.log('🔐 Method 3: From Eclipse Login Flow');
console.log('   1. When Eclipse asks you to login');
console.log('   2. Copy the URL from the popup');
console.log('   3. The system URL is in that login URL\n');

console.log('═══════════════════════════════════════════════════\n');

// Test function
async function testUrl(url) {
  console.log(`\n🧪 Testing: ${url}`);
  
  try {
    const response = await axios.get(`${url}/sap/public/bc/abap/discovery`, {
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      timeout: 5000,
      validateStatus: () => true
    });
    
    if (response.status === 200 || response.status === 401 || response.status === 403) {
      console.log(`   ✅ System exists! (HTTP ${response.status})`);
      console.log(`   This is your correct URL: ${url}`);
      return true;
    } else if (response.status === 404) {
      console.log(`   ⚠️  System found but endpoint not available (HTTP 404)`);
      console.log(`   Try adding client: ${url}?sap-client=100`);
      return false;
    } else {
      console.log(`   ❌ Unexpected response: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.message.includes('ENOTFOUND')) {
      console.log('   ❌ System does not exist (DNS not found)');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('   ⏱️  Timeout - system might exist but not responding');
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
    return false;
  }
}

// Interactive prompts
console.log('💡 NEXT STEPS:');
console.log('═══════════════════════════════════════════════════\n');
console.log('1. Find your URL using one of the methods above');
console.log('2. Once you have the URL, test it by running:\n');
console.log('   node find_btp_url.js test <your-url>\n');
console.log('   Example:');
console.log('   node find_btp_url.js test https://abc123.abap.eu10.hana.ondemand.com\n');

// If URL provided as argument, test it
if (process.argv.length > 3 && process.argv[2] === 'test') {
  const urlToTest = process.argv[3];
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🧪 TESTING PROVIDED URL');
  console.log('═══════════════════════════════════════════════════');
  testUrl(urlToTest).then(success => {
    if (success) {
      console.log('\n✨ Perfect! This URL works!');
      console.log('\nUpdate your configuration:');
      console.log(`SAP_BASE_URL=${urlToTest}\n`);
    } else {
      console.log('\n❌ This URL doesn\'t work. Please verify and try again.\n');
    }
  });
}

