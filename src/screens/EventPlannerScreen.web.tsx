// EventPlannerScreen.web.js - COMPLETE FIX FOR DELETE AND DROPDOWNS
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';

export default function EventPlannerScreen() {
  const { getAuthHeader, getApiBaseUrl } = useAuth();
  const { width: viewportWidth } = useWindowDimensions();
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
  const [selectedSignalFilter, setSelectedSignalFilter] = useState('all');
  const [sortBy, setSortBy] = useState('lead-score');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [liveRefreshingEventId, setLiveRefreshingEventId] = useState(null);

  // Keep prospect events only:
  // - Include if NOT listed/advertised on ticketing platforms, OR
  // - Include if there is no active partnership yet.
  const isListedOrAdvertised = (event) => {
    const listedFlags = [
      event?.isAdvertised,
      event?.isListed,
      event?.listed,
      event?.advertised,
      event?.published,
      event?.isPublished
    ];
    const hasListedFlag = listedFlags.some((flag) => flag === true);

    const hasProvider =
      typeof event?.ticketingProvider === 'string' &&
      event.ticketingProvider.trim().length > 0 &&
      event.ticketingProvider.toLowerCase() !== 'unknown';

    const listedOnValue = event?.listedOn ?? event?.listingPlatform ?? event?.listingPlatforms;
    const hasListedPlatforms = Array.isArray(listedOnValue)
      ? listedOnValue.length > 0
      : typeof listedOnValue === 'string'
        ? listedOnValue.trim().length > 0
        : false;

    return hasListedFlag || hasProvider || hasListedPlatforms;
  };

  const hasActivePartnership = (event) => {
    const status = (event?.partnershipStatus || '').toString().toLowerCase();
    if (status === 'partnered' || status === 'active') {
      return true;
    }

    if (status === 'pending' || status === 'rejected' || status === 'untapped') {
      return false;
    }

    const hasPartnerName =
      typeof event?.partnerName === 'string' && event.partnerName.trim().length > 0;
    const hasPartnerId =
      event?.partnerId !== undefined && event?.partnerId !== null && event?.partnerId !== '';

    return hasPartnerName || hasPartnerId;
  };

  const shouldKeepProspectEvent = (event) => {
    const listed = isListedOrAdvertised(event);
    const partnered = hasActivePartnership(event);
    return !listed || !partnered;
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeader();
      const apiBase = await getApiBaseUrl();
      
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedPartnershipStatus !== 'all') params.append('partnershipStatus', selectedPartnershipStatus);
      
      const response = await axios.get(
        `${apiBase}/api/event-manager/planner/events?${params.toString()}`,
        { headers, timeout: 20000 }
      );

      console.log('Fetch events response:', response.data);

      if (response.data.success && response.data.events) {
        let allEvents = response.data.events;
        const rawCount = allEvents.length;

        allEvents = allEvents.filter(shouldKeepProspectEvent);
        console.log(
          'Prospect filter applied:',
          `${allEvents.length}/${rawCount} events kept (unlisted or unpartnered)`
        );
        
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
      const apiBase = await getApiBaseUrl();
      const response = await axios.get(
        `${apiBase}/api/event-manager/planner/events/categories`,
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
      const apiBase = await getApiBaseUrl();
      
      const response = await axios.patch(
        `${apiBase}/api/event-manager/planner/events/${eventId}/archive`,
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
      const apiBase = await getApiBaseUrl();
      
      const response = await axios.patch(
        `${apiBase}/api/event-manager/planner/events/${eventId}/archive`,
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
      const apiBase = await getApiBaseUrl();
      
      const response = await axios.delete(
        `${apiBase}/api/event-manager/planner/events/${eventToDelete.id}`,
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
      const apiBase = await getApiBaseUrl();
      
      const response = await axios.put(
        `${apiBase}/api/event-manager/planner/events/${eventId}`,
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
      const apiBase = await getApiBaseUrl();
      
      const response = await axios.post(
        `${apiBase}/api/event-manager/planner/events`,
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
    const body = `Dear Event Organizer,\n\nWe came across your event "${eventName}" and were impressed by its potential. As a leading ticketing platform, we'd like to offer you:\n\n| 0% commission on your first 500 tickets\n| Advanced event management tools\n| Real-time analytics and reporting\n| Custom branded ticketing experience\n| 24/7 customer support\n\nWe believe our partnership could significantly enhance your event's success and attendee experience.\n\nWould you be available for a quick call next week to discuss this opportunity?\n\nBest regards,\nTicketHub Partnership Team`;
    
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url);
  };

  const EventDetailModal = ({ visible, event, onClose, onEdit, onArchive, onRestore, onDelete, onRefreshLive, refreshingLive = false }) => {
    if (!event) return null;
    const ticketIntel = getPlannerTicketIntel(event);
    const scrapeStatus = getScrapeStatusColors(ticketIntel.liveStatus);
    const showTicketIntel = !hasActivePartnership(event) && (ticketIntel.hasTicketSignal || event.sourceUrl);
    const leadScore = calculateLeadScore(event);
    const contactReadiness = getContactReadiness(event);
    const recommendedAction = getRecommendedNextAction(event, leadScore, ticketIntel);
    const revenueAngle = getRevenueAngle(event, ticketIntel);

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

              {showTicketIntel && (
                <View style={styles.modalSection}>
                  <View style={styles.ticketIntelSectionHeader}>
                    <Text style={styles.sectionTitle}>Ticket Intelligence</Text>
                    <View style={[styles.scrapeStatusBadge, { backgroundColor: scrapeStatus.backgroundColor }]}>
                      <Text style={[styles.scrapeStatusBadgeText, { color: scrapeStatus.color }]}>
                        {getScrapeStatusLabel(ticketIntel.liveStatus)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.ticketIntelPanel}>
                    <Text style={styles.ticketIntelPanelIntro}>
                      {ticketIntel.sourceLabel} | {ticketIntel.priceSummary}
                      {ticketIntel.inventoryLabel !== 'Inventory not visible' ? ` | ${ticketIntel.inventoryLabel}` : ''}
                    </Text>

                    <View style={styles.ticketIntelSummaryRow}>
                      <View style={styles.ticketIntelSummaryCard}>
                        <Text style={styles.ticketIntelSummaryLabel}>Source</Text>
                        <Text style={styles.ticketIntelSummaryValue}>{ticketIntel.sourceLabel}</Text>
                      </View>
                      <View style={styles.ticketIntelSummaryCard}>
                        <Text style={styles.ticketIntelSummaryLabel}>Price band</Text>
                        <Text style={styles.ticketIntelSummaryValue}>{ticketIntel.priceSummary}</Text>
                      </View>
                      <View style={styles.ticketIntelSummaryCard}>
                        <Text style={styles.ticketIntelSummaryLabel}>Ticket types</Text>
                        <Text style={styles.ticketIntelSummaryValue}>{ticketIntel.totalTypes || 0}</Text>
                      </View>
                      <View style={styles.ticketIntelSummaryCard}>
                        <Text style={styles.ticketIntelSummaryLabel}>Freshness</Text>
                        <Text style={styles.ticketIntelSummaryValue}>{formatScrapedAt(ticketIntel.scrapedAt)}</Text>
                      </View>
                    </View>

                    {ticketIntel.types?.length ? (
                      <View style={styles.ticketTypeGroup}>
                        <Text style={styles.ticketTypeGroupTitle}>Visible ticket tiers</Text>
                        <View style={styles.ticketTypeWrap}>
                          {ticketIntel.types.slice(0, 6).map((ticketType) => (
                            <View key={ticketType.id} style={styles.ticketTypeChip}>
                              <Text style={styles.ticketTypeName}>{ticketType.name}</Text>
                              <Text style={styles.ticketTypeMeta}>
                                {ticketType.priceLabel}
                                {ticketType.quantityLabel ? ` | ${ticketType.quantityLabel}` : ''}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : (
                      <View style={styles.scrapeDiagnosticsPanel}>
                        <Text style={styles.scrapeDiagnosticsError}>
                          No ticket tiers are visible yet. Use live refresh if the source page has updated.
                        </Text>
                      </View>
                    )}

                    <View style={styles.scrapeDiagnosticsPanel}>
                      <View style={styles.scrapeDiagnosticsRow}>
                        <Text style={styles.scrapeDiagnosticsLabel}>Status</Text>
                        <Text style={styles.scrapeDiagnosticsValue}>{getScrapeStatusLabel(ticketIntel.liveStatus)}</Text>
                      </View>
                      <View style={styles.scrapeDiagnosticsRow}>
                        <Text style={styles.scrapeDiagnosticsLabel}>Provider</Text>
                        <Text style={styles.scrapeDiagnosticsValue}>{ticketIntel.providerHint || 'Unknown'}</Text>
                      </View>
                      <View style={styles.scrapeDiagnosticsRow}>
                        <Text style={styles.scrapeDiagnosticsLabel}>Extraction source</Text>
                        <Text style={styles.scrapeDiagnosticsValue}>{ticketIntel.scrapeMode || 'stored'}</Text>
                      </View>
                      <View style={styles.scrapeDiagnosticsRow}>
                        <Text style={styles.scrapeDiagnosticsLabel}>Tracked inventory</Text>
                        <Text style={styles.scrapeDiagnosticsValue}>{ticketIntel.inventoryLabel}</Text>
                      </View>
                      {event.sourceUrl ? (
                        <View style={styles.scrapeDiagnosticsRow}>
                          <Text style={styles.scrapeDiagnosticsLabel}>Source page</Text>
                          <Text style={styles.scrapeDiagnosticsValue} numberOfLines={1}>{event.sourceUrl}</Text>
                        </View>
                      ) : null}
                      <View style={styles.scrapeDiagnosticsRow}>
                        <Text style={styles.scrapeDiagnosticsLabel}>Confidence</Text>
                        <Text style={styles.scrapeDiagnosticsValue}>{ticketIntel.parseConfidence}%</Text>
                      </View>
                      {ticketIntel.extractedFields?.length ? (
                        <View style={styles.scrapeDiagnosticsRow}>
                          <Text style={styles.scrapeDiagnosticsLabel}>Fields</Text>
                          <Text style={styles.scrapeDiagnosticsValue}>{ticketIntel.extractedFields.join(', ')}</Text>
                        </View>
                      ) : null}
                      {ticketIntel.liveError ? (
                        <Text style={styles.scrapeDiagnosticsError}>{ticketIntel.liveError}</Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Planner Analyst Brief</Text>
                <View style={styles.analystPanel}>
                  <View style={styles.analystScoreRow}>
                    <View style={styles.analystScoreCard}>
                      <Text style={styles.analystCardLabel}>Lead score</Text>
                      <Text style={styles.analystScoreValue}>{leadScore}</Text>
                    </View>
                    <View style={styles.analystScoreCard}>
                      <Text style={styles.analystCardLabel}>Contact readiness</Text>
                      <Text style={styles.analystCardValue}>{contactReadiness}</Text>
                    </View>
                  </View>

                  <View style={styles.analystChecklist}>
                    <View style={styles.analystChecklistItem}>
                      <Text style={styles.analystCardLabel}>Next best action</Text>
                      <Text style={styles.analystCardValue}>{recommendedAction}</Text>
                    </View>
                    <View style={styles.analystChecklistItem}>
                      <Text style={styles.analystCardLabel}>Revenue angle</Text>
                      <Text style={styles.analystCardValue}>{revenueAngle}</Text>
                    </View>
                  </View>
                </View>
              </View>

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
                {onRefreshLive ? (
                  <TouchableOpacity 
                    style={styles.secondaryModalButton}
                    onPress={onRefreshLive}
                    disabled={refreshingLive}
                  >
                    {refreshingLive ? (
                      <ActivityIndicator size="small" color="#1d4ed8" />
                    ) : (
                      <Ionicons name="radio-outline" size={20} color="#1d4ed8" />
                    )}
                    <Text style={styles.secondaryModalButtonText}>
                      {refreshingLive ? 'Refreshing Live Tickets...' : 'Refresh Live Tickets'}
                    </Text>
                  </TouchableOpacity>
                ) : null}

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

    if (event?.id) {
      fetchLiveEventDetails(event.id);
    }
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
    setSelectedSignalFilter('all');
    setSortBy('lead-score');
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

  const formatTicketCurrency = (value, currency = 'ZAR') => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return null;
    }

    try {
      return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: currency || 'ZAR',
        minimumFractionDigits: numericValue % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(numericValue);
    } catch (error) {
      return `${currency || 'ZAR'} ${numericValue.toLocaleString('en-ZA', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}`;
    }
  };

  const extractTicketSourceLabel = (sourceUrl, providerName) => {
    if (providerName) {
      return providerName;
    }

    if (!sourceUrl) {
      return 'External listing';
    }

    try {
      const normalizedUrl = sourceUrl.startsWith('http') ? sourceUrl : `https://${sourceUrl}`;
      const hostname = new URL(normalizedUrl).hostname.replace(/^www\./, '');
      const sourceName = hostname.split('.')[0] || hostname;
      return sourceName
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
    } catch (error) {
      return 'External listing';
    }
  };

  const getPlannerTicketIntel = (event) => {
    const eventData = event || {};
    const intelligence = eventData.ticketIntelligence && typeof eventData.ticketIntelligence === 'object'
      ? eventData.ticketIntelligence
      : {};

    const rawTypes = Array.isArray(eventData.ticketTypes)
      ? eventData.ticketTypes
      : Array.isArray(intelligence.types)
        ? intelligence.types
        : [];

    const defaultCurrency = intelligence.currency || eventData.currency || 'ZAR';
    const normalizedTypes = rawTypes.map((ticketType, index) => {
      const normalizedPrice = Number(ticketType?.price);
      const normalizedQuantity = Number(ticketType?.quantityAvailable ?? ticketType?.quantity);
      const priceLabel = Number.isFinite(normalizedPrice)
        ? formatTicketCurrency(normalizedPrice, ticketType?.currency || defaultCurrency)
        : 'Price hidden';

      return {
        id: ticketType?.id || `${ticketType?.name || 'ticket'}-${index}`,
        name: ticketType?.name || ticketType?.label || `Ticket ${index + 1}`,
        price: Number.isFinite(normalizedPrice) ? normalizedPrice : null,
        quantity: Number.isFinite(normalizedQuantity) ? normalizedQuantity : null,
        priceLabel,
        quantityLabel: Number.isFinite(normalizedQuantity)
          ? `${normalizedQuantity.toLocaleString()} left`
          : null,
      };
    });

    const visiblePrices = normalizedTypes
      .map((ticketType) => ticketType.price)
      .filter((value) => Number.isFinite(value));

    const fallbackPrice = Number(eventData.price);
    const rawMinPrice = Number(intelligence.minPrice);
    const rawMaxPrice = Number(intelligence.maxPrice);
    const minPrice = Number.isFinite(rawMinPrice)
      ? rawMinPrice
      : visiblePrices.length > 0
        ? Math.min(...visiblePrices)
        : Number.isFinite(fallbackPrice)
          ? fallbackPrice
          : null;
    const maxPrice = Number.isFinite(rawMaxPrice)
      ? rawMaxPrice
      : visiblePrices.length > 0
        ? Math.max(...visiblePrices)
        : minPrice;

    const rawInventory = Number(intelligence.inventory);
    const typeInventory = normalizedTypes
      .map((ticketType) => ticketType.quantity)
      .filter((value) => Number.isFinite(value));
    const inventory = Number.isFinite(rawInventory)
      ? rawInventory
      : typeInventory.length > 0
        ? typeInventory.reduce((total, quantity) => total + quantity, 0)
        : null;

    const totalTypes = Number(intelligence.totalTypes) || normalizedTypes.length;
    const hasTicketSignal =
      Boolean(intelligence.hasTicketSignal) ||
      Boolean(intelligence.hasStructuredTickets) ||
      normalizedTypes.length > 0 ||
      Boolean(eventData.hasTicketing) ||
      Number.isFinite(minPrice) ||
      Boolean(eventData.sourceUrl) ||
      Boolean(eventData.ticketingProvider);

    const formattedMinPrice = formatTicketCurrency(minPrice, defaultCurrency);
    const formattedMaxPrice = formatTicketCurrency(maxPrice, defaultCurrency);
    const priceSummary = formattedMinPrice
      ? formattedMaxPrice && formattedMinPrice !== formattedMaxPrice
        ? `${formattedMinPrice} - ${formattedMaxPrice}`
        : `From ${formattedMinPrice}`
      : 'Price not visible';

    return {
      sourceLabel: intelligence.sourceLabel || extractTicketSourceLabel(eventData.sourceUrl, eventData.ticketingProvider),
      totalTypes,
      minPrice,
      maxPrice,
      inventory,
      priceSummary,
      inventoryLabel: Number.isFinite(inventory) && inventory > 0
        ? `${inventory.toLocaleString()} tickets tracked`
        : 'Inventory not visible',
      types: normalizedTypes,
      hasTicketSignal,
      liveStatus: intelligence.liveStatus || 'stored',
      scrapeMode: intelligence.scrapeMode || 'stored',
      parseConfidence: Number(intelligence.parseConfidence) || (normalizedTypes.length > 0 ? 72 : 36),
      extractedFields: Array.isArray(intelligence.extractedFields) ? intelligence.extractedFields : [],
      providerHint: intelligence.providerHint || eventData.ticketingProvider || extractTicketSourceLabel(eventData.sourceUrl, eventData.ticketingProvider),
      scrapedAt: intelligence.scrapedAt || null,
      liveError: intelligence.liveError || null,
    };
  };

  const getScrapeStatusLabel = (status) => {
    switch (status) {
      case 'live':
        return 'Live';
      case 'cached':
        return 'Cached';
      case 'fallback':
        return 'Fallback';
      case 'stored':
        return 'Stored';
      default:
        return 'Signal';
    }
  };

  const getScrapeStatusColors = (status) => {
    switch (status) {
      case 'live':
        return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'cached':
        return { backgroundColor: '#dbeafe', color: '#1d4ed8' };
      case 'fallback':
        return { backgroundColor: '#fef3c7', color: '#b45309' };
      default:
        return { backgroundColor: '#e2e8f0', color: '#475569' };
    }
  };

  const formatScrapedAt = (value) => {
    if (!value) {
      return 'Not refreshed yet';
    }

    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) {
      return 'Not refreshed yet';
    }

    const minutesAgo = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
    if (minutesAgo < 1) return 'Updated just now';
    if (minutesAgo < 60) return `Updated ${minutesAgo}m ago`;
    const hoursAgo = Math.round(minutesAgo / 60);
    if (hoursAgo < 24) return `Updated ${hoursAgo}h ago`;
    const daysAgo = Math.round(hoursAgo / 24);
    return `Updated ${daysAgo}d ago`;
  };

  const getContactReadiness = (event) => {
    if (event?.contactEmail && event?.contactPhone) {
      return 'Email and WhatsApp ready';
    }

    if (event?.contactEmail) {
      return 'Email outreach ready';
    }

    if (event?.contactPhone) {
      return 'WhatsApp outreach ready';
    }

    return 'Needs contact research';
  };

  const getRecommendedNextAction = (event, leadScore, ticketIntel) => {
    if (!event?.contactEmail && !event?.contactPhone) {
      return 'Find organizer contact details before outreach';
    }

    if (ticketIntel.liveStatus === 'fallback' && event?.sourceUrl) {
      return 'Review source page and refresh the live scrape';
    }

    if (leadScore >= 80) {
      return 'Pitch immediately with a revenue-first partnership offer';
    }

    if (ticketIntel.hasTicketSignal) {
      return 'Use visible ticket demand to anchor the partnership pitch';
    }

    return 'Qualify the organizer and prepare a discovery pitch';
  };

  const getRevenueAngle = (event, ticketIntel) => {
    if (ticketIntel.minPrice && ticketIntel.totalTypes > 1) {
      return 'Multi-tier pricing gives room for upsell and yield improvement.';
    }

    if (ticketIntel.minPrice) {
      return 'Visible ticket pricing supports a straightforward sales conversion pitch.';
    }

    if (event?.capacity) {
      return 'Capacity data supports a volume-based revenue conversation.';
    }

    return 'Lead with audience growth and conversion support before commercial terms.';
  };

  const renderEventCard = ({ item, isArchived = false }) => {
    const isUntapped = item.partnershipStatus === 'untapped';
    const needsPartnership = !hasActivePartnership(item);
    const partnershipInfo = generateAIPartnershipInfo(item);
    const ticketIntel = getPlannerTicketIntel(item);
    const showTicketIntel = needsPartnership && ticketIntel.hasTicketSignal;
    const hasContactInfo = item.contactEmail || item.contactPhone;
    const scrapeStatus = getScrapeStatusColors(ticketIntel.liveStatus);
    const leadScore = calculateLeadScore(item);
    const recommendedNextAction = getRecommendedNextAction(item, leadScore, ticketIntel);
    const revenueAngle = getRevenueAngle(item, ticketIntel);
    const leadScoreTone =
      leadScore >= 80
        ? { backgroundColor: '#dcfce7', color: '#166534' }
        : leadScore >= 60
          ? { backgroundColor: '#fef3c7', color: '#92400e' }
          : { backgroundColor: '#e2e8f0', color: '#334155' };

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
            <View style={[styles.leadScoreBadge, { backgroundColor: leadScoreTone.backgroundColor }]}>
              <Text style={[styles.leadScoreBadgeText, { color: leadScoreTone.color }]}>{leadScore}</Text>
            </View>
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
              needsPartnership ? styles.untappedStatus : styles.partneredStatus
            ]}>
              {item.partnershipStatus === 'pending'
                ? 'PARTNERSHIP IN REVIEW'
                : item.partnershipStatus === 'rejected'
                  ? 'RE-ENGAGEMENT OPPORTUNITY'
                  : isUntapped
                    ? 'PARTNERSHIP OPPORTUNITY'
                    : `Partner: ${item.ticketingProvider || 'Unknown'}`}
            </Text>
          </View>

          {showTicketIntel && (
            <View style={styles.ticketIntelInline}>
              <View style={styles.ticketIntelInlineTop}>
                <View style={[styles.scrapeStatusBadge, { backgroundColor: scrapeStatus.backgroundColor }]}>
                  <Text style={[styles.scrapeStatusBadgeText, { color: scrapeStatus.color }]}>
                    {getScrapeStatusLabel(ticketIntel.liveStatus)}
                  </Text>
                </View>
                <Text style={styles.ticketIntelInlineSource} numberOfLines={1}>
                  {ticketIntel.sourceLabel}
                </Text>
              </View>
              <Text style={styles.ticketIntelInlineText} numberOfLines={1}>
                {ticketIntel.priceSummary}
              </Text>
              <Text style={styles.ticketIntelInlineMeta} numberOfLines={1}>
                {ticketIntel.totalTypes || 1} ticket types
                {ticketIntel.inventoryLabel !== 'Inventory not visible' ? ` | ${ticketIntel.inventoryLabel}` : ''}
              </Text>
            </View>
          )}

          {/* Quick Stats */}
          {showTicketIntel ? (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="people" size={16} color="#000" />
                <Text style={styles.statValue}>
                  {item.capacity ? item.capacity.toLocaleString() : 'Open'}
                </Text>
                <Text style={styles.statLabel}>Capacity</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Ionicons name="pricetag" size={16} color="#2563eb" />
                <Text style={[styles.statValue, styles.statValueCompact]} numberOfLines={2}>
                  {ticketIntel.priceSummary}
                </Text>
                <Text style={styles.statLabel}>Price band</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Ionicons name="layers-outline" size={16} color="#0f766e" />
                <Text style={styles.statValue}>{ticketIntel.totalTypes || 1}</Text>
                <Text style={styles.statLabel}>Ticket types</Text>
              </View>
            </View>
          ) : item.capacity ? (
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
            ) : null}

          <View style={styles.cardInsightPanel}>
            <View style={styles.cardInsightHeader}>
              <Text style={styles.cardInsightEyebrow}>Recommended next move</Text>
              <Text style={styles.cardInsightConfidence}>Score {leadScore}/100</Text>
            </View>
            <Text style={styles.cardStrategyHint}>{recommendedNextAction}</Text>
            <Text style={styles.cardInsightSecondary}>
              {partnershipInfo.estimatedRevenue}. {revenueAngle}
            </Text>
          </View>

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
              Open Workspace
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>

          {!isArchived ? (
            <TouchableOpacity 
              style={styles.markReadButton}
              onPress={() => markAsRead(item.id)}
            >
              <Ionicons name="checkmark" size={16} color="#64748b" />
              <Text style={styles.markReadText}>Archive</Text>
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

  const calculateLeadScore = (event) => {
    const ticketIntel = getPlannerTicketIntel(event);
    let score = 0;

    if (!hasActivePartnership(event)) score += 20;
    if (ticketIntel.hasTicketSignal) score += 25;
    if (event?.contactEmail) score += 12;
    if (event?.contactPhone) score += 10;
    if (event?.capacity) {
      const capacity = Number(event.capacity) || 0;
      if (capacity >= 5000) score += 18;
      else if (capacity >= 1000) score += 12;
      else if (capacity > 0) score += 6;
    }

    if (event?.startDate) {
      const daysOut = Math.ceil((new Date(event.startDate).getTime() - Date.now()) / 86400000);
      if (daysOut >= 7 && daysOut <= 90) score += 15;
      else if (daysOut > 90) score += 8;
      else if (daysOut > 0) score += 4;
    }

    return Math.min(Math.max(Math.round(score), 0), 100);
  };

  const matchesSignalFilter = (event) => {
    const ticketIntel = getPlannerTicketIntel(event);

    if (selectedSignalFilter === 'live-tickets') {
      return ticketIntel.hasTicketSignal;
    }

    if (selectedSignalFilter === 'contact-ready') {
      return Boolean(event?.contactEmail || event?.contactPhone);
    }

    if (selectedSignalFilter === 'high-priority') {
      return calculateLeadScore(event) >= 70;
    }

    return true;
  };

  const mergePlannerEvent = (updatedEvent) => {
    if (!updatedEvent?.id) return;

    setEvents((prev) => prev.map((event) => (event.id === updatedEvent.id ? { ...event, ...updatedEvent } : event)));
    setArchivedEvents((prev) => prev.map((event) => (event.id === updatedEvent.id ? { ...event, ...updatedEvent } : event)));
    setSelectedEvent((prev) => (prev?.id === updatedEvent.id ? { ...prev, ...updatedEvent } : prev));
  };

  const fetchLiveEventDetails = async (eventId, { force = false } = {}) => {
    if (!eventId) return;

    try {
      setLiveRefreshingEventId(eventId);
      const response = await axios.get(
        `${getApiBaseUrl()}/event-planner/events/${eventId}?live=true${force ? '&force=true' : ''}`,
        {
          headers: getAuthHeader(),
          timeout: 15000,
        }
      );

      const liveEvent = response?.data?.event || response?.data;
      if (liveEvent) {
        mergePlannerEvent(liveEvent);
      }
    } catch (error) {
      console.error('Failed to refresh live planner event details:', error?.response?.data || error?.message || error);
    } finally {
      setLiveRefreshingEventId(null);
    }
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
  const plannerGridColumns = viewportWidth >= 1100 ? 2 : 1;
  const highPriorityCount = events.filter((event) => calculateLeadScore(event) >= 70).length;
  const contactReadyCount = events.filter((event) => Boolean(event?.contactEmail || event?.contactPhone)).length;
  const liveSignalCount = events.filter((event) => getPlannerTicketIntel(event).hasTicketSignal).length;
  const averageLeadScore = totalActiveCount
    ? Math.round(events.reduce((sum, event) => sum + calculateLeadScore(event), 0) / totalActiveCount)
    : 0;
  const activeFilterCount = [
    Boolean(searchQuery),
    selectedCategory !== 'all',
    selectedPartnershipStatus !== 'all',
    selectedSignalFilter !== 'all',
    sortBy !== 'lead-score',
  ].filter(Boolean).length;
  const categoryOptions = ['all', ...categories];
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'untapped', label: 'Untapped' },
    { value: 'pending', label: 'Pending' },
    { value: 'partnered', label: 'Partnered' },
    { value: 'rejected', label: 'Rejected' },
  ];
  const sortOptions = [
    { value: 'lead-score', label: 'Lead Score (High-Low)' },
    { value: 'lead-score-asc', label: 'Lead Score (Low-High)' },
    { value: 'date', label: 'Date (Oldest)' },
    { value: 'date-desc', label: 'Date (Newest)' },
    { value: 'province', label: 'Province (A-Z)' },
    { value: 'province-desc', label: 'Province (Z-A)' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
  ];
  const selectedStatusLabel =
    statusOptions.find((option) => option.value === selectedPartnershipStatus)?.label || 'All Status';
  const selectedSortLabel =
    sortOptions.find((option) => option.value === sortBy)?.label || 'Lead Score (High-Low)';

  const displayEvents = [...(activeTab === 'active' ? events : archivedEvents)]
    .filter(matchesSignalFilter)
    .sort((a, b) => {
      if (sortBy === 'lead-score') {
        return calculateLeadScore(b) - calculateLeadScore(a);
      }

      if (sortBy === 'lead-score-asc') {
        return calculateLeadScore(a) - calculateLeadScore(b);
      }

      return 0;
    });
  const visibleLeadCount = displayEvents.length;
  const currentTabLabel = activeTab === 'active' ? 'Active partnership pipeline' : 'Archive ledger';
  const currentTabHelper =
    activeTab === 'active'
      ? `${visibleLeadCount} qualified leads in focus`
      : `${visibleLeadCount} archived opportunities retained for follow-up`;

  const renderInlineDropdownMenus = () => {
    if (!showCategoryDropdown && !showStatusDropdown && !showSortDropdown) {
      return null;
    }

    return (
      <View style={styles.dropdownInlinePanel}>
        {showCategoryDropdown && (
          <View style={styles.dropdownInlineColumn}>
            <Text style={styles.dropdownInlineTitle}>Category</Text>
            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
              {categoryOptions.map((category) => {
                const optionValue = category === 'all' ? 'all' : category;
                const isSelected = selectedCategory === optionValue;
                return (
                  <TouchableOpacity
                    key={`category-${optionValue}`}
                    style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                    onPress={() => {
                      setSelectedCategory(optionValue);
                      setShowCategoryDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                      {category === 'all' ? 'All Categories' : category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {showStatusDropdown && (
          <View style={styles.dropdownInlineColumn}>
            <Text style={styles.dropdownInlineTitle}>Status</Text>
            {statusOptions.map((option) => {
              const isSelected = selectedPartnershipStatus === option.value;
              return (
                <TouchableOpacity
                  key={`status-${option.value}`}
                  style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                  onPress={() => {
                    setSelectedPartnershipStatus(option.value);
                    setShowStatusDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {showSortDropdown && (
          <View style={styles.dropdownInlineColumn}>
            <Text style={styles.dropdownInlineTitle}>Sort Priority</Text>
            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
              {sortOptions.map((option) => {
                const isSelected = sortBy === option.value;
                return (
                  <TouchableOpacity
                    key={`sort-${option.value}`}
                    style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                    onPress={() => {
                      setSortBy(option.value);
                      setShowSortDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const plannerListHeader = (
    <View style={styles.header}>
      <View style={styles.heroPanel}>
        <View style={styles.heroGlowPrimary} />
        <View style={styles.heroGlowSecondary} />
        <View style={styles.heroContent}>
          <View style={styles.heroPrimaryColumn}>
            <View style={styles.heroEyebrowRow}>
              <View style={styles.heroEyebrowBadge}>
                <Text style={styles.heroEyebrowBadgeText}>Planner Workspace</Text>
              </View>
              <Text style={styles.heroEyebrowText}>
                Commercial prospecting and organizer outreach intelligence
              </Text>
            </View>
            <Text style={styles.heroTitle}>Event Partnership Leads</Text>
            <Text style={styles.heroDescription}>
              Run a cleaner enterprise pipeline for partnership discovery, live ticket
              signal review, and outreach preparation across untapped events.
            </Text>
            <View style={styles.heroActionRow}>
              <TouchableOpacity style={styles.heroRefreshButton} onPress={onRefresh}>
                <Ionicons name="refresh" size={18} color="#e2e8f0" />
                <Text style={styles.heroRefreshButtonText}>Refresh pipeline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={startAddingEvent}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addButtonText}>Add Strategic Lead</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaPill}>
                <Ionicons name="layers-outline" size={14} color="#e2e8f0" />
                <Text style={styles.heroMetaPillText}>{currentTabLabel}</Text>
              </View>
              <View style={styles.heroMetaPill}>
                <Ionicons name="filter-outline" size={14} color="#e2e8f0" />
                <Text style={styles.heroMetaPillText}>
                  {activeFilterCount > 0 ? `${activeFilterCount} filters active` : 'Default filter stack'}
                </Text>
              </View>
              <View style={styles.heroMetaPill}>
                <Ionicons name="sparkles-outline" size={14} color="#e2e8f0" />
                <Text style={styles.heroMetaPillText}>Avg score {averageLeadScore}</Text>
              </View>
            </View>
          </View>
          <View style={styles.heroStatsGrid}>
            <View style={[styles.statCard, styles.statCardPrimary]}>
              <View style={styles.statCardIconWrap}>
                <Ionicons name="briefcase-outline" size={18} color="#dbeafe" />
              </View>
              <Text style={[styles.statCardValue, styles.statCardValueLight]}>{totalActiveCount}</Text>
              <Text style={[styles.statCardLabel, styles.statCardLabelLight]}>Active leads</Text>
              <Text style={styles.statCardSubtext}>
                Open partnership opportunities currently under review.
              </Text>
            </View>
            <View style={[styles.statCard, styles.statCardBlue]}>
              <View style={styles.statCardIconWrapLight}>
                <Ionicons name="flash-outline" size={18} color="#2563eb" />
              </View>
              <Text style={styles.statCardValue}>{highPriorityCount}</Text>
              <Text style={styles.statCardLabel}>High priority</Text>
              <Text style={styles.statCardSubtext}>
                Leads scoring 70+ and ready for faster action.
              </Text>
            </View>
            <View style={[styles.statCard, styles.statCardGreen]}>
              <View style={styles.statCardIconWrapLight}>
                <Ionicons name="mail-open-outline" size={18} color="#047857" />
              </View>
              <Text style={styles.statCardValue}>{contactReadyCount}</Text>
              <Text style={styles.statCardLabel}>Contact ready</Text>
              <Text style={styles.statCardSubtext}>
                Organizers with direct email or WhatsApp details available.
              </Text>
            </View>
            <View style={[styles.statCard, styles.statCardAmber]}>
              <View style={styles.statCardIconWrapLight}>
                <Ionicons name="trending-up-outline" size={18} color="#b45309" />
              </View>
              <Text style={styles.statCardValue}>{liveSignalCount}</Text>
              <Text style={styles.statCardLabel}>Ticket signal</Text>
              <Text style={styles.statCardSubtext}>
                Leads with pricing or ticket inventory intelligence attached.
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.workspacePanel}>
        <View style={styles.workspaceHeaderRow}>
          <View style={styles.searchPanelHeader}>
            <Text style={styles.searchPanelTitle}>Pipeline Controls</Text>
            <Text style={styles.searchPanelSubtitle}>
              Search, segment, and rank opportunities by category, partnership status,
              and visible ticket demand.
            </Text>
          </View>
          {activeFilterCount > 0 && (
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search events, venues, organizers..."
              placeholderTextColor="#94a3b8"
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
              <Text style={styles.filterLabel}>Category</Text>
              <TouchableOpacity
                style={[styles.dropdownButton, showCategoryDropdown && styles.dropdownButtonActive]}
                onPress={() => {
                  setShowCategoryDropdown(!showCategoryDropdown);
                  setShowStatusDropdown(false);
                  setShowSortDropdown(false);
                }}
              >
                <Text style={styles.dropdownButtonText}>
                  {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
                </Text>
                <Ionicons name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Status</Text>
              <TouchableOpacity
                style={[styles.dropdownButton, showStatusDropdown && styles.dropdownButtonActive]}
                onPress={() => {
                  setShowStatusDropdown(!showStatusDropdown);
                  setShowCategoryDropdown(false);
                  setShowSortDropdown(false);
                }}
              >
                <Text style={styles.dropdownButtonText}>{selectedStatusLabel}</Text>
                <Ionicons name={showStatusDropdown ? 'chevron-up' : 'chevron-down'} size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Sort by</Text>
              <TouchableOpacity
                style={[styles.dropdownButton, showSortDropdown && styles.dropdownButtonActive]}
                onPress={() => {
                  setShowSortDropdown(!showSortDropdown);
                  setShowCategoryDropdown(false);
                  setShowStatusDropdown(false);
                }}
              >
                <Text style={styles.dropdownButtonText}>{selectedSortLabel}</Text>
                <Ionicons name={showSortDropdown ? 'chevron-up' : 'chevron-down'} size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          {renderInlineDropdownMenus()}

          <View style={styles.signalFilterRow}>
            {[
              { value: 'all', label: 'All leads' },
              { value: 'live-tickets', label: 'Live ticket signal' },
              { value: 'contact-ready', label: 'Contact ready' },
              { value: 'high-priority', label: 'High priority' },
            ].map((filterOption) => (
              <TouchableOpacity
                key={filterOption.value}
                style={[
                  styles.signalFilterChip,
                  selectedSignalFilter === filterOption.value && styles.signalFilterChipActive,
                ]}
                onPress={() => setSelectedSignalFilter(filterOption.value)}
              >
                <Text
                  style={[
                    styles.signalFilterChipText,
                    selectedSignalFilter === filterOption.value && styles.signalFilterChipTextActive,
                  ]}
                >
                  {filterOption.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.pipelineToolbar}>
            <View style={styles.resultsSummary}>
              <Text style={styles.resultsSummaryEyebrow}>{currentTabLabel}</Text>
              <Text style={styles.resultsSummaryTitle}>{currentTabHelper}</Text>
              <Text style={styles.resultsSummaryText}>
                {activeFilterCount > 0
                  ? `${activeFilterCount} active filters shaping the current view.`
                  : `Sorted by ${selectedSortLabel.toLowerCase()} with live signal prioritization available.`}
              </Text>
            </View>

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
        </View>
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <FlatList
        style={styles.eventList}
        key={`planner-grid-${plannerGridColumns}`}
        data={displayEvents}
        renderItem={({ item }) => renderEventCard({ item, isArchived: activeTab === 'archived' })}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        numColumns={plannerGridColumns}
        ListHeaderComponent={plannerListHeader}
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
                ? searchQuery || selectedCategory !== 'all' || selectedPartnershipStatus !== 'all' || selectedSignalFilter !== 'all'
                  ? 'Try adjusting your search filters'
                  : 'All leads have been archived or no events available'
                : 'Archived events will appear here when you mark events as read'
              }
            </Text>
            {(searchQuery || selectedCategory !== 'all' || selectedPartnershipStatus !== 'all' || selectedSignalFilter !== 'all') && (
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
        onRefreshLive={() => {
          if (selectedEvent) {
            fetchLiveEventDetails(selectedEvent.id, { force: true });
          }
        }}
        refreshingLive={selectedEvent ? liveRefreshingEventId === selectedEvent.id : false}
      />

      <AddEventModal />
      
      <DeleteConfirmationModal />
      
      <SuccessModal />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    gap: 16,
  },
  heroPanel: {
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 28,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 10,
  },
  heroContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  heroPrimaryColumn: {
    flex: 1.4,
    minWidth: 320,
  },
  heroGlowPrimary: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(59, 130, 246, 0.20)',
    top: -70,
    right: -40,
  },
  heroGlowSecondary: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    bottom: -100,
    left: -40,
  },
  heroEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  heroEyebrowBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(59, 130, 246, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.30)',
  },
  heroEyebrowBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#dbeafe',
  },
  heroEyebrowText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.8,
  },
  heroDescription: {
    marginTop: 12,
    maxWidth: 760,
    fontSize: 15,
    lineHeight: 24,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 14,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroActionRow: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroRefreshButton: {
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.28)',
    backgroundColor: 'rgba(15, 23, 42, 0.34)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroRefreshButtonText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  refreshButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  refreshButtonText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  heroMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.20)',
  },
  heroMetaPillText: {
    fontSize: 12,
    color: '#e2e8f0',
    fontWeight: '700',
  },
  heroStatsGrid: {
    flex: 1,
    minWidth: 300,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statsCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingBottom: 6,
    gap: 4,
  },
  statCard: {
    flex: 1,
    minWidth: 148,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  statCardPrimary: {
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  statCardBlue: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  statCardGreen: {
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
  },
  statCardAmber: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  statCardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  statCardIconWrapLight: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ffffffcc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  statCardValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  statCardValueLight: {
    color: '#f8fafc',
  },
  statCardLabel: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600',
  },
  statCardLabelLight: {
    color: '#cbd5e1',
  },
  statCardSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
    lineHeight: 18,
  },
  searchContainer: {
    marginHorizontal: 0,
    marginBottom: 0,
    padding: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  workspacePanel: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4f3',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.08,
    shadowRadius: 26,
    elevation: 4,
  },
  workspaceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  searchPanelHeader: {
    marginBottom: 0,
    flex: 1,
    minWidth: 260,
  },
  searchPanelTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  searchPanelSubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    fontSize: 13,
    color: '#1e293b',
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 12,
  },
  signalFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  signalFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  signalFilterChipActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },
  signalFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  signalFilterChipTextActive: {
    color: '#1d4ed8',
  },
  filterGroup: {
    minWidth: 180,
    flexGrow: 1,
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 8,
    minWidth: 118,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dropdownButtonActive: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  dropdownButtonText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
    flex: 1,
  },
  dropdownInlinePanel: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dropdownInlineColumn: {
    flexGrow: 1,
    minWidth: 220,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  dropdownInlineTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  dropdownItemSelected: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  dropdownItemTextSelected: {
    color: '#1d4ed8',
  },
  clearFiltersButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  clearFiltersText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 6,
  },
  tabButton: {
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#111827',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#fff',
  },
  pipelineToolbar: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  resultsSummary: {
    flex: 1,
    minWidth: 260,
  },
  resultsSummaryEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  resultsSummaryTitle: {
    marginTop: 6,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: '#0f172a',
  },
  resultsSummaryText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748b',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 28,
  },
  eventList: {
    flex: 1,
  },
  eventCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    margin: 6,
    padding: 16,
    minHeight: 340,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#dbe4f3',
  },
  cardAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  cardAccentLead: {
    backgroundColor: '#3b82f6',
  },
  cardAccentPartnered: {
    backgroundColor: '#10b981',
  },
  cardAccentArchived: {
    backgroundColor: '#64748b',
  },
  cardAccentSignal: {
    backgroundColor: '#2563eb',
  },
  eventContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
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
    backgroundColor: '#f8fafc',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 999,
  },
  eventTypeText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  leadScoreBadge: {
    minWidth: 34,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadScoreBadgeText: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '800',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  eventName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
    lineHeight: 22,
  },
  eventDetails: {
    marginBottom: 10,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 20,
  },
  detailText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  partnershipSection: {
    marginBottom: 8,
  },
  partnershipStatus: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  untappedStatus: {
    color: '#1d4ed8',
  },
  partneredStatus: {
    color: '#10b981',
  },
  ticketIntelInline: {
    gap: 6,
    marginBottom: 6,
    backgroundColor: '#f8fbff',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 7,
  },
  ticketIntelInlineTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketIntelInlineSource: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  ticketIntelInlineText: {
    fontSize: 11,
    color: '#1e3a8a',
    fontWeight: '600',
  },
  ticketIntelInlineMeta: {
    fontSize: 10,
    color: '#475569',
  },
  cardStrategyHint: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: '#0f172a',
    fontWeight: '700',
  },
  cardInsightPanel: {
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#f8fbff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 12,
  },
  cardInsightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  cardInsightEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1d4ed8',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  cardInsightConfidence: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  cardInsightSecondary: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 17,
    color: '#475569',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 3,
  },
  statValueCompact: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 16,
  },
  statLabel: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 8,
  },
  ticketIntelBanner: {
    backgroundColor: '#f8fbff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 14,
    marginBottom: 12,
  },
  ticketIntelBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  ticketIntelEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  ticketIntelBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  ticketIntelBannerText: {
    fontSize: 12,
    color: '#1e3a8a',
    lineHeight: 18,
  },
  ticketIntelBannerMeta: {
    marginTop: 6,
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  ticketIntelPill: {
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ticketIntelPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  ticketIntelBannerBadgeStack: {
    alignItems: 'flex-end',
    gap: 6,
  },
  scrapeStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  scrapeStatusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
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
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  viewButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  markReadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  markReadText: {
    color: '#64748b',
    fontSize: 11,
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
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  restoreText: {
    color: '#10b981',
    fontSize: 11,
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
    borderRadius: 14,
    width: '100%',
    maxWidth: 740,
    maxHeight: '86%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  modalHeaderLeft: {
    flex: 1,
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  modalBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  modalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  modalBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  archivedModalBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#64748b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  archivedModalBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalArchiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalArchiveText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  modalRestoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.30)',
  },
  modalRestoreText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  modalScroll: {
    flex: 1,
    padding: 14,
    backgroundColor: '#fff',
  },
  modalSection: {
    marginBottom: 14,
  },
  ticketIntelSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  ticketIntelSectionBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ticketIntelSectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
    letterSpacing: 0.6,
  },
  ticketIntelPanel: {
    backgroundColor: '#f8fbff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 10,
    padding: 10,
  },
  ticketIntelPanelIntro: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 10,
  },
  ticketIntelSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ticketIntelSummaryCard: {
    flexGrow: 1,
    minWidth: 130,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ticketIntelSummaryLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 6,
  },
  ticketIntelSummaryValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
    lineHeight: 18,
  },
  ticketTypeGroup: {
    marginTop: 12,
  },
  ticketTypeGroupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  ticketTypeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ticketTypeChip: {
    minWidth: 130,
    flexGrow: 1,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  ticketTypeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  ticketTypeMeta: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  scrapeDiagnosticsPanel: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    gap: 8,
  },
  scrapeDiagnosticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  scrapeDiagnosticsLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  scrapeDiagnosticsValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
  },
  scrapeDiagnosticsError: {
    fontSize: 12,
    color: '#b45309',
    lineHeight: 18,
  },
  analystPanel: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  analystScoreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  analystScoreCard: {
    flexGrow: 1,
    minWidth: 180,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  analystCardLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 6,
  },
  analystScoreValue: {
    fontSize: 24,
    color: '#0f172a',
    fontWeight: '800',
  },
  analystCardValue: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
    fontWeight: '600',
  },
  analystChecklist: {
    gap: 10,
  },
  analystChecklistItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  analystNarrative: {
    marginTop: 14,
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 10,
  },
  detailGrid: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 36,
  },
  detailIcon: {
    width: 36,
    height: 36,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 18,
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
    gap: 10,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    gap: 12,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
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
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  contactUnavailable: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  modalActions: {
    gap: 10,
    marginTop: 8,
  },
  secondaryModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  secondaryModalButtonText: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  primaryModalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tertiaryModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  tertiaryModalButtonText: {
    color: '#64748b',
    fontSize: 14,
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


