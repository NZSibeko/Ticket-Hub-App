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
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const API_URL = 'http://localhost:3000';

const HomeScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salesStats, setSalesStats] = useState(null);
  const { getAuthHeader } = useAuth();

  useEffect(() => {
    fetchEventsAndStats();
  }, []);

  const fetchEventsAndStats = async () => {
    try {
      const headers = await getAuthHeader();
      
      // Fetch events
      const eventsResponse = await axios.get(`${API_URL}/zi_events`, { headers });
      const validatedEvents = eventsResponse.data.d.results.filter(
        e => e.event_status === 'VALIDATED'
      );
      setEvents(validatedEvents);

      // Fetch sales statistics
      const statsResponse = await axios.get(`${API_URL}/api/admin/dashboard/stats`, { headers });
      setSalesStats(statsResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTopSellingEvents = () => {
    return [...events]
      .sort((a, b) => b.current_attendees - a.current_attendees)
      .slice(0, 5);
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
    </View>
  );

  const SalesStatsCard = () => {
    if (!salesStats) return null;

    return (
      <View style={styles.salesStatsContainer}>
        <Text style={styles.statsTitle}>Live Sales Dashboard</Text>
        
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
      </View>
    );
  };

  const EventCard = ({ event, rank }) => {
    const soldPercentage = (event.current_attendees / event.max_attendees) * 100;
    
    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => navigation.navigate('PurchaseTicket', { event })}
      >
        {rank && (
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>#{rank}</Text>
          </View>
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
            <Text style={styles.priceText}>R{event.price.toFixed(2)}</Text>
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

          {/* Sales Progress */}
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

          {soldPercentage > 80 && (
            <View style={styles.hotBadge}>
              <Ionicons name="flame" size={14} color="#FF4444" />
              <Text style={styles.hotText}>Almost Sold Out!</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
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
        </View>
      </View>
    );
  }

  const topSellingEvents = getTopSellingEvents();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Competition Banner */}
        <CompetitionBanner />

        {/* Sales Stats Dashboard */}
        <SalesStatsCard />

        {/* Top Selling Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="podium" size={24} color="#FFD700" />
            <Text style={styles.sectionTitle}>Top 5 Best Sellers</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            These events are flying off the shelves!
          </Text>
          
          {topSellingEvents.map((event, index) => (
            <EventCard key={event.event_id} event={event} rank={index + 1} />
          ))}
        </View>

        {/* All Events */}
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
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
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
    top: 12,
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
  hotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
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
});

export default HomeScreen;