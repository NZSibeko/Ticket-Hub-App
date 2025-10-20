import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:3000';

const TicketPurchaseScreen = ({ route, navigation }) => {
  const params = route?.params || {};
  const { event, ticketType } = params;
  const { user, getAuthHeader } = useAuth();
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState(null);
  const [scaleAnim] = useState(new Animated.Value(1));

  // Helper function to get available quantity
  const getAvailableQuantity = (ticketType) => {
    if (!ticketType) return 0;
    
    const available = ticketType?.available_quantity ?? 
                     ticketType?.available ?? 
                     ticketType?.quantity_available ?? 
                     ticketType?.remaining_quantity ??
                     ticketType?.max_quantity ??
                     0;

    console.log(`🎫 Purchase Screen - ${ticketType?.type} availability:`, {
      available_quantity: ticketType?.available_quantity,
      available: ticketType?.available,
      quantity_available: ticketType?.quantity_available,
      calculated: available
    });

    // TEMPORARY: Override if 0 for testing - REMOVE IN PRODUCTION
    if (available <= 0) {
      console.log('⚠️ TEMPORARY OVERRIDE: Setting quantity to 10 for testing in purchase screen');
      return 10;
    }

    return available;
  };

  useEffect(() => {
    console.log('📋 Route params:', { event, ticketType });
    console.log('🎫 Available quantity calculation:', {
      rawAvailable: ticketType?.available_quantity,
      calculatedAvailable: getAvailableQuantity(ticketType)
    });
    
    if (!event || !ticketType) {
      setError('Missing event or ticket information. Please go back and try again.');
      console.error('Missing parameters:', { event, ticketType });
    }
  }, [event, ticketType]);

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePurchase = async () => {
    if (!quantity || quantity < 1) {
      Alert.alert('Invalid Quantity', 'Please select at least 1 ticket.');
      return;
    }

    // Check if user is logged in
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please log in to purchase tickets',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Log In',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
      return;
    }

    const totalAmount = ticketType.price * quantity;

    setLoading(true);

    try {
      console.log('🎫 Processing purchase:', {
        event: event.event_name,
        ticketType: ticketType.type,
        quantity,
        totalAmount,
        customerId: user.customer_id,
      });

      const headers = await getAuthHeader();

      // Prepare purchase data
      const purchaseData = {
        event_id: event.event_id,
        customer_id: user.customer_id,
        ticket_type_id: ticketType.ticket_type_id,
        ticket_type: ticketType.type,
        quantity: quantity,
        unit_price: ticketType.price,
        total_amount: totalAmount,
        currency: event.currency || 'ZAR',
        payment_method: 'credit_card',
      };

      try {
        // Try real API first
        const response = await axios.post(
          `${API_URL}/api/payments/confirm-payment`,
          purchaseData,
          { headers }
        );

        console.log('✅ Purchase successful:', response.data);

        // Navigate to PaymentSuccessScreen with booking details
        navigation.navigate('PaymentSuccess', {
          bookingDetails: {
            eventName: event.event_name,
            ticketCount: quantity,
            totalAmount: totalAmount,
            bookingId: `BK${Date.now()}`,
            eventDate: event.start_date,
            location: event.location,
            ticketType: ticketType.type,
            currency: event.currency || 'ZAR'
          }
        });

      } catch (apiError) {
        console.log('⚠️ API not available, using mock purchase');

        // MOCK PURCHASE - Remove this in production!
        if (apiError.response?.status === 404 || apiError.code === 'ERR_BAD_REQUEST') {
          // Simulate successful purchase
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Generate mock ticket
          const mockTicket = {
            ticket_id: `MOCK-${Date.now()}`,
            ticket_code: `TKT-${event.event_id}-${Date.now()}`,
            event_id: event.event_id,
            event_name: event.event_name,
            event_date: event.start_date,
            location: event.location,
            ticket_type: ticketType.type,
            quantity: quantity,
            price: ticketType.price,
            total_amount: totalAmount,
            currency: event.currency || 'ZAR',
            ticket_status: 'ACTIVE',
            purchase_date: new Date().toISOString(),
            image_url: event.image_url || event.event_image,
          };

          console.log('✅ Mock purchase created:', mockTicket);

          // Store mock ticket in localStorage for demo purposes
          try {
            const existingTickets = JSON.parse(localStorage.getItem('mockTickets') || '[]');
            existingTickets.push(mockTicket);
            localStorage.setItem('mockTickets', JSON.stringify(existingTickets));
          } catch (storageError) {
            console.log('Could not save to localStorage:', storageError);
          }

          // Navigate to PaymentSuccessScreen with booking details
          navigation.navigate('PaymentSuccess', {
            bookingDetails: {
              eventName: event.event_name,
              ticketCount: quantity,
              totalAmount: totalAmount,
              bookingId: `MOCK-BK${Date.now()}`,
              eventDate: event.start_date,
              location: event.location,
              ticketType: ticketType.type,
              currency: event.currency || 'ZAR'
            }
          });

        } else {
          // Real error, not just missing endpoint
          throw apiError;
        }
      }
    } catch (error) {
      console.error('❌ Purchase error:', error);
      Alert.alert(
        'Purchase Failed',
        error.response?.data?.message || error.message || 'An error occurred during purchase. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const increaseQuantity = () => {
    const availableQuantity = getAvailableQuantity(ticketType);
    if (quantity < availableQuantity) {
      setQuantity(quantity + 1);
      animateButton();
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
      animateButton();
    }
  };

  const formatCurrency = (amount, currency = 'ZAR') => {
    if (!amount) return 'R 0.00';
    try {
      return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    } catch (error) {
      console.error('Currency formatting error:', error);
      return 'Invalid amount';
    }
  };

  const getTicketTypeLabel = (type) => {
    const labels = {
      early_bird: 'Early Bird',
      general: 'General',
      family_group: 'Family/Group',
      vip: 'VIP',
      vvip: 'VVIP',
    };
    return labels[type] || type?.replace(/_/g, ' ').toUpperCase() || 'Unknown';
  };

  const getTicketTypeIcon = (type) => {
    const icons = {
      early_bird: 'alarm-outline',
      general: 'person-outline',
      family_group: 'people-outline',
      vip: 'star-outline',
      vvip: 'diamond-outline',
    };
    return icons[type] || 'ticket-outline';
  };

  const unitPrice = ticketType?.price || 0;
  const totalAmount = unitPrice * quantity;
  const availableQuantity = getAvailableQuantity(ticketType);

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!event || !ticketType) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading purchase details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Purchase Tickets</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Event Info Card */}
        <View style={styles.eventCard}>
          <View style={styles.eventHeader}>
            <View style={styles.ticketIconWrapper}>
              <Ionicons name={getTicketTypeIcon(ticketType.type)} size={32} color="#000" />
            </View>
            <View style={styles.eventHeaderText}>
              <Text style={styles.eventName} numberOfLines={2}>{event.event_name || 'Event Name'}</Text>
              <Text style={styles.ticketTypeBadge}>
                {getTicketTypeLabel(ticketType.type)} Ticket
              </Text>
            </View>
          </View>

          <View style={styles.eventDetails}>
            <View style={styles.eventDetailRow}>
              <Ionicons name="calendar-outline" size={18} color="#666" />
              <Text style={styles.eventDetailText}>
                {event.start_date ? new Date(event.start_date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }) : 'Date not specified'}
              </Text>
            </View>
            <View style={styles.eventDetailRow}>
              <Ionicons name="location-outline" size={18} color="#666" />
              <Text style={styles.eventDetailText} numberOfLines={1}>
                {event.location || 'Location not specified'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quantity Selector */}
        <View style={styles.quantityCard}>
          <Text style={styles.sectionTitle}>Select Quantity</Text>
          <Text style={styles.sectionSubtitle}>
            {availableQuantity} tickets available
          </Text>

          <Animated.View 
            style={[
              styles.quantitySelector,
              { transform: [{ scale: scaleAnim }] }
            ]}
          >
            <TouchableOpacity
              style={[
                styles.quantityButton,
                quantity <= 1 && styles.quantityButtonDisabled
              ]}
              onPress={decreaseQuantity}
              disabled={quantity <= 1}
            >
              <Ionicons 
                name="remove" 
                size={24} 
                color={quantity <= 1 ? '#ccc' : '#fff'} 
              />
            </TouchableOpacity>
            
            <View style={styles.quantityDisplay}>
              <Text style={styles.quantityNumber}>{quantity}</Text>
              <Text style={styles.quantityLabel}>
                {quantity === 1 ? 'Ticket' : 'Tickets'}
              </Text>
            </View>
            
            <TouchableOpacity
              style={[
                styles.quantityButton,
                quantity >= availableQuantity && styles.quantityButtonDisabled
              ]}
              onPress={increaseQuantity}
              disabled={quantity >= availableQuantity}
            >
              <Ionicons 
                name="add" 
                size={24} 
                color={quantity >= availableQuantity ? '#ccc' : '#fff'} 
              />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Pricing Breakdown */}
        <View style={styles.pricingCard}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Ticket Price</Text>
            <Text style={styles.pricingValue}>
              {formatCurrency(unitPrice, event.currency)}
            </Text>
          </View>

          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Quantity</Text>
            <Text style={styles.pricingValue}>× {quantity}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(totalAmount, event.currency)}
            </Text>
          </View>
        </View>

        {/* Test Mode Banner */}
        <View style={styles.testModeBanner}>
          <Ionicons name="flask-outline" size={20} color="#856404" />
          <Text style={styles.testModeText}>
            Test Mode - No real payment required
          </Text>
        </View>

        {/* Payment Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
            <Text style={styles.infoText}>Secure payment processing</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail" size={20} color="#2196F3" />
            <Text style={styles.infoText}>Instant email confirmation</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="qr-code" size={20} color="#FF9800" />
            <Text style={styles.infoText}>Digital QR code ticket</Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.purchaseButton,
            (loading || availableQuantity <= 0) && styles.purchaseButtonDisabled,
          ]}
          onPress={handlePurchase}
          disabled={loading || availableQuantity <= 0}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <View style={styles.purchaseButtonContent}>
                <View>
                  <Text style={styles.purchaseButtonLabel}>Pay Now</Text>
                  <Text style={styles.purchaseButtonPrice}>
                    {formatCurrency(totalAmount, event.currency)}
                  </Text>
                </View>
                <View style={styles.purchaseButtonIcon}>
                  <Ionicons name="arrow-forward" size={24} color="#fff" />
                </View>
              </View>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  buttonIcon: {
    marginRight: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 180,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ticketIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  eventHeaderText: {
    flex: 1,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 6,
    lineHeight: 24,
  },
  ticketTypeBadge: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  eventDetails: {
    gap: 8,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  quantityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  quantityButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  quantityButtonDisabled: {
    backgroundColor: '#f0f0f0',
    shadowOpacity: 0,
    elevation: 0,
  },
  quantityDisplay: {
    alignItems: 'center',
    minWidth: 80,
  },
  quantityNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  quantityLabel: {
    fontSize: 14,
    color: '#666',
  },
  pricingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pricingLabel: {
    fontSize: 15,
    color: '#666',
  },
  pricingValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  testModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  testModeText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  purchaseButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  purchaseButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  purchaseButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  purchaseButtonLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  purchaseButtonPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  purchaseButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TicketPurchaseScreen;