import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');
const API_URL = 'http://localhost:3000';

const DiscoverScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('featured');
  const { getAuthHeader, user } = useAuth();

  const featuredScrollRef = useRef(null);
  const competitionsScrollRef = useRef(null);
  const trendingScrollRef = useRef(null);

  const featuredEvents = [
    {
      id: 1,
      title: 'Summer Music Festival',
      description: 'An amazing outdoor music festival with top artists and incredible production',
      price: 299,
      discountedPrice: 199,
      discount: 33,
      date: '2024-12-15T18:00:00Z',
      location: 'Cape Town Stadium',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
      type: 'festival',
      tags: ['TRENDING', 'POPULAR'],
      category: 'Music',
      rating: 4.8,
      reviews: 1247,
      current_attendees: 850,
      max_attendees: 1200
    },
    {
      id: 2,
      title: 'Tech Innovation Summit',
      description: 'Leading tech conference with industry experts and cutting-edge technology showcases',
      price: 499,
      discountedPrice: 349,
      discount: 30,
      date: '2024-11-20T09:00:00Z',
      location: 'Sandton Convention Centre',
      image: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=800',
      type: 'conference',
      tags: ['EARLY BIRD', 'LIMITED'],
      category: 'Technology',
      rating: 4.6,
      reviews: 893,
      current_attendees: 320,
      max_attendees: 1000
    },
    {
      id: 3,
      title: 'Jazz & Wine Evening',
      description: 'An intimate evening of smooth jazz and premium wine tasting experience',
      price: 180,
      discountedPrice: 120,
      discount: 33,
      date: '2024-11-25T19:30:00Z',
      location: 'V&A Waterfront',
      image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800',
      type: 'music',
      tags: ['EXCLUSIVE', 'POPULAR'],
      category: 'Music',
      rating: 4.9,
      reviews: 567,
      current_attendees: 145,
      max_attendees: 250
    }
  ];

  const activeCompetitions = [
    {
      id: 1,
      title: 'Win VIP Festival Passes',
      description: 'Enter to win 2 VIP passes + backstage access to all major festivals this season',
      prize: 'R5,000 Value',
      entries: 1247,
      endDate: '2024-11-10T23:59:00Z',
      image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
      entryFee: 0,
      type: 'free',
      timeLeft: '5 days left',
      participants: '1.2K entered',
      current_attendees: 1247,
      max_attendees: 5000
    },
    {
      id: 2,
      title: 'DJ Mix Competition',
      description: 'Submit your best mix for a chance to perform live at the main stage',
      prize: 'R10,000 + Studio Time',
      entries: 893,
      endDate: '2024-11-15T23:59:00Z',
      image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800',
      entryFee: 50,
      type: 'premium',
      timeLeft: '10 days left',
      participants: '893 entered',
      current_attendees: 893,
      max_attendees: 2000
    },
    {
      id: 3,
      title: 'Food Festival Experience',
      description: 'Win a culinary journey for 4 people with master chefs',
      prize: 'R8,000 Dining Package',
      entries: 567,
      endDate: '2024-11-08T23:59:00Z',
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
      entryFee: 0,
      type: 'free',
      timeLeft: '3 days left',
      participants: '567 entered',
      current_attendees: 567,
      max_attendees: 1500
    }
  ];

  const categories = [
    { id: 1, name: 'Music', icon: 'musical-notes', color: '#6366f1', events: 234 },
    { id: 2, name: 'Sports', icon: 'basketball', color: '#ef4444', events: 156 },
    { id: 3, name: 'Arts', icon: 'color-palette', color: '#8b5cf6', events: 89 },
    { id: 4, name: 'Food', icon: 'restaurant', color: '#f59e0b', events: 178 },
    { id: 5, name: 'Tech', icon: 'hardware-chip', color: '#06b6d4', events: 67 },
    { id: 6, name: 'Comedy', icon: 'mic', color: '#10b981', events: 45 },
  ];

  const trendingEvents = [
    {
      id: 1,
      title: 'Jazz Night Under Stars',
      location: 'Green Point Park',
      price: 150,
      image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400',
      rating: 4.8,
      attendees: '2.4K',
      date: '2024-12-10T19:00:00Z',
      description: 'An intimate evening of smooth jazz under the stars',
      current_attendees: 2400,
      max_attendees: 3000
    },
    {
      id: 2,
      title: 'Food & Wine Expo',
      location: 'CTICC',
      price: 200,
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
      rating: 4.6,
      attendees: '1.8K',
      date: '2024-11-28T11:00:00Z',
      description: 'Experience the finest foods and wines from around the world',
      current_attendees: 1800,
      max_attendees: 2500
    },
    {
      id: 3,
      title: 'Comedy Night Special',
      location: 'Baxter Theatre',
      price: 120,
      image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400',
      rating: 4.9,
      attendees: '1.2K',
      date: '2024-12-05T20:00:00Z',
      description: 'Top comedians performing their best material',
      current_attendees: 1200,
      max_attendees: 1500
    }
  ];

  const scrollHorizontal = (scrollRef, direction) => {
    if (scrollRef.current) {
      const scrollAmount = 420; // card width + margin
      const currentOffset = scrollRef.current.contentOffset?.x || 0;
      const newOffset = direction === 'right' 
        ? currentOffset + scrollAmount
        : Math.max(0, currentOffset - scrollAmount);
      
      scrollRef.current.scrollTo({ x: newOffset, animated: true });
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDiscoverData();
    }, [])
  );

  const fetchDiscoverData = async () => {
    setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
    }, 1000);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDiscoverData();
  };

  const EventCard = ({ event, index, showCategory = false }) => {
    const soldPercentage = (event.current_attendees / event.max_attendees) * 100;
    const minPrice = event.discountedPrice || event.price || 0;
    
    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => navigation.navigate('EventDetail', { eventId: event.id, event: event })}
        activeOpacity={0.95}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: event.image }}
            style={styles.eventImage}
            resizeMode="cover"
          />
          {soldPercentage > 80 && (
            <View style={styles.hotTag}>
              <Ionicons name="flame" size={10} color="#fff" />
              <Text style={styles.hotTagText}>HOT</Text>
            </View>
          )}
        </View>
        
        <View style={styles.eventInfo}>
          {showCategory && event.category && (
            <Text style={styles.eventCategory}>{event.category}</Text>
          )}
          
          <Text style={styles.eventName} numberOfLines={2}>{event.title}</Text>
          
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color="#666" />
            <Text style={styles.metaText} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
          
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color="#666" />
            <Text style={styles.metaText}>
              {new Date(event.date).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })} at {new Date(event.date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          
          <View style={styles.metaRow}>
            <Ionicons name="ticket-outline" size={13} color="#666" />
            <Text style={styles.metaText}>
              {event.discountedPrice ? `From R${event.discountedPrice}` : `From R${event.price}`}
              {event.discountedPrice && (
                <Text style={styles.originalPrice}> R{event.price}</Text>
              )}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const CompetitionCard = ({ competition, index }) => {
    const soldPercentage = (competition.current_attendees / competition.max_attendees) * 100;
    
    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => navigation.navigate('CompetitionDetail', { competitionId: competition.id, competition: competition })}
        activeOpacity={0.95}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: competition.image }}
            style={styles.eventImage}
            resizeMode="cover"
          />
          {soldPercentage > 80 && (
            <View style={styles.hotTag}>
              <Ionicons name="flame" size={10} color="#fff" />
              <Text style={styles.hotTagText}>HOT</Text>
            </View>
          )}
          
          <View style={styles.competitionPrizeTag}>
            <Ionicons name="trophy" size={12} color="#FFD700" />
            <Text style={styles.competitionPrizeText}>{competition.prize}</Text>
          </View>
        </View>
        
        <View style={styles.eventInfo}>
          <Text style={styles.eventCategory}>Competition</Text>
          
          <Text style={styles.eventName} numberOfLines={2}>{competition.title}</Text>
          
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={13} color="#666" />
            <Text style={styles.metaText} numberOfLines={1}>
              {competition.participants}
            </Text>
          </View>
          
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color="#666" />
            <Text style={styles.metaText}>
              {competition.timeLeft}
            </Text>
          </View>
          
          <View style={styles.metaRow}>
            <Ionicons name="ticket-outline" size={13} color="#666" />
            <Text style={styles.metaText}>
              {competition.entryFee === 0 ? 'Free Entry' : `R${competition.entryFee} Entry`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const HeaderSection = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Discover</Text>
        <Text style={styles.headerSubtitle}>Find your next experience</Text>
      </View>
      <TouchableOpacity style={styles.searchButton}>
        <Ionicons name="search" size={24} color="#64748b" />
      </TouchableOpacity>
    </View>
  );

  const TabNavigation = () => (
    <View style={styles.tabContainer}>
      {[
        { id: 'featured', label: 'Featured', icon: 'star' },
        { id: 'competitions', label: 'Win Big', icon: 'trophy' },
        { id: 'categories', label: 'Categories', icon: 'grid' },
        { id: 'trending', label: 'Trending', icon: 'trending-up' }
      ].map(tab => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.tabActive]}
          onPress={() => setActiveTab(tab.id)}
        >
          <Ionicons 
            name={tab.icon} 
            size={20} 
            color={activeTab === tab.id ? '#6366f1' : '#64748b'} 
          />
          <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const CategoryGrid = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Browse Categories</Text>
      </View>
      <View style={styles.categoriesGrid}>
        {categories.map((category) => (
          <TouchableOpacity key={category.id} style={styles.categoryCard}>
            <View style={[styles.categoryIcon, { backgroundColor: `${category.color}15` }]}>
              <Ionicons name={category.icon} size={24} color={category.color} />
            </View>
            <Text style={styles.categoryName}>{category.name}</Text>
            <Text style={styles.categoryEvents}>{category.events} events</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const ScrollArrow = ({ direction, onPress, disabled = false }) => (
    <TouchableOpacity 
      style={[
        styles.scrollArrow,
        direction === 'left' ? styles.scrollArrowLeft : styles.scrollArrowRight,
        disabled && styles.scrollArrowDisabled
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons 
        name={direction === 'left' ? 'chevron-back' : 'chevron-forward'} 
        size={20} 
        color={disabled ? '#cbd5e1' : '#64748b'} 
      />
    </TouchableOpacity>
  );

  const CarouselSection = ({ title, icon, iconColor, iconBgColor, events, sectionKey, isCompetition = false }) => {
    const scrollViewRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(events.length > 0);

    const handleScroll = (event) => {
      const scrollX = event.nativeEvent.contentOffset.x;
      const contentWidth = event.nativeEvent.contentSize.width;
      const layoutWidth = event.nativeEvent.layoutMeasurement.width;
      
      setCanScrollLeft(scrollX > 10);
      setCanScrollRight(scrollX < contentWidth - layoutWidth - 10);
    };

    const scrollLeft = () => {
      scrollHorizontal(scrollViewRef, 'left');
    };

    const scrollRight = () => {
      scrollHorizontal(scrollViewRef, 'right');
    };

    if (events.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconContainer, { backgroundColor: iconBgColor }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
          <Text style={styles.categoryTitle}>{title}</Text>
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
        <View style={styles.scrollSection}>
          <ScrollArrow 
            direction="left" 
            onPress={scrollLeft}
            disabled={!canScrollLeft}
          />
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {events.map((event, index) => (
              isCompetition ? (
                <CompetitionCard key={event.id} competition={event} index={index} />
              ) : (
                <EventCard key={event.id} event={event} index={index} showCategory={sectionKey === 'featured'} />
              )
            ))}
          </ScrollView>
          <ScrollArrow 
            direction="right" 
            onPress={scrollRight}
            disabled={!canScrollRight}
          />
        </View>
      </View>
    );
  };

  const FeaturedEvents = () => (
    <CarouselSection
      title="Featured Events"
      icon="star"
      iconColor="#6366f1"
      iconBgColor="#6366f115"
      events={featuredEvents}
      sectionKey="featured"
    />
  );

  const CompetitionsSection = () => (
    <CarouselSection
      title="Win Amazing Prizes"
      icon="trophy"
      iconColor="#FFD700"
      iconBgColor="#FFD70015"
      events={activeCompetitions}
      sectionKey="competitions"
      isCompetition={true}
    />
  );

  const TrendingEvents = () => (
    <CarouselSection
      title="Trending Now"
      icon="trending-up"
      iconColor="#FF4400"
      iconBgColor="#FF440015"
      events={trendingEvents}
      sectionKey="trending"
    />
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'featured':
        return (
          <>
            <CategoryGrid />
            <FeaturedEvents />
            <TrendingEvents />
          </>
        );
      case 'competitions':
        return <CompetitionsSection />;
      case 'categories':
        return <CategoryGrid />;
      case 'trending':
        return <TrendingEvents />;
      default:
        return (
          <>
            <CategoryGrid />
            <FeaturedEvents />
          </>
        );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Discovering amazing events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
          />
        }
      >
        <HeaderSection />
        <TabNavigation />
        {renderContent()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#000',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  searchButton: {
    padding: 8,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  
  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#6366f1',
  },
  
  // Sections
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#6366f115',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.4,
    flex: 1,
  },
  
  // Scroll Section with Arrows
  scrollSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollArrow: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  scrollArrowLeft: {
    marginLeft: 4,
  },
  scrollArrowRight: {
    marginRight: 4,
  },
  scrollArrowDisabled: {
    opacity: 0.5,
  },
  
  // Categories (Centered)
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryCard: {
    width: (width - 80) / 3,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  categoryEvents: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
  },
  
  // Event Cards (Matching SearchEventsScreen)
  horizontalScroll: {
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 4,
  },
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
  competitionPrizeTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  competitionPrizeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '700',
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
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 4,
  },
  
  // Carousel Controls
  carouselControls: {
    flexDirection: 'row',
    gap: 8,
  },
  carouselButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  carouselButtonDisabled: {
    opacity: 0.4,
  },
});

export default DiscoverScreen;