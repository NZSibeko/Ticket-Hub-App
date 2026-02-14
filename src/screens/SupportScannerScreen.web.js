// src/screens/SupportScannerScreen.web.js
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const API_URL = 'http://localhost:3000';

const SupportScannerScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [eventId, setEventId] = useState('');
  const [eventInfo, setEventInfo] = useState(null);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const { user, getAuthHeader } = useAuth();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const fetchEventInfo = async () => {
    if (!eventId.trim()) {
      Alert.alert('Error', 'Please enter an Event ID');
      return;
    }

    setLoadingEvent(true);
    try {
      const headers = await getAuthHeader();
      const response = await fetch(
        `${API_URL}/api/support/events/${eventId}`,
        { headers }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setEventInfo(data.event);
        Alert.alert('Success', `Event loaded: ${data.event.event_name}`);
      } else {
        Alert.alert('Error', data.error || 'Event not found or not authorized');
        setEventInfo(null);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      Alert.alert('Error', 'Failed to load event information');
      setEventInfo(null);
    } finally {
      setLoadingEvent(false);
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (!eventInfo) {
      Alert.alert('Error', 'Please load an event first before scanning tickets');
      return;
    }

    setScanned(true);
    setScanResult({ type, data });
    setShowResultModal(true);
    
    try {
      const headers = await getAuthHeader();
      
      // Validate ticket for this specific event
      const response = await fetch(
        `${API_URL}/api/support/tickets/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            ticket_code: data,
            event_id: eventInfo.event_id,
            validator_id: user.user_id
          })
        }
      );
      
      const result = await response.json();
      
      setTimeout(() => {
        if (result.success) {
          Alert.alert(
            'Ticket Validated!',
            `Ticket ${data} has been successfully validated for ${eventInfo.event_name}.`,
            [{ text: 'OK', onPress: () => {
              setScanned(false);
              setShowResultModal(false);
            }}]
          );
        } else {
          Alert.alert(
            'Validation Failed',
            result.error || 'Invalid ticket for this event',
            [{ text: 'OK', onPress: () => {
              setScanned(false);
              setShowResultModal(false);
            }}]
          );
        }
      }, 1500);
      
    } catch (error) {
      console.error('Error validating ticket:', error);
      Alert.alert('Error', 'Failed to validate ticket');
      setShowResultModal(false);
      setScanned(false);
    }
  };

  if (!permission) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <Text>Requesting camera permission...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <Text>Camera permission is required to scan tickets.</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support Ticket Scanner</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.container}>
        {/* Event Selection Section */}
        <View style={styles.eventSelector}>
          <Text style={styles.sectionTitle}>Select Event</Text>
          <View style={styles.eventInputContainer}>
            <TextInput
              style={styles.eventInput}
              placeholder="Enter Event ID"
              value={eventId}
              onChangeText={setEventId}
            />
            <TouchableOpacity 
              style={[
                styles.loadButton,
                (!eventId.trim() || loadingEvent) && styles.loadButtonDisabled
              ]}
              onPress={fetchEventInfo}
              disabled={!eventId.trim() || loadingEvent}
            >
              {loadingEvent ? (
                <Text style={styles.loadButtonText}>Loading...</Text>
              ) : (
                <Text style={styles.loadButtonText}>Load Event</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {eventInfo && (
            <View style={styles.eventInfoCard}>
              <Text style={styles.eventName}>{eventInfo.event_name}</Text>
              <Text style={styles.eventLocation}>{eventInfo.location}</Text>
              <Text style={styles.eventDate}>
                {new Date(eventInfo.start_date).toLocaleDateString()} at{' '}
                {new Date(eventInfo.start_date).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
              <View style={styles.eventStats}>
                <View style={styles.statItem}>
                  <Ionicons name="ticket" size={16} color="#64748b" />
                  <Text style={styles.statText}>
                    {eventInfo.tickets_sold || 0} sold
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="people" size={16} color="#64748b" />
                  <Text style={styles.statText}>
                    {eventInfo.max_attendees || 0} capacity
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Scanner Section */}
        {eventInfo && (
          <>
            <CameraView
              style={styles.camera}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr', 'pdf417'],
              }}
            >
              <View style={styles.overlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanText}>Scan ticket QR code</Text>
              </View>
            </CameraView>

            <View style={styles.instructions}>
              <Ionicons name="information-circle" size={20} color="#64748b" />
              <Text style={styles.instructionsText}>
                Scanning tickets for: {eventInfo.event_name}
              </Text>
            </View>

            {scanned && (
              <TouchableOpacity
                style={styles.rescanButton}
                onPress={() => setScanned(false)}
              >
                <Text style={styles.rescanButtonText}>Tap to Scan Again</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Scan Result Modal */}
      <Modal
        visible={showResultModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
            <Text style={styles.modalTitle}>Validating...</Text>
            <Text style={styles.modalText}>Checking ticket validity</Text>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  headerRight: {
    width: 40,
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  eventSelector: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  eventInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  eventInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  loadButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  loadButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  loadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  eventInfoCard: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  eventName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0369a1',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  eventStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: '#64748b',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanText: {
    marginTop: 20,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rescanButton: {
    backgroundColor: '#6366f1',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  rescanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    margin: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
});

export default SupportScannerScreen;