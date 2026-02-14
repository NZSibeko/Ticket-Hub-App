// SupportChatScreen.web.js - COMPLETE FIXED VERSION
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import webSocketManager from './websocket-connection';

// Development configuration
const USE_MOCK_DATA = false;
const API_URL = 'http://localhost:8081';
const WS_URL = 'ws://localhost:8081';

const { width } = Dimensions.get('window');

// Mock data for development
const MOCK_CONVERSATIONS = [
  {
    conversation_id: 'conv_1',
    platform: 'whatsapp',
    customer_name: 'John Doe',
    customer_phone: '+1234567890',
    status: 'active',
    last_message: 'Hello, I need help with my order #12345',
    last_message_time: new Date().toISOString(),
    unread_count: 2
  },
  {
    conversation_id: 'conv_2',
    platform: 'facebook',
    customer_name: 'Jane Smith',
    customer_phone: '+1234567891',
    status: 'active',
    last_message: 'Can you help me with my ticket?',
    last_message_time: new Date(Date.now() - 300000).toISOString(),
    unread_count: 1
  }
];

// Helper function to get WebSocket URL
const getWebSocketUrl = (token) => {
  const baseUrl = 'ws://localhost:8081/ws';
  
  if (USE_MOCK_DATA) return null;
  
  if (!token) {
    console.error('No authentication token available');
    return null;
  }
  
  let url = baseUrl;
  if (Platform.OS === 'android') {
    url = url.replace('localhost', '10.0.2.2');
  }
  
  url = `${url}?token=${encodeURIComponent(token)}`;
  return url;
};

