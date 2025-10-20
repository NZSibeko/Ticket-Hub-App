import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:3000';

const EventManagementScreen = ({ navigation }) => {
  const { getAuthHeader } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const headers = getAuthHeader();
      const response = await axios.get(`${API_URL}/api/admin/events`, { headers });
      setEvents(response.data.events);
    } catch (error) {
      console.error('Error fetching events:', error);
      // Mock data for demo
      setEvents([
        {
          id: 1,
          name: 'Summer Music Festival',
          date: '2024-12-25T18:00:00Z',
          location: 'Cape Town Stadium',
          status: 'active',
          ticketsSold: 850,
          totalTickets: 1200,
          revenue: 127500
        },
        {
          id: 2,
          name: 'Tech Conference 2024',
          date: '2024-11-15T09:00:00Z',
          location: 'Sandton Convention Centre',
          status: 'active',
          ticketsSold: 320,
          totalTickets: 1000,
          revenue: 64000
        },
        {
          id: 3,
          name: 'Jazz Night Under Stars',
          date: '2024-11-08T19:30:00Z',
          location: 'Riverside Amphitheater',
          status: 'draft',
          ticketsSold: 0,
          totalTickets: 300,
          revenue: 0
        },
        {
          id: 4,
          name: 'Food & Wine Expo',
          date: '2024-11-28T11:00:00Z',
          location: 'CTICC',
          status: 'active',
          ticketsSold: 280,
          totalTickets: 800,
          revenue: 70000
        },
        {
          id: 5,
          name: 'Comedy Night Special',
          date: '2024-12-05T20:00:00Z',
          location: 'Baxter Theatre',
          status: 'cancelled',
          ticketsSold: 95,
          totalTickets: 150,
          revenue: 11400
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || event.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleEditEvent = (eventId) => {
    Alert.alert('Edit Event', `Edit event ${eventId}`);
  };

  const handleViewStats = (eventId) => {
    Alert.alert('Event Stats', `View stats for event ${eventId}`);
  };

  const handleDeleteEvent = (eventId) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setEvents(events.filter(event => event.id !== eventId));
            Alert.alert('Success', 'Event deleted successfully');
          }
        }
      ]
    );
  };

  const EventCard = ({ event }) => (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <Text style={styles.eventName}>{event.name}</Text>
        <View style={[styles.statusBadge, 
          event.status === 'active' ? styles.statusActive : 
          event.status === 'draft' ? styles.statusDraft : 
          styles.statusCancelled
        ]}>
          <Text style={styles.statusText}>{event.status}</Text>
        </View>
      </View>
      
      <View style={styles.eventDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location" size={16} color="#64748b" />
          <Text style={styles.detailText}>{event.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#64748b" />
          <Text style={styles.detailText}>
            {new Date(event.date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="ticket" size={16} color="#64748b" />
          <Text style={styles.detailText}>
            {event.ticketsSold} / {event.totalTickets} tickets sold
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash" size={16} color="#64748b" />
          <Text style={styles.detailText}>
            R{event.revenue.toLocaleString()} revenue
          </Text>
        </View>
      </View>

      <View style={styles.eventActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleEditEvent(event.id)}
        >
          <Ionicons name="pencil" size={16} color="#6366f1" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleViewStats(event.id)}
        >
          <Ionicons name="analytics" size={16} color="#10b981" />
          <Text style={styles.actionText}>Stats</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteEvent(event.id)}
        >
          <Ionicons name="trash" size={16} color="#ef4444" />
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Events</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateEvent')}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <View style={styles.filterContainer}>
          {['all', 'active', 'draft', 'cancelled'].map((filterType) => (
            <TouchableOpacity
              key={filterType}
              style={[styles.filterButton, filter === filterType && styles.filterButtonActive]}
              onPress={() => setFilter(filterType)}
            >
              <Text style={[styles.filterText, filter === filterType && styles.filterTextActive]}>
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        renderItem={({ item }) => <EventCard event={item} />}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.eventsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#e2e8f0" />
            <Text style={styles.emptyStateText}>No events found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Create your first event to get started'}
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  createButton: {
    backgroundColor: '#6366f1',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  eventsList: {
    padding: 16,
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#10b98120',
  },
  statusDraft: {
    backgroundColor: '#f59e0b20',
  },
  statusCancelled: {
    backgroundColor: '#ef444420',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  eventDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#64748b',
  },
  eventActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    gap: 4,
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6366f1',
  },
  deleteText: {
    color: '#ef4444',
  },
});

export default EventManagementScreen;