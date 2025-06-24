import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { householdService } from '../src/services/firestoreService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showInviteFlow, setShowInviteFlow] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [hasInvitation, setHasInvitation] = useState(false);
  const [invitationDetails, setInvitationDetails] = useState<any>(null);
  const router = useRouter();
  const { signIn, signUp, loading } = useAuth();

  // Check for pending invitations when email changes
  useEffect(() => {
    if (email && email.includes('@')) {
      checkForPendingInvitations();
    }
  }, [email]);

  const checkForPendingInvitations = async () => {
    try {
      // Mock invitation check - in real implementation, this would query Firestore
      const mockInvitation = {
        householdName: 'The Johnson Family',
        invitedBy: 'Sarah Johnson',
        role: 'member',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
      
      // Simulate finding invitation for certain emails
      if (email.toLowerCase().includes('invited')) {
        setHasInvitation(true);
        setInvitationDetails(mockInvitation);
      } else {
        setHasInvitation(false);
        setInvitationDetails(null);
      }
    } catch (error) {
      console.error('Error checking invitations:', error);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      if (isSignUp) {
        await signUp(email, password);
        
        // After signup, check for pending invitations
        if (hasInvitation) {
          Alert.alert(
            'Welcome! 🎉',
            `You have a pending invitation to join "${invitationDetails.householdName}". You'll be added as a member and can start earning coins right away!`,
            [
              {
                text: 'Join Household',
                onPress: () => {
                  // Auto-accept invitation and navigate
                  router.replace('/(tabs)');
                }
              }
            ]
          );
        } else {
          Alert.alert(
            'Account Created! 🎉',
            'Would you like to create a new household or join an existing one?',
            [
              {
                text: 'Join Household',
                onPress: () => setShowInviteFlow(true)
              },
              {
                text: 'Create Household',
                onPress: () => router.replace('/household-setup')
              }
            ]
          );
        }
      } else {
        await signIn(email, password);
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Authentication failed. Please try again.');
    }
  };

  const handleJoinWithCode = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    try {
      // Mock join household - in real implementation, this would call householdService.joinHousehold
      Alert.alert(
        'Joined Household! 🎉',
        'You have successfully joined the household as a member. Start completing chores to earn coins!',
        [
          {
            text: 'Get Started',
            onPress: () => {
              setShowInviteFlow(false);
              router.replace('/(tabs)');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Invalid invite code. Please check and try again.');
    }
  };

  const InviteFlowModal = () => (
    <Modal
      visible={showInviteFlow}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowInviteFlow(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowInviteFlow(false)}>
            <FontAwesome5 name="times" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Join a Household</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.joinOptions}>
            <View style={styles.optionCard}>
              <FontAwesome5 name="qrcode" size={32} color="#6C63FF" />
              <Text style={styles.optionTitle}>Scan QR Code</Text>
              <Text style={styles.optionDescription}>
                Ask a family member to show you the QR code from their settings
              </Text>
              <TouchableOpacity style={styles.optionButton}>
                <FontAwesome5 name="camera" size={16} color="white" />
                <Text style={styles.optionButtonText}>Open Camera</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.optionCard}>
              <FontAwesome5 name="key" size={32} color="#10B981" />
              <Text style={styles.optionTitle}>Enter Invite Code</Text>
              <Text style={styles.optionDescription}>
                Enter the 6-character code shared by a family member
              </Text>
              
              <TextInput
                style={styles.codeInput}
                placeholder="Enter invite code (e.g., ABC123)"
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
                maxLength={6}
              />
              
              <TouchableOpacity 
                style={[styles.optionButton, styles.joinButton]}
                onPress={handleJoinWithCode}
              >
                <FontAwesome5 name="home" size={16} color="white" />
                <Text style={styles.optionButtonText}>Join Household</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.createOption}>
              <Text style={styles.createText}>Don't have an invite code?</Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => {
                  setShowInviteFlow(false);
                  router.replace('/household-setup');
                }}
              >
                <FontAwesome5 name="plus-circle" size={16} color="#6C63FF" />
                <Text style={styles.createButtonText}>Create New Household</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>ChoreCraft</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Create your account' : 'Welcome back!'}
          </Text>
          <Text style={styles.infoText}>
            {__DEV__ ? '🔧 Development mode - any email/password works' : ''}
          </Text>
          {__DEV__ && email && (
            <Text style={styles.userIdPreview}>
              User ID: user-{email.toLowerCase().replace(/[^a-z0-9]/g, '-')}
            </Text>
          )}
        </View>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          {hasInvitation && invitationDetails && (
            <View style={styles.invitationBanner}>
              <FontAwesome5 name="envelope" size={16} color="#10B981" />
              <View style={styles.invitationText}>
                <Text style={styles.invitationTitle}>You're Invited! 🎉</Text>
                <Text style={styles.invitationDetail}>
                  {invitationDetails.invitedBy} invited you to join "{invitationDetails.householdName}"
                </Text>
              </View>
            </View>
          )}
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.switchText}>
              {isSignUp 
                ? 'Already have an account? Sign In' 
                : "Don't have an account? Sign Up"
              }
            </Text>
          </TouchableOpacity>

          {isSignUp && !hasInvitation && (
            <View style={styles.joinPrompt}>
              <Text style={styles.joinPromptText}>Have an invite code or QR code?</Text>
              <TouchableOpacity
                style={styles.joinPromptButton}
                onPress={() => setShowInviteFlow(true)}
              >
                <FontAwesome5 name="users" size={16} color="#6C63FF" />
                <Text style={styles.joinPromptButtonText}>Join Existing Household</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <InviteFlowModal />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  userIdPreview: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 4,
    marginTop: 4,
    borderRadius: 4,
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  invitationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 12,
  },
  invitationText: {
    flex: 1,
  },
  invitationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 2,
  },
  invitationDetail: {
    fontSize: 12,
    color: '#047857',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    alignItems: 'center',
    padding: 10,
  },
  switchText: {
    color: '#007AFF',
    fontSize: 14,
  },
  joinPrompt: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  joinPromptText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  joinPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  joinPromptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C63FF',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalContent: {
    flex: 1,
  },
  joinOptions: {
    padding: 20,
    gap: 24,
  },
  optionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C63FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  joinButton: {
    backgroundColor: '#10B981',
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 20,
    backgroundColor: 'white',
    width: '100%',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  createOption: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  createText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C63FF',
  },
}); 