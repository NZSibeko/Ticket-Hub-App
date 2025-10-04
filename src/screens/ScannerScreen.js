import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import ODataService from '../services/ODataService';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const MyTicketsScreen = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    if (!user) return;

    const fetchTickets = async () => {
      try {
        const data = await ODataService.get('zi_tickets', {
          $filter: `customer_id eq '${user.customer_id}'`,
          $expand: '_event'
        });
        setTickets(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [user]);

  const renderTicketItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.ticketCard}
      onPress={() => navigation.navigate('EventDetail', { eventId: item.event_id })}
    >
      <Text style={styles.eventName}>{item._event?.event_name || 'Event'}</Text>
      <Text style={styles.ticketCode}>Ticket: {item.ticket_code}</Text>
      <Text style={styles.ticketStatus}>Status: {item.ticket_status}</Text>
      <Text style={styles.purchaseDate}>
        Purchased: {new Date(item.purchase_date).toLocaleDateString()}
      </Text>
      {item.validation_date && (
        <Text style={styles.validationDate}>
          Validated: {new Date(item.validation_date).toLocaleDateString()}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Please login to view your tickets</Text>
      </View>
    );
  }

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
    <View style={styles.container}>
      {tickets.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.noTickets}>You don't have any tickets yet</Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderTicketItem}
          keyExtractor={item => item.ticket_id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
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
  noTickets: {
    fontSize: 18,
    color: '#888',
  },
  listContent: {
    paddingBottom: 20,
  },
  ticketCard: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  ticketCode: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  ticketStatus: {
    fontSize: 14,
    color: '#444',
    marginBottom: 5,
  },
  purchaseDate: {
    fontSize: 12,
    color: '#777',
    marginBottom: 3,
  },
  validationDate: {
    fontSize: 12,
    color: '#777',
  },
});

export default MyTicketsScreen;