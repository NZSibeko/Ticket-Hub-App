import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
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
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');
const API_URL = 'http://localhost:3000';

// Enhanced mock data with more diverse events and proper images
const mockEvents = [
  {
    event_id: '1',
    event_name: 'Summer Music Festival',
    event_description: 'An amazing outdoor music festival with top artists',
    location: 'Central Park, New York',
    start_date: '2024-12-25T18:00:00Z',
    end_date: '2024-12-25T23:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 150,
    max_attendees: 500,
    image_url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
    price: 75,
    ticket_types: [
      { type: 'general', price: 75, available: 350 },
      { type: 'vip', price: 150, available: 50 }
    ]
  },
  {
    event_id: '5',
    event_name: 'Jazz Night Under the Stars',
    event_description: 'An intimate evening of smooth jazz with renowned artists',
    location: 'Riverside Amphitheater',
    start_date: '2024-11-08T19:30:00Z',
    end_date: '2024-11-08T23:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 180,
    max_attendees: 300,
    image_url: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80',
    price: 65,
    ticket_types: [
      { type: 'general', price: 65, available: 120 },
      { type: 'vip', price: 120, available: 20 }
    ]
  },
  {
    event_id: '6',
    event_name: 'Rock Revival Concert',
    event_description: 'Classic rock bands performing greatest hits',
    location: 'Madison Square Arena',
    start_date: '2024-11-20T20:00:00Z',
    end_date: '2024-11-21T00:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 850,
    max_attendees: 1200,
    image_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80',
    price: 95,
    ticket_types: [
      { type: 'general', price: 95, available: 350 },
      { type: 'vip', price: 180, available: 80 }
    ]
  },
  {
    event_id: '7',
    event_name: 'Electronic Music Festival',
    event_description: 'World-class DJs and electronic music experience',
    location: 'Downtown Convention Center',
    start_date: '2024-12-15T21:00:00Z',
    end_date: '2024-12-16T04:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 920,
    max_attendees: 1500,
    image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
    price: 110,
    ticket_types: [
      { type: 'early_bird', price: 85, available: 200 },
      { type: 'general', price: 110, available: 580 },
      { type: 'vip', price: 220, available: 100 }
    ]
  },
  {
    event_id: '8',
    event_name: 'Country Music Showcase',
    event_description: 'Celebrate country music with top Nashville artists',
    location: 'Grand Ole Arena',
    start_date: '2024-11-12T18:00:00Z',
    end_date: '2024-11-12T22:30:00Z',
    event_status: 'VALIDATED',
    current_attendees: 340,
    max_attendees: 600,
    image_url: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&q=80',
    price: 70,
    ticket_types: [
      { type: 'general', price: 70, available: 260 },
      { type: 'vip', price: 135, available: 45 }
    ]
  },
  {
    event_id: '18',
    event_name: 'Indie Rock Festival',
    event_description: 'Discover emerging indie rock bands and artists',
    location: 'Underground Music Hall',
    start_date: '2024-10-29T19:00:00Z',
    end_date: '2024-10-29T23:30:00Z',
    event_status: 'VALIDATED',
    current_attendees: 210,
    max_attendees: 400,
    image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
    price: 55,
    ticket_types: [
      { type: 'general', price: 55, available: 190 },
      { type: 'vip', price: 95, available: 30 }
    ]
  },
  {
    event_id: '19',
    event_name: 'Classical Symphony Night',
    event_description: 'Experience the beauty of classical music performed by a world-class orchestra',
    location: 'Concert Hall Philharmonic',
    start_date: '2024-11-22T20:00:00Z',
    end_date: '2024-11-22T22:30:00Z',
    event_status: 'VALIDATED',
    current_attendees: 280,
    max_attendees: 500,
    image_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&q=80',
    price: 80,
    ticket_types: [
      { type: 'general', price: 80, available: 220 },
      { type: 'vip', price: 150, available: 40 }
    ]
  },
  {
    event_id: '20',
    event_name: 'Hip Hop Block Party',
    event_description: 'Urban beats and street culture celebration with top hip hop artists',
    location: 'Downtown Plaza',
    start_date: '2024-12-08T17:00:00Z',
    end_date: '2024-12-08T23:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 680,
    max_attendees: 1000,
    image_url: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80',
    price: 60,
    ticket_types: [
      { type: 'general', price: 60, available: 320 },
      { type: 'vip', price: 110, available: 50 }
    ]
  },
  {
    event_id: '21',
    event_name: 'Latin Salsa Night',
    event_description: 'Dance the night away with live Latin music and salsa rhythms',
    location: 'Tropical Dance Hall',
    start_date: '2024-11-16T21:00:00Z',
    end_date: '2024-11-17T02:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 195,
    max_attendees: 350,
    image_url: 'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800&q=80',
    price: 48,
    ticket_types: [
      { type: 'general', price: 48, available: 155 },
      { type: 'vip', price: 85, available: 25 }
    ]
  },
  {
    event_id: '22',
    event_name: 'Blues & Soul Evening',
    event_description: 'Soulful performances featuring legendary blues artists',
    location: 'Riverside Blues Club',
    start_date: '2024-11-25T19:30:00Z',
    end_date: '2024-11-25T23:30:00Z',
    event_status: 'VALIDATED',
    current_attendees: 145,
    max_attendees: 250,
    image_url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&q=80',
    price: 58,
    ticket_types: [
      { type: 'general', price: 58, available: 105 },
      { type: 'vip', price: 100, available: 20 }
    ]
  },
  {
    event_id: '23',
    event_name: 'Pop Music Awards Show',
    event_description: 'Annual awards celebrating the best in pop music with live performances',
    location: 'Metro Arena',
    start_date: '2024-12-20T19:00:00Z',
    end_date: '2024-12-20T23:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 1450,
    max_attendees: 2500,
    image_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80',
    price: 135,
    ticket_types: [
      { type: 'general', price: 135, available: 1050 },
      { type: 'vip', price: 280, available: 150 }
    ]
  },
  {
    event_id: '3',
    event_name: 'Food & Wine Expo',
    event_description: 'Experience the finest foods and wines from around the world',
    location: 'Downtown Convention Center',
    start_date: '2024-10-20T11:00:00Z',
    end_date: '2024-10-22T20:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 280,
    max_attendees: 800,
    image_url: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80',
    price: 89,
    ticket_types: [
      { type: 'general', price: 89, available: 520 },
      { type: 'vip', price: 189, available: 80 }
    ]
  },
  {
    event_id: '16',
    event_name: 'Craft Beer Festival',
    event_description: 'Sample craft beers from local and international breweries',
    location: 'Riverside Park',
    start_date: '2024-11-09T12:00:00Z',
    end_date: '2024-11-09T20:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 420,
    max_attendees: 700,
    image_url: 'https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=800&q=80',
    price: 55,
    ticket_types: [
      { type: 'general', price: 55, available: 280 },
      { type: 'vip', price: 95, available: 60 }
    ]
  },
  {
    event_id: '9',
    event_name: 'International Food Fair',
    event_description: 'Taste culinary delights from around the world',
    location: 'City Market Square',
    start_date: '2024-11-15T10:00:00Z',
    end_date: '2024-11-17T18:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 320,
    max_attendees: 600,
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
    price: 35,
    ticket_types: [
      { type: 'general', price: 35, available: 280 },
      { type: 'vip', price: 75, available: 40 }
    ]
  },
  {
    event_id: '10',
    event_name: 'Wine Tasting Gala',
    event_description: 'Premium wine tasting with sommelier guidance',
    location: 'Vineyard Estate',
    start_date: '2024-12-05T18:00:00Z',
    end_date: '2024-12-05T22:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 95,
    max_attendees: 150,
    image_url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&q=80',
    price: 120,
    ticket_types: [
      { type: 'general', price: 120, available: 55 },
      { type: 'vip', price: 200, available: 15 }
    ]
  },
  {
    event_id: '11',
    event_name: 'Street Food Festival',
    event_description: 'The best street food vendors in one location',
    location: 'Downtown Food Court',
    start_date: '2024-10-27T11:00:00Z',
    end_date: '2024-10-27T21:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 380,
    max_attendees: 600,
    image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
    price: 25,
    ticket_types: [
      { type: 'general', price: 25, available: 220 },
      { type: 'vip', price: 50, available: 40 }
    ]
  },
  {
    event_id: '12',
    event_name: 'Cocktail Mixology Workshop',
    event_description: 'Learn to craft premium cocktails with expert mixologists',
    location: 'Metro Bar & Lounge',
    start_date: '2024-11-18T19:00:00Z',
    end_date: '2024-11-18T22:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 45,
    max_attendees: 60,
    image_url: 'https://images.unsplash.com/photo-1605270012917-bf157c5a9541?w=800&q=80',
    price: 85,
    ticket_types: [
      { type: 'general', price: 85, available: 15 }
    ]
  },
  {
    event_id: '13',
    event_name: 'Chocolate & Dessert Expo',
    event_description: 'Indulge in the finest chocolates and desserts from master pastry chefs',
    location: 'Grand Convention Hall',
    start_date: '2024-11-25T10:00:00Z',
    end_date: '2024-11-25T18:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 220,
    max_attendees: 400,
    image_url: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80',
    price: 45,
    ticket_types: [
      { type: 'general', price: 45, available: 180 },
      { type: 'vip', price: 85, available: 30 }
    ]
  },
  {
    event_id: '14',
    event_name: 'Farmers Market Festival',
    event_description: 'Fresh local produce, artisanal foods and live cooking demonstrations',
    location: 'Community Park',
    start_date: '2024-11-02T09:00:00Z',
    end_date: '2024-11-02T16:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 180,
    max_attendees: 500,
    image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
    price: 15,
    ticket_types: [
      { type: 'general', price: 15, available: 320 }
    ]
  },
  {
    event_id: '2',
    event_name: 'Tech Conference 2024',
    event_description: 'Annual technology and innovation conference',
    location: 'Convention Center, San Francisco',
    start_date: '2024-11-15T09:00:00Z',
    end_date: '2024-11-17T18:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 320,
    max_attendees: 1000,
    image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    price: 199,
    ticket_types: [
      { type: 'early_bird', price: 149, available: 100 },
      { type: 'general', price: 199, available: 580 },
      { type: 'vip', price: 399, available: 100 }
    ]
  },
  {
    event_id: '15',
    event_name: 'Startup Pitch Competition',
    event_description: 'Watch innovative startups pitch to investors',
    location: 'Innovation Hub',
    start_date: '2024-10-30T10:00:00Z',
    end_date: '2024-10-30T18:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 150,
    max_attendees: 250,
    image_url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80',
    price: 25,
    ticket_types: [
      { type: 'general', price: 25, available: 100 }
    ]
  },
  {
    event_id: '4',
    event_name: 'Art Exhibition Opening',
    event_description: 'Contemporary art exhibition featuring local artists',
    location: 'Modern Art Museum',
    start_date: '2024-11-05T18:00:00Z',
    end_date: '2024-11-05T22:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 75,
    max_attendees: 200,
    image_url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80',
    price: 45,
    ticket_types: [
      { type: 'general', price: 45, available: 125 },
      { type: 'vip', price: 85, available: 30 }
    ]
  },
  {
    event_id: '17',
    event_name: 'Broadway Musical Performance',
    event_description: 'Award-winning musical comes to town',
    location: 'State Theatre',
    start_date: '2024-12-05T19:30:00Z',
    end_date: '2024-12-05T22:30:00Z',
    event_status: 'VALIDATED',
    current_attendees: 450,
    max_attendees: 800,
    image_url: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80',
    price: 89,
    ticket_types: [
      { type: 'general', price: 89, available: 350 },
      { type: 'vip', price: 165, available: 75 }
    ]
  },
  {
    event_id: '24',
    event_name: 'Stand-Up Comedy Night',
    event_description: 'Top comedians performing their best material',
    location: 'Comedy Club Downtown',
    start_date: '2024-10-25T20:00:00Z',
    end_date: '2024-10-25T23:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 95,
    max_attendees: 150,
    image_url: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80',
    price: 35,
    ticket_types: [
      { type: 'general', price: 35, available: 55 },
      { type: 'vip', price: 65, available: 15 }
    ]
  },
  {
    event_id: '25',
    event_name: 'Comedy Festival Extravaganza',
    event_description: 'Full day of comedy with multiple performers',
    location: 'Grand Theater',
    start_date: '2024-11-18T14:00:00Z',
    end_date: '2024-11-18T22:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 380,
    max_attendees: 600,
    image_url: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=80',
    price: 55,
    ticket_types: [
      { type: 'general', price: 55, available: 220 },
      { type: 'vip', price: 95, available: 40 }
    ]
  },
  {
    event_id: '26',
    event_name: 'Family Fun Fair',
    event_description: 'Entertainment for the whole family with rides and activities',
    location: 'City Park Fairgrounds',
    start_date: '2024-10-27T10:00:00Z',
    end_date: '2024-10-27T18:00:00Z',
    event_status: 'VALIDATED',
    current_attendees: 640,
    max_attendees: 1200,
    image_url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80',
    price: 30,
    ticket_types: [
      { type: 'general', price: 30, available: 560 },
      { type: 'family_group', price: 100, available: 120 }
    ]
  },
];

