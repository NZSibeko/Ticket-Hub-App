import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:3000';

const SearchEventsScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    location: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'date' // date, price, name
  });
  const { getAuthHeader } = useAuth();

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filters, events]);

  const fetchEvents = async () => {
    try {
      const headers = getAuthHeader();
      const response = await axios.get(`${API_URL}/zi_events`, { headers });
      setEvents(response.data.d.results);
      setFilteredEvents(response.data.d.results);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...events];

    // Search query filter
    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.event_description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Price range filter
    if (filters.minPrice) {
      filtered = filtered.filter(event => event.price >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      filtered = filtered.filter(event => event.price <= parseFloat(filters.maxPrice));
    }

    // Location filter
    if (filters.location) {
      filtered = filtered.filter(event =>
        event.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(event =>
        new Date(event.start_date) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(event =>
        new Date(event.start_date) <= new Date(filters.dateTo)
      );
    }

    // Sorting
    switch (filters.sortBy) {
      case 'date':
        filtered.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        break;
      case 'price':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'name':
        filtered.sort((a, b) => a.event_name.localeCompare(b.event_name));
        break;
    }

    setFilteredEvents(filtered);
  };

  const clearFilters = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      location: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'date'
    });
    setSearchQuery('');
  };

  const renderEventItem = ({ item }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => navigation.navigate('EventDetail', { eventId: item.event_id })}
    >
      <View style={styles.eventHeader}>
        <Text style={styles.eventName}>{item.event_name}</Text>
        <Text style={styles.eventPrice}>${item.price}</Text>
      </View>
      <Text style={styles.eventDate}>
        {new Date(item.start_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}
      </Text>
      <Text style={styles.eventLocation}>{item.location}</Text>
      <Text style={styles.eventDescription} numberOfLines={2}>
        {item.event_description}
      </Text>
      <View style={styles.eventFooter}>
        <Text style={styles.attendeesText}>
          {item.current_attendees}/{item.max_attendees} attendees
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filteredEvents.length} events found
        </Text>
        {(searchQuery || filters.minPrice || filters.maxPrice || filters.location) && (
          <TouchableOpacity onPress={clearFilters}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEventItem}
        keyExtractor={item => item.event_id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No events match your search</Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <ScrollView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Events</Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <Text style={styles.closeText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterContent}>
            {/* Price Range */}
            <Text style={styles.filterSectionTitle}>Price Range</Text>
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
                  placeholder="1000"
                  value={filters.maxPrice}
                  onChangeText={(text) => setFilters({...filters, maxPrice: text})}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Location */}
            <Text style={styles.filterSectionTitle}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter location"
              value={filters.location}
              onChangeText={(text) => setFilters({...filters, location: text})}
            />

            {/* Date Range */}
            <Text style={styles.filterSectionTitle}>Date Range</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>From Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={filters.dateFrom}
                onChangeText={(text) => setFilters({...filters, dateFrom: text})}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>To Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={filters.dateTo}
                onChangeText={(text) => setFilters({...filters, dateTo: text})}
              />
            </View>

            {/* Sort By */}
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
                  <Text style={styles.sortOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                applyFilters();
                setFilterModalVisible(false);
              }}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearFilters}
            >
              <Text style={styles.clearButtonText}>Clear All Filters</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1,
    height: 45,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  filterButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
  },
  filterButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
  },
  clearText: {
    color: '#6200ee',
    fontWeight: '600',
  },
  listContent: {
    padding: 15,
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  eventPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendeesText: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeText: {
    fontSize: 16,
    color: '#6200ee',
    fontWeight: '600',
  },
  filterContent: {
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  halfInput: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    paddingHorizontal: 15,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  sortOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  sortOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  sortOptionSelected: {
    borderColor: '#6200ee',
    backgroundColor: '#F3E5F5',
  },
  sortOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  applyButton: {
    backgroundColor: '#6200ee',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#6200ee',
  },
  clearButtonText: {
    color: '#6200ee',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SearchEventsScreen;