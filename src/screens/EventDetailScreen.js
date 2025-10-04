import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Image, ActivityIndicator, Alert } from 'react-native';
import ODataService from '../services/ODataService';
import { useAuth } from '../context/AuthContext';

const EventDetailScreen = ({ route, navigation }) => {
  const { eventId } = route.params;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const data = await ODataService.get('zi_events', {
          $filter: `event_id eq '${eventId}'`
        });
        if (data.length > 0) {
          setEvent(data[0]);
        } else {
          setError('Event not found');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  const handlePurchaseTicket = () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to purchase tickets');
      return;
    }

    if (event.current_attendees >= event.max_attendees) {
      Alert.alert('Sold Out', 'This event has reached maximum capacity');
      return;
    }

    navigation.navigate('PurchaseTicket', { eventId });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{event.event_name}</Text>
      
      <View style={styles.imagePlaceholder}>
        <Text>Event Image</Text>
      </View>
      
      <Text style={styles.date}>
        {new Date(event.start_date).toLocaleString()} - {new Date(event.end_date).toLocaleString()}
      </Text>
      
      <Text style={styles.location}>{event.location}</Text>
      
      <Text style={styles.sectionTitle}>Description</Text>
      <Text style={styles.description}>{event.event_description}</Text>
      
      <Text style={styles.sectionTitle}>Event Status</Text>
      <Text style={styles.status}>
        {event.event_status} | {event.current_attendees}/{event.max_attendees} attendees
      </Text>
      
      <View style={styles.buttonContainer}>
        <Button
          title="Purchase Ticket"
          onPress={handlePurchaseTicket}
          disabled={event.event_status !== 'VALIDATED'}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    color: 'red',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  imagePlaceholder: {
    height: 200,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderRadius: 8,
  },
  date: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
  location: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
  },
  status: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 20,
  },
  buttonContainer: {
    marginTop: 30,
    marginBottom: 20,
  },
});

export default EventDetailScreen;