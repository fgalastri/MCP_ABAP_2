/**
 * Test MYSAPSSO2 Authentication
 * 
 * Uses the SSO2 token from the reentrance ticket flow
 */

import axios from 'axios';
import https from 'https';

const BTP_CONFIG = {
  apiUrl: 'https://72bf6203-9328-4888-af10-ea65eeb72d78.abap.eu10.hana.ondemand.com',
  webUrl: 'https://72bf6203-9328-4888-af10-ea65eeb72d78.abap-web.eu10.hana.ondemand.com',
  client: '100',
  language: 'EN'
};

// The MYSAPSSO2 token from your network trace
const MYSAPSSO2_TOKEN = '9XI/PheW4VxX/Feaa1TPND4n5Vw=';

console.log('═══════════════════════════════════════════════════');
console.log('🧪 Testing MYSAPSSO2 Authentication');
console.log('═══════════════════════════════════════════════════\n');

async function testWithSSO2() {
  try {
    console.log('📡 Test 1: Using MYSAPSSO2 token with API endpoint\n');
    
    const response = await axios.get(`${BTP_CONFIG.apiUrl}/sap/bc/adt/discovery`, {
      headers: {
        'sap-client': BTP_CONFIG.client,
        'sap-language': BTP_CONFIG.language,
        'Accept': 'application/atomsvc+xml',
        'Cookie': `MYSAPSSO2=${MYSAPSSO2_TOKEN}`
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      validateStatus: () => true
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers:`, response.headers);
    
    if (response.status === 200) {
      console.log('\n✅ SUCCESS! MYSAPSSO2 works!\n');
      
      // Check if we got new cookies
      if (response.headers['set-cookie']) {
        const cookies = response.headers['set-cookie'];
        console.log('📝 Received cookies:');
        cookies.forEach(c => console.log(`   - ${c.split(';')[0]}`));
      }
    } else if (response.status === 401) {
      console.log('\n❌ MYSAPSSO2 token expired or invalid\n');
      console.log('💡 You need to login again and get a fresh token\n');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testCreateSession() {
  try {
    console.log('\n📡 Test 2: Create ADT session with MYSAPSSO2\n');
    
    const response = await axios.get(`${BTP_CONFIG.apiUrl}/sap/bc/adt/core/http/sessions`, {
      headers: {
        'sap-client': BTP_CONFIG.client,
        'sap-language': BTP_CONFIG.language,
        'Accept': 'application/vnd.sap.adt.core.http.session.v3+xml',
        'x-sap-security-session': 'create',
        'Cookie': `MYSAPSSO2=${MYSAPSSO2_TOKEN}`
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      validateStatus: () => true
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 200 || response.status === 201) {
      console.log('\n✅ SESSION CREATED!\n');
      
      if (response.headers['set-cookie']) {
        const cookies = response.headers['set-cookie'].map(c => c.split(';')[0]);
        console.log('📝 Session cookies:');
        cookies.forEach(c => console.log(`   - ${c}`));
        
        console.log('\n💾 Save these to btp_cookies.json:\n');
        console.log(JSON.stringify(cookies, null, 2));
      }
    } else {
      console.log(`\n❌ Failed to create session`);
      console.log('Response:', response.data);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run tests
(async () => {
  await testWithSSO2();
  await testCreateSession();
  
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🎯 NEXT STEPS:');
  console.log('═══════════════════════════════════════════════════\n');
  console.log('If the tests failed (401), the token expired.');
  console.log('You need to capture a FRESH token:\n');
  console.log('1. Open browser Developer Tools (F12) → Network tab');
  console.log('2. Navigate to the Eclipse login URL again');
  console.log('3. Complete the login flow');
  console.log('4. Find the /reentranceticket request');
  console.log('5. Copy the "expect-mysapsso2" response header value');
  console.log('6. That\'s your new MYSAPSSO2 token!\n');
})();

