import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { 
  firestoreUtils, 
  choreService, 
  rewardService,
  ChoreCompletion, 
  RewardRequest,
  Household 
} from '../services/firestoreService';

export const ApprovalScreen: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'chores' | 'rewards'>('chores');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [household, setHousehold] = useState<Household | null>(null);
  const [choreCompletions, setChoreCompletions] = useState<ChoreCompletion[]>([]);
  const [rewardRequests, setRewardRequests] = useState<RewardRequest[]>([]);

  useEffect(() => {
    loadApprovalData();
  }, [user]);

  const loadApprovalData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('📋 Loading approval data for admin:', user.id);

      // Get user's household data
      const { household: userHousehold } = await firestoreUtils.getUserHouseholdData(user.id);
      
      if (userHousehold && user.role === 'admin') {
        setHousehold(userHousehold);
        console.log('✅ Admin household loaded:', userHousehold.name);

        // Load pending chore completions
        const pendingChores = await choreService.getPendingCompletions(userHousehold.id);
        setChoreCompletions(pendingChores);
        
        // Load pending reward requests
        const pendingRewards = await rewardService.getPendingRequests(userHousehold.id);
        setRewardRequests(pendingRewards);
        
        console.log('✅ Loaded', pendingChores.length, 'chore completions and', pendingRewards.length, 'reward requests');
      } else {
        console.log('⚠️ User is not an admin or no household found');
        setHousehold(null);
        setChoreCompletions([]);
        setRewardRequests([]);
      }
    } catch (error) {
      console.error('❌ Error loading approval data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadApprovalData();
    setRefreshing(false);
  };

  const handleApproveChore = async (completion: ChoreCompletion) => {
    try {
      Alert.alert(
        'Approve Chore Completion',
        `Approve "${completion.choreTitle}" completed by ${completion.completedByName}?\n\nThis will award ${completion.coinsPending} coins.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Approve',
            onPress: async () => {
              await choreService.approveCompletion(completion.id, user!.id);
              await loadApprovalData();
              Alert.alert('Approved! ✅', 'Chore completion approved and coins awarded.');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to approve chore completion.');
    }
  };

  const handleRejectChore = async (completion: ChoreCompletion) => {
    try {
      Alert.prompt(
        'Reject Chore Completion',
        `Why are you rejecting "${completion.choreTitle}"?`,
        async (reason) => {
          if (reason) {
            await choreService.rejectCompletion(completion.id, user!.id, reason);
            await loadApprovalData();
            Alert.alert('Rejected', 'Chore completion rejected.');
          }
        },
        'plain-text',
        '',
        'default'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to reject chore completion.');
    }
  };

  const handleApproveReward = async (request: RewardRequest) => {
    try {
      Alert.alert(
        'Approve Reward Request',
        `Approve "${request.rewardSnapshot.title}" for ${request.coinCost} coins?\n\nRequested by: ${request.userDisplayName}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Approve',
            onPress: async () => {
              await rewardService.processRewardRequest(request.id, 'approved', user!.id);
              await loadApprovalData();
              Alert.alert('Approved! ✅', 'Reward request approved. Don\'t forget to mark as fulfilled when completed!');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to approve reward request.');
    }
  };

  const handleRejectReward = async (request: RewardRequest) => {
    try {
      Alert.prompt(
        'Reject Reward Request',
        `Why are you rejecting "${request.rewardSnapshot.title}"?`,
        async (reason) => {
          if (reason) {
            await rewardService.processRewardRequest(request.id, 'denied', user!.id, reason);
            await loadApprovalData();
            Alert.alert('Rejected', 'Reward request rejected.');
          }
        },
        'plain-text',
        '',
        'default'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to reject reward request.');
    }
  };

  const handleFulfillReward = async (request: RewardRequest) => {
    try {
      Alert.alert(
        'Mark Reward as Fulfilled',
        `Mark "${request.rewardSnapshot.title}" as completed/fulfilled?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark Fulfilled',
            onPress: async () => {
              await rewardService.fulfillReward(request.id, user!.id);
              await loadApprovalData();
              Alert.alert('Fulfilled! ✅', 'Reward marked as completed.');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to fulfill reward.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading approvals...</Text>
      </View>
    );
  }

  if (!household || user?.role !== 'admin') {
    return (
      <View style={styles.noAccessContainer}>
        <FontAwesome5 name="shield-alt" size={48} color="#9CA3AF" />
        <Text style={styles.noAccessTitle}>Admin Access Required</Text>
        <Text style={styles.noAccessText}>
          Only household admins can access the approval screen.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="light-content" backgroundColor="#6C63FF" />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Approvals</Text>
          <Text style={styles.headerSubtitle}>
            {household.name} • Admin Dashboard
          </Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chores' && styles.activeTab]}
          onPress={() => setActiveTab('chores')}
        >
          <FontAwesome5 name="tasks" size={16} color={activeTab === 'chores' ? '#6C63FF' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'chores' && styles.activeTabText]}>
            Chore Completions
          </Text>
          {choreCompletions.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{choreCompletions.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'rewards' && styles.activeTab]}
          onPress={() => setActiveTab('rewards')}
        >
          <FontAwesome5 name="gift" size={16} color={activeTab === 'rewards' ? '#6C63FF' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'rewards' && styles.activeTabText]}>
            Reward Requests
          </Text>
          {rewardRequests.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{rewardRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'chores' ? (
          <>
            <Text style={styles.sectionTitle}>Pending Chore Completions</Text>
            
            {choreCompletions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <FontAwesome5 name="check-circle" size={48} color="#10B981" />
                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                <Text style={styles.emptyText}>
                  No pending chore completions to review.
                </Text>
              </View>
            ) : (
              choreCompletions.map((completion) => (
                <View key={completion.id} style={styles.approvalCard}>
                  <View style={styles.approvalHeader}>
                    <View style={styles.approvalInfo}>
                      <Text style={styles.approvalTitle}>{completion.choreTitle}</Text>
                      <Text style={styles.approvalUser}>
                        Completed by {completion.completedByName}
                      </Text>
                      <Text style={styles.approvalTime}>
                        {completion.completedAt.toLocaleDateString()} at {completion.completedAt.toLocaleTimeString()}
                      </Text>
                    </View>
                    <View style={styles.coinsBadge}>
                      <FontAwesome5 name="coins" size={16} color="#FFD700" />
                      <Text style={styles.coinsText}>{completion.coinsPending}</Text>
                    </View>
                  </View>

                  {completion.notes && (
                    <View style={styles.notesSection}>
                      <Text style={styles.notesLabel}>Notes:</Text>
                      <Text style={styles.notesText}>{completion.notes}</Text>
                    </View>
                  )}

                  <View style={styles.approvalActions}>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleRejectChore(completion)}
                    >
                      <FontAwesome5 name="times" size={16} color="#EF4444" />
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => handleApproveChore(completion)}
                    >
                      <FontAwesome5 name="check" size={16} color="white" />
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Pending Reward Requests</Text>
            
            {rewardRequests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <FontAwesome5 name="gift" size={48} color="#6C63FF" />
                <Text style={styles.emptyTitle}>No Pending Requests</Text>
                <Text style={styles.emptyText}>
                  No reward requests waiting for approval.
                </Text>
              </View>
            ) : (
              rewardRequests.map((request) => (
                <View key={request.id} style={styles.approvalCard}>
                  <View style={styles.approvalHeader}>
                    <View style={styles.approvalInfo}>
                      <Text style={styles.approvalTitle}>{request.rewardSnapshot.title}</Text>
                      <Text style={styles.approvalUser}>
                        Requested by {request.userDisplayName}
                      </Text>
                      <Text style={styles.approvalTime}>
                        {request.requestedAt.toLocaleDateString()} at {request.requestedAt.toLocaleTimeString()}
                      </Text>
                      <Text style={styles.rewardDescription}>
                        {request.rewardSnapshot.description}
                      </Text>
                    </View>
                    <View style={styles.coinsBadge}>
                      <FontAwesome5 name="coins" size={16} color="#FFD700" />
                      <Text style={styles.coinsText}>{request.coinCost}</Text>
                    </View>
                  </View>

                  <View style={styles.approvalActions}>
                    {request.status === 'pending' ? (
                      <>
                        <TouchableOpacity
                          style={styles.rejectButton}
                          onPress={() => handleRejectReward(request)}
                        >
                          <FontAwesome5 name="times" size={16} color="#EF4444" />
                          <Text style={styles.rejectButtonText}>Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.approveButton}
                          onPress={() => handleApproveReward(request)}
                        >
                          <FontAwesome5 name="check" size={16} color="white" />
                          <Text style={styles.approveButtonText}>Approve</Text>
                        </TouchableOpacity>
                      </>
                    ) : request.status === 'approved' ? (
                      <TouchableOpacity
                        style={styles.fulfillButton}
                        onPress={() => handleFulfillReward(request)}
                      >
                        <FontAwesome5 name="star" size={16} color="white" />
                        <Text style={styles.fulfillButtonText}>Mark as Fulfilled</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>
                          {request.status === 'fulfilled' ? 'Fulfilled ✅' : 'Denied ❌'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 40,
  },
  noAccessTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  noAccessText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#6C63FF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6C63FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#6C63FF',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 16,
  },
  emptyContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  approvalCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  approvalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  approvalInfo: {
    flex: 1,
  },
  approvalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  approvalUser: {
    fontSize: 14,
    color: '#6C63FF',
    fontWeight: '600',
    marginBottom: 2,
  },
  approvalTime: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  rewardDescription: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  coinsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D97706',
  },
  notesSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#1F2937',
  },
  approvalActions: {
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
    borderRadius: 8,
    gap: 6,
  },
  rejectButtonText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  approveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  fulfillButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  fulfillButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  statusBadge: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
}); 