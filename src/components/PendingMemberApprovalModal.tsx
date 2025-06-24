import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { householdService, userService, FirestoreUser } from '../services/firestoreService';

interface PendingMember {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  joinedAt: Date;
  joinMethod: 'invite_code' | 'qr_code' | 'email_invitation';
  invitedBy?: string;
  invitedByName?: string;
}

interface PendingMemberApprovalModalProps {
  visible: boolean;
  onClose: () => void;
  householdId: string;
  householdName: string;
  onMemberApproved: () => void;
}

export const PendingMemberApprovalModal: React.FC<PendingMemberApprovalModalProps> = ({
  visible,
  onClose,
  householdId,
  householdName,
  onMemberApproved,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);

  useEffect(() => {
    if (visible) {
      loadPendingMembers();
    }
  }, [visible]);

  const loadPendingMembers = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      // Mock pending members for now - in real implementation, this would query Firestore
      const mockPendingMembers: PendingMember[] = [
        {
          id: 'pending-1',
          email: 'newuser@example.com',
          displayName: 'Sarah Johnson',
          joinedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          joinMethod: 'qr_code',
        },
        {
          id: 'pending-2',
          email: 'another@example.com',
          displayName: 'Mike Chen',
          joinedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
          joinMethod: 'invite_code',
        },
      ];
      setPendingMembers(mockPendingMembers);
    } catch (error) {
      console.error('Error loading pending members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMember = async (memberId: string, email: string, role: 'admin' | 'member') => {
    if (!user) return;

    try {
      setLoading(true);
      
      // In real implementation:
      // 1. Update user's role in household
      // 2. Add to household members/admins list
      // 3. Send welcome notification
      // 4. Remove from pending list
      
      Alert.alert(
        'Member Approved! 🎉',
        `${email} has been approved as ${role === 'admin' ? 'an admin' : 'a member'}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Remove from pending list
              setPendingMembers(prev => prev.filter(m => m.id !== memberId));
              onMemberApproved();
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to approve member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectMember = async (memberId: string, email: string) => {
    Alert.alert(
      'Reject Member',
      `Are you sure you want to reject ${email}? They will be removed from the household.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // In real implementation:
              // 1. Remove user from household
              // 2. Send rejection notification
              // 3. Remove from pending list
              
              setPendingMembers(prev => prev.filter(m => m.id !== memberId));
              Alert.alert('Member Rejected', `${email} has been removed from the household.`);
            } catch (error) {
              Alert.alert('Error', 'Failed to reject member. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getJoinMethodIcon = (method: string) => {
    switch (method) {
      case 'qr_code': return 'qrcode';
      case 'invite_code': return 'key';
      case 'email_invitation': return 'envelope';
      default: return 'user-plus';
    }
  };

  const getJoinMethodText = (method: string) => {
    switch (method) {
      case 'qr_code': return 'Joined via QR Code';
      case 'invite_code': return 'Joined via Invite Code';
      case 'email_invitation': return 'Joined via Email Invitation';
      default: return 'Joined household';
    }
  };

  const PendingMemberItem = ({ member }: { member: PendingMember }) => (
    <View style={styles.memberItem}>
      <View style={styles.memberHeader}>
        <View style={styles.memberInfo}>
          <View style={styles.avatarContainer}>
            {member.avatar ? (
              <Image source={{ uri: member.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <FontAwesome5 name="user" size={20} color="#9CA3AF" />
              </View>
            )}
          </View>
          
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>{member.displayName}</Text>
            <Text style={styles.memberEmail}>{member.email}</Text>
            
            <View style={styles.joinInfo}>
              <FontAwesome5 
                name={getJoinMethodIcon(member.joinMethod)} 
                size={12} 
                color="#6B7280" 
              />
              <Text style={styles.joinText}>
                {getJoinMethodText(member.joinMethod)} • {formatTimeAgo(member.joinedAt)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleRejectMember(member.id, member.email)}
        >
          <FontAwesome5 name="times" size={16} color="#EF4444" />
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.memberButton}
          onPress={() => handleApproveMember(member.id, member.email, 'member')}
        >
          <FontAwesome5 name="user" size={16} color="#6C63FF" />
          <Text style={styles.memberButtonText}>As Member</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => handleApproveMember(member.id, member.email, 'admin')}
        >
          <FontAwesome5 name="crown" size={16} color="#F59E0B" />
          <Text style={styles.adminButtonText}>As Admin</Text>
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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>New Members</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingMembers.length}</Text>
          </View>
        </View>

        <View style={styles.householdInfo}>
          <FontAwesome5 name="home" size={16} color="#6C63FF" />
          <Text style={styles.householdName}>{householdName}</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6C63FF" />
              <Text style={styles.loadingText}>Loading new members...</Text>
            </View>
          ) : pendingMembers.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome5 name="user-check" size={48} color="#E5E7EB" />
              <Text style={styles.emptyStateTitle}>No Pending Members</Text>
              <Text style={styles.emptyStateText}>
                New members who join via invite code or QR code will appear here for approval.
              </Text>
            </View>
          ) : (
            <View style={styles.membersList}>
              <View style={styles.infoBox}>
                <FontAwesome5 name="info-circle" size={16} color="#6C63FF" />
                <Text style={styles.infoText}>
                  <Text style={styles.infoTitle}>Approve New Members:</Text>{'\n'}
                  • All new members join as "pending" until approved{'\n'}
                  • You can approve them as Member or Admin{'\n'}
                  • Members can complete chores and request rewards{'\n'}
                  • Admins can manage household settings
                </Text>
              </View>

              {pendingMembers.map((member) => (
                <PendingMemberItem key={member.id} member={member} />
              ))}
            </View>
          )}
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
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  membersList: {
    padding: 20,
    gap: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 8,
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
  memberItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 16,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  joinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  joinText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  memberButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  memberButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C63FF',
  },
  adminButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  adminButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
});

export default PendingMemberApprovalModal; 