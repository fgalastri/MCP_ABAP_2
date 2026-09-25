/**
 * ADT MCP Server - Configuration Module
 * Shared configuration for ADT servers
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger, getLogFilePath } from './adt-utils.js';

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load SAP configuration from environment variables
 * @param {string} serverId - Server identifier ('ON-PREM' or 'BTP')
 * @returns {object} Configuration object
 */
export function loadConfig(serverId = 'ON-PREM') {
  const config = {
    baseUrl: process.env.SAP_BASE_URL,
    username: process.env.SAP_USERNAME,
    password: process.env.SAP_PASSWORD,
    client: process.env.SAP_CLIENT || '100',
    authMode: process.env.SAP_AUTH_MODE || 'basic', // 'basic' or 'btp'
    oauthToken: process.env.SAP_OAUTH_TOKEN || null,
    btpCookiesFile: process.env.SAP_BTP_COOKIES_FILE || path.join(__dirname, 'btp_cookies.json'),
    language: process.env.SAP_LANGUAGE || 'EN',
    serverId: serverId
  };

  return config;
}

/**
 * Validate SAP configuration
 * @param {object} config - Configuration object
 * @throws {Error} If configuration is invalid
 */
export function validateConfig(config) {
  if (!config.baseUrl) {
    throw new Error('SAP_BASE_URL environment variable is required!');
  }

  if (config.authMode === 'basic') {
    if (!config.username || !config.password) {
      throw new Error('SAP_USERNAME and SAP_PASSWORD are required for basic auth!');
    }
  }
}

/**
 * Load BTP cookies from file
 * @param {string} cookiesFilePath - Path to cookies file
 * @param {Function} logFn - Logger function
 * @returns {Array<string>} Array of cookie strings
 */
export function loadBtpCookies(cookiesFilePath, logFn) {
  try {
    if (fs.existsSync(cookiesFilePath)) {
      const cookiesData = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf8'));
      // Support both array format and object format
      let cookies = null;
      if (Array.isArray(cookiesData)) {
        cookies = cookiesData;
      } else if (cookiesData.cookies && Array.isArray(cookiesData.cookies)) {
        cookies = cookiesData.cookies;
      }
      
      if (cookies && cookies.length > 0) {
        if (logFn) logFn(`[CONFIG] Loaded ${cookies.length} cookies from ${cookiesFilePath}`);
        return cookies;
      }
    }
  } catch (error) {
    if (logFn) logFn(`[CONFIG] Warning: Failed to load BTP cookies: ${error.message}`);
  }
  return [];
}

/**
 * Create axios configuration for ADT
 * @param {object} sapConfig - SAP configuration
 * @param {Map} cookiesMap - Cookies map
 * @param {Function} logFn - Logger function
 * @param {object} https - HTTPS module (pass from caller)
 * @returns {object} Axios configuration
 */
export function createAxiosConfig(sapConfig, cookiesMap, logFn, https) {
  const config = {
    baseURL: sapConfig.baseUrl,
    timeout: 120000, // Increased to 120s for large operations
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 10,
      maxFreeSockets: 5
    }),
    maxRedirects: 0, // Disable redirects for BTP auth
    validateStatus: (status) => {
      // Accept all status codes - handle errors manually
      return status >= 200 && status < 600;
    },
    headers: {
      'Accept': 'application/xml,application/vnd.sap.adt.*.v1+xml,*/*',
      'Content-Type': 'application/xml',
      'User-Agent': 'Eclipse ADT REST API Client (MCP Server)',
      'sap-client': sapConfig.client || '100',
      'Accept-Language': sapConfig.language || 'en'
    }
  };

  // Add authentication based on mode
  if (sapConfig.authMode === 'basic') {
    config.auth = {
      username: sapConfig.username,
      password: sapConfig.password
    };
    if (logFn) logFn('[CONFIG] Using Basic Authentication');
  } else if (sapConfig.authMode === 'btp') {
    // BTP uses cookie-based authentication
    if (cookiesMap && cookiesMap.size > 0) {
      const cookieString = Array.from(cookiesMap.values()).join('; ');
      config.headers['Cookie'] = cookieString;
      if (logFn) logFn(`[CONFIG] Using BTP Cookie Authentication (${cookiesMap.size} cookies)`);
    } else {
      if (logFn) logFn('[CONFIG] BTP mode but no cookies available');
    }
  }

  return config;
}

