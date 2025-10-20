import { Ionicons } from '@expo/vector-icons';
import {
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';

const { width, height } = Dimensions.get('window');

const PaymentSuccessScreen = ({ navigation, route }) => {
  // Get booking details from navigation params
  const bookingDetails = route.params?.bookingDetails || {
    eventName: 'Summer Music Festival',
    ticketCount: 2,
    totalAmount: 150,
    bookingId: 'BK' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    eventDate: '2024-12-25T18:00:00Z',
    location: 'Central Park, New York',
    ticketType: 'General',
    currency: 'ZAR'
  };

  // Navigation function that tries multiple approaches
  const navigateToSearchEvents = () => {
    console.log('🔍 Attempting to navigate to SearchEventsScreen...');
    
    // Define all possible navigation targets in order of likelihood
    const navigationTargets = [
      // Direct screen names
      { type: 'navigate', target: 'SearchEventsScreen' },
      { type: 'navigate', target: 'SearchEvents' },
      { type: 'navigate', target: 'SearchEvent' },
      { type: 'navigate', target: 'Home' },
      { type: 'navigate', target: 'Events' },
      { type: 'navigate', target: 'Main' },
      { type: 'navigate', target: 'HomeTab' },
      
      // Navigate within specific navigators
      { type: 'navigate', target: 'Home', params: { screen: 'SearchEventsScreen' } },
      { type: 'navigate', target: 'Main', params: { screen: 'SearchEventsScreen' } },
      
      // Reset navigation as last resort
      { type: 'reset', target: 'SearchEventsScreen' },
      { type: 'reset', target: 'Home' }
    ];

    // First, try to go back if possible (simplest approach)
    if (navigation.canGoBack()) {
      console.log('↩️ Going back to previous screen...');
      navigation.goBack();
      return true;
    }

    // Try each navigation approach
    for (const { type, target, params } of navigationTargets) {
      try {
        console.log(`🔄 Trying ${type} to: ${target}`, params || '');
        
        if (type === 'navigate') {
          if (params) {
            navigation.navigate(target, params);
          } else {
            navigation.navigate(target);
          }
        } else if (type === 'reset') {
          navigation.reset({
            index: 0,
            routes: [{ name: target }],
          });
        }
        
        console.log(`✅ Successfully navigated to: ${target}`);
        return true;
        
      } catch (error) {
        console.log(`❌ Failed to navigate to ${target}:`, error.message);
        // Continue to next approach
      }
    }

    // If all navigation attempts fail
    console.error('🚨 All navigation attempts failed');
    Alert.alert(
      'Navigation Issue',
      'Unable to find events screen. Please use the back button or restart the app.',
      [{ text: 'OK' }]
    );
    return false;
  };

  const handleBrowseEvents = () => {
    navigateToSearchEvents();
  };

  const handleViewTickets = () => {
    try {
      // Try to navigate to tickets screen
      navigation.navigate('MyTickets');
    } catch (error) {
      console.log('Ticket screen not found, trying alternatives...');
      
      const ticketScreens = ['Tickets', 'MyTicketsScreen', 'TicketList'];
      for (const screen of ticketScreens) {
        try {
          navigation.navigate(screen);
          return;
        } catch (e) {
          // Continue
        }
      }
      
      // Fallback to events search
      navigateToSearchEvents();
    }
  };

  const handleGoHome = () => {
    try {
      navigation.navigate('Home');
    } catch (error) {
      // Final fallback
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
  };

  // Format currency based on currency type
  const formatCurrency = (amount, currency = 'ZAR') => {
    if (!amount) return currency === 'USD' ? '$0.00' : 'R 0.00';
    try {
      if (currency === 'USD') {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(amount);
      } else {
        return new Intl.NumberFormat('en-ZA', {
          style: 'currency',
          currency: 'ZAR',
        }).format(amount);
      }
    } catch (error) {
      return currency === 'USD' ? `$${amount.toFixed(2)}` : `R ${amount.toFixed(2)}`;
    }
  };

  // Format date nicely
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Date not available';
    }
  };

  return (
    <ScreenContainer>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Header */}
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark" size={48} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successSubtitle}>
            Your tickets have been confirmed and sent to your email
          </Text>
        </View>

        {/* Booking Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Booking Confirmation</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Booking ID</Text>
            <Text style={styles.detailValue}>{bookingDetails.bookingId}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Event</Text>
            <Text style={[styles.detailValue, styles.eventName]} numberOfLines={2}>
              {bookingDetails.eventName}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date & Time</Text>
            <Text style={styles.detailValue}>
              {formatDate(bookingDetails.eventDate)}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue} numberOfLines={2}>
              {bookingDetails.location}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ticket Type</Text>
            <Text style={styles.detailValue}>
              {bookingDetails.ticketCount} {bookingDetails.ticketType || 'General'} 
              ticket{bookingDetails.ticketCount > 1 ? 's' : ''}
            </Text>
          </View>
          
          <View style={[styles.detailRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(bookingDetails.totalAmount, bookingDetails.currency)}
            </Text>
          </View>
        </View>

        {/* Next Steps */}
        <View style={styles.nextStepsCard}>
          <Text style={styles.nextStepsTitle}>What's Next?</Text>
          
          <View style={styles.stepItem}>
            <View style={styles.stepIcon}>
              <Ionicons name="mail-outline" size={20} color="#6366f1" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Email Confirmation</Text>
              <Text style={styles.stepDescription}>
                Check your email for the booking confirmation and e-tickets
              </Text>
            </View>
          </View>
          
          <View style={styles.stepItem}>
            <View style={styles.stepIcon}>
              <Ionicons name="qr-code-outline" size={20} color="#6366f1" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>QR Codes</Text>
              <Text style={styles.stepDescription}>
                Your tickets include QR codes for easy entry at the venue
              </Text>
            </View>
          </View>
          
          <View style={styles.stepItem}>
            <View style={styles.stepIcon}>
              <Ionicons name="calendar-outline" size={20} color="#6366f1" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Add to Calendar</Text>
              <Text style={styles.stepDescription}>
                Don't forget to add the event to your calendar
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleBrowseEvents}
          >
            <Ionicons name="search" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.primaryButtonText}>Browse More Events</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={handleViewTickets}
          >
            <Ionicons name="ticket" size={20} color="#000" style={styles.buttonIcon} />
            <Text style={styles.secondaryButtonText}>View My Tickets</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tertiaryButton}
            onPress={handleGoHome}
          >
            <Ionicons name="home" size={20} color="#666" style={styles.buttonIcon} />
            <Text style={styles.tertiaryButtonText}>Go Home</Text>
          </TouchableOpacity>
        </View>

        {/* Support Info */}
        <View style={styles.supportCard}>
          <Ionicons name="help-circle-outline" size={20} color="#666" />
          <Text style={styles.supportText}>
            Need help? Contact our support team at support@ticket-hub.com
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  eventName: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalLabel: {
    fontSize: 16,
    color: '#000',
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    color: '#10B981',
    fontWeight: 'bold',
  },
  nextStepsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f115',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tertiaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  supportText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    flex: 1,
  },
});

export default PaymentSuccessScreen;