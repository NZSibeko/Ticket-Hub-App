// src/screens/EventOrganizerEventsScreen.web.js
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:8081';

const EventOrganizerEventsScreen = ({ navigation }) => {
  const { user, getAuthHeader } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    validated: 0,
    pending: 0,
    draft: 0
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeader();
      
      // Fetch organizer events
      const response = await fetch(`${API_URL}/api/organizer/events`, {
        headers
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEvents(data.events);
        
        // Calculate stats
        const stats = {
          total: data.events.length,
          validated: data.events.filter(e => e.status === 'VALIDATED').length,
          pending: data.events.filter(e => e.status === 'PENDING').length,
          draft: data.events.filter(e => e.status === 'DRAFT').length
        };
        
        setStats(stats);
      } else {
        Alert.alert('Error', data.error || 'Failed to load events');
      }
    } catch (error) {
      console.error('Error loading events:', error);
      Alert.alert('Error', 'Failed to load events');
      
      // Load mock data for demo
      loadMockEvents();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMockEvents = () => {
    const mockEvents = [
      {
        event_id: 1,
        event_name: 'Summer Music Festival',
        location: 'Central Park, NY',
        start_date: '2024-07-15T18:00:00Z',
        status: 'VALIDATED',
        total_tickets: 120,
        checked_in_count: 85,
        total_revenue: 8250
      },
      {
        event_id: 2,
        event_name: 'Tech Conference 2024',
        location: 'Convention Center',
        start_date: '2024-06-22T09:00:00Z',
        status: 'PENDING',
        total_tickets: 0,
        checked_in_count: 0,
        total_revenue: 0
      },
      {
        event_id: 3,
        event_name: 'Food Fair',
        location: 'Downtown Market',
        start_date: '2024-05-18T10:00:00Z',
        status: 'VALIDATED',
        total_tickets: 150,
        checked_in_count: 120,
        total_revenue: 4500
      }
    ];
    
    setEvents(mockEvents);
    
    const stats = {
      total: mockEvents.length,
      validated: mockEvents.filter(e => e.status === 'VALIDATED').length,
      pending: mockEvents.filter(e => e.status === 'PENDING').length,
      draft: mockEvents.filter(e => e.status === 'DRAFT').length
    };
    
    setStats(stats);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const renderEventItem = ({ item }) => {
    const statusColor = {
      'VALIDATED': '#10b981',
      'PENDING': '#f59e0b',
      'DRAFT': '#6b7280',
      'REJECTED': '#ef4444'
    }[item.status] || '#6b7280';

    const statusText = {
      'VALIDATED': 'Approved',
      'PENDING': 'Pending Approval',
      'DRAFT': 'Draft',
      'REJECTED': 'Rejected'
    }[item.status] || item.status;

    return (
      <TouchableOpacity 
        style={styles.eventCard}
        onPress={() => navigation.navigate('EventOrganizerEventDetail', { eventId: item.event_id })}
      >
        <View style={styles.eventHeader}>
          <Text style={styles.eventName}>{item.event_name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
        </View>
        
        <View style={styles.eventDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location" size={16} color="#64748b" />
            <Text style={styles.detailText}>{item.location}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color="#64748b" />
            <Text style={styles.detailText}>
              {new Date(item.start_date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </View>
        
        <View style={styles.eventStats}>
          <View style={styles.statItem}>
            <Ionicons name="ticket" size={16} color="#6366f1" />
            <Text style={styles.statValue}>{item.total_tickets || 0}</Text>
            <Text style={styles.statLabel}>Tickets</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="people" size={16} color="#10b981" />
            <Text style={styles.statValue}>{item.checked_in_count || 0}</Text>
            <Text style={styles.statLabel}>Checked In</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="cash" size={16} color="#f59e0b" />
            <Text style={styles.statValue}>${item.total_revenue || 0}</Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
        </View>
        
        <View style={styles.eventActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('EventOrganizerEventDetail', { eventId: item.event_id })}
          >
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
          
          {item.status === 'DRAFT' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.editButton]}
              onPress={() => navigation.navigate('CreateEventOrganizer', { eventId: item.event_id })}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading your events...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Events</Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateEventOrganizer')}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Create Event</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Events</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#10b981' }]}>{stats.validated}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#6b7280' }]}>{stats.draft}</Text>
            <Text style={styles.statLabel}>Drafts</Text>
          </View>
        </View>

        {/* Events List */}
        <FlatList
          data={events}
          keyExtractor={(item) => item.event_id.toString()}
          renderItem={renderEventItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6366f1']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar" size={64} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Events Yet</Text>
              <Text style={styles.emptyText}>
                Create your first event to get started
              </Text>
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => navigation.navigate('CreateEventOrganizer')}
              >
                <Text style={styles.emptyButtonText}>Create Event</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#64748b',
  },
  eventStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 4,
  },
  eventActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  editButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EventOrganizerEventsScreen;