// src/screens/DebugScreen.js
import axios from 'axios';
import { useState } from 'react';
import {
    Alert,
    Button,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const DebugScreen = () => {
  const { user, getAuthHeader, logout } = useAuth();
  const [status, setStatus] = useState('Ready');
  const [testResults, setTestResults] = useState({});
  const [isTesting, setIsTesting] = useState(false);

  const runAllTests = async () => {
    setIsTesting(true);
    setStatus('Running tests...');
    const results = {};

    try {
      // Test 1: Health endpoint
      setStatus('Testing health endpoint...');
      try {
        const healthRes = await axios.get('http://localhost:8081/api/health', { timeout: 5000 });
        results.health = {
          success: true,
          message: healthRes.data.message,
          data: healthRes.data
        };
      } catch (error) {
        results.health = {
          success: false,
          error: error.message,
          code: error.code
        };
      }

      // Test 2: Auth test
      setStatus('Testing authentication...');
      const headers = getAuthHeader();
      if (headers.Authorization) {
        try {
          const debugRes = await axios.get('http://localhost:8081/api/debug/database-test', { 
            headers,
            timeout: 10000 
          });
          results.auth = {
            success: true,
            message: debugRes.data.message,
            userEvents: debugRes.data.debug?.database?.userEvents?.length || 0,
            totalEvents: debugRes.data.debug?.database?.totalEvents || 0
          };
        } catch (error) {
          results.auth = {
            success: false,
            error: error.response?.data?.error || error.message,
            status: error.response?.status
          };
        }
      } else {
        results.auth = {
          success: false,
          error: 'No auth token available'
        };
      }

      // Test 3: Events endpoint
      setStatus('Testing events endpoint...');
      if (headers.Authorization) {
        try {
          const eventsRes = await axios.get('http://localhost:8081/api/events', { 
            headers,
            timeout: 10000 
          });
          results.events = {
            success: true,
            count: eventsRes.data.events?.length || 0,
            message: eventsRes.data.message
          };
        } catch (error) {
          results.events = {
            success: false,
            error: error.response?.data?.error || error.message,
            status: error.response?.status,
            details: error.response?.data?.details
          };
        }
      }

      setTestResults(results);
      setStatus('Tests completed');
      
      // Show summary
      const passed = Object.values(results).filter(r => r.success).length;
      const total = Object.keys(results).length;
      
      Alert.alert(
        'Test Results',
        `Passed: ${passed}/${total}\n\n` +
        `Health: ${results.health?.success ? '✅' : '❌'}\n` +
        `Auth: ${results.auth?.success ? '✅' : '❌'}\n` +
        `Events: ${results.events?.success ? '✅' : '❌'}`
      );

    } catch (error) {
      setStatus('Test failed');
      Alert.alert('Test Error', error.message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔧 Debug & Diagnostics</Text>
      
      <View style={styles.userCard}>
        <Text style={styles.userTitle}>Current User</Text>
        <Text>Email: {user?.email || 'Not logged in'}</Text>
        <Text>Role: {user?.role || user?.userType || 'Unknown'}</Text>
        <Text>User ID: {user?.user_id || 'N/A'}</Text>
        <Text>Status: {status}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Tests</Text>
        <Button 
          title={isTesting ? "Testing..." : "Run All Tests"} 
          onPress={runAllTests}
          disabled={isTesting}
          color="#007AFF"
        />
      </View>

      {Object.keys(testResults).length > 0 && (
        <View style={styles.results}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          
          {testResults.health && (
            <View style={[styles.testResult, testResults.health.success ? styles.success : styles.error]}>
              <Text style={styles.testTitle}>Health Endpoint</Text>
              <Text>{testResults.health.success ? '✅ Success' : '❌ Failed'}</Text>
              <Text>{testResults.health.message || testResults.health.error}</Text>
            </View>
          )}

          {testResults.auth && (
            <View style={[styles.testResult, testResults.auth.success ? styles.success : styles.error]}>
              <Text style={styles.testTitle}>Authentication</Text>
              <Text>{testResults.auth.success ? '✅ Success' : '❌ Failed'}</Text>
              <Text>{testResults.auth.message || testResults.auth.error}</Text>
              {testResults.auth.userEvents !== undefined && (
                <Text>Your events: {testResults.auth.userEvents}</Text>
              )}
            </View>
          )}

          {testResults.events && (
            <View style={[styles.testResult, testResults.events.success ? styles.success : styles.error]}>
              <Text style={styles.testTitle}>Events API</Text>
              <Text>{testResults.events.success ? '✅ Success' : '❌ Failed'}</Text>
              <Text>{testResults.events.message || testResults.events.error}</Text>
              {testResults.events.count !== undefined && (
                <Text>Events found: {testResults.events.count}</Text>
              )}
              {testResults.events.details && (
                <Text style={styles.errorText}>Details: {testResults.events.details}</Text>
              )}
            </View>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Troubleshooting</Text>
        <Text style={styles.tip}>
          💡 If tests fail:
        </Text>
        <Text style={styles.tip}>1. Ensure backend is running: node backend/server.js</Text>
        <Text style={styles.tip}>2. Check server URL: http://localhost:8081</Text>
        <Text style={styles.tip}>3. Verify database has events</Text>
        <Text style={styles.tip}>4. Try logging out and back in</Text>
      </View>

      <View style={styles.footer}>
        <Button 
          title="Logout & Retry" 
          onPress={() => {
            logout();
            Alert.alert('Logged out', 'Please login again to test');
          }}
          color="#FF3B30"
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  userCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  results: {
    marginBottom: 20,
  },
  testResult: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  success: {
    backgroundColor: '#d4edda',
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  error: {
    backgroundColor: '#f8d7da',
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  testTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  errorText: {
    color: '#721c24',
    fontSize: 12,
    marginTop: 5,
  },
  tip: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
  },
});

export default DebugScreen;