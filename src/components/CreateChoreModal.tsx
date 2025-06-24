import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  Alert,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { choreService, choreSchedulingService, householdService, FirestoreUser, Chore } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';

interface CreateChoreModalProps {
  visible: boolean;
  onClose: () => void;
  onChoreCreated: () => void;
  editingChore?: Chore | null; // Optional chore to edit
}

export const CreateChoreModal: React.FC<CreateChoreModalProps> = ({
  visible,
  onClose,
  onChoreCreated,
  editingChore
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [householdMembers, setHouseholdMembers] = useState<FirestoreUser[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    frequency: 'once' as 'once' | 'daily' | 'weekly' | 'monthly' | 'custom',
    scheduledTime: '',
    weekdayOptions: 'all' as 'all' | 'weekdays' | 'weekends' | 'custom',
    coinAmount: 50,
    requiresPhoto: false,
    anyoneCanDo: true,
    assignedTo: [] as string[],
    customFrequency: {
      days: [] as string[],
      time: '',
    },
    ageRestriction: 0,
    isAdultContent: false,
  });
  
  const [beforePhoto, setBeforePhoto] = useState<string | null>(null);

  const frequencies = [
    { value: 'once', label: 'One Time', icon: 'clock', color: '#6C63FF' },
    { value: 'daily', label: 'Daily', icon: 'calendar-day', color: '#10B981' },
    { value: 'weekly', label: 'Weekly', icon: 'calendar-week', color: '#F59E0B' },
    { value: 'monthly', label: 'Monthly', icon: 'calendar-alt', color: '#EC4899' },
    { value: 'custom', label: 'Custom', icon: 'cog', color: '#8B5CF6' },
  ];

  const weekDays = [
    { value: 'monday', label: 'Mon', fullLabel: 'Monday' },
    { value: 'tuesday', label: 'Tue', fullLabel: 'Tuesday' },
    { value: 'wednesday', label: 'Wed', fullLabel: 'Wednesday' },
    { value: 'thursday', label: 'Thu', fullLabel: 'Thursday' },
    { value: 'friday', label: 'Fri', fullLabel: 'Friday' },
    { value: 'saturday', label: 'Sat', fullLabel: 'Saturday' },
    { value: 'sunday', label: 'Sun', fullLabel: 'Sunday' },
  ];

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      frequency: 'once',
      scheduledTime: '',
      weekdayOptions: 'all',
      coinAmount: 50,
      requiresPhoto: false,
      anyoneCanDo: true,
      assignedTo: [],
      customFrequency: {
        days: [],
        time: '',
      },
      ageRestriction: 0,
      isAdultContent: false,
    });
    setBeforePhoto(null);
    setLoading(false);
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required', 
        'Camera permission is needed to take photos.'
      );
      return false;
    }
    return true;
  };

  const takeBeforePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setBeforePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const selectFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setBeforePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    }
  };

  const showPhotoOptions = () => {
    Alert.alert(
      'Add Before Photo',
      'How would you like to add a photo?',
      [
        { text: 'Camera', onPress: takeBeforePhoto },
        { text: 'Gallery', onPress: selectFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      customFrequency: {
        ...prev.customFrequency,
        days: prev.customFrequency.days.includes(day) 
          ? prev.customFrequency.days.filter(d => d !== day)
          : [...prev.customFrequency.days, day]
      }
    }));
  };

  const togglePersonAssignment = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(userId)
        ? prev.assignedTo.filter(id => id !== userId)
        : [...prev.assignedTo, userId]
    }));
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreateChore = async () => {
    if (!user || !user.householdId) {
      Alert.alert('Error', 'No household found. Please set up a household first.');
      return;
    }

    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a chore title');
      return;
    }

    const coins = parseInt(formData.coinAmount.toString());
    if (isNaN(coins) || coins < 1) {
      Alert.alert('Error', 'Please enter a valid coin reward (minimum 1)');
      return;
    }

    try {
      setLoading(true);

      const choreData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        frequency: formData.frequency,
        scheduledTime: formData.scheduledTime || undefined,
        weekdayOptions: formData.weekdayOptions,
        coinReward: coins,
        requiresPhoto: formData.requiresPhoto,
        beforePhotoRequired: !!beforePhoto,
        afterPhotoRequired: formData.requiresPhoto,
        anyoneCanDo: formData.anyoneCanDo,
        assignedTo: formData.anyoneCanDo ? [] : formData.assignedTo,
        customFrequency: formData.frequency === 'custom' ? formData.customFrequency : undefined,
        beforePhoto: beforePhoto || undefined,
        ageRestriction: formData.ageRestriction > 0 ? formData.ageRestriction : undefined,
        isAdultContent: formData.isAdultContent,
      };

      if (editingChore) {
        // TODO: Implement updateChore in choreService
        Alert.alert('Coming Soon', 'Chore editing functionality will be available in a future update.');
        setLoading(false);
        return;
      } else {
        // Create new chore
        await choreService.createChore({
          ...choreData,
          householdId: user.householdId,
          createdBy: user.id,
        });
        Alert.alert('Success! 🎉', 'Chore created successfully');
      }

      onChoreCreated();
      handleClose();
    } catch (error) {
      console.error('Error saving chore:', error);
      Alert.alert('Error', `Failed to ${editingChore ? 'update' : 'create'} chore. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Load household members when modal opens
  const loadHouseholdMembers = async () => {
    if (!user?.householdId) return;
    
    try {
      setLoadingMembers(true);
      const members = await householdService.getHouseholdMembers(user.householdId);
      setHouseholdMembers(members);
      console.log('✅ Loaded household members:', members.length);
    } catch (error) {
      console.error('❌ Error loading household members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Load members when modal becomes visible
  useEffect(() => {
    if (visible) {
      loadHouseholdMembers();
      
      // If editing a chore, populate the form
      if (editingChore) {
        setFormData({
          title: editingChore.title,
          description: editingChore.description,
          frequency: editingChore.frequency,
          scheduledTime: editingChore.scheduledTime || '',
          weekdayOptions: editingChore.weekdayOptions || 'all',
          coinAmount: editingChore.coinReward,
          requiresPhoto: editingChore.requiresPhoto,
          anyoneCanDo: editingChore.anyoneCanDo,
          assignedTo: editingChore.assignedTo || [],
          customFrequency: {
            days: editingChore.customFrequency?.days || [],
            time: editingChore.customFrequency?.time || ''
          },
          ageRestriction: editingChore.ageRestriction || 0,
          isAdultContent: editingChore.isAdultContent || false,
        });
        setBeforePhoto(editingChore.beforePhoto || null);
      } else {
        resetForm();
      }
    }
  }, [visible, editingChore]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
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
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editingChore ? 'Edit Chore' : 'Create Chore'}</Text>
          <TouchableOpacity onPress={handleCreateChore} style={styles.saveButton}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Create</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.card}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Chore Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.title}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                  placeholder="e.g., Take out trash"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Describe what needs to be done..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequency</Text>
            
            <View style={styles.frequencyGrid}>
              {frequencies.map((freq) => (
                <TouchableOpacity
                  key={freq.value}
                  style={[
                    styles.frequencyCard,
                    formData.frequency === freq.value && [styles.frequencyCardActive, { borderColor: freq.color }]
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, frequency: freq.value as any }))}
                >
                  <FontAwesome5 
                    name={freq.icon as any} 
                    size={20} 
                    color={formData.frequency === freq.value ? freq.color : '#9CA3AF'} 
                  />
                  <Text style={[
                    styles.frequencyLabel,
                    formData.frequency === freq.value && { color: freq.color }
                  ]}>
                    {freq.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Time Input for One Time, Daily, Weekly, Monthly */}
            {(formData.frequency === 'once' || formData.frequency === 'daily' || formData.frequency === 'weekly' || formData.frequency === 'monthly') && (
              <View style={styles.timeSection}>
                <Text style={styles.timeSectionTitle}>Scheduled Time (Optional)</Text>
                <View style={styles.timeInputContainer}>
                  <FontAwesome5 name="clock" size={16} color="#6C63FF" />
                  <TextInput
                    style={styles.timeInput}
                    value={formData.scheduledTime}
                    onChangeText={(time) => setFormData(prev => ({ ...prev, scheduledTime: time }))}
                    placeholder="09:00"
                    placeholderTextColor="#9CA3AF"
                  />
                  <Text style={styles.timeHint}>24-hour format</Text>
                </View>
                
                {formData.scheduledTime && (
                  <View style={styles.schedulePreview}>
                    <FontAwesome5 name="info-circle" size={14} color="#6C63FF" />
                    <Text style={styles.schedulePreviewText}>
                      {formData.frequency === 'once' && `Scheduled for ${formData.scheduledTime}`}
                      {formData.frequency === 'daily' && `Every day at ${formData.scheduledTime}`}
                      {formData.frequency === 'weekly' && `Every week at ${formData.scheduledTime}`}
                      {formData.frequency === 'monthly' && `Every month at ${formData.scheduledTime}`}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Custom Frequency Details */}
            {formData.frequency === 'custom' && (
              <View style={styles.customFrequencySection}>
                <Text style={styles.customFrequencyTitle}>Select Days</Text>
                <View style={styles.daysGrid}>
                  {weekDays.map((day) => (
                    <TouchableOpacity
                      key={day.value}
                      style={[
                        styles.dayButton,
                        formData.customFrequency.days.includes(day.value) && styles.dayButtonActive
                      ]}
                      onPress={() => toggleDay(day.value)}
                    >
                      <Text style={[
                        styles.dayButtonText,
                        formData.customFrequency.days.includes(day.value) && styles.dayButtonTextActive
                      ]}>
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.customFrequencyTitle}>Time (Optional)</Text>
                <View style={styles.timeInputContainer}>
                  <FontAwesome5 name="clock" size={16} color="#6C63FF" />
                  <TextInput
                    style={styles.timeInput}
                    value={formData.customFrequency.time}
                    onChangeText={(time) => setFormData(prev => ({ ...prev, customFrequency: { ...prev.customFrequency, time } }))}
                    placeholder="09:00"
                    placeholderTextColor="#9CA3AF"
                  />
                  <Text style={styles.timeHint}>24-hour format</Text>
                </View>

                {formData.customFrequency.days.length > 0 && (
                  <View style={styles.schedulePreview}>
                    <FontAwesome5 name="info-circle" size={14} color="#6C63FF" />
                    <Text style={styles.schedulePreviewText}>
                      Every {formData.customFrequency.days.map(day => 
                        weekDays.find(d => d.value === day)?.fullLabel
                      ).join(', ')} at {formData.customFrequency.time || 'any time'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reward</Text>
            
            <View style={styles.card}>
              <View style={styles.rewardInfo}>
                <FontAwesome5 name="coins" size={18} color="#FFD700" />
                <Text style={styles.rewardInfoText}>Reward with coins that can be exchanged for prizes</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Reward Amount (coins) *
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.coinAmount.toString()}
                  onChangeText={(text) => {
                    // Handle empty string and non-numeric input
                    if (text === '') {
                      setFormData(prev => ({ ...prev, coinAmount: 0 }));
                    } else {
                      const numValue = parseInt(text, 10);
                      if (!isNaN(numValue) && numValue >= 0) {
                        setFormData(prev => ({ ...prev, coinAmount: numValue }));
                      }
                    }
                  }}
                  placeholder="10"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>
            
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <FontAwesome5 name="users" size={18} color="#10B981" />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>Anyone Can Do</Text>
                    <Text style={styles.settingSubtitle}>Available to all household members</Text>
                  </View>
                </View>
                <Switch
                  value={formData.anyoneCanDo}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, anyoneCanDo: value, assignedTo: [] }))}
                  trackColor={{ false: '#E5E7EB', true: '#10B981' }}
                  thumbColor={formData.anyoneCanDo ? '#FFFFFF' : '#9CA3AF'}
                />
              </View>

              <View style={[styles.settingRow, formData.anyoneCanDo ? { borderBottomWidth: 0 } : {}]}>
                <View style={styles.settingInfo}>
                  <FontAwesome5 name="camera" size={18} color="#6C63FF" />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingTitle}>Require Photo Proof</Text>
                    <Text style={styles.settingSubtitle}>Before/after photos needed</Text>
                  </View>
                </View>
                <Switch
                  value={formData.requiresPhoto}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, requiresPhoto: value }))}
                  trackColor={{ false: '#E5E7EB', true: '#6C63FF' }}
                  thumbColor={formData.requiresPhoto ? '#FFFFFF' : '#9CA3AF'}
                />
              </View>

              {/* Person Assignment when "Anyone Can Do" is disabled */}
              {!formData.anyoneCanDo && (
                <View style={styles.assignmentSection}>
                  <Text style={styles.assignmentTitle}>Assign To</Text>
                  <Text style={styles.assignmentSubtitle}>Select who should do this chore</Text>
                  
                  <View style={styles.membersGrid}>
                    {householdMembers.map((member) => (
                      <TouchableOpacity
                        key={member.id}
                        style={[
                          styles.memberCard,
                          formData.assignedTo.includes(member.id) && styles.memberCardActive
                        ]}
                        onPress={() => togglePersonAssignment(member.id)}
                      >
                        <Text style={styles.memberAvatar}>{member.avatar || '👤'}</Text>
                        <Text style={[
                          styles.memberName,
                          formData.assignedTo.includes(member.id) && styles.memberNameActive
                        ]}>
                          {member.displayName}
                        </Text>
                        {formData.assignedTo.includes(member.id) && (
                          <View style={styles.memberCheckmark}>
                            <FontAwesome5 name="check" size={12} color="white" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {formData.assignedTo.length === 0 && (
                    <View style={styles.noAssignmentWarning}>
                      <FontAwesome5 name="exclamation-triangle" size={14} color="#F59E0B" />
                      <Text style={styles.noAssignmentText}>Please select at least one person</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Optional Before Photo */}
          {formData.requiresPhoto && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Before Photo (Optional)</Text>
              
              <View style={styles.card}>
                <Text style={styles.photoSectionSubtitle}>
                  You can take a "before" photo now, or the person doing the chore can take it later.
                </Text>
                
                {beforePhoto ? (
                  <View style={styles.photoContainer}>
                    <Image source={{ uri: beforePhoto }} style={styles.photoPreview} />
                    <View style={styles.photoActions}>
                      <TouchableOpacity 
                        style={styles.retakeButton}
                        onPress={showPhotoOptions}
                      >
                        <FontAwesome5 name="camera" size={14} color="#6C63FF" />
                        <Text style={styles.retakeButtonText}>Change Photo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => setBeforePhoto(null)}
                      >
                        <FontAwesome5 name="trash" size={14} color="#DC2626" />
                        <Text style={styles.removeButtonText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.addPhotoButton}
                    onPress={showPhotoOptions}
                  >
                    <FontAwesome5 name="camera-retro" size={24} color="#6C63FF" />
                    <Text style={styles.addPhotoButtonText}>Add Before Photo</Text>
                    <Text style={styles.addPhotoSubtext}>Optional - can be added later</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <View style={styles.autoDeleteInfo}>
            <FontAwesome5 name="info-circle" size={16} color="#6C63FF" />
            <Text style={styles.autoDeleteText}>
              Completed chores automatically delete after 7 days to save storage space.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAwareScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  saveButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingTop: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    marginLeft: 20,
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    paddingTop: 10,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  frequencyCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  frequencyCardActive: {
    borderWidth: 2,
    backgroundColor: '#F8FAFC',
  },
  frequencyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 6,
  },
  rewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  rewardInfoText: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '500',
    flex: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  autoDeleteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  autoDeleteText: {
    flex: 1,
    fontSize: 12,
    color: '#6C63FF',
    fontWeight: '500',
  },
  photoSectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  photoContainer: {
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  retakeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C63FF',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  addPhotoButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#6C63FF',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  addPhotoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C63FF',
    marginTop: 4,
  },
  addPhotoSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  // Custom Frequency Styles
  customFrequencySection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  customFrequencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    minWidth: 45,
    alignItems: 'center',
  },
  dayButtonActive: {
    borderColor: '#6C63FF',
    backgroundColor: '#EEF2FF',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  dayButtonTextActive: {
    color: '#6C63FF',
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    gap: 8,
  },
  timeInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  timeHint: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  schedulePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  schedulePreviewText: {
    flex: 1,
    fontSize: 12,
    color: '#6C63FF',
    fontWeight: '500',
  },
  // Assignment Styles
  assignmentSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  assignmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  assignmentSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  memberCard: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    minWidth: 80,
    position: 'relative',
  },
  memberCardActive: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  memberAvatar: {
    fontSize: 24,
    marginBottom: 6,
  },
  memberName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  memberNameActive: {
    color: '#16A34A',
  },
  memberCheckmark: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAssignmentWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  noAssignmentText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
  },
  timeSection: {
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  timeSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
}); 