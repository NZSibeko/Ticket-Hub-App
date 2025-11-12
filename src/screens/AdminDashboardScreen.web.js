import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
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
  const maxValue = Math.max(...data);
  
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
  const total = data.reduce((sum, value) => sum + value, 0);
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
  const [selectedManagerCard, setSelectedManagerCard] = useState(null);
  const [showManagerModal, setShowManagerModal] = useState(false);

  // Refs for horizontal scrolling
  const managersScrollViewRef = useRef(null);
  const [managersScrollPosition, setManagersScrollPosition] = useState(0);
  const [canScrollManagersLeft, setCanScrollManagersLeft] = useState(false);
  const [canScrollManagersRight, setCanScrollManagersRight] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      const headers = getAuthHeader();
      
      if (!headers.Authorization) {
        console.log('No authorization header available');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/dashboard/stats?range=${timeRange}`, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
      
      setRealTimeData({
        liveAttendees: Math.floor(Math.random() * 500) + 100,
        ticketsScannedLastHour: Math.floor(Math.random() * 50) + 20,
        activeEventsRightNow: Math.floor(Math.random() * 8) + 4,
        revenueThisHour: Math.floor(Math.random() * 5000) + 2000
      });
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // CORRECTED mock data with proper structure that matches component expectations
      const mockStats = {
        // Original dashboard data
        totalEvents: 45,
        totalTickets: 1250,
        totalRevenue: 187500,
        totalCustomers: 890,
        activeEvents: 12,
        pendingEvents: 3,
        ticketsSoldToday: 84,
        ticketsScanned: 920,
        scanRate: 73.6,
        averageTicketPrice: 150,
        conversionRate: 12.5,
        customerSatisfaction: 4.7,
        refundRate: 2.3,
        completedEvents: 30,
        cancelledEvents: 2,
        vipTicketsSold: 180,
        revenueThisMonth: 87500,
        avgAttendanceRate: 85.2,
        customerGrowth: 15.8,
        ticketSales: [120, 190, 300, 500, 200, 300, 450, 320, 280, 410, 380, 520],
        revenueData: [15000, 30000, 45000, 60000, 75000, 90000, 112500, 98000, 85000, 110000, 105000, 125000],
        
        // Event Performance data (this was already working)
        eventPerformance: [
          { 
            id: 1,
            name: 'Tech Conference 2024', 
            sold: 450, 
            capacity: 500, 
            revenue: 67500,
            scanned: 420,
            date: '2024-12-15',
            location: 'Convention Center',
            category: 'Technology',
            ticketTypes: [
              { name: 'VIP', price: 300, sold: 50 },
              { name: 'Standard', price: 150, sold: 400 }
            ],
            attendanceRate: 93.3,
            revenuePerAttendee: 160.7,
            peakAttendance: 380,
            utilization: 90
          },
          { 
            id: 2,
            name: 'Summer Music Festival', 
            sold: 850, 
            capacity: 1000, 
            revenue: 127500,
            scanned: 800,
            date: '2024-12-20',
            location: 'City Park',
            category: 'Music',
            ticketTypes: [
              { name: 'VIP', price: 250, sold: 100 },
              { name: 'Standard', price: 150, sold: 750 }
            ],
            attendanceRate: 94.1,
            revenuePerAttendee: 159.4,
            peakAttendance: 720,
            utilization: 85
          },
          { 
            id: 3,
            name: 'Food & Wine Expo', 
            sold: 320, 
            capacity: 400, 
            revenue: 48000,
            scanned: 290,
            date: '2024-11-28',
            location: 'Exhibition Hall',
            category: 'Food',
            ticketTypes: [
              { name: 'Premium', price: 200, sold: 80 },
              { name: 'Standard', price: 120, sold: 240 }
            ],
            attendanceRate: 90.6,
            revenuePerAttendee: 165.5,
            peakAttendance: 250,
            utilization: 80
          },
          { 
            id: 4,
            name: 'Art Gallery Opening', 
            sold: 180, 
            capacity: 200, 
            revenue: 27000,
            scanned: 165,
            date: '2024-11-15',
            location: 'Theater',
            category: 'Arts',
            ticketTypes: [
              { name: 'VIP', price: 200, sold: 30 },
              { name: 'Standard', price: 150, sold: 150 }
            ],
            attendanceRate: 91.7,
            revenuePerAttendee: 163.6,
            peakAttendance: 140,
            utilization: 90
          }
        ],
        
        // NEW: Manager Analytics Data - Properly structured
        managerAnalytics: {
          topPerformingManagers: [
            {
              id: 1,
              name: 'Sarah Johnson',
              eventsManaged: 8,
              totalRevenue: 85000,
              attendanceRate: 92.5,
              customerRating: 4.8,
              ticketsSold: 650,
              efficiency: 95,
              upcomingEvents: 3,
              completedEvents: 5,
              revenueGrowth: 15.2,
              favoriteVenue: 'Convention Center',
              specialization: 'Tech Conferences'
            },
            {
              id: 2,
              name: 'Mike Chen',
              eventsManaged: 6,
              totalRevenue: 72000,
              attendanceRate: 88.3,
              customerRating: 4.6,
              ticketsSold: 580,
              efficiency: 89,
              upcomingEvents: 2,
              completedEvents: 4,
              revenueGrowth: 12.8,
              favoriteVenue: 'City Park',
              specialization: 'Music Festivals'
            },
            {
              id: 3,
              name: 'Emily Davis',
              eventsManaged: 7,
              totalRevenue: 68000,
              attendanceRate: 91.2,
              customerRating: 4.9,
              ticketsSold: 520,
              efficiency: 93,
              upcomingEvents: 4,
              completedEvents: 3,
              revenueGrowth: 18.5,
              favoriteVenue: 'Exhibition Hall',
              specialization: 'Food & Beverage'
            },
            {
              id: 4,
              name: 'David Wilson',
              eventsManaged: 5,
              totalRevenue: 55000,
              attendanceRate: 89.7,
              customerRating: 4.7,
              ticketsSold: 420,
              efficiency: 87,
              upcomingEvents: 2,
              completedEvents: 3,
              revenueGrowth: 10.3,
              favoriteVenue: 'Stadium',
              specialization: 'Sports Events'
            },
            {
              id: 5,
              name: 'Lisa Rodriguez',
              eventsManaged: 9,
              totalRevenue: 78000,
              attendanceRate: 94.2,
              customerRating: 4.8,
              ticketsSold: 610,
              efficiency: 91,
              upcomingEvents: 4,
              completedEvents: 5,
              revenueGrowth: 16.7,
              favoriteVenue: 'Convention Center',
              specialization: 'Business Conferences'
            }
          ],
          
          marketingPerformance: [
            {
              channel: 'Social Media',
              budget: 5000,
              revenue: 45000,
              roi: 800,
              clicks: 12500,
              conversions: 1062,
              conversionRate: 8.5
            },
            {
              channel: 'Email Marketing',
              budget: 2000,
              revenue: 28000,
              roi: 1300,
              clicks: 3200,
              conversions: 390,
              conversionRate: 12.2
            },
            {
              channel: 'Paid Ads',
              budget: 8000,
              revenue: 65000,
              roi: 713,
              clicks: 18500,
              conversions: 1258,
              conversionRate: 6.8
            },
            {
              channel: 'Partnerships',
              budget: 3000,
              revenue: 22000,
              roi: 633,
              clicks: 2800,
              conversions: 255,
              conversionRate: 9.1
            }
          ],
          
          venueUtilization: [
            {
              name: 'Convention Center',
              capacity: 5000,
              utilized: 4200,
              utilizationRate: 84,
              eventsHosted: 15,
              revenue: 125000
            },
            {
              name: 'City Park',
              capacity: 10000,
              utilized: 8500,
              utilizationRate: 85,
              eventsHosted: 8,
              revenue: 98000
            },
            {
              name: 'Exhibition Hall',
              capacity: 2000,
              utilized: 1800,
              utilizationRate: 90,
              eventsHosted: 12,
              revenue: 75000
            },
            {
              name: 'Stadium',
              capacity: 15000,
              utilized: 12000,
              utilizationRate: 80,
              eventsHosted: 5,
              revenue: 145000
            }
          ],
          
          eventTypePerformance: [
            {
              type: 'Music Festivals',
              events: 12,
              revenue: 145000,
              attendance: 85.5,
              avgTicketPrice: 120,
              satisfaction: 4.6
            },
            {
              type: 'Tech Conferences',
              events: 8,
              revenue: 98000,
              attendance: 88.2,
              avgTicketPrice: 180,
              satisfaction: 4.8
            },
            {
              type: 'Food & Beverage',
              events: 10,
              revenue: 75000,
              attendance: 82.1,
              avgTicketPrice: 90,
              satisfaction: 4.9
            },
            {
              type: 'Arts & Culture',
              events: 6,
              revenue: 45000,
              attendance: 78.9,
              avgTicketPrice: 60,
              satisfaction: 4.7
            }
          ]
        },
        
        kpiDetails: {
          revenue: {
            title: 'Revenue Analytics',
            current: 187500,
            previous: 163000,
            change: 15.0,
            breakdown: {
              vip: 67500,
              standard: 120000
            },
            trends: [15000, 30000, 45000, 60000, 75000, 90000, 112500],
            insights: [
              'VIP tickets contribute 36% of total revenue',
              'Weekend events generate 45% more revenue',
              'Average revenue per event: R15,625'
            ]
          },
          tickets: {
            title: 'Ticket Sales Analytics',
            current: 1250,
            previous: 1150,
            change: 8.7,
            breakdown: {
              vip: 180,
              standard: 1070
            },
            trends: [120, 190, 300, 500, 200, 300, 450],
            insights: [
              'Standard tickets account for 85.6% of sales',
              'Conversion rate: 12.5% from page views to purchases',
              'Peak sales time: 7-9 PM daily'
            ]
          },
          scanRate: {
            title: 'Attendance Analytics',
            current: 73.6,
            previous: 68.2,
            change: 7.9,
            breakdown: {
              earlyArrivals: 45,
              onTime: 35,
              lateArrivals: 20
            },
            trends: [65, 68, 70, 72, 71, 73, 74],
            insights: [
              '93% of VIP ticket holders attend events',
              'Events with parking have 15% higher attendance',
              'Rainy days see 25% lower attendance rates'
            ]
          },
          events: {
            title: 'Event Performance Analytics',
            current: 12,
            previous: 8,
            change: 50.0,
            breakdown: {
              music: 4,
              tech: 3,
              arts: 2,
              food: 3
            },
            trends: [8, 9, 10, 11, 10, 12, 12],
            insights: [
              'Music events have highest average attendance (85%)',
              'Tech events generate highest revenue per attendee',
              'Weekend events sell out 3x faster'
            ]
          }
        }
      };
      
      setStats(mockStats);
      setRealTimeData({
        liveAttendees: 327,
        ticketsScannedLastHour: 42,
        activeEventsRightNow: 7,
        revenueThisHour: 3250
      });
    } finally {
      setLoading(false);
    }
  };

  // Navigation functions for managers section
  const scrollManagersLeft = () => {
    if (managersScrollViewRef.current) {
      managersScrollViewRef.current.scrollTo({
        x: managersScrollPosition - 300,
        animated: true
      });
    }
  };

  const scrollManagersRight = () => {
    if (managersScrollViewRef.current) {
      managersScrollViewRef.current.scrollTo({
        x: managersScrollPosition + 300,
        animated: true
      });
    }
  };

  const handleManagersScroll = (event) => {
    const position = event.nativeEvent.contentOffset.x;
    const contentWidth = event.nativeEvent.contentSize.width;
    const layoutWidth = event.nativeEvent.layoutMeasurement.width;
    
    setManagersScrollPosition(position);
    setCanScrollManagersLeft(position > 0);
    setCanScrollManagersRight(position < contentWidth - layoutWidth - 10);
  };

  const KPICard = ({ title, value, change, color, icon, description, onPress }) => (
    <TouchableOpacity 
      style={styles.kpiCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.kpiHeader}>
        <View style={[styles.kpiIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={styles.kpiTitle}>{title}</Text>
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      {description && <Text style={styles.kpiDescription}>{description}</Text>}
      {change && (
        <View style={styles.kpiChange}>
          <Ionicons 
            name={change > 0 ? "trending-up" : "trending-down"} 
            size={12} 
            color={change > 0 ? "#10b981" : "#ef4444"} 
          />
          <Text style={[styles.kpiChangeText, { color: change > 0 ? "#10b981" : "#ef4444" }]}>
            {change > 0 ? '+' : ''}{change}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const MetricCard = ({ title, value, change, color, icon, description }) => (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      {description && <Text style={styles.metricDescription}>{description}</Text>}
      {change && (
        <View style={styles.metricChange}>
          <Ionicons 
            name={change > 0 ? "trending-up" : "trending-down"} 
            size={12} 
            color={change > 0 ? "#10b981" : "#ef4444"} 
          />
          <Text style={[styles.metricChangeText, { color: change > 0 ? "#10b981" : "#ef4444" }]}>
            {change > 0 ? '+' : ''}{change}%
          </Text>
        </View>
      )}
    </View>
  );

  const QuickStatCard = ({ title, value, subtitle, color, icon }) => (
    <View style={styles.quickStatCard}>
      <View style={styles.quickStatHeader}>
        <View style={[styles.quickStatIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.quickStatTitle}>{title}</Text>
      </View>
      <Text style={styles.quickStatValue}>{value}</Text>
      {subtitle && <Text style={styles.quickStatSubtitle}>{subtitle}</Text>}
    </View>
  );

  // Manager Analytics Cards - Using the nested managerAnalytics structure
  const ManagerPerformanceCard = ({ manager, onPress }) => (
    <TouchableOpacity 
      style={styles.managerCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.managerHeader}>
        <View style={styles.managerAvatar}>
          <Text style={styles.managerAvatarText}>
            {manager.name.split(' ').map(n => n[0]).join('')}
          </Text>
        </View>
        <View style={styles.managerInfo}>
          <Text style={styles.managerName}>{manager.name}</Text>
          <Text style={styles.managerRole}>Event Manager</Text>
        </View>
        <View style={styles.managerRating}>
          <Ionicons name="star" size={16} color="#f59e0b" />
          <Text style={styles.ratingText}>{manager.customerRating}</Text>
        </View>
      </View>

      <View style={styles.managerStats}>
        <View style={styles.managerStat}>
          <Text style={styles.managerStatValue}>R{(manager.totalRevenue / 1000).toFixed(0)}k</Text>
          <Text style={styles.managerStatLabel}>Revenue</Text>
        </View>
        <View style={styles.managerStat}>
          <Text style={styles.managerStatValue}>{manager.efficiency}%</Text>
          <Text style={styles.managerStatLabel}>Efficiency</Text>
        </View>
        <View style={styles.managerStat}>
          <Text style={styles.managerStatValue}>{manager.eventsManaged}</Text>
          <Text style={styles.managerStatLabel}>Events</Text>
        </View>
      </View>

      <View style={styles.performanceBar}>
        <View 
          style={[
            styles.performanceFill,
            { width: `${manager.attendanceRate}%`, backgroundColor: manager.attendanceRate > 90 ? '#10b981' : '#f59e0b' }
          ]} 
        />
      </View>
      <Text style={styles.performanceText}>
        Attendance Rate: {manager.attendanceRate}%
      </Text>
    </TouchableOpacity>
  );

  const MarketingChannelCard = ({ channel, data, onPress }) => (
    <TouchableOpacity 
      style={styles.marketingCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.marketingHeader}>
        <View style={styles.channelIcon}>
          <Ionicons 
            name={
              channel === 'Social Media' ? 'share-social' :
              channel === 'Email Marketing' ? 'mail' :
              channel === 'Paid Ads' ? 'megaphone' :
              channel === 'Partnerships' ? 'business' : 'search'
            } 
            size={20} 
            color="#6366f1" 
          />
        </View>
        <Text style={styles.channelName}>{channel}</Text>
      </View>
      
      <View style={styles.marketingStats}>
        <View style={styles.marketingStat}>
          <Text style={styles.marketingStatValue}>{data.roi}%</Text>
          <Text style={styles.marketingStatLabel}>ROI</Text>
        </View>
        <View style={styles.marketingStat}>
          <Text style={styles.marketingStatValue}>R{(data.revenue / 1000).toFixed(0)}k</Text>
          <Text style={styles.marketingStatLabel}>Revenue</Text>
        </View>
      </View>
      
      <View style={styles.conversionBadge}>
        <Text style={styles.conversionText}>
          {data.conversionRate}% Conversion
        </Text>
      </View>
    </TouchableOpacity>
  );

  const VenueUtilizationCard = ({ venue, data, onPress }) => (
    <TouchableOpacity 
      style={styles.venueCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.venueHeader}>
        <Ionicons name="business" size={20} color="#6366f1" />
        <Text style={styles.venueName}>{venue}</Text>
      </View>
      
      <View style={styles.venueStats}>
        <View style={styles.venueStat}>
          <Text style={styles.venueStatValue}>{data.utilized.toLocaleString()}</Text>
          <Text style={styles.venueStatLabel}>Attended</Text>
        </View>
        <View style={styles.venueStat}>
          <Text style={styles.venueStatValue}>{data.capacity.toLocaleString()}</Text>
          <Text style={styles.venueStatLabel}>Capacity</Text>
        </View>
      </View>
      
      <View style={styles.utilizationBar}>
        <View 
          style={[
            styles.utilizationFill,
            { 
              width: `${data.utilizationRate}%`,
              backgroundColor: data.utilizationRate > 85 ? '#10b981' : data.utilizationRate > 75 ? '#f59e0b' : '#ef4444'
            }
          ]} 
        />
      </View>
      <Text style={styles.utilizationText}>
        Utilization: {data.utilizationRate}%
      </Text>
    </TouchableOpacity>
  );

  const EventTypePerformanceCard = ({ eventType, data, onPress }) => (
    <TouchableOpacity 
      style={styles.eventTypeCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.eventTypeHeader}>
        <View style={[
          styles.eventTypeIcon,
          { backgroundColor: 
            eventType === 'Music Festivals' ? '#ec4899' + '20' :
            eventType === 'Tech Conferences' ? '#6366f1' + '20' :
            eventType === 'Food & Beverage' ? '#f59e0b' + '20' :
            eventType === 'Arts & Culture' ? '#8b5cf6' + '20' : '#10b981' + '20'
          }
        ]}>
          <Ionicons 
            name={
              eventType === 'Music Festivals' ? 'musical-notes' :
              eventType === 'Tech Conferences' ? 'laptop' :
              eventType === 'Food & Beverage' ? 'restaurant' :
              eventType === 'Arts & Culture' ? 'color-palette' : 'business'
            } 
            size={16} 
            color={
              eventType === 'Music Festivals' ? '#ec4899' :
              eventType === 'Tech Conferences' ? '#6366f1' :
              eventType === 'Food & Beverage' ? '#f59e0b' :
              eventType === 'Arts & Culture' ? '#8b5cf6' : '#10b981'
            } 
          />
        </View>
        <Text style={styles.eventTypeName}>{eventType}</Text>
      </View>
      
      <View style={styles.eventTypeStats}>
        <View style={styles.eventTypeStat}>
          <Text style={styles.eventTypeStatValue}>{data.events}</Text>
          <Text style={styles.eventTypeStatLabel}>Events</Text>
        </View>
        <View style={styles.eventTypeStat}>
          <Text style={styles.eventTypeStatValue}>R{(data.revenue / 1000).toFixed(0)}k</Text>
          <Text style={styles.eventTypeStatLabel}>Revenue</Text>
        </View>
        <View style={styles.eventTypeStat}>
          <Text style={styles.eventTypeStatValue}>{data.attendance}%</Text>
          <Text style={styles.eventTypeStatLabel}>Attendance</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderKPIModal = () => {
    if (!selectedKPI || !stats?.kpiDetails) return null;
    
    const kpiData = stats.kpiDetails[selectedKPI];
    
    return (
      <Modal
        visible={showKPIModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowKPIModal(false)}
      >
        <View style={styles.fullModalOverlay}>
          <View style={styles.fullModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{kpiData.title}</Text>
              <TouchableOpacity onPress={() => setShowKPIModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.fullModalScroll}>
              <View style={styles.kpiSection}>
                <Text style={styles.sectionSubtitle}>Current Performance</Text>
                <View style={styles.performanceRow}>
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>Current</Text>
                    <Text style={styles.performanceValue}>
                      {typeof kpiData.current === 'number' && kpiData.current > 1000 
                        ? `R${kpiData.current.toLocaleString()}` 
                        : kpiData.current}
                      {selectedKPI === 'scanRate' && '%'}
                    </Text>
                  </View>
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>Previous</Text>
                    <Text style={styles.performanceValue}>
                      {typeof kpiData.previous === 'number' && kpiData.previous > 1000 
                        ? `R${kpiData.previous.toLocaleString()}` 
                        : kpiData.previous}
                      {selectedKPI === 'scanRate' && '%'}
                    </Text>
                  </View>
                  <View style={styles.performanceMetric}>
                    <Text style={styles.performanceLabel}>Growth</Text>
                    <View style={styles.growthIndicator}>
                      <Ionicons 
                        name={kpiData.change > 0 ? "trending-up" : "trending-down"} 
                        size={16} 
                        color={kpiData.change > 0 ? "#10b981" : "#ef4444"} 
                      />
                      <Text style={[styles.growthText, { color: kpiData.change > 0 ? "#10b981" : "#ef4444" }]}>
                        {kpiData.change > 0 ? '+' : ''}{kpiData.change}%
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {kpiData.breakdown && (
                <View style={styles.kpiSection}>
                  <Text style={styles.sectionSubtitle}>Breakdown</Text>
                  <View style={styles.breakdownGrid}>
                    {Object.entries(kpiData.breakdown).map(([key, value]) => (
                      <View key={key} style={styles.breakdownItem}>
                        <Text style={styles.breakdownLabel}>{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</Text>
                        <Text style={styles.breakdownValue}>
                          {typeof value === 'number' && value > 1000 ? `R${value.toLocaleString()}` : value}
                          {selectedKPI === 'scanRate' && '%'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {kpiData.trends && (
                <View style={styles.kpiSection}>
                  <Text style={styles.sectionSubtitle}>7-Day Trend</Text>
                  <View style={styles.trendChart}>
                    <BarChart 
                      data={kpiData.trends}
                      labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                      color="#6366f1"
                      height={150}
                    />
                  </View>
                </View>
              )}

              {kpiData.insights && (
                <View style={styles.kpiSection}>
                  <Text style={styles.sectionSubtitle}>Key Insights</Text>
                  <View style={styles.insightsList}>
                    {kpiData.insights.map((insight, index) => (
                      <View key={index} style={styles.insightItem}>
                        <Ionicons name="bulb" size={16} color="#f59e0b" />
                        <Text style={styles.insightText}>{insight}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderManagerModal = () => {
    if (!selectedManagerCard || !stats?.managerAnalytics) return null;
    
    return (
      <Modal
        visible={showManagerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowManagerModal(false)}
      >
        <View style={styles.fullModalOverlay}>
          <View style={styles.fullModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedManagerCard.type === 'manager' ? `${selectedManagerCard.name} - Performance Details` :
                 selectedManagerCard.type === 'marketing' ? `${selectedManagerCard.channel} Marketing Analytics` :
                 selectedManagerCard.type === 'venue' ? `${selectedManagerCard.venue} Utilization Details` :
                 `${selectedManagerCard.eventType} Performance Analytics`}
              </Text>
              <TouchableOpacity onPress={() => setShowManagerModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.fullModalScroll}>
              {selectedManagerCard.type === 'manager' && (
                <View style={styles.managerDetailSection}>
                  <View style={styles.detailHeader}>
                    <View style={styles.detailAvatar}>
                      <Text style={styles.detailAvatarText}>
                        {selectedManagerCard.name.split(' ').map(n => n[0]).join('')}
                      </Text>
                    </View>
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailName}>{selectedManagerCard.name}</Text>
                      <Text style={styles.detailSpecialization}>{selectedManagerCard.specialization}</Text>
                    </View>
                  </View>

                  <View style={styles.detailStats}>
                    <View style={styles.detailStatRow}>
                      <View style={styles.detailStat}>
                        <Text style={styles.detailStatValue}>R{selectedManagerCard.totalRevenue.toLocaleString()}</Text>
                        <Text style={styles.detailStatLabel}>Total Revenue</Text>
                      </View>
                      <View style={styles.detailStat}>
                        <Text style={styles.detailStatValue}>{selectedManagerCard.eventsManaged}</Text>
                        <Text style={styles.detailStatLabel}>Events Managed</Text>
                      </View>
                    </View>
                    <View style={styles.detailStatRow}>
                      <View style={styles.detailStat}>
                        <Text style={styles.detailStatValue}>{selectedManagerCard.attendanceRate}%</Text>
                        <Text style={styles.detailStatLabel}>Avg Attendance</Text>
                      </View>
                      <View style={styles.detailStat}>
                        <Text style={styles.detailStatValue}>{selectedManagerCard.efficiency}%</Text>
                        <Text style={styles.detailStatLabel}>Efficiency</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.insightsList}>
                    <Text style={styles.sectionSubtitle}>Performance Insights</Text>
                    <View style={styles.insightItem}>
                      <Ionicons name="trending-up" size={16} color="#10b981" />
                      <Text style={styles.insightText}>Revenue growth: +{selectedManagerCard.revenueGrowth}% this quarter</Text>
                    </View>
                    <View style={styles.insightItem}>
                      <Ionicons name="star" size={16} color="#f59e0b" />
                      <Text style={styles.insightText}>Customer rating: {selectedManagerCard.customerRating}/5.0</Text>
                    </View>
                    <View style={styles.insightItem}>
                      <Ionicons name="business" size={16} color="#6366f1" />
                      <Text style={styles.insightText}>Favorite venue: {selectedManagerCard.favoriteVenue}</Text>
                    </View>
                  </View>
                </View>
              )}

              {selectedManagerCard.type === 'marketing' && (
                <View style={styles.managerDetailSection}>
                  <Text style={styles.sectionSubtitle}>Channel Performance Details</Text>
                  <View style={styles.detailStats}>
                    <View style={styles.detailStatRow}>
                      <View style={styles.detailStat}>
                        <Text style={styles.detailStatValue}>R{selectedManagerCard.data.revenue.toLocaleString()}</Text>
                        <Text style={styles.detailStatLabel}>Revenue Generated</Text>
                      </View>
                      <View style={styles.detailStat}>
                        <Text style={styles.detailStatValue}>R{selectedManagerCard.data.budget.toLocaleString()}</Text>
                        <Text style={styles.detailStatLabel}>Marketing Budget</Text>
                      </View>
                    </View>
                    <View style={styles.detailStatRow}>
                      <View style={styles.detailStat}>
                        <Text style={styles.detailStatValue}>{selectedManagerCard.data.roi}%</Text>
                        <Text style={styles.detailStatLabel}>Return on Investment</Text>
                      </View>
                      <View style={styles.detailStat}>
                        <Text style={styles.detailStatValue}>{selectedManagerCard.data.conversionRate}%</Text>
                        <Text style={styles.detailStatLabel}>Conversion Rate</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {selectedManagerCard.type === 'venue' && (
                <View style={styles.managerDetailSection}>
                  <Text style={styles.sectionSubtitle}>Venue Utilization Analytics</Text>
                  <View style={styles.detailStats}>
                    <View style={styles.detailStatRow}>
                      <View style={styles.detailStat}>
                        <Text style={styles.detailStatValue}>{selectedManagerCard.data.utilizationRate}%</Text>
                        <Text style={styles.detailStatLabel}>Utilization Rate</Text>
                      </View>
                      <View style={styles.detailStat}>
                        <Text style={styles.detailStatValue}>{selectedManagerCard.data.eventsHosted}</Text>
                        <Text style={styles.detailStatLabel}>Events Hosted</Text>
                      </View>
                    </View>
                    <View style={styles.detailStatRow}>
                      <View style={styles.detailStat}>
                        <Text style={styles.detailStatValue}>{selectedManagerCard.data.utilized.toLocaleString()}</Text>
                        <Text style={styles.detailStatLabel}>Total Attendees</Text>
                      </View>
                      <View style={styles.detailStat}>
                        <Text style={styles.detailStatValue}>R{selectedManagerCard.data.revenue.toLocaleString()}</Text>
                        <Text style={styles.detailStatLabel}>Venue Revenue</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {selectedManagerCard.type === 'eventType' && (
                <View style={styles.managerDetailSection}>
                  <Text style={styles.sectionSubtitle}>Event Type Performance Details</Text>
                  <View style={styles.detailStats}>
                    <View style={styles.detailStatRow}>
                      <View style={styles.detailStat}>
                        <Text style={styles.detailStatValue}>{selectedManagerCard.data.events}</Text>
                        <Text style={styles.detailStatLabel}>Total Events</Text>
                      </View>
                      <View style={styles.detailStat}>
                        <Text style={styles.detailStatValue}>R{selectedManagerCard.data.revenue.toLocaleString()}</Text>
                        <Text style={styles.detailStatLabel}>Total Revenue</Text>
                      </View>
                    </View>
                    <View style={styles.detailStatRow}>
                      <View style={styles.detailStat}>
                        <Text style={styles.detailStatValue}>{selectedManagerCard.data.attendance}%</Text>
                        <Text style={styles.detailStatLabel}>Avg Attendance</Text>
                      </View>
                      <View style={styles.detailStat}>
                        <Text style={styles.detailStatValue}>R{selectedManagerCard.data.avgTicketPrice}</Text>
                        <Text style={styles.detailStatLabel}>Avg Ticket Price</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading dashboard analytics...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Analytics Dashboard</Text>
          <Text style={styles.headerSubtitle}>Real-time event and ticket insights</Text>
        </View>
        <View style={styles.timeRangeSelector}>
          {['today', 'week', 'month'].map((range) => (
            <TouchableOpacity 
              key={range}
              style={[styles.timeButton, timeRange === range && styles.timeButtonActive]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[styles.timeButtonText, timeRange === range && styles.timeButtonTextActive]}>
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Metrics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Live Metrics</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Active Attendees"
              value={realTimeData?.liveAttendees || 0}
              description="Currently at events"
              color="#ef4444"
              icon="people"
            />
            <MetricCard
              title="Scanned This Hour"
              value={realTimeData?.ticketsScannedLastHour || 0}
              description="Last 60 minutes"
              color="#10b981"
              icon="scan"
            />
            <MetricCard
              title="Active Events"
              value={realTimeData?.activeEventsRightNow || 0}
              description="Running now"
              color="#f59e0b"
              icon="calendar"
            />
            <MetricCard
              title="Revenue/Hour"
              value={`R${realTimeData?.revenueThisHour || 0}`}
              description="Current hour"
              color="#6366f1"
              icon="cash"
            />
          </View>
        </View>

        {/* Key Performance Indicators */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
            <Text style={styles.sectionSubtitle}>Click for detailed analytics</Text>
          </View>
          <View style={styles.metricsGrid}>
            <KPICard
              title="Total Revenue"
              value={`R${(stats?.totalRevenue || 0).toLocaleString()}`}
              change={stats?.kpiDetails?.revenue?.change || 15}
              color="#f59e0b"
              icon="cash"
              description="All events revenue"
              onPress={() => {
                setSelectedKPI('revenue');
                setShowKPIModal(true);
              }}
            />
            <KPICard
              title="Tickets Sold"
              value={stats?.totalTickets || 0}
              change={stats?.kpiDetails?.tickets?.change || 8}
              color="#10b981"
              icon="ticket"
              description="Total tickets sold"
              onPress={() => {
                setSelectedKPI('tickets');
                setShowKPIModal(true);
              }}
            />
            <KPICard
              title="Scan Rate"
              value={`${stats?.scanRate || 0}%`}
              change={stats?.kpiDetails?.scanRate?.change || 7.9}
              color="#6366f1"
              icon="qr-code"
              description="Attendance rate"
              onPress={() => {
                setSelectedKPI('scanRate');
                setShowKPIModal(true);
              }}
            />
            <KPICard
              title="Active Events"
              value={stats?.activeEvents || 0}
              change={stats?.kpiDetails?.events?.change || 50}
              color="#ef4444"
              icon="calendar"
              description="Currently running"
              onPress={() => {
                setSelectedKPI('events');
                setShowKPIModal(true);
              }}
            />
          </View>
        </View>

        {/* Manager Performance Section - CORRECTED DATA ACCESS WITH NAVIGATION ARROWS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Performing Managers</Text>
            <View style={styles.navigationControls}>
              <TouchableOpacity 
                style={[styles.navButton, !canScrollManagersLeft && styles.navButtonDisabled]}
                onPress={scrollManagersLeft}
                disabled={!canScrollManagersLeft}
              >
                <Ionicons 
                  name="chevron-back" 
                  size={20} 
                  color={canScrollManagersLeft ? "#6366f1" : "#cbd5e1"} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.navButton, !canScrollManagersRight && styles.navButtonDisabled]}
                onPress={scrollManagersRight}
                disabled={!canScrollManagersRight}
              >
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={canScrollManagersRight ? "#6366f1" : "#cbd5e1"} 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.scrollContainer}>
            <ScrollView 
              ref={managersScrollViewRef}
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
              onScroll={handleManagersScroll}
              scrollEventThrottle={16}
            >
              <View style={styles.managersGrid}>
                {stats?.managerAnalytics?.topPerformingManagers?.map((manager) => (
                  <ManagerPerformanceCard
                    key={manager.id}
                    manager={manager}
                    onPress={() => {
                      setSelectedManagerCard({ type: 'manager', ...manager });
                      setShowManagerModal(true);
                    }}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Sales Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sales Analytics</Text>
          <View style={styles.analyticsRow}>
            <TouchableOpacity 
              style={styles.chartCard}
              onPress={() => {
                setSelectedKPI('tickets');
                setShowKPIModal(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.chartTitle}>Ticket Sales Trend</Text>
              <BarChart 
                data={stats?.ticketSales || []}
                labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']}
                color="#6366f1"
                height={200}
              />
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#6366f1' }]} />
                  <Text style={styles.legendText}>Tickets Sold</Text>
                </View>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.chartCard}
              onPress={() => {
                setSelectedKPI('revenue');
                setShowKPIModal(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.chartTitle}>Revenue Distribution</Text>
              <PieChart 
                data={[24, 35, 21, 20]}
                colors={['#6366f1', '#10b981', '#f59e0b', '#ef4444']}
                labels={['Q1', 'Q2', 'Q3', 'Q4']}
                size={180}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Marketing Performance Section - CORRECTED DATA ACCESS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Marketing Channel Performance</Text>
            <Text style={styles.sectionSubtitle}>ROI and conversion rates</Text>
          </View>
          <View style={styles.marketingGrid}>
            {stats?.managerAnalytics?.marketingPerformance?.map((channelData) => (
              <MarketingChannelCard
                key={channelData.channel}
                channel={channelData.channel}
                data={channelData}
                onPress={() => {
                  setSelectedManagerCard({ type: 'marketing', channel: channelData.channel, data: channelData });
                  setShowManagerModal(true);
                }}
              />
            ))}
          </View>
        </View>

        {/* Event Performance - CORRECTED DATA ACCESS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Event Performance</Text>
            <Text style={styles.sectionSubtitle}>Top performing events by revenue</Text>
          </View>
          <View style={styles.eventPerformanceContainer}>
            <View style={styles.eventPerformanceGrid}>
              {stats?.eventPerformance?.map((event) => {
                const utilization = (event.sold / event.capacity) * 100;
                const categoryColors = {
                  'Technology': '#6366f1',
                  'Music': '#ec4899',
                  'Arts': '#8b5cf6',
                  'Food': '#f59e0b',
                  'Business': '#10b981',
                  'Entertainment': '#ef4444',
                  'Education': '#0ea5e9'
                };
                const categoryColor = categoryColors[event.category] || '#64748b';
                
                return (
                  <TouchableOpacity 
                    key={event.id}
                    style={styles.eventPerformanceCard}
                    onPress={() => {
                      setSelectedEvent(event);
                      setShowEventModal(true);
                    }}
                  >
                    <View style={styles.eventCardHeader}>
                      <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
                        <Text style={[styles.categoryText, { color: categoryColor }]}>
                          {event.category}
                        </Text>
                      </View>
                      <View style={styles.revenueBadge}>
                        <Text style={styles.revenueText}>R{(event.revenue / 1000).toFixed(1)}k</Text>
                      </View>
                    </View>

                    <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
                    <View style={styles.eventMetaRow}>
                      <View style={styles.eventMeta}>
                        <Ionicons name="calendar-outline" size={12} color="#64748b" />
                        <Text style={styles.eventMetaText}>{event.date}</Text>
                      </View>
                      <View style={styles.eventMeta}>
                        <Ionicons name="location-outline" size={12} color="#64748b" />
                        <Text style={styles.eventMetaText} numberOfLines={1}>{event.location}</Text>
                      </View>
                    </View>

                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{event.sold}</Text>
                        <Text style={styles.statLabel}>Sold</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{event.capacity}</Text>
                        <Text style={styles.statLabel}>Capacity</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: categoryColor }]}>
                          {utilization.toFixed(0)}%
                        </Text>
                        <Text style={styles.statLabel}>Util.</Text>
                      </View>
                    </View>

                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBarBg}>
                        <View 
                          style={[
                            styles.progressBarFill,
                            { 
                              width: `${utilization}%`,
                              backgroundColor: categoryColor
                            }
                          ]} 
                        />
                      </View>
                    </View>

                    <View style={styles.eventFooter}>
                      <View style={styles.attendanceInfo}>
                        <Ionicons name="people" size={14} color="#10b981" />
                        <Text style={styles.attendanceText}>
                          {event.attendanceRate}% attendance
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Venue Utilization Section - CORRECTED DATA ACCESS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Venue Utilization</Text>
            <Text style={styles.sectionSubtitle}>Capacity and attendance analysis</Text>
          </View>
          <View style={styles.venuesGrid}>
            {stats?.managerAnalytics?.venueUtilization?.map((venueData) => (
              <VenueUtilizationCard
                key={venueData.name}
                venue={venueData.name}
                data={venueData}
                onPress={() => {
                  setSelectedManagerCard({ type: 'venue', venue: venueData.name, data: venueData });
                  setShowManagerModal(true);
                }}
              />
            ))}
          </View>
        </View>

        {/* Event Type Performance Section - CORRECTED DATA ACCESS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Event Type Performance</Text>
            <Text style={styles.sectionSubtitle}>Revenue and attendance by category</Text>
          </View>
          <View style={styles.eventTypesGrid}>
            {stats?.managerAnalytics?.eventTypePerformance?.map((eventTypeData) => (
              <EventTypePerformanceCard
                key={eventTypeData.type}
                eventType={eventTypeData.type}
                data={eventTypeData}
                onPress={() => {
                  setSelectedManagerCard({ type: 'eventType', eventType: eventTypeData.type, data: eventTypeData });
                  setShowManagerModal(true);
                }}
              />
            ))}
          </View>
        </View>

        {/* Quick Statistics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Statistics</Text>
            <Text style={styles.sectionSubtitle}>Key metrics at a glance</Text>
          </View>
          <View style={styles.quickStatsGrid}>
            <QuickStatCard
              title="Tickets Sold Today"
              value={stats?.ticketsSoldToday || 0}
              subtitle="Today's sales"
              color="#10b981"
              icon="ticket"
            />
            <QuickStatCard
              title="Average Ticket Price"
              value={`R${stats?.averageTicketPrice || 0}`}
              subtitle="Across all events"
              color="#6366f1"
              icon="cash"
            />
            <QuickStatCard
              title="Conversion Rate"
              value={`${stats?.conversionRate || 0}%`}
              subtitle="Views to purchases"
              color="#f59e0b"
              icon="trending-up"
            />
            <QuickStatCard
              title="Customer Growth"
              value={`+${stats?.customerGrowth || 0}%`}
              subtitle="This month"
              color="#ef4444"
              icon="people"
            />
          </View>
        </View>
      </ScrollView>

      {/* Render modals */}
      {renderKPIModal()}
      {renderManagerModal()}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 4,
  },
  timeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  timeButtonActive: {
    backgroundColor: '#fff',
    boxShadow: '0px 1px 2px rgba(0,0,0,0.1)',
    elevation: 2,
  },
  timeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  timeButtonTextActive: {
    color: '#6366f1',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  navigationControls: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  navButtonDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#f1f5f9',
  },
  scrollContainer: {
    position: 'relative',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ef4444',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: (width - 56) / 2,
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
  kpiCard: {
    flex: 1,
    minWidth: (width - 56) / 2,
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
  fullModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  fullModalContent: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  fullModalScroll: {
    flex: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
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

  // Manager Analytics Styles
  horizontalScroll: {
    marginHorizontal: -16,
  },
  managersGrid: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
  },
  managerCard: {
    width: 280,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.06)',
    elevation: 2,
  },
  managerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  managerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  managerAvatarText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  managerInfo: {
    flex: 1,
  },
  managerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  managerRole: {
    fontSize: 12,
    color: '#64748b',
  },
  managerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  managerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  managerStat: {
    alignItems: 'center',
  },
  managerStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  managerStatLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  performanceBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  performanceFill: {
    height: '100%',
    borderRadius: 3,
  },
  performanceText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },

  // Marketing Cards
  marketingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  marketingCard: {
    width: (width - 56) / 2,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
    elevation: 1,
  },
  marketingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  channelIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#6366f1' + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  marketingStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  marketingStat: {
    flex: 1,
  },
  marketingStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  marketingStatLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  conversionBadge: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  conversionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369a1',
  },

  // Venue Cards
  venuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  venueCard: {
    width: (width - 56) / 2,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    boxShadow: '0px 1px 3px rgba(0,0,0,0.05)',
    elevation: 1,
  },
  venueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  venueName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  venueStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  venueStat: {
    flex: 1,
  },
  venueStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  venueStatLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  utilizationBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  utilizationFill: {
    height: '100%',
    borderRadius: 3,
  },
  utilizationText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },

  // Event Type Cards
  eventTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  eventTypeCard: {
    width: (width - 56) / 2,
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

  // Manager Detail Section
  managerDetailSection: {
    marginBottom: 24,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailAvatarText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 20,
  },
  detailInfo: {
    flex: 1,
  },
  detailName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  detailSpecialization: {
    fontSize: 16,
    color: '#64748b',
  },
  detailStats: {
    gap: 16,
    marginBottom: 20,
  },
  detailStatRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailStat: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  detailStatLabel: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default AdminDashboardScreen;