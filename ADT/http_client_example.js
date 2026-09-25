#!/usr/bin/env node

/**
 * HTTP Client Example for ABAP ADT MCP Server
 * 
 * Demonstrates how to call the MCP server over HTTP.
 * 
 * Usage:
 *   node http_client_example.js
 *   HTTP_API_KEY=your-secret-key node http_client_example.js
 */

import axios from 'axios';

// Configuration
const BASE_URL = process.env.MCP_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.HTTP_API_KEY || 'test-api-key';

// Create axios instance with default config
const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
  },
  timeout: 30000 // 30 seconds
});

// Helper function to log responses
function logResponse(title, response) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  ${title}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(JSON.stringify(response.data, null, 2));
  console.log('');
}

// Helper function to log errors
function logError(title, error) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  ❌ ${title}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  if (error.response) {
    console.log('Status:', error.response.status);
    console.log('Data:', JSON.stringify(error.response.data, null, 2));
  } else {
    console.log('Error:', error.message);
  }
  console.log('');
}

// Test functions
async function testHealthCheck() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    logResponse('✅ Health Check', response);
    return true;
  } catch (error) {
    logError('Health Check Failed', error);
    return false;
  }
}

async function testListTools() {
  try {
    const response = await client.get('/api/tools');
    logResponse('✅ List Available Tools', response);
    return true;
  } catch (error) {
    logError('List Tools Failed', error);
    return false;
  }
}

async function testExecuteSqlQuery() {
  try {
    const response = await client.post('/api/tools/adt_execute_sql_query', {
      sql_query: 'SELECT * FROM t000 UP TO 3 ROWS',
      max_rows: 3
    });
    logResponse('✅ Execute SQL Query (T000)', response);
    return true;
  } catch (error) {
    logError('SQL Query Failed', error);
    return false;
  }
}

async function testReadSource() {
  try {
    const response = await client.post('/api/tools/adt_read_source', {
      object_name: 'CL_ABAP_TYPEDESCR',
      object_type: 'CLAS'
    });
    
    // Truncate response for display
    const result = response.data;
    if (result.result && result.result.length > 500) {
      result.result = result.result.substring(0, 500) + '\n... (truncated)';
    }
    
    logResponse('✅ Read Source Code (CL_ABAP_TYPEDESCR)', { data: result });
    return true;
  } catch (error) {
    logError('Read Source Failed', error);
    return false;
  }
}

async function testListPackageObjects() {
  try {
    const response = await client.post('/api/tools/adt_list_package_objects', {
      package_name: '/COREVIST/TEMP',
      object_type: 'CLAS'
    });
    logResponse('✅ List Package Objects (/COREVIST/TEMP)', response);
    return true;
  } catch (error) {
    logError('List Package Objects Failed', error);
    return false;
  }
}

async function testSwitchSystem() {
  try {
    const response = await client.post('/api/tools/adt_switch_system', {
      system: 'BTP'
    });
    logResponse('✅ Switch System to BTP', response);
    
    // Switch back to DEV
    const response2 = await client.post('/api/tools/adt_switch_system', {
      system: 'DEV'
    });
    logResponse('✅ Switch System back to DEV', response2);
    
    return true;
  } catch (error) {
    logError('Switch System Failed', error);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ABAP ADT MCP Server - HTTP Client Test Suite');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Base URL:                ${BASE_URL}`);
  console.log(`  API Key:                 ${API_KEY ? API_KEY.substring(0, 4) + '*'.repeat(API_KEY.length - 4) : '(not set)'}`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck, required: true },
    { name: 'List Tools', fn: testListTools },
    { name: 'Execute SQL Query', fn: testExecuteSqlQuery },
    { name: 'Read Source Code', fn: testReadSource },
    { name: 'List Package Objects', fn: testListPackageObjects },
    { name: 'Switch System', fn: testSwitchSystem }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n⏳ Running: ${test.name}...`);
    const result = await test.fn();
    
    if (result) {
      passed++;
    } else {
      failed++;
      if (test.required) {
        console.log('\n❌ Required test failed. Stopping test suite.');
        break;
      }
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Test Results');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  ✅ Passed:                ${passed}`);
  console.log(`  ❌ Failed:                ${failed}`);
  console.log(`  📊 Total:                 ${passed + failed}`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
