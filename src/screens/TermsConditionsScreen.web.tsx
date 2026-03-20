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

const TermsConditionsScreen = ({ navigation }) => {
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Terms & Conditions sections data
  const termsSections = [
    {
      id: 'acceptance',
      title: 'Acceptance of Terms',
      icon: 'checkmark-circle-outline',
      color: '#6366f1',
      content: `By accessing and using Ticket-Hub ("the App"), you accept and agree to be bound by the terms and provision of this agreement.`
    },
    {
      id: 'use-license',
      title: 'Use License',
      icon: 'document-lock-outline',
      color: '#10b981',
      content: `Permission is granted to temporarily use Ticket-Hub for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.`
    },
    {
      id: 'account-responsibility',
      title: 'Account Responsibility',
      icon: 'person-circle-outline',
      color: '#f59e0b',
      content: `You are responsible for maintaining the confidentiality of your account and password and for restricting access to your device.`
    },
    {
      id: 'payments-refunds',
      title: 'Payments & Refunds',
      icon: 'card-outline',
      color: '#ef4444',
      content: `All ticket purchases are final. Refunds are only available if an event is canceled or rescheduled. Service fees are non-refundable.`
    },
    {
      id: 'prohibited-uses',
      title: 'Prohibited Uses',
      icon: 'warning-outline',
      color: '#8b5cf6',
      content: `You may not use Ticket-Hub for any illegal or unauthorized purpose. You must not transmit any worms or viruses or any code of a destructive nature.`
    },
    {
      id: 'termination',
      title: 'Termination',
      icon: 'power-outline',
      color: '#64748b',
      content: `We may terminate or suspend access to our App immediately, without prior notice, for any reason whatsoever, including without limitation if you breach the Terms.`
    },
    {
      id: 'limitations',
      title: 'Limitations',
      icon: 'speedometer-outline',
      color: '#06b6d4',
      content: `In no event shall Ticket-Hub or its suppliers be liable for any damages arising out of the use or inability to use the services on the App.`
    },
    {
      id: 'accuracy',
      title: 'Accuracy of Materials',
      icon: 'checkmark-done-outline',
      color: '#dc2626',
      content: `The materials appearing on Ticket-Hub could include technical, typographical, or photographic errors. We do not warrant that any of the materials are accurate, complete, or current.`
    },
    {
      id: 'changes',
      title: 'Terms Modifications',
      icon: 'git-compare-outline',
      color: '#059669',
      content: `Ticket-Hub may revise these terms of service at any time without notice. By using this App you are agreeing to be bound by the then current version of these terms of service.`
    },
    {
      id: 'governing-law',
      title: 'Governing Law',
      icon: 'business-outline',
      color: '#7c3aed',
      content: `These terms and conditions are governed by and construed in accordance with the laws of South Africa and you irrevocably submit to the exclusive jurisdiction of the courts in that location.`
    }
  ];

  // Quick actions for easy navigation - UPDATED WITH PROPER NAVIGATION
  const quickActions = [
    {
      id: 'privacy',
      title: 'Privacy Policy',
      icon: 'shield-checkmark-outline',
      color: '#8b5cf6',
      action: () => navigation.navigate('PrivacyPolicy')
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
      action: () => Alert.alert('Contact Support', 'Email: support@ticket-hub.com\nPhone: +27 11 123 4567')
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

  // Terms Section Component
  const TermsSection = ({ section }) => (
    <View style={[styles.termsSection, { width: getCardWidth() }]}>
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
            <Text style={styles.headerTitle}>Terms & Conditions</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          {/* Introduction Card */}
          <View style={[styles.introCard, { width: getCardWidth() }]}>
            <View style={styles.introIcon}>
              <Ionicons name="document-text-outline" size={scaleSize(40)} color="#6366f1" />
            </View>
            <Text style={styles.introTitle}>Terms & Conditions</Text>
            <Text style={styles.introSubtitle}>
              Last updated: December 2024 • Version 2.1
            </Text>
            <Text style={styles.introText}>
              Please read these terms and conditions carefully before using our service. 
              Your access to and use of the service is conditioned on your acceptance of and compliance with these terms.
            </Text>
          </View>

          {/* Quick Actions - UPDATED WITH WORKING PRIVACY POLICY NAVIGATION */}
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

          {/* Terms & Conditions Sections */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terms & Conditions Details</Text>
            <Text style={styles.sectionSubtitle}>
              Expand each section to read our complete terms and conditions
            </Text>
            
            <ResponsiveContainer isGrid={true}>
              {termsSections.map((section) => (
                <TermsSection key={section.id} section={section} />
              ))}
            </ResponsiveContainer>
          </View>

          {/* Agreement Card */}
          <View style={[styles.agreementCard, { width: getCardWidth() }]}>
            <View style={styles.agreementIcon}>
              <Ionicons name="thumbs-up-outline" size={scaleFont(24)} color="#059669" />
            </View>
            <View style={styles.agreementContent}>
              <Text style={styles.agreementTitle}>Your Agreement</Text>
              <Text style={styles.agreementText}>
                By using Ticket-Hub, you acknowledge that you have read, understood, 
                and agree to be bound by these Terms & Conditions.
              </Text>
            </View>
          </View>

          {/* Acceptance Button */}
          <TouchableOpacity
            style={[styles.acceptButton, { width: getCardWidth() }]}
            onPress={() => {
              Alert.alert(
                'Terms Acknowledged',
                'Thank you for reviewing our Terms & Conditions.',
                [{ text: 'Continue' }]
              );
            }}
          >
            <Ionicons name="checkmark-done" size={scaleFont(20)} color="#fff" />
            <Text style={styles.acceptButtonText}>I Understand the Terms</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Ticket-Hub Terms & Conditions • Legal Agreement
            </Text>
            <Text style={styles.footerSubtext}>
              © 2024 Ticket-Hub. All rights reserved.
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
  termsSection: {
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
  agreementCard: {
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
  agreementIcon: {
    marginRight: 16,
  },
  agreementContent: {
    flex: 1,
  },
  agreementTitle: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  agreementText: {
    fontSize: scaleFont(12),
    color: '#065f46',
    lineHeight: 16,
  },
  acceptButton: {
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
  acceptButtonText: {
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

export default TermsConditionsScreen;

// API function example
const fetchData = async () => {
  try {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
  }
};
