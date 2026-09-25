#!/usr/bin/env node

/**
 * ABAP ADT MCP Server - HTTP Mode
 * 
 * Exposes MCP tools as HTTP REST endpoints for remote access.
 * Can run standalone or alongside the stdio MCP server.
 * 
 * Usage:
 *   node server_http.js
 *   HTTP_PORT=3000 HTTP_API_KEY=your-secret-key node server_http.js
 * 
 * Environment Variables:
 *   HTTP_PORT: Port to listen on (default: 3000)
 *   HTTP_API_KEY: API key for authentication (required for security)
 *   SAP_SYSTEM: Which SAP system to use (DEV/QA/BTP, default: DEV)
 */

import express from 'express';
import { createLogger, parseAdtError } from './adt-utils.js';
import { loadConfig, validateConfig, loadBtpCookies } from './adt-config.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import the full AdtService class from server_adt.js
// We'll dynamically import it to avoid circular dependencies
let AdtService = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const HTTP_PORT = process.env.HTTP_PORT || 3000;
const HTTP_API_KEY = process.env.HTTP_API_KEY || null;
const REQUIRE_AUTH = process.env.REQUIRE_AUTH !== 'false'; // Default: true

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
let SERVER_ID = SAP_CONFIG.serverId + '-http';
let logFile = path.join(__dirname, `adt_http_${SAP_CONFIG.systemKey.toLowerCase()}.log`);
let log = createLogger(SERVER_ID, logFile);

// Validate config
try {
  validateConfig(SAP_CONFIG);
} catch (error) {
  console.error(`❌ ERROR: ${error.message}`);
  process.exit(1);
}

// Helper function to load BTP cookies
function loadBtpCookiesWrapper() {
  return loadBtpCookies(SAP_CONFIG.btpCookiesFile, log);
}

