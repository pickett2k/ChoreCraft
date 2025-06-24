import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { notificationService } from '../services/notificationService';

export const NotificationTestPanel: React.FC = () => {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testLocalNotification = async () => {
    try {
      setLoading(true);
      const notificationId = await notificationService.scheduleNotification({
        title: '🧪 Test Notification',
        body: 'This is a test notification from ChoreCraft!',
        data: { type: 'general' },
        trigger: { seconds: 5 },
      });

      if (notificationId) {
        Alert.alert(
          'Notification Scheduled',
          'Test notification will appear in 5 seconds!'
        );
      } else {
        Alert.alert('Error', 'Failed to schedule notification');
      }
    } catch (error) {
      console.error('Test notification error:', error);
      Alert.alert('Error', 'Failed to schedule test notification');
    } finally {
      setLoading(false);
    }
  };

  const testChoreReminder = async () => {
    try {
      setLoading(true);
      const dueDate = new Date(Date.now() + 10 * 1000); // 10 seconds from now
      const reminderTime = new Date(Date.now() + 5 * 1000); // 5 seconds from now

      const notificationId = await notificationService.scheduleNotification({
        title: '🏠 Chore Reminder Test',
        body: 'Test chore "Clean Kitchen" is due in 5 seconds!',
        data: {
          type: 'chore_reminder',
          choreId: 'test-chore-123',
          householdId: 'test-household-456',
        },
        trigger: { date: reminderTime },
      });

      if (notificationId) {
        Alert.alert(
          'Chore Reminder Scheduled',
          'Test chore reminder will appear in 5 seconds!'
        );
      } else {
        Alert.alert('Error', 'Failed to schedule chore reminder');
      }
    } catch (error) {
      console.error('Chore reminder error:', error);
      Alert.alert('Error', 'Failed to schedule chore reminder');
    } finally {
      setLoading(false);
    }
  };

  const getPushToken = async () => {
    try {
      setLoading(true);
      const token = await notificationService.registerForPushNotifications();
      setPushToken(token);
      
      if (token) {
        Alert.alert(
          'Push Token Retrieved',
          `Token: ${token.substring(0, 50)}...`
        );
      } else {
        Alert.alert('Error', 'Failed to get push token');
      }
    } catch (error) {
      console.error('Push token error:', error);
      Alert.alert('Error', 'Failed to get push token');
    } finally {
      setLoading(false);
    }
  };

  const testPushNotification = async () => {
    if (!pushToken) {
      Alert.alert('No Token', 'Please get push token first');
      return;
    }

    try {
      setLoading(true);
      const success = await notificationService.sendPushNotification(
        pushToken,
        '🚀 Push Test',
        'This is a test push notification!',
        { type: 'general' }
      );

      if (success) {
        Alert.alert('Push Sent', 'Test push notification sent successfully!');
      } else {
        Alert.alert('Error', 'Failed to send push notification');
      }
    } catch (error) {
      console.error('Push notification error:', error);
      Alert.alert('Error', 'Failed to send push notification');
    } finally {
      setLoading(false);
    }
  };

  const getScheduledNotifications = async () => {
    try {
      const notifications = await notificationService.getScheduledNotifications();
      Alert.alert(
        'Scheduled Notifications',
        `You have ${notifications.length} scheduled notifications`
      );
    } catch (error) {
      console.error('Get notifications error:', error);
      Alert.alert('Error', 'Failed to get scheduled notifications');
    }
  };

  const cancelAllNotifications = async () => {
    try {
      await notificationService.cancelAllNotifications();
      Alert.alert('Success', 'All scheduled notifications cancelled');
    } catch (error) {
      console.error('Cancel notifications error:', error);
      Alert.alert('Error', 'Failed to cancel notifications');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <FontAwesome5 name="bell" size={24} color="#6C63FF" />
        <Text style={styles.title}>Notification Test Panel</Text>
      </View>

      <Text style={styles.subtitle}>
        Test various notification features during development
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Local Notifications</Text>
        
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={testLocalNotification}
          disabled={loading}
        >
          <FontAwesome5 name="clock" size={16} color="white" />
          <Text style={styles.buttonText}>Test Local Notification (5s)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary, loading && styles.buttonDisabled]}
          onPress={testChoreReminder}
          disabled={loading}
        >
          <FontAwesome5 name="tasks" size={16} color="#6C63FF" />
          <Text style={styles.buttonTextSecondary}>Test Chore Reminder (5s)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Push Notifications</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary, loading && styles.buttonDisabled]}
          onPress={getPushToken}
          disabled={loading}
        >
          <FontAwesome5 name="key" size={16} color="#6C63FF" />
          <Text style={styles.buttonTextSecondary}>Get Push Token</Text>
        </TouchableOpacity>

        {pushToken && (
          <View style={styles.tokenContainer}>
            <Text style={styles.tokenLabel}>Push Token:</Text>
            <Text style={styles.tokenText}>{pushToken.substring(0, 50)}...</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            (!pushToken || loading) && styles.buttonDisabled
          ]}
          onPress={testPushNotification}
          disabled={!pushToken || loading}
        >
          <FontAwesome5 name="paper-plane" size={16} color="white" />
          <Text style={styles.buttonText}>Send Test Push</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Management</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary, loading && styles.buttonDisabled]}
          onPress={getScheduledNotifications}
          disabled={loading}
        >
          <FontAwesome5 name="list" size={16} color="#6C63FF" />
          <Text style={styles.buttonTextSecondary}>View Scheduled</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonDanger, loading && styles.buttonDisabled]}
          onPress={cancelAllNotifications}
          disabled={loading}
        >
          <FontAwesome5 name="times" size={16} color="white" />
          <Text style={styles.buttonText}>Cancel All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.note}>
        <FontAwesome5 name="info-circle" size={14} color="#6B7280" />
        <Text style={styles.noteText}>
          Note: Notifications require a physical device. They won't work on simulators.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C63FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  buttonSecondary: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  buttonDanger: {
    backgroundColor: '#EF4444',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#6C63FF',
    fontSize: 16,
    fontWeight: '600',
  },
  tokenContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tokenLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  tokenText: {
    fontSize: 12,
    color: '#1F2937',
    fontFamily: 'monospace',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
}); 