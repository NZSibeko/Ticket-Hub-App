// src/screens/EventManagementScreen.web.js - COMPLETE FIXED VERSION
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';

const { width, height } = Dimensions.get('window');
const API_BASE_URL = 'http://localhost:8081';
const EVENTS_CACHE_KEY = 'event_management_events_cache';
const TOKEN_STORAGE_KEYS = ['userToken', 'token', 'authToken', 'adminToken'];
const EVENT_CACHE_LIMIT = 60;
const EVENT_CACHE_DESCRIPTION_LIMIT = 280;
const EVENT_CACHE_TICKET_LIMIT = 6;
const EVENT_INITIAL_RENDER_COUNT = 12;
const EVENT_RENDER_BATCH_SIZE = 12;
const EVENT_REFRESH_COOLDOWN_MS = 45000;

const EventManagementScreen = ({ navigation }) => {
  // --- Data State ---
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true); 
  const hasInitializedEvents = useRef(false);
  const lastEventsFetchAtRef = useRef(0);
  const loadEventsRef = useRef(null);
  
  // --- Filter State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [visibleEventsCount, setVisibleEventsCount] = useState(EVENT_INITIAL_RENDER_COUNT);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // --- Modal & Form State ---
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [successEventName, setSuccessEventName] = useState('');

  const initialFormState = {
    event_id: null,
    event_name: '',
    event_description: '',
    location: '',
    start_date: '',
    end_date: '',
    max_attendees: '',
    price: '',
    image_url: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [ticketTypes, setTicketTypes] = useState([]);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);

  // --- API Handlers ---

  const getStorageValue = async (key) => {
    if (typeof window !== 'undefined') {
      const localValue = window.localStorage?.getItem(key);
      if (localValue) return localValue;

      const sessionValue = window.sessionStorage?.getItem(key);
      if (sessionValue) return sessionValue;
    }

    return AsyncStorage.getItem(key);
  };

  const isQuotaExceededError = (error) =>
    error?.name === 'QuotaExceededError' ||
    error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error?.code === 22 ||
    error?.code === 1014;

  const setStorageValue = async (key, value) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.setItem(key, value);
        return true;
      } catch (error) {
        if (isQuotaExceededError(error)) {
          try {
            window.localStorage?.removeItem(key);
            window.localStorage?.setItem(key, value);
            return true;
          } catch (retryError) {
            try {
            window.sessionStorage?.setItem(key, value);
            return true;
            } catch (fallbackError) {
              console.warn(
                `Skipping cache write for ${key}: browser storage quota exceeded`,
                retryError,
                fallbackError
              );
            }
            return false;
          }
        }

        console.warn(`Unable to persist ${key} in browser storage`, error);
        return false;
      }
    }

    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Unable to persist ${key} in async storage`, error);
      return false;
    }
  };

  const removeStorageValue = async (key) => {
    if (typeof window !== 'undefined') {
      window.localStorage?.removeItem(key);
      window.sessionStorage?.removeItem(key);
      return;
    }

    await AsyncStorage.removeItem(key);
  };

  const getAuthToken = async () => {
    for (const key of TOKEN_STORAGE_KEYS) {
      const token = await getStorageValue(key);
      if (token) {
        return token.replace(/^"(.*)"$/, '$1').trim();
      }
    }

    return '';
  };

  const getAuthHeader = async () => {
    const token = await getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const normalizeEvents = (incomingEvents = []) =>
    incomingEvents.map(event => ({
      ...event,
      ticket_types: Array.isArray(event.ticket_types) ? event.ticket_types : [],
    }));

  const buildEventsCacheSnapshot = (incomingEvents = []) =>
    incomingEvents.slice(0, EVENT_CACHE_LIMIT).map(event => ({
      event_id: event.event_id,
      event_name: event.event_name || '',
      event_description: String(event.event_description || '').slice(0, EVENT_CACHE_DESCRIPTION_LIMIT),
      location: event.location || '',
      start_date: event.start_date || '',
      end_date: event.end_date || '',
      max_attendees: event.max_attendees || 0,
      price: event.price || 0,
      image_url: event.image_url || '',
      status: event.status || 'DRAFT',
      archived: event.archived || 0,
      created_at: event.created_at || '',
      created_by: event.created_by || '',
      ticket_types: Array.isArray(event.ticket_types)
        ? event.ticket_types.slice(0, EVENT_CACHE_TICKET_LIMIT).map(ticket => ({
            name: ticket?.name || '',
            price: ticket?.price || 0,
            quantity: ticket?.quantity || 0,
          }))
        : [],
    }));

  const hydrateCachedEvents = async () => {
    try {
      const cachedEvents = await getStorageValue(EVENTS_CACHE_KEY);
      if (!cachedEvents) return false;

      const parsedEvents = JSON.parse(cachedEvents);
      if (!Array.isArray(parsedEvents)) return false;

      setEvents(normalizeEvents(parsedEvents));
      setLoading(false);
      return true;
    } catch (error) {
      console.warn('Unable to hydrate cached events:', error);
      return false;
    }
  };

  const loadEvents = async (showLoading = true) => {
    if (showLoading && events.length === 0) setLoading(true);
    const isRefreshing = !showLoading;
    if (isRefreshing) setRefreshing(true);

    try {
      const token = await getAuthToken();
      const headers = await getAuthHeader();
      const primaryUrl = token
        ? `${API_BASE_URL}/api/events/manage/all`
        : `${API_BASE_URL}/api/events/public`;

      let res = await fetch(primaryUrl, {
        headers,
        credentials: 'include',
      });
      let data = await res.json();

      // Backend compatibility fallback: if protected endpoint fails, use public events.
      if (!res.ok && (res.status >= 500 || (token && (res.status === 401 || res.status === 403)))) {
        console.warn('Primary events endpoint failed, falling back to /api/events/public');
        res = await fetch(`${API_BASE_URL}/api/events/public`, {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        data = await res.json();
      }

      if (res.ok && data.success) {
        const preparedEvents = normalizeEvents(data.events);
        setEvents(preparedEvents);
        setIsAuthenticated(Boolean(token) || preparedEvents.length > 0);
        await setStorageValue(
          EVENTS_CACHE_KEY,
          JSON.stringify(buildEventsCacheSnapshot(preparedEvents))
        );
        console.log(`âœ… Loaded ${preparedEvents.length} validated events from /api/events`);
      } else if (res.status === 403) {
        Alert.alert('Access Denied', 'Your account does not have permission to manage events.');
        setEvents([]);
        setIsAuthenticated(false);
        await removeStorageValue(EVENTS_CACHE_KEY);
      } else {
        console.error('API Error:', data.error);
        Alert.alert('Error', data.error || 'Failed to load events');
        if (events.length === 0) {
          setEvents([]);
        }
      }
    } catch (error) {
      console.error('Fetch events error:', error);
      if (events.length === 0) {
        Alert.alert('Network Error', 'Could not connect to server');
        setEvents([]);
      }
    } finally {
      lastEventsFetchAtRef.current = Date.now();
      if (showLoading) setLoading(false);
      if (isRefreshing) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEventsRef.current = loadEvents;
  }, [loadEvents]);

  const updateEventStatus = async (eventId, action) => {
    try {
      const headers = await getAuthHeader();
      
      const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/${action}`, {
        method: 'PUT',
        headers,
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setModalMessage(data.message || `Event successfully ${action}d.`);
        setSuccessModalVisible(true);
        loadEvents(false);
        setTimeout(() => setSuccessModalVisible(false), 2000);
      } else {
        Alert.alert('Error', data.error || `Failed to ${action} event`);
      }
    } catch (error) {
      Alert.alert('Network Error', error.message);
    }
  };

  // --- DELETE HANDLERS ---
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setEventToDelete(null);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;

    try {
      const headers = await getAuthHeader();

      const res = await fetch(`${API_BASE_URL}/api/events/${eventToDelete.event_id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Remove event from local state
        setEvents(prev => prev.filter(e => e.event_id !== eventToDelete.event_id));
        setShowDeleteModal(false);
        setEventToDelete(null);
        setModalMessage(data.message || 'Event permanently deleted!');
        setSuccessModalVisible(true);
        setTimeout(() => setSuccessModalVisible(false), 2000);
      } else {
        Alert.alert('Error', data.error || 'Failed to delete event.');
        setShowDeleteModal(false);
        setEventToDelete(null);
      }
    } catch (error) {
      Alert.alert('Network Error', 'Could not connect to the server for deletion.');
      setShowDeleteModal(false);
      setEventToDelete(null);
    }
  };

  const handleDeleteEvent = (event) => {
    setEventToDelete(event);
    setShowDeleteModal(true);
  };

  // --- FORM HANDLERS ---

  const openCreateModal = () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please log in to create an event.');
      return;
    }
    
    // Reset form to initial state
    const now = new Date();
    const defaultDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    
    setFormData({
      ...initialFormState,
      start_date: defaultDate.toISOString().slice(0, 16),
      max_attendees: '100',
      price: '0',
    });
    
    // Initialize with a default ticket type
    setTicketTypes([{ 
      name: 'General Admission', 
      price: '0', 
      quantity: '100' 
    }]);
    
    setIsEditing(false);
    setModalVisible(true);
  };

  const openEditModal = (event) => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please log in to edit an event.');
      return;
    }
    
    setFormData({
      event_id: event.event_id,
      event_name: event.event_name || '',
      event_description: event.event_description || '',
      location: event.location || '',
      start_date: event.start_date ? event.start_date.slice(0, 16) : '',
      end_date: event.end_date ? event.end_date.slice(0, 16) : '',
      max_attendees: event.max_attendees?.toString() || '0',
      price: event.price?.toString() || '0',
      image_url: event.image_url || '',
    });
    
    // Ensure ticket types are ready for editing
    setTicketTypes(
      event.ticket_types && event.ticket_types.length > 0 
        ? event.ticket_types.map(t => ({
            name: t.name || 'Standard',
            price: t.price?.toString() || '0',
            quantity: t.quantity?.toString() || '0'
          }))
        : [{ name: 'Standard', price: '0', quantity: '0' }]
    );
    
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleTicketChange = (text, index, field) => {
    const newTickets = [...ticketTypes];
    newTickets[index][field] = text;
    setTicketTypes(newTickets);
  };

  const addTicketType = () => {
    setTicketTypes([...ticketTypes, { name: '', price: '', quantity: '' }]);
  };

  const removeTicketType = (index) => {
    if (ticketTypes.length <= 1) {
      Alert.alert('Cannot Remove', 'At least one ticket type is required.');
      return;
    }
    const newTickets = ticketTypes.filter((_, i) => i !== index);
    setTicketTypes(newTickets);
  };

  // **UPDATED CREATE/EDIT EVENT FUNCTION**
  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.event_name.trim()) {
      Alert.alert('Validation Error', 'Event name is required.');
      return;
    }
    
    if (!formData.location.trim()) {
      Alert.alert('Validation Error', 'Location is required.');
      return;
    }
    
    if (!formData.start_date) {
      Alert.alert('Validation Error', 'Start date is required.');
      return;
    }
    
    const maxAttendees = parseInt(formData.max_attendees);
    if (isNaN(maxAttendees) || maxAttendees <= 0) {
      Alert.alert('Validation Error', 'Max attendees must be a number greater than 0.');
      return;
    }

    // Validate ticket types
    const validTickets = ticketTypes.filter(ticket => 
      ticket.name && ticket.name.trim() && 
      !isNaN(parseFloat(ticket.price)) && 
      !isNaN(parseInt(ticket.quantity))
    );
    
    if (validTickets.length === 0) {
      Alert.alert('Validation Error', 'At least one valid ticket type is required.');
      return;
    }

    setSubmitting(true);

    try {
      const headers = await getAuthHeader();

      // Format date for API - ensure proper ISO string
      let startDate = formData.start_date;
      if (!startDate.includes('T')) {
        // If it's just date without time, add time
        startDate = `${startDate}T12:00:00.000Z`;
      }
      
      let endDate = formData.end_date;
      if (endDate && !endDate.includes('T')) {
        endDate = `${endDate}T23:59:59.000Z`;
      }

      // Prepare ticket types for API
      const ticketPayload = validTickets.map(ticket => ({
        name: ticket.name.trim(),
        price: parseFloat(ticket.price) || 0,
        quantity: parseInt(ticket.quantity) || 0
      }));

      // Prepare event data for API
      const eventData = {
        event_name: formData.event_name.trim(),
        event_description: formData.event_description.trim() || '',
        location: formData.location.trim(),
        start_date: startDate,
        end_date: endDate || null,
        max_attendees: parseInt(formData.max_attendees) || 0,
        price: parseFloat(formData.price) || 0,
        image_url: formData.image_url.trim() || null,
        ticket_types: ticketPayload
      };

      let url, method, successMessage;
      
      if (isEditing) {
        url = `${API_BASE_URL}/api/events/${formData.event_id}`;
        method = 'PUT';
        successMessage = 'Event updated successfully!';
      } else {
        url = `${API_BASE_URL}/api/events`;
        method = 'POST';
        successMessage = 'Event created successfully!';
      }

      console.log('ðŸ“¤ Sending event data to API:', {
        url,
        method,
        data: eventData
      });

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(eventData),
      });

      // Get response as text first to handle potential errors
      const responseText = await res.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        console.error('Raw response:', responseText);
        throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 200)}`);
      }

      console.log('ðŸ“¥ API Response:', {
        status: res.status,
        success: data.success,
        data: data
      });

      if (res.ok && data.success) {
        // Close the create/edit modal
        setModalVisible(false);
        
        // Show success message
        setModalMessage(successMessage);
        setSuccessEventName(formData.event_name);
        setSuccessModalVisible(true);
        
        // Reset form
        if (!isEditing) {
          setFormData(initialFormState);
          setTicketTypes([{ name: 'General Admission', price: '0', quantity: '100' }]);
        }
        
        // Refresh events list immediately
        await loadEvents(false);
        
        // Auto-hide success modal after 3 seconds
        setTimeout(() => {
          setSuccessModalVisible(false);
          setSuccessEventName('');
        }, 3000);
        
      } else {
        // Handle API errors
        const errorMessage = data.error || data.message || `HTTP ${res.status}: Failed to save event`;
        console.error('API Error Details:', {
          status: res.status,
          error: data.error,
          message: data.message,
          fullResponse: data
        });
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Network error:', error);
      Alert.alert('Network Error', `Could not connect to the server: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Effects ---
  useEffect(() => {
    const initializeEvents = async () => {
      const hydratedFromCache = await hydrateCachedEvents();
      await loadEvents(!hydratedFromCache);
      hasInitializedEvents.current = true;
    };

    initializeEvents();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (
        hasInitializedEvents.current &&
        Date.now() - lastEventsFetchAtRef.current > EVENT_REFRESH_COOLDOWN_MS
      ) {
        loadEventsRef.current?.(false);
      }
    }, [])
  );

  const parseNumeric = (value) => {
    if (value === null || value === undefined || value === '') return 0;

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const parseDateValue = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDateTime = (value) => {
    const date = parseDateValue(value);
    if (!date) return 'Schedule not set';

    return date.toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCompactNumber = (value) =>
    parseNumeric(value).toLocaleString('en-ZA', { maximumFractionDigits: 0 });

  const formatCurrency = (value) =>
    `R ${parseNumeric(value).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;

  const getTicketAnalytics = (event) => {
    const rawTicketMix = Array.isArray(event.ticket_types) ? event.ticket_types : [];
    const capacity = parseNumeric(event.max_attendees);
    const fallbackPrice = parseNumeric(event.price);

    const ticketMix = rawTicketMix.length > 0
      ? rawTicketMix
      : capacity > 0
        ? [{ name: 'General Admission', price: fallbackPrice, quantity: capacity }]
        : [];

    const totalInventory = ticketMix.reduce(
      (sum, ticket) => sum + parseNumeric(ticket.quantity),
      0
    );

    const ticketValue = ticketMix.reduce(
      (sum, ticket) => sum + (parseNumeric(ticket.price) * parseNumeric(ticket.quantity)),
      0
    );

    const weightedQuantity = ticketMix.reduce(
      (sum, ticket) => sum + parseNumeric(ticket.quantity),
      0
    );

    const averagePrice = weightedQuantity > 0
      ? ticketValue / weightedQuantity
      : fallbackPrice;

    const allocationRatio = capacity > 0
      ? Math.min(100, Math.round((totalInventory / capacity) * 100))
      : ticketMix.length > 0
        ? 100
        : 0;

    return {
      capacity,
      ticketMix,
      totalInventory,
      ticketValue,
      averagePrice,
      allocationRatio,
    };
  };

  const getStatusMeta = (status, isArchived) => {
    if (isArchived === 1) {
      return {
        label: 'ARCHIVED',
        color: '#b91c1c',
        bgColor: '#fee2e2',
      };
    }

    if (status === 'VALIDATED') {
      return {
        label: 'VALIDATED',
        color: '#15803d',
        bgColor: '#dcfce7',
      };
    }

    if (status === 'PENDING') {
      return {
        label: 'PENDING',
        color: '#b45309',
        bgColor: '#fef3c7',
      };
    }

    return {
      label: status || 'DRAFT',
      color: '#475569',
      bgColor: '#e2e8f0',
    };
  };

  const getLifecycleMeta = (event, nowTimestamp = Date.now()) => {
    if (event.archived === 1) {
      return {
        label: 'Archived inventory',
        detail: 'Removed from active catalog execution',
        tone: '#64748b',
      };
    }

    const start = parseDateValue(event.start_date);

    if (!start) {
      return {
        label: 'Schedule missing',
        detail: 'Start date still needs to be set',
        tone: '#dc2626',
      };
    }

    const diffDays = Math.ceil((start.getTime() - nowTimestamp) / 86400000);

    if (diffDays < 0) {
      return {
        label: 'In market',
        detail: `Started ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`,
        tone: '#2563eb',
      };
    }

    if (diffDays === 0) {
      return {
        label: 'Live today',
        detail: 'Execution window is active today',
        tone: '#16a34a',
      };
    }

    if (diffDays <= 7) {
      return {
        label: 'Launching this week',
        detail: `${diffDays} day${diffDays === 1 ? '' : 's'} to go`,
        tone: '#d97706',
      };
    }

    return {
      label: 'Upcoming',
      detail: `${diffDays} day${diffDays === 1 ? '' : 's'} to go`,
      tone: '#0f766e',
    };
  };

  const getOperationalScore = (event, analytics = getTicketAnalytics(event)) => {

    let score = 0;
    score += event.archived === 1 ? 5 : 15;
    score += event.status === 'VALIDATED' ? 30 : event.status === 'PENDING' ? 18 : 10;
    score += event.location ? 15 : 0;
    score += parseDateValue(event.start_date) ? 15 : 0;
    score += parseDateValue(event.end_date) ? 5 : 0;
    score += analytics.ticketMix.length > 0 ? 12 : 0;
    score += analytics.capacity > 0 ? 8 : 0;
    score += analytics.allocationRatio >= 85 ? 10 : analytics.allocationRatio >= 50 ? 5 : 0;

    return Math.min(100, score);
  };

  const getScoreTone = (score) => {
    if (score >= 85) return '#16a34a';
    if (score >= 65) return '#d97706';
    return '#dc2626';
  };

  const getEventFlags = (event, analytics = getTicketAnalytics(event)) => {
    const flags = [];

    if (event.archived === 1) flags.push('Archived catalog record');
    if (event.archived !== 1 && event.status !== 'VALIDATED') flags.push('Requires publishing validation');
    if (!event.location) flags.push('Venue details incomplete');
    if (!parseDateValue(event.start_date)) flags.push('Launch schedule incomplete');
    if (analytics.ticketMix.length === 0) flags.push('Ticket model missing');
    if (analytics.ticketMix.length > 0 && analytics.allocationRatio < 60) {
      flags.push('Ticket allocation below target');
    }

    return flags.slice(0, 3);
  };

  const openEventDetails = (event) => {
    setSelectedEvent(event);
    setDetailModalVisible(true);
  };

  const closeEventDetails = () => {
    setDetailModalVisible(false);
    setSelectedEvent(null);
  };

  // --- Filtering & Searching Logic ---
  const enrichedEvents = useMemo(() => {
    const nowTimestamp = Date.now();

    return events.map(event => {
      const analytics = getTicketAnalytics(event);
      const operationalScore = getOperationalScore(event, analytics);
      const startTimestamp = parseDateValue(event.start_date)?.getTime() || null;
      const sortTimestamp =
        startTimestamp ||
        parseDateValue(event.created_at)?.getTime() ||
        0;

      return {
        ...event,
        analytics,
        lifecycle: getLifecycleMeta(event, nowTimestamp),
        operationalScore,
        scoreTone: getScoreTone(operationalScore),
        flags: getEventFlags(event, analytics),
        searchTargets: [
          event.event_name,
          event.location,
          event.status,
          ...(Array.isArray(event.ticket_types) ? event.ticket_types.map(ticket => ticket.name) : []),
        ]
          .filter(Boolean)
          .map(value => String(value).toLowerCase()),
        startTimestamp,
        sortTimestamp,
      };
    });
  }, [events]);

  const portfolioMetrics = useMemo(() => {
    const activeEvents = enrichedEvents.filter(event => event.archived !== 1);
    const validated = activeEvents.filter(event => event.status === 'VALIDATED').length;
    const pending = activeEvents.filter(event => event.status === 'PENDING').length;
    const draft = activeEvents.filter(event => !event.status || event.status === 'DRAFT').length;
    const archived = enrichedEvents.filter(event => event.archived === 1).length;

    const upcomingEvents = [...activeEvents]
      .filter(event => !!event.startTimestamp && event.startTimestamp >= Date.now())
      .sort((a, b) => (a.startTimestamp || 0) - (b.startTimestamp || 0));

    const capacity = activeEvents.reduce(
      (sum, event) => sum + event.analytics.capacity,
      0
    );

    const potentialRevenue = activeEvents.reduce(
      (sum, event) => sum + event.analytics.ticketValue,
      0
    );

    const ticketPrograms = activeEvents.reduce(
      (sum, event) => sum + event.analytics.ticketMix.length,
      0
    );

    const readinessAverage = activeEvents.length > 0
      ? Math.round(
          activeEvents.reduce((sum, event) => sum + event.operationalScore, 0) /
          activeEvents.length
        )
      : 0;

    const allocationAverage = activeEvents.length > 0
      ? Math.round(
          activeEvents.reduce((sum, event) => sum + event.analytics.allocationRatio, 0) /
          activeEvents.length
        )
      : 0;

    const attentionRequired = activeEvents.filter(
      event => event.operationalScore < 75 || event.status !== 'VALIDATED'
    ).length;

    const topRevenueEvents = [...activeEvents]
      .sort((a, b) => b.analytics.ticketValue - a.analytics.ticketValue)
      .slice(0, 4);

    const priorityQueue = [...activeEvents]
      .sort((a, b) => {
        const scoreDelta = a.operationalScore - b.operationalScore;
        if (scoreDelta !== 0) return scoreDelta;

        const aTime = a.startTimestamp || Number.MAX_SAFE_INTEGER;
        const bTime = b.startTimestamp || Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      })
      .slice(0, 4);

    return {
      totalEvents: enrichedEvents.length,
      validated,
      pending,
      draft,
      archived,
      upcoming: upcomingEvents.length,
      capacity,
      potentialRevenue,
      ticketPrograms,
      readinessAverage,
      allocationAverage,
      attentionRequired,
      upcomingEvents,
      topRevenueEvents,
      priorityQueue,
    };
  }, [enrichedEvents]);

  const filterOptions = [
    { key: 'all', label: 'All events', count: portfolioMetrics.totalEvents },
    { key: 'validated', label: 'Validated', count: portfolioMetrics.validated },
    { key: 'pending', label: 'Pending', count: portfolioMetrics.pending },
    { key: 'draft', label: 'Drafts', count: portfolioMetrics.draft },
    { key: 'upcoming', label: 'Upcoming', count: portfolioMetrics.upcoming },
    { key: 'archived', label: 'Archived', count: portfolioMetrics.archived },
  ];

  const filteredEvents = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

    return enrichedEvents
      .filter(event => {
        const matchesSearch =
          !normalizedQuery ||
          event.searchTargets.some(value => value.includes(normalizedQuery));

        let matchesFilter = true;

        switch (statusFilter) {
          case 'validated':
            matchesFilter = event.archived !== 1 && event.status === 'VALIDATED';
            break;
          case 'pending':
            matchesFilter = event.archived !== 1 && event.status === 'PENDING';
            break;
          case 'draft':
            matchesFilter = event.archived !== 1 && (!event.status || event.status === 'DRAFT');
            break;
          case 'upcoming':
            matchesFilter = event.archived !== 1 && !!event.startTimestamp && event.startTimestamp >= Date.now();
            break;
          case 'archived':
            matchesFilter = event.archived === 1;
            break;
          default:
            matchesFilter = true;
        }

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        const aArchived = a.archived === 1 ? 1 : 0;
        const bArchived = b.archived === 1 ? 1 : 0;

        if (aArchived !== bArchived) {
          return aArchived - bArchived;
        }

        return a.sortTimestamp - b.sortTimestamp;
      });
  }, [enrichedEvents, deferredSearchQuery, statusFilter]);

  useEffect(() => {
    setVisibleEventsCount(EVENT_INITIAL_RENDER_COUNT);
  }, [deferredSearchQuery, statusFilter, events.length]);

  const visibleEvents = useMemo(
    () => filteredEvents.slice(0, visibleEventsCount),
    [filteredEvents, visibleEventsCount]
  );

  const shownEventsCount = visibleEvents.length;
  const hasMoreVisibleEvents = visibleEvents.length < filteredEvents.length;

  // --- Components ---
  const renderStatusBadge = (status, isArchived) => {
    const meta = getStatusMeta(status, isArchived);

    return (
      <View style={[styles.badge, { backgroundColor: meta.bgColor }]}>
        <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
      </View>
    );
  };

  const EventCard = ({ item }) => {
    const isArchived = item.archived === 1;
    const analytics = item.analytics || getTicketAnalytics(item);
    const lifecycle = item.lifecycle || getLifecycleMeta(item);
    const score = item.operationalScore ?? getOperationalScore(item, analytics);
    const scoreTone = item.scoreTone || getScoreTone(score);
    const flags = item.flags || getEventFlags(item, analytics);

    const commandAction = isArchived
      ? {
          label: 'Restore',
          onPress: () => updateEventStatus(item.event_id, 'unarchive'),
          style: [styles.btnAction, styles.btnRestore],
          textStyle: styles.btnRestoreText,
        }
      : item.status === 'VALIDATED'
        ? {
            label: 'Archive',
            onPress: () => updateEventStatus(item.event_id, 'archive'),
            style: [styles.btnAction, styles.btnWarning],
            textStyle: styles.btnWarningText,
          }
        : {
            label: 'Validate',
            onPress: () => updateEventStatus(item.event_id, 'validate'),
            style: [styles.btnAction, styles.btnSuccess],
            textStyle: styles.btnSuccessText,
          };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image
            source={{
              uri: item.image_url || 'https://placehold.co/600x400/e2e8f0/0f172a?text=Event+Program',
            }}
            style={styles.cardImage}
            onError={() => console.log('Failed to load image for:', item.event_name)}
          />
          <View style={styles.cardContent}>
            <View style={styles.cardTopRow}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.event_name}</Text>
              {renderStatusBadge(item.status, item.archived)}
            </View>

            <Text style={styles.cardDetail} numberOfLines={1}>
              <Ionicons name="location-outline" size={12} color="#64748b" /> {item.location || 'Venue not assigned'}
            </Text>
            <Text style={styles.cardDetail}>
              <Ionicons name="calendar-outline" size={12} color="#64748b" /> {formatDateTime(item.start_date)}
            </Text>

            <View style={[styles.lifecyclePill, { borderColor: `${lifecycle.tone}30`, backgroundColor: `${lifecycle.tone}12` }]}>
              <Text style={[styles.lifecycleLabel, { color: lifecycle.tone }]}>{lifecycle.label}</Text>
              <Text style={styles.lifecycleDetail}>{lifecycle.detail}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardInsightGrid}>
          <View style={styles.cardInsightTile}>
            <Text style={styles.cardInsightLabel}>Revenue potential</Text>
            <Text style={styles.cardInsightValue}>{formatCurrency(analytics.ticketValue)}</Text>
          </View>
          <View style={styles.cardInsightTile}>
            <Text style={styles.cardInsightLabel}>Capacity mapped</Text>
            <Text style={styles.cardInsightValue}>{formatCompactNumber(analytics.capacity)}</Text>
          </View>
          <View style={[styles.cardInsightTile, { borderColor: `${scoreTone}30`, backgroundColor: `${scoreTone}10` }]}>
            <Text style={styles.cardInsightLabel}>Operational score</Text>
            <Text style={[styles.cardInsightValue, { color: scoreTone }]}>{score}%</Text>
          </View>
        </View>

        <View style={styles.cardProgressBlock}>
          <View style={styles.cardProgressHeader}>
            <Text style={styles.cardProgressLabel}>Ticket allocation model</Text>
            <Text style={styles.cardProgressValue}>{analytics.allocationRatio}%</Text>
          </View>
          <View style={styles.cardProgressTrack}>
            <View
              style={[
                styles.cardProgressFill,
                {
                  width: `${Math.max(analytics.allocationRatio, analytics.ticketMix.length > 0 ? 10 : 4)}%`,
                  backgroundColor: scoreTone,
                },
              ]}
            />
          </View>
        </View>

        {flags.length > 0 && (
          <View style={styles.flagRow}>
            {flags.map(flag => (
              <View key={`${item.event_id}-${flag}`} style={styles.flagChip}>
                <Text style={styles.flagChipText}>{flag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.btnAction, styles.btnPrimary]}
            onPress={() => openEventDetails(item)}
            {...Platform.select({ web: { cursor: 'pointer' } })}
          >
            <Ionicons name="analytics-outline" size={18} color="#ffffff" />
            <Text style={styles.btnPrimaryText}>Open Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnAction}
            onPress={() => openEditModal(item)}
            {...Platform.select({ web: { cursor: 'pointer' } })}
          >
            <Ionicons name="create-outline" size={18} color="#2563eb" />
            <Text style={styles.btnActionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={commandAction.style}
            onPress={commandAction.onPress}
            {...Platform.select({ web: { cursor: 'pointer' } })}
          >
            <Text style={commandAction.textStyle}>{commandAction.label}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnAction, styles.btnDanger]}
            onPress={() => handleDeleteEvent(item)}
            {...Platform.select({ web: { cursor: 'pointer' } })}
          >
            <Text style={styles.btnDangerText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const EventIntelligenceModal = () => {
    if (!selectedEvent) return null;

    const analytics = selectedEvent.analytics || getTicketAnalytics(selectedEvent);
    const lifecycle = selectedEvent.lifecycle || getLifecycleMeta(selectedEvent);
    const score = selectedEvent.operationalScore ?? getOperationalScore(selectedEvent, analytics);
    const scoreTone = selectedEvent.scoreTone || getScoreTone(score);
    const eventFlags = selectedEvent.flags || getEventFlags(selectedEvent, analytics);
    const ticketMax = Math.max(...analytics.ticketMix.map(ticket => parseNumeric(ticket.quantity)), 1);

    const readinessItems = [
      {
        label: 'Publishing governance',
        value: selectedEvent.status === 'VALIDATED' ? 100 : selectedEvent.status === 'PENDING' ? 72 : 48,
        color: '#2563eb',
      },
      {
        label: 'Ticket configuration',
        value: analytics.ticketMix.length > 0 ? Math.max(45, analytics.allocationRatio) : 18,
        color: '#16a34a',
      },
      {
        label: 'Venue readiness',
        value: selectedEvent.location ? 92 : 30,
        color: '#d97706',
      },
      {
        label: 'Schedule integrity',
        value: selectedEvent.start_date ? (selectedEvent.end_date ? 100 : 78) : 24,
        color: '#7c3aed',
      },
    ];

    const nextCommand = selectedEvent.archived === 1
      ? {
          label: 'Restore catalog',
          icon: 'refresh-outline',
          action: () => {
            closeEventDetails();
            updateEventStatus(selectedEvent.event_id, 'unarchive');
          },
        }
      : selectedEvent.status === 'VALIDATED'
        ? {
            label: 'Archive event',
            icon: 'archive-outline',
            action: () => {
              closeEventDetails();
              updateEventStatus(selectedEvent.event_id, 'archive');
            },
          }
        : {
            label: 'Validate event',
            icon: 'checkmark-done-outline',
            action: () => {
              closeEventDetails();
              updateEventStatus(selectedEvent.event_id, 'validate');
            },
          };

    return (
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEventDetails}
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalContainer}>
            <View style={styles.detailModalHeader}>
              <View style={styles.detailModalHeaderText}>
                <Text style={styles.detailModalEyebrow}>Event intelligence</Text>
                <Text style={styles.detailModalTitle}>{selectedEvent.event_name}</Text>
                <Text style={styles.detailModalSubtitle}>
                  {selectedEvent.location || 'Venue pending'} • {formatDateTime(selectedEvent.start_date)}
                </Text>
              </View>
              <TouchableOpacity style={styles.detailModalClose} onPress={closeEventDetails}>
                <Ionicons name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detailModalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.detailHeroRow}>
                <Image
                  source={{
                    uri: selectedEvent.image_url || 'https://placehold.co/800x500/e2e8f0/0f172a?text=Event+Program',
                  }}
                  style={styles.detailHeroImage}
                />
                <View style={styles.detailHeroSummary}>
                  <View style={styles.detailHeroBadgeRow}>
                    {renderStatusBadge(selectedEvent.status, selectedEvent.archived)}
                    <View style={[styles.detailLifecycleBadge, { borderColor: `${lifecycle.tone}30`, backgroundColor: `${lifecycle.tone}12` }]}>
                      <Text style={[styles.detailLifecycleText, { color: lifecycle.tone }]}>{lifecycle.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.detailHeroDescription}>
                    {selectedEvent.event_description || 'No operational description has been captured for this program yet.'}
                  </Text>
                  <View style={styles.flagRow}>
                    {eventFlags.length > 0 ? eventFlags.map(flag => (
                      <View key={`${selectedEvent.event_id}-${flag}`} style={styles.flagChip}>
                        <Text style={styles.flagChipText}>{flag}</Text>
                      </View>
                    )) : (
                      <View style={styles.flagChip}>
                        <Text style={styles.flagChipText}>Configuration looks healthy</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.detailMetricGrid}>
                <View style={styles.detailMetricCard}>
                  <Text style={styles.detailMetricLabel}>Operational score</Text>
                  <Text style={[styles.detailMetricValue, { color: scoreTone }]}>{score}%</Text>
                  <Text style={styles.detailMetricHelper}>Overall launch readiness and governance health</Text>
                </View>
                <View style={styles.detailMetricCard}>
                  <Text style={styles.detailMetricLabel}>Revenue potential</Text>
                  <Text style={styles.detailMetricValue}>{formatCurrency(analytics.ticketValue)}</Text>
                  <Text style={styles.detailMetricHelper}>Projected from configured ticket inventory</Text>
                </View>
                <View style={styles.detailMetricCard}>
                  <Text style={styles.detailMetricLabel}>Capacity mapped</Text>
                  <Text style={styles.detailMetricValue}>{formatCompactNumber(analytics.capacity)}</Text>
                  <Text style={styles.detailMetricHelper}>Maximum attendees defined for this program</Text>
                </View>
                <View style={styles.detailMetricCard}>
                  <Text style={styles.detailMetricLabel}>Average ticket price</Text>
                  <Text style={styles.detailMetricValue}>{formatCurrency(analytics.averagePrice)}</Text>
                  <Text style={styles.detailMetricHelper}>Weighted across the configured ticket mix</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Readiness profile</Text>
                <Text style={styles.detailSectionSubtitle}>
                  Core execution checkpoints across publishing, ticketing, venue readiness, and scheduling.
                </Text>
                {readinessItems.map(item => (
                  <View key={item.label} style={styles.detailReadinessRow}>
                    <View style={styles.detailReadinessLabelRow}>
                      <Text style={styles.detailReadinessLabel}>{item.label}</Text>
                      <Text style={styles.detailReadinessValue}>{item.value}%</Text>
                    </View>
                    <View style={styles.detailReadinessTrack}>
                      <View
                        style={[
                          styles.detailReadinessFill,
                          { width: `${Math.max(item.value, 6)}%`, backgroundColor: item.color },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Ticket mix and commercial model</Text>
                <Text style={styles.detailSectionSubtitle}>
                  Quantity allocation and price ladders by ticket type.
                </Text>
                {analytics.ticketMix.length > 0 ? analytics.ticketMix.map(ticket => {
                  const quantity = parseNumeric(ticket.quantity);
                  const share = ticketMax > 0 ? Math.round((quantity / ticketMax) * 100) : 0;

                  return (
                    <View key={`${selectedEvent.event_id}-${ticket.name}`} style={styles.ticketMixRow}>
                      <View style={styles.ticketMixHeader}>
                        <View>
                          <Text style={styles.ticketMixTitle}>{ticket.name || 'Unnamed ticket'}</Text>
                          <Text style={styles.ticketMixMeta}>
                            {formatCurrency(ticket.price)} • {formatCompactNumber(quantity)} seats
                          </Text>
                        </View>
                        <Text style={styles.ticketMixMeta}>{share}% of largest allocation</Text>
                      </View>
                      <View style={styles.ticketMixTrack}>
                        <View style={[styles.ticketMixFill, { width: `${Math.max(share, 5)}%` }]} />
                      </View>
                    </View>
                  );
                }) : (
                  <Text style={styles.workspaceEmpty}>
                    No ticket mix has been configured for this event yet.
                  </Text>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Execution brief</Text>
                <Text style={styles.detailSectionSubtitle}>
                  The current operating profile for scheduling, venue, and inventory controls.
                </Text>
                <View style={styles.detailInfoGrid}>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Venue</Text>
                    <Text style={styles.detailInfoValue}>{selectedEvent.location || 'Not assigned'}</Text>
                  </View>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Start time</Text>
                    <Text style={styles.detailInfoValue}>{formatDateTime(selectedEvent.start_date)}</Text>
                  </View>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>End time</Text>
                    <Text style={styles.detailInfoValue}>{formatDateTime(selectedEvent.end_date)}</Text>
                  </View>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Ticket programs</Text>
                    <Text style={styles.detailInfoValue}>{formatCompactNumber(analytics.ticketMix.length)}</Text>
                  </View>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Allocation coverage</Text>
                    <Text style={styles.detailInfoValue}>{analytics.allocationRatio}%</Text>
                  </View>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Catalog status</Text>
                    <Text style={styles.detailInfoValue}>{getStatusMeta(selectedEvent.status, selectedEvent.archived).label}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Operator actions</Text>
                <Text style={styles.detailSectionSubtitle}>
                  Run the next execution step directly from this event dashboard.
                </Text>
                <View style={styles.detailActionRow}>
                  <TouchableOpacity
                    style={[styles.detailActionBtn, styles.detailActionBtnPrimary]}
                    onPress={() => {
                      closeEventDetails();
                      openEditModal(selectedEvent);
                    }}
                  >
                    <Ionicons name="create-outline" size={18} color="#ffffff" />
                    <Text style={styles.detailActionTextPrimary}>Edit configuration</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.detailActionBtn, styles.detailActionBtnNeutral]}
                    onPress={nextCommand.action}
                  >
                    <Ionicons name={nextCommand.icon} size={18} color="#0f172a" />
                    <Text style={styles.detailActionTextNeutral}>{nextCommand.label}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.detailActionBtn, styles.detailActionBtnDanger]}
                    onPress={() => {
                      closeEventDetails();
                      handleDeleteEvent(selectedEvent);
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#be123c" />
                    <Text style={styles.detailActionTextDanger}>Delete event</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const DeleteConfirmationModal = () => {
    if (!eventToDelete) return null;

    return (
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteModalHeader}>
              <Ionicons name="trash-outline" size={24} color="#ef4444" style={styles.deleteIcon} />
              <Text style={styles.deleteModalTitle}>Confirm Deletion</Text>
            </View>
            <View style={styles.deleteModalContent}>
              <Text style={styles.deleteModalMessage}>
                Are you sure you want to permanently delete
              </Text>
              <Text style={styles.deleteModalEventName}>"{eventToDelete.event_name}"</Text>
              <Text style={styles.deleteModalWarning}>
                This action cannot be undone.
              </Text>
            </View>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={cancelDelete}
                {...Platform.select({ web: { cursor: 'pointer' } })}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={confirmDelete}
                {...Platform.select({ web: { cursor: 'pointer' } })}
              >
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const SuccessModal = () => (
    <Modal visible={successModalVisible} transparent animationType="fade">
      <View style={styles.successModalOverlay}>
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
          <Text style={styles.successText}>Success!</Text>
          <Text style={styles.successSubText}>{modalMessage}</Text>
          {successEventName && (
            <Text style={[styles.successSubText, { marginTop: 8, fontWeight: '600' }]}>
              "{successEventName}"
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );

  // --- Main Render ---
  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 16, color: '#64748b' }}>Loading events...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <ScreenContainer style={styles.container}>
        <View style={[styles.center, {padding: 40}]}>
          <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
          <Text style={styles.title}>Access Denied</Text>
          <Text style={[styles.subtitle, {marginTop: 10, textAlign: 'center'}]}>
            You must be logged in as an Admin or Event Manager to manage events.
          </Text>
          <TouchableOpacity style={[styles.createBtn, {marginTop: 20}]} onPress={() => navigation.navigate('Login')}>
            <Ionicons name="log-in-outline" size={20} color="#fff" />
            <Text style={styles.createBtnText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const highestRevenueValue = Math.max(
    ...portfolioMetrics.topRevenueEvents.map(event => event.analytics.ticketValue),
    1
  );

  const summaryCards = [
    {
      key: 'portfolio',
      label: 'Portfolio records',
      value: formatCompactNumber(portfolioMetrics.totalEvents),
      helper: `${formatCompactNumber(portfolioMetrics.validated)} launch-ready programs`,
      accent: '#38bdf8',
      onPress: () => {
        setSearchQuery('');
        setStatusFilter('all');
      },
    },
    {
      key: 'governance',
      label: 'Pending governance',
      value: formatCompactNumber(portfolioMetrics.pending + portfolioMetrics.draft),
      helper: 'Programs awaiting validation or setup completion',
      accent: '#f59e0b',
      onPress: () => setStatusFilter(portfolioMetrics.pending > 0 ? 'pending' : 'draft'),
    },
    {
      key: 'revenue',
      label: 'Revenue potential',
      value: formatCurrency(portfolioMetrics.potentialRevenue),
      helper: `${formatCompactNumber(portfolioMetrics.ticketPrograms)} ticket programs configured`,
      accent: '#22c55e',
      onPress: () => {
        if (portfolioMetrics.topRevenueEvents[0]) {
          openEventDetails(portfolioMetrics.topRevenueEvents[0]);
        }
      },
    },
    {
      key: 'launches',
      label: 'Upcoming launches',
      value: formatCompactNumber(portfolioMetrics.upcoming),
      helper: `${formatCompactNumber(portfolioMetrics.attentionRequired)} programs need operator attention`,
      accent: '#8b5cf6',
      onPress: () => setStatusFilter('upcoming'),
    },
  ];

  return (
    <ScreenContainer style={styles.container}>
      <ScrollView
        style={styles.eventsScroll}
        contentContainerStyle={styles.eventsScrollContent}
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadEvents(false)} />}
      >
        <View style={styles.header}>
          <View style={styles.dashboardHeaderTopRow}>
            <View style={styles.dashboardHeaderTextWrap}>
              <Text style={styles.dashboardEyebrow}>Portfolio command</Text>
              <Text style={styles.heroTitle}>Event Portfolio Operations</Text>
              <View style={styles.headerSubtitleRow}>
                <View style={styles.liveIndicator} />
                <Text style={styles.heroSubtitle}>
                  Manage scheduling, ticketing, governance, and launch readiness for every event across the business.
                </Text>
              </View>
              <Text style={styles.headerCaption}>
                This workspace keeps the existing create, edit, validate, archive, restore, and delete flows while adding portfolio intelligence and richer event diagnostics.
              </Text>
            </View>
            <TouchableOpacity style={styles.createBtn} onPress={openCreateModal}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createBtnText}>Create Event</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerStatusPills}>
            <View style={styles.headerStatusPill}>
              <Text style={styles.headerStatusLabel}>Readiness average</Text>
              <Text style={[styles.headerStatusValue, portfolioMetrics.readinessAverage >= 75 ? styles.headerStatusGood : styles.headerStatusWarn]}>
                {portfolioMetrics.readinessAverage}%
              </Text>
            </View>
            <View style={styles.headerStatusPill}>
              <Text style={styles.headerStatusLabel}>Capacity mapped</Text>
              <Text style={styles.headerStatusValue}>{formatCompactNumber(portfolioMetrics.capacity)}</Text>
            </View>
            <View style={styles.headerStatusPill}>
              <Text style={styles.headerStatusLabel}>Allocation average</Text>
              <Text style={[styles.headerStatusValue, portfolioMetrics.allocationAverage >= 80 ? styles.headerStatusGood : styles.headerStatusNeutral]}>
                {portfolioMetrics.allocationAverage}%
              </Text>
            </View>
            <View style={styles.headerStatusPill}>
              <Text style={styles.headerStatusLabel}>Attention required</Text>
              <Text style={[styles.headerStatusValue, portfolioMetrics.attentionRequired > 0 ? styles.headerStatusWarn : styles.headerStatusGood]}>
                {formatCompactNumber(portfolioMetrics.attentionRequired)}
              </Text>
            </View>
          </View>

          <View style={styles.headerKpiGrid}>
            {summaryCards.map(card => (
              <TouchableOpacity
                key={card.key}
                style={styles.headerKpiCard}
                onPress={card.onPress}
                {...Platform.select({ web: { cursor: 'pointer' } })}
              >
                <View style={[styles.headerKpiAccent, { backgroundColor: card.accent }]} />
                <Text style={styles.headerKpiLabel}>{card.label}</Text>
                <Text style={styles.headerKpiValue}>{card.value}</Text>
                <Text style={styles.headerKpiHelper}>{card.helper}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.commandGrid}>
            <View style={styles.commandPanel}>
              <Text style={styles.commandPanelEyebrow}>Portfolio health</Text>
              <Text style={styles.commandPanelTitle}>Execution readiness model</Text>
              <Text style={styles.commandPanelSubtitle}>
                Distribution across validated, pending, draft, and archived records.
              </Text>

              {[
                { label: 'Validated', value: portfolioMetrics.validated, color: '#22c55e' },
                { label: 'Pending', value: portfolioMetrics.pending, color: '#f59e0b' },
                { label: 'Draft', value: portfolioMetrics.draft, color: '#94a3b8' },
                { label: 'Archived', value: portfolioMetrics.archived, color: '#ef4444' },
              ].map(item => (
                <View key={item.label} style={styles.distributionRow}>
                  <View style={styles.distributionLabelRow}>
                    <Text style={styles.distributionLabel}>{item.label}</Text>
                    <Text style={styles.distributionValue}>{formatCompactNumber(item.value)}</Text>
                  </View>
                  <View style={styles.distributionTrack}>
                    <View
                      style={[
                        styles.distributionFill,
                        {
                          width: `${Math.max(
                            portfolioMetrics.totalEvents > 0
                              ? Math.round((item.value / portfolioMetrics.totalEvents) * 100)
                              : 0,
                            item.value > 0 ? 6 : 0
                          )}%`,
                          backgroundColor: item.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.commandPanel}>
              <Text style={styles.commandPanelEyebrow}>Priority queue</Text>
              <Text style={styles.commandPanelTitle}>Programs needing operator review</Text>
              <Text style={styles.commandPanelSubtitle}>
                Lowest readiness programs and the next events coming online.
              </Text>

              {portfolioMetrics.priorityQueue.length > 0 ? portfolioMetrics.priorityQueue.map(event => {
                const score = event.operationalScore;
                const scoreTone = event.scoreTone;
                return (
                  <TouchableOpacity
                    key={`priority-${event.event_id}`}
                    style={styles.queueItem}
                    onPress={() => openEventDetails(event)}
                    {...Platform.select({ web: { cursor: 'pointer' } })}
                  >
                    <View style={styles.queueItemInfo}>
                      <Text style={styles.queueItemTitle} numberOfLines={1}>{event.event_name}</Text>
                      <Text style={styles.queueItemMeta}>
                        {event.location || 'Venue pending'} | {formatDateTime(event.start_date)}
                      </Text>
                    </View>
                    <View style={[styles.queueItemScore, { backgroundColor: `${scoreTone}16` }]}>
                      <Text style={[styles.queueItemScoreText, { color: scoreTone }]}>{score}%</Text>
                    </View>
                  </TouchableOpacity>
                );
              }) : (
                <Text style={styles.workspaceEmpty}>No programs require immediate intervention.</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.stickyControlsShell}>
          <View style={[styles.controls, styles.stickyControls]}>
              <View style={styles.controlsHeader}>
                <View style={styles.controlsHeaderText}>
                  <Text style={styles.controlsEyebrow}>Registry controls</Text>
                  <Text style={styles.controlsTitle}>Filter the event registry by readiness and status</Text>
                  <Text style={styles.controlsSubtitle}>
                    Search the inventory, pivot between operating states, and open any event for a richer execution view.
                  </Text>
                </View>
              <View style={styles.resultsBadge}>
                <Text style={styles.resultsBadgeText}>
                  {shownEventsCount} of {filteredEvents.length} shown
                </Text>
              </View>
            </View>
            <View style={styles.searchToolbar}>
              <View style={styles.searchWrapper}>
                <Ionicons name="search" size={20} color="#64748b" />
                <TextInput 
                  style={styles.searchInput} 
                  placeholder="Search by event, venue, or ticket type..." 
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  {...Platform.select({ 
                    web: { 
                      outlineStyle: 'none',
                      outlineWidth: 0
                    } 
                  })}
                />
              </View>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                {...Platform.select({ web: { cursor: 'pointer' } })}
              >
                <Ionicons name="refresh-outline" size={16} color="#334155" />
                <Text style={styles.secondaryBtnText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filters}>
              {filterOptions.map(filter => {
                const active = filter.key === statusFilter;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setStatusFilter(filter.key)}
                    {...Platform.select({ web: { cursor: 'pointer' } })}
                  >
                    <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter.label}</Text>
                    <View style={[styles.filterCount, active && styles.filterCountActive]}>
                      <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>
                        {formatCompactNumber(filter.count)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.workspaceGrid}>
          <View style={styles.workspaceCard}>
            <Text style={styles.workspaceEyebrow}>Commercial runway</Text>
            <Text style={styles.workspaceTitle}>Highest value programs</Text>
            <Text style={styles.workspaceSubtitle}>
              Revenue potential based on current ticket inventory and pricing ladders.
            </Text>

            {portfolioMetrics.topRevenueEvents.length > 0 ? portfolioMetrics.topRevenueEvents.map(event => {
              const analytics = event.analytics;
              const share = highestRevenueValue > 0
                ? Math.round((analytics.ticketValue / highestRevenueValue) * 100)
                : 0;

              return (
                <TouchableOpacity
                  key={`revenue-${event.event_id}`}
                  style={styles.workspaceListItem}
                  onPress={() => openEventDetails(event)}
                  {...Platform.select({ web: { cursor: 'pointer' } })}
                >
                  <View>
                    <Text style={styles.workspaceListTitle} numberOfLines={1}>{event.event_name}</Text>
                    <Text style={styles.workspaceListMeta}>
                      {formatCurrency(analytics.ticketValue)} | {formatCompactNumber(analytics.ticketMix.length)} ticket programs
                    </Text>
                  </View>
                  <View style={styles.workspaceBarTrack}>
                    <View style={[styles.workspaceBarFill, { width: `${Math.max(share, 8)}%` }]} />
                  </View>
                </TouchableOpacity>
              );
            }) : (
              <Text style={styles.workspaceEmpty}>Create ticket inventory to unlock revenue insight.</Text>
            )}
          </View>

          <View style={styles.workspaceCard}>
            <Text style={styles.workspaceEyebrow}>Launch calendar</Text>
            <Text style={styles.workspaceTitle}>Upcoming execution windows</Text>
            <Text style={styles.workspaceSubtitle}>
              The next launches scheduled across the active portfolio.
            </Text>

            {portfolioMetrics.upcomingEvents.length > 0 ? portfolioMetrics.upcomingEvents.slice(0, 4).map(event => (
              <TouchableOpacity
                key={`upcoming-${event.event_id}`}
                style={styles.workspaceListItem}
                onPress={() => openEventDetails(event)}
                {...Platform.select({ web: { cursor: 'pointer' } })}
              >
                <View>
                  <Text style={styles.workspaceListTitle} numberOfLines={1}>{event.event_name}</Text>
                  <Text style={styles.workspaceListMeta}>
                    {formatDateTime(event.start_date)} | {event.location || 'Venue pending'}
                  </Text>
                </View>
              </TouchableOpacity>
            )) : (
              <Text style={styles.workspaceEmpty}>No upcoming launches are currently scheduled.</Text>
            )}
          </View>

          <View style={styles.workspaceCard}>
            <Text style={styles.workspaceEyebrow}>Command actions</Text>
            <Text style={styles.workspaceTitle}>Operator shortcuts</Text>
            <Text style={styles.workspaceSubtitle}>
              Jump directly into the highest-value actions for the portfolio.
            </Text>

            <View style={styles.workspaceActionGroup}>
              <TouchableOpacity
                style={[styles.workspaceActionBtn, styles.workspaceActionBtnPrimary]}
                onPress={openCreateModal}
                {...Platform.select({ web: { cursor: 'pointer' } })}
              >
                <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
                <Text style={styles.workspaceActionTextPrimary}>Create new event</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.workspaceActionBtn, styles.workspaceActionBtnMuted]}
                onPress={() => setStatusFilter('pending')}
                {...Platform.select({ web: { cursor: 'pointer' } })}
              >
                <Ionicons name="time-outline" size={18} color="#0f172a" />
                <Text style={styles.workspaceActionTextMuted}>Review pending queue</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.workspaceActionBtn, styles.workspaceActionBtnMuted]}
                onPress={() => setStatusFilter('archived')}
                {...Platform.select({ web: { cursor: 'pointer' } })}
              >
                <Ionicons name="archive-outline" size={18} color="#0f172a" />
                <Text style={styles.workspaceActionTextMuted}>Open archived catalog</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionEyebrow}>Portfolio workspace</Text>
            <Text style={styles.sectionTitle}>Managed event registry</Text>
            <Text style={styles.sectionSubtitle}>
              Select any program to open a richer event dashboard or run direct management actions.
            </Text>
          </View>
        </View>

        {filteredEvents.length > 0 ? (
          visibleEvents.map(item => (
            <EventCard key={item.event_id.toString()} item={item} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#e2e8f0" />
            <Text style={styles.emptyText}>No events found</Text>
            <Text style={[styles.emptyText, { fontSize: 14, marginTop: 8 }]}>
              {searchQuery ? 'Try a different search term' : 'Create your first event'}
            </Text>
          </View>
        )}

        {hasMoreVisibleEvents && (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={() => setVisibleEventsCount(current => Math.min(filteredEvents.length, current + EVENT_RENDER_BATCH_SIZE))}
            {...Platform.select({ web: { cursor: 'pointer' } })}
          >
            <Ionicons name="chevron-down-outline" size={18} color="#0f172a" />
            <Text style={styles.loadMoreButtonText}>
              Load {Math.min(EVENT_RENDER_BATCH_SIZE, filteredEvents.length - visibleEvents.length)} more events
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <EventIntelligenceModal />

      {/* CREATE / EDIT MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? 'Edit Event' : 'Create New Event'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} disabled={submitting}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Event Name *</Text>
              <TextInput 
                style={styles.input} 
                value={formData.event_name} 
                onChangeText={t => setFormData({...formData, event_name: t})}
                placeholder="e.g. Summer Music Festival"
                editable={!submitting}
                {...Platform.select({ 
                  web: { 
                    outlineStyle: 'none',
                    outlineWidth: 0
                  } 
                })}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput 
                style={[styles.input, { height: 80 }]} 
                multiline 
                value={formData.event_description} 
                onChangeText={t => setFormData({...formData, event_description: t})}
                placeholder="Event details..."
                editable={!submitting}
                {...Platform.select({ 
                  web: { 
                    outlineStyle: 'none',
                    outlineWidth: 0
                  } 
                })}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Start Date *</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formData.start_date} 
                    onChangeText={t => setFormData({...formData, start_date: t})}
                    placeholder="YYYY-MM-DD HH:MM"
                    editable={!submitting}
                    {...Platform.select({ 
                      web: { 
                        outlineStyle: 'none',
                        outlineWidth: 0
                      } 
                    })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>End Date (Optional)</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formData.end_date} 
                    onChangeText={t => setFormData({...formData, end_date: t})}
                    placeholder="YYYY-MM-DD HH:MM"
                    editable={!submitting}
                    {...Platform.select({ 
                      web: { 
                        outlineStyle: 'none',
                        outlineWidth: 0
                      } 
                    })}
                  />
                </View>
              </View>

              <Text style={styles.label}>Location *</Text>
              <TextInput 
                style={styles.input} 
                value={formData.location} 
                onChangeText={t => setFormData({...formData, location: t})}
                placeholder="e.g. Cape Town Stadium"
                editable={!submitting}
                {...Platform.select({ 
                  web: { 
                    outlineStyle: 'none',
                    outlineWidth: 0
                  } 
                })}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Max Attendees *</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formData.max_attendees} 
                    onChangeText={t => setFormData({...formData, max_attendees: t.replace(/[^0-9]/g, '')})}
                    keyboardType="numeric"
                    editable={!submitting}
                    {...Platform.select({ 
                      web: { 
                        outlineStyle: 'none',
                        outlineWidth: 0
                      } 
                    })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Base Price (R)</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formData.price} 
                    onChangeText={t => setFormData({...formData, price: t.replace(/[^0-9.]/g, '')})}
                    keyboardType="decimal-pad"
                    editable={!submitting}
                    {...Platform.select({ 
                      web: { 
                        outlineStyle: 'none',
                        outlineWidth: 0
                      } 
                    })}
                  />
                </View>
              </View>

              <Text style={styles.label}>Image URL (Optional)</Text>
              <TextInput 
                style={styles.input} 
                value={formData.image_url} 
                onChangeText={t => setFormData({...formData, image_url: t})}
                placeholder="https://example.com/image.jpg"
                editable={!submitting}
                {...Platform.select({ 
                  web: { 
                    outlineStyle: 'none',
                    outlineWidth: 0
                  } 
                })}
              />

              <Text style={styles.sectionHeader}>Ticket Types *</Text>
              <Text style={[styles.label, { fontSize: 12, color: '#64748b', marginTop: -8 }]}>
                Add at least one ticket type for your event
              </Text>
              
              {ticketTypes.map((ticket, index) => (
                <View key={index} style={styles.ticketRow}>
                  <TextInput 
                    style={[styles.input, { flex: 2, marginRight: 5 }]} 
                    placeholder="Name (e.g. VIP)"
                    value={ticket.name}
                    onChangeText={(t) => handleTicketChange(t, index, 'name')}
                    editable={!submitting}
                    {...Platform.select({ 
                      web: { 
                        outlineStyle: 'none',
                        outlineWidth: 0
                      } 
                    })}
                  />
                  <TextInput 
                    style={[styles.input, { flex: 1, marginRight: 5 }]} 
                    placeholder="Price"
                    value={ticket.price}
                    onChangeText={(t) => handleTicketChange(t.replace(/[^0-9.]/g, ''), index, 'price')}
                    keyboardType="decimal-pad"
                    editable={!submitting}
                    {...Platform.select({ 
                      web: { 
                        outlineStyle: 'none',
                        outlineWidth: 0
                      } 
                    })}
                  />
                  <TextInput 
                    style={[styles.input, { flex: 1, marginRight: 5 }]} 
                    placeholder="Qty"
                    value={ticket.quantity}
                    onChangeText={(t) => handleTicketChange(t.replace(/[^0-9]/g, ''), index, 'quantity')}
                    keyboardType="numeric"
                    editable={!submitting}
                    {...Platform.select({ 
                      web: { 
                        outlineStyle: 'none',
                        outlineWidth: 0
                      } 
                    })}
                  />
                  <TouchableOpacity 
                    onPress={() => removeTicketType(index)} 
                    style={{ padding: 4 }}
                    disabled={submitting || ticketTypes.length <= 1}
                  >
                    <Ionicons name="trash-outline" size={20} color={ticketTypes.length <= 1 ? '#cbd5e1' : '#ef4444'} />
                  </TouchableOpacity>
                </View>
              ))}
              
              <TouchableOpacity 
                style={styles.addTicketBtn} 
                onPress={addTicketType}
                disabled={submitting}
              >
                <Ionicons name="add" size={16} color="#2563eb" />
                <Text style={styles.addTicketText}>Add Ticket Type</Text>
              </TouchableOpacity>

            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveBtn, submitting && { backgroundColor: '#94a3b8' }]} 
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>{isEditing ? 'Update Event' : 'Create Event'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmationModal />

      {/* SUCCESS MODAL */}
      <SuccessModal />

    </ScreenContainer>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef3fb',
    padding: width < 768 ? 16 : 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eef3fb',
  },
  header: {
    marginBottom: 18,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    padding: 24,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    ...Platform.select({
      web: {
        boxShadow: '0 16px 32px -20px rgba(15, 23, 42, 0.18)',
      },
      default: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
      },
    }),
  },
  dashboardHeaderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  dashboardHeaderTextWrap: {
    flex: 1,
    minWidth: 260,
  },
  dashboardEyebrow: {
    color: '#2563eb',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#22c55e',
    marginTop: 2,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  heroSubtitle: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    lineHeight: 17,
  },
  headerCaption: {
    marginTop: 10,
    maxWidth: 720,
    fontSize: 12,
    lineHeight: 18,
    color: '#64748b',
    fontWeight: '500',
  },
  headerStatusPills: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  headerStatusPill: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 132,
  },
  headerStatusLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  headerStatusValue: {
    marginTop: 3,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '800',
  },
  headerStatusGood: {
    color: '#22c55e',
  },
  headerStatusWarn: {
    color: '#f59e0b',
  },
  headerStatusNeutral: {
    color: '#334155',
  },
  headerKpiGrid: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerKpiCard: {
    flexGrow: 1,
    minWidth: width < 768 ? 220 : 180,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    backgroundColor: '#ffffff',
    padding: 16,
  },
  headerKpiAccent: {
    width: 42,
    height: 4,
    borderRadius: 999,
    marginBottom: 12,
  },
  headerKpiLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerKpiValue: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  headerKpiHelper: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: '#475569',
  },
  commandGrid: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  commandPanel: {
    flex: 1,
    minWidth: width < 960 ? 280 : 340,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  commandPanelEyebrow: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  commandPanelTitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  commandPanelSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#64748b',
  },
  distributionRow: {
    marginTop: 14,
  },
  distributionLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  distributionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  distributionValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  distributionTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#dbe4f3',
    overflow: 'hidden',
  },
  distributionFill: {
    height: '100%',
    borderRadius: 999,
  },
  queueItem: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  queueItemInfo: {
    flex: 1,
  },
  queueItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  queueItemMeta: {
    fontSize: 12,
    lineHeight: 17,
    color: '#64748b',
  },
  queueItemScore: {
    minWidth: 60,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  queueItemScoreText: {
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  createBtn: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#1d4ed8',
    borderWidth: 1,
    borderColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  createBtnText: {
    color: '#dbeafe',
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 14,
  },
  controls: {
    marginBottom: 20,
    marginTop: 2,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4f3',
    padding: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 14px 28px -16px rgba(15, 23, 42, 0.16)',
      },
      default: {
        shadowColor: '#020617',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 2,
      },
    }),
  },
  stickyControlsShell: {
    zIndex: 20,
    backgroundColor: '#eef3fb',
    paddingTop: 8,
    paddingBottom: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 14px 18px -18px rgba(15, 23, 42, 0.45)',
      },
    }),
  },
  stickyControls: {
    zIndex: 10,
    marginTop: 0,
    marginBottom: 0,
    overflow: 'hidden',
  },
  controlsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  controlsHeaderText: {
    flex: 1,
    minWidth: 240,
  },
  controlsEyebrow: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  controlsTitle: {
    fontSize: 18,
    color: '#0f172a',
    fontWeight: '800',
    marginBottom: 4,
  },
  controlsSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: '#64748b',
    maxWidth: 680,
  },
  resultsBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resultsBadgeText: {
    fontSize: 11,
    color: '#1d4ed8',
    fontWeight: '800',
  },
  searchToolbar: {
    flexDirection: width < 768 ? 'column' : 'row',
    alignItems: width < 768 ? 'stretch' : 'center',
    gap: 10,
    marginTop: 12,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe4f3',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flex: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    borderWidth: 0,
    color: '#0f172a',
  },
  secondaryBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  eventsScroll: {
    flex: 1,
  },
  eventsScrollContent: {
    paddingBottom: 100,
  },
  filters: {
    flexDirection: 'row',
    marginTop: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChipActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  filterCount: {
    minWidth: 28,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
  },
  filterCountActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  filterCountTextActive: {
    color: '#ffffff',
  },
  workspaceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  workspaceCard: {
    flex: 1,
    minWidth: width < 960 ? 280 : 300,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    backgroundColor: '#ffffff',
    padding: 18,
    ...Platform.select({
      web: {
        boxShadow: '0 14px 28px -18px rgba(15, 23, 42, 0.18)',
      },
      default: {
        shadowColor: '#020617',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 2,
      },
    }),
  },
  workspaceEyebrow: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  workspaceTitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  workspaceSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#64748b',
  },
  workspaceListItem: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 12,
  },
  workspaceListTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  workspaceListMeta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#64748b',
  },
  workspaceBarTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#dbe4f3',
    overflow: 'hidden',
  },
  workspaceBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  workspaceEmpty: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748b',
  },
  workspaceActionGroup: {
    marginTop: 14,
    gap: 10,
  },
  workspaceActionBtn: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workspaceActionBtnPrimary: {
    backgroundColor: '#1d4ed8',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  workspaceActionBtnMuted: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe4f3',
  },
  workspaceActionTextPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  workspaceActionTextMuted: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionHeaderRow: {
    marginBottom: 14,
  },
  sectionHeaderText: {
    maxWidth: 720,
  },
  sectionEyebrow: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: '#64748b',
  },
  loadMoreButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    backgroundColor: '#ffffff',
    marginTop: 4,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 22px -18px rgba(15, 23, 42, 0.22)',
      },
      default: {
        shadowColor: '#020617',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.07,
        shadowRadius: 14,
        elevation: 2,
      },
    }),
  },
  loadMoreButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 14px 24px -16px rgba(15, 23, 42, 0.24)',
      },
      default: {
        shadowColor: '#020617',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 16,
    gap: 14,
    alignItems: 'flex-start',
  },
  cardImage: {
    width: 108,
    height: 108,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
  },
  cardContent: {
    flex: 1,
    gap: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
    lineHeight: 21,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardDetail: {
    fontSize: 12,
    color: '#475569',
    marginTop: 1,
    lineHeight: 17,
  },
  lifecyclePill: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lifecycleLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  lifecycleDetail: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#64748b',
  },
  cardInsightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  cardInsightTile: {
    flexGrow: 1,
    minWidth: width < 768 ? 140 : 180,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 12,
  },
  cardInsightLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardInsightValue: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardProgressBlock: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  cardProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardProgressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  cardProgressValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardProgressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  cardProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  flagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  flagChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  flagChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fbfdff',
    padding: 12,
  },
  btnAction: {
    flexGrow: 1,
    flexBasis: 'auto',
    minHeight: 38,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe4f3',
    paddingHorizontal: 12,
  },
  btnActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 5,
  },
  btnPrimary: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  btnPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 5,
  },
  btnSuccess: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  btnSuccessText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 13,
  },
  btnWarning: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  btnWarningText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 13,
  },
  btnDanger: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  btnDangerText: {
    color: '#be123c',
    fontWeight: '700',
    fontSize: 13,
  },
  btnRestore: {
    backgroundColor: '#e0f2fe',
    borderColor: '#bae6fd',
  },
  btnRestoreText: {
    color: '#0f4c81',
    fontWeight: '700',
    fontSize: 13,
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailModalContainer: {
    width: '100%',
    maxWidth: 980,
    maxHeight: '92%',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 24px 48px -20px rgba(2, 6, 23, 0.42)',
      },
      default: {
        shadowColor: '#020617',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 24,
        elevation: 8,
      },
    }),
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fbff',
    gap: 16,
  },
  detailModalHeaderText: {
    flex: 1,
  },
  detailModalEyebrow: {
    fontSize: 10,
    color: '#2563eb',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  detailModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  detailModalSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748b',
  },
  detailModalClose: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalBody: {
    padding: 22,
  },
  detailHeroRow: {
    flexDirection: width < 860 ? 'column' : 'row',
    gap: 18,
    marginBottom: 20,
  },
  detailHeroImage: {
    width: width < 860 ? '100%' : 280,
    height: 180,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
  },
  detailHeroSummary: {
    flex: 1,
    gap: 12,
  },
  detailHeroBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  detailLifecycleBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  detailLifecycleText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailHeroDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
  },
  detailMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  detailMetricCard: {
    flexGrow: 1,
    minWidth: width < 768 ? 180 : 200,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  detailMetricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailMetricValue: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  detailMetricHelper: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: '#64748b',
  },
  detailSection: {
    marginBottom: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 18,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  detailSectionSubtitle: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: '#64748b',
  },
  detailReadinessRow: {
    marginTop: 14,
  },
  detailReadinessLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  detailReadinessLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  detailReadinessValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  detailReadinessTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  detailReadinessFill: {
    height: '100%',
    borderRadius: 999,
  },
  ticketMixRow: {
    marginTop: 14,
  },
  ticketMixHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  ticketMixTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  ticketMixMeta: {
    fontSize: 12,
    lineHeight: 17,
    color: '#64748b',
  },
  ticketMixTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#dbe4f3',
    overflow: 'hidden',
  },
  ticketMixFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2563eb',
  },
  detailInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
  },
  detailInfoItem: {
    flexGrow: 1,
    minWidth: width < 768 ? 180 : 220,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 14,
  },
  detailInfoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailInfoValue: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 20,
  },
  detailActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  detailActionBtn: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  detailActionBtnPrimary: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  detailActionBtnNeutral: {
    backgroundColor: '#f8fafc',
    borderColor: '#dbe4f3',
  },
  detailActionBtnDanger: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  detailActionTextPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  detailActionTextNeutral: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  detailActionTextDanger: {
    fontSize: 13,
    fontWeight: '700',
    color: '#be123c',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 25px -14px rgba(2, 6, 23, 0.35)',
      },
      default: {
        shadowColor: '#020617',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 18,
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fbff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalBody: {
    padding: 24,
    maxHeight: height * 0.7,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dbe4f3',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 24,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  addTicketBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cfe0ff',
    backgroundColor: '#eff6ff',
  },
  addTicketText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 5,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: '#ffffff',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    backgroundColor: '#ffffff',
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#94a3b8',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBox: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dcfce7',
    ...Platform.select({
      web: {
        boxShadow: '0 10px 16px -6px rgba(16, 185, 129, 0.25)',
      },
      default: {
        shadowColor: '#16a34a',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 5,
      },
    }),
  },
  successText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#16a34a',
    marginTop: 16,
  },
  successSubText: {
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 250,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  deleteModalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dbe4f3',
    ...Platform.select({
      web: {
        boxShadow: '0 10px 28px -10px rgba(2, 6, 23, 0.4)',
      },
      default: {
        shadowColor: '#020617',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 10,
      },
    }),
  },
  deleteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fef2f2',
  },
  deleteIcon: {
    marginRight: 10,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ef4444',
  },
  deleteModalContent: {
    padding: 20,
    alignItems: 'center',
  },
  deleteModalMessage: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteModalEventName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalWarning: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  deleteModalActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  deleteCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
  },
  deleteConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default EventManagementScreen;


