#!/usr/bin/env node

/**
 * Test BTP Connection with Extracted Cookies
 * 
 * This script tests if your extracted Eclipse cookies work
 * for authenticating with the BTP system.
 */

import axios from 'axios';
import https from 'https';
import { XMLParser } from 'fast-xml-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BTP_CONFIG = {
  baseUrl: 'https://72bf6203-9328-4888-af10-ea65eeb72d78.abap.eu10.hana.ondemand.com',
  client: '100',
  language: 'EN'
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true
});

async function loadCookies() {
  const cookiesFilePath = path.join(__dirname, 'btp_cookies.json');
  
  if (!fs.existsSync(cookiesFilePath)) {
    console.error('❌ ERROR: btp_cookies.json not found!');
    console.error('\nPlease run: node extract_eclipse_cookies.js');
    console.error('And follow the instructions to create btp_cookies.json\n');
    process.exit(1);
  }
  
  try {
    const cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf8'));
    
    if (!cookiesData.cookies || !Array.isArray(cookiesData.cookies)) {
      console.error('❌ ERROR: Invalid btp_cookies.json format!');
      console.error('\nExpected format:');
      console.error(JSON.stringify({
        "cookies": [
          "sap-usercontext=sap-language=EN&sap-client=100",
          "SAP_SESSIONID_H01_100=your-session-id-here"
        ]
      }, null, 2));
      console.error('');
      process.exit(1);
    }
    
    return cookiesData.cookies.join('; ');
  } catch (error) {
    console.error('❌ ERROR: Failed to parse btp_cookies.json:', error.message);
    console.error('\nPlease check the JSON format.\n');
    process.exit(1);
  }
}

