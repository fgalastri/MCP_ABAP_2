#!/usr/bin/env node

/**
 * Manual BTP Cookie Setup
 * 
 * The simplest way: Just copy-paste cookies from your browser!
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🍪 BTP Cookie Setup - Manual Method\n');
console.log('═'.repeat(60));
console.log('\nThis is the SIMPLEST way to set up BTP authentication!\n');

console.log('📋 STEP 1: Open your browser DevTools\n');
console.log('1. Go to your BTP system in browser:');
console.log('   https://72bf6203-9328-4888-af10-ea65eeb72d78.abap.eu10.hana.ondemand.com');
console.log('2. Press F12 (Developer Tools)');
console.log('3. Go to Network tab');
console.log('4. Refresh the page');
console.log('5. Click on ANY request');
console.log('6. Find "Request Headers" section');
console.log('7. Look for the "Cookie:" header');
console.log('8. Copy the ENTIRE cookie value\n');

console.log('It will look something like this:');
console.log('sap-usercontext=sap-language=EN; JSESSIONID=abc123; _VCAP_ID_=xyz789\n');
console.log('═'.repeat(60));
console.log('');

rl.question('Paste your Cookie header value here (or press Enter to skip):\n', (cookieString) => {
  if (!cookieString || cookieString.trim() === '') {
    console.log('\n⚠️  No cookies provided.');
    console.log('\n💡 Alternative: Use the on-premise system for now');
    console.log('   We can set up proper BTP OAuth authentication later.\n');
    rl.close();
    return;
  }
  
  // Parse the cookie string
  const cookies = cookieString.split(';').map(c => c.trim()).filter(c => c.length > 0);
  
  console.log(`\n✅ Parsed ${cookies.length} cookie(s):\n`);
  cookies.forEach((cookie, i) => {
    const name = cookie.split('=')[0];
    const value = cookie.split('=')[1] || '';
    const preview = value.length > 30 ? value.substring(0, 30) + '...' : value;
    console.log(`   ${i + 1}. ${name}=${preview}`);
  });
  
  // Save to file
  const cookiesData = {
    cookies: cookies
  };
  
  const cookiesFile = path.join(__dirname, 'btp_cookies.json');
  fs.writeFileSync(cookiesFile, JSON.stringify(cookiesData, null, 2));
  
  console.log(`\n✅ Cookies saved to: ${cookiesFile}\n`);
  console.log('🧪 Testing cookies now...\n');
  
  rl.close();
  
  // Test the cookies
  import('./test_btp_with_cookies.js');
});

