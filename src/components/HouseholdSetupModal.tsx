import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { householdService, userService } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { initializeSampleData } from '../utils/sampleData';

interface HouseholdSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (householdId: string) => void;
}

export const HouseholdSetupModal: React.FC<HouseholdSetupModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [loading, setLoading] = useState(false);
  
  // Create household form
  const [householdName, setHouseholdName] = useState('');
  const [householdDescription, setHouseholdDescription] = useState('');
  
  // Join household form
  const [inviteCode, setInviteCode] = useState('');

  const resetForm = () => {
    setMode('choose');
    setHouseholdName('');
    setHouseholdDescription('');
    setInviteCode('');
    setLoading(false);
  };

  const handleCreateHousehold = async () => {
    if (!user || !householdName.trim()) {
      Alert.alert('Error', 'Please enter a household name');
      return;
    }

    try {
      setLoading(true);
      console.log('🏠 Creating household:', { name: householdName, creator: user.id });

      const householdId = await householdService.createHousehold(
        {
          name: householdName.trim(),
          description: householdDescription.trim(),
        },
        user.id
      );

      // Update user with household ID
      await userService.updateUser(user.id, {
        householdId,
        role: 'admin',
      });

      console.log('✅ Household created successfully:', householdId);
      Alert.alert('Success', 'Household created successfully!');
      resetForm();
      onSuccess(householdId);
    } catch (error: any) {
      console.error('❌ Error creating household:', error);
      Alert.alert('Error', error.message || 'Failed to create household');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinHousehold = async () => {
    if (!user || !inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    try {
      setLoading(true);
      console.log('🤝 Joining household with code:', inviteCode);

      const householdId = await householdService.joinHousehold(inviteCode.trim(), user.id);
      
      if (!householdId) {
        throw new Error('Invalid invite code');
      }

      // Update user with household ID
      await userService.updateUser(user.id, {
        householdId,
        role: 'member',
      });

      console.log('✅ Joined household successfully:', householdId);
      Alert.alert('Success', 'Joined household successfully!');
      resetForm();
      onSuccess(householdId);
    } catch (error: any) {
      console.error('❌ Error joining household:', error);
      Alert.alert('Error', error.message || 'Failed to join household');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSampleHousehold = async () => {
    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    try {
      setLoading(true);
      console.log('🚀 Creating sample household with data...');

      const householdId = await initializeSampleData(user.id, 'My Sample Household');
      
      console.log('✅ Sample household and chores created successfully');
      Alert.alert('Success', 'Sample household created with 10 chores! 🎉');
      resetForm();
      onSuccess(householdId);
    } catch (error: any) {
      console.error('❌ Error creating sample household:', error);
      Alert.alert('Error', error.message || 'Failed to create sample household');
    } finally {
      setLoading(false);
    }
  };

  const renderChooseMode = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Setup Your Household</Text>
      <Text style={styles.subtitle}>
        Create a new household or join an existing one
      </Text>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => setMode('create')}
      >
        <Text style={styles.optionIcon}>🏠</Text>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Create New Household</Text>
          <Text style={styles.optionDescription}>
            Start fresh with your own household
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => setMode('join')}
      >
        <Text style={styles.optionIcon}>🤝</Text>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Join Existing Household</Text>
          <Text style={styles.optionDescription}>
            Use an invite code to join
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.optionButton, styles.sampleButton]}
        onPress={handleCreateSampleHousehold}
        disabled={loading}
      >
        <Text style={styles.optionIcon}>🚀</Text>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Create Sample Household</Text>
          <Text style={styles.optionDescription}>
            Quick setup with sample chores for testing
          </Text>
        </View>
        {loading && <ActivityIndicator color="#666" size="small" />}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCreateMode = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Create Household</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Household Name *</Text>
        <TextInput
          style={styles.input}
          value={householdName}
          onChangeText={setHouseholdName}
          placeholder="e.g., Smith Family"
          maxLength={50}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={householdDescription}
          onChangeText={setHouseholdDescription}
          placeholder="Brief description of your household"
          multiline
          numberOfLines={3}
          maxLength={200}
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setMode('choose')}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleCreateHousehold}
          disabled={loading || !householdName.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderJoinMode = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Join Household</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit invite code from your household admin
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Invite Code *</Text>
        <TextInput
          style={[styles.input, styles.codeInput]}
          value={inviteCode}
          onChangeText={(text) => setInviteCode(text.toUpperCase())}
          placeholder="ABC123"
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setMode('choose')}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleJoinHousehold}
          disabled={loading || inviteCode.length !== 6}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Join</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modal}>
        {mode === 'choose' && renderChooseMode()}
        {mode === 'create' && renderCreateMode()}
        {mode === 'join' && renderJoinMode()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  sampleButton: {
    borderColor: '#FFC107',
    borderWidth: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 20,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f1f3f4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButton: {
    marginTop: 'auto',
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
}); 