// AdminDashboardScreen.web.js - Updated with mock data to resolve 404 errors
// Changes:
// - Added comprehensive mock data to prevent 404 errors during development
// - Maintained all interactive features and modals
// - Added debug logging for API issues
// - Easy to switch back to real API by uncommenting the fetch code

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const API_URL = 'http://localhost:3000';

// Simple chart components
const BarChart = ({ data, labels, color = '#6366f1', height = 200 }) => {
  const maxValue = Math.max(...data, 1); // Avoid division by zero
  
  return (
    <View style={[styles.chartContainer, { height }]}>
      <View style={styles.chartBars}>
        {data.map((value, index) => (
          <View key={index} style={styles.barContainer}>
            <View 
              style={[
                styles.bar,
                { 
                  height: `${(value / maxValue) * 80}%`,
                  backgroundColor: color
                }
              ]} 
            />
            <Text style={styles.barLabel}>{labels[index]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const PieChart = ({ data, colors, labels, size = 200 }) => {
  const total = data.reduce((sum, value) => sum + value, 0) || 1; // Avoid division by zero
  let currentAngle = -90;
  
  const slices = data.map((value, index) => {
    const percentage = (value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    
    return {
      value,
      percentage,
      startAngle,
      endAngle,
      color: colors[index]
    };
  });

  return (
    <View style={styles.pieChartContainer}>
      <View style={[styles.pieChart, { width: size, height: size }]}>
        <svg width={size} height={size}>
          {slices.map((slice, index) => {
            const radius = size / 2 - 10;
            const centerX = size / 2;
            const centerY = size / 2;
            
            const startX = centerX + radius * Math.cos((slice.startAngle * Math.PI) / 180);
            const startY = centerY + radius * Math.sin((slice.startAngle * Math.PI) / 180);
            const endX = centerX + radius * Math.cos((slice.endAngle * Math.PI) / 180);
            const endY = centerY + radius * Math.sin((slice.endAngle * Math.PI) / 180);
            
            const largeArc = slice.percentage > 50 ? 1 : 0;
            
            const path = `M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`;
            
            return (
              <path
                key={index}
                d={path}
                fill={slice.color}
                stroke="#fff"
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </View>
      <View style={styles.pieChartLegend}>
        {slices.map((slice, index) => (
          <View key={index} style={styles.pieLegendItem}>
            <View style={[styles.pieLegendColor, { backgroundColor: slice.color }]} />
            <Text style={styles.pieLegendText}>
              {labels[index]}: {slice.percentage.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const AdminDashboardScreen = ({ navigation }) => {
  const { getAuthHeader } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');
  const [realTimeData, setRealTimeData] = useState(null);
  const [selectedKPI, setSelectedKPI] = useState(null);
  const [showKPIModal, setShowKPIModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState(null);
  const [showEventTypeModal, setShowEventTypeModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  // Mock data for development
  const getMockStats = () => {
    return {
      totalRevenue: 125000,
      totalTickets: 2500,
      scanRate: 85,
      activeEvents: 12,
      customerGrowth: 15,
      conversionRate: 8,
      avgAttendanceRate: 82,
      eventPerformance: [
        {
          id: 1,
          name: 'Tech Conference 2024',
          category: 'Technology',
          revenue: 75000,
          date: '2024-11-10',
          location: 'Convention Center',
          sold: 450,
          capacity: 500,
          scanned: 385,
          attendanceRate: 85,
          utilization: 90,
          peakAttendance: 420
        },
        {
          id: 2,
          name: 'Summer Music Festival',
          category: 'Music',
          revenue: 125000,
          date: '2024-11-12',
          location: 'Central Park',
          sold: 800,
          capacity: 1000,
          scanned: 720,
          attendanceRate: 90,
          utilization: 80,
          peakAttendance: 780
        },
        {
          id: 3,
          name: 'Food & Wine Expo',
          category: 'Food',
          revenue: 68000,
          date: '2024-11-08',
          location: 'Exhibition Hall',
          sold: 350,
          capacity: 400,
          scanned: 315,
          attendanceRate: 90,
          utilization: 87,
          peakAttendance: 340
        },
        {
          id: 4,
          name: 'Art Gallery Opening',
          category: 'Arts',
          revenue: 42000,
          date: '2024-11-05',
          location: 'Downtown Gallery',
          sold: 200,
          capacity: 250,
          scanned: 180,
          attendanceRate: 90,
          utilization: 80,
          peakAttendance: 195
        }
      ]
    };
  };

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const headers = getAuthHeader();
      
      // Debug logging
      console.log('🔧 Debug: Fetching dashboard data...');
      console.log('🔧 Debug: API URL:', `${API_URL}/api/admin/dashboard/stats?range=${timeRange}`);
      
      if (!headers.Authorization) {
        console.log('⚠️ No authorization header available - using mock data');
        // Continue with mock data even without auth for development
      }

      // UNCOMMENT THIS BLOCK WHEN YOUR BACKEND IS READY
      /*
      const response = await fetch(`${API_URL}/api/admin/dashboard/stats?range=${timeRange}`, {
        method: 'GET',
        headers: headers,
      });

      console.log('🔧 Debug: Response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          // Handle expired token
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          setError('Session expired. Please login again.');
          // Optionally navigate to login
          // navigation.navigate('Login');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch dashboard data');
      }
      
      setStats(data.stats);
      */

      // USING MOCK DATA FOR DEVELOPMENT
      console.log('🔧 Using mock data for development');
      const mockStats = getMockStats();
      setStats(mockStats);
      
      // Generate real-time data
      setRealTimeData({
        liveAttendees: Math.floor(Math.random() * 500) + 100,
        ticketsScannedLastHour: Math.floor(Math.random() * 50) + 20,
        activeEventsRightNow: Math.floor(Math.random() * 8) + 4,
        revenueThisHour: Math.floor(Math.random() * 5000) + 2000
      });
      
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      
      // Fallback to mock data on error
      console.log('🔄 Falling back to mock data due to error');
      const mockStats = getMockStats();
      setStats(mockStats);
      
      setRealTimeData({
        liveAttendees: 324,
        ticketsScannedLastHour: 42,
        activeEventsRightNow: 6,
        revenueThisHour: 3850
      });
      
      // Only show error if we can't use mock data
      // setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const showKPI = (kpi) => {
    // Mock KPI details if not available
    const kpiDetails = {
      revenue: {
        title: 'Revenue',
        details: 'Total revenue generated from ticket sales, add-ons, and merchandise.',
        current: stats?.totalRevenue || 125000,
        previous: Math.floor((stats?.totalRevenue || 125000) * 0.9),
        change: 10,
        affectedItems: ['Event Sales', 'VIP Tickets', 'Add-ons', 'Merchandise'],
        recommendations: ['Optimize pricing tiers', 'Run limited-time promotions', 'Bundle offers'],
        trends: [10000, 15000, 20000, 25000, 30000, 35000, 40000],
        insights: ['High revenue from VIP tickets', 'Weekend events perform better', 'Food events have higher add-on sales']
      },
      tickets: {
        title: 'Tickets',
        details: 'Total tickets sold across all events and categories.',
        current: stats?.totalTickets || 2500,
        previous: Math.floor((stats?.totalTickets || 2500) * 0.9),
        change: 10,
        affectedItems: ['General Admission', 'VIP Passes', 'Early Bird', 'Group Tickets'],
        recommendations: ['Increase social media marketing', 'Offer referral discounts', 'Create package deals'],
        trends: [500, 750, 1000, 1250, 1500, 1750, 2000],
        insights: ['Peak sales on weekends', 'Early bird tickets sell fastest', 'Group bookings are growing']
      },
      scanRate: {
        title: 'Scan Rate',
        details: 'Attendance rate based on scanned tickets versus tickets sold.',
        current: stats?.scanRate || 85,
        previous: (stats?.scanRate || 85) - 5,
        change: 5,
        affectedItems: ['Entry Points', 'Mobile Scanners', 'Staff Training', 'QR Code Quality'],
        recommendations: ['Improve scanning process', 'Train staff on mobile app', 'Test QR code readability'],
        trends: [70, 75, 80, 82, 84, 85, 86],
        insights: ['Higher rate for evening events', 'VIP entry has faster scanning', 'Weather affects outdoor event attendance']
      },
      events: {
        title: 'Events',
        details: 'Number of active and upcoming events in the system.',
        current: stats?.activeEvents || 12,
        previous: (stats?.activeEvents || 12) - 2,
        change: 10,
        affectedItems: ['Music Events', 'Tech Conferences', 'Food Festivals', 'Art Exhibitions'],
        recommendations: ['Schedule more weekend events', 'Diversify event categories', 'Partner with venues'],
        trends: [10, 12, 14, 16, 18, 20, 22],
        insights: ['Growth in tech conferences', 'Music festivals have highest attendance', 'Food events have best revenue per attendee']
      },
    };
    setSelectedKPI(kpiDetails[kpi]);
    setShowKPIModal(true);
  };

  const showEvent = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const showMetric = (metricKey) => {
    // Mock detailed data for metrics (replace with real data if available)
    const metricDetails = {
      liveAttendees: {
        title: 'Live Attendees',
        details: 'Number of attendees currently at events. Updated in real-time based on ticket scans and check-ins.',
        current: realTimeData?.liveAttendees || 324,
        previous: Math.floor((realTimeData?.liveAttendees || 324) * 0.88),
        change: 12,
        affectedItems: ['Tech Conference Main Hall', 'Music Festival Stage', 'Food Expo Area'],
        recommendations: ['Monitor peak attendance times', 'Adjust security staffing', 'Check entry point congestion'],
        trends: [100, 150, 200, 250, 300, 350, 400],
        insights: ['Peak attendance at 8 PM', 'High engagement in music events', 'Workshops have lower but more engaged turnout']
      },
      ticketsScannedLastHour: {
        title: 'Tickets Scanned Last Hour',
        details: 'Tickets scanned in the last 60 minutes across all events. Indicates current arrival rate.',
        current: realTimeData?.ticketsScannedLastHour || 42,
        previous: Math.floor((realTimeData?.ticketsScannedLastHour || 42) * 0.92),
        change: 8,
        affectedItems: ['Main Entrance Scanner', 'VIP Entrance', 'Backup Scanner 3'],
        recommendations: ['Optimize scanner placement', 'Add mobile scanning stations', 'Monitor queue times'],
        trends: [10, 15, 20, 25, 30, 35, 40],
        insights: ['Spike during event start times', 'Efficient scanning in VIP areas', 'General admission has occasional delays']
      },
      activeEventsRightNow: {
        title: 'Active Events Right Now',
        details: 'Number of events currently ongoing with active attendees.',
        current: realTimeData?.activeEventsRightNow || 6,
        previous: Math.floor((realTimeData?.activeEventsRightNow || 6) * 0.85),
        change: 15,
        affectedItems: ['Music Festival', 'Tech Conference', 'Art Exhibition', 'Food Expo'],
        recommendations: ['Coordinate overlapping schedules', 'Monitor resource allocation', 'Balance staff across events'],
        trends: [2, 3, 4, 5, 6, 7, 8],
        insights: ['High overlap in evening slots', 'Popular time slots are 6-9 PM', 'Room for more morning events']
      },
      revenueThisHour: {
        title: 'Revenue This Hour',
        details: 'Revenue generated in the last 60 minutes from ticket sales, merchandise, and add-ons.',
        current: realTimeData?.revenueThisHour || 3850,
        previous: Math.floor((realTimeData?.revenueThisHour || 3850) * 0.82),
        change: 18,
        affectedItems: ['Online Ticket Sales', 'Merchandise Booth', 'Food & Beverage', 'VIP Upgrades'],
        recommendations: ['Promote last-minute upsells', 'Analyze pricing effectiveness', 'Track conversion rates'],
        trends: [1000, 1500, 2000, 2500, 3000, 3500, 4000],
        insights: ['Revenue spikes during headliner performances', 'VIP areas generate 3x more revenue', 'Merchandise sales peak mid-event']
      }
    };
    setSelectedMetric(metricDetails[metricKey]);
    setShowMetricModal(true);
  };

  const showEventType = (type) => {
    // Mock detailed data for event types
    const typeDetails = {
      type: type.type,
      title: `${type.type} Performance`,
      details: `Detailed performance metrics for ${type.type} events including revenue, attendance, and customer satisfaction.`,
      events: type.events,
      revenue: type.revenue,
      attendance: type.attendance,
      affectedItems: ['Main Stage Events', 'Workshop Sessions', 'VIP Experiences', 'Sponsor Booths'],
      recommendations: ['Optimize scheduling conflicts', 'Target specific demographics', 'Improve attendee engagement'],
      trends: [50, 100, 150, 200, 250, 300, 350],
      insights: ['High demand on weekends', 'Average ticket price is optimal', 'Strong sponsor interest in this category']
    };
    setSelectedEventType(typeDetails);
    setShowEventTypeModal(true);
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error || !stats) {
    return (
      <ScreenContainer>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>
            {error || 'Failed to load dashboard data'}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchDashboardData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>🔧 Using Mock Data</Text>
          </View>
          <View style={styles.timeRangeContainer}>
            <TouchableOpacity
              style={[styles.timeRangeButton, timeRange === 'today' && styles.timeRangeButtonActive]}
              onPress={() => setTimeRange('today')}
            >
              <Text style={[styles.timeRangeText, timeRange === 'today' && styles.timeRangeTextActive]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeRangeButton, timeRange === 'week' && styles.timeRangeButtonActive]}
              onPress={() => setTimeRange('week')}
            >
              <Text style={[styles.timeRangeText, timeRange === 'week' && styles.timeRangeTextActive]}>Week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeRangeButton, timeRange === 'month' && styles.timeRangeButtonActive]}
              onPress={() => setTimeRange('month')}
            >
              <Text style={[styles.timeRangeText, timeRange === 'month' && styles.timeRangeTextActive]}>Month</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Real-time Metrics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Real-time Metrics</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <View style={styles.metricsGrid}>
            <TouchableOpacity style={styles.metricCard} onPress={() => showMetric('liveAttendees')}>
              <View style={styles.metricHeader}>
                <View style={[styles.metricIcon, { backgroundColor: '#6366f1' + '20' }]}>
                  <Ionicons name="people" size={16} color="#6366f1" />
                </View>
                <Text style={styles.metricTitle}>Live Attendees</Text>
              </View>
              <Text style={styles.metricValue}>{realTimeData?.liveAttendees || 0}</Text>
              <Text style={styles.metricDescription}>Currently at events</Text>
              <View style={styles.metricChange}>
                <Ionicons name="arrow-up" size={12} color="#10b981" />
                <Text style={[styles.metricChangeText, { color: '#10b981' }]}>+12%</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.metricCard} onPress={() => showMetric('ticketsScannedLastHour')}>
              <View style={styles.metricHeader}>
                <View style={[styles.metricIcon, { backgroundColor: '#ef4444' + '20' }]}>
                  <Ionicons name="scan" size={16} color="#ef4444" />
                </View>
                <Text style={styles.metricTitle}>Tickets Scanned</Text>
              </View>
              <Text style={styles.metricValue}>{realTimeData?.ticketsScannedLastHour || 0}</Text>
              <Text style={styles.metricDescription}>Last hour</Text>
              <View style={styles.metricChange}>
                <Ionicons name="arrow-up" size={12} color="#10b981" />
                <Text style={[styles.metricChangeText, { color: '#10b981' }]}>+8%</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.metricCard} onPress={() => showMetric('activeEventsRightNow')}>
              <View style={styles.metricHeader}>
                <View style={[styles.metricIcon, { backgroundColor: '#eab308' + '20' }]}>
                  <Ionicons name="calendar" size={16} color="#eab308" />
                </View>
                <Text style={styles.metricTitle}>Active Events</Text>
              </View>
              <Text style={styles.metricValue}>{realTimeData?.activeEventsRightNow || 0}</Text>
              <Text style={styles.metricDescription}>Right now</Text>
              <View style={styles.metricChange}>
                <Ionicons name="arrow-up" size={12} color="#10b981" />
                <Text style={[styles.metricChangeText, { color: '#10b981' }]}>+15%</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.metricCard} onPress={() => showMetric('revenueThisHour')}>
              <View style={styles.metricHeader}>
                <View style={[styles.metricIcon, { backgroundColor: '#22c55e' + '20' }]}>
                  <Ionicons name="cash" size={16} color="#22c55e" />
                </View>
                <Text style={styles.metricTitle}>Revenue</Text>
              </View>
              <Text style={styles.metricValue}>R{realTimeData?.revenueThisHour || 0}</Text>
              <Text style={styles.metricDescription}>This hour</Text>
              <View style={styles.metricChange}>
                <Ionicons name="arrow-up" size={12} color="#10b981" />
                <Text style={[styles.metricChangeText, { color: '#10b981' }]}>+18%</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Key Performance Indicators */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
          <View style={styles.kpiGrid}>
            <TouchableOpacity style={styles.kpiCard} onPress={() => showKPI('revenue')}>
              <View style={styles.kpiHeader}>
                <View style={[styles.kpiIcon, { backgroundColor: '#22c55e' + '20' }]}>
                  <Ionicons name="trending-up" size={16} color="#22c55e" />
                </View>
                <Text style={styles.kpiTitle}>Revenue</Text>
              </View>
              <Text style={styles.kpiValue}>R{stats.totalRevenue?.toLocaleString()}</Text>
              <Text style={styles.kpiDescription}>Total revenue</Text>
              <View style={styles.kpiChange}>
                <Ionicons name="arrow-up" size={12} color="#10b981" />
                <Text style={[styles.kpiChangeText, { color: '#10b981' }]}>+{stats.customerGrowth}%</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.kpiCard} onPress={() => showKPI('tickets')}>
              <View style={styles.kpiHeader}>
                <View style={[styles.kpiIcon, { backgroundColor: '#6366f1' + '20' }]}>
                  <Ionicons name="ticket" size={16} color="#6366f1" />
                </View>
                <Text style={styles.kpiTitle}>Tickets</Text>
              </View>
              <Text style={styles.kpiValue}>{stats.totalTickets?.toLocaleString()}</Text>
              <Text style={styles.kpiDescription}>Total sold</Text>
              <View style={styles.kpiChange}>
                <Ionicons name="arrow-up" size={12} color="#10b981" />
                <Text style={[styles.kpiChangeText, { color: '#10b981' }]}>+{stats.conversionRate}%</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.kpiCard} onPress={() => showKPI('scanRate')}>
              <View style={styles.kpiHeader}>
                <View style={[styles.kpiIcon, { backgroundColor: '#eab308' + '20' }]}>
                  <Ionicons name="scan-circle" size={16} color="#eab308" />
                </View>
                <Text style={styles.kpiTitle}>Scan Rate</Text>
              </View>
              <Text style={styles.kpiValue}>{stats.scanRate}%</Text>
              <Text style={styles.kpiDescription}>Attendance rate</Text>
              <View style={styles.kpiChange}>
                <Ionicons name="arrow-up" size={12} color="#10b981" />
                <Text style={[styles.kpiChangeText, { color: '#10b981' }]}>+{stats.avgAttendanceRate - 80}%</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.kpiCard} onPress={() => showKPI('events')}>
              <View style={styles.kpiHeader}>
                <View style={[styles.kpiIcon, { backgroundColor: '#ef4444' + '20' }]}>
                  <Ionicons name="calendar" size={16} color="#ef4444" />
                </View>
                <Text style={styles.kpiTitle}>Events</Text>
              </View>
              <Text style={styles.kpiValue}>{stats.activeEvents}</Text>
              <Text style={styles.kpiDescription}>Active events</Text>
              <View style={styles.kpiChange}>
                <Ionicons name="arrow-up" size={12} color="#10b981" />
                <Text style={[styles.kpiChangeText, { color: '#10b981' }]}>+{stats.customerGrowth}%</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Event Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Performance</Text>
          <View style={styles.eventPerformanceContainer}>
            <View style={styles.eventPerformanceGrid}>
              {/* Display events from mock data */}
              {stats.eventPerformance?.map((event) => (
                <TouchableOpacity 
                  key={event.id} 
                  style={styles.eventPerformanceCard}
                  onPress={() => showEvent(event)}
                >
                  <View style={styles.eventCardHeader}>
                    <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(event.category) + '20' }]}>
                      <Text style={[styles.categoryText, { color: getCategoryColor(event.category) }]}>{event.category}</Text>
                    </View>
                    <View style={styles.revenueBadge}>
                      <Text style={styles.revenueText}>R{event.revenue.toLocaleString()}</Text>
                    </View>
                  </View>
                  <Text style={styles.eventName}>{event.name}</Text>
                  <View style={styles.eventMetaRow}>
                    <View style={styles.eventMeta}>
                      <Ionicons name="calendar-outline" size={12} color="#64748b" />
                      <Text style={styles.eventMetaText}>{new Date(event.date).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.eventMeta}>
                      <Ionicons name="location-outline" size={12} color="#64748b" />
                      <Text style={styles.eventMetaText} numberOfLines={1}>{event.location}</Text>
                    </View>
                  </View>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{event.sold}/{event.capacity}</Text>
                      <Text style={styles.statLabel}>Sold</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{event.scanned}</Text>
                      <Text style={styles.statLabel}>Scanned</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{event.attendanceRate}%</Text>
                      <Text style={styles.statLabel}>Attendance</Text>
                    </View>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <Text style={styles.progressLabel}>Utilization</Text>
                    <View style={styles.progressBarBg}>
                      <View 
                        style={[
                          styles.progressBarFill, 
                          { 
                            width: `${event.utilization}%`,
                            backgroundColor: getUtilizationColor(event.utilization)
                          }
                        ]} 
                      />
                    </View>
                  </View>
                  <View style={styles.eventFooter}>
                    <View style={styles.attendanceInfo}>
                      <Ionicons name="people-outline" size={12} color="#10b981" />
                      <Text style={styles.attendanceText}>Peak: {event.peakAttendance}</Text>
                    </View>
                    <Text style={styles.moreDetails}>Tap for details →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* KPI Detail Modal */}
      <Modal
        visible={showKPIModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowKPIModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedKPI?.title}</Text>
              <TouchableOpacity onPress={() => setShowKPIModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Performance Overview</Text>
                <View style={styles.performanceRow}>
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>Current</Text>
                    <Text style={styles.performanceValue}>{selectedKPI?.current}</Text>
                  </View>
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>Previous</Text>
                    <Text style={styles.performanceValue}>{selectedKPI?.previous}</Text>
                  </View>
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>Change</Text>
                    <View style={styles.growthIndicator}>
                      <Ionicons 
                        name={selectedKPI?.change > 0 ? "arrow-up" : "arrow-down"} 
                        size={16} 
                        color={selectedKPI?.change > 0 ? "#10b981" : "#ef4444"} 
                      />
                      <Text 
                        style={[
                          styles.growthText, 
                          { color: selectedKPI?.change > 0 ? "#10b981" : "#ef4444" }
                        ]}
                      >
                        {Math.abs(selectedKPI?.change)}%
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Details</Text>
                <View style={styles.detailsContainer}>
                  <Text style={styles.detailsText}>{selectedKPI?.details}</Text>
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Affected Items</Text>
                <View style={styles.affectedItems}>
                  {selectedKPI?.affectedItems?.map((item, index) => (
                    <View key={index} style={styles.affectedItem}>
                      <Text style={styles.affectedText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionText}>View Logs</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionText}>Adjust Parameters</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionText}>Alert Team</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Trends</Text>
                <View style={styles.trendChart}>
                  <BarChart 
                    data={selectedKPI?.trends || []}
                    labels={['1h', '2h', '3h', '4h', '5h', '6h', '7h']}
                    color="#6366f1"
                    height={150}
                  />
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Insights</Text>
                <View style={styles.insightsList}>
                  {selectedKPI?.insights?.map((insight, index) => (
                    <View key={index} style={styles.insightItem}>
                      <Ionicons name="bulb-outline" size={16} color="#92400e" />
                      <Text style={styles.insightText}>{insight}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Recommendations</Text>
                <View style={styles.recommendationsList}>
                  {selectedKPI?.recommendations?.map((rec, index) => (
                    <View key={index} style={styles.recommendationItem}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#10b981" />
                      <Text style={styles.recommendationText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Event Detail Modal */}
      <Modal
        visible={showEventModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEventModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedEvent?.name}</Text>
              <TouchableOpacity onPress={() => setShowEventModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Performance Overview</Text>
                <View style={styles.performanceRow}>
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>Revenue</Text>
                    <Text style={styles.performanceValue}>R{selectedEvent?.revenue}</Text>
                  </View>
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>Sold/Capacity</Text>
                    <Text style={styles.performanceValue}>{selectedEvent?.sold}/{selectedEvent?.capacity}</Text>
                  </View>
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>Attendance Rate</Text>
                    <Text style={styles.performanceValue}>{selectedEvent?.attendanceRate}%</Text>
                  </View>
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Details</Text>
                <View style={styles.detailsContainer}>
                  <Text style={styles.detailsText}>Event at {selectedEvent?.location} on {new Date(selectedEvent?.date).toLocaleDateString()}.</Text>
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Affected Items</Text>
                <View style={styles.affectedItems}>
                  {['Tickets', 'Attendees', 'Staff'].map((item, index) => (
                    <View key={index} style={styles.affectedItem}>
                      <Text style={styles.affectedText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionText}>View Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionText}>Edit Event</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionText}>Notify Attendees</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Trends</Text>
                <View style={styles.trendChart}>
                  <BarChart 
                    data={[100, 200, 300, 400]} // Mock
                    labels={['Day 1', 'Day 2', 'Day 3', 'Day 4']}
                    color="#6366f1"
                    height={150}
                  />
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Insights</Text>
                <View style={styles.insightsList}>
                  {['High turnout', 'Good revenue'].map((insight, index) => (
                    <View key={index} style={styles.insightItem}>
                      <Ionicons name="bulb-outline" size={16} color="#92400e" />
                      <Text style={styles.insightText}>{insight}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Recommendations</Text>
                <View style={styles.recommendationsList}>
                  {['Increase capacity', 'Promote more'].map((rec, index) => (
                    <View key={index} style={styles.recommendationItem}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#10b981" />
                      <Text style={styles.recommendationText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Metric Detail Modal */}
      <Modal
        visible={showMetricModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMetricModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedMetric?.title}</Text>
              <TouchableOpacity onPress={() => setShowMetricModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Performance Overview</Text>
                <View style={styles.performanceRow}>
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>Current</Text>
                    <Text style={styles.performanceValue}>{selectedMetric?.current}</Text>
                  </View>
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>Previous</Text>
                    <Text style={styles.performanceValue}>{selectedMetric?.previous}</Text>
                  </View>
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>Change</Text>
                    <View style={styles.growthIndicator}>
                      <Ionicons 
                        name={selectedMetric?.change > 0 ? "arrow-up" : "arrow-down"} 
                        size={16} 
                        color={selectedMetric?.change > 0 ? "#10b981" : "#ef4444"} 
                      />
                      <Text 
                        style={[
                          styles.growthText, 
                          { color: selectedMetric?.change > 0 ? "#10b981" : "#ef4444" }
                        ]}
                      >
                        {Math.abs(selectedMetric?.change)}%
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Details</Text>
                <View style={styles.detailsContainer}>
                  <Text style={styles.detailsText}>{selectedMetric?.details}</Text>
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Affected Items</Text>
                <View style={styles.affectedItems}>
                  {selectedMetric?.affectedItems.map((item, index) => (
                    <View key={index} style={styles.affectedItem}>
                      <Text style={styles.affectedText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionText}>View Logs</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionText}>Adjust Parameters</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionText}>Alert Team</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Trends</Text>
                <View style={styles.trendChart}>
                  <BarChart 
                    data={selectedMetric?.trends || []}
                    labels={['1h', '2h', '3h', '4h', '5h', '6h', '7h']}
                    color="#6366f1"
                    height={150}
                  />
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Insights</Text>
                <View style={styles.insightsList}>
                  {selectedMetric?.insights.map((insight, index) => (
                    <View key={index} style={styles.insightItem}>
                      <Ionicons name="bulb-outline" size={16} color="#92400e" />
                      <Text style={styles.insightText}>{insight}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Recommendations</Text>
                <View style={styles.recommendationsList}>
                  {selectedMetric?.recommendations.map((rec, index) => (
                    <View key={index} style={styles.recommendationItem}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#10b981" />
                      <Text style={styles.recommendationText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Event Type Detail Modal */}
      <Modal
        visible={showEventTypeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEventTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedEventType?.title}</Text>
              <TouchableOpacity onPress={() => setShowEventTypeModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Performance Overview</Text>
                <View style={styles.performanceRow}>
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>Events</Text>
                    <Text style={styles.performanceValue}>{selectedEventType?.events}</Text>
                  </View>
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>Revenue</Text>
                    <Text style={styles.performanceValue}>R{selectedEventType?.revenue.toLocaleString()}</Text>
                  </View>
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>Attendance</Text>
                    <Text style={styles.performanceValue}>{selectedEventType?.attendance}%</Text>
                  </View>
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Details</Text>
                <View style={styles.detailsContainer}>
                  <Text style={styles.detailsText}>{selectedEventType?.details}</Text>
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Affected Items</Text>
                <View style={styles.affectedItems}>
                  {selectedEventType?.affectedItems.map((item, index) => (
                    <View key={index} style={styles.affectedItem}>
                      <Text style={styles.affectedText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionText}>View Events</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionText}>Analyze Trends</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionText}>Plan New Event</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Trends</Text>
                <View style={styles.trendChart}>
                  <BarChart 
                    data={selectedEventType?.trends || []}
                    labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                    color="#6366f1"
                    height={150}
                  />
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Insights</Text>
                <View style={styles.insightsList}>
                  {selectedEventType?.insights.map((insight, index) => (
                    <View key={index} style={styles.insightItem}>
                      <Ionicons name="bulb-outline" size={16} color="#92400e" />
                      <Text style={styles.insightText}>{insight}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.kpiSection}>
                <Text style={styles.sectionTitle}>Recommendations</Text>
                <View style={styles.recommendationsList}>
                  {selectedEventType?.recommendations.map((rec, index) => (
                    <View key={index} style={styles.recommendationItem}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#10b981" />
                      <Text style={styles.recommendationText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

// Helper functions (unchanged)
const getCategoryColor = (category) => {
  const colors = {
    Technology: '#6366f1',
    Music: '#ef4444',
    Food: '#eab308',
    Arts: '#22c55e',
    Sports: '#8b5cf6',
    Business: '#06b6d4',
    Education: '#06b6d4'
  };
  return colors[category] || '#64748b';
};

const getUtilizationColor = (utilization) => {
  if (utilization >= 90) return '#22c55e';
  if (utilization >= 80) return '#eab308';
  return '#ef4444';
};

const getTypeColor = (type) => {
  const colors = {
    'Music Festivals': '#ef4444',
    'Tech Conferences': '#6366f1',
    'Food & Beverage': '#eab308',
    'Arts & Culture': '#22c55e',
    'Sports Events': '#8b5cf6',
    'Business Conferences': '#06b6d4'
  };
  return colors[type] || '#64748b';
};

const getTypeIcon = (type) => {
  const icons = {
    'Music Festivals': 'musical-notes',
    'Tech Conferences': 'laptop',
    'Food & Beverage': 'restaurant',
    'Arts & Culture': 'brush',
    'Sports Events': 'trophy',
    'Business Conferences': 'business'
  };
  return icons[type] || 'star';
};

// Styles (updated for modals to mimic AdminToolsDashboard and replace shadow with boxShadow)
const styles = StyleSheet.create({
  // Modal styles updated to match web look
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    boxShadow: '0px 4px 12px rgba(0,0,0,0.25)',
    width: '100%',
    maxWidth: 1200,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalScroll: {
    flex: 1,
    padding: 24,
  },
  // ... (all previous styles remain the same)
  detailsContainer: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  detailsText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  affectedItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  affectedItem: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  affectedText: {
    fontSize: 12,
    color: '#1e40af',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  recommendationsList: {
    gap: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#475569',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 0,
    width: '100%',
    maxWidth: 1200,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  debugInfo: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  debugText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    padding: 4,
  },
  timeRangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  timeRangeButtonActive: {
    backgroundColor: '#fff',
    boxShadow: '0px 1px 2px rgba(0,0,0,0.1)',
    elevation: 1,
  },
  timeRangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  timeRangeTextActive: {
    color: '#1e293b',
  },
  section: {
    marginBottom: 32,
    width: '100%',
    maxWidth: 1200,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  metricCard: {
    width: 'calc(50% - 6px)',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
    elevation: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  metricDescription: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 8,
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricChangeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  kpiCard: {
    width: 'calc(50% - 6px)',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
    elevation: 1,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  kpiIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  kpiDescription: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 8,
  },
  kpiChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiChangeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  analyticsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chartCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
    elevation: 1,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  chartContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    gap: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  bar: {
    width: 12,
    borderRadius: 6,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 4,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    color: '#64748b',
  },
  pieChartContainer: {
    alignItems: 'center',
    gap: 16,
  },
  pieChart: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieChartLegend: {
    gap: 8,
    width: '100%',
  },
  pieLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pieLegendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  pieLegendText: {
    fontSize: 12,
    color: '#475569',
  },
  eventPerformanceContainer: {
    alignItems: 'center',
    width: '100%',
  },
  eventPerformanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    maxWidth: 1200,
    width: '100%',
  },
  eventPerformanceCard: {
    width: 'calc(50% - 8px)',
    minWidth: 300,
    maxWidth: 580,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.06)',
    elevation: 2,
    height: 280,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  revenueBadge: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  revenueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369a1',
  },
  eventName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  eventMetaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  eventMetaText: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e2e8f0',
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendanceText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  moreDetails: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickStatCard: {
    width: (width - 56) / 2,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
    elevation: 1,
  },
  quickStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  quickStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickStatTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  quickStatSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  kpiSection: {
    marginBottom: 24,
  },
  performanceRow: {
    flexDirection: 'row',
    gap: 16,
  },
  performanceMetric: {
    flex: 1,
  },
  performanceLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  growthIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  growthText: {
    fontSize: 14,
    fontWeight: '600',
  },
  breakdownGrid: {
    gap: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  trendChart: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
  },
  insightsList: {
    gap: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },

  // Event Type Cards
  eventTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  eventTypeCard: {
    width: 'calc(50% - 6px)',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
    elevation: 1,
  },
  eventTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  eventTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventTypeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  eventTypeStats: {
    flexDirection: 'row',
    gap: 12,
  },
  eventTypeStat: {
    flex: 1,
    alignItems: 'center',
  },
  eventTypeStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  eventTypeStatLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    boxShadow: '0px 4px 12px rgba(0,0,0,0.25)',
    width: '100%',
    maxWidth: 600,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalScroll: {
    padding: 24,
  },
  eventDetailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  notesText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  archiveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  archiveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default AdminDashboardScreen;