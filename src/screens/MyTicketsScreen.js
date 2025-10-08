import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import QRCode from 'react-native-qrcode-svg';
import { useFocusEffect } from '@react-navigation/native';

const API_URL = 'http://localhost:3000';

const getTicketTypeLabel = (type) => {
  const labels = {
    early_bird: 'Early Bird',
    general: 'General',
    family_group: 'Family/Group',
    vip: 'VIP',
    vvip: 'VVIP'
  };
  return labels[type] || 'General';
};

const MyTicketsScreen = ({ navigation }) => {
  const { user, getAuthHeader } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('current');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  // Use useFocusEffect to refresh when screen comes into focus
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
      const headers = getAuthHeader();
      const response = await axios.get(
        `${API_URL}/api/payments/tickets/customer/${user.customer_id}`,
        { headers }
      );
      
      setTickets(response.data.tickets || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const filterTickets = () => {
    const now = new Date();
    return tickets.filter(ticket => {
      const eventDate = new Date(ticket.event_date);
      if (selectedTab === 'current') {
        return eventDate >= now && ticket.ticket_status !== 'CANCELLED';
      } else {
        return eventDate < now || ticket.ticket_status === 'CANCELLED';
      }
    });
  };

  const openQRModal = (ticket) => {
    setSelectedTicket(ticket);
    setShowQRModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return '#4CAF50';
      case 'VALIDATED':
        return '#2196F3';
      case 'CANCELLED':
        return '#F44336';
      case 'REFUNDED':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const renderTicketItem = useCallback(({ item }) => {
    const isPast = new Date(item.event_date) < new Date() || item.ticket_status === 'CANCELLED';
    const statusColor = getStatusColor(item.ticket_status);
    
    return (
      <TouchableOpacity 
        style={[styles.ticketCard, isPast && styles.ticketCardPast]}
        onPress={() => !isPast && openQRModal(item)}
        activeOpacity={0.9}
      >
        <View style={styles.ticketHeader}>
          <Image
            source={{ 
              uri: item.image_url || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400' 
            }}
            style={styles.ticketImage}
            resizeMode="cover"
          />
          
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.ticket_status}</Text>
          </View>

          <View style={styles.ticketIdBadge}>
            <Text style={styles.ticketIdText}>#{item.ticket_code}</Text>
          </View>
        </View>

        <View style={styles.ticketBody}>
          <Text style={styles.eventName}>{item.event_name}</Text>
          
          <View style={styles.ticketDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🎫</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Ticket Type</Text>
                <Text style={styles.detailText}>
                  {getTicketTypeLabel(item.ticket_type)}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📅</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailText}>
                  {new Date(item.event_date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🕐</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailText}>
                  {new Date(item.event_date).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📍</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailText}>{item.location}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>💰</Text>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Price</Text>
                <Text style={styles.detailText}>
                  {item.currency || 'ZAR'} {item.price.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.purchaseInfo}>
            <Text style={styles.purchaseLabel}>Purchased on:</Text>
            <Text style={styles.purchaseDate}>
              {new Date(item.purchase_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
          </View>

          {!isPast && item.ticket_status === 'ACTIVE' && (
            <TouchableOpacity 
              style={styles.showQRButton}
              onPress={() => openQRModal(item)}
            >
              <Text style={styles.showQRButtonText}>Show QR Code</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }, []);

  const renderQRModal = () => {
    if (!selectedTicket) return null;

    return (
      <Modal
        visible={showQRModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedTicket.event_name}</Text>
            <Text style={styles.ticketTypeModal}>
              {getTicketTypeLabel(selectedTicket.ticket_type)} Ticket
            </Text>
            
            <View style={styles.qrCodeContainer}>
              <QRCode
                value={selectedTicket.ticket_code}
                size={250}
                backgroundColor="white"
              />
            </View>

            <View style={styles.ticketCodeContainer}>
              <Text style={styles.ticketCodeLabel}>Ticket Code</Text>
              <Text style={styles.ticketCodeValue}>{selectedTicket.ticket_code}</Text>
            </View>

            <Text style={styles.qrInstructions}>
              Present this QR code at the event entrance for scanning
            </Text>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowQRModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>🔒</Text>
        <Text style={styles.error}>Please login to view your tickets</Text>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading your tickets...</Text>
      </View>
    );
  }

  const filteredTickets = filterTickets();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Tickets</Text>
        <Text style={styles.headerSubtitle}>
          {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
        </Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'current' && styles.tabActive]}
          onPress={() => setSelectedTab('current')}
        >
          <Text style={[styles.tabText, selectedTab === 'current' && styles.tabTextActive]}>
            Upcoming
          </Text>
          {selectedTab === 'current' && (
            <View style={styles.tabIndicator} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'previous' && styles.tabActive]}
          onPress={() => setSelectedTab('previous')}
        >
          <Text style={[styles.tabText, selectedTab === 'previous' && styles.tabTextActive]}>
            Past
          </Text>
          {selectedTab === 'previous' && (
            <View style={styles.tabIndicator} />
          )}
        </TouchableOpacity>
      </View>

      {filteredTickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎫</Text>
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
              onPress={() => navigation.navigate('HomeTab')}
            >
              <Text style={styles.browseButtonText}>Browse Events</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          renderItem={renderTicketItem}
          keyExtractor={item => item.ticket_id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={10}
        />
      )}

      {renderQRModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#000',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {
    borderBottomWidth: 0,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#000',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  error: {
    color: '#666',
    fontSize: 16,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#000',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  ticketCardPast: {
    opacity: 0.7,
  },
  ticketHeader: {
    position: 'relative',
    height: 180,
    backgroundColor: '#e0e0e0',
  },
  ticketImage: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  ticketIdBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ticketIdText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  ticketBody: {
    padding: 20,
  },
  eventName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  ticketDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailIcon: {
    fontSize: 18,
    width: 28,
    marginRight: 8,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  purchaseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginBottom: 16,
  },
  purchaseLabel: {
    fontSize: 12,
    color: '#999',
    marginRight: 8,
  },
  purchaseDate: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  showQRButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  showQRButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#000',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  ticketTypeModal: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  qrCodeContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  ticketCodeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ticketCodeLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ticketCodeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  qrInstructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: '#000',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MyTicketsScreen;