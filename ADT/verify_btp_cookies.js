/**
 * Verify BTP Cookies Test Script
 * 
 * This script tests if the cookies in btp_cookies.json are valid
 * and can access the BTP ADT API successfully.
 */

import axios from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// BTP Configuration
const BTP_CONFIG = {
  apiUrl: 'https://72bf6203-9328-4888-af10-ea65eeb72d78.abap-web.eu10.hana.ondemand.com',
  client: '100',
  language: 'EN'
};

// Load cookies from btp_cookies.json
function loadCookies() {
  try {
    const cookiesPath = path.join(__dirname, 'btp_cookies.json');
    const cookiesData = fs.readFileSync(cookiesPath, 'utf8');
    const cookies = JSON.parse(cookiesData);
    
    if (!Array.isArray(cookies)) {
      throw new Error('Cookies must be an array of strings');
    }
    
    console.log('✅ Loaded cookies from btp_cookies.json');
    console.log(`📝 Found ${cookies.length} cookie(s):\n`);
    cookies.forEach((cookie, i) => {
      const cookieName = cookie.split('=')[0];
      console.log(`   ${i + 1}. ${cookieName}`);
    });
    console.log();
    
    return cookies.join('; ');
  } catch (error) {
    console.error('❌ Error loading cookies:', error.message);
    console.error('\n💡 Make sure btp_cookies.json exists and contains an array of cookie strings.');
    process.exit(1);
  }
}

// Test the ADT API with cookies
async function testAdtApi(cookieHeader) {
  console.log('🔍 Testing BTP ADT API...\n');
  
  try {
    // Test 1: ADT Discovery
    console.log('📡 Test 1: ADT Discovery Endpoint');
    const discoveryResponse = await axios.get(`${BTP_CONFIG.apiUrl}/sap/bc/adt/discovery`, {
      headers: {
        'sap-client': BTP_CONFIG.client,
        'sap-language': BTP_CONFIG.language,
        'Accept': 'application/atomsvc+xml',
        'Cookie': cookieHeader
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      validateStatus: () => true
    });
    
    console.log(`   Status: ${discoveryResponse.status} ${discoveryResponse.statusText}`);
    
    if (discoveryResponse.status === 200) {
      console.log('   ✅ SUCCESS! Cookies are valid!\n');
      
      // Test 2: Repository Information
      console.log('📡 Test 2: Repository Information');
      const repoResponse = await axios.get(`${BTP_CONFIG.apiUrl}/sap/bc/adt/repository/informationsystem/search`, {
        headers: {
          'sap-client': BTP_CONFIG.client,
          'sap-language': BTP_CONFIG.language,
          'Accept': 'application/xml',
          'Cookie': cookieHeader
        },
        params: {
          operation: 'quickSearch',
          query: 'ZCL*',
          maxResults: 1
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        }),
        validateStatus: () => true
      });
      
      console.log(`   Status: ${repoResponse.status} ${repoResponse.statusText}`);
      if (repoResponse.status === 200) {
        console.log('   ✅ SUCCESS! Can access repository!\n');
      } else {
        console.log('   ⚠️  Repository access limited\n');
      }
      
      console.log('═══════════════════════════════════════════════════');
      console.log('✨ GREAT NEWS! Your BTP cookies are working! ✨');
      console.log('═══════════════════════════════════════════════════');
      console.log('\n📋 Next Steps:');
      console.log('1. Update your Cursor MCP config (mcp.json)');
      console.log('2. Set SAP_AUTH_MODE=btp');
      console.log('3. Restart Cursor');
      console.log('4. Your MCP server will use these cookies automatically!\n');
      
    } else if (discoveryResponse.status === 401) {
      console.log('   ❌ UNAUTHORIZED - Cookies are invalid or expired\n');
      console.log('═══════════════════════════════════════════════════');
      console.log('❌ Authentication Failed');
      console.log('═══════════════════════════════════════════════════');
      console.log('\n🔧 What to do:');
      console.log('1. Login again in your browser');
      console.log('2. Capture fresh cookies from Developer Tools');
      console.log('3. Update btp_cookies.json');
      console.log('4. Run this script again\n');
      console.log('📖 See CAPTURE_BTP_COOKIES_BROWSER.md for detailed instructions\n');
      
    } else {
      console.log(`   ⚠️  Unexpected status code\n`);
      console.log('Response headers:', discoveryResponse.headers);
    }
    
  } catch (error) {
    console.error('❌ Error testing ADT API:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Headers:`, error.response.headers);
    }
  }
}

// Main execution
console.log('═══════════════════════════════════════════════════');
console.log('🧪 BTP Cookie Verification Test');
console.log('═══════════════════════════════════════════════════\n');

const cookieHeader = loadCookies();
testAdtApi(cookieHeader);

