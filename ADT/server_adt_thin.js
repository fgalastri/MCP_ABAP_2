#!/usr/bin/env node

/**
 * ABAP ADT MCP Server - Thin Client Mode
 * 
 * This is a wrapper around the main server_adt.js that enables thin client mode.
 * 
 * How it works:
 * 1. Loads the main MCP server
 * 2. Intercepts HTTP calls from ADT services
 * 3. Executes them via thin client (local credentials)
 * 4. Returns results back to MCP
 * 
 * Benefits:
 * - Remote MCP can be outside customer VPN
 * - Credentials stay local (never sent to remote MCP)
 * - No firewall changes needed
 * - Simple architecture (no encryption needed inside VPN)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { enableThinClient } from './thin-client-adapter.js';
import { createLogger, parseAdtError } from './adt-utils.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AdtServiceBase } from './adt-service-base.js';
import { XMLParser } from 'fast-xml-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.error('\n═══════════════════════════════════════════════════════════════');
console.error('  🚀 ABAP ADT MCP Server - THIN CLIENT MODE');
console.error('═══════════════════════════════════════════════════════════════\n');

// Load configuration
const CONFIG_FILE = path.join(__dirname, 'sap_systems.json');
const CURRENT_SYSTEM_FILE = path.join(__dirname, 'current_system.json');

let SAP_CONFIG;
let currentSystemName = 'DEV';

try {
  const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
  const config = JSON.parse(configData);
  
  // Get current system
  if (fs.existsSync(CURRENT_SYSTEM_FILE)) {
    const currentData = JSON.parse(fs.readFileSync(CURRENT_SYSTEM_FILE, 'utf8'));
    currentSystemName = currentData.activeSystem || currentData.system || 'DEV';
  }
  
  // Skip BTP for thin client (use local mode for BTP)
  if (currentSystemName === 'BTP') {
    console.error('⚠️  BTP detected - switching to DEV');
    console.error('   (BTP uses local mode, not thin client)\n');
    currentSystemName = 'DEV';
  }
  
  SAP_CONFIG = config.systems[currentSystemName];
  
  if (!SAP_CONFIG) {
    throw new Error(`System ${currentSystemName} not found in configuration`);
  }
  
  console.error(`📍 Target System: ${currentSystemName} (${SAP_CONFIG.name || 'Unknown'})`);
  console.error(`🌐 Base URL: ${SAP_CONFIG.baseUrl}`);
  console.error(`👤 Client: ${SAP_CONFIG.client}`);
  console.error(`👤 User: ${SAP_CONFIG.username || 'N/A'}`);
  console.error(`🌐 Language: ${SAP_CONFIG.language || 'EN'}`);
  console.error(`\n🔧 Mode: THIN CLIENT (credentials stay local)`);
  console.error('═══════════════════════════════════════════════════════════════\n');
  
} catch (error) {
  console.error(`❌ Error loading configuration: ${error.message}`);
  console.error('   Make sure sap_systems.json exists and is valid JSON.\n');
  process.exit(1);
}

// Create MCP server
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

// Create logger
const logFile = path.join(__dirname, `adt_debug_thin_${currentSystemName.toLowerCase()}.log`);
const log = createLogger(`thin-${currentSystemName}`, logFile);

// Create a complete ADT Service class with all methods (like server_adt.js)
class AdtService extends AdtServiceBase {
  constructor() {
    super(SAP_CONFIG, log, () => []);  // No BTP cookies for thin client
  }
  
  // The base class now has initialize(), getCsrfToken(), etc.
  // We just need to add the methods that call them
  
  async readSource(objectName, objectType) {
    const uri = this.buildSourceUri(objectName, objectType);
    const response = await this.client.get(uri, {
      headers: { 'Accept': 'text/plain' }
    });
    return response.data;
  }
  
  async executeSqlQuery(sqlQuery, maxRows = 100, client = null) {
    try {
      // Security check
      const normalizedQuery = sqlQuery.trim().toUpperCase();
      if (!normalizedQuery.startsWith('SELECT')) {
        return {
          success: false,
          error: 'Only SELECT statements are allowed'
        };
      }
      
      await this.getCsrfToken();
      
      const queryUrl = `/sap/bc/adt/datapreview/freestyle?rowNumber=${maxRows}`;
      const headers = {
        'Accept': 'application/xml, application/vnd.sap.adt.datapreview.table.v1+xml',
        'Content-Type': 'text/plain',
        'X-sap-adt-sessiontype': 'stateful',
        'X-CSRF-Token': this.csrfToken
      };
      
      if (client) {
        headers['sap-client'] = client;
      }
      
      const response = await this.client.post(queryUrl, sqlQuery, { headers });
      
      // Parse using the EXACT working implementation from server_adt.js
      return this.parseSqlQueryResponse(response.data, sqlQuery);
      
    } catch (error) {
      log(`[SQL QUERY] FAILED: ${error.message}`);
      return {
        success: false,
        error: error.message,
        sqlQuery: sqlQuery.substring(0, 200) + '...'
      };
    }
  }
  
  // EXACT copy from server_adt.js (lines 3703-3824)
  parseSqlQueryResponse(xmlData, originalQuery) {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        removeNSPrefix: true,
        textNodeName: '#text',
        parseTagValue: false,
        parseAttributeValue: false
      });

      const parsedData = parser.parse(xmlData);
      const tableData = parsedData['tableData'];
      
      if (!tableData) {
        return {
          success: false,
          error: 'Invalid response format from SAP',
          hint: 'The response does not contain expected data preview structure'
        };
      }

      const totalRows = parseInt(tableData['totalRows'] || '0');
      const executionTime = parseFloat(tableData['queryExecutionTime'] || '0');
      const executedQuery = tableData['executedQueryString'] || '';

      log(`[SQL QUERY] Total rows: ${totalRows}`);
      log(`[SQL QUERY] Execution time: ${executionTime}ms`);

      const columnsData = tableData['columns'];
      
      if (!columnsData) {
        return {
          success: true,
          totalRows: 0,
          executionTime,
          columns: [],
          rows: [],
          message: 'Query executed successfully but returned no columns'
        };
      }

      const columnsArray = Array.isArray(columnsData) ? columnsData : [columnsData];
      const columns = [];
      const columnData = [];

      for (const col of columnsArray) {
        const metadata = col['metadata'];
        const dataSet = col['dataSet'];
        
        if (metadata) {
          columns.push({
            name: metadata['@_name'] || '',
            type: metadata['@_type'] || '',
            description: metadata['@_description'] || '',
            isKeyAttribute: metadata['@_keyAttribute'] === 'true',
            isKeyFigure: metadata['@_isKeyFigure'] === 'true'
          });

          if (dataSet && dataSet['data']) {
            const dataValues = dataSet['data'];
            const valuesArray = Array.isArray(dataValues) ? dataValues : [dataValues];
            
            const extractedValues = valuesArray.map(v => {
              if (typeof v === 'object') {
                return v['#text'] !== undefined ? v['#text'] : (v || '');
              }
              return v !== undefined ? v : '';
            });
            
            columnData.push(extractedValues);
          } else {
            columnData.push([]);
          }
        }
      }

      const numRows = columnData.length > 0 ? columnData[0].length : 0;
      const rows = [];

      for (let i = 0; i < numRows; i++) {
        const row = {};
        for (let j = 0; j < columns.length; j++) {
          row[columns[j].name] = columnData[j][i] || '';
        }
        rows.push(row);
      }

      log(`[SQL QUERY] SUCCESS: Parsed ${columns.length} columns, ${rows.length} rows`);

      return {
        success: true,
        totalRows,
        executionTime,
        columns,
        rows,
        executedQuery,
        originalQuery: originalQuery.substring(0, 500)
      };

    } catch (error) {
      log(`[SQL QUERY] XML parsing failed: ${error.message}`);
      return {
        success: false,
        error: `Failed to parse response: ${error.message}`,
        hint: 'The XML response from SAP could not be parsed',
        rawData: xmlData?.substring(0, 500)
      };
    }
  }
}

// Create ADT service with thin client enabled
let adtService;
async function initializeAdtService() {
  try {
    adtService = new AdtService();
    
    // Enable thin client mode (intercepts HTTP calls)
    enableThinClient(adtService);
    
    // Initialize the service (authenticate, get CSRF token, etc.)
    await adtService.initialize();
    
    console.error('✅ ADT Service initialized with thin client\n');
  } catch (error) {
    console.error(`❌ Error initializing ADT service: ${error.message}\n`);
    process.exit(1);
  }
}

// Import and register all tools (same as main server)
// For now, let's register a few key tools to test

server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('[DEBUG] ListTools handler called!');
  return {
    tools: [
      {
        name: 'thin_read_source',
        description: '[THIN CLIENT] Read ABAP object source code from SAP system',
        inputSchema: {
          type: 'object',
          properties: {
            object_name: {
              type: 'string',
              description: 'Name of the ABAP object (e.g., ZCL_MY_CLASS)'
            },
            object_type: {
              type: 'string',
              description: 'Object type: CLAS, INTF, PROG, DDLS, etc.',
              enum: ['CLAS', 'CLASS', 'INTF', 'INTERFACE', 'PROG', 'DDLS', 'BDEF']
            }
          },
          required: ['object_name', 'object_type']
        }
      },
      {
        name: 'thin_execute_sql_query',
        description: '[THIN CLIENT] Execute SQL SELECT query on SAP system',
        inputSchema: {
          type: 'object',
          properties: {
            sql_query: {
              type: 'string',
              description: 'SQL SELECT statement to execute'
            },
            max_rows: {
              type: 'number',
              description: 'Maximum number of rows to return (default: 100)',
              default: 100
            },
            client: {
              type: 'string',
              description: 'Optional: SAP client (e.g., "210", "220")'
            }
          },
          required: ['sql_query']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error(`\n[THIN CLIENT] 🎯 HANDLER CALLED 🎯`);
  console.error(`[THIN CLIENT] Request received: ${JSON.stringify(request.params, null, 2)}\n`);
  
  try {
    const { name: toolName, arguments: args } = request.params;
    
    console.error(`\n[THIN CLIENT] ========================================`);
    console.error(`[THIN CLIENT] Tool called: ${toolName}`);
    console.error(`[THIN CLIENT] Arguments: ${JSON.stringify(args, null, 2)}`);
    console.error(`[THIN CLIENT] ========================================\n`);
    
    let result;
    
    switch (toolName) {
      case 'thin_read_source': {
        result = await adtService.readSource(args.object_name, args.object_type);
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Successfully Read ${args.object_type} ${args.object_name}\n\n\`\`\`abap\n${result}\n\`\`\``
            }
          ]
        };
      }
      
      case 'thin_execute_sql_query': {
        console.error(`\n[THIN CLIENT] === SQL QUERY START ===`);
        console.error(`[THIN CLIENT] Query: ${args.sql_query.substring(0, 100)}`);
        console.error(`[THIN CLIENT] Max rows: ${args.max_rows || 100}`);
        console.error(`[THIN CLIENT] Client: ${args.client || 'default'}`);
        
        const maxRows = args.max_rows || 100;
        result = await adtService.executeSqlQuery(args.sql_query, maxRows, args.client);
        
        console.error(`[THIN CLIENT] Result success: ${result.success}`);
        if (!result.success) {
          console.error(`[THIN CLIENT] Error: ${result.error}`);
        }
        console.error(`[THIN CLIENT] === SQL QUERY END ===\n`);
        
        if (result.success) {
          let responseText = `✅ SQL Query Executed Successfully\n\n`;
          responseText += `**Query Summary:**\n`;
          responseText += `- Total Rows Found: ${result.totalRows}\n`;
          responseText += `- Rows Returned: ${result.rows.length}\n`;
          responseText += `- Columns: ${result.columns.length}\n\n`;
          
          // Format results table
          const columnHeaders = result.columns.map(c => c.name).join(' | ');
          const separator = result.columns.map(() => '---').join(' | ');
          
          const displayRows = result.rows.slice(0, 20);
          const tableRows = displayRows.map(row => {
            return result.columns.map(col => {
              const value = row[col.name];
              const strValue = String(value || '').trim();
              return strValue.length > 50 ? strValue.substring(0, 47) + '...' : strValue;
            }).join(' | ');
          }).join('\n');
          
          responseText += `**Results:**\n| ${columnHeaders} |\n| ${separator} |\n| ${tableRows} |\n`;
          
          return {
            content: [{ type: 'text', text: responseText }]
          };
        } else {
          return {
            content: [{ type: 'text', text: `❌ SQL Query Failed\n\n${result.error}` }],
            isError: true
          };
        }
      }
      
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
    
  } catch (error) {
    console.error(`\n[THIN CLIENT] ❌ EXCEPTION CAUGHT ❌`);
    console.error(`[THIN CLIENT] Error: ${error.message}`);
    console.error(`[THIN CLIENT] Stack: ${error.stack}\n`);
    
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error: ${error.message}\n\nStack: ${error.stack}`
        }
      ],
      isError: true
    };
  }
});

// Start server
async function main() {
  // Initialize ADT service first
  await initializeAdtService();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('✅ MCP Server ready for connections (thin client mode)\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
