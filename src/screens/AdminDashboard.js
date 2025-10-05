import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:3000';

const AdminDashboard = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { getAuthHeader } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const headers = getAuthHeader();
      
      const [statsRes, eventsRes, ticketsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/dashboard/stats`, { headers }),
        axios.get(`${API_URL}/zi_events`, { headers }),
        axios.get(`${API_URL}/api/admin/tickets`, { headers })
      ]);

      setStats(statsRes.data);
      setEvents(eventsRes.data.d.results);
      setTickets(ticketsRes.data.tickets);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.purpleCard]}>
          <Text style={styles.statNumber}>{stats?.totalEvents || 0}</Text>
          <Text style={styles.statLabel}>Total Events</Text>
        </View>
        <View style={[styles.statCard, styles.blueCard]}>
          <Text style={styles.statNumber}>{stats?.totalTickets || 0}</Text>
          <Text style={styles.statLabel}>Tickets Sold</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.greenCard]}>
          <Text style={styles.statNumber}>${stats?.totalRevenue?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>
        <View style={[styles.statCard, styles.orangeCard]}>
          <Text style={styles.statNumber}>{stats?.totalCustomers || 0}</Text>
          <Text style={styles.statLabel}>Customers</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CreateEvent')}
        >
          <Text style={styles.actionButtonText}>+ Create New Event</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => navigation.navigate('EventManagement')}
        >
          <Text style={styles.secondaryButtonText}>Manage Events</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => navigation.navigate('TicketManagement')}
        >
          <Text style={styles.secondaryButtonText}>View All Tickets</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Events */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Events</Text>
        {events.slice(0, 5).map(event => (
          <View key={event.event_id} style={styles.listItem}>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle}>{event.event_name}</Text>
              <Text style={styles.listItemSubtitle}>
                {event.current_attendees}/{event.max_attendees} attendees
              </Text>
            </View>
            <View style={[
              styles.statusBadge,
              event.event_status === 'VALIDATED' ? styles.validatedBadge : styles.pendingBadge
            ]}>
              <Text style={styles.statusText}>{event.event_status}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Recent Tickets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Tickets</Text>
        {tickets.slice(0, 5).map(ticket => (
          <View key={ticket.ticket_id} style={styles.listItem}>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle}>{ticket.event_name}</Text>
              <Text style={styles.listItemSubtitle}>
                {ticket.first_name} {ticket.last_name} • {ticket.ticket_code}
              </Text>
            </View>
            <Text style={styles.priceText}>${ticket.price}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
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
  statsContainer: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  purpleCard: {
    backgroundColor: '#6200ee',
  },
  blueCard: {
    backgroundColor: '#2196F3',
  },
  greenCard: {
    backgroundColor: '#4CAF50',
  },
  orangeCard: {
    backgroundColor: '#FF9800',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  section: {
    padding: 15,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  actionButton: {
    backgroundColor: '#6200ee',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#6200ee',
  },
  secondaryButtonText: {
    color: '#6200ee',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  validatedBadge: {
    backgroundColor: '#E8F5E9',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});

export default AdminDashboard;