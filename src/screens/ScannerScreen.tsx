import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  Modal,
  ActivityIndicator 
} from 'react-native';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:3000';

const ScannerScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticketInfo, setTicketInfo] = useState(null);
  const { getAuthHeader } = useAuth();

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    setLoading(true);

    try {
      const headers = getAuthHeader();
      const response = await axios.post(
        `${API_URL}/api/tickets/${data}/validate`,
        {},
        { headers }
      );

      if (response.data.success) {
        const ticket = response.data.ticket;
        setTicketInfo(ticket);
        
        // Fetch event details
        const eventResponse = await axios.get(
          `${API_URL}/zi_events/${ticket.event_id}`,
          { headers }
        );
        
        setTicketInfo({
          ...ticket,
          event: eventResponse.data.d
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      Alert.alert(
        'Validation Failed',
        error.response?.data?.error || 'Invalid ticket',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setTicketInfo(null);
    setLoading(false);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={requestCameraPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={Camera.Constants.Type.back}
        barCodeScannerSettings={{
          barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr],
        }}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.unfocusedContainer}></View>
          <View style={styles.middleContainer}>
            <View style={styles.unfocusedContainer}></View>
            <View style={styles.focusedContainer}>
              <View style={styles.scannerBorder} />
            </View>
            <View style={styles.unfocusedContainer}></View>
          </View>
          <View style={styles.unfocusedContainer}>
            <Text style={styles.instructionText}>
              {scanned ? 'Processing...' : 'Align QR code within frame'}
            </Text>
          </View>
        </View>
      </Camera>

      {scanned && !loading && (
        <View style={styles.resetContainer}>
          <TouchableOpacity style={styles.resetButton} onPress={resetScanner}>
            <Text style={styles.resetButtonText}>Scan Another</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Ticket Info Modal */}
      <Modal
        visible={!!ticketInfo}
        animationType="slide"
        transparent={true}
        onRequestClose={resetScanner}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.successHeader}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successTitle}>Ticket Validated!</Text>
            </View>

            {ticketInfo && (
              <View style={styles.ticketDetails}>
                <DetailRow label="Ticket Code" value={ticketInfo.ticket_code} />
                <DetailRow label="Event" value={ticketInfo.event?.event_name} />
                <DetailRow 
                  label="Date" 
                  value={new Date(ticketInfo.event?.start_date).toLocaleString()} 
                />
                <DetailRow label="Location" value={ticketInfo.event?.location} />
                <DetailRow 
                  label="Validated" 
                  value={new Date(ticketInfo.validation_date).toLocaleString()} 
                />
              </View>
            )}

            <TouchableOpacity 
              style={styles.closeButton}
              onPress={resetScanner}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Validating ticket...</Text>
        </View>
      )}
    </View>
  );
};

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleContainer: {
    flexDirection: 'row',
    flex: 1.5,
  },
  focusedContainer: {
    flex: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerBorder: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#6200ee',
    borderRadius: 12,
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  resetContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 25,
  },
  successIcon: {
    fontSize: 60,
    color: '#4CAF50',
    marginBottom: 10,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  ticketDetails: {
    marginBottom: 25,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  closeButton: {
    backgroundColor: '#6200ee',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 15,
    fontSize: 16,
  },
  text: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#6200ee',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ScannerScreen;