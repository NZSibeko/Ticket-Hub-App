import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');
const API_URL = 'http://localhost:8081';

// Mock Data
const mockEvents = [
  {
    event_id: '1',
    event_name: 'Summer Music Festival',
    event_description: 'An amazing outdoor music festival with top artists',
    location: 'Central Park, New York',
    start_date: '2024-12-25T18:00:00Z',
    end_date: '2024-12-25T23:00:00Z',
    current_attendees: 450,
    max_attendees: 500,
    image_url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
    price: 75,
    ticket_types: [{ type: 'general', price: 75 }]
  },
  {
    event_id: '2',
    event_name: 'Cheap Eats Night Market',
    event_description: 'Budget friendly food options.',
    location: 'Downtown District',
    start_date: '2024-11-08T19:30:00Z',
    current_attendees: 180,
    max_attendees: 300,
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
    price: 15,
    ticket_types: [{ type: 'general', price: 15 }]
  },
  {
    event_id: '3',
    event_name: 'Midnight Jazz Club',
    event_description: 'Late night jazz sessions.',
    location: 'Blue Note Jazz',
    start_date: '2024-11-20T23:00:00Z',
    current_attendees: 50,
    max_attendees: 100,
    image_url: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80',
    price: 45,
    ticket_types: [{ type: 'general', price: 45 }]
  },
  {
    event_id: '4',
    event_name: 'Weekend Tech Workshop',
    event_description: 'Learn coding on Saturday.',
    location: 'Tech Hub',
    start_date: '2024-11-23T10:00:00Z',
    current_attendees: 20,
    max_attendees: 50,
    image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    price: 100,
    ticket_types: [{ type: 'general', price: 100 }]
  },
  {
    event_id: '5',
    event_name: 'Comedy Gala',
    event_description: 'Laugh out loud with top comedians.',
    location: 'Laugh Factory',
    start_date: '2024-12-05T20:00:00Z',
    current_attendees: 380,
    max_attendees: 400,
    image_url: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80',
    price: 60,
    ticket_types: [{ type: 'general', price: 60 }]
  },
  {
    event_id: '6',
    event_name: 'Art Exhibition Opening',
    event_description: 'Modern art showcase.',
    location: 'City Gallery',
    start_date: '2024-11-15T18:00:00Z',
    current_attendees: 80,
    max_attendees: 150,
    image_url: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80',
    price: 25,
    ticket_types: [{ type: 'general', price: 25 }]
  }
];

