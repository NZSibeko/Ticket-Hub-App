import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const API_URL = 'http://localhost:3000';

const EventDetailScreen = ({ route, navigation }) => {
  const { eventId } = route.params;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTicketType, setSelectedTicketType] = useState(null);
  const { getAuthHeader } = useAuth();

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching event details for:', eventId);
      
      const headers = getAuthHeader();
      const response = await axios.get(`${API_URL}/zi_events/${eventId}`, { headers });
      
      if (response.data && response.data.d) {
        setEvent(response.data.d);
        console.log('✅ Event details fetched successfully');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('❌ Error fetching event details:', err);
      setError(err.message || 'Failed to load event details');
      Alert.alert('Error', 'Failed to load event details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTicketTypeSelect = (ticketType) => {
    setSelectedTicketType(ticketType);
  };

  const handlePurchase = () => {
    if (!selectedTicketType) {
      Alert.alert('Select Ticket', 'Please select a ticket type before purchasing.');
      return;
    }

    if (selectedTicketType.available_quantity <= 0) {
      Alert.alert('Sold Out', 'This ticket type is sold out. Please select another one.');
      return;
    }

    navigation.navigate('TicketPurchaseScreen', {
      event: event,
      ticketType: selectedTicketType,
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount, currency = 'ZAR') => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency,
    }).format(amount);
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

  const getTicketTypeLabel = (type) => {
    const labels = {
      early_bird: 'Early Bird',
      general: 'General',
      family_group: 'Family/Group',
      vip: 'VIP',
      vvip: 'VVIP',
    };
    return labels[type] || type.replace(/_/g, ' ').toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading event details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
        <Text style={styles.errorText}>Unable to load event</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchEventDetails}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centered}>
        <Ionicons name="calendar-outline" size={64} color="#ccc" />
        <Text style={styles.errorText}>Event not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Event Image */}
        {event.event_image && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: event.event_image }} style={styles.eventImage} />
            <View style={styles.imageOverlay} />
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Event Details Card */}
        <View style={styles.contentContainer}>
          <View style={styles.headerCard}>
            <Text style={styles.eventName}>{event.event_name}</Text>
            
            {/* Date & Time */}
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="calendar" size={20} color="#000" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{formatDate(event.start_date)}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="time" size={20} color="#000" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>{formatTime(event.start_date)}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="location" size={20} color="#000" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{event.location}</Text>
              </View>
            </View>

            {/* Attendees Progress */}
            <View style={styles.attendeesSection}>
              <View style={styles.attendeesHeader}>
                <Text style={styles.attendeesLabel}>Attendees</Text>
                <Text style={styles.attendeesCount}>
                  {event.current_attendees}/{event.max_attendees}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${Math.min((event.current_attendees / event.max_attendees) * 100, 100)}%` }
                  ]} 
                />
              </View>
            </View>
          </View>

          {/* Description */}
          {event.event_description && (
            <View style={styles.descriptionCard}>
              <Text style={styles.sectionTitle}>About Event</Text>
              <Text style={styles.descriptionText}>{event.event_description}</Text>
            </View>
          )}

          {/* Ticket Types */}
          <View style={styles.ticketsCard}>
            <Text style={styles.sectionTitle}>Select Your Ticket</Text>
            <Text style={styles.sectionSubtitle}>
              Choose the ticket type that suits you best
            </Text>
            
            {event.ticket_types && event.ticket_types.length > 0 ? (
              <View style={styles.ticketsList}>
                {event.ticket_types.map((ticketType) => {
                  const isSelected = selectedTicketType?.ticket_type_id === ticketType.ticket_type_id;
                  const isSoldOut = ticketType.available_quantity <= 0;
                  
                  return (
                    <TouchableOpacity
                      key={ticketType.ticket_type_id}
                      style={[
                        styles.ticketCard,
                        isSelected && styles.ticketCardSelected,
                        isSoldOut && styles.ticketCardDisabled,
                      ]}
                      onPress={() => !isSoldOut && handleTicketTypeSelect(ticketType)}
                      disabled={isSoldOut}
                      activeOpacity={0.7}
                    >
                      <View style={styles.ticketCardContent}>
                        <View style={styles.ticketIconContainer}>
                          <Ionicons 
                            name={getTicketTypeIcon(ticketType.type)} 
                            size={24} 
                            color={isSelected ? '#fff' : '#000'} 
                          />
                        </View>
                        
                        <View style={styles.ticketInfo}>
                          <Text style={[
                            styles.ticketTypeName,
                            isSelected && styles.ticketTypeNameSelected,
                            isSoldOut && styles.ticketTypeNameDisabled,
                          ]}>
                            {getTicketTypeLabel(ticketType.type)}
                          </Text>
                          <Text style={[
                            styles.ticketAvailability,
                            isSelected && styles.ticketAvailabilitySelected,
                          ]}>
                            {isSoldOut 
                              ? 'Sold Out' 
                              : `${ticketType.available_quantity} available`
                            }
                          </Text>
                        </View>
                        
                        <Text style={[
                          styles.ticketPrice,
                          isSelected && styles.ticketPriceSelected,
                          isSoldOut && styles.ticketPriceDisabled,
                        ]}>
                          {formatCurrency(ticketType.price, event.currency)}
                        </Text>
                      </View>

                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark-circle" size={24} color="#fff" />
                        </View>
                      )}

                      {isSoldOut && (
                        <View style={styles.soldOutOverlay}>
                          <Text style={styles.soldOutText}>SOLD OUT</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.noTicketsContainer}>
                <Ionicons name="ticket-outline" size={48} color="#ccc" />
                <Text style={styles.noTicketsText}>No tickets available</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Purchase Button */}
      {event.ticket_types && event.ticket_types.some(t => t.available_quantity > 0) && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.purchaseButton,
              !selectedTicketType && styles.purchaseButtonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={!selectedTicketType}
          >
            <View style={styles.purchaseButtonContent}>
              <View>
                <Text style={styles.purchaseButtonLabel}>
                  {selectedTicketType ? getTicketTypeLabel(selectedTicketType.type) : 'Select a ticket'}
                </Text>
                {selectedTicketType && (
                  <Text style={styles.purchaseButtonPrice}>
                    {formatCurrency(selectedTicketType.price, event.currency)}
                  </Text>
                )}
              </View>
              <View style={styles.purchaseButtonIcon}>
                <Ionicons name="arrow-forward" size={24} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
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
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#000',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 300,
    backgroundColor: '#e0e0e0',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  headerCard: {
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
  eventName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    lineHeight: 32,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  attendeesSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  attendeesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  attendeesLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  attendeesCount: {
    fontSize: 14,
    color: '#000',
    fontWeight: 'bold',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 3,
  },
  descriptionCard: {
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 24,
  },
  ticketsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  ticketsList: {
    gap: 12,
  },
  ticketCard: {
    position: 'relative',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ticketCardSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  ticketCardDisabled: {
    opacity: 0.5,
  },
  ticketCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketTypeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  ticketTypeNameSelected: {
    color: '#fff',
  },
  ticketTypeNameDisabled: {
    color: '#999',
  },
  ticketAvailability: {
    fontSize: 13,
    color: '#666',
  },
  ticketAvailabilitySelected: {
    color: 'rgba(255,255,255,0.7)',
  },
  ticketPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  ticketPriceSelected: {
    color: '#fff',
  },
  ticketPriceDisabled: {
    color: '#999',
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  soldOutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldOutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
    letterSpacing: 1,
  },
  noTicketsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noTicketsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  purchaseButtonDisabled: {
    backgroundColor: '#ccc',
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
});

export default EventDetailScreen;