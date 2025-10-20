import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import ScreenContainer from '../components/ScreenContainer';

const CreateEventScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
    maxAttendees: '',
    price: '',
    isPublic: true,
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // For web - use native datetime-local input
  const handleStartDateChange = (event) => {
    const date = new Date(event.target.value);
    setFormData({...formData, startDate: date});
  };

  const handleEndDateChange = (event) => {
    const date = new Date(event.target.value);
    setFormData({...formData, endDate: date});
  };

  // Format date for datetime-local input
  const formatDateForInput = (date) => {
    return date.toISOString().slice(0, 16);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.location || !formData.maxAttendees) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.startDate >= formData.endDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      Alert.alert('Success', 'Event created successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ScreenContainer>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter event name"
              value={formData.name}
              onChangeText={(text) => setFormData({...formData, name: text})}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your event"
              value={formData.description}
              onChangeText={(text) => setFormData({...formData, description: text})}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter event location"
              value={formData.location}
              onChangeText={(text) => setFormData({...formData, location: text})}
            />
          </View>
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date & Time</Text>
          
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Start Date & Time *</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="datetime-local"
                  style={styles.webDateInput}
                  value={formatDateForInput(formData.startDate)}
                  onChange={handleStartDateChange}
                />
              ) : (
                <TouchableOpacity 
                  style={styles.dateInput}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={styles.dateText}>{formatDateTime(formData.startDate)}</Text>
                  <Ionicons name="calendar" size={20} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.halfInput}>
              <Text style={styles.label}>End Date & Time *</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="datetime-local"
                  style={styles.webDateInput}
                  value={formatDateForInput(formData.endDate)}
                  onChange={handleEndDateChange}
                />
              ) : (
                <TouchableOpacity 
                  style={styles.dateInput}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={styles.dateText}>{formatDateTime(formData.endDate)}</Text>
                  <Ionicons name="calendar" size={20} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Native DateTimePickers for mobile */}
          {!Platform.OS === 'web' && showStartDatePicker && (
            <DateTimePicker
              value={formData.startDate}
              mode="datetime"
              onChange={(event, date) => {
                setShowStartDatePicker(false);
                if (date) setFormData({...formData, startDate: date});
              }}
            />
          )}

          {!Platform.OS === 'web' && showEndDatePicker && (
            <DateTimePicker
              value={formData.endDate}
              mode="datetime"
              onChange={(event, date) => {
                setShowEndDatePicker(false);
                if (date) setFormData({...formData, endDate: date});
              }}
            />
          )}
        </View>

        {/* Ticket Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ticket Information</Text>
          
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Max Attendees *</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                value={formData.maxAttendees}
                onChangeText={(text) => setFormData({...formData, maxAttendees: text})}
              />
            </View>

            <View style={styles.halfInput}>
              <Text style={styles.label}>Ticket Price (R)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={formData.price}
                onChangeText={(text) => setFormData({...formData, price: text})}
              />
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Public Event</Text>
              <Text style={styles.settingDescription}>
                Make this event visible to all users
              </Text>
            </View>
            <Switch
              value={formData.isPublic}
              onValueChange={(value) => setFormData({...formData, isPublic: value})}
              trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
              thumbColor={formData.isPublic ? '#fff' : '#fff'}
            />
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity 
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Event</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  submitButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  dateText: {
    fontSize: 16,
    color: '#1e293b',
  },
  webDateInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    fontFamily: 'System',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  createButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CreateEventScreen;