// Create Express app
const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS middleware (allow all origins for now, can be restricted)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Logging middleware
app.use((req, res, next) => {
  log(`[HTTP] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Authentication middleware
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
      message: 'Invalid or missing API key. Use X-API-Key header or Authorization: Bearer <key>'
    });
  }

  next();
}

// Apply auth to all /api/* routes
app.use('/api', authMiddleware);

// Create ADT Service instance (shared across requests)
let adtService = null;

async function getAdtService() {
  // Lazy load AdtService to avoid circular dependencies
  if (!AdtService) {
    // For HTTP mode, we'll create a minimal service that calls the methods directly
    // This is simpler than trying to import the full AdtService class
    return createMinimalAdtService();
  }
  
  if (!adtService) {
    adtService = new AdtService();
  }
  return adtService;
}

// Create a minimal ADT service with the most common methods
function createMinimalAdtService() {
  // We'll use axios directly for HTTP mode
  // This is a simplified version that doesn't need the full AdtService class
  return {
    readSource: async (objectName, objectType) => {
      throw new Error('Not implemented in HTTP mode yet - use stdio mode');
    },
    executeSqlQuery: async (sqlQuery, maxRows, client) => {
      throw new Error('Not implemented in HTTP mode yet - use stdio mode');
    },
    executeClass: async (className, client) => {
      throw new Error('Not implemented in HTTP mode yet - use stdio mode');
    },
    saveSource: async (objectName, objectType, sourceCode) => {
      throw new Error('Not implemented in HTTP mode yet - use stdio mode');
    },
    activate: async (objects) => {
      throw new Error('Not implemented in HTTP mode yet - use stdio mode');
    },
    checkSyntax: async (objectName, objectType, version) => {
      throw new Error('Not implemented in HTTP mode yet - use stdio mode');
    },
    runTests: async (objectName, objectType, client) => {
      throw new Error('Not implemented in HTTP mode yet - use stdio mode');
    },
    createClass: async (className, description, packageName, transportRequest, options) => {
      throw new Error('Not implemented in HTTP mode yet - use stdio mode');
    },
    listPackageObjects: async (packageName, objectType) => {
      throw new Error('Not implemented in HTTP mode yet - use stdio mode');
    }
  };
}

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'ABAP ADT MCP Server (HTTP Mode)',
    system: SAP_CONFIG.systemKey,
    baseUrl: SAP_CONFIG.baseUrl,
    client: SAP_CONFIG.client,
    timestamp: new Date().toISOString()
  });
});

// List available tools endpoint
app.get('/api/tools', (req, res) => {
  res.json({
    tools: [
      'adt_switch_system',
      'adt_read_source',
      'adt_save_source',
      'adt_execute_sql_query',
      'adt_execute_class',
      'adt_activate',
      'adt_check_syntax',
      'adt_run_tests',
      'adt_create_class',
      'adt_create_table',
      'adt_list_package_objects',
      // ... add more as needed
    ],
    note: 'Use POST /api/tools/{tool_name} to execute a tool'
  });
});

// Generic tool execution endpoint
app.post('/api/tools/:toolName', async (req, res) => {
  const { toolName } = req.params;
  const args = req.body;

  log(`[TOOL] Executing: ${toolName} with args: ${JSON.stringify(args)}`);

  try {
    const service = await getAdtService();
    let result;

    // Route to appropriate service method
    switch (toolName) {
      case 'adt_switch_system':
        result = await handleSwitchSystem(args);
        break;

      case 'adt_read_source':
        result = await service.readSource(args.object_name, args.object_type);
        break;

      case 'adt_execute_sql_query':
        result = await service.executeSqlQuery(args.sql_query, args.max_rows || 100, args.client);
        break;

      case 'adt_execute_class':
        result = await service.executeClass(args.class_name, args.client);
        break;

      case 'adt_save_source':
        result = await service.saveSource(args.object_name, args.object_type, args.source_code);
        break;

      case 'adt_activate':
        result = await service.activate(args.objects);
        break;

      case 'adt_check_syntax':
        result = await service.checkSyntax(args.object_name, args.object_type, args.version || 'inactive');
        break;

      case 'adt_run_tests':
        result = await service.runTests(args.object_name, args.object_type || 'CLAS', args.client);
        break;

      case 'adt_create_class':
        result = await service.createClass(
          args.class_name,
          args.description,
          args.package_name,
          args.transport_request,
          {
            final: args.final !== false,
            visibility: args.visibility || 'public'
          }
        );
        break;

      case 'adt_list_package_objects':
        result = await service.listPackageObjects(args.package_name, args.object_type);
        break;

      default:
        return res.status(404).json({
          error: 'Tool not found',
          tool: toolName,
          available: 'GET /api/tools for list'
        });
    }

    res.json({
      success: true,
      tool: toolName,
      result: result
    });

  } catch (error) {
    log(`[ERROR] Tool execution failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// System switch handler
async function handleSwitchSystem(args) {
  const targetSystem = args.system?.toUpperCase();
  const validSystems = ['DEV', 'QA', 'BTP'];

  if (!validSystems.includes(targetSystem)) {
    throw new Error(`Invalid system: ${args.system}. Choose from: ${validSystems.join(', ')}`);
  }

  try {
    // Save to state file
    const stateFile = path.join(__dirname, 'current_system.json');
    fs.writeFileSync(stateFile, JSON.stringify({ activeSystem: targetSystem }, null, 2));

    // Reload configuration
    ACTIVE_SYSTEM_KEY = targetSystem;
    SAP_CONFIG = loadConfig(ACTIVE_SYSTEM_KEY);
    validateConfig(SAP_CONFIG);

    // Update logger
    SERVER_ID = SAP_CONFIG.serverId + '-http';
    logFile = path.join(__dirname, `adt_http_${SAP_CONFIG.systemKey.toLowerCase()}.log`);
    log = createLogger(SERVER_ID, logFile);

    // Reset service instance
    adtService = null;

    return {
      message: 'System switched successfully',
      activeSystem: SAP_CONFIG.systemKey,
      baseUrl: SAP_CONFIG.baseUrl,
      client: SAP_CONFIG.client
    };
  } catch (error) {
    throw new Error(`Failed to switch system: ${error.message}`);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  log(`[ERROR] ${err.message}`);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
    message: 'Try GET /health or GET /api/tools'
  });
});

// Start server
const server = app.listen(HTTP_PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🚀 ABAP ADT MCP Server - HTTP Mode');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  ✅ Server running on:     http://localhost:${HTTP_PORT}`);
  console.log(`  ✅ SAP System:            ${SAP_CONFIG.systemKey} (${SAP_CONFIG.serverId})`);
  console.log(`  ✅ Base URL:              ${SAP_CONFIG.baseUrl}`);
  console.log(`  ✅ Client:                ${SAP_CONFIG.client}`);
  console.log(`  ✅ Auth Mode:             ${SAP_CONFIG.authMode}`);
  console.log('');
  console.log('  📍 Endpoints:');
  console.log(`     • Health:              GET  http://localhost:${HTTP_PORT}/health`);
  console.log(`     • List Tools:          GET  http://localhost:${HTTP_PORT}/api/tools`);
  console.log(`     • Execute Tool:        POST http://localhost:${HTTP_PORT}/api/tools/{tool_name}`);
  console.log('');
  
  if (REQUIRE_AUTH) {
    if (HTTP_API_KEY) {
      console.log('  🔐 Authentication:        ENABLED');
      console.log(`     • API Key:             ${HTTP_API_KEY.substring(0, 4)}${'*'.repeat(HTTP_API_KEY.length - 4)}`);
      console.log('     • Header:              X-API-Key: your-api-key');
    } else {
      console.log('  ⚠️  Authentication:        DISABLED (no HTTP_API_KEY set)');
      console.log('     • Set HTTP_API_KEY environment variable for security');
    }
  } else {
    console.log('  ⚠️  Authentication:        DISABLED (REQUIRE_AUTH=false)');
  }
  
  console.log('');
  console.log('  📝 Log File:              ' + logFile);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  
  log('[HTTP SERVER] Started successfully');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down HTTP server...');
  server.close(() => {
    log('[HTTP SERVER] Shut down gracefully');
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Received SIGTERM, shutting down...');
  server.close(() => {
    log('[HTTP SERVER] Shut down gracefully');
    process.exit(0);
  });
});
