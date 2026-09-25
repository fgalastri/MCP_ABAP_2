#!/usr/bin/env node

/**
 * ABAP ADT MCP Server - Unified Launcher
 * 
 * Launches the MCP server in either stdio mode (for local Cursor) or HTTP mode (for remote access).
 * 
 * Usage:
 *   # Stdio mode (default - for Cursor MCP)
 *   node server_launcher.js
 *   node server_launcher.js --mode stdio
 * 
 *   # HTTP mode (for remote access)
 *   node server_launcher.js --mode http
 *   HTTP_PORT=3000 HTTP_API_KEY=my-secret-key node server_launcher.js --mode http
 * 
 * Environment Variables:
 *   MODE:          Server mode (stdio|http, default: stdio)
 *   HTTP_PORT:     HTTP server port (default: 3000)
 *   HTTP_API_KEY:  API key for authentication (recommended for security)
 *   SAP_SYSTEM:    Which SAP system to use (DEV/QA/BTP, default: DEV)
 *   REQUIRE_AUTH:  Require authentication for HTTP mode (default: true)
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
let mode = process.env.MODE || 'stdio';

// Check for --mode flag
const modeIndex = args.indexOf('--mode');
if (modeIndex !== -1 && args[modeIndex + 1]) {
  mode = args[modeIndex + 1];
}

// Validate mode
if (!['stdio', 'http'].includes(mode)) {
  console.error(`❌ Invalid mode: ${mode}`);
  console.error('   Valid modes: stdio, http');
  process.exit(1);
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  ABAP ADT MCP Server - Unified Launcher');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log(`  Mode:                    ${mode.toUpperCase()}`);
console.log(`  SAP System:              ${process.env.SAP_SYSTEM || 'DEV'}`);

if (mode === 'http') {
  console.log(`  HTTP Port:               ${process.env.HTTP_PORT || 3000}`);
  console.log(`  HTTP API Key:            ${process.env.HTTP_API_KEY ? '✓ Set' : '⚠️  Not set'}`);
  console.log(`  Require Auth:            ${process.env.REQUIRE_AUTH !== 'false' ? 'Yes' : 'No'}`);
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// Launch appropriate server
const serverFile = mode === 'http' ? 'server_http.js' : 'server_adt.js';
const serverPath = path.join(__dirname, serverFile);

console.log(`🚀 Launching ${mode} server: ${serverFile}`);
console.log('');

const child = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env
});

child.on('error', (error) => {
  console.error(`❌ Failed to start server: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.log(`\n🛑 Server terminated by signal: ${signal}`);
  } else if (code !== 0) {
    console.log(`\n❌ Server exited with code: ${code}`);
  }
  process.exit(code || 0);
});

// Forward signals to child process
process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});
