#!/usr/bin/env node

/**
 * ABAP ADT Thin Client MCP Server - HTTP Mode
 * 
 * This HTTP server exposes the thin client v2 tools via HTTP using MCP protocol.
 * It spawns server_adt_thin_v2.js with RETURN_CALL_SPEC_ONLY mode enabled.
 * 
 * Architecture:
 *   Cursor → [HTTP/MCP] → This Server → Returns Call Spec
 * 
 * The call specs are then executed by the local agent (simple-agent-server.js)
 * inside the customer's VPN.
 * 
 * Usage:
 *   node server_thin_http.js
 *   PORT=3000 node server_thin_http.js
 *   PORT=3000 HTTP_API_KEY=your-key node server_thin_http.js
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
const HTTP_PORT = process.env.PORT || process.env.HTTP_PORT || 3000;
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
let SERVER_ID = SAP_CONFIG.serverId + '-thin-http';
let logFile = path.join(__dirname, `adt_thin_http_${SAP_CONFIG.systemKey.toLowerCase()}.log`);
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
      const serverPath = path.join(__dirname, 'server_adt_thin_v2.js');
      
      log('[MCP CLIENT] Starting thin client stdio server (RETURN_CALL_SPEC_ONLY mode)...');
      
      // Spawn thin client v2 with RETURN_CALL_SPEC_ONLY enabled
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
        // Filter out debug/noise messages
        if (!msg.includes('[ERROR]') && !msg.includes('DEBUG')) {
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
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: 'Unauthorized: Invalid or missing API key'
      },
      id: null
    });
  }

  next();
}

// Health check (no auth)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'ABAP ADT Thin Client MCP Server (HTTP)',
    mode: 'call-spec-only',
    system: SAP_CONFIG.systemKey,
    baseUrl: SAP_CONFIG.baseUrl,
    client: SAP_CONFIG.client,
    mcpStatus: mcpClient.mcpProcess ? 'running' : 'stopped',
    timestamp: new Date().toISOString()
  });
});

// MCP Protocol endpoint (with auth)
app.post('/mcp', authMiddleware, async (req, res) => {
  const { jsonrpc, method, params, id } = req.body;

  if (jsonrpc !== '2.0') {
    return res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid Request: jsonrpc must be 2.0' },
      id: id || null
    });
  }

  try {
    if (method === 'initialize') {
      log('[MCP] initialize request');
      // MCP protocol handshake
      res.json({
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'abap-adt-thin-http',
            version: '1.0.0'
          }
        },
        id
      });
    } else if (method === 'notifications/initialized') {
      log('[MCP] notifications/initialized (handshake complete)');
      // Notification - acknowledge with empty result
      res.json({
        jsonrpc: '2.0',
        result: {},
        id
      });
    } else if (method === 'tools/list') {
      log('[MCP] tools/list request');
      const result = await mcpClient.listTools();
      res.json({
        jsonrpc: '2.0',
        result,
        id
      });
    } else if (method === 'tools/call') {
      const { name, arguments: args } = params;
      log(`[MCP] tools/call: ${name}`);
      const result = await mcpClient.callTool(name, args);
      res.json({
        jsonrpc: '2.0',
        result,
        id
      });
    } else {
      res.status(404).json({
        jsonrpc: '2.0',
        error: { code: -32601, message: `Method not found: ${method}` },
        id
      });
    }
  } catch (error) {
    log(`[MCP ERROR] ${error.message}`);
    res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: error.message },
      id
    });
  }
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
      console.log(`  ✅ MCP Endpoint:          POST /mcp`);
      console.log(`  ✅ SAP System:            ${SAP_CONFIG.systemKey}`);
      console.log(`  ✅ Base URL:              ${SAP_CONFIG.baseUrl}`);
      console.log(`  ✅ Client:                ${SAP_CONFIG.client}`);
      console.log('');
      console.log('  🏗️  Architecture:');
      console.log('     • Remote:              This HTTP server (returns call specs)');
      console.log('     • Local:               simple-agent-server.js (executes calls)');
      console.log('     • Cursor:              Direct HTTP/MCP connection');
      console.log('');
      console.log('  📍 Endpoints:');
      console.log(`     • Health:              GET  /health`);
      console.log(`     • MCP Protocol:        POST /mcp`);
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
      console.log('  📝 Cursor Configuration:');
      console.log('  {');
      console.log('    "mcpServers": {');
      console.log('      "abap-adt-thin-http": {');
      console.log(`        "url": "http://localhost:${HTTP_PORT}/mcp"`);
      if (HTTP_API_KEY) {
        console.log('        ,"headers": {');
        console.log(`          "X-API-Key": "${HTTP_API_KEY}"`);
        console.log('        }');
      }
      console.log('      }');
      console.log('    }');
      console.log('  }');
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