const SupportChatScreen = ({ navigation }) => {
  // FIXED: Use getUserId() function instead of direct userId property
  const { user, token, getUserId, logout, isLoading: authLoading } = useAuth();
  const userId = getUserId();
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 SupportChatScreen - Auth State:', {
      hasUser: !!user,
      hasToken: !!token,
      userId: userId,
      userRole: user?.role,
      authLoading: authLoading,
      userEmail: user?.email,
      userObject: user ? Object.keys(user) : 'no user'
    });
  }, [user, token, userId, authLoading]);
  
  // State Management
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  // FIX: Updated status options to available/break/offline
  const [agentStatus, setAgentStatus] = useState('available'); // available, break, offline
  const [autoAssign, setAutoAssign] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [groupedConversations, setGroupedConversations] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [authError, setAuthError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false); // FIXED: Added resolving state

  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const filterScrollRef = useRef(null);
  const loadConversationsTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const lastLoadTimeRef = useRef(0);
  const loadCallCountRef = useRef(0);
  const agentConnectSentRef = useRef(false);
  const wsManagerRef = useRef(null);

  // Platform options
  const platformOptions = [
    { id: 'all', label: 'All', icon: 'apps', color: '#6366F1' },
    { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
    { id: 'messenger', label: 'Messenger', icon: 'chatbubbles', color: '#006AFF' },
    { id: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
    { id: 'facebook', label: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
    { id: 'twitter', label: 'Twitter', icon: 'logo-twitter', color: '#1DA1F2' },
    { id: 'telegram', label: 'Telegram', icon: 'paper-plane', color: '#26A5E4' },
    { id: 'tiktok', label: 'TikTok', icon: 'musical-notes', color: '#000000' }
  ];

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Component mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    console.log('🎬 Component mounted');
    
    return () => {
      console.log('🗑️ Component unmounting');
      isMountedRef.current = false;
      agentConnectSentRef.current = false;
      
      if (loadConversationsTimeoutRef.current) {
        clearTimeout(loadConversationsTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsManagerRef.current) {
        const wsManager = wsManagerRef.current;
        if (wsManager.disconnect) {
          console.log('🔌 Disconnecting WebSocket on unmount');
          wsManager.disconnect();
        }
        if (wsManager.removeAllListeners) {
          wsManager.removeAllListeners();
        }
      }
    };
  }, []);

  // Log development mode
  useEffect(() => {
    if (USE_MOCK_DATA) {
      console.log('🧪 Development Mode: Using Mock Data');
    } else {
      console.log('🚀 Production Mode: Using Real Backend');
    }
  }, []);

  // Handle auth errors
  const handleAuthError = async (error) => {
    console.log('Auth error detected');
    setAuthError(true);
    Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
    return false;
  };

  // Load conversations - FIXED with comprehensive debugging
  const loadConversations = useCallback(async () => {
    console.log('📊 loadConversations - Full State:', {
      userId: userId,
      token: token ? `exists (${token.length} chars)` : 'missing',
      authLoading: authLoading,
      user: user ? {
        email: user.email,
        role: user.role,
        support_id: user.support_id,
        allKeys: Object.keys(user)
      } : 'no user'
    });

    if (!userId || !token) {
      console.log("⏳ SupportChatScreen: Waiting for userId/token...");
      console.log("   userId:", userId);
      console.log("   token exists:", !!token);
      
      if (!userId && user) {
        console.error("⚠️ CRITICAL: User exists but userId is null!");
        console.error("   User keys:", Object.keys(user));
        console.error("   support_id:", user.support_id);
      }
      return;
    }

    loadCallCountRef.current++;
    const callNumber = loadCallCountRef.current;
    const now = Date.now();
    const timeSinceLastCall = now - lastLoadTimeRef.current;
    
    console.log(`🔄 loadConversations #${callNumber} for userId: ${userId}`);
    
    if (timeSinceLastCall < 2000 && callNumber > 1) {
      console.log(`⏸️ Skipping #${callNumber} - too soon`);
      return;
    }
    
    if (loading && callNumber > 1) {
      console.log(`⏸️ Skipping #${callNumber} - already loading`);
      return;
    }
    
    lastLoadTimeRef.current = now;
    
    if (USE_MOCK_DATA) {
      console.log('🧪 Using mock data');
      setLoading(true);
      
      setTimeout(() => {
        if (!isMountedRef.current) return;
        
        const filteredConvs = filterPlatform === 'all' 
          ? MOCK_CONVERSATIONS 
          : MOCK_CONVERSATIONS.filter(conv => conv.platform === filterPlatform);
        
        setConversations(filteredConvs);
        
        const grouped = filteredConvs.reduce((acc, conv) => {
          const platform = conv.platform || 'other';
          if (!acc[platform]) acc[platform] = [];
          acc[platform].push(conv);
          return acc;
        }, {});
        setGroupedConversations(grouped);
        
        const counts = {};
        filteredConvs.forEach(conv => {
          counts[conv.conversation_id] = conv.unread_count || 0;
        });
        setUnreadCounts(counts);
        
        setIsInitialLoadComplete(true);
        setLoading(false);
        setRefreshing(false);
        console.log(`✅ Mock conversations loaded: ${filteredConvs.length}`);
      }, 800);
      return;
    }

    try {
      setLoading(true);
      setApiError(null);
      
      const apiEndpoint = `${API_URL}/api/support/conversations`;
      const requestParams = { 
        agent_id: userId,
        platform: filterPlatform !== 'all' ? filterPlatform : 'all'
      };
      
      console.log(`📡 API Request:`);
      console.log(`   URL: ${apiEndpoint}`);
      console.log(`   Params:`, requestParams);
      
      const response = await axios.get(apiEndpoint, {
        params: requestParams,
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 15000
      });
      
      console.log('📥 API Response:', {
        status: response.status,
        success: response.data?.success,
        count: response.data?.conversations?.length || 0
      });
      
      if (response.data && response.data.success !== false) {
        const convs = response.data.conversations || response.data || [];
        console.log('📊 Setting conversations:', convs.length);
        
        if (convs.length > 0) {
          console.log('Sample:', {
            id: convs[0].conversation_id,
            platform: convs[0].platform,
            customer: convs[0].customer_name
          });
        }
        
        setConversations(convs);
        
        const grouped = convs.reduce((acc, conv) => {
          const platform = conv.platform || 'other';
          if (!acc[platform]) acc[platform] = [];
          acc[platform].push(conv);
          return acc;
        }, {});
        setGroupedConversations(grouped);
        
        const counts = {};
        convs.forEach(conv => {
          counts[conv.conversation_id] = conv.unread_count || 0;
        });
        setUnreadCounts(counts);
        
        setIsInitialLoadComplete(true);
        console.log(`✅ Loaded ${convs.length} conversations`);
      } else {
        console.error('❌ API unsuccessful:', response.data);
        setApiError(response.data?.message || 'Failed to load');
      }
    } catch (error) {
      console.error(`❌ API Error:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      setApiError(error.message || 'Network error');
      
      if (error.response?.status === 401) {
        await handleAuthError(error);
      } else if (error.response?.status === 404) {
        console.log('⚠️ Endpoint not found');
        setApiError('API endpoint not found');
      } else {
        console.log('🧪 Fallback to mock data');
        const filteredConvs = filterPlatform === 'all' 
          ? MOCK_CONVERSATIONS 
          : MOCK_CONVERSATIONS.filter(conv => conv.platform === filterPlatform);
        
        setConversations(filteredConvs);
        
        const grouped = filteredConvs.reduce((acc, conv) => {
          const platform = conv.platform || 'other';
          if (!acc[platform]) acc[platform] = [];
          acc[platform].push(conv);
          return acc;
        }, {});
        setGroupedConversations(grouped);
        
        const counts = {};
        filteredConvs.forEach(conv => {
          counts[conv.conversation_id] = conv.unread_count || 0;
        });
        setUnreadCounts(counts);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [userId, token, filterPlatform, loading, user, authLoading]);

  // Debounced load
  const debouncedLoadConversations = useCallback(() => {
    if (loadConversationsTimeoutRef.current) {
      clearTimeout(loadConversationsTimeoutRef.current);
    }
    
    loadConversationsTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        console.log('⏰ Debounced load triggered');
        loadConversations();
      }
    }, 1000);
  }, [loadConversations]);

  // Send agent connect
  const sendAgentConnectMessage = useCallback(() => {
    console.log('📤 Preparing agent_connect message...');
    
    if (agentConnectSentRef.current) {
      console.log('⚠️ Already sent');
      return;
    }
    
    if (USE_MOCK_DATA) {
      console.log('Mock: Agent connected');
      agentConnectSentRef.current = true;
      return;
    }
    
    const wsManager = wsManagerRef.current;
    if (!wsManager) {
      console.log('❌ No WebSocket manager');
      return;
    }
    
    const isConnected = wsManager.isConnected ? wsManager.isConnected() : false;
    
    if (!token || !isConnected) {
      console.log('❌ Not ready:', { token: !!token, isConnected });
      return;
    }
    
    console.log('📤 Sending agent_connect');
    
    const success = sendWebSocketMessage({
      type: 'agent_connect',
      data: {
        agent_id: userId,
        name: `${user?.first_name || user?.name || 'Support'} ${user?.last_name || 'Agent'}`,
        role: user?.role || 'support_agent',
        token: token,
        email: user?.email,
        status: agentStatus,
        auto_assign: autoAssign
      }
    });
    
    if (success) {
      console.log('✅ Agent connect sent');
      agentConnectSentRef.current = true;
    } else {
      setTimeout(() => {
        if (isMountedRef.current) {
          agentConnectSentRef.current = false;
          sendAgentConnectMessage();
        }
      }, 2000);
    }
  }, [user, token, agentStatus, autoAssign, userId]);

  // Setup WebSocket - UPDATED with new message types
  const setupWebSocket = useCallback(() => {
    if (!token || !userId) {
      console.log('⚠️ Cannot setup WebSocket: missing token or userId');
      return () => {};
    }

    console.log('🔌 Connecting to WebSocket...');
    
    if (USE_MOCK_DATA) {
      console.log('🧪 Mock WebSocket');
      setWsConnected(true);
      setConnectionStatus('Connected (Mock)');
      agentConnectSentRef.current = true;
      
      const mockInterval = setInterval(() => {
        if (activeConversation && Math.random() > 0.8) {
          const mockResponses = [
            "Thanks for your help!",
            "Can you check this?",
            "When will this be ready?"
          ];
          const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
          
          handleNewMessage({
            message_id: `mock_${Date.now()}`,
            conversation_id: activeConversation.conversation_id,
            sender_id: 'customer_mock',
            sender_name: activeConversation.customer_name,
            sender_type: 'customer',
            content: randomResponse,
            timestamp: new Date().toISOString(),
            platform: activeConversation.platform,
            is_read: false,
            delivered: true
          });
        }
      }, 15000);
      
      return () => clearInterval(mockInterval);
    }
    
    console.log('🔄 Setting up REAL WebSocket...');
    
    const wsManager = webSocketManager.default || webSocketManager;
    wsManagerRef.current = wsManager;
    
    const wsUrl = getWebSocketUrl(token);
    if (!wsUrl) {
      console.error('❌ Could not get WebSocket URL');
      Alert.alert('Connection Error', 'Cannot connect to chat server');
      return () => {};
    }
    
    console.log(`🔗 Connecting to: ${wsUrl}`);
    
    agentConnectSentRef.current = false;
    
    const handleConnection = () => {
      console.log('✅ WebSocket connected');
      setWsConnected(true);
      setConnectionStatus('Connected');
      
      setTimeout(() => {
        if (isMountedRef.current && !agentConnectSentRef.current) {
          sendAgentConnectMessage();
        }
      }, 500);
    };
    
    const handleMessage = (message) => {
      console.log(`📨 WS message: ${message.type}`);
      
      const { type, data } = message;
      
      switch (type) {
        case 'welcome':
          console.log("👋 Welcome received");
          setTimeout(() => sendAgentConnectMessage(), 500);
          break;
          
        case 'connected':
          console.log("✅ Connected as agent");
          setWsConnected(true);
          setIsTyping(false);
          setAgentStatus(data?.status || 'available');
          if (data?.auto_assign !== undefined) {
            setAutoAssign(data.auto_assign);
          }
          break;
          
        case 'new_message':
        case 'whatsapp_message':
          console.log('💬 New message:', data?.conversation_id);
          handleNewMessage(data);
          if (activeConversation && data.conversation_id === activeConversation.conversation_id) {
            setMessages(prev => {
              // FIX: Prevent Duplicates by checking if ID already exists
              const exists = prev.find(m => m.message_id === data.message_id);
              return exists ? prev : [...prev, data];
            });
          }
          debouncedLoadConversations();
          break;
          
        // FIXED: Added message delivery confirmations
        case 'message_sent':
          console.log('✅ Message sent confirmation:', data?.message_id);
          if (data.whatsapp_sent) {
            console.log('✅ WhatsApp message confirmed sent');
          }
          break;
          
        case 'message_failed':
          console.error('❌ Message failed:', data?.error);
          Alert.alert('Message Failed', 'Failed to send message to customer');
          break;
          
        // FIXED: Added resolve/reopen confirmations
        case 'conversation_resolved':
          console.log('✅ Conversation resolved:', data?.conversation_id);
          if (activeConversation?.conversation_id === data.conversation_id) {
            setActiveConversation(prev => ({ ...prev, status: 'resolved' }));
          }
          loadConversations();
          break;
          
        case 'conversation_reopened':
          console.log('✅ Conversation reopened:', data?.conversation_id);
          if (activeConversation?.conversation_id === data.conversation_id) {
            setActiveConversation(prev => ({ ...prev, status: 'active' }));
          }
          loadConversations();
          break;
          
        case 'resolve_success':
          Alert.alert('Success', 'Conversation marked as resolved');
          setResolving(false);
          break;
          
        case 'reopen_success':
          Alert.alert('Success', 'Conversation reopened');
          setResolving(false);
          break;
          
        case 'typing_start':
          if (activeConversation && data.conversation_id === activeConversation.conversation_id) {
            setIsTyping(true);
          }
          break;
          
        case 'typing_stop':
          if (activeConversation && data.conversation_id === activeConversation.conversation_id) {
            setIsTyping(false);
          }
          break;
          
        case 'agent_status_updated':
          if (data.agent_id === userId) {
            setAgentStatus(data.status);
            if (data.auto_assign !== undefined) {
              setAutoAssign(data.auto_assign);
            }
          }
          break;
          
        case 'auth_error':
          handleAuthError(new Error('WebSocket auth failed'));
          break;
          
        default:
          console.log('📋 Unhandled message type:', type);
      }
    };
    
    const handleDisconnection = (data) => {
      console.log('🔌 Disconnected:', data?.reason);
      setWsConnected(false);
      setIsTyping(false);
      setConnectionStatus(`Disconnected: ${data?.reason || 'Unknown'}`);
      agentConnectSentRef.current = false;
    };
    
    const handleError = (error) => {
      console.error('⚠️ WebSocket error:', error);
      setConnectionStatus(`Error: ${error.type || 'Connection error'}`);
      setWsConnected(false);
      agentConnectSentRef.current = false;
    };
    
    if (wsManager.removeAllListeners) {
      wsManager.removeAllListeners();
    }
    
    if (wsManager.onConnection) wsManager.onConnection(handleConnection);
    if (wsManager.onMessage) wsManager.onMessage(handleMessage);
    if (wsManager.onDisconnection) wsManager.onDisconnection(handleDisconnection);
    if (wsManager.onError) wsManager.onError(handleError);
    
    if (wsManager.connect) {
      wsManager.connect(wsUrl);
    } else {
      console.error('❌ No connect method');
    }
    
    const connectionCheckInterval = setInterval(() => {
      if (!isMountedRef.current) {
        clearInterval(connectionCheckInterval);
        return;
      }
      
      const stats = wsManager.getStats ? wsManager.getStats() : { connected: false };
      
      if (!stats.connected && (!stats.reconnectAttempts || stats.reconnectAttempts === 0)) {
        console.log('🔄 Manual reconnect');
        if (wsManager.connect) {
          wsManager.connect(wsUrl);
        }
      }
    }, 10000);
    
    return () => {
      console.log('🧹 Cleaning up WebSocket');
      clearInterval(connectionCheckInterval);
      agentConnectSentRef.current = false;
      
      if (wsManager.removeAllListeners) {
        wsManager.removeAllListeners();
      }
    };
  }, [token, userId, activeConversation, sendAgentConnectMessage, debouncedLoadConversations]);

  // Initialize when auth is ready
  useEffect(() => {
    if (!authLoading && userId && token) {
      console.log("✅ Auth verified. Initializing Screen...");
      loadConversations();
      const cleanupWs = setupWebSocket();
      
      setTimeout(() => {
        if (isMountedRef.current) {
          loadAgentStatus();
        }
      }, 1500);
      
      return cleanupWs;
    } else {
      console.warn('⚠️ Auth not ready:', { authLoading, userId: !!userId, token: !!token });
      setConnectionStatus('Not authenticated');
    }
    
    return () => {};
  }, [authLoading, userId, token, loadConversations, setupWebSocket]);

  // Send WebSocket message
  const sendWebSocketMessage = (message) => {
    if (USE_MOCK_DATA) {
      console.log('📤 Mock WS:', message.type);
      return true;
    }
    
    const wsManager = wsManagerRef.current;
    if (!wsManager) {
      console.warn('❌ No WebSocket manager');
      return false;
    }
    
    const isConnected = wsManager.isConnected ? wsManager.isConnected() : false;
    
    if (isConnected) {
      const success = wsManager.send ? wsManager.send(message) : false;
      if (success) {
        console.log('📤 WS sent:', message.type);
      }
      return success;
    } else {
      console.warn('❌ WebSocket not connected');
      setWsConnected(false);
      setConnectionStatus('Disconnected - Reconnecting');
      
      setTimeout(() => {
        if (wsManager.connect && isMountedRef.current) {
          const wsUrl = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;
          wsManager.connect(wsUrl);
        }
      }, 1000);
      
      return false;
    }
  };

  // Handle new message
  const handleNewMessage = useCallback((incomingMsg) => {
    console.log('💬 New message:', incomingMsg.conversation_id);
    
    if (activeConversation && incomingMsg.conversation_id === activeConversation.conversation_id) {
      console.log('💬 Adding to active conversation');
      setMessages(prev => {
        // FIX: Prevent Duplicates by checking if ID already exists
        const exists = prev.find(m => m.message_id === incomingMsg.message_id);
        return exists ? prev : [...prev, incomingMsg];
      });
      
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
      
      markAsRead(incomingMsg.conversation_id);
    }
    
    updateConversationLastMessage(
      incomingMsg.conversation_id, 
      incomingMsg.content, 
      incomingMsg.timestamp
    );
    
    if (!activeConversation || incomingMsg.conversation_id !== activeConversation.conversation_id) {
      updateUnreadCount(
        incomingMsg.conversation_id, 
        (unreadCounts[incomingMsg.conversation_id] || 0) + 1
      );
    }
  }, [activeConversation, unreadCounts]);

  // Load messages
  const loadMessages = async (conv) => {
    console.log('📥 Loading messages:', conv.conversation_id);
    
    if (USE_MOCK_DATA) {
      console.log('🧪 Loading mock messages');
      setLoading(true);
      
      setTimeout(() => {
        if (!isMountedRef.current) return;
        
        const mockMessages = [
          {
            message_id: 'msg_1',
            conversation_id: conv.conversation_id,
            sender_id: conv.customer_phone || 'customer_1',
            sender_name: conv.customer_name,
            sender_type: 'customer',
            content: conv.last_message || 'Hello, I need help',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            platform: conv.platform,
            is_read: true,
            delivered: true
          },
          {
            message_id: 'msg_2',
            conversation_id: conv.conversation_id,
            sender_id: userId || 'agent_1',
            sender_name: `${user?.first_name || user?.name || 'Support'} ${user?.last_name || 'Agent'}`,
            sender_type: 'support',
            content: 'Hello! How can I help you today?',
            timestamp: new Date(Date.now() - 150000).toISOString(),
            platform: conv.platform,
            is_read: true,
            delivered: true
          }
        ];
        
        setMessages(mockMessages);
        setActiveConversation({ ...conv, unread_count: 0 });
        
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
        
        setLoading(false);
      }, 500);
      return;
    }

    try {
      setLoading(true);
      setApiError(null);
      
      const response = await axios.get(
        `${API_URL}/api/support/conversations/${conv.conversation_id}/messages`, 
        { 
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 15000 
        }
      );
      
      console.log('📥 Messages loaded:', response.data.messages?.length || 0);
      
      if (response.data && response.data.success !== false) {
        const messagesData = response.data.messages || response.data || [];
        setMessages(messagesData);
        setActiveConversation({ ...conv, unread_count: 0 });
        
        markAsRead(conv.conversation_id);
        
        sendWebSocketMessage({
          type: 'join_conversation',
          data: {
            conversation_id: conv.conversation_id,
            agent_id: userId
          }
        });
        
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      } else {
        console.error('❌ Messages API unsuccessful');
        setApiError(response.data?.message || 'Failed to load messages');
      }
    } catch (error) {
      console.error("❌ Failed to fetch messages:", error.message);
      setApiError(error.message || 'Failed to load messages');
      
      if (error.response?.status === 401) {
        await handleAuthError(error);
      } else if (error.response?.status === 404) {
        setApiError('Messages endpoint not found');
      } else {
        console.log('🧪 Using mock messages');
        const mockMessages = [
          {
            message_id: 'msg_1',
            conversation_id: conv.conversation_id,
            sender_id: conv.customer_phone || 'customer_1',
            sender_name: conv.customer_name,
            sender_type: 'customer',
            content: conv.last_message || 'Hello, I need help',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            platform: conv.platform,
            is_read: true,
            delivered: true
          }
        ];
        setMessages(mockMessages);
        setActiveConversation({ ...conv, unread_count: 0 });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Load agent status
  const loadAgentStatus = async () => {
    console.log('📡 Loading agent status...');
    
    if (USE_MOCK_DATA) {
      console.log('🧪 Mock agent status');
      setAgentStatus('available');
      setAutoAssign(true);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/support/agent-status`, { 
        headers: { 'Authorization': `Bearer ${token}` },
        params: { agent_id: userId },
        timeout: 5000
      });
      
      if (response.data && response.data.success !== false) {
        setAgentStatus(response.data.status || 'available');
        setAutoAssign(response.data.auto_assign !== undefined ? response.data.auto_assign : true);
      }
    } catch (error) {
      console.error('❌ Failed to load agent status:', error);
      setAgentStatus('available');
      setAutoAssign(true);
    }
  };

  // 🔧 FIXED: Send message with proper WhatsApp integration
  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || sending) return;

    setSending(true);
    
    const tempId = `temp_${Date.now()}`;
    const msgData = {
      message_id: tempId,
      conversation_id: activeConversation.conversation_id,
      content: newMessage.trim(),
      sender_id: userId,
      sender_name: `${user?.first_name || user?.name || 'Support'} ${user?.last_name || 'Agent'}`,
      sender_type: 'support',
      platform: activeConversation.platform,
      timestamp: new Date().toISOString()
    };

    try {
      // Add optimistically
      setMessages(prev => [...prev, msgData]);
      const messageText = newMessage.trim();
      setNewMessage('');

      // Send via WebSocket
      const ws = wsManagerRef.current;
      const isConnected = ws?.isConnected?.();
      
      if (isConnected) {
        console.log('📤 Sending via WebSocket...');
        const success = sendWebSocketMessage({
          type: 'send_message',
          data: {
            ...msgData,
            content: messageText,
            recipient_phone: activeConversation.customer_phone
          }
        });
        
        if (!success) {
          throw new Error('WebSocket send failed');
        }
      } else {
        // Fallback to API
        console.log('📤 Fallback to API...');
        await axios.post(`${API_URL}/api/support/messages/send`, {
          conversation_id: activeConversation.conversation_id,
          agent_id: userId,
          content: messageText,
          platform: activeConversation.platform
        }, {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 10000
        });
      }
      
      console.log('✅ Message sent successfully');
      
      // Update conversation last message
      updateConversationLastMessage(
        activeConversation.conversation_id,
        messageText,
        new Date().toISOString()
      );
      
    } catch (error) {
      console.error("❌ Send failed:", error);
      Alert.alert("Error", "Message could not be sent. Please try again.");
      
      // Remove failed message
      setMessages(prev => prev.filter(m => m.message_id !== tempId));
      setNewMessage(msgData.content);
    } finally {
      setSending(false);
    }
  };

  // FIX: Updated status change function
  const changeStatus = (newStatus) => {
    console.log(`🔄 Changing agent status to: ${newStatus}`);
    setAgentStatus(newStatus);
    
    if (USE_MOCK_DATA) {
      console.log('🧪 Mock: Status changed to', newStatus);
      return;
    }
    
    // Send status update via WebSocket
    sendWebSocketMessage({
      type: 'agent_status',
      data: { 
        agent_id: userId, 
        status: newStatus 
      }
    });
    
    // Also update via API for persistence
    updateAgentStatus(newStatus);
  };

  const handleTyping = () => {
    if (!activeConversation) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    sendWebSocketMessage({
      type: 'typing_start',
      data: {
        conversation_id: activeConversation.conversation_id,
        user_id: userId,
        user_name: `${user?.first_name || user?.name || 'Support'} ${user?.last_name || 'Agent'}`
      }
    });

    typingTimeoutRef.current = setTimeout(() => {
      sendWebSocketMessage({
        type: 'typing_stop',
        data: {
          conversation_id: activeConversation.conversation_id,
          user_id: userId
        }
      });
    }, 2000);
  };

  // Mark as read
  const markAsRead = async (conversationId) => {
    updateUnreadCount(conversationId, 0);
    
    if (USE_MOCK_DATA) return;

    try {
      await axios.post(
        `${API_URL}/api/support/conversations/${conversationId}/read`,
        { agent_id: userId },
        { 
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 5000 
        }
      );
    } catch (error) {
      console.error('Mark read failed:', error);
    }
  };

  const updateUnreadCount = (conversationId, count) => {
    setUnreadCounts(prev => ({ ...prev, [conversationId]: count }));
  };

  const updateConversationLastMessage = (conversationId, message, timestamp) => {
    setConversations(prev => prev.map(conv => 
      conv.conversation_id === conversationId 
        ? { ...conv, last_message: message, last_message_time: timestamp }
        : conv
    ));
  };

  // 🔧 FIXED: Resolve conversation via WebSocket
  const resolveConversation = async () => {
    if (!activeConversation || resolving) return;

    Alert.alert(
      'Resolve Conversation',
      'Mark this conversation as resolved?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Resolve', 
          style: 'destructive',
          onPress: async () => {
            if (USE_MOCK_DATA) {
              setActiveConversation(prev => ({ ...prev, status: 'resolved' }));
              loadConversations();
              return;
            }

            setResolving(true);
            
            try {
              const ws = wsManagerRef.current;
              
              if (ws?.isConnected?.()) {
                // Send via WebSocket
                console.log('📤 Resolving via WebSocket...');
                sendWebSocketMessage({
                  type: 'resolve_conversation',
                  data: {
                    conversation_id: activeConversation.conversation_id,
                    agent_id: userId
                  }
                });
              } else {
                // Fallback to API
                console.log('📤 Resolving via API...');
                const response = await axios.post(
                  `${API_URL}/api/support/conversations/${activeConversation.conversation_id}/resolve`,
                  { agent_id: userId },
                  { headers: { 'Authorization': `Bearer ${token}` }, timeout: 10000 }
                );
                
                if (response.data?.success !== false) {
                  Alert.alert('Success', 'Conversation resolved');
                  setActiveConversation(prev => ({ ...prev, status: 'resolved' }));
                  loadConversations();
                }
              }
            } catch (error) {
              console.error('❌ Resolve failed:', error);
              Alert.alert('Error', 'Failed to resolve conversation');
            } finally {
              setResolving(false);
            }
          }
        }
      ]
    );
  };

  // 🔧 FIXED: Reopen conversation via WebSocket
  const reopenConversation = async () => {
    if (!activeConversation || resolving) return;

    Alert.alert(
      'Reopen Conversation',
      'Reopen this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reopen',
          onPress: async () => {
            if (USE_MOCK_DATA) {
              setActiveConversation(prev => ({ ...prev, status: 'active' }));
              loadConversations();
              return;
            }

            setResolving(true);
            
            try {
              const ws = wsManagerRef.current;
              
              if (ws?.isConnected?.()) {
                // Send via WebSocket
                console.log('📤 Reopening via WebSocket...');
                sendWebSocketMessage({
                  type: 'reopen_conversation',
                  data: {
                    conversation_id: activeConversation.conversation_id,
                    agent_id: userId
                  }
                });
              } else {
                // Fallback to API
                console.log('📤 Reopening via API...');
                const response = await axios.post(
                  `${API_URL}/api/support/conversations/${activeConversation.conversation_id}/reopen`,
                  { agent_id: userId },
                  { headers: { 'Authorization': `Bearer ${token}` }, timeout: 10000 }
                );
                
                if (response.data?.success !== false) {
                  Alert.alert('Success', 'Conversation reopened');
                  setActiveConversation(prev => ({ ...prev, status: 'active' }));
                  loadConversations();
                }
              }
            } catch (error) {
              console.error('❌ Reopen failed:', error);
              Alert.alert('Error', 'Failed to reopen conversation');
            } finally {
              setResolving(false);
            }
          }
        }
      ]
    );
  };

  // FIX: Update agent status - API version
  const updateAgentStatus = async (newStatus) => {
    console.log(`🔄 Updating status via API to: ${newStatus}`);
    
    if (USE_MOCK_DATA) {
      return;
    }
    
    try {
      const response = await axios.put(
        `${API_URL}/api/support/agent-status`,
        { agent_id: userId, status: newStatus, auto_assign: autoAssign },
        { headers: { 'Authorization': `Bearer ${token}` }, timeout: 10000 }
      );
      
      if (response.data && response.data.success !== false) {
        console.log(`✅ Status updated via API to: ${newStatus}`);
      }
    } catch (error) {
      console.error('❌ Status update failed:', error.message);
      if (error.response?.status === 401) {
        await handleAuthError(error);
      }
    }
  };

  const toggleAutoAssign = async () => {
    const newAutoAssign = !autoAssign;
    setAutoAssign(newAutoAssign);
    
    if (USE_MOCK_DATA) return;
    
    try {
      const response = await axios.put(
        `${API_URL}/api/support/agent-status`,
        { agent_id: userId, status: agentStatus, auto_assign: newAutoAssign },
        { headers: { 'Authorization': `Bearer ${token}` }, timeout: 10000 }
      );
      
      if (response.data && response.data.success !== false) {
        sendWebSocketMessage({
          type: 'agent_status',
          data: { agent_id: userId, status: agentStatus, auto_assign: newAutoAssign }
        });
      }
    } catch (error) {
      console.error('Auto-assign update failed:', error);
      setAutoAssign(!newAutoAssign);
    }
  };

  const handleReconnect = () => {
    if (!wsConnected) {
      if (USE_MOCK_DATA) {
        setWsConnected(true);
        setConnectionStatus('Connected (Mock)');
        Alert.alert('Reconnected', 'Successfully reconnected (Mock)');
        return;
      }
      
      const wsManager = wsManagerRef.current;
      if (wsManager && wsManager.connect) {
        const wsUrl = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;
        console.log('🔄 Manual reconnect:', wsUrl);
        wsManager.connect(wsUrl);
      }
      
      setTimeout(() => {
        if (wsConnected) {
          Alert.alert('Reconnected', 'Successfully reconnected');
        }
      }, 2000);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Just now';
    }
  };

  const formatMessageTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return 'Now';
    }
  };

  // Status Button Component
  const StatusBtn = ({ label, color, active, onPress }) => (
    <TouchableOpacity 
      onPress={onPress}
      style={[styles.statusButtonSimple, { backgroundColor: active ? color : '#e2e8f0' }]}
    >
      <Text style={{ color: active ? '#fff' : '#475569', fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );

  // Platform Filter Bar
  const PlatformFilterBar = () => (
    <View style={styles.filterBar}>
      <ScrollView 
        ref={filterScrollRef}
        horizontal 
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.filterScrollContent}
      >
        {platformOptions.map((platform) => {
          const isActive = filterPlatform === platform.id;
          
          return (
            <TouchableOpacity 
              key={platform.id}
              onPress={() => {
                setFilterPlatform(platform.id);
                debouncedLoadConversations();
              }} 
              style={[styles.filterBtn, isActive && styles.filterBtnActive]}
            >
              <Ionicons 
                name={platform.icon} 
                size={16} 
                color={isActive ? '#fff' : platform.color} 
                style={styles.filterIcon}
              />
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {platform.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // FIX: Updated status picker component
  const renderStatusPicker = () => (
    <View style={styles.statusControls}>
      <StatusBtn 
        label="Available" 
        color="#22C55E" 
        active={agentStatus === 'available'} 
        onPress={() => changeStatus('available')} 
      />
      <StatusBtn 
        label="Break" 
        color="#F59E0B" 
        active={agentStatus === 'break'} 
        onPress={() => changeStatus('break')} 
      />
      <StatusBtn 
        label="Offline" 
        color="#64748B" 
        active={agentStatus === 'offline'} 
        onPress={() => changeStatus('offline')} 
      />
      
      <TouchableOpacity 
        style={styles.autoAssignToggle}
        onPress={toggleAutoAssign}
      >
        <Ionicons 
          name={autoAssign ? 'toggle' : 'toggle-outline'} 
          size={16} 
          color={autoAssign ? '#6366F1' : '#94A3B8'} 
        />
        <Text style={[styles.autoAssignText, autoAssign && styles.autoAssignActiveText]}>
          Auto-assign
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Conversation Section
  const ConversationSection = ({ platform, conversations }) => {
    const platformOption = platformOptions.find(p => p.id === platform) || platformOptions[0];
    const totalUnread = conversations.reduce((sum, conv) => 
      sum + (unreadCounts[conv.conversation_id] || 0), 0
    );
    
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name={platformOption.icon} size={16} color={platformOption.color} />
            <Text style={styles.sectionTitle}>
              {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </Text>
            {totalUnread > 0 && (
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{totalUnread}</Text>
              </View>
            )}
          </View>
          <Text style={styles.sectionCount}>{conversations.length} chats</Text>
        </View>
        
        {conversations.map((item) => (
          <ConversationItem key={item.conversation_id} item={item} />
        ))}
      </View>
    );
  };

  // Conversation Item
  const ConversationItem = ({ item }) => {
    const platformOption = platformOptions.find(p => p.id === item.platform) || platformOptions[0];
    const unreadCount = unreadCounts[item.conversation_id] || 0;
    
    return (
      <TouchableOpacity
        style={[
          styles.convItem, 
          activeConversation?.conversation_id === item.conversation_id && styles.activeConv,
          item.status === 'resolved' && styles.resolvedConv
        ]}
        onPress={() => loadMessages(item)}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: platformOption.color + '20' }]}>
            <Ionicons name={platformOption.icon} size={20} color={platformOption.color} />
          </View>
          <View style={[styles.platformBadge, { backgroundColor: platformOption.color }]}>
            <Ionicons name={platformOption.icon} size={10} color="#fff" />
          </View>
        </View>
        <View style={styles.convInfo}>
          <View style={styles.convHeader}>
            <Text style={styles.customerName} numberOfLines={1}>
              {item.customer_name}
              {item.status === 'resolved' && (
                <Text style={styles.resolvedLabel}> • Resolved</Text>
              )}
            </Text>
            <View style={styles.convMeta}>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{unreadCount}</Text>
                </View>
              )}
              <Text style={styles.timeText}>{formatTime(item.last_message_time)}</Text>
            </View>
          </View>
          <View style={styles.messagePreview}>
            <Text style={styles.lastMsg} numberOfLines={1}>
              {item.last_message || 'No messages yet'}
            </Text>
            {item.platform === 'whatsapp' && item.customer_phone && (
              <Text style={styles.phoneLabel}>{item.customer_phone}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Message Bubble
  const MessageBubble = ({ item }) => {
    const isSupport = item.sender_type === 'support' || item.sender_type === 'agent';
    
    return (
      <View style={[
        styles.messageContainer,
        isSupport ? styles.messageRight : styles.messageLeft
      ]}>
        {!isSupport && (
          <View style={styles.senderAvatar}>
            <Ionicons name="person" size={14} color="#fff" />
          </View>
        )}
        <View style={[
          styles.bubble, 
          isSupport ? styles.bubbleRight : styles.bubbleLeft,
          item.message_id?.startsWith('temp_') && styles.tempMessage
        ]}>
          <Text style={[
            styles.msgText, 
            isSupport && styles.msgTextRight
          ]}>
            {item.content}
          </Text>
          <View style={styles.bubbleFooter}>
            <Text style={[styles.bubbleTime, isSupport && styles.bubbleTimeRight]}>
              {formatMessageTime(item.timestamp)}
              {isSupport && ' • You'}
              {item.delivered && ' ✓✓'}
              {item.message_id?.startsWith('wa_') && ' 📱'}
              {item.message_id?.startsWith('mock_') && ' 🧪'}
              {item.message_id?.startsWith('temp_') && ' ⏳'}
            </Text>
          </View>
        </View>
        {isSupport && (
          <View style={styles.senderAvatarSupport}>
            <Ionicons name="person" size={14} color="#fff" />
          </View>
        )}
      </View>
    );
  };

  // Auth error screen
  if (authError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.authErrorContainer}>
          <Ionicons name="lock-closed" size={80} color="#EF4444" />
          <Text style={styles.authErrorTitle}>Authentication Error</Text>
          <Text style={styles.authErrorText}>
            Your session has expired or is invalid.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
  if (authLoading || (loading && !refreshing && conversations.length === 0 && !isInitialLoadComplete)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{ marginTop: 15, color: '#64748B' }}>
          {authLoading ? "Restoring Session..." : "Loading Conversations..."}
        </Text>
      </View>
    );
  }

  // MAIN RENDER
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mainContainer}>
        {/* Connection Banner */}
        {!wsConnected && !USE_MOCK_DATA && (
          <View style={styles.connectionBanner}>
            <View style={styles.connectionBannerContent}>
              <Ionicons name="wifi" size={16} color="#fff" />
              <Text style={styles.connectionBannerText}>
                Connection lost. Attempting to reconnect...
              </Text>
              <TouchableOpacity
                style={styles.reconnectBannerButton}
                onPress={handleReconnect}
              >
                <Ionicons name="refresh" size={14} color="#0EA5E9" />
                <Text style={styles.reconnectBannerButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SIDEBAR */}
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.title}>Support Chats</Text>
                <View style={styles.connectionStatus}>
                  <View style={[
                    styles.connectionDot, 
                    wsConnected || USE_MOCK_DATA ? styles.connected : styles.disconnected
                  ]} />
                  <Text style={styles.connectionText}>
                    {USE_MOCK_DATA ? 'Connected (Mock)' : connectionStatus}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={loadConversations}
                disabled={loading}
              >
                <Ionicons 
                  name="refresh" 
                  size={20} 
                  color={loading ? "#94A3B8" : "#6366F1"} 
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.agentInfoContainer}>
              <View style={styles.agentProfile}>
                <View style={styles.agentAvatar}>
                  <Ionicons name="person" size={18} color="#fff" />
                </View>
                <View style={styles.agentDetails}>
                  <Text style={styles.agentName}>
                    {user?.first_name || user?.name || 'Support Agent'}
                  </Text>
                  <View style={styles.agentStatusRow}>
                    <View style={[
                      styles.statusDot, 
                      agentStatus === 'available' ? styles.statusAvailable : 
                      agentStatus === 'break' ? styles.statusBusy : 
                      styles.statusOffline
                    ]} />
                    <Text style={styles.agentRole}>{user?.role || 'Support Agent'}</Text>
                  </View>
                </View>
              </View>
              
              {/* FIX: Updated status picker */}
              {renderStatusPicker()}
            </View>
          </View>

          <PlatformFilterBar />

          {apiError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>API Error: {apiError}</Text>
            </View>
          )}

          {loading && !isInitialLoadComplete ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loadingText}>Loading conversations...</Text>
            </View>
          ) : (
            <FlatList
              data={Object.keys(groupedConversations)}
              keyExtractor={(platform) => platform}
              renderItem={({ item: platform }) => (
                <ConversationSection 
                  platform={platform} 
                  conversations={groupedConversations[platform]} 
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <View style={styles.emptyListIcon}>
                    <Ionicons name="chatbubble-ellipses-outline" size={60} color="#E2E8F0" />
                  </View>
                  <Text style={styles.emptyListTitle}>No conversations</Text>
                  <Text style={styles.emptyListSubtitle}>
                    {USE_MOCK_DATA ? 'Using mock data mode' : 'Wait for customer messages'}
                  </Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#6366F1']}
                />
              }
            />
          )}
        </View>

        {/* CHAT AREA */}
        <View style={styles.chatArea}>
          {activeConversation ? (
            <>
              <View style={styles.chatHeader}>
                <TouchableOpacity 
                  style={styles.chatHeaderLeft}
                  onPress={() => {
                    Alert.alert(
                      'Customer Details',
                      `Name: ${activeConversation.customer_name}\nPlatform: ${activeConversation.platform}\nStatus: ${activeConversation.status}\n${activeConversation.customer_phone ? `Phone: ${activeConversation.customer_phone}` : ''}`
                    );
                  }}
                >
                  {(() => {
                    const platformOption = platformOptions.find(p => p.id === activeConversation.platform) || platformOptions[0];
                    return (
                      <View style={[styles.chatAvatar, { backgroundColor: platformOption.color + '20' }]}>
                        <Ionicons 
                          name={platformOption.icon} 
                          size={20} 
                          color={platformOption.color} 
                        />
                      </View>
                    );
                  })()}
                  <View style={styles.chatHeaderInfo}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                      {activeConversation.customer_name || "Customer"}
                    </Text>
                    <View style={styles.headerSubRow}>
                      <Text style={styles.headerSub}>
                        {activeConversation.platform.toUpperCase()}
                      </Text>
                      <View style={[
                        styles.statusIndicator,
                        activeConversation.status === 'active' ? styles.statusActive : styles.statusResolved
                      ]}>
                        <Text style={[
                          styles.statusIndicatorText,
                          activeConversation.status === 'resolved' && styles.statusResolvedText
                        ]}>
                          {activeConversation.status === 'active' ? 'Active' : 'Resolved'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
                
                <View style={styles.chatHeaderActions}>
                  {isTyping && (
                    <View style={styles.typingIndicator}>
                      <View style={styles.typingDots}>
                        <View style={[styles.typingDot, { animationDelay: '0s' }]} />
                        <View style={[styles.typingDot, { animationDelay: '0.2s' }]} />
                        <View style={[styles.typingDot, { animationDelay: '0.4s' }]} />
                      </View>
                      <Text style={styles.typingText}>Customer is typing</Text>
                    </View>
                  )}
                  
                  <View style={styles.actionButtons}>
                    {activeConversation.status !== 'resolved' ? (
                      <TouchableOpacity 
                        style={[styles.resolveButton, resolving && styles.resolveButtonDisabled]}
                        onPress={resolveConversation}
                        disabled={resolving}
                      >
                        {resolving ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={16} color="#fff" />
                            <Text style={styles.resolveButtonText}>Resolve</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.reopenButton, resolving && styles.reopenButtonDisabled]}
                        onPress={reopenConversation}
                        disabled={resolving}
                      >
                        {resolving ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="refresh" size={16} color="#fff" />
                            <Text style={styles.resolveButtonText}>Reopen</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.messagesContainer}>
                {loading ? (
                  <View style={styles.chatLoading}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.chatLoadingText}>Loading messages...</Text>
                  </View>
                ) : (
                  <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.message_id}
                    contentContainerStyle={styles.messagesContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    renderItem={({ item }) => <MessageBubble item={item} />}
                    ListEmptyComponent={
                      <View style={styles.noMessages}>
                        <View style={styles.noMessagesIcon}>
                          <Ionicons name="chatbubble-outline" size={50} color="#e2e8f0" />
                        </View>
                        <Text style={styles.noMessagesTitle}>No messages yet</Text>
                        <Text style={styles.noMessagesText}>
                          Start the conversation by sending a message
                        </Text>
                      </View>
                    }
                  />
                )}
              </View>

              {activeConversation.status !== 'resolved' ? (
                <KeyboardAvoidingView 
                  behavior={Platform.OS === 'ios' ? 'padding' : null} 
                  keyboardVerticalOffset={90}
                  style={styles.inputArea}
                >
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Type your reply..."
                      placeholderTextColor="#94a3b8"
                      value={newMessage}
                      onChangeText={(text) => {
                        setNewMessage(text);
                        handleTyping();
                      }}
                      onSubmitEditing={sendMessage}
                      multiline
                      maxLength={1000}
                      editable={wsConnected || USE_MOCK_DATA}
                    />
                    <TouchableOpacity 
                      onPress={sendMessage} 
                      style={[
                        styles.sendBtn, 
                        (!newMessage.trim() || (!wsConnected && !USE_MOCK_DATA) || sending) && styles.sendBtnDisabled
                      ]}
                      disabled={!newMessage.trim() || (!wsConnected && !USE_MOCK_DATA) || sending}
                    >
                      {sending ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="send" size={20} color="#fff" />
                      )}
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputFooter}>
                    <Text style={styles.inputFooterText}>
                      {USE_MOCK_DATA ? 'Connected (Mock)' : wsConnected ? 'Connected' : 'Disconnected'}
                    </Text>
                  </View>
                </KeyboardAvoidingView>
              ) : (
                <View style={styles.resolvedInputArea}>
                  <Ionicons name="checkmark-done-circle" size={24} color="#10b981" />
                  <Text style={styles.resolvedText}>
                    This conversation has been resolved
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="chatbubbles" size={100} color="#e2e8f0" />
              </View>
              <Text style={styles.emptyStateTitle}>Support Dashboard</Text>
              <Text style={styles.emptyStateText}>
                Select a conversation from the sidebar to start messaging with customers.
              </Text>
              
              <View style={styles.emptyStateButtons}>
                <TouchableOpacity 
                  style={styles.testButton}
                  onPress={testApiConnection}
                >
                  <Ionicons name="wifi" size={16} color="#6366F1" />
                  <Text style={styles.testButtonText}>Test API Connection</Text>
                </TouchableOpacity>
                
                {!USE_MOCK_DATA && (
                  <TouchableOpacity 
                    style={styles.secondaryButton}
                    onPress={() => {
                      console.log('🔄 Manually sending agent connect');
                      agentConnectSentRef.current = false;
                      sendAgentConnectMessage();
                    }}
                  >
                    <Ionicons name="refresh" size={20} color="#6366F1" />
                    <Text style={styles.secondaryButtonText}>Reconnect Agent</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.connectionInfo}>
                <View style={styles.connectionInfoHeader}>
                  <Text style={styles.connectionInfoTitle}>Connection Status</Text>
                  <View style={[
                    styles.connectionStatusBadge,
                    (wsConnected || USE_MOCK_DATA) ? styles.connectionStatusConnected : styles.connectionStatusDisconnected
                  ]}>
                    <Text style={[
                      styles.connectionStatusBadgeText,
                      !(wsConnected || USE_MOCK_DATA) && styles.connectionStatusDisconnectedText
                    ]}>
                      {(wsConnected || USE_MOCK_DATA) ? 'CONNECTED' : 'DISCONNECTED'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.connectionInfoGrid}>
                  <View style={styles.connectionInfoItem}>
                    <Ionicons name="server" size={16} color="#64748b" />
                    <Text style={styles.connectionInfoLabel}>Server</Text>
                    <Text style={styles.connectionInfoValue}>localhost:8081</Text>
                  </View>
                  
                  <View style={styles.connectionInfoItem}>
                    <Ionicons name="person" size={16} color="#64748b" />
                    <Text style={styles.connectionInfoLabel}>Agent Status</Text>
                    <Text style={styles.connectionInfoValue}>{agentStatus}</Text>
                  </View>
                  
                  <View style={styles.connectionInfoItem}>
                    <Ionicons name="chatbubbles" size={16} color="#64748b" />
                    <Text style={styles.connectionInfoLabel}>Active Chats</Text>
                    <Text style={styles.connectionInfoValue}>{conversations.length}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

// Test API connection function (preserved from original)
const testApiConnection = async () => {
  console.log('🧪 Testing API connection...');
  
  try {
    console.log('📡 Testing endpoint:', `${API_URL}/api/support/conversations`);
    
    const response = await axios.get(`${API_URL}/api/support/conversations`, { 
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 5000
    });
    
    console.log('✅ API Test Response:', response.data);
    Alert.alert('API Test', `Success! Response: ${JSON.stringify(response.data)}`);
  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    Alert.alert('API Test Failed', error.message);
  }
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  mainContainer: { flex: 1, flexDirection: 'row', backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  
  // Auth Error
  authErrorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  authErrorTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginTop: 20, marginBottom: 12 },
  authErrorText: { fontSize: 16, color: '#64748B', textAlign: 'center', marginBottom: 32 },
  
  // Connection Banner
  connectionBanner: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#0F172A', zIndex: 1000, paddingHorizontal: 16, paddingVertical: 12 },
  connectionBannerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  connectionBannerText: { color: '#fff', fontSize: 13, fontWeight: '500', flex: 1, marginLeft: 8 },
  reconnectBannerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4 },
  reconnectBannerButtonText: { color: '#0EA5E9', fontSize: 12, fontWeight: '600' },
  
  // Sidebar
  sidebar: { width: Math.min(450, width * 0.38), backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#E2E8F0' },
  sidebarHeader: { padding: 24, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  refreshButton: { padding: 6 },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  connectionStatus: { flexDirection: 'row', alignItems: 'center' },
  connectionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  connected: { backgroundColor: '#22C55E' },
  disconnected: { backgroundColor: '#EF4444' },
  connectionText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  
  agentInfoContainer: { marginTop: 8 },
  agentProfile: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  agentAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  agentDetails: { flex: 1 },
  agentName: { fontSize: 16, color: '#0F172A', fontWeight: '600', marginBottom: 2 },
  agentStatusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6, backgroundColor: '#94A3B8' },
  statusAvailable: { backgroundColor: '#22C55E' },
  statusBusy: { backgroundColor: '#F59E0B' },
  statusOffline: { backgroundColor: '#64748B' },
  agentRole: { fontSize: 13, color: '#64748B' },
  
  statusControls: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  statusButtonSimple: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  autoAssignToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F8FAFC', marginLeft: 'auto' },
  autoAssignText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  autoAssignActiveText: { color: '#6366F1' },
  
  // Error
  errorContainer: { backgroundColor: '#FEE2E2', margin: 16, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5' },
  errorText: { color: '#DC2626', fontSize: 12 },
  
  // Filter Bar
  filterBar: { height: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  filterScrollContent: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', minWidth: 800 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F8FAFC', flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0', height: 36, minWidth: 80 },
  filterBtnActive: { backgroundColor: '#6366F1', borderColor: '#4F46E5' },
  filterIcon: { marginRight: 2 },
  filterText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterTextActive: { color: '#fff' },
  
  // Sections
  sectionContainer: { marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A', letterSpacing: 0.5 },
  sectionBadge: { backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  sectionBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  sectionCount: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  
  // Conversations
  convItem: { flexDirection: 'row', padding: 16, paddingLeft: 24, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  activeConv: { backgroundColor: '#F0F9FF', borderLeftWidth: 4, borderLeftColor: '#0EA5E9' },
  resolvedConv: { opacity: 0.7 },
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  platformBadge: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  convInfo: { flex: 1, justifyContent: 'center' },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  customerName: { fontWeight: '600', color: '#0F172A', fontSize: 14, flex: 1 },
  resolvedLabel: { color: '#10B981', fontSize: 12, fontWeight: '500' },
  messagePreview: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lastMsg: { fontSize: 13, color: '#64748B', flex: 1 },
  phoneLabel: { fontSize: 11, color: '#64748B', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  convMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  unreadBadge: { backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  
  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 14 },
  
  // Empty
  emptyList: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyListIcon: { marginBottom: 20 },
  emptyListTitle: { color: '#0F172A', fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptyListSubtitle: { color: '#64748B', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  
  // Chat Area
  chatArea: { flex: 1, backgroundColor: '#F8FAFC' },
  chatHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' },
  chatHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  chatAvatar: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  chatHeaderInfo: { flex: 1 },
  chatHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  typingDots: { flexDirection: 'row', gap: 4 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6366F1', opacity: 0.6 },
  typingText: { fontSize: 12, color: '#64748B', fontStyle: 'italic' },
  actionButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resolveButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B981', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  resolveButtonDisabled: { opacity: 0.6 },
  reopenButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#6366F1', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  reopenButtonDisabled: { opacity: 0.6 },
  resolveButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerSub: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  statusIndicator: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: '#F1F5F9' },
  statusActive: { backgroundColor: '#DCFCE7' },
  statusResolved: { backgroundColor: '#FEF3C7' },
  statusIndicatorText: { fontSize: 10, fontWeight: '700', color: '#065F46' },
  statusResolvedText: { color: '#92400E' },
  
  // Messages Container
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 20, paddingBottom: 20 },
  chatLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatLoadingText: { marginTop: 12, color: '#64748B', fontSize: 14 },
  // Message Bubbles
  messageContainer: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 },
  messageLeft: { justifyContent: 'flex-start' },
  messageRight: { justifyContent: 'flex-end' },
  senderAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#94A3B8', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  senderAvatarSupport: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  bubble: { maxWidth: '75%', padding: 16, borderRadius: 16 },
  bubbleLeft: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  bubbleRight: { backgroundColor: '#6366F1', borderBottomRightRadius: 4 },
  tempMessage: { opacity: 0.6 },
  msgText: { fontSize: 15, color: '#0F172A', lineHeight: 22 },
  msgTextRight: { color: '#fff' },
  bubbleFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  bubbleTime: { fontSize: 11, color: '#94A3B8' },
  bubbleTimeRight: { color: 'rgba(255,255,255,0.8)' },
  
  // Input Area
  inputArea: { borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#fff', paddingBottom: Platform.OS === 'ios' ? 25 : 15 },
  inputWrapper: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: '#E2E8F0', maxHeight: 120, fontSize: 15, color: '#0F172A', textAlignVertical: 'center' },
  sendBtn: { marginLeft: 12, width: 48, height: 48, borderRadius: 12, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#CBD5E1' },
  inputFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  inputFooterText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  resolvedInputArea: { padding: 24, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  resolvedText: { color: '#065F46', fontSize: 14, textAlign: 'center', marginTop: 12, fontWeight: '600' },
  
  // Empty State
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 60 },
  emptyStateIcon: { marginBottom: 24 },
  emptyStateTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginBottom: 12, textAlign: 'center' },
  emptyStateText: { color: '#64748B', fontSize: 16, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  emptyStateButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 40, justifyContent: 'center' },
  testButton: { backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  testButtonText: { color: '#6366F1', fontSize: 15, fontWeight: '600' },
  secondaryButton: { backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  secondaryButtonText: { color: '#6366F1', fontSize: 15, fontWeight: '600' },
  connectionInfo: { backgroundColor: '#fff', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', width: '100%', maxWidth: 500 },
  connectionInfoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  connectionInfoTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  connectionStatusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  connectionStatusConnected: { backgroundColor: '#D1FAE5' },
  connectionStatusDisconnected: { backgroundColor: '#FEE2E2' },
  connectionStatusBadgeText: { fontSize: 11, fontWeight: '800', color: '#065F46', letterSpacing: 0.5 },
  connectionStatusDisconnectedText: { color: '#DC2626' },
  connectionInfoGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  connectionInfoItem: { flex: 1, alignItems: 'center' },
  connectionInfoLabel: { fontSize: 12, color: '#64748B', marginTop: 6, marginBottom: 2 },
  connectionInfoValue: { fontSize: 14, color: '#0F172A', fontWeight: '600' },
  
  noMessages: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  noMessagesIcon: { marginBottom: 16 },
  noMessagesTitle: { color: '#0F172A', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  noMessagesText: { color: '#64748B', fontSize: 14, textAlign: 'center' }
});

export default SupportChatScreen;