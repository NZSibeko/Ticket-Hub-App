import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  StyleSheet, 
  Alert, 
  ScrollView,
  TouchableOpacity,
  ActivityIndicator 
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const RegistrationScreen = ({ navigation }) => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form');
      return;
    }

    setIsLoading(true);
    const result = await register(form);
    setIsLoading(false);

    if (result.success) {
      Alert.alert(
        'Registration Successful', 
        'Your account has been created successfully!',
        [{ text: 'OK', onPress: () => navigation.replace('Home') }]
      );
    } else {
      Alert.alert('Registration Failed', result.error || 'Please try again');
    }
  };

  const getInputStyle = (fieldName) => {
    return errors[fieldName] ? [styles.input, styles.inputError] : styles.input;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join our event ticketing platform</Text>
      
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={getInputStyle('firstName')}
            placeholder="Enter your first name"
            value={form.firstName}
            onChangeText={text => handleChange('firstName', text)}
            editable={!isLoading}
          />
          {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Last Name *</Text>
          <TextInput
            style={getInputStyle('lastName')}
            placeholder="Enter your last name"
            value={form.lastName}
            onChangeText={text => handleChange('lastName', text)}
            editable={!isLoading}
          />
          {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={getInputStyle('email')}
            placeholder="Enter your email"
            value={form.email}
            onChangeText={text => handleChange('email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your phone number"
            value={form.phone}
            onChangeText={text => handleChange('phone', text)}
            keyboardType="phone-pad"
            editable={!isLoading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password *</Text>
          <TextInput
            style={getInputStyle('password')}
            placeholder="Create a password"
            value={form.password}
            onChangeText={text => handleChange('password', text)}
            secureTextEntry
            editable={!isLoading}
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password *</Text>
          <TextInput
            style={getInputStyle('confirmPassword')}
            placeholder="Confirm your password"
            value={form.confirmPassword}
            onChangeText={text => handleChange('confirmPassword', text)}
            secureTextEntry
            editable={!isLoading}
          />
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={isLoading}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 20,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  form: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    paddingHorizontal: 15,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  inputError: {
    borderColor: '#ff4444',
    backgroundColor: '#fffafa',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#000000',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default RegistrationScreen;