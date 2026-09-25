import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.error('[BUILD] Building complete thin client V2 with all tools...');

// Read the current thin client (has the ThinClientHttp class)
const thinClientContent = fs.readFileSync(path.join(__dirname, 'server_adt_thin_v2.js'), 'utf8');

// Read the original server (has all 40 tools and handlers)
const originalContent = fs.readFileSync(path.join(__dirname, 'server_adt.js'), 'utf8');

// Find the tools list start in the original
const toolsListStart = originalContent.indexOf('server.setRequestHandler(ListToolsRequestSchema');
const toolsListEnd = originalContent.indexOf('});', toolsListStart) + 3;
const fullToolsList = originalContent.substring(toolsListStart, toolsListEnd);

// Find the switch handlers in the original
const handlersStart = originalContent.indexOf('server.setRequestHandler(CallToolRequestSchema', toolsListEnd);
const handlersEnd = originalContent.lastIndexOf('export { server };');
const fullHandlers = originalContent.substring(handlersStart, handlersEnd);

// Replace ALL instances of 'adt_' with 'thin_v2_' in tool names and handlers
const modifiedToolsList = fullToolsList.replace(/'adt_/g, "'thin_v2_");
const modifiedHandlers = fullHandlers.replace(/'adt_/g, "'thin_v2_");

// Build the complete thin client
const output = `import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// CONFIGURATION
// ============================================================

const loadConfig = (systemKey) => {
  const configFile = path.join(__dirname, 'sap_systems.json');
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  return config.systems[systemKey];
};

const loadCurrentSystem = () => {
  const stateFile = path.join(__dirname, 'current_system.json');
  if (fs.existsSync(stateFile)) {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    return state.activeSystem;
  }
  return 'DEV';
};

let ACTIVE_SYSTEM_KEY = loadCurrentSystem();
let SAP_CONFIG = loadConfig(ACTIVE_SYSTEM_KEY);

console.error(\`
═══════════════════════════════════════════════════════════════
  🚀 ABAP ADT MCP Server - THIN CLIENT V2
  📦 Based on WORKING server_adt.js - ALL 40 TOOLS
═══════════════════════════════════════════════════════════════
\`);
console.error(\`📍 Target System: \${ACTIVE_SYSTEM_KEY} (\${SAP_CONFIG.name})\`);
console.error(\`🌐 Base URL: \${SAP_CONFIG.baseUrl}\`);
console.error(\`👤 Client: \${SAP_CONFIG.client}\`);
console.error(\`👤 User: \${SAP_CONFIG.username}\`);
console.error(\`🔧 Mode: THIN CLIENT (credentials stay local)\\n\`);

// ============================================================
// THIN CLIENT HTTP CLASS
// ============================================================

class ThinClientHttp {
  constructor(baseURL, defaultHeaders = {}) {
    this.defaults = {
      baseURL,
      headers: defaultHeaders
    };
  }

  async request(config) {
    // Ensure config.headers exists
    if (!config.headers) {
      config.headers = {};
    }
    
    // Build full URL
    const url = config.url.startsWith('http') 
      ? config.url 
      : \`\${this.defaults.baseURL}\${config.url}\`;

    // Merge headers
    const headers = {
      ...this.defaults.headers,
      ...config.headers
    };

    // Create call spec
    const callSpec = {
      method: config.method || 'GET',
      url,
      headers,
      data: config.data || null,
      responseType: config.responseType || 'text',
      cookies: config.cookies || {} // ADD COOKIES TO SPEC
    };

    // Execute via thin client adapter
    const { executeThinClientRequest } = await import('./thin-client-adapter.js');
    return await executeThinClientRequest(callSpec);
  }

  get(url, config = {}) {
    return this.request({ ...config, method: 'GET', url });
  }

  post(url, data, config = {}) {
    return this.request({ ...config, method: 'POST', url, data });
  }

  put(url, data, config = {}) {
    return this.request({ ...config, method: 'PUT', url, data });
  }

  delete(url, config = {}) {
    return this.request({ ...config, method: 'DELETE', url });
  }
}

// ============================================================
// ADT SERVICE (Uses ThinClientHttp instead of axios)
// ============================================================

// Import the base ADT service
const { AdtServiceBase } = await import('./adt-service-base.js');

class AdtService extends AdtServiceBase {
  _createHttpClient() {
    // Create thin client HTTP instead of axios
    const client = new ThinClientHttp(this.config.baseUrl, {
      'Accept': 'application/xml,text/plain,*/*',
      'Content-Type': 'application/xml',
    });

    // Store for cookie management
    this.client = client;
    
    return client;
  }

  _setupInterceptors() {
    // Wrap the request method to add cookies and logging
    const originalRequest = this.client.request.bind(this.client);
    
    this.client.request = async (config) => {
      // Ensure headers exist
      if (!config.headers) {
        config.headers = {};
      }
      
      // Add cookies (same as axios interceptor)
      if (this.cookies.size > 0 && !config.headers.Cookie) {
        config.headers.Cookie = Array.from(this.cookies.values()).join('; ');
        this.log(\`[INTERCEPTOR] Added \${this.cookies.size} cookies to request\`);
      }
      
      // Add request ID
      const { randomUUID } = await import('crypto');
      const requestId = randomUUID().replace(/-/g, '');
      config.headers['sap-adt-request-id'] = requestId;
      
      // Add cookies to the config so thin client can access them
      config.cookies = Object.fromEntries(this.cookies);
      
      // Call original request
      const response = await originalRequest(config);
      
      // Extract and store cookies from response
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        cookies.forEach(cookie => {
          const [nameValue] = cookie.split(';');
          const [name, value] = nameValue.split('=');
          if (name && value) {
            this.cookies.set(name.trim(), \`\${name.trim()}=\${value.trim()}\`);
          }
        });
      }
      
      return response;
    };
  }
}

// ============================================================
// INITIALIZE ADT SERVICE
// ============================================================

const { createLogger } = await import('./adt-service-base.js');
const log = createLogger('THIN-V2');

const adtService = new AdtService(SAP_CONFIG, log);
await adtService.initialize();

// ============================================================
// MCP SERVER
// ============================================================

const server = new Server(
  {
    name: 'abap-adt-thin-v2',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================================
// ALL 40 TOOLS (Renamed from adt_* to thin_v2_*)
// ============================================================

${modifiedToolsList}

// ============================================================
// ALL 40 HANDLERS (Renamed from adt_* to thin_v2_*)
// ============================================================

${modifiedHandlers}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { server };
`;

fs.writeFileSync(path.join(__dirname, 'server_adt_thin_v2_COMPLETE.js'), output, 'utf8');
console.error('[BUILD] ✅ Complete thin client V2 created!');
console.error('[BUILD] 📄 Output: server_adt_thin_v2_COMPLETE.js');
console.error('[BUILD] 📊 File size:', output.length, 'bytes');
