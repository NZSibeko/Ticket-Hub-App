// src/screens/CreateEventScreen.web.js - UPDATED VERSION
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:3000';

const CreateEventScreen = ({ navigation }) => {
  const { user, getAuthHeader } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    event_name: '',
    event_description: '',
    location: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    price: '',
    quantity: '',
    category: 'general',
    event_type: 'physical', // physical or virtual
  });

  const isEventOrganizer = user?.role?.toLowerCase() === 'event_organizer';

  const handleSubmit = async () => {
    // Validation
    const requiredFields = ['event_name', 'location', 'start_date', 'start_time', 'price', 'quantity'];
    const missingFields = requiredFields.filter(field => !form[field]);
    
    if (missingFields.length > 0) {
      Alert.alert('Missing Fields', 'Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      const auth = await getAuthHeader();
      const startDatetime = `${form.start_date}T${form.start_time}:00Z`;
      const endDatetime = form.end_date && form.end_time 
        ? `${form.end_date}T${form.end_time}:00Z`
        : `${form.start_date}T23:59:59Z`;

      // Set status based on user role
      let status = 'DRAFT';
      if (isEventOrganizer) {
        status = 'PENDING_APPROVAL'; // Events by organizers need approval
      } else if (user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'event_manager') {
        status = 'PUBLISHED'; // Admins and event managers can publish directly
      }

      const payload = {
        event_name: form.event_name.trim(),
        event_description: form.event_description.trim(),
        location: form.location.trim(),
        start_date: startDatetime,
        end_date: endDatetime,
        ticket_types: [{
          type: 'General Admission',
          price: parseFloat(form.price),
          quantity: parseInt(form.quantity)
        }],
        category: form.category,
        event_type: form.event_type,
        status: status,
        organizer_id: user.user_id, // Track who created the event
        requires_approval: isEventOrganizer // Flag for approval workflow
      };

      console.log('Creating event with payload:', payload);

      const res = await fetch(`${API_BASE_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        let alertMessage = 'Event created successfully!';
        let alertTitle = 'SUCCESS!';
        
        if (isEventOrganizer) {
          alertMessage = 'Event submitted for approval. An admin will review it shortly.';
          alertTitle = 'SUBMITTED FOR APPROVAL';
        }

        Alert.alert(
          alertTitle,
          alertMessage,
          [{ 
            text: 'Done', 
            onPress: () => {
              if (isEventOrganizer) {
                navigation.navigate('EventOrganizerTools');
              } else {
                navigation.navigate('EventManagement', { refresh: true });
              }
            }
          }]
        );
      } else {
        Alert.alert('Error', data.error || 'Failed to create event');
      }
    } catch (err) {
      console.error('Error creating event:', err);
      Alert.alert('Network Error', 'Please check your connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView style={{ padding: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#6366f1' }}>
          Create New Event
        </Text>

        {isEventOrganizer && (
          <View style={styles.approvalNotice}>
            <Text style={styles.approvalNoticeText}>
              ⓘ Events created by organizers require admin approval before being published.
            </Text>
          </View>
        )}

        <TextInput 
          placeholder="Event Name *" 
          style={styles.input} 
          value={form.event_name} 
          onChangeText={t => setForm({...form, event_name: t})} 
        />
        
        <TextInput 
          placeholder="Description (optional)" 
          style={[styles.input, { height: 100 }]} 
          multiline 
          value={form.event_description} 
          onChangeText={t => setForm({...form, event_description: t})} 
        />
        
        <TextInput 
          placeholder="Location *" 
          style={styles.input} 
          value={form.location} 
          onChangeText={t => setForm({...form, location: t})} 
        />

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <TextInput 
            placeholder="Start Date (YYYY-MM-DD)" 
            style={[styles.input, { flex: 1 }]} 
            value={form.start_date} 
            onChangeText={t => setForm({...form, start_date: t})} 
          />
          <TextInput 
            placeholder="Start Time (HH:MM)" 
            style={[styles.input, { flex: 1 }]} 
            value={form.start_time} 
            onChangeText={t => setForm({...form, start_time: t})} 
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <TextInput 
            placeholder="End Date (optional)" 
            style={[styles.input, { flex: 1 }]} 
            value={form.end_date} 
            onChangeText={t => setForm({...form, end_date: t})} 
          />
          <TextInput 
            placeholder="End Time (optional)" 
            style={[styles.input, { flex: 1 }]} 
            value={form.end_time} 
            onChangeText={t => setForm({...form, end_time: t})} 
          />
        </View>

        <TextInput 
          placeholder="Price (ZAR)" 
          keyboardType="numeric" 
          style={styles.input} 
          value={form.price} 
          onChangeText={t => setForm({...form, price: t})} 
        />
        
        <TextInput 
          placeholder="Quantity Available" 
          keyboardType="numeric" 
          style={styles.input} 
          value={form.quantity} 
          onChangeText={t => setForm({...form, quantity: t})} 
        />

        {/* Event Type Selection */}
        <View style={styles.optionGroup}>
          <Text style={styles.optionLabel}>Event Type</Text>
          <View style={styles.optionButtons}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                form.event_type === 'physical' && styles.optionButtonActive
              ]}
              onPress={() => setForm({...form, event_type: 'physical'})}
            >
              <Text style={[
                styles.optionButtonText,
                form.event_type === 'physical' && styles.optionButtonTextActive
              ]}>
                Physical Event
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.optionButton,
                form.event_type === 'virtual' && styles.optionButtonActive
              ]}
              onPress={() => setForm({...form, event_type: 'virtual'})}
            >
              <Text style={[
                styles.optionButtonText,
                form.event_type === 'virtual' && styles.optionButtonTextActive
              ]}>
                Virtual Event
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Selection */}
        <View style={styles.optionGroup}>
          <Text style={styles.optionLabel}>Category</Text>
          <View style={styles.categoryButtons}>
            {['music', 'food', 'tech', 'sports', 'arts', 'comedy', 'workshop', 'other'].map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  form.category === category && styles.categoryButtonActive
                ]}
                onPress={() => setForm({...form, category})}
              >
                <Text style={[
                  styles.categoryButtonText,
                  form.category === category && styles.categoryButtonTextActive
                ]}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleSubmit} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isEventOrganizer ? 'SUBMIT FOR APPROVAL' : 'CREATE EVENT'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = {
  input: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  approvalNotice: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  approvalNoticeText: {
    color: '#92400e',
    fontSize: 14,
    textAlign: 'center',
  },
  optionGroup: {
    marginBottom: 20,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  optionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  optionButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  categoryButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#374151',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#6366f1',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
};

export default CreateEventScreen;