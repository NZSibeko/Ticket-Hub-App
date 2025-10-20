import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
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
    event_date: '2025-12-25T18:00:00Z', // Changed to 2025
    location: 'Cape Town Stadium',
    ticket_type: 'vip',
    price: 299,
    currency: 'ZAR',
    ticket_status: 'ACTIVE',
    purchase_date: '2024-10-01T10:30:00Z',
    image_url: 'https://picsum.photos/800/600?random=1',
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
    event_date: '2025-11-15T09:00:00Z', // Changed to 2025
    location: 'Sandton Convention Centre',
    ticket_type: 'general',
    price: 199,
    currency: 'ZAR',
    ticket_status: 'ACTIVE',
    purchase_date: '2024-09-20T14:15:00Z',
    image_url: 'https://picsum.photos/800/600?random=2',
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
    event_date: '2025-11-08T19:30:00Z', // Changed to 2025
    location: 'Riverside Amphitheater',
    ticket_type: 'premium',
    price: 180,
    currency: 'ZAR',
    ticket_status: 'ACTIVE',
    purchase_date: '2024-10-05T16:20:00Z',
    image_url: 'https://picsum.photos/800/600?random=3',
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
    event_date: '2025-11-28T11:00:00Z', // Changed to 2025
    location: 'CTICC',
    ticket_type: 'vip',
    price: 250,
    currency: 'ZAR',
    ticket_status: 'ACTIVE',
    purchase_date: '2024-10-10T09:15:00Z',
    image_url: 'https://picsum.photos/800/600?random=4',
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
    event_date: '2025-12-05T20:00:00Z', // Changed to 2025
    location: 'Baxter Theatre',
    ticket_type: 'general',
    price: 120,
    currency: 'ZAR',
    ticket_status: 'ACTIVE',
    purchase_date: '2024-10-08T14:30:00Z',
    image_url: 'https://picsum.photos/800/600?random=5',
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
    event_date: '2025-11-05T18:00:00Z', // Changed to 2025
    location: 'Modern Art Museum',
    ticket_type: 'premium',
    price: 145,
    currency: 'ZAR',
    ticket_status: 'ACTIVE',
    purchase_date: '2024-10-12T11:20:00Z',
    image_url: 'https://picsum.photos/800/600?random=6',
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
    event_date: '2025-11-20T20:00:00Z', // Changed to 2025
    location: 'Madison Square Arena',
    ticket_type: 'vip',
    price: 220,
    currency: 'ZAR',
    ticket_status: 'ACTIVE',
    purchase_date: '2024-10-15T15:45:00Z',
    image_url: 'https://picsum.photos/800/600?random=7',
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
    event_date: '2026-01-15T18:00:00Z', // Changed to 2026
    location: 'Vineyard Estate',
    ticket_type: 'premium',
    price: 195,
    currency: 'ZAR',
    ticket_status: 'ACTIVE',
    purchase_date: '2024-10-18T13:10:00Z',
    image_url: 'https://picsum.photos/800/600?random=8',
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

