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
  Image,
  Modal,
  Platform,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from 'react-native';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { 
  firestoreUtils, 
  householdService, 
  choreService,
  userService,
  rewardService,
  Household, 
  Chore,
  FirestoreUser
} from '../services/firestoreService';
import { Timestamp } from 'firebase/firestore';
import InvitationManagementModal from '../components/InvitationManagementModal';
import PendingMemberApprovalModal from '../components/PendingMemberApprovalModal';
import { CreateChoreModal } from '../components/CreateChoreModal';
import { notificationService } from '../services/notificationService';

const { width } = Dimensions.get('window');

interface SettingsScreenProps {
  navigation: any;
}

type SettingsSection = 'profile' | 'household' | 'chores' | 'notifications' | 'privacy';

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const router = useRouter();
  const { user, logout, updateUserProfile } = useAuth();
  
  // State management
  const [household, setHousehold] = useState<Household | null>(null);
  const [householdChores, setHouseholdChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [choreLoading, setChoreLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  
  // Notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState({
    pushEnabled: true,
    choreReminders: true,
    rewardAlerts: true,
    familyUpdates: true,
    soundEnabled: true,
    vibrationEnabled: true,
  });
  
  // Modal states
  const [showQRModal, setShowQRModal] = useState(false);
  const [showInvitationManagement, setShowInvitationManagement] = useState(false);
  const [showPendingMembers, setShowPendingMembers] = useState(false);
  const [showChoreEditModal, setShowChoreEditModal] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  
  // Profile editing
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
    dateOfBirth: '',
    avatar: null as string | null,
  });
  
  // Household editing
  const [isEditingHousehold, setIsEditingHousehold] = useState(false);
  const [householdForm, setHouseholdForm] = useState({
    name: '',
    currency: 'GBP',
    autoApprove: false,
    requirePhotoProof: false,
    coinDeductionEnabled: false,
    missedChoreDeduction: 5,
    gracePeriodHours: 24,
  });

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  ];

  // Load data on mount
  useEffect(() => {
    loadData();
    // Initialize notification service
    notificationService.initialize().catch(console.error);
  }, [user]);

  // Update forms when data loads
  useEffect(() => {
    if (household) {
      setHouseholdForm({
        name: household.name,
        currency: household.settings?.currency?.code || 'GBP',
        autoApprove: household.settings?.autoApprove || false,
        requirePhotoProof: household.settings?.requirePhotoProof || false,
        coinDeductionEnabled: household.settings?.coinDeduction?.enabled || false,
        missedChoreDeduction: household.settings?.coinDeduction?.missedChoreDeduction || 5,
        gracePeriodHours: household.settings?.coinDeduction?.gracePeriodHours || 24,
      });
    }
  }, [household]);

  // Initialize profile form when user data loads
  useEffect(() => {
    if (user) {
      // Handle dateOfBirth which could be a Timestamp or string
      let dobString = '';
      if (user.firestoreData?.dateOfBirth) {
        if (typeof user.firestoreData.dateOfBirth === 'string') {
          dobString = user.firestoreData.dateOfBirth;
        } else if (user.firestoreData.dateOfBirth.toDate) {
          // It's a Firestore Timestamp
          dobString = user.firestoreData.dateOfBirth.toDate().toISOString().split('T')[0];
        }
      }
      
      setProfileForm({
        displayName: user.displayName || '',
        dateOfBirth: dobString,
        avatar: user.avatar || null,
      });
      
      // Load notification preferences from user data
      if (user.firestoreData?.preferences?.notifications) {
        setNotificationPrefs({
          pushEnabled: user.firestoreData.preferences.notifications.pushEnabled ?? true,
          choreReminders: user.firestoreData.preferences.notifications.choreReminders ?? true,
          rewardAlerts: user.firestoreData.preferences.notifications.rewardAlerts ?? true,
          familyUpdates: user.firestoreData.preferences.notifications.familyUpdates ?? true,
          soundEnabled: user.firestoreData.preferences.notifications.soundEnabled ?? true,
          vibrationEnabled: user.firestoreData.preferences.notifications.vibrationEnabled ?? true,
        });
      }
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { household: userHousehold } = await firestoreUtils.getUserHouseholdData(user.id);
      setHousehold(userHousehold);
      
      // Load chores if user is admin
      if (user.role === 'admin' && userHousehold) {
        await loadHouseholdChores(userHousehold.id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHouseholdChores = async (householdId: string) => {
    try {
      setChoreLoading(true);
      const chores = await choreService.getHouseholdChores(householdId, 'all');
      setHouseholdChores(chores);
    } catch (error) {
      console.error('Error loading chores:', error);
    } finally {
      setChoreLoading(false);
    }
  };

  const selectProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileForm(prev => ({ ...prev, avatar: result.assets[0].uri }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Prepare updates
      const updates: Partial<FirestoreUser> = {};
      
      if (profileForm.displayName.trim() !== user.displayName) {
        updates.displayName = profileForm.displayName.trim();
      }
      
      // Handle date of birth parsing and age calculation
      if (profileForm.dateOfBirth.trim()) {
        const dobResult = parseDateOfBirth(profileForm.dateOfBirth.trim());
        if (dobResult.isValid && dobResult.date && dobResult.age !== undefined) {
          // Store as Firestore Timestamp
          updates.dateOfBirth = Timestamp.fromDate(dobResult.date);
          updates.age = dobResult.age;
        } else {
          Alert.alert('Invalid Date', 'Please enter a valid date of birth in formats like:\n• DD/MM/YYYY\n• MM/DD/YYYY\n• YYYY-MM-DD\n• Jan 15, 1990');
          return;
        }
      }
      
      // TODO: Handle avatar upload to Firebase Storage
      if (profileForm.avatar && profileForm.avatar !== user.avatar) {
        // For now, just store the URI - in production, upload to Firebase Storage first
        updates.avatar = profileForm.avatar;
      }
      
      // Update in Firestore
      if (Object.keys(updates).length > 0) {
        await userService.updateUser(user.id, updates);
        
        // Update local auth context
        await updateUserProfile(updates);
        
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Info', 'No changes to save');
      }
      
    setIsEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveHouseholdSettings = async () => {
    if (!household || !user) return;
    
    try {
      setLoading(true);
      
      // Prepare household updates
      const updates: Partial<Household> = {};
      
      if (householdForm.name.trim() !== household.name) {
        updates.name = householdForm.name.trim();
      }
      
      // Update settings if they've changed
      const newSettings = {
        ...household.settings,
        currency: {
          code: householdForm.currency,
          symbol: currencies.find(c => c.code === householdForm.currency)?.symbol || '£'
        },
        autoApprove: householdForm.autoApprove,
        requirePhotoProof: householdForm.requirePhotoProof,
        coinDeduction: {
          ...household.settings?.coinDeduction,
          enabled: householdForm.coinDeductionEnabled,
          missedChoreDeduction: householdForm.missedChoreDeduction,
          gracePeriodHours: householdForm.gracePeriodHours,
        }
      };
      
      updates.settings = newSettings;
      
      // Update in Firestore
      if (Object.keys(updates).length > 0) {
        await householdService.updateHousehold(household.id, updates);
        
        // Refresh household data
        await loadData();
        
        Alert.alert('Success', 'Household settings updated!');
      } else {
        Alert.alert('Info', 'No changes to save');
      }
      
      setIsEditingHousehold(false);
    } catch (error) {
      console.error('Error updating household settings:', error);
      Alert.alert('Error', 'Failed to update household settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const editChore = (chore: Chore) => {
    setEditingChore(chore);
    setShowChoreEditModal(true);
  };

  const deleteChore = (chore: Chore) => {
    Alert.alert(
      'Delete Chore',
      `Are you sure you want to delete "${chore.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setChoreLoading(true);
              
              // Delete the chore from Firestore
              await choreService.deleteChore(chore.id);
              
              Alert.alert('Success', 'Chore deleted successfully');
              
              // Refresh the chore list
              if (household) {
                await loadHouseholdChores(household.id);
              }
            } catch (error) {
              console.error('Error deleting chore:', error);
              Alert.alert('Error', 'Failed to delete chore. Please try again.');
            } finally {
              setChoreLoading(false);
            }
          }
        }
      ]
    );
  };

  const updateNotificationPreference = async (key: keyof typeof notificationPrefs, value: boolean) => {
    if (!user) return;
    
    try {
      const newPrefs = { ...notificationPrefs, [key]: value };
      setNotificationPrefs(newPrefs);
      
      // Special handling for push notifications
      if (key === 'pushEnabled') {
        if (value) {
          // User enabled push notifications - get token
          const pushToken = await notificationService.registerForPushNotifications();
          if (pushToken) {
            // Store push token in user preferences
            const updates: Partial<FirestoreUser> = {
              [`preferences.notifications.${key}`]: value,
              [`preferences.notifications.expoPushToken`]: pushToken,
              [`preferences.notifications.tokenUpdatedAt`]: new Date()
            } as any;
            
            await userService.updateUser(user.id, updates);
            await updateUserProfile(updates);
            
    Alert.alert(
              'Push Notifications Enabled',
              'You will now receive push notifications for chore reminders and household updates!'
            );
          } else {
            // Failed to get push token
            setNotificationPrefs(notificationPrefs); // Revert
            Alert.alert(
              'Permission Required',
              'Push notifications require permission. Please enable notifications in your device settings.'
            );
            return;
          }
        } else {
          // User disabled push notifications
          const updates: Partial<FirestoreUser> = {
            [`preferences.notifications.${key}`]: value,
            [`preferences.notifications.expoPushToken`]: null
          } as any;
          
          await userService.updateUser(user.id, updates);
          await updateUserProfile(updates);
        }
      } else {
        // Regular notification preference update
        const updates: Partial<FirestoreUser> = {
          [`preferences.notifications.${key}`]: value
        } as any;
        
        await userService.updateUser(user.id, updates);
        await updateUserProfile(updates);
      }
      
      console.log(`✅ Updated notification preference: ${key} = ${value}`);
    } catch (error) {
      console.error('Error updating notification preference:', error);
      // Revert the change on error
      setNotificationPrefs(notificationPrefs);
      Alert.alert('Error', 'Failed to update notification preference');
    }
  };

  const exportUserData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get all user data
      const userData = await userService.getUser(user.id);
      const userChores = household ? await choreService.getUserChores(user.id, household.id) : [];
      const rewardRequests = await rewardService.getUserRewardRequests(user.id);
      
      const exportData = {
        profile: userData,
        chores: userChores,
        rewardRequests,
        exportDate: new Date().toISOString(),
      };
      
      // In a real app, this would generate a downloadable file
      Alert.alert(
        'Data Export Ready',
        `Your data export contains:\n• Profile information\n• ${userChores.length} chore records\n• ${rewardRequests.length} reward requests\n\nExport date: ${new Date().toLocaleDateString()}`,
        [
          { text: 'OK' }
        ]
      );
      
      console.log('📊 User data export:', exportData);
    } catch (error) {
      console.error('Error exporting user data:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Implement actual account deletion
              try {
                // 1. Remove user from household if they're a member
                if (household && user.role !== 'admin') {
                  await householdService.removeMemberFromHousehold(household.id, user.id);
                }
                // 2. If user is admin and household has other members, transfer ownership
                if (household && user.role === 'admin' && household.members.length > 1) {
                  Alert.alert(
                    'Transfer Ownership',
                    'You are the household admin. Please transfer ownership to another member before deleting your account.',
                    [{ text: 'OK' }]
                  );
                  return;
                }
                
                // 3. Delete user document and related data
                await userService.deleteUser(user.id);
                
                Alert.alert(
                  'Account Deleted',
                  'Your account has been permanently deleted.',
                  [
                    {
                      text: 'OK',
                      onPress: () => logout()
                    }
                  ]
                );
              } catch (deleteError) {
                console.error('Error during account deletion:', deleteError);
                Alert.alert(
                  'Deletion Error', 
                  'There was an error deleting your account. Please contact support for assistance.'
                );
              }
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Function to parse various date formats and calculate age
  const parseDateOfBirth = (dateString: string): { isValid: boolean; age?: number; date?: Date } => {
    if (!dateString.trim()) return { isValid: false };
    
    const formats = [
      // DD/MM/YYYY or DD-MM-YYYY
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
      // MM/DD/YYYY or MM-DD-YYYY  
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
      // YYYY/MM/DD or YYYY-MM-DD
      /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,
      // DD MMM YYYY (e.g., "15 Jan 1990")
      /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/,
      // MMM DD, YYYY (e.g., "Jan 15, 1990")
      /^([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})$/
    ];
    
    let parsedDate: Date | null = null;
    
    // Try built-in Date parsing first
    parsedDate = new Date(dateString);
    if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900 && parsedDate.getFullYear() < new Date().getFullYear()) {
      const age = new Date().getFullYear() - parsedDate.getFullYear();
      const monthDiff = new Date().getMonth() - parsedDate.getMonth();
      const dayDiff = new Date().getDate() - parsedDate.getDate();
      
      const finalAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
      
      if (finalAge >= 0 && finalAge <= 120) {
        return { isValid: true, age: finalAge, date: parsedDate };
      }
    }
    
    return { isValid: false };
  };

  const SectionTab = ({ section, title, icon }: { section: SettingsSection; title: string; icon: string }) => (
    <TouchableOpacity
      style={[styles.sectionTab, activeSection === section && styles.activeSectionTab]}
      onPress={() => setActiveSection(section)}
    >
      <FontAwesome5 
        name={icon} 
        size={15} 
        color={activeSection === section ? '#6C63FF' : '#9CA3AF'} 
      />
      <Text style={[
        styles.sectionTabText,
        activeSection === section && styles.activeSectionTabText
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const SettingRow = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement, 
    iconColor = '#6C63FF',
    disabled = false
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    iconColor?: string;
    disabled?: boolean;
  }) => (
    <TouchableOpacity 
      style={[styles.settingRow, disabled && styles.disabledRow]} 
      onPress={disabled ? undefined : onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: iconColor + '20' }]}>
          <FontAwesome5 name={icon} size={16} color={iconColor} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, disabled && styles.disabledText]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, disabled && styles.disabledText]}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement || (onPress && !disabled && <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />)}
    </TouchableOpacity>
  );

  const renderProfileSection = () => (
    <View style={styles.sectionContent}>
          <View style={styles.card}>
            <View style={styles.profileHeader}>
              <TouchableOpacity 
                style={styles.avatarContainer}
                onPress={isEditingProfile ? selectProfileImage : undefined}
              >
            {profileForm.avatar ? (
              <Image source={{ uri: profileForm.avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                <FontAwesome5 name="user" size={32} color="#9CA3AF" />
                  </View>
                )}
                {isEditingProfile && (
                  <View style={styles.editAvatarOverlay}>
                    <FontAwesome5 name="camera" size={12} color="white" />
                  </View>
                )}
              </TouchableOpacity>
              
              <View style={styles.profileInfo}>
                {isEditingProfile ? (
              <View style={styles.editForm}>
                    <TextInput
                  style={styles.formInput}
                  value={profileForm.displayName}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, displayName: text }))}
                      placeholder="Display Name"
                    />
                <TextInput
                  style={[styles.formInput, { marginTop: 8 }]}
                  value={profileForm.dateOfBirth}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, dateOfBirth: text }))}
                  placeholder="Date of Birth (DD/MM/YYYY, MM/DD/YYYY, etc.)"
                  keyboardType="default"
                />
              </View>
                ) : (
                  <>
                <Text style={styles.name}>{user?.displayName || 'User'}</Text>
                <Text style={styles.email}>{user?.email || 'No email'}</Text>
                <View style={styles.badges}>
                  <View style={[styles.badge, user?.role === 'admin' ? styles.adminBadge : styles.memberBadge]}>
                    <Text style={[styles.badgeText, user?.role === 'admin' ? styles.adminBadgeText : styles.memberBadgeText]}>
                      {user?.role === 'admin' ? 'Admin' : 'Member'}
                    </Text>
                  </View>
                    </View>
              </>
                  )}
              </View>

              <TouchableOpacity 
                style={styles.editButton}
                onPress={isEditingProfile ? saveProfile : () => setIsEditingProfile(true)}
              >
                <FontAwesome5 
                  name={isEditingProfile ? "check" : "edit"} 
                  size={16} 
                  color={isEditingProfile ? "#10B981" : "#6C63FF"} 
                />
              </TouchableOpacity>
            </View>

            {isEditingProfile && (
              <View style={styles.editActions}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => {
                setIsEditingProfile(false);
                setProfileForm({
                  displayName: user?.displayName || '',
                  dateOfBirth: '',
                  avatar: null,
                });
              }}
            >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <FontAwesome5 name="coins" size={16} color="#F59E0B" />
                <Text style={styles.balanceLabel}>Coins</Text>
            <Text style={styles.balanceValue}>{user?.coins || 0}</Text>
              </View>
              <View style={styles.balanceItem}>
                <FontAwesome5 name="pound-sign" size={16} color="#10B981" />
            <Text style={styles.balanceLabel}>Total Cash Rewards</Text>
            <Text style={styles.balanceValue}>£{(user?.firestoreData?.totalCashRewards || 0).toFixed(2)}</Text>
              </View>
            </View>

        {/* Cash Rewards Reset Option */}
        {(user?.firestoreData?.totalCashRewards || 0) > 0 && (
          <View style={styles.resetCashContainer}>
            <TouchableOpacity 
              style={styles.resetCashButton}
              onPress={() => {
                Alert.alert(
                  'Reset Cash Rewards',
                  `Are you sure you want to reset your cash rewards balance to £0.00?\n\nCurrent balance: £${(user?.firestoreData?.totalCashRewards || 0).toFixed(2)}\n\nThis action cannot be undone.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Reset', 
                      style: 'destructive', 
                      onPress: async () => {
                        if (!user) return;
                        try {
                          await userService.resetCashRewards(user.id);
                          Alert.alert('Success', 'Cash rewards have been reset to £0.00');
                          // Refresh user data
                          await loadData();
                        } catch (error) {
                          Alert.alert('Error', 'Failed to reset cash rewards. Please try again.');
                        }
                      }
                    },
                  ]
                );
              }}
            >
              <FontAwesome5 name="redo" size={14} color="#EF4444" />
              <Text style={styles.resetCashButtonText}>Reset Cash Rewards</Text>
            </TouchableOpacity>
          </View>
        )}
        </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Statistics</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <FontAwesome5 name="tasks" size={20} color="#6C63FF" />
            <Text style={styles.statValue}>{user?.firestoreData?.stats?.choresCompleted || 0}</Text>
            <Text style={styles.statLabel}>Chores Completed</Text>
          </View>
          
          <View style={styles.statItem}>
            <FontAwesome5 name="gift" size={20} color="#EC4899" />
            <Text style={styles.statValue}>{user?.firestoreData?.stats?.rewardsClaimed || 0}</Text>
            <Text style={styles.statLabel}>Rewards Claimed</Text>
          </View>
          
          <View style={styles.statItem}>
            <FontAwesome5 name="fire" size={20} color="#F59E0B" />
            <Text style={styles.statValue}>{user?.firestoreData?.stats?.currentStreak || 0}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          
          <View style={styles.statItem}>
            <FontAwesome5 name="trophy" size={20} color="#10B981" />
            <Text style={styles.statValue}>{user?.firestoreData?.stats?.longestStreak || 0}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
        </View>
        
        <SettingRow
          icon="chart-line"
          title="View Detailed Stats"
          subtitle="See your complete activity history"
                onPress={() => {
            const stats = user?.firestoreData?.stats;
            Alert.alert(
              'Your Statistics',
              `🎯 Total Achievements:\n• ${stats?.choresCompleted || 0} chores completed\n• ${user?.totalCoinsEarned || 0} total coins earned\n• ${stats?.rewardsClaimed || 0} rewards claimed\n\n🔥 Streaks:\n• Current: ${stats?.currentStreak || 0} days\n• Best: ${stats?.longestStreak || 0} days\n\n💰 Earnings:\n• Current coins: ${user?.coins || 0}\n• Total cash rewards: £${(user?.firestoreData?.totalCashRewards || 0).toFixed(2)}\n\nKeep up the great work! 🌟`
            );
          }}
        />
                  </View>

      <View style={styles.card}>
        <SettingRow
          icon="sign-out-alt"
          title="Sign Out"
          subtitle="Sign out of your account"
          onPress={() => {
            Alert.alert(
              'Sign Out',
              'Are you sure you want to sign out?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: logout },
              ]
            );
          }}
          iconColor="#EF4444"
        />
                </View>
    </View>
  );

  const renderHouseholdSection = () => {
    if (!household) {
      return (
        <View style={styles.sectionContent}>
          <View style={styles.emptyState}>
            <FontAwesome5 name="home" size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No Household</Text>
            <Text style={styles.emptyStateText}>You're not part of a household yet</Text>
                  </View>
                </View>
      );
    }

    const isAdmin = user?.role === 'admin';

    return (
      <View style={styles.sectionContent}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="home" size={20} color="#6C63FF" />
            <Text style={styles.cardTitle}>{household.name}</Text>
            {isAdmin && (
              <TouchableOpacity 
                onPress={() => setIsEditingHousehold(!isEditingHousehold)}
                style={styles.editButton}
              >
                <FontAwesome5 
                  name={isEditingHousehold ? "check" : "edit"} 
                  size={16} 
                  color={isEditingHousehold ? "#10B981" : "#6C63FF"} 
                />
              </TouchableOpacity>
            )}
                  </View>

          {isEditingHousehold ? (
            <View style={styles.editForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Household Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={householdForm.name}
                  onChangeText={(text) => setHouseholdForm(prev => ({ ...prev, name: text }))}
                  placeholder="Enter household name"
                />
                </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Currency</Text>
              <TouchableOpacity 
                  style={styles.currencySelector}
                onPress={() => {
                  Alert.alert(
                    'Select Currency',
                    'Choose your preferred currency:',
                    currencies.map(currency => ({
                      text: `${currency.symbol} ${currency.name}`,
                        onPress: () => setHouseholdForm(prev => ({ ...prev, currency: currency.code }))
                    }))
                  );
                }}
              >
                  <Text style={styles.currencySelectorText}>
                    {currencies.find(c => c.code === householdForm.currency)?.symbol} {householdForm.currency}
                    </Text>
                  <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                </TouchableOpacity>
                  </View>

              <View style={styles.switchGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Auto-Approve Chores</Text>
                  <Switch
                    value={householdForm.autoApprove}
                    onValueChange={(value) => setHouseholdForm(prev => ({ ...prev, autoApprove: value }))}
                    trackColor={{ false: '#E5E7EB', true: '#6C63FF' }}
                    thumbColor={householdForm.autoApprove ? '#FFFFFF' : '#F3F4F6'}
                  />
                </View>
                
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Require Photo Proof</Text>
                  <Switch
                    value={householdForm.requirePhotoProof}
                    onValueChange={(value) => setHouseholdForm(prev => ({ ...prev, requirePhotoProof: value }))}
                    trackColor={{ false: '#E5E7EB', true: '#6C63FF' }}
                    thumbColor={householdForm.requirePhotoProof ? '#FFFFFF' : '#F3F4F6'}
                  />
                  </View>
                
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Coin Deduction for Missed Chores</Text>
                <Switch
                    value={householdForm.coinDeductionEnabled}
                    onValueChange={(value) => setHouseholdForm(prev => ({ ...prev, coinDeductionEnabled: value }))}
                  trackColor={{ false: '#E5E7EB', true: '#6C63FF' }}
                    thumbColor={householdForm.coinDeductionEnabled ? '#FFFFFF' : '#F3F4F6'}
                />
              </View>

                {householdForm.coinDeductionEnabled && (
                  <View style={styles.nestedSettings}>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Deduction Amount (coins)</Text>
                      <TextInput
                        style={styles.formInput}
                        value={householdForm.missedChoreDeduction?.toString() || ''}
                        onChangeText={(text) => {
                          const value = parseInt(text) || 0;
                          setHouseholdForm(prev => ({ ...prev, missedChoreDeduction: value }));
                        }}
                        keyboardType="numeric"
                        placeholder="5"
                      />
                  </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Grace Period (hours)</Text>
                      <TextInput
                        style={styles.formInput}
                        value={householdForm.gracePeriodHours?.toString() || ''}
                        onChangeText={(text) => {
                          const value = parseInt(text) || 0;
                          setHouseholdForm(prev => ({ ...prev, gracePeriodHours: value }));
                        }}
                        keyboardType="numeric"
                        placeholder="24"
                      />
                      <Text style={styles.formHint}>Hours after due date before deduction applies</Text>
                </View>
                  </View>
                )}
              </View>

              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditingHousehold(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={saveHouseholdSettings}>
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <SettingRow
                icon="qrcode"
                title="Invite Code"
                subtitle={household.inviteCode}
                onPress={() => setShowQRModal(true)}
              />
              
              <SettingRow
                icon="user-plus"
                title="Manage Invitations"
                subtitle="Send invites and manage members"
                onPress={() => setShowInvitationManagement(true)}
                disabled={!isAdmin}
              />
              
              <SettingRow
                icon="gift"
                title="Manage Rewards"
                subtitle="Create and edit household rewards"
                onPress={() => router.push('/manage-rewards')}
                disabled={!isAdmin}
              />
              
              <SettingRow
                icon="coins"
                title="Coin Exchange"
                subtitle="View and claim available rewards"
                onPress={() => router.push('/(tabs)/exchange')}
              />
              
              {isAdmin && (
                <SettingRow
                  icon="chart-bar"
                  title="Household Analytics"
                  subtitle="View household performance and insights"
                  onPress={() => {
                    if (!household) return;
                    Alert.alert(
                      'Household Analytics',
                      `📊 ${household.name} Statistics:\n\n• ${household.stats?.activeMemberCount || 0} active members\n• ${household.stats?.totalChoresCompleted || 0} total chores completed\n• ${household.stats?.totalCoinsAwarded || 0} total coins awarded\n\n💰 Settings:\n• Currency: ${household.settings?.currency?.symbol}${household.settings?.currency?.code}\n• Auto-approve: ${household.settings?.autoApprove ? 'Yes' : 'No'}\n• Photo proof required: ${household.settings?.requirePhotoProof ? 'Yes' : 'No'}\n• Coin deduction: ${household.settings?.coinDeduction?.enabled ? 'Yes' : 'No'}\n\nKeep your household motivated! 🏠✨`
                    );
                  }}
                />
              )}
            </>
          )}
              </View>
      </View>
    );
  };

  const renderChoresSection = () => {
    const isAdmin = user?.role === 'admin';
    
    if (!isAdmin) {
      return (
        <View style={styles.sectionContent}>
          <View style={styles.emptyState}>
            <FontAwesome5 name="lock" size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>Admin Only</Text>
            <Text style={styles.emptyStateText}>Only household admins can manage chores</Text>
                  </View>
                </View>
      );
    }

    if (!household) {
      return (
        <View style={styles.sectionContent}>
          <View style={styles.emptyState}>
            <FontAwesome5 name="home" size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No Household</Text>
            <Text style={styles.emptyStateText}>Join a household to manage chores</Text>
              </View>
        </View>
      );
    }

    return (
      <View style={styles.sectionContent}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="tasks" size={20} color="#6C63FF" />
            <Text style={styles.cardTitle}>Chore Management</Text>
            <Text style={styles.choreCount}>{householdChores.length} chores</Text>
                  </View>

          {choreLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6C63FF" />
              <Text style={styles.loadingText}>Loading chores...</Text>
                </View>
          ) : householdChores.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome5 name="tasks" size={32} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No Chores</Text>
              <Text style={styles.emptyStateText}>Create your first chore to get started</Text>
                </View>
          ) : (
            <View style={styles.choreList}>
              {householdChores.map((chore) => (
                <View key={chore.id} style={styles.choreItem}>
                  <View style={styles.choreInfo}>
                    <Text style={styles.choreTitle}>{chore.title}</Text>
                    <Text style={styles.choreSubtitle}>
                      {chore.frequency} • {chore.coinReward} coins • {chore.status}
                    </Text>
                    {chore.description && (
                      <Text style={styles.choreDescription} numberOfLines={2}>
                        {chore.description}
                      </Text>
                    )}
                  </View>
                  <View style={styles.choreActions}>
                    <TouchableOpacity
                      style={[styles.choreActionButton, styles.editActionButton]}
                      onPress={() => editChore(chore)}
                    >
                      <FontAwesome5 name="edit" size={14} color="#6C63FF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.choreActionButton, styles.deleteActionButton]}
                      onPress={() => deleteChore(chore)}
                    >
                      <FontAwesome5 name="trash" size={14} color="#EF4444" />
              </TouchableOpacity>
            </View>
                </View>
              ))}
          </View>
        )}
        </View>
      </View>
    );
  };

  const renderNotificationsSection = () => (
    <View style={styles.sectionContent}>
          <View style={styles.card}>
        <Text style={styles.cardTitle}>Push Notifications</Text>
        
            <SettingRow
              icon="bell"
          title="Enable Push Notifications"
          subtitle="Receive push notifications on your device"
          rightElement={
            <Switch
              value={notificationPrefs.pushEnabled}
              onValueChange={(value) => updateNotificationPreference('pushEnabled', value)}
              trackColor={{ false: '#E5E7EB', true: '#6C63FF' }}
              thumbColor="#FFFFFF"
            />
          }
            />
            
            <SettingRow
          icon="tasks"
          title="Chore Reminders"
          subtitle="Get reminded about pending and overdue chores"
              rightElement={
                <Switch
              value={notificationPrefs.choreReminders}
              onValueChange={(value) => updateNotificationPreference('choreReminders', value)}
              trackColor={{ false: '#E5E7EB', true: '#6C63FF' }}
              thumbColor="#FFFFFF"
            />
          }
        />
        
        <SettingRow
          icon="gift"
          title="Reward Notifications"
          subtitle="Alerts for reward requests and approvals"
          rightElement={
            <Switch
              value={notificationPrefs.rewardAlerts}
              onValueChange={(value) => updateNotificationPreference('rewardAlerts', value)}
              trackColor={{ false: '#E5E7EB', true: '#6C63FF' }}
              thumbColor="#FFFFFF"
            />
          }
        />
        
        <SettingRow
          icon="users"
          title="Family Updates"
          subtitle="Notifications about household member activities"
          rightElement={
            <Switch
              value={notificationPrefs.familyUpdates}
              onValueChange={(value) => updateNotificationPreference('familyUpdates', value)}
              trackColor={{ false: '#E5E7EB', true: '#6C63FF' }}
              thumbColor="#FFFFFF"
            />
          }
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sound & Vibration</Text>
        
        <SettingRow
          icon="volume-up"
          title="Sound"
          subtitle="Play sound with notifications"
          rightElement={
            <Switch
              value={notificationPrefs.soundEnabled}
              onValueChange={(value) => updateNotificationPreference('soundEnabled', value)}
              trackColor={{ false: '#E5E7EB', true: '#6C63FF' }}
              thumbColor="#FFFFFF"
            />
          }
        />
        
        <SettingRow
          icon="phone-vibrate"
          title="Vibration"
          subtitle="Vibrate device for notifications"
          rightElement={
            <Switch
              value={notificationPrefs.vibrationEnabled}
              onValueChange={(value) => updateNotificationPreference('vibrationEnabled', value)}
              trackColor={{ false: '#E5E7EB', true: '#6C63FF' }}
              thumbColor="#FFFFFF"
            />
          }
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notification Schedule</Text>
        
        <SettingRow
          icon="clock"
          title="Quiet Hours"
          subtitle="Set when not to receive notifications"
          onPress={() => Alert.alert('Coming Soon', 'Quiet hours scheduling will be available in a future update.')}
        />
        
        <SettingRow
          icon="calendar"
          title="Daily Summary"
          subtitle="Get a daily recap of household activities"
          rightElement={
            <Switch
              value={false}
              onValueChange={() => Alert.alert('Coming Soon', 'Daily summary notifications will be available soon!')}
              trackColor={{ false: '#E5E7EB', true: '#6C63FF' }}
              thumbColor="#FFFFFF"
            />
          }
        />
      </View>
    </View>
  );

  const renderPrivacySection = () => (
    <View style={styles.sectionContent}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Content & Privacy</Text>
        
        <SettingRow
          icon="child"
          title="Parental Controls"
          subtitle={user?.firestoreData?.preferences?.contentFilter?.parentalControlsEnabled 
            ? "Enabled - Age-appropriate content filtering active" 
            : "Disabled - All content visible"}
          rightElement={
            <Switch
              value={user?.firestoreData?.preferences?.contentFilter?.parentalControlsEnabled || false}
              onValueChange={async (value) => {
                if (!user) return;
                try {
                  const updates = {
                    [`preferences.contentFilter.parentalControlsEnabled`]: value,
                    [`preferences.contentFilter.updatedAt`]: new Date()
                  } as any;
                  await userService.updateUser(user.id, updates);
                  await updateUserProfile(updates);
                } catch (error) {
                  Alert.alert('Error', 'Failed to update parental controls');
                }
              }}
              trackColor={{ false: '#E5E7EB', true: '#6C63FF' }}
              thumbColor="#FFFFFF"
                />
              }
            />

            <SettingRow
          icon="users"
          title="Profile Visibility"
          subtitle={user?.firestoreData?.preferences?.privacy?.profileVisibility === 'private' 
            ? "Private - Only household members can see your profile" 
            : user?.firestoreData?.preferences?.privacy?.profileVisibility === 'household' 
            ? "Household - Visible to household members only"
            : "Public - Visible to all users"}
          onPress={() => {
            Alert.alert(
              'Profile Visibility',
              'Choose who can see your profile information:',
              [
                {
                  text: 'Private',
                  onPress: async () => {
                    if (!user) return;
                    try {
                      const updates = {
                        [`preferences.privacy.profileVisibility`]: 'private',
                        [`preferences.privacy.updatedAt`]: new Date()
                      } as any;
                      await userService.updateUser(user.id, updates);
                      await updateUserProfile(updates);
                    } catch (error) {
                      Alert.alert('Error', 'Failed to update profile visibility');
                    }
                  }
                },
                {
                  text: 'Household Only',
                  onPress: async () => {
                    if (!user) return;
                    try {
                      const updates = {
                        [`preferences.privacy.profileVisibility`]: 'household',
                        [`preferences.privacy.updatedAt`]: new Date()
                      } as any;
                      await userService.updateUser(user.id, updates);
                      await updateUserProfile(updates);
                    } catch (error) {
                      Alert.alert('Error', 'Failed to update profile visibility');
                    }
                  }
                },
                {
                  text: 'Public',
                  onPress: async () => {
                    if (!user) return;
                    try {
                      const updates = {
                        [`preferences.privacy.profileVisibility`]: 'public',
                        [`preferences.privacy.updatedAt`]: new Date()
                      } as any;
                      await userService.updateUser(user.id, updates);
                      await updateUserProfile(updates);
                    } catch (error) {
                      Alert.alert('Error', 'Failed to update profile visibility');
                    }
                  }
                },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }}
            />
          </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Data Management</Text>
        
        <SettingRow
          icon="download"
          title="Export My Data"
          subtitle="Download all your personal data"
          onPress={exportUserData}
        />
        
        <SettingRow
          icon="history"
          title="Activity History"
          subtitle="View and manage your activity history"
          onPress={() => {
            Alert.alert(
              'Activity History',
              `Your account contains:\n• ${user?.firestoreData?.stats?.choresCompleted || 0} completed chores\n• ${user?.firestoreData?.stats?.rewardsClaimed || 0} claimed rewards\n• ${user?.firestoreData?.totalCoinsEarned || 0} total coins earned\n\nActivity data helps improve your experience and household insights.`
            );
          }}
        />
        </View>

          <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Actions</Text>
        
            <SettingRow
              icon="sign-out-alt"
              title="Sign Out"
          subtitle="Sign out of your account"
              onPress={() => {
                Alert.alert(
                  'Sign Out',
                  'Are you sure you want to sign out?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out',
                  style: 'default',
                  onPress: async () => {
                    try {
                      await logout();
                    } catch (error) {
                      console.error('Error signing out:', error);
                      Alert.alert('Error', 'Failed to sign out. Please try again.');
                    }
                  }
                }
                  ]
                );
              }}
              iconColor="#F59E0B"
            />

            <SettingRow
              icon="trash"
              title="Delete Account"
          subtitle="Permanently delete your account and all data"
              onPress={deleteAccount}
              iconColor="#EF4444"
            />
          </View>
        </View>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSection();
      case 'household':
        return renderHouseholdSection();
      case 'chores':
        return renderChoresSection();
      case 'notifications':
        return renderNotificationsSection();
      case 'privacy':
        return renderPrivacySection();
      default:
        return renderProfileSection();
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Section Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.sectionTabs}
        contentContainerStyle={styles.sectionTabsContent}
      >
        <SectionTab section="profile" title="Profile" icon="user" />
        <SectionTab section="household" title="Household" icon="home" />
        {user?.role === 'admin' && <SectionTab section="chores" title="Chores" icon="tasks" />}
        <SectionTab section="notifications" title="Notifications" icon="bell" />
        <SectionTab section="privacy" title="Privacy" icon="shield-alt" />
      </ScrollView>

      {/* Active Section Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderActiveSection()}
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowQRModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Household Invite</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.qrContainer}>
            <Text style={styles.qrTitle}>Invite Code</Text>
            <Text style={styles.inviteCode}>{household?.inviteCode}</Text>

            <View style={styles.qrCodeContainer}>
              <QRCode
                value={household?.inviteCode || 'DEMO'}
                size={200}
                color="#1F2937"
                backgroundColor="white"
              />
            </View>

            <Text style={styles.qrInstructions}>
              Share this code or QR code with family members to invite them to your household
            </Text>
          </View>
        </View>
      </Modal>

      {/* Invitation Management Modal */}
      <InvitationManagementModal
        visible={showInvitationManagement}
        onClose={() => setShowInvitationManagement(false)}
        householdId={household?.id || ''}
        householdName={household?.name || ''}
      />

      {/* Pending Members Modal */}
      <PendingMemberApprovalModal
        visible={showPendingMembers}
        onClose={() => setShowPendingMembers(false)}
        householdId={household?.id || ''}
        householdName={household?.name || ''}
        onMemberApproved={() => {
          // Refresh household data when a member is approved
          loadData();
        }}
      />

      {/* Chore Edit Modal */}
      <CreateChoreModal
        visible={showChoreEditModal}
        onClose={() => {
          setShowChoreEditModal(false);
          setEditingChore(null);
        }}
        onChoreCreated={() => {
          // Refresh chore list when chore is updated
          if (household) {
            loadHouseholdChores(household.id);
          }
        }}
        editingChore={editingChore}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  sectionTabs: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    maxHeight: 60,
  },
  sectionTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 4,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
  },
  activeSectionTab: {
    backgroundColor: '#6C63FF',
  },
  sectionTabText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    flexShrink: 1,
  },
  activeSectionTabText: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
  sectionContent: {
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
    flex: 1,
  },
  choreCount: {
    fontSize: 14,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  choreList: {
    maxHeight: 400,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  adminBadge: {
    backgroundColor: '#FEF3C7',
  },
  memberBadge: {
    backgroundColor: '#DBEAFE',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  adminBadgeText: {
    color: '#D97706',
  },
  memberBadgeText: {
    color: '#2563EB',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editForm: {
    marginTop: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'white',
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
  },
  currencySelectorText: {
    fontSize: 16,
    color: '#1F2937',
  },
  switchGroup: {
    marginTop: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  nestedSettings: {
    marginTop: 16,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
  },
  formHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    marginLeft: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 2,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  disabledRow: {
    opacity: 0.5,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  choreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  choreInfo: {
    flex: 1,
  },
  choreTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  choreSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  choreDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  choreActions: {
    flexDirection: 'row',
  },
  choreActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  editActionButton: {
    backgroundColor: '#EEF2FF',
  },
  deleteActionButton: {
    backgroundColor: '#FEF2F2',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  qrContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  qrTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  inviteCode: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6C63FF',
    marginBottom: 40,
    letterSpacing: 2,
  },
  qrCodeContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginBottom: 40,
  },
  qrInstructions: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  resetCashContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  resetCashButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#6C63FF',
    borderRadius: 4,
  },
  resetCashButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#6C63FF',
  },
}); 

export default SettingsScreen; 