// Image pool for different event types
const eventImages = {
  music: [
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
    'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80',
    'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80',
    'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80',
    'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80',
    'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80',
  ],
  food: [
    'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80',
    'https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=800&q=80',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
    'https://images.unsplash.com/photo-1474722883778-792e799030e3?w=800&q=80',
    'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&q=80',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
    'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80',
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
  ],
  sports: [
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
    'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&q=80',
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
  ],
  arts: [
    'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80',
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80',
    'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80',
  ],
  comedy: [
    'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&q=80',
    'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=80',
  ],
  general: [
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80',
    'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=800&q=80',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
  ]
};

const SearchEventsScreen = ({ navigation, route }) => {
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    location: '',
    sortBy: 'date'
  });
  const [apiError, setApiError] = useState(false);
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const { getAuthHeader, hasAdminPrivileges } = useAuth();

  // Rest of the component code...

  // Set header options based on user role
  React.useLayoutEffect(() => {
    if (hasAdminPrivileges()) {
      navigation.setOptions({
        headerShown: true,
        headerTitle: "Browse Events",
        headerLeft: () => (
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={{ paddingHorizontal: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        ),
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      });
    } else {
      navigation.setOptions({
        headerShown: false, // Keep original tab behavior for customers
      });
    }
  }, [navigation, hasAdminPrivileges]);

  // Reset screen state when navigating back
  useFocusEffect(
    useCallback(() => {
      console.log('SearchEventsScreen focused - forcing re-render');
      setIsScreenFocused(true);
      setWindowWidth(Dimensions.get('window').width);
      
      return () => {
        console.log('SearchEventsScreen unfocused');
        setIsScreenFocused(false);
      };
    }, [])
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, []);

  const getEventImage = (event, index) => {
    if (event.image_url) return event.image_url;
    if (event.event_image) return event.event_image;

    const eventName = event.event_name.toLowerCase();
    const description = (event.event_description || '').toLowerCase();

    if (eventName.includes('concert') || eventName.includes('music') || description.includes('music')) {
      return eventImages.music[index % eventImages.music.length];
    } else if (eventName.includes('food') || eventName.includes('wine') || eventName.includes('beer') || eventName.includes('culinary') || eventName.includes('chocolate') || eventName.includes('dessert') || eventName.includes('farmers') || eventName.includes('cocktail')) {
      return eventImages.food[index % eventImages.food.length];
    } else if (eventName.includes('sport') || eventName.includes('game') || eventName.includes('match')) {
      return eventImages.sports[index % eventImages.sports.length];
    } else if (eventName.includes('art') || eventName.includes('exhibition') || eventName.includes('theatre')) {
      return eventImages.arts[index % eventImages.arts.length];
    } else if (eventName.includes('comedy')) {
      return eventImages.comedy[index % eventImages.comedy.length];
    } else {
      return eventImages.general[index % eventImages.general.length];
    }
  };

  // Add this at the top of SearchEventsScreen component, after the state declarations:

  // Listen for refresh from route params
  useEffect(() => {
    if (route.params?.refresh) {
      console.log('🔄 Refresh requested in SearchEventsScreen');
      fetchEvents();
      // Clear the refresh param
      navigation.setParams({ refresh: undefined });
    }
  }, [route.params?.refresh]);

  // Also refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('SearchEventsScreen focused - checking for updates');
      fetchEvents();
      
      return () => {
        console.log('SearchEventsScreen unfocused');
        setIsScreenFocused(false);
      };
    }, [])
  );

  const fetchEvents = async () => {
    try {
      setApiError(false);
      
      // Try to fetch real events from API first
      try {
        const response = await fetch(`${API_URL}/zi_events`);
        if (response.ok) {
          const data = await response.json();
          if (data.d && data.d.results) {
            console.log('✅ Loaded real events from API:', data.d.results.length);
            setAllEvents(data.d.results);
            return;
          }
        }
      } catch (apiError) {
        console.log('⚠️ Using mock data, API not available:', apiError.message);
      }
      
      // Fallback to mock data
      setAllEvents(mockEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      setApiError(true);
      setAllEvents(mockEvents);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (events) => {
    let filtered = [...events];

    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.minPrice) {
      filtered = filtered.filter(event => {
        const minTicketPrice = Math.min(...event.ticket_types.map(t => t.price));
        return minTicketPrice >= parseFloat(filters.minPrice);
      });
    }
    if (filters.maxPrice) {
      filtered = filtered.filter(event => {
        const maxTicketPrice = Math.max(...event.ticket_types.map(t => t.price));
        return maxTicketPrice <= parseFloat(filters.maxPrice);
      });
    }

    if (filters.location) {
      filtered = filtered.filter(event =>
        event.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    switch (filters.sortBy) {
      case 'date':
        filtered.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        break;
      case 'price':
        filtered.sort((a, b) => {
          const aMinPrice = Math.min(...a.ticket_types.map(t => t.price));
          const bMinPrice = Math.min(...b.ticket_types.map(t => t.price));
          return aMinPrice - bMinPrice;
        });
        break;
      case 'name':
        filtered.sort((a, b) => a.event_name.localeCompare(b.event_name));
        break;
    }

    return filtered;
  };

  const clearFilters = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      location: '',
      sortBy: 'date'
    });
    setSearchQuery('');
  };

  const categorizeEvents = () => {
    const filteredEvents = applyFilters(allEvents);
    const demoDate = new Date('2024-10-25');
    
    return {
      thisWeek: filteredEvents.filter(e => {
        const eventDate = new Date(e.start_date);
        const weekFromNow = new Date(demoDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        return eventDate >= demoDate && eventDate <= weekFromNow;
      }).slice(0, 20),
      
      trending: [...filteredEvents]
        .sort((a, b) => (b.current_attendees / b.max_attendees) - (a.current_attendees / a.max_attendees))
        .slice(0, 20),
      
      music: filteredEvents.filter(e => 
        e.event_name.toLowerCase().includes('concert') ||
        e.event_name.toLowerCase().includes('music') ||
        e.event_name.toLowerCase().includes('festival') ||
        e.event_name.toLowerCase().includes('jazz') ||
        e.event_name.toLowerCase().includes('rock') ||
        e.event_name.toLowerCase().includes('electronic') ||
        e.event_name.toLowerCase().includes('country') ||
        e.event_name.toLowerCase().includes('hip hop') ||
        e.event_name.toLowerCase().includes('salsa') ||
        e.event_name.toLowerCase().includes('blues') ||
        e.event_name.toLowerCase().includes('soul') ||
        e.event_name.toLowerCase().includes('pop') ||
        e.event_name.toLowerCase().includes('classical') ||
        e.event_name.toLowerCase().includes('indie') ||
        e.event_name.toLowerCase().includes('awards') ||
        e.event_description?.toLowerCase().includes('music')
      ),
      
      food: filteredEvents.filter(e => 
        e.event_name.toLowerCase().includes('food') ||
        e.event_name.toLowerCase().includes('wine') ||
        e.event_name.toLowerCase().includes('beer') ||
        e.event_name.toLowerCase().includes('culinary') ||
        e.event_name.toLowerCase().includes('craft beer') ||
        e.event_name.toLowerCase().includes('expo') ||
        e.event_name.toLowerCase().includes('tasting') ||
        e.event_name.toLowerCase().includes('cocktail') ||
        e.event_name.toLowerCase().includes('mixology') ||
        e.event_name.toLowerCase().includes('chocolate') ||
        e.event_name.toLowerCase().includes('dessert') ||
        e.event_name.toLowerCase().includes('farmers') ||
        e.event_name.toLowerCase().includes('market') ||
        e.event_description?.toLowerCase().includes('food') ||
        e.event_description?.toLowerCase().includes('wine') ||
        e.event_description?.toLowerCase().includes('beer') ||
        e.event_description?.toLowerCase().includes('culinary')
      ),
      
      sports: filteredEvents.filter(e => 
        e.event_name.toLowerCase().includes('sport') ||
        e.event_name.toLowerCase().includes('game') ||
        e.event_name.toLowerCase().includes('match') ||
        e.event_name.toLowerCase().includes('race') ||
        e.event_name.toLowerCase().includes('basketball') ||
        e.event_name.toLowerCase().includes('marathon') ||
        e.event_name.toLowerCase().includes('soccer') ||
        e.event_name.toLowerCase().includes('championship')
      ).slice(0, 10),
      
      comedy: filteredEvents.filter(e => 
        e.event_name.toLowerCase().includes('comedy') ||
        e.event_name.toLowerCase().includes('stand-up') ||
        e.event_name.toLowerCase().includes('stand up') ||
        e.event_description?.toLowerCase().includes('comedy')
      ).slice(0, 10),
      
      arts: filteredEvents.filter(e => 
        e.event_name.toLowerCase().includes('art') ||
        e.event_name.toLowerCase().includes('exhibition') ||
        e.event_name.toLowerCase().includes('theatre') ||
        e.event_name.toLowerCase().includes('theater') ||
        e.event_name.toLowerCase().includes('musical') ||
        e.event_name.toLowerCase().includes('broadway') ||
        e.event_name.toLowerCase().includes('gallery') ||
        e.event_name.toLowerCase().includes('symphony')
      ).slice(0, 10),
      
      family: filteredEvents.filter(e => 
        e.event_name.toLowerCase().includes('family') ||
        e.event_name.toLowerCase().includes('fair') ||
        e.event_name.toLowerCase().includes('kids') ||
        e.event_name.toLowerCase().includes('fun fair')
      ).slice(0, 10),
      
      all: filteredEvents
    };
  };

  const EventCard = ({ event, index }) => {
    const soldPercentage = (event.current_attendees / event.max_attendees) * 100;
    const minPrice = event.ticket_types ? Math.min(...event.ticket_types.map(t => t.price)) : event.price || 0;
    
    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => navigation.navigate('EventDetail', { eventId: event.event_id, event: event })}
        activeOpacity={0.95}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: getEventImage(event, index) }}
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
          <Text style={styles.eventName} numberOfLines={2}>{event.event_name}</Text>
          
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
            <Text style={styles.metaText}>From R{minPrice.toFixed(2)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const CarouselSection = ({ title, icon, iconColor, iconBgColor, events, sectionKey }) => {
    const scrollViewRef = React.useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(events.length > 0);
    const [currentScrollX, setCurrentScrollX] = useState(0);

    useEffect(() => {
      if (isScreenFocused && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: 0, animated: false });
        setCurrentScrollX(0);
        setCanScrollLeft(false);
        setCanScrollRight(events.length > 0);
      }
    }, [isScreenFocused, events.length]);

    const handleScroll = (event) => {
      const scrollX = event.nativeEvent.contentOffset.x;
      const contentWidth = event.nativeEvent.contentSize.width;
      const layoutWidth = event.nativeEvent.layoutMeasurement.width;
      
      setCurrentScrollX(scrollX);
      setCanScrollLeft(scrollX > 10);
      setCanScrollRight(scrollX < contentWidth - layoutWidth - 10);
    };

    const scrollLeft = () => {
      if (scrollViewRef.current) {
        const newScrollX = Math.max(0, currentScrollX - 420);
        scrollViewRef.current.scrollTo({
          x: newScrollX,
          animated: true
        });
      }
    };

    const scrollRight = () => {
      if (scrollViewRef.current) {
        const newScrollX = currentScrollX + 420;
        scrollViewRef.current.scrollTo({
          x: newScrollX,
          animated: true
        });
      }
    };

    if (events.length === 0) return null;

    return (
      <View style={styles.categorySection}>
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
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {events.map((event, index) => (
            <EventCard key={event.event_id} event={event} index={index} />
          ))}
        </ScrollView>
      </View>
    );
  };

  const Footer = () => {
    const handleSocialPress = (platform) => {
      alert(`Opening ${platform} page for Ticket-hub`);
    };

    const handleLinkPress = (link) => {
      alert(`Navigating to: ${link}`);
    };

    const isMobile = windowWidth < 768;

    // Don't render footer for admin users
    if (hasAdminPrivileges()) {
      return null;
    }

    return (
      <View style={styles.footer}>
        <View style={[
          styles.footerContent,
          isMobile && styles.footerContentMobile
        ]}>
          <View style={styles.footerSection}>
            <Text style={styles.footerLogo}>Ticket-hub</Text>
            <Text style={styles.footerSlogan}>
              Your gateway to amazing events. Discover, book, and enjoy unforgettable experiences.
            </Text>
            <View style={styles.socialIcons}>
              <TouchableOpacity 
                style={styles.socialIcon}
                onPress={() => handleSocialPress('facebook')}
              >
                <Ionicons name="logo-facebook" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.socialIcon}
                onPress={() => handleSocialPress('twitter')}
              >
                <Ionicons name="logo-twitter" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.socialIcon}
                onPress={() => handleSocialPress('instagram')}
              >
                <Ionicons name="logo-instagram" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.socialIcon}
                onPress={() => handleSocialPress('linkedin')}
              >
                <Ionicons name="logo-linkedin" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footerSection}>
            <Text style={styles.footerHeading}>Quick Links</Text>
            <TouchableOpacity onPress={() => handleLinkPress('About Us')}>
              <Text style={styles.footerLink}>About Us</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleLinkPress('How It Works')}>
              <Text style={styles.footerLink}>How It Works</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleLinkPress('FAQs')}>
              <Text style={styles.footerLink}>FAQs</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleLinkPress('Contact Us')}>
              <Text style={styles.footerLink}>Contact Us</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerSection}>
            <Text style={styles.footerHeading}>Categories</Text>
            <TouchableOpacity onPress={() => handleLinkPress('Music & Concerts')}>
              <Text style={styles.footerLink}>Music & Concerts</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleLinkPress('Sports Events')}>
              <Text style={styles.footerLink}>Sports Events</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleLinkPress('Comedy Shows')}>
              <Text style={styles.footerLink}>Comedy Shows</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleLinkPress('Art & Culture')}>
              <Text style={styles.footerLink}>Art & Culture</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerSection}>
            <Text style={styles.footerHeading}>Support</Text>
            <TouchableOpacity onPress={() => handleLinkPress('Help Center')}>
              <Text style={styles.footerLink}>Help Center</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleLinkPress('Terms of Service')}>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleLinkPress('Privacy Policy')}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footerBottom}>
          <Text style={styles.footerBottomText}>
            © 2024 Ticket-hub. All rights reserved.
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.fullContainer}>
        <ScreenContainer>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Loading events...</Text>
          </View>
        </ScreenContainer>
      </View>
    );
  }

  const categories = categorizeEvents();

  return (
    <View style={styles.fullContainer}>
      {/* Fixed Search Section */}
      <View style={styles.fixedSearchSection}>
        <View style={styles.searchContainer}>
          {apiError && (
            <View style={styles.apiWarning}>
              <Ionicons name="warning-outline" size={14} color="#FFA000" />
              <Text style={styles.apiWarningText}>Demo mode</Text>
            </View>
          )}
          
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={16} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search events..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons name="options" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content Area */}
      <View style={styles.scrollableContent}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollViewContent,
            hasAdminPrivileges() && styles.adminScrollViewContent
          ]}
          showsVerticalScrollIndicator={true}
          scrollEventThrottle={16}
        >
          <View style={styles.scrollContentStart} />
          
          <CarouselSection
            title="This Week"
            icon="time"
            iconColor="#6366f1"
            iconBgColor="#6366f115"
            events={categories.thisWeek}
            sectionKey="thisWeek"
          />

          <CarouselSection
            title="Trending Now"
            icon="trending-up"
            iconColor="#FF4400"
            iconBgColor="#FF440015"
            events={categories.trending}
            sectionKey="trending"
          />

          <CarouselSection
            title="Music & Concerts"
            icon="musical-notes"
            iconColor="#E91E63"
            iconBgColor="#E91E6315"
            events={categories.music}
            sectionKey="music"
          />

          <CarouselSection
            title="Food & Drink"
            icon="restaurant"
            iconColor="#FF9800"
            iconBgColor="#FF980015"
            events={categories.food}
            sectionKey="food"
          />

          <CarouselSection
            title="Sports & Games"
            icon="football"
            iconColor="#4CAF50"
            iconBgColor="#4CAF5015"
            events={categories.sports}
            sectionKey="sports"
          />

          <CarouselSection
            title="Comedy Shows"
            icon="happy"
            iconColor="#FF6B35"
            iconBgColor="#FF6B3515"
            events={categories.comedy}
            sectionKey="comedy"
          />

          <CarouselSection
            title="Arts & Culture"
            icon="color-palette"
            iconColor="#9C27B0"
            iconBgColor="#9C27B015"
            events={categories.arts}
            sectionKey="arts"
          />

          <CarouselSection
            title="Family Events"
            icon="people"
            iconColor="#00BCD4"
            iconBgColor="#00BCD415"
            events={categories.family}
            sectionKey="family"
          />

          <CarouselSection
            title="All Events"
            icon="grid"
            iconColor="#000"
            iconBgColor="#00000015"
            events={categories.all}
            sectionKey="all"
          />

          {categories.all.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No events found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search or filters
              </Text>
              <TouchableOpacity 
                style={styles.clearFiltersButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearFiltersText}>Clear filters</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Only show footer for non-admin users */}
          {!hasAdminPrivileges() && <Footer />}
        </ScrollView>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Events</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={true}>
              <Text style={styles.filterSectionTitle}>Price Range (Rands)</Text>
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Min Price</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={filters.minPrice}
                    onChangeText={(text) => setFilters({...filters, minPrice: text})}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Max Price</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10000"
                    value={filters.maxPrice}
                    onChangeText={(text) => setFilters({...filters, maxPrice: text})}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <Text style={styles.filterSectionTitle}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter location"
                value={filters.location}
                onChangeText={(text) => setFilters({...filters, location: text})}
              />

              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.sortOptions}>
                {[
                  { value: 'date', label: 'Date' },
                  { value: 'price', label: 'Price' },
                  { value: 'name', label: 'Name' }
                ].map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOption,
                      filters.sortBy === option.value && styles.sortOptionSelected
                    ]}
                    onPress={() => setFilters({...filters, sortBy: option.value})}
                  >
                    <Text style={[
                      styles.sortOptionText,
                      filters.sortBy === option.value && styles.sortOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  clearFilters();
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
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
    backgroundColor: '#f8f9fa',
  },
  fixedSearchSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    gap: 8,
  },
  apiWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 6,
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  apiWarningText: {
    color: '#856404',
    fontSize: 11,
    fontWeight: '500',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 13,
  },
  filterButton: {
    width: 36,
    height: 36,
    backgroundColor: '#000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollableContent: {
    flex: 1,
    marginTop: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 0,
  },
  adminScrollViewContent: {
    paddingBottom: 40,
  },
  scrollContentStart: {
    height: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#666',
  },
  categorySection: {
    marginTop: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
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
    color: '#000',
    letterSpacing: -0.4,
    flex: 1,
  },
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
  clearFiltersButton: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  clearFiltersText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#1a1a1a',
    paddingTop: 40,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    width: '100%',
    marginTop: 40,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    flexWrap: 'wrap',
  },
  footerContentMobile: {
    flexDirection: 'column',
    gap: 30,
  },
  footerSection: {
    flex: 1,
    minWidth: 200,
    marginBottom: 20,
  },
  footerLogo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  footerSlogan: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 300,
  },
  socialIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  footerHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
  },
  footerLink: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 10,
    paddingVertical: 2,
  },
  footerBottom: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 20,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  footerBottomText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  modalBody: {
    padding: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 10,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  sortOption: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    alignItems: 'center',
  },
  sortOptionSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  sortOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  sortOptionTextSelected: {
    color: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 10,
  },
  clearButton: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 10,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  applyButton: {
    flex: 1,
    padding: 14,
    backgroundColor: '#000',
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default SearchEventsScreen;