import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import QRCode from 'react-native-qrcode-svg';

const API_URL = 'http://localhost:3000';

const MyTicketsScreen = () => {
  const { user, getAuthHeader } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('current'); // 'current' or 'previous'
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchTickets();
  }, [user]);

  const fetchTickets = async () => {
    try {
      const headers = getAuthHeader();
      const response = await axios.get(
        `${API_URL}/api/tickets/customer/${user.customer_id}`,
        { headers }
      );
      setTickets(response.data.tickets || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const filterTickets = () => {
    const now = new Date();
    return tickets.filter(ticket => {
      const eventDate = new Date(ticket.event_date);
      if (selectedTab === 'current') {
        return eventDate >= now && ticket.ticket_status !== 'CANCELLED';
      } else {
        return eventDate < now || ticket.ticket_status === 'CANCELLED';
      }
    });
  };

  const renderTicketItem = ({ item }) => {
    const isPast = new Date(item.event_date) < new Date() || item.ticket_status === 'CANCELLED';
    
    return (
      <View style={[styles.ticketCard, isPast && styles.ticketCardPast]}>
        <View style={styles.ticketHeader}>
          <Image
            source={{ uri: item.event_image || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400' }}
            style={styles.ticketImage}
            resizeMode="cover"
          />
          {item.ticket_status === 'VALIDATED' && (
            <View style={styles.validatedBadge}>
              <Text style={styles.validatedText}>✓ USED</Text>
            </View>
          )}
        </View>

        <View style={styles.ticketBody}>
          <Text style={styles.eventName}>{item.event_name}</Text>
          
          <View style={styles.ticketDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📅</Text>
              <Text style={styles.detailText}>
                {new Date(item.event_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🕐</Text>
              <Text style={styles.detailText}>
                {new Date(item.event_date).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📍</Text>
              <Text style={styles.detailText}>{item.location}</Text>
            </View>
          </View>

          {!isPast && (
            <View style={styles.qrContainer}>
              <QRCode
                value={item.ticket_code}
                size={120}
                backgroundColor="white"
              />
              <Text style={styles.ticketCode}>{item.ticket_code}</Text>
            </View>
          )}

          <View style={[
            styles.statusBadge,
            item.ticket_status === 'VALIDATED' ? styles.statusValidated :
            item.ticket_status === 'CANCELLED' ? styles.statusCancelled :
            styles.statusActive
          ]}>
            <Text style={styles.statusText}>
              {item.ticket_status}
            </Text>
          </View>
        </View>
      </View>
    );
  };

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
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const filteredTickets = filterTickets();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Tickets</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'current' && styles.tabActive]}
          onPress={() => setSelectedTab('current')}
        >
          <Text style={[styles.tabText, selectedTab === 'current' && styles.tabTextActive]}>
            Current
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'previous' && styles.tabActive]}
          onPress={() => setSelectedTab('previous')}
        >
          <Text style={[styles.tabText, selectedTab === 'previous' && styles.tabTextActive]}>
            Previous
          </Text>
        </TouchableOpacity>
      </View>

      {filteredTickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎫</Text>
          <Text style={styles.emptyText}>
            {selectedTab === 'current' ? 'No upcoming tickets' : 'No past tickets'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          renderItem={renderTicketItem}
          keyExtractor={item => item.ticket_id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
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
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#000',
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
  listContent: {
    padding: 16,
  },
  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  ticketCardPast: {
    opacity: 0.7,
  },
  ticketHeader: {
    position: 'relative',
    height: 160,
    backgroundColor: '#e0e0e0',
  },
  ticketImage: {
    width: '100%',
    height: '100%',
  },
  validatedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  validatedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ticketBody: {
    padding: 20,
  },
  eventName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  ticketDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 24,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 16,
  },
  ticketCode: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 2,
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusActive: {
    backgroundColor: '#E3F2FD',
  },
  statusValidated: {
    backgroundColor: '#E8F5E9',
  },
  statusCancelled: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
  },
});

export default MyTicketsScreen;