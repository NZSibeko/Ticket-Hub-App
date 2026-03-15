import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:8081';

type TaskItem = { id: string | number; title?: string; status?: string; priority?: string; due_at?: string | null; created_at?: string | null };
const parseDate = (value?: string | null) => (value ? new Date(value) : null);
const normalizeStatus = (value?: string | null) => (value || 'open').toLowerCase();
const normalizePriority = (value?: string | null) => (value || 'normal').toLowerCase();
const isResolvedTask = (status?: string | null) => ['resolved', 'closed', 'completed', 'done'].includes(normalizeStatus(status));
const isInProgressTask = (status?: string | null) => ['in_progress', 'active', 'working'].includes(normalizeStatus(status));
const formatDateLabel = (value?: string | null) => {
  const parsed = parseDate(value);
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No deadline';
};
const formatRelativeLabel = (value?: string | null) => {
  const parsed = parseDate(value);
  if (!parsed || Number.isNaN(parsed.getTime())) return 'No timing set';
  const diffHours = Math.round((parsed.getTime() - Date.now()) / (1000 * 60 * 60));
  if (Math.abs(diffHours) < 1) return 'Within the hour';
  return diffHours > 0 ? `In ${diffHours}h` : `${Math.abs(diffHours)}h ago`;
};
const toneForStatus = (status?: string | null) => {
  const value = normalizeStatus(status);
  if (['active', 'in_progress', 'working'].includes(value)) return { background: '#dcfce7', border: '#86efac', text: '#166534' };
  if (['resolved', 'closed', 'completed', 'done'].includes(value)) return { background: '#dbeafe', border: '#93c5fd', text: '#1d4ed8' };
  if (['blocked', 'risk'].includes(value)) return { background: '#fee2e2', border: '#fca5a5', text: '#b91c1c' };
  return { background: '#fef3c7', border: '#fcd34d', text: '#b45309' };
};
const toneForPriority = (priority?: string | null) => {
  const value = normalizePriority(priority);
  if (['high', 'urgent', 'critical'].includes(value)) return { background: '#fee2e2', border: '#fca5a5', text: '#b91c1c' };
  if (['medium', 'normal'].includes(value)) return { background: '#e0f2fe', border: '#7dd3fc', text: '#0369a1' };
  return { background: '#ecfccb', border: '#bef264', text: '#4d7c0f' };
};

