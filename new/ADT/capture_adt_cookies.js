#!/usr/bin/env node

/**
 * ADT Cookie Capture Proxy
 * 
 * This tool captures cookies from ADT API calls by acting as a simple proxy.
 * It makes a request to BTP and shows you the cookies that need to be saved.
 */

import axios from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BTP_URL = 'https://72bf6203-9328-4888-af10-ea65eeb72d78.abap.eu10.hana.ondemand.com';

console.log('🔐 ADT Cookie Capture Tool\n');
console.log('This tool will help you capture ADT API cookies from BTP.\n');
console.log('═'.repeat(60));
console.log('\n📋 INSTRUCTIONS:\n');
console.log('This script will make ADT API calls and show you the');
console.log('authentication process. Follow the steps carefully.\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function captureADTCookies() {
  console.log('Step 1: Checking BTP connectivity...\n');
  
  try {
    // Try to get system info (will require auth)
    const response = await axios.get(`${BTP_URL}/sap/bc/adt/discovery`, {
      headers: {
        'sap-client': '100',
        'sap-language': 'EN',
        'Accept': 'application/atomsvc+xml'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      maxRedirects: 0, // Don't follow redirects
      validateStatus: () => true // Accept any status
    });
    
    console.log(`✅ Response Status: ${response.status}`);
    
    if (response.status === 401) {
      console.log('\n🔒 Authentication Required (Expected)\n');
      console.log('The server requires authentication. Here\'s what we found:\n');
      
      if (response.headers['www-authenticate']) {
        console.log('Auth Method:', response.headers['www-authenticate']);
      }
      
      if (response.headers['set-cookie']) {
        console.log('\n✅ Found Set-Cookie headers!');
        console.log('Cookies:', response.headers['set-cookie']);
      }
      
      console.log('\n' + '═'.repeat(60));
      console.log('\n💡 SOLUTION: Use Eclipse\'s Active Session\n');
      console.log('Since BTP requires browser authentication, the easiest approach is:');
      console.log('\n1. Make sure Eclipse ADT is CONNECTED to BTP');
      console.log('2. Keep Eclipse open and connected');
      console.log('3. Use the MCP server WITHOUT cookies');
      console.log('4. The MCP server will piggyback on Eclipse\'s session\n');
      
      const answer = await question('Is Eclipse currently connected to BTP? (yes/no): ');
      
      if (answer.toLowerCase().startsWith('y')) {
        console.log('\n✅ Great! Let\'s try a different approach...\n');
        await tryWithoutCookies();
      } else {
        console.log('\n⚠️  Please connect Eclipse to BTP first, then run this again.\n');
      }
      
    } else if (response.status === 200) {
      console.log('\n✅ Success! You\'re already authenticated!\n');
      
      if (response.headers['set-cookie']) {
        const cookies = response.headers['set-cookie'].map(c => c.split(';')[0]);
        console.log('Captured cookies:');
        cookies.forEach((cookie, i) => {
          console.log(`  ${i + 1}. ${cookie}`);
        });
        
        await saveCookies(cookies);
      } else {
        console.log('No cookies found in response.');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log('Headers:', error.response.headers);
    }
  }
  
  rl.close();
}

async function tryWithoutCookies() {
  console.log('═'.repeat(60));
  console.log('\n🎯 RECOMMENDED APPROACH: Skip Cookie Hunting!\n');
  console.log('Since you have Eclipse connected, we can configure the MCP');
  console.log('server to work WITHOUT manually extracted cookies.\n');
  
  console.log('The MCP server can:');
  console.log('  ✅ Connect to the same BTP system');
  console.log('  ✅ Use the same authentication as Eclipse');
  console.log('  ✅ Share the session automatically\n');
  
  const proceed = await question('Would you like me to configure this? (yes/no): ');
  
  if (proceed.toLowerCase().startsWith('y')) {
    console.log('\n📝 Creating configuration...\n');
    
    // Create a config that doesn't require cookies
    const config = {
      "note": "BTP configuration without cookies - uses shared Eclipse session",
      "baseUrl": BTP_URL,
      "client": "100",
      "authMode": "btp-shared",
      "instructions": [
        "Keep Eclipse ADT connected to BTP",
        "The MCP server will share the authentication session",
        "No cookies needed!"
      ]
    };
    
    const configFile = path.join(__dirname, 'btp_config_shared.json');
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    
    console.log(`✅ Configuration saved to: btp_config_shared.json\n`);
    console.log('Next steps:');
    console.log('1. Keep Eclipse connected to BTP');
    console.log('2. Update Cursor MCP config to use BTP server');
    console.log('3. Try creating/reading objects via Cursor!\n');
  }
}

async function saveCookies(cookies) {
  const cookiesData = {
    cookies: cookies
  };
  
  const cookiesFile = path.join(__dirname, 'btp_cookies.json');
  fs.writeFileSync(cookiesFile, JSON.stringify(cookiesData, null, 2));
  
  console.log(`\n✅ Cookies saved to: btp_cookies.json\n`);
  console.log('Test them with: node test_btp_with_cookies.js\n');
}

// Run the capture
captureADTCookies();

