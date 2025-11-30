// EventPlannerScreen.web.js - COMPLETE FIX FOR DELETE AND DROPDOWNS
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const API_URL = 'http://localhost:8081';

export default function EventPlannerScreen() {
  const { getAuthHeader } = useAuth();
  const [events, setEvents] = useState([]);
  const [archivedEvents, setArchivedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [editingEvent, setEditingEvent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newEventForm, setNewEventForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPartnershipStatus, setSelectedPartnershipStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeader();
      
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedPartnershipStatus !== 'all') params.append('partnershipStatus', selectedPartnershipStatus);
      
      const response = await axios.get(
        `${API_URL}/api/event-manager/planner/events?${params.toString()}`,
        { headers, timeout: 20000 }
      );

      console.log('Fetch events response:', response.data);

      if (response.data.success && response.data.events) {
        let allEvents = response.data.events;
        
        allEvents = sortEvents(allEvents, sortBy);
        
        const activeEvents = allEvents.filter(event => !event.archived);
        const archivedEvents = allEvents.filter(event => event.archived);
        
        console.log('Setting active events:', activeEvents.length);
        console.log('Setting archived events:', archivedEvents.length);
        
        setEvents(activeEvents);
        setArchivedEvents(archivedEvents);
      } else {
        setEvents([]);
        setArchivedEvents([]);
      }

    } catch (err) {
      console.error('ERROR FETCHING EVENTS:', err.response?.data || err.message);
      Alert.alert('Error', err.response?.data?.error || 'Failed to connect to server');
      setEvents([]);
      setArchivedEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const sortEvents = (events, sortType) => {
    const sortedEvents = [...events];
    
    switch (sortType) {
      case 'date':
        return sortedEvents.sort((a, b) => new Date(a.startDate || '9999-12-31') - new Date(b.startDate || '9999-12-31'));
      case 'date-desc':
        return sortedEvents.sort((a, b) => new Date(b.startDate || '0000-01-01') - new Date(a.startDate || '0000-01-01'));
      case 'province':
        return sortedEvents.sort((a, b) => (a.location || '').localeCompare(b.location || ''));
      case 'province-desc':
        return sortedEvents.sort((a, b) => (b.location || '').localeCompare(a.location || ''));
      case 'name':
        return sortedEvents.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'name-desc':
        return sortedEvents.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      default:
        return sortedEvents;
    }
  };

  const fetchCategories = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(
        `${API_URL}/api/event-manager/planner/events/categories`,
        { headers }
      );
      
      if (response.data.success) {
        setCategories(response.data.categories);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchCategories();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchEvents();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory, selectedPartnershipStatus, sortBy]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const markAsRead = async (eventId) => {
    try {
      const headers = await getAuthHeader();
      
      const response = await axios.patch(
        `${API_URL}/api/event-manager/planner/events/${eventId}/archive`,
        { archived: true },
        { headers }
      );

      if (response.data.success) {
        const eventToArchive = events.find(event => event.id === eventId);
        if (eventToArchive) {
          setEvents(prev => prev.filter(event => event.id !== eventId));
          setArchivedEvents(prev => [...prev, { ...eventToArchive, archived: true }]);
        }
        
        Alert.alert('Success', 'Event moved to archive');
      } else {
        throw new Error(response.data.error || 'Failed to archive event');
      }
    } catch (err) {
      console.error('Error archiving event:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to archive event');
    }
  };

  const restoreEvent = async (eventId) => {
    try {
      const headers = await getAuthHeader();
      
      const response = await axios.patch(
        `${API_URL}/api/event-manager/planner/events/${eventId}/archive`,
        { archived: false },
        { headers }
      );

      if (response.data.success) {
        const eventToRestore = archivedEvents.find(event => event.id === eventId);
        if (eventToRestore) {
          setArchivedEvents(prev => prev.filter(event => event.id !== eventId));
          setEvents(prev => [...prev, { ...eventToRestore, archived: false }]);
        }
        
        Alert.alert('Success', 'Event restored from archive');
      } else {
        throw new Error(response.data.error || 'Failed to restore event');
      }
    } catch (err) {
      console.error('Error restoring event:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to restore event');
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const deleteEvent = (eventId, eventName) => {
    console.log('DELETE EVENT CALLED:', eventId, eventName);
    
    setEventToDelete({ id: eventId, name: eventName });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    
    try {
      console.log('PERFORMING DELETE FOR:', eventToDelete.id);
      const headers = await getAuthHeader();
      
      const response = await axios.delete(
        `${API_URL}/api/event-manager/planner/events/${eventToDelete.id}`,
        { headers }
      );

      console.log('Delete response:', response.data);

      if (response.data.success) {
        // Immediately update both lists
        setEvents(prev => {
          const filtered = prev.filter(event => event.id !== eventToDelete.id);
          console.log('Updated active events count:', filtered.length);
          return filtered;
        });
        setArchivedEvents(prev => {
          const filtered = prev.filter(event => event.id !== eventToDelete.id);
          console.log('Updated archived events count:', filtered.length);
          return filtered;
        });
        
        // Close delete modal first
        setShowDeleteModal(false);
        setEventToDelete(null);
        
        // Show success modal after a short delay
        console.log('Showing success modal...');
        setTimeout(() => {
          setShowSuccessModal(true);
          console.log('Success modal should be visible now');
        }, 400);
      } else {
        throw new Error(response.data.error || 'Failed to delete event');
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to delete event');
      setShowDeleteModal(false);
      setEventToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setEventToDelete(null);
  };

  const SuccessModal = () => {
    console.log('SuccessModal render, visible:', showSuccessModal);
    
    return (
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContainer}>
            <View style={styles.successModalContent}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={48} color="#10b981" />
              </View>
              <Text style={styles.successModalTitle}>Event deleted successfully</Text>
            </View>
            <TouchableOpacity 
              style={styles.successModalButton}
              onPress={() => {
                console.log('Closing success modal');
                setShowSuccessModal(false);
              }}
            >
              <Text style={styles.successModalButtonText}>OK</Text>
            </TouchableOpacity>
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
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteModalHeader}>
              <View style={styles.deleteIconContainer}>
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
              </View>
              <Text style={styles.deleteModalTitle}>Delete Event</Text>
            </View>
            
            <View style={styles.deleteModalContent}>
              <Text style={styles.deleteModalMessage}>
                Are you sure you want to permanently delete
              </Text>
              <Text style={styles.deleteModalEventName}>"{eventToDelete.name}"</Text>
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
                <Text style={styles.deleteConfirmText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const updateEvent = async (eventId, updateData) => {
    try {
      setSaving(true);
      const headers = await getAuthHeader();
      
      const response = await axios.put(
        `${API_URL}/api/event-manager/planner/events/${eventId}`,
        updateData,
        { headers }
      );

      if (response.data.success) {
        await fetchEvents();
        return true;
      } else {
        throw new Error(response.data.error || 'Failed to update event');
      }
    } catch (err) {
      console.error('Error updating event:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to update event');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const createEvent = async (eventData) => {
    try {
      setSaving(true);
      const headers = await getAuthHeader();
      
      const response = await axios.post(
        `${API_URL}/api/event-manager/planner/events`,
        eventData,
        { headers }
      );

      if (response.data.success) {
        await fetchEvents();
        return true;
      } else {
        throw new Error(response.data.error || 'Failed to create event');
      }
    } catch (err) {
      console.error('Error creating event:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to create event');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openWhatsApp = (phoneNumber, eventName) => {
    if (!phoneNumber) {
      Alert.alert('No Contact', 'Phone number not available for this event');
      return;
    }

    const message = `Hi! We saw your event "${eventName}" and would love to discuss how our ticketing platform can help you maximize attendance and revenue. We offer 0% commission on first 500 tickets! Interested in learning more?`;
    const url = `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const openEmail = (email, eventName) => {
    if (!email) {
      Alert.alert('No Email', 'Email address not available for this event');
      return;
    }

    const subject = `Partnership Opportunity for ${eventName}`;
    const body = `Dear Event Organizer,\n\nWe came across your event "${eventName}" and were impressed by its potential. As a leading ticketing platform, we'd like to offer you:\n\n• 0% commission on your first 500 tickets\n• Advanced event management tools\n• Real-time analytics and reporting\n• Custom branded ticketing experience\n• 24/7 customer support\n\nWe believe our partnership could significantly enhance your event's success and attendee experience.\n\nWould you be available for a quick call next week to discuss this opportunity?\n\nBest regards,\nTicketHub Partnership Team`;
    
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url);
  };

  const EventDetailModal = ({ visible, event, onClose, onEdit, onArchive, onRestore, onDelete }) => {
    if (!event) return null;

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle}>{event.name}</Text>
                <View style={styles.modalBadges}>
                  {event.archived ? (
                    <View style={styles.archivedModalBadge}>
                      <Text style={styles.archivedModalBadgeText}>ARCHIVED</Text>
                    </View>
                  ) : event.partnershipStatus === 'untapped' ? (
                    <View style={styles.modalBadge}>
                      <Text style={styles.modalBadgeText}>NEW LEAD</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={styles.modalHeaderRight}>
                {event.archived ? (
                  <TouchableOpacity style={styles.modalRestoreButton} onPress={onRestore}>
                    <Ionicons name="refresh" size={16} color="#10b981" />
                    <Text style={styles.modalRestoreText}>Restore</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.modalArchiveButton} onPress={onArchive}>
                    <Ionicons name="archive" size={16} color="#64748b" />
                    <Text style={styles.modalArchiveText}>Archive</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Event Details</Text>
                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="calendar" size={20} color="#64748b" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>
                        {event.startDate ? new Date(event.startDate).toLocaleDateString('en-ZA', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'Not set'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="location" size={20} color="#64748b" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Venue & Location</Text>
                      <Text style={styles.detailValue}>
                        {event.venue || 'Venue not specified'}
                        {event.location ? `, ${event.location}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="pricetag" size={20} color="#64748b" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Category</Text>
                      <Text style={styles.detailValue}>{event.category || 'General'}</Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="business" size={20} color="#64748b" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Partnership Status</Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getPartnershipStatusColor(event.partnershipStatus) + '20' }
                      ]}>
                        <Text style={[
                          styles.statusText,
                          { color: getPartnershipStatusColor(event.partnershipStatus) }
                        ]}>
                          {event.partnershipStatus?.toUpperCase() || 'UNTAPPED'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {event.capacity && (
                    <View style={styles.detailItem}>
                      <View style={styles.detailIcon}>
                        <Ionicons name="people" size={20} color="#64748b" />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Capacity</Text>
                        <Text style={styles.detailValue}>{event.capacity.toLocaleString()} attendees</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {event.description && (
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <Text style={styles.detailValue}>{event.description}</Text>
                </View>
              )}

              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Contact Information</Text>
                <View style={styles.contactActions}>
                  {event.organizerName && (
                    <View style={styles.detailItem}>
                      <View style={styles.detailIcon}>
                        <Ionicons name="person" size={20} color="#64748b" />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Organizer</Text>
                        <Text style={styles.detailValue}>{event.organizerName}</Text>
                      </View>
                    </View>
                  )}

                  {event.contactEmail ? (
                    <TouchableOpacity 
                      style={styles.contactButton}
                      onPress={() => openEmail(event.contactEmail, event.name)}
                    >
                      <View style={[styles.contactIcon, { backgroundColor: '#dc262620' }]}>
                        <Ionicons name="mail" size={24} color="#dc2626" />
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactLabel}>Email</Text>
                        <Text style={styles.contactValue}>{event.contactEmail}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#64748b" />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.contactButton}>
                      <View style={[styles.contactIcon, { backgroundColor: '#f1f5f9' }]}>
                        <Ionicons name="mail" size={24} color="#94a3b8" />
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactLabel}>Email</Text>
                        <Text style={styles.contactUnavailable}>Not available</Text>
                      </View>
                    </View>
                  )}

                  {event.contactPhone ? (
                    <TouchableOpacity 
                      style={styles.contactButton}
                      onPress={() => openWhatsApp(event.contactPhone, event.name)}
                    >
                      <View style={[styles.contactIcon, { backgroundColor: '#25D36620' }]}>
                        <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactLabel}>Phone</Text>
                        <Text style={styles.contactValue}>{event.contactPhone}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#64748b" />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.contactButton}>
                      <View style={[styles.contactIcon, { backgroundColor: '#f1f5f9' }]}>
                        <Ionicons name="call" size={24} color="#94a3b8" />
                      </View>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactLabel}>Phone</Text>
                        <Text style={styles.contactUnavailable}>Not available</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {event.notes && (
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Notes</Text>
                  <Text style={styles.detailValue}>{event.notes}</Text>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.primaryModalButton}
                  onPress={onEdit}
                >
                  <Ionicons name="create-outline" size={20} color="#fff" />
                  <Text style={styles.primaryModalButtonText}>Edit Event Details</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.tertiaryModalButton}
                  onPress={onDelete}
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  <Text style={[styles.tertiaryModalButtonText, { color: '#ef4444' }]}>
                    Delete Event Permanently
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const getPartnershipStatusColor = (status) => {
    const colors = {
      'untapped': '#64748b',
      'pending': '#eab308',
      'partnered': '#22c55e',
      'rejected': '#ef4444'
    };
    return colors[status] || '#64748b';
  };

  const showEventDetails = (event) => {
    setSelectedEvent(event);
    setEditingEvent(null);
    setEditForm({});
    setShowEventModal(true);
  };

  const startEditing = (event) => {
    setEditingEvent(event);
    setEditForm({
      name: event.name || '',
      description: event.description || '',
      startDate: event.startDate || '',
      location: event.location || '',
      venue: event.venue || '',
      contactEmail: event.contactEmail || '',
      contactPhone: event.contactPhone || '',
      organizerName: event.organizerName || '',
      capacity: event.capacity?.toString() || '',
      category: event.category || 'General',
      partnershipStatus: event.partnershipStatus || 'untapped',
      notes: event.notes || ''
    });
  };

  const startAddingEvent = () => {
    setNewEventForm({
      name: '',
      description: '',
      startDate: '',
      location: '',
      venue: '',
      contactEmail: '',
      contactPhone: '',
      organizerName: '',
      capacity: '',
      category: 'General',
      partnershipStatus: 'untapped',
      notes: ''
    });
    setShowAddEventModal(true);
  };

  const saveEdit = async () => {
    if (!editingEvent) return;

    const success = await updateEvent(editingEvent.id, editForm);
    if (success) {
      Alert.alert('Success', 'Event updated successfully');
      setEditingEvent(null);
      setEditForm({});
      setShowEventModal(false);
    }
  };

  const saveNewEvent = async () => {
    if (!newEventForm.name) {
      Alert.alert('Error', 'Event name is required');
      return;
    }

    const success = await createEvent(newEventForm);
    if (success) {
      Alert.alert('Success', 'Event created successfully');
      setNewEventForm({});
      setShowAddEventModal(false);
    }
  };

  const cancelEdit = () => {
    setEditingEvent(null);
    setEditForm({});
  };

  const cancelAddEvent = () => {
    setNewEventForm({});
    setShowAddEventModal(false);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedPartnershipStatus('all');
    setSortBy('date');
  };

  const generateAIPartnershipInfo = (event) => {
    const baseBenefits = [
      "0% commission on first 500 tickets",
      "Advanced event management dashboard",
      "Real-time attendance analytics",
      "Custom branded ticketing experience",
      "24/7 customer support",
      "Social media promotion package"
    ];

    const eventType = event.category?.toLowerCase() || 'general';
    let additionalBenefits = [];

    if (eventType.includes('music') || eventType.includes('festival')) {
      additionalBenefits = [
        "VIP ticket upselling features",
        "Lineup announcement tools",
        "Merchandise integration"
      ];
    } else if (eventType.includes('tech') || eventType.includes('conference')) {
      additionalBenefits = [
        "Session tracking and analytics",
        "Speaker management tools",
        "Networking features"
      ];
    } else if (eventType.includes('food') || eventType.includes('culinary')) {
      additionalBenefits = [
        "Vendor management system",
        "Menu and dietary preference tracking",
        "Tasting session scheduling"
      ];
    }

    return {
      benefits: [...baseBenefits, ...additionalBenefits],
      suggestedApproach: `Focus on how our platform can enhance the ${eventType} experience for both organizers and attendees. Highlight the revenue potential and ease of management.`,
      estimatedRevenue: event.capacity ? `Potential revenue: R${(event.capacity * 150).toLocaleString()}` : "High revenue potential based on similar events"
    };
  };

  const renderEventCard = ({ item, isArchived = false }) => {
    const isUntapped = item.partnershipStatus === 'untapped';
    const partnershipInfo = generateAIPartnershipInfo(item);
    const hasContactInfo = item.contactEmail || item.contactPhone;

    const handleDelete = (e) => {
      if (e && e.stopPropagation) {
        e.stopPropagation();
      }
      if (e && e.preventDefault) {
        e.preventDefault();
      }
      console.log('Delete clicked for:', item.id, item.name);
      deleteEvent(item.id, item.name);
    };

    return (
      <View style={styles.eventCard}>
        {/* Header with status badge and actions */}
        <View style={styles.cardHeader}>
          <View style={styles.eventTypeContainer}>
            <Ionicons name="calendar" size={16} color="#64748b" />
            <Text style={styles.eventTypeText}>
              {item.category || 'General Event'}
            </Text>
          </View>
          <View style={styles.cardActions}>
            {isUntapped && !isArchived && (
              <View style={styles.untappedBadge}>
                <Ionicons name="flash" size={12} color="#fff" />
                <Text style={styles.untappedBadgeText}>NEW LEAD</Text>
              </View>
            )}
            {isArchived && (
              <View style={styles.archivedBadge}>
                <Ionicons name="archive" size={12} color="#fff" />
                <Text style={styles.archivedBadgeText}>ARCHIVED</Text>
              </View>
            )}
            {/* Fixed Delete Button */}
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={14} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Event Info - wrapped in TouchableOpacity */}
        <TouchableOpacity onPress={() => showEventDetails(item)} style={styles.eventContent}>
          <Text style={styles.eventName} numberOfLines={2}>
            {item.name}
          </Text>

          <View style={styles.eventDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={14} color="#64748b" />
              <Text style={styles.detailText}>
                {item.startDate ? new Date(item.startDate).toLocaleDateString('en-ZA', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                }) : 'Date TBD'}
              </Text>
            </View>

            {item.organizerName && (
              <View style={styles.detailRow}>
                <Ionicons name="person" size={14} color="#64748b" />
                <Text style={styles.detailText} numberOfLines={1}>
                  {item.organizerName}
                </Text>
              </View>
            )}
          </View>

          {/* Partnership Status */}
          <View style={styles.partnershipSection}>
            <Text style={[
              styles.partnershipStatus,
              isUntapped ? styles.untappedStatus : styles.partneredStatus
            ]}>
              {isUntapped ? 'PARTNERSHIP OPPORTUNITY' : `Partner: ${item.ticketingProvider || 'Unknown'}`}
            </Text>
          </View>

          {/* Quick Stats */}
          {item.capacity && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="people" size={16} color="#000" />
                <Text style={styles.statValue}>{item.capacity}</Text>
                <Text style={styles.statLabel}>Capacity</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Ionicons name="trending-up" size={16} color="#10b981" />
                <Text style={styles.statValue}>
                  {partnershipInfo.benefits.length}
                </Text>
                <Text style={styles.statLabel}>Benefits</Text>
              </View>
            </View>
          )}

          {/* Contact Availability */}
          {hasContactInfo && (
            <View style={styles.contactAvailability}>
              <View style={styles.contactIcons}>
                {item.contactEmail && (
                  <Ionicons name="mail" size={14} color="#000" />
                )}
                {item.contactPhone && (
                  <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                )}
                <Text style={styles.contactAvailableText}>
                  Contact available
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={() => showEventDetails(item)}
          >
            <Text style={styles.viewButtonText}>
              View Details
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#000" />
          </TouchableOpacity>

          {!isArchived ? (
            <TouchableOpacity 
              style={styles.markReadButton}
              onPress={() => markAsRead(item.id)}
            >
              <Ionicons name="checkmark" size={16} color="#64748b" />
              <Text style={styles.markReadText}>Mark Read</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.restoreButton}
              onPress={() => restoreEvent(item.id)}
            >
              <Ionicons name="refresh" size={16} color="#10b981" />
              <Text style={styles.restoreText}>Restore</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const AddEventModal = () => {
    return (
      <Modal
        visible={showAddEventModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelAddEvent}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Event Lead</Text>
              <TouchableOpacity onPress={cancelAddEvent}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editForm}>
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Event Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newEventForm.name}
                  onChangeText={(text) => setNewEventForm(prev => ({ ...prev, name: text }))}
                  placeholder="Enter event name"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={newEventForm.description}
                  onChangeText={(text) => setNewEventForm(prev => ({ ...prev, description: text }))}
                  placeholder="Event description"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formSection, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Start Date</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newEventForm.startDate}
                    onChangeText={(text) => setNewEventForm(prev => ({ ...prev, startDate: text }))}
                    placeholder="YYYY-MM-DD"
                  />
                </View>

                <View style={[styles.formSection, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Capacity</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newEventForm.capacity}
                    onChangeText={(text) => setNewEventForm(prev => ({ ...prev, capacity: text }))}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Venue</Text>
                <TextInput
                  style={styles.textInput}
                  value={newEventForm.venue}
                  onChangeText={(text) => setNewEventForm(prev => ({ ...prev, venue: text }))}
                  placeholder="Venue name"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Location</Text>
                <TextInput
                  style={styles.textInput}
                  value={newEventForm.location}
                  onChangeText={(text) => setNewEventForm(prev => ({ ...prev, location: text }))}
                  placeholder="City, Country"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Organizer Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={newEventForm.organizerName}
                  onChangeText={(text) => setNewEventForm(prev => ({ ...prev, organizerName: text }))}
                  placeholder="Organizer name"
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formSection, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Contact Email</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newEventForm.contactEmail}
                    onChangeText={(text) => setNewEventForm(prev => ({ ...prev, contactEmail: text }))}
                    placeholder="email@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={[styles.formSection, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Contact Phone</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newEventForm.contactPhone}
                    onChangeText={(text) => setNewEventForm(prev => ({ ...prev, contactPhone: text }))}
                    placeholder="+27 12 345 6789"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Category</Text>
                <TextInput
                  style={styles.textInput}
                  value={newEventForm.category}
                  onChangeText={(text) => setNewEventForm(prev => ({ ...prev, category: text }))}
                  placeholder="General"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Partnership Status</Text>
                <TextInput
                  style={styles.textInput}
                  value={newEventForm.partnershipStatus}
                  onChangeText={(text) => setNewEventForm(prev => ({ ...prev, partnershipStatus: text }))}
                  placeholder="untapped"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={newEventForm.notes}
                  onChangeText={(text) => setNewEventForm(prev => ({ ...prev, notes: text }))}
                  placeholder="Additional notes"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.editActions}>
                <TouchableOpacity 
                  style={styles.cancelEditButton} 
                  onPress={cancelAddEvent}
                  disabled={saving}
                >
                  <Text style={styles.cancelEditText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.saveEditButton, saving && styles.saveEditButtonDisabled]} 
                  onPress={saveNewEvent}
                  disabled={saving || !newEventForm.name}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveEditText}>Create Event</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading partnership opportunities...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const untappedCount = events.filter(e => e.partnershipStatus === 'untapped').length;
  const totalActiveCount = events.length;
  const archivedCount = archivedEvents.length;

  const displayEvents = activeTab === 'active' ? events : archivedEvents;

  // Render dropdowns as absolute positioned overlays
  const renderDropdownOverlay = () => {
    if (!showCategoryDropdown && !showStatusDropdown && !showSortDropdown) {
      return null;
    }

    return (
      <View style={styles.dropdownOverlay} pointerEvents="box-none">
        {showCategoryDropdown && (
          <View style={[styles.dropdownMenuAbsolute, { top: 205, left: 90 }]}>
            <ScrollView style={styles.dropdownScroll}>
              <TouchableOpacity 
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedCategory('all');
                  setShowCategoryDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>All Categories</Text>
              </TouchableOpacity>
              {categories.map((category, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedCategory(category);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {showStatusDropdown && (
          <View style={[styles.dropdownMenuAbsolute, { top: 205, left: 260 }]}>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setSelectedPartnershipStatus('all');
                setShowStatusDropdown(false);
              }}
            >
              <Text style={styles.dropdownItemText}>All Status</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setSelectedPartnershipStatus('untapped');
                setShowStatusDropdown(false);
              }}
            >
              <Text style={styles.dropdownItemText}>Untapped</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setSelectedPartnershipStatus('pending');
                setShowStatusDropdown(false);
              }}
            >
              <Text style={styles.dropdownItemText}>Pending</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setSelectedPartnershipStatus('partnered');
                setShowStatusDropdown(false);
              }}
            >
              <Text style={styles.dropdownItemText}>Partnered</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setSelectedPartnershipStatus('rejected');
                setShowStatusDropdown(false);
              }}
            >
              <Text style={styles.dropdownItemText}>Rejected</Text>
            </TouchableOpacity>
          </View>
        )}

        {showSortDropdown && (
          <View style={[styles.dropdownMenuAbsolute, { top: 205, left: 410 }]}>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setSortBy('date');
                setShowSortDropdown(false);
              }}
            >
              <Text style={styles.dropdownItemText}>Date (Oldest First)</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setSortBy('date-desc');
                setShowSortDropdown(false);
              }}
            >
              <Text style={styles.dropdownItemText}>Date (Newest First)</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setSortBy('province');
                setShowSortDropdown(false);
              }}
            >
              <Text style={styles.dropdownItemText}>Province (A-Z)</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setSortBy('province-desc');
                setShowSortDropdown(false);
              }}
            >
              <Text style={styles.dropdownItemText}>Province (Z-A)</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setSortBy('name');
                setShowSortDropdown(false);
              }}
            >
              <Text style={styles.dropdownItemText}>Name (A-Z)</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setSortBy('name-desc');
                setShowSortDropdown(false);
              }}
            >
              <Text style={styles.dropdownItemText}>Name (Z-A)</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Event Partnership Leads</Text>
            <Text style={styles.headerSubtitle}>
              Discover and connect with event organizers for partnership opportunities
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Ionicons name="refresh" size={20} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={startAddingEvent}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Lead</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search and Filters */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search events, venues, organizers..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#64748b" />
              </TouchableOpacity>
            ) : null}
          </View>
          
          <View style={styles.filtersRow}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Category:</Text>
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => {
                  setShowCategoryDropdown(!showCategoryDropdown);
                  setShowStatusDropdown(false);
                  setShowSortDropdown(false);
                }}
              >
                <Text style={styles.dropdownButtonText}>
                  {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Status:</Text>
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => {
                  setShowStatusDropdown(!showStatusDropdown);
                  setShowCategoryDropdown(false);
                  setShowSortDropdown(false);
                }}
              >
                <Text style={styles.dropdownButtonText}>
                  {selectedPartnershipStatus === 'all' ? 'All Status' : selectedPartnershipStatus}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Sort by:</Text>
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => {
                  setShowSortDropdown(!showSortDropdown);
                  setShowCategoryDropdown(false);
                  setShowStatusDropdown(false);
                }}
              >
                <Text style={styles.dropdownButtonText}>
                  {sortBy === 'date' && 'Date (Oldest)'}
                  {sortBy === 'date-desc' && 'Date (Newest)'}
                  {sortBy === 'province' && 'Province (A-Z)'}
                  {sortBy === 'province-desc' && 'Province (Z-A)'}
                  {sortBy === 'name' && 'Name (A-Z)'}
                  {sortBy === 'name-desc' && 'Name (Z-A)'}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            {(searchQuery || selectedCategory !== 'all' || selectedPartnershipStatus !== 'all' || sortBy !== 'date') && (
              <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsCards}>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{totalActiveCount}</Text>
            <Text style={styles.statCardLabel}>Active Leads</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statCardValue, { color: '#000' }]}>{untappedCount}</Text>
            <Text style={styles.statCardLabel}>New Leads</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statCardValue, { color: '#64748b' }]}>{archivedCount}</Text>
            <Text style={styles.statCardLabel}>Archived</Text>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'active' && styles.tabButtonActive]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
              Active Leads ({totalActiveCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'archived' && styles.tabButtonActive]}
            onPress={() => setActiveTab('archived')}
          >
            <Text style={[styles.tabText, activeTab === 'archived' && styles.tabTextActive]}>
              Archived ({archivedCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Overlay - Rendered OUTSIDE header */}
      {renderDropdownOverlay()}

      {/* Events Grid */}
      <FlatList
        data={displayEvents}
        renderItem={({ item }) => renderEventCard({ item, isArchived: activeTab === 'archived' })}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#000']}
            tintColor="#000"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons 
              name={activeTab === 'active' ? "search-outline" : "archive-outline"} 
              size={64} 
              color="#cbd5e1" 
            />
            <Text style={styles.emptyStateTitle}>
              {activeTab === 'active' ? 'No active leads found' : 'No archived events found'}
            </Text>
            <Text style={styles.emptyStateText}>
              {activeTab === 'active' 
                ? searchQuery || selectedCategory !== 'all' || selectedPartnershipStatus !== 'all'
                  ? 'Try adjusting your search filters'
                  : 'All leads have been archived or no events available'
                : 'Archived events will appear here when you mark events as read'
              }
            </Text>
            {(searchQuery || selectedCategory !== 'all' || selectedPartnershipStatus !== 'all') && (
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={clearFilters}
              >
                <Text style={styles.retryButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
            {activeTab === 'archived' && archivedCount === 0 && !searchQuery && (
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={() => setActiveTab('active')}
              >
                <Text style={styles.retryButtonText}>View Active Leads</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <EventDetailModal
        visible={showEventModal}
        event={selectedEvent}
        onClose={() => setShowEventModal(false)}
        onEdit={() => {
          if (selectedEvent) {
            startEditing(selectedEvent);
          }
        }}
        onArchive={() => {
          if (selectedEvent && !selectedEvent.archived) {
            markAsRead(selectedEvent.id);
            setShowEventModal(false);
          }
        }}
        onRestore={() => {
          if (selectedEvent && selectedEvent.archived) {
            restoreEvent(selectedEvent.id);
            setShowEventModal(false);
          }
        }}
        onDelete={() => {
          if (selectedEvent) {
            setShowEventModal(false);
            deleteEvent(selectedEvent.id, selectedEvent.name);
          }
        }}
      />

      <AddEventModal />
      
      <DeleteConfirmationModal />
      
      <SuccessModal />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsCards: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  statCardLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    minWidth: 120,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
  },
  dropdownMenuAbsolute: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    width: 180,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 1000,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#475569',
  },
  clearFiltersButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearFiltersText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#000',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  eventCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 8,
    padding: 16,
    minHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  eventContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventTypeText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  untappedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  untappedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  archivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#64748b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  archivedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 4,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    lineHeight: 20,
  },
  eventDetails: {
    marginBottom: 12,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 20,
  },
  detailText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  partnershipSection: {
    marginBottom: 12,
  },
  partnershipStatus: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  untappedStatus: {
    color: '#000',
  },
  partneredStatus: {
    color: '#10b981',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 8,
  },
  contactAvailability: {
    marginBottom: 12,
  },
  contactIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactAvailableText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  viewButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  viewButtonText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '600',
  },
  markReadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  markReadText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  restoreButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  restoreText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 800,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalHeaderLeft: {
    flex: 1,
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  modalBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  modalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#00000015',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#000',
  },
  modalBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  archivedModalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#64748b15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#64748b',
  },
  archivedModalBadgeText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalArchiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  modalArchiveText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  modalRestoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  modalRestoreText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  modalScroll: {
    flex: 1,
    padding: 24,
  },
  modalSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  detailGrid: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    minHeight: 40,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  contactActions: {
    gap: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600',
  },
  contactUnavailable: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  modalActions: {
    gap: 12,
    marginTop: 8,
  },
  primaryModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tertiaryModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  tertiaryModalButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editForm: {
    flex: 1,
    padding: 24,
  },
  formSection: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelEditButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelEditText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  saveEditButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  saveEditButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveEditText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  deleteModalHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  deleteIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  deleteModalContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteModalMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  deleteModalEventName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  deleteModalWarning: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  deleteModalActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 24,
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
    backgroundColor: '#000',
  },
  deleteConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  successModalContainer: {
    backgroundColor: '#2d3748',
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
  successModalContent: {
    padding: 32,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#fff',
    textAlign: 'center',
  },
  successModalButton: {
    borderTopWidth: 1,
    borderTopColor: '#4a5568',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
});