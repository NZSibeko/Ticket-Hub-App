import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:3000';

const EventManagementScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { getAuthHeader } = useAuth();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const headers = getAuthHeader();
      const response = await axios.get(`${API_URL}/zi_events`, { headers });
      setEvents(response.data.d.results);
    } catch (error) {
      console.error('Error fetching events:', error);
      Alert.alert('Error', 'Failed to load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const handleEdit = (event) => {
    setSelectedEvent(event);
    setEditModalVisible(true);
  };

  const handleDelete = (eventId, eventName) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${eventName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = getAuthHeader();
              await axios.delete(`${API_URL}/api/admin/events/${eventId}`, { headers });
              Alert.alert('Success', 'Event deleted successfully');
              fetchEvents();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete event');
            }
          }
        }
      ]
    );
  };

  const handleUpdateEvent = async () => {
    try {
      const headers = getAuthHeader();
      await axios.put(
        `${API_URL}/api/admin/events/${selectedEvent.event_id}`,
        selectedEvent,
        { headers }
      );
      Alert.alert('Success', 'Event updated successfully');
      setEditModalVisible(false);
      fetchEvents();
    } catch (error) {
      Alert.alert('Error', 'Failed to update event');
    }
  };

  const renderEventItem = ({ item }) => (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <Text style={styles.eventName}>{item.event_name}</Text>
        <View style={[
          styles.statusBadge,
          item.event_status === 'VALIDATED' ? styles.validatedBadge : styles.pendingBadge
        ]}>
          <Text style={styles.statusText}>{item.event_status}</Text>
        </View>
      </View>

      <Text style={styles.eventDescription} numberOfLines={2}>
        {item.event_description}
      </Text>

      <View style={styles.eventDetails}>
        <Text style={styles.detailText}>
          📅 {new Date(item.start_date).toLocaleDateString()}
        </Text>
        <Text style={styles.detailText}>
          📍 {item.location}
        </Text>
        <Text style={styles.detailText}>
          👥 {item.current_attendees}/{item.max_attendees}
        </Text>
        <Text style={styles.detailText}>
          💰 ${item.price}
        </Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(item)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.event_id, item.event_name)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
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
      <FlatList
        data={events}
        renderItem={renderEventItem}
        keyExtractor={item => item.event_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No events found</Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateEvent')}
            >
              <Text style={styles.createButtonText}>Create First Event</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <ScrollView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Event</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {selectedEvent && (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Event Name</Text>
                <TextInput
                  style={styles.input}
                  value={selectedEvent.event_name}
                  onChangeText={(text) => 
                    setSelectedEvent({...selectedEvent, event_name: text})
                  }
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={selectedEvent.event_description}
                  onChangeText={(text) => 
                    setSelectedEvent({...selectedEvent, event_description: text})
                  }
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  value={selectedEvent.location}
                  onChangeText={(text) => 
                    setSelectedEvent({...selectedEvent, location: text})
                  }
                />
              </View>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Max Attendees</Text>
                  <TextInput
                    style={styles.input}
                    value={String(selectedEvent.max_attendees)}
                    onChangeText={(text) => 
                      setSelectedEvent({...selectedEvent, max_attendees: parseInt(text) || 0})
                    }
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Price</Text>
                  <TextInput
                    style={styles.input}
                    value={String(selectedEvent.price)}
                    onChangeText={(text) => 
                      setSelectedEvent({...selectedEvent, price: parseFloat(text) || 0})
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.statusSelector}>
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      selectedEvent.event_status === 'VALIDATED' && styles.statusOptionSelected
                    ]}
                    onPress={() => 
                      setSelectedEvent({...selectedEvent, event_status: 'VALIDATED'})
                    }
                  >
                    <Text style={styles.statusOptionText}>Validated</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      selectedEvent.event_status === 'PENDING' && styles.statusOptionSelected
                    ]}
                    onPress={() => 
                      setSelectedEvent({...selectedEvent, event_status: 'PENDING'})
                    }
                  >
                    <Text style={styles.statusOptionText}>Pending</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateEvent}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </Modal>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateEvent')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
    marginBottom: 10,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  validatedBadge: {
    backgroundColor: '#E8F5E9',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  eventDetails: {
    marginBottom: 15,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  fabText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
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
    fontSize: 24,
    color: '#666',
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 16,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  statusSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  statusOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  statusOptionSelected: {
    borderColor: '#6200ee',
    backgroundColor: '#F3E5F5',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#6200ee',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EventManagementScreen;