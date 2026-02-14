// src/screens/EventManagementScreen.web.js - COMPLETE FIXED VERSION
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
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

const EventManagementScreen = ({ navigation }) => {
  // --- Data State ---
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true); 
  
  // --- Filter State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

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

  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  };

  const loadEvents = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const isRefreshing = !showLoading;
    if (isRefreshing) setRefreshing(true);

    try {
      const headers = await getAuthHeader();

      const res = await fetch(`${API_BASE_URL}/api/events`, { headers });
      const data = await res.json();

      if (res.ok && data.success) {
        const preparedEvents = data.events.map(event => ({
          ...event,
          ticket_types: Array.isArray(event.ticket_types) ? event.ticket_types : [],
        }));
        setEvents(preparedEvents);
        console.log(`✅ Loaded ${preparedEvents.length} validated events from /api/events`);
      } else if (res.status === 403) {
        Alert.alert('Access Denied', 'Your account does not have permission to manage events.');
        setEvents([]);
        setIsAuthenticated(false);
      } else {
        console.error('API Error:', data.error);
        Alert.alert('Error', data.error || 'Failed to load events');
        setEvents([]);
      }
    } catch (error) {
      console.error('Fetch events error:', error);
      Alert.alert('Network Error', 'Could not connect to server');
      setEvents([]);
    } finally {
      if (showLoading) setLoading(false);
      if (isRefreshing) setRefreshing(false);
    }
  };

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

      console.log('📤 Sending event data to API:', {
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

      console.log('📥 API Response:', {
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
  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  // --- Filtering & Searching Logic ---
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const statusMatch = filter === 'all' ||
        (filter === 'pending' && event.status === 'PENDING' && event.archived !== 1) ||
        (filter === 'validated' && event.status === 'VALIDATED' && event.archived !== 1) ||
        (filter === 'archived' && event.archived === 1);

      const searchMatch = event.event_name.toLowerCase().includes(searchQuery.toLowerCase());

      return statusMatch && searchMatch;
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [events, searchQuery, filter]);

  // --- Components ---
  const renderStatusBadge = (status, isArchived) => {
    let text = isArchived === 1 ? 'ARCHIVED' : (status || 'DRAFT');
    let color = '#475569';
    let bgColor = '#e2e8f0';

    if (isArchived === 1) {
      color = '#dc2626';
      bgColor = '#fee2e2';
    } else if (status === 'VALIDATED') {
      color = '#16a34a';
      bgColor = '#dcfce7';
    } else if (status === 'PENDING') {
      color = '#d97706';
      bgColor = '#fef3c7';
    } else if (status === 'DRAFT') {
      color = '#6b7280';
      bgColor = '#f3f4f6';
    }

    return (
      <View style={[styles.badge, { backgroundColor: bgColor }]}>
        <Text style={[styles.badgeText, { color }]}>{text}</Text>
      </View>
    );
  };

  const EventCard = ({ item }) => {
    const isArchived = item.archived === 1;

    const formatDate = (dateString) => {
      if (!dateString) return 'No date set';
      try {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return 'Invalid date';
      }
    };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image 
            source={{ 
              uri: item.image_url || 'https://placehold.co/600x400/e2e8f0/0f172a?text=No+Image',
            }} 
            style={styles.cardImage}
            onError={() => console.log('Failed to load image for:', item.event_name)}
          />
          <View style={styles.cardContent}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.event_name}</Text>
              {renderStatusBadge(item.status, item.archived)}
            </View>
            <Text style={styles.cardDetail} numberOfLines={1}>
              <Ionicons name="location-outline" size={12} /> {item.location || 'No location'}
            </Text>
            <Text style={styles.cardDetail}>
              <Ionicons name="calendar-outline" size={12} /> {formatDate(item.start_date)}
            </Text>
            <Text style={styles.cardDetail}>
              <Ionicons name="people-outline" size={12} /> {item.max_attendees || 0} Max Attendees
            </Text>
            {item.ticket_types && item.ticket_types.length > 0 && (
              <Text style={[styles.cardDetail, { fontSize: 11, color: '#94a3b8' }]}>
                <Ionicons name="ticket-outline" size={10} /> {item.ticket_types.length} ticket type(s)
              </Text>
            )}
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.btnAction} 
            onPress={() => openEditModal(item)}
            {...Platform.select({ web: { cursor: 'pointer' } })}
          >
            <Ionicons name="create-outline" size={18} color="#2563eb" />
            <Text style={styles.btnActionText}>Edit</Text>
          </TouchableOpacity>

          {!isArchived ? (
            item.status === 'PENDING' || item.status === 'DRAFT' ? (
              <>
                <TouchableOpacity 
                  style={[styles.btnAction, styles.btnSuccess]} 
                  onPress={() => updateEventStatus(item.event_id, 'validate')}
                  {...Platform.select({ web: { cursor: 'pointer' } })}
                >
                  <Text style={styles.btnSuccessText}>Validate</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.btnAction, styles.btnDanger]} 
                  onPress={() => handleDeleteEvent(item)}
                  {...Platform.select({ web: { cursor: 'pointer' } })}
                >
                  <Text style={styles.btnDangerText}>Delete</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity 
                  style={[styles.btnAction, styles.btnWarning]} 
                  onPress={() => updateEventStatus(item.event_id, 'archive')}
                  {...Platform.select({ web: { cursor: 'pointer' } })}
                >
                  <Text style={styles.btnWarningText}>Archive</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.btnAction, styles.btnDanger]} 
                  onPress={() => handleDeleteEvent(item)}
                  {...Platform.select({ web: { cursor: 'pointer' } })}
                >
                  <Text style={styles.btnDangerText}>Delete</Text>
                </TouchableOpacity>
              </>
            )
          ) : (
            <>
              <TouchableOpacity 
                style={[styles.btnAction, { backgroundColor: '#d1fae5', borderColor: '#d1fae5' }]} 
                onPress={() => updateEventStatus(item.event_id, 'unarchive')}
                {...Platform.select({ web: { cursor: 'pointer' } })}
              >
                <Text style={{ color: '#065f46', fontWeight: '600', fontSize: 13 }}>Restore</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnAction, styles.btnDanger]} 
                onPress={() => handleDeleteEvent(item)}
                {...Platform.select({ web: { cursor: 'pointer' } })}
              >
                <Text style={styles.btnDangerText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderFilterButton = (key, label) => (
    <TouchableOpacity
      key={key}
      style={[
        styles.filterChip,
        filter === key && styles.filterChipActive
      ]}
      onPress={() => setFilter(key)}
      {...Platform.select({ web: { cursor: 'pointer' } })}
    >
      <Text style={[
        styles.filterText,
        filter === key && styles.filterTextActive
      ]}>{label}</Text>
    </TouchableOpacity>
  );

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

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Event Management</Text>
          <Text style={styles.subtitle}>Manage validated events and tickets</Text>
          <Text style={[styles.subtitle, { fontSize: 12, color: '#94a3b8', marginTop: 4 }]}>
            {events.length} events • {events.filter(e => e.status === 'VALIDATED').length} validated
          </Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={openCreateModal}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createBtnText}>Create Event</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search events..." 
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ paddingVertical: 4 }}>
          {renderFilterButton('all', 'All')}
          {renderFilterButton('validated', 'Validated')}
          {renderFilterButton('pending', 'Pending')}
          {renderFilterButton('archived', 'Archived')}
        </ScrollView>
      </View>

      <FlatList
        data={filteredEvents}
        keyExtractor={item => item.event_id.toString()}
        renderItem={({ item }) => <EventCard item={item} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadEvents(false)} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#e2e8f0" />
            <Text style={styles.emptyText}>No events found</Text>
            <Text style={[styles.emptyText, { fontSize: 14, marginTop: 8 }]}>
              {searchQuery ? 'Try a different search term' : 'Create your first event'}
            </Text>
          </View>
        }
      />

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
    backgroundColor: '#f8fafc',
    padding: width < 768 ? 16 : 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  createBtn: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    ...Platform.select({
      web: { 
        cursor: 'pointer',
        boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
      },
      default: { elevation: 2 }
    }),
  },
  createBtnText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  controls: {
    marginBottom: 20,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    borderWidth: 0,
  },
  filters: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#0f172a',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    ...Platform.select({
      web: { 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      },
      default: { elevation: 3 }
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 16,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start'
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardDetail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    padding: 12,
  },
  btnAction: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginHorizontal: 4,
  },
  btnActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 6,
  },
  btnSuccess: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  btnSuccessText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  btnWarning: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  btnWarningText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  btnDanger: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  btnDangerText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: { 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      },
      default: { elevation: 5 }
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#f8fafc',
  },
  row: {
    flexDirection: 'row',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 24,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  addTicketBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  addTicketText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: '#fcfcfc',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginRight: 12,
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
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
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBox: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    ...Platform.select({
      web: { 
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
      },
      default: { elevation: 5 }
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  deleteModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 10,
      }
    }),
  },
  deleteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
    backgroundColor: '#fff',
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