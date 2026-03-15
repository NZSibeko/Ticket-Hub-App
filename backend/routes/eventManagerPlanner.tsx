// @ts-nocheck
// EventPlannerScreen.web.js - COMPLETE FIXED VERSION
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Linking,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');
const API_URL = 'http://localhost:3000';

const EventPlannerScreen = ({ navigation }) => {
  const { user, getAuthHeader } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [ageGroup, setAgeGroup] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [stats, setStats] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 EventPlannerScreen MOUNTED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Current user:', user);
    console.log('🔑 User type:', user?.userType);
    console.log('📡 API URL:', API_URL);
    fetchEvents();
  }, []);

  const fetchEvents = async (forceRefresh = false) => {
    try {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📡 FETCHING EVENTS - START');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      setLoading(true);
      console.log('1️⃣ Loading state set to TRUE');
      
      console.log('2️⃣ Getting auth header...');
      const headers = await getAuthHeader();
      console.log('3️⃣ Auth header received:', headers ? 'YES' : 'NO');
      
      if (!headers || !headers.Authorization) {
        console.error('❌ NO AUTH HEADERS - Using dummy token for testing');
        
        const dummyHeaders = {
          'Authorization': 'Bearer test_token_12345',
          'Content-Type': 'application/json'
        };
        
        console.log('🔧 Using dummy auth token for testing');
        
        const url = `${API_URL}/api/event-manager/planner/events`;
        console.log('4️⃣ Fetching from:', url);
        
        const response = await axios.get(url, { 
          headers: dummyHeaders,
          timeout: 15000 
        });
        
        console.log('5️⃣ Response received!');
        console.log('   Status:', response.status);
        console.log('   Success:', response.data.success);
        console.log('   Events count:', response.data.events?.length || 0);
        
        if (response.data.success && response.data.events) {
          console.log('6️⃣ Setting events state...');
          setEvents(response.data.events);
          setStats(response.data.sources || {});
          setLastUpdated(response.data.lastUpdated || new Date().toISOString());
          setIsUsingMockData(!response.data.usingRealData);
          
          console.log('✅ SUCCESS! Events state updated');
          console.log(`✅ Loaded ${response.data.events.length} events`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        } else {
          console.error('❌ Response success=false or no events array');
        }
        
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      console.log('4️⃣ Auth token length:', headers.Authorization.length);
      
      const url = `${API_URL}/api/event-manager/planner/events`;
      console.log('5️⃣ Making request to:', url);
      
      const response = await axios.get(url, { 
        headers,
        timeout: 15000 
      });
      
      console.log('6️⃣ Response received!');
      console.log('   Status:', response.status);
      console.log('   Success:', response.data.success);
      console.log('   Events count:', response.data.events?.length || 0);
      
      if (response.data.success) {
        const fetchedEvents = response.data.events || [];
        console.log('7️⃣ Setting events state with', fetchedEvents.length, 'events');
        
        setEvents(fetchedEvents);
        setStats(response.data.sources || {});
        setLastUpdated(response.data.lastUpdated || new Date().toISOString());
        setIsUsingMockData(!response.data.usingRealData);
        
        console.log('✅ SUCCESS! State updated');
        console.log(`✅ Loaded ${fetchedEvents.length} events`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      } else {
        throw new Error(response.data.error || 'Failed to fetch events');
      }
    } catch (error) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ ERROR FETCHING EVENTS');
      console.error('Error message:', error.message);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      Alert.alert(
        'Error Loading Events',
        `Could not load events: ${error.response?.data?.error || error.message}. Check console for details.`,
        [{ text: 'OK' }]
      );
      
      setEvents([]);
      setStats({});
      setIsUsingMockData(true);
    } finally {
      console.log('8️⃣ Setting loading to FALSE');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    console.log('🔄 Refresh triggered');
    setRefreshing(true);
    fetchEvents(true);
  };

  const fetchAIInsights = async (event) => {
    setAiLoading(true);
    try {
      console.log('🤖 Fetching AI insights for:', event.id);
      
      const headers = await getAuthHeader() || {
        'Authorization': 'Bearer test_token_12345',
        'Content-Type': 'application/json'
      };
      
      const response = await axios.get(
        `${API_URL}/api/event-manager/planner/events/${event.id}/insights`,
        { headers }
      );

      console.log('✅ AI insights received');

      if (response.data.success) {
        setAiInsights(response.data.insights);
        setSelectedEvent(response.data.event);
      }
    } catch (error) {
      console.error('❌ Error fetching AI insights:', error);
      generateFallbackInsights(event);
    } finally {
      setAiLoading(false);
    }
  };

  const generateFallbackInsights = (event) => {
    console.log('📄 Generating fallback insights');
    
    const insights = {
      approachStrategy: `Contact ${event.organizer} emphasizing our platform's reach and zero upfront costs.`,
      partnershipPotential: [
        `Estimated attendance: ${event.estimatedAttendance?.toLocaleString() || 'N/A'}`,
        `Category: ${event.category}`,
        `Location: ${event.city}, ${event.province}`
      ],
      suggestedOffer: {
        commission: '8-12%',
        features: ['Real-time analytics', 'Mobile tickets', 'Customer support'],
        additional: 'Marketing promotion included'
      },
      timingRecommendation: 'Contact within 48 hours for optimal results',
      keyContacts: [event.organizer, event.contacts?.emails?.[0] || 'No email'],
      competitiveAnalysis: 'Great opportunity for partnership'
    };
    
    setAiInsights(insights);
    setSelectedEvent(event);
  };

  const logContactAttempt = async (eventId, contactMethod) => {
    try {
      const headers = await getAuthHeader() || {
        'Authorization': 'Bearer test_token_12345'
      };
      
      await axios.post(
        `${API_URL}/api/event-manager/planner/events/${eventId}/contact`,
        {
          contactMethod,
          notes: `Contacted via ${contactMethod}`,
          followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        { headers }
      );
      console.log('✅ Contact logged');
    } catch (error) {
      console.error('❌ Error logging contact:', error);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.organizer?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || event.category === filter;
    const matchesAgeGroup = ageGroup === 'all' || event.ageGroup === ageGroup;
    return matchesSearch && matchesFilter && matchesAgeGroup;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(a.date) - new Date(b.date);
      case 'potential':
        const potentialOrder = { 'very high': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return (potentialOrder[b.potential] || 0) - (potentialOrder[a.potential] || 0);
      case 'attendance':
        return (b.estimatedAttendance || 0) - (a.estimatedAttendance || 0);
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      default:
        return 0;
    }
  });

  const getPotentialColor = (potential) => {
    const colors = {
      'very high': '#10b981',
      'high': '#3b82f6',
      'medium': '#f59e0b',
      'low': '#64748b'
    };
    return colors[potential] || '#64748b';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'music': 'musical-notes',
      'sports': 'basketball',
      'arts': 'color-palette',
      'food': 'restaurant',
      'lifestyle': 'sparkles',
      'theatre': 'film',
      'festival': 'bonfire',
      'business': 'business'
    };
    return icons[category] || 'calendar';
  };

  const DebugInfo = () => (
    <View style={styles.debugInfo}>
      <Text style={styles.debugText}>
        🐛 Debug: {events.length} events in state | Loading: {loading ? 'YES' : 'NO'}
      </Text>
    </View>
  );

  const EventListItem = ({ event }) => (
    <TouchableOpacity 
      style={styles.eventListItem}
      onPress={() => fetchAIInsights(event)}
    >
      <View style={styles.listItemContent}>
        <View style={styles.listItemMain}>
          <View style={styles.listItemHeader}>
            <View style={styles.categoryIcon}>
              <Ionicons name={getCategoryIcon(event.category)} size={16} color="#6366f1" />
            </View>
            <Text style={styles.listEventName} numberOfLines={1}>{event.name}</Text>
            <View style={[styles.potentialBadge, { backgroundColor: getPotentialColor(event.potential) + '20' }]}>
              <Text style={[styles.potentialText, { color: getPotentialColor(event.potential) }]}>
                {event.potential}
              </Text>
            </View>
          </View>
          
          <View style={styles.listItemDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="business" size={12} color="#64748b" />
              <Text style={styles.detailText}>{event.organizer}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="location" size={12} color="#64748b" />
              <Text style={styles.detailText}>{event.city}, {event.province}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={12} color="#64748b" />
              <Text style={styles.detailText}>
                {new Date(event.date).toLocaleDateString('en-ZA', { 
                  day: 'numeric', 
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>
          </View>

          {event.source && (
            <View style={styles.sourceTag}>
              <Ionicons name="link" size={10} color="#64748b" />
              <Text style={styles.sourceText}>{event.source}</Text>
            </View>
          )}
        </View>

        <View style={styles.listItemStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{event.estimatedAttendance?.toLocaleString() || 'N/A'}</Text>
            <Text style={styles.statLabel}>Attendees</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{event.partnershipScore || 'N/A'}</Text>
            <Text style={styles.statLabel}>Score</Text>
          </View>
        </View>
      </View>

      <View style={styles.listItemActions}>
        <TouchableOpacity 
          style={styles.listActionButton}
          onPress={() => fetchAIInsights(event)}
        >
          <Ionicons name="sparkles" size={14} color="#6366f1" />
          <Text style={styles.listActionText}>Insights</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.listActionButton}
          onPress={() => {
            if (event.contacts?.emails?.[0]) {
              Linking.openURL(`mailto:${event.contacts.emails[0]}`);
              logContactAttempt(event.id, 'email');
            }
          }}
        >
          <Ionicons name="mail" size={14} color="#10b981" />
          <Text style={styles.listActionText}>Email</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.listActionButton}
          onPress={() => {
            const website = event.contacts?.websites?.[0] || event.sourceUrl;
            if (website) {
              Linking.openURL(website);
              logContactAttempt(event.id, 'website');
            }
          }}
        >
          <Ionicons name="globe" size={14} color="#3b82f6" />
          <Text style={styles.listActionText}>Website</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const AIInsightsModal = () => {
    if (!selectedEvent || !aiInsights) return null;

    return (
      <Modal
        visible={!!selectedEvent}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setSelectedEvent(null);
          setAiInsights(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Partnership Insights</Text>
              <TouchableOpacity onPress={() => {
                setSelectedEvent(null);
                setAiInsights(null);
              }}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.eventSummary}>
                <Text style={styles.eventSummaryTitle}>{selectedEvent.name}</Text>
                <Text style={styles.eventSummaryText}>{selectedEvent.organizer}</Text>
                <Text style={styles.eventSummaryText}>{selectedEvent.location}</Text>
                <Text style={styles.eventSummaryDate}>
                  {new Date(selectedEvent.date).toLocaleDateString('en-ZA', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>

              <View style={styles.insightSection}>
                <Text style={styles.sectionTitle}>📋 Approach Strategy</Text>
                <Text style={styles.insightText}>{aiInsights.approachStrategy}</Text>
              </View>

              <View style={styles.insightSection}>
                <Text style={styles.sectionTitle}>📊 Partnership Assessment</Text>
                {aiInsights.partnershipPotential?.map((factor, index) => (
                  <View key={index} style={styles.factorItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.factorText}>{factor}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => {
                    if (selectedEvent.contacts?.emails?.[0]) {
                      Linking.openURL(`mailto:${selectedEvent.contacts.emails[0]}`);
                      logContactAttempt(selectedEvent.id, 'email');
                    }
                    setSelectedEvent(null);
                    setAiInsights(null);
                  }}
                >
                  <Ionicons name="mail" size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>Contact Organizer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading && events.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading events...</Text>
          <Text style={styles.loadingSubtext}>Check console for details</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <DebugInfo />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Event Planner</Text>
          <Text style={styles.headerSubtitle}>
            {events.length} events loaded
            {isUsingMockData && ' (Sample Data)'}
          </Text>
        </View>
        <View style={styles.headerStats}>
          <View style={styles.statBadge}>
            <Ionicons name="calendar" size={16} color="#6366f1" />
            <Text style={styles.statBadgeText}>{sortedEvents.length} Events</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.listContainer}>
        <FlatList
          data={sortedEvents}
          renderItem={({ item }) => <EventListItem event={item} />}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#6366f1']}
              tintColor="#6366f1"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color="#e2e8f0" />
              <Text style={styles.emptyStateText}>
                {loading ? 'Loading...' : 'No events found'}
              </Text>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={onRefresh}
              >
                <Ionicons name="refresh" size={16} color="#6366f1" />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>

      <AIInsightsModal />

      {aiLoading && (
        <View style={styles.aiLoadingOverlay}>
          <View style={styles.aiLoadingContent}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.aiLoadingText}>Generating insights...</Text>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  debugInfo: {
    backgroundColor: '#fff3cd',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ffc107',
  },
  debugText: {
    fontSize: 12,
    color: '#856404',
    fontFamily: 'monospace',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerContent: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  headerStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statBadgeText: {
    color: '#0369a1',
    fontSize: 14,
    fontWeight: '600',
  },
  filterSection: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    marginHorizontal: 24,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  eventListItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  listItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  listItemMain: {
    flex: 1,
    marginRight: 16,
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  listEventName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginRight: 8,
  },
  potentialBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  potentialText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listItemDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourceText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  listItemStats: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e2e8f0',
  },
  listItemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
    marginTop: 12,
  },
  listActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  listActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 48,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.9,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalScroll: {
    paddingHorizontal: 24,
  },
  eventSummary: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  eventSummaryTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  eventSummaryText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  eventSummaryDate: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
    marginTop: 8,
  },
  insightSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  insightText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  factorText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  actionButtons: {
    paddingVertical: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  aiLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiLoadingContent: {
    backgroundColor: '#fff',
    paddingHorizontal: 40,
    paddingVertical: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  aiLoadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
});

export default EventPlannerScreen;