export default function EventSupportTasksScreen() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [filter, setFilter] = useState<'actionable' | 'critical' | 'due_soon' | 'resolved' | 'all'>('actionable');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState('Select a workflow action to open a consultant-ready execution note.');

  const loadTasks = async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/api/event-support-workspace/summary`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setTasks((response.data?.data?.tasks || []) as TaskItem[]);
    } catch (err: any) {
      console.error('[EVENT SUPPORT TASKS] load failed:', err?.message || err);
      setError(err?.response?.data?.error || 'Failed to load event support tasks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadTasks(); }, []);
  useEffect(() => { if (!selectedTaskId && tasks.length) setSelectedTaskId(String(tasks[0].id)); }, [selectedTaskId, tasks]);

  const actionableTasks = useMemo(() => tasks.filter((task) => !isResolvedTask(task.status)), [tasks]);
  const criticalTasks = useMemo(() => tasks.filter((task) => ['high', 'urgent', 'critical'].includes(normalizePriority(task.priority))), [tasks]);
  const dueSoonTasks = useMemo(() => tasks.filter((task) => {
    const due = parseDate(task.due_at);
    if (!due || Number.isNaN(due.getTime()) || isResolvedTask(task.status)) return false;
    return (due.getTime() - Date.now()) / (1000 * 60 * 60) <= 24;
  }), [tasks]);
  const resolvedTasks = useMemo(() => tasks.filter((task) => isResolvedTask(task.status)), [tasks]);
  const inProgressTasks = useMemo(() => tasks.filter((task) => isInProgressTask(task.status)), [tasks]);
  const overdueTasks = useMemo(() => tasks.filter((task) => {
    const due = parseDate(task.due_at);
    return Boolean(due && !Number.isNaN(due.getTime()) && due.getTime() < Date.now() && !isResolvedTask(task.status));
  }), [tasks]);

  const filteredTasks = useMemo(() => {
    if (filter === 'critical') return criticalTasks;
    if (filter === 'due_soon') return dueSoonTasks;
    if (filter === 'resolved') return resolvedTasks;
    if (filter === 'actionable') return actionableTasks;
    return tasks;
  }, [actionableTasks, criticalTasks, dueSoonTasks, filter, resolvedTasks, tasks]);

  const selectedTask = filteredTasks.find((task) => String(task.id) === selectedTaskId) || tasks.find((task) => String(task.id) === selectedTaskId) || filteredTasks[0] || tasks[0] || null;
  const chips = [
    { key: 'actionable', label: 'Actionable', count: actionableTasks.length },
    { key: 'critical', label: 'Critical', count: criticalTasks.length },
    { key: 'due_soon', label: 'Due soon', count: dueSoonTasks.length },
    { key: 'resolved', label: 'Resolved', count: resolvedTasks.length },
    { key: 'all', label: 'All tasks', count: tasks.length },
  ] as const;

  if (loading) return <View style={styles.loadingWrap}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading event support tasks...</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTasks(true)} />}>
      <View style={styles.heroCard}>
        <View style={styles.heroMain}>
          <View style={styles.heroBadge}><Ionicons name="grid-outline" size={14} color="#bfdbfe" /><Text style={styles.heroBadgeText}>Task execution center</Text></View>
          <Text style={styles.title}>Enterprise task board for event-day triage, consultant follow-through, and SLA pressure.</Text>
          <Text style={styles.subtitle}>Prioritize high-risk tasks, open the selected brief, and keep the field team aligned on the next operational move.</Text>
        </View>
        <View style={styles.heroAside}><Text style={styles.heroAsideLabel}>Active backlog</Text><Text style={styles.heroAsideValue}>{actionableTasks.length}</Text><Text style={styles.heroAsideMeta}>Open consultant actions across the event support desk.</Text></View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.metricGrid}>
        <View style={styles.metricCard}><Text style={styles.metricLabel}>Active tasks</Text><Text style={styles.metricValue}>{actionableTasks.length}</Text><Text style={styles.metricMeta}>{inProgressTasks.length} already in progress</Text></View>
        <View style={styles.metricCard}><Text style={styles.metricLabel}>Critical</Text><Text style={styles.metricValue}>{criticalTasks.length}</Text><Text style={styles.metricMeta}>Requires rapid ownership</Text></View>
        <View style={styles.metricCard}><Text style={styles.metricLabel}>Due soon</Text><Text style={styles.metricValue}>{dueSoonTasks.length}</Text><Text style={styles.metricMeta}>{overdueTasks.length} overdue now</Text></View>
        <View style={styles.metricCard}><Text style={styles.metricLabel}>Resolved</Text><Text style={styles.metricValue}>{resolvedTasks.length}</Text><Text style={styles.metricMeta}>Closed or completed actions</Text></View>
      </View>

      <View style={styles.boardRow}>
        <View style={styles.queueColumn}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Task board</Text><Text style={styles.sectionMeta}>{filteredTasks.length} items shown</Text></View>
            <View style={styles.filterRow}>
              {chips.map((chip) => (
                <Pressable key={chip.key} onPress={() => setFilter(chip.key)} style={({ pressed }) => [styles.filterChip, filter === chip.key && styles.filterChipActive, pressed && styles.pressed]}>
                  <Text style={[styles.filterChipText, filter === chip.key && styles.filterChipTextActive]}>{chip.label} ({chip.count})</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.taskList}>
              {filteredTasks.length ? filteredTasks.map((task) => {
                const selected = String(task.id) === String(selectedTask?.id);
                const statusTone = toneForStatus(task.status);
                const priorityTone = toneForPriority(task.priority);
                return (
                  <Pressable key={String(task.id)} onPress={() => setSelectedTaskId(String(task.id))} style={({ pressed }) => [styles.taskCard, selected && styles.taskCardSelected, pressed && styles.pressed]}>
                    <View style={styles.row}>
                      <View style={styles.taskInfo}>
                        <Text style={styles.taskTitle}>{task.title || 'Untitled task'}</Text>
                        <Text style={styles.taskMeta}>Task #{task.id} - due {formatDateLabel(task.due_at)}</Text>
                      </View>
                      <View style={styles.inlinePills}>
                        <View style={[styles.badge, { backgroundColor: priorityTone.background, borderColor: priorityTone.border }]}><Text style={[styles.badgeText, { color: priorityTone.text }]}>{task.priority || 'normal'}</Text></View>
                        <View style={[styles.badge, { backgroundColor: statusTone.background, borderColor: statusTone.border }]}><Text style={[styles.badgeText, { color: statusTone.text }]}>{task.status || 'open'}</Text></View>
                      </View>
                    </View>
                    <View style={styles.taskFooter}><Text style={styles.taskHint}>{formatRelativeLabel(task.due_at)}</Text><Text style={styles.taskHint}>Created {formatRelativeLabel(task.created_at)}</Text></View>
                  </Pressable>
                );
              }) : <View style={styles.emptyState}><Text style={styles.taskTitle}>No tasks match this filter.</Text><Text style={styles.taskMeta}>Switch filters or refresh the board to check for new assignments.</Text></View>}
            </View>
          </View>
        </View>

        <View style={styles.commandColumn}>
          <View style={styles.commandCardDark}>
            <Text style={styles.commandEyebrow}>Selected task</Text>
            <Text style={styles.commandTitle}>{selectedTask?.title || 'No task selected'}</Text>
            <Text style={styles.commandMeta}>{selectedTask ? `Task #${selectedTask.id} - due ${formatDateLabel(selectedTask.due_at)}` : 'Choose a task from the board to open its brief.'}</Text>
            <Text style={styles.commandDarkBody}>{selectedTask ? `${selectedTask.title || 'This task'} should stay visible in the consultant queue until field ownership, venue dependencies, and attendee impact are fully understood.` : 'The task brief will summarize status, urgency, and the recommended consultant response once a task is selected.'}</Text>
            <View style={styles.actionRow}>
              <Pressable onPress={() => setActionNote(`Triage plan opened for task #${selectedTask?.id || 'x'}: confirm venue owner, note attendee impact, and sequence the next consultant update.`)} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}><Text style={styles.primaryActionText}>Open triage plan</Text></Pressable>
              <Pressable onPress={() => setActionNote(`Escalation route drafted for task #${selectedTask?.id || 'x'}: notify event operations lead, attach observations, and request venue confirmation.`)} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}><Text style={styles.secondaryActionText}>Route escalation</Text></Pressable>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Execution note</Text>
            <Text style={styles.commandBody}>{actionNote}</Text>
            <View style={styles.signalRow}><Text style={styles.signalLabel}>Critical tasks</Text><Text style={styles.signalValue}>{criticalTasks.length}</Text></View>
            <View style={styles.signalRow}><Text style={styles.signalLabel}>In progress</Text><Text style={styles.signalValue}>{inProgressTasks.length}</Text></View>
            <View style={styles.signalRow}><Text style={styles.signalLabel}>Overdue</Text><Text style={styles.signalValue}>{overdueTasks.length}</Text></View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Execution standards</Text>
            <Text style={styles.standardItem}>1. Confirm venue ownership before updating status.</Text>
            <Text style={styles.standardItem}>2. Escalate high-priority blockers before attendee impact widens.</Text>
            <Text style={styles.standardItem}>3. Close the task only after field confirmation and consultant notes are complete.</Text>
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
  heroMain: { flex: 1, minWidth: 320, gap: 10 },
  heroBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(37, 99, 235, 0.18)', borderWidth: 1, borderColor: 'rgba(147, 197, 253, 0.28)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  heroBadgeText: { color: '#dbeafe', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  heroAside: { width: 300, borderRadius: 22, padding: 18, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', gap: 8 },
  heroAsideLabel: { fontSize: 11, fontWeight: '800', color: '#1d4ed8', textTransform: 'uppercase' },
  heroAsideValue: { fontSize: 34, fontWeight: '800', color: '#0f172a' },
  heroAsideMeta: { fontSize: 13, lineHeight: 21, color: '#334155' },
  title: { fontSize: 32, lineHeight: 40, fontWeight: '800', color: '#f8fafc' },
  subtitle: { fontSize: 15, color: '#cbd5e1', lineHeight: 24, maxWidth: 760 },
  errorText: { color: '#b91c1c', backgroundColor: '#fef2f2', padding: 12, borderRadius: 12 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  metricCard: { flexGrow: 1, flexBasis: 180, minWidth: 180, backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#dbe4ea', gap: 6 },
  metricLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  metricValue: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  metricMeta: { fontSize: 13, color: '#475569' },
  boardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' },
  queueColumn: { flex: 1, minWidth: 620 },
  commandColumn: { width: 340, gap: 18 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#dbe4ea', gap: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  sectionMeta: { fontSize: 12, fontWeight: '700', color: '#334155', backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: '#dbe4ea', backgroundColor: '#f8fafc' },
  filterChipActive: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  filterChipText: { color: '#334155', fontWeight: '700', fontSize: 12 },
  filterChipTextActive: { color: '#1d4ed8' },
  taskList: { gap: 12 },
  taskCard: { backgroundColor: '#f8fafc', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#dbe4ea', gap: 12 },
  taskCardSelected: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  taskMeta: { fontSize: 13, color: '#64748b' },
  inlinePills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999 },
  badgeText: { fontWeight: '700', fontSize: 12, textTransform: 'uppercase' },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  taskHint: { fontSize: 12, color: '#64748b' },
  commandCardDark: { backgroundColor: '#111c33', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#1f2d4b', gap: 14 },
  commandEyebrow: { fontSize: 11, fontWeight: '800', color: '#93c5fd', textTransform: 'uppercase' },
  commandTitle: { fontSize: 24, fontWeight: '800', color: '#f8fafc', lineHeight: 30 },
  commandMeta: { fontSize: 13, color: '#cbd5e1', lineHeight: 20 },
  commandDarkBody: { fontSize: 14, lineHeight: 22, color: '#e2e8f0' },
  commandBody: { fontSize: 14, lineHeight: 22, color: '#334155' },
  actionRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  primaryAction: { backgroundColor: '#2563eb', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  primaryActionText: { color: '#eff6ff', fontWeight: '700' },
  secondaryAction: { backgroundColor: '#f8fafc', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#dbe4ea' },
  secondaryActionText: { color: '#0f172a', fontWeight: '700' },
  signalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eef2f7' },
  signalLabel: { fontSize: 13, color: '#64748b' },
  signalValue: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  standardItem: { fontSize: 14, lineHeight: 22, color: '#334155' },
  emptyState: { backgroundColor: '#f8fafc', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#dbe4ea', gap: 8 },
  pressed: { opacity: 0.92 },
});
