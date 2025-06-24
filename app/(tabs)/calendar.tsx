import React from 'react';
import { CalendarScreen } from '../../src/screens/CalendarScreen';
import { useRouter } from 'expo-router';

export default function CalendarTab() {
  const router = useRouter();

  // Create a navigation object that matches the expected interface
  const navigation = {
    goBack: () => router.back(),
    navigate: (screen: string) => {
      switch (screen) {
        case 'Settings':
          router.push('/(tabs)/settings');
          break;
        case 'CreateChore':
          // TODO: Navigate to create chore modal
          console.log('Navigate to CreateChore');
          break;
        default:
          console.log('Navigate to:', screen);
      }
    },
  };

  return <CalendarScreen navigation={navigation} />;
} 