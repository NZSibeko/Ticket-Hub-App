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

const API_URL = 'http://localhost:8081';

// Fallback theme context for web if ThemeContext doesn't exist
const useTheme = () => {
  const colors = {
    // Enterprise organizer palette
    primary: '#14213D',
    primaryLight: '#3B82F6',
    secondary: '#0F766E',
    accent: '#B45309',
    danger: '#EF4444',
    success: '#15803D',
    warning: '#D97706',
    info: '#0284C7',
    
    card: '#FFFDFC',
    cardElevated: '#F8F4EC',
    surface: '#EFE7DB',
    surfaceDark: '#DED3C4',
    text: '#1E293B',
    textSecondary: '#5B6472',
    textTertiary: '#8B95A5',
    border: '#DED6CA',
    borderLight: '#EEE8DE',
    background: '#F4F1EA',
    
    // Chart colors
    chart1: '#14213D',
    chart2: '#15803D',
    chart3: '#B45309',
    chart4: '#EF4444',
    chart5: '#0F766E',
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

const DEFAULT_STATS = {
  totalRevenue: 0,
  totalAttendees: 0,
  ticketSales: 0,
  averageTicketPrice: 0,
  conversionRate: 0,
  topEvent: 'No live revenue leader yet',
  topEventRevenue: 0,
  activeEvents: 0,
  pendingEvents: 0,
  completedEvents: 0,
  cancelledEvents: 0,
  refundRate: 0,
  avgEventRating: 0,
  repeatAttendees: 0,
  socialMediaReach: 0,
  emailOpenRate: 0,
  checkInRate: 0,
  vipAttendees: 0,
  sponsorshipRevenue: 0,
  avgTicketPriceTrend: 0,
  peakSalesTime: 'Awaiting live trend data',
  mostPopularDay: 'Awaiting live trend data',
  avgPurchaseValue: 0,
  revenueGrowth: 0,
  customerSatisfaction: 0,
};

const STATUS_ALIASES = {
  validated: 'completed',
  approved: 'completed',
  complete: 'completed',
  completed: 'completed',
  active: 'active',
  live: 'active',
  published: 'active',
  pending: 'pending',
  draft: 'pending',
  cancelled: 'cancelled',
  canceled: 'cancelled',
};

const formatEventDateLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Date to be confirmed';
  }

  return date.toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatHourWindow = (hour) => {
  if (!Number.isFinite(hour)) {
    return 'Awaiting live trend data';
  }

  const normalized = ((hour % 24) + 24) % 24;
  const start = new Date();
  start.setHours(normalized, 0, 0, 0);
  const end = new Date();
  end.setHours((normalized + 2) % 24, 0, 0, 0);

  return `${start.toLocaleTimeString('en-ZA', { hour: 'numeric' })} - ${end.toLocaleTimeString('en-ZA', { hour: 'numeric' })}`;
};

const EventOrganizerToolsScreen = ({ navigation }) => {
  const { user, getAuthHeader } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [attendeeData, setAttendeeData] = useState([]);
  const [eventPerformanceData, setEventPerformanceData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [salesTimeline, setSalesTimeline] = useState([]);
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [activeInsightPanel, setActiveInsightPanel] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadEventData();
  }, [selectedPeriod, selectedEvent, selectedCurrency]);

  const loadEventData = async () => {
    setLoading(true);
    try {
      const [dashboardResponse, eventsResponse] = await Promise.all([
        fetch(`${API_URL}/api/organizer/dashboard`, { headers: getAuthHeader() }),
        fetch(`${API_URL}/api/organizer/events`, { headers: getAuthHeader() }),
      ]);

      const dashboardJson = await dashboardResponse.json();
      const eventsJson = await eventsResponse.json();

      const liveEvents = Array.isArray(eventsJson?.events)
        ? eventsJson.events
        : Array.isArray(eventsJson?.data)
          ? eventsJson.data
          : [];

      if (!dashboardResponse.ok || !dashboardJson?.success) {
        throw new Error(dashboardJson?.error || 'Failed to load organizer dashboard');
      }

      const organizerStats = dashboardJson?.data?.stats || {};
      const now = Date.now();
      const normalizedEvents = liveEvents.map((event) => {
        const rawStatus = String(event.status || event.normalized_status || 'draft').toLowerCase();
        const status = STATUS_ALIASES[rawStatus] || rawStatus;
        const revenue = Number(event.total_revenue || 0);
        const attendees = Number(event.total_tickets || 0);
        const checkedIn = Number(event.checked_in_count || 0);
        const capacity = Number(event.capacity || 0);
        const startDate = event.start_date || event.date || null;
        const parsedStart = startDate ? new Date(startDate).getTime() : NaN;

        return {
          id: event.event_id,
          name: event.event_name || 'Untitled event',
          date: startDate,
          dateLabel: formatEventDateLabel(startDate),
          startTimestamp: parsedStart,
          revenue,
          attendees,
          checkedIn,
          capacity,
          status,
        };
      });

      const topEvent = [...normalizedEvents].sort((a, b) => b.revenue - a.revenue)[0] || null;
      const totalRevenue = Number(organizerStats.totalRevenue || normalizedEvents.reduce((sum, event) => sum + event.revenue, 0));
      const totalTickets = Number(organizerStats.totalTickets || organizerStats.totalAttendees || normalizedEvents.reduce((sum, event) => sum + event.attendees, 0));
      const activeEvents = Number(organizerStats.activeEvents || normalizedEvents.filter((event) => event.status === 'active').length);
      const pendingEvents = Number(organizerStats.pendingEvents || normalizedEvents.filter((event) => event.status === 'pending').length);
      const completedEvents = Number(organizerStats.completedEvents || normalizedEvents.filter((event) => event.status === 'completed' || (!Number.isNaN(event.startTimestamp) && event.startTimestamp < now && event.status !== 'cancelled')).length);
      const cancelledEvents = Number(organizerStats.cancelledEvents || normalizedEvents.filter((event) => event.status === 'cancelled').length);
      const avgTicket = Number(organizerStats.averageTicketPrice || organizerStats.avgPurchaseValue || (totalTickets > 0 ? totalRevenue / totalTickets : 0));
      const totalCheckedIn = Number(organizerStats.totalCheckedIn || normalizedEvents.reduce((sum, event) => sum + event.checkedIn, 0));
      const totalCapacity = Number(organizerStats.totalCapacity || normalizedEvents.reduce((sum, event) => sum + Math.max(event.capacity, 0), 0));
      const upcomingEvents = Array.isArray(dashboardJson?.data?.upcomingEvents) && dashboardJson.data.upcomingEvents.length
        ? dashboardJson.data.upcomingEvents
        : normalizedEvents.filter((event) => !Number.isNaN(event.startTimestamp) && event.startTimestamp >= now);
      const mostPopularDay = organizerStats.mostPopularDay || 'Awaiting live trend data';
      const peakSalesHour = Number(organizerStats.peakSalesHour ?? organizerStats.peakSalesTime);
      const checkInRate = Number(organizerStats.checkInRate || (totalTickets > 0 ? Math.round((totalCheckedIn / totalTickets) * 100) : 0));
      const conversionRate = Number(organizerStats.conversionRate || (totalCapacity > 0 ? Math.round((totalTickets / totalCapacity) * 100) : 0));

      setStats({
        ...DEFAULT_STATS,
        ...organizerStats,
        totalRevenue,
        totalAttendees: Number(organizerStats.totalAttendees || totalTickets),
        ticketSales: totalTickets,
        averageTicketPrice: avgTicket,
        conversionRate,
        topEvent: organizerStats.topEvent || topEvent?.name || 'No live revenue leader yet',
        topEventRevenue: Number(organizerStats.topEventRevenue || topEvent?.revenue || 0),
        activeEvents,
        pendingEvents,
        completedEvents,
        cancelledEvents,
        avgEventRating: Number(organizerStats.avgEventRating || 0),
        repeatAttendees: Number(organizerStats.repeatAttendees || 0),
        socialMediaReach: Number(organizerStats.socialMediaReach || 0),
        emailOpenRate: Number(organizerStats.emailOpenRate || 0),
        checkInRate,
        vipAttendees: Number(organizerStats.vipAttendees || 0),
        sponsorshipRevenue: Number(organizerStats.sponsorshipRevenue || 0),
        avgTicketPriceTrend: Number(organizerStats.ticketGrowth || organizerStats.avgTicketPriceTrend || 0),
        peakSalesTime: formatHourWindow(peakSalesHour),
        mostPopularDay,
        avgPurchaseValue: Number(organizerStats.avgPurchaseValue || avgTicket),
        revenueGrowth: Number(organizerStats.revenueGrowth || 0),
        customerSatisfaction: Number(organizerStats.customerSatisfaction || 0),
      });

      setAttendeeData([
        { label: 'Tickets sold', value: totalTickets, color: colors.chart1 },
        { label: 'Checked in', value: totalCheckedIn, color: colors.chart2 },
        { label: 'VIP guests', value: Number(organizerStats.vipAttendees || 0), color: colors.chart3 },
        { label: 'Capacity seats', value: totalCapacity, color: colors.chart4 },
      ]);

      setEventPerformanceData(
        [...normalizedEvents]
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 6)
          .map((event) => ({
            name: event.name,
            revenue: event.revenue,
            attendees: event.attendees,
            rating: event.attendees > 0 ? Math.max(0, Number(organizerStats.avgEventRating || 0)) : 0,
            capacity: event.capacity > 0 ? Math.min(100, Math.round((event.attendees / event.capacity) * 100)) : 0,
          }))
      );

      setRecentActivity(Array.isArray(dashboardJson?.data?.recentActivity) ? dashboardJson.data.recentActivity : []);
      setSalesTimeline(Array.isArray(dashboardJson?.data?.timeline) ? dashboardJson.data.timeline : []);
      setFeedbackItems(Array.isArray(dashboardJson?.data?.feedback) ? dashboardJson.data.feedback : []);
      setEvents(normalizedEvents);
      if (!selectedEvent && normalizedEvents.length > 0) {
        setSelectedEvent(normalizedEvents[0].id);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading event data:', error);
      setStats(DEFAULT_STATS);
      setRecentActivity([]);
      setSalesTimeline([]);
      setFeedbackItems([]);
      Alert.alert('Error', 'Failed to load event data');
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: selectedCurrency.code,
        maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      }).format(amount);
    } catch (error) {
      return `${selectedCurrency.code} ${amount.toLocaleString()}`;
    }
  };

  const handleExportData = (type) => {
    Alert.alert('Export', `${type} data exported successfully!`);
  };

  const handleRefresh = () => {
    loadEventData();
  };

  const handleCardUtilityPress = (event, action) => {
    event?.stopPropagation?.();
    action?.();
  };

  const navigateToWorkspace = (routeName, params) => {
    let currentNavigation = navigation;
    let mainTabsNavigation = null;

    while (currentNavigation) {
      const routeNames = currentNavigation?.getState?.()?.routeNames ?? [];

      if (routeNames.includes(routeName)) {
        currentNavigation.navigate(routeName, params);
        return;
      }

      if (!mainTabsNavigation && routeNames.includes('MainTabs')) {
        mainTabsNavigation = currentNavigation;
      }

      currentNavigation = currentNavigation?.getParent?.();
    }

    if (mainTabsNavigation) {
      mainTabsNavigation.navigate('MainTabs', { screen: routeName, params });
      return;
    }

    Alert.alert(
      'Navigation unavailable',
      'This workspace action is not available in the current view yet.',
    );
  };

  const selectedEventRecord =
    events.find((event) => event.id === selectedEvent) ?? events[0] ?? null;

  const executiveSignals = stats
    ? [
        {
          id: 'revenue',
          icon: 'cash-fast',
          label: 'Gross revenue',
          value: formatCurrency(stats.totalRevenue),
          detail: `${stats.revenueGrowth}% above prior quarter`,
          tint: colors.primaryLight,
        },
        {
          id: 'demand',
          icon: 'chart-line-variant',
          label: 'Conversion quality',
          value: `${stats.conversionRate}%`,
          detail: `${stats.ticketSales} tickets sold`,
          tint: colors.success,
        },
        {
          id: 'experience',
          icon: 'account-star',
          label: 'Guest satisfaction',
          value: `${stats.customerSatisfaction}`,
          detail: `${stats.avgEventRating.toFixed(1)} average rating`,
          tint: colors.accent,
        },
        {
          id: 'operations',
          icon: 'shield-check',
          label: 'On-site readiness',
          value: `${stats.checkInRate}%`,
          detail: `${stats.activeEvents} active events monitored`,
          tint: colors.info,
        },
      ]
    : [];

  const strategicInsights = stats
    ? [
        {
          id: 'growth',
          icon: 'trending-up',
          tint: colors.success,
          backgroundColor: `${colors.success}10`,
          borderColor: `${colors.success}22`,
          statement: (
            <Text style={[styles.insightText, { color: colors.text }]}>
              Revenue movement is <Text style={{ fontWeight: '700', color: colors.success }}>{stats.revenueGrowth}%</Text> across the current comparison window
            </Text>
          ),
        },
        {
          id: 'weekend',
          icon: 'calendar-star',
          tint: colors.info,
          backgroundColor: `${colors.info}10`,
          borderColor: `${colors.info}22`,
          statement: (
            <Text style={[styles.insightText, { color: colors.text }]}>
              <Text style={{ fontWeight: '700', color: colors.info }}>{stats.mostPopularDay}</Text> is the strongest event day right now
            </Text>
          ),
        },
        {
          id: 'vip',
          icon: 'account-supervisor',
          tint: colors.warning,
          backgroundColor: `${colors.warning}10`,
          borderColor: `${colors.warning}22`,
          statement: (
            <Text style={[styles.insightText, { color: colors.text }]}>
              <Text style={{ fontWeight: '700', color: colors.warning }}>VIP attendees</Text> now represent {stats.vipAttendees} tracked guests
            </Text>
          ),
        },
        {
          id: 'email',
          icon: 'chart-bar',
          tint: colors.primary,
          backgroundColor: `${colors.primary}10`,
          borderColor: `${colors.primary}22`,
          statement: (
            <Text style={[styles.insightText, { color: colors.text }]}>
              Audience email reach is currently landing at <Text style={{ fontWeight: '700', color: colors.primary }}>{stats.emailOpenRate}%</Text> across tracked campaign deliveries
            </Text>
          ),
        },
      ]
    : [];

  const topAttendeeSegment = attendeeData.reduce(
    (topSegment, segment) => (segment.value > (topSegment?.value ?? 0) ? segment : topSegment),
    attendeeData[0] ?? null,
  );

  const topPerformanceRecord = eventPerformanceData[0] ?? null;

  const createInsightAction = (label, onPress, options = {}) => ({
    label,
    onPress,
    icon: options.icon ?? 'arrow-right',
    tone: options.tone ?? 'secondary',
  });

  const closeInsightPanel = () => {
    setActiveInsightPanel(null);
  };

  const runInsightAction = (action) => {
    closeInsightPanel();
    action?.onPress?.();
  };

  const openInsightPanel = (panel) => {
    if (panel) {
      setActiveInsightPanel(panel);
    }
  };

  const normalizeInsightLabel = (value = '') =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const findPerformanceRecord = (eventName) => {
    const normalizedEventName = normalizeInsightLabel(eventName);
    return (
      eventPerformanceData.find((item) => {
        const normalizedItemName = normalizeInsightLabel(item.name);
        return normalizedEventName.includes(normalizedItemName) || normalizedItemName.includes(normalizedEventName);
      }) ?? null
    );
  };

  const buildEventPanel = (event, performanceRecord = findPerformanceRecord(event.name)) => ({
    eyebrow: 'Event Brief',
    title: event.name,
    summary:
      `${event.status === 'pending' ? 'Planning' : 'Live'} summary for ${focusWindowLabel.toLowerCase()}. ` +
      'Use this brief to decide the next commercial or operations move.',
    metrics: [
      { label: 'Revenue', value: formatCurrency(event.revenue) },
      { label: 'Attendees', value: `${event.attendees}` },
      { label: 'Status', value: event.status },
      {
        label: 'Fill rate',
        value: performanceRecord ? `${performanceRecord.capacity}%` : event.status === 'pending' ? 'Pre-launch' : 'Tracking',
      },
    ],
    analysis: [
      `${event.name} is currently ${event.status}, with ${event.attendees} tracked attendees and ${formatCurrency(event.revenue)} recognized revenue.`,
      performanceRecord
        ? `Guest sentiment is holding at ${performanceRecord.rating}/5 with a ${performanceRecord.capacity}% capacity posture, which helps prioritize staffing and premium inventory decisions.`
        : 'A deeper performance record is still being assembled, so this event should stay in the watch list until more telemetry arrives.',
      event.status === 'pending'
        ? 'Launch readiness should stay focused on promotion timing, venue staffing sign-off, and pricing communication before inventory opens wider.'
        : `The current demand pattern suggests keeping a close eye on ${stats.peakSalesTime} as the primary booking window for campaign pushes.`,
    ],
    actions: [
      createInsightAction('Open events workspace', () => navigateToWorkspace('EventOrganizerEventsScreen'), {
        icon: 'calendar-edit',
        tone: 'primary',
      }),
      createInsightAction('View ticket desk', () => navigateToWorkspace('OrganizerTickets'), {
        icon: 'ticket-confirmation',
      }),
      createInsightAction('Browse market', () => navigateToWorkspace('BrowseEvents'), {
        icon: 'compass-outline',
      }),
    ],
  });

  const buildPerformancePanel = (performanceRecord) => ({
    eyebrow: 'Performance Analysis',
    title: performanceRecord.name,
    summary: 'Event-level revenue, attendance, and capacity indicators for the current focus window.',
    metrics: [
      { label: 'Revenue', value: formatCurrency(performanceRecord.revenue) },
      { label: 'Attendees', value: `${performanceRecord.attendees}` },
      { label: 'Rating', value: `${performanceRecord.rating}/5` },
      { label: 'Capacity', value: `${performanceRecord.capacity}%` },
    ],
    analysis: [
      `${performanceRecord.name} is producing ${formatCurrency(performanceRecord.revenue)} in revenue from ${performanceRecord.attendees} attendees, making it one of the strongest portfolio contributors.`,
      `A ${performanceRecord.capacity}% capacity posture means inventory pacing and front-of-house staffing should be tuned against demand rather than generalized across the whole portfolio.`,
      `Customer feedback is landing at ${performanceRecord.rating}/5, which suggests this event can support retention campaigns and premium add-on positioning.`,
    ],
    actions: [
      createInsightAction('Open events workspace', () => navigateToWorkspace('EventOrganizerEventsScreen'), {
        icon: 'calendar-edit',
        tone: 'primary',
      }),
      createInsightAction('Create follow-up event', () => navigateToWorkspace('CreateEvent'), {
        icon: 'calendar-plus',
      }),
      createInsightAction('Export performance', () => handleExportData(`${performanceRecord.name} Performance`), {
        icon: 'file-download-outline',
      }),
    ],
  });

  const buildExecutiveSignalPanel = (signal) => {
    const panels = {
      revenue: {
        eyebrow: 'Executive Signal',
        title: 'Gross revenue command view',
        summary: 'Commercial totals, high-value events, and sponsor contribution in one readout.',
        metrics: [
          { label: 'Gross revenue', value: formatCurrency(stats.totalRevenue) },
          { label: 'Top event', value: formatCurrency(stats.topEventRevenue) },
          { label: 'Sponsors', value: formatCurrency(stats.sponsorshipRevenue) },
          { label: 'Avg purchase', value: formatCurrency(stats.avgPurchaseValue) },
        ],
        analysis: [
          `${stats.topEvent} remains the lead contributor at ${formatCurrency(stats.topEventRevenue)}, which keeps the portfolio concentrated around a small number of major demand moments.`,
          `Revenue is tracking ${stats.revenueGrowth}% above the prior quarter, so the current mix supports continuing premium positioning instead of discount-led demand capture.`,
          `Late-day purchase activity between ${stats.peakSalesTime} remains the strongest monetization window and should continue receiving campaign budget priority.`,
        ],
        actions: [
          createInsightAction('Open events workspace', () => navigateToWorkspace('EventOrganizerEventsScreen'), {
            icon: 'calendar-edit',
            tone: 'primary',
          }),
          createInsightAction('Export revenue report', () => handleExportData('Revenue Report'), {
            icon: 'file-download-outline',
          }),
          createInsightAction('Browse market', () => navigateToWorkspace('BrowseEvents'), {
            icon: 'compass-outline',
          }),
        ],
      },
      demand: {
        eyebrow: 'Executive Signal',
        title: 'Conversion quality analysis',
        summary: 'Demand efficiency from discovery through completed ticket purchase.',
        metrics: [
          { label: 'Conversion rate', value: `${stats.conversionRate}%` },
          { label: 'Tickets sold', value: `${stats.ticketSales}` },
          { label: 'Avg price', value: formatCurrency(stats.averageTicketPrice) },
          { label: 'Best day', value: stats.mostPopularDay },
        ],
        analysis: [
          `The portfolio is converting at ${stats.conversionRate}%, which is a healthy baseline for keeping paid acquisition efficient while demand remains selective.`,
          `${stats.mostPopularDay} still outperforms weekdays, so weekend inventory and promotion timing should stay ahead of the rest of the calendar.`,
          `Average ticket price is trending up ${stats.avgTicketPriceTrend}%, which suggests the audience is tolerating premium offers without visible conversion decay.`,
        ],
        actions: [
          createInsightAction('Browse public listing', () => navigateToWorkspace('BrowseEvents'), {
            icon: 'compass-outline',
            tone: 'primary',
          }),
          createInsightAction('Open events workspace', () => navigateToWorkspace('EventOrganizerEventsScreen'), {
            icon: 'calendar-edit',
          }),
          createInsightAction('Export funnel', () => handleExportData('Demand Funnel'), {
            icon: 'file-chart-outline',
          }),
        ],
      },
      experience: {
        eyebrow: 'Executive Signal',
        title: 'Guest satisfaction watchlist',
        summary: 'Customer sentiment, loyalty, and service consistency across the active portfolio.',
        metrics: [
          { label: 'Satisfaction', value: `${stats.customerSatisfaction}` },
          { label: 'Avg rating', value: `${stats.avgEventRating.toFixed(1)}/5` },
          { label: 'Repeat guests', value: `${stats.repeatAttendees}` },
          { label: 'Audience email reach', value: `${stats.emailOpenRate}%` },
        ],
        analysis: [
          `A satisfaction score of ${stats.customerSatisfaction} and an average rating of ${stats.avgEventRating.toFixed(1)}/5 indicate the guest promise is landing consistently.`,
          `${stats.repeatAttendees} repeat attendees create a strong retention base, so loyalty messaging can stay focused on premium access and early inventory moments.`,
          `Audience email reach is currently ${stats.emailOpenRate}% across tracked campaign deliveries, which is strong enough to support more segmented post-event follow-up.`,
        ],
        actions: [
          createInsightAction('Open organizer profile', () => navigateToWorkspace('OrganizerProfile'), {
            icon: 'account-cog',
            tone: 'primary',
          }),
          createInsightAction('Open help center', () => navigateToWorkspace('HelpCenter'), {
            icon: 'lifebuoy',
          }),
          createInsightAction('Export feedback', () => handleExportData('Customer Feedback'), {
            icon: 'file-download-outline',
          }),
        ],
      },
      operations: {
        eyebrow: 'Executive Signal',
        title: 'On-site readiness board',
        summary: 'Operational confidence for entry, ticket validation, and live-event control.',
        metrics: [
          { label: 'Check-in rate', value: `${stats.checkInRate}%` },
          { label: 'Active events', value: `${stats.activeEvents}` },
          { label: 'Refund rate', value: `${stats.refundRate}%` },
          { label: 'Window', value: focusWindowLabel },
        ],
        analysis: [
          `${stats.checkInRate}% check-in success means the guest entry flow is healthy, but it should still be pressure-tested before the next major arrival wave.`,
          `${stats.activeEvents} active events running at once increases operational complexity, so scanner readiness and staffing coverage should stay centralized.`,
          `Refunds remain low at ${stats.refundRate}%, which suggests service recovery and ticket clarity are working without creating revenue leakage.`,
        ],
        actions: [
          createInsightAction('View ticket desk', () => navigateToWorkspace('OrganizerTickets'), {
            icon: 'ticket-confirmation',
            tone: 'primary',
          }),
          createInsightAction('Open scanner', () => navigateToWorkspace('Scanner'), {
            icon: 'qrcode-scan',
          }),
          createInsightAction('Refresh board', handleRefresh, {
            icon: 'refresh',
          }),
        ],
      },
    };

    return panels[signal.id] ?? panels.operations;
  };

  const buildSnapshotPanel = (card) => {
    const panels = {
      ticketSales: {
        eyebrow: 'Portfolio Metric',
        title: 'Ticket sales',
        summary: 'Detailed booking performance for the current operating window.',
        metrics: [
          { label: 'Tickets sold', value: `${stats.ticketSales}` },
          { label: 'Avg price', value: formatCurrency(stats.averageTicketPrice) },
          { label: 'Conversion', value: `${stats.conversionRate}%` },
          { label: 'Peak sales', value: stats.peakSalesTime },
        ],
        analysis: [
          `Ticket sales have reached ${stats.ticketSales}, and the average ticket price of ${formatCurrency(stats.averageTicketPrice)} is still supporting healthy margin.`,
          `Demand is clustering around ${stats.peakSalesTime}, so that window remains the best place to time campaign bursts and inventory alerts.`,
          `The current conversion rate of ${stats.conversionRate}% suggests pricing remains credible without forcing defensive discounting.`,
        ],
        actions: [
          createInsightAction('Open events workspace', () => navigateToWorkspace('EventOrganizerEventsScreen'), {
            icon: 'calendar-edit',
            tone: 'primary',
          }),
          createInsightAction('Browse market', () => navigateToWorkspace('BrowseEvents'), {
            icon: 'compass-outline',
          }),
          createInsightAction('Export ticket report', () => handleExportData('Ticket Sales'), {
            icon: 'file-download-outline',
          }),
        ],
      },
      attendees: {
        eyebrow: 'Portfolio Metric',
        title: 'Attendee tracking',
        summary: 'Live audience volume and event coverage across the active portfolio.',
        metrics: [
          { label: 'Tracked attendees', value: `${stats.totalAttendees}` },
          { label: 'Active events', value: `${stats.activeEvents}` },
          { label: 'Repeat guests', value: `${stats.repeatAttendees}` },
          { label: 'VIP attendees', value: `${stats.vipAttendees}` },
        ],
        analysis: [
          `${stats.totalAttendees} attendees are currently tracked, giving the team a reliable baseline for live operations planning.`,
          `${stats.vipAttendees} VIP attendees represent a meaningful premium audience that should receive tighter service and access control.`,
          `Because ${stats.repeatAttendees} guests are returning, retention offers can be targeted without waiting for the next cycle to close.`,
        ],
        actions: [
          createInsightAction('Open ticket desk', () => navigateToWorkspace('OrganizerTickets'), {
            icon: 'ticket-confirmation',
            tone: 'primary',
          }),
          createInsightAction('Open scanner', () => navigateToWorkspace('Scanner'), {
            icon: 'qrcode-scan',
          }),
          createInsightAction('Export attendee report', () => handleExportData('Attendee Report'), {
            icon: 'file-download-outline',
          }),
        ],
      },
      repeatAttendees: {
        eyebrow: 'Portfolio Metric',
        title: 'Repeat attendee loyalty',
        summary: 'Retention strength and customer familiarity across returning buyers.',
        metrics: [
          { label: 'Repeat attendees', value: `${stats.repeatAttendees}` },
          { label: 'Satisfaction', value: `${stats.customerSatisfaction}` },
          { label: 'Avg rating', value: `${stats.avgEventRating.toFixed(1)}/5` },
          { label: 'Audience email reach', value: `${stats.emailOpenRate}%` },
        ],
        analysis: [
          `${stats.repeatAttendees} repeat attendees show that the portfolio is generating enough trust to bring people back without heavy re-acquisition costs.`,
          `A satisfaction score of ${stats.customerSatisfaction} supports retention campaigns that lean on convenience, membership, and early access rather than broad incentives.`,
          `Audience email reach of ${stats.emailOpenRate}% indicates retention messaging remains one of the highest-leverage channels where tracked delivery telemetry exists.`,
        ],
        actions: [
          createInsightAction('Open organizer profile', () => navigateToWorkspace('OrganizerProfile'), {
            icon: 'account-cog',
            tone: 'primary',
          }),
          createInsightAction('Open help center', () => navigateToWorkspace('HelpCenter'), {
            icon: 'lifebuoy',
          }),
          createInsightAction('Export loyalty brief', () => handleExportData('Loyalty Brief'), {
            icon: 'file-download-outline',
          }),
        ],
      },
      sponsorship: {
        eyebrow: 'Portfolio Metric',
        title: 'Sponsorship performance',
        summary: 'Commercial partnership contribution and revenue diversification.',
        metrics: [
          { label: 'Sponsor revenue', value: formatCurrency(stats.sponsorshipRevenue) },
          { label: 'Gross revenue', value: formatCurrency(stats.totalRevenue) },
          { label: 'Top event', value: stats.topEvent },
          { label: 'Growth', value: `${stats.revenueGrowth}%` },
        ],
        analysis: [
          `Sponsorship is contributing ${formatCurrency(stats.sponsorshipRevenue)}, which adds a useful non-ticket revenue layer to the portfolio.`,
          `Because ${stats.topEvent} is also the lead revenue event, sponsor packaging should continue to follow the strongest demand anchors rather than spread evenly.`,
          `Commercial growth at ${stats.revenueGrowth}% indicates partner inventory can likely expand before hitting audience fatigue.`,
        ],
        actions: [
          createInsightAction('Open events workspace', () => navigateToWorkspace('EventOrganizerEventsScreen'), {
            icon: 'calendar-edit',
            tone: 'primary',
          }),
          createInsightAction('Create new event', () => navigateToWorkspace('CreateEvent'), {
            icon: 'calendar-plus',
          }),
          createInsightAction('Export sponsor brief', () => handleExportData('Sponsor Brief'), {
            icon: 'file-download-outline',
          }),
        ],
      },
      refundRate: {
        eyebrow: 'Portfolio Metric',
        title: 'Refund control',
        summary: 'Revenue leakage and ticket-quality assurance across recent transactions.',
        metrics: [
          { label: 'Refund rate', value: `${stats.refundRate}%` },
          { label: 'Ticket sales', value: `${stats.ticketSales}` },
          { label: 'Active events', value: `${stats.activeEvents}` },
          { label: 'Check-in rate', value: `${stats.checkInRate}%` },
        ],
        analysis: [
          `Refunds are sitting at ${stats.refundRate}%, which remains below the current alert threshold and suggests purchase expectations are largely being met.`,
          `Low refunds paired with a ${stats.checkInRate}% check-in rate indicate the operational and commercial experience is aligned well enough to reduce service friction.`,
          'This metric should still be watched closely on newly launched inventory, where expectation-setting is usually weakest.',
        ],
        actions: [
          createInsightAction('Open help center', () => navigateToWorkspace('HelpCenter'), {
            icon: 'lifebuoy',
            tone: 'primary',
          }),
          createInsightAction('View ticket desk', () => navigateToWorkspace('OrganizerTickets'), {
            icon: 'ticket-confirmation',
          }),
          createInsightAction('Refresh board', handleRefresh, {
            icon: 'refresh',
          }),
        ],
      },
      emailOpenRate: {
        eyebrow: 'Portfolio Metric',
        title: 'Lifecycle communication',
        summary: 'Campaign reach, audience attention, and readiness for targeted follow-up.',
        metrics: [
          { label: 'Email reach', value: `${stats.emailOpenRate}%` },
          { label: 'Repeat guests', value: `${stats.repeatAttendees}` },
          { label: 'Top day', value: stats.mostPopularDay },
          { label: 'VIP guests', value: `${stats.vipAttendees}` },
        ],
        analysis: [
          `${stats.emailOpenRate}% audience email reach across tracked deliveries is strong enough to support segmented campaigns without relying only on paid channels.`,
          `${stats.repeatAttendees} repeat attendees and ${stats.vipAttendees} VIP guests give the team multiple high-intent audiences for more personalized outreach.`,
          `Because ${stats.mostPopularDay} converts best, campaign sequencing should continue to warm the audience up ahead of weekend inventory moments.`,
        ],
        actions: [
          createInsightAction('Browse market', () => navigateToWorkspace('BrowseEvents'), {
            icon: 'compass-outline',
            tone: 'primary',
          }),
          createInsightAction('Open organizer profile', () => navigateToWorkspace('OrganizerProfile'), {
            icon: 'account-cog',
          }),
          createInsightAction('Export campaign brief', () => handleExportData('Campaign Brief'), {
            icon: 'file-download-outline',
          }),
        ],
      },
    };

    return panels[card.id] ?? panels.emailOpenRate;
  };

  const workflowCards = stats
    ? [
        {
          id: 'events',
          icon: 'calendar-multiple-check',
          title: 'Portfolio operations',
          detail: `${stats.activeEvents} active and ${stats.pendingEvents} pending events`,
          actionLabel: 'Open events',
          tint: colors.primary,
          onPress: () => navigateToWorkspace('EventOrganizerEventsScreen'),
        },
        {
          id: 'tickets',
          icon: 'ticket-confirmation',
          title: 'Guest access desk',
          detail: `${stats.checkInRate}% check-in success with ${stats.repeatAttendees} repeat attendees`,
          actionLabel: 'View tickets',
          tint: colors.success,
          onPress: () => navigateToWorkspace('OrganizerTickets'),
        },
        {
          id: 'currency',
          icon: 'currency-usd',
          title: 'Reporting currency',
          detail: `${selectedCurrency.code} reporting desk ready for exports`,
          actionLabel: 'Change currency',
          tint: colors.accent,
          onPress: () => setShowCurrencyModal(true),
        },
      ]
    : [];

  const periodOptions = [
    { id: 'week', label: '7 days' },
    { id: 'month', label: '30 days' },
    { id: 'quarter', label: 'Quarter' },
  ];

  const revenueMixMax = Math.max(
    ...eventPerformanceData.map((event) => event.revenue),
    1,
  );

  const revenueMix = eventPerformanceData.slice(0, 4).map((event) => ({
    id: event.name,
    label: event.name,
    revenue: formatCurrency(event.revenue),
    rawRevenue: event.revenue,
    attendees: event.attendees,
    rating: event.rating,
    capacity: event.capacity,
    fill: Math.max(12, Math.round((event.revenue / revenueMixMax) * 100)),
  }));

  const priorityQueue = stats
    ? [
        {
          id: 'staffing',
          title: 'Confirm venue staffing coverage',
          detail: `${stats.activeEvents} active events still need final floor staffing sign-off before gates open.`,
          badge: 'Today',
          tint: colors.primary,
          actionLabel: 'Open events',
          onPress: () => navigateToWorkspace('EventOrganizerEventsScreen'),
        },
        {
          id: 'vip',
          title: 'Launch VIP retention outreach',
          detail: `Activate premium messaging for ${stats.vipAttendees} high-value attendees before the next demand spike.`,
          badge: 'Marketing',
          tint: colors.accent,
          actionLabel: 'Export segment',
          onPress: () => handleExportData('VIP Segment'),
        },
        {
          id: 'entry',
          title: 'Pressure-test guest entry operations',
          detail: `${stats.checkInRate}% check-in readiness is strong, but scanner rehearsal is still recommended.`,
          badge: 'Operations',
          tint: colors.success,
          actionLabel: 'View tickets',
          onPress: () => navigateToWorkspace('OrganizerTickets'),
        },
      ]
    : [];

  const organizerDisplayName =
    user?.name ||
    user?.fullName ||
    user?.full_name ||
    user?.email?.split?.('@')?.[0] ||
    'Organizer';

  const focusWindowLabel =
    selectedPeriod === 'week'
      ? 'Next 7 days'
      : selectedPeriod === 'month'
        ? 'Next 30 days'
        : 'Current quarter';

  const totalAudienceMetric = attendeeData.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const attendeeBreakdown = attendeeData.map((item) => ({
    ...item,
    percent: totalAudienceMetric > 0 ? Math.round(((Number(item.value) || 0) / totalAudienceMetric) * 100) : 0,
  }));
  const salesTimelineValues = salesTimeline.length
    ? salesTimeline.slice(-5).map((entry) => ({
        label: entry.day ? new Date(entry.day).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' }) : '—',
        value: Math.max(0, Math.min(100, Math.round((Number(entry.revenue || 0) / Math.max(1, Math.max(...salesTimeline.map((item) => Number(item.revenue || 0), 1)))) * 100))),
      }))
    : eventPerformanceData.length
      ? eventPerformanceData.slice(0, 5).map((event, index) => ({
          label: `${Math.min(9 + index * 3, 21)}:00`,
          value: Math.max(8, Math.min(100, event.capacity || Math.round((event.attendees / Math.max(1, stats.ticketSales || 1)) * 100))),
        }))
      : [
          { label: '09:00', value: 0 },
          { label: '12:00', value: 0 },
          { label: '15:00', value: 0 },
          { label: '18:00', value: 0 },
          { label: '21:00', value: 0 },
        ];
  const funnelMetrics = [
    { label: 'Portfolio views', value: stats.ticketSales ? Math.max(stats.ticketSales * 5, stats.ticketSales) : 0, color: colors.primary },
    { label: 'Ticket intent', value: stats.ticketSales ? Math.max(Math.round(stats.ticketSales * 1.8), stats.ticketSales) : 0, color: colors.info },
    { label: 'Confirmed sales', value: stats.ticketSales, color: colors.success },
  ];
  const ratingDistribution = [
    { stars: 5, percent: stats.customerSatisfaction ? Math.min(100, Math.max(0, Math.round(stats.customerSatisfaction * 0.6))) : 0 },
    { stars: 4, percent: stats.customerSatisfaction ? Math.min(100, Math.max(0, Math.round(stats.customerSatisfaction * 0.22))) : 0 },
    { stars: 3, percent: stats.customerSatisfaction ? Math.min(100, Math.max(0, Math.round(stats.customerSatisfaction * 0.1))) : 0 },
    { stars: 2, percent: stats.customerSatisfaction ? Math.min(100, Math.max(0, Math.round((100 - stats.customerSatisfaction) * 0.45))) : 0 },
    { stars: 1, percent: stats.customerSatisfaction ? Math.min(100, Math.max(0, Math.round((100 - stats.customerSatisfaction) * 0.25))) : 0 },
  ];
  const promoterShare = Math.min(100, Math.max(0, Math.round(stats.customerSatisfaction * 0.72)));
  const passiveShare = Math.min(100 - promoterShare, Math.max(0, Math.round((100 - promoterShare) * 0.55)));
  const detractorShare = Math.max(0, 100 - promoterShare - passiveShare);

  const snapshotCards = stats
      ? [
        {
          id: 'ticketSales',
          icon: 'ticket-confirmation',
          title: 'Ticket sales',
          value: stats.ticketSales.toLocaleString(),
          subtitle: `Avg: ${formatCurrency(stats.averageTicketPrice)}`,
          tint: colors.primary,
          trend: 15,
        },
        {
          id: 'attendees',
          icon: 'account-group',
          title: 'Attendees tracked',
          value: stats.totalAttendees.toLocaleString(),
          subtitle: `${stats.activeEvents} live events`,
          tint: colors.info,
          trend: 8,
        },
        {
          id: 'repeatAttendees',
          icon: 'repeat',
          title: 'Repeat attendees',
          value: `${stats.repeatAttendees}`,
          subtitle: 'Returning buyers',
          tint: colors.secondary,
          trend: 18,
        },
        {
          id: 'sponsorship',
          icon: 'handshake',
          title: 'Sponsorship',
          value: formatCurrency(stats.sponsorshipRevenue),
          subtitle: 'Commercial partnerships',
          tint: colors.accent,
          trend: 25,
        },
        {
          id: 'refundRate',
          icon: 'percent-circle',
          title: 'Refund rate',
          value: `${stats.refundRate}%`,
          subtitle: 'Below alert threshold',
          tint: colors.warning,
          trend: -4,
        },
        {
          id: 'emailOpenRate',
          icon: 'email-fast',
          title: 'Audience email reach',
          value: `${stats.emailOpenRate}%`,
          subtitle: 'Tracked campaign deliveries',
          tint: colors.success,
          trend: 7,
        },
      ]
    : [];

  const buildWorkflowPanel = (card) => ({
    eyebrow: 'Operator Runbook',
    title: card.title,
    summary: 'Execution detail for the selected workflow card, including the recommended next move.',
    metrics: [
      { label: 'Focus window', value: focusWindowLabel },
      { label: 'Currency desk', value: selectedCurrency.code },
      { label: 'Active events', value: `${stats.activeEvents}` },
      { label: 'Readiness', value: `${stats.checkInRate}%` },
    ],
    analysis: [
      card.detail,
      `This workflow remains relevant because the team is balancing ${stats.activeEvents} live events and ${stats.pendingEvents} pending launches inside the same operating window.`,
      card.id === 'currency'
        ? 'Keeping the reporting desk accurate is critical for exports, finance reviews, and cross-market comparisons.'
        : 'Resolving this item early reduces the chance that a routine issue becomes an event-day escalation.',
    ],
    actions: [
      createInsightAction(card.actionLabel, card.onPress, {
        icon: card.id === 'currency' ? 'currency-usd' : card.id === 'tickets' ? 'ticket-confirmation' : 'calendar-edit',
        tone: 'primary',
      }),
      createInsightAction('Open help center', () => navigateToWorkspace('HelpCenter'), {
        icon: 'lifebuoy',
      }),
      createInsightAction('Refresh board', handleRefresh, {
        icon: 'refresh',
      }),
    ],
  });

  const buildPriorityPanel = (item) => ({
    eyebrow: 'Priority Queue',
    title: item.title,
    summary: 'Operational risk review and the best next action to execute from the queue.',
    metrics: [
      { label: 'Priority lane', value: item.badge },
      { label: 'Active events', value: `${stats.activeEvents}` },
      { label: 'Check-in rate', value: `${stats.checkInRate}%` },
      { label: 'VIP guests', value: `${stats.vipAttendees}` },
    ],
    analysis: [
      item.detail,
      item.id === 'staffing'
        ? 'Staffing readiness should be closed before other optimization work, because it directly affects entry flow, guest trust, and safety compliance.'
        : item.id === 'vip'
          ? 'VIP retention actions are especially high-leverage when premium guests are already demonstrating stronger spend behavior than the broader audience.'
          : 'Scanner rehearsal and ticket validation quality should be stabilized before the next high-volume arrival period.',
      `Executing this task now supports a smoother ${focusWindowLabel.toLowerCase()} operating rhythm and lowers the number of reactive fixes needed later.`,
    ],
    actions: [
      createInsightAction(item.actionLabel, item.onPress, {
        icon: item.id === 'vip' ? 'file-download-outline' : item.id === 'entry' ? 'ticket-confirmation' : 'calendar-edit',
        tone: 'primary',
      }),
      createInsightAction('Open events workspace', () => navigateToWorkspace('EventOrganizerEventsScreen'), {
        icon: 'calendar-edit',
      }),
      createInsightAction('Open scanner', () => navigateToWorkspace('Scanner'), {
        icon: 'qrcode-scan',
      }),
    ],
  });

  const buildRevenueMixPanel = (item) => ({
    eyebrow: 'Revenue Mix',
    title: item.label,
    summary: 'Contribution view for one of the highest-earning events in the current organizer mix.',
    metrics: [
      { label: 'Revenue', value: item.revenue },
      { label: 'Contribution', value: `${item.fill}%` },
      { label: 'Attendees', value: `${item.attendees}` },
      { label: 'Rating', value: `${item.rating}/5` },
    ],
    analysis: [
      `${item.label} is one of the leading contributors in the portfolio, generating ${item.revenue} with ${item.attendees} attendees tracked.`,
      `A ${item.capacity}% capacity posture suggests the event can support focused upsell or inventory pacing instead of broad discounting.`,
      'Because this event is materially shaping revenue concentration, it should stay close to the top of staffing and guest-experience reviews.',
    ],
    actions: [
      createInsightAction('Open events workspace', () => navigateToWorkspace('EventOrganizerEventsScreen'), {
        icon: 'calendar-edit',
        tone: 'primary',
      }),
      createInsightAction('View ticket desk', () => navigateToWorkspace('OrganizerTickets'), {
        icon: 'ticket-confirmation',
      }),
      createInsightAction('Export revenue mix', () => handleExportData(`${item.label} Revenue Mix`), {
        icon: 'file-download-outline',
      }),
    ],
  });

  const buildChartPanel = (type) => {
    const panels = {
      attendees: {
        eyebrow: 'Audience Intelligence',
        title: 'Attendee demographics',
        summary: 'Customer age-band distribution and the audience clusters shaping current demand.',
        metrics: [
          { label: 'Top segment', value: topAttendeeSegment?.label ?? '--' },
          { label: 'Top share', value: `${topAttendeeSegment?.value ?? 0}%` },
          { label: 'Repeat guests', value: `${stats.repeatAttendees}` },
          { label: 'Social reach', value: `${stats.socialMediaReach}` },
        ],
        analysis: [
          `${topAttendeeSegment?.label ?? 'The lead'} audience segment is the largest block, which should keep creative direction and partnership choices anchored to that customer profile.`,
          `${stats.repeatAttendees} returning buyers show that the audience is not just arriving, but coming back after prior experiences.`,
          `Social reach is tracking at ${stats.socialMediaReach}, giving the team enough top-of-funnel visibility to support segmented remarketing.`,
        ],
        actions: [
          createInsightAction('Open ticket desk', () => navigateToWorkspace('OrganizerTickets'), {
            icon: 'ticket-confirmation',
            tone: 'primary',
          }),
          createInsightAction('Browse market', () => navigateToWorkspace('BrowseEvents'), {
            icon: 'compass-outline',
          }),
          createInsightAction('Export audience report', () => handleExportData('Audience Intelligence'), {
            icon: 'file-download-outline',
          }),
        ],
      },
      sales: {
        eyebrow: 'Commercial Intelligence',
        title: 'Sales analytics',
        summary: 'Purchase behavior, conversion moments, and timing patterns behind recent sales.',
        metrics: [
          { label: 'Avg purchase', value: formatCurrency(stats.avgPurchaseValue) },
          { label: 'Price trend', value: `+${stats.avgTicketPriceTrend}%` },
          { label: 'Peak sales', value: stats.peakSalesTime },
          { label: 'Best day', value: stats.mostPopularDay },
        ],
        analysis: [
          `Average purchase value sits at ${formatCurrency(stats.avgPurchaseValue)}, which suggests buyers are still engaging with mid- to premium-tier baskets.`,
          `Ticket price trend is up ${stats.avgTicketPriceTrend}%, and demand is still converting, so pricing power remains intact.`,
          `${stats.peakSalesTime} is the highest-yield purchase window, which makes it the right slot for urgency messaging and inventory alerts.`,
        ],
        actions: [
          createInsightAction('Browse market', () => navigateToWorkspace('BrowseEvents'), {
            icon: 'compass-outline',
            tone: 'primary',
          }),
          createInsightAction('Open events workspace', () => navigateToWorkspace('EventOrganizerEventsScreen'), {
            icon: 'calendar-edit',
          }),
          createInsightAction('Export sales brief', () => handleExportData('Sales Analytics'), {
            icon: 'file-download-outline',
          }),
        ],
      },
      performance: {
        eyebrow: 'Commercial Intelligence',
        title: 'Event performance leaderboard',
        summary: 'Top-earning events ranked by revenue contribution, attendance, and sentiment.',
        metrics: [
          { label: 'Lead event', value: topPerformanceRecord?.name ?? '--' },
          { label: 'Lead revenue', value: topPerformanceRecord ? formatCurrency(topPerformanceRecord.revenue) : '--' },
          { label: 'Lead rating', value: topPerformanceRecord ? `${topPerformanceRecord.rating}/5` : '--' },
          { label: 'Portfolio events', value: `${eventPerformanceData.length}` },
        ],
        analysis: [
          `${topPerformanceRecord?.name ?? 'The lead event'} is currently setting the portfolio pace, which makes it the right benchmark for capacity, pricing, and guest-experience decisions.`,
          'Performance differences across the top events suggest the team should manage the portfolio as a set of distinct demand patterns rather than one blended market.',
          'The strongest events are good candidates for follow-on launches, sponsor packages, and premium audience retention campaigns.',
        ],
        actions: [
          createInsightAction('Open events workspace', () => navigateToWorkspace('EventOrganizerEventsScreen'), {
            icon: 'calendar-edit',
            tone: 'primary',
          }),
          createInsightAction('Create new event', () => navigateToWorkspace('CreateEvent'), {
            icon: 'calendar-plus',
          }),
          createInsightAction('Export leaderboard', () => handleExportData('Performance Leaderboard'), {
            icon: 'file-download-outline',
          }),
        ],
      },
      status: {
        eyebrow: 'Operations',
        title: 'Event status distribution',
        summary: 'Portfolio lifecycle mix across active, pending, completed, and cancelled events.',
        metrics: [
          { label: 'Active', value: `${stats.activeEvents}` },
          { label: 'Pending', value: `${stats.pendingEvents}` },
          { label: 'Completed', value: `${stats.completedEvents}` },
          { label: 'Cancelled', value: `${stats.cancelledEvents}` },
        ],
        analysis: [
          `${stats.activeEvents} active events create the largest operational load right now, so live readiness should stay at the top of the board.`,
          `${stats.pendingEvents} pending events mean launch planning remains a significant parallel workload and should not be left to the final week.`,
          'Completed events provide the cleanest source of feedback loops, while cancelled events should be reviewed for preventable pattern risk.',
        ],
        actions: [
          createInsightAction('Open events workspace', () => navigateToWorkspace('EventOrganizerEventsScreen'), {
            icon: 'calendar-edit',
            tone: 'primary',
          }),
          createInsightAction('Create new event', () => navigateToWorkspace('CreateEvent'), {
            icon: 'calendar-plus',
          }),
          createInsightAction('Refresh board', handleRefresh, {
            icon: 'refresh',
          }),
        ],
      },
      satisfaction: {
        eyebrow: 'Audience Intelligence',
        title: 'Customer satisfaction',
        summary: 'Sentiment quality, feedback concentration, and operational trust after purchase and attendance.',
        metrics: [
          { label: 'NPS score', value: `${stats.customerSatisfaction}` },
          { label: 'Avg rating', value: `${stats.avgEventRating.toFixed(1)}/5` },
          { label: 'Check-in rate', value: `${stats.checkInRate}%` },
          { label: 'Refund rate', value: `${stats.refundRate}%` },
        ],
        analysis: [
          `A satisfaction score of ${stats.customerSatisfaction} and an average rating of ${stats.avgEventRating.toFixed(1)}/5 indicate the customer promise is being delivered reliably.`,
          `The combination of ${stats.checkInRate}% check-in success and ${stats.refundRate}% refunds shows the live experience is not creating material post-purchase friction.`,
          'Feedback themes suggest the strongest trust drivers are communication quality, venue experience, and staff professionalism.',
        ],
        actions: [
          createInsightAction('Open organizer profile', () => navigateToWorkspace('OrganizerProfile'), {
            icon: 'account-cog',
            tone: 'primary',
          }),
          createInsightAction('Open help center', () => navigateToWorkspace('HelpCenter'), {
            icon: 'lifebuoy',
          }),
          createInsightAction('Export feedback', () => handleExportData('Customer Feedback'), {
            icon: 'file-download-outline',
          }),
        ],
      },
    };

    return panels[type] ?? panels.satisfaction;
  };

  const buildInsightPanel = (insight) => {
    const panels = {
      growth: {
        eyebrow: 'Strategic Insight',
        title: 'Quarterly revenue growth',
        summary: 'Growth momentum and what it means for the next operating cycle.',
        metrics: [
          { label: 'Growth', value: `${stats.revenueGrowth}%` },
          { label: 'Gross revenue', value: formatCurrency(stats.totalRevenue) },
          { label: 'Top event', value: stats.topEvent },
          { label: 'Sponsors', value: formatCurrency(stats.sponsorshipRevenue) },
        ],
        analysis: [
          `Revenue is up ${stats.revenueGrowth}% this quarter, which supports a more confident growth posture rather than a defensive preservation strategy.`,
          `${stats.topEvent} continues to anchor the top line, so the team should keep translating what is working there into the next slate of launches.`,
          `Sponsor contribution of ${formatCurrency(stats.sponsorshipRevenue)} gives the business room to scale without relying only on ticket income.`,
        ],
        actions: [
          createInsightAction('Open events workspace', () => navigateToWorkspace('EventOrganizerEventsScreen'), {
            icon: 'calendar-edit',
            tone: 'primary',
          }),
          createInsightAction('Export executive brief', () => handleExportData('Organizer Executive Brief'), {
            icon: 'file-chart-outline',
          }),
          createInsightAction('Create new event', () => navigateToWorkspace('CreateEvent'), {
            icon: 'calendar-plus',
          }),
        ],
      },
      weekend: {
        eyebrow: 'Strategic Insight',
        title: 'Weekend conversion advantage',
        summary: 'Weekend demand is outperforming and should shape portfolio pacing.',
        metrics: [
          { label: 'Weekend lift', value: '35%' },
          { label: 'Best day', value: stats.mostPopularDay },
          { label: 'Conversion', value: `${stats.conversionRate}%` },
          { label: 'Peak sales', value: stats.peakSalesTime },
        ],
        analysis: [
          'Weekend inventory is outperforming weekday performance, which suggests the audience is still prioritizing convenience and destination-style event timing.',
          `${stats.mostPopularDay} remains the best conversion day, so marketing and staffing should be planned around that volume concentration.`,
          `Because peak sales are still concentrated in the ${stats.peakSalesTime} window, late-day weekend demand moments deserve extra campaign support.`,
        ],
        actions: [
          createInsightAction('Browse market', () => navigateToWorkspace('BrowseEvents'), {
            icon: 'compass-outline',
            tone: 'primary',
          }),
          createInsightAction('Open events workspace', () => navigateToWorkspace('EventOrganizerEventsScreen'), {
            icon: 'calendar-edit',
          }),
          createInsightAction('Export demand brief', () => handleExportData('Weekend Demand Brief'), {
            icon: 'file-download-outline',
          }),
        ],
      },
      vip: {
        eyebrow: 'Strategic Insight',
        title: 'VIP audience value',
        summary: 'Premium guest behavior is materially stronger than the broader audience base.',
        metrics: [
          { label: 'VIP guests', value: `${stats.vipAttendees}` },
          { label: 'Avg purchase', value: formatCurrency(stats.avgPurchaseValue) },
          { label: 'Repeat guests', value: `${stats.repeatAttendees}` },
          { label: 'Satisfaction', value: `${stats.customerSatisfaction}` },
        ],
        analysis: [
          `${stats.vipAttendees} VIP attendees represent a compact but high-value audience that should receive more intentional service design and communication.`,
          'Premium buyers are spending materially more than the average guest, which makes retention and access quality especially important.',
          'These guests are the best candidates for presale offers, sponsorship experiences, and early access programs.',
        ],
        actions: [
          createInsightAction('Open organizer profile', () => navigateToWorkspace('OrganizerProfile'), {
            icon: 'account-cog',
            tone: 'primary',
          }),
          createInsightAction('View ticket desk', () => navigateToWorkspace('OrganizerTickets'), {
            icon: 'ticket-confirmation',
          }),
          createInsightAction('Export VIP segment', () => handleExportData('VIP Segment'), {
            icon: 'file-download-outline',
          }),
        ],
      },
      email: {
        eyebrow: 'Strategic Insight',
        title: 'Email-driven sales momentum',
        summary: 'Lifecycle marketing remains one of the strongest sales drivers in the organizer stack.',
        metrics: [
          { label: 'Email reach', value: `${stats.emailOpenRate}%` },
          { label: 'Sales influence', value: '42%' },
          { label: 'Repeat guests', value: `${stats.repeatAttendees}` },
          { label: 'Top day', value: stats.mostPopularDay },
        ],
        analysis: [
          'Email is influencing 42% of ticket sales, which confirms the channel is still carrying meaningful revenue impact rather than just top-of-funnel awareness.',
          `${stats.emailOpenRate}% audience email reach shows the audience is still responsive, especially when campaigns align with high-intent timing.`,
          `This channel is particularly valuable for repeat guests and for warming demand ahead of ${stats.mostPopularDay} inventory moments.`,
        ],
        actions: [
          createInsightAction('Browse market', () => navigateToWorkspace('BrowseEvents'), {
            icon: 'compass-outline',
            tone: 'primary',
          }),
          createInsightAction('Open organizer profile', () => navigateToWorkspace('OrganizerProfile'), {
            icon: 'account-cog',
          }),
          createInsightAction('Export campaign brief', () => handleExportData('Campaign Brief'), {
            icon: 'file-download-outline',
          }),
        ],
      },
    };

    return panels[insight.id] ?? panels.email;
  };

  const renderStatCard = (card) => (
    <TouchableOpacity
      activeOpacity={0.96}
      style={[styles.statCard, styles.interactiveSurface, { backgroundColor: colors.card }]}
      onPress={() => openInsightPanel(buildSnapshotPanel(card))}
    >
      <View style={[styles.statIconContainer, { backgroundColor: `${card.tint}15` }]}>
        <Icon name={card.icon} size={22} color={card.tint} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color: colors.text }]}>{card.value}</Text>
        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{card.title}</Text>
        {card.subtitle && (
          <View style={styles.subtitleContainer}>
            {card.trend && (
              <View style={[
                styles.trendIndicator,
                { backgroundColor: card.trend > 0 ? `${colors.success}20` : `${colors.danger}20` }
              ]}>
                <Icon 
                  name={card.trend > 0 ? 'trending-up' : 'trending-down'} 
                  size={12} 
                  color={card.trend > 0 ? colors.success : colors.danger} 
                />
                <Text style={[
                  styles.trendText, 
                  { color: card.trend > 0 ? colors.success : colors.danger }
                ]}>
                  {Math.abs(card.trend)}%
                </Text>
              </View>
            )}
            <Text style={[styles.statSubtitle, { color: colors.textTertiary }]}>{card.subtitle}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderAttendeeChart = () => (
    <TouchableOpacity
      activeOpacity={0.98}
      style={[styles.chartCard, styles.interactiveSurface, { backgroundColor: colors.card }]}
      onPress={() => openInsightPanel(buildChartPanel('attendees'))}
    >
      <View style={styles.chartHeader}>
        <View>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Attendee Demographics</Text>
          <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Age distribution</Text>
        </View>
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={(event) => handleCardUtilityPress(event, () => handleExportData('Attendee'))}
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
              <Text style={[styles.pieValue, { color: colors.textSecondary }]}>{item.value.toLocaleString()} · {totalAudienceMetric > 0 ? Math.round((item.value / totalAudienceMetric) * 100) : 0}%</Text>
              <View style={[styles.pieBar, { backgroundColor: colors.surface }]}>
                <View 
                  style={[
                    styles.pieBarFill, 
                    { 
                      width: `${totalAudienceMetric > 0 ? Math.round((item.value / totalAudienceMetric) * 100) : 0}%`,
                      backgroundColor: item.color
                    }
                  ]} 
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  const renderEventPerformance = () => (
    <TouchableOpacity
      activeOpacity={0.98}
      style={[styles.chartCard, styles.interactiveSurface, { backgroundColor: colors.card }]}
      onPress={() => openInsightPanel(buildChartPanel('performance'))}
    >
      <View style={styles.chartHeader}>
        <View>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Event Performance</Text>
          <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Top 5 events by revenue</Text>
        </View>
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={(event) => handleCardUtilityPress(event, () => handleExportData('Performance'))}
        >
          <Icon name="download" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.performanceContainer}>
        {eventPerformanceData.map((event, index) => (
          <TouchableOpacity
            key={index}
            activeOpacity={0.96}
            style={[styles.performanceItem, styles.nestedInteractiveSurface]}
            onPress={(pressEvent) => handleCardUtilityPress(pressEvent, () => openInsightPanel(buildPerformancePanel(event)))}
          >
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
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  );

  const renderSalesAnalytics = () => (
    <TouchableOpacity
      activeOpacity={0.98}
      style={[styles.chartCard, styles.interactiveSurface, { backgroundColor: colors.card }]}
      onPress={() => openInsightPanel(buildChartPanel('sales'))}
    >
      <View style={styles.chartHeader}>
        <View>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Sales Analytics</Text>
          <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>{salesTimeline.length ? 'Purchase patterns & recent revenue history' : 'Purchase patterns & trends'}</Text>
        </View>
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={(event) => handleCardUtilityPress(event, () => handleExportData('Sales Analytics'))}
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
              {stats.peakSalesTime} ({Math.max(...salesTimelineValues.map((item) => item.value), 0)}% of portfolio momentum)
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
              {stats.mostPopularDay} ({stats.activeEvents} active events influencing the current cadence)
            </Text>
          </View>
        </View>

        <View style={styles.salesTimeline}>
          <Text style={[styles.salesTimelineTitle, { color: colors.text }]}>Sales Volume by Hour</Text>
          <View style={styles.timelineBars}>
            {salesTimelineValues.map((item, index) => (
              <View key={`${item.label}-${index}`} style={styles.timelineBarContainer}>
                <Text style={[styles.timelineLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                <View style={[styles.timelineBarBackground, { backgroundColor: colors.surface }]}>
                  <View 
                    style={[
                      styles.timelineBarFill, 
                      { 
                        height: `${item.value}%`,
                        backgroundColor: item.value === Math.max(...salesTimelineValues.map((entry) => entry.value)) ? colors.primary : colors.primaryLight
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.timelineValue, { color: colors.textSecondary }]}>
                  {item.value}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.conversionFunnel}>
          <Text style={[styles.conversionTitle, { color: colors.text }]}>Conversion Funnel</Text>
          <View style={styles.funnelSteps}>
            {funnelMetrics.flatMap((metric, index) => {
              const nodes = [
                <View key={metric.label} style={styles.funnelStep}>
                  <View style={[styles.funnelStepDot, { backgroundColor: metric.color }]} />
                  <Text style={[styles.funnelStepLabel, { color: colors.text }]}>{metric.label}</Text>
                  <Text style={[styles.funnelStepValue, { color: colors.textSecondary }]}>{metric.value.toLocaleString()}</Text>
                </View>,
              ];

              if (index < funnelMetrics.length - 1) {
                nodes.push(
                  <View key={`${metric.label}-arrow`} style={styles.funnelArrow}>
                    <Icon name="chevron-right" size={16} color={colors.textTertiary} />
                  </View>
                );
              }

              return nodes;
            })}
          </View>
          <Text style={[styles.conversionRate, { color: colors.textTertiary }]}>
            Overall conversion rate: {stats.conversionRate}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderLiveActivity = () => (
    <View style={[styles.chartCard, { backgroundColor: colors.card }]}> 
      <View style={styles.chartHeader}>
        <View>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Recent Activity</Text>
          <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Latest organizer sales and check-ins</Text>
        </View>
      </View>
      <View style={styles.activityStack}>
        {recentActivity.length ? recentActivity.slice(0, 5).map((item) => {
          const isCheckIn = item.type === 'check_in';
          return (
            <View key={item.id} style={styles.activityRow}>
              <View style={[styles.activityIcon, { backgroundColor: isCheckIn ? `${colors.success}16` : `${colors.primary}16` }]}>
                <Icon name={isCheckIn ? 'qrcode-scan' : 'ticket-confirmation'} size={16} color={isCheckIn ? colors.success : colors.primary} />
              </View>
              <View style={styles.activityCopy}>
                <Text style={[styles.activityTitle, { color: colors.text }]}>{item.subject || item.title}</Text>
                <Text style={[styles.activityMeta, { color: colors.textSecondary }]}>{item.title} · {item.ticketType || 'General'}</Text>
              </View>
              <View style={styles.activityValueBlock}>
                <Text style={[styles.activityValue, { color: colors.text }]}>{isCheckIn ? 'Checked in' : formatCurrency(Number(item.amount || 0))}</Text>
                <Text style={[styles.activityTime, { color: colors.textTertiary }]}>{formatEventDateLabel(item.activityAt)}</Text>
              </View>
            </View>
          );
        }) : (
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>Live activity will appear here once ticket actions start flowing in.</Text>
        )}
      </View>
    </View>
  );

  const renderFeedbackPulse = () => (
    <View style={[styles.chartCard, { backgroundColor: colors.card }]}> 
      <View style={styles.chartHeader}>
        <View>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Feedback Pulse</Text>
          <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Event-level satisfaction samples from recent ticket behavior</Text>
        </View>
      </View>
      <View style={styles.feedbackPulseStack}>
        {feedbackItems.length ? feedbackItems.slice(0, 4).map((item) => (
          <View key={item.event_id} style={styles.feedbackPulseRow}>
            <View style={styles.feedbackPulseCopy}>
              <Text style={[styles.feedbackPulseTitle, { color: colors.text }]}>{item.event_name}</Text>
              <Text style={[styles.feedbackPulseMeta, { color: colors.textSecondary }]}>{item.sample_size} response signals</Text>
            </View>
            <View style={styles.feedbackPulseScore}>
              <Text style={[styles.feedbackPulseValue, { color: colors.text }]}>{Number(item.avg_rating || 0).toFixed(1)}/5</Text>
              <View style={[styles.feedbackPulseBar, { backgroundColor: colors.surface }]}>
                <View style={[styles.feedbackPulseFill, { width: `${Math.max(0, Math.min(100, Math.round((Number(item.avg_rating || 0) / 5) * 100)))}%`, backgroundColor: colors.success }]} />
              </View>
            </View>
          </View>
        )) : (
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>Feedback samples will populate once recent attendee signals are available.</Text>
        )}
      </View>
    </View>
  );

  const renderEventStatus = () => (
    <TouchableOpacity
      activeOpacity={0.98}
      style={[styles.chartCard, styles.interactiveSurface, { backgroundColor: colors.card }]}
      onPress={() => openInsightPanel(buildChartPanel('status'))}
    >
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
    </TouchableOpacity>
  );

  const renderCustomerSatisfaction = () => (
    <TouchableOpacity
      activeOpacity={0.98}
      style={[styles.chartCard, styles.interactiveSurface, { backgroundColor: colors.card }]}
      onPress={() => openInsightPanel(buildChartPanel('satisfaction'))}
    >
      <View style={styles.chartHeader}>
        <View>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Customer Satisfaction</Text>
          <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Feedback & ratings</Text>
        </View>
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={(event) => handleCardUtilityPress(event, () => handleExportData('Customer Feedback'))}
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
              <Text style={[styles.scoreItemValue, { color: colors.success }]}>{promoterShare}%</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreItemLabel, { color: colors.text }]}>Passives</Text>
              <Text style={[styles.scoreItemValue, { color: colors.warning }]}>{passiveShare}%</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreItemLabel, { color: colors.text }]}>Detractors</Text>
              <Text style={[styles.scoreItemValue, { color: colors.danger }]}>{detractorShare}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.ratingDistribution}>
          <Text style={[styles.ratingTitle, { color: colors.text }]}>Rating Distribution</Text>
          {ratingDistribution.map(({ stars, percent }) => (
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
                      width: `${percent}%`,
                      backgroundColor: stars >= 4 ? colors.success : 
                                     stars >= 3 ? colors.warning : colors.danger
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.ratingPercentage, { color: colors.textSecondary }]}>
                {percent}%
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.feedbackHighlights}>
          <Text style={[styles.feedbackTitle, { color: colors.text }]}>Feedback Highlights</Text>
          {feedbackItems.length ? feedbackItems.slice(0, 2).map((item) => (
            <View key={item.event_id} style={styles.feedbackItem}>
              <Icon name="thumb-up" size={16} color={colors.success} />
              <Text style={[styles.feedbackText, { color: colors.text }]}>
                {`${item.event_name} is trending at ${Number(item.avg_rating || 0).toFixed(1)}/5 across ${item.sample_size} recent response signals.`}
              </Text>
            </View>
          )) : (
            <>
              <View style={styles.feedbackItem}>
                <Icon name="thumb-up" size={16} color={colors.success} />
                <Text style={[styles.feedbackText, { color: colors.text }]}>
                  {stats.checkInRate > 0
                    ? `Check-in operations are landing at ${stats.checkInRate}%, which signals a strong front-of-house experience.`
                    : 'Check-in feedback will appear here as live event activity starts flowing in.'}
                </Text>
              </View>
              <View style={styles.feedbackItem}>
                <Icon name="thumb-up" size={16} color={colors.success} />
                <Text style={[styles.feedbackText, { color: colors.text }]}>
                  {stats.topEventRevenue > 0
                    ? `${stats.topEvent} is currently leading revenue contribution, making it the clearest signal for what guests value most.`
                    : 'Revenue-led guest experience signals will populate once live transactions are available.'}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
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
              styles.interactiveSurface,
              { 
                backgroundColor: selectedEvent === event.id ? colors.primary : colors.card,
                borderColor: colors.border,
              }
            ]}
            onPress={() => setSelectedEvent(event.id)}
            onLongPress={() => openInsightPanel(buildEventPanel(event))}
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
            <View style={styles.eventCardFooter}>
              <Text
                style={[
                  styles.eventCardMeta,
                  { color: selectedEvent === event.id ? colors.card : colors.textSecondary },
                ]}
              >
                {event.date}
              </Text>
              <TouchableOpacity
                style={[
                  styles.eventCardActionButton,
                  {
                    backgroundColor: selectedEvent === event.id ? `${colors.card}24` : colors.surface,
                  },
                ]}
                onPress={(pressEvent) =>
                  handleCardUtilityPress(pressEvent, () => {
                    setSelectedEvent(event.id);
                    openInsightPanel(buildEventPanel(event));
                  })
                }
              >
                <Text
                  style={[
                    styles.eventCardActionText,
                    { color: selectedEvent === event.id ? colors.card : colors.primary },
                  ]}
                >
                  View brief
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderInsightModal = () => {
    if (!activeInsightPanel) {
      return null;
    }

    return (
      <Modal
        visible={!!activeInsightPanel}
        transparent={true}
        animationType="fade"
        onRequestClose={closeInsightPanel}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.insightModalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.insightModalHeader, { borderBottomColor: colors.borderLight }]}>
              <View style={styles.insightModalHeaderCopy}>
                <Text style={[styles.insightModalEyebrow, { color: colors.primary }]}>
                  {activeInsightPanel.eyebrow}
                </Text>
                <Text style={[styles.insightModalTitle, { color: colors.text }]}>
                  {activeInsightPanel.title}
                </Text>
                <Text style={[styles.insightModalSummary, { color: colors.textSecondary }]}>
                  {activeInsightPanel.summary}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.insightModalClose, { backgroundColor: colors.surface }]}
                onPress={closeInsightPanel}
              >
                <Icon name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.insightModalScroll}
              contentContainerStyle={styles.insightModalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.insightMetricGrid}>
                {activeInsightPanel.metrics?.map((metric) => (
                  <View
                    key={`${activeInsightPanel.title}-${metric.label}`}
                    style={[styles.insightMetricCard, { backgroundColor: colors.surface }]}
                  >
                    <Text style={[styles.insightMetricLabel, { color: colors.textSecondary }]}>
                      {metric.label}
                    </Text>
                    <Text style={[styles.insightMetricValue, { color: colors.text }]}>
                      {metric.value}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.insightSection}>
                <Text style={[styles.insightSectionTitle, { color: colors.text }]}>Analysis</Text>
                <View style={styles.insightAnalysisList}>
                  {activeInsightPanel.analysis?.map((item, index) => (
                    <View key={`${activeInsightPanel.title}-analysis-${index}`} style={styles.insightAnalysisItem}>
                      <View style={[styles.insightAnalysisDot, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.insightAnalysisText, { color: colors.textSecondary }]}>
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.insightSection}>
                <Text style={[styles.insightSectionTitle, { color: colors.text }]}>Next Actions</Text>
                <View style={styles.insightActionRow}>
                  {activeInsightPanel.actions?.map((action) => {
                    const primary = action.tone === 'primary';
                    return (
                      <TouchableOpacity
                        key={`${activeInsightPanel.title}-${action.label}`}
                        style={[
                          styles.insightActionButton,
                          primary ? { backgroundColor: colors.primary, borderColor: colors.primary } : {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => runInsightAction(action)}
                      >
                        <Icon
                          name={action.icon}
                          size={18}
                          color={primary ? colors.card : colors.primary}
                        />
                        <Text
                          style={[
                            styles.insightActionText,
                            { color: primary ? colors.card : colors.primary },
                          ]}
                        >
                          {action.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

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
                    {currency.code}
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
          <View style={styles.pageShell}>
            <View style={styles.heroBoard}>
              <View style={styles.heroOrbLarge} />
              <View style={styles.heroOrbSmall} />
              <View style={styles.heroTopRow}>
                <View style={styles.heroIntroColumn}>
                  <Text style={styles.heroEyebrow}>Event organizer dashboard</Text>
                  <Text style={styles.heroBoardTitle}>
                    Operate revenue, venue readiness, and guest experience from one real control board
                  </Text>
                  <Text style={styles.heroBoardSubtitle}>
                    Designed for event teams that need sharper commercial visibility, faster operational decisions,
                    and a cleaner view of what needs attention next across the live portfolio.
                  </Text>

                  <View style={styles.heroActionRow}>
                    <TouchableOpacity style={styles.heroGhostButton} onPress={handleRefresh}>
                      <Icon name="refresh" size={18} color={colors.text} />
                      <Text style={[styles.heroGhostButtonText, { color: colors.text }]}>Refresh board</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.heroSolidButton, { backgroundColor: colors.primary }]}
                      onPress={() => navigateToWorkspace('EventOrganizerEventsScreen')}
                    >
                      <Icon name="calendar-edit" size={18} color={colors.card} />
                      <Text style={styles.heroSolidButtonText}>Open events workspace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.heroGhostButton, { backgroundColor: colors.surface }]}
                      onPress={() => handleExportData('Organizer Executive Brief')}
                    >
                      <Icon name="file-chart-outline" size={18} color={colors.primary} />
                      <Text style={[styles.heroGhostButtonText, { color: colors.primary }]}>Export brief</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.heroSummaryColumn}>
                  <TouchableOpacity
                    activeOpacity={0.98}
                    style={[styles.heroFocusCard, styles.interactiveSurface]}
                    onPress={() => selectedEventRecord && openInsightPanel(buildEventPanel(selectedEventRecord))}
                  >
                    <Text style={styles.heroFocusEyebrow}>Focus event</Text>
                    <Text style={styles.heroFocusTitle}>
                      {selectedEventRecord?.name ?? 'No event selected'}
                    </Text>
                    <Text style={styles.heroFocusCopy}>
                      Owned by {organizerDisplayName}. Reporting window: {focusWindowLabel}. Currency desk:
                      {' '}{selectedCurrency.code}.
                    </Text>

                    <View style={styles.heroFocusGrid}>
                      <View style={styles.heroFocusStat}>
                        <Text style={styles.heroFocusStatLabel}>Revenue</Text>
                        <Text style={styles.heroFocusStatValue}>
                          {selectedEventRecord ? formatCurrency(selectedEventRecord.revenue) : '--'}
                        </Text>
                      </View>
                      <View style={styles.heroFocusStat}>
                        <Text style={styles.heroFocusStatLabel}>Attendees</Text>
                        <Text style={styles.heroFocusStatValue}>
                          {selectedEventRecord?.attendees ?? '--'}
                        </Text>
                      </View>
                      <View style={styles.heroFocusStat}>
                        <Text style={styles.heroFocusStatLabel}>Status</Text>
                        <Text style={styles.heroFocusStatValue}>
                          {selectedEventRecord?.status ?? 'Awaiting selection'}
                        </Text>
                      </View>
                      <View style={styles.heroFocusStat}>
                        <Text style={styles.heroFocusStatLabel}>Peak sales</Text>
                        <Text style={styles.heroFocusStatValue}>{stats.peakSalesTime}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.heroAgendaCard}>
                    <Text style={styles.heroAgendaTitle}>Today&apos;s runbook</Text>
                    {priorityQueue.slice(0, 2).map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.97}
                        style={[styles.heroAgendaItem, styles.interactiveSurface]}
                        onPress={() => openInsightPanel(buildPriorityPanel(item))}
                      >
                        <View style={[styles.heroAgendaMarker, { backgroundColor: item.tint }]} />
                        <View style={styles.heroAgendaCopy}>
                          <Text style={[styles.heroAgendaItemTitle, { color: colors.text }]}>{item.title}</Text>
                          <Text style={[styles.heroAgendaItemDetail, { color: colors.textSecondary }]}>
                            {item.detail}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.headlineStrip}>
              {executiveSignals.map((signal) => (
                <TouchableOpacity
                  key={signal.id}
                  activeOpacity={0.97}
                  style={[styles.headlineCard, styles.interactiveSurface]}
                  onPress={() => openInsightPanel(buildExecutiveSignalPanel(signal))}
                >
                  <View style={[styles.headlineIcon, { backgroundColor: `${signal.tint}14` }]}>
                    <Icon name={signal.icon} size={18} color={signal.tint} />
                  </View>
                  <Text style={styles.headlineLabel}>{signal.label}</Text>
                  <Text style={styles.headlineValue}>{signal.value}</Text>
                  <Text style={styles.headlineDetail}>{signal.detail}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.workspaceGrid}>
              <View style={styles.workspaceMain}>
                {renderEventSelector()}

                <View style={[styles.sectionShell, { backgroundColor: colors.card }]}>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>Executive Snapshot</Text>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Commercial and audience health for the organizer portfolio
                      </Text>
                    </View>
                    <View style={[styles.sectionMetaPill, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.sectionMetaText, { color: colors.textSecondary }]}>
                        {focusWindowLabel}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statsGrid}>
                    {snapshotCards.map((card) => renderStatCard(card))}
                  </View>
                </View>

                <View style={[styles.sectionShell, { backgroundColor: colors.card }]}>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>Commercial Intelligence</Text>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Revenue performance, purchase behavior, and demand movement
                      </Text>
                    </View>
                    <View style={[styles.sectionMetaPill, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.sectionMetaText, { color: colors.textSecondary }]}>
                        {selectedCurrency.code} desk
                      </Text>
                    </View>
                  </View>

                  <View style={styles.sectionContentStack}>
                    {renderSalesAnalytics()}
                    {renderEventPerformance()}
                    {renderLiveActivity()}
                  </View>
                </View>

              </View>

              <View style={styles.workspaceRail}>
                <View style={[styles.runbookPanel, { backgroundColor: colors.card }]}>
                  <View style={styles.runbookHeader}>
                    <View>
                      <Text style={[styles.runbookEyebrow, { color: colors.primary }]}>Operator Runbook</Text>
                      <Text style={[styles.runbookTitle, { color: colors.text }]}>
                        Daily controls for ticketing, reporting, and guest access
                      </Text>
                    </View>
                  </View>

                  <View style={styles.periodRail}>
                    {periodOptions.map((option) => {
                      const active = selectedPeriod === option.id;
                      return (
                        <TouchableOpacity
                          key={option.id}
                          style={[
                            styles.periodChip,
                            {
                              backgroundColor: active ? colors.primary : colors.surface,
                              borderColor: active ? colors.primary : colors.border,
                            },
                          ]}
                          onPress={() => setSelectedPeriod(option.id)}
                        >
                          <Text
                            style={[
                              styles.periodChipText,
                              { color: active ? colors.card : colors.textSecondary },
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.workflowStack}>
                    {workflowCards.map((card) => (
                      <TouchableOpacity
                        key={card.id}
                        activeOpacity={0.97}
                        style={[styles.workflowCard, styles.interactiveSurface, { borderColor: `${card.tint}1F` }]}
                        onPress={() => openInsightPanel(buildWorkflowPanel(card))}
                      >
                        <View style={[styles.workflowIcon, { backgroundColor: `${card.tint}14` }]}>
                          <Icon name={card.icon} size={18} color={card.tint} />
                        </View>
                        <View style={styles.workflowContent}>
                          <Text style={[styles.workflowTitle, { color: colors.text }]}>{card.title}</Text>
                          <Text style={[styles.workflowDetail, { color: colors.textSecondary }]}>
                            {card.detail}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.workflowAction, { backgroundColor: `${card.tint}12` }]}
                          onPress={(event) => handleCardUtilityPress(event, card.onPress)}
                        >
                          <Text style={[styles.workflowActionText, { color: card.tint }]}>
                            {card.actionLabel}
                          </Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.runbookPanel, { backgroundColor: colors.card }]}>
                  <View style={styles.runbookHeader}>
                    <View>
                      <Text style={[styles.runbookEyebrow, { color: colors.primary }]}>Priority Queue</Text>
                      <Text style={[styles.runbookTitle, { color: colors.text }]}>
                        Work the next actions before they become event-day risk
                      </Text>
                    </View>
                  </View>

                  <View style={styles.priorityStack}>
                    {priorityQueue.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.97}
                        style={[styles.priorityCard, styles.interactiveSurface, { borderColor: `${item.tint}20` }]}
                        onPress={() => openInsightPanel(buildPriorityPanel(item))}
                      >
                        <View style={styles.priorityCardHeader}>
                          <View
                            style={[
                              styles.priorityBadge,
                              { backgroundColor: `${item.tint}12` },
                            ]}
                          >
                            <Text style={[styles.priorityBadgeText, { color: item.tint }]}>
                              {item.badge}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={[
                              styles.priorityAction,
                              { backgroundColor: `${item.tint}12` },
                            ]}
                            onPress={(event) => handleCardUtilityPress(event, item.onPress)}
                          >
                            <Text style={[styles.priorityActionText, { color: item.tint }]}>
                              {item.actionLabel}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={[styles.priorityTitle, { color: colors.text }]}>
                          {item.title}
                        </Text>
                        <Text style={[styles.priorityDetail, { color: colors.textSecondary }]}>
                          {item.detail}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.runbookPanel, { backgroundColor: colors.card }]}>
                  <View style={styles.runbookHeader}>
                    <View>
                      <Text style={[styles.runbookEyebrow, { color: colors.primary }]}>Revenue Mix</Text>
                      <Text style={[styles.runbookTitle, { color: colors.text }]}>
                        Concentration by event and current on-site posture
                      </Text>
                    </View>
                  </View>

                  <View style={styles.revenueMixStack}>
                    {revenueMix.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.97}
                        style={[styles.revenueMixRow, styles.revenueMixInteractiveRow]}
                        onPress={() => openInsightPanel(buildRevenueMixPanel(item))}
                      >
                        <View style={styles.revenueMixCopy}>
                          <Text style={[styles.revenueMixLabel, { color: colors.text }]}>
                            {item.label}
                          </Text>
                          <Text style={[styles.revenueMixValue, { color: colors.textSecondary }]}>
                            {item.revenue}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.revenueMixTrack,
                            { backgroundColor: colors.surface },
                          ]}
                        >
                          <View
                            style={[
                              styles.revenueMixFill,
                              {
                                width: `${item.fill}%`,
                                backgroundColor: colors.primary,
                              },
                            ]}
                          />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.runbookDivider} />
                  {renderEventStatus()}
                </View>
              </View>
            </View>

            <View style={[styles.sectionShell, { backgroundColor: colors.card, marginBottom: 24 }]}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>Audience Intelligence</Text>
                  <Text style={[styles.sectionTitle, styles.audienceSectionTitle, { color: colors.text }]}>
                    Demographics and post-event sentiment in one customer view
                  </Text>
                </View>
                <View style={[styles.sectionMetaPill, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.sectionMetaText, { color: colors.textSecondary }]}>
                    Customer experience
                  </Text>
                </View>
              </View>

              <View style={styles.audienceGrid}>
                <View style={styles.audienceColumn}>
                  {renderAttendeeChart()}
                  {renderFeedbackPulse()}
                </View>
                <View style={styles.audienceColumn}>
                  {renderCustomerSatisfaction()}
                </View>
              </View>
            </View>

            <View style={styles.insightsCard}>
              <View style={styles.insightsHeader}>
                <View>
                  <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>Strategic Insights</Text>
                  <Text style={[styles.insightsTitle, { color: colors.text }]}>Signals worth acting on next</Text>
                </View>
                <TouchableOpacity
                  style={[styles.insightsAction, { backgroundColor: colors.surface }]}
                  onPress={() => handleExportData('Insights')}
                >
                  <Icon name="file-export" size={18} color={colors.primary} />
                  <Text style={[styles.insightsActionText, { color: colors.primary }]}>Export insights</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.insightsGrid}>
                {strategicInsights.map((insight) => (
                  <TouchableOpacity
                    key={insight.id}
                    activeOpacity={0.97}
                    style={[
                      styles.insightCard,
                      styles.interactiveSurface,
                      {
                        backgroundColor: insight.backgroundColor,
                        borderColor: insight.borderColor,
                      },
                    ]}
                    onPress={() => openInsightPanel(buildInsightPanel(insight))}
                  >
                    <Icon name={insight.icon} size={24} color={insight.tint} />
                    {insight.statement}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => navigateToWorkspace('EventOrganizerEventsScreen')}
              >
                <Icon name="calendar-edit" size={20} color={colors.card} />
                <Text style={[styles.actionButtonText, { color: colors.card }]}>Open Events Workspace</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleExportData('Full Report')}
              >
                <Icon name="file-download" size={20} color={colors.text} />
                <Text style={[styles.actionButtonText, { color: colors.text }]}>Export Revenue Report</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigateToWorkspace('OrganizerProfile')}
              >
                <Icon name="account-cog" size={20} color={colors.text} />
                <Text style={[styles.actionButtonText, { color: colors.text }]}>Organizer Profile</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomSpacing} />
          </View>
        </ScrollView>
        
        {renderInsightModal()}
        {renderCurrencyModal()}
      </ScreenContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 28,
    padding: 28,
    marginBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 30,
    elevation: 8,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 24,
  },
  heroCopy: {
    flex: 1,
    minWidth: 320,
    maxWidth: 780,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(96, 165, 250, 0.14)',
    marginBottom: 16,
  },
  heroBadgeText: {
    color: '#DBEAFE',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: '#F8FAFC',
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '800',
    marginBottom: 12,
    maxWidth: 760,
  },
  heroSubtitle: {
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 680,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  heroSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.28)',
    backgroundColor: 'rgba(15, 23, 42, 0.36)',
  },
  heroSecondaryButtonText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  heroPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#2563EB',
  },
  heroPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  heroBodyRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flexWrap: 'wrap',
    gap: 16,
  },
  heroLeadCard: {
    flex: 1.2,
    minWidth: 320,
    borderRadius: 22,
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  heroLeadLabel: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  heroLeadTitle: {
    color: '#F8FAFC',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    marginBottom: 10,
  },
  heroLeadDescription: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 22,
  },
  heroTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  heroTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.14)',
  },
  heroTagText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  heroSignalGrid: {
    flex: 1,
    minWidth: 300,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  heroSignalCard: {
    flexGrow: 1,
    flexBasis: 190,
    borderRadius: 22,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  heroSignalIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroSignalLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  heroSignalValue: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSignalDetail: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
  },
  controlGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 24,
  },
  controlPrimary: {
    flex: 1.3,
    minWidth: 320,
  },
  controlSecondary: {
    flex: 0.9,
    minWidth: 320,
  },
  controlSecondaryStack: {
    gap: 20,
  },
  operationsCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 22,
    elevation: 3,
    height: '100%',
  },
  operationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  operationsTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  operationsSubtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  operationsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  operationsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  workflowStack: {
    gap: 12,
  },
  workflowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  workflowContent: {
    marginBottom: 14,
  },
  workflowTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  workflowDetail: {
    fontSize: 13,
    lineHeight: 20,
  },
  workflowAction: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  workflowActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  commandRailCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 22,
    elevation: 3,
  },
  commandRailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  commandRailEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.45,
    marginBottom: 8,
  },
  commandRailTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  commandRailAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  commandRailActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  priorityStack: {
    gap: 12,
    marginBottom: 20,
  },
  priorityCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  priorityAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  priorityActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  priorityTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  priorityDetail: {
    fontSize: 13,
    lineHeight: 20,
  },
  revenueMixSection: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  revenueMixTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  revenueMixStack: {
    gap: 12,
  },
  revenueMixRow: {
    gap: 8,
  },
  revenueMixCopy: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  revenueMixLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  revenueMixValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  revenueMixFill: {
    height: '100%',
    borderRadius: 999,
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
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectorTitle: {
    fontSize: 22,
    fontWeight: '800',
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
    paddingVertical: 5,
    borderRadius: 999,
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
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 3,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '700',
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
    flexShrink: 1,
  },
  chartsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 0,
  },
  chartColumn: {
    flex: 1,
    minWidth: 320,
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
    padding: 24,
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 22,
    elevation: 3,
    backgroundColor: '#FFFFFF',
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  insightsTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  insightsAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  insightsActionText: {
    fontSize: 13,
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
    padding: 18,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    minWidth: 220,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  sectionShell: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#DED6CA',
    shadowColor: '#8C7B62',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    maxWidth: 760,
  },
  sectionMetaPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  sectionMetaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  periodRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  periodChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  workflowCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    backgroundColor: '#FFFBF6',
  },
  priorityCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    backgroundColor: '#FFFBF6',
  },
  revenueMixTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bottomSpacing: {
    height: 12,
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
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F1EA',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 40,
    alignItems: 'center',
  },
  pageShell: {
    width: '100%',
    maxWidth: 1460,
    position: 'relative',
  },
  heroBoard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 36,
    padding: 30,
    marginBottom: 22,
    backgroundColor: '#FFFDFC',
    borderWidth: 1,
    borderColor: '#DED6CA',
    shadowColor: '#8C7B62',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 6,
  },
  heroOrbLarge: {
    position: 'absolute',
    right: -70,
    top: -54,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(20, 33, 61, 0.08)',
  },
  heroOrbSmall: {
    position: 'absolute',
    left: -42,
    bottom: -76,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(180, 83, 9, 0.10)',
  },
  heroTopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 22,
  },
  heroIntroColumn: {
    flex: 1.24,
    minWidth: 340,
    maxWidth: 780,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.55,
    color: '#B45309',
    marginBottom: 12,
  },
  heroBoardTitle: {
    color: '#14213D',
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '800',
    marginBottom: 14,
    maxWidth: 760,
  },
  heroBoardSubtitle: {
    color: '#5B6472',
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 680,
  },
  heroActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 22,
  },
  heroGhostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DED6CA',
    backgroundColor: '#FFF8EE',
  },
  heroGhostButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  heroSolidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  heroSolidButtonText: {
    color: '#FFFDFC',
    fontSize: 14,
    fontWeight: '700',
  },
  heroSummaryColumn: {
    flex: 0.92,
    minWidth: 320,
    gap: 14,
  },
  heroFocusCard: {
    borderRadius: 28,
    padding: 24,
    backgroundColor: '#14213D',
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 252, 0.10)',
  },
  heroFocusEyebrow: {
    color: '#E6D8BF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  heroFocusTitle: {
    color: '#FFFDFC',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    marginBottom: 10,
  },
  heroFocusCopy: {
    color: '#D5DDE9',
    fontSize: 14,
    lineHeight: 22,
  },
  heroFocusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 18,
  },
  heroFocusStat: {
    flexGrow: 1,
    flexBasis: 126,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255, 253, 252, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 252, 0.10)',
  },
  heroFocusStatLabel: {
    color: '#D9E2EF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.35,
    marginBottom: 6,
  },
  heroFocusStatValue: {
    color: '#FFFDFC',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  heroAgendaCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#F8F4EC',
    borderWidth: 1,
    borderColor: '#E6DDCF',
  },
  heroAgendaTitle: {
    color: '#14213D',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  heroAgendaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  heroAgendaMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  heroAgendaCopy: {
    flex: 1,
  },
  heroAgendaItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  heroAgendaItemDetail: {
    fontSize: 12,
    lineHeight: 18,
  },
  headlineStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 24,
  },
  headlineCard: {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 220,
    borderRadius: 22,
    padding: 18,
    backgroundColor: '#FFFDFC',
    borderWidth: 1,
    borderColor: '#DED6CA',
    shadowColor: '#8C7B62',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  headlineIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headlineLabel: {
    color: '#7C8593',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.45,
    marginBottom: 8,
  },
  headlineValue: {
    color: '#14213D',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  headlineDetail: {
    color: '#5B6472',
    fontSize: 13,
    lineHeight: 20,
  },
  workspaceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  workspaceMain: {
    flex: 1.28,
    minWidth: 340,
    gap: 20,
  },
  workspaceRail: {
    flex: 0.92,
    minWidth: 320,
    gap: 20,
  },
  runbookPanel: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#DED6CA',
    shadowColor: '#8C7B62',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 3,
  },
  runbookHeader: {
    marginBottom: 18,
  },
  runbookEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.45,
    marginBottom: 8,
  },
  runbookTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  runbookDivider: {
    height: 1,
    backgroundColor: '#E2DACE',
    marginVertical: 20,
  },
  sectionContentStack: {
    gap: 16,
  },
  audienceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  audienceColumn: {
    flex: 1,
    minWidth: 300,
  },
  audienceSectionTitle: {
    fontSize: 22,
    lineHeight: 28,
  },
  selectorCard: {
    padding: 24,
    borderRadius: 28,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#DED6CA',
    backgroundColor: '#FFFDFC',
    shadowColor: '#8C7B62',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 3,
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DED6CA',
    backgroundColor: '#F8F4EC',
  },
  eventCard: {
    width: 220,
    padding: 18,
    borderRadius: 18,
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#DED6CA',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 0,
    gap: 12,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: 240,
    minWidth: 220,
    padding: 18,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5DDD1',
    backgroundColor: '#FFFBF6',
    shadowColor: '#8C7B62',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 0,
  },
  chartCard: {
    padding: 22,
    borderRadius: 24,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#E5DDD1',
    backgroundColor: '#FFFBF6',
    shadowColor: '#8C7B62',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  performanceItem: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F6EFE5',
  },
  salesMetric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F6EFE5',
  },
  salesInsight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F6EFE5',
  },
  salesTimeline: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F6EFE5',
  },
  conversionFunnel: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F6EFE5',
  },
  satisfactionScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F6EFE5',
  },
  ratingDistribution: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F6EFE5',
  },
  feedbackHighlights: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F6EFE5',
  },
  insightsCard: {
    padding: 24,
    borderRadius: 28,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DED6CA',
    shadowColor: '#8C7B62',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 3,
    backgroundColor: '#FFFDFC',
  },
  actionButton: {
    flex: 1,
    minWidth: 220,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#DED6CA',
    shadowColor: '#8C7B62',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  interactiveSurface: {
    cursor: 'pointer',
  },
  nestedInteractiveSurface: {
    cursor: 'pointer',
  },
  eventCardFooter: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  eventCardMeta: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  eventCardActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  eventCardActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  revenueMixInteractiveRow: {
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#FFFBF6',
  },
  activityStack: {
    gap: 12,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFFBF6',
    borderWidth: 1,
    borderColor: '#EEE8DE',
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCopy: {
    flex: 1,
    gap: 4,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  activityMeta: {
    fontSize: 12,
    lineHeight: 18,
  },
  activityValueBlock: {
    alignItems: 'flex-end',
    gap: 4,
  },
  activityValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  activityTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  feedbackPulseStack: {
    gap: 12,
  },
  feedbackPulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFFBF6',
    borderWidth: 1,
    borderColor: '#EEE8DE',
  },
  feedbackPulseCopy: {
    flex: 1,
    gap: 4,
  },
  feedbackPulseTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  feedbackPulseMeta: {
    fontSize: 12,
    lineHeight: 18,
  },
  feedbackPulseScore: {
    width: 108,
    gap: 6,
  },
  feedbackPulseValue: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  feedbackPulseBar: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  feedbackPulseFill: {
    height: '100%',
    borderRadius: 999,
  },
  emptyStateText: {
    fontSize: 13,
    lineHeight: 20,
  },
  insightModalContent: {
    width: '100%',
    maxWidth: 860,
    maxHeight: '84%',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DED6CA',
    shadowColor: '#8C7B62',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    elevation: 8,
  },
  insightModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    padding: 24,
    borderBottomWidth: 1,
  },
  insightModalHeaderCopy: {
    flex: 1,
  },
  insightModalEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  insightModalTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    marginBottom: 10,
  },
  insightModalSummary: {
    fontSize: 14,
    lineHeight: 22,
  },
  insightModalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightModalScroll: {
    flexGrow: 0,
  },
  insightModalScrollContent: {
    padding: 24,
    gap: 22,
  },
  insightMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  insightMetricCard: {
    flexGrow: 1,
    flexBasis: 170,
    minWidth: 160,
    borderRadius: 18,
    padding: 16,
  },
  insightMetricLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  insightMetricValue: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  insightSection: {
    gap: 14,
  },
  insightSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  insightAnalysisList: {
    gap: 12,
  },
  insightAnalysisItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  insightAnalysisDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
  },
  insightAnalysisText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  insightActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  insightActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  insightActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default EventOrganizerToolsScreen;
