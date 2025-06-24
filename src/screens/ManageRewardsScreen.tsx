import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { 
  rewardService, 
  Reward, 
  firestoreUtils 
} from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';

export const ManageRewardsScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>([]);

  const categoryOptions = [
    { id: 'money', label: 'Money', icon: 'dollar-sign', color: '#10B981' },
    { id: 'treats', label: 'Treats', icon: 'cookie-bite', color: '#F59E0B' },
    { id: 'privileges', label: 'Privileges', icon: 'crown', color: '#8B5CF6' },
    { id: 'experiences', label: 'Experiences', icon: 'star', color: '#EC4899' },
    { id: 'entertainment', label: 'Entertainment', icon: 'film', color: '#6366F1' },
    { id: 'items', label: 'Items', icon: 'gift', color: '#EF4444' },
  ];

  useEffect(() => {
    loadRewards();
  }, [user]);

  const loadRewards = async () => {
    if (!user?.householdId) {
      setLoading(false);
      return;
    }

    try {
      console.log('🎁 Loading household rewards...');
      const householdRewards = await rewardService.getHouseholdRewards(user.householdId);
      setRewards(householdRewards);
      console.log('✅ Loaded', householdRewards.length, 'rewards');
    } catch (error) {
      console.error('❌ Error loading rewards:', error);
      Alert.alert('Error', 'Failed to load rewards. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRewards();
    setRefreshing(false);
  };

  const toggleRewardStatus = async (reward: Reward) => {
    try {
      const result = await rewardService.updateReward(reward.id, {
        isActive: !reward.isActive
      });

      if (result.success) {
        setRewards(prev => prev.map(r => 
          r.id === reward.id 
            ? { ...r, isActive: !r.isActive }
            : r
        ));
        Alert.alert(
          'Success', 
          `Reward ${reward.isActive ? 'deactivated' : 'activated'} successfully.`
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to update reward status.');
      }
    } catch (error) {
      console.error('Error toggling reward status:', error);
      Alert.alert('Error', 'Failed to update reward status.');
    }
  };

  const deleteReward = (reward: Reward) => {
    Alert.alert(
      'Delete Reward',
      `Are you sure you want to delete "${reward.title}"? This will hide it from users but preserve any existing requests.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await rewardService.deleteReward(reward.id);
              
              if (result.success) {
                setRewards(prev => prev.filter(r => r.id !== reward.id));
            Alert.alert('Success', 'Reward deleted successfully.');
              } else {
                Alert.alert('Error', result.error || 'Failed to delete reward.');
              }
            } catch (error) {
              console.error('Error deleting reward:', error);
              Alert.alert('Error', 'Failed to delete reward.');
            }
          }
        }
      ]
    );
  };

  const handleSaveReward = async (rewardData: Partial<Reward>) => {
    if (!user?.householdId) {
      Alert.alert('Error', 'No household found.');
      return;
    }

    try {
      if (editingReward) {
        // Update existing reward
        const result = await rewardService.updateReward(editingReward.id, rewardData);
        
        if (result.success) {
          setRewards(prev => prev.map(r => 
            r.id === editingReward.id 
              ? { ...r, ...rewardData }
              : r
          ));
          Alert.alert('Success', 'Reward updated successfully!');
        } else {
          Alert.alert('Error', result.error || 'Failed to update reward.');
          return;
        }
      } else {
        // Create new reward
        const newRewardData = {
          title: rewardData.title!,
          description: rewardData.description!,
          coinCost: rewardData.coinCost!,
          category: rewardData.category!,
          icon: rewardData.icon,
          color: rewardData.color,
          isActive: true,
          householdId: user.householdId,
          createdBy: user.id,
          requiresApproval: true,
          maxRedemptions: rewardData.maxRedemptions,
        };

        const result = await rewardService.createReward(newRewardData);
        
        if (result.success) {
          await loadRewards(); // Reload to get the complete reward data
          Alert.alert('Success', 'Reward created successfully!');
        } else {
          Alert.alert('Error', result.error || 'Failed to create reward.');
          return;
        }
      }
      
      setShowCreateModal(false);
      setEditingReward(null);
    } catch (error) {
      console.error('Error saving reward:', error);
      Alert.alert('Error', 'Failed to save reward.');
    }
  };

  const RewardCard = ({ reward }: { reward: Reward }) => {
    const claimsCount = reward.currentRedemptions || 0;
    
    return (
      <View style={[styles.rewardCard, !reward.isActive && styles.rewardCardInactive]}>
        <View style={styles.rewardHeader}>
          <View style={styles.rewardInfo}>
            <View style={[styles.rewardIcon, { backgroundColor: (reward.color || '#6C63FF') + '20' }]}>
              <FontAwesome5 name={(reward.icon as any) || 'gift'} size={20} color={reward.color || '#6C63FF'} />
            </View>
            <View style={styles.rewardDetails}>
              <View style={styles.titleRow}>
                <Text style={[styles.rewardTitle, !reward.isActive && styles.rewardTitleInactive]}>
                  {reward.title}
                </Text>
                <View style={[
                  styles.statusBadge, 
                  reward.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    reward.isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive
                  ]}>
                    {reward.isActive ? 'Active' : 'Disabled'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.rewardDescription, !reward.isActive && styles.rewardDescriptionInactive]}>
                {reward.description}
              </Text>
              <View style={styles.rewardMeta}>
                <View style={styles.costBadge}>
                  <FontAwesome5 name="coins" size={12} color="#F59E0B" />
                  <Text style={styles.costText}>{reward.coinCost} coins</Text>
                </View>
                {reward.cashValue && reward.cashValue > 0 && (
                  <View style={styles.cashBadge}>
                    <FontAwesome5 name="pound-sign" size={12} color="#10B981" />
                    <Text style={styles.cashText}>£{reward.cashValue.toFixed(2)}</Text>
                  </View>
                )}
                <View style={[styles.categoryBadge, { backgroundColor: (reward.color || '#6C63FF') + '20' }]}>
                  <Text style={[styles.categoryText, { color: reward.color || '#6C63FF' }]}>
                    {reward.category}
                  </Text>
                </View>
              </View>
              {reward.maxRedemptions && (
                <Text style={styles.claimsInfo}>
                  {claimsCount}/{reward.maxRedemptions} claimed
                </Text>
              )}
            </View>
          </View>
          
          <View style={styles.rewardActions}>
            <TouchableOpacity 
              style={[styles.toggleButton, reward.isActive ? styles.toggleButtonActive : styles.toggleButtonInactive]}
              onPress={() => toggleRewardStatus(reward)}
            >
              <FontAwesome5 
                name={reward.isActive ? 'eye' : 'eye-slash'} 
                size={16} 
                color={reward.isActive ? '#10B981' : '#9CA3AF'} 
              />
              <Text style={[styles.toggleButtonText, reward.isActive ? styles.toggleButtonTextActive : styles.toggleButtonTextInactive]}>
                {reward.isActive ? 'Visible' : 'Hidden'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setEditingReward(reward)}
          >
            <FontAwesome5 name="edit" size={14} color="#6C63FF" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => deleteReward(reward)}
          >
            <FontAwesome5 name="trash" size={14} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading rewards...</Text>
      </View>
    );
  }

  if (!user?.householdId) {
    return (
      <View style={[styles.container, styles.centered]}>
        <FontAwesome5 name="home" size={48} color="#9CA3AF" />
        <Text style={styles.emptyStateTitle}>No Household</Text>
        <Text style={styles.emptyStateSubtitle}>
          You need to be part of a household to manage rewards
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Rewards</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <FontAwesome5 name="plus" size={20} color="#6C63FF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exchange Rewards</Text>
            <Text style={styles.sectionSubtitle}>
              Create and manage rewards that users can claim with their coins
            </Text>
          </View>

          <View style={styles.rewardsContainer}>
            {rewards.map((reward) => (
              <RewardCard key={reward.id} reward={reward} />
            ))}
          </View>

          {rewards.length === 0 && (
            <View style={styles.emptyState}>
              <FontAwesome5 name="gift" size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No rewards yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Create your first reward to get started!
              </Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => setShowCreateModal(true)}
              >
                <FontAwesome5 name="plus" size={16} color="white" />
                <Text style={styles.createButtonText}>Create Reward</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <CreateEditRewardModal
        visible={showCreateModal || editingReward !== null}
        reward={editingReward}
        onClose={() => {
          setShowCreateModal(false);
          setEditingReward(null);
        }}
        onSave={handleSaveReward}
        categoryOptions={categoryOptions}
      />
    </View>
  );
};

const CreateEditRewardModal = ({ 
  visible, 
  reward,
  onClose, 
  onSave,
  categoryOptions
}: {
  visible: boolean;
  reward: Reward | null;
  onClose: () => void;
  onSave: (reward: Partial<Reward>) => void;
  categoryOptions: any[];
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cost: '',
    category: 'treats' as Reward['category'],
    maxClaims: '',
    cashValue: '', // Cash value for money rewards
    cooldownHours: '', // Cooldown period in hours
    requiresApproval: false, // Whether reward requires admin approval
  });

  React.useEffect(() => {
    if (reward) {
      console.log('🎁 Editing reward:', {
        title: reward.title,
        cooldownHours: reward.cooldownHours,
        requiresApproval: reward.requiresApproval,
        maxRedemptions: reward.maxRedemptions,
        cashValue: reward.cashValue
      });
      
      setFormData({
        title: reward.title,
        description: reward.description,
        cost: reward.coinCost.toString(),
        category: reward.category,
        maxClaims: reward.maxRedemptions?.toString() || '',
        cashValue: reward.cashValue?.toString() || '',
        cooldownHours: reward.cooldownHours?.toString() || '',
        requiresApproval: reward.requiresApproval,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        cost: '',
        category: 'treats',
        maxClaims: '',
        cashValue: '',
        cooldownHours: '',
        requiresApproval: false,
      });
    }
  }, [reward]);

  const handleSave = () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.cost.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    const cost = parseInt(formData.cost);
    if (isNaN(cost) || cost <= 0) {
      Alert.alert('Error', 'Please enter a valid cost.');
      return;
    }

    const categoryData = categoryOptions.find(c => c.id === formData.category)!;
    
    const rewardData: Partial<Reward> = {
      title: formData.title,
      description: formData.description,
      coinCost: cost,
      category: formData.category,
      icon: categoryData.icon,
      color: categoryData.color,
      isActive: reward?.isActive ?? true,
    };

    // Only add optional fields if they have valid values (Firestore doesn't allow undefined)
    if (formData.maxClaims && parseInt(formData.maxClaims) > 0) {
      rewardData.maxRedemptions = parseInt(formData.maxClaims);
    }
    
    if (formData.cashValue && parseFloat(formData.cashValue) > 0) {
      rewardData.cashValue = parseFloat(formData.cashValue);
    }

    if (formData.cooldownHours && parseInt(formData.cooldownHours) > 0) {
      rewardData.cooldownHours = parseInt(formData.cooldownHours);
    } else {
      // Explicitly set to undefined to remove cooldown if field is empty
      rewardData.cooldownHours = undefined;
    }

    rewardData.requiresApproval = formData.requiresApproval;

    onSave(rewardData);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAwareScrollView 
        style={styles.modalContainer}
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraHeight={50}
        extraScrollHeight={Platform.OS === 'ios' ? 50 : 30}
        keyboardOpeningTime={250}
        showsVerticalScrollIndicator={false}
        resetScrollToCoords={{ x: 0, y: 0 }}
        enableResetScrollToCoords={false}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {reward ? 'Edit Reward' : 'Create Reward'}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="e.g., Cinema Trip"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Describe the reward..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Cost (coins) *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.cost}
              onChangeText={(text) => setFormData(prev => ({ ...prev, cost: text }))}
              placeholder="e.g., 500"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {categoryOptions.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryOption,
                    formData.category === category.id && styles.categoryOptionActive,
                    { borderColor: category.color }
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, category: category.id as Reward['category'] }))}
                >
                  <FontAwesome5 
                    name={category.icon} 
                    size={18} 
                    color={formData.category === category.id ? 'white' : category.color} 
                  />
                  <Text style={[
                    styles.categoryOptionText,
                    formData.category === category.id && styles.categoryOptionTextActive
                  ]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Max Claims (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={formData.maxClaims}
              onChangeText={(text) => setFormData(prev => ({ ...prev, maxClaims: text }))}
              placeholder="Leave empty for unlimited"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
            <Text style={styles.inputHint}>
              Limit how many times this reward can be claimed
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Cash Value (optional)</Text>
            <TextInput
              style={styles.textInput}
              value={formData.cashValue}
              onChangeText={(text) => setFormData(prev => ({ ...prev, cashValue: text }))}
              placeholder="e.g., 50.00"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
            <Text style={styles.inputHint}>
              Cash value for money rewards
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Cooldown Hours (optional)</Text>
            {formData.cooldownHours && (
              <Text style={styles.currentValueHint}>
                Current: {formData.cooldownHours} hour{parseInt(formData.cooldownHours) !== 1 ? 's' : ''}
              </Text>
            )}
            <TextInput
              style={styles.textInput}
              value={formData.cooldownHours}
              onChangeText={(text) => setFormData(prev => ({ ...prev, cooldownHours: text }))}
              placeholder="Leave empty for no cooldown"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
            <Text style={styles.inputHint}>
              How long (in hours) before this reward can be requested again
            </Text>
          </View>

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setFormData(prev => ({ ...prev, requiresApproval: !prev.requiresApproval }))}
          >
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Requires Approval</Text>
              <Text style={styles.toggleHint}>
                Admin must approve each request
              </Text>
            </View>
            <View style={[styles.toggle, formData.requiresApproval && styles.toggleActive]}>
              {formData.requiresApproval && <FontAwesome5 name="check" size={12} color="white" />}
            </View>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAwareScrollView>
    </Modal>
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
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
  },
  rewardsContainer: {
    gap: 16,
  },
  rewardCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  rewardCardInactive: {
    backgroundColor: '#F3F4F6',
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  rewardInfo: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 16,
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rewardDetails: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  rewardTitleInactive: {
    color: '#9CA3AF',
  },
  rewardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  rewardDescriptionInactive: {
    color: '#9CA3AF',
  },
  rewardMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  costText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  cashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  cashText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  claimsInfo: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  rewardActions: {
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6C63FF',
    backgroundColor: 'white',
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C63FF',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: 'white',
    gap: 6,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C63FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    zIndex: 9999,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: 'white',
    zIndex: 10000,
    elevation: 11,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C63FF',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  currentValueHint: {
    fontSize: 12,
    color: '#6C63FF',
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'white',
    gap: 8,
    minWidth: 120,
  },
  categoryOptionActive: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryOptionTextActive: {
    color: 'white',
  },
  categoryOptionTextInactive: {
    color: 'white',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },
  statusBadgeActive: {
    backgroundColor: '#10B981',
  },
  statusBadgeInactive: {
    backgroundColor: '#9CA3AF',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  statusBadgeTextActive: {
    color: 'white',
  },
  statusBadgeTextInactive: {
    color: 'white',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    backgroundColor: 'white',
  },
  toggleButtonActive: {
    borderColor: '#10B981',
  },
  toggleButtonInactive: {
    borderColor: '#9CA3AF',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginLeft: 8,
  },
  toggleButtonTextActive: {
    color: '#10B981',
  },
  toggleButtonTextInactive: {
    color: '#9CA3AF',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  toggleHint: {
    fontSize: 14,
    color: '#6B7280',
  },
  toggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#6C63FF',
  },
});
