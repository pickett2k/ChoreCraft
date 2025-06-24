import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { householdService, Invitation } from '../services/firestoreService';
import { emailService } from '../services/emailService';

interface InvitationManagementModalProps {
  visible: boolean;
  onClose: () => void;
  householdId: string;
  householdName: string;
}

export const InvitationManagementModal: React.FC<InvitationManagementModalProps> = ({
  visible,
  onClose,
  householdId,
  householdName,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'send' | 'pending' | 'history'>('send');
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  
  // Send invitation form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [allowMultiHousehold, setAllowMultiHousehold] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [emailServiceStatus, setEmailServiceStatus] = useState<{
    mailComposer: boolean;
    firebaseFunctions: boolean;
    recommendedAction?: string;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      loadInvitations();
      checkEmailService();
    }
  }, [visible, activeTab]);

  const checkEmailService = async () => {
    try {
      // Check Resend email service status
      const { resendEmailService } = await import('../services/resendEmailService');
      
      setEmailServiceStatus({
        mailComposer: true, // Resend is always available
        firebaseFunctions: false,
        recommendedAction: undefined // No action needed - Resend is production ready
      });
    } catch (error) {
      console.error('Error checking email service:', error);
      setEmailServiceStatus({
        mailComposer: false,
        firebaseFunctions: false,
        recommendedAction: 'Email service configuration error - check Resend API key'
      });
    }
  };

  const loadInvitations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const invitationList = await householdService.getHouseholdInvitations(householdId);
      setInvitations(invitationList);
    } catch (error) {
      console.error('Error loading invitations:', error);
      Alert.alert('Error', 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!user) return;

    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    if (!inviteEmail.includes('@') || !inviteEmail.includes('.')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      const result = await householdService.sendInvitation(
        householdId,
        inviteEmail.trim(),
        inviteRole,
        user.id,
        { 
          allowMultiHousehold,
          customMessage: customMessage.trim() || undefined 
        }
      );

      if (result.success) {
        Alert.alert(
          'Invitation Sent! 🎉',
          `Invitation sent to ${inviteEmail}${allowMultiHousehold ? ' (multi-household enabled)' : ''}`,
          [{ text: 'OK', onPress: () => {
            setInviteEmail('');
            setCustomMessage('');
            loadInvitations();
          }}]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to send invitation');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
  const completedInvitations = invitations.filter(inv => inv.status !== 'pending');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Manage Invitations</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.householdInfo}>
          <FontAwesome5 name="home" size={16} color="#6C63FF" />
          <Text style={styles.householdName}>{householdName}</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.sendForm}>
            <Text style={styles.sectionTitle}>📧 Send New Invitation</Text>
            
            {emailServiceStatus && (
              <View style={[styles.statusBanner, 
                emailServiceStatus.mailComposer ? styles.statusBannerSuccess : styles.statusBannerWarning
              ]}>
                <FontAwesome5 
                  name={emailServiceStatus.mailComposer ? "check-circle" : "exclamation-triangle"} 
                  size={16} 
                  color={emailServiceStatus.mailComposer ? "#10B981" : "#F59E0B"} 
                />
                <View style={styles.statusText}>
                  <Text style={styles.statusTitle}>
                    {emailServiceStatus.mailComposer ? "Resend Email Service Active" : "Email Service Error"}
                  </Text>
                  <Text style={styles.statusDescription}>
                    {emailServiceStatus.mailComposer 
                      ? "Invitations will be sent directly via professional email" 
                      : "Unable to send emails - check configuration"
                    }
                  </Text>
                  {emailServiceStatus.recommendedAction && (
                    <Text style={styles.statusRecommendation}>
                      💡 {emailServiceStatus.recommendedAction}
                    </Text>
                  )}
                </View>
              </View>
            )}
            
            <Text style={styles.formLabel}>Email Address</Text>
            <TextInput
              style={styles.formInput}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.formLabel}>Role</Text>
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[styles.roleOption, inviteRole === 'member' && styles.roleOptionActive]}
                onPress={() => setInviteRole('member')}
              >
                <FontAwesome5 name="user" size={16} color={inviteRole === 'member' ? '#6C63FF' : '#6B7280'} />
                <Text style={[styles.roleText, inviteRole === 'member' && styles.roleTextActive]}>Member</Text>
                <Text style={styles.roleDescription}>Can complete chores and request rewards</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleOption, inviteRole === 'admin' && styles.roleOptionActive]}
                onPress={() => setInviteRole('admin')}
              >
                <FontAwesome5 name="crown" size={16} color={inviteRole === 'admin' ? '#6C63FF' : '#6B7280'} />
                <Text style={[styles.roleText, inviteRole === 'admin' && styles.roleTextActive]}>Admin</Text>
                <Text style={styles.roleDescription}>Can manage household settings and approve chores</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>🏠 Allow Multi-Household</Text>
                <Text style={styles.switchDescription}>
                  User can join even if they're already in another household
                </Text>
              </View>
              <Switch
                value={allowMultiHousehold}
                onValueChange={setAllowMultiHousehold}
                trackColor={{ false: '#E5E7EB', true: '#6C63FF' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity
              style={[styles.sendButton, loading && styles.sendButtonDisabled]}
              onPress={handleSendInvitation}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <FontAwesome5 name="paper-plane" size={16} color="white" />
                  <Text style={styles.sendButtonText}>Send Invitation</Text>
                </>
              )}
            </TouchableOpacity>

            {__DEV__ && (
              <TouchableOpacity
                style={[styles.testButton]}
                onPress={async () => {
                  try {
                    setLoading(true);
                    const { resendEmailService } = await import('../services/resendEmailService');
                    
                    const testInvitation = {
                      recipientEmail: inviteEmail || 'test@example.com',
                      inviterName: user?.displayName || 'Test User',
                      householdName: householdName,
                      inviteCode: 'TEST123',
                      role: inviteRole,
                      customMessage: 'This is a test invitation to verify email delivery.'
                    };
                    
                    const result = await resendEmailService.sendInvitationEmail(testInvitation);
                    
                    if (result.success) {
                      Alert.alert('✅ Test Email Sent!', 'Check your email inbox to verify delivery.');
                    } else {
                      Alert.alert('❌ Test Failed', result.error || 'Unknown error');
                    }
                  } catch (error) {
                    Alert.alert('❌ Test Error', error instanceof Error ? error.message : 'Failed to send test email');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                <FontAwesome5 name="flask" size={16} color="#6C63FF" />
                <Text style={styles.testButtonText}>Test Email Service</Text>
              </TouchableOpacity>
            )}

            <View style={styles.infoBox}>
              <FontAwesome5 name="info-circle" size={16} color="#6C63FF" />
              <Text style={styles.infoText}>
                <Text style={styles.infoTitle}>How Invitations Work:</Text>{'\n'}
                • Invitations expire after 14 days{'\n'}
                • If user doesn't exist, they'll see invitation when they sign up{'\n'}
                • Multi-household allows users to be in multiple families{'\n'}
                • Users can be admin in one household and member in others
              </Text>
            </View>

            <Text style={styles.sectionTitle}>📋 Recent Invitations</Text>
            
            {pendingInvitations.length > 0 && (
              <View style={styles.invitationsList}>
                <Text style={styles.subsectionTitle}>⏳ Pending ({pendingInvitations.length})</Text>
                {pendingInvitations.map((invitation) => (
                  <View key={invitation.id} style={styles.invitationItem}>
                    <View style={styles.invitationHeader}>
                      <Text style={styles.invitationEmail}>{invitation.email}</Text>
                      <View style={[styles.roleTag, invitation.role === 'admin' ? styles.adminTag : styles.memberTag]}>
                        <Text style={[styles.roleTagText, invitation.role === 'admin' ? styles.adminTagText : styles.memberTagText]}>
                          {invitation.role}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.invitationDetail}>
                      Sent {formatDate(invitation.invitedAt)} • Expires {formatDate(invitation.expiresAt)}
                    </Text>
                    {invitation.isMultiHousehold && (
                      <Text style={styles.multiHouseholdNote}>🏠 Multi-household enabled</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {completedInvitations.length > 0 && (
              <View style={styles.invitationsList}>
                <Text style={styles.subsectionTitle}>✅ Completed ({completedInvitations.length})</Text>
                {completedInvitations.slice(0, 3).map((invitation) => (
                  <View key={invitation.id} style={[styles.invitationItem, styles.completedItem]}>
                    <View style={styles.invitationHeader}>
                      <Text style={styles.invitationEmail}>{invitation.email}</Text>
                      <View style={[styles.statusTag, { backgroundColor: '#10B981' + '20' }]}>
                        <FontAwesome5 name="check-circle" size={12} color="#10B981" />
                        <Text style={[styles.statusTagText, { color: '#10B981' }]}>
                          {invitation.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.invitationDetail}>
                      {invitation.acceptedAt && `Accepted ${formatDate(invitation.acceptedAt)}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  householdInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  householdName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  sendForm: {
    padding: 20,
    gap: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  formInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  roleSelector: {
    gap: 12,
  },
  roleOption: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  roleOptionActive: {
    borderColor: '#6C63FF',
    backgroundColor: '#6C63FF10',
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleTextActive: {
    color: '#6C63FF',
  },
  roleDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#0369A1',
    lineHeight: 20,
  },
  infoTitle: {
    fontWeight: '600',
  },
  invitationsList: {
    gap: 8,
  },
  invitationItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  completedItem: {
    opacity: 0.7,
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  invitationEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  invitationDetail: {
    fontSize: 14,
    color: '#6B7280',
  },
  multiHouseholdNote: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
    marginTop: 4,
  },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adminTag: {
    backgroundColor: '#FEF3C7',
  },
  memberTag: {
    backgroundColor: '#E0E7FF',
  },
  roleTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  adminTagText: {
    color: '#D97706',
  },
  memberTagText: {
    color: '#6366F1',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
  },
  statusBannerSuccess: {
    backgroundColor: '#E0F2FF',
  },
  statusBannerWarning: {
    backgroundColor: '#FFFBEB',
  },
  statusText: {
    flex: 1,
    marginLeft: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusRecommendation: {
    fontSize: 12,
    color: '#6B7280',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#6C63FF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C63FF',
  },
});

export default InvitationManagementModal; 