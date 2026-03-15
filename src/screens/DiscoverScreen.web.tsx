import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const PAGE_PADDING = width >= 1280 ? 32 : width >= 768 ? 24 : 16;
const SURFACE_CARD_PADDING = width >= 768 ? 20 : 16;
const PAGE_MAX_WIDTH = 1320;
const PANEL_WIDTH = Math.min(width, PAGE_MAX_WIDTH);
const CAROUSEL_GAP = 16;
const COLLECTION_VIEWPORT_WIDTH = PANEL_WIDTH - PAGE_PADDING * 2 - SURFACE_CARD_PADDING * 2;
const CAROUSEL_CARD_WIDTH = width >= 1280 ? 348 : width >= 768 ? 320 : Math.min(width - 90, 308);
const SECTION_FIT_CARD_WIDTH =
  width >= 1120
    ? (COLLECTION_VIEWPORT_WIDTH - CAROUSEL_GAP * 2) / 3
    : CAROUSEL_CARD_WIDTH;
const CATEGORY_CARD_WIDTH =
  width >= 1120 ? (PAGE_MAX_WIDTH - PAGE_PADDING * 2 - 24) / 3 :
  width >= 760 ? (PANEL_WIDTH - PAGE_PADDING * 2 - 12) / 2 :
  PANEL_WIDTH - PAGE_PADDING * 2;

const formatCurrency = (value) => `R${Number(value || 0).toLocaleString('en-ZA')}`;

