import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:8081';

export default function OmniSupportOverviewScreen({ navigation }: any) {
  const { token, user, getUserId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);

  const fetchDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError(null);

      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      try {
        const response = await axios.get(`${API_URL}/api/support-workspace/summary`, { headers });
        setDashboard(response.data?.data || null);
        return;
      } catch (primaryError: any) {
        console.warn('[OMNI OVERVIEW] support-workspace summary failed, falling back to /api/support/dashboard:', primaryError?.message || primaryError);
      }

      const fallbackResponse = await axios.get(`${API_URL}/api/support/dashboard`, { headers });
      const fallbackData = fallbackResponse.data?.data || {};
      setDashboard({
        stats: fallbackData.stats || {},
        recentConversations: fallbackData.recentConversations || [],
        urgentTickets: fallbackData.urgentTickets || [],
        agentPerformance: fallbackData.agentPerformance || {},
      });
    } catch (err: any) {
      const apiMessage = err?.response?.data?.error || err?.response?.data?.message || err?.message;
      console.error('[OMNI OVERVIEW] Dashboard load failed:', apiMessage || err);
      setError(apiMessage ? `Failed to load live support workspace data: ${apiMessage}` : 'Failed to load live support workspace data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const stats = dashboard?.stats || {};
  const recentConversations = dashboard?.recentConversations || [];
  const urgentTickets = dashboard?.urgentTickets || [];
  const performance = dashboard?.agentPerformance || {};

  const kpis = useMemo(() => ([
    { title: 'Active Conversations', value: Number(stats.activeConversations || 0), helper: `${Number(stats.totalConversations || 0)} total`, icon: 'chatbubbles', color: '#4f46e5' },
    { title: 'Open Tickets', value: Number(stats.openTickets || 0), helper: `${Number(stats.totalTickets || 0)} total support tickets`, icon: 'ticket', color: '#f59e0b' },
    { title: 'Resolved Today', value: Number(stats.resolvedToday || 0), helper: `${Number(stats.resolvedTickets || 0)} resolved overall`, icon: 'checkmark-done', color: '#10b981' },
    { title: 'My Open Queue', value: Number(stats.myOpenTickets || stats.urgentOpenTickets || 0), helper: `${Number(stats.myActiveConversations || stats.activeConversations || 0)} active assigned convos`, icon: 'person-circle', color: '#0ea5e9' },
  ]), [stats]);

  const boardColumns = [
    {
      title: 'Live Queue',
      color: '#4f46e5',
      items: recentConversations.slice(0, 3).map((item: any) => ({
        name: item.customer_name || 'Customer thread',
        owner: item.platform || 'support',
        due: item.status || 'active',
      })),
    },
    {
      title: 'Urgent Tickets',
      color: '#dc2626',
      items: urgentTickets.slice(0, 3).map((item: any) => ({
        name: item.subject || 'Urgent support case',
        owner: item.priority || 'urgent',
        due: item.status || 'open',
      })),
    },
    {
      title: 'Performance',
      color: '#059669',
      items: [
        { name: 'Satisfaction rating', owner: performance.satisfactionRating || 'N/A', due: 'quality' },
        { name: 'Response rate', owner: performance.responseRate || 'N/A', due: 'delivery' },
        { name: 'Resolution rate', owner: performance.resolutionRate || 'N/A', due: 'closure' },
      ],
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading omni support workspace...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboard(true)} />}
    >
      <View style={styles.hero}>
        <View style={styles.heroLeft}>
          <Text style={styles.eyebrow}>OMNI SUPPORT WORKSPACE</Text>
          <Text style={styles.title}>Live operations hub for consultants, queues, events and escalations</Text>
          <Text style={styles.subtitle}>
            Monitor the real support load, review active conversations, track urgent cases and coordinate omni support execution from one workspace.
          </Text>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation?.navigate?.('SupportChat')}>
              <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Open Live Queue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => fetchDashboard(true)}>
              <Ionicons name="refresh" size={16} color="#334155" />
              <Text style={styles.secondaryBtnText}>Refresh Workspace</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.heroCard}>
          <Text style={styles.heroCardLabel}>Signed in as</Text>
          <Text style={styles.heroCardValue}>{user?.displayRole || user?.role || 'Support User'}</Text>
          <Text style={styles.heroCardMeta}>User ID: {String(getUserId?.() || user?.id || 'N/A')}</Text>
          <Text style={styles.heroCardMeta}>Avg response: {stats.averageResponseTime || 'N/A'}</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle" size={18} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.kpiRow}>
        {kpis.map((kpi) => (
          <View key={kpi.title} style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: `${kpi.color}15` }]}>
              <Ionicons name={kpi.icon as any} size={20} color={kpi.color} />
            </View>
            <Text style={styles.kpiValue}>{kpi.value}</Text>
            <Text style={styles.kpiTitle}>{kpi.title}</Text>
            <Text style={styles.kpiHelper}>{kpi.helper}</Text>
          </View>
        ))}
      </View>

      <View style={styles.workspaceGrid}>
        <View style={[styles.panel, styles.largePanel]}>
          <View style={styles.panelHeaderRow}>
            <View>
              <Text style={styles.panelTitle}>Operations Board</Text>
              <Text style={styles.panelMeta}>Real data from support tickets, conversations and consultant performance</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boardRow}>
            {boardColumns.map((column) => (
              <View key={column.title} style={styles.boardColumn}>
                <View style={styles.boardColumnHeader}>
                  <View style={[styles.boardColorDot, { backgroundColor: column.color }]} />
                  <Text style={styles.boardColumnTitle}>{column.title}</Text>
                </View>
                {column.items.length ? column.items.map((item: any) => (
                  <View key={`${column.title}-${item.name}`} style={styles.boardCard}>
                    <Text style={styles.boardCardTitle}>{item.name}</Text>
                    <Text style={styles.boardCardMeta}>{item.owner}</Text>
                    <Text style={styles.boardCardDue}>{item.due}</Text>
                  </View>
                )) : <Text style={styles.emptyColumn}>No live items</Text>}
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.sideColumn}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Platform Breakdown</Text>
            <Text style={styles.panelMeta}>Conversation distribution by channel</Text>
            <Text style={styles.statLine}>WhatsApp: {Number(stats.whatsappChats || 0)}</Text>
            <Text style={styles.statLine}>Facebook: {Number(stats.facebookChats || 0)}</Text>
            <Text style={styles.statLine}>Instagram: {Number(stats.instagramChats || 0)}</Text>
            <Text style={styles.statLine}>Twitter: {Number(stats.twitterChats || 0)}</Text>
            <Text style={styles.statLine}>TikTok: {Number(stats.tiktokChats || 0)}</Text>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Immediate Actions</Text>
            <Text style={styles.panelMeta}>Fast routes for support operations</Text>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate?.('SupportChat')}>
              <Text style={styles.actionBtnText}>Go to support chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate?.('SupportEvents')}>
              <Text style={styles.actionBtnText}>Review event issues</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate?.('SupportProfile')}>
              <Text style={styles.actionBtnText}>Open profile workspace</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, gap: 20 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 12, color: '#475569', fontSize: 14 },
  hero: { backgroundColor: '#0f172a', borderRadius: 24, padding: 28, flexDirection: 'row', gap: 24, justifyContent: 'space-between' },
  heroLeft: { flex: 1 },
  eyebrow: { color: '#93c5fd', fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },
  title: { color: '#fff', fontSize: 32, fontWeight: '800', marginBottom: 10 },
  subtitle: { color: '#cbd5e1', fontSize: 15, lineHeight: 24, maxWidth: 700 },
  heroActions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#4f46e5', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  secondaryBtnText: { color: '#334155', fontWeight: '700' },
  heroCard: { width: 300, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 18, padding: 20 },
  heroCardLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 8 },
  heroCardValue: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  heroCardMeta: { color: '#cbd5e1', fontSize: 13, lineHeight: 20 },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, padding: 14, borderRadius: 14 },
  errorText: { color: '#991b1b', flex: 1 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  kpiCard: { width: 220, backgroundColor: '#fff', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#e2e8f0' },
  kpiIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  kpiValue: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  kpiTitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  kpiHelper: { fontSize: 12, color: '#0f766e', fontWeight: '700', marginTop: 8 },
  workspaceGrid: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' },
  largePanel: { flex: 1 },
  sideColumn: { width: 360, gap: 18 },
  panel: { backgroundColor: '#fff', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  panelHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  panelTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  panelMeta: { fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 12 },
  boardRow: { gap: 14, paddingBottom: 4 },
  boardColumn: { width: 260, backgroundColor: '#f8fafc', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  boardColumnHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  boardColorDot: { width: 10, height: 10, borderRadius: 5 },
  boardColumnTitle: { fontWeight: '700', color: '#0f172a' },
  boardCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  boardCardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  boardCardMeta: { fontSize: 12, color: '#475569' },
  boardCardDue: { fontSize: 12, color: '#64748b', marginTop: 4 },
  emptyColumn: { color: '#64748b', fontSize: 13, paddingVertical: 10 },
  statLine: { fontSize: 14, color: '#334155', marginBottom: 10, lineHeight: 22 },
  actionBtn: { backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, marginTop: 8 },
  actionBtnText: { color: '#4338ca', fontSize: 13, fontWeight: '700' },
});
