import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { ModernHomeScreen } from '../../src/screens/ModernHomeScreen';
import { useRouter } from 'expo-router';

export default function TabOneScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Handle navigation based on auth state
  useEffect(() => {
    if (!loading && !user) {
      // User not authenticated, redirect to login immediately
      router.replace('/login');
    }
  }, [loading, user, router]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // If no user, show loading while redirecting (this should be very brief)
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Redirecting to login...</Text>
      </View>
    );
  }

  // User is authenticated - show home screen
  return <ModernHomeScreen />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
});
