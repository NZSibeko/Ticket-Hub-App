import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';


class WebSocketManager {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 20; // Increased for better reconnection
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 10000;
    this.messageCallbacks = [];
    this.connectionCallbacks = [];
    this.disconnectionCallbacks = [];
    this.errorCallbacks = [];
    this.heartbeatInterval = null;
    this.url = null;
    this.isManualDisconnect = false;
  }

  connect(url) {
    this.url = url;
    this.isManualDisconnect = false;
    
    // If already connecting or connected, don't reconnect
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    console.log(`🔗 Connecting to WebSocket: ${url}`);
    
    try {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.notifyConnection();
      };

      this.ws.onclose = (event) => {
        console.log(`🔌 WebSocket disconnected: Code ${event.code}, Reason: ${event.reason || 'No reason'}`);
        
        this.stopHeartbeat();
        this.notifyDisconnection();
        
        // Only attempt reconnect if not manually disconnected and under max attempts
        if (!this.isManualDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          
          // Exponential backoff with jitter
          const baseDelay = Math.min(
            this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1),
            this.maxReconnectDelay
          );
          const jitter = Math.random() * 1000;
          const delay = baseDelay + jitter;
          
          console.log(`🔄 Reconnecting in ${Math.round(delay)}ms... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          
          setTimeout(() => {
            if (!this.isManualDisconnect) {
              this.connect(this.url);
            }
          }, delay);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('❌ Max reconnection attempts reached');
          Alert.alert(
            'Connection Lost',
            'Unable to connect to chat server. Please refresh the page.',
            [{ text: 'OK', onPress: () => window.location.reload() }]
          );
        }
      };

      this.ws.onerror = (error) => {
        console.error('⚠️ WebSocket error:', error);
        this.notifyError(error);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Received WebSocket message:', message.type);
          this.notifyMessage(message);
          
          // Handle heartbeat responses
          if (message.type === 'pong' || message.type === 'heartbeat') {
            console.log('❤️ Heartbeat received');
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error, 'Raw data:', event.data);
        }
      };
      
    } catch (error) {
      console.error('❌ Error creating WebSocket:', error);
      this.notifyError(error);
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const messageStr = JSON.stringify(message);
        this.ws.send(messageStr);
        console.log('📤 Sent WebSocket message:', message.type);
        return true;
      } catch (error) {
        console.error('❌ Error sending WebSocket message:', error);
        return false;
      }
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message. State:', this.ws?.readyState);
      
      // Try to reconnect if not connected
      if (!this.isManualDisconnect && this.url) {
        console.log('Attempting to reconnect before sending...');
        this.connect(this.url);
      }
      
      return false;
    }
  }

  disconnect() {
    console.log('🛑 Manually disconnecting WebSocket');
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.reconnectAttempts = 0;
  }

  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing interval
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', timestamp: new Date().toISOString() });
      }
    }, 15000); // Send ping every 15 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Event listeners
  onMessage(callback) {
    if (!this.messageCallbacks.includes(callback)) {
      this.messageCallbacks.push(callback);
    }
  }

  onConnection(callback) {
    if (!this.connectionCallbacks.includes(callback)) {
      this.connectionCallbacks.push(callback);
    }
  }

  onDisconnection(callback) {
    if (!this.disconnectionCallbacks.includes(callback)) {
      this.disconnectionCallbacks.push(callback);
    }
  }

  onError(callback) {
    if (!this.errorCallbacks.includes(callback)) {
      this.errorCallbacks.push(callback);
    }
  }

  // Remove event listeners
  removeMessageListener(callback) {
    this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
  }

  removeConnectionListener(callback) {
    this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback);
  }

  removeDisconnectionListener(callback) {
    this.disconnectionCallbacks = this.disconnectionCallbacks.filter(cb => cb !== callback);
  }

  removeErrorListener(callback) {
    this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
  }

  // Notify all listeners
  notifyMessage(message) {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in message callback:', error);
      }
    });
  }

  notifyConnection() {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }

  notifyDisconnection() {
    this.disconnectionCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in disconnection callback:', error);
      }
    });
  }

  notifyError(error) {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (error) {
        console.error('Error in error callback:', error);
      }
    });
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  getState() {
    if (!this.ws) return 'DISCONNECTED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'CONNECTED';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'DISCONNECTED';
      default:
        return 'UNKNOWN';
    }
  }
}

// Create singleton instance
const webSocketManager = new WebSocketManager();
export default webSocketManager;

// API function example
const fetchData = async () => {
  try {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
  }
};
