import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Switch,
  Alert,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export const NotificationSettingsScreen: React.FC = () => {
  const router = useRouter();
  
  const [settings, setSettings] = useState({
    pushNotifications: true,
    choreReminders: true,
    rewardAlerts: true,
    weeklyReports: false,
    familyUpdates: true,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHours: false,
  });

  const updateSetting = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#6C63FF20' }]}>
                  <FontAwesome5 name="bell" size={16} color="#6C63FF" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Push Notifications</Text>
                  <Text style={styles.settingSubtitle}>Allow the app to send notifications</Text>
                </View>
              </View>
              <Switch
                value={settings.pushNotifications}
                onValueChange={(value) => updateSetting('pushNotifications', value)}
                trackColor={{ false: '#E5E7EB', true: '#6C63FF' }}
                thumbColor={settings.pushNotifications ? '#FFFFFF' : '#9CA3AF'}
              />
            </View>
            
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#10B98120' }]}>
                  <FontAwesome5 name="volume-up" size={16} color="#10B981" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Sound</Text>
                  <Text style={styles.settingSubtitle}>Play sound for notifications</Text>
                </View>
              </View>
              <Switch
                value={settings.soundEnabled}
                onValueChange={(value) => updateSetting('soundEnabled', value)}
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                thumbColor={settings.soundEnabled ? '#FFFFFF' : '#9CA3AF'}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chores</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#10B98120' }]}>
                  <FontAwesome5 name="tasks" size={16} color="#10B981" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Chore Reminders</Text>
                  <Text style={styles.settingSubtitle}>Get reminded about pending chores</Text>
                </View>
              </View>
              <Switch
                value={settings.choreReminders}
                onValueChange={(value) => updateSetting('choreReminders', value)}
                trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                thumbColor={settings.choreReminders ? '#FFFFFF' : '#9CA3AF'}
              />
            </View>
            
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#EC489920' }]}>
                  <FontAwesome5 name="gift" size={16} color="#EC4899" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Reward Alerts</Text>
                  <Text style={styles.settingSubtitle}>Notifications when rewards are approved</Text>
                </View>
              </View>
              <Switch
                value={settings.rewardAlerts}
                onValueChange={(value) => updateSetting('rewardAlerts', value)}
                trackColor={{ false: '#E5E7EB', true: '#EC4899' }}
                thumbColor={settings.rewardAlerts ? '#FFFFFF' : '#9CA3AF'}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.testButton}
            onPress={() => Alert.alert('Test Notification', 'This is how notifications will appear!')}
          >
            <FontAwesome5 name="bell" size={16} color="#6C63FF" />
            <Text style={styles.testButtonText}>Send Test Notification</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: '#6C63FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C63FF',
  },
});
