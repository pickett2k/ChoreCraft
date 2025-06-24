import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { auth, db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface FirebaseStatus {
  auth: boolean;
  firestore: boolean;
  error?: string;
}

export const FirebaseConnectionTest: React.FC = () => {
  const [status, setStatus] = useState<FirebaseStatus>({
    auth: false,
    firestore: false,
  });
  const [testing, setTesting] = useState(false);

  const testFirebaseConnection = async () => {
    setTesting(true);
    const newStatus: FirebaseStatus = {
      auth: false,
      firestore: false,
    };

    try {
      // Test Auth
      if (auth) {
        newStatus.auth = true;
        console.log('✅ Firebase Auth is available');
      }

      // Test Firestore
      if (db) {
        // Try to read from a collection (this will fail gracefully if no data exists)
        await getDocs(collection(db, 'users'));
        newStatus.firestore = true;
        console.log('✅ Firestore is available and connected');
      }

    } catch (error: any) {
      console.error('❌ Firebase connection test failed:', error);
      newStatus.error = error.message;
    }

    setStatus(newStatus);
    setTesting(false);
  };

  useEffect(() => {
    testFirebaseConnection();
  }, []);

  const getStatusColor = (isWorking: boolean) => {
    return isWorking ? '#4CAF50' : '#F44336';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Connection Status</Text>
      
      <View style={styles.statusContainer}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Firebase Auth:</Text>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(status.auth) }]} />
          <Text style={styles.statusText}>{status.auth ? 'Connected' : 'Disconnected'}</Text>
        </View>

        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Firestore:</Text>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(status.firestore) }]} />
          <Text style={styles.statusText}>{status.firestore ? 'Connected' : 'Disconnected'}</Text>
        </View>
      </View>

      {status.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {status.error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.testButton}
        onPress={testFirebaseConnection}
        disabled={testing}
      >
        <Text style={styles.testButtonText}>
          {testing ? 'Testing...' : 'Test Connection'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.instructions}>
        Check the console for detailed Firebase initialization logs.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    marginBottom: 20,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 16,
    width: 120,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  testButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
  },
  testButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  instructions: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 