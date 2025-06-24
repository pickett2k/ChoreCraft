import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export const DebugUserInfo: React.FC = () => {
  const { user, refreshUserData } = useAuth();

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔍 Debug: No User</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔍 Debug User Info</Text>
        <TouchableOpacity onPress={refreshUserData} style={styles.refreshButton}>
          <FontAwesome5 name="sync" size={14} color="#6C63FF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Text style={styles.label}>User ID:</Text>
          <Text style={styles.value}>{user.id}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{user.email}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.label}>Display Name:</Text>
          <Text style={styles.value}>{user.displayName}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.label}>Role:</Text>
          <Text style={styles.value}>{user.role}</Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.label}>Coins:</Text>
          <Text style={styles.value}>{user.coins}</Text>
        </View>
        
        <View style={[styles.infoItem, styles.householdItem]}>
          <Text style={styles.label}>Household ID:</Text>
          <Text style={[
            styles.value, 
            user.householdId ? styles.hasHousehold : styles.noHousehold
          ]}>
            {user.householdId || 'None'}
          </Text>
        </View>
        
        <View style={styles.infoItem}>
          <Text style={styles.label}>Firestore Data:</Text>
          <Text style={styles.value}>
            {user.firestoreData ? 'Yes' : 'No'}
          </Text>
        </View>
      </View>
      
      {user.firestoreData && (
        <View style={styles.firestoreSection}>
          <Text style={styles.sectionTitle}>Firestore Details:</Text>
          <Text style={styles.firestoreText}>
            {JSON.stringify({
              householdId: user.firestoreData.householdId,
              role: user.firestoreData.role,
              coins: user.firestoreData.coins,
              totalCoinsEarned: user.firestoreData.totalCoinsEarned
            }, null, 2)}
          </Text>
        </View>
      )}
      
      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>Status:</Text>
        <Text style={[
          styles.statusText,
          user.householdId ? styles.statusGood : styles.statusBad
        ]}>
          {user.householdId 
            ? `✅ Connected to household: ${user.householdId}` 
            : '❌ No household - Create or join one!'
          }
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  refreshButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  infoGrid: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  householdItem: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
    marginVertical: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#1F2937',
    flex: 2,
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  hasHousehold: {
    color: '#059669',
    fontWeight: 'bold',
  },
  noHousehold: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
  firestoreSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  firestoreText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  statusSection: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusGood: {
    color: '#059669',
  },
  statusBad: {
    color: '#DC2626',
  },
}); 