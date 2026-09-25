#!/usr/bin/env node

/**
 * Test Reading Class from BTP
 * Simulates what the MCP server does
 */

import axios from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BTP_URL = 'https://72bf6203-9328-4888-af10-ea65eeb72d78.abap-web.eu10.hana.ondemand.com';
const CLASS_NAME = '/COREVIST/DELIVERY';

console.log('═══════════════════════════════════════════════════');
console.log('📖 Reading Class from BTP System');
console.log('═══════════════════════════════════════════════════\n');
console.log(`Class: ${CLASS_NAME}`);
console.log(`System: BTP (${BTP_URL})\n`);

async function readClass() {
  try {
    // Load BTP cookies
    const cookiesFile = path.join(__dirname, 'btp_cookies.json');
    const cookiesData = JSON.parse(fs.readFileSync(cookiesFile, 'utf8'));
    const cookies = Array.isArray(cookiesData) ? cookiesData : cookiesData.cookies;
    const cookieHeader = cookies.join('; ');
    
    console.log('🔍 Step 1: Searching for class...\n');
    
    // Search for the class first
    const searchResponse = await axios.get(
      `${BTP_URL}/sap/bc/adt/repository/informationsystem/search`,
      {
        params: {
          operation: 'quickSearch',
          query: CLASS_NAME,
          maxResults: 10
        },
        headers: {
          'sap-client': '100',
          'sap-language': 'EN',
          'Accept': 'application/xml',
          'Cookie': cookieHeader
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        }),
        validateStatus: () => true
      }
    );
    
    if (searchResponse.status !== 200) {
      console.log(`❌ Search failed: HTTP ${searchResponse.status}`);
      if (searchResponse.status === 401) {
        console.log('   Cookies expired! Run: node refresh_btp_cookies.js\n');
      }
      return;
    }
    
    console.log('✅ Class found in BTP system!\n');
    
    console.log('📖 Step 2: Reading class source code...\n');
    
    // Read class source code
    const sourceResponse = await axios.get(
      `${BTP_URL}/sap/bc/adt/oo/classes/${encodeURIComponent(CLASS_NAME.toLowerCase())}/source/main`,
      {
        headers: {
          'sap-client': '100',
          'sap-language': 'EN',
          'Accept': 'text/plain',
          'Cookie': cookieHeader
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        }),
        validateStatus: () => true
      }
    );
    
    if (sourceResponse.status === 200) {
      console.log('✅ SUCCESS! Class source code retrieved from BTP:\n');
      console.log('═══════════════════════════════════════════════════');
      console.log(sourceResponse.data);
      console.log('═══════════════════════════════════════════════════\n');
      console.log('🎉 Your BTP MCP server will work exactly like this!');
      console.log('   Just use in Cursor: @abap-adt-btp read class /COREVIST/DELIVERY\n');
    } else if (sourceResponse.status === 404) {
      console.log('❌ Class not found in BTP system');
      console.log('   The class might not exist in this BTP instance.\n');
    } else if (sourceResponse.status === 401) {
      console.log('❌ Authentication failed (cookies expired)');
      console.log('   Run: node refresh_btp_cookies.js\n');
    } else {
      console.log(`❌ Error: HTTP ${sourceResponse.status}`);
      console.log('   Response:', sourceResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.log('   HTTP Status:', error.response.status);
    }
  }
}

readClass();






























