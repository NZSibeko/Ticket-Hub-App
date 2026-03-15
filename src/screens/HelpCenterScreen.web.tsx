import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';

const { width, height } = Dimensions.get('window');

// Responsive scaling functions - matching ProfileScreen
const scaleSize = (size) => {
  const scale = width / 375;
  return Math.ceil(size * Math.min(scale, 1.5));
};

const scaleFont = (size) => {
  const scale = width / 375;
  return Math.ceil(size * Math.min(scale, 1.3));
};

const HelpCenterScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  // FAQ Data
  const faqSections = [
    {
      id: 'tickets',
      title: 'Tickets & Booking',
      icon: 'ticket-outline',
      color: '#6366f1',
      questions: [
        {
          id: 1,
          question: 'How do I purchase tickets?',
          answer: 'Browse events, select your preferred seats, and proceed to checkout. You can pay securely with credit/debit cards or other available payment methods.'
        },
        {
          id: 2,
          question: 'Can I cancel or refund my ticket?',
          answer: 'Refund policies vary by event. Generally, tickets are non-refundable unless the event is cancelled. Check the specific event details for refund policies.'
        },
        {
          id: 3,
          question: 'What if I lose my ticket?',
          answer: 'All tickets are stored digitally in your account. You can access them anytime in the "My Tickets" section. For assistance, contact support.'
        }
      ]
    },
    {
      id: 'account',
      title: 'Account & Profile',
      icon: 'person-outline',
      color: '#10b981',
      questions: [
        {
          id: 4,
          question: 'How do I reset my password?',
          answer: 'Go to Login screen, click "Forgot Password", and follow the instructions sent to your email to reset your password securely.'
        },
        {
          id: 5,
          question: 'Can I update my profile information?',
          answer: 'Yes, you can update your personal information in the Profile section. Some changes may require verification.'
        }
      ]
    },
    {
      id: 'events',
      title: 'Events & Venues',
      icon: 'calendar-outline',
      color: '#f59e0b',
      questions: [
        {
          id: 6,
          question: 'How do I find events near me?',
          answer: 'Use the search feature with location filters or allow location access for personalized event recommendations based on your area.'
        },
        {
          id: 7,
          question: 'What are the venue policies?',
          answer: 'Venue policies vary. Check the event details for specific information about age restrictions, prohibited items, and accessibility.'
        }
      ]
    },
    {
      id: 'technical',
      title: 'Technical Support',
      icon: 'hardware-chip-outline',
      color: '#ef4444',
      questions: [
        {
          id: 8,
          question: 'The app is crashing, what should I do?',
          answer: 'Try restarting the app, updating to the latest version, or reinstalling. If issues persist, contact our technical support team.'
        },
        {
          id: 9,
          question: 'How do I update the app?',
          answer: 'Visit your device\'s app store (Google Play Store or Apple App Store) and check for updates available for Ticket-Hub.'
        }
      ]
    }
  ];

  // Support categories - Updated to match ProfileScreen card design
  const supportCategories = [
    {
      id: 'contact',
      title: 'Contact Support',
      description: 'Get direct help from our support team',
      icon: 'chatbubble-ellipses-outline',
      color: '#6366f1',
      action: () => Alert.alert(
        'Contact Support',
        'Email: support@ticket-hub.com\nPhone: +27 11 123 4567\nHours: Mon-Fri 9AM-6PM SAT',
        [{ text: 'OK' }]
      )
    },
    {
      id: 'live',
      title: 'Live Chat',
      description: 'Instant help with our AI assistant',
      icon: 'flash-outline',
      color: '#10b981',
      action: () => Alert.alert('Live Chat', 'Our AI assistant will be available soon!', [{ text: 'OK' }])
    },
    {
      id: 'email',
      title: 'Email Support',
      description: 'Send us a detailed message',
      icon: 'mail-outline',
      color: '#f59e0b',
      action: () => Alert.alert('Email Support', 'Send your query to: support@ticket-hub.com', [{ text: 'OK' }])
    },
    {
      id: 'callback',
      title: 'Request Callback',
      description: 'We\'ll call you back',
      icon: 'call-outline',
      color: '#ef4444',
      action: () => Alert.alert('Callback Request', 'Callback service coming soon!', [{ text: 'OK' }])
    }
  ];

  // Calculate responsive widths - matching ProfileScreen
  const getCardWidth = () => {
    if (width >= 1024) {
      return (width - 80) / 2; // 2 columns on large screens
    } else if (width >= 768) {
      return (width - 56) / 2; // 2 columns on tablets
    }
    return width - 32; // Full width on mobile
  };

  const getSupportCardWidth = () => {
    if (width >= 1024) {
      return (width - 80) / 2; // 2 columns on large screens
    } else if (width >= 768) {
      return (width - 56) / 2; // 2 columns on tablets
    }
    return width - 32; // Full width on mobile
  };

  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const toggleFAQ = (faqId) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  const filteredFAQs = faqSections.map(section => ({
    ...section,
    questions: section.questions.filter(q => 
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.questions.length > 0);

  // Support Card Component - Matching ProfileScreen design
  const SupportCard = ({ icon, title, description, color, onPress }) => (
    <TouchableOpacity 
      style={[styles.supportCard, { width: getSupportCardWidth() }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.supportIconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={scaleFont(20)} color={color} />
      </View>
      <View style={styles.supportContent}>
        <Text style={styles.supportCardTitle}>{title}</Text>
        <Text style={styles.supportCardDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={scaleFont(16)} color="#cbd5e1" />
    </TouchableOpacity>
  );

  // FAQ Item Component
  const FAQItem = ({ question, answer, isExpanded, onPress }) => (
    <TouchableOpacity 
      style={styles.faqItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{question}</Text>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={scaleFont(16)} 
          color="#64748b" 
        />
      </View>
      {isExpanded && (
        <View style={styles.faqAnswerContainer}>
          <Text style={styles.faqAnswer}>{answer}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // Responsive container component
  const ResponsiveContainer = ({ children, isGrid = false }) => (
    <View style={isGrid ? styles.responsiveGrid : styles.responsiveContainer}>
      {children}
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={scaleFont(24)} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Help Center</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          {/* Search Section */}
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={scaleFont(20)} color="#64748b" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for help..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#94a3b8"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={scaleFont(20)} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Quick Support Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Get Help Quickly</Text>
            <Text style={styles.sectionSubtitle}>
              Choose the best way to get support from our team
            </Text>
            <ResponsiveContainer isGrid={true}>
              {supportCategories.map((category) => (
                <SupportCard
                  key={category.id}
                  icon={category.icon}
                  title={category.title}
                  description={category.description}
                  color={category.color}
                  onPress={category.action}
                />
              ))}
            </ResponsiveContainer>
          </View>

          {/* FAQ Sections */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            <Text style={styles.sectionSubtitle}>
              Find quick answers to common questions
            </Text>

            {filteredFAQs.length > 0 ? (
              filteredFAQs.map((section) => (
                <View key={section.id} style={[styles.faqSection, { width: getCardWidth() }]}>
                  <TouchableOpacity 
                    style={styles.faqSectionHeader}
                    onPress={() => toggleSection(section.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.faqSectionTitleContainer}>
                      <View style={[styles.faqSectionIcon, { backgroundColor: section.color + '15' }]}>
                        <Ionicons name={section.icon} size={scaleFont(18)} color={section.color} />
                      </View>
                      <Text style={styles.faqSectionTitle}>{section.title}</Text>
                    </View>
                    <Ionicons 
                      name={expandedSection === section.id ? "chevron-up" : "chevron-down"} 
                      size={scaleFont(16)} 
                      color="#64748b" 
                    />
                  </TouchableOpacity>

                  {(expandedSection === section.id || searchQuery.length > 0) && (
                    <View style={styles.faqList}>
                      {section.questions.map((faq) => (
                        <FAQItem
                          key={faq.id}
                          question={faq.question}
                          answer={faq.answer}
                          isExpanded={expandedFAQ === faq.id}
                          onPress={() => toggleFAQ(faq.id)}
                        />
                      ))}
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={[styles.noResults, { width: getCardWidth() }]}>
                <Ionicons name="search-outline" size={scaleSize(48)} color="#cbd5e1" />
                <Text style={styles.noResultsTitle}>No results found</Text>
                <Text style={styles.noResultsText}>
                  Try searching with different keywords or browse our categories
                </Text>
              </View>
            )}
          </View>

          {/* Emergency Support */}
          <View style={styles.section}>
            <View style={[styles.emergencyCard, { width: getCardWidth() }]}>
              <View style={styles.emergencyIcon}>
                <Ionicons name="warning-outline" size={scaleFont(24)} color="#fff" />
              </View>
              <View style={styles.emergencyContent}>
                <Text style={styles.emergencyTitle}>Urgent Event Issues</Text>
                <Text style={styles.emergencyText}>
                  For urgent event-related issues on the day of the event
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.emergencyButton}
                onPress={() => Alert.alert('Emergency Support', 'Call: +27 11 123 4567\nAvailable 24/7 for event emergencies')}
              >
                <Text style={styles.emergencyButtonText}>Call Now</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Ticket-Hub Support Center • Always here to help
            </Text>
            <Text style={styles.footerSubtext}>
              Average response time: 2-4 hours during business hours
            </Text>
          </View>
        </ResponsiveContainer>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  // Responsive container styles - matching ProfileScreen
  responsiveContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: width >= 768 ? 40 : 16,
  },
  responsiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 24,
    width: '100%',
    maxWidth: width >= 768 ? 600 : '100%',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  headerTitle: {
    fontSize: scaleFont(20),
    fontWeight: '700',
    color: '#1e293b',
  },
  headerPlaceholder: {
    width: 40,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
    width: '100%',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    width: '100%',
    maxWidth: width >= 768 ? 600 : '100%',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    fontSize: scaleFont(16),
    color: '#1e293b',
  },
  section: {
    marginBottom: 32,
    width: '100%',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'left',
    width: '100%',
    maxWidth: width >= 768 ? 600 : '100%',
  },
  sectionSubtitle: {
    fontSize: scaleFont(14),
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 20,
    textAlign: 'left',
    width: '100%',
    maxWidth: width >= 768 ? 600 : '100%',
  },
  // Support Card Styles - Matching ProfileScreen design
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    minHeight: 80, // Consistent height
  },
  supportIconContainer: {
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  supportContent: {
    flex: 1,
    justifyContent: 'center',
  },
  supportCardTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  supportCardDescription: {
    fontSize: scaleFont(12),
    color: '#64748b',
    lineHeight: 16,
  },
  // FAQ Section Styles
  faqSection: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  faqSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  faqSectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  faqSectionIcon: {
    width: scaleSize(36),
    height: scaleSize(36),
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  faqSectionTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  faqList: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  faqItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 12,
    lineHeight: 20,
  },
  faqAnswerContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  faqAnswer: {
    fontSize: scaleFont(14),
    color: '#64748b',
    lineHeight: 20,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  noResultsTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  noResultsText: {
    fontSize: scaleFont(14),
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Emergency Support Card
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emergencyIcon: {
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 4,
  },
  emergencyText: {
    fontSize: scaleFont(12),
    color: '#ef4444',
    lineHeight: 16,
  },
  emergencyButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 32,
    width: '100%',
  },
  footerText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: scaleFont(12),
    color: '#94a3b8',
    textAlign: 'center',
  },
});

export default HelpCenterScreen;