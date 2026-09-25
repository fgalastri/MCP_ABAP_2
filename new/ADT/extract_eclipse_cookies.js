#!/usr/bin/env node

/**
 * Extract Eclipse ADT Cookies for BTP Authentication
 * 
 * This script helps you extract session cookies from Eclipse ADT
 * so the MCP server can reuse your authenticated BTP session.
 * 
 * PREREQUISITE: You must be connected to BTP via Eclipse ADT first!
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Eclipse ADT Cookie Extractor for BTP Authentication\n');
console.log('=' .repeat(60));

// Instructions for manual cookie extraction
console.log('\n📋 STEP-BY-STEP INSTRUCTIONS:\n');

console.log('Since Eclipse stores cookies in memory/encrypted format,');
console.log('we need to capture them while Eclipse is running.\n');

console.log('METHOD 1: Using Browser Developer Tools (Easiest)\n');
console.log('1. Open Eclipse ADT');
console.log('2. Connect to your BTP system (if not already connected)');
console.log('3. In Eclipse, go to: Window → Show View → Other');
console.log('4. Search for "Internal Web Browser" and open it');
console.log('5. Navigate to your BTP system URL:');
console.log('   https://72bf6203-9328-4888-af10-ea65eeb72d78.abap.eu10.hana.ondemand.com');
console.log('6. Right-click → Inspect Element (or press F12)');
console.log('7. Go to: Application tab → Cookies');
console.log('8. Copy all cookie values\n');

console.log('METHOD 2: Using Eclipse Communication Log (Recommended)\n');
console.log('1. Open Eclipse ADT');
console.log('2. Go to: Window → Preferences');
console.log('3. Search for "Communication Log"');
console.log('4. Enable: "Record communication to local files"');
console.log('5. Set location (e.g., C:\\eclipse_logs)');
console.log('6. Click Apply and OK');
console.log('7. Connect to BTP or refresh an object');
console.log('8. Open the log file (latest .xml file)');
console.log('9. Search for "set-cookie" in the response headers');
console.log('10. Copy the cookie values\n');

console.log('METHOD 3: Using HTTP Proxy (Advanced)\n');
console.log('1. Set up a local HTTP proxy (e.g., Fiddler, Charles)');
console.log('2. Configure Eclipse to use the proxy:');
console.log('   Window → Preferences → Network Connections');
console.log('   Set HTTP/HTTPS proxy to: localhost:8888');
console.log('3. Connect to BTP via Eclipse');
console.log('4. In the proxy tool, find the /sap/bc/adt request');
console.log('5. Copy the Set-Cookie headers from the response\n');

console.log('=' .repeat(60));
console.log('\n📝 WHAT COOKIES TO LOOK FOR:\n');

const cookiesToFind = [
  'sap-usercontext',
  'SAP_SESSIONID_*', 
  'sap-contextid',
  'JSESSIONID',
  'MYSAPSSO2',
  'SAMLTrace'
];

cookiesToFind.forEach(cookie => {
  console.log(`   • ${cookie}`);
});

console.log('\n=' .repeat(60));
console.log('\n📋 EXAMPLE COOKIES:\n');

console.log('When you find the cookies, they will look like this:');
console.log('');
console.log('  sap-usercontext=sap-language=EN&sap-client=100; path=/');
console.log('  SAP_SESSIONID_H01_100=Xv4f8j2kL9mN6pQ3rT1wY5uZ7aB0cD2eF4g; path=/');
console.log('  sap-contextid=SID:ANON:H01_100:rTyU9iKlMnP2qWsX3vY8zA; path=/');
console.log('');

console.log('=' .repeat(60));
console.log('\n✏️  ONCE YOU HAVE THE COOKIES:\n');

console.log('1. Create or edit: ADT/btp_cookies.json');
console.log('2. Paste your cookies in this format:\n');

const exampleCookiesJson = {
  "cookies": [
    "sap-usercontext=sap-language=EN&sap-client=100",
    "SAP_SESSIONID_H01_100=Xv4f8j2kL9mN6pQ3rT1wY5uZ7aB0cD2eF4g",
    "sap-contextid=SID:ANON:H01_100:rTyU9iKlMnP2qWsX3vY8zA"
  ]
};

console.log(JSON.stringify(exampleCookiesJson, null, 2));

console.log('\n3. Save the file');
console.log('4. The MCP server will automatically load these cookies');
console.log('5. Test the connection!\n');

console.log('=' .repeat(60));
console.log('\n🚀 TESTING YOUR COOKIES:\n');

console.log('After saving btp_cookies.json, run:');
console.log('');
console.log('  cd ADT');
console.log('  node test_btp_with_cookies.js');
console.log('');
console.log('This will test if your cookies work!\n');

// Check if cookies file already exists
const cookiesFilePath = path.join(__dirname, 'btp_cookies.json');

if (fs.existsSync(cookiesFilePath)) {
  console.log('=' .repeat(60));
  console.log('\n✅ FOUND EXISTING COOKIES FILE!\n');
  
  try {
    const cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf8'));
    
    console.log('Current cookies in btp_cookies.json:');
    console.log('');
    
    if (cookiesData.cookies && Array.isArray(cookiesData.cookies)) {
      cookiesData.cookies.forEach((cookie, index) => {
        const cookieName = cookie.split('=')[0];
        const cookieValue = cookie.split('=')[1];
        const displayValue = cookieValue.length > 30 
          ? cookieValue.substring(0, 30) + '...' 
          : cookieValue;
        console.log(`  ${index + 1}. ${cookieName}=${displayValue}`);
      });
      
      console.log(`\n✅ Found ${cookiesData.cookies.length} cookie(s)`);
      console.log('\nYou can test these cookies by running:');
      console.log('  node test_btp_with_cookies.js\n');
    } else {
      console.log('⚠️  Invalid format. Please use the format shown above.\n');
    }
  } catch (error) {
    console.log('⚠️  Error reading cookies file:', error.message);
    console.log('Please check the JSON format.\n');
  }
} else {
  console.log('=' .repeat(60));
  console.log('\n📝 NEXT STEP:\n');
  console.log('Create the file: ADT/btp_cookies.json');
  console.log('Use the format shown above to paste your cookies.\n');
}

console.log('=' .repeat(60));
console.log('\n💡 TIPS:\n');

console.log('• Cookies expire after ~30 minutes of inactivity');
console.log('• You\'ll need to refresh them periodically');
console.log('• Keep Eclipse connected to maintain the session');
console.log('• The MCP server will detect expired cookies and warn you');
console.log('• You can update btp_cookies.json anytime without restarting\n');

console.log('=' .repeat(60));
console.log('\n❓ NEED HELP?\n');

console.log('If you\'re stuck, I recommend METHOD 2 (Communication Log)');
console.log('because it shows you exactly what Eclipse is sending.\n');

console.log('Check ADT/BTP_COOKIE_EXTRACTION_GUIDE.md for detailed');
console.log('screenshots and troubleshooting.\n');

console.log('=' .repeat(60));


