#!/usr/bin/env node

/**
 * Thin Client HTTP Bridge for Cursor
 * 
 * This stdio MCP server acts as a bridge:
 * 1. Receives tool calls from Cursor (via stdio)
 * 2. Forwards to remote HTTP MCP server (gets call spec)
 * 3. Executes call spec via local agent (simple-agent-server.js)
 * 4. Returns result to Cursor
 * 
 * This is the piece that runs LOCALLY in Cursor!
 * 
 * ARCHITECTURE:
 * Cursor → [THIS BRIDGE] → Remote HTTP MCP (call spec) → [THIS BRIDGE] → Local Agent → S/4
 * 
 * Usage in mcp.json:
 * {
 *   "abap-adt-thin": {
 *     "command": "node",
 *     "args": ["ADT/server_http_client_thin.js"],
 *     "env": {
 *       "MCP_HTTP_URL": "http://your-remote-server:3000",
 *       "LOCAL_AGENT_URL": "http://localhost:3001"
 *     }
 *   }
 * }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Configuration
const MCP_HTTP_URL = process.env.MCP_HTTP_URL || 'http://localhost:3000';
const LOCAL_AGENT_URL = process.env.LOCAL_AGENT_URL || 'http://localhost:3001';
const HTTP_API_KEY = process.env.HTTP_API_KEY || null;

// Helper to make HTTP requests
async function httpRequest(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (HTTP_API_KEY) {
    headers['X-API-Key'] = HTTP_API_KEY;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return await response.json();
}

// Create server
const server = new Server(
  {
    name: 'abap-adt-thin',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

console.error('[THIN CLIENT BRIDGE] Starting...');
console.error(`[THIN CLIENT BRIDGE] Remote MCP: ${MCP_HTTP_URL}`);
console.error(`[THIN CLIENT BRIDGE] Local Agent: ${LOCAL_AGENT_URL}`);

// List tools - Forward to remote HTTP MCP
server.setRequestHandler(ListToolsRequestSchema, async (request) => {
  try {
    console.error('[THIN CLIENT BRIDGE] Listing tools from remote MCP...');
    
    const result = await httpRequest(`${MCP_HTTP_URL}/api/tools`);
    
    console.error(`[THIN CLIENT BRIDGE] ✅ Got ${result.tools?.length || 0} tools`);
    
    return result;
  } catch (error) {
    console.error(`[THIN CLIENT BRIDGE] ❌ List tools failed: ${error.message}`);
    throw error;
  }
});

// Call tool - Get call spec from remote, execute via local agent
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name: toolName, arguments: args } = request.params;
  
  try {
    console.error(`[THIN CLIENT BRIDGE] Tool: ${toolName}`);
    
    // Step 1: Get call spec from remote HTTP MCP
    console.error('[THIN CLIENT BRIDGE] 1️⃣  Getting call spec from remote MCP...');
    const mcpResponse = await httpRequest(`${MCP_HTTP_URL}/api/tools/${toolName}`, {
      method: 'POST',
      body: JSON.stringify(args)
    });
    
    if (!mcpResponse.success || !mcpResponse.callSpec) {
      throw new Error('Remote MCP did not return a valid call spec');
    }
    
    const callSpec = mcpResponse.callSpec;
    console.error(`[THIN CLIENT BRIDGE] ✅ Got call spec: ${callSpec.method} ${callSpec.url}`);
    
    // Step 2: Execute call spec via local agent
    console.error('[THIN CLIENT BRIDGE] 2️⃣  Executing via local agent...');
    const agentResponse = await httpRequest(`${LOCAL_AGENT_URL}/execute`, {
      method: 'POST',
      body: JSON.stringify(callSpec)
    });
    
    if (agentResponse.error) {
      throw new Error(`Local agent error: ${agentResponse.message || agentResponse.error}`);
    }
    
    console.error(`[THIN CLIENT BRIDGE] ✅ Execution successful (${agentResponse.status})`);
    
    // Step 3: Format response for Cursor
    let responseText = '';
    
    if (agentResponse.data) {
      if (typeof agentResponse.data === 'string') {
        responseText = agentResponse.data;
      } else {
        responseText = JSON.stringify(agentResponse.data, null, 2);
      }
    }
    
    return {
      content: [
        {
          type: 'text',
          text: responseText || 'Success'
        }
      ]
    };
    
  } catch (error) {
    console.error(`[THIN CLIENT BRIDGE] ❌ Error: ${error.message}`);
    
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[THIN CLIENT BRIDGE] ✅ Connected to Cursor via stdio');
  console.error('[THIN CLIENT BRIDGE] 🚀 Ready!');
}

main().catch((error) => {
  console.error(`[THIN CLIENT BRIDGE] Fatal error: ${error.message}`);
  process.exit(1);
});
