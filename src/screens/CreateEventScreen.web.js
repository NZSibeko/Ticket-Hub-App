import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:3000';

const CreateEventScreen = ({ navigation }) => {
  const { getAuthHeader } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [formData, setFormData] = useState({
    event_name: '',
    event_description: '',
    location: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    event_image: '',
    currency: 'ZAR'
  });

  const [ticketTypes, setTicketTypes] = useState([
    { type: 'General', price: '', quantity: '', enabled: true }
  ]);

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Image Picker Functions
  const pickImage = async () => {
    try {
      setImageLoading(true);
      
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photo library to upload event images.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        console.log('✅ Image selected:', imageUri);
        updateFormData('event_image', imageUri);
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setImageLoading(false);
    }
  };

  const removeImage = () => {
    updateFormData('event_image', '');
  };

  const addTicketType = () => {
    setTicketTypes([...ticketTypes, { type: '', price: '', quantity: '', enabled: true }]);
  };

  const removeTicketType = (index) => {
    if (ticketTypes.length > 1) {
      setTicketTypes(ticketTypes.filter((_, i) => i !== index));
    }
  };

  const updateTicketType = (index, field, value) => {
    const updated = [...ticketTypes];
    updated[index][field] = value;
    setTicketTypes(updated);
  };

  const toggleTicketType = (index) => {
    const updated = [...ticketTypes];
    updated[index].enabled = !updated[index].enabled;
    setTicketTypes(updated);
  };

  // Calculate revenue for a specific ticket type
  const calculateTicketRevenue = (ticket) => {
    if (!ticket.enabled) return 0;
    const price = parseFloat(ticket.price) || 0;
    const quantity = parseInt(ticket.quantity) || 0;
    return price * quantity;
  };

  // Calculate total expected revenue
  const calculateExpectedRevenue = () => {
    return ticketTypes.reduce((total, ticket) => {
      return total + calculateTicketRevenue(ticket);
    }, 0);
  };

  // Calculate total capacity
  const calculateTotalCapacity = () => {
    return ticketTypes.reduce((total, ticket) => {
      if (!ticket.enabled) return total;
      return total + (parseInt(ticket.quantity) || 0);
    }, 0);
  };

  // Calculate average ticket price
  const calculateAveragePrice = () => {
    const enabledTickets = ticketTypes.filter(t => t.enabled && t.price && t.quantity);
    if (enabledTickets.length === 0) return 0;
    
    const totalRevenue = calculateExpectedRevenue();
    const totalCapacity = calculateTotalCapacity();
    
    return totalCapacity > 0 ? totalRevenue / totalCapacity : 0;
  };

  const validateForm = () => {
    console.log('🔍 Validating form data...');

    if (!formData.event_name?.trim()) {
      Alert.alert('Validation Error', 'Please enter an event name');
      return false;
    }

    if (!formData.location?.trim()) {
      Alert.alert('Validation Error', 'Please enter a location');
      return false;
    }

    if (!formData.start_date || !formData.start_time) {
      Alert.alert('Validation Error', 'Please enter start date and time');
      return false;
    }

    if (!formData.end_date || !formData.end_time) {
      Alert.alert('Validation Error', 'Please enter end date and time');
      return false;
    }

    // Validate only enabled ticket types
    const enabledTickets = ticketTypes.filter(t => t.enabled);
    
    if (enabledTickets.length === 0) {
      Alert.alert('Validation Error', 'Please enable at least one ticket type');
      return false;
    }

    for (let i = 0; i < enabledTickets.length; i++) {
      const ticket = enabledTickets[i];
      
      if (!ticket.type?.trim()) {
        Alert.alert('Validation Error', `Please enter a name for ticket type ${i + 1}`);
        return false;
      }

      if (!ticket.price || isNaN(parseFloat(ticket.price)) || parseFloat(ticket.price) <= 0) {
        Alert.alert('Validation Error', `Please enter a valid price for ${ticket.type || `ticket type ${i + 1}`}`);
        return false;
      }

      if (!ticket.quantity || isNaN(parseInt(ticket.quantity)) || parseInt(ticket.quantity) <= 0) {
        Alert.alert('Validation Error', `Please enter a valid quantity for ${ticket.type || `ticket type ${i + 1}`}`);
        return false;
      }
    }

    console.log('✅ Form validation passed');
    return true;
  };

  const formatDateTime = (date, time) => {
    return `${date}T${time}:00Z`;
  };

  const handleSubmit = async () => {
    try {
      console.log('🚀 Submit button clicked');

      if (!validateForm()) {
        console.log('❌ Form validation failed');
        return;
      }

      setLoading(true);
      console.log('⏳ Setting loading state...');

      console.log('🔐 Getting auth header from context...');
      const authHeader = await getAuthHeader();
      console.log('🔑 Auth header retrieved:', authHeader ? 'Header exists' : 'No header');

      if (!authHeader || !authHeader.Authorization) {
        console.log('❌ No auth token available');
        Alert.alert('Error', 'Authentication required. Please log in again.');
        setLoading(false);
        return;
      }

      // Only include enabled ticket types
      const enabledTickets = ticketTypes.filter(t => t.enabled);

      const eventData = {
        event_name: formData.event_name.trim(),
        event_description: formData.event_description?.trim() || '',
        location: formData.location.trim(),
        start_date: formatDateTime(formData.start_date, formData.start_time),
        end_date: formatDateTime(formData.end_date, formData.end_time),
        event_image: formData.event_image?.trim() || null,
        currency: formData.currency || 'ZAR',
        event_status: 'VALIDATED',
        ticket_types: enabledTickets.map(ticket => ({
          type: ticket.type.trim(),
          price: parseFloat(ticket.price),
          quantity: parseInt(ticket.quantity)
        }))
      };

      console.log('📦 Prepared event data:', JSON.stringify(eventData, null, 2));
      console.log('🌐 Making API request to:', `${API_BASE_URL}/api/admin/events`);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        body: JSON.stringify(eventData)
      });

      console.log('📡 Response status:', response.status);

      const responseText = await response.text();
      console.log('📄 Response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        throw new Error('Invalid response from server');
      }

      console.log('📊 Parsed response data:', data);

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (data.success) {
        console.log('✅ Event created successfully:', data.event);
        
        Alert.alert(
          'Success',
          'Event created successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to Event Management with refresh flag
                navigation.navigate('Events', { 
                  refresh: true,
                  newEventId: data.event?.event_id 
                });
              }
            }
          ]
        );
      } else {
        throw new Error(data.error || 'Failed to create event');
      }

    } catch (error) {
      console.error('💥 Error creating event:', error);
      console.error('Error stack:', error.stack);
      
      Alert.alert(
        'Error',
        `Failed to create event: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      console.log('✅ Loading state cleared');
    }
  };

  const expectedRevenue = calculateExpectedRevenue();
  const totalCapacity = calculateTotalCapacity();
  const averagePrice = calculateAveragePrice();
  const enabledTicketCount = ticketTypes.filter(t => t.enabled).length;

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Event</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Event Image Section - Prominent at Top */}
          <View style={styles.imageSection}>
            <Text style={styles.imageSectionTitle}>Event Cover Image</Text>
            
            {!formData.event_image ? (
              <TouchableOpacity 
                style={styles.imagePlaceholder}
                onPress={pickImage}
                disabled={imageLoading}
              >
                {imageLoading ? (
                  <ActivityIndicator size="large" color="#6366f1" />
                ) : (
                  <>
                    <View style={styles.uploadIconContainer}>
                      <Ionicons name="cloud-upload" size={48} color="#6366f1" />
                    </View>
                    <Text style={styles.uploadTitle}>Upload Event Image</Text>
                    <Text style={styles.uploadSubtitle}>
                      Tap to select from gallery
                    </Text>
                    <Text style={styles.uploadHint}>
                      Recommended: 1920x1080 (16:9)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.imagePreviewContainer}>
                <Image 
                  source={{ uri: formData.event_image }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay}>
                  <TouchableOpacity 
                    style={styles.imageActionButton}
                    onPress={pickImage}
                  >
                    <Ionicons name="refresh" size={20} color="#fff" />
                    <Text style={styles.imageActionText}>Change</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.imageActionButton, styles.removeButton]}
                    onPress={removeImage}
                  >
                    <Ionicons name="trash" size={20} color="#fff" />
                    <Text style={styles.imageActionText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Event Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Event Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter event name"
                value={formData.event_name}
                onChangeText={(text) => updateFormData('event_name', text)}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter event description"
                value={formData.event_description}
                onChangeText={(text) => updateFormData('event_description', text)}
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter event location"
                value={formData.location}
                onChangeText={(text) => updateFormData('location', text)}
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          {/* Date & Time Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date & Time</Text>
            
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Start Date *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={formData.start_date}
                  onChangeText={(text) => updateFormData('start_date', text)}
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Start Time *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM"
                  value={formData.start_time}
                  onChangeText={(text) => updateFormData('start_time', text)}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>End Date *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={formData.end_date}
                  onChangeText={(text) => updateFormData('end_date', text)}
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>End Time *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM"
                  value={formData.end_time}
                  onChangeText={(text) => updateFormData('end_time', text)}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
          </View>

          {/* Ticket Types Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ticket Types</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={addTicketType}
              >
                <Ionicons name="add-circle" size={24} color="#6366f1" />
              </TouchableOpacity>
            </View>

            {ticketTypes.map((ticket, index) => (
              <View key={index} style={[
                styles.ticketTypeCard,
                !ticket.enabled && styles.ticketTypeCardDisabled
              ]}>
                <View style={styles.ticketTypeHeader}>
                  <View style={styles.ticketTypeTitleRow}>
                    <Text style={styles.ticketTypeTitle}>Ticket Type {index + 1}</Text>
                    <View style={styles.toggleContainer}>
                      <Text style={styles.toggleLabel}>
                        {ticket.enabled ? 'Enabled' : 'Disabled'}
                      </Text>
                      <Switch
                        value={ticket.enabled}
                        onValueChange={() => toggleTicketType(index)}
                        trackColor={{ false: '#cbd5e1', true: '#6366f1' }}
                        thumbColor={ticket.enabled ? '#fff' : '#f4f3f4'}
                      />
                    </View>
                  </View>
                  {ticketTypes.length > 1 && (
                    <TouchableOpacity onPress={() => removeTicketType(index)}>
                      <Ionicons name="trash" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={[styles.ticketTypeContent, !ticket.enabled && styles.disabledContent]}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Type Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., General, VIP"
                      value={ticket.type}
                      onChangeText={(text) => updateTicketType(index, 'type', text)}
                      placeholderTextColor="#94a3b8"
                      editable={ticket.enabled}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={styles.halfInput}>
                      <Text style={styles.label}>Price (ZAR) *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        value={ticket.price}
                        onChangeText={(text) => updateTicketType(index, 'price', text)}
                        keyboardType="decimal-pad"
                        placeholderTextColor="#94a3b8"
                        editable={ticket.enabled}
                      />
                    </View>
                    <View style={styles.halfInput}>
                      <Text style={styles.label}>Quantity *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        value={ticket.quantity}
                        onChangeText={(text) => updateTicketType(index, 'quantity', text)}
                        keyboardType="number-pad"
                        placeholderTextColor="#94a3b8"
                        editable={ticket.enabled}
                      />
                    </View>
                  </View>

                  {/* Revenue Preview for this ticket type */}
                  {ticket.enabled && ticket.price && ticket.quantity && (
                    <View style={styles.ticketRevenue}>
                      <Text style={styles.ticketRevenueLabel}>Expected Revenue:</Text>
                      <Text style={styles.ticketRevenueValue}>
                        R{calculateTicketRevenue(ticket).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}

            {/* Enhanced Summary Card */}
            {enabledTicketCount > 0 && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Event Summary</Text>
                
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Ionicons name="ticket" size={20} color="#6366f1" />
                    <Text style={styles.summaryLabel}>Active Tickets</Text>
                  </View>
                  <Text style={styles.summaryValue}>{enabledTicketCount}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Ionicons name="people" size={20} color="#10b981" />
                    <Text style={styles.summaryLabel}>Total Capacity</Text>
                  </View>
                  <Text style={styles.summaryValue}>{totalCapacity} tickets</Text>
                </View>

                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Ionicons name="pricetag" size={20} color="#f59e0b" />
                    <Text style={styles.summaryLabel}>Average Price</Text>
                  </View>
                  <Text style={styles.summaryValue}>R{averagePrice.toFixed(2)}</Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Ionicons name="cash" size={24} color="#6366f1" />
                    <Text style={styles.summaryLabelLarge}>Expected Revenue</Text>
                  </View>
                  <Text style={[styles.summaryValue, styles.revenueHighlight]}>
                    R{expectedRevenue.toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Create Event</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  imageSection: {
    marginBottom: 16,
  },
  imageSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  imagePlaceholder: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  },
  uploadIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  imagePreview: {
    width: '100%',
    height: 280,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  imageActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  removeButton: {
    backgroundColor: '#ef4444',
  },
  imageActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  addButton: {
    padding: 4,
  },
  ticketTypeCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  ticketTypeCardDisabled: {
    opacity: 0.6,
    borderColor: '#cbd5e1',
  },
  ticketTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ticketTypeTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 12,
  },
  ticketTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  ticketTypeContent: {
    opacity: 1,
  },
  disabledContent: {
    opacity: 0.5,
  },
  ticketRevenue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  ticketRevenueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  ticketRevenueValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  summaryLabelLarge: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  revenueHighlight: {
    fontSize: 22,
    color: '#6366f1',
  },
  submitButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CreateEventScreen;