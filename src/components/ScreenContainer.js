import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';

const ScreenContainer = ({ children, style }) => {
  useEffect(() => {
    // Remove body margins and padding for web
    if (typeof document !== 'undefined') {
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.documentElement.style.margin = '0';
      document.documentElement.style.padding = '0';
      document.body.style.overflowX = 'hidden';
    }
  }, []);

  return (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
  },
});

export default ScreenContainer;