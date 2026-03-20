import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator, MaterialTopTabNavigationOptions } from '@react-navigation/material-top-tabs';
import React, { FC } from 'react';
import { useAuth } from '../context/AuthContext'; // Import the newly typed context

// Import screens you want event managers to see
import CreateEventScreen from '../screens/CreateEventScreen.web';
import EventManagementScreen from '../screens/EventManagementScreen.web';
import ProfileScreen from '../screens/ProfileScreen.web';
// ... add more screens as needed

const TopTab = createMaterialTopTabNavigator();

interface EventManagerTabNavigatorProps {
  // Add any specific props here if needed, but likely none for a simple context consumer
}

const EventManagerTabs: FC<EventManagerTabNavigatorProps> = () => {
  const { isEventManager } = useAuth();
  const userIsEventManager = isEventManager();

  // Define options outside the component if they don't depend on state, or use a consistent type
  const screenOptions: MaterialTopTabNavigationOptions = {
    tabBarStyle: { backgroundColor: '#fff' },
    tabBarActiveTintColor: '#6366f1',
    tabBarInactiveTintColor: '#6b7280',
    tabBarIndicatorStyle: { backgroundColor: '#6366f1' },
  };
  
  if (!userIsEventManager) {
      // If this component is accidentally rendered for the wrong user, navigate them away or show an error/empty view.
      // For simplicity in this conversion, we return null or an empty view, assuming a higher-level router handles navigation.
      return null; 
  }

  return (
    <TopTab.Navigator
      screenOptions={screenOptions}
    >
      <TopTab.Screen
        name="Events"
        component={EventManagementScreen}
        options={{
          title: 'Events',
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color as string} />,
        }}
      />
      <TopTab.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{
          title: 'Create',
          tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={24} color={color as string} />,
        }}
      />
      <TopTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color as string} />,
        }}
      />
    </TopTab.Navigator>
  );
};

export default EventManagerTabs;