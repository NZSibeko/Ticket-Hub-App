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
const storefrontImagePool = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1400&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1400&q=80',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1400&q=80',
  'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1400&q=80',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1400&q=80',
  'https://images.unsplash.com/photo-1521334884684-d80222895322?w=1400&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1400&q=80',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1400&q=80',
  'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1400&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1400&q=80&sat=-20',
  'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=1400&q=80',
  'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=1400&q=80',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1400&q=80',
  'https://images.unsplash.com/photo-1497032205916-ac775f0649ae?w=1400&q=80',
  'https://images.unsplash.com/photo-1515169067868-5387ec356754?w=1400&q=80',
  'https://images.unsplash.com/photo-1503428593586-e225b39bddfe?w=1400&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1400&q=80',
  'https://images.unsplash.com/photo-1516307365426-bea591f05011?w=1400&q=80',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1400&q=80&sat=10',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1400&q=80',
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1400&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1400&q=80',
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1400&q=80',
  'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1400&q=80'
];

const hashArtworkSeed = (value) => {
  const source = String(value || '');
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  return hash;
};

const getEventArtwork = (event, surfaceKey = 'default') => {
  const seed = [
    surfaceKey,
    event?.event_id,
    event?.event_name,
    event?.location,
    event?.start_date
  ].filter(Boolean).join('|');

  return storefrontImagePool[hashArtworkSeed(seed) % storefrontImagePool.length];
};

