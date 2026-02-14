// websocket-connection.js - React Native compatible version
import { Platform } from 'react-native';

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.url = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10; // Increased for mobile
    this.reconnectDelay = 3000;
    this.listeners = {
      connection: [],
      message: [],
      disconnection: [],
      error: []
    };
    this.connected = false;
    this.messageQueue = [];
    this.heartbeatInterval = null;
    this.heartbeatDelay = 25000; // 25 seconds
    
    // For React Native debugging
    this.debug = true;
    this.connectionTimeout = null;
  }

  connect(url) {
    if (this.ws && this.connected) {
      this.log('🔄 Already connected, skipping new connection');
      return;
    }

    this.log(`🔗 Attempting to connect to WebSocket: ${url}`);
    this.url = url;

    // Clear any existing connection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    try {
      // For React Native, create WebSocket with error handling
      // Note: React Native's WebSocket doesn't support protocols array like browsers
      this.ws = new WebSocket(url);
      
      // Set connection timeout (15 seconds)
      this.connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState !== 1) { // 1 = OPEN
          this.log('⏰ Connection timeout - closing socket');
          if (this.ws) {
            this.ws.close();
          }
          this.handleConnectionError(new Error('Connection timeout'));
        }
      }, 15000);
      
      // Set up event handlers
      this.setupEventHandlers();
      
    } catch (error) {
      this.log(`❌ Failed to create WebSocket connection: ${error.message}`);
      this.handleConnectionError(error);
    }
  }

  setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      // Clear connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      this.log('✅ WebSocket connection established');
      this.connected = true;
      this.reconnectAttempts = 0;
      
      // Start heartbeat for mobile (longer intervals)
      this.startHeartbeat();
      
      // Flush message queue
      this.flushMessageQueue();
      
      // Notify listeners
      this.notifyListeners('connection', { 
        url: this.url, 
        timestamp: new Date().toISOString(),
        platform: Platform.OS
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.log(`📨 WebSocket message received: ${message.type}`);
        this.notifyListeners('message', message);
      } catch (error) {
        this.log(`❌ Error parsing WebSocket message: ${error.message}`);
        this.notifyListeners('error', { 
          type: 'parse_error', 
          error: error.message,
          data: event.data 
        });
      }
    };

    this.ws.onclose = (event) => {
      // Clear connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      this.log(`🔌 WebSocket connection closed: ${event.code} - ${event.reason}`);
      this.connected = false;
      
      // Stop heartbeat
      this.stopHeartbeat();
      
      // Notify listeners
      this.notifyListeners('disconnection', { 
        code: event.code, 
        reason: event.reason,
        wasClean: event.wasClean,
        timestamp: new Date().toISOString()
      });
      
      // Attempt reconnection (important for mobile)
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      // Clear connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      this.log(`⚠️ WebSocket error: ${error.message || 'Unknown error'}`);
      this.handleConnectionError(error);
    };
  }

  handleConnectionError(error) {
    this.connected = false;
    this.notifyListeners('error', { 
      type: 'connection_error', 
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
    
    // Attempt reconnection
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnect();
    }
  }

  send(message) {
    // Check if WebSocket exists and is in OPEN state (state 1)
    if (!this.ws || this.ws.readyState !== 1) {
      this.log(`📦 WebSocket not ready (state: ${this.ws ? this.ws.readyState : 'no ws'}), queuing message: ${message.type}`);
      this.messageQueue.push({
        message,
        timestamp: new Date().toISOString()
      });
      
      // Try to reconnect if not connected
      if (!this.connected && this.reconnectAttempts === 0) {
        this.log('🔄 Attempting to reconnect for queued message');
        setTimeout(() => this.attemptReconnect(), 1000);
      }
      return false;
    }

    try {
      const messageStr = JSON.stringify(message);
      this.ws.send(messageStr);
      this.log(`📤 WebSocket message sent: ${message.type}`);
      return true;
    } catch (error) {
      this.log(`❌ Failed to send WebSocket message: ${error.message}`);
      this.notifyListeners('error', { 
        type: 'send_error', 
        error: error.message,
        message 
      });
      
      // Queue the failed message
      this.messageQueue.push({
        message,
        timestamp: new Date().toISOString(),
        failed: true
      });
      return false;
    }
  }

  disconnect() {
    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Stop heartbeat
    this.stopHeartbeat();
    
    // Reset reconnect attempts
    this.reconnectAttempts = 0;
    
    if (this.ws) {
      this.log('👋 Disconnecting WebSocket...');
      
      // Remove event listeners to prevent memory leaks
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      
      // Close connection
      this.ws.close(1000, 'Client initiated disconnect');
      this.ws = null;
    }
    
    this.connected = false;
    this.messageQueue = [];
    
    // Notify disconnection
    this.notifyListeners('disconnection', {
      code: 1000,
      reason: 'Client initiated disconnect',
      wasClean: true,
      timestamp: new Date().toISOString()
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log('🛑 Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
    
    this.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.connected && this.url) {
        this.log(`🔗 Reconnecting to ${this.url}...`);
        this.connect(this.url);
      } else if (this.connected) {
        this.log('✅ Already reconnected, skipping');
      }
    }, delay);
  }

  flushMessageQueue() {
    if (this.messageQueue.length === 0) return;
    
    this.log(`📨 Flushing ${this.messageQueue.length} queued messages`);
    const messagesToSend = [...this.messageQueue];
    this.messageQueue = [];
    
    // Send each queued message
    messagesToSend.forEach(queued => {
      this.log(`📤 Attempting to send queued message: ${queued.message.type}`);
      const success = this.send(queued.message);
      
      if (!success) {
        // Re-queue if failed
        this.messageQueue.push(queued);
      }
    });
  }

  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing interval
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping', timestamp: Date.now() });
      } else {
        this.log('💓 Skipping heartbeat - not connected');
      }
    }, this.heartbeatDelay);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Event listener management
  onConnection(callback) {
    if (typeof callback === 'function') {
      this.listeners.connection.push(callback);
    }
  }

  onMessage(callback) {
    if (typeof callback === 'function') {
      this.listeners.message.push(callback);
    }
  }

  onDisconnection(callback) {
    if (typeof callback === 'function') {
      this.listeners.disconnection.push(callback);
    }
  }

  onError(callback) {
    if (typeof callback === 'function') {
      this.listeners.error.push(callback);
    }
  }

  removeListener(type, callback) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
    }
  }

  removeAllListeners() {
    this.listeners = {
      connection: [],
      message: [],
      disconnection: [],
      error: []
    };
  }

  notifyListeners(type, data) {
    if (this.listeners[type]) {
      // Create a copy to avoid issues if listeners modify the array
      const listenersCopy = [...this.listeners[type]];
      listenersCopy.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in ${type} listener:`, error);
        }
      });
    }
  }

  isConnected() {
    return this.connected && this.ws && this.ws.readyState === 1; // 1 = OPEN
  }

  getConnectionState() {
    if (!this.ws) return 'disconnected';
    
    const state = this.ws.readyState;
    switch (state) {
      case 0: return 'connecting';    // CONNECTING
      case 1: return 'connected';     // OPEN
      case 2: return 'closing';       // CLOSING
      case 3: return 'disconnected';  // CLOSED
      default: return 'unknown';
    }
  }

  getStats() {
    return {
      connected: this.connected,
      connectionState: this.getConnectionState(),
      reconnectAttempts: this.reconnectAttempts,
      messageQueueLength: this.messageQueue.length,
      url: this.url,
      platform: Platform.OS,
      heartbeatActive: !!this.heartbeatInterval
    };
  }

  log(message) {
    if (this.debug) {
      console.log(`[WebSocket ${Platform.OS}] ${message}`);
    }
  }

  // Helper to get appropriate WebSocket URL for platform
  static getPlatformSpecificUrl(baseUrl) {
    if (Platform.OS === 'android') {
      // Android emulator needs special IP
      return baseUrl.replace('localhost', '10.0.2.2');
    }
    return baseUrl;
  }
}

// Create singleton instance
const webSocketManager = new WebSocketManager();

// Export both the class and the singleton instance
export { WebSocketManager };
export default webSocketManager;