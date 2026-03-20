import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrlSync } from '../utils/apiBase';

const API_URL = getApiBaseUrlSync();

type EventItem = { event_id: string | number; event_name?: string; status?: string; start_date?: string | null; location?: string | null };
type TaskItem = { id: string | number; title?: string; status?: string; priority?: string; due_at?: string | null; created_at?: string | null };
type SummaryData = {
  stats?: { assignedEvents?: number; ticketsScanned?: number; openEventIssues?: number; escalations?: number };
  events?: EventItem[];
  tasks?: TaskItem[];
};

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateLabel = (value?: string | null) => {
  const parsed = parseDate(value);
  if (!parsed) return 'Schedule pending';
  return parsed.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatRelativeLabel = (value?: string | null) => {
  const parsed = parseDate(value);
  if (!parsed) return 'No timing set';
  const diffHours = Math.round((parsed.getTime() - Date.now()) / (1000 * 60 * 60));
  if (Math.abs(diffHours) < 1) return 'Within the hour';
  return diffHours > 0 ? `In ${diffHours}h` : `${Math.abs(diffHours)}h ago`;
};

const normalizeStatus = (value?: string | null) => (value || 'open').toLowerCase();
const normalizePriority = (value?: string | null) => (value || 'normal').toLowerCase();
const isResolvedTask = (status?: string | null) => ['resolved', 'closed', 'completed', 'done'].includes(normalizeStatus(status));
const isInProgressTask = (status?: string | null) => ['in_progress', 'active', 'working'].includes(normalizeStatus(status));

const statusTone = (status?: string | null) => {
  const value = normalizeStatus(status);
  if (['active', 'in_progress', 'working'].includes(value)) return { background: '#dcfce7', border: '#86efac', text: '#166534' };
  if (['resolved', 'closed', 'completed', 'done'].includes(value)) return { background: '#dbeafe', border: '#93c5fd', text: '#1d4ed8' };
  if (['delayed', 'risk', 'blocked'].includes(value)) return { background: '#fee2e2', border: '#fca5a5', text: '#b91c1c' };
  return { background: '#fef3c7', border: '#fcd34d', text: '#b45309' };
};

const priorityTone = (priority?: string | null) => {
  const value = normalizePriority(priority);
  if (['high', 'urgent', 'critical'].includes(value)) return { background: '#fee2e2', border: '#fca5a5', text: '#b91c1c' };
  if (['medium', 'normal'].includes(value)) return { background: '#e0f2fe', border: '#7dd3fc', text: '#0369a1' };
  return { background: '#ecfccb', border: '#bef264', text: '#4d7c0f' };
};

export default function EventSupportDashboardScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SummaryData | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState('Choose a field action to open a control-room note for the consultant desk.');

  const loadData = async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/api/event-support-workspace/summary`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setData((response.data?.data || null) as SummaryData | null);
    } catch (err: any) {
      console.error('[EVENT SUPPORT DASHBOARD] load failed:', err?.message || err);
      setError(err?.response?.data?.error || 'Failed to load event support workspace data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = data?.stats || {};
  const events = useMemo(() => (Array.isArray(data?.events) ? data?.events || [] : []), [data?.events]);
  const tasks = useMemo(() => (Array.isArray(data?.tasks) ? data?.tasks || [] : []), [data?.tasks]);
  const nextEvent = useMemo(() => [...events].sort((a, b) => (parseDate(a.start_date)?.getTime() || 0) - (parseDate(b.start_date)?.getTime() || 0))[0] || null, [events]);

  useEffect(() => { if (!selectedEventId && nextEvent) setSelectedEventId(String(nextEvent.event_id)); }, [nextEvent, selectedEventId]);
  useEffect(() => { if (!selectedTaskId && tasks.length) setSelectedTaskId(String(tasks[0].id)); }, [selectedTaskId, tasks]);

  const selectedEvent = events.find((event) => String(event.event_id) === selectedEventId) || nextEvent;
  const selectedTask = tasks.find((task) => String(task.id) === selectedTaskId) || tasks[0] || null;
  const openTasks = tasks.filter((task) => !isResolvedTask(task.status));
  const inProgressTasks = tasks.filter((task) => isInProgressTask(task.status));
  const overdueTasks = tasks.filter((task) => {
    const due = parseDate(task.due_at);
    return Boolean(due && due.getTime() < Date.now() && !isResolvedTask(task.status));
  });
  const highPriorityTasks = tasks.filter((task) => ['high', 'urgent', 'critical'].includes(normalizePriority(task.priority)));
  const readinessScore = Math.max(52, 88 - Math.min(Number(stats.openEventIssues || 0) * 4, 18) - Math.min(Number(stats.escalations || 0) * 6, 18) - Math.min(overdueTasks.length * 5, 16));
  const scanDensity = (Number(stats.ticketsScanned || 0) / Math.max(Number(stats.assignedEvents || 0), 1)).toFixed(1);
  const metricCards = [
    { label: 'Assigned venues', value: Number(stats.assignedEvents || 0), detail: `${events.length} in roster`, icon: 'business-outline', accent: '#2563eb' },
    { label: 'Tickets scanned', value: Number(stats.ticketsScanned || 0), detail: `${scanDensity} per event avg`, icon: 'scan-outline', accent: '#0f766e' },
    { label: 'Open issues', value: Number(stats.openEventIssues || 0), detail: `${openTasks.length} active actions`, icon: 'warning-outline', accent: '#d97706' },
    { label: 'Escalations', value: Number(stats.escalations || 0), detail: `${highPriorityTasks.length} critical tasks`, icon: 'arrow-up-circle-outline', accent: '#dc2626' },
    { label: 'In progress', value: inProgressTasks.length, detail: `${tasks.length} total tasks`, icon: 'layers-outline', accent: '#7c3aed' },
    { label: 'Readiness', value: readinessScore, detail: `${overdueTasks.length} overdue`, icon: 'shield-checkmark-outline', accent: '#0891b2', suffix: '%' },
  ];

  const sortedTasks = [...tasks].sort((left, right) => {
    const weight = (task: TaskItem) => {
      const priority = normalizePriority(task.priority);
      if (priority === 'urgent' || priority === 'critical') return 0;
      if (priority === 'high') return 1;
      if (priority === 'medium') return 2;
      return 3;
    };
    const leftDue = parseDate(left.due_at)?.getTime() || Number.MAX_SAFE_INTEGER;
    const rightDue = parseDate(right.due_at)?.getTime() || Number.MAX_SAFE_INTEGER;
    return weight(left) !== weight(right) ? weight(left) - weight(right) : leftDue - rightDue;
  });

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading event support command center...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}>
      <View style={styles.heroCard}>
        <View style={styles.heroMain}>
          <View style={styles.heroBadge}><Ionicons name="sparkles-outline" size={14} color="#bfdbfe" /><Text style={styles.heroBadgeText}>Event support operating center</Text></View>
          <Text style={styles.heroTitle}>Field operations command deck for scanners, venue issues, and live event readiness.</Text>
          <Text style={styles.heroSubtitle}>Keep consultants aligned on the next event window, scan posture, and unresolved attendee issues from one enterprise-grade workspace.</Text>
          <View style={styles.heroSignals}>
            <View style={styles.heroSignal}><Text style={styles.heroSignalLabel}>Next event</Text><Text style={styles.heroSignalValue}>{nextEvent ? formatDateLabel(nextEvent.start_date) : 'No upcoming event'}</Text></View>
            <View style={styles.heroSignal}><Text style={styles.heroSignalLabel}>Task pressure</Text><Text style={[styles.heroSignalValue, overdueTasks.length ? styles.textDanger : styles.textSuccess]}>{overdueTasks.length ? `${overdueTasks.length} overdue` : 'Within SLA'}</Text></View>
            <View style={styles.heroSignal}><Text style={styles.heroSignalLabel}>Scan posture</Text><Text style={[styles.heroSignalValue, Number(stats.ticketsScanned || 0) > 0 ? styles.textTeal : styles.textAmber]}>{Number(stats.ticketsScanned || 0) > 0 ? 'Lanes active' : 'Awaiting activity'}</Text></View>
          </View>
        </View>
        <View style={styles.heroAside}>
          <Text style={styles.heroAsideLabel}>Readiness</Text>
          <Text style={styles.heroAsideValue}>{readinessScore}%</Text>
          <Text style={styles.heroAsideMeta}>Current desk confidence across event coverage, scan stability, and issue pressure.</Text>
        </View>
      </View>

      {error ? <View style={styles.errorCard}><Ionicons name="alert-circle-outline" size={18} color="#b91c1c" /><Text style={styles.errorText}>{error}</Text></View> : null}

      <View style={styles.metricGrid}>
        {metricCards.map((card) => (
          <View key={card.label} style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: `${card.accent}16` }]}><Ionicons name={card.icon as any} size={20} color={card.accent} /></View>
            <Text style={styles.metricLabel}>{card.label}</Text>
            <Text style={styles.metricValue}>{card.value}{card.suffix || ''}</Text>
            <Text style={styles.metricDetail}>{card.detail}</Text>
          </View>
        ))}
      </View>

      <View style={styles.boardRow}>
        <View style={styles.primaryColumn}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Event readiness board</Text><Text style={styles.sectionMeta}>{events.length} venues</Text></View>
            <View style={styles.eventGrid}>
              {events.length ? events.map((event) => {
                const selected = String(event.event_id) === String(selectedEvent?.event_id);
                const tone = statusTone(event.status);
                return (
                  <Pressable key={String(event.event_id)} onPress={() => setSelectedEventId(String(event.event_id))} style={({ pressed }) => [styles.eventCard, selected && styles.eventCardSelected, pressed && styles.pressed]}>
                    <View style={[styles.chip, { backgroundColor: tone.background, borderColor: tone.border }]}><Text style={[styles.chipText, { color: tone.text }]}>{event.status || 'Scheduled'}</Text></View>
                    <Text style={styles.eventTitle}>{event.event_name || 'Unnamed event'}</Text>
                    <Text style={styles.eventMeta}>{event.location || 'Venue pending'}</Text>
                    <Text style={styles.eventTime}>{formatDateLabel(event.start_date)}</Text>
                    <Text style={styles.eventHint}>{formatRelativeLabel(event.start_date)}</Text>
                  </Pressable>
                );
              }) : <View style={styles.emptyState}><Text style={styles.emptyTitle}>No events assigned yet</Text><Text style={styles.emptyMeta}>The readiness board will populate when venue coverage is assigned.</Text></View>}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Field execution queue</Text><Text style={styles.sectionMeta}>{openTasks.length} active actions</Text></View>
            <View style={styles.taskList}>
              {sortedTasks.length ? sortedTasks.slice(0, 6).map((task) => {
                const selected = String(task.id) === String(selectedTask?.id);
                const taskStatus = statusTone(task.status);
                const taskPriority = priorityTone(task.priority);
                return (
                  <Pressable key={String(task.id)} onPress={() => setSelectedTaskId(String(task.id))} style={({ pressed }) => [styles.taskCard, selected && styles.taskCardSelected, pressed && styles.pressed]}>
                    <View style={styles.taskHeader}>
                      <View style={styles.taskTitleWrap}>
                        <Text style={styles.taskTitle}>{task.title || 'Untitled task'}</Text>
                        <Text style={styles.taskMeta}>Task #{task.id} - created {formatRelativeLabel(task.created_at)}</Text>
                      </View>
                      <View style={styles.inlinePills}>
                        <View style={[styles.chip, { backgroundColor: taskPriority.background, borderColor: taskPriority.border }]}><Text style={[styles.chipText, { color: taskPriority.text }]}>{task.priority || 'normal'}</Text></View>
                        <View style={[styles.chip, { backgroundColor: taskStatus.background, borderColor: taskStatus.border }]}><Text style={[styles.chipText, { color: taskStatus.text }]}>{task.status || 'open'}</Text></View>
                      </View>
                    </View>
                    <View style={styles.taskFooter}><Text style={styles.taskDue}>Due {formatDateLabel(task.due_at)}</Text><Text style={styles.taskHint}>{parseDate(task.due_at) && !isResolvedTask(task.status) ? formatRelativeLabel(task.due_at) : 'No active SLA risk'}</Text></View>
                  </Pressable>
                );
              }) : <View style={styles.emptyState}><Text style={styles.emptyTitle}>No event support tasks found</Text><Text style={styles.emptyMeta}>Assignments and issue escalations will appear here once the field desk starts receiving work.</Text></View>}
            </View>
          </View>
        </View>

        <View style={styles.railColumn}>
          <View style={styles.darkCard}>
            <Text style={styles.darkEyebrow}>Selected event</Text>
            <Text style={styles.darkTitle}>{selectedEvent?.event_name || 'No event selected'}</Text>
            <Text style={styles.darkMeta}>{(selectedEvent?.location || 'Venue pending') + ' - ' + formatDateLabel(selectedEvent?.start_date)}</Text>
            <Text style={styles.darkBody}>{selectedEvent ? `Live posture for ${selectedEvent.event_name || 'this venue'} is being tracked from the field desk. Keep scan lanes stable, monitor escalations, and resolve attendee blockers before queue pressure builds.` : 'No event is selected yet. Choose an event card to inspect the current field posture.'}</Text>
            <View style={styles.darkStats}>
              <View style={styles.darkStat}><Text style={styles.darkStatValue}>{Number(stats.ticketsScanned || 0)}</Text><Text style={styles.darkStatLabel}>Scan confirmations</Text></View>
              <View style={styles.darkStat}><Text style={styles.darkStatValue}>{Number(stats.escalations || 0)}</Text><Text style={styles.darkStatLabel}>Escalations live</Text></View>
            </View>
            <View style={styles.actionRow}>
              <Pressable onPress={() => setActionNote(`Floor coordination note queued for ${selectedEvent?.event_name || 'the selected venue'}: dispatch staff to verify scan-lane readiness and confirm queue containment.`)} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}><Text style={styles.primaryActionText}>Dispatch floor team</Text></Pressable>
              <Pressable onPress={() => setActionNote(`Scanner audit brief prepared for ${selectedEvent?.event_name || 'the selected venue'}: review duplicate scans, gate pacing, and handheld scanner health before doors peak.`)} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}><Text style={styles.secondaryActionText}>Audit scan lanes</Text></Pressable>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Task command brief</Text>
            {selectedTask ? (
              <>
                <Text style={styles.commandTitle}>{selectedTask.title || 'Untitled task'}</Text>
                <Text style={styles.commandMeta}>Task #{selectedTask.id} - due {formatDateLabel(selectedTask.due_at)}</Text>
                <View style={styles.inlinePills}>
                  <View style={[styles.chip, { backgroundColor: priorityTone(selectedTask.priority).background, borderColor: priorityTone(selectedTask.priority).border }]}><Text style={[styles.chipText, { color: priorityTone(selectedTask.priority).text }]}>{selectedTask.priority || 'normal'} priority</Text></View>
                  <View style={[styles.chip, { backgroundColor: statusTone(selectedTask.status).background, borderColor: statusTone(selectedTask.status).border }]}><Text style={[styles.chipText, { color: statusTone(selectedTask.status).text }]}>{selectedTask.status || 'open'}</Text></View>
                </View>
                <Text style={styles.commandBody}>{isResolvedTask(selectedTask.status) ? 'This task is already closed. Use the event board to verify no new attendee or venue blockers have appeared.' : `Recommended next move: keep ${selectedTask.title || 'this task'} visible in the field queue, review venue ownership, and close hidden dependencies before SLA risk increases.`}</Text>
              </>
            ) : <Text style={styles.emptyMeta}>Choose a task from the execution queue to open an operations brief.</Text>}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Action log</Text>
            <Text style={styles.commandBody}>{actionNote}</Text>
            <View style={styles.signalRow}><Text style={styles.signalLabel}>Open issues</Text><Text style={styles.signalValue}>{Number(stats.openEventIssues || 0)}</Text></View>
            <View style={styles.signalRow}><Text style={styles.signalLabel}>High priority tasks</Text><Text style={styles.signalValue}>{highPriorityTasks.length}</Text></View>
            <View style={styles.signalRow}><Text style={styles.signalLabel}>Overdue actions</Text><Text style={styles.signalValue}>{overdueTasks.length}</Text></View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef4f7' },
  content: { padding: 24, gap: 20 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef4f7' },
  loadingText: { marginTop: 12, color: '#475569' },
  heroCard: { borderRadius: 28, backgroundColor: '#0f172a', padding: 24, borderWidth: 1, borderColor: '#1e293b', flexDirection: 'row', gap: 18, flexWrap: 'wrap' },
  heroMain: { flex: 1, minWidth: 320, gap: 14 },
  heroBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(37, 99, 235, 0.18)', borderWidth: 1, borderColor: 'rgba(147, 197, 253, 0.28)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  heroBadgeText: { color: '#dbeafe', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  heroTitle: { fontSize: 32, lineHeight: 40, fontWeight: '800', color: '#f8fafc', maxWidth: 820 },
  heroSubtitle: { fontSize: 15, lineHeight: 24, color: '#cbd5e1', maxWidth: 760 },
  heroSignals: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  heroSignal: { minWidth: 220, backgroundColor: '#f8fafc', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  heroSignalLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  heroSignalValue: { marginTop: 4, fontSize: 14, fontWeight: '700', color: '#1d4ed8' },
  heroAside: { width: 300, borderRadius: 22, padding: 18, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', gap: 8 },
  heroAsideLabel: { fontSize: 11, fontWeight: '800', color: '#1d4ed8', textTransform: 'uppercase' },
  heroAsideValue: { fontSize: 34, fontWeight: '800', color: '#0f172a' },
  heroAsideMeta: { fontSize: 13, lineHeight: 21, color: '#334155' },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 18, backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3' },
  errorText: { color: '#b91c1c', flex: 1, lineHeight: 20 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  metricCard: { flexGrow: 1, flexBasis: 180, minWidth: 180, borderRadius: 22, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4ea', padding: 18, gap: 8 },
  metricIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  metricValue: { fontSize: 30, fontWeight: '800', color: '#0f172a' },
  metricDetail: { fontSize: 13, color: '#475569' },
  boardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' },
  primaryColumn: { flex: 1, minWidth: 640, gap: 18 },
  railColumn: { width: 340, gap: 18 },
  sectionCard: { borderRadius: 24, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4ea', padding: 20, gap: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  sectionMeta: { fontSize: 12, fontWeight: '700', color: '#334155', backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  eventGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  eventCard: { width: 245, borderRadius: 20, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#dbe4ea', padding: 16, gap: 10 },
  eventCardSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  chip: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  eventTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  eventMeta: { fontSize: 13, color: '#475569', lineHeight: 20 },
  eventTime: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  eventHint: { fontSize: 12, color: '#64748b' },
  taskList: { gap: 12 },
  taskCard: { borderRadius: 18, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#dbe4ea', padding: 16, gap: 12 },
  taskCardSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  taskTitleWrap: { flex: 1, minWidth: 220 },
  taskTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', lineHeight: 22 },
  taskMeta: { marginTop: 5, fontSize: 12, color: '#64748b' },
  inlinePills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  taskDue: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  taskHint: { fontSize: 12, color: '#64748b' },
  darkCard: { borderRadius: 24, backgroundColor: '#111c33', borderWidth: 1, borderColor: '#1f2d4b', padding: 20, gap: 14 },
  darkEyebrow: { fontSize: 11, fontWeight: '800', color: '#93c5fd', textTransform: 'uppercase' },
  darkTitle: { fontSize: 24, fontWeight: '800', color: '#f8fafc', lineHeight: 30 },
  darkMeta: { fontSize: 13, color: '#cbd5e1', lineHeight: 20 },
  darkBody: { fontSize: 14, lineHeight: 22, color: '#e2e8f0' },
  darkStats: { flexDirection: 'row', gap: 10 },
  darkStat: { flex: 1, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  darkStatValue: { fontSize: 22, fontWeight: '800', color: '#f8fafc' },
  darkStatLabel: { marginTop: 4, fontSize: 12, color: '#cbd5e1' },
  actionRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  primaryAction: { backgroundColor: '#2563eb', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  primaryActionText: { color: '#eff6ff', fontWeight: '700' },
  secondaryAction: { backgroundColor: '#f8fafc', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#dbe4ea' },
  secondaryActionText: { color: '#0f172a', fontWeight: '700' },
  commandTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  commandMeta: { fontSize: 13, color: '#64748b' },
  commandBody: { fontSize: 14, lineHeight: 22, color: '#334155' },
  signalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eef2f7' },
  signalLabel: { fontSize: 13, color: '#64748b' },
  signalValue: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  emptyState: { borderRadius: 18, borderWidth: 1, borderColor: '#dbe4ea', backgroundColor: '#f8fafc', padding: 18, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptyMeta: { fontSize: 13, lineHeight: 20, color: '#64748b' },
  pressed: { opacity: 0.92 },
  textDanger: { color: '#dc2626' },
  textSuccess: { color: '#166534' },
  textTeal: { color: '#0f766e' },
  textAmber: { color: '#92400e' },
});
