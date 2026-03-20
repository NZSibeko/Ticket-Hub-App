import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

// Responsive scaling functions - matching LoginScreen
const scaleSize = (size) => {
  const scale = width / 375;
  return Math.ceil(size * Math.min(scale, 1.5));
};

const scaleFont = (size) => {
  const scale = width / 375;
  return Math.ceil(size * Math.min(scale, 1.3));
};

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
        [{ text: 'OK', onPress: () => navigation.replace('MainApp') }]
      );
    } else {
      Alert.alert('Registration Failed', result.error || 'Please try again');
    }
  };

  // Calculate responsive widths
  const getCardWidth = () => {
    if (width >= 768) {
      return Math.min(width - 80, 400);
    }
    return width - 32;
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Logo Section */}
            <View style={styles.logoContainer}>
              <View style={styles.logoPlaceholder}>
                <Ionicons name="person-add" size={scaleSize(50)} color="#000" />
              </View>
              <Text style={styles.appTitle}>Join Ticket-Hub</Text>
              <Text style={styles.appSubtitle}>Create your account to get started</Text>
            </View>

            {/* Registration Form Card */}
            <View style={[styles.formContainer, { width: getCardWidth() }]}>
              <Text style={styles.welcomeText}>Create Account</Text>
              <Text style={styles.instructionText}>Fill in your details to register</Text>

              {/* First Name Input */}
              <View style={styles.inputContainer}>
                <View style={[
                  styles.inputWrapper,
                  errors.firstName && styles.inputWrapperError
                ]}>
                  <Ionicons name="person-outline" size={scaleFont(20)} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="First name"
                    placeholderTextColor="#94a3b8"
                    value={form.firstName}
                    onChangeText={text => handleChange('firstName', text)}
                    editable={!isLoading}
                  />
                </View>
                {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
              </View>

              {/* Last Name Input */}
              <View style={styles.inputContainer}>
                <View style={[
                  styles.inputWrapper,
                  errors.lastName && styles.inputWrapperError
                ]}>
                  <Ionicons name="person-outline" size={scaleFont(20)} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Last name"
                    placeholderTextColor="#94a3b8"
                    value={form.lastName}
                    onChangeText={text => handleChange('lastName', text)}
                    editable={!isLoading}
                  />
                </View>
                {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <View style={[
                  styles.inputWrapper,
                  errors.email && styles.inputWrapperError
                ]}>
                  <Ionicons name="mail-outline" size={scaleFont(20)} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Email address"
                    placeholderTextColor="#94a3b8"
                    value={form.email}
                    onChangeText={text => handleChange('email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                </View>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              {/* Phone Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={scaleFont(20)} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Phone number (optional)"
                    placeholderTextColor="#94a3b8"
                    value={form.phone}
                    onChangeText={text => handleChange('phone', text)}
                    keyboardType="phone-pad"
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <View style={[
                  styles.inputWrapper,
                  errors.password && styles.inputWrapperError
                ]}>
                  <Ionicons name="lock-closed-outline" size={scaleFont(20)} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Password"
                    placeholderTextColor="#94a3b8"
                    value={form.password}
                    onChangeText={text => handleChange('password', text)}
                    secureTextEntry
                    editable={!isLoading}
                  />
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <View style={[
                  styles.inputWrapper,
                  errors.confirmPassword && styles.inputWrapperError
                ]}>
                  <Ionicons name="lock-closed-outline" size={scaleFont(20)} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Confirm password"
                    placeholderTextColor="#94a3b8"
                    value={form.confirmPassword}
                    onChangeText={text => handleChange('confirmPassword', text)}
                    secureTextEntry
                    editable={!isLoading}
                  />
                </View>
                {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
              </View>

              {/* Create Account Button */}
              <TouchableOpacity
                style={[
                  styles.registerButton,
                  isLoading && styles.registerButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.registerButtonText}>Creating Account...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Ionicons name="person-add-outline" size={scaleFont(20)} color="#fff" />
                    <Text style={styles.registerButtonText}>Create Account</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Login Section */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account?</Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('Login')}
                  disabled={isLoading}
                >
                  <Text style={styles.loginLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms and Privacy */}
            <View style={[styles.termsContainer, { width: getCardWidth() }]}>
              <Text style={styles.termsText}>
                By creating an account, you agree to our{' '}
                <Text 
                  style={styles.termsLink}
                  onPress={() => navigation.navigate('TermsConditions')}
                >
                  Terms
                </Text>{' '}
                and{' '}
                <Text 
                  style={styles.termsLink}
                  onPress={() => navigation.navigate('PrivacyPolicy')}
                >
                  Privacy Policy
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: scaleSize(100),
    height: scaleSize(100),
    borderRadius: scaleSize(50),
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  appTitle: {
    fontSize: scaleFont(24),
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: scaleFont(16),
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: scaleFont(22),
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: scaleFont(14),
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputWrapperError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: scaleFont(16),
    color: '#000',
    padding: 0,
  },
  errorText: {
    color: '#ef4444',
    fontSize: scaleFont(12),
    marginTop: 4,
    marginLeft: 4,
  },
  registerButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  registerButtonDisabled: {
    backgroundColor: '#6b7280',
    shadowOpacity: 0.1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: scaleFont(14),
    color: '#64748b',
    fontWeight: '500',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  loginText: {
    color: '#64748b',
    fontSize: scaleFont(14),
  },
  loginLink: {
    color: '#000',
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  termsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  termsText: {
    color: '#64748b',
    fontSize: scaleFont(12),
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: '#000',
    fontWeight: '500',
  },
});

export default RegistrationScreen;

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
