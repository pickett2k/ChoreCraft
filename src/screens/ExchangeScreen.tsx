import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { onSnapshot, query, collection, where, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { 
  rewardService, 
  firestoreUtils, 
  Reward, 
  Household,
  RewardRequest
} from '../services/firestoreService';
import { db } from '../services/firebase';
import { CreateRewardModal } from '../components/CreateRewardModal';

interface ExchangeScreenProps {
  navigation: any;
}

const categoryFilters = [
  { id: 'all', name: 'All', icon: 'star', color: '#6B7280' },
  { id: 'privileges', name: 'Privileges', icon: 'crown', color: '#8B5CF6' },
  { id: 'treats', name: 'Treats', icon: 'candy-cane', color: '#EC4899' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film', color: '#3B82F6' },
  { id: 'money', name: 'Money', icon: 'pound-sign', color: '#10B981' },
  { id: 'experiences', name: 'Experiences', icon: 'map-marked-alt', color: '#F59E0B' },
  { id: 'items', name: 'Items', icon: 'gift', color: '#EF4444' },
];

export const ExchangeScreen: React.FC<ExchangeScreenProps> = ({ navigation }) => {
  const { user, refreshUserData } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [userRequests, setUserRequests] = useState<RewardRequest[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // Real-time listeners
  useEffect(() => {
    if (!user || !db) return;

    let rewardsUnsubscribe: (() => void) | null = null;
    let requestsUnsubscribe: (() => void) | null = null;

    const setupListeners = async () => {
      try {
        setLoading(true);

        // Load household data first
        const { household: userHousehold } = await firestoreUtils.getUserHouseholdData(user.id);
        console.log('🏠 Exchange screen household:', userHousehold?.id, userHousehold?.name);
        setHousehold(userHousehold);

        if (userHousehold) {
          // Set up real-time listener for rewards
          if (!db) return;
          
          // Simplified query to avoid index issues - will sort in memory
          const rewardsQuery = query(
            collection(db, 'rewards'),
            where('householdId', '==', userHousehold.id),
            where('isActive', '==', true)
          );

          rewardsUnsubscribe = onSnapshot(rewardsQuery, (snapshot) => {
            const rewardsList: Reward[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              rewardsList.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
                lastRequested: data.lastRequested?.toDate(),
              } as Reward);
            });
            
            // Sort in memory: by requestCount desc, then by createdAt desc
            rewardsList.sort((a, b) => {
              if (b.requestCount !== a.requestCount) {
                return b.requestCount - a.requestCount;
              }
              return b.createdAt.getTime() - a.createdAt.getTime();
            });
            
            console.log('🎁 Real-time rewards update:', rewardsList.length, 'rewards for household', userHousehold.id);
            setRewards(rewardsList);
          }, (error) => {
            console.error('❌ Error listening to rewards:', error);
          });

          // Set up real-time listener for user's reward requests
          const requestsQuery = query(
            collection(db, 'rewardRequests'),
            where('userId', '==', user.id),
            orderBy('requestedAt', 'desc'),
            limit(20)
          );

          requestsUnsubscribe = onSnapshot(requestsQuery, (snapshot) => {
            const requestsList: RewardRequest[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              requestsList.push({
                id: doc.id,
                ...data,
                requestedAt: data.requestedAt?.toDate() || new Date(),
                processedAt: data.processedAt?.toDate(),
              } as RewardRequest);
            });
            console.log('📋 Real-time requests update:', requestsList.length, 'requests');
            setUserRequests(requestsList);
          }, (error) => {
            console.error('❌ Error listening to requests:', error);
          });
        }
      } catch (error) {
        console.error('❌ Error setting up listeners:', error);
      } finally {
        setLoading(false);
      }
    };

    setupListeners();

    // Cleanup listeners on unmount
    return () => {
      if (rewardsUnsubscribe) rewardsUnsubscribe();
      if (requestsUnsubscribe) requestsUnsubscribe();
    };
  }, [user, db]);

  const handleRefresh = async () => {
    // Real-time listeners will handle the refresh automatically
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const filteredRewards = rewards.filter(reward => {
    if (selectedCategory === 'all') return true;
    return reward.category === selectedCategory;
  });

  const handleRewardRequest = async (reward: Reward) => {
    if (!user) return;

    // Check if user has enough coins (use real-time user data)
    if (user.coins < reward.coinCost) {
      Alert.alert(
        'Insufficient Coins',
        `You need ${reward.coinCost} coins but only have ${user.coins} coins.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if user has a pending request for this reward
    const pendingRequest = userRequests.find(
      req => req.rewardId === reward.id && req.status === 'pending'
    );

    if (pendingRequest) {
      Alert.alert(
        'Request Pending',
        'You already have a pending request for this reward.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check availability
    if (reward.maxRedemptions && reward.currentRedemptions >= reward.maxRedemptions) {
      Alert.alert(
        'Reward Unavailable',
        'This reward is no longer available.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check cooldown
    if (reward.cooldownHours && reward.lastRequested) {
      const hoursSinceLastRequest = (Date.now() - reward.lastRequested.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastRequest < reward.cooldownHours) {
        const hoursRemaining = Math.ceil(reward.cooldownHours - hoursSinceLastRequest);
        Alert.alert(
          'Cooldown Active',
          `This reward will be available in ${hoursRemaining} hours.`,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    const approvalText = reward.requiresApproval 
      ? 'Your request will be sent to an admin for approval.'
      : 'Your coins will be deducted immediately.';

    Alert.alert(
      'Request Reward',
      `Request "${reward.title}" for ${reward.coinCost} coins?\n\n${approvalText}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: async () => {
            try {
              const result = await rewardService.requestReward(user.id, reward.id);
              
              if (result.success) {
                // Refresh user data to update coin balance and cash rewards
                await refreshUserData();
                
                Alert.alert(
                  'Request Submitted! 🎉',
                  reward.requiresApproval 
                    ? 'Your reward request has been sent for approval.'
                    : 'Your reward has been approved automatically!',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Error', result.error || 'Failed to request reward');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to request reward. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleCreateReward = () => {
    if (!household) {
      Alert.alert('No Household', 'Please set up a household first to create rewards.');
      return;
    }
    setCreateModalVisible(true);
  };

  const handleRewardCreated = () => {
    // Real-time listeners will automatically update the rewards list
    console.log('✅ Reward created - real-time listener will update the list');
  };

  const getRewardStatus = (reward: Reward) => {
    const pendingRequest = userRequests.find(
      req => req.rewardId === reward.id && req.status === 'pending'
    );
    
    if (pendingRequest) return 'pending';
    
    if (reward.maxRedemptions && reward.currentRedemptions >= reward.maxRedemptions) {
      return 'unavailable';
    }
    
    if (reward.cooldownHours && reward.lastRequested) {
      const hoursSinceLastRequest = (Date.now() - reward.lastRequested.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastRequest < reward.cooldownHours) {
        return 'cooldown';
      }
    }
    
    return 'available';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading rewards...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6C63FF" />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Reward Exchange</Text>
          <Text style={styles.headerSubtitle}>
            {household ? `${household.name} Marketplace` : 'No household'}
          </Text>
        </View>
        {user?.role === 'admin' && household && (
          <TouchableOpacity onPress={handleCreateReward} style={styles.addButton}>
            <FontAwesome5 name="plus" size={20} color="white" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {!household ? (
          <View style={styles.noHouseholdContainer}>
            <FontAwesome5 name="home" size={48} color="#9CA3AF" />
            <Text style={styles.noHouseholdTitle}>No Household</Text>
            <Text style={styles.noHouseholdText}>
              Set up a household from the home screen to start creating and exchanging rewards
            </Text>
          </View>
        ) : (
          <>
            {/* Balance Card - Shows real-time user coins */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <FontAwesome5 name="coins" size={24} color="#F59E0B" />
                <Text style={styles.balanceTitle}>Your Coins</Text>
              </View>
              <Text style={styles.balanceAmount}>{user?.coins || 0}</Text>
              <Text style={styles.balanceSubtitle}>Available to spend</Text>
              
              {/* Show pending requests count */}
              {userRequests.filter(req => req.status === 'pending').length > 0 && (
                <View style={styles.pendingBadge}>
                  <FontAwesome5 name="clock" size={12} color="#F59E0B" />
                  <Text style={styles.pendingText}>
                    {userRequests.filter(req => req.status === 'pending').length} pending requests
                  </Text>
                </View>
              )}
            </View>

            {/* Category Filters */}
            <View style={styles.filtersContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filtersRow}>
                  {categoryFilters.map((filter) => (
                    <TouchableOpacity
                      key={filter.id}
                      style={[
                        styles.filterChip,
                        selectedCategory === filter.id && styles.activeFilterChip
                      ]}
                      onPress={() => setSelectedCategory(filter.id)}
                    >
                      <FontAwesome5 
                        name={filter.icon} 
                        size={14} 
                        color={selectedCategory === filter.id ? 'white' : filter.color} 
                      />
                      <Text style={[
                        styles.filterText,
                        selectedCategory === filter.id && styles.activeFilterText
                      ]}>
                        {filter.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Rewards Section - Real-time data */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {selectedCategory === 'all' ? 'All Rewards' : 
                   categoryFilters.find(f => f.id === selectedCategory)?.name + ' Rewards'}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {filteredRewards.length} available • Live updates
                </Text>
              </View>

              {filteredRewards.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <FontAwesome5 name="gift" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyTitle}>No Rewards</Text>
                  <Text style={styles.emptyText}>
                    {selectedCategory === 'all' 
                      ? 'No rewards have been created yet.'
                      : `No ${categoryFilters.find(f => f.id === selectedCategory)?.name.toLowerCase()} rewards available.`
                    }
                  </Text>
                  {user?.role === 'admin' && (
                    <TouchableOpacity 
                      style={styles.createFirstRewardButton}
                      onPress={handleCreateReward}
                    >
                      <FontAwesome5 name="plus" size={16} color="white" />
                      <Text style={styles.createFirstRewardText}>Create First Reward</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.rewardsGrid}>
                  {filteredRewards.map((reward) => {
                    const status = getRewardStatus(reward);
                    const categoryData = categoryFilters.find(c => c.id === reward.category);
                    
                    return (
                      <TouchableOpacity
                        key={reward.id}
                        style={[
                          styles.rewardCard,
                          status === 'unavailable' && styles.unavailableCard,
                          status === 'pending' && styles.pendingCard
                        ]}
                        onPress={() => {
                          console.log('🎁 Reward card clicked:', reward.title, 'Status:', status);
                          if (status === 'available') {
                            console.log('🎁 Calling handleRewardRequest for:', reward.title);
                            handleRewardRequest(reward);
                          } else if (status === 'pending') {
                            console.log('🎁 Showing pending alert for:', reward.title);
                            Alert.alert(
                              'Request Pending',
                              'You already have a pending request for this reward.',
                              [{ text: 'OK' }]
                            );
                          } else if (status === 'unavailable') {
                            console.log('🎁 Showing unavailable alert for:', reward.title);
                            Alert.alert(
                              'Reward Unavailable',
                              'This reward is no longer available.',
                              [{ text: 'OK' }]
                            );
                          } else if (status === 'cooldown') {
                            console.log('🎁 Showing cooldown alert for:', reward.title);
                            const hoursSinceLastRequest = reward.lastRequested 
                              ? (Date.now() - reward.lastRequested.getTime()) / (1000 * 60 * 60)
                              : 0;
                            const hoursRemaining = reward.cooldownHours 
                              ? Math.ceil(reward.cooldownHours - hoursSinceLastRequest)
                              : 0;
                            Alert.alert(
                              'Cooldown Active',
                              `This reward will be available in ${hoursRemaining} hours.`,
                              [{ text: 'OK' }]
                            );
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.rewardHeader}>
                          <View style={[
                            styles.rewardIcon, 
                            { backgroundColor: (categoryData?.color || '#6B7280') + '20' }
                          ]}>
                            <FontAwesome5 
                              name={categoryData?.icon || 'gift'} 
                              size={20} 
                              color={categoryData?.color || '#6B7280'} 
                            />
                          </View>
                          <View style={styles.rewardCost}>
                            <FontAwesome5 name="coins" size={12} color="#F59E0B" />
                            <Text style={styles.rewardCostText}>{reward.coinCost}</Text>
                          </View>
                        </View>
                        
                        <Text style={styles.rewardTitle}>{reward.title}</Text>
                        <Text style={styles.rewardDescription} numberOfLines={2}>
                          {reward.description}
                        </Text>
                        
                        <View style={styles.rewardFooter}>
                          {status === 'pending' && (
                            <View style={styles.statusBadge}>
                              <FontAwesome5 name="clock" size={10} color="#F59E0B" />
                              <Text style={styles.statusText}>Pending</Text>
                            </View>
                          )}
                          {status === 'unavailable' && (
                            <View style={[styles.statusBadge, styles.unavailableBadge]}>
                              <FontAwesome5 name="times" size={10} color="#EF4444" />
                              <Text style={[styles.statusText, styles.unavailableText]}>Unavailable</Text>
                            </View>
                          )}
                          {status === 'cooldown' && (
                            <View style={[styles.statusBadge, styles.cooldownBadge]}>
                              <FontAwesome5 name="hourglass-half" size={10} color="#6B7280" />
                              <Text style={[styles.statusText, styles.cooldownText]}>Cooldown</Text>
                            </View>
                          )}
                          
                          {reward.requestCount > 0 && (
                            <Text style={styles.popularityText}>
                              {reward.requestCount} requests
                            </Text>
                          )}
                        </View>
                        
                        {/* Live update indicator */}
                        <View style={styles.liveIndicator}>
                          <View style={styles.liveDot} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <CreateRewardModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onRewardCreated={handleRewardCreated}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#6C63FF',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  noHouseholdContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  noHouseholdTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  noHouseholdText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  balanceCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  balanceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 4,
  },
  balanceSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
    gap: 6,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  filtersContainer: {
    paddingVertical: 20,
    paddingLeft: 20,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeFilterChip: {
    backgroundColor: '#6C63FF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  activeFilterText: {
    color: 'white',
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  createFirstRewardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C63FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createFirstRewardText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  rewardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  rewardCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  unavailableCard: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  pendingCard: {
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rewardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardCost: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  rewardCostText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  rewardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  rewardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  unavailableBadge: {
    backgroundColor: '#FEE2E2',
  },
  cooldownBadge: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
  unavailableText: {
    color: '#DC2626',
  },
  cooldownText: {
    color: '#6B7280',
  },
  popularityText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  liveIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
}); 