const SearchEventsScreen = ({ navigation, route }) => {
  const initialQuery = route?.params?.searchQuery || '';
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
  const [activeQuickFilter, setActiveQuickFilter] = useState('all');
  const [sortMode, setSortMode] = useState('recommended');
  const { hasAdminPrivileges, apiBaseUrl, getApiBaseUrl } = useAuth();

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(window.width);
    });

    return () => {
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (route?.params?.searchQuery) {
      setSearchQuery(route.params.searchQuery);
    }
  }, [route?.params?.searchQuery]);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [apiBaseUrl, getApiBaseUrl])
  );

  const fetchEvents = async () => {
    try {
      const baseUrl =
        apiBaseUrl || (typeof getApiBaseUrl === 'function' ? await getApiBaseUrl() : '');

      if (!baseUrl) {
        setAllEvents([]);
        return;
      }

      const res = await fetch(`${baseUrl}/api/events/public`);
      const data = await res.json();
      
      if (res.ok && data.success && Array.isArray(data.events)) {
        setAllEvents(data.events);
      } else {
        setAllEvents([]);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
      setAllEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getMinPrice = (event) => {
    if (event.ticket_types?.length) {
      return Math.min(...event.ticket_types.map((ticket) => Number(ticket.price) || 0));
    }
    return Number(event.price) || 0;
  };

  const getSellThrough = (event) => {
    if (!event.current_attendees || !event.max_attendees) return 0;
    return Math.min(100, Math.round((event.current_attendees / event.max_attendees) * 100));
  };

  const applyQuickFilter = (events) => {
    switch (activeQuickFilter) {
      case 'high-demand':
        return events.filter((event) => getSellThrough(event) >= 70);
      case 'budget':
        return events.filter((event) => getMinPrice(event) <= 50);
      case 'weekend':
        return events.filter((event) => {
          const day = new Date(event.start_date).getDay();
          return day === 0 || day === 6;
        });
      case 'nightlife':
        return events.filter((event) => {
          const hour = new Date(event.start_date).getHours();
          return hour >= 18 || hour < 4;
        });
      case 'workshops':
        return events.filter((event) => {
          const name = event.event_name?.toLowerCase() || '';
          return name.includes('workshop') || name.includes('class') || name.includes('expo');
        });
      case 'music':
        return events.filter((event) => {
          const name = event.event_name?.toLowerCase() || '';
          return name.includes('music') || name.includes('concert') || name.includes('jazz');
        });
      case 'food':
        return events.filter((event) => {
          const name = event.event_name?.toLowerCase() || '';
          return name.includes('food') || name.includes('market') || name.includes('wine');
        });
      case 'arts':
        return events.filter((event) => {
          const name = event.event_name?.toLowerCase() || '';
          return name.includes('art') || name.includes('comedy') || name.includes('gallery');
        });
      default:
        return events;
    }
  };

  const sortEvents = (events) => {
    const sorted = [...events];

    switch (sortMode) {
      case 'date':
        return sorted.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
      case 'price-low':
        return sorted.sort((a, b) => getMinPrice(a) - getMinPrice(b));
      case 'price-high':
        return sorted.sort((a, b) => getMinPrice(b) - getMinPrice(a));
      case 'demand':
        return sorted.sort((a, b) => getSellThrough(b) - getSellThrough(a));
      default:
        return sorted.sort((a, b) => {
          const demandDelta = getSellThrough(b) - getSellThrough(a);
          if (demandDelta !== 0) return demandDelta;
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        });
    }
  };

  const categorizeEvents = () => {
    const query = searchQuery.trim().toLowerCase();
    let filtered = allEvents.filter((event) => {
      if (!query) return true;

      return (
        event.event_name?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query) ||
        event.event_description?.toLowerCase().includes(query)
      );
    });

    filtered = applyQuickFilter(filtered);
    const sortedBase = sortEvents(filtered);

    return {
      thisWeek: sortedBase.slice(0, 10),
      trending: [...filtered].sort((a, b) => getSellThrough(b) - getSellThrough(a)).slice(0, 10),
      nightlife: sortedBase.filter((event) => {
        const hour = new Date(event.start_date).getHours();
        return hour >= 18 || hour < 4;
      }),
      budget: sortedBase.filter((event) => getMinPrice(event) <= 50),
      weekend: sortedBase.filter((event) => {
        const day = new Date(event.start_date).getDay();
        return day === 0 || day === 6;
      }),
      workshops: sortedBase.filter((event) => {
        const name = event.event_name?.toLowerCase() || '';
        return name.includes('workshop') || name.includes('class') || name.includes('expo');
      }),
      music: sortedBase.filter((event) => {
        const name = event.event_name?.toLowerCase() || '';
        return name.includes('music') || name.includes('concert') || name.includes('jazz');
      }),
      food: sortedBase.filter((event) => {
        const name = event.event_name?.toLowerCase() || '';
        return name.includes('food') || name.includes('market') || name.includes('wine');
      }),
      arts: sortedBase.filter((event) => {
        const name = event.event_name?.toLowerCase() || '';
        return name.includes('art') || name.includes('comedy') || name.includes('gallery');
      }),
      all: sortedBase
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

  const normalizeTicketType = (event, ticket) => {
    const fallbackPrice = getMinPrice(event);
    const label = ticket?.label || ticket?.type || 'General';
    const availableQuantity = Number(
      ticket?.available_quantity ??
      ticket?.available ??
      ticket?.max_quantity ??
      10
    );

    return {
      ...ticket,
      label,
      type: ticket?.type || label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      price: Number(ticket?.price ?? fallbackPrice ?? event?.price ?? 0),
      available_quantity: Number.isFinite(availableQuantity) && availableQuantity > 0
        ? availableQuantity
        : 10,
    };
  };

  const getTicketOptions = (event) => {
    if (event.ticket_types?.length) {
      return event.ticket_types.slice(0, 3).map((ticket) => normalizeTicketType(event, ticket));
    }

    const basePrice = Math.max(getMinPrice(event), 25);
    return [
      { label: 'General', type: 'general', price: basePrice },
      { label: 'VIP', type: 'vip', price: Math.round(basePrice * 1.6) },
      { label: 'Group', type: 'group', price: Math.round(basePrice * 2.1) }
    ].map((ticket) => normalizeTicketType(event, ticket));
  };

  const getPrimaryTicketType = (event) =>
    getTicketOptions(event)[0] || normalizeTicketType(event, { label: 'General', type: 'general' });

  const buildCheckoutEventPayload = (event, ticket, artworkUri) => ({
    ...event,
    price: Number(ticket?.price ?? getMinPrice(event) ?? event?.price ?? 0),
    display_artwork: artworkUri || event?.display_artwork || event?.image_url || getEventArtwork(event, 'checkout'),
  });

  const openTicketPurchase = (event, ticket = getPrimaryTicketType(event), artworkUri) => {
    navigation.navigate('PurchaseTicket', {
      event: buildCheckoutEventPayload(event, ticket, artworkUri),
      ticketType: ticket,
    });
  };

  const openPaymentCheckout = (event, ticket = getPrimaryTicketType(event), artworkUri) => {
    const selectedTicket = normalizeTicketType(event, ticket);
    const quantity = 1;
    const totalAmount = Number(selectedTicket.price || 0) * quantity;

    navigation.navigate('Payment', {
      event: buildCheckoutEventPayload(event, selectedTicket, artworkUri),
      ticketType: selectedTicket,
      quantity,
      totalAmount,
    });
  };

  const quickFilters = [
    { id: 'all', label: 'All events' },
    { id: 'high-demand', label: 'Popular now' },
    { id: 'music', label: 'Concerts' },
    { id: 'weekend', label: 'Weekend' },
    { id: 'nightlife', label: 'Night out' },
    { id: 'food', label: 'Food & drink' },
    { id: 'arts', label: 'Arts & comedy' },
    { id: 'budget', label: 'Under R50' },
    { id: 'workshops', label: 'Workshops' }
  ];

  const sortOptions = [
    { id: 'recommended', label: 'Best match' },
    { id: 'date', label: 'Soonest date' },
    { id: 'demand', label: 'Most popular' },
    { id: 'price-low', label: 'Price: low to high' },
    { id: 'price-high', label: 'Price: high to low' }
  ];

  const EventCard = ({ event, variant = 'default', fillWidth = false }) => {
    const minPrice = getMinPrice(event);
    const isMobile = windowWidth < 768;
    const categoryLabel = getCategoryLabel(event);
    const eventDate = new Date(event.start_date);
    const isSquareVariant = variant === 'square';
    const isTrendingVariant = variant === 'trending';
    const eventArtwork = getEventArtwork(event, `event-card-${variant}`);

    return (
      <TouchableOpacity 
        style={[
          styles.eventCard, 
          isSquareVariant && styles.eventCardSquare,
          isTrendingVariant && styles.eventCardTrending,
          fillWidth && styles.eventCardFillWidth,
          !fillWidth && isMobile && { width: Math.max(windowWidth * (isSquareVariant ? 0.76 : 0.74), isSquareVariant ? 258 : 268) },
        ]} 
        onPress={() => openTicketPurchase(event, undefined, eventArtwork)}
        activeOpacity={0.95}
        >
        <View style={[styles.imageContainer, isSquareVariant && styles.imageContainerSquare, isTrendingVariant && styles.imageContainerTrending]}>
          <Image 
            source={{ uri: eventArtwork }} 
            style={styles.eventImage} 
            resizeMode="cover" 
          />
          <View style={[styles.imageOverlay, isTrendingVariant && styles.imageOverlayTrending]} />
          {isTrendingVariant ? (
            <View style={styles.trendingSignalBadge}>
              <Ionicons name="flash" size={11} color="#fff" />
              <Text style={styles.trendingSignalText}>TRENDING</Text>
            </View>
          ) : null}
        </View>
        
        <View style={[styles.eventInfo, isSquareVariant && styles.eventInfoSquare, isTrendingVariant && styles.eventInfoTrending]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.eventCategory, isTrendingVariant && styles.eventCategoryTrending]}>
              {isTrendingVariant ? 'Momentum pick' : categoryLabel}
            </Text>
            <View style={[styles.eventDateBadge, isTrendingVariant && styles.eventDateBadgeTrending]}>
              <Text style={styles.eventDateBadgeText}>
                {eventDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          </View>

          <Text style={[styles.eventName, isTrendingVariant && styles.eventNameTrending]} numberOfLines={2}>
            {event.event_name}
          </Text>

          {!isSquareVariant ? (
            <Text style={[styles.eventDescription, isTrendingVariant && styles.eventDescriptionTrending]} numberOfLines={2}>
              {event.event_description || 'Public event listing available for discovery and booking.'}
            </Text>
          ) : null}

          <View style={styles.cardMetaGrid}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color="#64748b" />
              <Text style={styles.metaText} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={13} color="#64748b" />
              <Text style={styles.metaText}>
                {eventDate.toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>
            {!isSquareVariant ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={13} color="#64748b" />
                <Text style={styles.metaText}>
                  {eventDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.cardFooterRow, isTrendingVariant && styles.cardFooterRowTrending]}>
            <View>
              <Text style={[styles.capacityLabel, isTrendingVariant && styles.capacityLabelTrending]}>
                {isTrendingVariant ? 'Book from' : 'Tickets from'}
              </Text>
              <Text style={[styles.capacityValue, isTrendingVariant && styles.capacityValueTrending]}>R{minPrice || 'TBD'}</Text>
            </View>
            <View style={[styles.cardActionPill, isTrendingVariant && styles.cardActionPillTrending]}>
              <Text style={[styles.cardActionText, isTrendingVariant && styles.cardActionTextTrending]}>
                {isTrendingVariant ? 'Book now' : 'Find tickets'}
              </Text>
              <Ionicons name={isTrendingVariant ? 'sparkles' : 'arrow-forward'} size={14} color={isTrendingVariant ? '#7c2d12' : '#fff'} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const TicketHeroSlider = ({ slides }) => {
    const sliderRef = useRef(null);
    const [activeSlide, setActiveSlide] = useState(0);
    const slideWidth = Math.min(windowWidth - (windowWidth >= 1024 ? 56 : 32), 1384);

    useEffect(() => {
      if (!slides?.length || slides.length <= 1) return undefined;

      const interval = setInterval(() => {
        setActiveSlide((current) => {
          const next = (current + 1) % slides.length;
          sliderRef.current?.scrollTo({ x: next * slideWidth, animated: true });
          return next;
        });
      }, 5000);

      return () => clearInterval(interval);
    }, [slideWidth, slides]);

    if (!slides?.length) return null;

    return (
      <View style={styles.ticketSliderSection}>
        <ScrollView
          ref={sliderRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
            setActiveSlide(nextIndex);
          }}
        >
          {slides.map((slide, index) => {
            const ticketOptions = getTicketOptions(slide);
            const slideArtwork = getEventArtwork(slide, `ticket-hero-${index}`);

            return (
              <TouchableOpacity
                key={slide.event_id}
                style={[styles.ticketSlide, { width: slideWidth }]}
                activeOpacity={0.94}
                onPress={() => openTicketPurchase(slide, undefined, slideArtwork)}
              >
                <Image
                  source={{ uri: slideArtwork }}
                  style={styles.ticketSlideImage}
                  resizeMode="cover"
                />
                <View style={styles.ticketSlideOverlay} />
                <View style={styles.ticketSlideContent}>
                  <View style={styles.ticketSlideHeader}>
                    <View style={styles.ticketSlideBadge}>
                      <Text style={styles.ticketSlideBadgeText}>{getCategoryLabel(slide)}</Text>
                    </View>
                    <Text style={styles.ticketSlideDate}>
                      {new Date(slide.start_date).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>

                  <Text style={styles.ticketSlideTitle} numberOfLines={2}>{slide.event_name}</Text>
                  <Text style={styles.ticketSlideMeta} numberOfLines={1}>{slide.location}</Text>
                  <Text style={styles.ticketSlideDescription} numberOfLines={2}>
                    {slide.event_description || 'Secure your seat before tickets sell out.'}
                  </Text>

                  <View style={styles.ticketOptionsRow}>
                    {ticketOptions.map((option, index) => (
                      <TouchableOpacity
                        key={`${slide.event_id}-${option.label}-${index}`}
                        style={styles.ticketOptionCard}
                        activeOpacity={0.92}
                        onPress={(pressEvent) => {
                          pressEvent?.stopPropagation?.();
                          openPaymentCheckout(slide, option, slideArtwork);
                        }}
                      >
                        <Text style={styles.ticketOptionLabel}>{option.label}</Text>
                        <Text style={styles.ticketOptionValue}>R{option.price}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.ticketSlideFooter}>
                    <View>
                      <Text style={styles.ticketSlideFooterLabel}>Tickets from</Text>
                      <Text style={styles.ticketSlideFooterValue}>R{getMinPrice(slide)}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.ticketSlideBuyButton}
                      onPress={(pressEvent) => {
                        pressEvent?.stopPropagation?.();
                        openTicketPurchase(slide, undefined, slideArtwork);
                      }}
                    >
                      <Text style={styles.ticketSlideBuyButtonText}>Buy now</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.ticketSliderDots}>
          {slides.map((slide, index) => (
            <View
              key={`${slide.event_id}-dot`}
              style={[styles.ticketSliderDot, activeSlide === index && styles.ticketSliderDotActive]}
            />
          ))}
        </View>
      </View>
    );
  };

  const CarouselSection = ({ title, subtitle, icon, iconColor, iconBgColor, events, cardVariant = 'default', compact = false }) => {
    const scrollViewRef = useRef(null);
    const currentScrollXRef = useRef(0);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const visibleEvents = compact ? events.slice(0, 4) : events;
    const compactColumns = windowWidth >= 960 ? 4 : windowWidth >= 760 ? 2 : 1;
    const compactGridWidth = Math.min(windowWidth - (windowWidth >= 1024 ? 88 : 44), 1384);
    const compactCardWidth = compact
      ? ((compactGridWidth - (compactColumns - 1) * 10) / compactColumns) - 4
      : 0;

    if (!visibleEvents || visibleEvents.length === 0) return null;

    const handleScroll = (event) => {
      const scrollX = event.nativeEvent.contentOffset.x;
      const contentWidth = event.nativeEvent.contentSize.width;
      const layoutWidth = event.nativeEvent.layoutMeasurement.width;

      currentScrollXRef.current = scrollX;
      setCanScrollLeft(scrollX > 10);
      setCanScrollRight(scrollX < contentWidth - layoutWidth - 10);
    };

    const scrollLeft = () => {
      if (scrollViewRef.current) {
        const scrollDistance = windowWidth > 768 ? 420 : windowWidth * 0.8;
        const newScrollX = Math.max(0, currentScrollXRef.current - scrollDistance);
        scrollViewRef.current.scrollTo({ x: newScrollX, animated: true });
      }
    };

    const scrollRight = () => {
      if (scrollViewRef.current) {
        const scrollDistance = windowWidth > 768 ? 420 : windowWidth * 0.8;
        scrollViewRef.current.scrollTo({ x: currentScrollXRef.current + scrollDistance, animated: true });
      }
    };

    return (
      <View style={[styles.categorySection, compact && styles.categorySectionCompact]}>
        <View style={[styles.sectionHeader, compact && styles.sectionHeaderCompact]}>
          <View style={styles.sectionHeaderContent}>
            <View style={[styles.sectionIconContainer, { backgroundColor: iconBgColor }]}>
              <Ionicons name={icon} size={18} color={iconColor} />
            </View>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.categoryTitle}>{title}</Text>
              {subtitle ? <Text style={styles.categorySubtitle}>{subtitle}</Text> : null}
            </View>
          </View>
          
          <View style={styles.sectionTools}>
            <View style={styles.sectionCountBadge}>
              <Text style={styles.sectionCountText}>{visibleEvents.length} events</Text>
            </View>
            {!compact ? (
              <View style={styles.carouselControls}>
                <TouchableOpacity 
                  style={[styles.carouselButton, !canScrollLeft && styles.carouselButtonDisabled]} 
                  onPress={scrollLeft} 
                  disabled={!canScrollLeft}
                >
                  <Ionicons name="chevron-back" size={20} color={canScrollLeft ? "#0f172a" : "#94a3b8"} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.carouselButton, !canScrollRight && styles.carouselButtonDisabled]} 
                  onPress={scrollRight} 
                  disabled={!canScrollRight}
                >
                  <Ionicons name="chevron-forward" size={20} color={canScrollRight ? "#0f172a" : "#94a3b8"} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        {compact ? (
          <View style={[styles.topPicksGrid, compactColumns > 1 && styles.topPicksGridWrapped]}>
            {visibleEvents.map((event, index) => (
              <View
                key={`${event.event_id || 'event'}-${index}`}
                style={[
                  styles.topPicksGridItem,
                  { width: compactCardWidth },
                ]}
              >
                <EventCard event={event} variant={cardVariant} fillWidth />
              </View>
            ))}
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.horizontalScroll, compact && styles.horizontalScrollCompact]}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {visibleEvents.map((event, index) => (
              <EventCard key={`${event.event_id || 'event'}-${index}`} event={event} variant={cardVariant} />
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const TrendingSliderCard = ({
    events,
    isDesktop,
    cardStyle,
    badgeLabel = 'Music',
    badgeIcon = 'musical-notes',
    descriptionFallback = 'Fresh ticket releases and premium music experiences available now.'
  }) => {
    const sliderEvents = (events || []).slice(0, 6);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
      if (!sliderEvents.length) return;
      setActiveIndex((current) => (current >= sliderEvents.length ? 0 : current));
    }, [sliderEvents.length]);

    useEffect(() => {
      if (sliderEvents.length <= 1) return undefined;

      const interval = setInterval(() => {
        setActiveIndex((current) => (current + 1) % sliderEvents.length);
      }, 4800);

      return () => clearInterval(interval);
    }, [sliderEvents.length]);

    if (!sliderEvents.length) return null;

    const activeEvent = sliderEvents[activeIndex];
    const eventDate = new Date(activeEvent.start_date);
    const activeArtwork = getEventArtwork(activeEvent, `trending-slider-${badgeLabel}-${activeIndex}`);

    const showPrevious = () => {
      setActiveIndex((current) => (current === 0 ? sliderEvents.length - 1 : current - 1));
    };

    const showNext = () => {
      setActiveIndex((current) => (current + 1) % sliderEvents.length);
    };

    return (
      <View style={[styles.trendingSliderCard, !isDesktop && styles.trendingSliderCardStacked, cardStyle]}>
        <Image
          source={{ uri: activeArtwork }}
          style={styles.trendingSliderImage}
          resizeMode="cover"
        />
        <View style={styles.trendingSliderOverlay} />

        <View style={styles.trendingSliderContent}>
          <View style={styles.trendingSliderTopRow}>
            <View style={styles.trendingSliderBadge}>
              <Ionicons name={badgeIcon} size={11} color="#fff" />
              <Text style={styles.trendingSliderBadgeText}>{badgeLabel}</Text>
            </View>

            {sliderEvents.length > 1 ? (
              <View style={styles.trendingSliderNav}>
                <TouchableOpacity style={styles.trendingSliderNavButton} onPress={showPrevious}>
                  <Ionicons name="chevron-back" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.trendingSliderNavButton} onPress={showNext}>
                  <Ionicons name="chevron-forward" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View style={styles.trendingSliderBody}>
            <View style={styles.trendingSliderMetaRow}>
              <Text style={styles.trendingSliderDate}>
                {eventDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
              </Text>
              <Text style={styles.trendingSliderCounter}>
                {activeIndex + 1}/{sliderEvents.length}
              </Text>
            </View>

            <Text style={styles.trendingSliderTitle} numberOfLines={2}>
              {activeEvent.event_name}
            </Text>
            <Text style={styles.trendingSliderMeta} numberOfLines={1}>
              {activeEvent.location}
            </Text>
            <Text style={styles.trendingSliderDescription} numberOfLines={2}>
              {activeEvent.event_description || descriptionFallback}
            </Text>
          </View>

          <View style={styles.trendingSliderFooter}>
            <View>
              <Text style={styles.trendingSliderPriceLabel}>From</Text>
              <Text style={styles.trendingSliderPrice}>R{getMinPrice(activeEvent)}</Text>
            </View>
            <TouchableOpacity
              style={styles.trendingSliderAction}
              onPress={() => openTicketPurchase(activeEvent, undefined, activeArtwork)}
            >
              <Text style={styles.trendingSliderActionText}>Buy now</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const ShowcaseCompactCard = ({
    event,
    cardHeight,
    mediaRatio,
    badgeLabel = 'Trending',
    badgeIcon = 'flash'
  }) => {
    const eventDate = new Date(event.start_date);
    const mediaHeight = Math.round(cardHeight * mediaRatio);
    const compactArtwork = getEventArtwork(event, `compact-card-${badgeLabel}`);

    return (
      <TouchableOpacity
        activeOpacity={0.94}
        style={[
          styles.trendingFeatureCard,
          styles.trendingFeatureCardSecondary,
          { height: cardHeight },
        ]}
        onPress={() => openTicketPurchase(event, undefined, compactArtwork)}
      >
        <View style={[styles.trendingFeatureMediaSecondary, { height: mediaHeight }]}>
          <Image
            source={{ uri: compactArtwork }}
            style={styles.trendingFeatureImageSecondary}
            resizeMode="cover"
          />
          <View style={styles.trendingFeatureOverlaySecondary} />
          <View style={styles.trendingFeatureTopRowSecondary}>
            <View style={styles.trendingFeatureBadge}>
              <Ionicons name={badgeIcon} size={11} color="#fff" />
              <Text style={styles.trendingFeatureBadgeText}>{badgeLabel}</Text>
            </View>
            <Text style={styles.trendingFeatureDate}>
              {eventDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>

        <View style={styles.trendingFeatureBodySecondary}>
          <View style={styles.trendingFeatureBodySecondaryTop}>
            <Text style={styles.trendingFeatureTitleSecondary} numberOfLines={2}>
              {event.event_name}
            </Text>
            <Text style={styles.trendingFeatureMetaSecondary} numberOfLines={1}>
              {event.location}
            </Text>
          </View>

          <View style={styles.trendingFeatureFooterSecondary}>
            <View>
              <Text style={styles.trendingFeaturePriceLabelSecondary}>Tickets from</Text>
              <Text style={styles.trendingFeaturePriceSecondary}>R{getMinPrice(event)}</Text>
            </View>
            <View style={styles.trendingFeatureActionSecondary}>
              <Text style={styles.trendingFeatureActionTextSecondary}>Book</Text>
              <Ionicons name="arrow-forward" size={14} color="#0f172a" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const TrendingShowcaseSection = ({ title, subtitle, icon, iconColor, iconBgColor, events }) => {
    const showcaseEvents = events.slice(0, 3);
    const primaryEvent = showcaseEvents[0];
    const secondaryEvents = showcaseEvents.slice(1, 3);
    const isDesktopShowcase = windowWidth >= 1024;
    const primaryCardHeight = isDesktopShowcase ? 320 : 360;
    const secondaryCardHeight = isDesktopShowcase ? 320 : 280;
    const secondaryMediaRatio = isDesktopShowcase ? 0.58 : 0.66;
    const showcaseCount = showcaseEvents.length;

    if (!primaryEvent) return null;

    const primaryArtwork = getEventArtwork(primaryEvent, 'trending-primary');

    const renderSecondaryCard = (event, index) => {
      return (
        <ShowcaseCompactCard
          key={`${event.event_id || 'event'}-secondary-${index}`}
          event={event}
          cardHeight={secondaryCardHeight}
          mediaRatio={secondaryMediaRatio}
          badgeLabel="Trending"
          badgeIcon="flash"
        />
      );
    };

    return (
      <View style={styles.categorySection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderContent}>
            <View style={[styles.sectionIconContainer, { backgroundColor: iconBgColor }]}>
              <Ionicons name={icon} size={18} color={iconColor} />
            </View>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.categoryTitle}>{title}</Text>
              {subtitle ? <Text style={styles.categorySubtitle}>{subtitle}</Text> : null}
            </View>
          </View>

          <View style={styles.sectionTools}>
            <View style={styles.sectionCountBadge}>
              <Text style={styles.sectionCountText}>{showcaseCount} highlights</Text>
            </View>
          </View>
        </View>

        <View style={[styles.trendingShowcase, isDesktopShowcase && styles.trendingShowcaseDesktop, !isDesktopShowcase && styles.trendingShowcaseStacked]}>
          <View style={styles.trendingShowcasePrimary}>
            <TouchableOpacity
              activeOpacity={0.94}
              style={[
                styles.trendingFeatureCard,
                styles.trendingFeatureCardPrimary,
                isDesktopShowcase && styles.trendingFeatureCardPrimaryTall,
                !isDesktopShowcase && styles.trendingFeatureCardStacked,
                { minHeight: primaryCardHeight }
              ]}
              onPress={() => openTicketPurchase(primaryEvent, undefined, primaryArtwork)}
            >
              <Image
                source={{ uri: primaryArtwork }}
                style={styles.trendingFeatureImage}
                resizeMode="cover"
              />
              <View style={[styles.trendingFeatureOverlay, styles.trendingFeatureOverlayPrimary]} />

              <View style={styles.trendingFeatureContent}>
                <View style={styles.trendingFeatureTopRow}>
                  <View style={styles.trendingFeatureBadge}>
                    <Ionicons name="flash" size={11} color="#fff" />
                    <Text style={styles.trendingFeatureBadgeText}>Trending</Text>
                  </View>
                  <Text style={styles.trendingFeatureDate}>
                    {new Date(primaryEvent.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>

                <View>
                  <Text style={[styles.trendingFeatureTitle, styles.trendingFeatureTitlePrimary]} numberOfLines={2}>
                    {primaryEvent.event_name}
                  </Text>
                  <Text style={styles.trendingFeatureMeta} numberOfLines={1}>{primaryEvent.location}</Text>
                  <Text style={styles.trendingFeatureDescription} numberOfLines={2}>
                    {primaryEvent.event_description || 'High-demand live event with verified tickets available now.'}
                  </Text>
                </View>

                <View style={styles.trendingFeatureFooter}>
                  <View>
                    <Text style={styles.trendingFeaturePriceLabel}>Tickets from</Text>
                    <Text style={styles.trendingFeaturePrice}>R{getMinPrice(primaryEvent)}</Text>
                  </View>
                  <View style={styles.trendingFeatureAction}>
                    <Text style={styles.trendingFeatureActionText}>Book</Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {isDesktopShowcase ? (
            <View style={styles.trendingShowcaseAside}>
              <View style={styles.trendingShowcaseSecondaryRow}>
                {secondaryEvents.map((event, index) => renderSecondaryCard(event, index))}
              </View>
            </View>
          ) : (
            <>
              {secondaryEvents.map((event, index) => renderSecondaryCard(event, index))}
            </>
          )}
        </View>
      </View>
    );
  };

  const AfterDarkShowcaseSection = ({ title, subtitle, icon, iconColor, iconBgColor, events }) => {
    const isDesktopShowcase = windowWidth >= 1024;
    const featureEvent = events[0];
    const compactCardHeight = isDesktopShowcase ? 320 : 280;
    const compactMediaRatio = isDesktopShowcase ? 0.58 : 0.66;
    const sliderEvents = [];
    const sliderIds = new Set();

    [
      ...events.slice(1),
      ...categories.nightlife,
      ...categories.weekend,
      ...categories.all
    ].forEach((event) => {
      if (!event || event.event_id === featureEvent?.event_id || sliderIds.has(event.event_id)) {
        return;
      }

      sliderEvents.push(event);
      sliderIds.add(event.event_id);
    });

    const afterDarkSliderEvents = sliderEvents.length ? sliderEvents : events.filter(Boolean);

    if (!featureEvent) return null;

    return (
      <View style={styles.categorySection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderContent}>
            <View style={[styles.sectionIconContainer, { backgroundColor: iconBgColor }]}>
              <Ionicons name={icon} size={18} color={iconColor} />
            </View>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.categoryTitle}>{title}</Text>
              {subtitle ? <Text style={styles.categorySubtitle}>{subtitle}</Text> : null}
            </View>
          </View>

          <View style={styles.sectionTools}>
            <View style={styles.sectionCountBadge}>
              <Text style={styles.sectionCountText}>{1 + (afterDarkSliderEvents.length ? 1 : 0)} highlights</Text>
            </View>
          </View>
        </View>

        <View style={[styles.afterDarkShowcase, !isDesktopShowcase && styles.afterDarkShowcaseStacked]}>
          <View style={styles.afterDarkFeatureColumn}>
            <ShowcaseCompactCard
              event={featureEvent}
              cardHeight={compactCardHeight}
              mediaRatio={compactMediaRatio}
              badgeLabel="Lifestyle"
              badgeIcon="moon"
            />
          </View>

          <View style={styles.afterDarkSliderColumn}>
            <TrendingSliderCard
              events={afterDarkSliderEvents}
              isDesktop={isDesktopShowcase}
              cardStyle={isDesktopShowcase ? styles.afterDarkSliderCard : styles.afterDarkSliderCardStacked}
              badgeLabel="Lifestyle"
              badgeIcon="moon"
              descriptionFallback="Curated nightlife, dining, lounge, and premium social experiences available now."
            />
          </View>
        </View>
      </View>
    );
  };

  const MusicShowcaseSection = ({ title, subtitle, icon, iconColor, iconBgColor, events }) => {
    const isDesktopShowcase = windowWidth >= 1024;
    const musicShowcaseEvents = [];
    const musicShowcaseIds = new Set();

    [
      ...events,
      ...categories.trending,
      ...categories.thisWeek,
      ...categories.all
    ].forEach((event) => {
      if (!event || musicShowcaseIds.has(event.event_id) || musicShowcaseEvents.length >= 3) {
        return;
      }

      musicShowcaseEvents.push(event);
      musicShowcaseIds.add(event.event_id);
    });

    if (!musicShowcaseEvents.length) return null;

    return (
      <View style={styles.categorySection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderContent}>
            <View style={[styles.sectionIconContainer, { backgroundColor: iconBgColor }]}>
              <Ionicons name={icon} size={18} color={iconColor} />
            </View>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.categoryTitle}>{title}</Text>
              {subtitle ? <Text style={styles.categorySubtitle}>{subtitle}</Text> : null}
            </View>
          </View>

          <View style={styles.sectionTools}>
            <View style={styles.sectionCountBadge}>
              <Text style={styles.sectionCountText}>{musicShowcaseEvents.length} highlights</Text>
            </View>
          </View>
        </View>

        <View style={[styles.musicShowcase, !isDesktopShowcase && styles.musicShowcaseStacked]}>
          {musicShowcaseEvents.map((event, index) => (
            <View key={`${event.event_id || 'event'}-music-${index}`} style={styles.musicShowcaseCard}>
              <EventCard event={event} variant="square" fillWidth />
            </View>
          ))}
        </View>
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
            <Text style={styles.footerLogo}>Ticket-Hub</Text>
            <Text style={styles.footerSlogan}>
              Official tickets for concerts, comedy, nightlife, culture, food experiences, and more.
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
            {['About Us', 'How It Works', 'Gift Cards', 'Contact Us'].map(link => (
              <TouchableOpacity key={link} onPress={() => handleLinkPress(link)}>
                <Text style={styles.footerLink}>{link}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.footerSection}>
            <Text style={styles.footerHeading}>Popular Searches</Text>
            {['Concerts', 'Comedy', 'Food & Drink', 'Arts & Culture'].map(link => (
              <TouchableOpacity key={link} onPress={() => handleLinkPress(link)}>
                <Text style={styles.footerLink}>{link}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.footerSection}>
            <Text style={styles.footerHeading}>Support</Text>
            {['Help Center', 'Terms of Service', 'Privacy Policy', 'Refund Help'].map(link => (
              <TouchableOpacity key={link} onPress={() => handleLinkPress(link)}>
                <Text style={styles.footerLink}>{link}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.footerBottom}>
          <Text style={styles.footerBottomText}>
            Copyright 2025 Ticket-Hub. All rights reserved.
          </Text>
        </View>
      </View>
    );
  };

  const categories = categorizeEvents();
  const hasEvents = categories.all.length > 0;
  const heroSlides = (categories.trending.length ? categories.trending : categories.thisWeek.length ? categories.thisWeek : categories.all).slice(0, 4);
  const topPickSeed = categories.thisWeek.slice(0, Math.min(3, categories.thisWeek.length));
  const topPickIds = new Set(topPickSeed.map((event) => event.event_id));
  const musicFeature = categories.music.find((event) => !topPickIds.has(event.event_id)) || categories.music[0] || null;
  const topPickPriorityPool = [
    ...topPickSeed,
    ...(musicFeature ? [musicFeature] : []),
    ...categories.thisWeek,
    ...categories.music,
    ...categories.trending,
    ...categories.all
  ].filter(Boolean);

  const topPicksUnique = [];
  const topPickUniqueIds = new Set();

  topPickPriorityPool.forEach((event) => {
    if (topPicksUnique.length >= 4 || topPickUniqueIds.has(event.event_id)) {
      return;
    }

    topPicksUnique.push(event);
    topPickUniqueIds.add(event.event_id);
  });

  const topPicksEvents = [...topPicksUnique];

  while (topPicksEvents.length < 4 && musicFeature) {
    topPicksEvents.push(musicFeature);
  }

  const discoverySections = [
    {
      key: 'this-week',
      title: 'Top picks this week',
      subtitle: 'Popular events happening soon and ready to book',
      icon: 'time',
      iconColor: '#4f46e5',
      iconBgColor: '#eef2ff',
      events: topPicksEvents
    },
    {
      key: 'trending',
      title: 'Trending now',
      subtitle: 'What fans are booking right now',
      icon: 'trending-up',
      iconColor: '#dc2626',
      iconBgColor: '#fef2f2',
      events: categories.trending
    },
    {
      key: 'music',
      title: 'Music',
      subtitle: 'Concerts, festivals, jazz sessions, and premium live shows',
      icon: 'musical-notes',
      iconColor: '#be185d',
      iconBgColor: '#fdf2f8',
      events: categories.music
    },
    {
      key: 'budget',
      title: 'Under R50',
      subtitle: 'Affordable tickets and quick plans for every budget',
      icon: 'wallet',
      iconColor: '#0f766e',
      iconBgColor: '#ecfdf5',
      events: categories.budget
    },
    {
      key: 'weekend',
      title: 'Weekend plans',
      subtitle: 'Make the most of your weekend with top local events',
      icon: 'sunny',
      iconColor: '#b45309',
      iconBgColor: '#fffbeb',
      events: categories.weekend
    },
    {
      key: 'workshops',
      title: 'Workshops & expos',
      subtitle: 'Learning, networking, classes, and professional events',
      icon: 'bulb',
      iconColor: '#2563eb',
      iconBgColor: '#eff6ff',
      events: categories.workshops
    },
    {
      key: 'lifestyle',
      title: 'Lifestyle',
      subtitle: 'Nightlife, lounges, social plans, and premium city experiences',
      icon: 'moon',
      iconColor: '#7c3aed',
      iconBgColor: '#f5f3ff',
      events: categories.nightlife
    },
    {
      key: 'food',
      title: 'Food & drink',
      subtitle: 'Markets, tastings, wine nights, and culinary experiences',
      icon: 'restaurant',
      iconColor: '#c2410c',
      iconBgColor: '#fff7ed',
      events: categories.food
    },
    {
      key: 'arts',
      title: 'Arts & comedy',
      subtitle: 'Exhibitions, gallery openings, theatre, and stand-up shows',
      icon: 'color-palette',
      iconColor: '#6d28d9',
      iconBgColor: '#f5f3ff',
      events: categories.arts
    },
  ];

  if (loading) {
    return (
      <View style={styles.fullContainer}>
        <View style={styles.loadingShell}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#0f172a" />
            <Text style={styles.loadingTitle}>Loading live events</Text>
            <Text style={styles.loadingSubtitle}>Pulling in the latest tickets, prices, and popular events.</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fullContainer}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.pageShell}>
          <View style={styles.heroCard}>
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={16} color="#64748b" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search artists, venues, cities or event names"
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
                <Ionicons name="options-outline" size={18} color="#0f172a" />
                <Text style={styles.filterButtonText}>Filter</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipRow}
            >
              {quickFilters.map((filter) => {
                const isActive = activeQuickFilter === filter.id;
                return (
                  <TouchableOpacity
                    key={filter.id}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setActiveQuickFilter(filter.id)}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{filter.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <TicketHeroSlider slides={heroSlides} />

          {!hasEvents ? (
            <View style={styles.noEventsContainer}>
              <View style={styles.noEventsIconBg}>
                <Ionicons name="search-outline" size={46} color="#475569" />
              </View>
              <Text style={styles.noEventsText}>No matching events found</Text>
              <Text style={styles.noEventsSubText}>
                We could not find any events matching your search right now. Try another artist, venue, city, or reset your filters.
              </Text>
              <View style={styles.emptyActionsRow}>
                <TouchableOpacity
                  style={styles.emptyPrimaryButton}
                  onPress={() => {
                    setSearchQuery('');
                    setActiveQuickFilter('all');
                    setSortMode('recommended');
                  }}
                >
                  <Text style={styles.emptyPrimaryButtonText}>Reset search</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.emptySecondaryButton} onPress={() => setFilterModalVisible(true)}>
                  <Text style={styles.emptySecondaryButtonText}>Open filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.sectionsStack}>
              {discoverySections.map((section) => (
                section.key === 'trending' ? (
                  <TrendingShowcaseSection
                    key={section.key}
                    title={section.title}
                    subtitle={section.subtitle}
                    icon={section.icon}
                    iconColor={section.iconColor}
                    iconBgColor={section.iconBgColor}
                    events={section.events}
                  />
                ) : section.key === 'music' ? (
                  <MusicShowcaseSection
                    key={section.key}
                    title={section.title}
                    subtitle={section.subtitle}
                    icon={section.icon}
                    iconColor={section.iconColor}
                    iconBgColor={section.iconBgColor}
                    events={section.events}
                  />
                ) : section.key === 'lifestyle' ? (
                  <AfterDarkShowcaseSection
                    key={section.key}
                    title={section.title}
                    subtitle={section.subtitle}
                    icon={section.icon}
                    iconColor={section.iconColor}
                    iconBgColor={section.iconBgColor}
                    events={section.events}
                  />
                ) : (
                  <CarouselSection
                    key={section.key}
                    title={section.title}
                    subtitle={section.subtitle}
                    icon={section.icon}
                    iconColor={section.iconColor}
                    iconBgColor={section.iconBgColor}
                    events={section.events}
                    cardVariant={section.key === 'this-week' ? 'square' : 'default'}
                    compact={section.key === 'this-week'}
                  />
                )
              ))}
            </View>
          )}

          <View style={styles.footerWrapper}>
            <Footer />
          </View>
        </View>
      </ScrollView>
      
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
              <View>
                <Text style={styles.modalTitle}>Filters & sort</Text>
                <Text style={styles.modalSubtitle}>Choose the kinds of events you want to see and how results should be ordered.</Text>
              </View>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalSectionLabel}>Browse by</Text>
              <View style={styles.modalChipGrid}>
                {quickFilters.map((filter) => {
                  const isActive = activeQuickFilter === filter.id;
                  return (
                    <TouchableOpacity
                      key={filter.id}
                      style={[styles.modalChip, isActive && styles.modalChipActive]}
                      onPress={() => setActiveQuickFilter(filter.id)}
                    >
                      <Text style={[styles.modalChipText, isActive && styles.modalChipTextActive]}>{filter.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.modalSectionLabel}>Sort results</Text>
              <View style={styles.sortOptionStack}>
                {sortOptions.map((option) => {
                  const isActive = sortMode === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[styles.sortOption, isActive && styles.sortOptionActive]}
                      onPress={() => setSortMode(option.id)}
                    >
                      <View>
                        <Text style={[styles.sortOptionTitle, isActive && styles.sortOptionTitleActive]}>{option.label}</Text>
                        <Text style={styles.sortOptionHelper}>
                          {option.id === 'recommended' && 'Best mix of popularity and upcoming dates'}
                          {option.id === 'date' && 'Show the next events first'}
                          {option.id === 'demand' && 'See the hottest tickets first'}
                          {option.id === 'price-low' && 'Start with the lowest ticket prices'}
                          {option.id === 'price-high' && 'Start with premium-priced events'}
                        </Text>
                      </View>
                      {isActive ? <Ionicons name="checkmark-circle" size={20} color="#0f766e" /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => {
                    setActiveQuickFilter('all');
                    setSortMode('recommended');
                  }}
                >
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyButton} onPress={() => setFilterModalVisible(false)}>
                  <Text style={styles.applyButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: '#f3f6f8',
  },
  loadingShell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    boxShadow: '0 24px 60px rgba(15,23,42,0.08)',
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  loadingSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#64748b',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  pageShell: {
    width: '100%',
    maxWidth: 1440,
    alignSelf: 'center',
    paddingHorizontal: width >= 1024 ? 28 : 16,
    paddingBottom: 36,
  },
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 30,
    padding: width >= 768 ? 22 : 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    boxShadow: '0 28px 70px rgba(15,23,42,0.24)',
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: width >= 960 ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: width >= 960 ? 'stretch' : 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  heroCopy: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: width >= 768 ? 30 : 25,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#cbd5e1',
    maxWidth: 700,
  },
  heroStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  heroSpotlightCard: {
    width: width >= 960 ? 300 : '100%',
    borderRadius: 24,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'space-between',
  },
  heroSpotlightEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fbbf24',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroSpotlightTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  heroSpotlightMeta: {
    fontSize: 12,
    lineHeight: 18,
    color: '#cbd5e1',
    marginBottom: 4,
  },
  heroSpotlightAction: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ef4444',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroSpotlightActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 10,
  },
  searchInputContainer: {
    flex: 4,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe3ea',
    paddingHorizontal: 14,
    minHeight: 50,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    outlineWidth: 0,
    outlineStyle: 'solid',
    outlineColor: 'transparent',
  },
  clearButton: {
    marginLeft: 8,
  },
  filterButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  filterButtonText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipRow: {
    gap: 8,
    paddingBottom: 0,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3ea',
  },
  filterChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  ticketSliderSection: {
    marginBottom: 18,
  },
  ticketSlide: {
    position: 'relative',
    minHeight: width >= 768 ? 360 : 320,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d8e1e8',
    backgroundColor: '#0f172a',
    boxShadow: '0 20px 44px rgba(15,23,42,0.14)',
  },
  ticketSlideImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  ticketSlideOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.42)',
  },
  ticketSlideContent: {
    flex: 1,
    justifyContent: 'space-between',
    padding: width >= 768 ? 28 : 20,
  },
  ticketSlideHeader: {
    flexDirection: width >= 768 ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: width >= 768 ? 'center' : 'flex-start',
    gap: 10,
  },
  ticketSlideBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  ticketSlideBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  ticketSlideDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  ticketSlideTitle: {
    marginTop: 18,
    fontSize: width >= 768 ? 34 : 26,
    lineHeight: width >= 768 ? 42 : 32,
    fontWeight: '700',
    color: '#fff',
    maxWidth: 640,
  },
  ticketSlideMeta: {
    marginTop: 10,
    fontSize: 14,
    color: '#dbe3ea',
  },
  ticketSlideDescription: {
    marginTop: 8,
    maxWidth: 680,
    fontSize: 14,
    lineHeight: 22,
    color: '#cbd5e1',
  },
  ticketOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 22,
  },
  ticketOptionCard: {
    minWidth: width >= 768 ? 120 : 108,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  ticketOptionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  ticketOptionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  ticketSlideFooter: {
    marginTop: 26,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  ticketSlideFooterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  ticketSlideFooterValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  ticketSlideBuyButton: {
    backgroundColor: '#ef4444',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketSlideBuyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  ticketSliderDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  ticketSliderDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
  },
  ticketSliderDotActive: {
    width: 22,
    backgroundColor: '#0f172a',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 18,
  },
  metricCard: {
    width: width >= 1200 ? '24%' : width >= 768 ? '48.5%' : '100%',
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    boxShadow: '0 16px 38px rgba(15,23,42,0.05)',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  metricHelper: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
  },
  sectionsStack: {
    gap: 18,
  },
  categorySection: {
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    boxShadow: '0 18px 44px rgba(15,23,42,0.05)',
  },
  categorySectionCompact: {
    paddingVertical: 14,
  },
  sectionHeader: {
    flexDirection: width >= 768 ? 'row' : 'column',
    alignItems: width >= 768 ? 'center' : 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 14,
    marginBottom: 16,
  },
  sectionHeaderCompact: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitleBlock: {
    flex: 1,
  },
  sectionIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  categorySubtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
  },
  sectionTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionCountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  horizontalScroll: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    gap: 14,
  },
  horizontalScrollCompact: {
    paddingHorizontal: 16,
    paddingVertical: 0,
    gap: 12,
  },
  topPicksGrid: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 10,
  },
  topPicksGridWrapped: {
    flexWrap: 'wrap',
  },
  topPicksGridItem: {
    minWidth: 0,
  },
  trendingShowcase: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    alignItems: 'stretch',
  },
  trendingShowcaseDesktop: {
    minHeight: 320,
  },
  trendingShowcaseStacked: {
    flexDirection: 'column',
  },
  trendingShowcasePrimary: {
    flex: 0.75,
  },
  trendingShowcaseAside: {
    flex: 1.55,
    minWidth: 0,
  },
  trendingShowcaseSecondaryRow: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
    alignItems: 'stretch',
  },
  trendingFeatureCard: {
    position: 'relative',
    minHeight: 320,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dbe3ea',
    backgroundColor: '#0f172a',
    boxShadow: '0 18px 40px rgba(15,23,42,0.12)',
  },
  trendingFeatureCardPrimary: {
    flex: 1,
  },
  trendingFeatureCardPrimaryTall: {
    minHeight: 320,
  },
  trendingFeatureCardSecondary: {
    flex: 1,
    minHeight: 0,
  },
  trendingFeatureCardStacked: {
    minHeight: 260,
  },
  trendingFeatureImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  trendingFeatureImageSecondary: {
    width: '100%',
    height: '100%',
  },
  trendingFeatureOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.42)',
  },
  trendingFeatureOverlayPrimary: {
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  trendingFeatureOverlaySecondary: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.18)',
  },
  trendingFeatureContent: {
    ...StyleSheet.absoluteFillObject,
    padding: 18,
    justifyContent: 'space-between',
  },
  trendingFeatureMediaSecondary: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
  },
  trendingFeatureTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  trendingFeatureTopRowSecondary: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  trendingFeatureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  trendingFeatureBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  trendingFeatureDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  trendingFeatureTitle: {
    marginTop: 12,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
    color: '#fff',
  },
  trendingFeatureTitlePrimary: {
    fontSize: 28,
    lineHeight: 34,
  },
  trendingFeatureMeta: {
    marginTop: 8,
    fontSize: 13,
    color: '#e2e8f0',
  },
  trendingFeatureDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: '#cbd5e1',
    maxWidth: 520,
  },
  trendingFeatureBodySecondary: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#fff',
  },
  trendingFeatureBodySecondaryTop: {
    minWidth: 0,
    flexShrink: 1,
  },
  trendingFeatureTitleSecondary: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  trendingFeatureMetaSecondary: {
    marginTop: 4,
    fontSize: 11,
    color: '#64748b',
  },
  trendingFeatureFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  trendingFeatureFooterSecondary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  trendingFeaturePriceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  trendingFeaturePrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  trendingFeaturePriceLabelSecondary: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  trendingFeaturePriceSecondary: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  trendingFeatureAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  trendingFeatureActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  trendingFeatureActionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3ea',
  },
  trendingFeatureActionTextSecondary: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  trendingSliderCard: {
    position: 'relative',
    minHeight: 204,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dbe3ea',
    backgroundColor: '#0f172a',
    boxShadow: '0 18px 40px rgba(15,23,42,0.12)',
  },
  trendingSliderCardStacked: {
    minHeight: 240,
  },
  trendingSliderImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  trendingSliderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.48)',
  },
  trendingSliderContent: {
    ...StyleSheet.absoluteFillObject,
    padding: 16,
    justifyContent: 'space-between',
  },
  trendingSliderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  trendingSliderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  trendingSliderBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  trendingSliderNav: {
    flexDirection: 'row',
    gap: 8,
  },
  trendingSliderNavButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  trendingSliderBody: {
    gap: 6,
  },
  trendingSliderMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  trendingSliderDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  trendingSliderCounter: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  trendingSliderTitle: {
    marginTop: 2,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '700',
    color: '#fff',
  },
  trendingSliderMeta: {
    fontSize: 13,
    color: '#e2e8f0',
  },
  trendingSliderDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#cbd5e1',
    maxWidth: 420,
  },
  trendingSliderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  trendingSliderPriceLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  trendingSliderPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  trendingSliderAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  trendingSliderActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  musicShowcase: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },
  musicShowcaseStacked: {
    flexDirection: 'column',
  },
  musicShowcaseCard: {
    flex: 1,
    minWidth: 0,
  },
  afterDarkShowcase: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    alignItems: 'stretch',
  },
  afterDarkShowcaseStacked: {
    flexDirection: 'column',
  },
  afterDarkFeatureColumn: {
    flex: 0.78,
    minWidth: 0,
  },
  afterDarkSliderColumn: {
    flex: 1.52,
    minWidth: 0,
  },
  afterDarkSliderCard: {
    minHeight: 320,
  },
  afterDarkSliderCardStacked: {
    minHeight: 280,
  },
  carouselControls: {
    flexDirection: 'row',
    gap: 8,
  },
  carouselButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  carouselButtonDisabled: {
    opacity: 0.45,
  },
  eventCard: {
    width: width >= 1200 ? 320 : 288,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    boxShadow: '0 16px 40px rgba(15,23,42,0.08)',
    overflow: 'hidden',
  },
  eventCardFillWidth: {
    width: '100%',
  },
  eventCardSquare: {
    width: width >= 1200 ? 286 : 258,
    minHeight: 300,
    borderRadius: 10,
  },
  eventCardTrending: {
    width: width >= 1200 ? 350 : 316,
    borderRadius: 24,
    borderColor: '#fed7aa',
    boxShadow: '0 18px 44px rgba(249,115,22,0.16)',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 188,
    backgroundColor: '#dbe3ea',
  },
  imageContainerSquare: {
    height: 150,
  },
  imageContainerTrending: {
    height: 214,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.14)',
  },
  imageOverlayTrending: {
    backgroundColor: 'rgba(124,45,18,0.2)',
  },
  trendingSignalBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  trendingSignalText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#fff',
  },
  hotTag: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
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
  cardPriceBadge: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: 'flex-end',
  },
  cardPriceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  cardPriceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  eventInfo: {
    padding: 16,
  },
  eventInfoSquare: {
    minHeight: 150,
    padding: 12,
    justifyContent: 'space-between',
  },
  eventInfoTrending: {
    backgroundColor: '#fff7ed',
    padding: 18,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  eventCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4f46e5',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  eventCategoryTrending: {
    color: '#c2410c',
  },
  eventDateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  eventDateBadgeTrending: {
    backgroundColor: '#fff',
    borderColor: '#fdba74',
  },
  eventDateBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  demandBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  demandBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  eventName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 24,
    marginBottom: 6,
  },
  eventNameTrending: {
    fontSize: 20,
    lineHeight: 26,
  },
  eventDescription: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 12,
  },
  eventDescriptionTrending: {
    color: '#7c2d12',
  },
  cardMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  metaText: {
    marginLeft: 6,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
  },
  capacityTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
    marginBottom: 14,
  },
  capacityFill: {
    height: '100%',
    borderRadius: 999,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardFooterRowTrending: {
    paddingTop: 4,
  },
  capacityLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  capacityValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  capacityLabelTrending: {
    color: '#9a3412',
  },
  capacityValueTrending: {
    color: '#7c2d12',
  },
  cardActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#0f172a',
  },
  cardActionPillTrending: {
    backgroundColor: '#fed7aa',
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  cardActionTextTrending: {
    color: '#7c2d12',
  },
  noEventsContainer: {
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    boxShadow: '0 16px 44px rgba(15,23,42,0.05)',
  },
  noEventsIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  noEventsText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  noEventsSubText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 560,
  },
  emptyActionsRow: {
    flexDirection: width >= 768 ? 'row' : 'column',
    gap: 12,
    marginTop: 22,
  },
  emptyPrimaryButton: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  emptyPrimaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptySecondaryButton: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#dbe3ea',
  },
  emptySecondaryButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  footerWrapper: {
    marginTop: 18,
  },
  footer: {
    backgroundColor: '#0f172a',
    paddingTop: 40,
    paddingBottom: 22,
    borderRadius: 28,
    overflow: 'hidden',
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    maxWidth: 1280,
    marginHorizontal: 'auto',
    width: '100%',
    gap: 24,
  },
  footerContentMobile: {
    flexDirection: 'column',
    paddingHorizontal: 22,
  },
  footerSection: {
    flex: 1,
    minWidth: 160,
  },
  footerLogo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  footerSlogan: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 22,
    marginBottom: 18,
  },
  socialIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  socialIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 14,
  },
  footerLink: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 10,
  },
  footerBottom: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    marginTop: 28,
    paddingTop: 18,
    alignItems: 'center',
  },
  footerBottomText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748b',
    maxWidth: 420,
  },
  modalBody: {
    paddingBottom: 16,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  modalChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  modalChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3ea',
  },
  modalChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  modalChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  modalChipTextActive: {
    color: '#fff',
  },
  sortOptionStack: {
    gap: 10,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3ea',
    gap: 12,
  },
  sortOptionActive: {
    borderColor: '#0f766e',
    backgroundColor: '#ecfdf5',
  },
  sortOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 3,
  },
  sortOptionTitleActive: {
    color: '#0f766e',
  },
  sortOptionHelper: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  modalActionsRow: {
    flexDirection: width >= 768 ? 'row' : 'column',
    gap: 12,
    marginTop: 24,
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe3ea',
    paddingVertical: 14,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default SearchEventsScreen;
