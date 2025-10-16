// Mock for expo-camera on web
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const Camera = ({ children, ...props }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Camera not available on web</Text>
      {children}
    </View>
  );
};

export const CameraType = {
  back: 'back',
  front: 'front',
};

export const FlashMode = {
  on: 'on',
  off: 'off',
  auto: 'auto',
  torch: 'torch',
};

export const BarCodeScanner = {
  Constants: {
    BarCodeType: {
      qr: 'qr',
    },
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
});

export default Camera;