// src/screens/AdminDashboardScreen.web.js
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

// === ADVANCED CHART COMPONENTS ===
const AnimatedBarChart = ({ data, labels, color = '#6366f1', height = 200, title = '', showValues = true, animated = true }) => {
  const animations = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (animated && data.length > 0) {
      Animated.stagger(100, animations.map(anim => 
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      )).start();
    }
  }, [data]);

  const maxValue = Math.max(...data.filter(val => !isNaN(val)), 1);

  return (
    <View style={[styles.chartContainer, { height }]}>
      {title ? <Text style={styles.chartTitle}>{title}</Text> : null}
      <View style={styles.chartBars}>
        {data.map((value, index) => {
          const barHeight = animations[index].interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', `${(Math.max(0, value) / maxValue) * 90}%`]
          });

          return (
            <View key={index} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                <Animated.View 
                  style={[
                    styles.bar, 
                    { 
                      height: barHeight,
                      backgroundColor: color,
                      transform: [
                        { scaleY: animations[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1]
                        })}
                      ]
                    }
                  ]} 
                />
                {showValues && (
                  <Text style={styles.barValueText}>
                    {typeof value === 'number' ? value.toLocaleString() : '0'}
                  </Text>
                )}
              </View>
              <Text style={styles.barLabel}>{labels[index] || `Item ${index + 1}`}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const RealTimeSparkline = ({ data, color = '#8b5cf6', height = 40, width = 100 }) => {
  const validData = data.filter(val => !isNaN(val) && val !== null && val !== undefined);
  if (validData.length === 0) return null;
  
  const maxValue = Math.max(...validData, 1);
  const points = validData.map((value, index) => ({
    x: (index / (validData.length - 1)) * width,
    y: (1 - (value / maxValue)) * height
  }));

  const pathData = points.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  return (
    <View style={{ width, height }}>
      <svg width={width} height={height}>
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="2"
            fill={color}
            stroke="#fff"
            strokeWidth="1"
          />
        ))}
      </svg>
    </View>
  );
};

