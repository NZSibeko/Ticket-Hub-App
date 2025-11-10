// EventPlannerScreen.web.js - FIXED VERSION
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
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('date');
  const [stats, setStats] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [scraperStatus, setScraperStatus] = useState(null);

  useEffect(() => {
    console.log('🎯 EventPlannerScreen mounted, fetching events...');
    console.log('👤 Current user:', user);
    console.log('🔑 User type:', user?.userType);
    fetchEvents();
    fetchScraperStatus();
  }, []);

  const fetchScraperStatus = async () => {
    try {
      const headers = await getAuthHeader();
      console.log('📡 Fetching scraper status with headers:', headers);
      
      const response = await axios.get(
        `${API_URL}/api/event-manager/planner/scraper-status`,
        { headers }
      );
      
      if (response.data.success) {
        setScraperStatus(response.data.status);
        console.log('✅ Scraper status:', response.data.status);
      }
    } catch (error) {
      console.error('❌ Error fetching scraper status:', error.response?.status, error.response?.data);
      // Don't show error to user - this is optional info
    }
  };

  const fetchEvents = async (forceRefresh = false) => {
    try {
      setLoading(true);
      console.log('🔄 Fetching events...');
      
      // Get auth header
      const headers = await getAuthHeader();
      console.log('🔑 Auth headers:', headers);
      
      if (!headers || !headers.Authorization) {
        console.error('❌ No authorization token available');
        Alert.alert(
          'Authentication Error',
          'Please log in again to access event data.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
        return;
      }
      
      // Build query parameters
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('category', filter);
      if (ageGroup !== 'all') params.append('ageGroup', ageGroup);
      if (searchQuery) params.append('search', searchQuery);
      if (sortBy) params.append('sortBy', sortBy);
      if (forceRefresh) params.append('refresh', 'true');

      const url = `${API_URL}/api/event-manager/planner/events?${params}`;
      console.log('🔄 Fetching events from:', url);
      
      const response = await axios.get(url, { 
        headers,
        timeout: 15000 
      });
      
      console.log('📊 API Response status:', response.status);
      console.log('📊 API Response data:', response.data);
      
      if (response.data.success) {
        const fetchedEvents = response.data.events || [];
        setEvents(fetchedEvents);
        setStats(response.data.sources || {});
        setLastUpdated(response.data.lastUpdated || new Date().toISOString());
        setIsUsingMockData(!response.data.usingRealData);
        
        console.log(`✅ Loaded ${fetchedEvents.length} events`);
        console.log(`📊 Data Source: ${response.data.usingRealData ? 'REAL SCRAPED DATA' : 'MOCK DATA'}`);
        console.log('📊 Sources:', response.data.sources);
      } else {
        throw new Error(response.data.error || 'Failed to fetch events');
      }
    } catch (error) {
      console.error('❌ Error fetching events:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      if (error.response) {
        if (error.response.status === 401 || error.response.status === 403) {
          Alert.alert(
            'Authentication Error',
            'Your session has expired. Please log in again.',
            [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
          );
        } else if (error.response.status === 500) {
          Alert.alert(
            'Server Error',
            'Temporary server issue. Please try again later.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Error',
            `Failed to load events: ${error.response.data?.error || error.message}`,
            [{ text: 'OK' }]
          );
        }
      } else if (error.request) {
        Alert.alert(
          'Connection Error',
          'Cannot connect to server. Please check your internet connection and try again.',
          [{ text: 'Retry', onPress: () => fetchEvents(forceRefresh) }]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to load events. Please try again.',
          [{ text: 'OK' }]
        );
      }
      
      setEvents([]);
      setStats({});
      setIsUsingMockData(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents(true);
  };

  const fetchAIInsights = async (event) => {
    setAiLoading(true);
    try {
      const headers = await getAuthHeader();
      
      if (!headers || !headers.Authorization) {
        throw new Error('No authorization token');
      }
      
      console.log('🤖 Fetching AI insights for event:', event.id);
      
      const response = await axios.get(
        `${API_URL}/api/event-manager/planner/events/${event.id}/insights`,
        { headers }
      );

      console.log('✅ AI insights response:', response.data);

      if (response.data.success) {
        setAiInsights(response.data.insights);
        setSelectedEvent(response.data.event);
      } else {
        throw new Error('Failed to generate insights');
      }
    } catch (error) {
      console.error('❌ Error fetching AI insights:', error);
      console.error('❌ Error response:', error.response?.data);
      // Fallback to generating insights locally
      generateFallbackInsights(event);
    } finally {
      setAiLoading(false);
    }
  };

  const generateFallbackInsights = (event) => {
    console.log('🔄 Generating fallback insights for:', event.name);
    
    const insights = {
      approachStrategy: `Direct approach to ${event.contact?.name || event.organizer || 'the event coordinator'} highlighting our platform's ability to reach ${event.estimatedAttendance?.toLocaleString() || 'thousands of'} potential attendees.`,
      partnershipPotential: [
        `Estimated attendance: ${event.estimatedAttendance?.toLocaleString() || 'Significant number of'} attendees`,
        `Event category: ${event.category}`,
        `Location: ${event.city}, ${event.province}`,
        `Ticket range: ${event.ticketPriceRange || 'Various prices'}`
      ],
      suggestedOffer: {
        commission: '8-12%',
        features: ['Real-time analytics', 'Mobile ticket delivery', 'Customer support', 'Marketing promotion'],
        additional: 'Social media marketing package'
      },
      timingRecommendation: getTimingRecommendation(event.date),
      keyContacts: [event.contact?.name || event.organizer || 'Event Coordinator', 'Marketing Manager', 'Partnerships Director'],
      competitiveAnalysis: 'Opportunity to provide modern ticketing solution'
    };
    
    setAiInsights(insights);
    setSelectedEvent(event);
  };

  const getTimingRecommendation = (eventDate) => {
    const monthsUntilEvent = (new Date(eventDate) - new Date()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsUntilEvent > 6) return "Ideal time to approach - early planning phase";
    if (monthsUntilEvent > 3) return "Good timing - ticketing decisions being made";
    if (monthsUntilEvent > 1) return "Urgent approach needed - limited time for partnership";
    return "Last minute - expedited setup required";
  };

  const logContactAttempt = async (eventId, contactMethod) => {
    try {
      const headers = await getAuthHeader();
      
      if (!headers || !headers.Authorization) {
        console.warn('⚠️ No auth token, skipping contact logging');
        return;
      }
      
      await axios.post(
        `${API_URL}/api/event-manager/planner/events/${eventId}/contact`,
        {
          contactMethod,
          notes: `Contacted via ${contactMethod}`,
          followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        { headers }
      );
      console.log('✅ Contact attempt logged');
    } catch (error) {
      console.error('❌ Error logging contact:', error);
      // Don't show error to user - this is optional tracking
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
      'education': 'school',
      'market': 'cart',
      'comedy': 'happy',
      'business': 'business'
    };
    return icons[category] || 'calendar';
  };

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
            <Text style={styles.statValue}>{event.ticketPriceRange || 'TBA'}</Text>
            <Text style={styles.statLabel}>Tickets</Text>
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
            if (event.contact?.email) {
              Linking.openURL(`mailto:${event.contact.email}`).then(() => {
                logContactAttempt(event.id, 'email');
              });
            }
          }}
        >
          <Ionicons name="mail" size={14} color="#10b981" />
          <Text style={styles.listActionText}>Email</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.listActionButton}
          onPress={() => {
            const website = event.contact?.website || 'https://www.google.com';
            Linking.openURL(website).then(() => {
              logContactAttempt(event.id, 'website');
            });
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
                <Text style={styles.eventSummaryText}>{selectedEvent.location}, {selectedEvent.city}</Text>
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
                {aiInsights.partnershipPotential.map((factor, index) => (
                  <View key={index} style={styles.factorItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.factorText}>{factor}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.insightSection}>
                <Text style={styles.sectionTitle}>💼 Suggested Offer</Text>
                <View style={styles.offerCard}>
                  <Text style={styles.offerCommission}>Commission: {aiInsights.suggestedOffer.commission}</Text>
                  <View style={styles.offerFeatures}>
                    {aiInsights.suggestedOffer.features.map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <Ionicons name="star" size={12} color="#f59e0b" />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                  {aiInsights.suggestedOffer.additional && (
                    <Text style={styles.offerBonus}>{aiInsights.suggestedOffer.additional}</Text>
                  )}
                </View>
              </View>

              <View style={styles.insightSection}>
                <Text style={styles.sectionTitle}>⏰ Timing Recommendation</Text>
                <Text style={styles.insightText}>{aiInsights.timingRecommendation}</Text>
              </View>

              <View style={styles.insightSection}>
                <Text style={styles.sectionTitle}>👥 Key Contacts</Text>
                <View style={styles.contactsList}>
                  {aiInsights.keyContacts.map((contact, index) => (
                    <View key={index} style={styles.contactItem}>
                      <Ionicons name="person" size={16} color="#6366f1" />
                      <Text style={styles.contactText}>{contact}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => {
                    if (selectedEvent.contact?.email) {
                      Linking.openURL(`mailto:${selectedEvent.contact.email}`).then(() => {
                        logContactAttempt(selectedEvent.id, 'email');
                      });
                    }
                    setSelectedEvent(null);
                    setAiInsights(null);
                  }}
                >
                  <Ionicons name="mail" size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>Contact Organizer</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.secondaryButton}
                  onPress={() => {
                    navigation.navigate('CreateEvent', { templateEvent: selectedEvent });
                    setSelectedEvent(null);
                    setAiInsights(null);
                  }}
                >
                  <Ionicons name="copy" size={20} color="#6366f1" />
                  <Text style={styles.secondaryButtonText}>Create Similar Event</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString('en-ZA');
  };

  if (loading && events.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Scanning South African events...</Text>
          <Text style={styles.loadingSubtext}>This may take a few moments</Text>
          <Text style={styles.loadingSubtext}>Checking event sources...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Event Planner</Text>
          <Text style={styles.headerSubtitle}>
            Real-time South African event opportunities
            {isUsingMockData && ' (Using Sample Data)'}
          </Text>
          {lastUpdated && (
            <Text style={styles.lastUpdated}>
              Updated {formatLastUpdated(lastUpdated)}
              {scraperStatus && ` • ${scraperStatus.activeSources} active sources`}
            </Text>
          )}
        </View>
        <View style={styles.headerStats}>
          <View style={styles.statBadge}>
            <Ionicons name="calendar" size={16} color="#6366f1" />
            <Text style={styles.statBadgeText}>{events.length} Events</Text>
          </View>
          {stats && (
            <View style={[styles.sourcesBadge, isUsingMockData && styles.mockDataBadge]}>
              <Ionicons name="globe" size={14} color={isUsingMockData ? "#f59e0b" : "#10b981"} />
              <Text style={styles.sourcesText}>
                {isUsingMockData ? 'Sample Data' : `${Object.keys(stats).length} Sources`}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Advanced Filter Section */}
      <View style={styles.filterSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, organizers, locations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#64748b" />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          <View style={styles.filterRow}>
            {/* Category Filters */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupLabel}>Category</Text>
              <View style={styles.filterChips}>
                {['all', 'music', 'sports', 'arts', 'food', 'lifestyle', 'theatre', 'festival', 'business'].map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[styles.filterChip, filter === category && styles.filterChipActive]}
                    onPress={() => setFilter(category)}
                  >
                    <Text style={[styles.filterChipText, filter === category && styles.filterChipTextActive]}>
                      {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Age Group Filters */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupLabel}>Audience</Text>
              <View style={styles.filterChips}>
                {['all', 'family', 'youth', 'adult'].map((age) => (
                  <TouchableOpacity
                    key={age}
                    style={[styles.filterChip, ageGroup === age && styles.filterChipActive]}
                    onPress={() => setAgeGroup(age)}
                  >
                    <Text style={[styles.filterChipText, ageGroup === age && styles.filterChipTextActive]}>
                      {age === 'all' ? 'All Ages' : age.charAt(0).toUpperCase() + age.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort Options */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupLabel}>Sort By</Text>
              <View style={styles.filterChips}>
                {['date', 'potential', 'attendance', 'name'].map((sort) => (
                  <TouchableOpacity
                    key={sort}
                    style={[styles.filterChip, sortBy === sort && styles.filterChipActive]}
                    onPress={() => setSortBy(sort)}
                  >
                    <Text style={[styles.filterChipText, sortBy === sort && styles.filterChipTextActive]}>
                      {sort === 'date' ? 'Date' : sort === 'potential' ? 'Potential' : sort === 'attendance' ? 'Attendance' : 'Name'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <View>
          <Text style={styles.resultsTitle}>
            {sortedEvents.length} {filteredEvents.length !== sortedEvents.length ? 'Filtered' : ''} Events
          </Text>
          {stats && (
            <Text style={styles.resultsSubtitle}>
              {isUsingMockData 
                ? 'Sample data for demonstration' 
                : `From ${Object.values(stats).reduce((a, b) => a + b, 0)} events across ${Object.keys(stats).length} sources`
              }
            </Text>
          )}
        </View>
        <View style={styles.viewControls}>
          <TouchableOpacity 
            style={[styles.viewButton, viewMode === 'list' && styles.viewButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list" size={16} color={viewMode === 'list' ? '#6366f1' : '#64748b'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewButton, viewMode === 'grid' && styles.viewButtonActive]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons name="grid" size={16} color={viewMode === 'grid' ? '#6366f1' : '#64748b'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Events List */}
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
                {loading ? 'Loading events...' : 'No events found'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery 
                  ? 'Try adjusting your search terms' 
                  : events.length === 0 
                    ? 'Pull down to refresh and scan for events'
                    : 'No events match your current filters'
                }
              </Text>
              {!loading && (
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={onRefresh}
                >
                  <Ionicons name="refresh" size={16} color="#6366f1" />
                  <Text style={styles.refreshButtonText}>
                    {events.length === 0 ? 'Scan for Events' : 'Refresh Events'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListFooterComponent={
            events.length > 0 ? (
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Showing {sortedEvents.length} of {events.length} events
                  {isUsingMockData && ' (Sample Data)'}
                </Text>
                <TouchableOpacity onPress={onRefresh}>
                  <Text style={styles.refreshLink}>Refresh for latest events</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      </View>

      {/* AI Insights Modal */}
      <AIInsightsModal />

      {aiLoading && (
        <View style={styles.aiLoadingOverlay}>
          <View style={styles.aiLoadingContent}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.aiLoadingText}>Generating AI insights...</Text>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  lastUpdated: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
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
  sourcesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  mockDataBadge: {
    backgroundColor: '#fef3c7',
  },
  sourcesText: {
    color: '#059669',
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
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  filterScroll: {
    marginHorizontal: 24,
  },
  filterScrollContent: {
    flexGrow: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 24,
  },
  filterGroup: {
    marginRight: 24,
  },
  filterGroupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  resultsSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  viewControls: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 4,
  },
  viewButton: {
    padding: 8,
    borderRadius: 6,
  },
  viewButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
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
    textAlign: 'center',
  },
  emptyStateSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
  },
  refreshButtonText: {
    color: '#0369a1',
    fontWeight: '600',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  refreshLink: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
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
    maxHeight: height * 0.85,
    minHeight: height * 0.6,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  eventSummaryText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  eventSummaryDate: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
    marginTop: 4,
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
    lineHeight: 20,
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
  offerCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
  },
  offerCommission: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 12,
  },
  offerFeatures: {
    gap: 8,
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  offerBonus: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  contactsList: {
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  actionButtons: {
    paddingVertical: 24,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0f9ff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  secondaryButtonText: {
    color: '#0369a1',
    fontSize: 16,
    fontWeight: '600',
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
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  aiLoadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
});

export default EventPlannerScreen;