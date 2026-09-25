#!/usr/bin/env node

/**
 * HTTP MCP Server with Auto-Recovery
 * 
 * This enhanced version automatically detects SAP session timeouts
 * and restarts the backend connection without stopping the HTTP server.
 * 
 * Features:
 * - Automatic detection of SAP session timeouts
 * - Auto-restart of backend MCP server on connection errors
 * - Keeps HTTP server running continuously
 * - Health monitoring and recovery logging
 */

import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load active system
function loadActiveSystem() {
  const stateFile = path.join(__dirname, 'current_system.json');
  try {
    if (fs.existsSync(stateFile)) {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      return state.activeSystem || process.env.SAP_SYSTEM || 'DEV';
    }
  } catch (error) {
    console.error(`Failed to load state file: ${error.message}`);
  }
  return process.env.SAP_SYSTEM || 'DEV';
}

// Configuration
const HTTP_PORT = process.env.HTTP_PORT || 3000;
const HTTP_API_KEY = process.env.HTTP_API_KEY || 'your-secret-key';
const REQUIRE_AUTH = process.env.REQUIRE_AUTH !== 'false';
const SAP_SYSTEM = loadActiveSystem();

// State management
let mcpProcess = null;
let isRestarting = false;
let restartCount = 0;
let lastRestartTime = null;

// Express app
const app = express();
app.use(express.json());

// Logging
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    INFO: '📘',
    WARN: '⚠️',
    ERROR: '❌',
    SUCCESS: '✅',
    RECOVERY: '🔄'
  }[level] || '📝';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Start MCP backend server
function startMcpServer() {
  if (isRestarting) {
    log('WARN', 'Restart already in progress, skipping...');
    return;
  }

  isRestarting = true;
  
  log('INFO', '🚀 Starting MCP backend server...');
  
  const env = {
    ...process.env,
    SAP_SYSTEM: SAP_SYSTEM
  };

  mcpProcess = spawn('node', ['server_adt.js'], {
    cwd: __dirname,
    env: env,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let buffer = '';

  mcpProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    
    // Process complete messages
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer

    lines.forEach(line => {
      if (line.trim()) {
        try {
          // Check if it's a JSON-RPC message
          if (line.includes('"jsonrpc"')) {
            // Log JSON-RPC traffic at debug level if needed
            // console.log('MCP:', line.substring(0, 100) + '...');
          }
        } catch (e) {
          // Non-JSON output, log it
          console.log('MCP:', line);
        }
      }
    });
  });

  mcpProcess.stderr.on('data', (data) => {
    const message = data.toString();
    
    // Detect session timeout or connection errors
    if (message.includes('Session Timed Out') || 
        message.includes('ETIMEDOUT') ||
        message.includes('ECONNREFUSED') ||
        message.includes('401') ||
        message.includes('403')) {
      log('ERROR', 'SAP session error detected:', { error: message.substring(0, 200) });
      scheduleRestart('SAP session error detected');
    } else {
      console.error('MCP Error:', message);
    }
  });

  mcpProcess.on('close', (code) => {
    log('WARN', `MCP process exited with code ${code}`);
    
    if (!isRestarting) {
      scheduleRestart('Process exited unexpectedly');
    }
  });

  mcpProcess.on('error', (err) => {
    log('ERROR', 'Failed to start MCP process:', { error: err.message });
    scheduleRestart('Process start failed');
  });

  setTimeout(() => {
    isRestarting = false;
    restartCount++;
    lastRestartTime = new Date();
    log('SUCCESS', `MCP backend server started successfully (restart #${restartCount})`);
  }, 2000);
}

// Schedule a restart
function scheduleRestart(reason) {
  if (isRestarting) {
    return;
  }

  log('RECOVERY', `Scheduling restart: ${reason}`);
  
  // Kill existing process
  if (mcpProcess) {
    try {
      mcpProcess.kill('SIGTERM');
      setTimeout(() => {
        if (mcpProcess && !mcpProcess.killed) {
          mcpProcess.kill('SIGKILL');
        }
      }, 5000);
    } catch (e) {
      log('WARN', 'Error killing process:', { error: e.message });
    }
  }

  // Wait a bit before restarting
  setTimeout(() => {
    startMcpServer();
  }, 3000);
}

// JSON-RPC communication
let requestId = 1;
const pendingRequests = new Map();

function sendJsonRpcRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    if (!mcpProcess) {
      return reject(new Error('MCP process not running'));
    }

    const id = requestId++;
    const request = {
      jsonrpc: '2.0',
      id: id,
      method: method,
      params: params
    };

    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      
      // Session timeout might have occurred
      if (method.includes('adt_')) {
        log('WARN', 'Request timeout - possible session issue');
        scheduleRestart('Request timeout');
      }
      
      reject(new Error('Request timeout'));
    }, 60000);

    pendingRequests.set(id, { resolve, reject, timeout });

    try {
      mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    } catch (e) {
      clearTimeout(timeout);
      pendingRequests.delete(id);
      
      log('ERROR', 'Failed to send request:', { error: e.message });
      scheduleRestart('Communication error');
      reject(e);
    }
  });
}

