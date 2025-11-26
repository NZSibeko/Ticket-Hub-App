import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
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

const TicketPurchaseScreen = ({ route, navigation }) => {
  const { event, ticketType } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [scaleAnim] = useState(new Animated.Value(1));

  // Helper function to get available quantity
  const getAvailableQuantity = (ticketType) => {
    if (!ticketType) return 0;
    const available = ticketType?.available_quantity ?? 
                     ticketType?.available ?? 
                     ticketType?.max_quantity ?? 0;
    // Fallback for testing
    if (available <= 0) return 10;
    return available;
  };

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handlePurchase = () => {
    if (!quantity || quantity < 1) {
      Alert.alert('Invalid Quantity', 'Please select at least 1 ticket.');
      return;
    }

    const totalAmount = ticketType.price * quantity;

    console.log('🎫 Proceeding to Payment Screen:', {
        eventName: event.event_name,
        ticket: ticketType.type,
        qty: quantity,
        total: totalAmount
    });

    // 3. Navigate to Payment Screen (Do NOT pay yet)
    navigation.navigate('Payment', {
      event: event,
      ticketType: ticketType,
      quantity: quantity,
      totalAmount: totalAmount
    });
  };

  const increaseQuantity = () => {
    if (quantity < getAvailableQuantity(ticketType)) {
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
    try {
      return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: currency }).format(amount);
    } catch (error) { return 'R ' + amount; }
  };

  const unitPrice = ticketType?.price || 0;
  const totalAmount = unitPrice * quantity;
  const availableQuantity = getAvailableQuantity(ticketType);

  if (!event || !ticketType) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Tickets</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Event Info */}
        <View style={styles.eventCard}>
          <Text style={styles.eventName}>{event.event_name}</Text>
          <Text style={styles.ticketTypeBadge}>{ticketType.type.toUpperCase()} Ticket</Text>
          <Text style={styles.eventDetailText}>{event.location}</Text>
          <Text style={styles.eventDetailText}>{new Date(event.start_date).toDateString()}</Text>
        </View>

        {/* Quantity Selector */}
        <View style={styles.quantityCard}>
          <Text style={styles.sectionTitle}>Select Quantity</Text>
          <Text style={styles.sectionSubtitle}>{availableQuantity} tickets available</Text>

          <View style={styles.quantitySelector}>
            <TouchableOpacity 
              style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
              onPress={decreaseQuantity} disabled={quantity <= 1}>
              <Ionicons name="remove" size={24} color={quantity <= 1 ? '#ccc' : '#fff'} />
            </TouchableOpacity>
            
            <View style={styles.quantityDisplay}>
              <Text style={styles.quantityNumber}>{quantity}</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.quantityButton, quantity >= availableQuantity && styles.quantityButtonDisabled]}
              onPress={increaseQuantity} disabled={quantity >= availableQuantity}>
              <Ionicons name="add" size={24} color={quantity >= availableQuantity ? '#ccc' : '#fff'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.pricingCard}>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Price per ticket</Text>
            <Text style={styles.pricingValue}>{formatCurrency(unitPrice, event.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalAmount, event.currency)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Proceed Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.purchaseButton, (loading || availableQuantity <= 0) && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={loading || availableQuantity <= 0}
        >
          <View style={styles.purchaseButtonContent}>
            <View>
              <Text style={styles.purchaseButtonLabel}>Proceed to Payment</Text>
              <Text style={styles.purchaseButtonPrice}>{formatCurrency(totalAmount, event.currency)}</Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#fff' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerSpacer: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 180 },
  eventCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 3 },
  eventName: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  ticketTypeBadge: { fontSize: 14, color: '#666', fontWeight: '600', marginBottom: 10, textTransform: 'uppercase' },
  eventDetailText: { color: '#666', fontSize: 14, marginBottom: 4 },
  quantityCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  quantitySelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  quantityButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  quantityButtonDisabled: { backgroundColor: '#f0f0f0' },
  quantityDisplay: { minWidth: 60, alignItems: 'center' },
  quantityNumber: { fontSize: 36, fontWeight: 'bold' },
  pricingCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 3 },
  pricingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  pricingLabel: { color: '#666' },
  pricingValue: { fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12, marginTop: 8 },
  totalLabel: { fontSize: 18, fontWeight: 'bold' },
  totalValue: { fontSize: 24, fontWeight: 'bold' },
  bottomContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 20, paddingBottom: 30, borderTopWidth: 1, borderColor: '#f0f0f0' },
  purchaseButton: { backgroundColor: '#000', borderRadius: 12, padding: 18 },
  purchaseButtonDisabled: { backgroundColor: '#ccc' },
  purchaseButtonContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  purchaseButtonLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  purchaseButtonPrice: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});

export default TicketPurchaseScreen;