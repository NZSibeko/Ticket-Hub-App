import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const API_URL = 'http://localhost:3000';

// Image pool for different event types
const eventImages = {
  music: [
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400',
    'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400',
    'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
    'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=400',
    'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400'
  ],
  sports: [
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400',
    'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=400',
    'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400',
    'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=400'
  ],
  arts: [
    'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=400',
    'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400',
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400',
    'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=400'
  ],
  general: [
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400',
    'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=400',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400',
    'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400',
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400'
  ]
};

const HomeScreen = ({ navigation }) => {
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    location: '',
    sortBy: 'date'
  });
  const { getAuthHeader } = useAuth();

  useEffect(() => {
    fetchEvents();
  }, []);

  const getEventImage = (event, index) => {
    if (event.image_url) return event.image_url;

    const eventName = event.event_name.toLowerCase();
    const description = (event.event_description || '').toLowerCase();

    if (eventName.includes('concert') || eventName.includes('music') || description.includes('music')) {
      return eventImages.music[index % eventImages.music.length];
    } else if (eventName.includes('sport') || eventName.includes('game') || eventName.includes('match')) {
      return eventImages.sports[index % eventImages.sports.length];
    } else if (eventName.includes('art') || eventName.includes('exhibition') || eventName.includes('theatre')) {
      return eventImages.arts[index % eventImages.arts.length];
    } else {
      return eventImages.general[index % eventImages.general.length];
    }
  };

  const fetchEvents = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await axios.get(`${API_URL}/zi_events`, { headers });
      const events = response.data.d.results.filter(e => e.event_status === 'VALIDATED');
      setAllEvents(events);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (events) => {
    let filtered = [...events];

    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.minPrice) {
      filtered = filtered.filter(event => {
        const minTicketPrice = Math.min(...event.ticket_types.map(t => t.price));
        return minTicketPrice >= parseFloat(filters.minPrice);
      });
    }
    if (filters.maxPrice) {
      filtered = filtered.filter(event => {
        const maxTicketPrice = Math.max(...event.ticket_types.map(t => t.price));
        return maxTicketPrice <= parseFloat(filters.maxPrice);
      });
    }

    if (filters.location) {
      filtered = filtered.filter(event =>
        event.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    switch (filters.sortBy) {
      case 'date':
        filtered.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        break;
      case 'price':
        filtered.sort((a, b) => {
          const aMinPrice = Math.min(...a.ticket_types.map(t => t.price));
          const bMinPrice = Math.min(...b.ticket_types.map(t => t.price));
          return aMinPrice - bMinPrice;
        });
        break;
      case 'name':
        filtered.sort((a, b) => a.event_name.localeCompare(b.event_name));
        break;
    }

    return filtered;
  };

  const clearFilters = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      location: '',
      sortBy: 'date'
    });
    setSearchQuery('');
  };

  const categorizeEvents = () => {
    const filteredEvents = applyFilters(allEvents);
    
    return {
      featured: filteredEvents.slice(0, 6),
      music: filteredEvents.filter(e => 
        e.event_name.toLowerCase().includes('concert') ||
        e.event_name.toLowerCase().includes('music') ||
        e.event_name.toLowerCase().includes('festival') ||
        e.event_description?.toLowerCase().includes('music')
      ).slice(0, 6),
      all: filteredEvents
    };
  };

  const EventCard = ({ event, index, horizontal = false }) => (
    <TouchableOpacity
      style={[styles.eventCard, horizontal && styles.horizontalCard]}
      onPress={() => navigation.navigate('EventDetail', { eventId: event.event_id })}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: getEventImage(event, index) }}
          style={styles.eventImage}
          resizeMode="cover"
        />
        <View style={styles.ticketTypesTag}>
          <Text style={styles.ticketTypesText}>
            {event.ticket_types?.length || 1} ticket options
          </Text>
        </View>
      </View>
      
      <View style={styles.eventInfo}>
        <Text style={styles.eventName} numberOfLines={2}>{event.event_name}</Text>
        
        <View style={styles.eventMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text style={styles.metaText}>
              {new Date(event.start_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </Text>
          </View>
          
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.metaText} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        </View>
        
        <View style={styles.attendeesBar}>
          <View style={[styles.attendeesProgress, { 
            width: `${Math.min((event.current_attendees / event.max_attendees) * 100, 100)}%` 
          }]} />
        </View>
        <Text style={styles.attendeesText}>
          {event.current_attendees}/{event.max_attendees} attending
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ticket-hub</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </View>
    );
  }

  const categories = categorizeEvents();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ticket-hub</Text>
      </View>

      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="options" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Featured Events Slider */}
        {categories.featured.length > 0 && (
          <View style={styles.categorySection}>
            <Text style={styles.categoryTitle}>Featured Events</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
              snapToInterval={width * 0.75 + 16}
              decelerationRate="fast"
            >
              {categories.featured.map((event, index) => (
                <EventCard key={event.event_id} event={event} index={index} horizontal />
              ))}
            </ScrollView>
          </View>
        )}

        {/* All Events Grid */}
        {categories.all.length > 0 && (
          <View style={styles.categorySection}>
            <Text style={styles.categoryTitle}>All Events</Text>
            <View style={styles.verticalList}>
              {categories.all.map((event, index) => (
                <EventCard key={event.event_id} event={event} index={index} />
              ))}
            </View>
          </View>
        )}

        {categories.all.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No events available</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Events</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.filterSectionTitle}>Price Range (Rands)</Text>
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Min Price</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={filters.minPrice}
                    onChangeText={(text) => setFilters({...filters, minPrice: text})}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Max Price</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10000"
                    value={filters.maxPrice}
                    onChangeText={(text) => setFilters({...filters, maxPrice: text})}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <Text style={styles.filterSectionTitle}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter location"
                value={filters.location}
                onChangeText={(text) => setFilters({...filters, location: text})}
              />

              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.sortOptions}>
                {[
                  { value: 'date', label: 'Date' },
                  { value: 'price', label: 'Price' },
                  { value: 'name', label: 'Name' }
                ].map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOption,
                      filters.sortBy === option.value && styles.sortOptionSelected
                    ]}
                    onPress={() => setFilters({...filters, sortBy: option.value})}
                  >
                    <Text style={[
                      styles.sortOptionText,
                      filters.sortBy === option.value && styles.sortOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  clearFilters();
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#000',
    paddingTop: 50,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
  },
  filterButton: {
    width: 45,
    height: 45,
    backgroundColor: '#000',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categorySection: {
    marginTop: 24,
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  horizontalScroll: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  verticalList: {
    paddingHorizontal: 20,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  horizontalCard: {
    width: width * 0.75,
    marginRight: 16,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
    backgroundColor: '#e0e0e0',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  ticketTypesTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ticketTypesText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  eventInfo: {
    padding: 16,
  },
  eventName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
    lineHeight: 22,
  },
  eventMeta: {
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    marginLeft: 6,
  },
  attendeesBar: {
    height: 3,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  attendeesProgress: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 2,
  },
  attendeesText: {
    fontSize: 11,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    marginBottom: 12,
  },
  clearFiltersText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  modalBody: {
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    paddingHorizontal: 15,
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    marginBottom: 16,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  sortOption: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  sortOptionSelected: {
    borderColor: '#000',
    backgroundColor: '#f0f0f0',
  },
  sortOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  sortOptionTextSelected: {
    color: '#000',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  clearButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  applyButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;