const SearchEventsScreen = ({ navigation, route }) => {
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
  const { getAuthHeader, hasAdminPrivileges } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(Dimensions.get('window').width);
    };
    Dimensions.addEventListener('change', handleResize);
    return () => Dimensions.removeEventListener('change', handleResize);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [])
  );

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/events/public`);
      const data = await res.json();
      
      if (res.ok && data.success) {
        setAllEvents(data.events); 
      } else {
        setAllEvents(mockEvents); 
      }
    } catch (err) {
      console.log('Using mock data due to API error');
      setAllEvents(mockEvents); 
    } finally {
      setLoading(false);
    }
  };

  const categorizeEvents = () => {
    let filtered = allEvents.filter(event => 
      event.event_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      event.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getMinPrice = (e) => e.ticket_types ? Math.min(...e.ticket_types.map(t => t.price)) : 0;

    return {
      thisWeek: filtered.slice(0, 10),
      trending: [...filtered].sort((a, b) => (b.current_attendees || 0) - (a.current_attendees || 0)).slice(0, 10),
      nightlife: filtered.filter(e => {
        const hour = new Date(e.start_date).getHours();
        return hour >= 18 || hour < 4; 
      }),
      budget: filtered.filter(e => getMinPrice(e) <= 50),
      weekend: filtered.filter(e => {
        const day = new Date(e.start_date).getDay();
        return day === 0 || day === 6; 
      }),
      workshops: filtered.filter(e => 
        e.event_name.toLowerCase().includes('workshop') || 
        e.event_name.toLowerCase().includes('class')
      ),
      music: filtered.filter(e => e.event_name.toLowerCase().includes('music') || e.event_name.toLowerCase().includes('concert')),
      food: filtered.filter(e => e.event_name.toLowerCase().includes('food')),
      arts: filtered.filter(e => e.event_name.toLowerCase().includes('art') || e.event_name.toLowerCase().includes('comedy')),
      all: filtered 
    };
  };

  // Helper to guess category string for the label
  const getCategoryLabel = (event) => {
    const name = event.event_name.toLowerCase();
    if (name.includes('music') || name.includes('concert')) return 'Music';
    if (name.includes('food') || name.includes('market')) return 'Food & Drink';
    if (name.includes('tech') || name.includes('workshop')) return 'Technology';
    if (name.includes('comedy')) return 'Comedy';
    if (name.includes('art')) return 'Arts';
    return 'Event';
  };

  const EventCard = ({ event, index }) => {
    const soldPercentage = event.current_attendees && event.max_attendees ? (event.current_attendees / event.max_attendees) * 100 : 0;
    const minPrice = event.ticket_types ? Math.min(...event.ticket_types.map(t => t.price)) : 'TBD';
    const isHot = soldPercentage > 75 || event.current_attendees > 500;
    const isMobile = windowWidth < 768;
    const categoryLabel = getCategoryLabel(event);

    return (
      <TouchableOpacity 
        style={[
          styles.eventCard, 
          isMobile && { width: windowWidth * 0.75 },
        ]} 
        onPress={() => navigation.navigate('EventDetail', { 
          eventId: event.event_id, 
          event: event 
        })}
        activeOpacity={0.95}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: event.image_url || 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80' }} 
            style={styles.eventImage} 
            resizeMode="cover" 
          />
          {isHot && (
            <View style={styles.hotTag}>
              <Ionicons name="flame" size={10} color="#fff" />
              <Text style={styles.hotTagText}>HOT</Text>
            </View>
          )}
        </View>
        
        <View style={styles.eventInfo}>
          <Text style={styles.eventCategory}>{categoryLabel}</Text>
          
          <Text style={styles.eventName} numberOfLines={2}>
            {event.event_name}
          </Text>
          
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color="#666" />
            <Text style={styles.metaText} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
          
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color="#666" />
            <Text style={styles.metaText}>
              {new Date(event.start_date).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })} at {new Date(event.start_date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          
          <View style={styles.metaRow}>
            <Ionicons name="ticket-outline" size={13} color="#666" />
            <Text style={styles.metaText}>
              {typeof minPrice === 'number' ? `From R${minPrice}` : minPrice}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const CarouselSection = ({ title, icon, iconColor, iconBgColor, events }) => {
    const scrollViewRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    if (!events || events.length === 0) return null;

    const handleScroll = (event) => {
      const scrollX = event.nativeEvent.contentOffset.x;
      const contentWidth = event.nativeEvent.contentSize.width;
      const layoutWidth = event.nativeEvent.layoutMeasurement.width;

      setCanScrollLeft(scrollX > 10);
      setCanScrollRight(scrollX < contentWidth - layoutWidth - 10);
    };

    const scrollLeft = () => {
      if (scrollViewRef.current) {
        const scrollDistance = windowWidth > 768 ? 420 : windowWidth * 0.8;
        const newScrollX = 0; 
        scrollViewRef.current.scrollTo({ x: newScrollX, animated: true });
      }
    };

    const scrollRight = () => {
      if (scrollViewRef.current) {
        const scrollDistance = windowWidth > 768 ? 420 : windowWidth * 0.8;
        scrollViewRef.current.scrollTo({ x: scrollDistance, animated: true });
      }
    };

    return (
      <View style={styles.categorySection}>
        <View style={styles.sectionHeader}>
          <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
            <View style={[styles.sectionIconContainer, { backgroundColor: iconBgColor }]}>
              <Ionicons name={icon} size={18} color={iconColor} />
            </View>
            <Text style={styles.categoryTitle}>{title}</Text>
          </View>
          
          <View style={styles.carouselControls}>
            <TouchableOpacity 
              style={[styles.carouselButton, !canScrollLeft && styles.carouselButtonDisabled]} 
              onPress={scrollLeft} 
              disabled={!canScrollLeft}
            >
              <Ionicons name="chevron-back" size={20} color={canScrollLeft ? "#000" : "#ccc"} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.carouselButton, !canScrollRight && styles.carouselButtonDisabled]} 
              onPress={scrollRight} 
              disabled={!canScrollRight}
            >
              <Ionicons name="chevron-forward" size={20} color={canScrollRight ? "#000" : "#ccc"} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {events.map((event, index) => (
            <EventCard key={event.event_id || index} event={event} index={index} />
          ))}
        </ScrollView>
      </View>
    );
  };

  const Footer = () => {
    const handleLinkPress = (link) => alert(`Navigating to: ${link}`);
    const isMobile = windowWidth < 768;

    if (hasAdminPrivileges()) return null;

    return (
      <View style={styles.footer}>
        <View style={[styles.footerContent, isMobile && styles.footerContentMobile]}>
          <View style={styles.footerSection}>
            <Text style={styles.footerLogo}>Ticket-hub</Text>
            <Text style={styles.footerSlogan}>
              Your gateway to amazing events. Discover, book, and enjoy unforgettable experiences.
            </Text>
            <View style={styles.socialIcons}>
              {['logo-facebook', 'logo-twitter', 'logo-instagram', 'logo-linkedin'].map((icon, i) => (
                <TouchableOpacity key={i} style={styles.socialIcon} onPress={() => {}}>
                  <Ionicons name={icon} size={20} color="#fff" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.footerSection}>
            <Text style={styles.footerHeading}>Quick Links</Text>
            {['About Us', 'How It Works', 'FAQs', 'Contact Us'].map(link => (
              <TouchableOpacity key={link} onPress={() => handleLinkPress(link)}>
                <Text style={styles.footerLink}>{link}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.footerSection}>
            <Text style={styles.footerHeading}>Popular Categories</Text>
            {['Music Festivals', 'Food & Drink', 'Nightlife', 'Arts & Culture'].map(link => (
              <TouchableOpacity key={link} onPress={() => handleLinkPress(link)}>
                <Text style={styles.footerLink}>{link}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.footerSection}>
            <Text style={styles.footerHeading}>Support</Text>
            {['Help Center', 'Terms of Service', 'Privacy Policy'].map(link => (
              <TouchableOpacity key={link} onPress={() => handleLinkPress(link)}>
                <Text style={styles.footerLink}>{link}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.footerBottom}>
          <Text style={styles.footerBottomText}>
            © 2025 Ticket-hub. All rights reserved.
          </Text>
        </View>
      </View>
    );
  };

  const categories = categorizeEvents();
  const hasEvents = categories.all.length > 0;

  if (loading) {
    return (
      <View style={styles.fullContainer}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      {/* Search Header */}
      <View style={styles.fixedSearchSection}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={16} color="#999" style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search events..." 
              value={searchQuery} 
              onChangeText={setSearchQuery} 
            />
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
            <Ionicons name="options" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.scrollableContent}>
        <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollViewContent} // flexGrow: 1 is set here in styles
        >
          <View style={styles.scrollContentStart} />
          
          {!hasEvents ? (
            <View style={styles.noEventsContainer}>
                <View style={styles.noEventsIconBg}>
                    <Ionicons name="calendar-clear-outline" size={48} color="#666" />
                </View>
                <Text style={styles.noEventsText}>No events found</Text>
                <Text style={styles.noEventsSubText}>
                    We couldn't find any events matching "{searchQuery}". {'\n'}Try adjusting your search or filters.
                </Text>
            </View>
          ) : (
            <>
                <CarouselSection 
                    title="This Week" 
                    icon="time" iconColor="#6366f1" iconBgColor="#6366f115" 
                    events={categories.thisWeek} 
                />
                <CarouselSection 
                    title="Trending Now" 
                    icon="trending-up" iconColor="#FF4400" iconBgColor="#FF440015" 
                    events={categories.trending} 
                />
                
                <CarouselSection 
                    title="Nightlife & Parties" 
                    icon="moon" iconColor="#9C27B0" iconBgColor="#9C27B015" 
                    events={categories.nightlife} 
                />
                <CarouselSection 
                    title="Budget Friendly (< R50)" 
                    icon="wallet" iconColor="#4CAF50" iconBgColor="#4CAF5015" 
                    events={categories.budget} 
                />
                <CarouselSection 
                    title="Weekend Vibes" 
                    icon="sunny" iconColor="#FF9800" iconBgColor="#FF980015" 
                    events={categories.weekend} 
                />
                <CarouselSection 
                    title="Workshops & Expos" 
                    icon="bulb" iconColor="#2196F3" iconBgColor="#2196F315" 
                    events={categories.workshops} 
                />
                
                <CarouselSection 
                    title="Music & Concerts" 
                    icon="musical-notes" iconColor="#E91E63" iconBgColor="#E91E6315" 
                    events={categories.music} 
                />
                <CarouselSection 
                    title="Food & Drink" 
                    icon="restaurant" iconColor="#FF9800" iconBgColor="#FF980015" 
                    events={categories.food} 
                />
                <CarouselSection 
                    title="Arts & Culture" 
                    icon="color-palette" iconColor="#5B188C" iconBgColor="#5B188C15" 
                    events={categories.arts} 
                />
                
                <CarouselSection 
                    title="All Events" 
                    icon="apps" iconColor="#17A2B8" iconBgColor="#17A2B815" 
                    events={categories.all} 
                />
            </>
          )}
          
          {/* Footer Wrapper with Auto Margin Top for Sticky Behavior */}
          <View style={styles.footerWrapper}>
            <Footer />
          </View>
        </ScrollView>
      </View>
      
      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
               <TouchableOpacity style={styles.applyButton} onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.applyButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  fullContainer: { flex: 1, backgroundColor: '#f8f9fa' },
  fixedSearchSection: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 8,
  },
  searchContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', gap: 8 },
  searchInputContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa',
    borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#333', outline: 'none' },
  filterButton: {
    backgroundColor: '#000', width: 40, height: 40, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  scrollableContent: { flex: 1, marginTop: 68 },
  scrollView: { flex: 1 },
  // UPDATED: Added flexGrow to ensure content stretches to fill screen
  scrollViewContent: { paddingTop: 16, flexGrow: 1 },
  scrollContentStart: { marginBottom: 0 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Section & Carousel Styles
  categorySection: { marginBottom: 30 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 15 },
  sectionIconContainer: { padding: 6, borderRadius: 8, marginRight: 8 },
  categoryTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  horizontalScroll: { paddingHorizontal: 16, paddingVertical: 4, gap: 10 },
  carouselControls: { flexDirection: 'row', gap: 8 },
  carouselButton: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f5',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb',
  },
  carouselButtonDisabled: { opacity: 0.4 },

  // Card Styles
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 240,
    backgroundColor: '#e0e0e0',
  },
  eventImage: {
    width: '100%',
    height: '100%',
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
  eventInfo: {
    padding: 20,
    minHeight: 110,
  },
  eventCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 10,
    lineHeight: 24,
    minHeight: 48,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    flex: 1,
    lineHeight: 18,
  },

  // --- NEW: No Events Styles ---
  noEventsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: 400, // Gives it some vertical breathing room
  },
  noEventsIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  noEventsText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  noEventsSubText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },

  // Footer Styles
  // UPDATED: Added marginTop: 'auto' to push footer to bottom
  footerWrapper: {
    marginTop: 'auto', 
  },
  footer: { backgroundColor: '#1a1a1a', paddingTop: 40, paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#333', marginTop: 40 },
  footerContent: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 40, maxWidth: 1200, marginHorizontal: 'auto', width: '100%' },
  footerContentMobile: { flexDirection: 'column', gap: 30, paddingHorizontal: 20 },
  footerSection: { flex: 1, minWidth: 150 },
  footerLogo: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  footerSlogan: { fontSize: 14, color: '#bbb', marginBottom: 20, lineHeight: 20 },
  socialIcons: { flexDirection: 'row', gap: 10 },
  socialIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  footerHeading: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#444', paddingBottom: 5 },
  footerLink: { fontSize: 14, color: '#bbb', marginBottom: 8 },
  footerBottom: { borderTopWidth: 1, borderTopColor: '#333', marginTop: 30, paddingTop: 20, alignItems: 'center' },
  footerBottomText: { fontSize: 12, color: '#777' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalBody: { paddingBottom: 20 },
  applyButton: { backgroundColor: '#000', padding: 15, borderRadius: 10, alignItems: 'center' },
  applyButtonText: { color: '#fff', fontWeight: 'bold' }
});

export default SearchEventsScreen;