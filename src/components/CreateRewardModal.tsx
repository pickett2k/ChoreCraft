import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { 
  rewardService, 
  Reward, 
  PopularReward, 
  firestoreUtils 
} from '../services/firestoreService';

interface CreateRewardModalProps {
  visible: boolean;
  onClose: () => void;
  onRewardCreated: () => void;
}

const { width } = Dimensions.get('window');

const rewardCategories = [
  { id: 'privileges', name: 'Privileges', icon: 'crown', color: '#8B5CF6' },
  { id: 'treats', name: 'Treats', icon: 'candy-cane', color: '#EC4899' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film', color: '#3B82F6' },
  { id: 'money', name: 'Money', icon: 'pound-sign', color: '#10B981' },
  { id: 'experiences', name: 'Experiences', icon: 'map-marked-alt', color: '#F59E0B' },
  { id: 'items', name: 'Items', icon: 'gift', color: '#EF4444' },
] as const;

export const CreateRewardModal: React.FC<CreateRewardModalProps> = ({
  visible,
  onClose,
  onRewardCreated,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'category' | 'details' | 'popular'>('popular');
  const [popularRewards, setPopularRewards] = useState<PopularReward[]>([]);
  const [household, setHousehold] = useState<any>(null);

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coinCost, setCoinCost] = useState('');
  const [cashValue, setCashValue] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [cooldownHours, setCooldownHours] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
      resetForm();
    }
  }, [visible]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load popular rewards
      const popular = await rewardService.getPopularRewards();
      setPopularRewards(popular);

      // Load household data
      const { household: userHousehold } = await firestoreUtils.getUserHouseholdData(user.id);
      setHousehold(userHousehold);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('popular');
    setSelectedCategory('');
    setTitle('');
    setDescription('');
    setCoinCost('');
    setCashValue('');
    setMaxRedemptions('');
    setCooldownHours('');
    setRequiresApproval(false);
  };

  const handlePopularRewardSelect = (reward: PopularReward) => {
    setTitle(reward.title);
    setDescription(reward.description);
    setSelectedCategory(reward.category);
    setCoinCost(reward.averageCoinCost.toString());
    setStep('details');
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setStep('details');
  };

  const handleCreateReward = async () => {
    if (!title.trim() || !description.trim() || !selectedCategory || !coinCost) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate cash value for money rewards
    if (selectedCategory === 'money' && (!cashValue || parseFloat(cashValue) <= 0)) {
      Alert.alert('Error', 'Please enter a valid cash value for money rewards');
      return;
    }

    if (!household) {
      Alert.alert('Error', 'No household found. Please set up a household first.');
      return;
    }

    const coinCostNum = parseInt(coinCost);
    if (isNaN(coinCostNum) || coinCostNum <= 0) {
      Alert.alert('Error', 'Please enter a valid coin cost');
      return;
    }

    try {
      setLoading(true);

      const rewardData: any = {
        title: title.trim(),
        description: description.trim(),
        coinCost: coinCostNum,
        category: selectedCategory as any,
        isActive: true,
        createdBy: user!.id,
        householdId: household.id,
        requiresApproval,
      };

      // Add cash value if it's a money reward and cash value is provided
      if (selectedCategory === 'money' && cashValue && parseFloat(cashValue) > 0) {
        rewardData.cashValue = parseFloat(cashValue);
      }

      console.log('🎁 Creating reward with data:', {
        title: rewardData.title,
        householdId: rewardData.householdId,
        householdName: household.name,
        isActive: rewardData.isActive,
        category: rewardData.category
      });

      // Only add optional fields if they have values (Firestore doesn't allow undefined)
      if (maxRedemptions && parseInt(maxRedemptions) > 0) {
        rewardData.maxRedemptions = parseInt(maxRedemptions);
      }
      
      if (cooldownHours && parseInt(cooldownHours) > 0) {
        rewardData.cooldownHours = parseInt(cooldownHours);
      }

      const result = await rewardService.createReward(rewardData);

      if (result.success) {
        if (result.wasExisting) {
          Alert.alert(
            'Reward Updated! 🎉',
            'This reward already exists, so we increased its popularity instead of creating a duplicate.',
            [{ text: 'OK', onPress: () => { onRewardCreated(); onClose(); } }]
          );
        } else {
          Alert.alert(
            'Reward Created! 🎉',
            'Your new reward has been added to the household marketplace.',
            [{ text: 'OK', onPress: () => { onRewardCreated(); onClose(); } }]
          );
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to create reward');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create reward. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPopularRewards = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Popular Rewards</Text>
        <Text style={styles.stepSubtitle}>
          Choose from rewards that other families love, or create your own
        </Text>
      </View>

      <ScrollView style={styles.popularList} showsVerticalScrollIndicator={false}>
        {popularRewards.map((reward, index) => (
          <TouchableOpacity
            key={index}
            style={styles.popularRewardCard}
            onPress={() => handlePopularRewardSelect(reward)}
          >
            <View style={styles.popularRewardHeader}>
              <View style={[styles.popularRewardIcon, { backgroundColor: reward.color + '20' }]}>
                <FontAwesome5 name={reward.icon || 'star'} size={16} color={reward.color} />
              </View>
              <View style={styles.popularRewardInfo}>
                <Text style={styles.popularRewardTitle}>{reward.title}</Text>
                <Text style={styles.popularRewardDescription}>{reward.description}</Text>
              </View>
              <View style={styles.popularRewardStats}>
                <Text style={styles.popularRewardCost}>{reward.averageCoinCost} coins</Text>
                <Text style={styles.popularRewardFrequency}>
                  {reward.requestFrequency}% of families
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.stepActions}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setStep('category')}
        >
          <FontAwesome5 name="plus" size={16} color="#6C63FF" />
          <Text style={styles.secondaryButtonText}>Create Custom Reward</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCategorySelection = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Choose Category</Text>
        <Text style={styles.stepSubtitle}>
          What type of reward are you creating?
        </Text>
      </View>

      <View style={styles.categoryGrid}>
        {rewardCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryCard,
              selectedCategory === category.id && styles.selectedCategoryCard
            ]}
            onPress={() => handleCategorySelect(category.id)}
          >
            <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
              <FontAwesome5 name={category.icon} size={20} color={category.color} />
            </View>
            <Text style={styles.categoryName}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.stepActions}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setStep('popular')}
        >
          <FontAwesome5 name="arrow-left" size={16} color="#6C63FF" />
          <Text style={styles.secondaryButtonText}>Back to Popular</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRewardDetails = () => {
    const selectedCategoryData = rewardCategories.find(c => c.id === selectedCategory);
    
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <View style={styles.selectedCategoryDisplay}>
            {selectedCategoryData && (
              <View style={[styles.categoryIcon, { backgroundColor: selectedCategoryData.color + '20' }]}>
                <FontAwesome5 name={selectedCategoryData.icon} size={16} color={selectedCategoryData.color} />
              </View>
            )}
            <Text style={styles.stepTitle}>Reward Details</Text>
          </View>
          <Text style={styles.stepSubtitle}>
            Fill in the details for your {selectedCategoryData?.name.toLowerCase()} reward
          </Text>
        </View>

        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Reward Name *</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Extra Screen Time"
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what this reward includes..."
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Coin Cost *</Text>
            <TextInput
              style={styles.textInput}
              value={coinCost}
              onChangeText={setCoinCost}
              placeholder="15"
              keyboardType="numeric"
              maxLength={4}
            />
          </View>

          {/* Cash Value field - only show for money rewards */}
          {selectedCategory === 'money' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cash Value (£) *</Text>
              <TextInput
                style={styles.textInput}
                value={cashValue}
                onChangeText={setCashValue}
                placeholder="2.50"
                keyboardType="decimal-pad"
                maxLength={6}
              />
              <Text style={styles.inputHint}>
                Amount in pounds to add to user's cash balance when redeemed
              </Text>
            </View>
          )}

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Max Uses</Text>
              <TextInput
                style={styles.textInput}
                value={maxRedemptions}
                onChangeText={setMaxRedemptions}
                placeholder="Unlimited"
                keyboardType="numeric"
                maxLength={3}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Cooldown (hours)</Text>
              <TextInput
                style={styles.textInput}
                value={cooldownHours}
                onChangeText={setCooldownHours}
                placeholder="0 (no cooldown)"
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.inputHint}>
                How long before this reward can be requested again
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setRequiresApproval(!requiresApproval)}
          >
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Requires Approval</Text>
              <Text style={styles.toggleHint}>
                Admin must approve each request
              </Text>
            </View>
            <View style={[styles.toggle, requiresApproval && styles.toggleActive]}>
              {requiresApproval && <FontAwesome5 name="check" size={12} color="white" />}
            </View>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.stepActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setStep(step === 'details' && title ? 'popular' : 'category')}
          >
            <FontAwesome5 name="arrow-left" size={16} color="#6C63FF" />
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, (!title || !description || !coinCost || (selectedCategory === 'money' && (!cashValue || parseFloat(cashValue) <= 0))) && styles.disabledButton]}
            onPress={handleCreateReward}
            disabled={!title || !description || !coinCost || (selectedCategory === 'money' && (!cashValue || parseFloat(cashValue) <= 0)) || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <FontAwesome5 name="plus" size={16} color="white" />
                <Text style={styles.primaryButtonText}>Create Reward</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAwareScrollView 
        style={styles.container}
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
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome5 name="times" size={20} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Reward</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading && step === 'popular' ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6C63FF" />
            <Text style={styles.loadingText}>Loading popular rewards...</Text>
          </View>
        ) : (
          <>
            {step === 'popular' && renderPopularRewards()}
            {step === 'category' && renderCategorySelection()}
            {step === 'details' && renderRewardDetails()}
          </>
        )}
      </KeyboardAwareScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    zIndex: 9999,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    zIndex: 10000,
    elevation: 11,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepHeader: {
    paddingVertical: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  selectedCategoryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  popularList: {
    flex: 1,
  },
  popularRewardCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  popularRewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  popularRewardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  popularRewardInfo: {
    flex: 1,
  },
  popularRewardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  popularRewardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  popularRewardStats: {
    alignItems: 'flex-end',
  },
  popularRewardCost: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  popularRewardFrequency: {
    fontSize: 12,
    color: '#6B7280',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    flex: 1,
  },
  categoryCard: {
    width: (width - 60) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCategoryCard: {
    borderWidth: 2,
    borderColor: '#6C63FF',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    color: '#1F2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
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
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#6C63FF',
  },
  stepActions: {
    flexDirection: 'row',
    paddingVertical: 20,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#6C63FF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C63FF',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
}); 