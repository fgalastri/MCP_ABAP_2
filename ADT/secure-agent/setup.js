/**
 * Setup Script for Secure Local Agent
 * 
 * This script:
 * 1. Generates encryption key
 * 2. Tests encryption/decryption
 * 3. Validates SAP configuration
 * 4. Creates example encrypted request
 */

const fs = require('fs');
const path = require('path');
const { generateEncryptionKey, secureEncrypt, secureDecrypt } = require('./encryption');

const KEY_FILE = path.join(__dirname, 'agent.key');
const CONFIG_FILE = path.join(__dirname, '../sap_systems.json');

console.log('🔧 Secure Local Agent Setup\n');
console.log('═══════════════════════════════════════\n');

// Step 1: Check if key already exists
if (fs.existsSync(KEY_FILE)) {
  console.log('⚠️  Encryption key already exists!');
  console.log(`   Location: ${KEY_FILE}`);
  console.log('   Delete this file to generate a new key.\n');
} else {
  console.log('1️⃣  Generating encryption key...');
  const key = generateEncryptionKey();
  fs.writeFileSync(KEY_FILE, key, 'utf8');
  console.log(`   ✅ Key generated: ${KEY_FILE}`);
  console.log(`   ⚠️  KEEP THIS KEY SECURE!\n`);
}

// Step 2: Validate SAP configuration
console.log('2️⃣  Validating SAP configuration...');
if (!fs.existsSync(CONFIG_FILE)) {
  console.error(`   ❌ Configuration file not found: ${CONFIG_FILE}`);
  console.error('   Please create sap_systems.json first.');
  process.exit(1);
}

try {
  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  const systems = Object.keys(config.systems || {});
  
  if (systems.length === 0) {
    console.error('   ❌ No SAP systems configured');
    process.exit(1);
  }
  
  // Filter out BTP - it uses local mode only
  const secureAgentSystems = systems.filter(s => s !== 'BTP');
  
  console.log(`   ✅ Found ${systems.length} SAP system(s): ${systems.join(', ')}`);
  console.log(`   ℹ️  Secure agent systems: ${secureAgentSystems.join(', ')} (BTP uses local mode)\n`);
  
  if (secureAgentSystems.length === 0) {
    console.error('   ❌ No on-premise systems configured for secure agent');
    process.exit(1);
  }
  
  // Validate each on-premise system
  for (const system of secureAgentSystems) {
    const sysConfig = config.systems[system];
    console.log(`   📍 ${system}:`);
    console.log(`      Base URL: ${sysConfig.baseUrl}`);
    console.log(`      Username: ${sysConfig.username}`);
    console.log(`      Client: ${sysConfig.client}`);
    console.log(`      Password: ${sysConfig.password ? '***' : '❌ MISSING'}`);
    
    if (!sysConfig.password) {
      console.error(`\n   ❌ Password missing for system ${system}`);
      process.exit(1);
    }
  }
  
  console.log();
} catch (error) {
  console.error(`   ❌ Error reading config: ${error.message}`);
  process.exit(1);
}

// Step 3: Test encryption/decryption
console.log('3️⃣  Testing encryption...');
const key = fs.readFileSync(KEY_FILE, 'utf8').trim();

const testCallSpec = {
  method: 'GET',
  url: 'https://{{SAP_HOST}}:{{PORT}}/sap/bc/adt/repository/nodestructure?parent_name=DEVC/K&parent_tech_name=DEVC/K&withShortDescriptions=true',
  headers: {
    'Accept': 'application/xml',
    'X-CSRF-Token': 'fetch'
  }
};

try {
  const encrypted = secureEncrypt(testCallSpec, key);
  const decrypted = secureDecrypt(encrypted, key);
  
  if (JSON.stringify(testCallSpec) === JSON.stringify(decrypted)) {
    console.log('   ✅ Encryption test PASSED');
  } else {
    console.error('   ❌ Encryption test FAILED - data mismatch');
    process.exit(1);
  }
} catch (error) {
  console.error(`   ❌ Encryption test FAILED: ${error.message}`);
  process.exit(1);
}

// Step 4: Create example encrypted request
console.log('\n4️⃣  Creating example encrypted request...');
const exampleEncrypted = secureEncrypt(testCallSpec, key);
const exampleFile = path.join(__dirname, 'example-encrypted-request.json');
fs.writeFileSync(exampleFile, JSON.stringify(exampleEncrypted, null, 2), 'utf8');
console.log(`   ✅ Example saved: ${exampleFile}`);

// Step 5: Summary
console.log('\n═══════════════════════════════════════');
console.log('✅ Setup Complete!\n');
console.log('📋 Next Steps:');
console.log('   1. Test the local agent:');
console.log('      node local-agent.js example-encrypted-request.json');
console.log('   2. Integrate with MCP server');
console.log('   3. Provide encryption key to MCP server\n');
console.log('🔐 Security Reminders:');
console.log('   - Keep agent.key secure (do NOT commit to git)');
console.log('   - Keep sap_systems.json secure (contains credentials)');
console.log('   - Credentials NEVER leave this machine');
console.log('   - Encrypted specs are safe to transmit\n');
console.log('═══════════════════════════════════════\n');
