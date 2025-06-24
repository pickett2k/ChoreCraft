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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { 
  firestoreUtils, 
  choreService, 
  Chore, 
  Household,
  ChoreCompletion
} from '../services/firestoreService';
import { CompleteChoreModal } from '../components/CompleteChoreModal';
import { useFocusEffect } from '@react-navigation/native';

// Enhanced chore type with completion status
interface ChoreWithStatus extends Chore {
  hasPendingCompletion?: boolean;
  pendingCompletionId?: string;
  displayStatus: 'active' | 'pending' | 'completed';
}

export const ChoresScreen: React.FC = () => {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'pending' | 'completed'>('all');
  const [loading, setLoading] = useState(true);
  const [chores, setChores] = useState<ChoreWithStatus[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [selectedChore, setSelectedChore] = useState<Chore | null>(null);

  // Load chores data
  useEffect(() => {
    loadChoresData();
  }, [user]);

  // Refresh chores when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        console.log('🔄 ChoresScreen focused, refreshing data...');
        loadChoresData();
      }
    }, [user?.id])
  );

  const loadChoresData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('📋 Loading chores data for user:', user.id);

      // Get user's household data
      const { household: userHousehold } = await firestoreUtils.getUserHouseholdData(user.id);
      
      if (userHousehold) {
        setHousehold(userHousehold);
        console.log('✅ Household loaded:', userHousehold.name);

        // Load household chores - use 'all' to get all chores regardless of due dates
        // so we can properly match them with pending completions
        const householdChores = await choreService.getHouseholdChores(userHousehold.id, 'all');
        console.log('📋 Loaded', householdChores.length, 'total household chores');
        
        // Get pending completions to check which chores have pending completions
        const pendingCompletions = await choreService.getPendingCompletions(userHousehold.id);
        console.log('📋 Found', pendingCompletions.length, 'pending completions');
        
        // Debug: Log all pending completions
        pendingCompletions.forEach((completion, index) => {
          console.log(`🔍 Pending completion ${index + 1}:`, {
            id: completion.id,
            choreId: completion.choreId,
            choreTitle: completion.choreTitle,
            completedBy: completion.completedByName,
            status: completion.status
          });
        });

        // Enhance chores with completion status
        const enhancedChores: ChoreWithStatus[] = householdChores.map((chore: Chore) => {
          const pendingCompletion = pendingCompletions.find(completion => completion.choreId === chore.id);
          
          let displayStatus: 'active' | 'pending' | 'completed';
          if (chore.status === 'completed') {
            displayStatus = 'completed';
          } else if (pendingCompletion) {
            displayStatus = 'pending';
          } else {
            displayStatus = 'active';
          }

          // Debug: Log each chore's status determination
          console.log(`🧹 Chore "${chore.title}":`, {
            id: chore.id,
            originalStatus: chore.status,
            hasPendingCompletion: !!pendingCompletion,
            pendingCompletionId: pendingCompletion?.id,
            finalDisplayStatus: displayStatus
          });

          return {
            ...chore,
            hasPendingCompletion: !!pendingCompletion,
            pendingCompletionId: pendingCompletion?.id,
            displayStatus
          };
        });

        setChores(enhancedChores);
        console.log('✅ Loaded', enhancedChores.length, 'chores with status enhancement');
        console.log('📊 Status breakdown:', {
          active: enhancedChores.filter(c => c.displayStatus === 'active').length,
          pending: enhancedChores.filter(c => c.displayStatus === 'pending').length,
          completed: enhancedChores.filter(c => c.displayStatus === 'completed').length
        });
      } else {
        console.log('⚠️ No household found for user');
        setHousehold(null);
        setChores([]);
      }
    } catch (error) {
      console.error('❌ Error loading chores data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChores = chores.filter(chore => {
    if (activeFilter === 'all') return true;
    return chore.displayStatus === activeFilter;
  });

  const handleChoreAction = (chore: ChoreWithStatus) => {
    if (chore.displayStatus !== 'active') return;
    
    setSelectedChore(chore);
    setCompleteModalVisible(true);
  };

  const handleChoreCompleted = async (choreId: string) => {
    try {
      console.log('🎉 Chore completed, refreshing chores list...');
      
      // Close the modal first
      setCompleteModalVisible(false);
      setSelectedChore(null);
      
      // Refresh the chores list to show updated status
      await loadChoresData();
      
      console.log('✅ Chores list refreshed after completion');
    } catch (error) {
      console.error('Error after chore completion:', error);
    }
  };

  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    await loadChoresData();
  };

  const handleCreateChore = () => {
    Alert.alert('Create Chore', 'Use the home screen to create new chores!');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading chores...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#6C63FF" />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Chores</Text>
            <Text style={styles.headerSubtitle}>
              {household ? `${household.name} • ${filteredChores.filter(c => c.displayStatus === 'active').length} active tasks` : 'No household'}
            </Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
              <Ionicons name="refresh" size={20} color="white" />
            </TouchableOpacity>
            {user?.role === 'admin' && (
              <TouchableOpacity onPress={handleCreateChore} style={styles.addButton}>
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {!household ? (
          <View style={styles.noHouseholdContainer}>
            <FontAwesome5 name="home" size={48} color="#9CA3AF" />
            <Text style={styles.noHouseholdTitle}>No Household</Text>
            <Text style={styles.noHouseholdText}>
              Set up a household from the home screen to start managing chores
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.filterContainer}>
              {(['all', 'active', 'pending', 'completed'] as const).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterTab,
                    activeFilter === filter && styles.activeFilterTab
                  ]}
                                     onPress={() => setActiveFilter(filter)}
                >
                  <Text style={[
                    styles.filterText,
                    activeFilter === filter && styles.activeFilterText
                  ]}>
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <FontAwesome5 name="tasks" size={20} color="#6C63FF" />
                  <Text style={styles.statNumber}>{chores.length}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <MaterialIcons name="pending-actions" size={20} color="#F59E0B" />
                  <Text style={styles.statNumber}>
                    {chores.filter(c => c.displayStatus === 'active').length}
                  </Text>
                  <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <FontAwesome5 name="clock" size={20} color="#FF6B35" />
                  <Text style={styles.statNumber}>
                    {chores.filter(c => c.displayStatus === 'pending').length}
                  </Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <FontAwesome5 name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.statNumber}>
                    {chores.filter(c => c.displayStatus === 'completed').length}
                  </Text>
                  <Text style={styles.statLabel}>Done</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {activeFilter === 'all' ? 'All Chores' : 
                 activeFilter === 'active' ? 'Active Chores' :
                 activeFilter === 'pending' ? 'Pending Chores' : 'Completed Chores'}
              </Text>
              
              {filteredChores.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <FontAwesome5 name="clipboard-list" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyTitle}>No Chores</Text>
                  <Text style={styles.emptyText}>
                    {activeFilter === 'all' 
                      ? 'No chores created yet. Create your first chore from the home screen!'
                      : `No ${activeFilter} chores found.`
                    }
                  </Text>
                </View>
              ) : (
                filteredChores.map((chore) => (
                  <View key={chore.id} style={styles.choreCard}>
                    <View style={styles.choreHeader}>
                      <View style={styles.choreInfo}>
                        <Text style={styles.choreTitle}>{chore.title}</Text>
                        <Text style={styles.choreDescription}>{chore.description}</Text>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        chore.displayStatus === 'completed' ? styles.completedBadge : 
                        chore.displayStatus === 'pending' ? styles.pendingBadge : styles.activeBadge
                      ]}>
                        <Text style={[
                          styles.statusText,
                          chore.displayStatus === 'completed' ? styles.completedText :
                          chore.displayStatus === 'pending' ? styles.pendingText : styles.activeText
                        ]}>
                          {chore.displayStatus === 'completed' ? 'Done' : 
                           chore.displayStatus === 'pending' ? 'Pending' : 'Active'}
                        </Text>
                      </View>

                      {chore.hasPendingCompletion && (
                        <View style={styles.pendingIndicator}>
                          <FontAwesome5 name="clock" size={12} color="#FF6B35" />
                          <Text style={styles.pendingIndicatorText}>Awaiting approval</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.choreFooter}>
                      <View style={styles.choreDetails}>
                        <View style={styles.choreDetailItem}>
                          <FontAwesome5 name="coins" size={14} color="#FFD700" />
                          <Text style={styles.choreDetailText}>{chore.coinReward} coins</Text>
                        </View>
                        <View style={styles.choreDetailItem}>
                          <FontAwesome5 name="redo" size={14} color="#6B7280" />
                          <Text style={styles.choreDetailText}>{chore.frequency}</Text>
                        </View>
                        {chore.requiresPhoto && (
                          <View style={styles.choreDetailItem}>
                            <FontAwesome5 name="camera" size={14} color="#6B7280" />
                            <Text style={styles.choreDetailText}>Photo required</Text>
                          </View>
                        )}
                      </View>
                      
                      {chore.displayStatus === 'active' && (
                        <TouchableOpacity 
                          style={styles.actionButton}
                          onPress={() => handleChoreAction(chore)}
                        >
                          <FontAwesome5 name="check" size={16} color="white" />
                          <Text style={styles.actionButtonText}>Complete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Complete Chore Modal */}
      <CompleteChoreModal
        visible={completeModalVisible}
        chore={selectedChore ? {
          id: selectedChore.id,
          title: selectedChore.title,
          description: selectedChore.description,
          coinReward: selectedChore.coinReward,
          rewardType: 'coins' as const,
          requiresPhoto: selectedChore.requiresPhoto || selectedChore.afterPhotoRequired,
          beforePhoto: selectedChore.beforePhoto,
        } : null}
        onClose={() => {
          setCompleteModalVisible(false);
          setSelectedChore(null);
        }}
        onChoreCompleted={handleChoreCompleted}
      />
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
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  noHouseholdContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
    paddingHorizontal: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeFilterTab: {
    backgroundColor: '#6C63FF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeFilterText: {
    color: 'white',
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
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
    paddingHorizontal: 20,
  },
  choreCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  choreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  choreInfo: {
    flex: 1,
    marginRight: 12,
  },
  choreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  choreDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeBadge: {
    backgroundColor: '#FEF3C7',
  },
  completedBadge: {
    backgroundColor: '#D1FAE5',
  },
  pendingBadge: {
    backgroundColor: '#FEF2F2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: '#D97706',
  },
  completedText: {
    color: '#065F46',
  },
  pendingText: {
    color: '#F59E0B',
  },
  choreFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  choreDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  choreDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  choreDetailText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  actionButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  pendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
  },
  pendingIndicatorText: {
    fontSize: 12,
    color: '#F59E0B',
    marginLeft: 4,
  },
}); 