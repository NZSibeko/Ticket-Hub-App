import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
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
const STATUS_FILTERS = ['ALL', 'VALIDATED', 'PENDING', 'DRAFT', 'REJECTED'];
const COLORS = {
  primary: '#14213D',
  primaryLight: '#3B82F6',
  accent: '#B45309',
  success: '#15803D',
  warning: '#D97706',
  danger: '#B91C1C',
  text: '#1E293B',
  textSecondary: '#5B6472',
  textTertiary: '#8B95A5',
  background: '#F4F1EA',
  card: '#FFFDFC',
  cardAlt: '#FFFBF6',
  surface: '#EFE7DB',
  border: '#DED6CA',
  borderLight: '#EEE8DE',
};

const STATUS_META = {
  VALIDATED: { label: 'Approved', tint: COLORS.success, bg: '#E7F7EE', border: '#B7E1C2' },
  PENDING: { label: 'Pending Approval', tint: COLORS.warning, bg: '#FFF4E8', border: '#F3D2A8' },
  DRAFT: { label: 'Draft', tint: '#64748B', bg: '#F1F5F9', border: '#D9E2EC' },
  REJECTED: { label: 'Rejected', tint: COLORS.danger, bg: '#FDECEC', border: '#F5C2C2' },
  UNKNOWN: { label: 'Unclassified', tint: '#475569', bg: '#EEF2F7', border: '#D8E0EA' },
};

const formatCurrency = (value) => {
  try {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(Number(value) || 0);
  } catch (error) {
    return `R${Number(value || 0).toLocaleString()}`;
  }
};

const formatCompact = (value) => {
  try {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(Number(value) || 0);
  } catch (error) {
    return `${Number(value) || 0}`;
  }
};

const formatEventDate = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Date to be confirmed';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizeStatus = (status) => {
  const upper = String(status || '').toUpperCase();
  return STATUS_META[upper] ? upper : 'UNKNOWN';
};

