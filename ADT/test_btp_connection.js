#!/usr/bin/env node

/**
 * Test BTP Connection Script
 * 
 * This script tests connection to SAP BTP ABAP Environment
 * using the same flow as Eclipse ADT
 */

import axios from 'axios';
import https from 'https';
import { XMLParser } from 'fast-xml-parser';

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

async function testBtpConnection() {
  console.log('🔍 Testing SAP BTP ABAP Environment connection...\n');
  console.log('Configuration:');
  console.log(`  Base URL: ${BTP_CONFIG.baseUrl}`);
  console.log(`  Client: ${BTP_CONFIG.client}`);
  console.log(`  Language: ${BTP_CONFIG.language}\n`);

  try {
    // Step 1: Check if virtual host is accessible
    console.log('📡 Step 1: Checking virtual host...');
    try {
      const vhostResponse = await axios.get(`${BTP_CONFIG.baseUrl}/sap/public/bc/icf/virtualhost`, {
        headers: {
          'Accept': 'application/json'
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        }),
        timeout: 10000
      });

      if (vhostResponse.status === 200) {
        console.log('✅ Virtual host accessible');
        console.log('   Response:', JSON.stringify(vhostResponse.data, null, 2));
      }
    } catch (error) {
      console.log('⚠️  Virtual host check failed (this is OK if authentication is required)');
      console.log('   Status:', error.response?.status);
    }

    // Step 2: Create ADT session
    console.log('\n📡 Step 2: Creating ADT session...');
    
    const sessionResponse = await axios.get(`${BTP_CONFIG.baseUrl}/sap/bc/adt/core/http/sessions`, {
      headers: {
        'sap-client': BTP_CONFIG.client,
        'sap-language': BTP_CONFIG.language,
        'x-sap-security-session': 'create',
        'sap-adt-purpose': 'logon',
        'Accept': 'application/vnd.sap.adt.core.http.session.v3+xml, application/vnd.sap.adt.core.http.session.v2+xml, application/vnd.sap.adt.core.http.session.v1+xml'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      timeout: 10000
    });

    console.log('✅ ADT session created successfully!');
    console.log('   Status:', sessionResponse.status);
    console.log('   Content-Type:', sessionResponse.headers['content-type']);
    
    // Parse session XML
    const sessionXml = xmlParser.parse(sessionResponse.data);
    console.log('\n   Session XML parsed:');
    console.log('   ', JSON.stringify(sessionXml, null, 2));
    
    // Extract security session link
    const sessionLink = sessionXml['http:session']?.['atom:link']?.find(
      link => link['@_rel'] === 'http://www.sap.com/adt/categories/core/http/sessions/securitysession'
    );
    
    if (sessionLink) {
      console.log('\n   Security session link:', sessionLink['@_href']);
    }

    // Extract cookies
    const cookies = sessionResponse.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ');
    console.log('\n   Cookies set:', cookies ? 'Yes' : 'No');

    // Step 3: Get system information
    console.log('\n📡 Step 3: Getting system information...');
    
    const sysInfoResponse = await axios.get(`${BTP_CONFIG.baseUrl}/sap/bc/adt/core/http/systeminformation`, {
      headers: {
        'sap-client': BTP_CONFIG.client,
        'Accept': 'application/vnd.sap.adt.core.http.systeminformation.v1+json',
        'x-sap-security-session': 'use',
        'Cookie': cookies
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      timeout: 10000
    });

    console.log('✅ System information retrieved!');
    console.log('   System ID:', sysInfoResponse.data.systemID);
    console.log('   User:', sysInfoResponse.data.userName);
    console.log('   Full Name:', sysInfoResponse.data.userFullName);
    console.log('   Client:', sysInfoResponse.data.client);
    console.log('   Language:', sysInfoResponse.data.language);

    // Step 4: Test ADT discovery
    console.log('\n📡 Step 4: Testing ADT discovery endpoint...');
    
    const discoveryResponse = await axios.get(`${BTP_CONFIG.baseUrl}/sap/bc/adt/discovery`, {
      headers: {
        'sap-client': BTP_CONFIG.client,
        'Accept': 'application/atomsvc+xml',
        'x-sap-security-session': 'use',
        'Cookie': cookies
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      timeout: 10000
    });

    console.log('✅ ADT discovery endpoint accessible!');
    console.log('   Status:', discoveryResponse.status);

    // Step 5: Test CSRF token fetch
    console.log('\n📡 Step 5: Testing CSRF token fetch...');
    
    try {
      const csrfResponse = await axios.get(`${BTP_CONFIG.baseUrl}/sap/bc/adt/repository/informationsystem/virtualfolders/contents`, {
        headers: {
          'sap-client': BTP_CONFIG.client,
          'X-CSRF-Token': 'Fetch',
          'x-sap-security-session': 'use',
          'Cookie': cookies
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        }),
        timeout: 10000
      });

      const csrfToken = csrfResponse.headers['x-csrf-token'];
      console.log('✅ CSRF token obtained from successful response!');
      console.log('   Token:', csrfToken);

    } catch (error) {
      // CSRF token might be in error response (this is normal for ADT)
      if (error.response && error.response.headers['x-csrf-token']) {
        const csrfToken = error.response.headers['x-csrf-token'];
        console.log('✅ CSRF token obtained from error response (expected behavior)!');
        console.log('   Token:', csrfToken);
        console.log('   Error status:', error.response.status);
      } else {
        throw error;
      }
    }

    // Final summary
    console.log('\n🎉 SUCCESS! BTP connection is fully working!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update your Cursor MCP configuration with BTP settings');
    console.log('   2. Use the abap-adt-btp server to interact with your BTP system');
    console.log('   3. Check ADT/BTP_AUTHENTICATION_GUIDE.md for detailed instructions');

    return true;

  } catch (error) {
    console.error('\n❌ CONNECTION FAILED!\n');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('Error: Connection refused');
      console.error('Solution: Check if the BTP URL is correct and accessible');
    } else if (error.code === 'ENOTFOUND') {
      console.error('Error: Host not found');
      console.error('Solution: Check if the BTP URL is correct');
    } else if (error.response) {
      console.error(`Error: HTTP ${error.response.status} ${error.response.statusText}`);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', error.response.data);
      
      if (error.response.status === 401) {
        console.error('\nSolution: BTP requires browser-based authentication');
        console.error('1. Open Eclipse ADT');
        console.error('2. Connect to your BTP system');
        console.error('3. Complete the browser authentication');
        console.error('4. Then the MCP server can reuse the session');
      } else if (error.response.status === 403) {
        console.error('\nSolution: Check if your user has ADT access permissions in BTP');
      }
    } else {
      console.error('Error:', error.message);
    }
    
    console.error('\n💡 Troubleshooting:');
    console.error('   - Verify the BTP URL is correct');
    console.error('   - Check if you can access the URL in a browser');
    console.error('   - Ensure you have ADT access in the BTP system');
    console.error('   - Try connecting with Eclipse ADT first');
    
    return false;
  }
}

// Run the test
testBtpConnection();


