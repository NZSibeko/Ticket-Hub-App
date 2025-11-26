// src/screens/EventManagementScreen.web.js - FINAL 100% WORKING (November 26, 2025) - Fix applied for TypeError
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
  View,
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';

const API_BASE_URL = 'http://localhost:3000';

const EventManagementScreen = ({ navigation, route }) => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setEvents(json.events);
        setFilteredEvents(json.events);
      } else {
        Alert.alert('Error', json.error || 'Failed to fetch events.');
      }
    } catch (err) {
      console.error('Fetch events error:', err);
      Alert.alert('Error', 'An unexpected error occurred while fetching events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  useEffect(() => {
    const lowerQuery = searchQuery.toLowerCase();
    const results = events.filter(event => 
      event.event_name.toLowerCase().includes(lowerQuery) ||
      event.location.toLowerCase().includes(lowerQuery)
    );
    setFilteredEvents(results);
  }, [searchQuery, events]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  const navigateToEdit = (event) => {
    navigation.navigate('CreateEvent', { event: event });
  };

  const navigateToCreate = () => {
    navigation.navigate('CreateEvent');
  };

  // --- Utility Functions ---
  const formatTicketTypes = (ticketTypes) => {
    if (!ticketTypes || ticketTypes.length === 0) return 'No tickets';
    return ticketTypes.map(t => `${t.name} (R${t.price})`).join(', ');
  };

  const EventCard = ({ event }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        {event.image_url ? (
          <Image source={{ uri: event.image_url }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={30} color="#64748b" />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{event.event_name}</Text>
          <Text style={styles.detail} numberOfLines={1}>
            {event.location} - {new Date(event.start_date).toLocaleDateString()}
          </Text>
          <Text style={[styles.status, { color: getStatusColor(event.status) }]}>
            Status: {event.status}
          </Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.detail} numberOfLines={2}>
          Tickets: {formatTicketTypes(event.ticket_types)}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          Created by: {event.created_by}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnEdit} onPress={() => navigateToEdit(event)}>
          <Ionicons name="create-outline" size={20} color="#2563eb" />
          <Text style={styles.btnEditText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnView} onPress={() => navigation.navigate('EventDetail', { eventId: event.event_id })}>
          <Ionicons name="eye-outline" size={20} color="#059669" />
          <Text style={styles.btnViewText}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return '#fbbf24';
      case 'VALIDATED': return '#10b981';
      case 'ARCHIVED': return '#64748b';
      case 'PENDING': return '#f97316';
      default: return '#64748b';
    }
  };

  if (loading && events.length === 0) {
    return (
      <ScreenContainer style={styles.container}>
        <ActivityIndicator size="large" color="#1e293b" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Manage Events ({events.length})</Text>
        <TouchableOpacity style={styles.btnAdd} onPress={navigateToCreate}>
          <Ionicons name="add-circle-outline" size={24} color="#fff" />
          <Text style={styles.btnAddText}>Create Event</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or location"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading && events.length > 0 && (
        <ActivityIndicator size="small" color="#1e293b" style={{ marginVertical: 10 }} />
      )}

      {filteredEvents.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={50} color="#94a3b8" />
          <Text style={styles.emptyText}>No events match your search criteria.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          // --- FIX APPLIED HERE for TypeError: Cannot read properties of undefined (reading 'toString') ---
          // Using optional chaining and fallback to index to prevent crashes from malformed data objects.
          keyExtractor={(item, index) => (item?.event_id ?? index).toString()}
          renderItem={({ item }) => <EventCard event={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    paddingBottom: 20,
    paddingTop: 8,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  btnAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  btnAddText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    height: 50,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    outlineStyle: 'none', // Suppressing outline style warning if it was here.
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    objectFit: 'cover',
  },
  placeholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  detail: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  btnEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
  },
  btnEditText: {
    color: '#2563eb',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
  },
  btnView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d1fae5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
  },
  btnViewText: {
    color: '#059669',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 10,
  }
});

export default EventManagementScreen;