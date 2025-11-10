// backend/test-api.js - RUN THIS TO DEBUG YOUR API
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

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function test() {
  console.log('\n');
  log('cyan', '═══════════════════════════════════════════════');
  log('cyan', '    🔍 API DEBUGGING TEST SCRIPT');
  log('cyan', '═══════════════════════════════════════════════');
  console.log('\n');

  // TEST 1: Check if server is running
  log('blue', '📡 TEST 1: Checking if server is running...');
  try {
    const response = await axios.get(`${API_URL}/`);
    log('green', `✅ Server is running! Status: ${response.status}`);
  } catch (error) {
    log('red', '❌ Server is NOT running!');
    log('yellow', '👉 Start your server: cd backend && node server.js');
    return;
  }

  // TEST 2: Check endpoint WITHOUT auth
  log('blue', '\n📡 TEST 2: Testing endpoint WITHOUT authentication...');
  try {
    const response = await axios.get(`${API_URL}/api/event-manager/planner/events`);
    log('red', `❌ Endpoint should require auth but didn't! Status: ${response.status}`);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      log('green', '✅ Auth required (401) - This is correct!');
    } else {
      log('red', `❌ Unexpected error: ${error.message}`);
    }
  }

  // TEST 3: Check endpoint WITH dummy token
  log('blue', '\n📡 TEST 3: Testing endpoint WITH dummy token...');
  try {
    const response = await axios.get(`${API_URL}/api/event-manager/planner/events`, {
      headers: {
        'Authorization': 'Bearer dummy_test_token_12345'
      }
    });
    
    log('green', `✅ Success! Status: ${response.status}`);
    log('green', `✅ Got response with ${response.data.events?.length || 0} events`);
    
    console.log('\n📊 Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.events && response.data.events.length > 0) {
      console.log('\n📋 First Event Sample:');
      const firstEvent = response.data.events[0];
      console.log(`  ID: ${firstEvent.id}`);
      console.log(`  Name: ${firstEvent.name}`);
      console.log(`  Category: ${firstEvent.category}`);
      console.log(`  Contacts: ${firstEvent.contacts?.emails?.join(', ') || 'None'}`);
      console.log(`  Partnership Score: ${firstEvent.partnershipScore}`);
    }
    
  } catch (error) {
    log('red', '❌ Failed to fetch events');
    console.error('Error details:', error.response?.data || error.message);
  }

  // TEST 4: Check insights endpoint
  log('blue', '\n📡 TEST 4: Testing insights endpoint...');
  try {
    const response = await axios.get(`${API_URL}/api/event-manager/planner/events/evt_001/insights`, {
      headers: {
        'Authorization': 'Bearer dummy_test_token_12345'
      }
    });
    
    log('green', `✅ Insights endpoint working! Status: ${response.status}`);
    console.log('\n🤖 AI Insights Preview:');
    console.log(`  Approach: ${response.data.insights?.approachStrategy?.substring(0, 100)}...`);
    console.log(`  Success Probability: ${response.data.insights?.successProbability?.rating}`);
    
  } catch (error) {
    log('red', '❌ Insights endpoint failed');
    console.error('Error:', error.response?.data || error.message);
  }

  // TEST 5: Check scraper status
  log('blue', '\n📡 TEST 5: Testing scraper status endpoint...');
  try {
    const response = await axios.get(`${API_URL}/api/event-manager/planner/scraper-status`, {
      headers: {
        'Authorization': 'Bearer dummy_test_token_12345'
      }
    });
    
    log('green', `✅ Scraper status endpoint working!`);
    console.log('Status:', response.data.status);
    
  } catch (error) {
    log('red', '❌ Scraper status endpoint failed');
    console.error('Error:', error.response?.data || error.message);
  }

  // SUMMARY
  console.log('\n');
  log('cyan', '═══════════════════════════════════════════════');
  log('cyan', '    📊 TEST SUMMARY');
  log('cyan', '═══════════════════════════════════════════════');
  console.log('\n');
  
  log('yellow', '🔧 NEXT STEPS:');
  console.log('');
  log('yellow', '1. Make sure your backend/server.js includes:');
  console.log('   const eventPlannerRoutes = require(\'./routes/eventManagerPlanner\');');
  console.log('   app.use(\'/api/event-manager/planner\', eventPlannerRoutes);');
  console.log('');
  log('yellow', '2. In your React Native app, check:');
  console.log('   - API_URL = \'http://localhost:3000\'');
  console.log('   - Authentication token is being set correctly');
  console.log('   - Check browser console for errors');
  console.log('');
  log('yellow', '3. Open browser DevTools (F12) and check:');
  console.log('   - Network tab for API requests');
  console.log('   - Console tab for errors');
  console.log('   - Look for 401/403 auth errors');
  console.log('');
}

// Run tests
console.log('Starting API tests...\n');
test().catch(err => {
  log('red', '\n💥 Fatal error during testing:');
  console.error(err);
});