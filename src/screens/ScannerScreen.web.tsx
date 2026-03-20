import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrlSync } from '../utils/apiBase';

const USED_KEY = 'scanner-web:used';
const HISTORY_KEY = 'scanner-web:history';
const EVENTS = [
  { id: 'sum26', name: 'Summer Music Festival', venue: 'Cape Town Stadium', gate: 'North Gate A', start: '2026-04-18T18:00:00Z', expected: 1200, cleared: 846 },
  { id: 'tec26', name: 'Tech Innovation Summit', venue: 'Sandton Convention Centre', gate: 'West Registration', start: '2026-05-14T09:00:00Z', expected: 1000, cleared: 312 },
  { id: 'jaz26', name: 'Jazz and Wine Evening', venue: 'V&A Waterfront Ballroom', gate: 'Premium Entry', start: '2026-06-05T19:30:00Z', expected: 250, cleared: 94 }
];
const TICKETS = {
  'SUM26-A14-0001': { attendee: 'Amahle Dlamini', seat: 'A14', tier: 'VIP Hospitality', eventId: 'sum26', status: 'active', risk: 'low' },
  'SUM26-B03-0042': { attendee: 'Lethabo Nkosi', seat: 'B03', tier: 'Golden Circle', eventId: 'sum26', status: 'active', risk: 'low' },
  'SUM26-X99-0998': { attendee: 'Manual Review Guest', seat: 'X99', tier: 'Transfer Hold', eventId: 'sum26', status: 'active', risk: 'high', flags: ['Issuer signature mismatch', 'Screenshot replay suspected'] },
  'SUM26-VOID-7711': { attendee: 'Refunded Booking', seat: 'N/A', tier: 'General Admission', eventId: 'sum26', status: 'void', risk: 'critical', flags: ['Payment reversal confirmed', 'Ticket invalidated in settlement'] },
  'TEC26-C21-1204': { attendee: 'Reabetswe Naidoo', seat: 'Hall C / 21', tier: 'Executive', eventId: 'tec26', status: 'active', risk: 'low' },
  'JAZ26-P01-4401': { attendee: 'Thandi Mokoena', seat: 'Table P01', tier: 'Premium Table', eventId: 'jaz26', status: 'active', risk: 'low' }
};
const STATUS_META = {
  approved: { label: 'Entry approved', icon: 'checkmark-circle', color: '#15803D', surface: '#DCFCE7', border: '#86EFAC' },
  duplicate: { label: 'QR already used', icon: 'alert-circle', color: '#B45309', surface: '#FEF3C7', border: '#FCD34D' },
  review: { label: 'Manual review', icon: 'shield-half', color: '#0F766E', surface: '#CCFBF1', border: '#5EEAD4' },
  fraud: { label: 'Fraud hold', icon: 'warning', color: '#B91C1C', surface: '#FEE2E2', border: '#FCA5A5' }
};

const formatDateTime = (value) => new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const formatTime = (value) => new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
const loadStore = (key, fallback) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) || JSON.stringify(fallback));
  } catch (error) {
    return fallback;
  }
};
const saveStore = (key, value) => { if (Platform.OS === 'web' && typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value)); };
const parsePayload = (payload) => {
  const raw = typeof payload === 'string' ? payload.trim() : String(payload?.data || '').trim();
  let parsed = null;
  if (raw.startsWith('{')) try { parsed = JSON.parse(raw); } catch (error) {}
  return { raw, code: String(parsed?.ticketCode || parsed?.ticket_code || parsed?.code || parsed?.qr || raw || '').trim().toUpperCase(), eventId: parsed?.eventId || parsed?.event_id || null };
};

const ScannerScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const { user, getAuthHeader } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [selectedEventId, setSelectedEventId] = useState(EVENTS[0].id);
  const [manualCode, setManualCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [usedLedger, setUsedLedger] = useState({});
  const [deskNote, setDeskNote] = useState('Entry control is live. Choose an event desk and begin validation.');

  const currentEvent = EVENTS.find((event) => event.id === selectedEventId) || EVENTS[0];
  const operator = user?.first_name || user?.name || user?.username || user?.email?.split('@')[0] || 'Operations Desk';
  const isWide = width >= 1180;
  const approvedCount = history.filter((entry) => entry.status === 'approved').length;
  const duplicateCount = history.filter((entry) => entry.status === 'duplicate').length;
  const riskCount = history.filter((entry) => entry.status === 'review' || entry.status === 'fraud').length;

  useEffect(() => { if (permission && !permission.granted && permission.canAskAgain) requestPermission(); }, [permission]);
  useEffect(() => { setUsedLedger(loadStore(USED_KEY, {})); setHistory(loadStore(HISTORY_KEY, [])); }, []);
  useEffect(() => saveStore(USED_KEY, usedLedger), [usedLedger]);
  useEffect(() => saveStore(HISTORY_KEY, history.slice(0, 10)), [history]);

  const resetLane = () => {
    setProcessing(false);
    setLocked(false);
    setManualCode('');
    setResult(null);
    setDeskNote(`Lane clear. ${currentEvent.name} at ${currentEvent.gate} is ready for the next guest.`);
  };

  const openPayload = (entry) => {
    if (entry) Alert.alert('Payload Inspection', entry.raw || 'No payload available');
  };

  const openBrief = (entry) => {
    if (!entry) return;
    Alert.alert(
      'Attendee Brief',
      `Guest: ${entry.attendee}\nTicket: ${entry.code}\nTier: ${entry.tier}\nSeat: ${entry.seat}\nEvent: ${entry.eventName}\nScanned: ${formatDateTime(entry.scannedAt)}`
    );
  };

  const validateTicket = async (payload, source = 'camera') => {
    const parsed = parsePayload(payload);
    if (!parsed.code) return Alert.alert('Missing code', 'Capture or paste a QR payload before validating.');
    setLocked(true);
    setProcessing(true);
    setDeskNote(`Running integrity checks for ${parsed.code} at ${currentEvent.gate}.`);

    const now = new Date().toISOString();
    try {
      const baseUrl = getApiBaseUrlSync() || (typeof window !== 'undefined' ? window.location.origin : '');
      const headers = getAuthHeader ? getAuthHeader() : {};
      const response = await fetch(`${baseUrl}/api/payments/tickets/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          ticket_code: parsed.code,
          event_id: parsed.eventId || currentEvent.id,
          source: source === 'manual' ? 'manual' : 'scanner'
        })
      });
      const result = await response.json();
      const decision = result.decision || {};
      const status = decision.status || (result.success ? 'approved' : 'review');
      const summary = decision.label || (result.success ? 'Entry approved.' : 'Manual review required.');
      const recommendation = decision.status === 'fraud'
        ? 'Deny entry and route to ticket resolution.'
        : decision.status === 'duplicate'
          ? 'Block re-entry unless supervisor approves.'
          : decision.status === 'review'
            ? 'Pause entry and confirm details with supervisor.'
            : 'Open the lane and admit the guest.';
      const flags = decision.flags || [];

      const entry = {
        id: `${parsed.code}-${now}`,
        code: parsed.code,
        status,
        raw: parsed.raw,
        eventName: currentEvent.name,
        attendee: result.ticket?.first_name ? `${result.ticket.first_name} ${result.ticket.last_name || ''}`.trim() : 'Unknown guest',
        seat: result.ticket?.seat || 'Unassigned',
        tier: result.ticket?.ticket_type || 'General',
        scannedAt: now,
        summary,
        recommendation,
        flags
      };

      if (status === 'approved') {
        setUsedLedger((current) => ({ ...current, [parsed.code]: { firstValidatedAt: now, operator, gate: currentEvent.gate, eventId: currentEvent.id } }));
      }
      setHistory((current) => [entry, ...current].slice(0, 10));
      setResult(entry);
      setProcessing(false);
      setDeskNote(recommendation);
    } catch (error) {
      console.error('Scanner verification failed:', error);
      setProcessing(false);
      setLocked(false);
      Alert.alert('Verification failed', 'Unable to verify ticket at this time.');
    }
  };

  const renderCamera = () => {
    if (!permission) return <View style={[styles.cameraFallback, styles.center]}><ActivityIndicator size="small" color="#2563EB" /><Text style={styles.fallbackTitle}>Initializing scanner</Text><Text style={styles.fallbackText}>Connecting camera services and preparing validation controls.</Text></View>;
    if (!permission.granted) return <View style={[styles.cameraFallback, styles.center]}><Ionicons name="camera-outline" size={28} color="#7C3AED" /><Text style={styles.fallbackTitle}>Camera access is not enabled</Text><Text style={styles.fallbackText}>Grant camera permission for live QR scanning, or continue using the manual validation desk.</Text><TouchableOpacity style={styles.primaryButton} onPress={requestPermission}><Ionicons name="videocam" size={16} color="#FFFFFF" /><Text style={styles.primaryText}>Enable camera</Text></TouchableOpacity></View>;
    return (
      <CameraView style={styles.camera} onBarcodeScanned={locked || processing ? undefined : validateTicket} barcodeScannerSettings={{ barcodeTypes: ['qr', 'pdf417', 'aztec'] }}>
        <View style={styles.overlay}>
          <View style={styles.cameraCard}><Text style={styles.cameraEyebrow}>Live scan lane</Text><Text style={styles.cameraTitle}>{currentEvent.name}</Text><Text style={styles.cameraMeta}>{currentEvent.gate} - {formatDateTime(currentEvent.start)}</Text></View>
          <View style={styles.frame} />
          <Text style={styles.cameraText}>Align the QR inside the frame. Duplicate, voided, and mismatched tickets will be blocked automatically.</Text>
        </View>
      </CameraView>
    );
  };

  const meta = STATUS_META[result?.status || 'approved'];

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.shell}>
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <TouchableOpacity style={styles.backButton} onPress={() => (navigation?.canGoBack?.() ? navigation.goBack() : navigation?.navigate?.('Home'))}><Ionicons name="arrow-back" size={18} color="#0F172A" /><Text style={styles.backText}>Back</Text></TouchableOpacity>
              <View style={styles.heroCopy}><Text style={styles.eyebrow}>Event access control</Text><Text style={styles.heroTitle}>Enterprise Ticket Scanner</Text><Text style={styles.heroText}>Validate live QR tickets, stop duplicate entry attempts, and escalate fraud signals before they hit the gate.</Text></View>
              <View style={styles.heroDesk}><Text style={styles.heroDeskLabel}>Live desk</Text><Text style={styles.heroDeskValue}>{currentEvent.gate}</Text><Text style={styles.heroDeskText}>{operator}</Text></View>
            </View>
            <View style={styles.notice}><Ionicons name="pulse" size={14} color="#2563EB" /><Text style={styles.noticeText}>{deskNote}</Text></View>
            <View style={styles.summaryRow}>
              {[{ label: 'Lane throughput', value: `${currentEvent.cleared + approvedCount}/${currentEvent.expected}`, helper: 'Validated guests for this desk', tone: '#2563EB', surface: '#DBEAFE' }, { label: 'Duplicate blocks', value: `${duplicateCount}`, helper: 'Previously used QR attempts stopped', tone: '#D97706', surface: '#FEF3C7' }, { label: 'Risk queue', value: `${riskCount}`, helper: 'Fraud or manual-review outcomes', tone: '#DC2626', surface: '#FEE2E2' }].map((card) => (
                <TouchableOpacity key={card.label} style={[styles.summaryCard, { backgroundColor: card.surface }]} activeOpacity={0.92} onPress={() => setDeskNote(card.helper)}><Text style={styles.summaryLabel}>{card.label}</Text><Text style={[styles.summaryValue, { color: card.tone }]}>{card.value}</Text><Text style={styles.summaryHelper}>{card.helper}</Text></TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.workspace, isWide && styles.workspaceWide]}>
            <View style={styles.mainColumn}>
              <View style={styles.card}>
                <View style={styles.cardHeader}><View><Text style={styles.eyebrow}>Scanner stage</Text><Text style={styles.cardTitle}>Live QR capture</Text><Text style={styles.cardMeta}>Active desk: {currentEvent.name} - {currentEvent.venue}</Text></View><TouchableOpacity style={styles.ghostPill} onPress={resetLane}><Ionicons name="refresh" size={14} color="#2563EB" /><Text style={styles.ghostText}>Clear lane</Text></TouchableOpacity></View>
                <View style={styles.cameraShell}>{renderCamera()}{processing && <View style={styles.processing}><ActivityIndicator size="large" color="#FFFFFF" /><Text style={styles.processingTitle}>Running validation checks</Text><Text style={styles.processingText}>Verifying integrity, event alignment, and duplicate entry history.</Text></View>}</View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeader}><View><Text style={styles.eyebrow}>Decision engine</Text><Text style={styles.cardTitle}>Latest scan outcome</Text></View>{result && <View style={[styles.statusBadge, { backgroundColor: meta.surface, borderColor: meta.border }]}><Ionicons name={meta.icon} size={14} color={meta.color} /><Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text></View>}</View>
                {result ? (
                  <View style={styles.resultBody}>
                    <View style={[styles.resultHero, { backgroundColor: meta.surface, borderColor: meta.border }]}><Ionicons name={meta.icon} size={28} color={meta.color} /><View style={styles.resultCopy}><Text style={styles.resultCode}>{result.code}</Text><Text style={styles.resultSummary}>{result.summary}</Text></View></View>
                    <View style={styles.detailGrid}>{[['Guest', result.attendee], ['Seat', result.seat], ['Tier', result.tier], ['Scanned', formatTime(result.scannedAt)]].map(([label, value]) => <View key={label} style={styles.detailCard}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>)}</View>
                    <View style={styles.recommendation}><Text style={styles.detailLabel}>Execution guidance</Text><Text style={styles.recommendationText}>{result.recommendation}</Text></View>
                    <View style={styles.flags}>{(result.flags.length ? result.flags : ['No fraud or replay indicators were detected.']).map((flag, index) => <View key={`${flag}-${index}`} style={styles.flagRow}><Ionicons name={result.flags.length ? 'alert-circle-outline' : 'shield-checkmark-outline'} size={14} color={result.flags.length ? '#B91C1C' : '#15803D'} /><Text style={styles.flagText}>{flag}</Text></View>)}</View>
                    <View style={styles.actions}>
                      <TouchableOpacity style={result.status === 'approved' ? styles.primaryButton : result.status === 'duplicate' ? styles.warningButton : styles.dangerButton} onPress={() => (result.status === 'approved' ? resetLane() : result.status === 'duplicate' ? setDeskNote(`Duplicate entry acknowledged for ${result.code}.`) : setDeskNote(`Security escalation started for ${result.code}.`))}><Ionicons name={result.status === 'approved' ? 'arrow-forward' : result.status === 'duplicate' ? 'shield-checkmark' : 'alert-circle'} size={16} color="#FFFFFF" /><Text style={styles.primaryText}>{result.status === 'approved' ? 'Ready next guest' : result.status === 'duplicate' ? 'Acknowledge duplicate' : 'Escalate security'}</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.secondaryButton} onPress={() => openBrief(result)}><Text style={styles.secondaryText}>Attendee brief</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.secondaryGhostButton} onPress={() => openPayload(result)}><Text style={styles.secondaryGhostText}>Inspect payload</Text></TouchableOpacity>
                    </View>
                  </View>
                ) : <View style={styles.emptyState}><Ionicons name="scan-outline" size={32} color="#94A3B8" /><Text style={styles.emptyTitle}>Waiting for a ticket</Text><Text style={styles.emptyText}>Scan a QR code or paste a ticket code to generate an access decision with duplicate-use and fraud checks.</Text></View>}
              </View>
            </View>

            <View style={styles.sideColumn}>
              <View style={styles.card}>
                <Text style={styles.eyebrow}>Event desks</Text><Text style={styles.cardTitle}>Choose the active gate</Text><Text style={styles.cardMeta}>Switch desks to verify event alignment before admitting a guest.</Text>
                <View style={styles.stack}>{EVENTS.map((event) => { const isSelected = event.id === currentEvent.id; return <TouchableOpacity key={event.id} style={[styles.eventCard, isSelected && styles.eventCardActive]} activeOpacity={0.92} onPress={() => { setSelectedEventId(event.id); setDeskNote(`Desk changed to ${event.gate} for ${event.name}. Validation rules were refreshed.`); }}><View style={styles.eventTop}><Text style={styles.eventName}>{event.name}</Text><View style={[styles.eventCode, isSelected && styles.eventCodeActive]}><Text style={[styles.eventCodeText, isSelected && styles.eventCodeTextActive]}>{event.id.toUpperCase()}</Text></View></View><Text style={styles.cardMeta}>{event.venue}</Text><Text style={styles.eventFoot}>{event.gate}</Text></TouchableOpacity>; })}</View>
              </View>

              <View style={styles.card}>
                <Text style={styles.eyebrow}>Manual validation</Text><Text style={styles.cardTitle}>Paste or type a QR payload</Text><Text style={styles.cardMeta}>Use manual validation for damaged codes, screenshots, or fallback booking references.</Text>
                <TextInput style={styles.input} placeholder="Paste QR payload or ticket code, for example SUM26-A14-0001" placeholderTextColor="#94A3B8" autoCapitalize="characters" value={manualCode} onChangeText={setManualCode} />
                <View style={styles.actions}><TouchableOpacity style={[styles.primaryButton, !manualCode.trim() && styles.disabled]} disabled={!manualCode.trim() || processing} onPress={() => validateTicket({ type: 'manual', data: manualCode }, 'manual')}><Ionicons name="keypad" size={16} color="#FFFFFF" /><Text style={styles.primaryText}>Validate manually</Text></TouchableOpacity><TouchableOpacity style={styles.secondaryGhostButton} onPress={() => setManualCode('')}><Text style={styles.secondaryGhostText}>Reset field</Text></TouchableOpacity></View>
              </View>

              <View style={styles.card}>
                <Text style={styles.eyebrow}>Activity feed</Text><Text style={styles.cardTitle}>Recent scan decisions</Text><Text style={styles.cardMeta}>Tap an entry to reopen the last decision and inspect the outcome.</Text>
                <View style={styles.stack}>{history.length > 0 ? history.map((entry) => { const entryMeta = STATUS_META[entry.status]; return <TouchableOpacity key={entry.id} style={styles.activityRow} activeOpacity={0.92} onPress={() => { setResult(entry); setLocked(true); setDeskNote(`Reviewing ${entry.code} from ${formatDateTime(entry.scannedAt)}.`); }}><View style={[styles.activityIcon, { backgroundColor: entryMeta.surface }]}><Ionicons name={entryMeta.icon} size={14} color={entryMeta.color} /></View><View style={styles.activityCopy}><Text style={styles.activityCode}>{entry.code}</Text><Text style={styles.activityMeta}>{entry.eventName} - {formatTime(entry.scannedAt)}</Text></View><Text style={[styles.activityStatus, { color: entryMeta.color }]}>{entryMeta.label}</Text></TouchableOpacity>; }) : <View style={styles.activityEmpty}><Ionicons name="time-outline" size={18} color="#94A3B8" /><Text style={styles.cardMeta}>No scan decisions recorded yet.</Text></View>}</View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F3F6FB' }, page: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 }, shell: { width: '100%', maxWidth: 1460, alignSelf: 'center', gap: 18 },
  hero: { backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 1, borderColor: '#D8E2F0', padding: 24, gap: 18, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 22, shadowOffset: { width: 0, height: 14 } },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }, backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }, backText: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  heroCopy: { flex: 1, minWidth: 280 }, eyebrow: { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }, heroTitle: { fontSize: 30, fontWeight: '800', color: '#0F172A', marginBottom: 8, letterSpacing: -0.8 }, heroText: { fontSize: 14, lineHeight: 22, color: '#475569' },
  heroDesk: { minWidth: 220, backgroundColor: '#F8FAFC', borderRadius: 22, borderWidth: 1, borderColor: '#E2E8F0', padding: 16 }, heroDeskLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }, heroDeskValue: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 4 }, heroDeskText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EFF6FF', borderRadius: 16, borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 14, paddingVertical: 12 }, noticeText: { flex: 1, fontSize: 12, lineHeight: 18, color: '#1D4ED8', fontWeight: '700' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, summaryCard: { flexGrow: 1, flexBasis: 220, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(148,163,184,0.16)', padding: 16, minHeight: 120 }, summaryLabel: { fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }, summaryValue: { fontSize: 24, fontWeight: '800', marginBottom: 6 }, summaryHelper: { fontSize: 12, lineHeight: 18, color: '#475569' },
  workspace: { gap: 18 }, workspaceWide: { flexDirection: 'row', alignItems: 'flex-start' }, mainColumn: { flex: 1.35, gap: 18 }, sideColumn: { flex: 1, gap: 18 }, card: { backgroundColor: '#FFFFFF', borderRadius: 28, borderWidth: 1, borderColor: '#D8E2F0', padding: 20, gap: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }, cardTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 6 }, cardMeta: { fontSize: 13, lineHeight: 20, color: '#64748B' }, ghostPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' }, ghostText: { fontSize: 11, fontWeight: '800', color: '#2563EB' },
  cameraShell: { minHeight: 500, borderRadius: 24, overflow: 'hidden', backgroundColor: '#020617', position: 'relative' }, camera: { flex: 1, minHeight: 500 }, overlay: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 28, backgroundColor: 'rgba(15,23,42,0.28)' }, cameraCard: { alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 18, padding: 14 }, cameraEyebrow: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }, cameraTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 }, cameraMeta: { fontSize: 13, color: 'rgba(255,255,255,0.84)' }, frame: { width: 288, height: 288, borderRadius: 28, borderWidth: 3, borderColor: '#38BDF8', backgroundColor: 'rgba(15,23,42,0.16)' }, cameraText: { fontSize: 14, lineHeight: 22, color: '#FFFFFF', textAlign: 'center', maxWidth: 620 },
  cameraFallback: { minHeight: 500, backgroundColor: '#0F172A', paddingHorizontal: 24 }, center: { justifyContent: 'center', alignItems: 'center' }, fallbackTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 16, marginBottom: 8, textAlign: 'center' }, fallbackText: { fontSize: 14, lineHeight: 22, color: 'rgba(255,255,255,0.78)', textAlign: 'center', maxWidth: 420, marginBottom: 18 },
  processing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(2,6,23,0.78)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 }, processingTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 16, marginBottom: 8 }, processingText: { fontSize: 14, lineHeight: 22, color: 'rgba(255,255,255,0.82)', textAlign: 'center', maxWidth: 420 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 }, statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 }, resultBody: { gap: 16 }, resultHero: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderRadius: 22, borderWidth: 1, padding: 16 }, resultCopy: { flex: 1 }, resultCode: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 6 }, resultSummary: { fontSize: 14, lineHeight: 22, color: '#334155' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, detailCard: { flexGrow: 1, flexBasis: 160, backgroundColor: '#F8FAFC', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', padding: 14 }, detailLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }, detailValue: { fontSize: 14, fontWeight: '700', color: '#0F172A', lineHeight: 20 }, recommendation: { backgroundColor: '#F8FAFC', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', padding: 16 }, recommendationText: { fontSize: 14, lineHeight: 22, color: '#334155', fontWeight: '700' }, flags: { gap: 10 }, flagRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, flagText: { flex: 1, fontSize: 13, lineHeight: 20, color: '#475569' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, primaryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 }, warningButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D97706', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 }, dangerButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#DC2626', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 }, primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' }, secondaryButton: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: '#E2E8F0' }, secondaryText: { fontSize: 13, fontWeight: '800', color: '#0F172A' }, secondaryGhostButton: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1' }, secondaryGhostText: { fontSize: 13, fontWeight: '800', color: '#334155' }, disabled: { opacity: 0.55 },
  emptyState: { justifyContent: 'center', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20, gap: 10 }, emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' }, emptyText: { fontSize: 14, lineHeight: 22, color: '#64748B', textAlign: 'center', maxWidth: 520 },
  stack: { gap: 10 }, eventCard: { backgroundColor: '#F8FAFC', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, gap: 8 }, eventCardActive: { borderColor: '#93C5FD', backgroundColor: '#EFF6FF' }, eventTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, eventName: { flex: 1, fontSize: 15, fontWeight: '800', color: '#0F172A' }, eventCode: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#E2E8F0' }, eventCodeActive: { backgroundColor: '#DBEAFE' }, eventCodeText: { fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.7 }, eventCodeTextActive: { color: '#2563EB' }, eventFoot: { fontSize: 12, color: '#334155', fontWeight: '700' },
  input: { minHeight: 112, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#0F172A', textAlignVertical: 'top' }, activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8FAFC', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', padding: 14 }, activityIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, activityCopy: { flex: 1, gap: 3 }, activityCode: { fontSize: 13, fontWeight: '800', color: '#0F172A' }, activityMeta: { fontSize: 12, color: '#64748B' }, activityStatus: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'right' }, activityEmpty: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }
});

export default ScannerScreen;
