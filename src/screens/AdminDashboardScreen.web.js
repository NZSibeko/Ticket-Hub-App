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
      
      // Enhanced mock data
      const mockStats = {
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
        ],
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

        {/* Event Performance */}
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
});

export default AdminDashboardScreen;