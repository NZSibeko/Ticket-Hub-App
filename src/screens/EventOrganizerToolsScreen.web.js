// src/screens/EventOrganizerToolsScreen.web.js
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';

// Fallback theme context for web if ThemeContext doesn't exist
const useTheme = () => {
  const colors = {
    // Modern color palette
    primary: '#6366F1',
    primaryLight: '#818CF8',
    secondary: '#10B981',
    accent: '#F59E0B',
    danger: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
    
    card: '#FFFFFF',
    cardElevated: '#F8FAFC',
    surface: '#F1F5F9',
    surfaceDark: '#E2E8F0',
    text: '#1E293B',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    background: '#F8FAFC',
    
    // Chart colors
    chart1: '#6366F1',
    chart2: '#10B981',
    chart3: '#F59E0B',
    chart4: '#EF4444',
    chart5: '#8B5CF6',
  };
  
  return { colors };
};

// Currency options (added South African Rand)
const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
];

const EventOrganizerToolsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [attendeeData, setAttendeeData] = useState([]);
  const [eventPerformanceData, setEventPerformanceData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadEventData();
  }, [selectedPeriod, selectedEvent, selectedCurrency]);

  const loadEventData = async () => {
    setLoading(true);
    try {
      setTimeout(() => {
        const mockStats = {
          totalRevenue: 15250,
          totalAttendees: 324,
          ticketSales: 450,
          averageTicketPrice: 33.89,
          conversionRate: 68,
          topEvent: 'Summer Music Festival',
          topEventRevenue: 8250,
          activeEvents: 7,
          pendingEvents: 3,
          completedEvents: 12,
          cancelledEvents: 2,
          refundRate: 2.5,
          avgEventRating: 4.6,
          repeatAttendees: 85,
          socialMediaReach: 12500,
          emailOpenRate: 42,
          checkInRate: 96,
          vipAttendees: 45,
          sponsorshipRevenue: 5000,
          avgTicketPriceTrend: 8,
          peakSalesTime: '7-9 PM',
          mostPopularDay: 'Saturday',
          avgPurchaseValue: 89.50,
          revenueGrowth: 24,
          customerSatisfaction: 92,
        };

        const mockAttendeeData = [
          { label: '18-24', value: 35, color: colors.chart1 },
          { label: '25-34', value: 40, color: colors.chart2 },
          { label: '35-44', value: 15, color: colors.chart3 },
          { label: '45+', value: 10, color: colors.chart4 },
        ];

        const mockEventPerformanceData = [
          { name: 'Music Fest', revenue: 8250, attendees: 120, rating: 4.8, capacity: 85 },
          { name: 'Tech Conf', revenue: 5200, attendees: 85, rating: 4.5, capacity: 90 },
          { name: 'Food Fair', revenue: 4800, attendees: 150, rating: 4.7, capacity: 95 },
          { name: 'Art Expo', revenue: 3100, attendees: 65, rating: 4.3, capacity: 70 },
          { name: 'Biz Summit', revenue: 6200, attendees: 110, rating: 4.6, capacity: 88 },
        ];

        const mockEvents = [
          { id: 1, name: 'Summer Music Festival', date: '2024-07-15', revenue: 8250, attendees: 120, status: 'active' },
          { id: 2, name: 'Tech Conference', date: '2024-06-22', revenue: 5200, attendees: 85, status: 'completed' },
          { id: 3, name: 'Food Fair', date: '2024-05-18', revenue: 4800, attendees: 150, status: 'completed' },
          { id: 4, name: 'Art Exhibition', date: '2024-04-12', revenue: 3100, attendees: 65, status: 'completed' },
          { id: 5, name: 'Business Summit', date: '2024-08-10', revenue: 0, attendees: 0, status: 'pending' },
        ];

        setStats(mockStats);
        setAttendeeData(mockAttendeeData);
        setEventPerformanceData(mockEventPerformanceData);
        setEvents(mockEvents);
        if (!selectedEvent && mockEvents.length > 0) {
          setSelectedEvent(mockEvents[0].id);
        }
        setLoading(false);
      }, 800);
    } catch (error) {
      console.error('Error loading event data:', error);
      Alert.alert('Error', 'Failed to load event data');
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `${selectedCurrency.symbol}${amount.toLocaleString()}`;
  };

  const handleExportData = (type) => {
    Alert.alert('Export', `${type} data exported successfully!`);
  };

  const handleRefresh = () => {
    loadEventData();
  };

  const renderStatCard = (iconName, title, value, subtitle, color, trend = null) => (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
        <Icon name={iconName} size={22} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
        {subtitle && (
          <View style={styles.subtitleContainer}>
            {trend && (
              <View style={[
                styles.trendIndicator,
                { backgroundColor: trend > 0 ? `${colors.success}20` : `${colors.danger}20` }
              ]}>
                <Icon 
                  name={trend > 0 ? 'trending-up' : 'trending-down'} 
                  size={12} 
                  color={trend > 0 ? colors.success : colors.danger} 
                />
                <Text style={[
                  styles.trendText, 
                  { color: trend > 0 ? colors.success : colors.danger }
                ]}>
                  {Math.abs(trend)}%
                </Text>
              </View>
            )}
            <Text style={[styles.statSubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderAttendeeChart = () => (
    <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Attendee Demographics</Text>
          <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Age distribution</Text>
        </View>
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={() => handleExportData('Attendee')}
        >
          <Icon name="download" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.pieContainer}>
        {attendeeData.map((item, index) => (
          <View key={index} style={styles.pieSegment}>
            <View style={styles.pieInfo}>
              <View style={styles.pieHeader}>
                <View 
                  style={[
                    styles.pieColor, 
                    { backgroundColor: item.color }
                  ]} 
                />
                <Text style={[styles.pieLabel, { color: colors.text }]}>{item.label}</Text>
              </View>
              <Text style={[styles.pieValue, { color: colors.textSecondary }]}>{item.value}%</Text>
              <View style={[styles.pieBar, { backgroundColor: colors.surface }]}>
                <View 
                  style={[
                    styles.pieBarFill, 
                    { 
                      width: `${item.value}%`,
                      backgroundColor: item.color
                    }
                  ]} 
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderEventPerformance = () => (
    <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Event Performance</Text>
          <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Top 5 events by revenue</Text>
        </View>
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={() => handleExportData('Performance')}
        >
          <Icon name="download" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.performanceContainer}>
        {eventPerformanceData.map((event, index) => (
          <View key={index} style={styles.performanceItem}>
            <View style={styles.performanceHeader}>
              <Text style={[styles.performanceName, { color: colors.text }]}>{event.name}</Text>
              <Text style={[styles.performanceRevenue, { color: colors.text }]}>
                {formatCurrency(event.revenue)}
              </Text>
            </View>
            <View style={styles.performanceDetails}>
              <View style={styles.performanceStat}>
                <Icon name="account-group" size={14} color={colors.textSecondary} />
                <Text style={[styles.performanceStatText, { color: colors.textSecondary }]}>
                  {event.attendees} attendees
                </Text>
              </View>
              <View style={styles.performanceStat}>
                <Icon name="star" size={14} color={colors.warning} />
                <Text style={[styles.performanceStatText, { color: colors.textSecondary }]}>
                  {event.rating}/5
                </Text>
              </View>
              <View style={styles.performanceStat}>
                <Icon name="chart-pie" size={14} color={colors.textSecondary} />
                <Text style={[styles.performanceStatText, { color: colors.textSecondary }]}>
                  {event.capacity}% capacity
                </Text>
              </View>
            </View>
            <View style={[styles.capacityBar, { backgroundColor: colors.surface }]}>
              <View 
                style={[
                  styles.capacityFill, 
                  { 
                    width: `${event.capacity}%`,
                    backgroundColor: event.capacity > 80 ? colors.success : 
                                   event.capacity > 60 ? colors.warning : colors.danger
                  }
                ]} 
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderSalesAnalytics = () => (
    <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Sales Analytics</Text>
          <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Purchase patterns & trends</Text>
        </View>
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={() => handleExportData('Sales Analytics')}
        >
          <Icon name="download" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.salesAnalyticsContainer}>
        <View style={styles.salesMetricRow}>
          <View style={styles.salesMetric}>
            <View style={[styles.salesMetricIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Icon name="chart-timeline-variant" size={20} color={colors.primary} />
            </View>
            <View style={styles.salesMetricInfo}>
              <Text style={[styles.salesMetricLabel, { color: colors.text }]}>Avg. Purchase Value</Text>
              <Text style={[styles.salesMetricValue, { color: colors.text }]}>
                {formatCurrency(stats.avgPurchaseValue)}
              </Text>
            </View>
          </View>
          <View style={styles.salesMetric}>
            <View style={[styles.salesMetricIcon, { backgroundColor: `${colors.success}15` }]}>
              <Icon name="trending-up" size={20} color={colors.success} />
            </View>
            <View style={styles.salesMetricInfo}>
              <Text style={[styles.salesMetricLabel, { color: colors.text }]}>Ticket Price Trend</Text>
              <Text style={[styles.salesMetricValue, { color: colors.text }]}>
                +{stats.avgTicketPriceTrend}%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.salesInsight}>
          <View style={[styles.salesInsightIcon, { backgroundColor: `${colors.warning}15` }]}>
            <Icon name="clock-outline" size={18} color={colors.warning} />
          </View>
          <View style={styles.salesInsightContent}>
            <Text style={[styles.salesInsightTitle, { color: colors.text }]}>
              Peak Sales Time
            </Text>
            <Text style={[styles.salesInsightValue, { color: colors.textSecondary }]}>
              {stats.peakSalesTime} (35% of daily sales)
            </Text>
          </View>
        </View>

        <View style={styles.salesInsight}>
          <View style={[styles.salesInsightIcon, { backgroundColor: `${colors.info}15` }]}>
            <Icon name="calendar" size={18} color={colors.info} />
          </View>
          <View style={styles.salesInsightContent}>
            <Text style={[styles.salesInsightTitle, { color: colors.text }]}>
              Most Popular Day
            </Text>
            <Text style={[styles.salesInsightValue, { color: colors.textSecondary }]}>
              {stats.mostPopularDay} (42% higher than weekdays)
            </Text>
          </View>
        </View>

        <View style={styles.salesTimeline}>
          <Text style={[styles.salesTimelineTitle, { color: colors.text }]}>Sales Volume by Hour</Text>
          <View style={styles.timelineBars}>
            {['9AM', '12PM', '3PM', '6PM', '9PM'].map((time, index) => {
              const percentages = [15, 25, 20, 35, 45];
              return (
                <View key={index} style={styles.timelineBarContainer}>
                  <Text style={[styles.timelineLabel, { color: colors.textSecondary }]}>{time}</Text>
                  <View style={[styles.timelineBarBackground, { backgroundColor: colors.surface }]}>
                    <View 
                      style={[
                        styles.timelineBarFill, 
                        { 
                          height: `${percentages[index]}%`,
                          backgroundColor: index === 4 ? colors.primary : colors.primaryLight
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.timelineValue, { color: colors.textSecondary }]}>
                    {percentages[index]}%
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.conversionFunnel}>
          <Text style={[styles.conversionTitle, { color: colors.text }]}>Conversion Funnel</Text>
          <View style={styles.funnelSteps}>
            <View style={styles.funnelStep}>
              <View style={[styles.funnelStepDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.funnelStepLabel, { color: colors.text }]}>Page Views</Text>
              <Text style={[styles.funnelStepValue, { color: colors.textSecondary }]}>5,240</Text>
            </View>
            <View style={styles.funnelArrow}>
              <Icon name="chevron-right" size={16} color={colors.textTertiary} />
            </View>
            <View style={styles.funnelStep}>
              <View style={[styles.funnelStepDot, { backgroundColor: colors.info }]} />
              <Text style={[styles.funnelStepLabel, { color: colors.text }]}>Add to Cart</Text>
              <Text style={[styles.funnelStepValue, { color: colors.textSecondary }]}>1,890</Text>
            </View>
            <View style={styles.funnelArrow}>
              <Icon name="chevron-right" size={16} color={colors.textTertiary} />
            </View>
            <View style={styles.funnelStep}>
              <View style={[styles.funnelStepDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.funnelStepLabel, { color: colors.text }]}>Purchases</Text>
              <Text style={[styles.funnelStepValue, { color: colors.textSecondary }]}>450</Text>
            </View>
          </View>
          <Text style={[styles.conversionRate, { color: colors.textTertiary }]}>
            Overall conversion rate: {stats.conversionRate}%
          </Text>
        </View>
      </View>
    </View>
  );

  const renderEventStatus = () => (
    <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Event Status</Text>
          <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Distribution</Text>
        </View>
      </View>
      <View style={styles.statusDistribution}>
        <View style={styles.statusItem}>
          <View style={[styles.statusIcon, { backgroundColor: `${colors.success}20` }]}>
            <Icon name="play-circle" size={20} color={colors.success} />
          </View>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: colors.text }]}>Active</Text>
            <Text style={[styles.statusValue, { color: colors.textSecondary }]}>
              {stats.activeEvents} events
            </Text>
          </View>
        </View>
        <View style={styles.statusItem}>
          <View style={[styles.statusIcon, { backgroundColor: `${colors.textTertiary}20` }]}>
            <Icon name="check-circle" size={20} color={colors.textTertiary} />
          </View>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: colors.text }]}>Completed</Text>
            <Text style={[styles.statusValue, { color: colors.textSecondary }]}>
              {stats.completedEvents} events
            </Text>
          </View>
        </View>
        <View style={styles.statusItem}>
          <View style={[styles.statusIcon, { backgroundColor: `${colors.warning}20` }]}>
            <Icon name="clock" size={20} color={colors.warning} />
          </View>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: colors.text }]}>Pending</Text>
            <Text style={[styles.statusValue, { color: colors.textSecondary }]}>
              {stats.pendingEvents} events
            </Text>
          </View>
        </View>
        <View style={styles.statusItem}>
          <View style={[styles.statusIcon, { backgroundColor: `${colors.danger}20` }]}>
            <Icon name="close-circle" size={20} color={colors.danger} />
          </View>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: colors.text }]}>Cancelled</Text>
            <Text style={[styles.statusValue, { color: colors.textSecondary }]}>
              {stats.cancelledEvents} events
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderCustomerSatisfaction = () => (
    <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Customer Satisfaction</Text>
          <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Feedback & ratings</Text>
        </View>
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={() => handleExportData('Customer Feedback')}
        >
          <Icon name="download" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.satisfactionContainer}>
        <View style={styles.satisfactionScore}>
          <View style={[styles.scoreCircle, { borderColor: colors.success }]}>
            <Text style={[styles.scoreValue, { color: colors.text }]}>{stats.customerSatisfaction}</Text>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>NPS Score</Text>
          </View>
          <View style={styles.scoreBreakdown}>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreItemLabel, { color: colors.text }]}>Promoters</Text>
              <Text style={[styles.scoreItemValue, { color: colors.success }]}>68%</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreItemLabel, { color: colors.text }]}>Passives</Text>
              <Text style={[styles.scoreItemValue, { color: colors.warning }]}>24%</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreItemLabel, { color: colors.text }]}>Detractors</Text>
              <Text style={[styles.scoreItemValue, { color: colors.danger }]}>8%</Text>
            </View>
          </View>
        </View>

        <View style={styles.ratingDistribution}>
          <Text style={[styles.ratingTitle, { color: colors.text }]}>Rating Distribution</Text>
          {[5, 4, 3, 2, 1].map((stars) => {
            const percentages = [65, 20, 8, 4, 3];
            return (
              <View key={stars} style={styles.ratingRow}>
                <View style={styles.ratingStars}>
                  <Text style={[styles.ratingNumber, { color: colors.text }]}>{stars}</Text>
                  <Icon name="star" size={14} color={colors.warning} />
                </View>
                <View style={[styles.ratingBarBackground, { backgroundColor: colors.surface }]}>
                  <View 
                    style={[
                      styles.ratingBarFill, 
                      { 
                        width: `${percentages[5-stars]}%`,
                        backgroundColor: stars >= 4 ? colors.success : 
                                       stars >= 3 ? colors.warning : colors.danger
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.ratingPercentage, { color: colors.textSecondary }]}>
                  {percentages[5-stars]}%
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.feedbackHighlights}>
          <Text style={[styles.feedbackTitle, { color: colors.text }]}>Feedback Highlights</Text>
          <View style={styles.feedbackItem}>
            <Icon name="thumb-up" size={16} color={colors.success} />
            <Text style={[styles.feedbackText, { color: colors.text }]}>
              "Excellent organization and communication"
            </Text>
          </View>
          <View style={styles.feedbackItem}>
            <Icon name="thumb-up" size={16} color={colors.success} />
            <Text style={[styles.feedbackText, { color: colors.text }]}>
              "Great venue and professional staff"
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderEventSelector = () => (
    <View style={[styles.selectorCard, { backgroundColor: colors.card }]}>
      <View style={styles.selectorHeader}>
        <Text style={[styles.selectorTitle, { color: colors.text }]}>Event Overview</Text>
        <TouchableOpacity 
          style={[styles.currencySelector, { borderColor: colors.border }]}
          onPress={() => setShowCurrencyModal(true)}
        >
          <Text style={[styles.currencyText, { color: colors.text }]}>{selectedCurrency.code}</Text>
          <Icon name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.eventScroll}
        contentContainerStyle={styles.eventScrollContent}
      >
        {events.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={[
              styles.eventCard,
              { 
                backgroundColor: selectedEvent === event.id ? colors.primary : colors.card,
                borderColor: colors.border,
              }
            ]}
            onPress={() => setSelectedEvent(event.id)}
          >
            <View style={styles.eventCardHeader}>
              <Text 
                style={[
                  styles.eventCardTitle, 
                  { color: selectedEvent === event.id ? colors.card : colors.text }
                ]}
                numberOfLines={2}
              >
                {event.name}
              </Text>
              <View style={[
                styles.statusBadge,
                { 
                  backgroundColor: selectedEvent === event.id ? colors.card :
                                 event.status === 'active' ? `${colors.success}20` :
                                 event.status === 'completed' ? `${colors.textTertiary}20` :
                                 `${colors.warning}20`
                }
              ]}>
                <Text style={[
                  styles.statusText,
                  { 
                    color: selectedEvent === event.id ? colors.primary :
                           event.status === 'active' ? colors.success :
                           event.status === 'completed' ? colors.textTertiary :
                           colors.warning
                  }
                ]}>
                  {event.status}
                </Text>
              </View>
            </View>
            <View style={styles.eventCardStats}>
              <View style={styles.eventStat}>
                <Icon 
                  name="cash" 
                  size={14} 
                  color={selectedEvent === event.id ? colors.card : colors.textSecondary} 
                />
                <Text style={[
                  styles.eventStatValue, 
                  { color: selectedEvent === event.id ? colors.card : colors.text }
                ]}>
                  {formatCurrency(event.revenue)}
                </Text>
              </View>
              <View style={styles.eventStat}>
                <Icon 
                  name="account-group" 
                  size={14} 
                  color={selectedEvent === event.id ? colors.card : colors.textSecondary} 
                />
                <Text style={[
                  styles.eventStatValue, 
                  { color: selectedEvent === event.id ? colors.card : colors.text }
                ]}>
                  {event.attendees}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderCurrencyModal = () => (
    <Modal
      visible={showCurrencyModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowCurrencyModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Currency</Text>
            <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={[styles.searchContainer, { borderColor: colors.border }]}>
            <Icon name="magnify" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search currency..."
              placeholderTextColor={colors.textTertiary}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
          
          <ScrollView style={styles.currencyList}>
            {CURRENCIES
              .filter(currency => 
                currency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                currency.code.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((currency) => (
                <TouchableOpacity
                  key={currency.code}
                  style={[
                    styles.currencyItem,
                    { 
                      backgroundColor: selectedCurrency.code === currency.code ? 
                        `${colors.primary}10` : 'transparent',
                      borderBottomColor: colors.border
                    }
                  ]}
                  onPress={() => {
                    setSelectedCurrency(currency);
                    setShowCurrencyModal(false);
                    setSearchTerm('');
                  }}
                >
                  <View style={styles.currencyInfo}>
                    <Text style={[styles.currencyCode, { color: colors.text }]}>
                      {currency.code}
                    </Text>
                    <Text style={[styles.currencyName, { color: colors.textSecondary }]}>
                      {currency.name}
                    </Text>
                  </View>
                  <Text style={[styles.currencySymbol, { color: colors.text }]}>
                    {currency.symbol}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading analytics dashboard...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenContainer>
        <ScrollView 
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Analytics Dashboard</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Track performance and insights across all events
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={[styles.headerButton, { backgroundColor: colors.surface }]}
                onPress={handleRefresh}
              >
                <Icon name="refresh" size={18} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.headerButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('EventManagement')}
              >
                <Text style={[styles.headerButtonText, { color: colors.card }]}>Manage Events</Text>
              </TouchableOpacity>
            </View>
          </View>

          {renderEventSelector()}

          <View style={styles.statsGrid}>
            {renderStatCard(
              'cash-multiple',
              'Total Revenue',
              formatCurrency(stats.totalRevenue),
              `+${stats.revenueGrowth}% from last quarter`,
              colors.success,
              stats.revenueGrowth
            )}
            {renderStatCard(
              'account-group',
              'Total Attendees',
              stats.totalAttendees.toLocaleString(),
              `${stats.activeEvents} active events`,
              colors.info,
              8
            )}
            {renderStatCard(
              'ticket',
              'Ticket Sales',
              stats.ticketSales.toLocaleString(),
              `Avg: ${formatCurrency(stats.averageTicketPrice)}`,
              colors.primary,
              15
            )}
            {renderStatCard(
              'chart-line-variant',
              'Conversion Rate',
              `${stats.conversionRate}%`,
              'Industry avg: 45%',
              colors.secondary,
              5
            )}
            {renderStatCard(
              'star-circle',
              'Avg Rating',
              stats.avgEventRating.toFixed(1),
              'Based on 245 reviews',
              colors.warning,
              2
            )}
            {renderStatCard(
              'repeat',
              'Repeat Attendees',
              `${stats.repeatAttendees}`,
              'Loyal customers',
              colors.chart5,
              18
            )}
            {renderStatCard(
              'handshake',
              'Sponsorship',
              formatCurrency(stats.sponsorshipRevenue),
              'Additional revenue',
              colors.accent,
              25
            )}
            {renderStatCard(
              'check-circle',
              'Check-in Rate',
              `${stats.checkInRate}%`,
              'Successful check-ins',
              colors.success,
              3
            )}
          </View>

          <View style={styles.chartsRow}>
            <View style={styles.chartColumn}>
              {renderEventPerformance()}
              {renderSalesAnalytics()}
            </View>
            <View style={styles.chartColumn}>
              {renderAttendeeChart()}
              {renderCustomerSatisfaction()}
              {renderEventStatus()}
            </View>
          </View>

          <View style={styles.insightsCard}>
            <View style={styles.insightsHeader}>
              <Text style={[styles.insightsTitle, { color: colors.text }]}>Key Insights</Text>
              <TouchableOpacity onPress={() => handleExportData('Insights')}>
                <Icon name="file-export" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.insightsGrid}>
              <View style={[styles.insightCard, { backgroundColor: `${colors.success}10` }]}>
                <Icon name="trending-up" size={24} color={colors.success} />
                <Text style={[styles.insightText, { color: colors.text }]}>
                  Revenue increased by <Text style={{ fontWeight: 'bold', color: colors.success }}>24%</Text> this quarter
                </Text>
              </View>
              <View style={[styles.insightCard, { backgroundColor: `${colors.info}10` }]}>
                <Icon name="calendar-star" size={24} color={colors.info} />
                <Text style={[styles.insightText, { color: colors.text }]}>
                  Weekend events convert <Text style={{ fontWeight: 'bold', color: colors.info }}>35% better</Text>
                </Text>
              </View>
              <View style={[styles.insightCard, { backgroundColor: `${colors.warning}10` }]}>
                <Icon name="account-supervisor" size={24} color={colors.warning} />
                <Text style={[styles.insightText, { color: colors.text }]}>
                  <Text style={{ fontWeight: 'bold', color: colors.warning }}>VIP attendees</Text> spend 3x more on average
                </Text>
              </View>
              <View style={[styles.insightCard, { backgroundColor: `${colors.primary}10` }]}>
                <Icon name="chart-bar" size={24} color={colors.primary} />
                <Text style={[styles.insightText, { color: colors.text }]}>
                  Email campaigns drive <Text style={{ fontWeight: 'bold', color: colors.primary }}>42%</Text> of ticket sales
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('EventManagement')}
            >
              <Icon name="calendar-edit" size={20} color={colors.card} />
              <Text style={[styles.actionButtonText, { color: colors.card }]}>Manage Events</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handleExportData('Full Report')}
            >
              <Icon name="file-download" size={20} color={colors.text} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>Export Report</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.navigate('AnalyticsSettings')}
            >
              <Icon name="cog" size={20} color={colors.text} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>Settings</Text>
            </TouchableOpacity>
          </View>
          
          {/* Extra spacing at the bottom to ensure all content is visible */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
        
        {renderCurrencyModal()}
      </ScreenContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  selectorCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectorTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currencyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventScroll: {
    flexDirection: 'row',
  },
  eventScrollContent: {
    paddingRight: 8,
  },
  eventCard: {
    width: 200,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  eventCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eventStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventStatValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    width: '23%',
    minWidth: 180,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statSubtitle: {
    fontSize: 11,
  },
  chartsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  chartColumn: {
    flex: 1,
    minWidth: 300,
  },
  chartCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
  },
  chartActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  exportButton: {
    padding: 8,
  },
  pieContainer: {
    gap: 10,
  },
  pieSegment: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pieHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  pieColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pieInfo: {
    flex: 1,
  },
  pieLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  pieValue: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  pieBar: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  pieBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  performanceContainer: {
    gap: 10,
  },
  performanceItem: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  performanceName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  performanceRevenue: {
    fontSize: 13,
    fontWeight: '700',
  },
  performanceDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  performanceStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  performanceStatText: {
    fontSize: 11,
  },
  capacityBar: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  // Sales Analytics Styles - Decreased height by 20px
  salesAnalyticsContainer: {
    gap: 14, // Reduced from 16
  },
  salesMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10, // Reduced from 12
  },
  salesMetric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10, // Reduced from 12
    padding: 10, // Reduced from 14
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  salesMetricIcon: {
    width: 36, // Reduced from 44
    height: 36, // Reduced from 44
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  salesMetricInfo: {
    flex: 1,
  },
  salesMetricLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  salesMetricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  salesInsight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10, // Reduced from 14
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  salesInsightIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  salesInsightContent: {
    flex: 1,
  },
  salesInsightTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  salesInsightValue: {
    fontSize: 12,
  },
  salesTimeline: {
    padding: 12, // Reduced from 14
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  salesTimelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10, // Reduced from 14
  },
  timelineBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 70, // Reduced from 90
  },
  timelineBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  timelineLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 4, // Reduced from 6
  },
  timelineBarBackground: {
    width: 16,
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#F1F5F9',
  },
  timelineBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  timelineValue: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 4, // Reduced from 6
  },
  conversionFunnel: {
    padding: 12, // Reduced from 14
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  conversionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10, // Reduced from 14
  },
  funnelSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6, // Reduced from 10
  },
  funnelStep: {
    alignItems: 'center',
    flex: 1,
  },
  funnelStepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4, // Reduced from 8
  },
  funnelStepLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2, // Reduced from 4
  },
  funnelStepValue: {
    fontSize: 10,
  },
  funnelArrow: {
    paddingHorizontal: 4, // Reduced from 6
  },
  conversionRate: {
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Customer Satisfaction Styles
  satisfactionContainer: {
    gap: 14, // Reduced from 16
  },
  satisfactionScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // Reduced from 20
    padding: 14, // Reduced from 16
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  scoreCircle: {
    width: 70, // Reduced from 80
    height: 70, // Reduced from 80
    borderRadius: 35, // Reduced from 40
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#10B981',
  },
  scoreValue: {
    fontSize: 22, // Reduced from 24
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 11, // Reduced from 12
    marginTop: 2, // Reduced from 4
  },
  scoreBreakdown: {
    flex: 1,
    gap: 6, // Reduced from 8
  },
  scoreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreItemLabel: {
    fontSize: 12, // Reduced from 13
  },
  scoreItemValue: {
    fontSize: 13, // Reduced from 14
    fontWeight: '700',
  },
  ratingDistribution: {
    padding: 14, // Reduced from 16
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  ratingTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10, // Reduced from 12
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6, // Reduced from 8
    gap: 10, // Reduced from 12
  },
  ratingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 36, // Reduced from 40
  },
  ratingNumber: {
    fontSize: 11, // Reduced from 12
    fontWeight: '600',
    width: 14, // Reduced from 16
  },
  ratingBarBackground: {
    flex: 1,
    height: 6, // Reduced from 8
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  ratingBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  ratingPercentage: {
    fontSize: 11, // Reduced from 12
    width: 28, // Reduced from 30
    textAlign: 'right',
  },
  feedbackHighlights: {
    padding: 14, // Reduced from 16
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10, // Reduced from 12
  },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6, // Reduced from 8
    marginBottom: 6, // Reduced from 8
  },
  feedbackText: {
    flex: 1,
    fontSize: 11, // Reduced from 12
    lineHeight: 15, // Reduced from 16
    fontStyle: 'italic',
  },
  statusDistribution: {
    gap: 8, // Reduced from 10
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // Reduced from 10
  },
  statusIcon: {
    width: 32, // Reduced from 36
    height: 32, // Reduced from 36
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12, // Reduced from 13
    fontWeight: '600',
    marginBottom: 1, // Reduced from 2
  },
  statusValue: {
    fontSize: 10, // Reduced from 11
  },
  insightsCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightsTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  insightCard: {
    flex: 1,
    minWidth: 280,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  currencyList: {
    maxHeight: 300,
  },
  currencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  currencyName: {
    fontSize: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EventOrganizerToolsScreen;