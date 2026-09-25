/**
 * ADT Service - Base Module
 * Core authentication, session management, and helper methods
 * All other service modules extend from this base class
 */

import axios from 'axios';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import https from 'https';
import { randomUUID } from 'crypto';
import { parseAdtError } from './adt-utils.js';

// Initialize XML parser and builder
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true
});

/**
 * Base ADT Service Class
 * Provides authentication, session management, and core utilities
 */
export class AdtServiceBase {
  constructor(config, logFunction, loadBtpCookiesFunction) {
    this.config = config;
    this.log = logFunction;
    this.loadBtpCookies = loadBtpCookiesFunction;
    
    this.csrfToken = null;
    this.csrfTokenExpiry = null;
    this.cookies = new Map(); // Use Map to store cookies by name
    this.initialized = false;
    this.securitySessionId = null; // For BTP session management
    this.isBtpMode = config.authMode === 'btp';
    
    // Load BTP cookies if in BTP mode
    if (this.isBtpMode) {
      const btpCookies = this.loadBtpCookies();
      if (btpCookies.length > 0) {
        // Store cookies in the Map
        btpCookies.forEach(cookieString => {
          const cookieValue = cookieString.trim();
          const cookieName = cookieValue.split('=')[0];
          this.cookies.set(cookieName, cookieValue);
        });
        this.log(`[CONFIG] Pre-loaded ${btpCookies.length} BTP cookies`);
      } else {
        this.log('[CONFIG] No BTP cookies found - will attempt session creation');
      }
    }
    
    // Create axios instance with ADT-specific configuration
    // CRITICAL: keepAlive true ensures same TCP connection for lock persistence!
    const axiosConfig = {
      baseURL: config.baseUrl,
      headers: {
        'sap-client': config.client,
        'sap-language': config.language,
        'Accept': 'application/xml,text/plain,*/*',
        'Connection': 'keep-alive'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // For development only
        keepAlive: true,  // CRITICAL: Reuse TCP connection!
        keepAliveMsecs: 30000, // Keep connection alive for 30 seconds
        maxSockets: 1, // Force single connection per host
        maxFreeSockets: 1
      })
    };
    
    // Authentication setup based on mode
    if (this.isBtpMode) {
      // BTP mode: Use OAuth bearer token if provided
      if (config.oauthToken) {
        axiosConfig.headers['Authorization'] = `Bearer ${config.oauthToken}`;
      }
      this.log('[CONFIG] Using BTP authentication mode');
    } else {
      // On-premise mode: Use basic auth
      axiosConfig.auth = {
        username: config.username,
        password: config.password
      };
      this.log('[CONFIG] Using basic authentication mode (on-premise)');
    }
    
    this.client = axios.create(axiosConfig);

    // Session management interceptors
    this.client.interceptors.request.use(request => {
      // Add cookies for session (merge all cookies from Map)
      // IMPORTANT: Only set if not already set (for client override support)
      if (this.cookies.size > 0 && !request.headers.Cookie) {
        request.headers.Cookie = Array.from(this.cookies.values()).join('; ');
      }
      
      // BTP-specific headers
      if (this.isBtpMode && this.securitySessionId) {
        // Use existing security session for subsequent requests
        request.headers['x-sap-security-session'] = 'use';
      }
      
      // Add ADT session headers (generate new request ID for each request, like Eclipse does)
      const requestId = randomUUID().replace(/-/g, '');
      request.headers['sap-adt-request-id'] = requestId;
      
      // Log ALL requests with full details
      this.log(`\n========== REQUEST START ==========`);
      this.log(`[${request.method?.toUpperCase()}] ${request.url}`);
      this.log(`Full URL: ${request.baseURL}${request.url}`);
      this.log(`Headers: ${JSON.stringify(request.headers, null, 2)}`);
      if (request.data && typeof request.data === 'string' && request.data.length < 500) {
        this.log(`Body: ${request.data}`);
      } else if (request.data) {
        this.log(`Body length: ${request.data.length} bytes`);
      }
      this.log(`========== REQUEST END ==========\n`);
      
      return request;
    });

