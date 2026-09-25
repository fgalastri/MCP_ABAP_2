#!/usr/bin/env node

/**
 * ABAP ADT MCP HTTP Client (Stdio Mode)
 * 
 * This is an MCP server that acts as a client to the HTTP MCP server.
 * It accepts stdio MCP protocol calls and forwards them to the HTTP server.
 * 
 * This allows Cursor to use the HTTP MCP server as if it were a local MCP server.
 * 
 * Usage in Cursor's mcp.json:
 * {
 *   "mcpServers": {
 *     "abap-adt-http": {
 *       "command": "node",
 *       "args": ["path/to/server_http_client.js"],
 *       "env": {
 *         "HTTP_BASE_URL": "http://localhost:3000",
 *         "HTTP_API_KEY": "natura-mcp-2026"
 *       }
 *     }
 *   }
 * }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

// Configuration from environment
const HTTP_BASE_URL = process.env.HTTP_BASE_URL || 'http://localhost:3000';
const HTTP_API_KEY = process.env.HTTP_API_KEY || '';

// Create axios client for HTTP MCP server
const httpClient = axios.create({
  baseURL: HTTP_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': HTTP_API_KEY
  },
  timeout: 60000 // 60 seconds
});

// Create MCP server
const server = new Server(
  {
    name: 'abap-adt-http-client',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Cache for tools list
let cachedTools = null;

/**
 * Fetch available tools from HTTP server
 */
async function fetchTools() {
  if (cachedTools) {
    return cachedTools;
  }

  try {
    const response = await httpClient.get('/api/tools');
    
    // Convert HTTP response to MCP tools format
    if (response.data && response.data.tools) {
      cachedTools = response.data.tools.map(tool => ({
        name: tool.name,
        description: tool.description || `Execute ${tool.name} via HTTP`,
        inputSchema: tool.inputSchema || {
          type: 'object',
          properties: {},
          required: []
        }
      }));
    } else {
      // Fallback to basic tool list
      cachedTools = [
        {
          name: 'adt_switch_system',
          description: '⚠️ CRITICAL: Before using this tool, read ALWAYS_READ.md for mandatory rules and patterns. Switch between SAP systems (DEV/QA/BTP)',
          inputSchema: {
            type: 'object',
            properties: {
              system: {
                type: 'string',
                description: 'Target system (DEV, QA, or BTP)',
                enum: ['DEV', 'QA', 'BTP', 'dev', 'qa', 'btp']
              }
            },
            required: ['system']
          }
        },
        {
          name: 'adt_read_source',
          description: '⚠️ CRITICAL: Before using this tool, read ALWAYS_READ.md for mandatory rules and patterns. Read ABAP object source code',
          inputSchema: {
            type: 'object',
            properties: {
              object_name: {
                type: 'string',
                description: 'Name of the ABAP object'
              },
              object_type: {
                type: 'string',
                description: 'Object type (CLAS, INTF, PROG, etc.)'
              }
            },
            required: ['object_name', 'object_type']
          }
        },
        {
          name: 'adt_execute_sql_query',
          description: '⚠️ CRITICAL: Before using this tool, read ALWAYS_READ.md for mandatory rules and patterns. Execute SQL SELECT queries',
          inputSchema: {
            type: 'object',
            properties: {
              sql_query: {
                type: 'string',
                description: 'SQL SELECT statement'
              },
              max_rows: {
                type: 'number',
                description: 'Maximum rows to return (default: 100)'
              }
            },
            required: ['sql_query']
          }
        }
      ];
    }
    
    return cachedTools;
  } catch (error) {
    console.error('[HTTP CLIENT] Failed to fetch tools:', error.message);
    throw new Error(`Failed to connect to HTTP MCP server: ${error.message}`);
  }
}

/**
 * Execute tool via HTTP server
 */
async function executeToolViaHttp(toolName, args) {
  try {
    const response = await httpClient.post(`/api/tools/${toolName}`, args);
    
    if (response.data && response.data.success) {
      return response.data.result;
    } else if (response.data && response.data.error) {
      throw new Error(response.data.error);
    } else {
      return response.data.result || JSON.stringify(response.data);
    }
  } catch (error) {
    if (error.response) {
      // HTTP error response
      const errorMsg = error.response.data?.message || error.response.data?.error || error.message;
      throw new Error(`HTTP Error (${error.response.status}): ${errorMsg}`);
    } else if (error.request) {
      // No response received
      throw new Error(`No response from HTTP server: ${error.message}`);
    } else {
      // Other error
      throw new Error(`Request failed: ${error.message}`);
    }
  }
}

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = await fetchTools();
  return { tools };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await executeToolViaHttp(name, args || {});
    
    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ **Error executing ${name}**\n\n${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  
  console.error('═══════════════════════════════════════════════════');
  console.error('🌐 ABAP ADT MCP HTTP Client');
  console.error('═══════════════════════════════════════════════════');
  console.error('');
  console.error(`📡 HTTP Server:      ${HTTP_BASE_URL}`);
  console.error(`🔐 API Key:          ${HTTP_API_KEY ? '✓ Configured' : '⚠️  Not set'}`);
  console.error('');
  console.error('═══════════════════════════════════════════════════');
  console.error('');
  console.error('✅ HTTP MCP Client ready for connections');
  console.error('');
  
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
