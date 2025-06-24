import React from 'react';
import { SettingsScreen } from '../../src/screens/SettingsScreen';
import { useRouter } from 'expo-router';

export default function SettingsTab() {
  const router = useRouter();

  // Create a navigation object that matches the expected interface
  const navigation = {
    goBack: () => router.back(),
    navigate: (screen: string) => {
      switch (screen) {
        case 'Login':
          router.push('/login');
          break;
        default:
          console.log('Navigate to:', screen);
      }
    },
  };

  return <SettingsScreen navigation={navigation} />;
} 