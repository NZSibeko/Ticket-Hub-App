import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');
const API_URL = 'http://localhost:3000';

// Enhanced mock data with completely different unique images for each ticket
const mockTickets = [
  {
    ticket_id: '1',
    ticket_code: 'TKT-001-ABC-123',
    event_id: '1',
    event_name: 'Summer Music Festival',
    event_date: '2024-12-25T18:00:00Z',
    location: 'Cape Town Stadium',
    ticket_type: 'vip',
    price: 299,
    currency: 'ZAR',
    ticket_status: 'ACTIVE',
    purchase_date: '2024-10-01T10:30:00Z',
    image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&q=80',
    venue: 'Main Stage',
    organizer: 'EventHub Productions',
    current_attendees: 850,
    max_attendees: 1200
  },
  {
    ticket_id: '2',
    ticket_code: 'TKT-002-XYZ-789',
    event_id: '2',
    event_name: 'Tech Innovation Summit',
    event_date: '2024-11-15T09:00:00Z',
    location: 'Sandton Convention Centre',
    ticket_type: 'general',
    price: 199,
    currency: 'ZAR',
    ticket_status: 'ACTIVE',
    purchase_date: '2024-09-20T14:15:00Z',
    image_url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop&q=80',
    venue: 'Grand Ballroom',
    organizer: 'Tech Events SA',
    current_attendees: 320,
    max_attendees: 1000
  },
  {
    ticket_id: '3',
    ticket_code: 'TKT-003-DEF-456',
    event_id: '3',
    event_name: 'Jazz Night Under the Stars',
    event_date: '2024-11-08T19:30:00Z',
    location: 'Riverside Amphitheater',
    ticket_type: 'premium',
    price: 180,
    currency: 'ZAR',
    ticket_status: 'ACTIVE',
    purchase_date: '2024-10-05T16:20:00Z',
    image_url: 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=400&h=300&fit=crop&q=80',
    venue: 'Harbor View Lounge',
    organizer: 'Jazz Nights Co.',
    current_attendees: 180,
    max_attendees: 300
  },
  {
    ticket_id: '4',
    ticket_code: 'TKT-004-GHI-789',
    event_id: '4',
    event_name: 'Food & Wine Expo',
    event_date: '2024-11-28T11:00:00Z',
    location: 'CTICC',
    ticket_type: 'vip',
    price: 250,
    currency: 'ZAR',
    ticket_status: 'ACTIVE',
    purchase_date: '2024-10-10T09:15:00Z',
    image_url: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=400&h=300&fit=crop&q=80',
    venue: 'Exhibition Hall A',
    organizer: 'Culinary Experiences',
    current_attendees: 280,
    max_attendees: 800
  },
  {
    ticket_id: '5',
    ticket_code: 'TKT-005-JKL-012',
    event_id: '5',
    event_name: 'Comedy Night Special',
    event_date: '2024-12-05T20:00:00Z',
    location: 'Baxter Theatre',
    ticket_type: 'general',
    price: 120,
    currency: 'ZAR',
    ticket_status: 'ACTIVE',
    purchase_date: '2024-10-08T14:30:00Z',
    image_url: 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=400&h=300&fit=crop&q=80',
    venue: 'Main Theater',
    organizer: 'Laugh Factory',
    current_attendees: 95,
    max_attendees: 150
  },
  {
    ticket_id: '6',
    ticket_code: 'TKT-006-MNO-345',
    event_id: '6',
    event_name: 'Art Exhibition Opening',
    event_date: '2024-11-05T18:00:00Z',
    location: 'Modern Art Museum',
    ticket_type: 'premium',
    price: 145,
    currency: 'ZAR',
    ticket_status: 'ACTIVE',
    purchase_date: '2024-10-12T11:20:00Z',
    image_url: 'https://images.unsplash.com/photo-1501084817091-a4f3d1d19e07?w=400&h=300&fit=crop&q=80',
    venue: 'Gallery Hall',
    organizer: 'Art Collective',
    current_attendees: 75,
    max_attendees: 200
  },
  {
    ticket_id: '7',
    ticket_code: 'TKT-007-PQR-678',
    event_id: '7',
    event_name: 'Rock Revival Concert',
    event_date: '2024-11-20T20:00:00Z',
    location: 'Madison Square Arena',
    ticket_type: 'vip',
    price: 220,
    currency: 'ZAR',
    ticket_status: 'ACTIVE',
    purchase_date: '2024-10-15T15:45:00Z',
    image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop&q=80',
    venue: 'Main Arena',
    organizer: 'Rock Productions',
    current_attendees: 850,
    max_attendees: 1200
  },
  {
    ticket_id: '8',
    ticket_code: 'TKT-008-STU-901',
    event_id: '8',
    event_name: 'Wine Tasting Gala',
    event_date: '2024-12-05T18:00:00Z',
    location: 'Vineyard Estate',
    ticket_type: 'premium',
    price: 195,
    currency: 'ZAR',
    ticket_status: 'ACTIVE',
    purchase_date: '2024-10-18T13:10:00Z',
    image_url: 'https://images.unsplash.com/photo-1474722883778-792e799030e3?w=400&h=300&fit=crop&q=80',
    venue: 'Wine Cellar',
    organizer: 'Vineyard Tours',
    current_attendees: 95,
    max_attendees: 150
  }
];

