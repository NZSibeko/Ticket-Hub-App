// src/hooks/useWebSocket.js
import { useCallback, useEffect, useRef, useState } from 'react';

const useWebSocket = (url, options = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const ws = useRef(null);
  const reconnectCount = useRef(0);
  const maxReconnectAttempts = options.reconnectAttempts || 10;

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(url);
      
      ws.current.onopen = () => {
        setIsConnected(true);
        reconnectCount.current = 0;
        console.log('WebSocket connected successfully');
        options.onOpen?.();
      };
      
      ws.current.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        options.onClose?.();
        
        // Attempt to reconnect
        if (reconnectCount.current < maxReconnectAttempts) {
          reconnectCount.current += 1;
          setTimeout(() => {
            console.log(`Reconnection attempt ${reconnectCount.current}`);
            connect();
          }, options.reconnectInterval || 5000);
        }
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        options.onError?.(error);
      };
      
      ws.current.onmessage = (event) => {
        try {
          setLastMessage(event.data);
          options.onMessage?.(event.data);
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      options.onError?.(error);
    }
  }, [url, options, maxReconnectAttempts]);

  useEffect(() => {
    connect();
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const sendMessage = (message) => {
    if (ws.current && isConnected) {
      try {
        if (typeof message === 'object') {
          ws.current.send(JSON.stringify(message));
        } else {
          ws.current.send(message);
        }
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    }
    return false;
  };

  const reconnect = () => {
    if (ws.current) {
      ws.current.close();
    }
    reconnectCount.current = 0;
    connect();
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
    reconnect,
    connectionStatus: isConnected ? 'connected' : 'disconnected'
  };
};

export default useWebSocket;