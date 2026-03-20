// SupportChatScreen.web.js - COMPLETE FIXED VERSION
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrlSync } from '../utils/apiBase';
import webSocketManager from './websocket-connection';

// Environment configuration
const API_URL = getApiBaseUrlSync() || (typeof window !== 'undefined' ? window.location.origin : '');
const WS_URL = API_URL.replace(/^http/, 'ws');

// Helper function to get WebSocket URL
const getWebSocketUrl = (token) => {
  const baseUrl = `${WS_URL}/ws`;
  
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
  const { width } = useWindowDimensions();
  const isCompactLayout = width < 1260;
  const isStackedWorkspace = width < 1560;
  const isTightHeaderLayout = width < 1380;
  const sidebarWidth = isCompactLayout ? '100%' : Math.max(360, Math.min(430, width * 0.29));
  const caseRailWidth = isStackedWorkspace ? '100%' : Math.max(340, Math.min(420, width * 0.25));

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
  const [commandStatusMessage, setCommandStatusMessage] = useState('Command center ready for the next conversation.');
  const [selectedShortcutId, setSelectedShortcutId] = useState(null);
  const [showAllThreads, setShowAllThreads] = useState(false);
  const [workspaceSummary, setWorkspaceSummary] = useState<any>(null);

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
  const lastSelectedConversationIdRef = useRef(null);
  const isRestoringConversationRef = useRef(false);
  const lastConversationStorageKey = userId ? `support-chat:last-conversation:${userId}` : null;

  const getStoredConversationId = useCallback(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !lastConversationStorageKey) {
      return null;
    }

    return window.localStorage.getItem(lastConversationStorageKey);
  }, [lastConversationStorageKey]);

  useEffect(() => {
    if (!activeConversation) {
      setSelectedShortcutId(null);
      setCommandStatusMessage('Command center ready for the next conversation.');
      return;
    }

    setSelectedShortcutId(null);
    setCommandStatusMessage(
      `Focused on ${activeConversation.customer_name || 'the active customer'} via ${(activeConversation.platform || 'support').toUpperCase()}.`
    );
  }, [activeConversation?.conversation_id]);

  useEffect(() => {
    if (!activeConversation?.conversation_id) {
      return;
    }

    lastSelectedConversationIdRef.current = activeConversation.conversation_id;

    if (Platform.OS !== 'web' || typeof window === 'undefined' || !lastConversationStorageKey) {
      return;
    }

    window.localStorage.setItem(lastConversationStorageKey, activeConversation.conversation_id);
  }, [activeConversation?.conversation_id, lastConversationStorageKey]);

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

      try {
        try {
          const workspaceResponse = await axios.get(`${API_URL}/api/support-workspace/summary`, {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 15000
          });
          setWorkspaceSummary(workspaceResponse.data?.data || null);
        } catch (primaryWorkspaceError) {
          console.warn('⚠️ support-workspace summary failed, falling back to /api/support/dashboard:', primaryWorkspaceError?.message || primaryWorkspaceError);
          const workspaceFallback = await axios.get(`${API_URL}/api/support/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 15000
          });
          setWorkspaceSummary(workspaceFallback.data?.data || null);
        }
      } catch (workspaceError) {
        console.warn('⚠️ Failed to load support workspace summary:', workspaceError?.message || workspaceError);
      }
      
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

        if (convs.length === 0) {
          setActiveConversation(null);
          setMessages([]);
        }
        
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
        console.log('🧪 Falling back to cached data');
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

        if (filteredConvs.length === 0) {
          setActiveConversation(null);
          setMessages([]);
        }
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
        name: `${user?.first_name || user?.name || 'Omni Support'} ${user?.last_name || 'Consultant'}`,
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
    
    console.log('🔄 Setting up REAL WebSocket...');
    
    const wsManager = webSocketManager as any;
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
        lastSelectedConversationIdRef.current = conv.conversation_id;
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
        setMessages([]);
        lastSelectedConversationIdRef.current = conv.conversation_id;
        setActiveConversation({ ...conv, unread_count: 0 });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (loading || conversations.length === 0 || activeConversation?.conversation_id || isRestoringConversationRef.current) {
      return;
    }

    const storedConversationId = getStoredConversationId();
    const preferredConversation =
      conversations.find((conversation) => conversation.conversation_id === storedConversationId) ||
      conversations.find((conversation) => conversation.conversation_id === lastSelectedConversationIdRef.current) ||
      conversations[0];

    if (!preferredConversation) {
      return;
    }

    isRestoringConversationRef.current = true;

    Promise.resolve(loadMessages(preferredConversation)).finally(() => {
      if (isMountedRef.current) {
        isRestoringConversationRef.current = false;
      }
    });
  }, [conversations, activeConversation?.conversation_id, loading, getStoredConversationId]);

  // Load agent status
  const loadAgentStatus = async () => {
    console.log('📡 Loading agent status...');
    
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
      sender_name: `${user?.first_name || user?.name || 'Omni Support'} ${user?.last_name || 'Consultant'}`,
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
        user_name: `${user?.first_name || user?.name || 'Omni Support'} ${user?.last_name || 'Consultant'}`
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
      const diffMs = now.getTime() - date.getTime();
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

  const formatRoleLabel = (value) => {
    if (!value) return 'Support Operations';

    return value
      .toString()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  };

  const getConversationPriorityMeta = (conversation, unreadCount = 0) => {
    const urgentLanguage = /(refund|charge|duplicate|fraud|access|dispute|complaint|urgent|help)/i.test(
      conversation?.last_message || ''
    );

    if (conversation?.status === 'resolved') {
      return {
        label: 'Resolved',
        short: 'Closed',
        color: '#166534',
        surface: '#DCFCE7',
        helper: 'This case is currently closed.'
      };
    }

    if (unreadCount >= 4 || urgentLanguage) {
      return {
        label: 'Critical attention',
        short: 'Critical',
        color: '#DC2626',
        surface: '#FEE2E2',
        helper: 'Reply window is tightening and needs immediate handling.'
      };
    }

    if (unreadCount >= 2 || conversation?.platform === 'whatsapp') {
      return {
        label: 'High touch',
        short: 'High',
        color: '#D97706',
        surface: '#FEF3C7',
        helper: 'Keep ownership tight and update the customer proactively.'
      };
    }

    return {
      label: 'Within target',
      short: 'Standard',
      color: '#0284C7',
      surface: '#E0F2FE',
      helper: 'This conversation is inside the current service target.'
    };
  };

  const getConversationSlaMeta = (conversation, unreadCount = 0) => {
    if (conversation?.status === 'resolved') {
      return {
        label: 'Closed',
        color: '#166534',
        surface: '#DCFCE7',
        helper: 'No active SLA risk on a resolved case.'
      };
    }

    if (unreadCount >= 4) {
      return {
        label: 'Breach risk',
        color: '#DC2626',
        surface: '#FEE2E2',
        helper: 'Take the next reply in under 5 minutes.'
      };
    }

    if (unreadCount >= 2) {
      return {
        label: 'Watch closely',
        color: '#D97706',
        surface: '#FEF3C7',
        helper: 'This case should be reviewed before the next queue cycle.'
      };
    }

    return {
      label: 'Healthy',
      color: '#16A34A',
      surface: '#DCFCE7',
      helper: 'Service pacing is healthy for this conversation.'
    };
  };

  const getCustomerSegmentMeta = (conversation) => {
    if (conversation?.customer_phone && conversation?.platform === 'whatsapp') {
      return {
        label: 'Verified contact',
        color: '#0284C7',
        surface: '#E0F2FE',
        helper: 'Direct callback or confirmation is available if needed.'
      };
    }

    if (conversation?.platform === 'instagram' || conversation?.platform === 'facebook') {
      return {
        label: 'Social customer',
        color: '#8B5CF6',
        surface: '#F3E8FF',
        helper: 'Keep messaging concise and brand-safe for public channels.'
      };
    }

    return {
      label: 'Digital support',
      color: '#475569',
      surface: '#E2E8F0',
      helper: 'Standard digital support workflow applies.'
    };
  };

  const getConversationMoodMeta = (conversation, unreadCount = 0) => {
    const sensitiveLanguage = /(refund|charge|angry|complaint|dispute|not working|denied|issue)/i.test(
      conversation?.last_message || ''
    );

    if (conversation?.status === 'resolved') {
      return {
        label: 'Stabilized',
        color: '#16A34A',
        surface: '#DCFCE7',
        helper: 'Keep closure notes crisp in case the customer returns.'
      };
    }

    if (sensitiveLanguage || unreadCount >= 3) {
      return {
        label: 'Needs reassurance',
        color: '#DC2626',
        surface: '#FEE2E2',
        helper: 'Lead with clarity, ownership, and a direct next step.'
      };
    }

    return {
      label: 'Cooperative',
      color: '#0284C7',
      surface: '#E0F2FE',
      helper: 'A confident operational update should keep this case moving.'
      };
  };

  const totalUnreadCount = (Object.values(unreadCounts) as number[]).reduce(
    (sum, count) => sum + Number(count || 0),
    0
  );
  const openConversationCount = conversations.filter(
    (conversation) => conversation.status !== 'resolved'
  ).length;
  const resolvedConversationCount = conversations.filter(
    (conversation) => conversation.status === 'resolved'
  ).length;
  const selectedConversationUnread = activeConversation
    ? unreadCounts[activeConversation.conversation_id] || 0
    : 0;
  const selectedPlatformOption = activeConversation
    ? platformOptions.find((platform) => platform.id === activeConversation.platform) || platformOptions[0]
    : null;
  const agentDisplayName =
    user?.first_name ||
    user?.name ||
    user?.username ||
    user?.email?.split('@')[0] ||
    'Omni Support Consultant';
  const agentRoleLabel = formatRoleLabel(user?.displayRole || user?.role || 'Omni Support Consultant');
  const agentStatusMeta =
    agentStatus === 'available'
      ? {
          label: 'Live routing',
          detail: 'Ready for new inbound conversations and queue escalation.',
          color: '#16A34A',
          surface: '#DCFCE7'
        }
      : agentStatus === 'break'
        ? {
            label: 'Protected break',
            detail: 'Queue stays visible while new assignments are temporarily reduced.',
            color: '#D97706',
            surface: '#FEF3C7'
          }
        : {
            label: 'Offline coverage',
            detail: 'Realtime chat routing is paused until the desk returns online.',
            color: '#475569',
            surface: '#E2E8F0'
          };
  const liveStats = workspaceSummary?.stats || {};
  const queueSummaryCards = [
    {
      label: 'Open queue',
      value: String(Number(liveStats.activeConversations ?? openConversationCount ?? 0)),
      helper: `${Number(liveStats.resolvedConversations ?? resolvedConversationCount ?? 0)} resolved conversations`,
      accent: '#4F46E5',
      surface: '#EEF2FF',
      action: {
        type: 'toggleThreads',
        label: showAllThreads ? 'Collapse queue' : 'Show all threads',
        message: showAllThreads
          ? 'Queue sections collapsed back to the current active ticket.'
          : 'Every queued conversation is now visible in the routing column.'
      }
    },
    {
      label: 'Unread load',
      value: totalUnreadCount.toString(),
      helper: totalUnreadCount > 0 ? 'Messages still awaiting a reply' : 'All customer threads are covered',
      accent: totalUnreadCount > 0 ? '#DC2626' : '#16A34A',
      surface: totalUnreadCount > 0 ? '#FEE2E2' : '#DCFCE7',
      action: {
        type: 'status',
        label: 'Review unread load',
        message: totalUnreadCount > 0
          ? `${totalUnreadCount} unread customer replies still need review.`
          : 'The unread queue is currently clear.'
      }
    },
    {
      label: 'Urgent tickets',
      value: String(Number(liveStats.urgentOpenTickets ?? 0)),
      helper: `${Number(liveStats.openTickets ?? 0)} open support tickets`,
      accent: Number(liveStats.urgentOpenTickets ?? 0) > 0 ? '#D97706' : '#0284C7',
      surface: Number(liveStats.urgentOpenTickets ?? 0) > 0 ? '#FEF3C7' : '#E0F2FE',
      action: wsConnected
        ? {
            type: 'status',
            label: 'Review ticket load',
            message: `${Number(liveStats.openTickets ?? 0)} open tickets with ${Number(liveStats.urgentOpenTickets ?? 0)} marked urgent.`
          }
        : {
            type: 'reconnect',
            label: 'Reconnect stream',
            message: 'Attempting to restore the realtime support stream.'
          }
    }
  ];
  const selectedPriorityMeta = activeConversation
    ? getConversationPriorityMeta(activeConversation, selectedConversationUnread)
    : null;
  const selectedSlaMeta = activeConversation
    ? getConversationSlaMeta(activeConversation, selectedConversationUnread)
    : null;
  const selectedCustomerSegmentMeta = activeConversation
    ? getCustomerSegmentMeta(activeConversation)
    : null;
  const selectedMoodMeta = activeConversation
    ? getConversationMoodMeta(activeConversation, selectedConversationUnread)
    : null;
  const conversationStatCards = activeConversation
    ? [
        {
          id: 'last-activity',
          label: 'Last activity',
          value: formatTime(activeConversation.last_message_time),
          helper: 'Review the latest customer touchpoint in this thread.',
          action: {
            type: 'status',
            label: 'Review activity',
            message: `Last customer activity was ${formatTime(activeConversation.last_message_time)}.`
          }
        },
        {
          id: 'channel',
          label: 'Channel',
          value: (activeConversation.platform || 'Unknown').toUpperCase(),
          helper: 'Use the right channel workflow and escalation path.',
          action: {
            type: 'status',
            label: 'Review channel workflow',
            message: `${(activeConversation.platform || 'Unknown').toUpperCase()} handling guidance is active for this thread.`
          }
        },
        {
          id: 'contact',
          label: 'Contact',
          value: activeConversation.customer_phone || 'Digital support thread',
          helper: activeConversation.customer_phone
            ? 'Direct callback and verification details are available.'
            : 'This case is moving through a digital-only support channel.',
          action: {
            type: 'navigate',
            route: 'SupportProfile',
            label: 'Open contact profile',
            message: 'Opened the customer profile for direct contact context.'
          }
        },
        {
          id: 'thread-depth',
          label: 'Thread depth',
          value: `${messages.length} messages`,
          helper: 'Use thread history before taking the next action.',
          action: {
            type: 'status',
            label: 'Review thread depth',
            message: `This ticket currently contains ${messages.length} messages.`
          }
        },
        {
          id: 'tone',
          label: 'Conversation tone',
          value: selectedMoodMeta?.label || 'Stable',
          helper: selectedMoodMeta?.helper || 'Conversation tone guidance is available.',
          tone: selectedMoodMeta?.color || '#0F172A',
          action: {
            type: 'macro',
            id: 'tone-guidance',
            label: 'Load tone guidance',
            message: 'Loaded a tone-calibrated reassurance response into the composer.',
            body: 'I understand the urgency here. I am reviewing the case carefully and I will share the next concrete step with you shortly.'
          }
        }
      ]
    : [];
  const caseIntelligenceCards = activeConversation
    ? [
        {
          id: 'priority-detail',
          label: 'Priority',
          value: selectedPriorityMeta.label,
          helper: selectedPriorityMeta.helper,
          color: selectedPriorityMeta.color,
          surface: selectedPriorityMeta.surface,
          action: {
            id: 'priority-update',
            type: 'macro',
            label: 'Load priority update',
            body: 'Thanks for flagging this. I am treating it as a priority case and I am reviewing the details now.'
          }
        },
        {
          id: 'sla-detail',
          label: 'SLA posture',
          value: selectedSlaMeta.label,
          helper: selectedSlaMeta.helper,
          color: selectedSlaMeta.color,
          surface: selectedSlaMeta.surface,
          action: {
            id: 'sla-review',
            type: 'status',
            label: 'Review SLA posture',
            message: `${selectedSlaMeta.label}: ${selectedSlaMeta.helper}`
          }
        },
        {
          id: 'segment-detail',
          label: 'Customer segment',
          value: selectedCustomerSegmentMeta.label,
          helper: selectedCustomerSegmentMeta.helper,
          color: selectedCustomerSegmentMeta.color,
          surface: selectedCustomerSegmentMeta.surface,
          action: {
            id: 'open-profile',
            type: 'navigate',
            route: 'SupportProfile',
            label: 'Open profile view',
            message: 'Opened the profile and CRM workspace for this customer.'
          }
        },
        {
          id: 'tone-detail',
          label: 'Conversation tone',
          value: selectedMoodMeta.label,
          helper: selectedMoodMeta.helper,
          color: selectedMoodMeta.color,
          surface: selectedMoodMeta.surface,
          action: {
            id: 'tone-guidance',
            type: 'macro',
            label: 'Insert reassurance note',
            body: 'I understand the frustration here. I am reviewing the case carefully and I will guide you through the next step clearly.'
          }
        }
      ]
    : [];
  const selectedCommandCards = activeConversation
    ? [
        {
          id: 'priority',
          label: 'Priority',
          value: selectedPriorityMeta.short,
          helper: selectedPriorityMeta.helper,
          icon: 'flag',
          color: selectedPriorityMeta.color,
          surface: selectedPriorityMeta.surface,
          action: {
            id: 'priority-update',
            type: 'macro',
            label: 'Load priority update',
            body: 'Thanks for flagging this. I am treating it as a priority case and I am reviewing the details now.'
          }
        },
        {
          id: 'sla',
          label: 'SLA posture',
          value: selectedSlaMeta.label,
          helper: selectedSlaMeta.helper,
          icon: 'timer',
          color: selectedSlaMeta.color,
          surface: selectedSlaMeta.surface,
          action: {
            id: 'sla-review',
            type: 'status',
            label: 'Review SLA posture',
            message: `${selectedSlaMeta.label}: ${selectedSlaMeta.helper}`
          }
        },
        {
          id: 'segment',
          label: 'Customer segment',
          value: selectedCustomerSegmentMeta.label,
          helper: selectedCustomerSegmentMeta.helper,
          icon: 'person-circle',
          color: selectedCustomerSegmentMeta.color,
          surface: selectedCustomerSegmentMeta.surface,
          action: {
            id: 'open-profile',
            type: 'navigate',
            route: 'SupportProfile',
            label: 'Open profile view',
            message: 'Opened the profile and CRM workspace for this customer.'
          }
        },
        {
          id: 'tone',
          label: 'Conversation tone',
          value: selectedMoodMeta.label,
          helper: selectedMoodMeta.helper,
          icon: 'pulse',
          color: selectedMoodMeta.color,
          surface: selectedMoodMeta.surface,
          action: {
            id: 'tone-guidance',
            type: 'macro',
            label: 'Insert reassurance note',
            body: 'I understand the frustration here. I am reviewing the case carefully and I will guide you through the next step clearly.'
          }
        }
      ]
    : [];
  const macroLibrary = activeConversation
    ? [
        {
          id: 'macro-reference',
          label: 'Request Reference',
          detail: 'Ask for order, booking, or ticket details',
          icon: 'document-text',
          tone: '#4F46E5',
          type: 'macro',
          message: 'Request Reference was loaded into the composer.',
          body: 'Could you please share your order, booking, or ticket reference so I can verify the issue right away?'
        },
        {
          id: 'macro-reassure',
          label: 'Reassure Customer',
          detail: 'Acknowledge the issue and take ownership',
          icon: 'shield-checkmark',
          tone: '#0284C7',
          type: 'macro',
          message: 'Reassure Customer was loaded into the composer.',
          body: 'Thanks for your patience. I am reviewing this personally and I will keep you updated with the next clear step.'
        },
        {
          id: 'macro-follow-up',
          label: 'Follow-Up Required',
          detail: 'Set expectations when waiting on another team',
          icon: 'git-network',
          tone: '#D97706',
          type: 'macro',
          message: 'Follow-Up Required was loaded into the composer.',
          body: 'I am waiting on an internal confirmation before I can finalize this for you. I will update you again as soon as that comes through.'
        },
        {
          id: 'macro-resolution',
          label: 'Resolution Confirm',
          detail: 'Confirm the case is resolved or stable',
          icon: 'checkmark-done-circle',
          tone: '#16A34A',
          type: 'macro',
          message: 'Resolution Confirm was loaded into the composer.',
          body: 'The issue has now been addressed on our side. Please check again and let me know if anything still needs attention.'
        }
      ]
    : [];
  const workspaceActions = activeConversation
    ? [
        {
          id: 'action-profile',
          label: 'Open CRM Profile',
          detail: 'Review customer history and retention context',
          icon: 'person',
          tone: '#4F46E5',
          type: 'navigate',
          route: 'SupportProfile',
          message: 'Opened the support profile workspace.'
        },
        {
          id: 'action-events',
          label: 'Open Event Desk',
          detail: 'Use for access, venue, or event-linked issues',
          icon: 'calendar',
          tone: '#F97316',
          type: 'navigate',
          route: 'SupportEvents',
          message: 'Opened the event support desk.'
        },
        {
          id: 'action-scanner',
          label: 'Launch Scanner',
          detail: 'Validate entry and resolve access exceptions',
          icon: 'scan',
          tone: '#16A34A',
          type: 'navigate',
          route: 'SupportScanner',
          message: 'Opened the scanner workflow.'
        },
        {
          id: 'action-note',
          label: 'Create Internal Note',
          detail: 'Capture handoff context for the next consultant',
          icon: 'create',
          tone: '#0EA5E9',
          type: 'status',
          message: 'Internal note workspace staged. Capture the next owner, blocker, and promised update.'
        },
        {
          id: 'action-resolution',
          label: activeConversation.status === 'resolved' ? 'Reopen Case' : 'Resolve Case',
          detail: activeConversation.status === 'resolved'
            ? 'Reopen this customer thread for further work'
            : 'Close the case once the customer outcome is stable',
          icon: activeConversation.status === 'resolved' ? 'refresh' : 'checkmark-circle',
          tone: activeConversation.status === 'resolved' ? '#4F46E5' : '#059669',
          type: activeConversation.status === 'resolved' ? 'reopen' : 'resolve',
          message: activeConversation.status === 'resolved'
            ? 'The case will be reopened for additional work.'
            : 'The case will be marked resolved and removed from the active queue.'
        }
      ]
    : [];
  const caseTimelineItems = activeConversation
    ? [
        {
          label: 'Customer last active',
          value: formatTime(activeConversation.last_message_time),
          helper: activeConversation.last_message || 'No recent message content available.'
        },
        {
          label: 'Ownership posture',
          value: agentDisplayName,
          helper: selectedSlaMeta?.helper || 'Ownership guidance unavailable.'
        },
        {
          label: 'Conversation depth',
          value: `${messages.length} messages`,
          helper: selectedConversationUnread > 0
            ? `${selectedConversationUnread} unread items were reviewed on open.`
            : 'Thread is currently aligned with the queue.'
        }
      ]
    : [];
  const deliveryStatusMeta = wsConnected
    ? {
        label: 'Realtime delivery online',
        helper: selectedConversationUnread > 0
          ? `${selectedConversationUnread} unread replies have already been pulled into the case review flow.`
          : 'This conversation is synchronized and ready for a response.',
        color: '#16A34A',
        surface: '#DCFCE7',
        action: {
          type: 'status',
          label: 'Review delivery status',
          message: 'Realtime delivery is online for the active conversation.'
        }
      }
    : {
        label: 'Realtime delivery paused',
        helper: 'Messages will queue until the support stream reconnects.',
        color: '#DC2626',
        surface: '#FEE2E2',
        action: {
          type: 'reconnect',
          label: 'Reconnect stream',
          message: 'Attempting to reconnect the support delivery stream.'
        }
      };

  const runWorkspaceAction = (action) => {
    if (!action) {
      return;
    }

    setCommandStatusMessage(action.message || `${action.label} was triggered for this case.`);

    if (action.type === 'toggleThreads') {
      setShowAllThreads((current) => !current);
      return;
    }

    if (action.type === 'refresh') {
      loadConversations();
      return;
    }

    if (action.type === 'reconnect') {
      handleReconnect();
      return;
    }

    if (!activeConversation && action.type !== 'status' && action.type !== 'navigate') {
      Alert.alert('Select a ticket', 'Open a customer ticket to use this action.');
      return;
    }

    if (action.type === 'macro') {
      setSelectedShortcutId(action.id || null);
      setNewMessage((current) => {
        const nextBody = action.body || '';
        return current?.trim() ? `${current.trim()}\n\n${nextBody}` : nextBody;
      });
      handleTyping();
      return;
    }

    setSelectedShortcutId(null);

    if (action.type === 'navigate' && action.route) {
      navigation?.navigate?.(action.route);
      return;
    }

    if (action.type === 'status') {
      return;
    }

    if (action.type === 'resolve') {
      resolveConversation();
      return;
    }

    if (action.type === 'reopen') {
      reopenConversation();
      return;
    }

    Alert.alert(action.label, action.message || 'Workspace action executed.');
  };

  // Status Button Component
  const StatusBtn = ({ label, color, active, onPress }) => (
    <TouchableOpacity 
      onPress={onPress}
      style={[
        styles.statusButtonSimple,
        {
          backgroundColor: active ? `${color}18` : '#FFFFFF',
          borderColor: active ? color : '#CBD5E1'
        }
      ]}
    >
      <View style={[styles.statusButtonDot, { backgroundColor: color }]} />
      <Text style={[styles.statusButtonLabel, { color: active ? color : '#475569' }]}>{label}</Text>
    </TouchableOpacity>
  );

  // Platform Filter Bar
  const PlatformFilterBar = () => (
    <View style={styles.filterBar}>
      <View style={styles.filterBarHeader}>
        <View style={styles.filterHeaderCopy}>
          <Text style={styles.filterEyebrow}>Channel routing</Text>
          <Text style={styles.filterTitle}>Prioritize the queues that need attention first</Text>
          <TouchableOpacity style={styles.filterPill} onPress={() => setShowAllThreads((current) => !current)}>
            <Ionicons
              name={showAllThreads ? 'eye-off-outline' : 'list-outline'}
              size={14}
              color="#4338CA"
            />
            <Text style={styles.filterPillText}>{showAllThreads ? 'Collapse threads' : 'Show all threads'}</Text>
          </TouchableOpacity>
        </View>
      </View>
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
                name={platform.icon as any} 
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
    const visibleConversations = showAllThreads
      ? conversations
      : conversations.filter(
          (item) => item.conversation_id === activeConversation?.conversation_id
        );
    
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIconWrap, { backgroundColor: `${platformOption.color}18` }]}>
              <Ionicons name={platformOption.icon as any} size={14} color={platformOption.color} />
            </View>
            <Text style={styles.sectionTitle}>
              {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </Text>
            {totalUnread > 0 && (
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{totalUnread}</Text>
              </View>
            )}
          </View>
          <Text style={styles.sectionCount}>
            {showAllThreads
              ? `${conversations.length} chats`
              : visibleConversations.length > 0
                ? 'Current ticket'
                : `${conversations.length} hidden`}
          </Text>
        </View>

        {visibleConversations.map((item) => (
          <ConversationItem key={item.conversation_id} item={item} />
        ))}
      </View>
    );
  };

  // Conversation Item
  const ConversationItem = ({ item }) => {
    const platformOption = platformOptions.find(p => p.id === item.platform) || platformOptions[0];
    const unreadCount = unreadCounts[item.conversation_id] || 0;
    const priorityMeta = getConversationPriorityMeta(item, unreadCount);
    const slaMeta = getConversationSlaMeta(item, unreadCount);
    const moodMeta = getConversationMoodMeta(item, unreadCount);
    
    return (
      <TouchableOpacity
        style={[
          styles.convItem, 
          activeConversation?.conversation_id === item.conversation_id && styles.activeConv,
          item.status === 'resolved' && styles.resolvedConv
        ]}
        onPress={() => loadMessages(item)}
        activeOpacity={0.92}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: platformOption.color + '20' }]}>
            <Ionicons name={platformOption.icon as any} size={20} color={platformOption.color} />
          </View>
          <View style={[styles.platformBadge, { backgroundColor: platformOption.color }]}>
            <Ionicons name={platformOption.icon as any} size={10} color="#fff" />
          </View>
        </View>
        <View style={styles.convInfo}>
          <View style={styles.convHeader}>
            <View style={styles.convIdentity}>
              <Text style={styles.customerName} numberOfLines={1}>
                {item.customer_name}
              </Text>
              <View style={styles.convBadgeRow}>
                {item.status === 'resolved' && (
                  <View style={[styles.queuePill, styles.queueResolvedPill]}>
                    <Text style={[styles.queuePillText, styles.queueResolvedPillText]}>Resolved</Text>
                  </View>
                )}
                <View style={[styles.queuePill, { backgroundColor: priorityMeta.surface }]}>
                  <Ionicons name="flag" size={10} color={priorityMeta.color} />
                  <Text style={[styles.queuePillText, { color: priorityMeta.color }]}>{priorityMeta.short}</Text>
                </View>
                <View style={[styles.queuePill, { backgroundColor: slaMeta.surface }]}>
                  <Ionicons name="timer-outline" size={10} color={slaMeta.color} />
                  <Text style={[styles.queuePillText, { color: slaMeta.color }]}>{slaMeta.label}</Text>
                </View>
              </View>
            </View>
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
            <Text style={styles.lastMsg} numberOfLines={2}>
              {item.last_message || 'No messages yet'}
            </Text>
            <View style={styles.convFooterRow}>
              <Text style={styles.phoneLabel}>
                {item.platform === 'whatsapp' && item.customer_phone
                  ? item.customer_phone
                  : 'Digital support thread'}
              </Text>
              <View style={[styles.convMoodWrap, { backgroundColor: moodMeta.surface }]}>
                <Ionicons name="pulse" size={11} color={moodMeta.color} />
                <Text style={[styles.convMoodText, { color: moodMeta.color }]}>{moodMeta.label}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Message Bubble
  const MessageBubble = ({ item }) => {
    const isSupport = item.sender_type === 'support' || item.sender_type === 'agent';
    const bubbleMeta = [
      formatMessageTime(item.timestamp),
      isSupport ? 'You' : 'Customer',
      isSupport && item.delivered ? 'Delivered' : null,
      item.message_id?.startsWith('wa_') ? 'WhatsApp' : null,
      item.message_id?.startsWith('temp_') ? 'Sending' : null
    ].filter(Boolean).join(' - ');
    
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
              {bubbleMeta}
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
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={styles.pageScrollContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.mainContainer, isCompactLayout && styles.mainContainerStack]}>
        {/* Connection Banner */}
        {!wsConnected && (
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
        <View style={[styles.sidebar, { width: sidebarWidth }, isCompactLayout && styles.sidebarStack]}>
          <View style={styles.sidebarHeader}>
            <View style={styles.headerTop}>
                <View style={styles.headerCopy}>
                  <View style={styles.commandBadge}>
                    <Ionicons name="sparkles" size={14} color="#4F46E5" />
                    <Text style={styles.commandBadgeText}>Customer Operations</Text>
                  </View>
                  <Text style={styles.title}>Omni Support Command Center</Text>
                  <Text style={styles.sidebarLead}>
                    Enterprise-grade omni-channel control surface for queue oversight, case execution, and consultant coordination.
                  </Text>
                </View>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={loadConversations}
                disabled={loading}
              >
                <Ionicons
                  name="refresh"
                  size={18}
                  color={loading ? '#94A3B8' : '#4F46E5'}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.commandSignals}>
              <View
                style={[
                  styles.signalPill,
                  wsConnected ? styles.signalPillConnected : styles.signalPillDisconnected
                ]}
              >
                <View
                  style={[
                    styles.signalDot,
                    { backgroundColor: wsConnected ? '#16A34A' : '#DC2626' }
                  ]}
                />
                <Text
                  style={[
                    styles.signalPillText,
                    !wsConnected && styles.signalPillTextDisconnected
                  ]}
                >
                  {connectionStatus}
                </Text>
              </View>

              <View style={styles.signalPillSecondary}>
                <Ionicons name="shield-checkmark" size={14} color={agentStatusMeta.color} />
                <Text style={styles.signalPillSecondaryText}>{agentStatusMeta.label}</Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              {queueSummaryCards.map((card) => (
                <TouchableOpacity
                  key={card.label}
                  style={[styles.metricCard, { backgroundColor: card.surface }]}
                  activeOpacity={0.92}
                  onPress={() => runWorkspaceAction(card.action)}
                >
                  <Text style={styles.metricCardLabel}>{card.label}</Text>
                  <Text style={[styles.metricCardValue, { color: card.accent }]}>{card.value}</Text>
                  <Text style={styles.metricCardHelper}>{card.helper}</Text>
                  <Text style={[styles.metricCardAction, { color: card.accent }]}>{card.action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.agentInfoContainer}>
              <View style={styles.agentProfileCard}>
                <View style={styles.agentProfile}>
                  <View style={styles.agentAvatar}>
                    <Ionicons name="person" size={18} color="#fff" />
                  </View>
                  <View style={styles.agentDetails}>
                    <Text style={styles.agentOverline}>Assigned desk</Text>
                    <Text style={styles.agentName}>{agentDisplayName}</Text>
                    <Text style={styles.agentRole}>{agentRoleLabel}</Text>
                  </View>
                </View>

                <View style={[styles.agentStateBadge, { backgroundColor: agentStatusMeta.surface }]}>
                  <View style={[styles.agentStateDot, { backgroundColor: agentStatusMeta.color }]} />
                  <Text style={[styles.agentStateText, { color: agentStatusMeta.color }]}>
                    {agentStatus === 'available' ? 'Available' : agentStatus === 'break' ? 'On Break' : 'Offline'}
                  </Text>
                </View>
              </View>
              <Text style={styles.agentStatusDetail}>{agentStatusMeta.detail}</Text>
              {renderStatusPicker()}
            </View>
          </View>

          <View style={styles.sidebarContentCard}>
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
              <ScrollView
                style={styles.scrollRegion}
                contentContainerStyle={[
                  styles.sidebarScrollContent,
                  Object.keys(groupedConversations).length === 0 && styles.sidebarScrollContentEmpty
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#6366F1']}
                  />
                }
              >
                {Object.keys(groupedConversations).length > 0 ? (
                  Object.keys(groupedConversations).map((platform) => (
                    <ConversationSection
                      key={platform}
                      platform={platform}
                      conversations={groupedConversations[platform]}
                    />
                  ))
                ) : (
                  <View style={styles.emptyList}>
                    <View style={styles.emptyListIcon}>
                      <Ionicons name="chatbubble-ellipses-outline" size={60} color="#CBD5E1" />
                    </View>
                    <Text style={styles.emptyListTitle}>No conversations in queue</Text>
                    <Text style={styles.emptyListSubtitle}>
                      {'New customer threads will appear here in real time'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>

        {/* CHAT AREA */}
        <View style={[styles.chatArea, isCompactLayout && styles.chatAreaStack]}>
          {activeConversation ? (
            <View style={styles.chatPanel}>
              <View style={[styles.chatHeader, isTightHeaderLayout && styles.chatHeaderStack]}>
                <TouchableOpacity
                  style={styles.chatHeaderLeft}
                  onPress={() => {
                    Alert.alert(
                      'Customer Details',
                      `Name: ${activeConversation.customer_name}\nPlatform: ${activeConversation.platform}\nStatus: ${activeConversation.status}\n${activeConversation.customer_phone ? `Phone: ${activeConversation.customer_phone}` : ''}`
                    );
                  }}
                >
                  <View
                    style={[
                      styles.chatAvatar,
                      { backgroundColor: `${selectedPlatformOption?.color || '#6366F1'}18` }
                    ]}
                  >
                    <Ionicons
                      name={(selectedPlatformOption?.icon || 'chatbubble-ellipses') as any}
                      size={22}
                      color={selectedPlatformOption?.color || '#6366F1'}
                    />
                  </View>
                  <View style={styles.chatHeaderInfo}>
                    <Text style={styles.chatEyebrow}>Live conversation</Text>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                      {activeConversation.customer_name || 'Customer'}
                    </Text>
                    <Text style={styles.chatHeaderDescription} numberOfLines={2}>
                      {activeConversation.last_message || 'Customer context is ready for the next response.'}
                    </Text>
                    <View style={styles.headerChipRow}>
                      <View
                        style={[
                          styles.headerInfoChip,
                          { backgroundColor: `${selectedPlatformOption?.color || '#6366F1'}14` }
                        ]}
                      >
                        <Ionicons
                          name={(selectedPlatformOption?.icon || 'chatbubble') as any}
                          size={12}
                          color={selectedPlatformOption?.color || '#6366F1'}
                        />
                        <Text
                          style={[
                            styles.headerInfoChipText,
                            { color: selectedPlatformOption?.color || '#6366F1' }
                          ]}
                        >
                          {(activeConversation.platform || 'channel').toUpperCase()}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.headerInfoChip,
                          activeConversation.status === 'active'
                            ? styles.headerInfoChipActive
                            : styles.headerInfoChipResolved
                        ]}
                      >
                        <Text
                          style={[
                            styles.headerInfoChipText,
                            activeConversation.status === 'active'
                              ? styles.headerInfoChipActiveText
                              : styles.headerInfoChipResolvedText
                          ]}
                        >
                          {activeConversation.status === 'active' ? 'Active case' : 'Resolved case'}
                        </Text>
                      </View>

                      {selectedConversationUnread > 0 && (
                        <View style={styles.headerInfoChipNeutral}>
                          <Ionicons name="mail-unread-outline" size={12} color="#475569" />
                          <Text style={styles.headerInfoChipNeutralText}>
                            {selectedConversationUnread} unread
                          </Text>
                        </View>
                      )}

                      {selectedPriorityMeta && (
                        <View style={[styles.headerInfoChip, { backgroundColor: selectedPriorityMeta.surface }]}>
                          <Ionicons name="flag" size={12} color={selectedPriorityMeta.color} />
                          <Text style={[styles.headerInfoChipText, { color: selectedPriorityMeta.color }]}>
                            {selectedPriorityMeta.short} priority
                          </Text>
                        </View>
                      )}

                      {selectedSlaMeta && (
                        <View style={[styles.headerInfoChip, { backgroundColor: selectedSlaMeta.surface }]}>
                          <Ionicons name="timer-outline" size={12} color={selectedSlaMeta.color} />
                          <Text style={[styles.headerInfoChipText, { color: selectedSlaMeta.color }]}>
                            {selectedSlaMeta.label}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                <View style={[styles.chatHeaderActions, isTightHeaderLayout && styles.chatHeaderActionsInline]}>
                  {isTyping && (
                    <View style={styles.typingIndicator}>
                      <View style={styles.typingDots}>
                        <View style={styles.typingDot} />
                        <View style={styles.typingDot} />
                        <View style={styles.typingDot} />
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

              <View style={styles.chatStatsStrip}>
                {conversationStatCards.map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    style={styles.chatStatCard}
                    activeOpacity={0.92}
                    onPress={() => runWorkspaceAction(card.action)}
                  >
                    <Text style={styles.chatStatLabel}>{card.label}</Text>
                    <Text style={[styles.chatStatValue, card.tone ? { color: card.tone } : null]}>{card.value}</Text>
                    <Text style={styles.chatStatHelper}>{card.helper}</Text>
                    <Text style={styles.chatStatAction}>{card.action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.commandStrip}>
                {selectedCommandCards.map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    style={[
                      styles.commandCard,
                      selectedShortcutId === card.action.id && styles.commandCardActive,
                      { backgroundColor: card.surface }
                    ]}
                    activeOpacity={0.92}
                    onPress={() => runWorkspaceAction(card.action)}
                  >
                    <View style={styles.commandCardHeader}>
                      <View style={[styles.commandCardIconWrap, { backgroundColor: `${card.color}18` }]}>
                        <Ionicons name={card.icon as any} size={16} color={card.color} />
                      </View>
                      <Text style={[styles.commandCardAction, { color: card.color }]}>
                        {card.action.label}
                      </Text>
                    </View>
                    <Text style={styles.commandCardLabel}>{card.label}</Text>
                    <Text style={[styles.commandCardValue, { color: card.color }]}>{card.value}</Text>
                    <Text style={styles.commandCardHelper}>{card.helper}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.messagesWorkspace, isStackedWorkspace && styles.messagesWorkspaceStack]}>
                <View style={[styles.messagesContainer, isStackedWorkspace && styles.messagesContainerStack]}>
                  {loading ? (
                    <View style={styles.chatLoading}>
                      <ActivityIndicator size="large" color="#6366F1" />
                      <Text style={styles.chatLoadingText}>Loading messages...</Text>
                    </View>
                  ) : (
                    <ScrollView
                      style={styles.scrollRegion}
                      ref={flatListRef}
                      contentContainerStyle={[
                        styles.messagesContent,
                        messages.length === 0 && styles.messagesContentEmpty
                      ]}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    >
                      {messages.length > 0 ? (
                        messages.map((item) => (
                          <MessageBubble key={item.message_id} item={item} />
                        ))
                      ) : (
                        <View style={styles.noMessages}>
                          <View style={styles.noMessagesIcon}>
                            <Ionicons name="chatbubble-outline" size={50} color="#e2e8f0" />
                          </View>
                          <Text style={styles.noMessagesTitle}>No messages yet</Text>
                          <Text style={styles.noMessagesText}>
                            Start the conversation by sending a message
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  )}
                </View>

                <ScrollView
                  style={[
                    styles.caseRail,
                    { width: caseRailWidth },
                    isStackedWorkspace && styles.caseRailStack
                  ]}
                  contentContainerStyle={styles.caseRailContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.caseRailCard}>
                    <Text style={styles.caseRailTitle}>Delivery Control</Text>
                    <Text style={styles.caseRailMeta}>Live delivery, ticket readiness, and queue visibility for the active conversation.</Text>
                    <TouchableOpacity
                      style={[styles.deliveryStatusCard, { backgroundColor: deliveryStatusMeta.surface }]}
                      activeOpacity={0.92}
                      onPress={() => runWorkspaceAction(deliveryStatusMeta.action)}
                    >
                      <View style={[styles.deliveryStatusDot, { backgroundColor: deliveryStatusMeta.color }]} />
                      <View style={styles.deliveryStatusCopy}>
                        <Text style={[styles.deliveryStatusTitle, { color: deliveryStatusMeta.color }]}>{deliveryStatusMeta.label}</Text>
                        <Text style={styles.deliveryStatusHelper}>{deliveryStatusMeta.helper}</Text>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.inlineActionRow}>
                      <TouchableOpacity
                        style={styles.inlineActionButton}
                        activeOpacity={0.92}
                        onPress={() => runWorkspaceAction(deliveryStatusMeta.action)}
                      >
                        <Text style={styles.inlineActionText}>{deliveryStatusMeta.action.label}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.inlineActionButton}
                        activeOpacity={0.92}
                        onPress={() =>
                          runWorkspaceAction({
                            type: 'toggleThreads',
                            label: showAllThreads ? 'Collapse queue' : 'Show all threads',
                            message: showAllThreads
                              ? 'Queue sections collapsed back to the active ticket.'
                              : 'Every queue section is now expanded for review.'
                          })
                        }
                      >
                        <Text style={styles.inlineActionText}>{showAllThreads ? 'Collapse queue' : 'Show all threads'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.caseRailCard}>
                    <View style={styles.caseRailCardHeader}>
                      <View>
                        <Text style={styles.caseRailTitle}>Case Intelligence</Text>
                        <Text style={styles.caseRailMeta}>Operational detail across urgency, service risk, and customer posture.</Text>
                      </View>
                      <View style={styles.caseCommandStatusBadge}>
                        <Text style={styles.caseCommandStatusText}>Live</Text>
                      </View>
                    </View>
                    <View style={styles.caseStatusBanner}>
                      <Ionicons name="radio" size={14} color="#4F46E5" />
                      <Text style={styles.caseStatusBannerText}>{commandStatusMessage}</Text>
                    </View>
                    <View style={styles.caseInsightGrid}>
                      {caseIntelligenceCards.map((card) => (
                        <TouchableOpacity
                          key={card.id}
                          style={[styles.caseInsightTile, { backgroundColor: card.surface }]}
                          activeOpacity={0.92}
                          onPress={() => runWorkspaceAction(card.action)}
                        >
                          <Text style={styles.caseInsightLabel}>{card.label}</Text>
                          <Text style={[styles.caseInsightValue, { color: card.color }]}>{card.value}</Text>
                          <Text style={styles.caseInsightHelper}>{card.helper}</Text>
                          <Text style={[styles.caseInsightAction, { color: card.color }]}>{card.action?.label || 'Review'}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.caseInfoRow}>
                      <Text style={styles.caseInfoLabel}>Case owner</Text>
                      <Text style={styles.caseInfoValue}>{agentDisplayName}</Text>
                    </View>
                    <View style={styles.caseInfoRow}>
                      <Text style={styles.caseInfoLabel}>Contact</Text>
                      <Text style={styles.caseInfoValue}>{activeConversation.customer_phone || 'Digital support thread'}</Text>
                    </View>
                    <View style={styles.caseInfoRow}>
                      <Text style={styles.caseInfoLabel}>Status</Text>
                      <Text style={styles.caseInfoValue}>{activeConversation.status === 'resolved' ? 'Resolved' : 'Active case'}</Text>
                    </View>
                    <View style={styles.caseInfoRow}>
                      <Text style={styles.caseInfoLabel}>Thread depth</Text>
                      <Text style={styles.caseInfoValue}>{messages.length} messages</Text>
                    </View>
                  </View>

                  <View style={styles.caseRailCard}>
                    <Text style={styles.caseRailTitle}>Execution Shortcuts</Text>
                    <Text style={styles.caseRailMeta}>Use these buttons to move from conversation review into adjacent workflows.</Text>
                    <View style={styles.workspaceActionList}>
                      {workspaceActions.map((action) => (
                        <TouchableOpacity
                          key={action.id}
                          style={styles.workspaceActionCard}
                          activeOpacity={0.92}
                          onPress={() => runWorkspaceAction(action)}
                        >
                          <View style={[styles.workspaceActionIconWrap, { backgroundColor: `${action.tone}14` }]}>
                            <Ionicons name={action.icon as any} size={16} color={action.tone} />
                          </View>
                          <View style={styles.workspaceActionCopy}>
                            <Text style={styles.workspaceActionTitle}>{action.label}</Text>
                            <Text style={styles.workspaceActionDetail}>{action.detail}</Text>
                          </View>
                          <Ionicons name="arrow-forward" size={14} color={action.tone} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.caseRailCard}>
                    <Text style={styles.caseRailTitle}>Response Playbooks</Text>
                    <Text style={styles.caseRailMeta}>Load response templates into the composer without breaking conversation flow.</Text>
                    <View style={styles.macroList}>
                      {macroLibrary.map((macro) => (
                        <TouchableOpacity
                          key={macro.id}
                          style={[
                            styles.macroCard,
                            selectedShortcutId === macro.id && styles.macroCardActive,
                            { borderColor: selectedShortcutId === macro.id ? macro.tone : '#E2E8F0' }
                          ]}
                          activeOpacity={0.92}
                          onPress={() => runWorkspaceAction(macro)}
                        >
                          <View style={styles.macroCardTop}>
                            <View style={[styles.workspaceActionIconWrap, { backgroundColor: `${macro.tone}14` }]}>
                              <Ionicons name={macro.icon as any} size={15} color={macro.tone} />
                            </View>
                            <Text style={styles.macroLabel}>{macro.label}</Text>
                            <Text style={[styles.macroActionText, { color: macro.tone }]}>Insert</Text>
                          </View>
                          <Text style={styles.macroDetail}>{macro.detail}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.caseRailCard}>
                    <Text style={styles.caseRailTitle}>Case Timeline</Text>
                    <Text style={styles.caseRailMeta}>Recent operational markers for this thread and the current owner.</Text>
                    <View style={styles.timelineList}>
                      {caseTimelineItems.map((entry, index) => (
                        <View key={`${entry.label}-${index}`} style={styles.timelineRow}>
                          <View style={styles.timelineTrack}>
                            <View style={styles.timelineDot} />
                            {index < caseTimelineItems.length - 1 && <View style={styles.timelineLine} />}
                          </View>
                          <View style={styles.timelineCopy}>
                            <Text style={styles.timelineLabel}>{entry.label}</Text>
                            <Text style={styles.timelineValue}>{entry.value}</Text>
                            <Text style={styles.timelineHelper}>{entry.helper}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </ScrollView>
              </View>

              {activeConversation.status !== 'resolved' ? (
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : null}
                  keyboardVerticalOffset={90}
                  style={styles.inputArea}
                >
                  <View style={styles.inputPanel}>
                    <View style={styles.composerShortcutRow}>
                      {macroLibrary.map((macro) => (
                        <TouchableOpacity
                          key={macro.id}
                          style={[
                            styles.composerShortcut,
                            selectedShortcutId === macro.id && styles.composerShortcutActive,
                            {
                              borderColor: selectedShortcutId === macro.id ? macro.tone : '#E2E8F0',
                              backgroundColor: selectedShortcutId === macro.id ? `${macro.tone}14` : '#FFFFFF'
                            }
                          ]}
                          activeOpacity={0.92}
                          onPress={() => runWorkspaceAction(macro)}
                        >
                          <Ionicons name={macro.icon as any} size={13} color={macro.tone} />
                          <Text
                            style={[
                              styles.composerShortcutText,
                              { color: selectedShortcutId === macro.id ? macro.tone : '#475569' }
                            ]}
                          >
                            {macro.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="Compose a clear, customer-ready response..."
                        placeholderTextColor="#94a3b8"
                        value={newMessage}
                        onChangeText={(text) => {
                          setNewMessage(text);
                          handleTyping();
                        }}
                        onSubmitEditing={sendMessage}
                        multiline
                        maxLength={1000}
                        editable={wsConnected}
                      />
                      <TouchableOpacity
                        onPress={sendMessage}
                        style={[
                          styles.sendBtn,
                          (!newMessage.trim() || !wsConnected || sending) && styles.sendBtnDisabled
                        ]}
                        disabled={!newMessage.trim() || !wsConnected || sending}
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
                        {newMessage.trim() ? `${newMessage.trim().length}/1000 characters` : 'Composer ready'}
                      </Text>
                      <Text style={styles.inputFooterMeta}>
                        {selectedConversationUnread > 0 ? `${selectedConversationUnread} unread items reviewed` : 'Queue reviewed and ready for response'}
                      </Text>
                    </View>
                  </View>
                </KeyboardAvoidingView>
              ) : (
                <View style={styles.resolvedInputArea}>
                  <View style={styles.resolvedCard}>
                    <Ionicons name="checkmark-done-circle" size={24} color="#16A34A" />
                    <View style={styles.resolvedCopy}>
                      <Text style={styles.resolvedTitle}>Conversation resolved</Text>
                      <Text style={styles.resolvedText}>
                        Reopen the case if the customer sends a follow-up or needs more support.
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStatePanel}>
                <View style={styles.emptyStateBadge}>
                  <Ionicons name="layers-outline" size={14} color="#4F46E5" />
                  <Text style={styles.emptyStateBadgeText}>Operations Workspace</Text>
                </View>
                <View style={styles.emptyStateIcon}>
                  <Ionicons name="chatbubbles" size={100} color="#E2E8F0" />
                </View>
                <Text style={styles.emptyStateTitle}>Select a conversation to open the workspace</Text>
                <Text style={styles.emptyStateText}>
                  Queue oversight, ticket recovery, and support execution are ready. Pick a live thread or use the controls below to prepare the desk.
                </Text>

                <View style={styles.emptyStateMetrics}>
                  {queueSummaryCards.map((card) => (
                    <TouchableOpacity
                      key={card.label}
                      style={[styles.metricCard, styles.metricCardCompact, { backgroundColor: card.surface }]}
                      activeOpacity={0.92}
                      onPress={() => runWorkspaceAction(card.action)}
                    >
                      <Text style={styles.metricCardLabel}>{card.label}</Text>
                      <Text style={[styles.metricCardValue, { color: card.accent }]}>{card.value}</Text>
                      <Text style={styles.metricCardHelper}>{card.helper}</Text>
                      <Text style={[styles.metricCardAction, { color: card.accent }]}>{card.action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
               
              <View style={styles.emptyStateButtons}>
                <TouchableOpacity
                  style={styles.testButton}
                  onPress={() =>
                    runWorkspaceAction({
                      type: 'refresh',
                      label: 'Refresh queue',
                      message: 'Refreshing queue health, unread counts, and routing status.'
                    })
                  }
                >
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.testButtonText}>Refresh queue</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => runWorkspaceAction(deliveryStatusMeta.action)}
                >
                  <Ionicons
                    name={wsConnected ? 'checkmark-circle-outline' : 'refresh'}
                    size={18}
                    color="#6366F1"
                  />
                  <Text style={styles.secondaryButtonText}>{deliveryStatusMeta.action.label}</Text>
                </TouchableOpacity>
              </View>
              
                <View style={styles.emptyStateLaunchGrid}>
                  <TouchableOpacity
                    style={styles.emptyStateActionCard}
                    activeOpacity={0.92}
                    onPress={() =>
                      runWorkspaceAction({
                        type: 'refresh',
                        label: 'Refresh queue',
                        message: 'Refreshing queue health, unread counts, and routing status.'
                      })
                    }
                  >
                    <View style={[styles.emptyStateActionIconWrap, { backgroundColor: '#EEF2FF' }]}>
                      <Ionicons name="refresh" size={18} color="#4F46E5" />
                    </View>
                    <Text style={styles.emptyStateActionTitle}>Refresh queue</Text>
                    <Text style={styles.emptyStateActionDetail}>
                      Pull the latest ticket assignments, unread load, and live support routing into the workspace.
                    </Text>
                    <Text style={[styles.emptyStateActionLink, { color: '#4F46E5' }]}>Execute refresh</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.emptyStateActionCard}
                    activeOpacity={0.92}
                    onPress={() =>
                      runWorkspaceAction({
                        type: 'toggleThreads',
                        label: showAllThreads ? 'Collapse queue' : 'Show all threads',
                        message: showAllThreads
                          ? 'Queue sections collapsed back to the active ticket view.'
                          : 'All queued tickets are now visible in the routing column.'
                      })
                    }
                  >
                    <View style={[styles.emptyStateActionIconWrap, { backgroundColor: '#E0F2FE' }]}>
                      <Ionicons name={showAllThreads ? 'eye-off-outline' : 'list-outline'} size={18} color="#0284C7" />
                    </View>
                    <Text style={styles.emptyStateActionTitle}>{showAllThreads ? 'Collapse queue' : 'Show all threads'}</Text>
                    <Text style={styles.emptyStateActionDetail}>
                      Switch between focused-ticket mode and a full routing overview across every active support channel.
                    </Text>
                    <Text style={[styles.emptyStateActionLink, { color: '#0284C7' }]}>
                      {showAllThreads ? 'Return to focused mode' : 'Expand routing view'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.emptyStateActionCard}
                    activeOpacity={0.92}
                    onPress={() => runWorkspaceAction(deliveryStatusMeta.action)}
                  >
                    <View style={[styles.emptyStateActionIconWrap, { backgroundColor: deliveryStatusMeta.surface }]}>
                      <Ionicons
                        name={wsConnected ? 'radio' : 'refresh-circle'}
                        size={18}
                        color={deliveryStatusMeta.color}
                      />
                    </View>
                    <Text style={styles.emptyStateActionTitle}>{deliveryStatusMeta.label}</Text>
                    <Text style={styles.emptyStateActionDetail}>{deliveryStatusMeta.helper}</Text>
                    <Text style={[styles.emptyStateActionLink, { color: deliveryStatusMeta.color }]}>
                      {deliveryStatusMeta.action.label}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.emptyStateActionCard}
                    activeOpacity={0.92}
                    onPress={() =>
                      runWorkspaceAction({
                        type: 'navigate',
                        route: 'SupportProfile',
                        label: 'Open support profile',
                        message: 'Opened the support profile workspace.'
                      })
                    }
                  >
                    <View style={[styles.emptyStateActionIconWrap, { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons name="person-circle" size={18} color="#16A34A" />
                    </View>
                    <Text style={styles.emptyStateActionTitle}>Open support profile</Text>
                    <Text style={styles.emptyStateActionDetail}>
                      Launch customer CRM context, account details, and escalation history from the support operations desk.
                    </Text>
                    <Text style={[styles.emptyStateActionLink, { color: '#16A34A' }]}>Navigate to profile</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Test API connection function (preserved from original)
const testApiConnection = async (token) => {
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
  safeArea: {
    flex: 1,
    backgroundColor: '#EEF2FF'
  },
  pageScroll: {
    flex: 1,
    ...(Platform.OS === 'web'
      ? ({
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehaviorY: 'auto',
          WebkitOverflowScrolling: 'touch'
        } as any)
      : {})
  },
  pageScrollContent: {
    flexGrow: 1,
    ...(Platform.OS === 'web' ? ({ minHeight: '100%' } as any) : {})
  },
  mainContainer: {
    flexGrow: 1,
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    padding: 20,
    gap: 16,
    minHeight: 0,
    width: '100%',
    ...(Platform.OS === 'web' ? ({ minHeight: '100%' } as any) : {})
  },
  mainContainerStack: {
    flexDirection: 'column'
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEF2FF' },
  
  // Auth Error
  authErrorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  authErrorTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginTop: 20, marginBottom: 12 },
  authErrorText: { fontSize: 16, color: '#64748B', textAlign: 'center', marginBottom: 32 },
  
  // Connection Banner
  connectionBanner: {
    position: 'absolute',
    top: 18,
    left: 24,
    right: 24,
    zIndex: 1000,
    backgroundColor: '#0F172A',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#020617',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  connectionBannerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  connectionBannerText: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
  reconnectBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 6
  },
  reconnectBannerButtonText: { color: '#38BDF8', fontSize: 12, fontWeight: '700' },
  
  // Sidebar
  sidebar: { gap: 16, minHeight: 0, minWidth: 320, alignSelf: 'stretch' },
  sidebarStack: { minWidth: 0, width: '100%' },
  sidebarHeader: {
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#D8E2F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 }
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 16 },
  headerCopy: { flex: 1 },
  commandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 14
  },
  commandBadgeText: { fontSize: 11, fontWeight: '800', color: '#4338CA', letterSpacing: 0.8, textTransform: 'uppercase' },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginBottom: 8, letterSpacing: -0.6 },
  sidebarLead: { fontSize: 14, lineHeight: 22, color: '#475569', maxWidth: 420 },
  commandSignals: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  signalPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  signalPillConnected: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  signalPillDisconnected: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  signalDot: { width: 8, height: 8, borderRadius: 4 },
  signalPillText: { fontSize: 12, fontWeight: '700', color: '#166534' },
  signalPillTextDisconnected: { color: '#B91C1C' },
  signalPillSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  signalPillSecondaryText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
  metricCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    minHeight: 108
  },
  metricCardCompact: { minHeight: 0, paddingVertical: 14 },
  metricCardLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  metricCardValue: { fontSize: 26, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  metricCardHelper: { fontSize: 12, lineHeight: 18, color: '#475569' },
  metricCardAction: { marginTop: 10, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  connectionStatus: { flexDirection: 'row', alignItems: 'center' },
  connectionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  connected: { backgroundColor: '#22C55E' },
  disconnected: { backgroundColor: '#EF4444' },
  connectionText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  
  agentInfoContainer: { marginTop: 20, padding: 18, borderRadius: 22, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', gap: 12 },
  agentProfileCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  agentProfile: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  agentAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  agentDetails: { flex: 1 },
  agentOverline: { fontSize: 11, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  agentName: { fontSize: 17, color: '#0F172A', fontWeight: '700', marginBottom: 3 },
  agentStatusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6, backgroundColor: '#94A3B8' },
  statusAvailable: { backgroundColor: '#22C55E' },
  statusBusy: { backgroundColor: '#F59E0B' },
  statusOffline: { backgroundColor: '#64748B' },
  agentRole: { fontSize: 13, color: '#475569', fontWeight: '600' },
  agentStateBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  agentStateDot: { width: 8, height: 8, borderRadius: 4 },
  agentStateText: { fontSize: 12, fontWeight: '800' },
  agentStatusDetail: { fontSize: 12, lineHeight: 18, color: '#64748B' },
  
  statusControls: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  statusButtonSimple: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1 },
  statusButtonDot: { width: 8, height: 8, borderRadius: 4 },
  statusButtonLabel: { fontSize: 12, fontWeight: '700' },
  autoAssignToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#FFFFFF', marginLeft: 'auto', borderWidth: 1, borderColor: '#CBD5E1' },
  autoAssignText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  autoAssignActiveText: { color: '#6366F1' },
  
  // Error
  errorContainer: { backgroundColor: '#FEF2F2', margin: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },
  
  // Filter Bar
  sidebarContentCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 1, borderColor: '#D8E2F0', overflow: 'hidden', shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 16 }, minHeight: 0, maxHeight: '100%' },
  sidebarScrollContent: { flexGrow: 1, paddingBottom: 10 },
  sidebarScrollContentEmpty: { justifyContent: 'center' },
  filterBar: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#FCFDFE' },
  filterBarHeader: { alignItems: 'flex-start', gap: 12 },
  filterHeaderCopy: { alignItems: 'flex-start', gap: 8, width: '100%' },
  filterEyebrow: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  filterTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  filterPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE' },
  filterPillText: { fontSize: 11, fontWeight: '700', color: '#4338CA' },
  filterScrollContent: { paddingTop: 14, paddingBottom: 4, paddingRight: 18, flexDirection: 'row', alignItems: 'center' },
  filterBtn: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0', minWidth: 84 },
  filterBtnActive: { backgroundColor: '#6366F1', borderColor: '#4F46E5' },
  filterIcon: { marginRight: 2 },
  filterText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  filterTextActive: { color: '#fff' },
  
  // Sections
  sectionContainer: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIconWrap: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A', letterSpacing: 0.4 },
  sectionBadge: { backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  sectionBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  sectionCount: { fontSize: 11, color: '#475569', fontWeight: '700', backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  
  // Conversations
  convItem: { flexDirection: 'row', padding: 16, backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 1, borderColor: '#E2E8F0', marginHorizontal: 4, marginBottom: 10, shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } },
  activeConv: { backgroundColor: '#F8FBFF', borderColor: '#93C5FD', shadowOpacity: 0.1 },
  resolvedConv: { opacity: 0.8 },
  avatarContainer: { position: 'relative', marginRight: 14, alignSelf: 'flex-start' },
  avatar: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  platformBadge: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  convInfo: { flex: 1, justifyContent: 'center', gap: 10 },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 12 },
  convIdentity: { flex: 1, gap: 8 },
  customerName: { fontWeight: '700', color: '#0F172A', fontSize: 14, flex: 1 },
  resolvedLabel: { color: '#16A34A', fontSize: 12, fontWeight: '600' },
  convBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  queuePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  queuePillText: { fontSize: 10, fontWeight: '800' },
  queueResolvedPill: { backgroundColor: '#DCFCE7' },
  queueResolvedPillText: { color: '#166534' },
  messagePreview: { gap: 10 },
  lastMsg: { fontSize: 13, color: '#475569', lineHeight: 19, flex: 1 },
  convFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  phoneLabel: { fontSize: 11, color: '#475569', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', fontWeight: '600' },
  convMoodWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  convMoodText: { fontSize: 10, fontWeight: '800' },
  convMeta: { alignItems: 'flex-end', gap: 8 },
  timeText: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
  unreadBadge: { backgroundColor: '#DC2626', borderRadius: 999, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 7 },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  
  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 14, fontWeight: '600' },
  
  // Empty
  emptyList: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 88, paddingHorizontal: 40 },
  emptyListIcon: { marginBottom: 18 },
  emptyListTitle: { color: '#0F172A', fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptyListSubtitle: { color: '#64748B', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 21 },
  
  // Chat Area
  chatArea: { flex: 1, minWidth: 0, backgroundColor: '#FFFFFF', borderRadius: 32, borderWidth: 1, borderColor: '#D8E2F0', overflow: 'hidden', shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 16 }, minHeight: 0, alignSelf: 'stretch' },
  chatAreaStack: { width: '100%' },
  chatPanel: { flex: 1, backgroundColor: '#FFFFFF', minHeight: 0, minWidth: 0 },
  chatHeader: { padding: 24, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#FCFDFE', gap: 16 },
  chatHeaderStack: { flexDirection: 'column' },
  chatHeaderLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, minWidth: 0, gap: 16 },
  chatAvatar: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  chatHeaderInfo: { flex: 1 },
  chatEyebrow: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: '#94A3B8', marginBottom: 6 },
  chatHeaderDescription: { fontSize: 14, lineHeight: 21, color: '#475569', marginBottom: 12 },
  headerChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  headerInfoChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  headerInfoChipText: { fontSize: 11, fontWeight: '700' },
  headerInfoChipActive: { backgroundColor: '#DCFCE7' },
  headerInfoChipResolved: { backgroundColor: '#FEF3C7' },
  headerInfoChipActiveText: { color: '#166534' },
  headerInfoChipResolvedText: { color: '#92400E' },
  headerInfoChipNeutral: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  headerInfoChipNeutralText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  chatHeaderActions: { alignItems: 'flex-end', gap: 12, flexShrink: 0 },
  chatHeaderActionsInline: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: '#E2E8F0' },
  typingDots: { flexDirection: 'row', gap: 4 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6366F1', opacity: 0.7 },
  typingText: { fontSize: 12, color: '#64748B', fontStyle: 'italic' },
  actionButtons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resolveButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#059669', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, shadowColor: '#059669', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  resolveButtonDisabled: { opacity: 0.6 },
  reopenButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#4F46E5', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, shadowColor: '#4F46E5', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  reopenButtonDisabled: { opacity: 0.6 },
  resolveButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 6, letterSpacing: -0.5 },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerSub: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  statusIndicator: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: '#F1F5F9' },
  statusActive: { backgroundColor: '#DCFCE7' },
  statusResolved: { backgroundColor: '#FEF3C7' },
  statusIndicatorText: { fontSize: 10, fontWeight: '700', color: '#065F46' },
  statusResolvedText: { color: '#92400E' },
  
  chatStatsStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EEF2FF', backgroundColor: '#F8FAFC' },
  chatStatCard: { flex: 1, minWidth: 150, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 18, padding: 14 },
  chatStatLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  chatStatValue: { fontSize: 14, color: '#0F172A', fontWeight: '700', lineHeight: 20 },
  chatStatHelper: { fontSize: 12, lineHeight: 18, color: '#64748B', marginTop: 6, marginBottom: 10 },
  chatStatAction: { fontSize: 11, fontWeight: '800', color: '#4338CA', textTransform: 'uppercase', letterSpacing: 0.6 },
  commandStrip: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 12, paddingHorizontal: 24, paddingBottom: 16, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#EEF2FF' },
  commandCard: { minWidth: 180, flexGrow: 1, flexBasis: 0, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  commandCardActive: { borderColor: '#93C5FD', shadowOpacity: 0.08 },
  commandCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10 },
  commandCardIconWrap: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  commandCardAction: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, flex: 1, textAlign: 'right' },
  commandCardLabel: { fontSize: 12, color: '#64748B', fontWeight: '700', marginBottom: 6 },
  commandCardValue: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  commandCardHelper: { fontSize: 12, lineHeight: 18, color: '#475569' },

  // Messages Container
  messagesWorkspace: { flex: 1, flexDirection: 'row', alignItems: 'stretch', minHeight: 0, minWidth: 0, backgroundColor: '#F8FAFC' },
  messagesWorkspaceStack: { flexDirection: 'column' },
  messagesContainer: { flex: 1, minWidth: 0, backgroundColor: '#F8FAFC', minHeight: 0 },
  messagesContainerStack: { minHeight: 460 },
  caseRail: {
    flexShrink: 0,
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
    backgroundColor: '#FCFDFE',
    minHeight: 0,
    ...(Platform.OS === 'web'
      ? ({
          maxHeight: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehaviorY: 'auto',
          WebkitOverflowScrolling: 'touch'
        } as any)
      : {})
  },
  caseRailStack: {
    width: '100%',
    borderLeftWidth: 0,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    ...(Platform.OS === 'web'
      ? ({
          maxHeight: 'none',
          overflowY: 'visible'
        } as any)
      : {})
  },
  caseRailContent: { flexGrow: 1, padding: 16, gap: 14, paddingBottom: 24 },
  caseRailCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20, padding: 16, gap: 12 },
  caseRailCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  caseRailTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  caseRailMeta: { fontSize: 12, color: '#64748B', lineHeight: 18 },
  deliveryStatusCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 18, borderWidth: 1, borderColor: '#D8E2F0', padding: 14 },
  deliveryStatusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  deliveryStatusCopy: { flex: 1, gap: 4 },
  deliveryStatusTitle: { fontSize: 14, fontWeight: '800' },
  deliveryStatusHelper: { fontSize: 12, lineHeight: 18, color: '#475569' },
  inlineActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  inlineActionButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D8E2F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  inlineActionText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  caseCommandStatusBadge: { backgroundColor: '#EEF2FF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#C7D2FE' },
  caseCommandStatusText: { fontSize: 10, fontWeight: '800', color: '#4338CA', textTransform: 'uppercase', letterSpacing: 0.7 },
  caseStatusBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 12 },
  caseStatusBannerText: { flex: 1, fontSize: 12, lineHeight: 18, color: '#334155', fontWeight: '600' },
  caseInsightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  caseInsightTile: { flexGrow: 1, flexBasis: 140, backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, gap: 4 },
  caseInsightLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.7 },
  caseInsightValue: { fontSize: 15, fontWeight: '800' },
  caseInsightHelper: { fontSize: 11, lineHeight: 17, color: '#64748B' },
  caseInsightAction: { marginTop: 6, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  caseInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  caseInfoLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  caseInfoValue: { fontSize: 12, color: '#0F172A', fontWeight: '700', flexShrink: 1, textAlign: 'right', marginLeft: 10 },
  casePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  casePillHigh: { backgroundColor: '#FEE2E2' },
  casePillText: { color: '#B91C1C', fontSize: 11, fontWeight: '800' },
  caseChecklist: { fontSize: 13, color: '#334155', lineHeight: 21, marginBottom: 8 },
  caseActionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  caseActionBtn: { backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10 },
  caseActionText: { color: '#4338CA', fontSize: 12, fontWeight: '700' },
  workspaceActionList: { gap: 10 },
  workspaceActionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 12 },
  workspaceActionIconWrap: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  workspaceActionCopy: { flex: 1, gap: 3 },
  workspaceActionTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  workspaceActionDetail: { fontSize: 12, lineHeight: 18, color: '#64748B' },
  macroList: { gap: 10 },
  macroCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, padding: 12, gap: 8 },
  macroCardActive: { backgroundColor: '#F8FAFC' },
  macroCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  macroLabel: { flex: 1, fontSize: 13, fontWeight: '800', color: '#0F172A' },
  macroActionText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  macroDetail: { fontSize: 12, lineHeight: 18, color: '#64748B' },
  timelineList: { gap: 12 },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineTrack: { alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4F46E5', marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#CBD5E1', marginTop: 6, minHeight: 44 },
  timelineCopy: { flex: 1, gap: 3 },
  timelineLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.7 },
  timelineValue: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  timelineHelper: { fontSize: 12, lineHeight: 18, color: '#64748B' },
  messagesContent: { padding: 20, paddingBottom: 28, flexGrow: 1 },
  messagesContentEmpty: { justifyContent: 'center' },
  scrollRegion: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    ...(Platform.OS === 'web'
      ? ({
          maxHeight: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehaviorY: 'auto',
          WebkitOverflowScrolling: 'touch'
        } as any)
      : {})
  },
  chatLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatLoadingText: { marginTop: 12, color: '#64748B', fontSize: 14, fontWeight: '600' },
  // Message Bubbles
  messageContainer: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 18 },
  messageLeft: { justifyContent: 'flex-start' },
  messageRight: { justifyContent: 'flex-end' },
  senderAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  senderAvatarSupport: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  bubble: { maxWidth: '82%', padding: 16, borderRadius: 20, shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  bubbleLeft: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  bubbleRight: { backgroundColor: '#4338CA', borderBottomRightRadius: 6 },
  tempMessage: { opacity: 0.7 },
  msgText: { fontSize: 15, color: '#0F172A', lineHeight: 22 },
  msgTextRight: { color: '#fff' },
  bubbleFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  bubbleTime: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  bubbleTimeRight: { color: 'rgba(255,255,255,0.82)' },
  
  // Input Area
  inputArea: { borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#FCFDFE', paddingHorizontal: 20, paddingTop: 18, paddingBottom: Platform.OS === 'ios' ? 24 : 18 },
  inputPanel: { backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, gap: 10, shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  composerShortcutRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  composerShortcut: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  composerShortcutActive: { shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  composerShortcutText: { fontSize: 12, fontWeight: '700' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, borderWidth: 1, borderColor: '#E2E8F0', maxHeight: 120, minHeight: 56, fontSize: 15, color: '#0F172A', textAlignVertical: 'center' },
  sendBtn: { marginLeft: 12, width: 52, height: 52, borderRadius: 16, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', shadowColor: '#4F46E5', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  sendBtnDisabled: { backgroundColor: '#CBD5E1' },
  inputFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingTop: 8 },
  inputFooterText: { fontSize: 11, color: '#64748B', fontWeight: '700' },
  inputFooterMeta: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textAlign: 'right', flex: 1 },
  resolvedInputArea: { borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#FCFDFE', padding: 20 },
  resolvedCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#ECFDF5', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#BBF7D0' },
  resolvedCopy: { flex: 1 },
  resolvedTitle: { fontSize: 15, fontWeight: '700', color: '#166534', marginBottom: 4 },
  resolvedText: { color: '#166534', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  
  // Empty State
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F8FAFC' },
  emptyStatePanel: { width: '100%', maxWidth: 980, backgroundColor: '#FFFFFF', borderRadius: 32, borderWidth: 1, borderColor: '#E2E8F0', padding: 32, alignItems: 'stretch', shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 16 } },
  emptyStateBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE', marginBottom: 22 },
  emptyStateBadgeText: { fontSize: 11, fontWeight: '800', color: '#4338CA', textTransform: 'uppercase', letterSpacing: 0.8 },
  emptyStateIcon: { marginBottom: 22, alignSelf: 'center' },
  emptyStateTitle: { fontSize: 30, fontWeight: '800', color: '#0F172A', marginBottom: 12, textAlign: 'center', letterSpacing: -0.8 },
  emptyStateText: { color: '#475569', fontSize: 16, textAlign: 'center', alignSelf: 'center', marginBottom: 28, lineHeight: 25, maxWidth: 640 },
  emptyStateMetrics: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  emptyStateLaunchGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  emptyStateActionCard: { flexGrow: 1, flexBasis: 200, backgroundColor: '#F8FAFC', borderRadius: 22, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, gap: 10, minHeight: 170 },
  emptyStateActionIconWrap: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  emptyStateActionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  emptyStateActionDetail: { fontSize: 12, lineHeight: 19, color: '#64748B', flex: 1 },
  emptyStateActionLink: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  emptyStateButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32, justifyContent: 'center' },
  testButton: { backgroundColor: '#4F46E5', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#4F46E5', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  testButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  secondaryButton: { backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#CBD5E1' },
  secondaryButtonText: { color: '#4338CA', fontSize: 14, fontWeight: '700' },
  connectionInfo: { backgroundColor: '#F8FAFC', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', width: '100%', maxWidth: 500 },
  connectionInfoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  connectionInfoTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  connectionStatusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  connectionStatusConnected: { backgroundColor: '#DCFCE7' },
  connectionStatusDisconnected: { backgroundColor: '#FEE2E2' },
  connectionStatusBadgeText: { fontSize: 11, fontWeight: '800', color: '#166534', letterSpacing: 0.5 },
  connectionStatusDisconnectedText: { color: '#DC2626' },
  connectionInfoGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  connectionInfoItem: { flex: 1, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  connectionInfoLabel: { fontSize: 12, color: '#64748B', marginTop: 6, marginBottom: 4, fontWeight: '600' },
  connectionInfoValue: { fontSize: 14, color: '#0F172A', fontWeight: '700', textAlign: 'center' },
  
  noMessages: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, paddingHorizontal: 30 },
  noMessagesIcon: { marginBottom: 16 },
  noMessagesTitle: { color: '#0F172A', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  noMessagesText: { color: '#64748B', fontSize: 14, textAlign: 'center', lineHeight: 21 }
});

export default SupportChatScreen;
