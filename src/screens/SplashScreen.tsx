import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';

const SplashScreen = ({ navigation }) => {
  const { user, loading } = useAuth();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.3);

  useEffect(() => {
    // Animate logo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Check authentication after animation
    const timer = setTimeout(() => {
      if (!loading) {
        if (user) {
          navigation.replace('Home');
        } else {
          navigation.replace('Login');
        }
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [loading, user]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>LOGO</Text>
        </View>
        <Text style={styles.appName}>Ticket-hub</Text>
        <Text style={styles.appTagline}>Your Gateway to Amazing Events</Text>
      </Animated.View>

      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>

      <Text style={styles.versionText}>Version 1.0.0</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 100,
  },
  logoCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#000000',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  appTagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 14,
  },
  versionText: {
    position: 'absolute',
    bottom: 30,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
});

export default SplashScreen;

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
