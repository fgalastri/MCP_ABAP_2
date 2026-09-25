#!/usr/bin/env node

/**
 * BTP Authentication - Simple OAuth Flow
 * 
 * Mimics what Eclipse does:
 * 1. Starts local callback server
 * 2. Opens browser to BTP login
 * 3. Captures reentrance ticket
 * 4. Exchanges for ADT session cookies
 * 5. Saves to btp_cookies.json
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
  apiUrl: 'https://72bf6203-9328-4888-af10-ea65eeb72d78.abap.eu10.hana.ondemand.com',
  webUrl: 'https://72bf6203-9328-4888-af10-ea65eeb72d78.abap-web.eu10.hana.ondemand.com',
  client: '100',
  language: 'EN',
  callbackPort: 8765  // Our local server port
};

let capturedTicket = null;
let capturedCookies = [];

console.log('🔐 BTP Authentication Helper\n');
console.log('═'.repeat(60));
console.log('\nThis tool will authenticate you to BTP and capture the session.\n');

// Create Express app for OAuth callback
const app = express();

// Handle the specific redirect route
app.get('/adt/redirect', async (req, res) => {
  console.log('\n📥 Received callback from BTP!');
  console.log(`   Path: ${req.path}`);
  console.log(`   Query params:`, req.query);
  
  const ticket = req.query['reentrance-ticket'];
  
  if (!ticket) {
    console.log('❌ No reentrance ticket in callback!');
    console.log('   Showing all parameters to help debug...');
    res.send(`
      <h1>Callback Received</h1>
      <p>Path: ${req.path}</p>
      <pre>${JSON.stringify(req.query, null, 2)}</pre>
      <p style="color: red;">No reentrance ticket found in parameters!</p>
    `);
    return;
  }
  
  console.log('✅ Reentrance ticket captured!');
  console.log(`   Ticket: ${ticket.substring(0, 30)}...\n`);
  
  capturedTicket = ticket;
  
  res.send(`
    <html>
      <head><title>BTP Authentication Success</title></head>
      <body style="font-family: Arial; padding: 40px; text-align: center;">
        <h1 style="color: green;">✅ Authentication Successful!</h1>
        <p style="font-size: 18px;">Reentrance ticket captured successfully!</p>
        <p>Now exchanging ticket for ADT session cookies...</p>
        <p style="color: gray; margin-top: 40px;">You can close this window.</p>
      </body>
    </html>
  `);
  
  // Exchange ticket for ADT session
  setTimeout(async () => {
    await exchangeTicketForSession(ticket);
  }, 1000);
});

// Exchange reentrance ticket for ADT session cookies
async function exchangeTicketForSession(ticket) {
  console.log('🔄 Exchanging reentrance ticket for ADT session...\n');
  
  try {
    // Step 1: Create ADT session with reentrance ticket (like Eclipse does)
    console.log('📡 Creating ADT session with reentrance ticket...');
    const sessionResponse = await axios.get(`${BTP_CONFIG.apiUrl}/sap/bc/adt/core/http/sessions`, {
      headers: {
        'sap-client': BTP_CONFIG.client,
        'sap-language': BTP_CONFIG.language,
        'Accept': 'application/vnd.sap.adt.core.http.session.v3+xml',
        'x-sap-security-session': 'create',
        'sap-adt-purpose': 'logon',
        'X-sap-adt-reentranceticket': ticket  // Use the reentrance ticket
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      validateStatus: () => true // Accept any status
    });
    
    console.log(`📡 Session creation response: ${sessionResponse.status}`);
    
    // Capture cookies from session creation
    if (sessionResponse.headers['set-cookie']) {
      const sessionCookies = sessionResponse.headers['set-cookie'].map(c => c.split(';')[0]);
      console.log(`✅ Got ${sessionCookies.length} session cookie(s)`);
      capturedCookies.push(...sessionCookies);
    }
    
    // Step 2: Now try the ADT API with the session cookies
    console.log('\n📡 Testing ADT API with session cookies...');
    const cookieHeader = capturedCookies.join('; ');
    const response = await axios.get(`${BTP_CONFIG.apiUrl}/sap/bc/adt/discovery`, {
      headers: {
        'sap-client': BTP_CONFIG.client,
        'sap-language': BTP_CONFIG.language,
        'Accept': 'application/atomsvc+xml',
        'Cookie': cookieHeader
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      validateStatus: () => true // Accept any status
    });
    
    console.log(`📡 ADT API Response: ${response.status}`);
    
    if (response.headers['set-cookie']) {
      capturedCookies = response.headers['set-cookie'].map(c => c.split(';')[0]);
      console.log(`✅ Captured ${capturedCookies.length} cookie(s)!`);
      
      capturedCookies.forEach((cookie, i) => {
        const name = cookie.split('=')[0];
        console.log(`   ${i + 1}. ${name}`);
      });
      
      // Save cookies to file
      const cookiesData = {
        cookies: capturedCookies
      };
      
      const cookiesFile = path.join(__dirname, 'btp_cookies.json');
      fs.writeFileSync(cookiesFile, JSON.stringify(cookiesData, null, 2));
      
      console.log('\n✅ SUCCESS! Cookies saved to btp_cookies.json\n');
      console.log('═'.repeat(60));
      console.log('\n📋 Next steps:');
      console.log('   1. Test cookies: node test_btp_with_cookies.js');
      console.log('   2. Update Cursor MCP config with BTP server');
      console.log('   3. Start using BTP in Cursor!\n');
      
      process.exit(0);
    } else {
      console.log('⚠️  No cookies received. Response headers:');
      console.log(JSON.stringify(response.headers, null, 2));
      
      console.log('\n💡 The reentrance ticket might need to be used differently.');
      console.log('   Let me try another approach...\n');
      
      // Try alternative: Use ticket in cookie header
      await tryTicketAsCookie(ticket);
    }
    
  } catch (error) {
    console.error('\n❌ Error exchanging ticket:', error.message);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response headers:', error.response.headers);
    }
    
    console.log('\n💡 Don\'t worry, we have the ticket. We can use it manually.');
    console.log(`   Reentrance ticket: ${ticket}\n`);
    
    process.exit(1);
  }
}

async function tryTicketAsCookie(ticket) {
  console.log('🔄 Trying alternative approach with cookie...\n');
  
  try {
    const response = await axios.get(`${BTP_CONFIG.apiUrl}/sap/bc/adt/discovery`, {
      headers: {
        'sap-client': BTP_CONFIG.client,
        'sap-language': BTP_CONFIG.language,
        'Accept': 'application/atomsvc+xml',
        'Cookie': `sap-reentranceticket=${ticket}`
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      validateStatus: () => true
    });
    
    console.log(`📡 Response: ${response.status}`);
    
    if (response.headers['set-cookie']) {
      capturedCookies = response.headers['set-cookie'].map(c => c.split(';')[0]);
      console.log(`✅ SUCCESS! Captured ${capturedCookies.length} cookie(s)!\n`);
      
      const cookiesData = { cookies: capturedCookies };
      fs.writeFileSync(path.join(__dirname, 'btp_cookies.json'), JSON.stringify(cookiesData, null, 2));
      
      console.log('✅ Cookies saved to btp_cookies.json\n');
      process.exit(0);
    }
  } catch (error) {
    console.error('Alternative approach also failed:', error.message);
  }
}

// Start server
const server = app.listen(BTP_CONFIG.callbackPort, () => {
  console.log(`📡 Callback server started on http://localhost:${BTP_CONFIG.callbackPort}\n`);
  
  // Generate the OAuth URL (based on what Eclipse uses)
  const authUrl = `${BTP_CONFIG.webUrl}/sap/bc/adt/core/http/reentranceticket?redirect-url=http://localhost:${BTP_CONFIG.callbackPort}/adt/redirect`;
  
  console.log('📋 INSTRUCTIONS:\n');
  console.log('1. Copy this URL:');
  console.log('   ');
  console.log(`   ${authUrl}`);
  console.log('   ');
  console.log('2. Paste it in your browser');
  console.log('3. Log in to BTP (if not already logged in)');
  console.log('4. You\'ll be redirected back here automatically');
  console.log('5. Cookies will be captured and saved!\n');
  
  console.log('═'.repeat(60));
  console.log('\n⏳ Waiting for you to complete authentication in browser...\n');
  
  // Optional: Try to open browser automatically
  const answer = process.env.AUTO_OPEN_BROWSER !== 'false';
  if (answer) {
    setTimeout(() => {
      console.log('🌐 Attempting to open browser automatically...\n');
      const openCommand = process.platform === 'win32' ? 'start' :
                         process.platform === 'darwin' ? 'open' : 'xdg-open';
      
      exec(`${openCommand} "${authUrl}"`, (error) => {
        if (error) {
          console.log('⚠️  Could not open browser automatically.');
          console.log('   Please copy the URL above and open it manually.\n');
        }
      });
    }, 2000);
  }
});

// Timeout after 10 minutes
setTimeout(() => {
  if (!capturedTicket) {
    console.log('\n⏱️  Timeout: No authentication completed in 10 minutes.');
    console.log('   Please try again.\n');
    process.exit(1);
  }
}, 10 * 60 * 1000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n❌ Authentication cancelled by user.\n');
  process.exit(0);
});

