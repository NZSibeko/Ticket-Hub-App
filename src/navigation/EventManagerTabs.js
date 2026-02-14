// src/navigation/EventManagerTabs.js
import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

// Import screens you want event managers to see
// Adjust these imports to match your actual screen files
import CreateEventScreen from '../screens/CreateEventScreen.web';
import EventManagementScreen from '../screens/EventManagementScreen.web';
import ProfileScreen from '../screens/ProfileScreen.web';
// ... add more screens as needed

const TopTab = createMaterialTopTabNavigator();

const EventManagerTabs = () => {
  return (
    <TopTab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: '#fff' },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#6b7280',
        tabBarIndicatorStyle: { backgroundColor: '#6366f1' },
      }}
    >
      <TopTab.Screen
        name="Events"
        component={EventManagementScreen}
        options={{
          title: 'Events',
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color} />,
        }}
      />
      <TopTab.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{
          title: 'Create',
          tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={24} color={color} />,
        }}
      />
      <TopTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
    </TopTab.Navigator>
  );
};

export default EventManagerTabs;