/**
 * Encryption Module for Secure MCP Architecture
 * 
 * Purpose: Encrypt/decrypt HTTP call specifications between MCP and Local Agent
 * Algorithm: AES-256-GCM (Authenticated Encryption)
 * 
 * Security Features:
 * - Authenticated encryption (prevents tampering)
 * - Random IV per encryption (prevents pattern analysis)
 * - HMAC signature (prevents replay attacks)
 */

const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Generate a secure encryption key (run once, store securely)
 */
function generateEncryptionKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * Encrypt an HTTP call specification
 * 
 * @param {Object} callSpec - HTTP call specification {method, url, headers, body}
 * @param {string} secretKey - Base64-encoded encryption key (32 bytes)
 * @returns {Object} Encrypted data with IV and auth tag
 */
function encryptCallSpec(callSpec, secretKey) {
  try {
    // Convert secret key from base64
    const keyBuffer = Buffer.from(secretKey, 'base64');
    
    if (keyBuffer.length !== KEY_LENGTH) {
      throw new Error(`Invalid key length. Expected ${KEY_LENGTH} bytes, got ${keyBuffer.length}`);
    }
    
    // Generate random IV (Initialization Vector)
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
    
    // Encrypt the call spec
    const plaintext = JSON.stringify(callSpec);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);
    
    // Get authentication tag (GCM mode provides this)
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      version: '1.0' // For future compatibility
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt an encrypted HTTP call specification
 * 
 * @param {Object} encryptedData - Encrypted data from encryptCallSpec
 * @param {string} secretKey - Base64-encoded encryption key (32 bytes)
 * @returns {Object} Decrypted HTTP call specification
 */
function decryptCallSpec(encryptedData, secretKey) {
  try {
    // Convert secret key from base64
    const keyBuffer = Buffer.from(secretKey, 'base64');
    
    if (keyBuffer.length !== KEY_LENGTH) {
      throw new Error(`Invalid key length. Expected ${KEY_LENGTH} bytes, got ${keyBuffer.length}`);
    }
    
    // Convert encrypted data from base64
    const encrypted = Buffer.from(encryptedData.encrypted, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    
    // Set authentication tag (must be done before decryption)
    decipher.setAuthTag(authTag);
    
    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    // Parse JSON
    const callSpec = JSON.parse(decrypted.toString('utf8'));
    
    return callSpec;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Generate HMAC signature for request authentication
 * 
 * @param {Object} data - Data to sign (typically the encrypted spec)
 * @param {string} secretKey - Base64-encoded signing key
 * @returns {string} Base64-encoded HMAC signature
 */
function signRequest(data, secretKey) {
  const hmac = crypto.createHmac('sha256', Buffer.from(secretKey, 'base64'));
  hmac.update(JSON.stringify(data));
  return hmac.digest('base64');
}

/**
 * Verify HMAC signature
 * 
 * @param {Object} data - Data that was signed
 * @param {string} signature - Base64-encoded signature to verify
 * @param {string} secretKey - Base64-encoded signing key
 * @returns {boolean} True if signature is valid
 */
function verifySignature(data, signature, secretKey) {
  try {
    const expectedSignature = signRequest(data, secretKey);
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'base64'),
      Buffer.from(signature, 'base64')
    );
  } catch (error) {
    return false;
  }
}

/**
 * Check if timestamp is fresh (within acceptable time window)
 * Prevents replay attacks
 * 
 * @param {string} timestamp - ISO 8601 timestamp
 * @param {number} maxAgeSeconds - Maximum age in seconds (default: 60)
 * @returns {boolean} True if timestamp is fresh
 */
function isTimestampFresh(timestamp, maxAgeSeconds = 60) {
  try {
    const requestTime = new Date(timestamp).getTime();
    const currentTime = Date.now();
    const age = (currentTime - requestTime) / 1000; // Convert to seconds
    
    return age >= 0 && age <= maxAgeSeconds;
  } catch (error) {
    return false;
  }
}

/**
 * Complete encryption workflow: Encrypt + Sign
 * 
 * @param {Object} callSpec - HTTP call specification
 * @param {string} encryptionKey - Base64-encoded encryption key
 * @returns {Object} Complete encrypted request with signature and metadata
 */
function secureEncrypt(callSpec, encryptionKey) {
  // Encrypt the call spec
  const encrypted = encryptCallSpec(callSpec, encryptionKey);
  
  // Add metadata
  const request = {
    encrypted,
    timestamp: new Date().toISOString(),
    nonce: crypto.randomUUID() // Unique request ID
  };
  
  // Sign the request
  const signature = signRequest(request, encryptionKey);
  
  return {
    ...request,
    signature
  };
}

/**
 * Complete decryption workflow: Verify + Decrypt
 * 
 * @param {Object} secureRequest - Encrypted request from secureEncrypt
 * @param {string} encryptionKey - Base64-encoded encryption key
 * @param {Object} options - Validation options
 * @returns {Object} Decrypted HTTP call specification
 */
function secureDecrypt(secureRequest, encryptionKey, options = {}) {
  const {
    maxAgeSeconds = 60,
    checkTimestamp = true,
    checkSignature = true
  } = options;
  
  // Verify signature
  if (checkSignature) {
    const { signature, ...requestData } = secureRequest;
    
    if (!verifySignature(requestData, signature, encryptionKey)) {
      throw new Error('Invalid signature - request may have been tampered with');
    }
  }
  
  // Check timestamp freshness (prevent replay attacks)
  if (checkTimestamp) {
    if (!isTimestampFresh(secureRequest.timestamp, maxAgeSeconds)) {
      throw new Error('Timestamp expired - possible replay attack');
    }
  }
  
  // Decrypt
  return decryptCallSpec(secureRequest.encrypted, encryptionKey);
}

// Export functions
module.exports = {
  generateEncryptionKey,
  encryptCallSpec,
  decryptCallSpec,
  signRequest,
  verifySignature,
  isTimestampFresh,
  secureEncrypt,
  secureDecrypt
};

// Example usage and testing
if (require.main === module) {
  console.log('🔐 Encryption Module Test\n');
  
  // Generate a key (do this once and store securely)
  const key = generateEncryptionKey();
  console.log('Generated Key:', key);
  console.log('Key Length:', Buffer.from(key, 'base64').length, 'bytes\n');
  
  // Example HTTP call spec
  const callSpec = {
    method: 'POST',
    url: 'https://sap-server:44300/sap/bc/adt/oo/classes/zcl_test/source/main',
    headers: {
      'Accept': 'text/plain',
      'Content-Type': 'text/plain',
      'X-CSRF-Token': 'fetch'
    },
    body: 'CLASS zcl_test DEFINITION PUBLIC FINAL CREATE PUBLIC. ENDCLASS.'
  };
  
  console.log('Original Call Spec:', JSON.stringify(callSpec, null, 2));
  console.log();
  
  // Encrypt with signature
  const encrypted = secureEncrypt(callSpec, key);
  console.log('Encrypted Request:', JSON.stringify(encrypted, null, 2));
  console.log();
  
  // Decrypt with verification
  try {
    const decrypted = secureDecrypt(encrypted, key);
    console.log('Decrypted Call Spec:', JSON.stringify(decrypted, null, 2));
    console.log();
    console.log('✅ Encryption/Decryption test PASSED');
  } catch (error) {
    console.error('❌ Decryption failed:', error.message);
  }
  
  // Test signature tampering detection
  console.log('\n🔒 Testing signature verification...');
  const tamperedRequest = { ...encrypted };
  tamperedRequest.encrypted.encrypted = 'tampered-data';
  
  try {
    secureDecrypt(tamperedRequest, key);
    console.log('❌ Signature verification FAILED - tampering not detected!');
  } catch (error) {
    console.log('✅ Signature verification PASSED - tampering detected:', error.message);
  }
  
  // Test timestamp expiration
  console.log('\n⏰ Testing timestamp freshness...');
  const expiredRequest = { ...encrypted };
  expiredRequest.timestamp = new Date(Date.now() - 120000).toISOString(); // 2 minutes ago
  
  try {
    secureDecrypt(expiredRequest, key);
    console.log('❌ Timestamp check FAILED - expired request accepted!');
  } catch (error) {
    console.log('✅ Timestamp check PASSED - expired request rejected:', error.message);
  }
}