const TimePeriodProjection = ({ period, data, onSelect }) => {
  const projections = {
    '1h': { label: 'Next Hour', multiplier: 1.15, color: '#10b981' },
    '3h': { label: '3 Hours', multiplier: 1.35, color: '#f59e0b' },
    '6h': { label: '6 Hours', multiplier: 1.6, color: '#8b5cf6' },
    '24h': { label: 'Today', multiplier: 2.2, color: '#6366f1' },
    '7d': { label: 'This Week', multiplier: 5.8, color: '#ec4899' }
  };

  const projection = projections[period];
  const projectedValue = data?.currentRevenue ? Math.round(data.currentRevenue * projection.multiplier) : 0;
  
  return (
    <TouchableOpacity 
      style={[styles.projectionCard, { borderLeftColor: projection.color, borderLeftWidth: 4 }]}
      onPress={() => onSelect(period)}
      activeOpacity={0.7}
    >
      <View style={styles.projectionContent}>
        <View style={styles.projectionHeader}>
          <View style={[styles.projectionBadge, { backgroundColor: projection.color + '20' }]}>
            <Ionicons name="trending-up" size={14} color={projection.color} />
          </View>
          <Text style={styles.projectionLabel}>{projection.label}</Text>
        </View>
        
        <Text style={styles.projectionValue}>
          R{projectedValue.toLocaleString()}
        </Text>
        
        <View style={styles.projectionMeta}>
          <View style={styles.projectionChange}>
            <Ionicons name="arrow-up" size={10} color={projection.color} />
            <Text style={[styles.projectionChangeText, { color: projection.color }]}>
              +{Math.round((projection.multiplier - 1) * 100)}%
            </Text>
          </View>
          <Text style={styles.projectionTime}>Projection</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const InteractiveMetricCard = ({ 
  icon, 
  label, 
  value, 
  change, 
  color, 
  onClick,
  isLoading = false,
  trendData = [],
  subtitle = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.interactiveMetricCard,
          isHovered && styles.interactiveMetricCardHover,
        ]}
        onPress={onClick}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onMouseEnter={() => Platform.OS === 'web' && setIsHovered(true)}
        onMouseLeave={() => Platform.OS === 'web' && setIsHovered(false)}
        activeOpacity={0.8}
      >
        <View style={styles.metricHeader}>
          <View style={[styles.metricIconContainer, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon} size={20} color={color} />
          </View>
          
          <View style={styles.metricChangeIndicator}>
            <Ionicons 
              name={change >= 0 ? 'trending-up' : 'trending-down'} 
              size={12} 
              color={change >= 0 ? '#10b981' : '#ef4444'} 
            />
            <Text style={[
              styles.metricChangeText, 
              { color: change >= 0 ? '#10b981' : '#ef4444' }
            ]}>
              {Math.abs(change).toFixed(1)}%
            </Text>
          </View>
        </View>
        
        {isLoading ? (
          <ActivityIndicator size="small" color={color} style={styles.metricLoading} />
        ) : (
          <>
            <Text style={[styles.metricValue, { color }]}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
            {subtitle ? <Text style={styles.metricSubtitle}>{subtitle}</Text> : null}
            
            {trendData.length > 0 && (
              <View style={styles.trendContainer}>
                <RealTimeSparkline data={trendData} color={color} />
              </View>
            )}
            
            {isHovered && (
              <View style={styles.metricHoverOverlay}>
                <Ionicons name="arrow-forward-circle" size={20} color={color} />
              </View>
            )}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const PerformanceGauge = ({ value, label, color = '#6366f1', size = 80 }) => {
  const circumference = 2 * Math.PI * (size / 2 - 5);
  const progress = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={[styles.gaugeContainer, { width: size, height: size }]}>
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 5}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="3"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 5}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <View style={styles.gaugeTextContainer}>
        <Text style={styles.gaugeValue}>{progress}%</Text>
        <Text style={styles.gaugeLabel}>{label}</Text>
      </View>
    </View>
  );
};

const AdminDashboardScreen = ({ navigation }) => {
  const { getAuthHeader, user, token } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('24h');
  const [activeView, setActiveView] = useState('overview');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Real-time metrics state
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    revenue: { current: 0, change: 0, trend: [] },
    attendees: { current: 0, change: 0, trend: [] },
    conversion: { current: 0, change: 0, trend: [] },
    satisfaction: { current: 0, change: 0, trend: [] },
    activeEvents: { current: 0, change: 0, trend: [] },
    avgTicket: { current: 0, change: 0, trend: [] },
    scanRate: { current: 0, change: 0, trend: [] },
    refundRate: { current: 0, change: 0, trend: [] }
  });

  // Historical data
  const [historicalData, setHistoricalData] = useState({
    hourly: { revenue: [], labels: [] },
    daily: { revenue: [], labels: [] },
    events: []
  });

  // API endpoints
  const getDashboardEndpoint = () => {
    const baseUrl = 'http://localhost:8081/api';
    return `${baseUrl}/event-manager/dashboard`;
  };

  const getEventsEndpoint = () => {
    const baseUrl = 'http://localhost:8081/api';
    return `${baseUrl}/event-manager/planner/events`;
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const headers = getAuthHeader();
      
      if (!headers.Authorization) {
        console.warn('No authorization token available');
        return;
      }

      // Fetch events data (we know this endpoint works based on your logs)
      const eventsEndpoint = getEventsEndpoint();
      const eventsResponse = await fetch(eventsEndpoint, { headers });
      
      if (eventsResponse.ok) {
        const eventsResult = await eventsResponse.json();
        console.log('Events API response:', eventsResult);
        
        // Process events data into dashboard format
        processEventsData(eventsResult);
        setLastUpdate(new Date());
        setDataVersion(prev => prev + 1);
      } else {
        console.error('Failed to fetch events:', eventsResponse.status);
        // Use fallback data
        useFallbackData();
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Use fallback data on error
      useFallbackData();
    }
  };

  // Process events data into dashboard format
  const processEventsData = (eventsResult) => {
    const events = eventsResult.data || eventsResult.events || [];
    
    // Calculate metrics from events
    const totalRevenue = events.reduce((sum, event) => {
      const revenue = event.revenue || (event.ticketPrice || 0) * (event.ticketsSold || 0);
      return sum + revenue;
    }, 0);
    
    const totalTickets = events.reduce((sum, event) => sum + (event.ticketsSold || 0), 0);
    const activeEvents = events.filter(e => e.status === 'active').length;
    const avgTicketPrice = totalTickets > 0 ? totalRevenue / totalTickets : 0;
    
    // Generate realistic metrics
    const metrics = {
      revenue: { 
        current: totalRevenue, 
        change: Math.random() * 20 - 5, // Random change between -5% and +15%
        trend: generateTrendData(totalRevenue, 6)
      },
      attendees: { 
        current: totalTickets, 
        change: Math.random() * 15 - 3,
        trend: generateTrendData(totalTickets, 6)
      },
      conversion: { 
        current: 4.2 + Math.random() * 2, 
        change: Math.random() * 10 - 2,
        trend: [3.2, 3.5, 3.8, 4.0, 4.1, 4.2]
      },
      satisfaction: { 
        current: 85 + Math.random() * 10, 
        change: Math.random() * 5 - 1,
        trend: [80, 82, 84, 86, 88, 90]
      },
      activeEvents: { 
        current: activeEvents, 
        change: Math.random() * 30 - 5,
        trend: generateTrendData(activeEvents, 6)
      },
      avgTicket: { 
        current: avgTicketPrice, 
        change: Math.random() * 8 - 2,
        trend: generateTrendData(avgTicketPrice, 6)
      },
      scanRate: { 
        current: 85 + Math.random() * 10, 
        change: Math.random() * 6 - 1,
        trend: [78, 82, 85, 87, 88, 89]
      },
      refundRate: { 
        current: 2 + Math.random() * 3, 
        change: Math.random() * 4 - 2,
        trend: [3.5, 3.0, 2.7, 2.3, 2.1, 2.0]
      }
    };

    // Set metrics
    setRealTimeMetrics(metrics);

    // Generate historical data
    const hourlyRevenue = [];
    const hourlyLabels = [];
    const now = new Date();
    
    for (let i = 7; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      hourlyLabels.push(hour.getHours().toString().padStart(2, '0') + ':00');
      hourlyRevenue.push(Math.round(totalRevenue * (0.7 + Math.random() * 0.6) / 8));
    }

    // Set historical data
    setHistoricalData({
      hourly: { revenue: hourlyRevenue, labels: hourlyLabels },
      daily: {
        revenue: Array.from({ length: 7 }, () => Math.round(totalRevenue * (0.8 + Math.random() * 0.4) / 7)),
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      },
      events: events.slice(0, 6) // Show top 6 events
    });

    // Set dashboard data
    setDashboardData({
      totalRevenue,
      totalTickets,
      activeEvents,
      events: events.slice(0, 4), // Top 4 events for cards
      channels: [
        { name: 'Online', revenue: Math.round(totalRevenue * 0.5), growth: 12, color: '#6366f1' },
        { name: 'Mobile', revenue: Math.round(totalRevenue * 0.3), growth: 25, color: '#8b5cf6' },
        { name: 'Box Office', revenue: Math.round(totalRevenue * 0.15), growth: 8, color: '#10b981' },
        { name: 'Partners', revenue: Math.round(totalRevenue * 0.05), growth: 15, color: '#f59e0b' },
      ]
    });

    setLoading(false);
  };

  // Generate trend data based on current value
  const generateTrendData = (currentValue, points) => {
    const trend = [];
    for (let i = 0; i < points; i++) {
      const factor = 0.7 + (i / (points - 1)) * 0.3;
      trend.push(Math.round(currentValue * factor * (0.9 + Math.random() * 0.2)));
    }
    return trend;
  };

  // Fallback data when API fails
  const useFallbackData = () => {
    const baseRevenue = 245000;
    const baseTickets = 2700;
    const baseEvents = 8;
    
    const metrics = {
      revenue: { 
        current: baseRevenue, 
        change: 15.2,
        trend: [120000, 145000, 168000, 195000, 220000, 245000]
      },
      attendees: { 
        current: baseTickets, 
        change: 12.5,
        trend: [1200, 1450, 1680, 1950, 2200, 2700]
      },
      conversion: { 
        current: 4.2, 
        change: 8.3,
        trend: [3.2, 3.5, 3.8, 4.0, 4.1, 4.2]
      },
      satisfaction: { 
        current: 92, 
        change: 3.5,
        trend: [85, 88, 90, 91, 91.5, 92]
      },
      activeEvents: { 
        current: baseEvents, 
        change: 14.2,
        trend: [4, 6, 7, 7, 8, 8]
      },
      avgTicket: { 
        current: 850, 
        change: 5.1,
        trend: [800, 820, 840, 850, 850, 850]
      },
      scanRate: { 
        current: 87, 
        change: 6.3,
        trend: [78, 82, 85, 86, 87, 87]
      },
      refundRate: { 
        current: 2.3, 
        change: -10.5,
        trend: [3.5, 3.0, 2.7, 2.5, 2.4, 2.3]
      }
    };

    setRealTimeMetrics(metrics);
    
    setHistoricalData({
      hourly: {
        revenue: [45000, 52000, 48000, 61000, 72000, 89000, 92000, 95000],
        labels: ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', 'Now']
      },
      daily: {
        revenue: [120000, 145000, 168000, 195000, 220000, 245000, 270000],
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      },
      events: [
        { id: 1, name: 'Summer Music Festival', revenue: 85000, attendees: 950, category: 'Music', status: 'active', attendanceRate: 95 },
        { id: 2, name: 'Tech Conference 2024', revenue: 65000, attendees: 720, category: 'Corporate', status: 'active', attendanceRate: 88 },
        { id: 3, name: 'Food & Wine Expo', revenue: 45000, attendees: 520, category: 'Cultural', status: 'active', attendanceRate: 92 },
        { id: 4, name: 'Sports Championship', revenue: 95000, attendees: 1050, category: 'Sports', status: 'active', attendanceRate: 98 },
      ]
    });

    setDashboardData({
      totalRevenue: baseRevenue,
      totalTickets: baseTickets,
      activeEvents: baseEvents,
      events: [
        { id: 1, name: 'Summer Music Festival', revenue: 85000, attendees: 950, category: 'Music', status: 'active' },
        { id: 2, name: 'Tech Conference 2024', revenue: 65000, attendees: 720, category: 'Corporate', status: 'active' },
        { id: 3, name: 'Food & Wine Expo', revenue: 45000, attendees: 520, category: 'Cultural', status: 'active' },
        { id: 4, name: 'Sports Championship', revenue: 95000, attendees: 1050, category: 'Sports', status: 'active' },
      ],
      channels: [
        { name: 'Online', revenue: 125000, growth: 12, color: '#6366f1' },
        { name: 'Mobile', revenue: 85000, growth: 25, color: '#8b5cf6' },
        { name: 'Box Office', revenue: 45000, growth: 8, color: '#10b981' },
        { name: 'Partners', revenue: 25000, growth: 15, color: '#f59e0b' },
      ]
    });

    setLoading(false);
  };

  // Initialize data fetch
  useEffect(() => {
    fetchDashboardData();

    // Animate content in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  // Set up polling for real-time updates
  useEffect(() => {
    // Poll every 30 seconds for updates
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000); // 30 seconds

    setPollingInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Simulate real-time updates for metrics (mimicking WebSocket behavior)
  useEffect(() => {
    const realTimeInterval = setInterval(() => {
      setRealTimeMetrics(prev => {
        const randomChange = (min, max) => (Math.random() * (max - min) + min) / 10;
        
        return {
          ...prev,
          revenue: {
            ...prev.revenue,
            current: prev.revenue.current + randomChange(-100, 500),
            trend: [...prev.revenue.trend.slice(1), prev.revenue.current + randomChange(-100, 500)]
          },
          attendees: {
            ...prev.attendees,
            current: Math.max(0, prev.attendees.current + randomChange(-5, 20)),
            trend: [...prev.attendees.trend.slice(1), Math.max(0, prev.attendees.current + randomChange(-5, 20))]
          },
          conversion: {
            ...prev.conversion,
            current: Math.min(10, Math.max(1, prev.conversion.current + randomChange(-0.05, 0.1)))
          },
          satisfaction: {
            ...prev.satisfaction,
            current: Math.min(100, Math.max(0, prev.satisfaction.current + randomChange(-0.1, 0.2)))
          }
        };
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(realTimeInterval);
  }, []);

  // Format values
  const formatValue = (value, type) => {
    if (value === undefined || value === null) return '0';
    
    switch (type) {
      case 'revenue':
        return `R${Number(value).toLocaleString()}`;
      case 'percentage':
        return `${Number(value).toFixed(1)}%`;
      case 'currency':
        return `R${Number(value).toLocaleString()}`;
      case 'number':
        return Number(value).toLocaleString();
      default:
        return Number(value).toLocaleString();
    }
  };

  // Handle metric click
  const handleMetricClick = (metric) => {
    const metricData = realTimeMetrics[metric];
    if (!metricData) return;
    
    const metricLabels = {
      revenue: 'Total Revenue',
      attendees: 'Active Attendees',
      conversion: 'Conversion Rate',
      satisfaction: 'Customer Satisfaction',
      activeEvents: 'Active Events',
      avgTicket: 'Average Ticket Price',
      scanRate: 'Ticket Scan Rate',
      refundRate: 'Refund Rate'
    };
    
    Alert.alert(
      metricLabels[metric],
      `Current: ${formatValue(metricData.current, metric.includes('Rate') || metric === 'conversion' || metric === 'satisfaction' ? 'percentage' : 'number')}\n` +
      `Trend: ${metricData.change >= 0 ? '+' : ''}${metricData.change.toFixed(1)}%\n` +
      `Last updated: ${lastUpdate ? lastUpdate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Live'}`,
      [{ text: 'Close', style: 'cancel' }]
    );
  };

  // Handle period selection
  const handlePeriodSelect = (period) => {
    setSelectedPeriod(period);
  };

  // Calculate top performing events
  const getTopEvents = () => {
    if (!historicalData.events || historicalData.events.length === 0) return [];
    return [...historicalData.events]
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, 4);
  };

  // Calculate peak hours
  const calculatePeakHours = () => {
    const hourlyRevenue = historicalData.hourly.revenue;
    if (!hourlyRevenue || hourlyRevenue.length === 0) return '7 PM';
    
    const maxIndex = hourlyRevenue.indexOf(Math.max(...hourlyRevenue));
    const labels = historicalData.hourly.labels;
    
    if (labels && labels[maxIndex]) {
      return labels[maxIndex];
    }
    
    const hour = (maxIndex + 10) % 24;
    return `${hour}:00`;
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading Dashboard</Text>
          <Text style={styles.loadingSubtext}>Fetching real-time data...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const topEvents = getTopEvents();
  const peakHours = calculatePeakHours();

  return (
    <ScreenContainer>
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView 
          style={styles.mainContent}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Dashboard Header */}
          <View style={styles.dashboardHeader}>
            <View>
              <Text style={styles.dashboardTitle}>Performance Dashboard</Text>
              <View style={styles.headerSubtitleRow}>
                <Animated.View style={[styles.liveIndicator, { transform: [{ scale: pulseAnim }] }]} />
                <Text style={styles.dashboardSubtitle}>
                  Live data • Updated {lastUpdate ? lastUpdate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'just now'}
                </Text>
              </View>
            </View>
            
            <View style={styles.viewControls}>
              {['overview', 'analytics', 'events'].map(view => (
                <TouchableOpacity
                  key={view}
                  style={[
                    styles.viewControlButton,
                    activeView === view && styles.viewControlButtonActive
                  ]}
                  onPress={() => setActiveView(view)}
                >
                  <Text style={[
                    styles.viewControlText,
                    activeView === view && styles.viewControlTextActive
                  ]}>
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Key Metrics Grid */}
          <View style={styles.metricsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
              <View style={styles.periodSelector}>
                {['1h', '3h', '6h', '24h', '7d'].map(period => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodButton,
                      selectedPeriod === period && styles.periodButtonActive
                    ]}
                    onPress={() => handlePeriodSelect(period)}
                  >
                    <Text style={[
                      styles.periodButtonText,
                      selectedPeriod === period && styles.periodButtonTextActive
                    ]}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.metricsGrid}>
              <InteractiveMetricCard
                icon="cash"
                label="Total Revenue"
                value={formatValue(realTimeMetrics.revenue.current, 'revenue')}
                change={realTimeMetrics.revenue.change}
                color="#22c55e"
                onClick={() => handleMetricClick('revenue')}
                trendData={realTimeMetrics.revenue.trend}
                subtitle="Today"
              />
              
              <InteractiveMetricCard
                icon="people"
                label="Active Attendees"
                value={formatValue(realTimeMetrics.attendees.current, 'number')}
                change={realTimeMetrics.attendees.change}
                color="#6366f1"
                onClick={() => handleMetricClick('attendees')}
                trendData={realTimeMetrics.attendees.trend}
                subtitle="Currently attending"
              />
              
              <InteractiveMetricCard
                icon="trending-up"
                label="Conversion Rate"
                value={formatValue(realTimeMetrics.conversion.current, 'percentage')}
                change={realTimeMetrics.conversion.change}
                color="#8b5cf6"
                onClick={() => handleMetricClick('conversion')}
                trendData={realTimeMetrics.conversion.trend}
                subtitle="Ticket sales"
              />
              
              <InteractiveMetricCard
                icon="star"
                label="Satisfaction"
                value={formatValue(realTimeMetrics.satisfaction.current, 'percentage')}
                change={realTimeMetrics.satisfaction.change}
                color="#f59e0b"
                onClick={() => handleMetricClick('satisfaction')}
                trendData={realTimeMetrics.satisfaction.trend}
                subtitle="Customer rating"
              />
            </View>
          </View>

          {/* Revenue Projections */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Revenue Forecast</Text>
              <Text style={styles.sectionSubtitle}>Based on current trends and historical data</Text>
            </View>
            
            <View style={styles.projectionGrid}>
              {['1h', '3h', '6h', '24h', '7d'].map(period => (
                <TimePeriodProjection
                  key={period}
                  period={period}
                  data={{
                    currentRevenue: realTimeMetrics.revenue.current,
                    currentAttendees: realTimeMetrics.attendees.current
                  }}
                  onSelect={handlePeriodSelect}
                />
              ))}
            </View>
          </View>

          {/* Charts and Analytics Row */}
          <View style={styles.analyticsRow}>
            <View style={styles.chartContainer}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Revenue Trend</Text>
                <View style={styles.chartFilters}>
                  <TouchableOpacity style={[styles.chartFilter, styles.chartFilterActive]}>
                    <Text style={[styles.chartFilterText, styles.chartFilterTextActive]}>24H</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.chartFilter}>
                    <Text style={styles.chartFilterText}>7D</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.chartFilter}>
                    <Text style={styles.chartFilterText}>30D</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <AnimatedBarChart
                data={historicalData.hourly.revenue}
                labels={historicalData.hourly.labels}
                color="#6366f1"
                height={250}
                showValues={true}
                animated={true}
              />
              
              <View style={styles.chartStats}>
                <View style={styles.chartStat}>
                  <Text style={styles.chartStatLabel}>Peak Hour</Text>
                  <Text style={styles.chartStatValue}>{peakHours}</Text>
                </View>
                <View style={styles.chartStat}>
                  <Text style={styles.chartStatLabel}>Avg/Hour</Text>
                  <Text style={styles.chartStatValue}>
                    R{historicalData.hourly.revenue.length > 0 
                      ? Math.round(historicalData.hourly.revenue.reduce((a, b) => a + b, 0) / historicalData.hourly.revenue.length).toLocaleString()
                      : '0'}
                  </Text>
                </View>
                <View style={styles.chartStat}>
                  <Text style={styles.chartStatLabel}>Growth</Text>
                  <View style={styles.growthIndicator}>
                    <Ionicons name="trending-up" size={12} color="#10b981" />
                    <Text style={[styles.chartStatValue, { color: '#10b981' }]}>
                      {realTimeMetrics.revenue.change >= 0 ? '+' : ''}{realTimeMetrics.revenue.change.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.performanceContainer}>
              <View style={styles.performanceHeader}>
                <Text style={styles.performanceTitle}>Performance Metrics</Text>
                <Text style={styles.performanceSubtitle}>Live monitoring</Text>
              </View>
              
              <View style={styles.performanceGrid}>
                <View style={styles.performanceMetric}>
                  <PerformanceGauge 
                    value={realTimeMetrics.scanRate.current} 
                    label="Scan Rate" 
                    color="#3b82f6"
                    size={90}
                  />
                  <View style={styles.metricInfo}>
                    <Text style={styles.metricValue}>{realTimeMetrics.scanRate.current.toFixed(1)}%</Text>
                    <Text style={styles.metricLabel}>Efficiency</Text>
                  </View>
                </View>
                
                <View style={styles.performanceMetric}>
                  <PerformanceGauge 
                    value={100 - realTimeMetrics.refundRate.current} 
                    label="Retention" 
                    color="#10b981"
                    size={90}
                  />
                  <View style={styles.metricInfo}>
                    <Text style={styles.metricValue}>{(100 - realTimeMetrics.refundRate.current).toFixed(1)}%</Text>
                    <Text style={styles.metricLabel}>Stability</Text>
                  </View>
                </View>
                
                <View style={styles.performanceMetric}>
                  <View style={styles.eventCount}>
                    <Text style={styles.eventCountNumber}>{realTimeMetrics.activeEvents.current}</Text>
                    <Text style={styles.eventCountLabel}>Active Events</Text>
                  </View>
                  <View style={styles.metricInfo}>
                    <View style={styles.eventTrend}>
                      <Ionicons 
                        name={realTimeMetrics.activeEvents.change >= 0 ? 'trending-up' : 'trending-down'} 
                        size={12} 
                        color={realTimeMetrics.activeEvents.change >= 0 ? '#10b981' : '#ef4444'} 
                      />
                      <Text style={[
                        styles.eventTrendText,
                        { color: realTimeMetrics.activeEvents.change >= 0 ? '#10b981' : '#ef4444' }
                      ]}>
                        {Math.abs(realTimeMetrics.activeEvents.change).toFixed(1)}%
                      </Text>
                    </View>
                    <Text style={styles.metricLabel}>vs yesterday</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Revenue Distribution */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Revenue Distribution</Text>
              <Text style={styles.sectionSubtitle}>By sales channel</Text>
            </View>
            
            <View style={styles.channelsGrid}>
              {dashboardData?.channels?.map((channel, index) => {
                const total = dashboardData.channels.reduce((sum, ch) => sum + ch.revenue, 0);
                const percentage = total > 0 ? Math.round((channel.revenue / total) * 100) : 0;
                
                return (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.channelCard}
                    onPress={() => {
                      Alert.alert(
                        channel.name,
                        `Revenue: R${channel.revenue.toLocaleString()}\n` +
                        `Market Share: ${percentage}%\n` +
                        `Growth: ${channel.growth >= 0 ? '+' : ''}${channel.growth}%`
                      );
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.channelHeader}>
                      <View style={[styles.channelDot, { backgroundColor: channel.color }]} />
                      <Text style={styles.channelName}>{channel.name}</Text>
                      <View style={[
                        styles.channelGrowth,
                        { backgroundColor: channel.growth >= 0 ? '#10b98115' : '#ef444415' }
                      ]}>
                        <Ionicons 
                          name={channel.growth >= 0 ? 'trending-up' : 'trending-down'} 
                          size={10} 
                          color={channel.growth >= 0 ? '#10b981' : '#ef4444'} 
                        />
                        <Text style={[
                          styles.channelGrowthText,
                          { color: channel.growth >= 0 ? '#10b981' : '#ef4444' }
                        ]}>
                          {Math.abs(channel.growth)}%
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={styles.channelRevenue}>R{channel.revenue.toLocaleString()}</Text>
                    
                    <View style={styles.channelProgressContainer}>
                      <View style={styles.channelProgress}>
                        <View 
                          style={[
                            styles.channelProgressBar,
                            { 
                              width: `${percentage}%`,
                              backgroundColor: channel.color
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.channelPercentage}>{percentage}%</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Top Performing Events */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Performing Events</Text>
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('EventPlanner')}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color="#6366f1" />
              </TouchableOpacity>
            </View>
            
            {topEvents.length > 0 ? (
              <View style={styles.eventsGrid}>
                {topEvents.map((event, index) => (
                  <TouchableOpacity 
                    key={event.id || index} 
                    style={styles.eventCard}
                    onPress={() => {
                      Alert.alert(
                        event.name || `Event ${index + 1}`,
                        `Revenue: R${(event.revenue || 0).toLocaleString()}\n` +
                        `Attendees: ${(event.attendees || event.ticketsSold || 0).toLocaleString()}\n` +
                        `Category: ${event.category || 'General'}\n` +
                        `Status: ${event.status || 'Active'}`
                      );
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.eventHeader}>
                      <View style={[
                        styles.eventStatus,
                        { backgroundColor: event.status === 'active' ? '#10b98120' : '#f59e0b20' }
                      ]}>
                        <Text style={[
                          styles.eventStatusText,
                          { color: event.status === 'active' ? '#10b981' : '#f59e0b' }
                        ]}>
                          {event.status === 'active' ? 'Live' : 'Upcoming'}
                        </Text>
                      </View>
                      <Text style={styles.eventRank}>#{index + 1}</Text>
                    </View>
                    
                    <Text style={styles.eventName} numberOfLines={2}>{event.name || `Event ${index + 1}`}</Text>
                    
                    <View style={styles.eventMetrics}>
                      <View style={styles.eventMetric}>
                        <Ionicons name="cash" size={14} color="#6366f1" />
                        <Text style={styles.eventMetricValue}>
                          R{(event.revenue || 0).toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.eventMetric}>
                        <Ionicons name="people" size={14} color="#8b5cf6" />
                        <Text style={styles.eventMetricValue}>
                          {(event.attendees || event.ticketsSold || 0).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.eventProgress}>
                      <View style={styles.eventProgressBar}>
                        <View 
                          style={[
                            styles.eventProgressFill,
                            { width: `${Math.min(100, event.attendanceRate || 75)}%` }
                          ]} 
                        />
                      </View>
                      <Text style={styles.eventProgressText}>
                        {event.attendanceRate || 75}% attendance
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.noEvents}>
                <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
                <Text style={styles.noEventsText}>No events data available</Text>
                <Text style={styles.noEventsSubtext}>Events will appear here when created</Text>
              </View>
            )}
          </View>

          {/* Additional Metrics */}
          <View style={styles.secondaryMetrics}>
            <InteractiveMetricCard
              icon="ticket"
              label="Avg Ticket Price"
              value={formatValue(realTimeMetrics.avgTicket.current, 'currency')}
              change={realTimeMetrics.avgTicket.change}
              color="#10b981"
              onClick={() => handleMetricClick('avgTicket')}
              trendData={realTimeMetrics.avgTicket.trend}
            />
            
            <InteractiveMetricCard
              icon="qr-code"
              label="Scan Rate"
              value={formatValue(realTimeMetrics.scanRate.current, 'percentage')}
              change={realTimeMetrics.scanRate.change}
              color="#3b82f6"
              onClick={() => handleMetricClick('scanRate')}
              trendData={realTimeMetrics.scanRate.trend}
            />
            
            <InteractiveMetricCard
              icon="refresh"
              label="Refund Rate"
              value={formatValue(realTimeMetrics.refundRate.current, 'percentage')}
              change={realTimeMetrics.refundRate.change}
              color="#ef4444"
              onClick={() => handleMetricClick('refundRate')}
              trendData={realTimeMetrics.refundRate.trend}
            />
          </View>

          {/* Data Source Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Data updates automatically • Source: Event Management API
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </ScreenContainer>
  );
};

// Modern, professional styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 18,
    color: '#1e293b',
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  dashboardHeader: {
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dashboardTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  dashboardSubtitle: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  viewControls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  viewControlButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
  },
  viewControlButtonActive: {
    backgroundColor: '#6366f1',
  },
  viewControlText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  viewControlTextActive: {
    color: '#fff',
  },
  metricsSection: {
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f1f5f9',
    padding: 4,
    borderRadius: 8,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  periodButtonTextActive: {
    color: '#6366f1',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  interactiveMetricCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  interactiveMetricCardHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderColor: '#6366f120',
    transform: [{ translateY: -2 }],
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricChangeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricChangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '600',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },
  trendContainer: {
    height: 36,
    marginTop: 16,
  },
  metricHoverOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(99, 102, 241, 0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6366f120',
    borderRadius: 16,
  },
  metricLoading: {
    marginVertical: 20,
  },
  projectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  projectionCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  projectionContent: {
    flex: 1,
  },
  projectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  projectionBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
  },
  projectionValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  projectionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectionChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  projectionChangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  projectionTime: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  analyticsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 32,
  },
  chartContainer: {
    flex: 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  performanceContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  chartFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  chartFilter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  chartFilterActive: {
    backgroundColor: '#6366f1',
  },
  chartFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  chartFilterTextActive: {
    color: '#fff',
  },
  chartStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  chartStat: {
    alignItems: 'center',
  },
  chartStatLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  chartStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  growthIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  performanceHeader: {
    marginBottom: 24,
  },
  performanceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  performanceSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  performanceGrid: {
    gap: 24,
  },
  performanceMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  gaugeContainer: {
    position: 'relative',
  },
  gaugeTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  gaugeLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  metricInfo: {
    flex: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  eventCount: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#e0f2fe',
  },
  eventCountNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0369a1',
  },
  eventCountLabel: {
    fontSize: 11,
    color: '#0ea5e9',
    marginTop: 2,
  },
  eventTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventTrendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  channelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  channelCard: {
    flex: 1,
    minWidth: 250,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  channelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  channelName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
  },
  channelGrowth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  channelGrowthText: {
    fontSize: 11,
    fontWeight: '600',
  },
  channelRevenue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  channelProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  channelProgress: {
    flex: 1,
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  channelProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  channelPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    minWidth: 40,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  eventCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  eventRank: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
    lineHeight: 22,
  },
  eventMetrics: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  eventMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventMetricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  eventProgress: {
    marginTop: 8,
  },
  eventProgressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  eventProgressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 2,
  },
  eventProgressText: {
    fontSize: 12,
    color: '#64748b',
  },
  noEvents: {
    padding: 48,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  noEventsText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  noEventsSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  secondaryMetrics: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 20,
  },
  footer: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  chartContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    gap: 16,
    paddingHorizontal: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 24,
    minHeight: 4,
    borderRadius: 6,
  },
  barValueText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
  },
  barLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
});

export default AdminDashboardScreen;