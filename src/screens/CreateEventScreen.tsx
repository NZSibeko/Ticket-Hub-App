import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrlSync } from '../utils/apiBase';

const API_URL = getApiBaseUrlSync();

const TICKET_TYPES = [
  { id: 'early_bird', label: 'Early Bird', icon: 'alarm-outline' },
  { id: 'general', label: 'General', icon: 'person-outline' },
  { id: 'family_group', label: 'Family/Group', icon: 'people-outline' },
  { id: 'vip', label: 'VIP', icon: 'star-outline' },
  { id: 'vvip', label: 'VVIP', icon: 'diamond-outline' }
];

const CreateEventScreen = ({ navigation }) => {
  const [form, setForm] = useState({
    event_name: '',
    event_description: '',
    start_date: '',
    end_date: '',
    location: '',
    max_attendees: '',
    currency: 'ZAR'
  });
  
  const [ticketTypes, setTicketTypes] = useState({
    early_bird: { enabled: false, price: '', quantity: '' },
    general: { enabled: true, price: '', quantity: '' },
    family_group: { enabled: false, price: '', quantity: '' },
    vip: { enabled: false, price: '', quantity: '' },
    vvip: { enabled: false, price: '', quantity: '' }
  });
  
  const [loading, setLoading] = useState(false);
  const { getAuthHeader } = useAuth();

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleTicketTypeChange = (type, field, value) => {
    setTicketTypes(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const toggleTicketType = (type) => {
    setTicketTypes(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        enabled: !prev[type].enabled,
        price: !prev[type].enabled ? prev[type].price || '' : '',
        quantity: !prev[type].enabled ? prev[type].quantity || '' : ''
      }
    }));
  };

  const validateForm = () => {
    if (!form.event_name) {
      Alert.alert('Error', 'Event name is required');
      return false;
    }
    if (!form.start_date || !form.end_date) {
      Alert.alert('Error', 'Start and end dates are required');
      return false;
    }
    if (!form.location) {
      Alert.alert('Error', 'Location is required');
      return false;
    }

    // Check if at least one ticket type is enabled
    const enabledTypes = Object.values(ticketTypes).filter(type => type.enabled);
    if (enabledTypes.length === 0) {
      Alert.alert('Error', 'At least one ticket type must be enabled');
      return false;
    }

    // Validate enabled ticket types
    for (const [type, config] of Object.entries(ticketTypes)) {
      if (config.enabled) {
        if (!config.price || isNaN(config.price) || parseFloat(config.price) < 0) {
          Alert.alert('Error', `Valid price is required for ${TICKET_TYPES.find(t => t.id === type)?.label}`);
          return false;
        }
        if (!config.quantity || isNaN(config.quantity) || parseInt(config.quantity) <= 0) {
          Alert.alert('Error', `Valid quantity is required for ${TICKET_TYPES.find(t => t.id === type)?.label}`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const headers = getAuthHeader();
      
      // Filter enabled ticket types and format data
      const enabledTicketTypes = Object.entries(ticketTypes)
        .filter(([_, config]) => config.enabled)
        .map(([type, config]) => ({
          type,
          price: parseFloat(config.price),
          quantity: parseInt(config.quantity),
          available_quantity: parseInt(config.quantity)
        }));

      const eventData = {
        ...form,
        max_attendees: parseInt(form.max_attendees) || 0,
        ticket_types: enabledTicketTypes
      };

      const response = await axios.post(
        `${API_URL}/api/admin/events`,
        eventData,
        { headers }
      );

      if (response.data.success) {
        Alert.alert(
          'Success',
          'Event created successfully!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const TicketTypeCard = ({ type, config }) => {
    const typeInfo = TICKET_TYPES.find(t => t.id === type);
    
    return (
      <View style={styles.ticketTypeCard}>
        <View style={styles.ticketTypeHeader}>
          <View style={styles.ticketTypeInfo}>
            <Ionicons name={typeInfo.icon} size={24} color="#000" />
            <Text style={styles.ticketTypeLabel}>{typeInfo.label}</Text>
          </View>
          <Switch
            value={config.enabled}
            onValueChange={() => toggleTicketType(type)}
            trackColor={{ false: '#f0f0f0', true: '#6200ee' }}
            thumbColor={config.enabled ? '#fff' : '#f4f3f4'}
          />
        </View>

        {config.enabled && (
          <View style={styles.ticketTypeFields}>
            <View style={styles.ticketTypeRow}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Price (ZAR)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={config.price}
                  onChangeText={text => handleTicketTypeChange(type, 'price', text)}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  placeholder="100"
                  value={config.quantity}
                  onChangeText={text => handleTicketTypeChange(type, 'quantity', text)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Create New Event</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Event Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter event name"
            value={form.event_name}
            onChangeText={text => handleChange('event_name', text)}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter event description"
            value={form.event_description}
            onChangeText={text => handleChange('event_description', text)}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Start Date *</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD HH:mm"
              value={form.start_date}
              onChangeText={text => handleChange('start_date', text)}
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>End Date *</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD HH:mm"
              value={form.end_date}
              onChangeText={text => handleChange('end_date', text)}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter event location"
            value={form.location}
            onChangeText={text => handleChange('location', text)}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Max Attendees</Text>
          <TextInput
            style={styles.input}
            placeholder="1000"
            value={form.max_attendees}
            onChangeText={text => handleChange('max_attendees', text)}
            keyboardType="numeric"
          />
        </View>

        {/* Ticket Types Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ticket Types</Text>
          <Text style={styles.sectionSubtitle}>
            Enable and configure different ticket types for your event
          </Text>

          {TICKET_TYPES.map(type => (
            <TicketTypeCard
              key={type.id}
              type={type.id}
              config={ticketTypes[type.id]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ): (
            <Text style={styles.submitButtonText}>Create Event</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    paddingHorizontal: 15,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  ticketTypeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  ticketTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ticketTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  ticketTypeFields: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  ticketTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  submitButton: {
    backgroundColor: '#6200ee',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreateEventScreen;