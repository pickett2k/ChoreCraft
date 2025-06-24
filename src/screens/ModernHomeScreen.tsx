import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { CreateChoreModal } from '../components/CreateChoreModal';
import { HouseholdSetupModal } from '../components/HouseholdSetupModal';
import { LeaderboardCard } from '../components/LeaderboardCard';
import { useRouter } from 'expo-router';
import { 
  firestoreUtils, 
  householdService, 
  choreService, 
  choreSchedulingService,
  Household, 
  Chore, 
  FirestoreUser,
  activityService,
  missedChoresService,
  ActivityItem,
  MissedChore
} from '../services/firestoreService';

const { width } = Dimensions.get('window');

export const ModernHomeScreen: React.FC = () => {
  const { user, logout, refreshUserData } = useAuth();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [householdSetupVisible, setHouseholdSetupVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [household, setHousehold] = useState<Household | null>(null);
  const [chores, setChores] = useState<Chore[]>([]);
  const [todaysChores, setTodaysChores] = useState<Chore[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [missedChores, setMissedChores] = useState<MissedChore[]>([]);
  const router = useRouter();

  // Load household and chore data
  useEffect(() => {
    loadHouseholdData();
  }, [user]);

  // Refresh user data when screen comes into focus (e.g., returning from Exchange screen)
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        refreshUserData();
      }
    }, [user?.id])
  );

  const loadHouseholdData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('🏠 Loading household data for user:', user.id);

      // Get user's household data
      const { user: firestoreUser, household: userHousehold } = await firestoreUtils.getUserHouseholdData(user.id);
      
      if (userHousehold) {
        setHousehold(userHousehold);
        console.log('✅ Household loaded:', userHousehold.name);

        // Fix any custom frequency chores with incorrect due dates (run once)
        try {
          await choreSchedulingService.fixCustomFrequencyChores(userHousehold.id);
        } catch (error) {
          console.warn('⚠️ Failed to fix custom frequency chores:', error);
        }

        // Load household chores
        const householdChores = await choreService.getHouseholdChores(userHousehold.id, 'active');
        setChores(householdChores);
        
        // Filter today's chores with same logic as ChoresScreen - hide completed daily chores
        const filteredTodaysChores = [];
        
        for (const chore of householdChores) {
          // Always show one-time chores
          if (chore.frequency === 'once') {
            filteredTodaysChores.push(chore);
            continue;
          }
          
          // For daily chores, check if already completed today
          if (chore.frequency === 'daily') {
            try {
              const completedToday = await choreService.hasChoreBeenCompletedToday(chore.id);
              if (!completedToday) {
                filteredTodaysChores.push(chore);
              } else {
                console.log(`🚫 Daily chore "${chore.title}" already completed today, hiding from home`);
              }
            } catch (error) {
              console.error('Error checking daily chore completion:', error);
              // If error checking, show the chore to be safe
              filteredTodaysChores.push(chore);
            }
            continue;
          }
          
          // For custom frequency chores, check if today is one of the target days
          if (chore.frequency === 'custom' && chore.customFrequency?.days) {
            const today = new Date();
            const todayDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
            
            const targetDays = chore.customFrequency.days.map(day => {
              const dayMap: { [key: string]: number } = {
                'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
                'thursday': 4, 'friday': 5, 'saturday': 6
              };
              return dayMap[day.toLowerCase()];
            });
            
            if (targetDays.includes(todayDayOfWeek)) {
              // Check if already completed today
              try {
                const completedToday = await choreService.hasChoreBeenCompletedToday(chore.id);
                if (!completedToday) {
                  filteredTodaysChores.push(chore);
                  console.log(`🗓️ Custom frequency chore "${chore.title}" available today on home screen (${chore.customFrequency.days.join(', ')})`);
                } else {
                  console.log(`🚫 Custom frequency chore "${chore.title}" already completed today, hiding from home`);
                }
              } catch (error) {
                console.error('Error checking custom chore completion:', error);
                filteredTodaysChores.push(chore);
              }
            }
            continue;
          }
          
          // For other recurring chores, only show if due today or overdue
          if (chore.nextDueDate) {
            const dueDate = chore.nextDueDate instanceof Date ? 
              chore.nextDueDate : 
              (chore.nextDueDate as any).toDate ? (chore.nextDueDate as any).toDate() : new Date(chore.nextDueDate as any);
            const now = new Date();
            if (dueDate <= now) {
              filteredTodaysChores.push(chore);
            }
          } else {
            // Show chores without due dates (need initialization)
            filteredTodaysChores.push(chore);
          }
        }
        
        setTodaysChores(filteredTodaysChores.slice(0, 5)); // Show max 5 on home screen
        console.log('✅ Loaded', householdChores.length, 'total chores,', filteredTodaysChores.length, 'available today');

        // Update the main chores state to use the filtered chores for accurate counting
        setChores(filteredTodaysChores); // Use filtered chores, not all household chores

        // Load recent activities
        const activities = await activityService.getRecentActivities(userHousehold.id, 5);
        // Temporarily add mock activities for testing if no real activities exist
        if (activities.length === 0) {
          const mockActivities = activityService.getMockActivities();
          setRecentActivities(mockActivities.slice(0, 5));
        } else {
          setRecentActivities(activities);
        }
        
        // Load missed chores if user is admin
        if (firestoreUser?.role === 'admin') {
          const missed = await missedChoresService.getMissedChoresLast7Days(userHousehold.id);
          setMissedChores(missed);
        }
      } else {
        console.log('⚠️ No household found for user');
        setHousehold(null);
        setChores([]);
        setTodaysChores([]);
        setHouseholdSetupVisible(true);
      }
    } catch (error) {
      console.error('❌ Error loading household data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHouseholdData();
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleCreateChore = () => {
    if (!household) {
      Alert.alert('No Household', 'Please set up a household first');
      return;
    }
    setCreateModalVisible(true);
  };

  const handleChoreCreated = () => {
    setCreateModalVisible(false);
    loadHouseholdData(); // Refresh data
    Alert.alert('Success!', 'Chore created successfully! 🎉');
  };

  const handleHouseholdSetup = () => {
    setHouseholdSetupVisible(true);
  };

  const handleHouseholdSetupSuccess = (householdId: string) => {
    setHouseholdSetupVisible(false);
    loadHouseholdData(); // Refresh data
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning! 🌅';
    if (hour < 17) return 'Good afternoon! ☀️';
    return 'Good evening! 🌙';
  };

  const getCompletedChoresCount = () => {
    return user?.firestoreData?.stats?.choresCompleted || 0;
  };

  const getTodaysProgress = () => {
    // Calculate actual progress based on today's completed chores
    const completed = user?.firestoreData?.stats?.choresCompleted || 0;
    const total = todaysChores.length || Math.max(completed, 1); // Ensure we don't divide by 0
    return { 
      completed, 
      total, 
      percentage: total > 0 ? Math.min((completed / total) * 100, 100) : 0 
    };
  };

  const formatTimeAgo = (timestamp: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - timestamp.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${diffInDays}d ago`;
  };

  const formatMissedDate = (date: Date): string => {
    const today = new Date();
    const diffInDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    return `${diffInDays} days ago`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading your household...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6C63FF" />
      
      {/* Header with gradient */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.welcomeText}>
              {user ? user.displayName : 'Welcome to ChoreCraft'}
            </Text>
            {household && (
              <Text style={styles.householdText}>
                {household.name} • {household.members.length} members
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={handleSignOut} style={styles.profileButton}>
            <FontAwesome5 name="user-circle" size={32} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#6C63FF']}
            tintColor="#6C63FF"
          />
        }
      >
        {!household ? (
          <HouseholdSetupModal
            visible={true}
            onClose={() => {}}
            onSuccess={loadHouseholdData}
          />
        ) : (
          <>
            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, styles.coinsCard]}>
                <View style={styles.statIcon}>
                  <FontAwesome5 name="coins" size={24} color="#FFD700" />
                </View>
                <Text style={styles.statNumber}>{user?.coins || 0}</Text>
                <Text style={styles.statLabel}>Coins Earned</Text>
              </View>
              
              <View style={[styles.statCard, styles.moneyCard]}>
                <View style={styles.statIcon}>
                  <FontAwesome5 name="pound-sign" size={24} color="#4CAF50" />
                </View>
                <Text style={styles.statNumber}>£{(user?.firestoreData?.totalCashRewards || 0).toFixed(2)}</Text>
                <Text style={styles.statLabel}>Cash Rewards</Text>
              </View>
            </View>

            {/* Progress Card */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Today's Progress</Text>
                <View style={styles.progressBadge}>
                  <Text style={styles.progressBadgeText}>
                    {getTodaysProgress().completed}/{getTodaysProgress().total}
                  </Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${getTodaysProgress().percentage}%` }]} />
              </View>
              <Text style={styles.progressSubtitle}>
                {getTodaysProgress().completed === 0 
                  ? "Let's get started! 🚀" 
                  : "Keep going! You're doing great! 🌟"
                }
              </Text>
            </View>

            {/* Leaderboard */}
            <LeaderboardCard householdId={household.id} />

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              
              <View style={styles.actionGrid}>
                <TouchableOpacity 
                  style={[styles.actionCard, styles.primaryAction]}
                  onPress={() => router.push('/(tabs)/two')}
                >
                  <View style={styles.actionIcon}>
                    <MaterialIcons name="assignment" size={28} color="white" />
                  </View>
                  <Text style={styles.actionTitle}>View Chores</Text>
                  <Text style={styles.actionSubtitle}>
                    {chores.length} active chores
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionCard, styles.tertiaryAction]}
                  onPress={() => router.push('/(tabs)/calendar')}
                >
                  <View style={styles.actionIcon}>
                    <FontAwesome5 name="calendar-alt" size={24} color="white" />
                  </View>
                  <Text style={styles.actionTitle}>Calendar</Text>
                  <Text style={styles.actionSubtitle}>Weekly schedule</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.actionGrid}>
                <TouchableOpacity 
                  style={[styles.actionCard, styles.exchangeAction]}
                  onPress={() => router.push('/(tabs)/exchange')}
                >
                  <View style={styles.actionIcon}>
                    <FontAwesome5 name="coins" size={24} color="white" />
                  </View>
                  <Text style={styles.actionTitle}>Exchange</Text>
                  <Text style={styles.actionSubtitle}>Redeem coins</Text>
                </TouchableOpacity>

                {user?.role === 'admin' && household && (
                  <TouchableOpacity 
                    style={[styles.actionCard, styles.secondaryAction]}
                    onPress={handleCreateChore}
                  >
                    <View style={styles.actionIcon}>
                      <Ionicons name="add-circle" size={28} color="white" />
                    </View>
                    <Text style={styles.actionTitle}>Create Chore</Text>
                    <Text style={styles.actionSubtitle}>Add new task</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.actionCard, styles.quaternaryAction]}
                  onPress={() => router.push('/(tabs)/settings')}
                >
                  <View style={styles.actionIcon}>
                    <FontAwesome5 name="cog" size={24} color="white" />
                  </View>
                  <Text style={styles.actionTitle}>Settings</Text>
                  <Text style={styles.actionSubtitle}>Manage account</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Today's Chores */}
            {household && todaysChores.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Today's Chores</Text>
                {todaysChores.map((chore) => (
                  <View key={chore.id} style={styles.choreCard}>
                    <View style={styles.choreInfo}>
                      <Text style={styles.choreTitle}>{chore.title}</Text>
                      <Text style={styles.choreDescription}>{chore.description}</Text>
                    </View>
                    <View style={styles.choreReward}>
                      <FontAwesome5 name="coins" size={16} color="#FFD700" />
                      <Text style={styles.choreRewardText}>{chore.coinReward}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Recent Activity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              {recentActivities.length > 0 ? (
                <View style={styles.activityContainer}>
                  {recentActivities.map((activity) => (
                    <View key={activity.id} style={styles.activityCard}>
                      <View style={[styles.activityIcon, { backgroundColor: activity.color + '20' }]}>
                        <FontAwesome5 name={activity.icon} size={16} color={activity.color} />
                      </View>
                      <View style={styles.activityContent}>
                        <Text style={styles.activityText}>{activity.message}</Text>
                        <Text style={styles.activityTime}>{formatTimeAgo(activity.timestamp)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyActivityCard}>
                  <FontAwesome5 name="star" size={20} color="#FFD700" />
                  <Text style={styles.emptyActivityText}>
                    {household 
                      ? `Welcome to ${household.name}! 🎉`
                      : 'Welcome to ChoreCraft! 🎉'
                    }
                  </Text>
                </View>
              )}
            </View>

            {/* Missed Chores (Admin Only) */}
            {user?.role === 'admin' && missedChores.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Missed Chores (Last 7 Days)
                  <Text style={styles.sectionSubtitle}> • {missedChores.length} missed</Text>
                </Text>
                <View style={styles.missedChoresContainer}>
                  {missedChores.slice(0, 3).map((missed) => (
                    <View key={missed.id} style={styles.missedChoreCard}>
                      <View style={styles.missedChoreHeader}>
                        <View style={styles.missedChoreIcon}>
                          <FontAwesome5 name="exclamation-triangle" size={16} color="#F59E0B" />
                        </View>
                        <View style={styles.missedChoreInfo}>
                          <Text style={styles.missedChoreTitle}>{missed.chore.title}</Text>
                          <Text style={styles.missedChoreDate}>
                            Due {formatMissedDate(missed.dueDate)} • {missed.daysMissed} days overdue
                          </Text>
                        </View>
                        {missed.coinDeduction > 0 && (
                          <View style={styles.deductionBadge}>
                            <Text style={styles.deductionText}>-{missed.coinDeduction}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.assignedUsers}>
                        {missed.assignedUsers.map((assignedUser, index) => (
                          <Text key={assignedUser.id} style={styles.assignedUserText}>
                            {assignedUser.displayName}{index < missed.assignedUsers.length - 1 ? ', ' : ''}
                          </Text>
                        ))}
                      </View>
                    </View>
                  ))}
                  {missedChores.length > 3 && (
                    <TouchableOpacity style={styles.viewMoreButton}>
                      <Text style={styles.viewMoreText}>View {missedChores.length - 3} more missed chores</Text>
                      <FontAwesome5 name="chevron-right" size={12} color="#6366F1" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Account Info */}
            <View style={styles.accountSection}>
              <Text style={styles.sectionTitle}>Account</Text>
              
              <View style={styles.accountCard}>
                <View style={styles.accountRow}>
                  <View style={styles.accountInfo}>
                    <Ionicons name="mail" size={20} color="#666" />
                    <Text style={styles.accountLabel}>Email</Text>
                  </View>
                  <Text style={styles.accountValue}>{user?.email || 'No email'}</Text>
                </View>
                
                <View style={styles.accountRow}>
                  <View style={styles.accountInfo}>
                    <FontAwesome5 name="crown" size={20} color="#666" />
                    <Text style={styles.accountLabel}>Role</Text>
                  </View>
                  <View style={user?.role === 'admin' ? styles.adminBadge : styles.userBadge}>
                    <Text style={user?.role === 'admin' ? styles.adminBadgeText : styles.userBadgeText}>
                      {user?.role === 'admin' ? 'Admin' : 'Member'}
                    </Text>
                  </View>
                </View>
                
                {household && (
                  <View style={styles.accountRow}>
                    <View style={styles.accountInfo}>
                      <FontAwesome5 name="home" size={20} color="#666" />
                      <Text style={styles.accountLabel}>Household</Text>
                    </View>
                    <Text style={styles.accountValue}>{household.name}</Text>
                  </View>
                )}

                <View style={styles.accountRow}>
                  <View style={styles.accountInfo}>
                    <FontAwesome5 name="trophy" size={20} color="#666" />
                    <Text style={styles.accountLabel}>Chores Completed</Text>
                  </View>
                  <Text style={styles.accountValue}>{getCompletedChoresCount()}</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Create Chore Modal */}
      <CreateChoreModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onChoreCreated={handleChoreCreated}
      />

      {/* Household Setup Modal */}
      <HouseholdSetupModal
        visible={householdSetupVisible}
        onClose={() => setHouseholdSetupVisible(false)}
        onSuccess={handleHouseholdSetupSuccess}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 10,
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
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  householdText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  profileButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  setupCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  setupSubtitle: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 16,
    lineHeight: 20,
  },
  setupButton: {
    backgroundColor: '#FFC107',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  setupButtonText: {
    color: '#856404',
    fontWeight: '600',
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  coinsCard: {
    borderTopWidth: 4,
    borderTopColor: '#FFD700',
  },
  moneyCard: {
    borderTopWidth: 4,
    borderTopColor: '#4CAF50',
  },
  statIcon: {
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  progressCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  progressBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryAction: {
    backgroundColor: '#6C63FF',
  },
  secondaryAction: {
    backgroundColor: '#4CAF50',
  },
  tertiaryAction: {
    backgroundColor: '#FF9800',
  },
  quaternaryAction: {
    backgroundColor: '#9C27B0',
  },
  exchangeAction: {
    backgroundColor: '#FFD700',
  },
  actionIcon: {
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  choreCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  choreInfo: {
    flex: 1,
  },
  choreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  choreDescription: {
    fontSize: 14,
    color: '#666',
  },
  choreReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  choreRewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
  },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },
  activityText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  accountSection: {
    marginTop: 24,
    marginBottom: 40,
  },
  accountCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  accountValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  adminBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  userBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  userBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
  },
  // Activity styles
  activityContainer: {
    marginTop: 12,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  emptyActivityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyActivityText: {
    fontSize: 14,
    color: '#1A1A1A',
    marginLeft: 12,
  },
  // Missed chores styles
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: 'normal',
  },
  missedChoresContainer: {
    marginTop: 12,
  },
  missedChoreCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  missedChoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  missedChoreIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  missedChoreInfo: {
    flex: 1,
    marginLeft: 12,
  },
  missedChoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  missedChoreDate: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 2,
  },
  deductionBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deductionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  assignedUsers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  assignedUserText: {
    fontSize: 12,
    color: '#6B7280',
  },
  viewMoreButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  viewMoreText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
    marginRight: 8,
  },
}); 