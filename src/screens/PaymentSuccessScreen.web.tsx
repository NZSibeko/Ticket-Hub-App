import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { persistPurchasedTickets } from '../utils/purchasedTickets';

const { width } = Dimensions.get('window');

const PAGE_MAX_WIDTH = 1220;
const PAGE_PADDING = width >= 1280 ? 32 : width >= 768 ? 24 : 16;
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

const formatCurrency = (amount, currency = 'ZAR') => {
  try {
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-ZA', {
      style: 'currency',
      currency,
    }).format(Number(amount || 0));
  } catch (error) {
    return currency === 'USD'
      ? `$${Number(amount || 0).toFixed(2)}`
      : `R ${Number(amount || 0).toFixed(2)}`;
  }
};

const formatDateTime = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const PaymentSuccessScreen = ({ navigation, route }) => {
  const purchasedTickets = Array.isArray(route.params?.purchasedTickets)
    ? route.params.purchasedTickets
    : [];

  const bookingDetails = route.params?.bookingDetails || {
    bookingId: `BK${Date.now()}`,
    eventName: 'Live Event',
    ticketCount: 1,
    ticketType: 'General',
    eventDate: new Date().toISOString(),
    location: 'Venue TBC',
    totalAmount: 0,
    currency: 'ZAR',
    organizer: 'Ticket-Hub',
    imageUrl: '',
  };

  const [committingTickets, setCommittingTickets] = useState(purchasedTickets.length > 0);

  useEffect(() => {
    let isMounted = true;

    const commitTickets = async () => {
      if (!purchasedTickets.length) {
        if (isMounted) {
          setCommittingTickets(false);
        }
        return;
      }

      try {
        await persistPurchasedTickets(purchasedTickets);
      } finally {
        if (isMounted) {
          setCommittingTickets(false);
        }
      }
    };

    commitTickets();

    return () => {
      isMounted = false;
    };
  }, [purchasedTickets]);

  const confirmationCards = useMemo(
    () => [
      {
        label: 'Booking reference',
        value: bookingDetails.bookingId,
        helper: 'Use this reference for support and reconciliation.',
        icon: 'receipt-outline',
        bg: '#dbeafe',
        color: '#2563eb',
      },
      {
        label: 'Tickets issued',
        value: `${bookingDetails.ticketCount}`,
        helper: `${bookingDetails.ticketType} pass${bookingDetails.ticketCount === 1 ? '' : 'es'} confirmed.`,
        icon: 'ticket-outline',
        bg: '#dcfce7',
        color: '#15803d',
      },
      {
        label: 'Order total',
        value: formatCurrency(bookingDetails.totalAmount, bookingDetails.currency),
        helper: 'Final amount confirmed at checkout.',
        icon: 'cash-outline',
        bg: '#ffedd5',
        color: '#c2410c',
      },
    ],
    [bookingDetails]
  );

  const handleBrowseEvents = () => {
    try {
      navigation.navigate('BrowseEvents');
    } catch (error) {
      try {
        navigation.navigate('SearchEventsScreen');
      } catch (innerError) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'BrowseEvents' }],
        });
      }
    }
  };

  const handleViewTickets = async () => {
    if (purchasedTickets.length) {
      await persistPurchasedTickets(purchasedTickets);
    }

    const primaryTicket = purchasedTickets[0];
    const preferredTab =
      primaryTicket &&
      new Date(primaryTicket.event_date) >= new Date() &&
      primaryTicket.ticket_status !== 'CANCELLED'
        ? 'current'
        : 'history';

    try {
      navigation.navigate('MyTickets', {
        openTicketCode: primaryTicket?.ticket_code || primaryTicket?.ticket_id,
        preferredTab,
        refreshAt: Date.now(),
      });
    } catch (error) {
      navigation.navigate('MyTickets');
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.bgGlowBlue} />
      <View style={styles.bgGlowGreen} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageShell}>
          <View style={styles.heroCard}>
            <View style={styles.heroCopy}>
              <View style={styles.successBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                <Text style={styles.successBadgeText}>Purchase confirmed</Text>
              </View>

              <Text style={styles.heroTitle}>Your ticket order has been issued successfully.</Text>
              <Text style={styles.heroSubtitle}>
                The booking has been confirmed, the confirmation record is complete, and the issued tickets are being prepared for the customer workspace.
              </Text>

              <View style={styles.heroActions}>
                <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={handleViewTickets}>
                  <Ionicons name="ticket-outline" size={16} color="#ffffff" />
                  <Text style={styles.primaryButtonText}>View Ticket</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.9} onPress={handleBrowseEvents}>
                  <Ionicons name="search-outline" size={16} color="#ffffff" />
                  <Text style={styles.secondaryButtonText}>Browse More Tickets</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.heroVisual}>
              {bookingDetails.imageUrl ? (
                <Image source={{ uri: bookingDetails.imageUrl }} style={styles.heroImage} resizeMode="cover" />
              ) : (
                <View style={styles.heroImageFallback}>
                  <Ionicons name="image-outline" size={36} color="#d1fae5" />
                </View>
              )}
              <View style={styles.heroOverlay} />
              <View style={styles.heroVisualCopy}>
                <Text style={styles.heroVisualEyebrow}>Confirmed booking</Text>
                <Text style={styles.heroVisualTitle}>{bookingDetails.eventName}</Text>
                <Text style={styles.heroVisualMeta}>
                  {formatDateTime(bookingDetails.eventDate)} | {bookingDetails.location}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.metricGrid}>
            {confirmationCards.map((card) => (
              <View key={card.label} style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: card.bg }]}>
                  <Ionicons name={card.icon} size={18} color={card.color} />
                </View>
                <Text style={styles.metricLabel}>{card.label}</Text>
                <Text style={styles.metricValue}>{card.value}</Text>
                <Text style={styles.metricHelper}>{card.helper}</Text>
              </View>
            ))}
          </View>

          <View style={styles.contentGrid}>
            <View style={styles.primaryColumn}>
              <View style={styles.panel}>
                <Text style={styles.panelEyebrow}>Booking confirmation</Text>
                <Text style={styles.panelTitle}>Commercial summary</Text>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Event</Text>
                  <Text style={styles.summaryValue}>{bookingDetails.eventName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Booking ID</Text>
                  <Text style={styles.summaryValue}>{bookingDetails.bookingId}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Event date</Text>
                  <Text style={styles.summaryValue}>{formatDateTime(bookingDetails.eventDate)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Location</Text>
                  <Text style={styles.summaryValue}>{bookingDetails.location}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Ticket tier</Text>
                  <Text style={styles.summaryValue}>
                    {bookingDetails.ticketCount} x {bookingDetails.ticketType}
                  </Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                  <Text style={styles.summaryTotalLabel}>Total confirmed</Text>
                  <Text style={styles.summaryTotalValue}>
                    {formatCurrency(bookingDetails.totalAmount, bookingDetails.currency)}
                  </Text>
                </View>
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelEyebrow}>Issued records</Text>
                <Text style={styles.panelTitle}>Tickets prepared for My Tickets</Text>

                {committingTickets ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text style={styles.loadingRowText}>
                      Finalizing ticket records in the customer workspace...
                    </Text>
                  </View>
                ) : purchasedTickets.length ? (
                  purchasedTickets.slice(0, 4).map((ticket) => (
                    <View key={ticket.ticket_id} style={styles.ticketRecord}>
                      <View style={styles.ticketRecordIcon}>
                        <Ionicons name="qr-code-outline" size={16} color="#2563eb" />
                      </View>
                      <View style={styles.ticketRecordCopy}>
                        <Text style={styles.ticketRecordTitle}>{ticket.ticket_code}</Text>
                        <Text style={styles.ticketRecordSubtitle}>
                          {ticket.event_name} | {ticket.location}
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.panelText}>
                    The booking has been confirmed. Open My Tickets to review the newly issued passes.
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.sideColumn}>
              <View style={styles.panel}>
                <Text style={styles.panelEyebrow}>Next steps</Text>
                <Text style={styles.panelTitle}>What to do now</Text>

                <View style={styles.stepRow}>
                  <View style={styles.stepIcon}>
                    <Ionicons name="albums-outline" size={16} color="#2563eb" />
                  </View>
                  <Text style={styles.stepText}>Open My Tickets to review the exact pass that was just issued.</Text>
                </View>
                <View style={styles.stepRow}>
                  <View style={styles.stepIcon}>
                    <Ionicons name="search-outline" size={16} color="#2563eb" />
                  </View>
                  <Text style={styles.stepText}>Browse more official ticket inventory from the event search workspace.</Text>
                </View>
                <View style={styles.stepRow}>
                  <View style={styles.stepIcon}>
                    <Ionicons name="mail-outline" size={16} color="#2563eb" />
                  </View>
                  <Text style={styles.stepText}>Keep the booking reference available for support and follow-up if needed.</Text>
                </View>
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelEyebrow}>Actions</Text>
                <Text style={styles.panelTitle}>Continue from here</Text>
                <TouchableOpacity style={styles.actionButtonPrimary} activeOpacity={0.9} onPress={handleViewTickets}>
                  <Ionicons name="ticket-outline" size={16} color="#ffffff" />
                  <Text style={styles.actionButtonPrimaryText}>View Ticket</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} activeOpacity={0.9} onPress={handleBrowseEvents}>
                  <Ionicons name="search-outline" size={16} color="#0f172a" />
                  <Text style={styles.actionButtonText}>Browse More Tickets</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fb' },
  bgGlowBlue: { position: 'absolute', top: -120, left: -120, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(37, 99, 235, 0.08)' },
  bgGlowGreen: { position: 'absolute', top: 200, right: -120, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(22, 163, 74, 0.08)' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  pageShell: { width: '100%', maxWidth: PAGE_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: PAGE_PADDING, paddingTop: 22 },
  heroCard: { borderRadius: 28, padding: width >= 980 ? 28 : 20, backgroundColor: '#0f172a', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.14)', marginBottom: 16, flexDirection: width >= 1040 ? 'row' : 'column', gap: 18, ...cardShadow },
  heroCopy: { flex: 1, maxWidth: width >= 1040 ? 680 : undefined },
  successBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 14 },
  successBadgeText: { fontSize: 12, fontWeight: '800', color: '#166534', textTransform: 'uppercase', letterSpacing: 0.7 },
  heroTitle: { fontSize: width >= 980 ? 34 : width >= 768 ? 30 : 25, lineHeight: width >= 980 ? 40 : width >= 768 ? 36 : 31, fontWeight: '800', color: '#ffffff', letterSpacing: -0.6, maxWidth: 720 },
  heroSubtitle: { marginTop: 10, fontSize: 14, lineHeight: 22, color: '#cbd5e1', maxWidth: 680 },
  heroActions: { flexDirection: width >= 640 ? 'row' : 'column', gap: 12, marginTop: 20 },
  primaryButton: { minHeight: 48, paddingHorizontal: 18, borderRadius: 14, backgroundColor: '#16a34a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  secondaryButton: { minHeight: 48, paddingHorizontal: 18, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  heroVisual: { flex: width >= 1040 ? 0.95 : undefined, minHeight: 320, borderRadius: 24, overflow: 'hidden', backgroundColor: '#14532d', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroImageFallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#14532d' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20, 83, 45, 0.68)' },
  heroVisualCopy: { flex: 1, justifyContent: 'flex-end', padding: 18 },
  heroVisualEyebrow: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', fontSize: 11, fontWeight: '700', color: '#f8fafc', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 12 },
  heroVisualTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: '#ffffff', marginBottom: 8 },
  heroVisualMeta: { fontSize: 13, lineHeight: 18, color: '#dcfce7' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  metricCard: { width: width >= 1120 ? '32.4%' : '100%', backgroundColor: '#ffffff', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#dbe4f3', ...cardShadow },
  metricIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  metricLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  metricValue: { fontSize: 28, fontWeight: '800', color: '#0f172a', letterSpacing: -0.6, marginBottom: 6 },
  metricHelper: { fontSize: 13, lineHeight: 18, color: '#475569' },
  contentGrid: { flexDirection: width >= 1040 ? 'row' : 'column', gap: 12 },
  primaryColumn: { flex: width >= 1040 ? 1.05 : undefined, gap: 12 },
  sideColumn: { flex: width >= 1040 ? 0.95 : undefined, gap: 12 },
  panel: { borderRadius: 24, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4f3', padding: PANEL_PADDING, ...cardShadow },
  panelEyebrow: { fontSize: 10, fontWeight: '800', color: '#2563eb', letterSpacing: 0.8, textTransform: 'uppercase' },
  panelTitle: { marginTop: 8, fontSize: 22, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  panelText: { marginTop: 8, fontSize: 13, lineHeight: 20, color: '#64748b' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16 },
  summaryLabel: { flex: 1, fontSize: 14, color: '#64748b' },
  summaryValue: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a', textAlign: 'right' },
  summaryRowTotal: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  summaryTotalLabel: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  summaryTotalValue: { fontSize: 24, fontWeight: '800', color: '#16a34a', letterSpacing: -0.4 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  loadingRowText: { fontSize: 13, lineHeight: 19, color: '#475569' },
  ticketRecord: { marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  ticketRecordIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  ticketRecordCopy: { flex: 1 },
  ticketRecordTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  ticketRecordSubtitle: { marginTop: 4, fontSize: 12, lineHeight: 18, color: '#64748b' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 16 },
  stepIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#475569' },
  actionButtonPrimary: { marginTop: 18, minHeight: 46, borderRadius: 14, backgroundColor: '#0f172a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionButtonPrimaryText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  actionButton: { marginTop: 10, minHeight: 46, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#dbe4f3', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionButtonText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
});

export default PaymentSuccessScreen;
