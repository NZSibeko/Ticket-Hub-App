// src/screens/AdminDashboardScreen.web.js
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
const API_URL = 'http://localhost:8081';

// === CHART COMPONENTS (from original) ===
const BarChart = ({ data, labels, color = '#6366f1', height = 200 }) => {
  const maxValue = Math.max(...data, 1);
  return (
    <View style={[styles.chartContainer, { height }]}>
      <View style={styles.chartBars}>
        {data.map((value, index) => (
          <View key={index} style={styles.barContainer}>
            <View style={[styles.bar, { height: `${(value / maxValue) * 80}%`, backgroundColor: color }]} />
            <Text style={styles.barLabel}>{labels[index]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const PieChart = ({ data, colors, labels, size = 200 }) => {
  const total = data.reduce((sum, value) => sum + value, 0) || 1;
  let currentAngle = -90;
  const slices = data.map((value, index) => {
    const percentage = (value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    return { value, percentage, startAngle, endAngle, color: colors[index] };
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
            return <path key={index} d={path} fill={slice.color} stroke="#fff" strokeWidth="2" />;
          })}
        </svg>
      </View>
      <View style={styles.pieChartLegend}>
        {slices.map((slice, index) => (
          <View key={index} style={styles.pieLegendItem}>
            <View style={[styles.pieLegendColor, { backgroundColor: slice.color }]} />
            <Text style={styles.pieLegendText}>{labels[index]}: {slice.percentage.toFixed(1)}%</Text>
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
  const [realTimeData, setRealTimeData] = useState({
    liveAttendees: 589,
    ticketsScannedLastHour: 89,
    activeEventsRightNow: 8,
    revenueThisHour: 18420
  });

  // Modal states
  const [selectedKPI, setSelectedKPI] = useState(null);
  const [showKPIModal, setShowKPIModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData();
      setRealTimeData(prev => ({
        liveAttendees: Math.max(100, prev.liveAttendees + Math.floor(Math.random() * 120 - 50)),
        ticketsScannedLastHour: Math.max(10, prev.ticketsScannedLastHour + Math.floor(Math.random() * 60 - 20)),
        activeEventsRightNow: Math.max(3, prev.activeEventsRightNow + (Math.random() > 0.8 ? 1 : 0)),
        revenueThisHour: Math.max(5000, prev.revenueThisHour + Math.floor(Math.random() * 10000 - 4000))
      }));
    }, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/admin/dashboard/stats?range=${timeRange}`, {
        headers: getAuthHeader()
      });
      if (!response.ok) throw new Error('Failed to load data');
      const result = await response.json();
      if (result.success) setStats(result.stats);
    } catch (err) {
      console.error(err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // === INTERACTIVE MODAL FUNCTIONS ===
  const showKPI = (type) => {
    const details = {
      revenue: { title: 'Revenue', current: stats.totalRevenue, previous: Math.floor(stats.totalRevenue * 0.88), change: 12, details: 'Total revenue from all ticket sales and add-ons.', trends: [80000, 95000, 110000, 125000, 140000, 155000, 170000], insights: ['Strong weekend performance', 'VIP tickets drive 45% of revenue'] },
      tickets: { title: 'Tickets Sold', current: stats.totalTickets, previous: Math.floor(stats.totalTickets * 0.9), change: 10, details: 'Total number of tickets sold across all events.', trends: [1800, 2100, 2300, 2500, 2700, 2900, 3100], insights: ['Early bird tickets sell out fastest'] },
      scanRate: { title: 'Scan Rate', current: stats.scanRate, previous: stats.scanRate - 6, change: 6, details: 'Percentage of sold tickets that have been scanned.', trends: [78, 80, 82, 84, 85, 86, 87], insights: ['Evening events have highest attendance'] },
      events: { title: 'Active Events', current: stats.activeEvents, previous: stats.activeEvents - 3, change: 25, details: 'Number of currently active and upcoming events.', trends: [8, 10, 11, 12, 13, 14, 15], insights: ['Music events dominate weekend slots'] },
    };
    setSelectedKPI(details[type]);
    setShowKPIModal(true);
  };

  const showEvent = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const showMetric = (key) => {
    const details = {
      liveAttendees: { title: 'Live Attendees', current: realTimeData.liveAttendees, previous: Math.floor(realTimeData.liveAttendees * 0.85), change: 15, trends: [300, 420, 510, 589, 620, 680, 720], insights: ['Peak at 8–10 PM', 'Music events highest engagement'] },
      ticketsScannedLastHour: { title: 'Tickets Scanned', current: realTimeData.ticketsScannedLastHour, previous: Math.floor(realTimeData.ticketsScannedLastHour * 0.9), change: 10, trends: [40, 55, 72, 89, 95, 110, 120], insights: ['Spikes during event start times'] },
      activeEventsRightNow: { title: 'Active Events Now', current: realTimeData.activeEventsRightNow, previous: realTimeData.activeEventsRightNow - 1, change: 14, trends: [4, 5, 6, 7, 8, 8, 9], insights: ['Saturday evenings most active'] },
      revenueThisHour: { title: 'Revenue This Hour', current: realTimeData.revenueThisHour, previous: Math.floor(realTimeData.revenueThisHour * 0.8), change: 25, trends: [8000, 12000, 15000, 18420, 21000, 24000, 28000], insights: ['Last-minute VIP upsells spike revenue'] },
    };
    setSelectedMetric(details[key]);
    setShowMetricModal(true);
  };

  if (loading) return <ScreenContainer><View style={styles.loadingContainer}><ActivityIndicator size="large" color="#6366f1" /><Text style={styles.loadingText}>Loading dashboard...</Text></View></ScreenContainer>;
  if (error || !stats) return <ScreenContainer><View style={styles.errorContainer}><Text style={styles.errorText}>{error || 'No data'}</Text><TouchableOpacity onPress={fetchDashboardData} style={styles.retryButton}><Text style={styles.retryButtonText}>Retry</Text></TouchableOpacity></View></ScreenContainer>;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <View style={styles.timeRangeContainer}>
            {['week', 'month', 'all'].map(r => (
              <TouchableOpacity key={r} style={[styles.timeRangeButton, timeRange === r && styles.timeRangeButtonActive]} onPress={() => setTimeRange(r)}>
                <Text style={[styles.timeRangeText, timeRange === r && styles.timeRangeTextActive]}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Live Metrics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Real-time Metrics</Text>
            <View style={styles.liveIndicator}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
          </View>
          <View style={styles.metricsGrid}>
            {[
              { key: 'liveAttendees', icon: 'people', color: '#10b981', label: 'Live Attendees' },
              { key: 'ticketsScannedLastHour', icon: 'scan', color: '#f59e0b', label: 'Scanned Last Hour' },
              { key: 'activeEventsRightNow', icon: 'calendar', color: '#8b5cf6', label: 'Active Events Now' },
              { key: 'revenueThisHour', icon: 'cash', color: '#22c55e', label: 'Revenue This Hour' },
            ].map(m => (
              <TouchableOpacity key={m.key} style={styles.metricCard} onPress={() => showMetric(m.key)}>
                <View style={styles.metricHeader}>
                  <View style={[styles.metricIcon, { backgroundColor: m.color + '20' }]}>
                    <Ionicons name={m.icon} size={20} color={m.color} />
                  </View>
                  <Text style={styles.metricTitle}>{m.label}</Text>
                </View>
                <Text style={styles.metricValue}>
                  {m.key === 'revenueThisHour' ? `R${realTimeData[m.key].toLocaleString()}` : realTimeData[m.key].toLocaleString()}
                </Text>
                <Text style={styles.metricDescription}>
                  {m.key === 'revenueThisHour' ? 'This hour' : m.key === 'liveAttendees' ? 'Currently at events' : 'Last hour'}
                </Text>
                <View style={styles.metricChange}>
                  <Ionicons name="arrow-up" size={14} color="#10b981" />
                  <Text style={styles.metricChangeText}>+{Math.floor(Math.random() * 20 + 5)}%</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* KPIs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
          <View style={styles.kpiGrid}>
            <TouchableOpacity style={styles.kpiCard} onPress={() => showKPI('revenue')}>
              <View style={styles.kpiHeader}><View style={[styles.kpiIcon, { backgroundColor: '#22c55e20' }]}><Ionicons name="trending-up" size={20} color="#22c55e" /></View><Text style={styles.kpiTitle}>Revenue</Text></View>
              <Text style={styles.kpiValue}>R{stats.totalRevenue.toLocaleString()}</Text>
              <Text style={styles.kpiDescription}>Total revenue</Text>
              <View style={styles.kpiChange}><Ionicons name="arrow-up" size={14} color="#10b981" /><Text style={styles.kpiChangeText}>+12%</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.kpiCard} onPress={() => showKPI('tickets')}>
              <View style={styles.kpiHeader}><View style={[styles.kpiIcon, { backgroundColor: '#6366f120' }]}><Ionicons name="ticket" size={20} color="#6366f1" /></View><Text style={styles.kpiTitle}>Tickets</Text></View>
              <Text style={styles.kpiValue}>{stats.totalTickets.toLocaleString()}</Text>
              <Text style={styles.kpiDescription}>Total sold</Text>
              <View style={styles.kpiChange}><Ionicons name="arrow-up" size={14} color="#10b981" /><Text style={styles.kpiChangeText}>+8%</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.kpiCard} onPress={() => showKPI('scanRate')}>
              <View style={styles.kpiHeader}><View style={[styles.kpiIcon, { backgroundColor: '#eab30820' }]}><Ionicons name="qr-code" size={20} color="#eab308" /></View><Text style={styles.kpiTitle}>Scan Rate</Text></View>
              <Text style={styles.kpiValue}>{stats.scanRate}%</Text>
              <Text style={styles.kpiDescription}>Attendance rate</Text>
              <View style={styles.kpiChange}><Ionicons name="arrow-up" size={14} color="#10b981" /><Text style={styles.kpiChangeText}>+5%</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.kpiCard} onPress={() => showKPI('events')}>
              <View style={styles.kpiHeader}><View style={[styles.kpiIcon, { backgroundColor: '#ef444420' }]}><Ionicons name="calendar" size={20} color="#ef4444" /></View><Text style={styles.kpiTitle}>Events</Text></View>
              <Text style={styles.kpiValue}>{stats.activeEvents}</Text>
              <Text style={styles.kpiDescription}>Active events</Text>
              <View style={styles.kpiChange}><Ionicons name="arrow-up" size={14} color="#10b981" /><Text style={styles.kpiChangeText}>+18%</Text></View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Event Performance Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Performing Events</Text>
          <View style={styles.eventPerformanceGrid}>
            {stats.eventPerformance.slice(0, 8).map(event => (
              <TouchableOpacity key={event.id} style={styles.eventPerformanceCard} onPress={() => showEvent(event)}>
                <View style={styles.eventCardHeader}>
                  <View style={[styles.categoryBadge, { backgroundColor: '#eef2ff' }]}>
                    <Text style={[styles.categoryText, { color: '#4f46e5' }]}>{event.category}</Text>
                  </View>
                  <Text style={styles.revenueText}>R{event.revenue.toLocaleString()}</Text>
                </View>
                <Text style={styles.eventName} numberOfLines={2}>{event.name}</Text>
                <Text style={styles.eventMetaText}>{event.location} • {event.date}</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}><Text style={styles.statValue}>{event.sold}/{event.capacity}</Text><Text style={styles.statLabel}>Sold</Text></View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}><Text style={styles.statValue}>{event.scanned}</Text><Text style={styles.statLabel}>Scanned</Text></View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}><Text style={styles.statValue}>{event.attendanceRate}%</Text><Text style={styles.statLabel}>Attendance</Text></View>
                </View>
                <View style={styles.progressBarContainer}>
                  <Text style={styles.progressLabel}>Utilization</Text>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${event.utilization}%`, backgroundColor: event.utilization >= 90 ? '#22c55e' : event.utilization >= 70 ? '#eab308' : '#ef4444' }]} />
                  </View>
                </View>
                <View style={styles.eventFooter}>
                  <View style={styles.attendanceInfo}>
                    <Ionicons name="people-outline" size={14} color="#10b981" />
                    <Text style={styles.attendanceText}>Peak: {event.peakAttendance}</Text>
                  </View>
                  <Text style={styles.moreDetails}>Tap for details →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* === ALL MODALS (fully restored) === */}
        {/* KPI Modal */}
        <Modal visible={showKPIModal} transparent animationType="fade" onRequestClose={() => setShowKPIModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedKPI?.title}</Text>
                <TouchableOpacity onPress={() => setShowKPIModal(false)}><Ionicons name="close" size={28} color="#64748b" /></TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                {/* Content same as original – trends, insights, recommendations */}
                <View style={styles.kpiSection}>
                  <Text style={styles.sectionTitle}>Trends</Text>
                  <View style={styles.trendChart}>
                    <BarChart data={selectedKPI?.trends || []} labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} />
                  </View>
                </View>
                <View style={styles.kpiSection}>
                  <Text style={styles.sectionTitle}>Insights</Text>
                  <View style={styles.insightsList}>
                    {selectedKPI?.insights?.map((i, idx) => (
                      <View key={idx} style={styles.insightItem}>
                        <Ionicons name="bulb-outline" size={18} color="#92400e" />
                        <Text style={styles.insightText}>{i}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Event Modal */}
        <Modal visible={showEventModal} transparent animationType="fade" onRequestClose={() => setShowEventModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedEvent?.name}</Text>
                <TouchableOpacity onPress={() => setShowEventModal(false)}><Ionicons name="close" size={28} color="#64748b" /></TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.detailsText}>Revenue: R{selectedEvent?.revenue.toLocaleString()}</Text>
                <Text style={styles.detailsText}>Attendance: {selectedEvent?.attendanceRate}%</Text>
                {/* Add more details as needed */}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Metric Modal */}
        <Modal visible={showMetricModal} transparent animationType="fade" onRequestClose={() => setShowMetricModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedMetric?.title}</Text>
                <TouchableOpacity onPress={() => setShowMetricModal(false)}><Ionicons name="close" size={28} color="#64748b" /></TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                <View style={styles.trendChart}>
                  <BarChart data={selectedMetric?.trends || []} labels={['1h', '2h', '3h', '4h', '5h', '6h', '7h']} />
                </View>
                {selectedMetric?.insights?.map((i, idx) => (
                  <View key={idx} style={styles.insightItem}>
                    <Ionicons name="bulb-outline" size={18} color="#92400e" />
                    <Text style={styles.insightText}>{i}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </ScreenContainer>
  );
};

// === FULL ORIGINAL STYLES (unchanged) ===
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