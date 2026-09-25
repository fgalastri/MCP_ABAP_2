#!/usr/bin/env node

/**
 * BTP Cookie Refresh Script
 * 
 * This script helps you refresh expired BTP cookies quickly.
 * It guides you through capturing fresh cookies from your browser.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cookiesFile = path.join(__dirname, 'btp_cookies.json');

console.log('═══════════════════════════════════════════════════');
console.log('🔄 BTP Cookie Refresh Tool');
console.log('═══════════════════════════════════════════════════\n');

console.log('This tool will help you refresh your BTP session cookies.\n');
console.log('📋 Steps to follow:\n');
console.log('1. Open your browser (Chrome/Edge)');
console.log('2. Press F12 to open Developer Tools');
console.log('3. Go to Network tab');
console.log('4. Check "Preserve log" checkbox');
console.log('5. Navigate to this URL:\n');
console.log('   https://72bf6203-9328-4888-af10-ea65eeb72d78.abap-web.eu10.hana.ondemand.com/sap/bc/adt/core/http/reentranceticket?redirect-url=http%3A%2F%2Flocalhost%3A59717%2Fadt%2Fredirect&_=610448746566100\n');
console.log('6. Complete the BTP login (if needed)');
console.log('7. Wait for redirect to localhost\n');
console.log('8. In Network tab, find the request to: /sap/bc/adt/core/http/reentranceticket');
console.log('9. Click on that request\n');
console.log('═══════════════════════════════════════════════════\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('📝 Please provide the following values from that request:\n');
  
  // Get MYSAPSSO2 token
  console.log('1️⃣  In Response Headers, find: "expect-mysapsso2"');
  const mysapsso2 = await question('   Paste the value here: ');
  
  if (!mysapsso2 || mysapsso2.trim().length === 0) {
    console.log('\n❌ Error: MYSAPSSO2 token is required!');
    rl.close();
    process.exit(1);
  }
  
  // Get JSESSIONID
  console.log('\n2️⃣  In Request Headers, find: "cookie:" line');
  console.log('   Look for JSESSIONID=...');
  const jsessionid = await question('   Paste JSESSIONID value (just the value after =): ');
  
  if (!jsessionid || jsessionid.trim().length === 0) {
    console.log('\n❌ Error: JSESSIONID is required!');
    rl.close();
    process.exit(1);
  }
  
  // Get VCAP_ID
  console.log('\n3️⃣  In the same cookie line, find: __VCAP_ID__=...');
  const vcapId = await question('   Paste __VCAP_ID__ value (just the value after =): ');
  
  if (!vcapId || vcapId.trim().length === 0) {
    console.log('\n❌ Error: __VCAP_ID__ is required!');
    rl.close();
    process.exit(1);
  }
  
  rl.close();
  
  // Build cookies array
  const cookies = [
    `MYSAPSSO2=${mysapsso2.trim()}`,
    `JSESSIONID=${jsessionid.trim()}`,
    `__VCAP_ID__=${vcapId.trim()}`,
    'sap-usercontext=sap-client=100'
  ];
  
  // Save to file
  console.log('\n💾 Saving cookies to btp_cookies.json...');
  fs.writeFileSync(cookiesFile, JSON.stringify(cookies, null, 2));
  
  console.log('✅ Cookies saved successfully!\n');
  
  // Verify the cookies
  console.log('🧪 Verifying cookies...\n');
  
  try {
    const { default: axios } = await import('axios');
    const { default: https } = await import('https');
    
    const cookieHeader = cookies.join('; ');
    const response = await axios.get(
      'https://72bf6203-9328-4888-af10-ea65eeb72d78.abap-web.eu10.hana.ondemand.com/sap/bc/adt/discovery',
      {
        headers: {
          'sap-client': '100',
          'sap-language': 'EN',
          'Accept': 'application/atomsvc+xml',
          'Cookie': cookieHeader
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        }),
        validateStatus: () => true
      }
    );
    
    if (response.status === 200) {
      console.log('✅ SUCCESS! Cookies are valid and working!\n');
      console.log('═══════════════════════════════════════════════════');
      console.log('🎉 All Done!');
      console.log('═══════════════════════════════════════════════════\n');
      console.log('Your BTP MCP server will automatically use these new cookies.');
      console.log('No need to restart Cursor!\n');
      console.log('Try it now: @abap-adt-btp list classes starting with Z\n');
    } else {
      console.log(`⚠️  Warning: Got HTTP ${response.status}`);
      console.log('   The cookies might not be working correctly.');
      console.log('   Please try the process again with fresh cookies.\n');
    }
    
  } catch (error) {
    console.log('⚠️  Could not verify cookies (network error)');
    console.log(`   ${error.message}`);
    console.log('   Cookies were saved, but verification failed.');
    console.log('   Try using them anyway - they might work!\n');
  }
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  rl.close();
  process.exit(1);
});

