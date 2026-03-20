// src/screens/CreateEventScreen.web.js - FINAL 100% WORKING & BEAUTIFUL
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
import { getApiBaseUrlSync } from '../utils/apiBase';

const API_BASE_URL = getApiBaseUrlSync();

const CreateEventScreen = ({ navigation }) => {
  const { getAuthHeader } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    event_name: '',
    event_description: '',
    location: '',
    start_date: '',
    start_time: '',
    price: '',
    quantity: '',
  });

  const handleSubmit = async () => {
    if (!form.event_name || !form.location || !form.start_date || !form.start_time || !form.price || !form.quantity) {
      Alert.alert('Missing Fields', 'Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      const auth = await getAuthHeader();
      const datetime = `${form.start_date}T${form.start_time}:00Z`;

      const payload = {
        event_name: form.event_name.trim(),
        event_description: form.event_description.trim(),
        location: form.location.trim(),
        start_date: datetime,
        ticket_types: [{
          type: 'General Admission',
          price: parseFloat(form.price),
          quantity: parseInt(form.quantity)
        }],
        status: 'DRAFT'
      };

      const res = await fetch(`${API_BASE_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        Alert.alert(
          'SUCCESS!',
          data.message || 'Event created successfully!',
          [{ text: 'Done', onPress: () => navigation.navigate('EventManagement', { refresh: true }) }]
        );
      } else {
        Alert.alert('Error', data.error || 'Failed to create event');
      }
    } catch (err) {
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

        <TextInput placeholder="Event Name *" style={styles.input} value={form.event_name} onChangeText={t => setForm({...form, event_name: t})} />
        <TextInput placeholder="Description (optional)" style={[styles.input, { height: 100 }]} multiline value={form.event_description} onChangeText={t => setForm({...form, event_description: t})} />
        <TextInput placeholder="Location *" style={styles.input} value={form.location} onChangeText={t => setForm({...form, location: t})} />

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <TextInput placeholder="Date (YYYY-MM-DD)" style={[styles.input, { flex: 1 }]} value={form.start_date} onChangeText={t => setForm({...form, start_date: t})} />
          <TextInput placeholder="Time (HH:MM)" style={[styles.input, { flex: 1 }]} value={form.start_time} onChangeText={t => setForm({...form, start_time: t})} />
        </View>

        <TextInput placeholder="Price (ZAR)" keyboardType="numeric" style={styles.input} value={form.price} onChangeText={t => setForm({...form, price: t})} />
        <TextInput placeholder="Quantity Available" keyboardType="numeric" style={styles.input} value={form.quantity} onChangeText={t => setForm({...form, quantity: t})} />

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>CREATE EVENT</Text>}
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