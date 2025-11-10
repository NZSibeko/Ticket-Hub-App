// scripts/testAccessControl.js
// Test script to verify Event Planner access control
// Usage: node scripts/testAccessControl.js

const axios = require('axios');

const API_URL = 'http://localhost:3000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.cyan}🧪 ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`)
};

// Test credentials
const credentials = {
  eventManager: {
    username: 'eventmanager',
    password: 'eventmanager123'
  },
  customer: {
    username: 'test@customer.com', // Change to your test customer
    password: 'password123'
  },
  admin: {
    username: 'admin', // Change to your admin username
    password: 'admin123'
  }
};

let tokens = {
  eventManager: null,
  customer: null,
  admin: null
};

// Helper function to make requests
async function makeRequest(method, endpoint, token, data = null) {
  const config = {
    method,
    url: `${API_URL}${endpoint}`,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
  
  if (data) {
    config.data = data;
  }
  
  return axios(config);
}

// Test 1: Event Manager Login
async function testEventManagerLogin() {
  log.test('Test 1: Event Manager Login');
  
  try {
    const response = await makeRequest('post', '/api/event-manager/auth/login', null, credentials.eventManager);
    
    if (response.data.success && response.data.token) {
      tokens.eventManager = response.data.token;
      log.success(`Event manager logged in: ${response.data.user.username}`);
      log.info(`Role: ${response.data.user.userType}`);
      return true;
    } else {
      log.error('Event manager login failed - invalid response');
      return false;
    }
  } catch (error) {
    log.error(`Event manager login failed: ${error.response?.data?.error || error.message}`);
    log.warn('Make sure you have created an event manager account first!');
    log.info('Run: node scripts/createEventManager.js');
    return false;
  }
}

// Test 2: Customer Login
async function testCustomerLogin() {
  log.test('Test 2: Customer Login');
  
  try {
    const response = await makeRequest('post', '/api/auth/login', null, credentials.customer);
    
    if (response.data.success && response.data.token) {
      tokens.customer = response.data.token;
      log.success(`Customer logged in: ${response.data.user.email}`);
      log.info(`Role: ${response.data.user.role}`);
      return true;
    } else {
      log.error('Customer login failed - invalid response');
      return false;
    }
  } catch (error) {
    log.error(`Customer login failed: ${error.response?.data?.error || error.message}`);
    log.warn('Update credentials.customer in this script with valid customer credentials');
    return false;
  }
}

// Test 3: Admin Login
async function testAdminLogin() {
  log.test('Test 3: Admin Login');
  
  try {
    const response = await makeRequest('post', '/api/admin/auth/login', null, credentials.admin);
    
    if (response.data.success && response.data.token) {
      tokens.admin = response.data.token;
      log.success(`Admin logged in: ${response.data.admin.username}`);
      log.info(`Role: ${response.data.admin.role}`);
      return true;
    } else {
      log.error('Admin login failed - invalid response');
      return false;
    }
  } catch (error) {
    log.error(`Admin login failed: ${error.response?.data?.error || error.message}`);
    log.warn('Update credentials.admin in this script with valid admin credentials');
    return false;
  }
}

// Test 4: Event Manager Access to Planner (Should SUCCEED)
async function testEventManagerAccess() {
  log.test('Test 4: Event Manager Access to Planner (Should SUCCEED)');
  
  if (!tokens.eventManager) {
    log.warn('Skipping - no event manager token');
    return false;
  }
  
  try {
    const response = await makeRequest('get', '/api/event-manager/planner/events', tokens.eventManager);
    
    if (response.data.success) {
      log.success(`Event manager can access planner`);
      log.info(`Retrieved ${response.data.events?.length || 0} events`);
      return true;
    } else {
      log.error('Event manager access failed - invalid response');
      return false;
    }
  } catch (error) {
    log.error(`Event manager access failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Test 5: Customer Access to Planner (Should FAIL)
async function testCustomerAccessDenied() {
  log.test('Test 5: Customer Access to Planner (Should FAIL with 403)');
  
  if (!tokens.customer) {
    log.warn('Skipping - no customer token');
    return false;
  }
  
  try {
    const response = await makeRequest('get', '/api/event-manager/planner/events', tokens.customer);
    
    // If we get here, access was granted (WRONG!)
    log.error('SECURITY ISSUE: Customer was granted access to Event Planner!');
    return false;
  } catch (error) {
    if (error.response?.status === 403) {
      log.success('Customer correctly denied access (403 Forbidden)');
      log.info(`Error message: ${error.response.data.error}`);
      return true;
    } else {
      log.error(`Unexpected error: ${error.response?.status} - ${error.message}`);
      return false;
    }
  }
}

// Test 6: Admin Access to Planner (Should SUCCEED)
async function testAdminAccess() {
  log.test('Test 6: Admin Access to Planner (Should SUCCEED)');
  
  if (!tokens.admin) {
    log.warn('Skipping - no admin token');
    return false;
  }
  
  try {
    const response = await makeRequest('get', '/api/event-manager/planner/events', tokens.admin);
    
    if (response.data.success) {
      log.success(`Admin can access planner`);
      log.info(`Retrieved ${response.data.events?.length || 0} events`);
      return true;
    } else {
      log.error('Admin access failed - invalid response');
      return false;
    }
  } catch (error) {
    log.error(`Admin access failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Test 7: Access without token (Should FAIL)
async function testNoTokenAccess() {
  log.test('Test 7: Access without token (Should FAIL with 401)');
  
  try {
    const response = await makeRequest('get', '/api/event-manager/planner/events', null);
    
    // If we get here, access was granted (WRONG!)
    log.error('SECURITY ISSUE: Unauthenticated access was granted!');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      log.success('Unauthenticated request correctly denied (401 Unauthorized)');
      return true;
    } else {
      log.error(`Unexpected error: ${error.response?.status} - ${error.message}`);
      return false;
    }
  }
}

// Test 8: Get Event Insights (Event Manager)
async function testEventInsights() {
  log.test('Test 8: Get Event Insights (Event Manager)');
  
  if (!tokens.eventManager) {
    log.warn('Skipping - no event manager token');
    return false;
  }
  
  try {
    // First get events list
    const eventsResponse = await makeRequest('get', '/api/event-manager/planner/events', tokens.eventManager);
    
    if (eventsResponse.data.events && eventsResponse.data.events.length > 0) {
      const eventId = eventsResponse.data.events[0].id;
      
      // Get insights for first event
      const insightsResponse = await makeRequest(
        'get', 
        `/api/event-manager/planner/events/${eventId}/insights`, 
        tokens.eventManager
      );
      
      if (insightsResponse.data.success && insightsResponse.data.insights) {
        log.success('Event insights retrieved successfully');
        log.info(`Event: ${insightsResponse.data.event.name}`);
        log.info(`Strategy: ${insightsResponse.data.insights.approachStrategy.substring(0, 50)}...`);
        return true;
      }
    } else {
      log.warn('No events available to test insights');
      return false;
    }
  } catch (error) {
    log.error(`Event insights failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🔒 EVENT PLANNER ACCESS CONTROL TEST SUITE');
  console.log('='.repeat(60) + '\n');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  const tests = [
    { name: 'Event Manager Login', fn: testEventManagerLogin },
    { name: 'Customer Login', fn: testCustomerLogin },
    { name: 'Admin Login', fn: testAdminLogin },
    { name: 'Event Manager Access', fn: testEventManagerAccess },
    { name: 'Customer Access Denied', fn: testCustomerAccessDenied },
    { name: 'Admin Access', fn: testAdminAccess },
    { name: 'No Token Access Denied', fn: testNoTokenAccess },
    { name: 'Event Insights', fn: testEventInsights }
  ];
  
  for (const test of tests) {
    results.total++;
    const passed = await test.fn();
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
    console.log(''); // Empty line between tests
  }
  
  // Summary
  console.log('='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.total}`);
  log.success(`Passed: ${results.passed}`);
  if (results.failed > 0) {
    log.error(`Failed: ${results.failed}`);
  }
  console.log('='.repeat(60) + '\n');
  
  // Overall result
  if (results.failed === 0) {
    log.success('🎉 ALL TESTS PASSED! Access control is working correctly.');
  } else {
    log.error('⚠️  SOME TESTS FAILED. Please review the errors above.');
  }
  
  // Recommendations
  if (results.failed > 0) {
    console.log('\n📋 TROUBLESHOOTING:');
    console.log('1. Make sure the server is running (node server.js)');
    console.log('2. Verify event_managers table exists in database');
    console.log('3. Create event manager: node scripts/createEventManager.js');
    console.log('4. Update test credentials in this script if needed');
    console.log('5. Check server logs for detailed error messages\n');
  }
}

// Run tests
runAllTests().catch(error => {
  log.error(`Test suite failed: ${error.message}`);
  process.exit(1);
});