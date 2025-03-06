import React, { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import AppNavigator from './navigation/AppNavigator';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  useEffect(() => {
    // Request notification permissions
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('You need to enable notifications for deadline reminders!');
      }
    };
    requestPermissions();
  }, []);

  return <AppNavigator />;
}