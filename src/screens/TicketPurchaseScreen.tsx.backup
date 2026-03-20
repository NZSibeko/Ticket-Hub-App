import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

const { width } = Dimensions.get('window');

const PAGE_MAX_WIDTH = 1180;
const PAGE_PADDING = width >= 1280 ? 32 : width >= 768 ? 24 : 16;
const HERO_PADDING = width >= 980 ? 28 : 20;
const PANEL_PADDING = width >= 768 ? 20 : 16;

const cardShadow = Platform.select({
  web: {
    boxShadow: '0 18px 34px -26px rgba(15, 23, 42, 0.2)',
  },
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

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatTime = (value) =>
  new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

const getAvailableQuantity = (selectedTicketType) => {
  if (!selectedTicketType) return 0;

  const available =
    selectedTicketType?.available_quantity ??
    selectedTicketType?.available ??
    selectedTicketType?.max_quantity ??
    0;

  return available > 0 ? Number(available) : 10;
};

const getTicketLabel = (selectedTicketType) => {
  const rawLabel = selectedTicketType?.label || selectedTicketType?.type || 'General';
  return rawLabel
    .toString()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const TicketPurchaseScreen = ({ route, navigation }) => {
  const { event, ticketType } = route.params || {};
  const [quantity, setQuantity] = useState(1);

  const availableQuantity = getAvailableQuantity(ticketType);
  const unitPrice = Number(ticketType?.price ?? event?.price ?? 0);
  const totalAmount = unitPrice * quantity;
  const ticketLabel = getTicketLabel(ticketType);
  const eventArtwork =
    event?.display_artwork ||
    event?.image_url ||
    event?.event_image ||
    event?.image ||
    '';

  const purchaseMetrics = useMemo(
    () => [
      {
        label: 'Ticket class',
        value: ticketLabel,
        helper: 'Selected admission tier',
        icon: 'ticket-outline',
        bg: '#dbeafe',
        color: '#2563eb',
      },
      {
        label: 'Unit price',
        value: formatCurrency(unitPrice, event?.currency || 'ZAR'),
        helper: 'Face value per ticket',
        icon: 'cash-outline',
        bg: '#ffedd5',
        color: '#c2410c',
      },
      {
        label: 'Available now',
        value: `${availableQuantity}`,
        helper: availableQuantity <= 5 ? 'Limited remaining allocation' : 'Inventory currently open',
        icon: 'albums-outline',
        bg: '#dcfce7',
        color: '#15803d',
      },
    ],
    [availableQuantity, event?.currency, ticketLabel, unitPrice]
  );

  const handleContinue = () => {
    if (!quantity || quantity < 1) {
      Alert.alert('Invalid Quantity', 'Please select at least 1 ticket.');
      return;
    }

    navigation.navigate('Payment', {
      event,
      ticketType,
      quantity,
      totalAmount,
    });
  };

  if (!event || !ticketType) {
    return (
      <ScreenContainer style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
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
      >
        <View style={styles.pageShell}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.headerButton}
              activeOpacity={0.9}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={18} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.headerLabel}>Ticket purchase workspace</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.heroShell}>
            <View style={styles.heroGlowBlue} />
            <View style={styles.heroGlowSlate} />
            <View style={styles.heroGrid}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>Checkout preview</Text>
                <Text style={styles.heroTitle}>Review your event access before payment.</Text>
                <Text style={styles.heroSubtitle}>
                  Confirm the ticket tier, quantity, and total amount from a single enterprise-ready purchase workspace before moving into payment.
                </Text>

                <View style={styles.heroBadgeRow}>
                  <View style={styles.heroBadge}>
                    <Ionicons name="shield-checkmark-outline" size={14} color="#dbeafe" />
                    <Text style={styles.heroBadgeText}>Verified event listing</Text>
                  </View>
                  <View style={styles.heroBadge}>
                    <Ionicons name="qr-code-outline" size={14} color="#dbeafe" />
                    <Text style={styles.heroBadgeText}>Digital ticket issuance</Text>
                  </View>
                </View>

                <View style={styles.heroMetaPanel}>
                  <View style={styles.heroMetaRow}>
                    <Ionicons name="calendar-outline" size={14} color="#dbeafe" />
                    <Text style={styles.heroMetaText}>
                      {formatDate(event.start_date)} at {formatTime(event.start_date)}
                    </Text>
                  </View>
                  <View style={styles.heroMetaRow}>
                    <Ionicons name="location-outline" size={14} color="#dbeafe" />
                    <Text style={styles.heroMetaText}>{event.location}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.heroSpotlight}>
                {eventArtwork ? (
                  <Image
                    source={{ uri: eventArtwork }}
                    style={styles.heroImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.heroImageFallback}>
                    <Ionicons name="image-outline" size={34} color="#cbd5e1" />
                  </View>
                )}
                <View style={styles.heroImageOverlay} />
                <View style={styles.heroSpotlightContent}>
                  <Text style={styles.heroSpotlightLabel}>Selected event</Text>
                  <Text style={styles.heroEventName}>{event.event_name}</Text>
                  <Text style={styles.heroTicketType}>{ticketLabel}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.metricGrid}>
            {purchaseMetrics.map((metric) => (
              <View key={metric.label} style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: metric.bg }]}>
                  <Ionicons name={metric.icon} size={18} color={metric.color} />
                </View>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <Text style={styles.metricValue}>{metric.value}</Text>
                <Text style={styles.metricHelper}>{metric.helper}</Text>
              </View>
            ))}
          </View>

          <View style={styles.contentGrid}>
            <View style={styles.primaryColumn}>
              <View style={styles.panel}>
                <Text style={styles.panelEyebrow}>Quantity control</Text>
                <Text style={styles.panelTitle}>Set the number of tickets</Text>
                <Text style={styles.panelSubtitle}>
                  Adjust the quantity within the live availability allocated to this ticket type.
                </Text>

                <View style={styles.quantityShell}>
                  <TouchableOpacity
                    style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
                    activeOpacity={0.9}
                    onPress={() => setQuantity((current) => Math.max(1, current - 1))}
                    disabled={quantity <= 1}
                  >
                    <Ionicons name="remove" size={20} color={quantity <= 1 ? '#94a3b8' : '#0f172a'} />
                  </TouchableOpacity>

                  <View style={styles.quantityDisplay}>
                    <Text style={styles.quantityValue}>{quantity}</Text>
                    <Text style={styles.quantityHelper}>ticket{quantity === 1 ? '' : 's'}</Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.quantityButton,
                      quantity >= availableQuantity && styles.quantityButtonDisabled,
                    ]}
                    activeOpacity={0.9}
                    onPress={() => setQuantity((current) => Math.min(availableQuantity, current + 1))}
                    disabled={quantity >= availableQuantity}
                  >
                    <Ionicons
                      name="add"
                      size={20}
                      color={quantity >= availableQuantity ? '#94a3b8' : '#0f172a'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelEyebrow}>Commercial summary</Text>
                <Text style={styles.panelTitle}>Order breakdown</Text>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Event</Text>
                  <Text style={styles.summaryValue}>{event.event_name}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Ticket tier</Text>
                  <Text style={styles.summaryValue}>{ticketLabel}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Unit price</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(unitPrice, event.currency || 'ZAR')}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Quantity</Text>
                  <Text style={styles.summaryValue}>{quantity}</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                  <Text style={styles.summaryTotalLabel}>Total amount</Text>
                  <Text style={styles.summaryTotalValue}>
                    {formatCurrency(totalAmount, event.currency || 'ZAR')}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.sideColumn}>
              <View style={styles.panel}>
                <Text style={styles.panelEyebrow}>Included in this booking</Text>
                <Text style={styles.panelTitle}>What happens next</Text>

                <View style={styles.stepRow}>
                  <View style={styles.stepIcon}>
                    <Ionicons name="card-outline" size={16} color="#2563eb" />
                  </View>
                  <Text style={styles.stepText}>Continue to payment and confirm this ticket order securely.</Text>
                </View>
                <View style={styles.stepRow}>
                  <View style={styles.stepIcon}>
                    <Ionicons name="mail-outline" size={16} color="#2563eb" />
                  </View>
                  <Text style={styles.stepText}>A booking confirmation and event summary will be issued immediately after payment.</Text>
                </View>
                <View style={styles.stepRow}>
                  <View style={styles.stepIcon}>
                    <Ionicons name="scan-outline" size={16} color="#2563eb" />
                  </View>
                  <Text style={styles.stepText}>Digital passes remain ready for the final confirmation workflow on the success screen.</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footerBar}>
        <View>
          <Text style={styles.footerLabel}>Amount due</Text>
          <Text style={styles.footerValue}>
            {formatCurrency(totalAmount, event.currency || 'ZAR')}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.confirmButton, availableQuantity <= 0 && styles.confirmButtonDisabled]}
          activeOpacity={0.9}
          onPress={handleContinue}
          disabled={availableQuantity <= 0}
        >
          <Text style={styles.confirmButtonText}>Continue to payment</Text>
          <Ionicons name="arrow-forward" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fb' },
  pageGlowBlue: {
    position: 'absolute',
    top: -120,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  pageGlowSlate: {
    position: 'absolute',
    top: 180,
    right: -120,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 124 },
  pageShell: {
    width: '100%',
    maxWidth: PAGE_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 22,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4f3',
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  headerLabel: { fontSize: 14, fontWeight: '700', color: '#475569' },
  headerSpacer: { width: 42 },
  heroShell: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 28,
    padding: HERO_PADDING,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
    marginBottom: 16,
    ...cardShadow,
  },
  heroGlowBlue: {
    position: 'absolute',
    top: -70,
    left: -10,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
  },
  heroGlowSlate: {
    position: 'absolute',
    bottom: -110,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
  },
  heroGrid: { flexDirection: width >= 1040 ? 'row' : 'column', gap: 18 },
  heroCopy: { flex: 1, maxWidth: width >= 1040 ? 640 : undefined },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#bfdbfe',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: width >= 980 ? 34 : width >= 768 ? 30 : 25,
    lineHeight: width >= 980 ? 40 : width >= 768 ? 36 : 31,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.6,
    maxWidth: 620,
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: '#cbd5e1',
    maxWidth: 620,
  },
  heroBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  heroBadgeText: { fontSize: 12, fontWeight: '700', color: '#e2e8f0' },
  heroMetaPanel: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 16,
    gap: 10,
  },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroMetaText: { flex: 1, fontSize: 13, lineHeight: 18, color: '#e2e8f0' },
  heroSpotlight: {
    flex: width >= 1040 ? 0.96 : undefined,
    minHeight: 300,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroImageFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
  },
  heroImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
  },
  heroSpotlightContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 18,
  },
  heroSpotlightLabel: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    fontSize: 11,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  heroEventName: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  heroTicketType: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dbeafe',
  },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  metricCard: {
    width: width >= 1120 ? '32.4%' : '100%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#dbe4f3',
    ...cardShadow,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  metricLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  metricHelper: { fontSize: 13, lineHeight: 18, color: '#475569' },
  contentGrid: { flexDirection: width >= 1040 ? 'row' : 'column', gap: 12 },
  primaryColumn: { flex: width >= 1040 ? 1.08 : undefined, gap: 12 },
  sideColumn: { flex: width >= 1040 ? 0.92 : undefined, gap: 12 },
  panel: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4f3',
    padding: PANEL_PADDING,
    ...cardShadow,
  },
  panelEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  panelTitle: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  panelSubtitle: { marginTop: 8, fontSize: 13, lineHeight: 19, color: '#64748b' },
  quantityShell: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  quantityButton: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe4f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonDisabled: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  quantityDisplay: { minWidth: 120, alignItems: 'center' },
  quantityValue: {
    fontSize: 42,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -1,
  },
  quantityHelper: { marginTop: 4, fontSize: 13, color: '#64748b' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  summaryLabel: { flex: 1, fontSize: 14, color: '#64748b' },
  summaryValue: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a', textAlign: 'right' },
  summaryRowTotal: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  summaryTotalLabel: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  summaryTotalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 16 },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#475569' },
  footerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: PAGE_PADDING,
    paddingTop: 14,
    paddingBottom: 22,
    backgroundColor: 'rgba(244,247,251,0.96)',
    borderTopWidth: 1,
    borderTopColor: '#dbe4f3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  footerLabel: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  footerValue: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  confirmButton: {
    minWidth: 230,
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 18,
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  confirmButtonDisabled: { opacity: 0.55 },
  confirmButtonText: { fontSize: 15, fontWeight: '800', color: '#ffffff' },
});

export default TicketPurchaseScreen;
