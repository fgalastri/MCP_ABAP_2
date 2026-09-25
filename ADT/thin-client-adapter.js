/**
 * Thin Client Adapter for MCP
 * 
 * This adapter wraps the ADT service to intercept HTTP calls and
 * execute them via the thin client (instead of direct execution).
 * 
 * Benefits:
 * - Works inside customer VPN (no firewall changes needed)
 * - Credentials stay local (never sent to remote MCP)
 * - Remote MCP can be outside VPN
 * - Simple architecture (no encryption needed for now)
 */

import { executeCall } from './secure-agent/simple-agent.js';

/**
 * Thin Client HTTP Interceptor
 * 
 * Wraps an axios instance to intercept requests and execute via thin client
 */
class ThinClientInterceptor {
  constructor(originalClient, adtService) {
    this.originalClient = originalClient;
    this.adtService = adtService;  // Keep reference to get cookies
    // Preserve defaults from original client
    this.defaults = originalClient.defaults || {};
  }
  
  /**
   * Intercept HTTP request and execute via thin client
   */
  async request(config) {
    // Merge with defaults
    const fullConfig = {
      ...this.defaults,
      ...config,
      headers: {
        ...(this.defaults.headers || {}),
        ...(config.headers || {})
      }
    };
    
    // CRITICAL: Add session cookies (just like axios interceptor does!)
    console.error(`[THIN CLIENT ADAPTER] Debug - adtService exists: ${!!this.adtService}`);
    console.error(`[THIN CLIENT ADAPTER] Debug - cookies exists: ${!!this.adtService?.cookies}`);
    console.error(`[THIN CLIENT ADAPTER] Debug - cookies size: ${this.adtService?.cookies?.size || 0}`);
    console.error(`[THIN CLIENT ADAPTER] Debug - existing Cookie header: ${fullConfig.headers.Cookie || 'none'}`);
    
    if (this.adtService && this.adtService.cookies && this.adtService.cookies.size > 0 && !fullConfig.headers.Cookie) {
      const cookieValues = Array.from(this.adtService.cookies.values());
      fullConfig.headers.Cookie = cookieValues.join('; ');
      console.error(`[THIN CLIENT ADAPTER] ✅ Added ${this.adtService.cookies.size} session cookies`);
      console.error(`[THIN CLIENT ADAPTER] Cookie names: ${Array.from(this.adtService.cookies.keys()).join(', ')}`);
    } else {
      console.error(`[THIN CLIENT ADAPTER] ❌ Cookies NOT added! Check conditions above`);
    }
    
    // Build call spec from axios config
    const callSpec = {
      method: fullConfig.method?.toUpperCase() || 'GET',
      url: this._buildFullUrl(fullConfig),
      headers: fullConfig.headers || {},
      body: fullConfig.data,
      params: fullConfig.params
    };
    
    console.error(`[THIN CLIENT ADAPTER] Intercepting: ${callSpec.method} ${callSpec.url}`);
    
    // Check if we should return call spec only (for remote HTTP MCP mode)
    if (process.env.RETURN_CALL_SPEC_ONLY === 'true') {
      console.error(`[THIN CLIENT ADAPTER] ⚠️ RETURN_CALL_SPEC_ONLY mode - returning call spec without execution`);
      
      // Return call spec as a special response format
      return {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: {
          _callSpec: callSpec,  // Special marker for HTTP server
          message: 'Call spec ready for local agent execution'
        },
        config: fullConfig
      };
    }
    
    // Execute via thin client (normal local mode)
    const response = await executeCall(callSpec);
    
    // Check for errors
    if (response.error) {
      const error = new Error(response.message);
      error.code = response.code;
      error.response = {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      };
      throw error;
    }
    
    // Return in axios format
    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      config: fullConfig
    };
  }
  
  /**
   * Build full URL from axios config
   */
  _buildFullUrl(config) {
    let url = config.url;
    
    // If URL is relative, add baseURL
    if (!url.startsWith('http')) {
      const baseURL = config.baseURL || this.defaults.baseURL;
      if (baseURL) {
        url = baseURL + url;
      }
    }
    
    return url;
  }
  
  /**
   * Proxy all axios methods to use thin client
   */
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
  
  patch(url, data, config = {}) {
    return this.request({ ...config, method: 'PATCH', url, data });
  }
  
  head(url, config = {}) {
    return this.request({ ...config, method: 'HEAD', url });
  }
  
  options(url, config = {}) {
    return this.request({ ...config, method: 'OPTIONS', url });
  }
}

/**
 * Create a thin client interceptor for an ADT service
 */
function enableThinClient(adtService) {
  console.error('[THIN CLIENT ADAPTER] Enabling thin client mode');
  
  // Replace the axios client with thin client interceptor
  // PASS adtService so interceptor can access cookies!
  const interceptor = new ThinClientInterceptor(adtService.client, adtService);
  adtService.client = interceptor;
  
  console.error('[THIN CLIENT ADAPTER] Thin client mode enabled ✅');
  
  return adtService;
}

export {
  ThinClientInterceptor,
  enableThinClient
};
