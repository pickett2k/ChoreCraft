import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { createHousehold, joinHousehold } from '../services/householdService';
import { router } from 'expo-router';

export const HouseholdSetupScreen: React.FC = () => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [householdName, setHouseholdName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, updateUserProfile } = useAuth();

  const handleCreateHousehold = async () => {
    if (!householdName.trim()) {
      Alert.alert('Error', 'Please enter a household name');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setLoading(true);

    try {
      const household = await createHousehold(
        householdName.trim(),
        user.id,
        description.trim() || undefined
      );

      // Update local user state
      await updateUserProfile({
        householdId: household.id,
        role: 'admin',
      });

      Alert.alert(
        'Success! 🎉',
        `Household "${household.name}" created successfully!\n\nInvite Code: ${household.inviteCode}\n\nShare this code with family members to join.`,
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create household');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinHousehold = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    if (inviteCode.trim().length !== 6) {
      Alert.alert('Error', 'Invite code must be 6 digits');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setLoading(true);

    try {
      const household = await joinHousehold(user.id, inviteCode.trim());

      // Update local user state
      await updateUserProfile({
        householdId: household.id,
        role: 'member',
      });

      Alert.alert(
        'Success! 🎉',
        `You've joined "${household.name}" successfully!`,
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join household');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'create') {
      handleCreateHousehold();
    } else {
      handleJoinHousehold();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <FontAwesome5 name="home" size={40} color="#6C63FF" />
          </View>
          <Text style={styles.title}>Set Up Your Household</Text>
          <Text style={styles.subtitle}>
            Create a new household or join an existing one
          </Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'create' && styles.modeButtonActive,
            ]}
            onPress={() => setMode('create')}
          >
            <FontAwesome5 
              name="plus" 
              size={16} 
              color={mode === 'create' ? 'white' : '#6C63FF'} 
            />
            <Text
              style={[
                styles.modeButtonText,
                mode === 'create' && styles.modeButtonTextActive,
              ]}
            >
              Create New
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'join' && styles.modeButtonActive,
            ]}
            onPress={() => setMode('join')}
          >
            <FontAwesome5 
              name="users" 
              size={16} 
              color={mode === 'join' ? 'white' : '#6C63FF'} 
            />
            <Text
              style={[
                styles.modeButtonText,
                mode === 'join' && styles.modeButtonTextActive,
              ]}
            >
              Join Existing
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === 'create' ? (
            <>
              <View style={styles.inputContainer}>
                <FontAwesome5 name="home" size={20} color="#6C63FF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Household Name (e.g., Smith Family)"
                  placeholderTextColor="#9CA3AF"
                  value={householdName}
                  onChangeText={setHouseholdName}
                  autoCapitalize="words"
                  maxLength={50}
                />
              </View>

              <View style={styles.inputContainer}>
                <FontAwesome5 name="edit" size={20} color="#6C63FF" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description (optional)"
                  placeholderTextColor="#9CA3AF"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.infoCard}>
                <FontAwesome5 name="info-circle" size={16} color="#3B82F6" />
                <Text style={styles.infoText}>
                  You'll be the admin and can invite family members with a 6-digit code
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <FontAwesome5 name="key" size={20} color="#6C63FF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-digit invite code"
                  placeholderTextColor="#9CA3AF"
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.infoCard}>
                <FontAwesome5 name="info-circle" size={16} color="#3B82F6" />
                <Text style={styles.infoText}>
                  Ask a household admin for the 6-digit invite code
                </Text>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <FontAwesome5 
                  name={mode === 'create' ? 'plus' : 'sign-in-alt'} 
                  size={16} 
                  color="white" 
                />
                <Text style={styles.submitButtonText}>
                  {mode === 'create' ? 'Create Household' : 'Join Household'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            You can change these settings later in the app
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: '#6C63FF',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  modeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#6C63FF',
  },
  modeButtonTextActive: {
    color: 'white',
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 12,
    marginTop: 16,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 80,
    paddingTop: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
 