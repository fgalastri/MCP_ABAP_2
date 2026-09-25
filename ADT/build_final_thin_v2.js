import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.error('[BUILD FINAL] Creating thin client V2 by patching server_adt.js...');

// Read the original working server
let content = fs.readFileSync(path.join(__dirname, 'server_adt.js'), 'utf8');

// Step 1: Replace all 'adt_' tool names with 'thin_v2_' (in quotes only)
content = content.replace(/'adt_/g, "'thin_v2_");
content = content.replace(/"adt_/g, '"thin_v2_');

// Step 2: Change server name
content = content.replace(
  "name: 'abap-adt',",
  "name: 'abap-adt-thin-v2',"
);
content = content.replace(
  'version: \'1.0.0\'',
  'version: \'2.0.0\''
);

// Step 3: Replace axios with ThinClientHttp
const axiosImport = "import axios from 'axios';";
const thinClientImport = "// import axios from 'axios'; // REPLACED WITH THIN CLIENT";

content = content.replace(axiosImport, thinClientImport);

// Step 4: Inject ThinClientHttp class after imports
const injectAfter = "const __dirname = path.dirname(__filename);";
const thinClientClass = `

// ============================================================
// THIN CLIENT HTTP CLASS (Replaces axios)
// ============================================================

class ThinClientHttp {
  constructor(baseURL, config = {}) {
    this.defaults = {
      baseURL,
      headers: config.headers || {},
      httpsAgent: config.httpsAgent
    };
  }

  async request(config) {
    if (!config.headers) config.headers = {};
    
    const url = config.url.startsWith('http') 
      ? config.url 
      : \`\${this.defaults.baseURL}\${config.url}\`;

    const headers = { ...this.defaults.headers, ...config.headers };
    
    const callSpec = {
      method: config.method || 'GET',
      url,
      headers,
      data: config.data || null,
      responseType: config.responseType || 'text',
      cookies: config.cookies || {}
    };

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

  create(config) {
    return new ThinClientHttp(config.baseURL, config);
  }
}

const axios = ThinClientHttp; // Replace axios with ThinClientHttp`;

content = content.replace(injectAfter, injectAfter + thinClientClass);

// Step 5: Update console header
content = content.replace(
  '🚀 ABAP ADT MCP Server (ON-PREM & BTP)',
  '🚀 ABAP ADT MCP Server - THIN CLIENT V2'
);
content = content.replace(
  'Auth Mode: ${SAP_CONFIG.authMode}',
  'Mode: THIN CLIENT (credentials stay local)'
);

// Write output
fs.writeFileSync(path.join(__dirname, 'server_adt_thin_v2.js'), content, 'utf8');

console.error('[BUILD FINAL] ✅ Thin client V2 created successfully!');
console.error('[BUILD FINAL] 📊 All 40 tools renamed from adt_* to thin_v2_*');
console.error('[BUILD FINAL] 🔧 HTTP layer replaced with ThinClientHttp');
console.error('[BUILD FINAL] 📄 File: server_adt_thin_v2.js');
