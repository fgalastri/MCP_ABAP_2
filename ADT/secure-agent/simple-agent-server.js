#!/usr/bin/env node

/**
 * Simple Agent - HTTP Server Mode
 * 
 * Purpose: Run the local agent as an HTTP server
 * Receives call specifications via HTTP POST and executes them
 * 
 * This allows the Cursor client to send call specs to the local agent
 * which then executes the HTTP calls to S/4 HANA (inside VPN)
 * 
 * Usage:
 *   node simple-agent-server.js
 *   PORT=3001 node simple-agent-server.js
 */

import express from 'express';
import { executeCall } from './simple-agent.js';

const PORT = process.env.PORT || 3001;
const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS (allow requests from Cursor/localhost)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Simple Agent - HTTP Server',
    timestamp: new Date().toISOString(),
    purpose: 'Execute HTTP calls to S/4 HANA (inside VPN)'
  });
});

// Execute call specification
app.post('/execute', async (req, res) => {
  const callSpec = req.body;
  
  if (!callSpec || !callSpec.method || !callSpec.url) {
    return res.status(400).json({
      error: 'Invalid call specification',
      message: 'Call spec must include method and url'
    });
  }
  
  console.error(`\n[HTTP SERVER] Received call spec:`);
  console.error(`  Method: ${callSpec.method}`);
  console.error(`  URL: ${callSpec.url}`);
  
  try {
    const response = await executeCall(callSpec);
    
    // Return the response
    res.json({
      success: !response.error,
      response: response
    });
    
  } catch (error) {
    console.error(`[HTTP SERVER] Error executing call: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    availableEndpoints: [
      'GET  /health',
      'POST /execute'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(`[HTTP SERVER] Error: ${err.message}`);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🛡️  Simple Agent - HTTP Server Mode');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  ✅ HTTP Server:           http://localhost:${PORT}`);
  console.log(`  ✅ Purpose:               Execute HTTP calls to S/4 HANA`);
  console.log(`  ✅ Location:              Inside VPN (local machine)`);
  console.log('');
  console.log('  📍 Endpoints:');
  console.log(`     • Health Check:        GET  /health`);
  console.log(`     • Execute Call:        POST /execute`);
  console.log('');
  console.log('  🔐 Security:              Credentials loaded from local config');
  console.log('  🌐 Network:               VPN access to S/4 HANA required');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down...');
  server.close(() => {
    console.log('✅ Simple Agent HTTP server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Received SIGTERM...');
  server.close(() => {
    console.log('✅ Simple Agent HTTP server stopped');
    process.exit(0);
  });
});
