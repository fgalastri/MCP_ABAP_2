/**
 * ADT MCP Server - Utility Functions
 * Common utilities shared by on-premise and BTP ADT servers
 */

import { XMLParser } from 'fast-xml-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// XML Parser instance
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseAttributeValue: true,
  trimValues: true,
  parseTagValue: true
});

/**
 * Log message to file and console
 * @param {string} message - Message to log
 * @param {string} serverId - Server identifier (e.g., '🏢 ON-PREM' or '🌩️ BTP')
 * @param {string} logFilePath - Path to log file
 */
export function log(message, serverId, logFilePath) {
  try {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${serverId}] ${message}\n`;
    fs.appendFileSync(logFilePath, logMessage);
    console.error(`[${serverId}] ${message}`);
  } catch (err) {
    console.error(`Log error: ${err.message}`);
  }
}

/**
 * Parse SAP ADT error response (XML) and extract meaningful error message
 * @param {string|object} errorData - Error response from SAP (XML string or object)
 * @returns {object} - Error object with { message, details, hint, rawError }
 */
export function parseAdtError(errorData) {
  // Default return object
  const result = {
    message: 'No error details available',
    details: null,
    hint: null,
    rawError: errorData
  };
  
  if (!errorData) return result;
  
  // If already a string, check if it's XML
  if (typeof errorData === 'string') {
    // Check if it's XML
    if (errorData.trim().startsWith('<?xml') || errorData.trim().startsWith('<')) {
      try {
        const parsed = xmlParser.parse(errorData);
        
        // Try to extract exception message
        if (parsed['exc:exception']) {
          const exception = parsed['exc:exception'];
          const message = exception['message'] || exception['localizedMessage'] || exception['@_message'];
          const type = exception['type'] ? exception['type']['@_id'] || exception['type'] : exception['@_type'];
          
          if (message && type) {
            result.message = `${type}: ${message}`;
            result.details = exception;
          } else if (message) {
            result.message = message;
            result.details = exception;
          }
          
          // Try to get T100 message details
          if (exception['properties'] && exception['properties']['entry']) {
            const entries = Array.isArray(exception['properties']['entry']) 
              ? exception['properties']['entry'] 
              : [exception['properties']['entry']];
              
            const t100 = {};
            for (const entry of entries) {
              const key = entry['@_key'];
              const value = entry['#text'] || entry;
              if (key && key.startsWith('T100KEY-')) {
                t100[key.replace('T100KEY-', '')] = value;
              }
            }
            
            if (message && t100.ID && t100.NO) {
              result.message = `${type ? type + ': ' : ''}${message} (Message ${t100.ID}/${t100.NO})`;
              result.hint = `SAP Message: ${t100.ID}/${t100.NO}`;
            }
          }
          
          return result;
        }
        
        // Try to extract messages from other common SAP error formats
        if (parsed['errors'] && parsed['errors']['error']) {
          const errors = Array.isArray(parsed['errors']['error']) 
            ? parsed['errors']['error'] 
            : [parsed['errors']['error']];
          result.message = errors.map(e => e.message || e['@_message'] || '').join('; ');
          result.details = parsed['errors'];
          return result;
        }
        
      } catch (parseError) {
        // If XML parsing fails, return raw string (might be HTML error)
        // Extract plain text if it's HTML
        if (errorData.includes('<html') || errorData.includes('<HTML')) {
          // Try to extract meaningful text from HTML
          const textMatch = errorData.match(/<body[^>]*>(.*?)<\/body>/is);
          if (textMatch) {
            result.message = textMatch[1].replace(/<[^>]+>/g, '').trim();
            result.details = 'HTML error page received';
            return result;
          }
        }
        // For session timeout and other plain text errors
        result.message = errorData.trim().substring(0, 500); // First 500 chars of raw response
        result.hint = 'Raw error text (may contain additional details)';
        return result;
      }
    }
    
    // Not XML, return as-is (might be plain text error)
    result.message = errorData.trim();
    return result;
  }
  
  // If it's an object, try to extract message
  if (typeof errorData === 'object') {
    result.message = errorData.message || JSON.stringify(errorData, null, 2);
    result.details = errorData;
    return result;
  }
  
  result.message = String(errorData);
  return result;
}

/**
 * Create a log function with predefined server ID and log file path
 * @param {string} serverId - Server identifier
 * @param {string} logFilePath - Path to log file
 * @returns {Function} - Log function
 */
export function createLogger(serverId, logFilePath) {
  return (message) => log(message, serverId, logFilePath);
}

/**
 * Get log file path for ADT server
 * @param {string} scriptPath - Path to the server script file
 * @param {string} fileName - Log file name (default: 'adt_debug.log')
 * @returns {string} - Full path to log file
 */
export function getLogFilePath(scriptPath, fileName = 'adt_debug.log') {
  const __filename = fileURLToPath(scriptPath);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, fileName);
}






