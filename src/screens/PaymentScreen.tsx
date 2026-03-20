import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';
import { buildPurchasedTicketBatch } from '../utils/purchasedTickets';

const { width } = Dimensions.get('window');
const PAGE_PADDING = width >= 1280 ? 32 : width >= 768 ? 24 : 16;
const PAGE_MAX_WIDTH = 1180;
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

const formatCurrency = (amount, currency = 'USD') => {
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

const getTicketLabel = (ticketType) =>
  (ticketType?.label || ticketType?.type || 'General')
    .toString()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());

const EMPTY_CARD = {
  cardNumber: '',
  expiry: '',
  cvc: '',
  name: '',
};

const PaymentScreen = ({ route, navigation }) => {
  const { event, ticketType, quantity = 1, totalAmount: routeTotalAmount } = route.params || {};
  const { user, getAuthHeader, apiBaseUrl, getApiBaseUrl } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cardDetails, setCardDetails] = useState(EMPTY_CARD);

  const selectedTicketType = {
    type: ticketType?.type || 'general',
    label: getTicketLabel(ticketType),
    price: Number(ticketType?.price ?? event?.price ?? 0),
  };
  const currency = event?.currency || 'USD';
  const unitPrice = Number(selectedTicketType.price || event?.price || 0);
  const totalAmount = Number(routeTotalAmount ?? unitPrice * quantity);
  const customerId = user?.customer_id || user?.id;
  const eventArtwork =
    event?.display_artwork ||
    event?.image_url ||
    event?.event_image ||
    event?.image ||
    '';

  const formatCardNumber = (text) => {
    const cleaned = text.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substr(0, 19);
  };

  const formatExpiry = (text) => {
    const cleaned = text.replace(/\//g, '');
    if (cleaned.length >= 2) return `${cleaned.substr(0, 2)}/${cleaned.substr(2, 2)}`;
    return cleaned;
  };

  const finalizeSuccess = (bookingPrefix) => {
    const bookingId = `${bookingPrefix}${Date.now()}`;
    const purchaseBatch = buildPurchasedTicketBatch({
      event,
      ticketType: selectedTicketType,
      quantity,
      user,
      bookingId,
    });

    navigation.navigate('PaymentSuccess', {
      bookingDetails: {
        ...purchaseBatch.bookingDetails,
        totalAmount,
        currency,
      },
      purchasedTickets: purchaseBatch.purchasedTickets,
    });
  };

  const runLivePayment = async () => {
    if (!cardDetails.cardNumber || !cardDetails.expiry || !cardDetails.cvc || !cardDetails.name) {
      Alert.alert('Error', 'Please fill in all card details');
      return;
    }

    if (!event || !customerId) {
      Alert.alert('Payment unavailable', 'Please sign in and reselect your tickets.');
      return;
    }

    setLoading(true);
    try {
      const headers = typeof getAuthHeader === 'function' ? await getAuthHeader() : {};
      const baseUrl =
        apiBaseUrl || (typeof getApiBaseUrl === 'function' ? await getApiBaseUrl() : '');

      if (!baseUrl) {
        Alert.alert('Payment unavailable', 'Payment service is not configured yet.');
        return;
      }
      const paymentIntentResponse = await axios.post(
        `${baseUrl}/api/payments/create-payment-intent`,
        { amount: totalAmount, currency, eventId: event.event_id, customerId },
        { headers }
      );

      const { paymentIntentId } = paymentIntentResponse.data;

      const confirmResponse = await axios.post(
        `${baseUrl}/api/payments/confirm-payment`,
        {
          paymentIntentId,
          eventId: event.event_id,
          customerId,
          price: totalAmount,
          currency,
          quantity,
          ticketType: selectedTicketType.type,
        },
        { headers }
      );

      if (confirmResponse.data.success) {
        finalizeSuccess('BK');
      } else {
        Alert.alert('Payment Failed', 'Live payment could not be confirmed right now.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(
        'Payment unavailable',
        'The payment gateway could not be reached. Please try again shortly.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    runLivePayment();
  };

  if (!event) {
    return (
      <ScreenContainer style={styles.container}>
        <View style={styles.loadingState}>
          <Text style={styles.loadingTitle}>Payment details unavailable</Text>
          <Text style={styles.loadingCopy}>Please return to search and select a ticket again.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.bgGlowBlue} />
      <View style={styles.bgGlowSlate} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.pageShell}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.headerButton} activeOpacity={0.9} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={18} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.headerLabel}>Payment workspace</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroCopy}>
              <View style={styles.modeBadge}>
                <Ionicons name="shield-checkmark-outline" size={15} color="#166534" />
                <Text style={styles.modeBadgeText}>Live gateway active</Text>
              </View>
              <Text style={styles.heroTitle}>Confirm payment with a secure, production-ready checkout.</Text>
              <Text style={styles.heroSubtitle}>
                Your card details are encrypted and processed through the live payment gateway configured for Ticket Hub.
              </Text>
              <View style={styles.heroMeta}>
                <Text style={styles.heroMetaText}>{formatDate(event.start_date)}</Text>
                <Text style={styles.heroMetaDot}>•</Text>
                <Text style={styles.heroMetaText}>{quantity} x {selectedTicketType.label}</Text>
                <Text style={styles.heroMetaDot}>•</Text>
                <Text style={styles.heroMetaText}>{formatCurrency(totalAmount, currency)}</Text>
              </View>
            </View>

            <View style={styles.heroVisual}>
              {eventArtwork ? <Image source={{ uri: eventArtwork }} style={styles.heroImage} resizeMode="cover" /> : <View style={styles.heroImageFallback}><Ionicons name="image-outline" size={32} color="#cbd5e1" /></View>}
              <View style={styles.heroOverlay} />
              <View style={styles.heroVisualCopy}>
                <Text style={styles.heroVisualEyebrow}>Order preview</Text>
                <Text style={styles.heroVisualTitle}>{event.event_name}</Text>
                <Text style={styles.heroVisualMeta}>{event.location}</Text>
              </View>
            </View>
          </View>

          <View style={styles.contentGrid}>
            <View style={styles.mainColumn}>
              <View style={styles.panel}>
                <Text style={styles.panelEyebrow}>Payment gateway</Text>
                <Text style={styles.panelTitle}>Live checkout enabled</Text>
                <Text style={styles.panelCopy}>
                  Payments are processed securely through the configured live gateway. Confirm your card details before
                  submitting the charge.
                </Text>
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelEyebrow}>Card details</Text>
                <Text style={styles.panelTitle}>Payment information</Text>
                <View style={styles.inputStack}>
                  <View>
                    <Text style={styles.inputLabel}>Cardholder name</Text>
                    <TextInput style={styles.input} placeholder="John Doe" placeholderTextColor="#94a3b8" value={cardDetails.name} onChangeText={(text) => setCardDetails({ ...cardDetails, name: text })} editable={!loading} />
                  </View>
                  <View>
                    <Text style={styles.inputLabel}>Card number</Text>
                    <TextInput style={styles.input} placeholder="1234 5678 9012 3456" placeholderTextColor="#94a3b8" value={cardDetails.cardNumber} onChangeText={(text) => setCardDetails({ ...cardDetails, cardNumber: formatCardNumber(text) })} keyboardType="numeric" maxLength={19} editable={!loading} />
                  </View>
                  <View style={styles.inputRow}>
                    <View style={styles.inputRowItem}>
                      <Text style={styles.inputLabel}>Expiry</Text>
                      <TextInput style={styles.input} placeholder="MM/YY" placeholderTextColor="#94a3b8" value={cardDetails.expiry} onChangeText={(text) => setCardDetails({ ...cardDetails, expiry: formatExpiry(text) })} keyboardType="numeric" maxLength={5} editable={!loading} />
                    </View>
                    <View style={styles.inputRowItem}>
                      <Text style={styles.inputLabel}>CVC</Text>
                      <TextInput style={styles.input} placeholder="123" placeholderTextColor="#94a3b8" value={cardDetails.cvc} onChangeText={(text) => setCardDetails({ ...cardDetails, cvc: text.replace(/[^0-9]/g, '') })} keyboardType="numeric" maxLength={4} secureTextEntry editable={!loading} />
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.sideColumn}>
              <View style={styles.panel}>
                <Text style={styles.panelEyebrow}>Order summary</Text>
                <Text style={styles.panelTitle}>Settlement snapshot</Text>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Event</Text><Text style={styles.summaryValue}>{event.event_name}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Location</Text><Text style={styles.summaryValue}>{event.location}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Ticket tier</Text><Text style={styles.summaryValue}>{selectedTicketType.label}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Quantity</Text><Text style={styles.summaryValue}>{quantity}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Unit price</Text><Text style={styles.summaryValue}>{formatCurrency(unitPrice, currency)}</Text></View>
                <View style={[styles.summaryRow, styles.summaryRowTotal]}><Text style={styles.summaryTotalLabel}>Total amount</Text><Text style={styles.summaryTotalValue}>{formatCurrency(totalAmount, currency)}</Text></View>
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelEyebrow}>Readiness</Text>
                <Text style={styles.panelTitle}>What happens after payment</Text>
                <View style={styles.stepRow}><View style={styles.stepIcon}><Ionicons name="checkmark-done-outline" size={16} color="#2563eb" /></View><Text style={styles.stepText}>The order moves directly to the success confirmation workflow.</Text></View>
                <View style={styles.stepRow}><View style={styles.stepIcon}><Ionicons name="mail-outline" size={16} color="#2563eb" /></View><Text style={styles.stepText}>A booking reference is generated for testing, tracking, and handoff.</Text></View>
                <View style={styles.stepRow}><View style={styles.stepIcon}><Ionicons name="shield-checkmark-outline" size={16} color="#2563eb" /></View><Text style={styles.stepText}>Payments are confirmed by the live gateway before tickets are issued.</Text></View>
              </View>
            </View>
          </View>

          <View style={styles.ctaBar}>
            <View>
              <Text style={styles.ctaLabel}>Amount due</Text>
              <Text style={styles.ctaValue}>{formatCurrency(totalAmount, currency)}</Text>
            </View>
            <TouchableOpacity style={[styles.confirmButton, loading && styles.confirmButtonDisabled]} activeOpacity={0.9} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="#ffffff" /> : <>
                <Text style={styles.confirmButtonText}>Submit payment</Text>
                <Ionicons name="arrow-forward" size={18} color="#ffffff" />
              </>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fb' },
  bgGlowBlue: { position: 'absolute', top: -120, left: -120, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(37, 99, 235, 0.08)' },
  bgGlowSlate: { position: 'absolute', top: 180, right: -120, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(15, 23, 42, 0.05)' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  pageShell: { width: '100%', maxWidth: PAGE_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: PAGE_PADDING, paddingTop: 22 },
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  loadingTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  loadingCopy: { marginTop: 12, fontSize: 14, lineHeight: 22, color: '#64748b', textAlign: 'center', maxWidth: 420 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4f3', alignItems: 'center', justifyContent: 'center', ...cardShadow },
  headerLabel: { fontSize: 14, fontWeight: '700', color: '#475569' },
  headerSpacer: { width: 42 },
  heroCard: { borderRadius: 28, padding: width >= 980 ? 28 : 20, backgroundColor: '#0f172a', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.14)', marginBottom: 16, flexDirection: width >= 1040 ? 'row' : 'column', gap: 18, ...cardShadow },
  heroCopy: { flex: 1, maxWidth: width >= 1040 ? 680 : undefined },
  modeBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#dbe4f3', marginBottom: 14 },
  modeBadgeText: { fontSize: 12, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.7 },
  heroTitle: { fontSize: width >= 980 ? 34 : width >= 768 ? 30 : 25, lineHeight: width >= 980 ? 40 : width >= 768 ? 36 : 31, fontWeight: '800', color: '#ffffff', letterSpacing: -0.6, maxWidth: 720 },
  heroSubtitle: { marginTop: 10, fontSize: 14, lineHeight: 22, color: '#cbd5e1', maxWidth: 680 },
  heroMeta: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  heroMetaText: { fontSize: 13, fontWeight: '600', color: '#e2e8f0' },
  heroMetaDot: { fontSize: 12, color: '#94a3b8' },
  heroVisual: { flex: width >= 1040 ? 0.95 : undefined, minHeight: 320, borderRadius: 24, overflow: 'hidden', backgroundColor: '#14532d', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroImageFallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e293b' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20, 83, 45, 0.62)' },
  heroVisualCopy: { flex: 1, justifyContent: 'flex-end', padding: 18 },
  heroVisualEyebrow: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', fontSize: 11, fontWeight: '700', color: '#f8fafc', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 12 },
  heroVisualTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: '#ffffff', marginBottom: 8 },
  heroVisualMeta: { fontSize: 13, lineHeight: 18, color: '#dcfce7' },
  contentGrid: { flexDirection: width >= 1040 ? 'row' : 'column', gap: 12 },
  mainColumn: { flex: width >= 1040 ? 1.04 : undefined, gap: 12 },
  sideColumn: { flex: width >= 1040 ? 0.96 : undefined, gap: 12 },
  panel: { borderRadius: 24, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4f3', padding: width >= 768 ? 20 : 16, ...cardShadow },
  panelEyebrow: { fontSize: 10, fontWeight: '800', color: '#2563eb', letterSpacing: 0.8, textTransform: 'uppercase' },
  panelTitle: { marginTop: 8, fontSize: 22, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  panelCopy: { marginTop: 12, fontSize: 13, lineHeight: 20, color: '#475569' },
  modeSwitch: { flexDirection: width >= 720 ? 'row' : 'column', gap: 10, marginTop: 18 },
  modeButton: { flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#dbe4f3', alignItems: 'center', justifyContent: 'center' },
  modeButtonActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  modeButtonText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  modeButtonTextActive: { color: '#ffffff' },
  inputStack: { marginTop: 18, gap: 14 },
  inputLabel: { marginBottom: 8, fontSize: 13, fontWeight: '700', color: '#334155' },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: '#dbe4f3', backgroundColor: '#f8fafc', paddingHorizontal: 14, fontSize: 15, color: '#0f172a' },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputRowItem: { flex: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16 },
  summaryLabel: { flex: 1, fontSize: 14, color: '#64748b' },
  summaryValue: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a', textAlign: 'right' },
  summaryRowTotal: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  summaryTotalLabel: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  summaryTotalValue: { fontSize: 24, fontWeight: '800', color: '#16a34a', letterSpacing: -0.4 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 16 },
  stepIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#475569' },
  ctaBar: { marginTop: 16, borderRadius: 24, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4f3', padding: width >= 768 ? 20 : 16, flexDirection: width >= 900 ? 'row' : 'column', alignItems: width >= 900 ? 'center' : 'stretch', justifyContent: 'space-between', gap: 14, ...cardShadow },
  ctaLabel: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  ctaValue: { marginTop: 4, fontSize: 24, fontWeight: '800', color: '#0f172a', letterSpacing: -0.4 },
  confirmButton: { minHeight: 54, borderRadius: 16, paddingHorizontal: 18, backgroundColor: '#0f172a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  confirmButtonDisabled: { opacity: 0.7 },
  confirmButtonText: { fontSize: 15, fontWeight: '800', color: '#ffffff' },
});

export default PaymentScreen;