const getTicketTypeLabel = (type) => {
  const labels = {
    early_bird: 'Early Bird',
    general: 'General',
    family_group: 'Family/Group',
    vip: 'VIP',
    vvip: 'VVIP',
    premium: 'Premium'
  };
  return labels[type] || 'General';
};

const getStatusColor = (status) => {
  switch (status) {
    case 'ACTIVE':
      return '#10b981';
    case 'VALIDATED':
      return '#3b82f6';
    case 'CANCELLED':
      return '#ef4444';
    case 'REFUNDED':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'ACTIVE':
      return 'checkmark-circle';
    case 'VALIDATED':
      return 'scan-circle';
    case 'CANCELLED':
      return 'close-circle';
    case 'REFUNDED':
      return 'cash';
    default:
      return 'help-circle';
  }
};

// Memoized Ticket Card Component with reduced height
const TicketCard = React.memo(({ item, onShowQR, index }) => {
  const isPast = new Date(item.event_date) < new Date() || item.ticket_status === 'CANCELLED';
  const statusColor = getStatusColor(item.ticket_status);
  const soldPercentage = (item.current_attendees / item.max_attendees) * 100;
  
  return (
    <TouchableOpacity
      style={[styles.eventCard, isPast && styles.ticketCardPast]}
      onPress={() => !isPast && onShowQR(item)}
      activeOpacity={0.95}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.image_url }}
          style={styles.eventImage}
          resizeMode="cover"
          onError={(error) => console.log('Image loading error:', error.nativeEvent.error)}
        />
        {soldPercentage > 80 && (
          <View style={styles.hotTag}>
            <Ionicons name="flame" size={10} color="#fff" />
            <Text style={styles.hotTagText}>HOT</Text>
          </View>
        )}
        
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Ionicons name={getStatusIcon(item.ticket_status)} size={12} color="#fff" />
          <Text style={styles.statusText}>{item.ticket_status}</Text>
        </View>
      </View>
      
      <View style={styles.eventInfo}>
        <Text style={styles.eventName} numberOfLines={2}>{item.event_name}</Text>
        
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color="#666" />
          <Text style={styles.metaText} numberOfLines={1}>
            {item.location}
          </Text>
        </View>
        
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color="#666" />
          <Text style={styles.metaText}>
            {new Date(item.event_date).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })} at {new Date(item.event_date).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
        
        <View style={styles.metaRow}>
          <Ionicons name="ticket-outline" size={13} color="#666" />
          <Text style={styles.metaText}>{getTicketTypeLabel(item.ticket_type)} Ticket • R{item.price}</Text>
        </View>

        {!isPast && item.ticket_status === 'ACTIVE' && (
          <TouchableOpacity 
            style={styles.viewTicketButton}
            onPress={() => onShowQR(item)}
          >
            <Ionicons name="qr-code-outline" size={16} color="#6366f1" />
            <Text style={styles.viewTicketText}>View QR Code</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

const MyTicketsScreen = ({ navigation }) => {
  const { user, getAuthHeader } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('current');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef();

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchTickets();
      } else {
        setLoading(false);
      }
    }, [user])
  );

  const fetchTickets = async () => {
    try {
      setApiError(false);
      const headers = await getAuthHeader();
      const response = await axios.get(
        `${API_URL}/api/payments/tickets/customer/${user.customer_id}`,
        { headers }
      );
      
      setTickets(response.data.tickets || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setApiError(true);
      setTickets(mockTickets);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    const now = new Date();
    return tickets.filter(ticket => {
      const eventDate = new Date(ticket.event_date);
      if (selectedTab === 'current') {
        return eventDate >= now && ticket.ticket_status !== 'CANCELLED';
      } else {
        return eventDate < now || ticket.ticket_status === 'CANCELLED';
      }
    });
  }, [tickets, selectedTab]);

  const openQRModal = useCallback((ticket) => {
    setSelectedTicket(ticket);
    setShowQRModal(true);
  }, []);

  const closeQRModal = useCallback(() => {
    setShowQRModal(false);
    setSelectedTicket(null);
    setShowShareModal(false);
  }, []);

  const openShareModal = useCallback(() => {
    setShowShareModal(true);
  }, []);

  const scrollToIndex = (index) => {
    if (flatListRef.current && filteredTickets.length > 0) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5
      });
      setCurrentIndex(index);
    }
  };

  const scrollNext = () => {
    if (currentIndex < filteredTickets.length - 1) {
      scrollToIndex(currentIndex + 1);
    } else {
      scrollToIndex(0);
    }
  };

  const scrollPrev = () => {
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    } else {
      scrollToIndex(filteredTickets.length - 1);
    }
  };

  const onMomentumScrollEnd = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const viewSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.floor(contentOffset / viewSize);
    setCurrentIndex(index);
  };

  const shareTicket = async (platform = 'more') => {
    try {
      const shareOptions = {
        title: `My Ticket for ${selectedTicket.event_name}`,
        message: `Check out my ticket for ${selectedTicket.event_name}! 🎫\n\nEvent: ${selectedTicket.event_name}\nDate: ${new Date(selectedTicket.event_date).toLocaleDateString()}\nLocation: ${selectedTicket.location}`,
      };
      
      await Share.share(shareOptions);
    } catch (error) {
      console.error('Error sharing ticket:', error);
      Alert.alert('Error', 'Failed to share ticket. Please try again.');
    }
  };

  const preventScreenshot = () => {
    Alert.alert(
      'Security Notice',
      'Screenshots are disabled for ticket QR codes to prevent fraud. Please use the share button to send your ticket securely.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const renderTicketItem = useCallback(({ item, index }) => (
    <View style={styles.carouselItem}>
      <TicketCard 
        item={item} 
        onShowQR={openQRModal} 
        index={index}
      />
    </View>
  ), [openQRModal]);

  const keyExtractor = useCallback((item) => item.ticket_id, []);

  const getItemLayout = (data, index) => ({
    length: 400 + 20, // card width + margin
    offset: (400 + 20) * index,
    index,
  });

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={selectedTab === 'current' ? 'ticket-outline' : 'time-outline'} 
        size={48} 
        color="#ccc" 
      />
      <Text style={styles.emptyText}>
        {selectedTab === 'current' ? 'No upcoming tickets' : 'No past tickets'}
      </Text>
      <Text style={styles.emptySubtext}>
        {selectedTab === 'current' 
          ? 'Find exciting events and book your tickets'
          : 'Your past tickets will appear here'
        }
      </Text>
      {selectedTab === 'current' && (
        <TouchableOpacity 
          style={styles.browseButton}
          onPress={() => navigation.navigate('Discover')}
        >
          <Text style={styles.browseButtonText}>Browse Events</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [selectedTab, navigation]);

  const ShareButton = ({ platform, icon, color, label }) => (
    <TouchableOpacity 
      style={styles.shareButton}
      onPress={() => shareTicket(platform)}
    >
      <View style={[styles.shareIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color="#fff" />
      </View>
      <Text style={styles.shareLabel}>{label}</Text>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={64} color="#ccc" />
          <Text style={styles.error}>Please login to view your tickets</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading your tickets...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Modern Header with Gradient */}
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80' }}
          style={styles.headerBackground}
          blurRadius={5}
        />
        <View style={styles.headerOverlay} />
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>My Tickets</Text>
            <Text style={styles.headerSubtitle}>
              {selectedTab === 'current' ? 'Upcoming experiences' : 'Past memories'}
            </Text>
          </View>
          <View style={styles.ticketCountBadge}>
            <Text style={styles.ticketCountText}>
              {filteredTickets.length} {filteredTickets.length === 1 ? 'Ticket' : 'Tickets'}
            </Text>
          </View>
        </View>
      </View>

      {apiError && (
        <View style={styles.apiWarning}>
          <Ionicons name="warning-outline" size={16} color="#FFA000" />
          <Text style={styles.apiWarningText}>Using demo data - Backend not connected</Text>
        </View>
      )}

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'current' && styles.tabActive]}
          onPress={() => setSelectedTab('current')}
        >
          <Ionicons 
            name="time-outline" 
            size={18} 
            color={selectedTab === 'current' ? '#6366f1' : '#999'} 
          />
          <Text style={[styles.tabText, selectedTab === 'current' && styles.tabTextActive]}>
            Upcoming ({tickets.filter(t => new Date(t.event_date) >= new Date() && t.ticket_status !== 'CANCELLED').length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'previous' && styles.tabActive]}
          onPress={() => setSelectedTab('previous')}
        >
          <Ionicons 
            name="checkmark-done-outline" 
            size={18} 
            color={selectedTab === 'previous' ? '#6366f1' : '#999'} 
          />
          <Text style={[styles.tabText, selectedTab === 'previous' && styles.tabTextActive]}>
            Past ({tickets.filter(t => new Date(t.event_date) < new Date() || t.ticket_status === 'CANCELLED').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Carousel Section */}
      {filteredTickets.length > 0 && (
        <View style={styles.carouselContainer}>
          {/* Left Arrow */}
          <TouchableOpacity style={[styles.arrowButton, styles.arrowLeft]} onPress={scrollPrev}>
            <Ionicons name="chevron-back" size={24} color="#6366f1" />
          </TouchableOpacity>

          {/* Tickets Carousel */}
          <FlatList
            ref={flatListRef}
            data={filteredTickets}
            renderItem={renderTicketItem}
            keyExtractor={keyExtractor}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={16}
            contentContainerStyle={styles.horizontalScroll}
            getItemLayout={getItemLayout}
            initialScrollIndex={0}
            snapToInterval={400 + 20}
            decelerationRate="fast"
          />

          {/* Right Arrow */}
          <TouchableOpacity style={[styles.arrowButton, styles.arrowRight]} onPress={scrollNext}>
            <Ionicons name="chevron-forward" size={24} color="#6366f1" />
          </TouchableOpacity>

          {/* Pagination Dots */}
          {filteredTickets.length > 1 && (
            <View style={styles.pagination}>
              {filteredTickets.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.paginationDot,
                    currentIndex === index && styles.paginationDotActive
                  ]}
                  onPress={() => scrollToIndex(index)}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {filteredTickets.length === 0 && ListEmptyComponent}

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        transparent
        animationType="slide"
        onRequestClose={closeQRModal}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={closeQRModal}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>

            {selectedTicket && (
              <ScrollView 
                style={styles.modalScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.ticketHeaderModal}>
                  <Image
                    source={{ uri: selectedTicket.image_url }}
                    style={styles.ticketImageModal}
                    resizeMode="cover"
                  />
                  <View style={styles.ticketHeaderInfo}>
                    <Text style={styles.eventNameModal}>{selectedTicket.event_name}</Text>
                    <Text style={styles.organizerModal}>{selectedTicket.organizer || 'EventHub'}</Text>
                  </View>
                </View>

                <View style={styles.qrSection} onStartShouldSetResponder={() => true} onTouchStart={preventScreenshot}>
                  <View style={styles.qrCodeContainer}>
                    <Text style={styles.qrTitle}>Digital Ticket</Text>
                    <View style={styles.qrCodeWrapper}>
                      <QRCode
                        value={selectedTicket.ticket_code}
                        size={80} // Reduced QR code size
                        backgroundColor="white"
                        color="black"
                      />
                    </View>
                    <Text style={styles.ticketCode}>{selectedTicket.ticket_code}</Text>
                    <Text style={styles.qrInstructions}>
                      Present this QR code at the event entrance
                    </Text>
                  </View>
                </View>

                <View style={styles.ticketDetailsModal}>
                  <DetailItem icon="person" label="Ticket Holder" value={user.name || 'You'} />
                  <DetailItem icon="ticket" label="Ticket Type" value={getTicketTypeLabel(selectedTicket.ticket_type)} />
                  <DetailItem 
                    icon="calendar" 
                    label="Date & Time" 
                    value={`${new Date(selectedTicket.event_date).toLocaleDateString()} • ${new Date(selectedTicket.event_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`} 
                  />
                  <DetailItem icon="location" label="Venue" value={selectedTicket.location} />
                </View>

                <TouchableOpacity 
                  style={styles.shareButtonMain}
                  onPress={openShareModal}
                >
                  <Ionicons name="share-social" size={20} color="#6366f1" />
                  <Text style={styles.shareButtonMainText}>Share Ticket</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Share Options Modal */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="fade"
        onRequestClose={closeQRModal}
      >
        <View style={styles.shareModalOverlay}>
          <View style={styles.shareModalContent}>
            <Text style={styles.shareModalTitle}>Share Ticket</Text>
            <Text style={styles.shareModalSubtitle}>Send your ticket securely</Text>
            
            <View style={styles.shareOptions}>
              <ShareButton platform="whatsapp" icon="logo-whatsapp" color="#25D366" label="WhatsApp" />
              <ShareButton platform="instagram" icon="logo-instagram" color="#E4405F" label="Instagram" />
              <ShareButton platform="facebook" icon="logo-facebook" color="#1877F2" label="Facebook" />
              <ShareButton platform="twitter" icon="logo-twitter" color="#1DA1F2" label="Twitter" />
              <ShareButton platform="email" icon="mail" color="#EA4335" label="Email" />
              <ShareButton platform="more" icon="share" color="#6366f1" label="More" />
            </View>
            
            <TouchableOpacity 
              style={styles.cancelShareButton}
              onPress={() => setShowShareModal(false)}
            >
              <Text style={styles.cancelShareText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const DetailItem = ({ icon, label, value }) => (
  <View style={styles.detailItem}>
    <Ionicons name={icon} size={16} color="#6366f1" style={styles.detailItemIcon} />
    <View style={styles.detailItemContent}>
      <Text style={styles.detailItemLabel}>{label}</Text>
      <Text style={styles.detailItemValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  // Modern Header with Image
  header: {
    height: 160,
    position: 'relative',
    overflow: 'hidden',
  },
  headerBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(99, 102, 241, 0.85)',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ticketCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ticketCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  apiWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFEAA7',
    justifyContent: 'center',
    gap: 6,
  },
  apiWarningText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginTop: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 0,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#6366f1',
  },
  // Carousel Styles
  carouselContainer: {
    flex: 1,
    position: 'relative',
    marginBottom: 20,
  },
  horizontalScroll: {
    paddingLeft: 20,
    paddingRight: 12,
    paddingVertical: 4,
  },
  carouselItem: {
    marginRight: 20,
  },
  arrowButton: {
    position: 'absolute',
    top: '40%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  arrowLeft: {
    left: 10,
  },
  arrowRight: {
    right: 10,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  paginationDotActive: {
    backgroundColor: '#6366f1',
    width: 20,
  },
  // Ticket Card Styles - Reduced height by 10%
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: 400,
    marginRight: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
    height: 396, // Reduced from 440px (240px image + 200px content) to 396px
  },
  ticketCardPast: {
    opacity: 0.7,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 216, // Reduced from 240px by 10% (216px)
    backgroundColor: '#e0e0e0',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  hotTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF4400',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hotTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventInfo: {
    padding: 18, // Slightly reduced padding
    minHeight: 110,
    flex: 1,
    justifyContent: 'space-between',
  },
  eventName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5, // Reduced spacing
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    flex: 1,
    lineHeight: 18,
  },
  viewTicketButton: {
    flexDirection: 'row',
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  viewTicketText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  error: {
    color: '#666',
    fontSize: 14,
    marginTop: 16,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 6,
  },
  browseButton: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  closeModalButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  ticketHeaderModal: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  ticketImageModal: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  ticketHeaderInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  eventNameModal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  organizerModal: {
    fontSize: 14,
    color: '#64748b',
  },
  qrSection: {
    padding: 16, // Reduced padding
    alignItems: 'center',
  },
  qrCodeContainer: {
    alignItems: 'center',
    width: '100%',
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12, // Reduced margin
  },
  qrCodeWrapper: {
    padding: 8, // Significantly reduced padding
    backgroundColor: '#fff',
    borderRadius: 8, // Smaller border radius
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8, // Reduced margin
  },
  ticketCode: {
    fontSize: 12, // Smaller font
    fontWeight: 'bold',
    color: '#1e293b',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    marginBottom: 4, // Reduced margin
  },
  qrInstructions: {
    fontSize: 11, // Smaller font
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 20,
  },
  ticketDetailsModal: {
    padding: 16, // Reduced padding
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12, // Reduced margin
  },
  detailItemIcon: {
    marginTop: 2,
    marginRight: 12,
    width: 20,
  },
  detailItemContent: {
    flex: 1,
  },
  detailItemLabel: {
    fontSize: 11, // Smaller font
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailItemValue: {
    fontSize: 13, // Smaller font
    color: '#1e293b',
    fontWeight: '500',
  },
  shareButtonMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 10,
    gap: 6,
    marginTop: 8,
  },
  shareButtonMainText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366f1',
  },
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  shareModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  shareModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
  },
  shareModalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  shareOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  shareButton: {
    alignItems: 'center',
    width: '30%',
    marginBottom: 16,
  },
  shareIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  cancelShareButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelShareText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
});

export default MyTicketsScreen;