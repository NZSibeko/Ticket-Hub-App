import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, Alert } from 'react-native';
import ODataService from '../services/ODataService';
import { useAuth } from '../context/AuthContext';

const TicketPurchaseScreen = ({ route, navigation }) => {
  const { eventId } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState(null);

  const handlePurchase = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to purchase tickets');
      return;
    }

    setLoading(true);
    try {
      // Create the ticket
      const newTicket = await ODataService.post('zi_tickets', {
        event_id: eventId,
        customer_id: user.customer_id,
        ticket_status: 'PURCHASED',
        price: 50, // Example price, should come from event data
        currency: 'USD'
      });

      setTicket(newTicket);
      Alert.alert('Success', 'Ticket purchased successfully!');
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Failed to purchase ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Purchase Ticket</Text>
      
      {ticket ? (
        <View style={styles.ticketContainer}>
          <Text style={styles.ticketTitle}>Your Ticket</Text>
          <Text style={styles.ticketCode}>Code: {ticket.ticket_code}</Text>
          <Text style={styles.ticketStatus}>Status: {ticket.ticket_status}</Text>
          <Text style={styles.ticketQR}>QR Code: {ticket.qr_code}</Text>
          
          <Button
            title="View My Tickets"
            onPress={() => navigation.navigate('MyTickets')}
          />
        </View>
      ) : (
        <>
          <Text style={styles.info}>You are about to purchase a ticket for this event.</Text>
          <Text style={styles.price}>Price: $50.00</Text>
          
          {loading ? (
            <ActivityIndicator size="large" style={styles.loader} />
          ) : (
            <Button
              title="Confirm Purchase"
              onPress={handlePurchase}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  info: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    color: '#555',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  loader: {
    marginTop: 20,
  },
  ticketContainer: {
    backgroundColor: '#f8f8f8',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
  },
  ticketTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  ticketCode: {
    fontSize: 16,
    marginBottom: 10,
  },
  ticketStatus: {
    fontSize: 16,
    marginBottom: 10,
  },
  ticketQR: {
    fontSize: 14,
    marginBottom: 20,
    color: '#666',
  },
});

export default TicketPurchaseScreen;