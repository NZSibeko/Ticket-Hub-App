// src/screens/EventManagementScreen.web.js - FINAL FIXED VERSION (Payload Cleaned)
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
  // *** NEW: Auth State to handle missing token ***
  const [isAuthenticated, setIsAuthenticated] = useState(true); 
  
  // --- Filter State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  // --- Modal & Form State ---
  const [modalVisible, setModalVisible] = useState(false); // Create/Edit Modal
  const [isEditing, setIsEditing] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false); // Success Feedback Modal
  const [submitting, setSubmitting] = useState(false);
  const [modalMessage, setModalMessage] = useState('Operation successful!'); // Dynamic success message

  const initialFormState = {
    event_id: null,
    event_name: '',
    event_description: '',
    location: '',
    start_date: '', // Format: YYYY-MM-DD HH:MM
    end_date: '',
    max_attendees: '',
    price: '',
    image_url: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [ticketTypes, setTicketTypes] = useState([]);

  // *** NEW DELETE MODAL STATE ***
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);

  // --- API Handlers ---

  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      'hasToken': !!token, // Return boolean flag for check
    };
  };

  const loadEvents = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const isRefreshing = !showLoading;
    if (isRefreshing) setRefreshing(true);

    try {
      const headers = await getAuthHeader();
      
      // *** MODIFIED: Check if token exists ***
      if (!headers.hasToken) {
        setEvents([]);
        setIsAuthenticated(false);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setIsAuthenticated(true); // Reset if check passed

      // Remove the custom flag before sending
      const fetchHeaders = { ...headers };
      delete fetchHeaders.hasToken;

      const res = await fetch(`${API_BASE_URL}/api/events`, { headers: fetchHeaders });
      const data = await res.json();

      if (res.ok && data.success) {
        const preparedEvents = data.events.map(event => ({
          ...event,
          ticket_types: Array.isArray(event.ticket_types) ? event.ticket_types : [],
        }));
        setEvents(preparedEvents);
      } else if (res.status === 403) {
          // A 403 (Forbidden) means token is present but user lacks 'event_manager' or 'admin' role
          Alert.alert('Access Denied', 'Your account does not have permission to manage events.');
          setEvents([]);
      } else {
        console.error(data.error);
        // Alert.alert('Error', data.error || 'Failed to fetch events.');
        setEvents([]);
      }
    } catch (error) {
      console.error('Fetch events error:', error);
      // Alert.alert('Network Error', 'Could not connect to the server.');
      setEvents([]);
    } finally {
      if (showLoading) setLoading(false);
      if (isRefreshing) setRefreshing(false);
    }
  };

  const updateEventStatus = async (eventId, action) => {
    try {
      const headers = await getAuthHeader();
      const fetchHeaders = { ...headers };
      delete fetchHeaders.hasToken;
      
      const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/${action}`, {
        method: 'PUT',
        headers: fetchHeaders,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setModalMessage(data.message || `Event successfully ${action}d.`);
        setSuccessModalVisible(true);
        loadEvents(false);
        setTimeout(() => setSuccessModalVisible(false), 2000);
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (error) {
      Alert.alert('Network Error', error.message);
    }
  };

  // --- NEW DELETE HANDLERS ---
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setEventToDelete(null);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;

    try {
      const headers = await getAuthHeader();
      const fetchHeaders = { ...headers };
      delete fetchHeaders.hasToken;

      const res = await fetch(`${API_BASE_URL}/api/events/${eventToDelete.event_id}`, {
        method: 'DELETE',
        headers: fetchHeaders,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // 1. Remove event from the local state immediately
        setEvents(prev => prev.filter(e => e.event_id !== eventToDelete.event_id));

        // 2. Close delete modal
        setShowDeleteModal(false);
        setEventToDelete(null);

        // 3. Show success modal
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

  /**
   * Implements Delete Confirmation Modal (using custom Modal)
   */
  const handleDeleteEvent = (event) => {
    setEventToDelete(event);
    setShowDeleteModal(true);
  };
  // --- END NEW DELETE HANDLERS ---


  // --- Form Handlers (CREATE/EDIT) ---

  const openCreateModal = () => {
    // *** NEW: Check for authentication before opening modal ***
    if (!isAuthenticated) {
        Alert.alert('Login Required', 'Please log in to create an event.');
        return;
    }
    setFormData(initialFormState);
    // Initialize with a default ticket type
    setTicketTypes([{ name: 'General Admission', price: '0', quantity: '100' }]);
    setIsEditing(false);
    setModalVisible(true);
  };

  const openEditModal = (event) => {
    // *** NEW: Check for authentication before opening modal ***
    if (!isAuthenticated) {
        Alert.alert('Login Required', 'Please log in to edit an event.');
        return;
    }
    setFormData({
      event_id: event.event_id,
      event_name: event.event_name,
      event_description: event.event_description,
      location: event.location,
      start_date: event.start_date,
      end_date: event.end_date || '',
      max_attendees: event.max_attendees?.toString(),
      price: event.price?.toString(),
      image_url: event.image_url,
    });
    // Ensure ticket types are ready for editing, fallback to default if empty
    setTicketTypes(event.ticket_types.length > 0 ? event.ticket_types.map(t => ({...t, price: t.price.toString(), quantity: t.quantity.toString()})) : [{ name: 'Standard', price: '0', quantity: '0' }]);
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
    const newTickets = ticketTypes.filter((_, i) => i !== index);
    setTicketTypes(newTickets);
  };

  /**
   * Implements Create (POST) and Edit/Update (PUT) functionality with Success Modal.
   */
  const handleSubmit = async () => {
    if (!formData.event_name || !formData.start_date || !formData.location || !formData.max_attendees) {
      Alert.alert('Validation', 'Please fill in required fields: Name, Location, Start Date, and Max Attendees.');
      return;
    }

    setSubmitting(true);
    try {
      const headers = await getAuthHeader();
      const fetchHeaders = { ...headers };
      delete fetchHeaders.hasToken;
      
      // *** FIX FOR 500 SERVER ERROR: Explicitly construct eventData to ensure clean, correct types ***
      const eventData = {
        event_name: formData.event_name,
        event_description: formData.event_description,
        location: formData.location,
        start_date: formData.start_date,
        end_date: formData.end_date || null, // Ensure null if empty for database
        image_url: formData.image_url || null, // Ensure null if empty for database
        // Correctly parse number fields here, overriding any string values from initial state
        max_attendees: parseInt(formData.max_attendees) || 0,
        price: parseFloat(formData.price) || 0,
        // Conditionally add fields based on mode
        ...(isEditing && { event_id: formData.event_id }), 
        ...(!isEditing && { status: 'PENDING' }),
      };

      // Process ticket types separately
      const ticketPayload = ticketTypes.map(t => ({
        name: t.name || 'Standard', 
        price: parseFloat(t.price) || 0,
        quantity: parseInt(t.quantity) || 0
      })).filter(t => t.name); // Filter out tickets with no name

      // Final Payload
      const payload = {
          ...eventData,
          ticket_types: ticketPayload // Include nested data for the backend to handle
      };

      let url = `${API_BASE_URL}/api/events`;
      let method = 'POST';
      let successMsg = 'Event created successfully!'; 

      if (isEditing) {
        url = `${API_BASE_URL}/api/events/${formData.event_id}`;
        method = 'PUT'; 
        successMsg = 'Event updated successfully!'; 
      }

      const res = await fetch(url, {
        method,
        headers: fetchHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setModalVisible(false);
        setModalMessage(successMsg);
        setSuccessModalVisible(true); 
        loadEvents(false); 
        setTimeout(() => setSuccessModalVisible(false), 2000);
      } else {
        // Log the full error to help debug server-side issue if 500 persists
        console.error("Server Error on Submit:", data); 
        Alert.alert('Error', data.error || 'Operation failed. Check server logs.');
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', 'Network request failed');
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
      // 1. Filter by status
      const statusMatch = filter === 'all' ||
        (filter === 'pending' && event.status === 'PENDING' && event.archived !== 1) ||
        (filter === 'validated' && event.status === 'VALIDATED' && event.archived !== 1) ||
        (filter === 'archived' && event.archived === 1);

      // 2. Filter by search query (case-insensitive on name)
      const searchMatch = event.event_name.toLowerCase().includes(searchQuery.toLowerCase());

      return statusMatch && searchMatch;
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Sort by newest first
  }, [events, searchQuery, filter]);

  // --- Components ---

  const renderStatusBadge = (status, isArchived) => {
    let text = isArchived === 1 ? 'ARCHIVED' : status;
    let color = '#475569'; // default slate
    let bgColor = '#e2e8f0';

    if (isArchived === 1) {
      color = '#dc2626'; // Red for archived
      bgColor = '#fee2e2';
    } else if (status === 'VALIDATED') {
      color = '#16a34a'; // Green
      bgColor = '#dcfce7';
    } else if (status === 'PENDING') {
      color = '#d97706'; // Yellow/Amber
      bgColor = '#fef3c7';
    }

    return (
      <View style={[styles.badge, { backgroundColor: bgColor }]}>
        <Text style={[styles.badgeText, { color }]}>{text}</Text>
      </View>
    );
  };

  const EventCard = ({ item }) => {
    const isArchived = item.archived === 1;

    // Format dates
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image 
            source={{ uri: item.image_url || 'https://placehold.co/600x400/e2e8f0/0f172a?text=No+Image' }} 
            style={styles.cardImage} 
          />
          <View style={styles.cardContent}>
            <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{item.event_name}</Text>
                {renderStatusBadge(item.status, item.archived)}
            </View>
            <Text style={styles.cardDetail}><Ionicons name="location-outline" /> {item.location}</Text>
            <Text style={styles.cardDetail}><Ionicons name="calendar-outline" /> {formatDate(item.start_date)}</Text>
            <Text style={styles.cardDetail}><Ionicons name="people-outline" /> {item.max_attendees} Max Attendees</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          {/* Edit/View Button - Now opens the edit modal */}
          <TouchableOpacity 
            style={styles.btnAction} 
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="create-outline" size={18} color="#2563eb" />
            <Text style={styles.btnActionText}>Edit / View</Text>
          </TouchableOpacity>

          {/* Dynamic Action Buttons */}
          {!isArchived ? (
            item.status === 'PENDING' ? (
              // PENDING Actions
              <>
                <TouchableOpacity 
                  style={[styles.btnAction, styles.btnSuccess]} 
                  onPress={() => updateEventStatus(item.event_id, 'validate')}
                >
                  <Text style={styles.btnSuccessText}>Validate</Text>
                </TouchableOpacity>
                <TouchableOpacity // Delete button for PENDING events
                  style={[styles.btnAction, styles.btnDanger]} 
                  onPress={() => handleDeleteEvent(item)} // *** UPDATED TO USE NEW MODAL LOGIC ***
                >
                  <Text style={styles.btnDangerText}>Delete</Text>
                </TouchableOpacity>
              </>
            ) : (
              // VALIDATED Actions
              <>
                <TouchableOpacity 
                  style={[styles.btnAction, styles.btnWarning]} 
                  onPress={() => updateEventStatus(item.event_id, 'archive')}
                >
                  <Text style={styles.btnWarningText}>Archive</Text>
                </TouchableOpacity>
                <TouchableOpacity // Delete button for VALIDATED events
                  style={[styles.btnAction, styles.btnDanger]} 
                  onPress={() => handleDeleteEvent(item)} // *** UPDATED TO USE NEW MODAL LOGIC ***
                >
                  <Text style={styles.btnDangerText}>Delete</Text>
                </TouchableOpacity>
              </>
            )
          ) : (
            // ARCHIVED Actions
            <>
              <TouchableOpacity 
                style={[styles.btnAction, { backgroundColor: '#d1fae5', borderColor: '#d1fae5' }]} 
                onPress={() => updateEventStatus(item.event_id, 'unarchive')}
              >
                <Text style={{ color: '#065f46', fontWeight: '600', fontSize: 13 }}>Restore</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnAction, styles.btnDanger]} 
                onPress={() => handleDeleteEvent(item)} // *** UPDATED TO USE NEW MODAL LOGIC ***
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
    >
      <Text style={[
        styles.filterText,
        filter === key && styles.filterTextActive
      ]}>{label}</Text>
    </TouchableOpacity>
  );

  // --- NEW DELETE CONFIRMATION MODAL COMPONENT ---
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
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };
  // --- END NEW DELETE CONFIRMATION MODAL COMPONENT ---

  // --- Main Render ---

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // *** NEW: Render if not authenticated ***
  if (!isAuthenticated) {
    return (
        <ScreenContainer style={styles.container}>
            <View style={[styles.center, {padding: 40}]}>
                <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
                <Text style={styles.title}>Access Denied</Text>
                <Text style={[styles.subtitle, {marginTop: 10, textAlign: 'center'}]}>
                    You must be logged in as an **Admin** or **Event Manager** to view and manage events.
                </Text>
                <TouchableOpacity style={[styles.createBtn, {marginTop: 20}]} onPress={() => navigation.navigate('Login')}>
                    <Ionicons name="log-in-outline" size={20} color="#fff" />
                    <Text style={styles.createBtnText}>Go to Login</Text>
                </TouchableOpacity>
            </View>
        </ScreenContainer>
    );
  }
  // *** END NEW ***

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <View>
            <Text style={styles.title}>Event Management</Text>
            <Text style={styles.subtitle}>Manage your events and tickets</Text>
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
        keyExtractor={item => item.event_id}
        renderItem={({ item }) => <EventCard item={item} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadEvents(false)} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No events found for your account or filters.</Text>}
      />

      {/* --- CREATE / EDIT MODAL (Unchanged) --- */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{isEditing ? 'Edit Event' : 'Create New Event'}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                        <Ionicons name="close" size={24} color="#64748b" />
                    </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalBody}>
                    <Text style={styles.label}>Event Name *</Text>
                    <TextInput 
                        style={styles.input} 
                        value={formData.event_name} 
                        onChangeText={t => setFormData({...formData, event_name: t})}
                        placeholder="e.g. Summer Music Festival"
                    />

                    <Text style={styles.label}>Description</Text>
                    <TextInput 
                        style={[styles.input, { height: 80 }]} 
                        multiline 
                        value={formData.event_description} 
                        onChangeText={t => setFormData({...formData, event_description: t})}
                        placeholder="Event details..."
                    />

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Start Date *</Text>
                            <TextInput 
                                style={styles.input} 
                                value={formData.start_date} 
                                onChangeText={t => setFormData({...formData, start_date: t})}
                                placeholder="YYYY-MM-DD HH:MM"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>End Date</Text>
                            <TextInput 
                                style={styles.input} 
                                value={formData.end_date} 
                                onChangeText={t => setFormData({...formData, end_date: t})}
                                placeholder="YYYY-MM-DD HH:MM (Optional)"
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Location *</Text>
                    <TextInput 
                        style={styles.input} 
                        value={formData.location} 
                        onChangeText={t => setFormData({...formData, location: t})}
                        placeholder="e.g. Cape Town Stadium"
                    />

                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Max Attendees *</Text>
                            <TextInput 
                                style={styles.input} 
                                value={formData.max_attendees} 
                                onChangeText={t => setFormData({...formData, max_attendees: t})}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Base Price (R)</Text>
                            <TextInput 
                                style={styles.input} 
                                value={formData.price} 
                                onChangeText={t => setFormData({...formData, price: t})}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Image URL</Text>
                    <TextInput 
                        style={styles.input} 
                        value={formData.image_url} 
                        onChangeText={t => setFormData({...formData, image_url: t})}
                        placeholder="https://..."
                    />

                    <Text style={styles.sectionHeader}>Ticket Types</Text>
                    {ticketTypes.map((ticket, index) => (
                        <View key={index} style={styles.ticketRow}>
                            <TextInput 
                                style={[styles.input, { flex: 2, marginRight: 5 }]} 
                                placeholder="Name (e.g. VIP)"
                                value={ticket.name}
                                onChangeText={(t) => handleTicketChange(t, index, 'name')}
                            />
                            <TextInput 
                                style={[styles.input, { flex: 1, marginRight: 5 }]} 
                                placeholder="Price"
                                value={ticket.price.toString()}
                                onChangeText={(t) => handleTicketChange(t, index, 'price')}
                                keyboardType="numeric"
                            />
                            <TextInput 
                                style={[styles.input, { flex: 1, marginRight: 5 }]} 
                                placeholder="Qty"
                                value={ticket.quantity.toString()}
                                onChangeText={(t) => handleTicketChange(t, index, 'quantity')}
                                keyboardType="numeric"
                            />
                            <TouchableOpacity onPress={() => removeTicketType(index)} style={{ padding: 4 }}>
                                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    ))}
                    <TouchableOpacity style={styles.addTicketBtn} onPress={addTicketType}>
                        <Ionicons name="add" size={16} color="#2563eb" />
                        <Text style={styles.addTicketText}>Add Ticket Type</Text>
                    </TouchableOpacity>

                </ScrollView>

                <View style={styles.modalFooter}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={submitting}>
                        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isEditing ? 'Update Event' : 'Create Event'}</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
      
      {/* --- DELETE CONFIRMATION MODAL (NEW) --- */}
      <DeleteConfirmationModal />

      {/* --- SUCCESS MODAL (Unchanged) --- */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={styles.successModalOverlay}>
            <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
                <Text style={styles.successText}>Success!</Text>
                <Text style={styles.successSubText}>{modalMessage}</Text>
            </View>
        </View>
      </Modal>

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
      web: { cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' },
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
    outlineStyle: 'none',
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
    ...Platform.select({ web: { cursor: 'pointer' } }),
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
  
  // Card Styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    ...Platform.select({
        web: { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
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
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
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
    ...Platform.select({ web: { cursor: 'pointer' } }),
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

  // Modal Styles
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
        web: { boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
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
    outlineStyle: 'none',
  },
  row: {
    flexDirection: 'row',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 24,
    marginBottom: 12,
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
    ...Platform.select({ web: { cursor: 'pointer' } }),
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
    ...Platform.select({ web: { cursor: 'pointer' } }),
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
  // Success Modal
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)', // Slightly darker overlay for success feedback
    justifyContent: 'center',
    alignItems: 'center',
  },
  successBox: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    ...Platform.select({
        web: { boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' },
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
  },

  // --- NEW DELETE MODAL STYLES (MATCHING EventPlannerScreen style intent) ---
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
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
    ...Platform.select({ web: { cursor: 'pointer' } }),
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
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  deleteConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default EventManagementScreen;