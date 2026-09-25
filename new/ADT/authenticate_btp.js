#!/usr/bin/env node

/**
 * BTP Authentication Helper
 * 
 * This script automates the BTP authentication flow:
 * 1. Starts a local callback server
 * 2. Opens your browser to BTP login
 * 3. Captures the session cookies after login
 * 4. Saves them to btp_cookies.json
 */

import express from 'express';
import axios from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BTP_CONFIG = {
  baseUrl: 'https://72bf6203-9328-4888-af10-ea65eeb72d78.abap.eu10.hana.ondemand.com',
  client: '100',
  language: 'EN',
  callbackPort: 8765
};

const capturedCookies = [];

console.log('🔐 BTP Authentication Helper\n');
console.log('This tool will help you authenticate to BTP and capture the session cookies.\n');

// Create Express app for OAuth callback
const app = express();

app.get('/callback', (req, res) => {
  console.log('📥 Received callback from BTP...');
  
  // Get cookies from the request
  const cookies = req.headers.cookie;
  if (cookies) {
    console.log('✅ Captured cookies from callback!');
    console.log(`   Cookies: ${cookies.substring(0, 100)}...`);
    
    // Parse cookies into array
    const cookieArray = cookies.split(';').map(c => c.trim());
    capturedCookies.push(...cookieArray);
    
    res.send(`
      <html>
        <head><title>BTP Authentication Success</title></head>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1 style="color: green;">✅ Authentication Successful!</h1>
          <p>Cookies have been captured and saved.</p>
          <p>You can close this window and return to your terminal.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
    
    // Save cookies and shut down
    setTimeout(() => {
      saveCookiesAndExit();
    }, 1000);
  } else {
    console.log('⚠️  No cookies in callback, redirecting to BTP...');
    res.redirect(`${BTP_CONFIG.baseUrl}/sap/bc/adt/discovery`);
  }
});

app.get('/start', (req, res) => {
  console.log('🚀 Starting BTP authentication flow...');
  
  // Redirect to BTP ADT endpoint
  res.redirect(`${BTP_CONFIG.baseUrl}/sap/bc/adt/discovery?sap-client=${BTP_CONFIG.client}&sap-language=${BTP_CONFIG.language}`);
});

function saveCookiesAndExit() {
  if (capturedCookies.length === 0) {
    console.log('\n❌ No cookies captured!');
    console.log('   This might mean:');
    console.log('   1. Authentication didn\'t complete');
    console.log('   2. Browser blocked cookies');
    console.log('   3. You closed the window too early\n');
    process.exit(1);
  }
  
  // Save cookies to file
  const cookiesData = {
    cookies: capturedCookies
  };
  
  const cookiesFile = path.join(__dirname, 'btp_cookies.json');
  fs.writeFileSync(cookiesFile, JSON.stringify(cookiesData, null, 2));
  
  console.log('\n✅ SUCCESS! Cookies saved to btp_cookies.json');
  console.log(`   Captured ${capturedCookies.length} cookie(s)\n`);
  
  console.log('📋 Next steps:');
  console.log('   1. Test the cookies: node test_btp_with_cookies.js');
  console.log('   2. Configure Cursor MCP with BTP settings');
  console.log('   3. Start using the abap-adt-btp server!\n');
  
  process.exit(0);
}

// Start server
const server = app.listen(BTP_CONFIG.callbackPort, () => {
  console.log(`📡 Callback server started on http://localhost:${BTP_CONFIG.callbackPort}\n`);
  
  console.log('📋 Instructions:');
  console.log('   1. Your browser will open shortly');
  console.log('   2. Log in to BTP with your credentials');
  console.log('   3. Complete any MFA if prompted');
  console.log('   4. After login, cookies will be captured automatically');
  console.log('   5. You can close the browser window\n');
  
  console.log('⏳ Opening browser in 3 seconds...\n');
  
  setTimeout(() => {
    const authUrl = `http://localhost:${BTP_CONFIG.callbackPort}/start`;
    console.log(`🌐 Opening: ${authUrl}\n`);
    
    // Open browser based on OS
    const openCommand = process.platform === 'win32' ? 'start' :
                       process.platform === 'darwin' ? 'open' : 'xdg-open';
    
    exec(`${openCommand} "${authUrl}"`, (error) => {
      if (error) {
        console.log('⚠️  Could not open browser automatically.');
        console.log(`   Please open this URL manually: ${authUrl}\n`);
      }
    });
  }, 3000);
});

// Timeout after 5 minutes
setTimeout(() => {
  console.log('\n⏱️  Timeout: No authentication completed in 5 minutes.');
  console.log('   Please try again.\n');
  process.exit(1);
}, 5 * 60 * 1000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n❌ Authentication cancelled by user.\n');
  process.exit(0);
});

