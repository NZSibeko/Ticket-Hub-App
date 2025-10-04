import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Image, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import ODataService from '../services/ODataService';
import * as ImagePicker from 'expo-image-picker';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const data = await ODataService.get('zi_customer_faces', {
          $filter: `customer_id eq '${user.customer_id}'`
        });
        if (data.length > 0) {
          setProfile(data[0]);
          setImage(data[0].profile_picture);
        }
      } catch (error) {
        console.error('Profile fetch error:', error);
        Alert.alert('Error', 'Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      // In a real app, you would use PATCH to update only changed fields
      await ODataService.post('zi_customer_faces', profile);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Profile save error:', error);
      Alert.alert('Error', 'Failed to update profile');
        } finally {
          setSaving(false);
        }
      };
    
      // Add your component's return statement here
      if (loading) {
        return (
          <View style={styles.container}>
            <ActivityIndicator size="large" />
          </View>
        );
      }
    
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Profile</Text>
          {image && (
            <Image source={{ uri: image }} style={styles.profileImage} />
          )}
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={profile?.name || ''}
            onChangeText={text => handleChange('name', text)}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={profile?.email || ''}
            onChangeText={text => handleChange('email', text)}
          />
          <Button title={saving ? "Saving..." : "Save"} onPress={handleSave} disabled={saving} />
          <Button title="Logout" onPress={logout} color="red" />
        </View>
      );
    };
    
    const styles = StyleSheet.create({
      container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
      },
      title: {
        fontSize: 24,
        marginBottom: 16,
      },
      profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 16,
      },
      input: {
        width: '100%',
        padding: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        marginBottom: 12,
      },
    });
    
    export default ProfileScreen;