    this.client.interceptors.response.use(
      response => {
        // Merge cookies by name (don't overwrite all cookies!)
        if (response.headers['set-cookie']) {
          response.headers['set-cookie'].forEach(cookieString => {
            const cookieValue = cookieString.split(';')[0];
            const cookieName = cookieValue.split('=')[0];
            this.cookies.set(cookieName, cookieValue);
          });
        }
        
        // Log ALL responses with full details
        this.log(`\n========== RESPONSE START ==========`);
        this.log(`[${response.status}] ${response.config.method?.toUpperCase()} ${response.config.url}`);
        this.log(`Response Headers: ${JSON.stringify(response.headers, null, 2)}`);
        if (response.data && typeof response.data === 'string' && response.data.length < 500) {
          this.log(`Response Body: ${response.data}`);
        } else if (response.data) {
          this.log(`Response Body length: ${typeof response.data === 'string' ? response.data.length : JSON.stringify(response.data).length} bytes`);
        }
        this.log(`========== RESPONSE END ==========\n`);
        
        return response;
      },
      error => {
        this.log(`\n========== ERROR RESPONSE START ==========`);
        this.log(`[${error.response?.status || 'NO STATUS'}] ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
        this.log(`Error: ${error.message}`);
        if (error.response?.headers) {
          this.log(`Error Response Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
        }
        if (error.response?.data) {
          this.log(`Error Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        this.log(`========== ERROR RESPONSE END ==========\n`);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Initialize the service - establish ADT session like Eclipse does
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    try {
      if (this.isBtpMode) {
        // BTP initialization flow
        this.log('[INIT] BTP Mode: Initializing...');
        
        // If we have pre-loaded cookies, skip session creation
        if (this.cookies.size > 0) {
          this.log('[INIT] Using pre-loaded cookies from btp_cookies.json');
          this.log('[INIT] Skipping session creation - reusing existing Eclipse session');
        } else {
          // No cookies - attempt to create session (requires browser auth)
          this.log('[INIT] No cookies available - attempting session creation...');
          this.log('[INIT] Warning: This may require browser authentication');
          
          try {
            const sessionResponse = await this.client.get('/sap/bc/adt/core/http/sessions', {
              headers: {
                'Accept': 'application/vnd.sap.adt.core.http.session.v3+xml, application/vnd.sap.adt.core.http.session.v2+xml, application/vnd.sap.adt.core.http.session.v1+xml',
                'x-sap-security-session': 'create',
                'sap-adt-purpose': 'logon'
              }
            });
            
            this.log(`[INIT] BTP session created, status: ${sessionResponse.status}`);
            
            // Parse session XML to extract security session link
            const sessionXml = xmlParser.parse(sessionResponse.data);
            const sessionLink = sessionXml['http:session']?.['atom:link']?.find(
              link => link['@_rel'] === 'http://www.sap.com/adt/categories/core/http/sessions/securitysession'
            );
            
            if (sessionLink && sessionLink['@_href']) {
              this.securitySessionId = sessionLink['@_href'];
              this.log(`[INIT] Security session ID: ${this.securitySessionId}`);
            }
          } catch (error) {
            this.log('[INIT] Failed to create BTP session - likely needs browser authentication');
            this.log('[INIT] Please extract cookies from Eclipse ADT and save to btp_cookies.json');
            throw new Error('BTP authentication required. Please extract cookies from Eclipse ADT. Run: node extract_eclipse_cookies.js');
          }
        }
        
        // Get CSRF token (works with both pre-loaded cookies and new sessions)
        this.log('[INIT] BTP Mode: Getting CSRF token...');
        try {
          const csrfResponse = await this.client.get('/sap/bc/adt/repository/informationsystem/virtualfolders/contents', {
            headers: { 
              'X-CSRF-Token': 'Fetch'
            }
          });
          this.csrfToken = csrfResponse.headers['x-csrf-token'];
        } catch (error) {
          if (error.response && error.response.headers['x-csrf-token']) {
            this.log('[INIT] Got CSRF token from error response (expected behavior)');
            this.csrfToken = error.response.headers['x-csrf-token'];
          } else {
            throw error;
          }
        }
        
      } else {
        // On-premise initialization flow (existing logic)
        this.log('[INIT] On-Premise Mode: Getting reentrance ticket...');
        
        // Step 1: Get reentrance ticket (establishes ADT session - CRITICAL!)
        const ticketResponse = await this.client.get('/sap/bc/adt/security/reentranceticket');
        this.reentranceTicket = ticketResponse.data.trim();
        this.log(`[INIT] Reentrance ticket obtained: ${this.reentranceTicket.substring(0, 20)}...`);
        
        // Step 2: Get CSRF token from repository endpoint (may return 400 but still has token!)
        this.log('[INIT] On-Premise Mode: Getting CSRF token...');
        try {
          const csrfResponse = await this.client.get('/sap/bc/adt/repository/informationsystem/virtualfolders/contents', {
            headers: { 
              'X-CSRF-Token': 'Fetch'
            }
          });
          this.csrfToken = csrfResponse.headers['x-csrf-token'];
        } catch (error) {
          // Even if it returns 400, the CSRF token is in the error response headers!
          if (error.response && error.response.headers['x-csrf-token']) {
            this.log('[INIT] Got CSRF token from error response (expected behavior)');
            this.csrfToken = error.response.headers['x-csrf-token'];
          } else {
            throw error;
          }
        }
      }
      
      this.csrfTokenExpiry = Date.now() + (25 * 60 * 1000); // 25 minutes
      this.initialized = true;
      
      this.log(`[INIT] Initialization complete. CSRF token: ${this.csrfToken}`);
      
      return this.csrfToken;
    } catch (error) {
      throw new Error(`Failed to initialize ADT service: ${error.message}`);
    }
  }

  /**
   * Check if error is a session error (ICMENOSESSION)
   */
  isSessionError(error) {
    if (!error.response) return false;
    
    const headers = error.response.headers || {};
    const data = error.response.data || '';
    
    // Check for ICMENOSESSION error
    if (headers['x-sap-icm-err-id'] === 'ICMENOSESSION' || 
        headers['sap-err-id'] === 'ICMENOSESSION') {
      return true;
    }
    
    // Check for session timeout in response text
    if (typeof data === 'string' && data.includes('Session Timed Out')) {
      return true;
    }
    
    return false;
  }

  /**
   * Reset session (clear cookies and CSRF token)
   */
  resetSession() {
    this.log('[SESSION] Resetting session due to ICMENOSESSION error');
    this.csrfToken = null;
    this.csrfTokenExpiry = null;
    this.cookies.clear();
    this.securitySessionId = null; // Reset BTP security session
    this.initialized = false;
  }

  /**
   * Get CSRF token for write operations (reuses cached token)
   */
  async getCsrfToken() {
    // Ensure service is initialized
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Check if token is still valid
    if (this.csrfToken && this.csrfTokenExpiry && Date.now() < this.csrfTokenExpiry) {
      return this.csrfToken;
    }

    // Token expired, reinitialize
    this.initialized = false;
    return await this.initialize();
  }

  /**
   * Build ADT URI for different object types
   */
  buildObjectUri(objectName, objectType, functionGroup = null) {
    const name = objectName.toLowerCase();
    // URL encode the name to handle special characters like / in namespace classes
    const encodedName = encodeURIComponent(name);
    
    switch (objectType.toUpperCase()) {
      case 'CLAS':
      case 'CLASS':
        return `/sap/bc/adt/oo/classes/${encodedName}`;
      case 'INTF':
      case 'INTERFACE':
        return `/sap/bc/adt/oo/interfaces/${encodedName}`;
      case 'PROG':
      case 'REPORT':
        return `/sap/bc/adt/programs/programs/${encodedName}`;
      case 'INCL':
      case 'INCLUDE':
        return `/sap/bc/adt/programs/includes/${encodedName}`;
      case 'FUGR':
      case 'FUNCTION_GROUP':
        return `/sap/bc/adt/functions/groups/${encodedName}`;
      case 'FUNC':
      case 'FUNCTION_MODULE':
        if (!functionGroup) {
          throw new Error('Function group is required for function modules. Use format: object_name="FM_NAME" and function_group="FUGR_NAME"');
        }
        return `/sap/bc/adt/functions/groups/${encodeURIComponent(functionGroup.toLowerCase())}/fmodules/${encodedName}`;
      case 'DDLS':
      case 'CDS':
        return `/sap/bc/adt/ddic/ddl/sources/${encodedName}`;
      case 'TABL':
      case 'TABLE':
        return `/sap/bc/adt/ddic/tables/${encodedName}`;
      case 'TABL/DS':
      case 'STRUCT':
      case 'STRUCTURE':
        return `/sap/bc/adt/ddic/structures/${encodedName}`;
      case 'DOMA':
      case 'DOMAIN':
        return `/sap/bc/adt/ddic/domains/${encodedName}`;
      case 'DTEL':
      case 'DATA_ELEMENT':
        return `/sap/bc/adt/ddic/dataelements/${encodedName}`;
      case 'TTYP':
      case 'TABLE_TYPE':
        return `/sap/bc/adt/ddic/tabletypes/${encodedName}`;
      case 'SRVD':
      case 'SERVICE_DEFINITION':
        return `/sap/bc/adt/ddic/srvd/sources/${name}`;
      case 'SRVB':
      case 'SERVICE_BINDING':
        return `/sap/bc/adt/businessservices/bindings/${name}`;
      case 'BDEF':
      case 'BEHAVIOR_DEFINITION':
        return `/sap/bc/adt/bo/behaviordefinitions/${encodedName}`;
      case 'DDLX':
      case 'DDLX/EX':
      case 'METADATA_EXTENSION':
        return `/sap/bc/adt/ddic/ddlx/sources/${name}`;
      case 'SUSH':
      case 'AUTHORIZATION_DEFAULT':
        return `/sap/bc/adt/aps/iam/sush/${encodedName}`;
      case 'SCO3':
      case 'OUTBOUND_SERVICE':
        return `/sap/bc/adt/aps/cloud/com/sco3/${encodedName}`;
      default:
        throw new Error(`Unsupported object type: ${objectType}`);
    }
  }

  /**
   * Build source URI for reading/writing source code
   */
  buildSourceUri(objectName, objectType, functionGroup = null) {
    const uri = this.buildObjectUri(objectName, objectType, functionGroup);
    
    // Most objects have /source/main, but some differ
    switch (objectType.toUpperCase()) {
      case 'CLAS':
      case 'CLASS':
      case 'INTF':
      case 'INTERFACE':
      case 'DDLS':
      case 'CDS':
      case 'SRVD':
      case 'SERVICE_DEFINITION':
      case 'BDEF':
      case 'BEHAVIOR_DEFINITION':
      case 'DDLX':
      case 'DDLX/EX':
      case 'METADATA_EXTENSION':
      case 'PROG':
      case 'REPORT':
      case 'INCL':
      case 'INCLUDE':
      case 'FUGR':
      case 'FUNCTION_GROUP':
      case 'FUNC':
      case 'FUNCTION_MODULE':
      case 'TABL/DS':
      case 'STRUCT':
      case 'STRUCTURE':
        return `${uri}/source/main`;
      case 'SRVB':
      case 'SERVICE_BINDING':
        return uri; // Service Bindings don't have /source/main
      default:
        return `${uri}/source/main`;
    }
  }

  /**
   * Helper: Map SAP data types to ABAP DDL types
   */
  mapToAbapDdlType(dataType, length, decimals) {
    const typeUpper = dataType.toUpperCase();
    
    switch (typeUpper) {
      case 'CHAR':
        return `abap.char(${length})`;
      case 'NUMC':
        return `abap.numc(${length})`;
      case 'INT4':
        return 'abap.int4';
      case 'INT8':
        return 'abap.int8';
      case 'DEC':
      case 'DECIMAL':
        return `abap.dec(${length},${decimals})`;
      case 'STRING':
        return 'abap.string(0)';
      case 'DATS':
        return 'abap.dats';
      case 'TIMS':
        return 'abap.tims';
      case 'CURR':
        return `abap.curr(${length},${decimals})`;
      case 'QUAN':
        return `abap.quan(${length},${decimals})`;
      default:
        return `abap.char(${length})`;
    }
  }
}

// Export xmlParser and xmlBuilder for use by extending classes
export { xmlParser, xmlBuilder };






