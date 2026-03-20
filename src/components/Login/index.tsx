```tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import axios from 'axios';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      const response = await AuthService.login(username, password);
      if (response.data.success) {
        onLogin();
      } else {
        alert('Invalid credentials');
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('An error occurred. Please try again.');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Login</Text>
      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={{ marginBottom: 20 }}
      />
      <TextInput
        secureTextEntry
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={{ marginBottom: 20 }}
      />
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
};

export default Login;
```