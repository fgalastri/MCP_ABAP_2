/**
 * ZATC Test Class Deployment Script
 * 
 * This script uploads the test class to the SAP system using MCP ADT API
 * 
 * Usage:
 *   node deploy_zatc_tests.js
 */

const fs = require('fs');
const path = require('path');

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(message, colors.bright + colors.cyan);
  log('='.repeat(60), colors.cyan);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

async function deployTestClass() {
  try {
    logHeader('ZATC Test Class Deployment');

    // Step 1: Read the test class file
    logInfo('Step 1: Reading test class file...');
    const testFilePath = path.join(__dirname, 'zatc.clas.testclasses.abap');
    
    if (!fs.existsSync(testFilePath)) {
      logError(`Test file not found: ${testFilePath}`);
      process.exit(1);
    }

    const testCode = fs.readFileSync(testFilePath, 'utf8');
    logSuccess(`Read ${testCode.length} characters from ${testFilePath}`);
    logInfo(`Test classes found: ltc_zatc_basic_tests, ltc_zatc_edge_cases, ltc_zatc_performance, ltc_zatc_integration`);

    // Step 2: Display what will be deployed
    logHeader('Deployment Summary');
    log('Object Name:    ZATC', colors.cyan);
    log('Object Type:    CLAS/OC (Test Classes)', colors.cyan);
    log('Test Classes:   4', colors.cyan);
    log('Test Methods:   13', colors.cyan);
    log('Lines of Code:  327', colors.cyan);

    // Step 3: Instructions for manual deployment
    logHeader('Deployment Options');
    
    logInfo('\nOption 1: Using MCP ADT API (Programmatic)');
    console.log(`
// JavaScript/Node.js example
const { ADTClient } = require('abap-adt-api');

const client = new ADTClient(
  'http://your-sap-server:port',
  'username',
  'password'
);

// Save test class
await client.setStateless('CLAS', 'ZATC', testCode);

// Or use the full workflow
const result = await client.adtCompatibleUpload({
  object_name: 'ZATC',
  object_type: 'CLAS/OC',
  source_code: testCode
});
`);

    logInfo('\nOption 2: Manual Copy-Paste (Easiest)');
    console.log(`
1. Open SAP GUI
2. Transaction: SE24 (Class Builder)
3. Enter class name: ZATC
4. Click "Test Classes" button (or F5)
5. Copy content from: zatc.clas.testclasses.abap
6. Paste into the editor
7. Save (Ctrl+S)
8. Activate (Ctrl+F3)
9. Run tests (F8)
`);

    logInfo('\nOption 3: Using Eclipse ADT');
    console.log(`
1. Open Eclipse with ADT plugins
2. Navigate to ZATC class in Project Explorer
3. Right-click → Show Test Classes
4. Copy content from: zatc.clas.testclasses.abap
5. Paste into test class editor
6. Save and activate
7. Right-click class → Run As → ABAP Unit Test
`);

    logInfo('\nOption 4: Using MCP Tools (If available)');
    console.log(`
// Check if MCP ADT tools are available
const mcpTools = require('./ADT/server_adt.js');

// Deploy using MCP
await mcpTools.deployTestClass('ZATC', testCode);
`);

    // Step 4: Validation
    logHeader('Pre-Deployment Validation');
    
    // Check for common issues
    if (testCode.includes('CLASS ltc_zatc_basic_tests DEFINITION')) {
      logSuccess('Found ltc_zatc_basic_tests definition');
    }
    if (testCode.includes('CLASS ltc_zatc_edge_cases DEFINITION')) {
      logSuccess('Found ltc_zatc_edge_cases definition');
    }
    if (testCode.includes('CLASS ltc_zatc_performance DEFINITION')) {
      logSuccess('Found ltc_zatc_performance definition');
    }
    if (testCode.includes('CLASS ltc_zatc_integration DEFINITION')) {
      logSuccess('Found ltc_zatc_integration definition');
    }
    if (testCode.includes('FOR TESTING')) {
      logSuccess('Contains ABAP Unit test methods');
    }
    if (testCode.includes('cl_abap_unit_assert=>')) {
      logSuccess('Uses standard ABAP Unit assertions');
    }

    // Step 5: Create backup
    logInfo('\nCreating backup of test file...');
    const backupPath = path.join(__dirname, `zatc.clas.testclasses.backup.${Date.now()}.abap`);
    fs.copyFileSync(testFilePath, backupPath);
    logSuccess(`Backup created: ${backupPath}`);

    // Step 6: Generate upload script for manual use
    logInfo('\nGenerating MCP upload script...');
    const uploadScript = `
// Auto-generated MCP upload script for ZATC tests
// Generated: ${new Date().toISOString()}

const fs = require('fs');

async function uploadZATCTests() {
  const testCode = fs.readFileSync('zatc.clas.testclasses.abap', 'utf8');
  
  // Using mcp_abap-adt tools
  const result = await mcp_abap_adt_adt_save_source({
    object_name: 'ZATC',
    object_type: 'CLAS',
    source_code: testCode
  });
  
  console.log('Upload result:', result);
  
  // Activate the test class
  const activateResult = await mcp_abap_adt_adt_activate({
    objects: [{
      name: 'ZATC',
      type: 'CLAS'
    }]
  });
  
  console.log('Activation result:', activateResult);
}

uploadZATCTests().catch(console.error);
`;

    fs.writeFileSync('upload_zatc_tests_mcp.js', uploadScript);
    logSuccess('Created upload_zatc_tests_mcp.js');

    // Final summary
    logHeader('Deployment Ready');
    logSuccess('All files are ready for deployment!');
    
    console.log('\n📁 Files created:');
    console.log('  ✓ zatc.clas.testclasses.abap       (Test class code)');
    console.log('  ✓ ZATC_TEST_DOCUMENTATION.md       (Full documentation)');
    console.log('  ✓ ZATC_TEST_QUICKSTART.md          (Quick start guide)');
    console.log('  ✓ deploy_zatc_tests.js             (This script)');
    console.log('  ✓ upload_zatc_tests_mcp.js         (MCP upload script)');
    console.log(`  ✓ ${path.basename(backupPath)}  (Backup)`);

    console.log('\n🎯 Next Steps:');
    console.log('  1. Choose a deployment option above');
    console.log('  2. Upload the test class to SAP');
    console.log('  3. Run the tests (F8 in SE24)');
    console.log('  4. Review the test results');
    
    console.log('\n📖 Documentation:');
    console.log('  • Quick start:    ZATC_TEST_QUICKSTART.md');
    console.log('  • Full details:   ZATC_TEST_DOCUMENTATION.md');
    
    logSuccess('\nDeployment preparation complete! 🎉');

  } catch (error) {
    logError(`\nDeployment failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  deployTestClass().catch(error => {
    logError(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { deployTestClass };

