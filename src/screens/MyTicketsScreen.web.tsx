import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';
import {
  getStoredPurchasedTicketsForUser,
  mergeTicketCollections,
} from '../utils/purchasedTickets';

const { width } = Dimensions.get('window');

const PAGE_MAX_WIDTH = 1320;
const PAGE_PADDING = width >= 1280 ? 32 : width >= 768 ? 24 : 16;
const HERO_PADDING = width >= 980 ? 28 : 20;
const PANEL_PADDING = width >= 768 ? 20 : 16;

const cardShadow = Platform.select({
  web: { boxShadow: '0 18px 34px -26px rgba(15, 23, 42, 0.2)' },
  default: {
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
});

const formatCurrency = (value) => `R${Number(value || 0).toLocaleString('en-ZA')}`;
const formatDate = (value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatShortDate = (value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const formatTime = (value) => new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const getTicketTypeLabel = (type) => ({ early_bird: 'Early Bird', general: 'General', family_group: 'Family Group', vip: 'VIP', vvip: 'VVIP', premium: 'Premium' }[type] || 'General');
const getTicketTypeTone = (type) => ({ early_bird: { color: 'rgba(5, 150, 105, 0.88)', icon: 'flash-outline' }, general: { color: 'rgba(37, 99, 235, 0.88)', icon: 'ticket-outline' }, family_group: { color: 'rgba(124, 58, 237, 0.88)', icon: 'people-outline' }, vip: { color: 'rgba(194, 65, 12, 0.88)', icon: 'star-outline' }, vvip: { color: 'rgba(220, 38, 38, 0.88)', icon: 'diamond-outline' }, premium: { color: 'rgba(8, 145, 178, 0.88)', icon: 'sparkles-outline' } }[type] || { color: 'rgba(37, 99, 235, 0.88)', icon: 'ticket-outline' });
const getStatusMeta = (status) => ({ ACTIVE: { label: 'Active', icon: 'checkmark-circle-outline', bg: '#dcfce7', text: '#166534', border: '#bbf7d0' }, VALIDATED: { label: 'Used', icon: 'scan-circle-outline', bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' }, CANCELLED: { label: 'Cancelled', icon: 'close-circle-outline', bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' } }[status] || { label: status || 'Unknown', icon: 'help-circle-outline', bg: '#e2e8f0', text: '#475569', border: '#cbd5e1' });
const getDemandRatio = (current, max) => (Number(max || 0) ? Math.min(100, Math.round((Number(current || 0) / Number(max || 0)) * 100)) : 0);
const getLifecycleCopy = (ticket) => {
  const eventDate = new Date(ticket.event_date);
  const now = new Date();
  const diff = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (ticket.ticket_status === 'CANCELLED') return 'Service update issued';
  if (ticket.ticket_status === 'VALIDATED' || eventDate < now) return 'Previously attended';
  if (diff <= 1) return 'Access window opens soon';
  if (diff < 7) return `Ready in ${diff} day${diff === 1 ? '' : 's'}`;
  return `${diff} days until entry`;
};

const SectionHeader = ({ eyebrow, title, subtitle, icon, iconBg = '#dbeafe', iconColor = '#2563eb' }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionEyebrowRow}>
      <View style={[styles.sectionIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionSubtitle}>{subtitle}</Text>
  </View>
);

const StatCard = ({ icon, iconBg, iconColor, label, value, helper }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={18} color={iconColor} />
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statHelper}>{helper}</Text>
  </View>
);

const ActionCard = ({ icon, title, helper, primary = false, onPress }) => (
  <TouchableOpacity style={[styles.actionCard, primary && styles.actionCardPrimary]} activeOpacity={0.9} onPress={onPress}>
    <View style={[styles.actionIcon, primary && styles.actionIconPrimary]}>
      <Ionicons name={icon} size={18} color={primary ? '#ffffff' : '#2563eb'} />
    </View>
    <Text style={[styles.actionTitle, primary && styles.actionTitlePrimary]}>{title}</Text>
    <Text style={[styles.actionHelper, primary && styles.actionHelperPrimary]}>{helper}</Text>
  </TouchableOpacity>
);

const DetailRow = ({ icon, label, value, accent = '#2563eb' }) => (
  <View style={styles.detailRow}>
    <View style={[styles.detailIcon, { backgroundColor: `${accent}15` }]}>
      <Ionicons name={icon} size={16} color={accent} />
    </View>
    <View style={styles.detailCopy}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

const TicketCard = ({ ticket, onOpenQR, onShare }) => {
  const typeTone = getTicketTypeTone(ticket.ticket_type);
  const statusMeta = getStatusMeta(ticket.ticket_status);
  const demandRatio = getDemandRatio(ticket.current_attendees, ticket.max_attendees);
  const isActionable = ticket.ticket_status === 'ACTIVE' && new Date(ticket.event_date) >= new Date();

  return (
    <View style={styles.ticketCard}>
      <View style={styles.ticketMedia}>
        <Image source={{ uri: ticket.image_url }} style={styles.ticketImage} resizeMode="cover" />
        <View style={styles.ticketOverlay} />
        <View style={styles.ticketBadgeRow}>
          <View style={[styles.ticketBadge, { backgroundColor: typeTone.color }]}>
            <Ionicons name={typeTone.icon} size={11} color="#ffffff" />
            <Text style={styles.ticketBadgeText}>{getTicketTypeLabel(ticket.ticket_type)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
            <Ionicons name={statusMeta.icon} size={12} color={statusMeta.text} />
            <Text style={[styles.statusBadgeText, { color: statusMeta.text }]}>{statusMeta.label}</Text>
          </View>
        </View>
      </View>
      <View style={styles.ticketBody}>
        <Text style={styles.ticketTitle} numberOfLines={2}>{ticket.event_name}</Text>
        <Text style={styles.ticketSubtitle} numberOfLines={1}>{ticket.organizer || 'Ticket-Hub'} | {ticket.venue || ticket.location}</Text>
        <View style={styles.metaRow}><Ionicons name="location-outline" size={14} color="#64748b" /><Text style={styles.metaText} numberOfLines={1}>{ticket.location}</Text></View>
        <View style={styles.metaRow}><Ionicons name="calendar-outline" size={14} color="#64748b" /><Text style={styles.metaText}>{formatDate(ticket.event_date)} at {formatTime(ticket.event_date)}</Text></View>
        <View style={styles.metaRow}><Ionicons name="time-outline" size={14} color="#64748b" /><Text style={styles.metaText}>{getLifecycleCopy(ticket)}</Text></View>
        <View style={styles.progressBox}><View style={styles.progressRow}><Text style={styles.progressLabel}>Venue readiness</Text><Text style={styles.progressValue}>{demandRatio}% filled</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(demandRatio, 8)}%` }]} /></View></View>
        <View style={styles.ticketFooter}>
          <View><Text style={styles.priceText}>{formatCurrency(ticket.price)}</Text><Text style={styles.priceHelper}>Purchased {formatShortDate(ticket.purchase_date)}</Text></View>
          <View style={styles.ticketButtons}>
            <TouchableOpacity style={styles.iconButton} activeOpacity={0.9} onPress={() => onShare(ticket)}><Ionicons name="share-social-outline" size={15} color="#0f172a" /></TouchableOpacity>
            {isActionable ? <TouchableOpacity style={styles.ticketButton} activeOpacity={0.92} onPress={() => onOpenQR(ticket)}><Text style={styles.ticketButtonText}>Open pass</Text><Ionicons name="qr-code-outline" size={15} color="#ffffff" /></TouchableOpacity> : null}
          </View>
        </View>
      </View>
    </View>
  );
};

const MyTicketsScreen = ({ navigation, route }) => {
  const { user, getAuthHeader, getApiBaseUrl, apiBaseUrl } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('current');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [apiError, setApiError] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!user) {
      setTickets([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const purchasedTickets = await getStoredPurchasedTicketsForUser(user);
      const headers = typeof getAuthHeader === 'function' ? await getAuthHeader() : {};
      const baseUrl =
        apiBaseUrl || (typeof getApiBaseUrl === 'function' ? await getApiBaseUrl() : '');
      const customerId = user.customer_id || user.id;
      if (!customerId || !baseUrl) {
        setTickets(purchasedTickets);
        setApiError(true);
        return;
      }
      const response = await axios.get(`${baseUrl}/api/payments/tickets/customer/${customerId}`, { headers, timeout: 5000 });
      const apiTickets = Array.isArray(response?.data?.tickets)
        ? response.data.tickets
        : Array.isArray(response?.data)
          ? response.data
          : [];
      setTickets(mergeTicketCollections(apiTickets, purchasedTickets));
      setApiError(false);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      const purchasedTickets = await getStoredPurchasedTicketsForUser(user);
      setTickets(purchasedTickets);
      setApiError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiBaseUrl, getApiBaseUrl, getAuthHeader, user]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchTickets();
  }, [fetchTickets]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    const preferredTab = route?.params?.preferredTab;
    if (preferredTab === 'current' || preferredTab === 'history') {
      setSelectedTab(preferredTab);
    }
  }, [route?.params?.preferredTab]);

  const currentTickets = useMemo(() => {
    const now = new Date();
    return [...tickets]
      .filter((ticket) => new Date(ticket.event_date) >= now && ticket.ticket_status !== 'CANCELLED')
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
  }, [tickets]);

  const historyTickets = useMemo(() => {
    const now = new Date();
    return [...tickets]
      .filter((ticket) => new Date(ticket.event_date) < now || ticket.ticket_status === 'CANCELLED')
      .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
  }, [tickets]);

  const filteredTickets = selectedTab === 'current' ? currentTickets : historyTickets;
  const nextTicket = currentTickets[0] || tickets[0] || null;
  const validatedCount = tickets.filter((ticket) => ticket.ticket_status === 'VALIDATED').length;
  const cancelledCount = tickets.filter((ticket) => ticket.ticket_status === 'CANCELLED').length;
  const spendTotal = tickets.reduce((sum, ticket) => sum + Number(ticket.price || 0), 0);
  const avgDemand = tickets.length
    ? Math.round(tickets.reduce((sum, ticket) => sum + getDemandRatio(ticket.current_attendees, ticket.max_attendees), 0) / tickets.length)
    : 0;

  const shareTicket = useCallback(async (ticket = selectedTicket) => {
    if (!ticket) return;
    try {
      await Share.share({
        title: `Ticket for ${ticket.event_name}`,
        message:
          `Ticket-Hub digital pass\n\n` +
          `Event: ${ticket.event_name}\n` +
          `Date: ${formatDate(ticket.event_date)} at ${formatTime(ticket.event_date)}\n` +
          `Location: ${ticket.location}\n` +
          `Ticket code: ${ticket.ticket_code}`,
      });
    } catch (error) {
      console.error('Error sharing ticket:', error);
      Alert.alert('Share unavailable', 'Ticket sharing could not be completed right now.');
    }
  }, [selectedTicket]);

  const openTicket = useCallback((ticket) => {
    setSelectedTicket(ticket);
    setShowQRModal(true);
  }, []);

  const closeTicket = useCallback(() => {
    setShowQRModal(false);
    setSelectedTicket(null);
  }, []);

  useEffect(() => {
    const targetTicketCode = route?.params?.openTicketCode;
    if (!targetTicketCode || !tickets.length) {
      return;
    }

    const matchingTicket = tickets.find(
      (ticket) =>
        ticket.ticket_code === targetTicketCode ||
        ticket.ticket_id === targetTicketCode
    );

    if (!matchingTicket) {
      return;
    }

    const isUpcoming =
      new Date(matchingTicket.event_date) >= new Date() &&
      matchingTicket.ticket_status !== 'CANCELLED';

    setSelectedTab(isUpcoming ? 'current' : 'history');
    setSelectedTicket(matchingTicket);
    setShowQRModal(true);

    if (typeof navigation?.setParams === 'function') {
      navigation.setParams({
        openTicketCode: undefined,
        preferredTab: undefined,
      });
    }
  }, [navigation, route?.params?.openTicketCode, tickets]);

  const preventScreenshot = useCallback(() => {
    Alert.alert(
      'Security notice',
      'For safer ticket handling, use the share action rather than screenshots when sending entry access.'
    );
  }, []);

  if (!user) {
    return (
      <ScreenContainer style={styles.container}>
        <View style={styles.pageGlowBlue} />
        <View style={styles.pageGlowSlate} />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.pageShell}>
            <View style={styles.heroShell}>
              <View style={styles.heroGlowBlue} />
              <View style={styles.heroGlowSlate} />
              <Text style={styles.pageEyebrow}>Ticket workspace</Text>
              <Text style={styles.heroTitle}>A secure place to manage every digital pass.</Text>
              <Text style={styles.heroSubtitle}>
                Sign in to review upcoming access windows, open QR entry passes, and manage your event history from one professional workspace.
              </Text>
              <View style={styles.heroBadgeRow}>
                <View style={styles.heroBadge}><Ionicons name="shield-checkmark-outline" size={14} color="#dbeafe" /><Text style={styles.heroBadgeText}>Verified entry records</Text></View>
                <View style={styles.heroBadge}><Ionicons name="qr-code-outline" size={14} color="#dbeafe" /><Text style={styles.heroBadgeText}>Digital access passes</Text></View>
              </View>
              <View style={styles.heroActionRow}>
                <TouchableOpacity style={styles.heroPrimaryButton} activeOpacity={0.9} onPress={() => navigation.navigate('Login')}>
                  <Ionicons name="log-in-outline" size={16} color="#ffffff" />
                  <Text style={styles.heroPrimaryButtonText}>Sign in</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.heroSecondaryButton} activeOpacity={0.9} onPress={() => navigation.navigate('Discover')}>
                  <Ionicons name="compass-outline" size={16} color="#ffffff" />
                  <Text style={styles.heroSecondaryButtonText}>Browse experiences</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading ticket workspace...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.pageGlowBlue} />
      <View style={styles.pageGlowSlate} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
      >
        <View style={styles.pageShell}>
          <View style={styles.heroShell}>
            <View style={styles.heroGlowBlue} />
            <View style={styles.heroGlowSlate} />
            <View style={styles.heroGrid}>
              <View style={styles.heroCopy}>
                <Text style={styles.pageEyebrow}>Ticket workspace</Text>
                <Text style={styles.heroTitle}>Manage every pass with enterprise-grade clarity.</Text>
                <Text style={styles.heroSubtitle}>
                  Review upcoming entry windows, secure QR access, and keep your event history organized from a single polished ticketing workspace.
                </Text>
                <View style={styles.heroBadgeRow}>
                  <View style={styles.heroBadge}><Ionicons name="ticket-outline" size={14} color="#dbeafe" /><Text style={styles.heroBadgeText}>{tickets.length} tickets on file</Text></View>
                  <View style={styles.heroBadge}><Ionicons name="scan-outline" size={14} color="#dbeafe" /><Text style={styles.heroBadgeText}>{currentTickets.length} QR-ready passes</Text></View>
                  <View style={styles.heroBadge}><Ionicons name="close-circle-outline" size={14} color="#dbeafe" /><Text style={styles.heroBadgeText}>{cancelledCount} service changes recorded</Text></View>
                </View>
                <View style={styles.heroActionRow}>
                  <TouchableOpacity style={styles.heroPrimaryButton} activeOpacity={0.9} onPress={nextTicket ? () => openTicket(nextTicket) : () => navigation.navigate('BrowseEvents')}>
                    <Ionicons name={nextTicket ? 'qr-code-outline' : 'search-outline'} size={16} color="#ffffff" />
                    <Text style={styles.heroPrimaryButtonText}>{nextTicket ? 'Open next pass' : 'Browse tickets'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.heroSecondaryButton} activeOpacity={0.9} onPress={() => navigation.navigate('Discover')}>
                    <Ionicons name="layers-outline" size={16} color="#ffffff" />
                    <Text style={styles.heroSecondaryButtonText}>Explore discovery</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.heroSpotlight}>
                {nextTicket ? (
                  <>
                    <Image source={{ uri: nextTicket.image_url }} style={styles.heroSpotlightImage} resizeMode="cover" />
                    <View style={styles.heroSpotlightOverlay} />
                    <View style={styles.heroSpotlightContent}>
                      <View style={styles.heroSpotlightPill}>
                        <Ionicons name="sparkles-outline" size={12} color="#f8fafc" />
                        <Text style={styles.heroSpotlightPillText}>Next access window</Text>
                      </View>
                      <Text style={styles.heroSpotlightTitle} numberOfLines={2}>{nextTicket.event_name}</Text>
                      <Text style={styles.heroSpotlightMeta}>{formatDate(nextTicket.event_date)} at {formatTime(nextTicket.event_date)}</Text>
                      <Text style={styles.heroSpotlightMeta}>{nextTicket.location}</Text>
                      <View style={styles.heroSpotlightFooter}>
                        <View>
                          <Text style={styles.heroSpotlightPrice}>{formatCurrency(nextTicket.price)}</Text>
                          <Text style={styles.heroSpotlightHelper}>{getLifecycleCopy(nextTicket)}</Text>
                        </View>
                        <TouchableOpacity style={styles.heroSpotlightButton} activeOpacity={0.92} onPress={() => openTicket(nextTicket)}>
                          <Text style={styles.heroSpotlightButtonText}>View QR</Text>
                          <Ionicons name="arrow-forward" size={14} color="#0f172a" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.heroSpotlightEmpty}>
                    <Ionicons name="ticket-outline" size={36} color="#bfdbfe" />
                    <Text style={styles.heroSpotlightEmptyTitle}>No active upcoming pass</Text>
                    <Text style={styles.heroSpotlightEmptyText}>Browse the marketplace to add new experiences into your ticket portfolio.</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {apiError ? (
            <View style={styles.noticeBanner}>
              <Ionicons name="information-circle-outline" size={16} color="#92400e" />
              <Text style={styles.noticeBannerText}>Live sync is unavailable right now. Showing saved tickets only.</Text>
            </View>
          ) : null}

          <View style={styles.statsGrid}>
            <StatCard icon="ticket-outline" iconBg="#dbeafe" iconColor="#2563eb" label="Upcoming passes" value={`${currentTickets.length}`} helper="Ready for upcoming entry windows" />
            <StatCard icon="shield-checkmark-outline" iconBg="#dcfce7" iconColor="#15803d" label="Validated entries" value={`${validatedCount}`} helper="Tickets already used or scanned at entry" />
            <StatCard icon="cash-outline" iconBg="#ffedd5" iconColor="#c2410c" label="Portfolio value" value={formatCurrency(spendTotal)} helper="Total ticket spend represented in this workspace" />
            <StatCard icon="analytics-outline" iconBg="#ede9fe" iconColor="#7c3aed" label="Venue fill average" value={`${avgDemand}%`} helper="Average event occupancy across this portfolio" />
          </View>

          <View style={styles.panel}>
            <SectionHeader eyebrow="Actions" title="Priority ticketing paths" subtitle="Move quickly into the most common workflows without leaving the workspace." icon="flash-outline" />
            <View style={styles.actionGrid}>
              <ActionCard icon="search-outline" title="Browse official tickets" helper="Secure more inventory from the marketplace." primary onPress={() => navigation.navigate('BrowseEvents')} />
              <ActionCard icon="compass-outline" title="Open discovery" helper="Review editorial picks, demand signals, and campaigns." onPress={() => navigation.navigate('Discover')} />
              <ActionCard icon="help-circle-outline" title="Support center" helper="Open help pathways for policies and ticketing support." onPress={() => navigation.navigate('HelpCenter')} />
            </View>
          </View>

          <View style={styles.panel}>
            <SectionHeader eyebrow="Inventory" title="Ticket portfolio" subtitle="Switch between live upcoming passes and historical ticket records from the same workspace." icon="albums-outline" />
            <View style={styles.tabBar}>
              <TouchableOpacity style={[styles.tabCard, selectedTab === 'current' && styles.tabCardActive]} activeOpacity={0.92} onPress={() => setSelectedTab('current')}>
                <Ionicons name="time-outline" size={18} color={selectedTab === 'current' ? '#ffffff' : '#2563eb'} />
                <Text style={[styles.tabText, selectedTab === 'current' && styles.tabTextActive]}>Upcoming</Text>
                <Text style={[styles.tabCount, selectedTab === 'current' && styles.tabCountActive]}>{currentTickets.length}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tabCard, selectedTab === 'history' && styles.tabCardActive]} activeOpacity={0.92} onPress={() => setSelectedTab('history')}>
                <Ionicons name="archive-outline" size={18} color={selectedTab === 'history' ? '#ffffff' : '#2563eb'} />
                <Text style={[styles.tabText, selectedTab === 'history' && styles.tabTextActive]}>History</Text>
                <Text style={[styles.tabCount, selectedTab === 'history' && styles.tabCountActive]}>{historyTickets.length}</Text>
              </TouchableOpacity>
            </View>

            {filteredTickets.length ? (
              <View style={styles.ticketGrid}>
                {filteredTickets.map((ticket) => (
                  <View key={ticket.ticket_id} style={styles.ticketWrap}>
                    <TicketCard ticket={ticket} onOpenQR={openTicket} onShare={shareTicket} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name={selectedTab === 'current' ? 'ticket-outline' : 'archive-outline'} size={30} color="#94a3b8" />
                </View>
                <Text style={styles.emptyTitle}>{selectedTab === 'current' ? 'No upcoming tickets yet' : 'No ticket history available'}</Text>
                <Text style={styles.emptySubtitle}>
                  {selectedTab === 'current'
                    ? 'Browse the marketplace to add your next event and populate this workspace with active entry passes.'
                    : 'Past tickets, validated entries, and service changes will appear here as activity accumulates.'}
                </Text>
                {selectedTab === 'current' ? (
                  <TouchableOpacity style={styles.emptyButton} activeOpacity={0.9} onPress={() => navigation.navigate('BrowseEvents')}>
                    <Ionicons name="search-outline" size={16} color="#ffffff" />
                    <Text style={styles.emptyButtonText}>Browse official tickets</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={showQRModal} transparent animationType="fade" statusBarTranslucent onRequestClose={closeTicket}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <TouchableOpacity style={styles.closeButton} onPress={closeTicket}>
              <Ionicons name="close" size={20} color="#0f172a" />
            </TouchableOpacity>
            {selectedTicket ? (
              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
                <View style={styles.modalHero}>
                  <Image source={{ uri: selectedTicket.image_url }} style={styles.modalHeroImage} resizeMode="cover" />
                  <View style={styles.modalHeroOverlay} />
                  <View style={styles.modalHeroInner}>
                    <View style={styles.modalHeroBadges}>
                      <View style={[styles.ticketBadge, { backgroundColor: getTicketTypeTone(selectedTicket.ticket_type).color }]}>
                        <Ionicons name={getTicketTypeTone(selectedTicket.ticket_type).icon} size={11} color="#ffffff" />
                        <Text style={styles.ticketBadgeText}>{getTicketTypeLabel(selectedTicket.ticket_type)}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusMeta(selectedTicket.ticket_status).bg, borderColor: getStatusMeta(selectedTicket.ticket_status).border }]}>
                        <Ionicons name={getStatusMeta(selectedTicket.ticket_status).icon} size={12} color={getStatusMeta(selectedTicket.ticket_status).text} />
                        <Text style={[styles.statusBadgeText, { color: getStatusMeta(selectedTicket.ticket_status).text }]}>{getStatusMeta(selectedTicket.ticket_status).label}</Text>
                      </View>
                    </View>
                    <Text style={styles.modalTitle}>{selectedTicket.event_name}</Text>
                    <Text style={styles.modalSubtitle}>{formatDate(selectedTicket.event_date)} at {formatTime(selectedTicket.event_date)} | {selectedTicket.location}</Text>
                  </View>
                </View>

                <View style={styles.modalGrid}>
                  <View style={styles.modalPanel}>
                    <Text style={styles.panelEyebrow}>Secure entry</Text>
                    <Text style={styles.panelTitle}>Digital access pass</Text>
                    <Text style={styles.panelText}>Present this QR code at venue entry. Share the pass securely if another attendee needs it.</Text>
                    <TouchableOpacity style={styles.qrPanel} activeOpacity={0.96} onPress={preventScreenshot}>
                      <QRCode value={selectedTicket.ticket_code} size={width >= 768 ? 180 : 150} backgroundColor="white" color="black" />
                    </TouchableOpacity>
                    <View style={styles.codePanel}>
                      <Text style={styles.codeLabel}>Ticket code</Text>
                      <Text style={styles.codeValue}>{selectedTicket.ticket_code}</Text>
                    </View>
                    <View style={styles.modalButtons}>
                      <TouchableOpacity style={styles.modalPrimaryButton} activeOpacity={0.9} onPress={() => shareTicket(selectedTicket)}>
                        <Ionicons name="share-social-outline" size={16} color="#ffffff" />
                        <Text style={styles.modalPrimaryButtonText}>Share pass</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.modalSecondaryButton} activeOpacity={0.9} onPress={preventScreenshot}>
                        <Ionicons name="shield-checkmark-outline" size={16} color="#0f172a" />
                        <Text style={styles.modalSecondaryButtonText}>Security notice</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.modalPanel}>
                    <Text style={styles.panelEyebrow}>Pass details</Text>
                    <Text style={styles.panelTitle}>Event metadata</Text>
                    <View style={styles.detailList}>
                      <DetailRow icon="location-outline" label="Venue" value={selectedTicket.location} accent="#2563eb" />
                      <DetailRow icon="business-outline" label="Organizer" value={selectedTicket.organizer || 'Ticket-Hub'} accent="#0f766e" />
                      <DetailRow icon="calendar-outline" label="Event date" value={formatDate(selectedTicket.event_date)} accent="#7c3aed" />
                      <DetailRow icon="cash-outline" label="Price paid" value={`${selectedTicket.currency} ${selectedTicket.price}`} accent="#c2410c" />
                      <DetailRow icon="albums-outline" label="Ticket tier" value={getTicketTypeLabel(selectedTicket.ticket_type)} accent="#0891b2" />
                    </View>
                    <View style={styles.securityNote}>
                      <Ionicons name="shield-checkmark-outline" size={16} color="#166534" />
                      <Text style={styles.securityNoteText}>Use the share action for controlled transfer instead of screenshots whenever possible.</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fb' },
  pageGlowBlue: { position: 'absolute', top: -120, left: -120, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(37, 99, 235, 0.08)' },
  pageGlowSlate: { position: 'absolute', top: 180, right: -120, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(15, 23, 42, 0.05)' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  pageShell: { width: '100%', maxWidth: PAGE_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: PAGE_PADDING, paddingTop: 22 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f7fb' },
  loadingText: { marginTop: 16, fontSize: 15, fontWeight: '600', color: '#64748b' },
  heroShell: { position: 'relative', overflow: 'hidden', borderRadius: 28, padding: HERO_PADDING, backgroundColor: '#0f172a', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.14)', marginBottom: 16, ...cardShadow },
  heroGlowBlue: { position: 'absolute', top: -70, left: -10, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(37, 99, 235, 0.22)' },
  heroGlowSlate: { position: 'absolute', bottom: -110, right: -40, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(14, 165, 233, 0.12)' },
  pageEyebrow: { fontSize: 11, fontWeight: '800', color: '#bfdbfe', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8 },
  heroGrid: { flexDirection: width >= 1040 ? 'row' : 'column', gap: 18 },
  heroCopy: { flex: 1, maxWidth: width >= 1040 ? 680 : undefined },
  heroTitle: { fontSize: width >= 980 ? 34 : width >= 768 ? 30 : 25, lineHeight: width >= 980 ? 40 : width >= 768 ? 36 : 31, fontWeight: '800', color: '#ffffff', letterSpacing: -0.6 },
  heroSubtitle: { marginTop: 10, fontSize: 14, lineHeight: 22, color: '#cbd5e1', maxWidth: 680 },
  heroBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  heroBadgeText: { fontSize: 12, fontWeight: '700', color: '#e2e8f0' },
  heroActionRow: { flexDirection: width >= 640 ? 'row' : 'column', gap: 12, marginTop: 20 },
  heroPrimaryButton: { minHeight: 48, paddingHorizontal: 18, borderRadius: 14, backgroundColor: '#2563eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  heroPrimaryButtonText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  heroSecondaryButton: { minHeight: 48, paddingHorizontal: 18, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  heroSecondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  heroSpotlight: { flex: width >= 1040 ? 0.96 : undefined, minHeight: 360, borderRadius: 24, overflow: 'hidden', backgroundColor: '#1e293b', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  heroSpotlightImage: { ...StyleSheet.absoluteFillObject },
  heroSpotlightOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.28)' },
  heroSpotlightContent: { flex: 1, justifyContent: 'flex-end', padding: 18, backgroundColor: 'rgba(15,23,42,0.22)' },
  heroSpotlightPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', marginBottom: 12 },
  heroSpotlightPillText: { fontSize: 11, fontWeight: '700', color: '#f8fafc' },
  heroSpotlightTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: '#ffffff', marginBottom: 12, letterSpacing: -0.4 },
  heroSpotlightMeta: { fontSize: 13, lineHeight: 18, color: '#e2e8f0', marginBottom: 6 },
  heroSpotlightFooter: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  heroSpotlightPrice: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  heroSpotlightHelper: { marginTop: 4, fontSize: 12, color: '#cbd5e1' },
  heroSpotlightButton: { minHeight: 40, borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroSpotlightButtonText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  heroSpotlightEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  heroSpotlightEmptyTitle: { marginTop: 16, fontSize: 20, fontWeight: '800', color: '#ffffff' },
  heroSpotlightEmptyText: { marginTop: 8, fontSize: 13, lineHeight: 20, color: '#cbd5e1', textAlign: 'center' },
  noticeBanner: { marginBottom: 16, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', flexDirection: 'row', alignItems: 'center', gap: 10 },
  noticeBannerText: { flex: 1, fontSize: 13, lineHeight: 18, color: '#92400e', fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { width: width >= 1120 ? '24.2%' : width >= 760 ? '48.8%' : '100%', backgroundColor: '#ffffff', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#dbe4f3', ...cardShadow },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  statLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: '800', color: '#0f172a', letterSpacing: -0.6, marginBottom: 6 },
  statHelper: { fontSize: 13, lineHeight: 18, color: '#475569' },
  panel: { marginBottom: 16, borderRadius: 24, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4f3', padding: PANEL_PADDING, ...cardShadow },
  sectionHeader: { marginBottom: 16 },
  sectionEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionEyebrow: { fontSize: 10, fontWeight: '800', color: '#2563eb', letterSpacing: 0.9, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a', letterSpacing: -0.4 },
  sectionSubtitle: { marginTop: 6, fontSize: 13, lineHeight: 19, color: '#64748b' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: width >= 1120 ? '32.4%' : width >= 760 ? '48.8%' : '100%', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', padding: 16, minHeight: 150 },
  actionCardPrimary: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  actionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14, backgroundColor: '#dbeafe' },
  actionIconPrimary: { backgroundColor: 'rgba(255,255,255,0.16)' },
  actionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  actionTitlePrimary: { color: '#ffffff' },
  actionHelper: { marginTop: 8, fontSize: 12, lineHeight: 18, color: '#64748b' },
  actionHelperPrimary: { color: '#cbd5e1' },
  tabBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  tabCard: { flex: 1, minWidth: width < 720 ? '100%' : 0, borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tabCardActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  tabText: { flex: 1, fontSize: 14, fontWeight: '800', color: '#0f172a' },
  tabTextActive: { color: '#ffffff' },
  tabCount: { minWidth: 28, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4f3', textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#475569' },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.18)', color: '#ffffff' },
  ticketGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  ticketWrap: { width: width >= 1180 ? '49.5%' : '100%' },
  ticketCard: { borderRadius: 22, borderWidth: 1, borderColor: '#dbe4f3', backgroundColor: '#ffffff', overflow: 'hidden', ...cardShadow },
  ticketMedia: { position: 'relative', height: 220, backgroundColor: '#cbd5e1' },
  ticketImage: { width: '100%', height: '100%' },
  ticketOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.18)' },
  ticketBadgeRow: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  ticketBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  ticketBadgeText: { fontSize: 10, fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  statusBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  ticketBody: { padding: 18 },
  ticketTitle: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: '#0f172a', letterSpacing: -0.4 },
  ticketSubtitle: { marginTop: 10, fontSize: 13, lineHeight: 20, color: '#64748b' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  metaText: { flex: 1, fontSize: 13, lineHeight: 18, color: '#475569' },
  progressBox: { marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: '#475569' },
  progressValue: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: '#dbe4f3', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#2563eb' },
  ticketFooter: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  priceText: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  priceHelper: { marginTop: 4, fontSize: 12, lineHeight: 17, color: '#64748b' },
  ticketButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#dbe4f3', alignItems: 'center', justifyContent: 'center' },
  ticketButton: { minHeight: 40, borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#0f172a', flexDirection: 'row', alignItems: 'center', gap: 8 },
  ticketButtonText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  emptyState: { alignItems: 'center', justifyContent: 'center', minHeight: 320, paddingHorizontal: 24, paddingVertical: 28, borderRadius: 22, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  emptySubtitle: { marginTop: 10, maxWidth: 520, fontSize: 14, lineHeight: 22, color: '#64748b', textAlign: 'center' },
  emptyButton: { marginTop: 20, minHeight: 46, borderRadius: 14, paddingHorizontal: 18, backgroundColor: '#2563eb', flexDirection: 'row', alignItems: 'center', gap: 8 },
  emptyButtonText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.68)', justifyContent: 'center', alignItems: 'center', padding: width >= 768 ? 28 : 16 },
  modalCard: { width: '100%', maxWidth: 980, maxHeight: '92%', borderRadius: 28, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#dbe4f3', overflow: 'hidden', ...cardShadow },
  closeButton: { position: 'absolute', top: 16, right: 16, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  modalScroll: { flex: 1 },
  modalContent: { padding: 18 },
  modalHero: { position: 'relative', minHeight: 240, borderRadius: 22, overflow: 'hidden', backgroundColor: '#1e293b', marginBottom: 16 },
  modalHeroImage: { ...StyleSheet.absoluteFillObject },
  modalHeroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.34)' },
  modalHeroInner: { flex: 1, justifyContent: 'flex-end', padding: 20 },
  modalHeroBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  modalTitle: { fontSize: width >= 768 ? 28 : 24, lineHeight: width >= 768 ? 34 : 30, fontWeight: '800', color: '#ffffff', letterSpacing: -0.4 },
  modalSubtitle: { marginTop: 8, fontSize: 13, lineHeight: 20, color: '#dbeafe' },
  modalGrid: { flexDirection: width >= 980 ? 'row' : 'column', gap: 16 },
  modalPanel: { flex: 1, borderRadius: 22, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4f3', padding: 20, ...cardShadow },
  panelEyebrow: { fontSize: 10, fontWeight: '800', color: '#2563eb', letterSpacing: 0.8, textTransform: 'uppercase' },
  panelTitle: { marginTop: 8, fontSize: 22, lineHeight: 28, fontWeight: '800', color: '#0f172a' },
  panelText: { marginTop: 8, fontSize: 13, lineHeight: 20, color: '#64748b' },
  qrPanel: { alignSelf: 'center', marginTop: 18, padding: width >= 768 ? 28 : 20, borderRadius: 24, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4f3', ...cardShadow },
  codePanel: { marginTop: 16, borderRadius: 16, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', padding: 14, alignItems: 'center' },
  codeLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', letterSpacing: 0.8, textTransform: 'uppercase' },
  codeValue: { marginTop: 8, fontSize: 16, fontWeight: '800', color: '#0f172a', letterSpacing: 1, textAlign: 'center' },
  modalButtons: { flexDirection: width >= 640 ? 'row' : 'column', gap: 10, marginTop: 16 },
  modalPrimaryButton: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: '#2563eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  modalPrimaryButtonText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  modalSecondaryButton: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#dbe4f3', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  modalSecondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  detailList: { marginTop: 16, gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  detailIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  detailCopy: { flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7 },
  detailValue: { marginTop: 4, fontSize: 14, lineHeight: 19, color: '#0f172a', fontWeight: '700' },
  securityNote: { marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  securityNoteText: { flex: 1, fontSize: 12, lineHeight: 18, color: '#166534' },
});

export default MyTicketsScreen;