async function testBtpConnectionWithCookies() {
  console.log('🔍 Testing BTP Connection with Extracted Cookies...\n');
  console.log('Configuration:');
  console.log(`  Base URL: ${BTP_CONFIG.baseUrl}`);
  console.log(`  Client: ${BTP_CONFIG.client}`);
  console.log(`  Language: ${BTP_CONFIG.language}\n`);

  try {
    // Load cookies
    console.log('📋 Loading cookies from btp_cookies.json...');
    const cookies = await loadCookies();
    console.log(`✅ Loaded ${cookies.split(';').length} cookie(s)\n`);
    
    // Show cookie preview (first 50 chars of each)
    console.log('Cookie preview:');
    cookies.split(';').forEach((cookie, index) => {
      const trimmedCookie = cookie.trim();
      const preview = trimmedCookie.length > 60 
        ? trimmedCookie.substring(0, 60) + '...'
        : trimmedCookie;
      console.log(`  ${index + 1}. ${preview}`);
    });
    console.log('');

    // Test 1: Get system information
    console.log('📡 Test 1: Getting system information...');
    
    const sysInfoResponse = await axios.get(`${BTP_CONFIG.baseUrl}/sap/bc/adt/core/http/systeminformation`, {
      headers: {
        'sap-client': BTP_CONFIG.client,
        'sap-language': BTP_CONFIG.language,
        'Accept': 'application/vnd.sap.adt.core.http.systeminformation.v1+json',
        'Cookie': cookies
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      timeout: 10000
    });

    console.log('✅ SUCCESS! System information retrieved!');
    console.log('   System ID:', sysInfoResponse.data.systemID);
    console.log('   User:', sysInfoResponse.data.userName);
    console.log('   Full Name:', sysInfoResponse.data.userFullName);
    console.log('   Client:', sysInfoResponse.data.client);
    console.log('   Language:', sysInfoResponse.data.language);

    // Test 2: Get ADT discovery
    console.log('\n📡 Test 2: Testing ADT discovery endpoint...');
    
    const discoveryResponse = await axios.get(`${BTP_CONFIG.baseUrl}/sap/bc/adt/discovery`, {
      headers: {
        'sap-client': BTP_CONFIG.client,
        'Accept': 'application/atomsvc+xml',
        'Cookie': cookies
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      timeout: 10000
    });

    console.log('✅ ADT discovery endpoint accessible!');
    console.log('   Status:', discoveryResponse.status);

    // Test 3: Get CSRF token
    console.log('\n📡 Test 3: Testing CSRF token fetch...');
    
    let csrfToken = null;
    try {
      const csrfResponse = await axios.get(`${BTP_CONFIG.baseUrl}/sap/bc/adt/repository/informationsystem/virtualfolders/contents`, {
        headers: {
          'sap-client': BTP_CONFIG.client,
          'X-CSRF-Token': 'Fetch',
          'Cookie': cookies
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        }),
        timeout: 10000
      });

      csrfToken = csrfResponse.headers['x-csrf-token'];
      console.log('✅ CSRF token obtained from successful response!');
      console.log('   Token:', csrfToken);

    } catch (error) {
      if (error.response && error.response.headers['x-csrf-token']) {
        csrfToken = error.response.headers['x-csrf-token'];
        console.log('✅ CSRF token obtained from error response (expected behavior)!');
        console.log('   Token:', csrfToken);
        console.log('   Error status:', error.response.status, '(this is normal for ADT)');
      } else {
        throw error;
      }
    }

    // Test 4: Try to list packages (read-only operation)
    console.log('\n📡 Test 4: Testing package listing (read operation)...');
    
    try {
      const packageResponse = await axios.get(`${BTP_CONFIG.baseUrl}/sap/bc/adt/repository/nodestructure`, {
        headers: {
          'sap-client': BTP_CONFIG.client,
          'Accept': 'application/vnd.sap.adt.repository.v1+xml',
          'Cookie': cookies
        },
        params: {
          parent_name: '$TMP',
          parent_tech_name: 'DEVC/K',
          parent_type: 'DEVC/K',
          withShortDescriptions: true
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        }),
        timeout: 10000
      });

      console.log('✅ Package listing successful!');
      console.log('   Status:', packageResponse.status);
      console.log('   Can read repository data: YES');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('⚠️  Package listing returned 404 (package may not exist)');
        console.log('   But authentication is working!');
      } else {
        throw error;
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUCCESS! Your cookies are working perfectly!');
    console.log('='.repeat(60));
    
    console.log('\n✅ What works:');
    console.log('   • Authentication via cookies');
    console.log('   • System information retrieval');
    console.log('   • ADT discovery endpoint');
    console.log('   • CSRF token fetching');
    console.log('   • Repository read operations');

    console.log('\n📝 Next steps:');
    console.log('   1. Update your Cursor MCP configuration');
    console.log('   2. Add the BTP cookies to the config');
    console.log('   3. Restart the MCP server');
    console.log('   4. Try reading/creating objects in BTP!\n');

    console.log('📋 See: ADT/BTP_COOKIE_CONFIGURATION.md for config instructions\n');

    return true;

  } catch (error) {
    console.error('\n❌ CONNECTION FAILED!\n');
    
    if (error.response) {
      console.error(`Error: HTTP ${error.response.status} ${error.response.statusText}`);
      
      if (error.response.status === 401) {
        console.error('\n⚠️  AUTHENTICATION FAILED');
        console.error('\nPossible reasons:');
        console.error('1. Cookies have expired (typical lifetime: 30 minutes)');
        console.error('2. Eclipse connection was closed');
        console.error('3. Wrong cookies were copied');
        console.error('4. Session was terminated on server side');
        
        console.error('\n💡 Solutions:');
        console.error('1. Make sure Eclipse is still connected to BTP');
        console.error('2. Extract fresh cookies from Eclipse');
        console.error('3. Update btp_cookies.json with new cookies');
        console.error('4. Run this test again\n');
        
      } else if (error.response.status === 403) {
        console.error('\n⚠️  FORBIDDEN');
        console.error('\nYour cookies are valid but you don\'t have permission.');
        console.error('Check your user permissions in BTP.\n');
        
      } else {
        console.error('\nResponse data:', error.response.data);
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Error: Connection refused');
      console.error('Solution: Check if the BTP URL is correct\n');
    } else {
      console.error('Error:', error.message);
    }
    
    console.error('\n📋 Debug checklist:');
    console.error('   □ Eclipse ADT is connected to BTP');
    console.error('   □ You can open/edit objects in Eclipse');
    console.error('   □ Cookies were extracted from the SAME Eclipse session');
    console.error('   □ btp_cookies.json format is correct');
    console.error('   □ Less than 30 minutes since cookie extraction\n');
    
    return false;
  }
}

// Run the test
testBtpConnectionWithCookies();


