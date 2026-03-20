import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
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

const PrivacyPolicyScreen = ({ navigation }) => {
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Privacy Policy sections data
  const privacySections = [
    {
      id: 'introduction',
      title: 'Introduction',
      icon: 'information-circle-outline',
      color: '#6366f1',
      content: `Ticket-Hub ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.

Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.`
    },
    {
      id: 'data-collection',
      title: 'Information We Collect',
      icon: 'document-text-outline',
      color: '#10b981',
      content: `We collect information that you provide directly to us:

• Personal Information: Name, email address, phone number, date of birth
• Account Information: Username, password, profile preferences
• Payment Information: Credit card details, billing address (processed securely)
• Event Information: Ticket purchases, event preferences, booking history
• Technical Information: IP address, device type, operating system, app usage data

We collect this information to provide and improve our services.`
    },
    {
      id: 'usage',
      title: 'How We Use Your Information',
      icon: 'analytics-outline',
      color: '#f59e0b',
      content: `We use the collected information for:

• Service Provision: Process ticket purchases, manage your account
• Communication: Send booking confirmations, event updates, support responses
• Personalization: Recommend events based on your preferences
• Security: Protect against fraud and unauthorized access
• Improvement: Enhance app functionality and user experience
• Legal Compliance: Meet regulatory requirements

We do not sell your personal information to third parties.`
    },
    {
      id: 'data-sharing',
      title: 'Information Sharing',
      icon: 'share-social-outline',
      color: '#ef4444',
      content: `We may share your information in these limited circumstances:

• Event Organizers: Necessary event details for ticket validation
• Payment Processors: Secure payment transaction processing
• Legal Requirements: When required by law or legal process
• Business Transfers: In connection with merger or acquisition
• Service Providers: Trusted partners who assist our operations

All third parties are contractually obligated to protect your data.`
    },
    {
      id: 'data-security',
      title: 'Data Security',
      icon: 'shield-checkmark-outline',
      color: '#8b5cf6',
      content: `We implement comprehensive security measures:

• Encryption: All data transmitted is encrypted using SSL/TLS
• Access Controls: Strict internal access limitations
• Secure Storage: Data stored on protected servers
• Regular Audits: Security assessments and vulnerability testing
• Employee Training: Privacy and security awareness programs

While we implement robust security, no system is 100% secure.`
    },
    {
      id: 'data-retention',
      title: 'Data Retention',
      icon: 'time-outline',
      color: '#64748b',
      content: `We retain your personal information only as long as necessary:

• Account Data: While your account is active plus 3 years
• Transaction Records: 7 years for legal and tax purposes
• Event Data: Until event completion plus 1 year
• Inactive Accounts: Deleted after 3 years of inactivity
• Marketing Data: Until you opt-out or request deletion

You can request data deletion at any time.`
    },
    {
      id: 'user-rights',
      title: 'Your Rights',
      icon: 'person-outline',
      color: '#06b6d4',
      content: `You have the following rights regarding your data:

• Access: Request a copy of your personal data
• Correction: Update or correct inaccurate information
• Deletion: Request deletion of your personal data
• Portability: Receive your data in a portable format
• Objection: Object to certain data processing
• Restriction: Limit how we use your data
• Withdraw Consent: Revoke previously given consent

Contact us to exercise these rights.`
    },
    {
      id: 'cookies',
      title: 'Cookies & Tracking',
      icon: 'eye-outline',
      color: '#dc2626',
      content: `We use cookies and similar technologies:

• Essential Cookies: Required for app functionality
• Analytics Cookies: Understand how users interact with our app
• Preference Cookies: Remember your settings and preferences
• Marketing Cookies: Deliver relevant advertisements

You can control cookie preferences through your browser settings.`
    },
    {
      id: 'international',
      title: 'International Transfers',
      icon: 'globe-outline',
      color: '#059669',
      content: `Your information may be transferred internationally:

• Data Centers: Located in secure facilities worldwide
• Protection Standards: Adequate safeguards for cross-border transfers
• Compliance: Adherence to international data protection laws
• User Consent: By using our services, you consent to these transfers

We ensure all transfers comply with applicable data protection laws.`
    },
    {
      id: 'children',
      title: "Children's Privacy",
      icon: 'people-outline',
      color: '#7c3aed',
      content: `Our services are not directed to children under 16:

• Age Restriction: Users must be 16 years or older
• Parental Consent: Required for users under 18 in some regions
• No Collection: We do not knowingly collect data from children
• Removal: Contact us if you believe we have collected child data

Parents can request deletion of their child's information.`
    },
    {
      id: 'changes',
      title: 'Policy Updates',
      icon: 'notifications-outline',
      color: '#d97706',
      content: `We may update this Privacy Policy:

• Notification: We will notify you of significant changes
• Review Period: 30-day notice for material changes
• Continued Use: Using our services after changes means acceptance
• Version History: Previous versions available upon request

Last updated: December 2024`
    },
    {
      id: 'contact',
      title: 'Contact Information',
      icon: 'mail-outline',
      color: '#be185d',
      content: `For privacy-related questions or concerns:

• Data Protection Officer: privacy@ticket-hub.com
• General Support: support@ticket-hub.com
• Phone: +27 11 123 4567
• Address: Ticket-Hub Privacy Team, Johannesburg, South Africa
• Response Time: Within 48 hours for privacy inquiries

We take all privacy concerns seriously.`
    }
  ];

  // Quick actions for easy navigation
  const quickActions = [
    {
      id: 'terms',
      title: 'Terms & Conditions',
      icon: 'document-text-outline',
      color: '#10b981',
      action: () => navigation.navigate('TermsConditions')
    },
    {
      id: 'help',
      title: 'Help Center',
      icon: 'help-circle-outline',
      color: '#6366f1',
      action: () => navigation.navigate('HelpCenter')
    },
    {
      id: 'contact',
      title: 'Contact Us',
      icon: 'chatbubble-ellipses-outline',
      color: '#f59e0b',
      action: () => Alert.alert('Contact Privacy Team', 'Email: privacy@ticket-hub.com\nPhone: +27 11 123 4567')
    }
  ];

  // Calculate responsive widths - matching ProfileScreen
  const getCardWidth = () => {
    if (width >= 1024) {
      return (width - 80) / 2;
    } else if (width >= 768) {
      return (width - 56) / 2;
    }
    return width - 32;
  };

  const getActionCardWidth = () => {
    if (width >= 1024) {
      return (width - 80) / 3;
    } else if (width >= 768) {
      return (width - 56) / 3;
    }
    return (width - 56) / 2;
  };

  // Privacy Section Component
  const PrivacySection = ({ section }) => (
    <View style={[styles.privacySection, { width: getCardWidth() }]}>
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => toggleSection(section.id)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionTitleContainer}>
          <View style={[styles.sectionIcon, { backgroundColor: section.color + '15' }]}>
            <Ionicons name={section.icon} size={scaleFont(18)} color={section.color} />
          </View>
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
        <Ionicons 
          name={expandedSections[section.id] ? "chevron-up" : "chevron-down"} 
          size={scaleFont(16)} 
          color="#64748b" 
        />
      </TouchableOpacity>

      {expandedSections[section.id] && (
        <View style={styles.sectionContent}>
          <Text style={styles.sectionText}>{section.content}</Text>
        </View>
      )}
    </View>
  );

  // Quick Action Card Component
  const QuickActionCard = ({ action }) => (
    <TouchableOpacity 
      style={[styles.actionCard, { width: getActionCardWidth() }]}
      onPress={action.action}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
        <Ionicons name={action.icon} size={scaleFont(20)} color="#fff" />
      </View>
      <Text style={styles.actionTitle}>{action.title}</Text>
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
            <Text style={styles.headerTitle}>Privacy Policy</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          {/* Introduction Card */}
          <View style={[styles.introCard, { width: getCardWidth() }]}>
            <View style={styles.introIcon}>
              <Ionicons name="shield-checkmark-outline" size={scaleSize(40)} color="#6366f1" />
            </View>
            <Text style={styles.introTitle}>Privacy Policy</Text>
            <Text style={styles.introSubtitle}>
              Last updated: December 2024 • Version 3.2
            </Text>
            <Text style={styles.introText}>
              Your privacy is important to us. This policy explains what information we collect, 
              how we use it, and your rights regarding your personal data.
            </Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Related Information</Text>
            <Text style={styles.sectionSubtitle}>
              Explore related policies and get help
            </Text>
            <ResponsiveContainer isGrid={true}>
              {quickActions.map((action) => (
                <QuickActionCard key={action.id} action={action} />
              ))}
            </ResponsiveContainer>
          </View>

          {/* Privacy Policy Sections */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy Policy Details</Text>
            <Text style={styles.sectionSubtitle}>
              Expand each section to read our complete privacy policy
            </Text>
            
            <ResponsiveContainer isGrid={true}>
              {privacySections.map((section) => (
                <PrivacySection key={section.id} section={section} />
              ))}
            </ResponsiveContainer>
          </View>

          {/* Data Rights Card */}
          <View style={[styles.rightsCard, { width: getCardWidth() }]}>
            <View style={styles.rightsIcon}>
              <Ionicons name="key-outline" size={scaleFont(24)} color="#059669" />
            </View>
            <View style={styles.rightsContent}>
              <Text style={styles.rightsTitle}>Your Data Rights</Text>
              <Text style={styles.rightsText}>
                You have the right to access, correct, or delete your personal data. 
                Contact our privacy team to exercise your rights under data protection laws.
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.rightsButton}
              onPress={() => Alert.alert('Exercise Your Rights', 'Contact: privacy@ticket-hub.com\nWe will respond within 48 hours.')}
            >
              <Text style={styles.rightsButtonText}>Contact Us</Text>
            </TouchableOpacity>
          </View>

          {/* Consent Button */}
          <TouchableOpacity
            style={[styles.consentButton, { width: getCardWidth() }]}
            onPress={() => {
              Alert.alert(
                'Privacy Policy Acknowledged',
                'Thank you for reviewing our Privacy Policy. Your privacy is important to us.',
                [{ text: 'Continue' }]
              );
            }}
          >
            <Ionicons name="checkmark-done" size={scaleFont(20)} color="#fff" />
            <Text style={styles.consentButtonText}>I Understand the Policy</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Ticket-Hub Privacy Policy • Protecting Your Data
            </Text>
            <Text style={styles.footerSubtext}>
              © 2024 Ticket-Hub. All rights reserved. Compliance with POPIA & GDPR.
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
  introCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  introIcon: {
    width: scaleSize(80),
    height: scaleSize(80),
    borderRadius: scaleSize(40),
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  introTitle: {
    fontSize: scaleFont(22),
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  introSubtitle: {
    fontSize: scaleFont(14),
    color: '#64748b',
    marginBottom: 12,
    textAlign: 'center',
  },
  introText: {
    fontSize: scaleFont(14),
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
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
  privacySection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    width: scaleSize(36),
    height: scaleSize(36),
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  sectionContent: {
    padding: 20,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  sectionText: {
    fontSize: scaleFont(14),
    color: '#64748b',
    lineHeight: 20,
  },
  actionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    minHeight: 80,
  },
  actionIcon: {
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: scaleSize(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  rightsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  rightsIcon: {
    marginRight: 16,
  },
  rightsContent: {
    flex: 1,
  },
  rightsTitle: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  rightsText: {
    fontSize: scaleFont(12),
    color: '#065f46',
    lineHeight: 16,
  },
  rightsButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 12,
  },
  rightsButtonText: {
    color: '#fff',
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  consentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  consentButtonText: {
    color: '#fff',
    fontSize: scaleFont(16),
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

export default PrivacyPolicyScreen;