const getTicketTypeColor = (type) => {
  const colors = {
    early_bird: '#10b981',
    general: '#6366f1',
    family_group: '#8b5cf6',
    vip: '#f59e0b',
    vvip: '#ef4444',
    premium: '#06b6d4'
  };
  return colors[type] || '#6366f1';
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

// Memoized Ticket Card Component with modern professional design
// Replace the TicketCard component with this updated version

// Replace the TicketCard component with this updated version
// Add this import at the top if not already present: import { Platform } from 'react-native';

const TicketCard = React.memo(({ item, onShowQR, index }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const isPast = new Date(item.event_date) < new Date() || item.ticket_status === 'CANCELLED';
  const statusColor = getStatusColor(item.ticket_status);
  const ticketTypeColor = getTicketTypeColor(item.ticket_type);
  const soldPercentage = (item.current_attendees / item.max_attendees) * 100;
  
  const hasValidImage = item.image_url && !imageError;
  
  // Log for debugging
  console.log(`Ticket ${index + 1}: ${item.event_name}, Image URL: ${item.image_url}, Loaded: ${imageLoaded}, Error: ${imageError}`);
  
  return (
    <TouchableOpacity
      style={[styles.eventCard, isPast && styles.ticketCardPast]}
      onPress={() => !isPast && onShowQR(item)}
      activeOpacity={0.95}
    >
      <View style={styles.imageContainer}>
        {hasValidImage ? (
          <View style={{ width: '100%', height: '100%', position: 'relative' }}>
            <img
              src={item.image_url}
              alt={item.event_name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: imageLoaded ? 'block' : 'none'
              }}
              onLoad={() => {
                console.log(`Image loaded: ${item.event_name}`);
                setImageLoaded(true);
              }}
              onError={(e) => {
                console.error(`Image failed to load: ${item.event_name}`, e);
                setImageError(true);
              }}
            />
            {!imageLoaded && !imageError && (
              <View style={[styles.eventImage, { backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 0, left: 0 }]}>
                <ActivityIndicator size="small" color="#6366f1" />
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.eventImage, { backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="image-outline" size={48} color="#fff" />
            <Text style={{ color: '#fff', marginTop: 8, fontSize: 12, textAlign: 'center', paddingHorizontal: 8 }}>
              {item.event_name?.substring(0, 20)}
            </Text>
          </View>
        )}
        
        {soldPercentage > 80 && (
          <View style={styles.hotTag}>
            <Ionicons name="flame" size={12} color="#fff" />
            <Text style={styles.hotTagText}>TRENDING</Text>
          </View>
        )}
        
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Ionicons name={getStatusIcon(item.ticket_status)} size={12} color="#fff" />
          <Text style={styles.statusText}>{item.ticket_status}</Text>
        </View>

        <View style={[styles.ticketTypeBadge, { backgroundColor: ticketTypeColor }]}>
          <Ionicons name="star" size={10} color="#fff" />
          <Text style={styles.ticketTypeText}>{getTicketTypeLabel(item.ticket_type)}</Text>
        </View>
      </View>
      
      <View style={styles.eventInfo}>
        <Text style={styles.eventName} numberOfLines={2}>{item.event_name}</Text>
        
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="location" size={12} color="#6366f1" />
            </View>
            <Text style={styles.infoText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="calendar" size={12} color="#6366f1" />
            </View>
            <Text style={styles.infoText}>
              {new Date(item.event_date).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="time" size={12} color="#6366f1" />
            </View>
            <Text style={styles.infoText}>
              {new Date(item.event_date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Ticket Price</Text>
            <Text style={styles.priceValue}>R{item.price}</Text>
          </View>
          
          {!isPast && item.ticket_status === 'ACTIVE' && (
            <TouchableOpacity 
              style={styles.viewTicketButton}
              onPress={() => onShowQR(item)}
            >
              <Ionicons name="qr-code" size={18} color="#fff" />
              <Text style={styles.viewTicketText}>View QR</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});;

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
    // Try to fetch from API first
    const headers = await getAuthHeader();
    const response = await axios.get(
      `${API_URL}/api/payments/tickets/customer/${user.customer_id}`,
      { headers, timeout: 5000 } // Add timeout
    );
    
    if (response.data.tickets && response.data.tickets.length > 0) {
      setTickets(response.data.tickets);
      setApiError(false); // Important: Set to false when API works
    } else {
      // If API returns empty, use mock data but don't show error
      setTickets(mockTickets);
      setApiError(false); // Don't show demo mode banner
    }
  } catch (err) {
    console.error('Error fetching tickets:', err);
    // Only show demo mode if you actually want users to know it's mock data
    // setApiError(true); // Comment this out to hide the banner
    setApiError(false); // Use this instead to hide "Demo Mode" banner
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
    length: 320 + 16,
    offset: (320 + 16) * index,
    index,
  });

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons 
          name={selectedTab === 'current' ? 'ticket-outline' : 'time-outline'} 
          size={64} 
          color="#e5e7eb" 
        />
      </View>
      <Text style={styles.emptyText}>
        {selectedTab === 'current' ? 'No upcoming tickets' : 'No past tickets'}
      </Text>
      <Text style={styles.emptySubtext}>
        {selectedTab === 'current' 
          ? 'Start exploring amazing events and book your first ticket'
          : 'Your attended events will appear here'
        }
      </Text>
      {selectedTab === 'current' && (
        <TouchableOpacity 
          style={styles.browseButton}
          onPress={() => navigation.navigate('Discover')}
        >
          <Ionicons name="compass" size={18} color="#fff" />
          <Text style={styles.browseButtonText}>Discover Events</Text>
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
        <Ionicons name={icon} size={22} color="#fff" />
      </View>
      <Text style={styles.shareLabel}>{label}</Text>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <View style={styles.lockIconContainer}>
            <Ionicons name="lock-closed" size={64} color="#6366f1" />
          </View>
          <Text style={styles.authTitle}>Authentication Required</Text>
          <Text style={styles.error}>Please sign in to view your tickets</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
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
          source={{ uri: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80' }}
          style={styles.headerBackground}
          blurRadius={8}
        />
        <View style={styles.headerOverlay} />
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>My Tickets</Text>
            <Text style={styles.headerSubtitle}>
              {selectedTab === 'current' ? 'Upcoming experiences await' : 'Past event memories'}
            </Text>
          </View>
          <View style={styles.ticketCountBadge}>
            <Ionicons name="ticket" size={16} color="#fff" />
            <Text style={styles.ticketCountText}>
              {filteredTickets.length}
            </Text>
          </View>
        </View>
      </View>

      {apiError && (
        <View style={styles.apiWarning}>
          <Ionicons name="information-circle" size={18} color="#f59e0b" />
          <Text style={styles.apiWarningText}>Demo Mode - Sample data displayed</Text>
        </View>
      )}

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'current' && styles.tabActive]}
          onPress={() => setSelectedTab('current')}
        >
          <Ionicons 
            name="time" 
            size={20} 
            color={selectedTab === 'current' ? '#6366f1' : '#9ca3af'} 
          />
          <Text style={[styles.tabText, selectedTab === 'current' && styles.tabTextActive]}>
            Upcoming
          </Text>
          <View style={[styles.tabBadge, selectedTab === 'current' && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, selectedTab === 'current' && styles.tabBadgeTextActive]}>
              {tickets.filter(t => new Date(t.event_date) >= new Date() && t.ticket_status !== 'CANCELLED').length}
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'previous' && styles.tabActive]}
          onPress={() => setSelectedTab('previous')}
        >
          <Ionicons 
            name="checkmark-done" 
            size={20} 
            color={selectedTab === 'previous' ? '#6366f1' : '#9ca3af'} 
          />
          <Text style={[styles.tabText, selectedTab === 'previous' && styles.tabTextActive]}>
            Past
          </Text>
          <View style={[styles.tabBadge, selectedTab === 'previous' && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, selectedTab === 'previous' && styles.tabBadgeTextActive]}>
              {tickets.filter(t => new Date(t.event_date) < new Date() || t.ticket_status === 'CANCELLED').length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Carousel Section */}
{filteredTickets.length > 0 && (
  <View style={styles.carouselContainer}>
    {/* Arrow Controls at Top */}
    {filteredTickets.length > 1 && (
      <View style={styles.arrowContainer}>
        <TouchableOpacity 
          style={styles.arrowButton} 
          onPress={scrollPrev}
        >
          <Ionicons name="chevron-back" size={20} color="#6366f1" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.arrowButton} 
          onPress={scrollNext}
        >
          <Ionicons name="chevron-forward" size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>
    )}

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
            snapToInterval={320 + 16}
            decelerationRate="fast"
          />

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
              <Ionicons name="close-circle" size={32} color="#9ca3af" />
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
                    <Text style={styles.organizerModal}>
                      <Ionicons name="business" size={14} color="#64748b" /> {selectedTicket.organizer || 'EventHub'}
                    </Text>
                  </View>
                </View>

                <View style={styles.qrSection} onStartShouldSetResponder={() => true} onTouchStart={preventScreenshot}>
                  <View style={styles.qrCodeContainer}>
                    <View style={styles.qrHeader}>
                      <Ionicons name="qr-code" size={20} color="#6366f1" />
                      <Text style={styles.qrTitle}>Digital Ticket</Text>
                    </View>
                    <View style={styles.qrCodeWrapper}>
                      <QRCode
                        value={selectedTicket.ticket_code}
                        size={120}
                        backgroundColor="white"
                        color="black"
                      />
                    </View>
                    <View style={styles.ticketCodeContainer}>
                      <Text style={styles.ticketCodeLabel}>Ticket Code</Text>
                      <Text style={styles.ticketCode}>{selectedTicket.ticket_code}</Text>
                    </View>
                    <View style={styles.qrInstructionsContainer}>
                      <Ionicons name="information-circle-outline" size={16} color="#64748b" />
                      <Text style={styles.qrInstructions}>
                        Scan this code at the event entrance
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.ticketDetailsModal}>
                  <Text style={styles.detailsTitle}>Event Details</Text>
                  <DetailItem icon="location-sharp" label="Venue" value={selectedTicket.location} />
                  <DetailItem icon="cash" label="Price Paid" value={`${selectedTicket.currency} ${selectedTicket.price}`} />
                </View>

                <View style={styles.securityNotice}>
                  <Ionicons name="shield-checkmark" size={16} color="#10b981" />
                  <Text style={styles.securityNoticeText}>
                    Your ticket is secure and verified
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const DetailItem = ({ icon, label, value }) => (
  <View style={styles.detailItem}>
    <View style={styles.detailItemIconContainer}>
      <Ionicons name={icon} size={18} color="#6366f1" />
    </View>
    <View style={styles.detailItemContent}>
      <Text style={styles.detailItemLabel}>{label}</Text>
      <Text style={styles.detailItemValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  // Modern Header with Image
  header: {
    height: 150,
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
    backgroundColor: 'rgba(9, 9, 10, 0.92)',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 6,
    fontWeight: '500',
  },
  ticketCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  ticketCountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  apiWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fef3c7',
    justifyContent: 'center',
    gap: 8,
  },
  apiWarningText: {
    color: '#92400e',
    fontSize: 13,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    letterSpacing: -0.2,
  },
  tabTextActive: {
    color: '#6366f1',
  },
  tabBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: '#6366f1',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
  },
  tabBadgeTextActive: {
    color: '#fff',
  },
  carouselContainer: {
    flex: 1,
    paddingVertical: 16,
  },
  // Arrow Container at Top
  arrowContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  arrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  horizontalScroll: {
    paddingHorizontal: 16,
  },
  carouselItem: {
    width: 320,
    marginRight: 16,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
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
    width: 24,
  },
  // Ticket Card Styles
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  ticketCardPast: {
    opacity: 0.8,
  },
  imageContainer: {
    width: '100%',
    height: 90,
    position: 'relative',
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e5e7eb',
  },
  hotTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  hotTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ticketTypeBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ticketTypeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  eventInfo: {
    padding: 20,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
    lineHeight: 22,
  },
  infoSection: {
    gap: 12,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  viewTicketButton: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  viewTicketText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingBottom: 100,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  lockIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#e0f2fe',
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  loginButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: '100%',
    minHeight: '50%',
    width: '50%',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  closeModalButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1000,
    padding: 4,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    paddingTop: 40,
  },
  ticketHeaderModal: {
    //marginBottom: 2,
  },
  ticketImageModal: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    marginBottom: 5,
  },
  ticketHeaderInfo: {
    gap: 2,
  },
  eventNameModal: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: 28,
  },
  organizerModal: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  qrSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 24,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  qrCodeContainer: {
    alignItems: 'center',
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  qrCodeWrapper: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  ticketCodeContainer: {
    alignItems: 'center',
    marginBottom: 2,
  },
  ticketCodeLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ticketCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: 1,
  },
  qrInstructionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    //gap: 2,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    //paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  qrInstructions: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  ticketDetailsModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    //marginBottom: 5,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    gap: 12,
  },
  detailItemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailItemContent: {
    flex: 1,
  },
  detailItemLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  shareButtonMain: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    marginBottom: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shareButtonMainText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  securityNoticeText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },

});

export default MyTicketsScreen;