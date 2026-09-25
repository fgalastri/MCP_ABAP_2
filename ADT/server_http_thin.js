#!/usr/bin/env node

/**
 * ABAP ADT Thin Client MCP Server - HTTP Mode
 * 
 * This HTTP server returns CALL SPECS instead of executing them.
 * The call specs are then executed by the local agent (simple-agent-server.js)
 * inside the customer's VPN.
 * 
 * ARCHITECTURE:
 * - Remote Cloud: This HTTP server (your proprietary code)
 * - Cursor: Receives call specs via server_http_client_thin.js
 * - Local Agent: Executes HTTP calls to S/4 (inside VPN)
 * 
 * Usage:
 *   node server_http_thin.js
 *   HTTP_PORT=3000 HTTP_API_KEY=your-key node server_http_thin.js
 */

import express from 'express';
import { spawn } from 'child_process';
import { createLogger } from './adt-utils.js';
import { loadConfig, validateConfig } from './adt-config.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const HTTP_PORT = process.env.HTTP_PORT || 3000;
const HTTP_API_KEY = process.env.HTTP_API_KEY || null;
const REQUIRE_AUTH = process.env.REQUIRE_AUTH !== 'false';

// Load active system
function loadActiveSystem() {
  const stateFile = path.join(__dirname, 'current_system.json');
  try {
    if (fs.existsSync(stateFile)) {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      return state.activeSystem || process.env.SAP_SYSTEM || 'DEV';
    }
  } catch (error) {
    console.error(`[SYSTEM SWITCH] Failed to load state file: ${error.message}`);
  }
  return process.env.SAP_SYSTEM || 'DEV';
}

let ACTIVE_SYSTEM_KEY = loadActiveSystem();
let SAP_CONFIG = loadConfig(ACTIVE_SYSTEM_KEY);

// Create logger
let SERVER_ID = SAP_CONFIG.serverId + '-http-thin';
let logFile = path.join(__dirname, `adt_http_thin_${SAP_CONFIG.systemKey.toLowerCase()}.log`);
let log = createLogger(SERVER_ID, logFile);

// Validate config
try {
  validateConfig(SAP_CONFIG);
} catch (error) {
  console.error(`❌ ERROR: ${error.message}`);
  process.exit(1);
}

// MCP Client - Communicates with thin client stdio server via JSON-RPC
class McpClient {
  constructor() {
    this.requestId = 1;
    this.pendingRequests = new Map();
    this.mcpProcess = null;
    this.buffer = '';
  }

  async start() {
    return new Promise((resolve, reject) => {
      // Spawn the THIN CLIENT V2 server with RETURN_CALL_SPEC_ONLY mode
      const serverPath = path.join(__dirname, 'server_adt_thin_v2.js');
      
      log('[MCP CLIENT] Starting thin client stdio server (RETURN_CALL_SPEC_ONLY mode)...');
      
      this.mcpProcess = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          RETURN_CALL_SPEC_ONLY: 'true'  // ← CRITICAL: Return call specs only!
        }
      });

      this.mcpProcess.stdout.on('data', (data) => {
        this.buffer += data.toString();
        this.processBuffer();
      });

      this.mcpProcess.stderr.on('data', (data) => {
        const msg = data.toString();
        // Filter out debug messages
        if (!msg.includes('[ERROR]') && !msg.includes('DEBUG') && !msg.includes('[THIN CLIENT ADAPTER]')) {
          log(`[MCP STDERR] ${msg}`);
        }
      });

      this.mcpProcess.on('error', (error) => {
        log(`[MCP ERROR] ${error.message}`);
        reject(error);
      });

      this.mcpProcess.on('exit', (code) => {
        log(`[MCP EXIT] Process exited with code ${code}`);
        this.mcpProcess = null;
      });

      // Wait for server to initialize
      setTimeout(() => {
        log('[MCP CLIENT] Thin client stdio server started (call spec mode)');
        resolve();
      }, 1000);
    });
  }

  processBuffer() {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const response = JSON.parse(line);
        
        if (response.id && this.pendingRequests.has(response.id)) {
          const { resolve, reject } = this.pendingRequests.get(response.id);
          this.pendingRequests.delete(response.id);
          
          if (response.error) {
            reject(new Error(response.error.message || 'MCP Error'));
          } else {
            resolve(response.result);
          }
        }
      } catch (error) {
        log(`[MCP PARSE ERROR] ${error.message}: ${line}`);
      }
    }
  }

  async callTool(toolName, args) {
    if (!this.mcpProcess) {
      throw new Error('MCP server not started');
    }

    const requestId = this.requestId++;
    
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');
      
      // Timeout after 60 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 60000);
    });
  }

  async listTools() {
    if (!this.mcpProcess) {
      throw new Error('MCP server not started');
    }

    const requestId = this.requestId++;
    
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/list',
      params: {}
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');
      
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  }

  stop() {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.mcpProcess = null;
    }
  }
}

