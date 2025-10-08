import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const API_URL = 'http://localhost:3000';

const HomeScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salesStats, setSalesStats] = useState(null);
  const [ticketAnalytics, setTicketAnalytics] = useState({});
  const [tickets, setTickets] = useState([]);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedEventAnalytics, setSelectedEventAnalytics] = useState(null);
  const { getAuthHeader, user } = useAuth();

  const isAdmin = () => {
    return user && (user.role === 'admin' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'EVENT_MANAGER');
  };

  useFocusEffect(
    useCallback(() => {
      fetchEventsAndStats();
    }, [])
  );

  const fetchEventsAndStats = async () => {
    try {
      const headers = await getAuthHeader();
      
      const eventsResponse = await axios.get(`${API_URL}/zi_events`, { headers });
      const validatedEvents = eventsResponse.data.d.results.filter(
        e => e.event_status === 'VALIDATED'
      );
      setEvents(validatedEvents);

      try {
        const statsResponse = await axios.get(`${API_URL}/api/admin/dashboard/stats`, { headers });
        setSalesStats(statsResponse.data);
      } catch (statsError) {
        console.log('Stats not available');
      }

      if (isAdmin()) {
        try {
          const ticketsRes = await axios.get(`${API_URL}/api/admin/tickets`, { headers });
          const allTickets = ticketsRes.data.tickets || [];
          setTickets(allTickets);
          
          const analytics = calculateTicketAnalytics(validatedEvents, allTickets);
          setTicketAnalytics(analytics);
        } catch (error) {
          console.error('Error fetching admin analytics:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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
        soldPercentage: (totalSold / totalCapacity * 100).toFixed(1),
        revenue: eventTickets.reduce((sum, t) => sum + parseFloat(t.price || 0), 0)
      };
    });
    
    return analytics;
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEventsAndStats();
  };

  const getTopSellingEvents = () => {
    return [...events]
      .sort((a, b) => b.current_attendees - a.current_attendees)
      .slice(0, 5);
  };

  const showEventAnalytics = (event) => {
    if (!isAdmin()) return;
    
    const analytics = ticketAnalytics[event.event_id];
    if (analytics) {
      setSelectedEventAnalytics({ event, analytics });
      setShowAdminModal(true);
    }
  };

  const CompetitionBanner = () => (
    <View style={styles.competitionBanner}>
      <View style={styles.competitionHeader}>
        <Ionicons name="trophy" size={32} color="#FFD700" />
        <Text style={styles.competitionTitle}>Top Selling Events</Text>
      </View>
      <Text style={styles.competitionSubtitle}>
        Competition is fierce! See what's trending
      </Text>
      {isAdmin() && (
        <TouchableOpacity 
          style={styles.adminBadge}
          onPress={() => navigation.navigate('AdminDashboard')}
        >
          <Ionicons name="analytics" size={16} color="#fff" />
          <Text style={styles.adminBadgeText}>Full Admin Dashboard</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const SalesStatsCard = () => {
    if (!salesStats) return null;

    return (
      <View style={styles.salesStatsContainer}>
        <View style={styles.statsHeader}>
          <Text style={styles.statsTitle}>Live Sales Dashboard</Text>
          {isAdmin() && (
            <TouchableOpacity onPress={() => navigation.navigate('AdminDashboard')}>
              <Ionicons name="open-outline" size={20} color="#6200ee" />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: '#6200ee15' }]}>
              <Ionicons name="calendar" size={24} color="#6200ee" />
            </View>
            <Text style={styles.statValue}>{salesStats.totalEvents || 0}</Text>
            <Text style={styles.statLabel}>Active Events</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: '#2196F315' }]}>
              <Ionicons name="ticket" size={24} color="#2196F3" />
            </View>
            <Text style={styles.statValue}>{salesStats.totalTickets || 0}</Text>
            <Text style={styles.statLabel}>Tickets Sold</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: '#4CAF5015' }]}>
              <Ionicons name="cash" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.statValue}>R{(salesStats.totalRevenue || 0).toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Sales</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: '#FF980015' }]}>
              <Ionicons name="trending-up" size={24} color="#FF9800" />
            </View>
            <Text style={styles.statValue}>
              {salesStats.totalTickets > 0 
                ? `R${(salesStats.totalRevenue / salesStats.totalTickets).toFixed(0)}`
                : 'R0'
              }
            </Text>
            <Text style={styles.statLabel}>Avg. Ticket</Text>
          </View>
        </View>

        {isAdmin() && Object.keys(ticketAnalytics).length > 0 && (
          <View style={styles.adminAnalyticsSummary}>
            <View style={styles.adminSummaryHeader}>
              <Ionicons name="analytics-outline" size={20} color="#6200ee" />
              <Text style={styles.adminSummaryTitle}>Ticket Analytics Overview</Text>
            </View>
            <View style={styles.adminAnalyticsRow}>
              <View style={styles.adminAnalyticsItem}>
                <View style={[styles.adminIconCircle, { backgroundColor: '#4CAF5015' }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                </View>
                <Text style={[styles.adminAnalyticsValue, { color: '#4CAF50' }]}>
                  {Object.values(ticketAnalytics).reduce((sum, a) => sum + a.scanned, 0)}
                </Text>
                <Text style={styles.adminAnalyticsLabel}>Scanned</Text>
                <Text style={styles.adminAnalyticsPercentage}>
                  {((Object.values(ticketAnalytics).reduce((sum, a) => sum + a.scanned, 0) / 
                    Math.max(Object.values(ticketAnalytics).reduce((sum, a) => sum + a.totalSold, 0), 1)) * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.adminAnalyticsItem}>
                <View style={[styles.adminIconCircle, { backgroundColor: '#FF980015' }]}>
                  <Ionicons name="time" size={20} color="#FF9800" />
                </View>
                <Text style={[styles.adminAnalyticsValue, { color: '#FF9800' }]}>
                  {Object.values(ticketAnalytics).reduce((sum, a) => sum + a.unscanned, 0)}
                </Text>
                <Text style={styles.adminAnalyticsLabel}>Unscanned</Text>
                <Text style={styles.adminAnalyticsPercentage}>
                  {((Object.values(ticketAnalytics).reduce((sum, a) => sum + a.unscanned, 0) / 
                    Math.max(Object.values(ticketAnalytics).reduce((sum, a) => sum + a.totalSold, 0), 1)) * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.adminAnalyticsItem}>
                <View style={[styles.adminIconCircle, { backgroundColor: '#9C27B015' }]}>
                  <Ionicons name="albums" size={20} color="#9C27B0" />
                </View>
                <Text style={[styles.adminAnalyticsValue, { color: '#9C27B0' }]}>
                  {Object.values(ticketAnalytics).reduce((sum, a) => sum + a.remaining, 0)}
                </Text>
                <Text style={styles.adminAnalyticsLabel}>Remaining</Text>
                <Text style={styles.adminAnalyticsPercentage}>
                  Available
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const EventCard = React.memo(({ event, rank }) => {
    const soldPercentage = (event.current_attendees / event.max_attendees) * 100;
    const analytics = ticketAnalytics[event.event_id];
    const hasAnalytics = isAdmin() && analytics;
    
    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => navigation.navigate('PurchaseTicket', { event })}
        onLongPress={() => hasAnalytics && showEventAnalytics(event)}
      >
        {rank && (
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>#{rank}</Text>
          </View>
        )}

        {hasAnalytics && (
          <TouchableOpacity 
            style={styles.analyticsIconBadge}
            onPress={() => showEventAnalytics(event)}
          >
            <Ionicons name="stats-chart" size={16} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={styles.imageContainer}>
          <Image
            source={{ 
              uri: event.image_url || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400'
            }}
            style={styles.eventImage}
            resizeMode="cover"
          />
          <View style={styles.priceTag}>
            <Text style={styles.priceText}>R{event.price?.toFixed(2) || '0.00'}</Text>
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

          <View style={styles.salesProgress}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(soldPercentage, 100)}%` }]} />
            </View>
            <View style={styles.salesInfo}>
              <Text style={styles.salesText}>
                {event.current_attendees}/{event.max_attendees} sold
              </Text>
              <Text style={[
                styles.percentageText,
                soldPercentage > 80 && styles.hotSale
              ]}>
                {soldPercentage.toFixed(0)}%
              </Text>
            </View>
          </View>

          {/* Enhanced Admin Analytics Section */}
          {hasAnalytics && (
            <View style={styles.adminDetailedAnalytics}>
              <View style={styles.analyticsHeader}>
                <Ionicons name="analytics-outline" size={14} color="#6200ee" />
                <Text style={styles.analyticsHeaderText}>Ticket Analytics</Text>
              </View>

              <View style={styles.analyticsComparisonGrid}>
                <View style={styles.comparisonCard}>
                  <View style={styles.comparisonHeader}>
                    <Ionicons name="ticket-outline" size={16} color="#2196F3" />
                    <Text style={styles.comparisonTitle}>Sold</Text>
                  </View>
                  <Text style={[styles.comparisonValue, { color: '#2196F3' }]}>
                    {analytics.totalSold}
                  </Text>
                  <View style={styles.comparisonBar}>
                    <View style={[styles.comparisonFill, { 
                      width: `${analytics.soldPercentage}%`,
                      backgroundColor: '#2196F3'
                    }]} />
                  </View>
                  <Text style={styles.comparisonPercentage}>{analytics.soldPercentage}%</Text>
                  <Text style={styles.comparisonDetail}>of {analytics.totalCapacity}</Text>
                </View>

                <View style={styles.comparisonCard}>
                  <View style={styles.comparisonHeader}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
                    <Text style={styles.comparisonTitle}>Scanned</Text>
                  </View>
                  <Text style={[styles.comparisonValue, { color: '#4CAF50' }]}>
                    {analytics.scanned}
                  </Text>
                  <View style={styles.comparisonBar}>
                    <View style={[styles.comparisonFill, { 
                      width: `${analytics.scannedPercentage}%`,
                      backgroundColor: '#4CAF50'
                    }]} />
                  </View>
                  <Text style={styles.comparisonPercentage}>{analytics.scannedPercentage}%</Text>
                  <Text style={styles.comparisonDetail}>of sold</Text>
                </View>

                <View style={styles.comparisonCard}>
                  <View style={styles.comparisonHeader}>
                    <Ionicons name="time-outline" size={16} color="#FF9800" />
                    <Text style={styles.comparisonTitle}>Unscanned</Text>
                  </View>
                  <Text style={[styles.comparisonValue, { color: '#FF9800' }]}>
                    {analytics.unscanned}
                  </Text>
                  <View style={styles.comparisonBar}>
                    <View style={[styles.comparisonFill, { 
                      width: `${100 - parseFloat(analytics.scannedPercentage)}%`,
                      backgroundColor: '#FF9800'
                    }]} />
                  </View>
                  <Text style={styles.comparisonPercentage}>
                    {(100 - parseFloat(analytics.scannedPercentage)).toFixed(1)}%
                  </Text>
                  <Text style={styles.comparisonDetail}>pending scan</Text>
                </View>

                <View style={styles.comparisonCard}>
                  <View style={styles.comparisonHeader}>
                    <Ionicons name="albums-outline" size={16} color="#9C27B0" />
                    <Text style={styles.comparisonTitle}>Available</Text>
                  </View>
                  <Text style={[styles.comparisonValue, { color: '#9C27B0' }]}>
                    {analytics.remaining}
                  </Text>
                  <View style={styles.comparisonBar}>
                    <View style={[styles.comparisonFill, { 
                      width: `${100 - parseFloat(analytics.soldPercentage)}%`,
                      backgroundColor: '#9C27B0'
                    }]} />
                  </View>
                  <Text style={styles.comparisonPercentage}>
                    {(100 - parseFloat(analytics.soldPercentage)).toFixed(1)}%
                  </Text>
                  <Text style={styles.comparisonDetail}>remaining</Text>
                </View>
              </View>

              {/* Revenue Info */}
              {analytics.revenue > 0 && (
                <View style={styles.revenueCard}>
                  <Ionicons name="cash-outline" size={16} color="#4CAF50" />
                  <Text style={styles.revenueText}>
                    Revenue: R{analytics.revenue.toFixed(2)}
                  </Text>
                </View>
              )}

              {/* Quick Action */}
              <TouchableOpacity 
                style={styles.quickAnalyticsButton}
                onPress={() => showEventAnalytics(event)}
              >
                <Text style={styles.quickAnalyticsText}>View Full Analytics</Text>
                <Ionicons name="arrow-forward" size={14} color="#6200ee" />
              </TouchableOpacity>
            </View>
          )}

          {soldPercentage > 80 && (
            <View style={styles.hotBadge}>
              <Ionicons name="flame" size={14} color="#FF4444" />
              <Text style={styles.hotText}>Almost Sold Out!</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  });

  const renderAnalyticsModal = () => {
    if (!selectedEventAnalytics) return null;

    const { event, analytics } = selectedEventAnalytics;

    return (
      <Modal
        visible={showAdminModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAdminModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detailed Analytics</Text>
                <TouchableOpacity onPress={() => setShowAdminModal(false)}>
                  <Ionicons name="close-circle" size={28} color="#666" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalEventName}>{event.event_name}</Text>

              {/* Primary Metrics */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Sales Overview</Text>
                <View style={styles.modalAnalyticsGrid}>
                  <View style={[styles.modalAnalyticsCard, { backgroundColor: '#2196F315' }]}>
                    <Ionicons name="ticket" size={32} color="#2196F3" />
                    <Text style={styles.modalAnalyticsNumber}>{analytics.totalSold}</Text>
                    <Text style={styles.modalAnalyticsLabel}>Tickets Sold</Text>
                    <View style={styles.modalProgressBar}>
                      <View style={[styles.modalProgress, { 
                        width: `${analytics.soldPercentage}%`,
                        backgroundColor: '#2196F3'
                      }]} />
                    </View>
                    <Text style={styles.modalPercentage}>{analytics.soldPercentage}%</Text>
                  </View>

                  <View style={[styles.modalAnalyticsCard, { backgroundColor: '#9C27B015' }]}>
                    <Ionicons name="albums" size={32} color="#9C27B0" />
                    <Text style={styles.modalAnalyticsNumber}>{analytics.remaining}</Text>
                    <Text style={styles.modalAnalyticsLabel}>Available</Text>
                    <View style={styles.modalProgressBar}>
                      <View style={[styles.modalProgress, { 
                        width: `${100 - parseFloat(analytics.soldPercentage)}%`,
                        backgroundColor: '#9C27B0'
                      }]} />
                    </View>
                    <Text style={styles.modalPercentage}>
                      {(100 - parseFloat(analytics.soldPercentage)).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Scanning Status */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Scanning Status</Text>
                <View style={styles.modalAnalyticsGrid}>
                  <View style={[styles.modalAnalyticsCard, { backgroundColor: '#4CAF5015' }]}>
                    <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
                    <Text style={styles.modalAnalyticsNumber}>{analytics.scanned}</Text>
                    <Text style={styles.modalAnalyticsLabel}>Scanned</Text>
                    <View style={styles.modalProgressBar}>
                      <View style={[styles.modalProgress, { 
                        width: `${analytics.scannedPercentage}%`,
                        backgroundColor: '#4CAF50'
                      }]} />
                    </View>
                    <Text style={styles.modalPercentage}>{analytics.scannedPercentage}%</Text>
                  </View>

                  <View style={[styles.modalAnalyticsCard, { backgroundColor: '#FF980015' }]}>
                    <Ionicons name="time" size={32} color="#FF9800" />
                    <Text style={styles.modalAnalyticsNumber}>{analytics.unscanned}</Text>
                    <Text style={styles.modalAnalyticsLabel}>Unscanned</Text>
                    <View style={styles.modalProgressBar}>
                      <View style={[styles.modalProgress, { 
                        width: `${analytics.totalSold > 0 ? (100 - parseFloat(analytics.scannedPercentage)) : 0}%`,
                        backgroundColor: '#FF9800'
                      }]} />
                    </View>
                    <Text style={styles.modalPercentage}>
                      {analytics.totalSold > 0 ? (100 - parseFloat(analytics.scannedPercentage)).toFixed(1) : '0.0'}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Comparison Stats */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Detailed Breakdown</Text>
                <View style={styles.modalComparisonList}>
                  <View style={styles.modalComparisonItem}>
                    <Text style={styles.modalComparisonLabel}>Total Capacity:</Text>
                    <Text style={styles.modalComparisonValue}>{analytics.totalCapacity} tickets</Text>
                  </View>
                  <View style={styles.modalComparisonItem}>
                    <Text style={styles.modalComparisonLabel}>Tickets Sold:</Text>
                    <Text style={[styles.modalComparisonValue, { color: '#2196F3' }]}>
                      {analytics.totalSold} ({analytics.soldPercentage}%)
                    </Text>
                  </View>
                  <View style={styles.modalComparisonItem}>
                    <Text style={styles.modalComparisonLabel}>Tickets Remaining:</Text>
                    <Text style={[styles.modalComparisonValue, { color: '#9C27B0' }]}>
                      {analytics.remaining} ({(100 - parseFloat(analytics.soldPercentage)).toFixed(1)}%)
                    </Text>
                  </View>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalComparisonItem}>
                    <Text style={styles.modalComparisonLabel}>Scanned Tickets:</Text>
                    <Text style={[styles.modalComparisonValue, { color: '#4CAF50' }]}>
                      {analytics.scanned} ({analytics.scannedPercentage}% of sold)
                    </Text>
                  </View>
                  <View style={styles.modalComparisonItem}>
                    <Text style={styles.modalComparisonLabel}>Pending Scan:</Text>
                    <Text style={[styles.modalComparisonValue, { color: '#FF9800' }]}>
                      {analytics.unscanned} ({(100 - parseFloat(analytics.scannedPercentage)).toFixed(1)}% of sold)
                    </Text>
                  </View>
                  {analytics.revenue > 0 && (
                    <>
                      <View style={styles.modalDivider} />
                      <View style={styles.modalComparisonItem}>
                        <Text style={styles.modalComparisonLabel}>Total Revenue:</Text>
                        <Text style={[styles.modalComparisonValue, { color: '#4CAF50', fontWeight: 'bold' }]}>
                          R{analytics.revenue.toFixed(2)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalManageButton}
                onPress={() => {
                  setShowAdminModal(false);
                  navigation.navigate('Scanner');
                }}
              >
                <Ionicons name="qr-code-outline" size={20} color="#fff" />
                <Text style={styles.modalManageButtonText}>Scan Tickets</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setShowAdminModal(false);
                  navigation.navigate('EventManagement');
                }}
              >
                <Ionicons name="settings-outline" size={20} color="#6200ee" />
                <Text style={styles.modalSecondaryButtonText}>Manage Event</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowAdminModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Discover</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      </View>
    );
  }

  const topSellingEvents = getTopSellingEvents();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        {isAdmin() && (
          <TouchableOpacity 
            style={styles.headerAdminButton}
            onPress={() => navigation.navigate('AdminDashboard')}
          >
            <Ionicons name="analytics" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <CompetitionBanner />
        <SalesStatsCard />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="podium" size={24} color="#FFD700" />
            <Text style={styles.sectionTitle}>Top 5 Best Sellers</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            These events are flying off the shelves!
            {isAdmin() && ' (Tap analytics icon or long press for details)'}
          </Text>
          
          {topSellingEvents.map((event, index) => (
            <EventCard key={event.event_id} event={event} rank={index + 1} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Events</Text>
          {events.map((event) => (
            <EventCard key={event.event_id} event={event} />
          ))}
        </View>

        {events.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No events available</Text>
          </View>
        )}
      </ScrollView>

      {renderAnalyticsModal()}
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
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headerAdminButton: {
    position: 'absolute',
    right: 20,
    top: 50,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6200ee',
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  competitionBanner: {
    backgroundColor: '#000',
    margin: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  competitionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  competitionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  competitionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6200ee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  salesStatsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '47%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  statIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  adminAnalyticsSummary: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  adminSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adminSummaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6200ee',
    marginLeft: 8,
  },
  adminAnalyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  adminAnalyticsItem: {
    alignItems: 'center',
  },
  adminIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  adminAnalyticsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  adminAnalyticsLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  adminAnalyticsPercentage: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
  },
  section: {
    marginTop: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    marginLeft: 32,
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
    position: 'relative',
  },
  rankBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  analyticsIconBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
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
  priceTag: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    marginBottom: 12,
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
  salesProgress: {
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  salesInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salesText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  percentageText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  hotSale: {
    color: '#FF4444',
  },
  adminDetailedAnalytics: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  analyticsHeaderText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#6200ee',
    marginLeft: 6,
  },
  analyticsComparisonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  comparisonCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  comparisonTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comparisonValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  comparisonBar: {
    height: 3,
    backgroundColor: '#e0e0e0',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginBottom: 4,
  },
  comparisonFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  comparisonPercentage: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
    marginBottom: 2,
  },
  comparisonDetail: {
    fontSize: 9,
    color: '#999',
  },
  revenueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  revenueText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 8,
  },
  quickAnalyticsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6200ee',
  },
  quickAnalyticsText: {
    fontSize: 12,
    color: '#6200ee',
    fontWeight: '600',
    marginRight: 4,
  },
  hotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  hotText: {
    fontSize: 12,
    color: '#FF4444',
    fontWeight: 'bold',
    marginLeft: 4,
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
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#fff',
    marginTop: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  modalEventName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 24,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalAnalyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modalAnalyticsCard: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalAnalyticsNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
    marginBottom: 4,
  },
  modalAnalyticsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  modalProgress: {
    height: '100%',
    borderRadius: 2,
  },
  modalPercentage: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
  },
  modalComparisonList: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  modalComparisonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalComparisonLabel: {
    fontSize: 14,
    color: '#666',
  },
  modalComparisonValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  modalManageButton: {
    flexDirection: 'row',
    backgroundColor: '#6200ee',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalManageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalSecondaryButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#6200ee',
  },
  modalSecondaryButtonText: {
    color: '#6200ee',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalCloseButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  modalCloseButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;