import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';

const API_BASE_URL = 'http://localhost:3000';

const EventManagementScreen = ({ navigation, route }) => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    validated: 0,
    pending: 0,
    cancelled: 0
  });

  // Load events on screen focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 EventManagementScreen focused');
      loadEvents();
    }, [])
  );

  // Also listen to route params for refresh
  useEffect(() => {
    if (route.params?.refresh) {
      console.log('🔄 Refresh requested via route params');
      loadEvents();
      // Clear the refresh param after a short delay to show the new event
      setTimeout(() => {
        navigation.setParams({ refresh: undefined });
      }, 3000);
    }
  }, [route.params?.refresh]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Error', 'Please log in to continue');
        return;
      }

      console.log('📡 Fetching events from API...');

      const response = await fetch(`${API_BASE_URL}/api/admin/events`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success && data.events) {
        // Sort events by creation date (newest first)
        const sortedEvents = data.events.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        
        setEvents(sortedEvents);
        setFilteredEvents(sortedEvents);
        
        // Calculate stats
        const statsData = {
          total: sortedEvents.length,
          validated: sortedEvents.filter(e => e.event_status === 'VALIDATED').length,
          pending: sortedEvents.filter(e => e.event_status === 'PENDING').length,
          cancelled: sortedEvents.filter(e => e.event_status === 'CANCELLED').length
        };
        setStats(statsData);
        
        console.log('✅ Loaded events:', sortedEvents.length);
        
        // Highlight new event if coming from create
        if (route.params?.newEventId) {
          console.log('🎉 New event highlighted:', route.params.newEventId);
        }
      } else {
        console.error('Failed to load events:', data.error);
        Alert.alert('Error', data.error || 'Failed to load events');
      }
    } catch (error) {
      console.error('Error loading events:', error);
      Alert.alert('Error', 'Failed to load events. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  // Filter events based on search and status
  const filterEvents = useCallback(() => {
    let filtered = events;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(event => 
        event.event_status?.toLowerCase() === filterStatus.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(event =>
        event.event_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.event_description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredEvents(filtered);
  }, [events, searchQuery, filterStatus]);

  // Apply filters whenever dependencies change
  useEffect(() => {
    filterEvents();
  }, [filterEvents]);

  const updateEventStatus = async (eventId, newStatus) => {
    try {
      const token = await AsyncStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/admin/events/${eventId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', `Event ${newStatus.toLowerCase()} successfully`);
        loadEvents();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error updating event status:', error);
      Alert.alert('Error', 'Failed to update event status');
    }
  };

  const handleStatusChange = (event, newStatus) => {
    Alert.alert(
      'Confirm Status Change',
      `Are you sure you want to ${newStatus.toLowerCase()} this event?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => updateEventStatus(event.event_id, newStatus)
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'VALIDATED': return '#10b981';
      case 'PENDING': return '#f59e0b';
      case 'CANCELLED': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'VALIDATED': return 'checkmark-circle';
      case 'PENDING': return 'time';
      case 'CANCELLED': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const renderEventCard = ({ item }) => {
    const totalCapacity = item.ticket_types?.reduce((sum, t) => sum + t.quantity, 0) || item.max_attendees || 0;
    const soldTickets = item.current_attendees || 0;
    const availableTickets = totalCapacity - soldTickets;
    const isNewEvent = item.event_id === route.params?.newEventId;

    return (
      <View style={[styles.eventCard, isNewEvent && styles.newEventCard]}>
        {/* Event Header */}
        <View style={styles.eventHeader}>
          <View style={styles.eventImageContainer}>
            {item.event_image ? (
              <Image 
                source={{ uri: item.event_image }} 
                style={styles.eventImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="calendar" size={32} color="#cbd5e1" />
              </View>
            )}
          </View>

          <View style={styles.eventHeaderInfo}>
            <View style={styles.eventTitleRow}>
              <Text style={styles.eventName} numberOfLines={2}>
                {item.event_name}
              </Text>
              {isNewEvent && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
            </View>
            
            <View style={styles.statusContainer}>
              <Ionicons 
                name={getStatusIcon(item.event_status)} 
                size={16} 
                color={getStatusColor(item.event_status)} 
              />
              <Text style={[styles.statusText, { color: getStatusColor(item.event_status) }]}>
                {item.event_status || 'PENDING'}
              </Text>
            </View>
          </View>
        </View>

        {/* Event Details */}
        <View style={styles.eventDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location" size={16} color="#64748b" />
            <Text style={styles.detailText} numberOfLines={1}>{item.location}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#64748b" />
            <Text style={styles.detailText}>
              {formatDate(item.start_date)} • {formatTime(item.start_date)}
            </Text>
          </View>

          {item.creator_email && (
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={16} color="#64748b" />
              <Text style={styles.detailText} numberOfLines={1}>
                {item.first_name} {item.last_name}
              </Text>
            </View>
          )}

          {/* Ticket Types */}
          {item.ticket_types && item.ticket_types.length > 0 && (
            <View style={styles.ticketTypesSection}>
              <Text style={styles.ticketTypesLabel}>Ticket Types:</Text>
              <View style={styles.ticketTypesList}>
                {item.ticket_types.map((ticket, index) => (
                  <View key={index} style={styles.ticketTypeBadge}>
                    <Text style={styles.ticketTypeText}>
                      {ticket.type} - R{ticket.price}
                    </Text>
                    <Text style={styles.ticketTypeQuantity}>
                      ({ticket.available_quantity}/{ticket.quantity})
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={20} color="#6366f1" />
              <Text style={styles.statValue}>{soldTickets}/{totalCapacity}</Text>
              <Text style={styles.statLabel}>Sold</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Ionicons name="ticket" size={20} color="#10b981" />
              <Text style={styles.statValue}>{availableTickets}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Ionicons name="cash" size={20} color="#f59e0b" />
              <Text style={styles.statValue}>
                R{((item.ticket_types?.reduce((sum, t) => 
                  sum + (t.price * (t.quantity - t.available_quantity)), 0) || 0)).toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('EventDetail', { eventId: item.event_id })}
          >
            <Ionicons name="eye" size={18} color="#6366f1" />
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>

          {item.event_status === 'PENDING' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleStatusChange(item, 'VALIDATED')}
            >
              <Ionicons name="checkmark" size={18} color="#10b981" />
              <Text style={[styles.actionButtonText, { color: '#10b981' }]}>Approve</Text>
            </TouchableOpacity>
          )}

          {item.event_status === 'VALIDATED' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleStatusChange(item, 'CANCELLED')}
            >
              <Ionicons name="close" size={18} color="#ef4444" />
              <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color="#cbd5e1" />
      <Text style={styles.emptyStateTitle}>No events found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery ? 'Try adjusting your search criteria' : 'Create your first event to get started'}
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateEvent')}
      >
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.createButtonText}>Create Event</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Event Management</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateEvent')}
          >
            <Ionicons name="add-circle" size={28} color="#6366f1" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsCards}>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{stats.total}</Text>
            <Text style={styles.statCardLabel}>Total Events</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statCardValue, { color: '#10b981' }]}>{stats.validated}</Text>
            <Text style={styles.statCardLabel}>Validated</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statCardValue, { color: '#f59e0b' }]}>{stats.pending}</Text>
            <Text style={styles.statCardLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statCardValue, { color: '#ef4444' }]}>{stats.cancelled}</Text>
            <Text style={styles.statCardLabel}>Cancelled</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'all' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'all' && styles.filterButtonTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'validated' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('validated')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'validated' && styles.filterButtonTextActive]}>
              Validated
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'pending' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('pending')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'pending' && styles.filterButtonTextActive]}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterStatus === 'cancelled' && styles.filterButtonActive]}
            onPress={() => setFilterStatus('cancelled')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'cancelled' && styles.filterButtonTextActive]}>
              Cancelled
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Events List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.event_id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6366f1']}
              tintColor="#6366f1"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  addButton: {
    padding: 4,
  },
  statsCards: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366f1',
  },
  statCardLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  filterButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  newEventCard: {
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  eventHeader: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  eventImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventHeaderInfo: {
    flex: 1,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  eventName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  newBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  ticketTypesSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  ticketTypesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  ticketTypesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ticketTypeBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  ticketTypeQuantity: {
    fontSize: 11,
    color: '#64748b',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#f0fdf4',
  },
  cancelButton: {
    backgroundColor: '#fef2f2',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
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
  createButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EventManagementScreen;