// Create Express app
const app = express();
const mcpClient = new McpClient();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Logging
app.use((req, res, next) => {
  log(`[HTTP] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Authentication
function authMiddleware(req, res, next) {
  if (!REQUIRE_AUTH) {
    return next();
  }

  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!HTTP_API_KEY) {
    log('[AUTH] WARNING: No HTTP_API_KEY set - authentication disabled');
    return next();
  }

  if (apiKey !== HTTP_API_KEY) {
    log(`[AUTH] Unauthorized access attempt from ${req.ip}`);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    });
  }

  next();
}

app.use('/api', authMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'ABAP ADT Thin Client MCP Server (HTTP - Call Spec Mode)',
    mode: 'thin-client-call-spec',
    system: SAP_CONFIG.systemKey,
    baseUrl: SAP_CONFIG.baseUrl,
    client: SAP_CONFIG.client,
    mcpStatus: mcpClient.mcpProcess ? 'running' : 'stopped',
    timestamp: new Date().toISOString(),
    architecture: {
      remote: 'This HTTP server (returns call specs)',
      local: 'simple-agent-server.js (executes calls inside VPN)',
      cursor: 'Connects via server_http_client_thin.js'
    }
  });
});

// List tools
app.get('/api/tools', async (req, res) => {
  try {
    const result = await mcpClient.listTools();
    res.json(result);
  } catch (error) {
    log(`[ERROR] List tools failed: ${error.message}`);
    res.status(500).json({
      error: 'Failed to list tools',
      message: error.message
    });
  }
});

// Execute tool - Returns CALL SPEC
app.post('/api/tools/:toolName', async (req, res) => {
  const { toolName } = req.params;
  const args = req.body;

  log(`[TOOL] Generating call spec for: ${toolName}`);

  try {
    const result = await mcpClient.callTool(toolName, args);
    
    // Extract text content from MCP response
    let responseText = '';
    if (result && result.content && Array.isArray(result.content)) {
      responseText = result.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');
    }

    // Try to parse the response to extract call spec
    let callSpec = null;
    try {
      // The thin client returns the call spec in the response
      // Look for _callSpec marker
      if (responseText.includes('_callSpec')) {
        const parsed = JSON.parse(responseText);
        if (parsed._callSpec) {
          callSpec = parsed._callSpec;
        }
      }
    } catch (e) {
      // If parsing fails, return as-is
    }

    if (callSpec) {
      log(`[TOOL] ✅ Call spec generated: ${callSpec.method} ${callSpec.url}`);
      res.json({
        success: true,
        tool: toolName,
        callSpec: callSpec,  // ← THIS IS WHAT CURSOR NEEDS!
        message: 'Call spec ready - forward to local agent for execution'
      });
    } else {
      // Fallback if call spec format is different
      res.json({
        success: true,
        tool: toolName,
        result: responseText || result,
        warning: 'Call spec not in expected format'
      });
    }

  } catch (error) {
    log(`[ERROR] Tool execution failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  log(`[ERROR] ${err.message}`);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Start server
async function startServer() {
  try {
    // Start MCP client (thin client stdio server in call spec mode)
    await mcpClient.start();
    
    // Start HTTP server
    const server = app.listen(HTTP_PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('  🚀 ABAP ADT Thin Client MCP Server - HTTP Mode');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('');
      console.log(`  ✅ HTTP Server:           http://localhost:${HTTP_PORT}`);
      console.log(`  ✅ MCP Backend:           Thin Client V2 (call spec mode)`);
      console.log(`  ✅ SAP System:            ${SAP_CONFIG.systemKey}`);
      console.log(`  ✅ Base URL:              ${SAP_CONFIG.baseUrl}`);
      console.log(`  ✅ Client:                ${SAP_CONFIG.client}`);
      console.log('');
      console.log('  🏗️  Architecture:');
      console.log('     • Remote:              This HTTP server (returns call specs)');
      console.log('     • Local:               simple-agent-server.js (executes calls)');
      console.log('     • Cursor:              Uses server_http_client_thin.js bridge');
      console.log('');
      console.log('  📍 Endpoints:');
      console.log(`     • Health:              GET  /health`);
      console.log(`     • List Tools:          GET  /api/tools`);
      console.log(`     • Get Call Spec:       POST /api/tools/{tool_name}`);
      console.log('');
      
      if (REQUIRE_AUTH) {
        if (HTTP_API_KEY) {
          console.log('  🔐 Authentication:        ENABLED');
        } else {
          console.log('  ⚠️  Authentication:        DISABLED (no API key)');
        }
      } else {
        console.log('  ⚠️  Authentication:        DISABLED');
      }
      
      console.log('');
      console.log('  📊 Tools Available:       40 thin_v2_* tools');
      console.log('  ⚙️  Mode:                  CALL SPEC ONLY (no execution)');
      console.log('');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('');
      
      log('[HTTP SERVER] Started successfully');
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Shutting down...');
      mcpClient.stop();
      server.close(() => {
        log('[HTTP SERVER] Shut down gracefully');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.log('\n\n🛑 Received SIGTERM...');
      mcpClient.stop();
      server.close(() => {
        log('[HTTP SERVER] Shut down gracefully');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

startServer();
