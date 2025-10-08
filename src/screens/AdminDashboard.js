import React, { useState, useEffect, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const API_URL = 'http://localhost:3000';

// Set axios timeout
axios.defaults.timeout = 5000;

const AdminDashboard = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ticketAnalytics, setTicketAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const { getAuthHeader } = useAuth();

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    setConnectionError(false);
    
    try {
      const headers = await getAuthHeader();
      
      // Fetch data with individual error handling
      let statsData = null;
      let eventsData = [];
      let ticketsData = [];

      // Try to fetch stats (optional)
      try {
        const statsRes = await axios.get(`${API_URL}/api/admin/dashboard/stats`, { headers });
        statsData = statsRes.data;
      } catch (error) {
        console.log('Stats endpoint not available');
      }

      // Try to fetch events (required)
      try {
        const eventsRes = await axios.get(`${API_URL}/zi_events`, { headers });
        eventsData = eventsRes.data.d.results || [];
      } catch (error) {
        if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
          setConnectionError(true);
        }
        console.log('Events not available');
      }

      // Try to fetch tickets (optional)
      try {
        const ticketsRes = await axios.get(`${API_URL}/api/admin/tickets`, { headers });
        ticketsData = ticketsRes.data.tickets || [];
      } catch (error) {
        console.log('Tickets endpoint not available');
      }

      setStats(statsData);
      setEvents(eventsData);
      setTickets(ticketsData);

      if (eventsData.length > 0 && ticketsData.length > 0) {
        const analytics = calculateTicketAnalytics(eventsData, ticketsData);
        setTicketAnalytics(analytics);
      }
      
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateTicketAnalytics = (eventsList, ticketsList) => {
    const analytics = {};
    
    eventsList.forEach(event => {
      const eventTickets = ticketsList.filter(t => t.event_id === event.event_id);
      const scannedTickets = eventTickets.filter(t => t.ticket_status === 'VALIDATED');
      const unscannedTickets = eventTickets.filter(t => t.ticket_status === 'ACTIVE');
      const totalSold = eventTickets.length;
      const totalCapacity = event.max_attendees;
      const remainingTickets = totalCapacity - totalSold;
      
      analytics[event.event_id] = {
        totalSold,
        scanned: scannedTickets.length,
        unscanned: unscannedTickets.length,
        remaining: remainingTickets,
        totalCapacity,
        scannedPercentage: totalSold > 0 ? (scannedTickets.length / totalSold * 100).toFixed(1) : 0,
        soldPercentage: (totalSold / totalCapacity * 100).toFixed(1)
      };
    });
    
    return analytics;
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const totalTicketsSold = Object.values(ticketAnalytics).reduce((sum, a) => sum + a.totalSold, 0);
  const totalScanned = Object.values(ticketAnalytics).reduce((sum, a) => sum + a.scanned, 0);
  const totalUnscanned = Object.values(ticketAnalytics).reduce((sum, a) => sum + a.unscanned, 0);
  const totalRemaining = Object.values(ticketAnalytics).reduce((sum, a) => sum + a.remaining, 0);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
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
          <Text style={styles.statNumber}>R{(stats?.totalRevenue || 0).toFixed(0)}</Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>
        <View style={[styles.statCard, styles.orangeCard]}>
          <Text style={styles.statNumber}>{stats?.totalCustomers || 0}</Text>
          <Text style={styles.statLabel}>Customers</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="analytics" size={24} color="#6200ee" />
          <Text style={styles.sectionTitle}>Overall Ticket Analytics</Text>
        </View>

        <View style={styles.analyticsCard}>
          <View style={styles.analyticsRow}>
            <View style={styles.analyticsItem}>
              <View style={[styles.analyticsIconBox, { backgroundColor: '#2196F315' }]}>
                <Ionicons name="ticket" size={24} color="#2196F3" />
              </View>
              <Text style={styles.analyticsValue}>{totalTicketsSold}</Text>
              <Text style={styles.analyticsLabel}>Total Sold</Text>
            </View>

            <View style={styles.analyticsItem}>
              <View style={[styles.analyticsIconBox, { backgroundColor: '#4CAF5015' }]}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.analyticsValue}>{totalScanned}</Text>
              <Text style={styles.analyticsLabel}>Scanned</Text>
            </View>
          </View>

          <View style={styles.analyticsRow}>
            <View style={styles.analyticsItem}>
              <View style={[styles.analyticsIconBox, { backgroundColor: '#FF980015' }]}>
                <Ionicons name="time" size={24} color="#FF9800" />
              </View>
              <Text style={styles.analyticsValue}>{totalUnscanned}</Text>
              <Text style={styles.analyticsLabel}>Unscanned</Text>
            </View>

            <View style={styles.analyticsItem}>
              <View style={[styles.analyticsIconBox, { backgroundColor: '#9C27B015' }]}>
                <Ionicons name="albums" size={24} color="#9C27B0" />
              </View>
              <Text style={styles.analyticsValue}>{totalRemaining}</Text>
              <Text style={styles.analyticsLabel}>Remaining</Text>
            </View>
          </View>
        </View>
      </View>

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
          style={[styles.actionButton, styles.scannerButton]}
          onPress={() => navigation.navigate('Scanner')}
        >
          <Ionicons name="qr-code-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.actionButtonText}>Scan Tickets</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Events & Ticket Status</Text>
        {events.slice(0, 10).map(event => {
          const analytics = ticketAnalytics[event.event_id] || {
            totalSold: 0,
            scanned: 0,
            unscanned: 0,
            remaining: event.max_attendees,
            scannedPercentage: 0,
            soldPercentage: 0
          };

          return (
            <View key={event.event_id} style={styles.eventAnalyticsCard}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventName}>{event.event_name}</Text>
                <View style={[
                  styles.statusBadge,
                  event.event_status === 'VALIDATED' ? styles.validatedBadge : styles.pendingBadge
                ]}>
                  <Text style={styles.statusText}>{event.event_status}</Text>
                </View>
              </View>

              <View style={styles.eventMetaRow}>
                <View style={styles.eventMetaItem}>
                  <Ionicons name="location-outline" size={14} color="#666" />
                  <Text style={styles.eventMetaText}>{event.location}</Text>
                </View>
                <View style={styles.eventMetaItem}>
                  <Ionicons name="calendar-outline" size={14} color="#666" />
                  <Text style={styles.eventMetaText}>
                    {new Date(event.start_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <View style={styles.ticketAnalyticsGrid}>
                <View style={styles.ticketAnalyticsItem}>
                  <Text style={[styles.ticketAnalyticsValue, { color: '#2196F3' }]}>
                    {analytics.totalSold}
                  </Text>
                  <Text style={styles.ticketAnalyticsLabel}>Sold</Text>
                  <View style={styles.ticketProgressBar}>
                    <View style={[styles.ticketProgress, { 
                      width: `${analytics.soldPercentage}%`,
                      backgroundColor: '#2196F3'
                    }]} />
                  </View>
                  <Text style={styles.ticketPercentage}>{analytics.soldPercentage}%</Text>
                </View>

                <View style={styles.ticketAnalyticsItem}>
                  <Text style={[styles.ticketAnalyticsValue, { color: '#4CAF50' }]}>
                    {analytics.scanned}
                  </Text>
                  <Text style={styles.ticketAnalyticsLabel}>Scanned</Text>
                  <View style={styles.ticketProgressBar}>
                    <View style={[styles.ticketProgress, { 
                      width: `${analytics.scannedPercentage}%`,
                      backgroundColor: '#4CAF50'
                    }]} />
                  </View>
                  <Text style={styles.ticketPercentage}>{analytics.scannedPercentage}%</Text>
                </View>

                <View style={styles.ticketAnalyticsItem}>
                  <Text style={[styles.ticketAnalyticsValue, { color: '#FF9800' }]}>
                    {analytics.unscanned}
                  </Text>
                  <Text style={styles.ticketAnalyticsLabel}>Unscanned</Text>
                  <View style={styles.ticketProgressBar}>
                    <View style={[styles.ticketProgress, { 
                      width: `${100 - parseFloat(analytics.scannedPercentage)}%`,
                      backgroundColor: '#FF9800'
                    }]} />
                  </View>
                  <Text style={styles.ticketPercentage}>
                    {(100 - parseFloat(analytics.scannedPercentage)).toFixed(1)}%
                  </Text>
                </View>

                <View style={styles.ticketAnalyticsItem}>
                  <Text style={[styles.ticketAnalyticsValue, { color: '#9C27B0' }]}>
                    {analytics.remaining}
                  </Text>
                  <Text style={styles.ticketAnalyticsLabel}>Available</Text>
                  <View style={styles.ticketProgressBar}>
                    <View style={[styles.ticketProgress, { 
                      width: `${100 - parseFloat(analytics.soldPercentage)}%`,
                      backgroundColor: '#9C27B0'
                    }]} />
                  </View>
                  <Text style={styles.ticketPercentage}>
                    {(100 - parseFloat(analytics.soldPercentage)).toFixed(1)}%
                  </Text>
                </View>
              </View>

              <View style={styles.capacityInfo}>
                <Text style={styles.capacityText}>
                  Total Capacity: {event.max_attendees} tickets
                </Text>
              </View>

              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => navigation.navigate('EventManagement')}
              >
                <Text style={styles.viewDetailsText}>View Details</Text>
                <Ionicons name="chevron-forward" size={16} color="#6200ee" />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Tickets</Text>
        {tickets.slice(0, 5).map(ticket => (
          <View key={ticket.ticket_id} style={styles.listItem}>
            <View style={styles.listItemContent}>
              <Text style={styles.listItemTitle}>{ticket.event_name}</Text>
              <Text style={styles.listItemSubtitle}>
                {ticket.first_name} {ticket.last_name} • {ticket.ticket_code}
              </Text>
              <View style={styles.ticketStatusContainer}>
                <View style={[
                  styles.ticketStatusDot,
                  { backgroundColor: ticket.ticket_status === 'VALIDATED' ? '#4CAF50' : '#FF9800' }
                ]} />
                <Text style={styles.ticketStatusText}>
                  {ticket.ticket_status === 'VALIDATED' ? 'Scanned' : 'Not Scanned'}
                </Text>
              </View>
            </View>
            <Text style={styles.priceText}>R{ticket.price}</Text>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    marginLeft: 8,
  },
  analyticsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  analyticsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  analyticsItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  analyticsIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#6200ee',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
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
  scannerButton: {
    backgroundColor: '#FF4444',
  },
  eventAnalyticsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
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
  eventMetaRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventMetaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  ticketAnalyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  ticketAnalyticsItem: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  ticketAnalyticsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  ticketAnalyticsLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ticketProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  ticketProgress: {
    height: '100%',
    borderRadius: 2,
  },
  ticketPercentage: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
  },
  capacityInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginBottom: 12,
  },
  capacityText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#6200ee',
    fontWeight: '600',
    marginRight: 4,
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
    marginBottom: 4,
  },
  ticketStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  ticketStatusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});

export default AdminDashboard;