// Listen for responses
let responseBuffer = '';

function setupResponseListener() {
  mcpProcess.stdout.on('data', (data) => {
    responseBuffer += data.toString();
    
    const lines = responseBuffer.split('\n');
    responseBuffer = lines.pop();

    lines.forEach(line => {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          
          if (response.id && pendingRequests.has(response.id)) {
            const { resolve, reject, timeout } = pendingRequests.get(response.id);
            clearTimeout(timeout);
            pendingRequests.delete(response.id);

            if (response.error) {
              // Check for session errors
              const errorMsg = JSON.stringify(response.error);
              if (errorMsg.includes('Session Timed Out') || 
                  errorMsg.includes('ETIMEDOUT') ||
                  errorMsg.includes('401') ||
                  errorMsg.includes('403')) {
                log('ERROR', 'SAP session error in response');
                scheduleRestart('SAP session error');
              }
              reject(new Error(response.error.message || 'Unknown error'));
            } else {
              // Also check result for error messages
              if (response.result && response.result.content) {
                const content = Array.isArray(response.result.content) ? 
                  response.result.content.map(c => c.text || '').join(' ') : 
                  response.result.content.text || '';
                
                if (content.includes('Session Timed Out') || 
                    content.includes('ETIMEDOUT') ||
                    content.includes('400 Session Timed Out')) {
                  log('ERROR', 'SAP session timeout detected in response content');
                  scheduleRestart('SAP session timeout in response');
                  // Still resolve but schedule restart for next request
                }
              }
              resolve(response.result);
            }
          }
        } catch (e) {
          // Not a JSON response, ignore
        }
      }
    });
  });
}

// Authentication middleware
function authenticate(req, res, next) {
  if (!REQUIRE_AUTH) {
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  if (apiKey === HTTP_API_KEY) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  // Load current config
  let sapConfig = null;
  try {
    const configPath = path.join(__dirname, 'sap_systems.json');
    const configs = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    sapConfig = configs[SAP_SYSTEM];
  } catch (error) {
    // Ignore config load errors for health check
  }

  const health = {
    status: 'ok',
    httpServer: 'running',
    mcpBackend: mcpProcess && !mcpProcess.killed ? 'running' : 'stopped',
    restartCount: restartCount,
    lastRestart: lastRestartTime,
    uptime: process.uptime(),
    system: SAP_SYSTEM,
    baseUrl: sapConfig?.baseUrl || 'unknown',
    client: sapConfig?.client || 'unknown',
    mcpStatus: mcpProcess && !mcpProcess.killed ? 'running' : 'stopped',
    autoRecovery: 'enabled',
    timestamp: new Date().toISOString()
  };
  res.json(health);
});

// List tools
app.get('/api/tools', authenticate, async (req, res) => {
  try {
    const result = await sendJsonRpcRequest('tools/list');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute tool
app.post('/api/tools/:toolName', authenticate, async (req, res) => {
  try {
    const { toolName } = req.params;
    const params = req.body;

    const result = await sendJsonRpcRequest('tools/call', {
      name: toolName,
      arguments: params
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual restart endpoint
app.post('/api/restart', authenticate, async (req, res) => {
  log('INFO', 'Manual restart requested via API');
  scheduleRestart('Manual restart via API');
  res.json({ status: 'restarting', message: 'MCP backend server restart initiated' });
});

// Start everything
log('INFO', '========================================');
log('INFO', '  HTTP MCP Server with Auto-Recovery');
log('INFO', '========================================');
log('INFO', `Port: ${HTTP_PORT}`);
log('INFO', `Auth: ${REQUIRE_AUTH ? 'Enabled' : 'Disabled'}`);
log('INFO', `SAP System: ${SAP_SYSTEM}`);
log('INFO', `Auto-Recovery: Enabled`);
log('INFO', '========================================');

startMcpServer();
setupResponseListener();

app.listen(HTTP_PORT, () => {
  log('SUCCESS', `🚀 HTTP server listening on port ${HTTP_PORT}`);
  log('INFO', `📡 Health check: http://localhost:${HTTP_PORT}/health`);
  log('INFO', `🔧 Manual restart: POST http://localhost:${HTTP_PORT}/api/restart`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  log('INFO', 'Shutting down gracefully...');
  if (mcpProcess) {
    mcpProcess.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('INFO', 'Shutting down gracefully...');
  if (mcpProcess) {
    mcpProcess.kill('SIGTERM');
  }
  process.exit(0);
});