const relativeDate = (days, hours, minutes = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

const buildSeedEvents = (ownerName = 'Organizer') => {
  const ownerPrefix = String(ownerName || 'Organizer').split(' ')[0] || 'Organizer';
  return [
    {
      event_id: 1,
      event_name: `${ownerPrefix} Live Event`,
      location: 'Johannesburg',
      start_date: relativeDate(6, 9),
      status: 'VALIDATED',
      total_tickets: 120,
      checked_in_count: 0,
      total_revenue: 18000,
    },
    {
      event_id: 2,
      event_name: `${ownerPrefix} Planning Event`,
      location: 'Cape Town',
      start_date: relativeDate(14, 10),
      status: 'DRAFT',
      total_tickets: 60,
      checked_in_count: 0,
      total_revenue: 0,
    },
  ];
};

const EventOrganizerEventsScreen = ({ navigation }) => {
  const { user, getAuthHeader } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [dataBanner, setDataBanner] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  const navigateToRoute = (routeName, params) => {
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

    Alert.alert('Navigation unavailable', 'That destination is not exposed in the current web navigator.');
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/organizer/events`, {
        headers: getAuthHeader(),
      });
      const data = await response.json();
      const liveEvents = Array.isArray(data?.events)
        ? data.events
        : Array.isArray(data?.data)
          ? data.data
          : [];

      if (!response.ok || !data.success || !Array.isArray(liveEvents)) {
        throw new Error(data.error || 'Failed to load events');
      }

      setEvents(liveEvents);
      setDataBanner('');
    } catch (error) {
      console.error('Error loading organizer events:', error);
      const existingEvents = Array.isArray(events) ? events : [];
      if (existingEvents.length) {
        setEvents(existingEvents);
        setDataBanner('Live organizer events are temporarily unavailable. Showing the latest available organizer workspace snapshot.');
      } else {
        const ownerName = user?.full_name || user?.name || user?.displayName || user?.email?.split('@')?.[0] || 'Organizer';
        const seededEvents = buildSeedEvents(ownerName);
        setEvents(seededEvents);
        setDataBanner('Live organizer events are temporarily unavailable. Showing a minimal starter workspace built from your organizer context until the live feed returns.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const now = Date.now();
  const portfolio = events
    .map((event) => {
      const start = new Date(event.start_date).getTime();
      const totalTickets = Number(event.total_tickets) || 0;
      const checkedIn = Number(event.checked_in_count) || 0;
      const revenue = Number(event.total_revenue) || 0;
      const status = normalizeStatus(event.status);
      const daysUntil = Number.isNaN(start) ? null : Math.ceil((start - now) / 86400000);
      const progress = totalTickets > 0 ? Math.round((checkedIn / totalTickets) * 100) : 0;

      let phase = 'Scheduling';
      let phaseTint = COLORS.primaryLight;
      if (status === 'DRAFT') {
        phase = 'Planning';
        phaseTint = COLORS.textTertiary;
      } else if (status === 'PENDING') {
        phase = 'Approval queue';
        phaseTint = COLORS.warning;
      } else if (status === 'REJECTED') {
        phase = 'Needs revision';
        phaseTint = COLORS.danger;
      } else if (daysUntil !== null && daysUntil < 0) {
        phase = 'Post-event review';
        phaseTint = COLORS.success;
      } else if (daysUntil === 0) {
        phase = 'Happening today';
        phaseTint = COLORS.accent;
      } else if (daysUntil !== null) {
        phase = `Starts in ${daysUntil}d`;
      }

      return {
        ...event,
        id: event.event_id,
        name: event.event_name || 'Untitled event',
        dateLabel: formatEventDate(event.start_date),
        status,
        statusMeta: STATUS_META[status],
        totalTickets,
        checkedIn,
        revenue,
        start,
        progress,
        phase,
        phaseTint,
      };
    })
    .sort((left, right) => {
      const leftUpcoming = left.start >= now ? 0 : 1;
      const rightUpcoming = right.start >= now ? 0 : 1;
      if (leftUpcoming !== rightUpcoming) {
        return leftUpcoming - rightUpcoming;
      }
      return leftUpcoming === 0 ? left.start - right.start : right.start - left.start;
    });

  const counts = portfolio.reduce(
    (acc, event) => {
      acc.ALL += 1;
      acc[event.status] = (acc[event.status] || 0) + 1;
      return acc;
    },
    { ALL: 0, VALIDATED: 0, PENDING: 0, DRAFT: 0, REJECTED: 0, UNKNOWN: 0 },
  );

  const filteredEvents = portfolio.filter((event) => {
    const matchesStatus = selectedStatus === 'ALL' || event.status === selectedStatus;
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !query || `${event.name} ${event.location || ''} ${event.status}`.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const totalRevenue = portfolio.reduce((sum, event) => sum + event.revenue, 0);
  const totalTickets = portfolio.reduce((sum, event) => sum + event.totalTickets, 0);
  const totalCheckedIn = portfolio.reduce((sum, event) => sum + event.checkedIn, 0);
  const approved = portfolio.filter((event) => event.status === 'VALIDATED');
  const pending = portfolio.filter((event) => event.status === 'PENDING');
  const drafts = portfolio.filter((event) => event.status === 'DRAFT');
  const upcoming = portfolio.filter((event) => event.start >= now);
  const focusEvent = upcoming[0] || portfolio[0] || null;
  const topRevenueEvent = [...portfolio].sort((a, b) => b.revenue - a.revenue)[0] || null;
  const approvalRate = portfolio.length ? Math.round((approved.length / portfolio.length) * 100) : 0;
  const checkInRate = totalTickets ? Math.round((totalCheckedIn / totalTickets) * 100) : 0;
  const ownerName =
    user?.full_name || user?.name || user?.displayName || user?.email?.split('@')?.[0] || 'your event team';

  const priorities = [];
  if (pending.length) {
    priorities.push({
      id: 'pending',
      tone: COLORS.warning,
      badge: 'Approval queue',
      title: `${pending.length} event${pending.length > 1 ? 's' : ''} waiting for validation`,
      detail: `Start with ${pending[0].name} to keep the next launch window on schedule.`,
      action: 'Show pending',
      onPress: () => setSelectedStatus('PENDING'),
    });
  }
  if (drafts.length) {
    priorities.push({
      id: 'drafts',
      tone: COLORS.textSecondary,
      badge: 'Planning',
      title: `${drafts.length} draft${drafts.length > 1 ? 's still need' : ' still needs'} setup`,
      detail: 'Lock venue, inventory, and launch timing before the demand window slips.',
      action: 'Show drafts',
      onPress: () => setSelectedStatus('DRAFT'),
    });
  }
  if (!priorities.length) {
    priorities.push({
      id: 'healthy',
      tone: COLORS.success,
      badge: 'On track',
      title: 'Portfolio is operating cleanly',
      detail: portfolio.length
        ? `${portfolio.length} organizer event${portfolio.length > 1 ? 's are' : ' is'} currently in view with no immediate approval blockers.`
        : 'No immediate approval or planning blockers are visible in the current workspace snapshot.',
      action: 'Refresh',
      onPress: onRefresh,
    });
  }

  const kpis = [
    {
      id: 'revenue',
      icon: 'cash-multiple',
      label: 'Portfolio revenue',
      value: formatCurrency(totalRevenue),
      detail: `${portfolio.length} organizer event${portfolio.length === 1 ? '' : 's'} in workspace`,
      tint: COLORS.primaryLight,
    },
    {
      id: 'tickets',
      icon: 'ticket-confirmation',
      label: 'Issued tickets',
      value: formatCompact(totalTickets),
      detail: `${formatCompact(totalCheckedIn)} checked in`,
      tint: COLORS.success,
    },
    {
      id: 'approval',
      icon: 'shield-check',
      label: 'Approval posture',
      value: `${approvalRate}%`,
      detail: `${pending.length} pending • ${drafts.length} drafts • ${approved.length} approved`,
      tint: COLORS.accent,
    },
    {
      id: 'calendar',
      icon: 'calendar-star',
      label: 'Upcoming schedule',
      value: `${upcoming.length}`,
      detail: focusEvent ? `Next: ${focusEvent.name}` : 'No upcoming organizer events scheduled',
      tint: COLORS.primary,
    },
  ];

  const summaryCards = [
    {
      id: 'leader',
      label: 'Revenue leader',
      value: topRevenueEvent ? topRevenueEvent.name : 'No revenue yet',
      detail: topRevenueEvent
        ? `${formatCurrency(topRevenueEvent.revenue)} recognized revenue`
        : 'Launch a live event to establish your first commercial benchmark.',
    },
    {
      id: 'readiness',
      label: 'Guest access posture',
      value: `${checkInRate}%`,
      detail: totalTickets
        ? `${formatCompact(totalCheckedIn)} checked in across ${formatCompact(totalTickets)} issued tickets`
        : 'Ticket inventory is still being prepared.',
    },
    {
      id: 'focus',
      label: 'Next activation',
      value: focusEvent ? focusEvent.name : 'Create your first event',
      detail: focusEvent
        ? `${focusEvent.location || 'Venue pending'} · ${focusEvent.dateLabel}`
        : 'Create or sync an event to populate the next activation slot.',
    },
  ];

  const quickLinks = [
    {
      id: 'create',
      label: 'Create event',
      icon: 'calendar-plus',
      onPress: () => navigateToRoute('CreateEvent'),
    },
    {
      id: 'tools',
      label: 'Open tools board',
      icon: 'monitor-dashboard',
      onPress: () => navigateToRoute('EventOrganizerTools'),
    },
    {
      id: 'tickets',
      label: 'Go to tickets',
      icon: 'ticket-confirmation',
      onPress: () => navigateToRoute('OrganizerTickets'),
    },
  ];

  const renderEventCard = (event) => (
    <View key={event.id} style={styles.eventCard}>
      <View style={styles.eventTop}>
        <View style={[styles.phasePill, { backgroundColor: `${event.phaseTint}12` }]}>
          <Text style={[styles.phaseText, { color: event.phaseTint }]}>{event.phase}</Text>
        </View>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: event.statusMeta.bg,
              borderColor: event.statusMeta.border,
            },
          ]}
        >
          <Text style={[styles.statusPillText, { color: event.statusMeta.tint }]}>
            {event.statusMeta.label}
          </Text>
        </View>
      </View>
      <Text style={styles.eventName}>{event.name}</Text>
      <View style={styles.metaRow}>
        <Icon name="map-marker-outline" size={16} color={COLORS.textSecondary} />
        <Text style={styles.metaText}>{event.location || 'Venue pending'}</Text>
      </View>
      <View style={styles.metaRow}>
        <Icon name="calendar-month-outline" size={16} color={COLORS.textSecondary} />
        <Text style={styles.metaText}>{event.dateLabel}</Text>
      </View>
      <View style={styles.statRow}>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>Revenue</Text>
          <Text style={styles.statValue}>{formatCurrency(event.revenue)}</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>Tickets</Text>
          <Text style={styles.statValue}>{formatCompact(event.totalTickets)}</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>Checked in</Text>
          <Text style={styles.statValue}>{formatCompact(event.checkedIn)}</Text>
        </View>
      </View>
      <View style={styles.progressHead}>
        <Text style={styles.progressLabel}>Arrival progress</Text>
        <Text style={styles.progressText}>
          {event.totalTickets ? `${event.progress}% against issued inventory` : 'Inventory not issued yet'}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.max(event.progress, 4)}%`,
              backgroundColor: event.phaseTint,
            },
          ]}
        />
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.primaryCardButton}
          onPress={() => navigateToRoute('EventDetail', { eventId: event.id, event })}
        >
          <Text style={styles.primaryCardButtonText}>View event</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryCardButton}
          onPress={() => navigateToRoute('EventOrganizerTools')}
        >
          <Text style={styles.secondaryCardButtonText}>Open tools</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenContainer style={{ backgroundColor: COLORS.background }}>
          <View style={styles.loadingWrap}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingTitle}>Building your organizer workspace</Text>
              <Text style={styles.loadingCopy}>
                Pulling approvals, event activity, and commercial signals into one board.
              </Text>
            </View>
          </View>
        </ScreenContainer>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenContainer style={{ backgroundColor: COLORS.background }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primaryLight]}
            />
          }
        >
          <View style={styles.shell}>
            <View style={styles.hero}>
              <View style={styles.heroMain}>
                <Text style={styles.eyebrow}>Event organizer workspace</Text>
                <Text style={styles.heroTitle}>
                  Run approvals, delivery, and portfolio performance from one enterprise board
                </Text>
                <Text style={styles.heroCopy}>
                  Built for {ownerName}, using the same calmer, executive-grade visual language as the
                  tools dashboard and preserving the latest available organizer state when live refresh is delayed.
                </Text>
                <View style={styles.heroActions}>
                  <TouchableOpacity style={styles.ghostButton} onPress={onRefresh}>
                    <Icon name="refresh" size={18} color={COLORS.text} />
                    <Text style={styles.ghostButtonText}>Refresh</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => navigateToRoute('CreateEvent')}
                  >
                    <Icon name="calendar-plus" size={18} color="#FFFDFC" />
                    <Text style={styles.primaryButtonText}>Create event</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.ghostButton}
                    onPress={() => navigateToRoute('EventOrganizerTools')}
                  >
                    <Icon name="monitor-dashboard" size={18} color={COLORS.primary} />
                    <Text style={[styles.ghostButtonText, { color: COLORS.primary }]}>Open tools</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.focusCard}>
                <Text style={styles.focusEyebrow}>Focus event</Text>
                <Text style={styles.focusTitle}>
                  {focusEvent ? focusEvent.name : 'Create your first event'}
                </Text>
                <Text style={styles.focusCopy}>
                  {focusEvent
                    ? `${focusEvent.location || 'Venue pending'} · ${focusEvent.dateLabel}`
                    : 'The board is ready for your next activation.'}
                </Text>
                <View style={styles.focusGrid}>
                  <View style={styles.focusStat}>
                    <Text style={styles.focusLabel}>Revenue</Text>
                    <Text style={styles.focusValue}>
                      {focusEvent ? formatCurrency(focusEvent.revenue) : '--'}
                    </Text>
                  </View>
                  <View style={styles.focusStat}>
                    <Text style={styles.focusLabel}>Tickets</Text>
                    <Text style={styles.focusValue}>
                      {focusEvent ? formatCompact(focusEvent.totalTickets) : '--'}
                    </Text>
                  </View>
                  <View style={styles.focusStat}>
                    <Text style={styles.focusLabel}>Status</Text>
                    <Text style={styles.focusValue}>
                      {focusEvent ? focusEvent.statusMeta.label : 'Planning'}
                    </Text>
                  </View>
                  <View style={styles.focusStat}>
                    <Text style={styles.focusLabel}>Source</Text>
                    <Text style={styles.focusValue}>{dataBanner ? 'Snapshot mode' : 'Live data'}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.kpiRow}>
              {kpis.map((kpi) => (
                <View key={kpi.id} style={styles.kpiCard}>
                  <View style={[styles.kpiIcon, { backgroundColor: `${kpi.tint}14` }]}>
                    <Icon name={kpi.icon} size={18} color={kpi.tint} />
                  </View>
                  <Text style={styles.kpiLabel}>{kpi.label}</Text>
                  <Text style={styles.kpiValue}>{kpi.value}</Text>
                  <Text style={styles.kpiDetail}>{kpi.detail}</Text>
                </View>
              ))}
            </View>

            {dataBanner ? (
              <View style={styles.banner}>
                <Icon name="information-outline" size={18} color={COLORS.primary} />
                <Text style={styles.bannerText}>{dataBanner}</Text>
              </View>
            ) : null}

            <View style={styles.grid}>
              <View style={styles.mainCol}>
                <View style={styles.panel}>
                  <View style={styles.panelHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.panelTitle}>Event portfolio</Text>
                      <Text style={styles.panelCopy}>
                        Filter the pipeline, scan readiness, and jump into the events that need a
                        decision.
                      </Text>
                    </View>
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillText}>
                        {filteredEvents.length} of {portfolio.length} visible
                      </Text>
                    </View>
                  </View>

                  <View style={styles.searchBox}>
                    <Icon name="magnify" size={18} color={COLORS.textTertiary} />
                    <TextInput
                      value={searchTerm}
                      onChangeText={setSearchTerm}
                      style={styles.searchInput}
                      placeholder="Search events, venues, or statuses"
                      placeholderTextColor={COLORS.textTertiary}
                    />
                  </View>

                  <View style={styles.filterRow}>
                    {STATUS_FILTERS.map((status) => {
                      const active = selectedStatus === status;
                      const label = status === 'ALL' ? 'All events' : STATUS_META[status].label;
                      return (
                        <TouchableOpacity
                          key={status}
                          style={[styles.filterChip, active && styles.filterChipActive]}
                          onPress={() => setSelectedStatus(status)}
                        >
                          <Text
                            style={[styles.filterChipText, active && styles.filterChipTextActive]}
                          >
                            {label} ({counts[status] || 0})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {filteredEvents.length ? (
                    <View style={styles.cardsWrap}>{filteredEvents.map(renderEventCard)}</View>
                  ) : (
                    <View style={styles.emptyState}>
                      <Icon name="calendar-blank-multiple" size={52} color={COLORS.textTertiary} />
                      <Text style={styles.emptyTitle}>No events match this view</Text>
                      <Text style={styles.emptyCopy}>
                        Adjust the filters, clear the search, or create a new event to widen the active
                        portfolio.
                      </Text>
                      <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigateToRoute('CreateEvent')}
                      >
                        <Text style={styles.primaryButtonText}>Create event</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Portfolio briefing</Text>
                  <Text style={[styles.panelCopy, { marginBottom: 16 }]}>
                    Commercial leaders and operational notes for the current organizer portfolio.
                  </Text>
                  <View style={styles.summaryRow}>
                    {summaryCards.map((card) => (
                      <View key={card.id} style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>{card.label}</Text>
                        <Text style={styles.summaryValue}>{card.value}</Text>
                        <Text style={styles.summaryText}>{card.detail}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.railCol}>
                <View style={styles.panel}>
                  <Text style={styles.railEyebrow}>Priority queue</Text>
                  <Text style={styles.panelTitle}>
                    Work the actions most likely to unblock launch readiness
                  </Text>
                  <View style={styles.priorityList}>
                    {priorities.map((item) => (
                      <View key={item.id} style={styles.priorityCard}>
                        <View style={styles.priorityTop}>
                          <View
                            style={[styles.priorityBadge, { backgroundColor: `${item.tone}12` }]}
                          >
                            <Text style={[styles.priorityBadgeText, { color: item.tone }]}>
                              {item.badge}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.priorityAction, { backgroundColor: `${item.tone}12` }]}
                            onPress={item.onPress}
                          >
                            <Text style={[styles.priorityActionText, { color: item.tone }]}>
                              {item.action}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.priorityTitle}>{item.title}</Text>
                        <Text style={styles.priorityCopy}>{item.detail}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.panel}>
                  <Text style={styles.railEyebrow}>Status mix</Text>
                  <Text style={styles.panelTitle}>
                    Distribution across approval and planning stages
                  </Text>
                  <View style={styles.mixList}>
                    {STATUS_FILTERS.filter((status) => status !== 'ALL').map((status) => {
                      const meta = STATUS_META[status];
                      const share = portfolio.length ? ((counts[status] || 0) / portfolio.length) * 100 : 0;
                      return (
                        <View key={status} style={styles.mixItem}>
                          <View style={styles.mixHead}>
                            <Text style={styles.mixLabel}>{meta.label}</Text>
                            <Text style={styles.mixCount}>{counts[status] || 0}</Text>
                          </View>
                          <View style={styles.mixTrack}>
                            <View
                              style={[
                                styles.mixFill,
                                { width: `${share}%`, backgroundColor: meta.tint },
                              ]}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.panel}>
                  <Text style={styles.railEyebrow}>Quick links</Text>
                  <Text style={styles.panelTitle}>Jump to creation, analytics, and tickets</Text>
                  {quickLinks.map((link) => (
                    <TouchableOpacity
                      key={link.id}
                      style={styles.quickLink}
                      onPress={link.onPress}
                    >
                      <View style={styles.quickLinkIcon}>
                        <Icon name={link.icon} size={18} color={COLORS.primary} />
                      </View>
                      <Text style={styles.quickLinkText}>{link.label}</Text>
                      <Icon name="chevron-right" size={18} color={COLORS.textTertiary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 22, alignItems: 'center' },
  shell: { width: '100%', maxWidth: 1460 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingCard: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadingTitle: { marginTop: 16, fontSize: 24, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  loadingCopy: { marginTop: 10, fontSize: 14, lineHeight: 22, color: COLORS.textSecondary, textAlign: 'center' },
  hero: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginBottom: 20, padding: 28, borderRadius: 32, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  heroMain: { flex: 1.2, minWidth: 340 },
  eyebrow: { marginBottom: 12, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.accent },
  heroTitle: { fontSize: 36, lineHeight: 44, fontWeight: '800', color: COLORS.primary, marginBottom: 14, maxWidth: 760 },
  heroCopy: { fontSize: 15, lineHeight: 24, color: COLORS.textSecondary, maxWidth: 680 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 22 },
  ghostButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cardAlt },
  ghostButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  primaryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, backgroundColor: COLORS.primary },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFDFC' },
  focusCard: { flex: 0.9, minWidth: 320, padding: 24, borderRadius: 28, backgroundColor: COLORS.primary },
  focusEyebrow: { marginBottom: 10, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: '#E6D8BF' },
  focusTitle: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: '#FFFDFC', marginBottom: 10 },
  focusCopy: { fontSize: 14, lineHeight: 22, color: '#D5DDE9' },
  focusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18 },
  focusStat: { flexGrow: 1, flexBasis: 126, padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,253,252,0.08)', borderWidth: 1, borderColor: 'rgba(255,253,252,0.10)' },
  focusLabel: { marginBottom: 6, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.35, color: '#D9E2EF' },
  focusValue: { fontSize: 16, fontWeight: '800', color: '#FFFDFC' },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 20 },
  kpiCard: { flexGrow: 1, flexBasis: 220, minWidth: 220, padding: 18, borderRadius: 22, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  kpiIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  kpiLabel: { marginBottom: 8, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.45, color: '#7C8593' },
  kpiValue: { marginBottom: 6, fontSize: 26, fontWeight: '800', color: COLORS.primary },
  kpiDetail: { fontSize: 13, lineHeight: 20, color: COLORS.textSecondary },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, padding: 14, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  bannerText: { flex: 1, fontSize: 13, lineHeight: 20, color: COLORS.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' },
  mainCol: { flex: 1.2, minWidth: 340, gap: 20 },
  railCol: { flex: 0.9, minWidth: 320, gap: 20 },
  panel: { padding: 24, borderRadius: 28, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  railEyebrow: { marginBottom: 8, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.45, color: COLORS.primary },
  panelTitle: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: COLORS.text },
  panelCopy: { fontSize: 13, lineHeight: 20, color: COLORS.textSecondary },
  metaPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.surface },
  metaPillText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderLight, backgroundColor: COLORS.cardAlt },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, padding: 0 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: COLORS.borderLight, backgroundColor: COLORS.cardAlt },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  filterChipTextActive: { color: '#FFFDFC' },
  cardsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  eventCard: { flexGrow: 1, flexBasis: 320, minWidth: 280, padding: 20, borderRadius: 24, backgroundColor: COLORS.cardAlt, borderWidth: 1, borderColor: COLORS.borderLight },
  eventTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  phasePill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  phaseText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.35 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.35 },
  eventName: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  metaText: { flex: 1, fontSize: 13, lineHeight: 19, color: COLORS.textSecondary },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 16 },
  statTile: { flexGrow: 1, flexBasis: 110, minWidth: 100, padding: 14, borderRadius: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.borderLight },
  statLabel: { marginBottom: 6, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.35, color: COLORS.textTertiary },
  statValue: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  progressText: { flex: 1, textAlign: 'right', fontSize: 12, lineHeight: 18, fontWeight: '600', color: COLORS.text },
  progressTrack: { height: 8, borderRadius: 999, overflow: 'hidden', backgroundColor: COLORS.surface },
  progressFill: { height: '100%', borderRadius: 999, minWidth: 6 },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  primaryCardButton: { flexGrow: 1, flexBasis: 150, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: COLORS.primary },
  primaryCardButtonText: { fontSize: 13, fontWeight: '700', color: '#FFFDFC' },
  secondaryCardButton: { flexGrow: 1, flexBasis: 150, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  secondaryCardButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  emptyState: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 28, borderRadius: 24, borderWidth: 1, borderColor: COLORS.borderLight, backgroundColor: COLORS.cardAlt },
  emptyTitle: { marginTop: 16, marginBottom: 8, fontSize: 22, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  emptyCopy: { marginBottom: 22, maxWidth: 460, fontSize: 14, lineHeight: 22, color: COLORS.textSecondary, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  summaryCard: { flexGrow: 1, flexBasis: 220, minWidth: 220, padding: 18, borderRadius: 22, backgroundColor: COLORS.cardAlt, borderWidth: 1, borderColor: COLORS.borderLight },
  summaryLabel: { marginBottom: 8, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.35, color: COLORS.textTertiary },
  summaryValue: { marginBottom: 6, fontSize: 20, lineHeight: 26, fontWeight: '800', color: COLORS.text },
  summaryText: { fontSize: 13, lineHeight: 20, color: COLORS.textSecondary },
  priorityList: { gap: 12, marginTop: 16 },
  priorityCard: { padding: 16, borderRadius: 20, backgroundColor: COLORS.cardAlt, borderWidth: 1, borderColor: COLORS.borderLight },
  priorityTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  priorityBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.35 },
  priorityAction: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  priorityActionText: { fontSize: 12, fontWeight: '700' },
  priorityTitle: { marginBottom: 6, fontSize: 15, fontWeight: '700', color: COLORS.text },
  priorityCopy: { fontSize: 13, lineHeight: 20, color: COLORS.textSecondary },
  mixList: { gap: 14, marginTop: 16 },
  mixItem: { gap: 8 },
  mixHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  mixLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text },
  mixCount: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  mixTrack: { height: 8, borderRadius: 999, overflow: 'hidden', backgroundColor: COLORS.surface },
  mixFill: { height: '100%', borderRadius: 999 },
  quickLink: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 18, borderWidth: 1, borderColor: COLORS.borderLight, backgroundColor: COLORS.cardAlt },
  quickLinkIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  quickLinkText: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text },
});

export default EventOrganizerEventsScreen;
