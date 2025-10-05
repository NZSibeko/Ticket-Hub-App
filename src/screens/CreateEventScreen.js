import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:3000';

const CreateEventScreen = ({ navigation }) => {
  const [form, setForm] = useState({
    event_name: '',
    event_description: '',
    start_date: '',
    end_date: '',
    location: '',
    max_attendees: '',
    price: '',
    currency: 'USD'
  });
  const [loading, setLoading] = useState(false);
  const { getAuthHeader } = useAuth();

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
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
    if (!form.max_attendees || isNaN(form.max_attendees)) {
      Alert.alert('Error', 'Valid max attendees number is required');
      return false;
    }
    if (!form.price || isNaN(form.price)) {
      Alert.alert('Error', 'Valid price is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const headers = getAuthHeader();
      const response = await axios.post(
        `${API_URL}/api/admin/events`,
        {
          ...form,
          max_attendees: parseInt(form.max_attendees),
          price: parseFloat(form.price)
        },
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

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Max Attendees *</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              value={form.max_attendees}
              onChangeText={text => handleChange('max_attendees', text)}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Price *</Text>
            <TextInput
              style={styles.input}
              placeholder="50.00"
              value={form.price}
              onChangeText={text => handleChange('price', text)}
              keyboardType="decimal-pad"
            />
          </View>
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