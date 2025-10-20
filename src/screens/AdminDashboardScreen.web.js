import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
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

const LineChart = ({ data, labels, color = '#6366f1', height = 200 }) => {
  const maxValue = Math.max(...data);
  
  return (
    <View style={[styles.chartContainer, { height }]}>
      <View style={styles.lineChart}>
        {data.map((value, index) => (
          <View
            key={index}
            style={[
              styles.linePoint,
              {
                left: `${(index / (data.length - 1)) * 100}%`,
                bottom: `${(value / maxValue) * 80}%`,
                backgroundColor: color
              }
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const ProgressRing = ({ progress, size = 60, strokeWidth = 6, color = '#6366f1' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={[styles.progressRing, { width: size, height: size }]}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <View style={styles.progressText}>
        <Text style={styles.progressValue}>{progress}%</Text>
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
      const response = await axios.get(`${API_URL}/api/admin/dashboard/stats?range=${timeRange}`, { headers });
      setStats(response.data);
      
      setRealTimeData({
        liveAttendees: Math.floor(Math.random() * 500) + 100,
        ticketsScannedLastHour: Math.floor(Math.random() * 50) + 20,
        activeEventsRightNow: Math.floor(Math.random() * 8) + 4,
        revenueThisHour: Math.floor(Math.random() * 5000) + 2000
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Enhanced mock data with detailed analytics
      setStats({
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
            ticketTypes: [
              { name: 'VIP', price: 300, sold: 50 },
              { name: 'Standard', price: 150, sold: 400 }
            ],
            attendanceRate: 93.3,
            revenuePerAttendee: 160.7,
            peakAttendance: 380
          },
          { 
            id: 2,
            name: 'Music Festival', 
            sold: 1200, 
            capacity: 1500, 
            revenue: 180000,
            scanned: 1100,
            date: '2024-11-20',
            location: 'Central Park',
            ticketTypes: [
              { name: 'VIP', price: 500, sold: 100 },
              { name: 'GA', price: 150, sold: 1100 }
            ],
            attendanceRate: 91.7,
            revenuePerAttendee: 163.6,
            peakAttendance: 1050
          },
          { 
            id: 3,
            name: 'Art Exhibition', 
            sold: 200, 
            capacity: 300, 
            revenue: 30000,
            scanned: 180,
            date: '2024-10-05',
            location: 'Art Gallery',
            ticketTypes: [
              { name: 'Premium', price: 200, sold: 30 },
              { name: 'Standard', price: 100, sold: 170 }
            ],
            attendanceRate: 90.0,
            revenuePerAttendee: 166.7,
            peakAttendance: 160
          }
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
      });
      
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
        <View style={styles.modalOverlay}>
          <View style={styles.kpiModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{kpiData.title}</Text>
              <TouchableOpacity onPress={() => setShowKPIModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.kpiModalScroll}>
              {/* Current Performance */}
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

              {/* Breakdown */}
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

              {/* Trend Chart */}
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

              {/* Insights */}
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

              {/* Related Events */}
              <View style={styles.kpiSection}>
                <Text style={styles.sectionSubtitle}>Top Performing Events</Text>
                {stats.eventPerformance.slice(0, 3).map((event) => (
                  <TouchableOpacity 
                    key={event.id}
                    style={styles.eventItem}
                    onPress={() => {
                      setSelectedEvent(event);
                      setShowEventModal(true);
                    }}
                  >
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventName}>{event.name}</Text>
                      <Text style={styles.eventDetails}>
                        {event.sold} tickets • R{event.revenue.toLocaleString()} • {event.attendanceRate}% attendance
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderEventModal = () => {
    if (!selectedEvent) return null;

    return (
      <Modal
        visible={showEventModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEventModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.eventModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedEvent.name}</Text>
              <TouchableOpacity onPress={() => setShowEventModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.eventModalScroll}>
              {/* Event Details */}
              <View style={styles.eventSection}>
                <Text style={styles.sectionSubtitle}>Event Details</Text>
                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>{selectedEvent.date}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>{selectedEvent.location}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Capacity</Text>
                    <Text style={styles.detailValue}>{selectedEvent.capacity}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Sold</Text>
                    <Text style={styles.detailValue}>{selectedEvent.sold}</Text>
                  </View>
                </View>
              </View>

              {/* Performance Metrics */}
              <View style={styles.eventSection}>
                <Text style={styles.sectionSubtitle}>Performance Metrics</Text>
                <View style={styles.performanceGrid}>
                  <View style={styles.performanceCard}>
                    <ProgressRing progress={selectedEvent.attendanceRate} color="#10b981" />
                    <Text style={styles.performanceCardLabel}>Attendance Rate</Text>
                  </View>
                  <View style={styles.performanceCard}>
                    <Text style={styles.performanceCardValue}>R{selectedEvent.revenuePerAttendee}</Text>
                    <Text style={styles.performanceCardLabel}>Revenue/Attendee</Text>
                  </View>
                  <View style={styles.performanceCard}>
                    <Text style={styles.performanceCardValue}>{selectedEvent.peakAttendance}</Text>
                    <Text style={styles.performanceCardLabel}>Peak Attendance</Text>
                  </View>
                </View>
              </View>

              {/* Ticket Breakdown */}
              {selectedEvent.ticketTypes && (
                <View style={styles.eventSection}>
                  <Text style={styles.sectionSubtitle}>Ticket Sales Breakdown</Text>
                  {selectedEvent.ticketTypes.map((ticket, index) => (
                    <View key={index} style={styles.ticketType}>
                      <View style={styles.ticketInfo}>
                        <Text style={styles.ticketName}>{ticket.name}</Text>
                        <Text style={styles.ticketDetails}>
                          {ticket.sold} sold • R{ticket.price}
                        </Text>
                      </View>
                      <Text style={styles.ticketRevenue}>
                        R{(ticket.sold * ticket.price).toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Scan Analytics */}
              <View style={styles.eventSection}>
                <Text style={styles.sectionSubtitle}>Scan Analytics</Text>
                <View style={styles.scanStats}>
                  <View style={styles.scanStat}>
                    <Text style={styles.scanStatValue}>{selectedEvent.scanned}</Text>
                    <Text style={styles.scanStatLabel}>Tickets Scanned</Text>
                  </View>
                  <View style={styles.scanStat}>
                    <Text style={styles.scanStatValue}>{selectedEvent.sold - selectedEvent.scanned}</Text>
                    <Text style={styles.scanStatLabel}>No Shows</Text>
                  </View>
                  <View style={styles.scanStat}>
                    <Text style={styles.scanStatValue}>
                      {((selectedEvent.scanned / selectedEvent.sold) * 100).toFixed(1)}%
                    </Text>
                    <Text style={styles.scanStatLabel}>Scan Rate</Text>
                  </View>
                </View>
              </View>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View>
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

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
              color="#ef4444"
              icon="people"
              description="Currently at events"
            />
            <MetricCard
              title="Scanned Last Hour"
              value={realTimeData?.ticketsScannedLastHour || 0}
              change={12}
              color="#10b981"
              icon="scan"
              description="Ticket validations"
            />
            <MetricCard
              title="Active Events"
              value={realTimeData?.activeEventsRightNow || 0}
              color="#6366f1"
              icon="calendar"
              description="Happening now"
            />
            <MetricCard
              title="Revenue This Hour"
              value={`R${(realTimeData?.revenueThisHour || 0).toLocaleString()}`}
              change={8}
              color="#f59e0b"
              icon="cash"
              description="Current hour sales"
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
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Ticket Sales Trend</Text>
              <BarChart 
                data={stats?.ticketSales || []}
                labels={['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']}
                color="#6366f1"
                height={200}
              />
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#6366f1' }]} />
                  <Text style={styles.legendText}>Tickets Sold</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Revenue Growth</Text>
              <LineChart 
                data={stats?.revenueData || []}
                labels={['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']}
                color="#10b981"
                height={200}
              />
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.legendText}>Revenue (R)</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Event Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Performance</Text>
          <View style={styles.performanceGrid}>
            {stats?.eventPerformance?.map((event, index) => {
              const utilization = (event.sold / event.capacity) * 100;
              return (
                <TouchableOpacity 
                  key={event.id}
                  style={styles.performanceCard}
                  onPress={() => {
                    setSelectedEvent(event);
                    setShowEventModal(true);
                  }}
                >
                  <View style={styles.performanceHeader}>
                    <Text style={styles.eventName}>{event.name}</Text>
                    <Text style={styles.eventRevenue}>R{event.revenue.toLocaleString()}</Text>
                  </View>
                  <View style={styles.performanceStats}>
                    <View style={styles.performanceStat}>
                      <Text style={styles.performanceLabel}>Tickets Sold</Text>
                      <Text style={styles.performanceValue}>{event.sold}</Text>
                    </View>
                    <View style={styles.performanceStat}>
                      <ProgressRing progress={utilization} size={60} color="#6366f1" />
                      <Text style={styles.performanceLabel}>Utilization</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Statistics</Text>
          <View style={styles.quickStatsGrid}>
            <View style={styles.quickStat}>
              <Ionicons name="time" size={20} color="#64748b" />
              <Text style={styles.quickStatValue}>{stats?.ticketsSoldToday || 0}</Text>
              <Text style={styles.quickStatLabel}>Sold Today</Text>
            </View>
            <View style={styles.quickStat}>
              <Ionicons name="checkmark-circle" size={20} color="#64748b" />
              <Text style={styles.quickStatValue}>{stats?.ticketsScanned || 0}</Text>
              <Text style={styles.quickStatLabel}>Scanned Total</Text>
            </View>
            <View style={styles.quickStat}>
              <Ionicons name="pricetag" size={20} color="#64748b" />
              <Text style={styles.quickStatValue}>R{stats?.averageTicketPrice || 0}</Text>
              <Text style={styles.quickStatLabel}>Avg. Price</Text>
            </View>
            <View style={styles.quickStat}>
              <Ionicons name="person" size={20} color="#64748b" />
              <Text style={styles.quickStatValue}>{stats?.totalCustomers || 0}</Text>
              <Text style={styles.quickStatLabel}>Customers</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('CreateEvent')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#6366f120' }]}>
                <Ionicons name="add-circle" size={24} color="#6366f1" />
              </View>
              <Text style={styles.actionTitle}>Create Event</Text>
              <Text style={styles.actionSubtitle}>Add new event</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('Scanner')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#10b98120' }]}>
                <Ionicons name="qr-code" size={24} color="#10b981" />
              </View>
              <Text style={styles.actionTitle}>QR Scanner</Text>
              <Text style={styles.actionSubtitle}>Validate tickets</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('EventManagement')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#f59e0b20' }]}>
                <Ionicons name="calendar" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.actionTitle}>Manage Events</Text>
              <Text style={styles.actionSubtitle}>View all events</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('UserManagement')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#ef444420' }]}>
                <Ionicons name="people" size={24} color="#ef4444" />
              </View>
              <Text style={styles.actionTitle}>Users</Text>
              <Text style={styles.actionSubtitle}>Manage users</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* KPI Detail Modal */}
      {renderKPIModal()}

      {/* Event Detail Modal */}
      {renderEventModal()}
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
  backButton: {
    padding: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    width: (width - 56) / 2,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiCard: {
    width: (width - 56) / 2,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  metricIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
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
  kpiTitle: {
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
  kpiValue: {
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
  kpiDescription: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 8,
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricChangeText: {
    fontSize: 11,
    fontWeight: '600',
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
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 16,
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
    width: '100%',
    justifyContent: 'space-between',
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  lineChart: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  linePoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
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
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
  },
  performanceGrid: {
    gap: 12,
  },
  performanceCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  eventRevenue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  performanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  performanceStat: {
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  progressRing: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  quickStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickStat: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 56) / 2,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  kpiModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  eventModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  kpiModalScroll: {
    maxHeight: 500,
  },
  eventModalScroll: {
    maxHeight: 500,
  },
  kpiSection: {
    marginBottom: 24,
  },
  eventSection: {
    marginBottom: 24,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceMetric: {
    alignItems: 'center',
    flex: 1,
  },
  performanceLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: '700',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  breakdownItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    minWidth: 100,
  },
  breakdownLabel: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 4,
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
    gap: 8,
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
    fontSize: 12,
    color: '#92400e',
    lineHeight: 16,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  eventDetails: {
    fontSize: 11,
    color: '#64748b',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    flex: 1,
    minWidth: 100,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceCard: {
    alignItems: 'center',
    flex: 1,
  },
  performanceCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  performanceCardLabel: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  ticketType: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  ticketDetails: {
    fontSize: 11,
    color: '#64748b',
  },
  ticketRevenue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  scanStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scanStat: {
    alignItems: 'center',
    flex: 1,
  },
  scanStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  scanStatLabel: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
});

export default AdminDashboardScreen;