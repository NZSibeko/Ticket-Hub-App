import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' }
];

const LanguageSelector = () => {
  const { i18n } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = async (languageCode) => {
    await i18n.changeLanguage(languageCode);
    await AsyncStorage.setItem('language', languageCode);
    setModalVisible(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.selectorText}>
          {currentLanguage.flag} {currentLanguage.name}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Language</Text>
            {languages.map(language => (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageOption,
                  i18n.language === language.code && styles.languageOptionSelected
                ]}
                onPress={() => changeLanguage(language.code)}
              >
                <Text style={styles.languageFlag}>{language.flag}</Text>
                <Text style={styles.languageName}>{language.name}</Text>
                {i18n.language === language.code && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  selector: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  selectorText: {
    fontSize: 14,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '80%',
    maxWidth: 350,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
  },
  languageOptionSelected: {
    backgroundColor: '#E8EAF6',
    borderWidth: 2,
    borderColor: '#6200ee',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 15,
  },
  languageName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  checkmark: {
    fontSize: 20,
    color: '#6200ee',
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#6200ee',
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LanguageSelector; 