const formatCompactNumber = (value) => {
  const amount = Number(value || 0);
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1).replace('.0', '')}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1).replace('.0', '')}K`;
  return `${amount}`;
};

const formatShortDate = (value) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const formatDateTime = (value) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formatTime = (value) =>
  new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const getDemandRatio = (current, max) => {
  const safeMax = Number(max || 0);
  if (!safeMax) return 0;
  return Math.min(100, Math.round((Number(current || 0) / safeMax) * 100));
};

const getDemandLabel = (ratio) => {
  if (ratio >= 85) return 'Priority demand';
  if (ratio >= 65) return 'Strong acceleration';
  if (ratio >= 40) return 'Building momentum';
  return 'Early access';
};

const DiscoverScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('featured');
  const { user } = useAuth();

  const featuredEvents = [
    {
      id: 1,
      title: 'Summer Music Festival',
      description: 'A flagship outdoor music program with headline artists, premium hospitality, and large-format production.',
      price: 299,
      discountedPrice: 199,
      discount: 33,
      date: '2026-04-18T18:00:00Z',
      location: 'Cape Town Stadium',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200',
      category: 'Music',
      tags: ['Trending', 'Verified'],
      rating: 4.8,
      current_attendees: 850,
      max_attendees: 1200,
    },
    {
      id: 2,
      title: 'Tech Innovation Summit',
      description: 'Executive demos, strategic networking, and commercial insight with regional technology leaders.',
      price: 499,
      discountedPrice: 349,
      discount: 30,
      date: '2026-05-14T09:00:00Z',
      location: 'Sandton Convention Centre',
      image: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=1200',
      category: 'Technology',
      tags: ['Early access', 'Limited seats'],
      rating: 4.6,
      current_attendees: 320,
      max_attendees: 1000,
    },
    {
      id: 3,
      title: 'Jazz and Wine Evening',
      description: 'An intimate premium program pairing tasting-led hospitality with acclaimed live jazz.',
      price: 180,
      discountedPrice: 120,
      discount: 33,
      date: '2026-06-05T19:30:00Z',
      location: 'V&A Waterfront',
      image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200',
      category: 'Music',
      tags: ['Exclusive', 'Premium'],
      rating: 4.9,
      current_attendees: 145,
      max_attendees: 250,
    },
  ];

  const activeCompetitions = [
    {
      id: 1,
      title: 'Win VIP Festival Passes',
      description: 'A high-visibility audience campaign with VIP access and backstage hospitality.',
      prize: 'R5,000 value',
      entries: 1247,
      endDate: '2026-03-25T23:59:00Z',
      image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200',
      entryFee: 0,
      timeLeft: '12 days left',
      participants: '1.2K entered',
      current_attendees: 1247,
      max_attendees: 5000,
    },
    {
      id: 2,
      title: 'DJ Mix Competition',
      description: 'Submit a commercial-ready mix for a live main-stage set and studio time.',
      prize: 'R10,000 plus studio time',
      entries: 893,
      endDate: '2026-04-02T23:59:00Z',
      image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1200',
      entryFee: 50,
      timeLeft: '20 days left',
      participants: '893 entered',
      current_attendees: 893,
      max_attendees: 2000,
    },
    {
      id: 3,
      title: 'Food Festival Experience',
      description: 'A culinary rewards campaign for four guests with chef-hosted experiences.',
      prize: 'R8,000 dining package',
      entries: 567,
      endDate: '2026-03-20T23:59:00Z',
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200',
      entryFee: 0,
      timeLeft: '7 days left',
      participants: '567 entered',
      current_attendees: 567,
      max_attendees: 1500,
    },
  ];

  const categories = [
    { id: 1, name: 'Music', icon: 'musical-notes', color: '#2563eb', events: 234 },
    { id: 2, name: 'Sports', icon: 'basketball', color: '#dc2626', events: 156 },
    { id: 3, name: 'Arts', icon: 'color-palette', color: '#7c3aed', events: 89 },
    { id: 4, name: 'Food', icon: 'restaurant', color: '#d97706', events: 178 },
    { id: 5, name: 'Tech', icon: 'hardware-chip', color: '#0891b2', events: 67 },
    { id: 6, name: 'Comedy', icon: 'mic', color: '#059669', events: 45 },
  ];

  const trendingEvents = [
    {
      id: 1,
      title: 'Jazz Night Under Stars',
      location: 'Green Point Park',
      price: 150,
      image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=900',
      rating: 4.8,
      date: '2026-03-29T19:00:00Z',
      description: 'A high-demand open-air jazz program with premium lawn seating and curated hospitality.',
      current_attendees: 2400,
      max_attendees: 3000,
      category: 'Music',
      tags: ['Fast moving', 'City favorite'],
    },
    {
      id: 2,
      title: 'Food and Wine Expo',
      location: 'CTICC',
      price: 200,
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900',
      rating: 4.6,
      date: '2026-04-26T11:00:00Z',
      description: 'A premium food discovery program showcasing chefs, brands, and tasting-led experiences.',
      current_attendees: 1800,
      max_attendees: 2500,
      category: 'Food',
      tags: ['Premium tasting', 'Weekend'],
    },
    {
      id: 3,
      title: 'Comedy Night Special',
      location: 'Baxter Theatre',
      price: 120,
      image: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=900',
      rating: 4.9,
      date: '2026-05-09T20:00:00Z',
      description: 'A strong-performing comedy night featuring headliners and reserved premium seating.',
      current_attendees: 1200,
      max_attendees: 1500,
      category: 'Comedy',
      tags: ['High rating', 'Sold fast'],
    },
  ];

  const heroEvent = featuredEvents[0];
  const allEvents = [...featuredEvents, ...trendingEvents];
  const totalSeats = allEvents.reduce((sum, event) => sum + Number(event.max_attendees || 0), 0);
  const totalDemand = allEvents.reduce((sum, event) => sum + Number(event.current_attendees || 0), 0);
  const averageRating = (allEvents.reduce((sum, event) => sum + Number(event.rating || 0), 0) / allEvents.length).toFixed(1);
  const maxCategoryVolume = Math.max(...categories.map((category) => category.events));
  const highestDemandRatio = Math.max(...allEvents.map((event) => getDemandRatio(event.current_attendees, event.max_attendees)));
  const topDemandEvents = [...allEvents]
    .sort((left, right) => getDemandRatio(right.current_attendees, right.max_attendees) - getDemandRatio(left.current_attendees, left.max_attendees))
    .slice(0, 3);

  const summaryCards = [
    { label: 'Verified listings', value: formatCompactNumber(allEvents.length), helper: 'Curated live inventory', icon: 'shield-checkmark-outline', iconBg: '#dbeafe', iconColor: '#2563eb' },
    { label: 'Seats in market', value: formatCompactNumber(totalSeats), helper: `${formatCompactNumber(totalDemand)} reserved now`, icon: 'people-outline', iconBg: '#ccfbf1', iconColor: '#0f766e' },
    { label: 'Average rating', value: averageRating, helper: 'Marketplace trust signal', icon: 'star-outline', iconBg: '#ede9fe', iconColor: '#7c3aed' },
    { label: 'Prize campaigns', value: formatCompactNumber(activeCompetitions.length), helper: 'Growth-focused activations live', icon: 'gift-outline', iconBg: '#ffedd5', iconColor: '#c2410c' },
  ];

  const tabOptions = [
    { id: 'featured', label: 'Featured', icon: 'star-outline', helper: 'Priority releases', count: featuredEvents.length },
    { id: 'competitions', label: 'Competitions', icon: 'trophy-outline', helper: 'Prize-led growth', count: activeCompetitions.length },
    { id: 'categories', label: 'Categories', icon: 'grid-outline', helper: 'Portfolio coverage', count: categories.length },
    { id: 'trending', label: 'Trending', icon: 'trending-up-outline', helper: 'Demand signals', count: trendingEvents.length },
  ];

  const fetchDiscoverData = (delay = 650) => setTimeout(() => {
    setLoading(false);
    setRefreshing(false);
  }, delay);

  useFocusEffect(
    useCallback(() => {
      const timeout = fetchDiscoverData();
      return () => clearTimeout(timeout);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDiscoverData(450);
  };

  const SectionHeader = ({ eyebrow, title, subtitle, icon, iconColor = '#2563eb', iconBg = '#dbeafe', controls = null }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <View style={styles.sectionEyebrowRow}>
          <View style={[styles.sectionIcon, { backgroundColor: iconBg }]}>
            <Ionicons name={icon} size={16} color={iconColor} />
          </View>
          <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      {controls}
    </View>
  );

  const EventCard = ({ event, showCategory = false, cardWidth = CAROUSEL_CARD_WIDTH }) => {
    const demandRatio = getDemandRatio(event.current_attendees, event.max_attendees);
    const activePrice = event.discountedPrice || event.price || 0;

    return (
      <TouchableOpacity
        style={[styles.collectionCard, { width: cardWidth }]}
        activeOpacity={0.94}
        onPress={() => navigation.navigate('EventDetail', { eventId: event.id, event })}
      >
        <View style={styles.cardImageWrap}>
          <Image source={{ uri: event.image }} style={styles.cardImage} resizeMode="cover" />
          <View style={styles.cardImageOverlay} />
          <View style={styles.cardBadgeRow}>
            {showCategory && event.category ? (
              <View style={styles.badgeDark}>
                <Text style={styles.badgeText}>{event.category}</Text>
              </View>
            ) : null}
            {event.discount ? (
              <View style={[styles.badgeDark, styles.badgeBlue]}>
                <Text style={styles.badgeText}>{event.discount}% off</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.datePill}>
            <Text style={styles.datePillMonth}>{new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}</Text>
            <Text style={styles.datePillDay}>{new Date(event.date).toLocaleDateString('en-US', { day: '2-digit' })}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={12} color="#f59e0b" />
              <Text style={styles.ratingText}>{event.rating?.toFixed(1) || '4.8'}</Text>
            </View>
          </View>
          <Text style={styles.cardDescription} numberOfLines={2}>{event.description}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color="#64748b" />
            <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color="#64748b" />
            <Text style={styles.metaText}>{formatDateTime(event.date)} at {formatTime(event.date)}</Text>
          </View>
          <View style={styles.progressPanel}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Demand readiness</Text>
              <Text style={styles.progressValue}>{demandRatio}% reserved</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(demandRatio, 8)}%` }]} />
            </View>
            <Text style={styles.progressHelper}>{getDemandLabel(demandRatio)}</Text>
          </View>
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.cardPrice}>From {formatCurrency(activePrice)}</Text>
              <Text style={styles.cardPriceHelper}>
                {event.discountedPrice ? `${formatCurrency(event.price)} standard rate` : `${formatCompactNumber(event.current_attendees)} reservations confirmed`}
              </Text>
            </View>
            <View style={styles.cardAction}>
              <Text style={styles.cardActionText}>Review</Text>
              <Ionicons name="arrow-forward" size={14} color="#ffffff" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const CompetitionCard = ({ competition }) => {
    const participationRatio = getDemandRatio(competition.current_attendees, competition.max_attendees);

    return (
      <TouchableOpacity
        style={[styles.collectionCard, { width: CAROUSEL_CARD_WIDTH }]}
        activeOpacity={0.94}
        onPress={() => navigation.navigate('BrowseEvents', { discoveryMode: 'competitions' })}
      >
        <View style={styles.cardImageWrap}>
          <Image source={{ uri: competition.image }} style={styles.cardImage} resizeMode="cover" />
          <View style={styles.cardImageOverlay} />
          <View style={styles.cardBadgeRow}>
            <View style={styles.badgeDark}>
              <Text style={styles.badgeText}>Competition</Text>
            </View>
            <View style={[styles.badgeDark, styles.badgeOrange]}>
              <Text style={styles.badgeText}>{competition.prize}</Text>
            </View>
          </View>
          <View style={styles.datePill}>
            <Text style={styles.datePillMonth}>Ends</Text>
            <Text style={styles.datePillDay}>{new Date(competition.endDate).toLocaleDateString('en-US', { day: '2-digit' })}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={2}>{competition.title}</Text>
            <View style={[styles.ratingPill, styles.ratingBlue]}>
              <Ionicons name="people-outline" size={12} color="#2563eb" />
              <Text style={styles.ratingText}>{formatCompactNumber(competition.entries)}</Text>
            </View>
          </View>
          <Text style={styles.cardDescription} numberOfLines={2}>{competition.description}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color="#64748b" />
            <Text style={styles.metaText}>{competition.timeLeft}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="ticket-outline" size={14} color="#64748b" />
            <Text style={styles.metaText}>
              {competition.entryFee === 0 ? 'Free entry campaign' : `${formatCurrency(competition.entryFee)} entry`}
            </Text>
          </View>
          <View style={styles.progressPanel}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Campaign participation</Text>
              <Text style={styles.progressValue}>{participationRatio}% utilized</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, styles.progressFillOrange, { width: `${Math.max(participationRatio, 8)}%` }]} />
            </View>
            <Text style={styles.progressHelper}>{competition.participants}</Text>
          </View>
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.cardPrice}>{competition.prize}</Text>
              <Text style={styles.cardPriceHelper}>Closes {formatShortDate(competition.endDate)}</Text>
            </View>
            <View style={styles.cardAction}>
              <Text style={styles.cardActionText}>Browse</Text>
              <Ionicons name="arrow-forward" size={14} color="#ffffff" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ScrollControl = ({ direction, onPress, disabled }) => (
    <TouchableOpacity
      style={[styles.scrollControl, disabled && styles.scrollControlDisabled]}
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={direction === 'left' ? 'chevron-back' : 'chevron-forward'} size={18} color={disabled ? '#94a3b8' : '#0f172a'} />
    </TouchableOpacity>
  );

  const CollectionPanel = ({ eyebrow, title, subtitle, icon, iconColor, iconBg, items, renderItem, cardWidth = CAROUSEL_CARD_WIDTH }) => {
    const scrollRef = useRef(null);
    const currentOffsetRef = useRef(0);
    const contentWidthRef = useRef(0);
    const layoutWidthRef = useRef(0);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const syncScrollState = (scrollX = currentOffsetRef.current) => {
      const maxScroll = Math.max(0, contentWidthRef.current - layoutWidthRef.current);
      setCanScrollLeft(scrollX > 10);
      setCanScrollRight(scrollX < maxScroll - 10);
    };

    const handleScroll = (event) => {
      const scrollX = event.nativeEvent.contentOffset.x;
      contentWidthRef.current = event.nativeEvent.contentSize.width;
      layoutWidthRef.current = event.nativeEvent.layoutMeasurement.width;
      currentOffsetRef.current = scrollX;
      syncScrollState(scrollX);
    };

    const scrollBy = (direction) => {
      const delta = cardWidth + CAROUSEL_GAP;
      const nextOffset = direction === 'right'
        ? currentOffsetRef.current + delta
        : Math.max(0, currentOffsetRef.current - delta);
      currentOffsetRef.current = nextOffset;
      scrollRef.current?.scrollTo({ x: nextOffset, animated: true });
    };

    return (
      <View style={styles.surfaceCard}>
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          icon={icon}
          iconColor={iconColor}
          iconBg={iconBg}
          controls={(
            <View style={styles.carouselControls}>
              <ScrollControl direction="left" onPress={() => scrollBy('left')} disabled={!canScrollLeft} />
              <ScrollControl direction="right" onPress={() => scrollBy('right')} disabled={!canScrollRight} />
            </View>
          )}
        />
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
          onContentSizeChange={(contentWidth) => {
            contentWidthRef.current = contentWidth;
            syncScrollState();
          }}
          onLayout={(event) => {
            layoutWidthRef.current = event.nativeEvent.layout.width;
            syncScrollState();
          }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {items.map((item) => renderItem(item))}
        </ScrollView>
      </View>
    );
  };

  const CategoryGrid = () => (
    <View style={styles.surfaceCard}>
      <SectionHeader
        eyebrow="Coverage"
        title="Browse portfolio categories"
        subtitle="Navigate trusted inventory by audience intent, commercial vertical, and event format."
        icon="grid-outline"
        iconColor="#7c3aed"
        iconBg="#ede9fe"
      />
      <View style={styles.categoryGrid}>
        {categories.map((category) => {
          const share = Math.round((category.events / maxCategoryVolume) * 100);

          return (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryCard, { width: CATEGORY_CARD_WIDTH }]}
              activeOpacity={0.92}
              onPress={() => navigation.navigate('BrowseEvents', { category: category.name })}
            >
              <View style={styles.categoryRow}>
                <View style={[styles.categoryIcon, { backgroundColor: `${category.color}18` }]}>
                  <Ionicons name={category.icon} size={22} color={category.color} />
                </View>
                <View style={[styles.categoryPill, { borderColor: `${category.color}30` }]}>
                  <Text style={[styles.categoryPillText, { color: category.color }]}>{category.events} listings</Text>
                </View>
              </View>
              <Text style={styles.categoryTitle}>{category.name}</Text>
              <Text style={styles.categoryDescription}>
                Commercially relevant experiences designed for premium discovery and stronger conversion.
              </Text>
              <View style={styles.categoryProgressRow}>
                <View style={styles.categoryProgressTrack}>
                  <View style={[styles.categoryProgressFill, { width: `${Math.max(share, 10)}%`, backgroundColor: category.color }]} />
                </View>
                <Ionicons name="arrow-forward" size={16} color="#64748b" />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderContent = () => {
    if (activeTab === 'featured') {
      return (
        <>
          <CollectionPanel
            eyebrow="Editorial"
            title="Featured marketplace inventory"
            subtitle="Top-priority programs positioned for strong conversion and premium audience discovery."
            icon="star-outline"
            iconColor="#2563eb"
            iconBg="#dbeafe"
            cardWidth={SECTION_FIT_CARD_WIDTH}
            items={featuredEvents}
            renderItem={(event) => <EventCard key={`featured-${event.id}`} event={event} showCategory={true} cardWidth={SECTION_FIT_CARD_WIDTH} />}
          />
          <CollectionPanel
            eyebrow="Demand"
            title="Trending right now"
            subtitle="Programs with the strongest reservation pressure and the clearest momentum signals."
            icon="trending-up-outline"
            iconColor="#0f766e"
            iconBg="#ccfbf1"
            cardWidth={SECTION_FIT_CARD_WIDTH}
            items={trendingEvents}
            renderItem={(event) => <EventCard key={`trending-${event.id}`} event={event} cardWidth={SECTION_FIT_CARD_WIDTH} />}
          />
        </>
      );
    }

    if (activeTab === 'competitions') {
      return (
        <CollectionPanel
          eyebrow="Acquisition"
          title="Prize-led audience campaigns"
          subtitle="High-visibility competitions designed to expand reach and accelerate discovery."
          icon="trophy-outline"
          iconColor="#c2410c"
          iconBg="#ffedd5"
          items={activeCompetitions}
          renderItem={(competition) => <CompetitionCard key={`competition-${competition.id}`} competition={competition} />}
        />
      );
    }

    if (activeTab === 'categories') {
      return <CategoryGrid />;
    }

      return (
        <CollectionPanel
          eyebrow="Demand"
          title="Trending right now"
          subtitle="Programs with the strongest reservation pressure and the clearest momentum signals."
          icon="trending-up-outline"
          iconColor="#0f766e"
          iconBg="#ccfbf1"
          cardWidth={SECTION_FIT_CARD_WIDTH}
          items={trendingEvents}
          renderItem={(event) => <EventCard key={`trending-only-${event.id}`} event={event} cardWidth={SECTION_FIT_CARD_WIDTH} />}
        />
      );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading marketplace intelligence...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.pageGlowBlue} />
      <View style={styles.pageGlowSlate} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
      >
        <View style={styles.pageShell}>
          <View style={styles.heroShell}>
            <View style={styles.heroGlowBlue} />
            <View style={styles.heroGlowSlate} />
            <View style={styles.heroGrid}>
              <View style={styles.heroCopy}>
                <Text style={styles.pageEyebrow}>Experience marketplace</Text>
                <Text style={styles.heroTitle}>Discover premium live experiences with enterprise-grade clarity.</Text>
                <Text style={styles.heroSubtitle}>
                  {`Welcome back, ${user?.first_name || user?.username || 'there'}. Review trusted supply, live demand signals, and audience campaigns from one polished workspace.`}
                </Text>
                <View style={styles.heroChipRow}>
                  <View style={styles.heroChip}><Ionicons name="checkmark-circle-outline" size={14} color="#dbeafe" /><Text style={styles.heroChipText}>Verified listings</Text></View>
                  <View style={styles.heroChip}><Ionicons name="phone-portrait-outline" size={14} color="#dbeafe" /><Text style={styles.heroChipText}>Instant mobile delivery</Text></View>
                  <View style={styles.heroChip}><Ionicons name="card-outline" size={14} color="#dbeafe" /><Text style={styles.heroChipText}>Secure checkout</Text></View>
                </View>
                <View style={styles.heroActionRow}>
                  <TouchableOpacity style={styles.heroPrimaryButton} activeOpacity={0.92} onPress={() => navigation.navigate('BrowseEvents')}>
                    <Ionicons name="search-outline" size={16} color="#ffffff" />
                    <Text style={styles.heroPrimaryButtonText}>Open marketplace</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.heroSecondaryButton} activeOpacity={0.92} onPress={onRefresh}>
                    <Ionicons name="refresh-outline" size={16} color="#ffffff" />
                    <Text style={styles.heroSecondaryButtonText}>{refreshing ? 'Refreshing' : 'Refresh workspace'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.heroSpotlight}
                activeOpacity={0.94}
                onPress={() => navigation.navigate('EventDetail', { eventId: heroEvent.id, event: heroEvent })}
              >
                <Image source={{ uri: heroEvent.image }} style={styles.heroSpotlightImage} resizeMode="cover" />
                <View style={styles.heroSpotlightOverlay} />
                <View style={styles.heroSpotlightContent}>
                  <View style={styles.heroSpotlightPill}>
                    <Ionicons name="flash-outline" size={13} color="#f8fafc" />
                    <Text style={styles.heroSpotlightPillText}>Featured release</Text>
                  </View>
                  <Text style={styles.heroSpotlightTitle} numberOfLines={2}>{heroEvent.title}</Text>
                  <View style={styles.spotlightMeta}><Ionicons name="location-outline" size={14} color="#e2e8f0" /><Text style={styles.spotlightMetaText} numberOfLines={1}>{heroEvent.location}</Text></View>
                  <View style={styles.spotlightMeta}><Ionicons name="calendar-outline" size={14} color="#e2e8f0" /><Text style={styles.spotlightMetaText}>{formatShortDate(heroEvent.date)} at {formatTime(heroEvent.date)}</Text></View>
                  <View style={styles.heroSpotlightFooter}>
                    <View>
                      <Text style={styles.heroSpotlightPrice}>From {formatCurrency(heroEvent.discountedPrice || heroEvent.price)}</Text>
                      <Text style={styles.heroSpotlightHelper}>{getDemandLabel(getDemandRatio(heroEvent.current_attendees, heroEvent.max_attendees))}</Text>
                    </View>
                    <View style={styles.cardAction}>
                      <Text style={styles.cardActionText}>View event</Text>
                      <Ionicons name="arrow-forward" size={14} color="#ffffff" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            {summaryCards.map((card) => (
              <View key={card.label} style={styles.summaryCard}>
                <View style={[styles.summaryIcon, { backgroundColor: card.iconBg }]}>
                  <Ionicons name={card.icon} size={18} color={card.iconColor} />
                </View>
                <Text style={styles.summaryLabel}>{card.label}</Text>
                <Text style={styles.summaryValue}>{card.value}</Text>
                <Text style={styles.summaryHelper}>{card.helper}</Text>
              </View>
            ))}
          </View>

          <View style={styles.workspaceGrid}>
            <View style={styles.workspaceCard}>
              <Text style={styles.workspaceEyebrow}>Market coverage</Text>
              <Text style={styles.workspaceTitle}>Category portfolio mix</Text>
              <Text style={styles.workspaceSubtitle}>The strongest verticals currently driving marketplace discovery and attention.</Text>
              {categories.slice(0, 4).map((category) => {
                const share = Math.round((category.events / maxCategoryVolume) * 100);
                return (
                  <TouchableOpacity key={category.id} style={styles.workspaceItem} activeOpacity={0.88} onPress={() => setActiveTab('categories')}>
                    <View style={styles.workspaceItemRow}>
                      <Text style={styles.workspaceItemTitle}>{category.name}</Text>
                      <Text style={[styles.workspaceItemValue, { color: category.color }]}>{category.events} live</Text>
                    </View>
                    <View style={styles.workspaceBarTrack}>
                      <View style={[styles.workspaceBarFill, { width: `${Math.max(share, 8)}%`, backgroundColor: category.color }]} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.workspaceCard}>
              <Text style={styles.workspaceEyebrow}>Demand pulse</Text>
              <Text style={styles.workspaceTitle}>Fastest-moving programs</Text>
              <Text style={styles.workspaceSubtitle}>Inventory with the highest reservation pressure and strongest market momentum.</Text>
              {topDemandEvents.map((event) => {
                const ratio = getDemandRatio(event.current_attendees, event.max_attendees);
                return (
                  <TouchableOpacity
                    key={`demand-${event.id}`}
                    style={styles.workspaceItem}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('EventDetail', { eventId: event.id, event })}
                  >
                    <View style={styles.workspaceItemRow}>
                      <Text style={styles.workspaceItemTitle} numberOfLines={1}>{event.title}</Text>
                      <Text style={styles.workspaceDemand}>{ratio}%</Text>
                    </View>
                    <Text style={styles.workspaceMeta}>{formatShortDate(event.date)} | {event.location}</Text>
                    <View style={styles.workspaceBarTrack}>
                      <View style={[styles.workspaceBarFill, { width: `${Math.max(ratio, 8)}%` }]} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.workspaceCard}>
              <Text style={styles.workspaceEyebrow}>Operator shortcuts</Text>
              <Text style={styles.workspaceTitle}>High-value actions</Text>
              <Text style={styles.workspaceSubtitle}>Move directly into the most useful marketplace paths from discovery.</Text>
              <TouchableOpacity style={[styles.workspaceButton, styles.workspaceButtonPrimary]} activeOpacity={0.92} onPress={() => navigation.navigate('BrowseEvents')}>
                <Ionicons name="search-outline" size={17} color="#ffffff" />
                <Text style={styles.workspaceButtonPrimaryText}>Browse official tickets</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.workspaceButton} activeOpacity={0.92} onPress={() => setActiveTab('competitions')}>
                <Ionicons name="trophy-outline" size={17} color="#0f172a" />
                <Text style={styles.workspaceButtonText}>Review live competitions</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.workspaceButton} activeOpacity={0.92} onPress={() => setActiveTab('trending')}>
                <Ionicons name="trending-up-outline" size={17} color="#0f172a" />
                <Text style={styles.workspaceButtonText}>Open demand pulse</Text>
              </TouchableOpacity>
              <View style={styles.workspaceNote}>
                <Ionicons name="shield-checkmark-outline" size={15} color="#2563eb" />
                <Text style={styles.workspaceNoteText}>Highest observed demand across live inventory is {highestDemandRatio}% reserved.</Text>
              </View>
            </View>
          </View>

          <View style={styles.tabShell}>
            <SectionHeader
              eyebrow="Collections"
              title="Discovery workspace"
              subtitle="Switch between editorially featured inventory, prize-led campaigns, category coverage, and live demand signals."
              icon="layers-outline"
              iconColor="#2563eb"
              iconBg="#dbeafe"
            />
            <View style={styles.tabGrid}>
              {tabOptions.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabCard, width < 720 && styles.tabCardCompact, activeTab === tab.id && styles.tabCardActive]}
                  activeOpacity={0.92}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <View style={[styles.tabIconWrap, activeTab === tab.id && styles.tabIconWrapActive]}>
                    <Ionicons name={tab.icon} size={18} color={activeTab === tab.id ? '#ffffff' : '#2563eb'} />
                  </View>
                  <View style={styles.tabCopy}>
                    <View style={styles.tabRow}>
                      <Text style={styles.tabLabel}>{tab.label}</Text>
                      <Text style={[styles.tabCount, activeTab === tab.id && styles.tabCountActive]}>{tab.count}</Text>
                    </View>
                    <Text style={styles.tabHelper}>{tab.helper}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {renderContent()}
        </View>
      </ScrollView>
    </View>
  );
};

const cardShadow = Platform.select({
  web: {
    boxShadow: '0 18px 34px -26px rgba(15, 23, 42, 0.2)',
  },
  default: {
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fb' },
  pageGlowBlue: { position: 'absolute', top: -120, left: -120, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(37, 99, 235, 0.08)' },
  pageGlowSlate: { position: 'absolute', top: 140, right: -120, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(15, 23, 42, 0.05)' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  pageShell: { width: '100%', maxWidth: PAGE_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: PAGE_PADDING, paddingTop: 22 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f7fb' },
  loadingText: { marginTop: 16, fontSize: 15, fontWeight: '600', color: '#64748b' },
  heroShell: { position: 'relative', overflow: 'hidden', borderRadius: 28, padding: width >= 980 ? 28 : 20, backgroundColor: '#0f172a', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.14)', marginBottom: 16, ...cardShadow },
  heroGlowBlue: { position: 'absolute', top: -70, left: -10, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(37, 99, 235, 0.22)' },
  heroGlowSlate: { position: 'absolute', bottom: -110, right: -40, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(14, 165, 233, 0.12)' },
  heroGrid: { flexDirection: width >= 1040 ? 'row' : 'column', gap: 18 },
  heroCopy: { flex: 1, maxWidth: width >= 1040 ? 680 : undefined },
  pageEyebrow: { fontSize: 11, fontWeight: '800', color: '#bfdbfe', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8 },
  heroTitle: { fontSize: width >= 980 ? 34 : width >= 768 ? 30 : 25, lineHeight: width >= 980 ? 40 : width >= 768 ? 36 : 31, fontWeight: '800', color: '#ffffff', letterSpacing: -0.6, maxWidth: 720 },
  heroSubtitle: { marginTop: 10, fontSize: 14, lineHeight: 22, color: '#cbd5e1', maxWidth: 680 },
  heroChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  heroChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  heroChipText: { fontSize: 12, fontWeight: '700', color: '#e2e8f0' },
  heroActionRow: { flexDirection: width >= 640 ? 'row' : 'column', gap: 12, marginTop: 20 },
  heroPrimaryButton: { minHeight: 48, paddingHorizontal: 18, borderRadius: 14, backgroundColor: '#2563eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  heroPrimaryButtonText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  heroSecondaryButton: { minHeight: 48, paddingHorizontal: 18, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  heroSecondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  heroSpotlight: { flex: width >= 1040 ? 0.95 : undefined, minHeight: 360, borderRadius: 24, overflow: 'hidden', backgroundColor: '#1e293b', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  heroSpotlightImage: { ...StyleSheet.absoluteFillObject },
  heroSpotlightOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.28)' },
  heroSpotlightContent: { flex: 1, justifyContent: 'flex-end', padding: 18, backgroundColor: 'rgba(15,23,42,0.22)' },
  heroSpotlightPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', marginBottom: 12 },
  heroSpotlightPillText: { fontSize: 11, fontWeight: '700', color: '#f8fafc' },
  heroSpotlightTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: '#ffffff', marginBottom: 12, letterSpacing: -0.4 },
  spotlightMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  spotlightMetaText: { flex: 1, fontSize: 13, lineHeight: 18, color: '#e2e8f0' },
  heroSpotlightFooter: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  heroSpotlightPrice: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  heroSpotlightHelper: { marginTop: 4, fontSize: 12, color: '#cbd5e1' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  summaryCard: { width: width >= 1120 ? '24.2%' : width >= 760 ? '48.8%' : '100%', backgroundColor: '#ffffff', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#dbe4f3', ...cardShadow },
  summaryIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  summaryLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  summaryValue: { fontSize: 28, fontWeight: '800', color: '#0f172a', letterSpacing: -0.6, marginBottom: 6 },
  summaryHelper: { fontSize: 13, lineHeight: 18, color: '#475569' },
  workspaceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  workspaceCard: { flex: 1, minWidth: width >= 1120 ? 360 : width >= 760 ? 320 : '100%', backgroundColor: '#ffffff', borderRadius: 22, borderWidth: 1, borderColor: '#dbe4f3', padding: 18, ...cardShadow },
  workspaceEyebrow: { fontSize: 10, fontWeight: '800', color: '#2563eb', letterSpacing: 0.8, textTransform: 'uppercase' },
  workspaceTitle: { marginTop: 8, fontSize: 20, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  workspaceSubtitle: { marginTop: 6, fontSize: 13, lineHeight: 19, color: '#64748b' },
  workspaceItem: { marginTop: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', padding: 13 },
  workspaceItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  workspaceItemTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  workspaceItemValue: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  workspaceMeta: { marginTop: 5, fontSize: 12, lineHeight: 17, color: '#64748b' },
  workspaceBarTrack: { marginTop: 10, height: 8, borderRadius: 999, backgroundColor: '#dbe4f3', overflow: 'hidden' },
  workspaceBarFill: { height: '100%', borderRadius: 999, backgroundColor: '#2563eb' },
  workspaceDemand: { fontSize: 11, fontWeight: '800', color: '#2563eb' },
  workspaceButton: { minHeight: 44, marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: '#dbe4f3', backgroundColor: '#f8fafc', paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  workspaceButtonPrimary: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  workspaceButtonText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  workspaceButtonPrimaryText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  workspaceNote: { marginTop: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe' },
  workspaceNoteText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#1e3a8a' },
  tabShell: { marginBottom: 16, borderRadius: 24, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4f3', padding: width >= 768 ? 20 : 16, ...cardShadow },
  sectionHeader: { flexDirection: width >= 760 ? 'row' : 'column', justifyContent: 'space-between', alignItems: width >= 760 ? 'center' : 'flex-start', gap: 12, marginBottom: 16 },
  sectionCopy: { flex: 1, maxWidth: 760 },
  sectionEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionEyebrow: { fontSize: 10, fontWeight: '800', color: '#2563eb', letterSpacing: 0.9, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a', letterSpacing: -0.4 },
  sectionSubtitle: { marginTop: 6, fontSize: 13, lineHeight: 19, color: '#64748b' },
  tabGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tabCard: { flex: 1, minWidth: width < 720 ? '48%' : 0, borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  tabCardCompact: { width: '48.5%' },
  tabCardActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  tabIconWrap: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dbeafe' },
  tabIconWrapActive: { backgroundColor: '#2563eb' },
  tabCopy: { flex: 1 },
  tabRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  tabLabel: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  tabCount: { minWidth: 28, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4f3', textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#475569' },
  tabCountActive: { backgroundColor: '#dbeafe', borderColor: '#bfdbfe', color: '#1d4ed8' },
  tabHelper: { marginTop: 5, fontSize: 12, color: '#64748b', lineHeight: 17 },
  surfaceCard: { marginBottom: 16, borderRadius: 24, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe4f3', padding: SURFACE_CARD_PADDING, ...cardShadow },
  carouselControls: { flexDirection: 'row', gap: 8 },
  scrollControl: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#dbe4f3', alignItems: 'center', justifyContent: 'center' },
  scrollControlDisabled: { opacity: 0.45 },
  carouselContent: { gap: CAROUSEL_GAP },
  collectionCard: { borderRadius: 20, borderWidth: 1, borderColor: '#dbe4f3', overflow: 'hidden', backgroundColor: '#ffffff', ...cardShadow },
  cardImageWrap: { position: 'relative', height: 220, backgroundColor: '#cbd5e1' },
  cardImage: { width: '100%', height: '100%' },
  cardImageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.16)' },
  cardBadgeRow: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  badgeDark: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  badgeBlue: { backgroundColor: 'rgba(37,99,235,0.88)' },
  badgeOrange: { backgroundColor: 'rgba(194,65,12,0.88)' },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.5 },
  datePill: { position: 'absolute', right: 14, bottom: 14, width: 54, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', paddingVertical: 8 },
  datePillMonth: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  datePillDay: { marginTop: 2, fontSize: 20, fontWeight: '800', color: '#0f172a' },
  cardBody: { padding: 18 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitle: { flex: 1, fontSize: 20, lineHeight: 26, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
  ratingBlue: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  ratingText: { fontSize: 11, fontWeight: '800', color: '#0f172a' },
  cardDescription: { marginTop: 10, fontSize: 13, lineHeight: 20, color: '#64748b' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  metaText: { flex: 1, fontSize: 13, lineHeight: 18, color: '#475569' },
  progressPanel: { marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 },
  progressLabel: { fontSize: 12, fontWeight: '700', color: '#475569' },
  progressValue: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: '#dbe4f3', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#2563eb' },
  progressFillOrange: { backgroundColor: '#c2410c' },
  progressHelper: { marginTop: 8, fontSize: 12, color: '#64748b' },
  cardFooter: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  cardPrice: { fontSize: 20, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  cardPriceHelper: { marginTop: 4, fontSize: 12, lineHeight: 17, color: '#64748b' },
  cardAction: { minHeight: 40, borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#0f172a', flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardActionText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryCard: { borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', padding: 16 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 },
  categoryIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  categoryPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#ffffff' },
  categoryPillText: { fontSize: 11, fontWeight: '700' },
  categoryTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  categoryDescription: { marginTop: 8, fontSize: 13, lineHeight: 19, color: '#64748b' },
  categoryProgressRow: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryProgressTrack: { flex: 1, height: 8, borderRadius: 999, backgroundColor: '#dbe4f3', overflow: 'hidden' },
  categoryProgressFill: { height: '100%', borderRadius: 999 },
});

export default DiscoverScreen;
