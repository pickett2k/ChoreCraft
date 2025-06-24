import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export const SimpleHomeScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome to ChoreCraft!
        </Text>
        <Text style={styles.subtitle}>
          {user ? `Hello, ${user.displayName}!` : 'Please sign in to continue'}
        </Text>
      </View>

      {user && (
        <>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{user.coins || 0}</Text>
              <Text style={styles.statLabel}>Current Coins</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{user.totalCoinsEarned || 0}</Text>
              <Text style={styles.statLabel}>Total Earned</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{user.stats?.choresCompleted || 0}</Text>
              <Text style={styles.statLabel}>Chores Done</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>View Chores</Text>
            </TouchableOpacity>
            
            {user.role === 'admin' && (
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Create Chore</Text>
              </TouchableOpacity>
            )}
            
            {!user.householdId && (
              <>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>Create Household</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>Join Household</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>Email:</Text>
              <Text style={styles.accountValue}>{user.email}</Text>
            </View>
            
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>Role:</Text>
              <Text style={styles.accountValue}>{user.role === 'admin' ? 'Admin' : 'Member'}</Text>
            </View>
            
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>Household:</Text>
              <Text style={styles.accountValue}>{user.householdId ? 'Joined' : 'None'}</Text>
            </View>
            
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>Total Earned:</Text>
              <Text style={styles.accountValue}>{user.totalCoinsEarned || 0} coins</Text>
            </View>
            
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 60,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  accountInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  accountLabel: {
    fontSize: 16,
    color: '#666',
  },
  accountValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 