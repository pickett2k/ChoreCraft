import { 
  doc, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp,
  writeBatch,
  setDoc,
  deleteField
} from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

// Helper function to convert Firestore Timestamp to Date
const timestampToDate = (timestamp: any): Date => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FirestoreUser {
  id: string;
  email: string;
  displayName: string;
  avatar: string;
  role: 'admin' | 'member';
  householdId?: string;
  coins: number;
  totalCoinsEarned: number;
  totalCashRewards: number; // Total cash earned from money category reward redemptions
  joinedAt: Timestamp;
  lastActive: Timestamp;
  dateOfBirth?: Timestamp; // For age verification and content filtering
  age?: number; // Calculated age for easy filtering
  
  // Premium subscription fields
  isPremium: boolean;
  subscription?: {
    status: 'active' | 'expired' | 'cancelled' | 'pending';
    planId: string; // 'premium_yearly'
    startDate: Timestamp;
    endDate: Timestamp;
    autoRenew: boolean;
    platform: 'ios' | 'android' | 'stripe';
    transactionId?: string; // Store receipt/transaction ID
    originalTransactionId?: string; // For iOS restoration
    purchaseToken?: string; // For Android
    priceAmount: number; // Amount paid (e.g., 20.00)
    priceCurrency: string; // Currency code (e.g., 'GBP')
    lastPaymentDate?: Timestamp;
    nextBillingDate?: Timestamp;
    cancelledAt?: Timestamp;
    cancelReason?: string;
  };
  
  preferences: {
    darkMode: boolean;
    notifications: {
      pushEnabled: boolean;
      choreReminders: boolean;
      rewardAlerts: boolean;
      familyUpdates: boolean;
      soundEnabled: boolean;
      vibrationEnabled: boolean;
    };
    currency: {
      code: string;
      symbol: string;
    };
    contentFilter: {
      showAdultContent: boolean; // Auto-set based on age
      parentalControlsEnabled: boolean;
    };
    privacy: {
      profileVisibility: 'private' | 'household' | 'public';
      updatedAt: Date;
    };
  };
  stats: {
    choresCompleted: number;
    rewardsClaimed: number;
    currentStreak: number;
    longestStreak: number;
  };
}

export interface Household {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Timestamp;
  inviteCode: string;
  settings: {
    autoApprove: boolean;
    requirePhotoProof: boolean;
    currency: {
      code: string;
      symbol: string;
    };
    coinValues: {
      defaultChoreValue: number;
      bonusMultiplier: number;
    };
    coinDeduction: {
      enabled: boolean;
      missedChoreDeduction: number; // Coins to deduct for missed assigned chores
      gracePeriodHours: number; // Hours after due date before deduction applies
    };
  };
  members: string[];
  admins: string[];
  stats: {
    totalChoresCompleted: number;
    totalCoinsAwarded: number;
    activeMemberCount: number;
    memberCount: number;
  };
}

export interface ChoreCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'room' | 'task';
  bonusCoins: number; // Bonus coins for completing all chores in this category
}

export interface Chore {
  id: string;
  householdId: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  coinReward: number;
  assignedTo: string[];
  anyoneCanDo: boolean;
  requiresPhoto: boolean;
  beforePhotoRequired: boolean;
  afterPhotoRequired: boolean;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  scheduledTime?: string; // Time for daily/weekly/monthly chores (HH:MM format)
  weekdayOptions?: 'all' | 'weekdays' | 'weekends' | 'custom'; // New weekday filtering
  customFrequency?: {
    days: string[];
    time?: string;
  };
  status: 'active' | 'paused' | 'completed' | 'archived';
  isRecurring: boolean;
  completionCount: number;
  lastCompletedAt?: Timestamp;
  nextDueDate?: Timestamp;
  beforePhoto?: string;
  autoDeleteAfterDays: number;
  lastDeductionProcessed?: Date; // Track when coin deduction was last processed
  // Age restriction for adult content chores
  ageRestriction?: number;
  isAdultContent?: boolean;
  
  // Category fields
  roomCategory?: string; // e.g., 'kitchen', 'bedroom'
  taskCategory?: string; // e.g., 'cleaning', 'maintenance'
  categoryBonusEligible?: boolean; // Whether this chore counts toward category completion bonus
}

export interface ChoreCompletion {
  id: string;
  choreId: string;
  choreTitle: string; // For display purposes
  householdId: string;
  completedBy: string;
  completedByName: string; // For display purposes
  completedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  beforePhoto?: string;
  afterPhoto?: string;
  coinsAwarded: number;
  coinsPending: number;
  notes?: string;
  adminNotes?: string;
  scheduledDeletion?: Date;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  coinCost: number;
  category: 'entertainment' | 'treats' | 'privileges' | 'money' | 'experiences' | 'items';
  isActive: boolean;
  createdBy: string;
  householdId: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Cash value for rewards that provide real money
  cashValue?: number; // Amount in pounds/dollars to add to user's cash balance
  
  // Popularity tracking
  requestCount: number;
  lastRequested?: Date;
  
  // Availability
  maxRedemptions?: number; // null = unlimited
  currentRedemptions: number;
  cooldownHours?: number; // Hours before can be redeemed again
  
  // Metadata
  ageRestriction?: number;
  requiresApproval: boolean;
  icon?: string;
  color?: string;
}

export interface RewardRequest {
  id: string;
  rewardId: string;
  userId: string;
  userDisplayName: string; // For display purposes
  householdId: string;
  coinCost: number;
  status: 'pending' | 'approved' | 'denied' | 'fulfilled';
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  notes?: string;
  
  // Reward snapshot (in case reward is deleted)
  rewardSnapshot: {
    title: string;
    description: string;
    category: string;
  };
}

export interface PopularReward {
  title: string;
  description: string;
  category: string;
  averageCoinCost: number;
  requestFrequency: number;
  icon?: string;
  color?: string;
}

// Invitation system interfaces
export interface Invitation {
  id: string;
  householdId: string;
  householdName: string;
  email: string;
  role: 'admin' | 'member';
  invitedBy: string;
  invitedByName: string;
  invitedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';
  acceptedAt?: Date;
  declinedAt?: Date;
  revokedAt?: Date;
  revokedBy?: string;
  // For tracking if user signs up later
  claimedByUserId?: string;
  // Allow multiple household memberships with different roles
  isMultiHousehold?: boolean;
}

export interface UserHouseholdMembership {
  id: string;
  userId: string;
  householdId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  isPrimary: boolean; // One primary household per user
  status: 'active' | 'suspended' | 'left';
}

// Activity tracking interfaces
export interface ActivityItem {
  id: string;
  type: 'chore_completed' | 'reward_requested' | 'reward_approved' | 'reward_denied' | 'coins_earned' | 'coins_deducted' | 'chore_missed' | 'member_joined' | 'chore_created';
  userId: string;
  userDisplayName: string;
  householdId: string;
  timestamp: Date;
  data: {
    choreTitle?: string;
    rewardTitle?: string;
    coinAmount?: number;
    choreId?: string;
    rewardId?: string;
    reason?: string;
    [key: string]: any;
  };
  icon: string;
  color: string;
  message: string;
}

export interface MissedChore {
  id: string;
  chore: Chore;
  assignedUsers: FirestoreUser[];
  dueDate: Date;
  daysMissed: number;
  coinDeduction: number;
}

// ============================================================================
// USER SERVICES
// ============================================================================

export const userService = {
  // Create a new user profile
  async createUser(userId: string, userData: Partial<FirestoreUser>): Promise<void> {
    if (!db) {
      console.log('📱 Mock mode: Creating user', { userId, userData });
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      const defaultUser: FirestoreUser = {
        id: userId,
        email: userData.email || '',
        displayName: userData.displayName || 'New User',
        avatar: '👤',
        role: 'member',
        coins: 0,
        totalCoinsEarned: 0,
        totalCashRewards: 0,
        isPremium: false, // Default to free tier
        joinedAt: serverTimestamp() as Timestamp,
        lastActive: serverTimestamp() as Timestamp,
        preferences: {
          darkMode: false,
          notifications: {
            pushEnabled: true,
            choreReminders: true,
            rewardAlerts: true,
            familyUpdates: true,
            soundEnabled: true,
            vibrationEnabled: true,
          },
          currency: {
            code: 'GBP',
            symbol: '£',
          },
          contentFilter: {
            showAdultContent: false, // Default to false, will be set based on age
            parentalControlsEnabled: false,
          },
          privacy: {
            profileVisibility: 'private',
            updatedAt: new Date(),
          },
        },
        stats: {
          choresCompleted: 0,
          rewardsClaimed: 0,
          currentStreak: 0,
          longestStreak: 0,
        },
        ...userData,
      };

      await setDoc(userRef, defaultUser);
      console.log('✅ User created successfully:', userId);
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  },

  // Get user by ID
  async getUser(userId: string): Promise<FirestoreUser | null> {
    if (!db) {
      console.log('📱 Mock mode: Getting user', userId);
      return null;
    }

    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data() as FirestoreUser;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting user:', error);
      throw error;
    }
  },

  // Update user data
  async updateUser(userId: string, updates: Partial<FirestoreUser>): Promise<void> {
    if (!db) {
      console.log('📱 Mock mode: Updating user', { userId, updates });
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        lastActive: serverTimestamp(),
      });
      console.log('✅ User updated successfully:', userId);
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  },

  // Update user's last active timestamp
  async updateLastActive(userId: string): Promise<void> {
    if (!db) return;

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        lastActive: serverTimestamp(),
      });
    } catch (error) {
      console.error('❌ Error updating last active:', error);
    }
  },

  // Listen to user changes
  onUserSnapshot(userId: string, callback: (user: FirestoreUser | null) => void): () => void {
    if (!db) {
      callback(null);
      return () => {};
    }

    const userRef = doc(db, 'users', userId);
    return onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as FirestoreUser);
      } else {
        callback(null);
      }
    });
  },

  // Delete user and all associated data
  async deleteUser(userId: string): Promise<void> {
    if (!db) {
      console.log('📱 Mock mode: Deleting user');
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      
      // Delete user-related data
      const batch = writeBatch(db);
      
      // Delete user document
      batch.delete(userRef);
      
      // TODO: Add cleanup for other user-related collections
      // - chore completions
      // - reward requests
      // - activity logs
      
      await batch.commit();
      console.log('✅ User deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  },

  // Reset user's total cash rewards to zero
  async resetCashRewards(userId: string): Promise<void> {
    try {
      console.log('💰 Resetting cash rewards for user:', userId);
      
      if (!db) {
        console.log('📱 Mock mode: Resetting cash rewards');
        return;
      }

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        totalCashRewards: 0,
        updatedAt: new Date(),
      });

      console.log('✅ Cash rewards reset successfully');
    } catch (error) {
      console.error('❌ Error resetting cash rewards:', error);
      throw error;
    }
  },

  // Reset user's statistics to zero
  async resetUserStatistics(userId: string): Promise<void> {
    try {
      console.log('📊 Resetting user statistics for user:', userId);
      
      if (!db) {
        console.log('📱 Mock mode: Resetting user statistics');
        return;
      }

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'stats.choresCompleted': 0,
        'stats.rewardsClaimed': 0,
        'stats.currentStreak': 0,
        'stats.longestStreak': 0,
        updatedAt: new Date(),
      });

      console.log('✅ User statistics reset successfully');
    } catch (error) {
      console.error('❌ Error resetting user statistics:', error);
      throw error;
    }
  },

  // Premium subscription management
  async updateSubscription(userId: string, subscriptionData: FirestoreUser['subscription']): Promise<void> {
    try {
      console.log('💎 Updating subscription for user:', userId);
      
      if (!db) {
        console.log('📱 Mock mode: Updating subscription');
        return;
      }

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        subscription: subscriptionData,
        isPremium: subscriptionData?.status === 'active',
        updatedAt: new Date(),
      });

      console.log('✅ Subscription updated successfully');
    } catch (error) {
      console.error('❌ Error updating subscription:', error);
      throw error;
    }
  },

  // Cancel subscription
  async cancelSubscription(userId: string, reason?: string): Promise<void> {
    try {
      console.log('❌ Cancelling subscription for user:', userId);
      
      if (!db) {
        console.log('📱 Mock mode: Cancelling subscription');
        return;
      }

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'subscription.status': 'cancelled',
        'subscription.cancelledAt': new Date(),
        'subscription.cancelReason': reason || 'User cancelled',
        'subscription.autoRenew': false,
        isPremium: false,
        updatedAt: new Date(),
      });

      console.log('✅ Subscription cancelled successfully');
    } catch (error) {
      console.error('❌ Error cancelling subscription:', error);
      throw error;
    }
  },

  // Check if subscription is expired and update status
  async checkSubscriptionExpiry(userId: string): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user?.subscription || !db) return false;

      const now = new Date();
      const endDate = timestampToDate(user.subscription.endDate);

      if (now > endDate && user.subscription.status === 'active') {
        await updateDoc(doc(db, 'users', userId), {
          'subscription.status': 'expired',
          isPremium: false,
          updatedAt: new Date(),
        });
        console.log('⏰ Subscription expired for user:', userId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error checking subscription expiry:', error);
      return false;
    }
  },
};

// ============================================================================
// HOUSEHOLD SERVICES
// ============================================================================

export const householdService = {
  // Create a new household
  async createHousehold(householdData: Partial<Household>, creatorId: string): Promise<string> {
    if (!db) {
      console.log('📱 Mock mode: Creating household', { householdData, creatorId });
      return 'mock-household-id';
    }

    try {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const defaultHousehold: Omit<Household, 'id'> = {
        name: householdData.name || 'My Household',
        description: householdData.description || '',
        createdBy: creatorId,
        createdAt: serverTimestamp() as Timestamp,
        inviteCode,
        settings: {
          autoApprove: false,
          requirePhotoProof: true,
          currency: {
            code: 'GBP',
            symbol: '£',
          },
          coinValues: {
            defaultChoreValue: 10,
            bonusMultiplier: 1.5,
          },
          coinDeduction: {
            enabled: false,
            missedChoreDeduction: 0,
            gracePeriodHours: 0,
          },
        },
        members: [creatorId],
        admins: [creatorId],
        stats: {
          totalChoresCompleted: 0,
          totalCoinsAwarded: 0,
          activeMemberCount: 1,
          memberCount: 1,
        },
        ...householdData,
      };

      const householdRef = await addDoc(collection(db, 'households'), defaultHousehold);
      console.log('✅ Household created successfully:', householdRef.id);
      return householdRef.id;
    } catch (error) {
      console.error('❌ Error creating household:', error);
      throw error;
    }
  },

  // Get household by ID
  async getHousehold(householdId: string): Promise<Household | null> {
    if (!db) {
      console.log('📱 Mock mode: Getting household', householdId);
      return null;
    }

    try {
      const householdRef = doc(db, 'households', householdId);
      const householdSnap = await getDoc(householdRef);
      
      if (householdSnap.exists()) {
        return { id: householdSnap.id, ...householdSnap.data() } as Household;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting household:', error);
      throw error;
    }
  },

  // Update household
  async updateHousehold(householdId: string, updates: Partial<Household>): Promise<void> {
    if (!db) {
      console.log('📱 Mock mode: Updating household', { householdId, updates });
      return;
    }

    try {
      const householdRef = doc(db, 'households', householdId);
      await updateDoc(householdRef, updates);
      console.log('✅ Household updated successfully:', householdId);
    } catch (error) {
      console.error('❌ Error updating household:', error);
      throw error;
    }
  },

  // Join household by invite code
  async joinHousehold(inviteCode: string, userId: string): Promise<string | null> {
    if (!db) {
      console.log('📱 Mock mode: Joining household', { inviteCode, userId });
      return 'mock-household-id';
    }

    try {
      const householdsRef = collection(db, 'households');
      const q = query(householdsRef, where('inviteCode', '==', inviteCode.toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Invalid invite code');
      }

      const householdDoc = querySnapshot.docs[0];
      const household = householdDoc.data() as Household;

      if (!household.members.includes(userId)) {
        await updateDoc(householdDoc.ref, {
          members: [...household.members, userId],
          'stats.activeMemberCount': household.stats.activeMemberCount + 1,
        });
      }

      console.log('✅ Joined household successfully:', householdDoc.id);
      return householdDoc.id;
    } catch (error) {
      console.error('❌ Error joining household:', error);
      throw error;
    }
  },

  // Get household members with full user data
  async getHouseholdMembers(householdId: string): Promise<FirestoreUser[]> {
    if (!db) {
      console.log('📱 Mock mode: Getting household members');
      return [];
    }

    try {
      const membersQuery = query(
        collection(db, 'users'),
        where('householdId', '==', householdId)
      );

      const snapshot = await getDocs(membersQuery);
      const members: FirestoreUser[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        members.push({
          id: doc.id,
          ...data,
          joinedAt: data.joinedAt?.toDate() || new Date(),
          lastActive: data.lastActive?.toDate() || new Date(),
        } as FirestoreUser);
      });

      console.log('✅ Loaded', members.length, 'household members');
      return members;
    } catch (error) {
      console.error('❌ Error getting household members:', error);
      return [];
    }
  },

  // Enhanced invitation system with edge case handling
  // Enhanced invitation system with comprehensive edge case handling
  async sendInvitation(
    householdId: string, 
    email: string, 
    role: 'admin' | 'member', 
    invitedBy: string,
    options: { allowMultiHousehold?: boolean; customMessage?: string } = {}
  ): Promise<{ success: boolean; error?: string; invitationId?: string }> {
    if (!db) {
      console.log('📱 Mock mode: Sending invitation to', email);
      return { success: true, invitationId: 'mock-invite-' + Date.now() };
    }

    try {
      // Get household and inviter data
      const household = await this.getHousehold(householdId);
      const inviter = await userService.getUser(invitedBy);
      
      if (!household || !inviter) {
        return { success: false, error: 'Household or inviter not found' };
      }

      // Check if user already exists and their current household status
      const existingUserQuery = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
      const existingUserSnapshot = await getDocs(existingUserQuery);
      
      let existingUser: FirestoreUser | null = null;
      if (!existingUserSnapshot.empty) {
        existingUser = existingUserSnapshot.docs[0].data() as FirestoreUser;
        
        // Check if user is already in this household
        if (existingUser.householdId === householdId) {
          return { success: false, error: 'User is already a member of this household' };
        }
        
        // Check if user is in another household and multi-household not allowed
        if (existingUser.householdId && !options.allowMultiHousehold) {
          return { success: false, error: 'User is already in another household. Enable multi-household to invite anyway.' };
        }
      }

      // Check for existing pending invitations
      const existingInviteQuery = query(
        collection(db, 'invitations'),
        where('email', '==', email.toLowerCase()),
        where('householdId', '==', householdId),
        where('status', '==', 'pending')
      );
      const existingInviteSnapshot = await getDocs(existingInviteQuery);
      
      if (!existingInviteSnapshot.empty) {
        return { success: false, error: 'Invitation already pending for this email' };
      }

      // Create comprehensive invitation record
      const invitation: Omit<Invitation, 'id'> = {
        householdId,
        householdName: household.name,
        email: email.toLowerCase(),
        role,
        invitedBy,
        invitedByName: inviter.displayName,
        invitedAt: new Date(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        status: 'pending',
        isMultiHousehold: options.allowMultiHousehold || false,
        ...(existingUser && { claimedByUserId: existingUser.id }),
      };

      const inviteRef = await addDoc(collection(db, 'invitations'), invitation);

      // Send email invitation using Resend
      try {
        const { resendEmailService } = await import('./resendEmailService');
        
        const emailInvitation = {
          recipientEmail: email,
          inviterName: inviter.displayName,
          householdName: household.name,
          inviteCode: household.inviteCode,
          role,
          customMessage: options.customMessage,
        };

        const emailResult = await resendEmailService.sendInvitationEmail(emailInvitation);
        
        if (emailResult.success) {
          console.log('✅ Invitation email sent successfully via Resend');
        } else {
          console.log('⚠️ Email sending failed, but invitation was created:', emailResult.error);
        }
      } catch (emailError) {
        console.error('❌ Error sending invitation email:', emailError);
        // Don't fail the invitation creation if email fails
      }

      console.log('✅ Invitation created successfully');
      return { success: true, invitationId: inviteRef.id };
    } catch (error) {
      console.error('❌ Error sending invitation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send invitation' };
    }
  },

  // Accept invitation with multi-household support
  async acceptInvitation(invitationId: string, userId: string): Promise<{ success: boolean; error?: string; householdId?: string }> {
    if (!db) {
      console.log('📱 Mock mode: Accepting invitation');
      return { success: true, householdId: 'mock-household' };
    }

    try {
      const invitationRef = doc(db, 'invitations', invitationId);
      const invitationDoc = await getDoc(invitationRef);

      if (!invitationDoc.exists()) {
        return { success: false, error: 'Invitation not found' };
      }

      const invitation = { id: invitationDoc.id, ...invitationDoc.data() } as Invitation;
      
      // Validate invitation
      if (invitation.status !== 'pending') {
        return { success: false, error: 'Invitation is no longer valid' };
      }

      if (invitation.expiresAt < new Date()) {
        // Auto-expire invitation
        await updateDoc(invitationRef, { status: 'expired' });
        return { success: false, error: 'Invitation has expired' };
      }

      // Get user data
      const user = await userService.getUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify email matches (case insensitive)
      if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        return { success: false, error: 'Invitation email does not match your account' };
      }

      // Handle multi-household vs single household logic
      if (user.householdId && !invitation.isMultiHousehold) {
        return { 
          success: false, 
          error: 'You are already in a household. Leave your current household first or ask for a multi-household invitation.' 
        };
      }

      // Create household membership
      const membershipData: Omit<UserHouseholdMembership, 'id'> = {
        userId,
        householdId: invitation.householdId,
        role: invitation.role,
        joinedAt: new Date(),
        isPrimary: !user.householdId, // First household is primary
        status: 'active',
      };

      await addDoc(collection(db, 'userHouseholdMemberships'), membershipData);

      // Update user's primary household if this is their first
      if (!user.householdId) {
        await userService.updateUser(userId, { 
          householdId: invitation.householdId,
          role: invitation.role 
        });
      }

      // Update household member lists
      const householdRef = doc(db, 'households', invitation.householdId);
      const householdDoc = await getDoc(householdRef);
      
      if (householdDoc.exists()) {
        const householdData = householdDoc.data() as Household;
        const updatedMembers = [...householdData.members];
        const updatedAdmins = [...householdData.admins];
        
        if (!updatedMembers.includes(userId)) {
          updatedMembers.push(userId);
        }
        
        if (invitation.role === 'admin' && !updatedAdmins.includes(userId)) {
          updatedAdmins.push(userId);
        }

        await updateDoc(householdRef, {
          members: updatedMembers,
          admins: updatedAdmins,
          'stats.activeMemberCount': updatedMembers.length,
        });
      }

      // Mark invitation as accepted
      await updateDoc(invitationRef, {
        status: 'accepted',
        acceptedAt: new Date(),
        claimedByUserId: userId,
      });

      // Send welcome email using Resend
      try {
        const { resendEmailService } = await import('./resendEmailService');
        await resendEmailService.sendWelcomeEmail(
          user.email,
          invitation.householdName,
          invitation.invitedByName
        );
      } catch (emailError) {
        console.error('❌ Error sending welcome email:', emailError);
        // Don't fail the acceptance if welcome email fails
      }

      console.log('✅ Invitation accepted successfully');
      return { success: true, householdId: invitation.householdId };
    } catch (error) {
      console.error('❌ Error accepting invitation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to accept invitation' };
    }
  },

  // Decline invitation
  async declineInvitation(invitationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!db) {
      console.log('📱 Mock mode: Declining invitation');
      return { success: true };
    }

    try {
      const invitationRef = doc(db, 'invitations', invitationId);
      const invitationDoc = await getDoc(invitationRef);

      if (!invitationDoc.exists()) {
        return { success: false, error: 'Invitation not found' };
      }

      const invitation = invitationDoc.data() as Invitation;
      
      if (invitation.status !== 'pending') {
        return { success: false, error: 'Invitation is no longer pending' };
      }

      await updateDoc(invitationRef, {
        status: 'declined',
        declinedAt: new Date(),
        claimedByUserId: userId,
      });

      console.log('✅ Invitation declined');
      return { success: true };
    } catch (error) {
      console.error('❌ Error declining invitation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to decline invitation' };
    }
  },

  // Revoke invitation (admin only)
  async revokeInvitation(invitationId: string, revokedBy: string): Promise<{ success: boolean; error?: string }> {
    if (!db) {
      console.log('📱 Mock mode: Revoking invitation');
      return { success: true };
    }

    try {
      const invitationRef = doc(db, 'invitations', invitationId);
      const invitationDoc = await getDoc(invitationRef);

      if (!invitationDoc.exists()) {
        return { success: false, error: 'Invitation not found' };
      }

      await updateDoc(invitationRef, {
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy,
      });

      console.log('✅ Invitation revoked');
      return { success: true };
    } catch (error) {
      console.error('❌ Error revoking invitation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to revoke invitation' };
    }
  },

  // Check for pending invitations when user signs up
  async checkPendingInvitationsOnSignup(userId: string, email: string): Promise<Invitation[]> {
    if (!db) {
      console.log('📱 Mock mode: Checking pending invitations');
      return [];
    }

    try {
      const pendingInvitesQuery = query(
        collection(db, 'invitations'),
        where('email', '==', email.toLowerCase()),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(pendingInvitesQuery);
      const invitations: Invitation[] = [];

      for (const docSnap of snapshot.docs) {
        const invitation = { id: docSnap.id, ...docSnap.data() } as Invitation;
        
        // Check if invitation is still valid
        if (invitation.expiresAt > new Date()) {
          // Update invitation to link to user account
          await updateDoc(doc(db, 'invitations', invitation.id), {
            claimedByUserId: userId,
          });
          
          invitations.push({
            ...invitation,
            claimedByUserId: userId,
          });
        } else {
          // Auto-expire old invitations
          await updateDoc(doc(db, 'invitations', invitation.id), {
            status: 'expired',
          });
        }
      }

      console.log(`✅ Found ${invitations.length} pending invitations for new user`);
      return invitations;
    } catch (error) {
      console.error('❌ Error checking pending invitations:', error);
      return [];
    }
  },

  // Get user's household memberships (for multi-household support)
  async getUserHouseholdMemberships(userId: string): Promise<UserHouseholdMembership[]> {
    if (!db) {
      console.log('📱 Mock mode: Getting user household memberships');
      return [];
    }

    try {
      const membershipsQuery = query(
        collection(db, 'userHouseholdMemberships'),
        where('userId', '==', userId),
        where('status', '==', 'active'),
        orderBy('isPrimary', 'desc'),
        orderBy('joinedAt', 'desc')
      );

      const snapshot = await getDocs(membershipsQuery);
      const memberships: UserHouseholdMembership[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        memberships.push({
          id: doc.id,
          ...data,
          joinedAt: data.joinedAt?.toDate() || new Date(),
        } as UserHouseholdMembership);
      });

      console.log(`✅ Found ${memberships.length} household memberships for user`);
      return memberships;
    } catch (error) {
      console.error('❌ Error getting user household memberships:', error);
      return [];
    }
  },

  // Switch user's primary household
  async switchPrimaryHousehold(userId: string, newPrimaryHouseholdId: string): Promise<{ success: boolean; error?: string }> {
    if (!db) {
      console.log('📱 Mock mode: Switching primary household');
      return { success: true };
    }

    try {
      // Get all user's memberships
      const memberships = await this.getUserHouseholdMemberships(userId);
      const targetMembership = memberships.find(m => m.householdId === newPrimaryHouseholdId);
      
      if (!targetMembership) {
        return { success: false, error: 'User is not a member of the specified household' };
      }

      // Update all memberships - set new primary, unset old primary
      const batch = writeBatch(db);
      
      for (const membership of memberships) {
        const membershipRef = doc(db, 'userHouseholdMemberships', membership.id);
        batch.update(membershipRef, {
          isPrimary: membership.householdId === newPrimaryHouseholdId,
        });
      }

      // Update user's primary household
      const userRef = doc(db, 'users', userId);
      batch.update(userRef, {
        householdId: newPrimaryHouseholdId,
        role: targetMembership.role,
        updatedAt: new Date(),
      });

      await batch.commit();

      console.log('✅ Primary household switched successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error switching primary household:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to switch primary household' };
    }
  },

  // Leave a household (but stay in others)
  async leaveHousehold(userId: string, householdId: string): Promise<{ success: boolean; error?: string }> {
    if (!db) {
      console.log('📱 Mock mode: Leaving household');
      return { success: true };
    }

    try {
      // Get user's memberships
      const memberships = await this.getUserHouseholdMemberships(userId);
      const targetMembership = memberships.find(m => m.householdId === householdId);
      
      if (!targetMembership) {
        return { success: false, error: 'User is not a member of this household' };
      }

      // Check if user is the only admin
      const household = await this.getHousehold(householdId);
      if (!household) {
        return { success: false, error: 'Household not found' };
      }

      if (targetMembership.role === 'admin' && household.admins.length === 1) {
        return { success: false, error: 'Cannot leave - you are the only admin. Transfer admin role first or delete the household.' };
      }

      const batch = writeBatch(db);

      // Mark membership as left
      const membershipRef = doc(db, 'userHouseholdMemberships', targetMembership.id);
      batch.update(membershipRef, {
        status: 'left',
        leftAt: new Date(),
      });

      // Remove from household member lists
      const householdRef = doc(db, 'households', householdId);
      const updatedMembers = household.members.filter(id => id !== userId);
      const updatedAdmins = household.admins.filter(id => id !== userId);
      
      batch.update(householdRef, {
        members: updatedMembers,
        admins: updatedAdmins,
        'stats.activeMemberCount': updatedMembers.length,
      });

      // If this was user's primary household, switch to another one
      if (targetMembership.isPrimary) {
        const remainingMemberships = memberships.filter(m => m.householdId !== householdId);
        if (remainingMemberships.length > 0) {
          // Set the most recent one as primary
          const newPrimary = remainingMemberships[0];
          const newPrimaryRef = doc(db, 'userHouseholdMemberships', newPrimary.id);
          batch.update(newPrimaryRef, { isPrimary: true });

          // Update user's primary household
          const userRef = doc(db, 'users', userId);
          batch.update(userRef, {
            householdId: newPrimary.householdId,
            role: newPrimary.role,
            updatedAt: new Date(),
          });
        } else {
          // User has no other households - clear primary
          const userRef = doc(db, 'users', userId);
          batch.update(userRef, {
            householdId: null,
            role: 'member',
            updatedAt: new Date(),
          });
        }
      }

      await batch.commit();

      console.log('✅ Successfully left household');
      return { success: true };
    } catch (error) {
      console.error('❌ Error leaving household:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to leave household' };
    }
  },

  // Get all invitations for a household (admin view)
  async getHouseholdInvitations(householdId: string): Promise<Invitation[]> {
    if (!db) {
      console.log('📱 Mock mode: Getting household invitations');
      return [];
    }

    try {
      const invitationsQuery = query(
        collection(db, 'invitations'),
        where('householdId', '==', householdId),
        orderBy('invitedAt', 'desc')
      );

      const snapshot = await getDocs(invitationsQuery);
      const invitations: Invitation[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        invitations.push({
          id: doc.id,
          ...data,
          invitedAt: data.invitedAt?.toDate() || new Date(),
          expiresAt: data.expiresAt?.toDate() || new Date(),
          acceptedAt: data.acceptedAt?.toDate(),
          declinedAt: data.declinedAt?.toDate(),
          revokedAt: data.revokedAt?.toDate(),
        } as Invitation);
      });

      console.log(`✅ Found ${invitations.length} invitations for household`);
      return invitations;
    } catch (error) {
      console.error('❌ Error getting household invitations:', error);
      return [];
    }
  },

  // Get user's pending invitations
  async getUserInvitations(email: string): Promise<Invitation[]> {
    if (!db) {
      console.log('📱 Mock mode: Getting user invitations');
      return [];
    }

    try {
      const invitationsQuery = query(
        collection(db, 'invitations'),
        where('email', '==', email.toLowerCase()),
        where('status', '==', 'pending'),
        orderBy('invitedAt', 'desc')
      );

      const snapshot = await getDocs(invitationsQuery);
      const invitations: Invitation[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const invitation = {
          id: docSnap.id,
          ...data,
          invitedAt: data.invitedAt?.toDate() || new Date(),
          expiresAt: data.expiresAt?.toDate() || new Date(),
        } as Invitation;

        // Auto-expire old invitations
        if (invitation.expiresAt < new Date()) {
          await updateDoc(doc(db, 'invitations', invitation.id), {
            status: 'expired',
          });
        } else {
          invitations.push(invitation);
        }
      }

      console.log(`✅ Found ${invitations.length} pending invitations for user`);
      return invitations;
    } catch (error) {
      console.error('❌ Error getting user invitations:', error);
      return [];
    }
  },

  // Add member count to household stats
  async updateHouseholdMemberCount(householdId: string): Promise<void> {
    if (!db) return;
    
    try {
      const membersSnapshot = await getDocs(
        query(collection(db, 'users'), where('householdId', '==', householdId))
      );
      
      const memberCount = membersSnapshot.size;
      
      await updateDoc(doc(db, 'households', householdId), {
        'stats.memberCount': memberCount,
        'stats.activeMemberCount': memberCount, // Assume all are active for now
      });
    } catch (error) {
      console.error('Error updating household member count:', error);
    }
  },

  // Remove member from household
  async removeMemberFromHousehold(householdId: string, userId: string): Promise<void> {
    if (!db) return;
    
    try {
      // Remove user from household
      await updateDoc(doc(db, 'users', userId), {
        householdId: null,
        role: null,
        joinedHouseholdAt: null,
      });
      
      // Update household member count
      await this.updateHouseholdMemberCount(householdId);
      
      console.log('✅ Member removed from household successfully');
    } catch (error) {
      console.error('Error removing member from household:', error);
      throw error;
    }
  },
};

// ============================================================================
// CHORE SERVICES
// ============================================================================

export const choreService = {
  // Create a new chore
  async createChore(choreData: Partial<Chore>): Promise<string> {
    try {
      console.log('🧹 Creating chore with data:', choreData);
      
      if (!db) {
        console.log('📱 Mock mode: Creating chore');
        return 'mock-chore-' + Date.now();
      }

      const newChore: Omit<Chore, 'id'> = {
        title: choreData.title || '',
        description: choreData.description || '',
        householdId: choreData.householdId || '',
        createdBy: choreData.createdBy || '',
        coinReward: choreData.coinReward || 10,
        assignedTo: choreData.assignedTo || [],
        anyoneCanDo: choreData.anyoneCanDo ?? true,
        requiresPhoto: choreData.requiresPhoto ?? false,
        beforePhotoRequired: choreData.beforePhotoRequired ?? false,
        afterPhotoRequired: choreData.afterPhotoRequired ?? false,
        frequency: choreData.frequency || 'once',
        status: 'active',
        isRecurring: choreData.isRecurring ?? false,
        completionCount: 0,
        autoDeleteAfterDays: choreData.autoDeleteAfterDays || 30,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };

      // Add customFrequency only if it exists and filter out undefined values
      if (choreData.customFrequency) {
        const customFreq: any = {
          days: choreData.customFrequency.days
        };
        
        // Only add time if it's not undefined/empty
        if (choreData.customFrequency.time && choreData.customFrequency.time.trim() !== '') {
          customFreq.time = choreData.customFrequency.time;
        }
        
        newChore.customFrequency = customFreq;
      }

      console.log('📝 Processed chore data:', newChore);

      const choreRef = await addDoc(collection(db, 'chores'), newChore);
      console.log('✅ Chore created successfully with ID:', choreRef.id);
      console.log('🏠 Chore belongs to household:', newChore.householdId);
      console.log('📅 Chore frequency:', newChore.frequency);
      console.log('🔄 Is recurring:', newChore.isRecurring);

      // Log activity for chore creation
      try {
        const creatorDoc = await getDoc(doc(db, 'users', newChore.createdBy));
        const creatorDisplayName = creatorDoc.exists() ? creatorDoc.data().displayName || creatorDoc.data().email : 'Unknown User';
        
        const style = activityService.getActivityStyle('chore_created');
        await activityService.createActivity({
          type: 'chore_created',
          userId: newChore.createdBy,
          userDisplayName: creatorDisplayName,
          householdId: newChore.householdId,
          data: { choreId: choreRef.id, choreTitle: newChore.title },
          icon: style.icon,
          color: style.color,
          message: activityService.generateActivityMessage('chore_created', { choreTitle: newChore.title }, creatorDisplayName),
        });
        console.log('📝 Activity logged for chore creation');
      } catch (activityError) {
        console.warn('⚠️ Failed to log chore creation activity:', activityError);
        // Don't fail the chore creation if activity logging fails
      }
      
      return choreRef.id;
    } catch (error) {
      console.error('❌ Error creating chore:', error);
      throw error;
    }
  },

  // Get all chores for a household
  async getHouseholdChores(householdId: string, statusFilter?: 'active' | 'completed' | 'all'): Promise<Chore[]> {
    try {
      if (!db) {
        console.log('📱 Mock mode: Getting household chores');
        return [];
      }

      let choresQuery;
      
      if (statusFilter === 'all' || !statusFilter) {
        // Get all chores regardless of status
        choresQuery = query(
          collection(db, 'chores'),
          where('householdId', '==', householdId),
          orderBy('createdAt', 'desc')
        );
      } else {
        // Filter by specific status
        choresQuery = query(
          collection(db, 'chores'),
          where('householdId', '==', householdId),
          where('status', '==', statusFilter),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(choresQuery);
      const chores: Chore[] = [];
      const now = new Date();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const chore = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastCompletedAt: data.lastCompletedAt?.toDate(),
          nextDueDate: data.nextDueDate?.toDate(),
        } as Chore;

        // For "all" filter, apply smart filtering to avoid showing multiple instances
        if (statusFilter === 'all' || !statusFilter) {
          // Always show completed and one-time chores
          if (chore.status === 'completed' || chore.frequency === 'once') {
            chores.push(chore);
          } 
          // For recurring chores, only show if they're currently due or overdue
          else if (chore.status === 'active' && ['daily', 'weekly', 'monthly', 'custom'].includes(chore.frequency)) {
            if (chore.nextDueDate) {
              // nextDueDate is already converted to Date above in the mapping
              const dueDate = timestampToDate(chore.nextDueDate);
              // Show if due today or overdue (not future instances)
              if (dueDate <= now) {
                chores.push(chore);
              }
            } else {
              // If no due date set, show it (probably needs initialization)
              chores.push(chore);
            }
          }
          // Show other statuses as-is
          else if (chore.status !== 'active') {
            chores.push(chore);
          }
        } else {
          // For specific status filters, show all matching chores
          chores.push(chore);
        }
      });

      console.log('✅ Loaded', chores.length, 'household chores', statusFilter ? `(${statusFilter})` : '(all, smart filtered)');
      return chores;
    } catch (error) {
      console.error('❌ Error getting household chores:', error);
      return [];
    }
  },

  // Get chores assigned to a specific user
  async getUserChores(userId: string, householdId: string): Promise<Chore[]> {
    try {
      if (!db) {
        console.log('📱 Mock mode: Getting user chores');
        return [];
      }

      const choresQuery = query(
        collection(db, 'chores'),
        where('householdId', '==', householdId),
        where('status', '==', 'active'),
        where('assignedTo', 'array-contains', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(choresQuery);
      const chores: Chore[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        chores.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastCompletedAt: data.lastCompletedAt?.toDate(),
          nextDueDate: data.nextDueDate?.toDate(),
        } as Chore);
      });

      console.log('✅ Loaded', chores.length, 'user chores');
      return chores;
    } catch (error) {
      console.error('❌ Error getting user chores:', error);
      return [];
    }
  },

  // Get active chores for display (smart filtering to avoid showing multiple instances)
  async getActiveChoresForDisplay(householdId: string): Promise<Chore[]> {
    try {
      if (!db) {
        console.log('📱 Mock mode: Getting active chores for display');
        return [];
      }

      // Get all active chores
      const choresQuery = query(
        collection(db, 'chores'),
        where('householdId', '==', householdId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(choresQuery);
      const chores: Chore[] = [];
      const now = new Date();
      now.setHours(23, 59, 59, 999); // End of today for comparison

      snapshot.forEach((doc) => {
        const data = doc.data();
        const chore = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastCompletedAt: data.lastCompletedAt?.toDate(),
          nextDueDate: data.nextDueDate?.toDate(),
        } as Chore;

        // Always show one-time chores
        if (chore.frequency === 'once') {
          chores.push(chore);
        } 
        // For recurring chores, only show if due today or overdue
        else if (chore.nextDueDate) {
          const dueDate = timestampToDate(chore.nextDueDate);
          if (dueDate <= now) {
            chores.push(chore);
          }
        } 
        // If no due date, show it (needs initialization)
        else {
          chores.push(chore);
        }
      });

      console.log('✅ Loaded', chores.length, 'active chores for display (filtered)');
      return chores;
    } catch (error) {
      console.error('❌ Error getting active chores for display:', error);
      return [];
    }
  },

  // Complete a chore
  async completeChore(
    choreId: string, 
    userId: string, 
    notes?: string,
    beforePhoto?: string,
    afterPhoto?: string
  ): Promise<string> {
    if (!db) {
      console.log('📱 Mock mode: Completing chore', { choreId, userId, notes, hasPhotos: !!(beforePhoto || afterPhoto) });
      return 'mock-completion-id';
    }

    try {
      console.log('🎯 Starting chore completion:', { 
        choreId, 
        userId, 
        hasNotes: !!notes,
        hasBeforePhoto: !!beforePhoto,
        hasAfterPhoto: !!afterPhoto
      });
      
      // Get the chore details
      const choreRef = doc(db, 'chores', choreId);
      const choreSnap = await getDoc(choreRef);
      
      if (!choreSnap.exists()) {
        throw new Error('Chore not found');
      }

      const chore = choreSnap.data() as Chore;
      console.log('📋 Chore details:', { 
        title: chore.title, 
        frequency: chore.frequency, 
        isRecurring: chore.isRecurring,
        currentStatus: chore.status,
        requiresPhoto: chore.requiresPhoto
      });

      // Get user display name for the completion record
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const userDisplayName = userSnap.exists() ? userSnap.data().displayName || userSnap.data().email : 'Unknown User';

      // Create completion record - build object carefully to avoid undefined values
      const completion: Record<string, any> = {
        choreId,
        choreTitle: chore.title,
        householdId: chore.householdId,
        completedBy: userId,
        completedByName: userDisplayName,
        completedAt: new Date(),
        status: 'pending',
        coinsAwarded: 0, // Will be set to coinsPending when approved
        coinsPending: chore.coinReward,
      };

      // Only add notes if provided and not empty (Firestore doesn't allow undefined)
      if (notes && typeof notes === 'string' && notes.trim().length > 0) {
        completion.notes = notes.trim();
      }

      // Add photos if provided
      if (beforePhoto && typeof beforePhoto === 'string' && beforePhoto.trim().length > 0) {
        completion.beforePhoto = beforePhoto.trim();
      }
      
      if (afterPhoto && typeof afterPhoto === 'string' && afterPhoto.trim().length > 0) {
        completion.afterPhoto = afterPhoto.trim();
      }

      console.log('📝 Creating completion record:', {
        choreTitle: completion.choreTitle,
        completedByName: completion.completedByName,
        hasNotes: !!completion.notes,
        hasBeforePhoto: !!completion.beforePhoto,
        hasAfterPhoto: !!completion.afterPhoto,
        coinsPending: completion.coinsPending,
        householdId: completion.householdId
      });

      const completionRef = await addDoc(collection(db, 'choreCompletions'), completion);
      console.log('✅ Completion record created with ID:', completionRef.id);

      // Do NOT deduct coins immediately - coins are only awarded upon approval
      // The coinsPending field tracks what will be awarded if approved
      console.log('💰 Chore completed - coins pending approval:', chore.coinReward);

      // Update chore completion count and status based on chore type
      const choreUpdate: Record<string, any> = {
        completionCount: (chore.completionCount || 0) + 1,
        lastCompletedAt: new Date(),
        updatedAt: new Date(),
      };

      // For one-time chores (frequency === 'once'), mark as completed so they don't show in active list
      if (chore.frequency === 'once') {
        choreUpdate.status = 'completed';
        console.log('🔄 Marking one-time chore as completed (will be hidden from active list)');
      } else {
        // For recurring chores, keep them active but track the pending completion
        console.log('🔄 Recurring chore remains active with pending completion');
      }

      await updateDoc(choreRef, choreUpdate);
      console.log('✅ Chore updated successfully');

      // For recurring chores, update the next due date
      if (chore.frequency !== 'once') {
        try {
          await choreSchedulingService.updateChoreNextDueDate(choreId);
        } catch (error) {
          console.error('⚠️ Failed to update next due date:', error);
          // Don't fail the completion if due date update fails
        }
      }

      console.log('🎉 Chore completion process completed successfully!');
      return completionRef.id;
    } catch (error) {
      console.error('❌ Error completing chore:', error);
      throw error;
    }
  },

  // Get pending chore completions for approval
  async getPendingCompletions(householdId: string): Promise<ChoreCompletion[]> {
    if (!db) {
      console.log('📱 Mock mode: Getting pending completions');
      return [];
    }

    try {
      console.log('📋 Querying pending completions for household:', householdId);
      
      const completionsQuery = query(
        collection(db, 'choreCompletions'),
        where('householdId', '==', householdId),
        where('status', '==', 'pending'),
        orderBy('completedAt', 'desc')
      );

      const snapshot = await getDocs(completionsQuery);
      const completions: ChoreCompletion[] = [];

      console.log('📊 Raw query results:', snapshot.size, 'documents found');

      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📄 Processing completion:', {
          id: doc.id,
          choreTitle: data.choreTitle,
          completedBy: data.completedByName,
          status: data.status,
          householdId: data.householdId
        });
        
        completions.push({
          id: doc.id,
          ...data,
          completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : new Date(data.completedAt) || new Date(),
          approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate() : data.approvedAt ? new Date(data.approvedAt) : undefined,
        } as ChoreCompletion);
      });

      console.log('✅ Found', completions.length, 'pending completions for approval');
      return completions;
    } catch (error) {
      console.error('❌ Error getting pending completions:', error);
      return [];
    }
  },

  // Approve a chore completion
  async approveCompletion(completionId: string, adminId: string): Promise<void> {
    if (!db) {
      console.log('📱 Mock mode: Approving completion', completionId);
      return;
    }

    try {
      const completionRef = doc(db, 'choreCompletions', completionId);
      const completionSnap = await getDoc(completionRef);
      
      if (!completionSnap.exists()) {
        throw new Error('Completion not found');
      }

      const completion = completionSnap.data() as ChoreCompletion;

      // Update completion status
      await updateDoc(completionRef, {
        status: 'approved',
        approvedBy: adminId,
        approvedAt: new Date(),
        coinsAwarded: completion.coinsPending, // Mark coins as officially awarded
      });

      // Award coins to the user and update their total earned
      if (completion.coinsPending > 0) {
        const userRef = doc(db, 'users', completion.completedBy);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const currentCoins = userData.coins || 0;
          const currentTotal = userData.totalCoinsEarned || 0;
          const currentChoresCompleted = userData.stats?.choresCompleted || 0;
          
          // Award coins to balance, update total coins earned, and increment chores completed
          await updateDoc(userRef, {
            coins: currentCoins + completion.coinsPending,
            totalCoinsEarned: currentTotal + completion.coinsPending,
            'stats.choresCompleted': currentChoresCompleted + 1,
          });
          
          console.log('💰 Approved completion - awarded', completion.coinsPending, 'coins to user');
          console.log('📊 User balance:', currentCoins, '→', currentCoins + completion.coinsPending);
          console.log('🏆 Total earned:', currentTotal, '→', currentTotal + completion.coinsPending);
          console.log('🎯 Chores completed:', currentChoresCompleted, '→', currentChoresCompleted + 1);

          // Log activity for chore completion
          await activityService.logChoreCompletion(
            completion.choreId,
            completion.choreTitle,
            completion.completedBy,
            completion.completedByName,
            completion.householdId,
            completion.coinsPending
          );
          console.log('📝 Activity logged for chore completion');
        }
      }

      console.log('✅ Completion approved and coins awarded');
    } catch (error) {
      console.error('❌ Error approving completion:', error);
      throw error;
    }
  },

  // Reject a chore completion
  async rejectCompletion(completionId: string, adminId: string, reason: string): Promise<void> {
    if (!db) {
      console.log('📱 Mock mode: Rejecting completion', completionId);
      return;
    }

    try {
      const completionRef = doc(db, 'choreCompletions', completionId);
      const completionSnap = await getDoc(completionRef);
      
      if (!completionSnap.exists()) {
        throw new Error('Completion not found');
      }

      const completion = completionSnap.data() as ChoreCompletion;
      
      // Update completion status
      await updateDoc(completionRef, {
        status: 'rejected',
        approvedBy: adminId,
        approvedAt: new Date(),
        rejectionReason: reason,
      });

      // No coins to refund since they were never deducted
      console.log('❌ Completion rejected - no coins awarded');

      console.log('✅ Completion rejected successfully');
    } catch (error) {
      console.error('❌ Error rejecting completion:', error);
      throw error;
    }
  },

  // Listen to household chores
  onHouseholdChoresSnapshot(householdId: string, callback: (chores: Chore[]) => void): () => void {
    if (!db) {
      callback([]);
      return () => {};
    }

    const choresRef = collection(db, 'chores');
    const q = query(
      choresRef,
      where('householdId', '==', householdId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const chores: Chore[] = [];
      snapshot.forEach((doc) => {
        chores.push({ id: doc.id, ...doc.data() } as Chore);
      });
      callback(chores);
    });
  },

  // Check if a chore has been completed today
  async hasChoreBeenCompletedToday(choreId: string): Promise<boolean> {
    if (!db) {
      console.log('📱 Mock mode: Checking if chore completed today');
      return false;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

      // Check for APPROVED completions of this chore today (not pending/rejected)
      const completionsQuery = query(
        collection(db, 'choreCompletions'),
        where('choreId', '==', choreId),
        where('status', '==', 'approved'), // Only count approved completions
        where('completedAt', '>=', today),
        where('completedAt', '<', tomorrow)
      );

      const snapshot = await getDocs(completionsQuery);
      const hasApprovedCompletion = !snapshot.empty;
      
      if (hasApprovedCompletion) {
        console.log(`✅ Chore ${choreId} has been APPROVED as completed today`);
      } else {
        console.log(`⏰ Chore ${choreId} has NOT been approved as completed today`);
      }
      
      return hasApprovedCompletion;
    } catch (error) {
      console.error('❌ Error checking if chore completed today:', error);
      return false;
    }
  },

  // Check if a chore has any completion (pending or approved) today
  async hasChoreBeenCompletedOrPendingToday(choreId: string): Promise<{ completed: boolean; status: 'none' | 'pending' | 'approved' }> {
    if (!db) {
      console.log('📱 Mock mode: Checking if chore completed or pending today');
      return { completed: false, status: 'none' };
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

      console.log(`🔍 Checking completion status for chore ${choreId} on ${today.toDateString()}`);

      // Check for ANY completions of this chore today (pending or approved)
      const completionsQuery = query(
        collection(db, 'choreCompletions'),
        where('choreId', '==', choreId),
        where('status', 'in', ['pending', 'approved']), // Include both pending and approved
        where('completedAt', '>=', today),
        where('completedAt', '<', tomorrow)
      );

      const snapshot = await getDocs(completionsQuery);
      
      if (snapshot.empty) {
        console.log(`⏰ Chore ${choreId} has NO completions today`);
        return { completed: false, status: 'none' };
      }

      // Get the latest completion
      const completions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (ChoreCompletion & { id: string })[];
      console.log(`📋 Found ${completions.length} completions for chore ${choreId}:`, completions.map(c => ({
        id: c.id,
        status: c.status,
        completedAt: c.completedAt
      })));

      const latestCompletion = completions.sort((a, b) => 
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      )[0];

      const status = latestCompletion.status as 'pending' | 'approved';
      console.log(`📋 Latest completion status for chore ${choreId}: ${status}`);
      
      return { completed: true, status };
    } catch (error) {
      console.error('❌ Error checking if chore completed or pending today:', error);
      return { completed: false, status: 'none' };
    }
  },

  // Get overdue chores
  async getOverdueChores(householdId: string): Promise<Chore[]> {
    if (!db) {
      console.log('📱 Mock mode: Getting overdue chores');
      return [];
    }

    try {
      const allChores = await choreService.getHouseholdChores(householdId, 'active');
      const overdueChores: Chore[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today - only chores due BEFORE today are overdue
      
      for (const chore of allChores) {
        if (chore.frequency !== 'once' && chore.nextDueDate) {
          const dueDate = timestampToDate(chore.nextDueDate);
          dueDate.setHours(0, 0, 0, 0); // Normalize due date to start of day
          if (dueDate < today) { // Only overdue if due date is before today
            overdueChores.push(chore);
          }
        }
      }
      
      console.log(`⏰ Found ${overdueChores.length} overdue chores (due before ${today.toDateString()})`);
      return overdueChores;
    } catch (error) {
      console.error('❌ Error getting overdue chores:', error);
      return [];
    }
  },

  // Delete chore
  async deleteChore(choreId: string): Promise<void> {
    if (!db) {
      console.log('📱 Mock mode: Deleting chore', choreId);
      return;
    }

    try {
      const choreRef = doc(db, 'chores', choreId);
      
      // Also delete any related completions
      const completionsQuery = query(
        collection(db, 'choreCompletions'),
        where('choreId', '==', choreId)
      );
      const completionsSnapshot = await getDocs(completionsQuery);
      
      const batch = writeBatch(db);
      
      // Delete the chore
      batch.delete(choreRef);
      
      // Delete related completions
      completionsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log('✅ Chore and related data deleted successfully:', choreId);
    } catch (error) {
      console.error('❌ Error deleting chore:', error);
      throw error;
    }
  },
};

// ============================================================================
// CHORE SCHEDULING AND RECURRING LOGIC
// ============================================================================

export const choreSchedulingService = {
  // Calculate next due date for a chore based on its frequency
  calculateNextDueDate(chore: Chore, lastCompletedDate?: Date): Date {
    const baseDate = lastCompletedDate || 
      (chore.lastCompletedAt?.toDate ? chore.lastCompletedAt.toDate() : 
       chore.lastCompletedAt ? new Date(chore.lastCompletedAt as any) : new Date());
    const nextDue = new Date(baseDate);
    
    console.log(`📅 Calculating next due date for "${chore.title}" (${chore.frequency})`);
    console.log(`📅 Base date: ${baseDate.toDateString()}`);
    console.log(`📅 Last completed date: ${lastCompletedDate?.toDateString() || 'none'}`);

    switch (chore.frequency) {
      case 'daily':
        nextDue.setDate(nextDue.getDate() + 1);
        break;
      
      case 'weekly':
        nextDue.setDate(nextDue.getDate() + 7);
        break;
      
      case 'monthly':
        nextDue.setMonth(nextDue.getMonth() + 1);
        break;
      
      case 'custom':
        if (chore.customFrequency?.days && chore.customFrequency.days.length > 0) {
          console.log(`📅 Custom frequency days: ${chore.customFrequency.days.join(', ')}`);
          
          // Find next occurrence of specified days
          const targetDays = chore.customFrequency.days.map(day => {
            const dayMap: { [key: string]: number } = {
              'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
              'thursday': 4, 'friday': 5, 'saturday': 6
            };
            return dayMap[day.toLowerCase()];
          });
          
          console.log(`📅 Target day numbers: ${targetDays.join(', ')}`);
          
          // If this is for initial scheduling (no lastCompletedDate), check if today is a target day
          if (!lastCompletedDate) {
            const today = new Date();
            console.log(`📅 Initial scheduling - today is ${today.toDateString()} (day ${today.getDay()})`);
            if (targetDays.includes(today.getDay())) {
              console.log(`📅 Today is a target day, setting due date to today`);
              return today;
            }
          }
          
          // Find next target day
          let daysToAdd = 1;
          while (daysToAdd <= 7) {
            const testDate = new Date(baseDate);
            testDate.setDate(testDate.getDate() + daysToAdd);
            if (targetDays.includes(testDate.getDay())) {
              nextDue.setDate(nextDue.getDate() + daysToAdd);
              console.log(`📅 Found next occurrence in ${daysToAdd} days: ${nextDue.toDateString()}`);
              break;
            }
            daysToAdd++;
          }
        } else {
          console.log(`⚠️ Custom frequency chore missing days data, defaulting to weekly`);
          // Default to weekly if custom frequency is malformed
          nextDue.setDate(nextDue.getDate() + 7);
        }
        break;
      
      case 'once':
      default:
        // One-time chores don't have next due dates
        console.log(`📅 One-time chore, returning base date`);
        return nextDue;
    }

    console.log(`📅 Final calculated due date: ${nextDue.toDateString()}`);
    return nextDue;
  },

  // Get chores due on a specific date
  async getChoresDueOnDate(householdId: string, targetDate: Date): Promise<Chore[]> {
    if (!db) {
      console.log('📱 Mock mode: Getting chores for date');
      return [];
    }

    try {
      // Get all active chores for the household
      const allChores = await choreService.getHouseholdChores(householdId, 'active');
      const choresDue: Chore[] = [];
      
      const targetDateString = targetDate.toDateString();
      const targetDayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      for (const chore of allChores) {
        if (chore.frequency === 'once') {
          // One-time chores are always "due" until completed
          choresDue.push(chore);
        } else if (chore.frequency === 'custom') {
          // Special handling for custom frequency chores
          if (chore.customFrequency?.days && chore.customFrequency.days.length > 0) {
            const targetDays = chore.customFrequency.days.map(day => {
              const dayMap: { [key: string]: number } = {
                'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
                'thursday': 4, 'friday': 5, 'saturday': 6
              };
              return dayMap[day.toLowerCase()];
            });
            
            // Check if target date is one of the custom frequency days
            if (targetDays.includes(targetDayOfWeek)) {
              // Also check that the target date is on or after the creation date
              const createdDate = chore.createdAt.toDate ? chore.createdAt.toDate() : 
                (chore.createdAt as any).seconds ? new Date((chore.createdAt as any).seconds * 1000) : 
                new Date(chore.createdAt as any);
              
              if (targetDate >= createdDate) {
                choresDue.push(chore);
                console.log(`📅 Custom frequency chore "${chore.title}" is due on ${targetDateString} (${chore.customFrequency.days.join(', ')})`);
              }
            }
          }
        } else {
          // For other recurring chores, use stored nextDueDate if available
          let nextDue: Date;
          
          if (chore.nextDueDate) {
            // Use stored due date
            nextDue = chore.nextDueDate.toDate ? chore.nextDueDate.toDate() : 
              (chore.nextDueDate as any).seconds ? new Date((chore.nextDueDate as any).seconds * 1000) : 
              new Date(chore.nextDueDate as any);
          } else {
            // Calculate due date if not stored (fallback for older chores)
            nextDue = this.calculateNextDueDate(chore);
          }
          
          // Check if due on target date
          if (nextDue.toDateString() === targetDateString) {
            choresDue.push(chore);
          }
          
          // For daily chores, also check if they should appear every day
          if (chore.frequency === 'daily') {
            // Daily chores should appear every day from their creation date
            const createdDate = chore.createdAt.toDate ? chore.createdAt.toDate() : 
              (chore.createdAt as any).seconds ? new Date((chore.createdAt as any).seconds * 1000) : 
              new Date(chore.createdAt as any);
            
            // If target date is today or after creation date, show the chore
            if (targetDate >= createdDate) {
              // Only add if not already added
              if (!choresDue.find(c => c.id === chore.id)) {
                choresDue.push(chore);
              }
            }
          }
        }
      }
      
      console.log(`📅 Found ${choresDue.length} chores due on ${targetDateString}`);
      return choresDue;
    } catch (error) {
      console.error('❌ Error getting chores for date:', error);
      return [];
    }
  },

  // Get chores for a date range (useful for calendar view)
  async getChoresForDateRange(householdId: string, startDate: Date, endDate: Date): Promise<{ [dateString: string]: Chore[] }> {
    if (!db) {
      console.log('📱 Mock mode: Getting chores for date range');
      return {};
    }

    try {
      const choresByDate: { [dateString: string]: Chore[] } = {};
      
      // Iterate through each date in the range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateString = currentDate.toDateString();
        choresByDate[dateString] = await this.getChoresDueOnDate(householdId, new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`📅 Generated chore schedule for ${Object.keys(choresByDate).length} days`);
      return choresByDate;
    } catch (error) {
      console.error('❌ Error getting chores for date range:', error);
      return {};
    }
  },

  // Update next due date for a chore after completion
  async updateChoreNextDueDate(choreId: string, lastCompletedDate?: Date): Promise<void> {
    if (!db) {
      console.log('📱 Mock mode: Updating chore due date');
      return;
    }

    try {
      const choreRef = doc(db, 'chores', choreId);
      const choreSnap = await getDoc(choreRef);
      
      if (!choreSnap.exists()) {
        throw new Error('Chore not found');
      }

      const chore = choreSnap.data() as Chore;
      
      // Only update due date for recurring chores
      if (chore.frequency !== 'once') {
        let nextDue: Date;
        
        if (lastCompletedDate) {
          // After completion, calculate from completion date
          nextDue = this.calculateNextDueDate(chore, lastCompletedDate);
        } else if (!chore.nextDueDate) {
          // For new chores without a due date, set initial due date
          if (chore.frequency === 'daily') {
            // Daily chores are due today when first created
            nextDue = new Date();
            nextDue.setHours(0, 0, 0, 0); // Start of today
          } else {
            // Other frequencies calculate from creation date
            const creationDate = chore.createdAt.toDate ? chore.createdAt.toDate() : 
              (chore.createdAt as any).seconds ? new Date((chore.createdAt as any).seconds * 1000) : 
              new Date(chore.createdAt as any);
            nextDue = this.calculateNextDueDate(chore, creationDate);
          }
        } else {
          // Already has a due date, calculate next occurrence
          const currentDue = (chore.nextDueDate as any)?.toDate ? (chore.nextDueDate as any).toDate() : new Date(chore.nextDueDate! as any);
          nextDue = this.calculateNextDueDate(chore, currentDue);
        }
        
        await updateDoc(choreRef, {
          nextDueDate: nextDue,
          updatedAt: new Date(),
        });
        
        console.log(`📅 Updated next due date for "${chore.title}" to ${nextDue.toDateString()}`);
      }
    } catch (error) {
      console.error('❌ Error updating chore due date:', error);
      throw error;
    }
  },

  // Delete chore
  async deleteChore(choreId: string): Promise<void> {
    if (!db) {
      console.log('📱 Mock mode: Deleting chore', choreId);
      return;
    }

    try {
      const choreRef = doc(db, 'chores', choreId);
      
      // Also delete any related completions
      const completionsQuery = query(
        collection(db, 'choreCompletions'),
        where('choreId', '==', choreId)
      );
      const completionsSnapshot = await getDocs(completionsQuery);
      
      const batch = writeBatch(db);
      
      // Delete the chore
      batch.delete(choreRef);
      
      // Delete related completions
      completionsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log('✅ Chore and related data deleted successfully:', choreId);
    } catch (error) {
      console.error('❌ Error deleting chore:', error);
      throw error;
    }
  },

  // Get overdue chores
  async getOverdueChores(householdId: string): Promise<Chore[]> {
    if (!db) {
      console.log('📱 Mock mode: Getting overdue chores');
      return [];
    }

    try {
      const allChores = await choreService.getHouseholdChores(householdId, 'active');
      const overdueChores: Chore[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today - only chores due BEFORE today are overdue
      
      for (const chore of allChores) {
        if (chore.frequency !== 'once' && chore.nextDueDate) {
          const dueDate = timestampToDate(chore.nextDueDate);
          dueDate.setHours(0, 0, 0, 0); // Normalize due date to start of day
          if (dueDate < today) { // Only overdue if due date is before today
            overdueChores.push(chore);
          }
        }
      }
      
      console.log(`⏰ Found ${overdueChores.length} overdue chores (due before ${today.toDateString()})`);
      return overdueChores;
    } catch (error) {
      console.error('❌ Error getting overdue chores:', error);
      return [];
    }
  },

  // Initialize next due dates for existing chores (migration helper)
  async initializeNextDueDates(householdId: string): Promise<void> {
    if (!db) {
      console.log('📱 Mock mode: Initializing next due dates');
      return;
    }

    try {
      const chores = await choreService.getHouseholdChores(householdId);
      const batch = writeBatch(db);

      for (const chore of chores) {
        if (chore.isRecurring && !chore.nextDueDate) {
          const choreRef = doc(db, 'chores', chore.id);
          const nextDue = this.calculateNextDueDate(chore);
          
          batch.update(choreRef, {
            nextDueDate: nextDue,
            updatedAt: new Date(),
          });
        }
      }

      await batch.commit();
      console.log('✅ Initialized next due dates for all recurring chores');
    } catch (error) {
      console.error('❌ Error initializing next due dates:', error);
    }
  },

  // Get overdue assigned chores for coin deduction
  async getOverdueAssignedChores(householdId: string): Promise<Chore[]> {
    try {
      if (!db) {
        console.log('📱 Mock mode: Getting overdue assigned chores');
        return [];
      }

      const now = new Date();
      const allChores = await choreService.getHouseholdChores(householdId, 'active');
      
      const overdueAssignedChores = allChores.filter(chore => {
        // Only check assigned chores (not "anyone can do")
        if (chore.anyoneCanDo || chore.assignedTo.length === 0) {
          return false;
        }

        // Check if chore is overdue
        if (chore.nextDueDate) {
          const dueDate = timestampToDate(chore.nextDueDate);
          return now > dueDate;
        }

        return false;
      });

      console.log(`📅 Found ${overdueAssignedChores.length} overdue assigned chores`);
      return overdueAssignedChores;
    } catch (error) {
      console.error('❌ Error getting overdue assigned chores:', error);
      return [];
    }
  },

  // Process coin deductions for missed chores
  async processMissedChoreDeductions(householdId: string): Promise<{ processed: number; errors: string[] }> {
    try {
      if (!db) {
        console.log('📱 Mock mode: Processing missed chore deductions');
        return { processed: 0, errors: [] };
      }

      // Get household settings
      const household = await householdService.getHousehold(householdId);
      if (!household?.settings.coinDeduction.enabled) {
        console.log('💰 Coin deduction disabled for household');
        return { processed: 0, errors: [] };
      }

      const { missedChoreDeduction, gracePeriodHours } = household.settings.coinDeduction;
      const now = new Date();
      const gracePeriod = gracePeriodHours * 60 * 60 * 1000; // Convert to milliseconds

      // Get overdue assigned chores
      const overdueChores = await this.getOverdueAssignedChores(householdId);
      
      let processed = 0;
      const errors: string[] = [];

      for (const chore of overdueChores) {
        try {
          const dueDate = timestampToDate(chore.nextDueDate);
          const timeSinceDue = now.getTime() - dueDate.getTime();

          // Check if grace period has passed
          if (timeSinceDue < gracePeriod) {
            continue; // Still in grace period
          }

          // Deduct coins from each assigned user
          for (const userId of chore.assignedTo) {
            try {
              const userRef = doc(db, 'users', userId);
              const userDoc = await getDoc(userRef);
              
              if (userDoc.exists()) {
                const userData = userDoc.data() as FirestoreUser;
                const currentCoins = userData.coins || 0;
                const newCoins = Math.max(0, currentCoins - missedChoreDeduction); // Don't go below 0

                await updateDoc(userRef, {
                  coins: newCoins,
                  lastActive: new Date(),
                });

                // Log the deduction
                console.log(`💰 Deducted ${missedChoreDeduction} coins from ${userData.displayName} for missed chore: ${chore.title}`);
                processed++;

                // TODO: Create a notification/log entry for the deduction
                // This could be added to a 'coinTransactions' collection for audit trail
              }
            } catch (userError) {
              errors.push(`Failed to deduct coins for user ${userId}: ${userError}`);
            }
          }

          // Update chore to mark deduction as processed (to avoid duplicate deductions)
          const choreRef = doc(db, 'chores', chore.id);
          await updateDoc(choreRef, {
            lastDeductionProcessed: now,
            updatedAt: new Date(),
          });

        } catch (choreError) {
          errors.push(`Failed to process chore ${chore.id}: ${choreError}`);
        }
      }

      console.log(`✅ Processed ${processed} coin deductions with ${errors.length} errors`);
      return { processed, errors };
    } catch (error) {
      console.error('❌ Error processing missed chore deductions:', error);
      return { processed: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  },

  // Fix custom frequency chores with incorrect due dates (utility function)
  async fixCustomFrequencyChores(householdId: string): Promise<void> {
    if (!db) {
      console.log('📱 Mock mode: Fixing custom frequency chores');
      return;
    }

    try {
      console.log('🔧 Fixing custom frequency chores...');
      const allChores = await choreService.getHouseholdChores(householdId, 'active');
      const batch = writeBatch(db);
      let fixedCount = 0;

      for (const chore of allChores) {
        if (chore.frequency === 'custom' && chore.customFrequency?.days) {
          console.log(`🔧 Checking custom frequency chore: "${chore.title}"`);
          
          // Calculate the correct next due date
          const correctDueDate = this.calculateNextDueDate(chore);
          
          // If there's a significant difference, update it
          if (chore.nextDueDate) {
            const currentDueDate = timestampToDate(chore.nextDueDate);
            const daysDifference = Math.abs(correctDueDate.getTime() - currentDueDate.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysDifference > 30) { // If more than 30 days different, fix it
              console.log(`🔧 Fixing "${chore.title}" due date from ${currentDueDate.toDateString()} to ${correctDueDate.toDateString()}`);
              const choreRef = doc(db, 'chores', chore.id);
              batch.update(choreRef, {
                nextDueDate: correctDueDate,
                updatedAt: new Date(),
              });
              fixedCount++;
            }
          } else {
            // No due date set, set it now
            console.log(`🔧 Setting initial due date for "${chore.title}" to ${correctDueDate.toDateString()}`);
            const choreRef = doc(db, 'chores', chore.id);
            batch.update(choreRef, {
              nextDueDate: correctDueDate,
              updatedAt: new Date(),
            });
            fixedCount++;
          }
        }
      }

      if (fixedCount > 0) {
        await batch.commit();
        console.log(`✅ Fixed ${fixedCount} custom frequency chores`);
      } else {
        console.log('✅ No custom frequency chores needed fixing');
      }
    } catch (error) {
      console.error('❌ Error fixing custom frequency chores:', error);
    }
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const firestoreUtils = {
  // Initialize user data after authentication
  async initializeUserData(userId: string, email: string, displayName: string): Promise<void> {
    try {
      const existingUser = await userService.getUser(userId);
      if (!existingUser) {
        await userService.createUser(userId, {
          email,
          displayName,
        });
        console.log('✅ User data initialized for:', userId);
      } else {
        await userService.updateLastActive(userId);
        console.log('✅ User last active updated for:', userId);
      }
    } catch (error) {
      console.error('❌ Error initializing user data:', error);
    }
  },

  // Get user's household data
  async getUserHouseholdData(userId: string): Promise<{ user: FirestoreUser | null; household: Household | null }> {
    try {
      const user = await userService.getUser(userId);
      if (!user || !user.householdId) {
        return { user, household: null };
      }

      const household = await householdService.getHousehold(user.householdId);
      return { user, household };
    } catch (error) {
      console.error('❌ Error getting user household data:', error);
      return { user: null, household: null };
    }
  },
};

export const rewardService = {
  // Create a new reward with smart duplicate checking
  async createReward(rewardData: Omit<Reward, 'id' | 'createdAt' | 'updatedAt' | 'requestCount' | 'currentRedemptions'>) {
    try {
      console.log('🎁 Creating reward:', rewardData.title);
      
      if (!db) {
        console.log('📱 Mock mode: Creating reward');
        return { success: true, rewardId: 'mock-reward-' + Date.now() };
      }

      // Check for similar rewards in the household
      const existingRewards = await this.getHouseholdRewards(rewardData.householdId);
      const similarReward = existingRewards.find(reward => 
        reward.title.toLowerCase().trim() === rewardData.title.toLowerCase().trim() &&
        reward.category === rewardData.category
      );

      if (similarReward) {
        // Update existing reward's popularity instead of creating duplicate
        await this.incrementRewardPopularity(similarReward.id);
        console.log('✅ Updated existing reward popularity instead of creating duplicate');
        return { success: true, rewardId: similarReward.id, wasExisting: true };
      }

      // Create new reward
      const newReward: Omit<Reward, 'id'> = {
        ...rewardData,
        requestCount: 0,
        currentRedemptions: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('📝 Final reward data being saved:', newReward);
      const rewardRef = await addDoc(collection(db, 'rewards'), newReward);
      
      // Update popular rewards tracking
      await this.updatePopularRewards(rewardData);
      
      console.log('✅ Reward created successfully with ID:', rewardRef.id);
      console.log('🔍 Reward saved to collection: rewards');
      console.log('🏠 Household ID:', newReward.householdId);
      console.log('🎯 Is Active:', newReward.isActive);
      
      return { success: true, rewardId: rewardRef.id, wasExisting: false };
    } catch (error) {
      console.error('❌ Error creating reward:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Get all rewards for a household
  async getHouseholdRewards(householdId: string): Promise<Reward[]> {
    try {
      if (!db) {
        console.log('📱 Mock mode: Getting household rewards');
        return [];
      }

      const rewardsQuery = query(
        collection(db, 'rewards'),
        where('householdId', '==', householdId),
        where('isActive', '==', true),
        orderBy('requestCount', 'desc'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(rewardsQuery);
      const rewards: Reward[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        rewards.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastRequested: data.lastRequested?.toDate(),
        } as Reward);
      });

      console.log('✅ Loaded', rewards.length, 'household rewards');
      return rewards;
    } catch (error) {
      console.error('❌ Error getting household rewards:', error);
      return [];
    }
  },

  // Request a reward (exchange coins)
  async requestReward(userId: string, rewardId: string): Promise<{ success: boolean; error?: string; requestId?: string }> {
    try {
      console.log('🎁 Processing reward request:', { userId, rewardId });
      
      if (!db) {
        console.log('📱 Mock mode: Reward request processed');
        return { success: true, requestId: 'mock-request-' + Date.now() };
      }

      // Get reward details
      const rewardDoc = await getDoc(doc(db, 'rewards', rewardId));
      if (!rewardDoc.exists()) {
        return { success: false, error: 'Reward not found' };
      }

      const reward = { id: rewardDoc.id, ...rewardDoc.data() } as Reward;

      // Get user data to check coin balance
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return { success: false, error: 'User not found' };
      }

      const userData = userDoc.data() as FirestoreUser;

      // Check if user has enough coins
      if (userData.coins < reward.coinCost) {
        return { success: false, error: 'Insufficient coins' };
      }

      // Check availability
      if (reward.maxRedemptions && reward.currentRedemptions >= reward.maxRedemptions) {
        return { success: false, error: 'Reward no longer available' };
      }

      // Check cooldown
      if (reward.cooldownHours && reward.lastRequested) {
        const hoursSinceLastRequest = (Date.now() - reward.lastRequested.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastRequest < reward.cooldownHours) {
          const hoursRemaining = Math.ceil(reward.cooldownHours - hoursSinceLastRequest);
          return { success: false, error: `Reward available in ${hoursRemaining} hours` };
        }
      }

      // Get user display name for the request
      const requestUserDoc = await getDoc(doc(db, 'users', userId));
      const userDisplayName = requestUserDoc.exists() ? requestUserDoc.data().displayName || requestUserDoc.data().email : 'Unknown User';

      // Create reward request
      const rewardRequest: Omit<RewardRequest, 'id'> = {
        rewardId,
        userId,
        userDisplayName,
        householdId: reward.householdId,
        coinCost: reward.coinCost,
        status: reward.requiresApproval ? 'pending' : 'approved',
        requestedAt: new Date(),
        processedAt: new Date(),
        processedBy: 'admin',
        notes: 'Approved',
        rewardSnapshot: {
          title: reward.title,
          description: reward.description,
          category: reward.category,
        },
      };

      const requestRef = await addDoc(collection(db, 'rewardRequests'), rewardRequest);

      // Log activity for reward request
      try {
        await activityService.logRewardRequest(
          rewardId,
          reward.title,
          userId,
          userDisplayName,
          reward.householdId,
          reward.coinCost
        );
        console.log('📝 Activity logged for reward request');
      } catch (activityError) {
        console.warn('⚠️ Failed to log reward request activity:', activityError);
        // Don't fail the reward request if activity logging fails
      }

      // If auto-approved, process immediately
      if (!reward.requiresApproval) {
        await this.processRewardRequest(requestRef.id, 'approved', 'admin');
      }

      // Update reward popularity
      await this.incrementRewardPopularity(rewardId);

      console.log('✅ Reward request created:', requestRef.id);
      return { success: true, requestId: requestRef.id };
    } catch (error) {
      console.error('❌ Error requesting reward:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Process a reward request (approve/deny)
  async processRewardRequest(requestId: string, status: 'approved' | 'denied', processedBy: string, notes?: string): Promise<boolean> {
    try {
      if (!db) {
        console.log('📱 Mock mode: Reward request processed');
        return true;
      }

      const requestRef = doc(db, 'rewardRequests', requestId);
      const requestDoc = await getDoc(requestRef);
      
      if (!requestDoc.exists()) {
        console.error('Reward request not found');
        return false;
      }

      const requestData = requestDoc.data() as RewardRequest;

      // Update request status
      await updateDoc(requestRef, {
        status,
        processedAt: new Date(),
        processedBy,
        notes: notes || '',
      });

      // If approved, deduct coins and update reward stats
      if (status === 'approved') {
        // Deduct coins from user and update cash rewards if applicable
        const userRef = doc(db, 'users', requestData.userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as FirestoreUser;
          
          // Prepare the user update object
          const userUpdate: any = {
            coins: Math.max(0, userData.coins - requestData.coinCost),
            updatedAt: new Date(),
          };

          // If this is a money reward, add to user's total cash rewards
          if (requestData.rewardSnapshot.category === 'money') {
            // Use the cashValue from the reward if available, otherwise fallback to coin conversion
            let cashAmount = 0;
            
            // Get the full reward data to access cashValue
            const rewardRef = doc(db, 'rewards', requestData.rewardId);
            const rewardDoc = await getDoc(rewardRef);
            
            if (rewardDoc.exists()) {
              const rewardData = rewardDoc.data() as Reward;
              if (rewardData.cashValue && rewardData.cashValue > 0) {
                cashAmount = rewardData.cashValue;
                console.log(`💰 Using reward's cashValue: £${cashAmount.toFixed(2)}`);
              } else {
                // Fallback: extract from title (for existing rewards)
                const titleMatch = requestData.rewardSnapshot.title.match(/£(\d+(?:\.\d{2})?)/);
                if (titleMatch) {
                  cashAmount = parseFloat(titleMatch[1]);
                  console.log(`💰 Extracted from title: £${cashAmount.toFixed(2)}`);
                } else {
                  // Final fallback: coin conversion
                  cashAmount = requestData.coinCost * 0.01; // 1 coin = 1 penny/cent
                  console.log(`💰 Using coin conversion: £${cashAmount.toFixed(2)}`);
                }
              }
            } else {
              // Reward not found, use coin conversion
              cashAmount = requestData.coinCost * 0.01;
              console.log(`💰 Reward not found, using coin conversion: £${cashAmount.toFixed(2)}`);
            }
            
            const newTotalCashRewards = (userData.totalCashRewards || 0) + cashAmount;
            userUpdate.totalCashRewards = newTotalCashRewards;
            console.log(`💰 Adding £${cashAmount.toFixed(2)} to user's total cash rewards (was £${(userData.totalCashRewards || 0).toFixed(2)}, will be £${newTotalCashRewards.toFixed(2)})`);
          }

          // Perform single atomic update
          await updateDoc(userRef, userUpdate);
          console.log(`✅ User data updated: coins deducted (${requestData.coinCost}) ${requestData.rewardSnapshot.category === 'money' ? 'and cash rewards added' : ''}`);
        }

        // Update reward redemption count
        const rewardRef = doc(db, 'rewards', requestData.rewardId);
        const rewardDoc = await getDoc(rewardRef);
        
        if (rewardDoc.exists()) {
          const rewardData = rewardDoc.data() as Reward;
          const newRedemptionCount = rewardData.currentRedemptions + 1;
          
          // Check if reward should be deactivated after this redemption
          const shouldDeactivate = rewardData.maxRedemptions !== null && 
                                 rewardData.maxRedemptions !== undefined && 
                                 newRedemptionCount >= rewardData.maxRedemptions;
          
          const updateData: any = {
            currentRedemptions: newRedemptionCount,
            lastRequested: new Date(),
            updatedAt: new Date(),
          };
          
          // Deactivate if max redemptions reached
          if (shouldDeactivate) {
            updateData.isActive = false;
            console.log(`🚫 Reward "${rewardData.title}" deactivated - max redemptions (${rewardData.maxRedemptions}) reached`);
          }
          
          await updateDoc(rewardRef, updateData);
          
          if (shouldDeactivate) {
            console.log(`✅ Reward "${rewardData.title}" automatically deactivated after reaching maximum redemptions`);
          }
        }

        console.log(`✅ Reward request approved and ${requestData.coinCost} coins deducted`);
      }

      console.log('✅ Reward request processed:', status);
      return true;
    } catch (error) {
      console.error('❌ Error processing reward request:', error);
      return false;
    }
  },

  // Get popular reward recommendations
  async getPopularRewards(): Promise<PopularReward[]> {
    try {
      if (!db) {
        // Return mock popular rewards for development
        return [
          {
            title: 'Extra Screen Time',
            description: '30 minutes additional device time',
            category: 'privileges',
            averageCoinCost: 15,
            requestFrequency: 25,
            icon: 'mobile-alt',
            color: '#3B82F6'
          },
          {
            title: 'Choose Tonight\'s Dinner',
            description: 'Pick what the family has for dinner',
            category: 'privileges',
            averageCoinCost: 20,
            requestFrequency: 18,
            icon: 'utensils',
            color: '#F59E0B'
          },
          {
            title: 'Movie Night Pick',
            description: 'Choose the movie for family movie night',
            category: 'entertainment',
            averageCoinCost: 25,
            requestFrequency: 15,
            icon: 'film',
            color: '#8B5CF6'
          },
          {
            title: 'Candy/Treat',
            description: 'Small candy or sweet treat',
            category: 'treats',
            averageCoinCost: 10,
            requestFrequency: 22,
            icon: 'candy-cane',
            color: '#EC4899'
          },
          {
            title: 'Stay Up Late',
            description: '1 hour past normal bedtime',
            category: 'privileges',
            averageCoinCost: 30,
            requestFrequency: 12,
            icon: 'clock',
            color: '#6366F1'
          }
        ];
      }

      // In real implementation, this would aggregate data from all households
      const popularDoc = await getDoc(doc(db, 'system', 'popularRewards'));
      if (popularDoc.exists()) {
        return popularDoc.data().rewards || [];
      }

      return [];
    } catch (error) {
      console.error('❌ Error getting popular rewards:', error);
      return [];
    }
  },

  // Internal function to increment reward popularity
  async incrementRewardPopularity(rewardId: string): Promise<void> {
    try {
      if (!db) return;

      const rewardRef = doc(db, 'rewards', rewardId);
      const rewardDoc = await getDoc(rewardRef);
      
      if (rewardDoc.exists()) {
        const rewardData = rewardDoc.data() as Reward;
        await updateDoc(rewardRef, {
          requestCount: rewardData.requestCount + 1,
          lastRequested: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('❌ Error incrementing reward popularity:', error);
    }
  },

  // Internal function to update global popular rewards
  async updatePopularRewards(rewardData: Partial<Reward>): Promise<void> {
    try {
      if (!db) return;

      // This would update a global collection that tracks popular rewards across all households
      // Implementation would aggregate data and update the popularRewards document
      console.log('📊 Updating popular rewards tracking for:', rewardData.title);
    } catch (error) {
      console.error('❌ Error updating popular rewards:', error);
    }
  },

  // Get user's reward requests
  async getUserRewardRequests(userId: string): Promise<RewardRequest[]> {
    try {
      if (!db) {
        console.log('📱 Mock mode: Getting user reward requests');
        return [];
      }

      const requestsQuery = query(
        collection(db, 'rewardRequests'),
        where('userId', '==', userId),
        orderBy('requestedAt', 'desc'),
        limit(20)
      );

      const snapshot = await getDocs(requestsQuery);
      const requests: RewardRequest[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          ...data,
          requestedAt: data.requestedAt?.toDate ? data.requestedAt.toDate() : new Date(data.requestedAt) || new Date(),
          processedAt: data.processedAt?.toDate ? data.processedAt.toDate() : data.processedAt ? new Date(data.processedAt) : undefined,
        } as RewardRequest);
      });

      console.log('✅ Loaded', requests.length, 'user reward requests');
      return requests;
    } catch (error) {
      console.error('❌ Error getting user reward requests:', error);
      return [];
    }
  },

  // Get pending reward requests for approval
  async getPendingRequests(householdId: string): Promise<RewardRequest[]> {
    if (!db) {
      console.log('📱 Mock mode: Getting pending reward requests');
      return [];
    }

    try {
      const requestsQuery = query(
        collection(db, 'rewardRequests'),
        where('householdId', '==', householdId),
        where('status', 'in', ['pending', 'approved']),
        orderBy('requestedAt', 'desc')
      );

      const snapshot = await getDocs(requestsQuery);
      const requests: RewardRequest[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          ...data,
          requestedAt: data.requestedAt?.toDate ? data.requestedAt.toDate() : new Date(data.requestedAt) || new Date(),
          processedAt: data.processedAt?.toDate ? data.processedAt.toDate() : data.processedAt ? new Date(data.processedAt) : undefined,
        } as RewardRequest);
      });

      console.log('✅ Found', requests.length, 'pending/approved reward requests');
      return requests;
    } catch (error) {
      console.error('❌ Error getting pending requests:', error);
      return [];
    }
  },

  // Mark reward as fulfilled
  async fulfillReward(requestId: string, adminId: string): Promise<void> {
    if (!db) {
      console.log('📱 Mock mode: Fulfilling reward', requestId);
      return;
    }

    try {
      const requestRef = doc(db, 'rewardRequests', requestId);
      
      await updateDoc(requestRef, {
        status: 'fulfilled',
        processedBy: adminId,
        processedAt: new Date(),
      });

      console.log('✅ Reward marked as fulfilled');
    } catch (error) {
      console.error('❌ Error fulfilling reward:', error);
      throw error;
    }
  },

  // Update an existing reward
  async updateReward(rewardId: string, updates: Partial<Reward>): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🎁 Updating reward:', rewardId, 'with updates:', updates);
      
      if (!db) {
        console.log('📱 Mock mode: Updating reward');
        return { success: true };
      }

      const rewardRef = doc(db, 'rewards', rewardId);
      const rewardDoc = await getDoc(rewardRef);
      
      if (!rewardDoc.exists()) {
        return { success: false, error: 'Reward not found' };
      }

      // Handle field deletion and updates
      const filteredUpdates: any = { updatedAt: new Date() };
      
      Object.keys(updates).forEach(key => {
        const value = (updates as any)[key];
        if (value === undefined) {
          // Explicitly delete the field from Firestore
          filteredUpdates[key] = deleteField();
          console.log(`🗑️ Deleting field: ${key}`);
        } else if (value !== null) {
          // Update the field with the new value
          filteredUpdates[key] = value;
        }
      });

      await updateDoc(rewardRef, filteredUpdates);

      console.log('✅ Reward updated successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating reward:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Delete a reward (soft delete by setting isActive to false)
  async deleteReward(rewardId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🎁 Deleting reward:', rewardId);
      
      if (!db) {
        console.log('📱 Mock mode: Deleting reward');
        return { success: true };
      }

      const rewardRef = doc(db, 'rewards', rewardId);
      const rewardDoc = await getDoc(rewardRef);
      
      if (!rewardDoc.exists()) {
        return { success: false, error: 'Reward not found' };
      }

      // Soft delete by setting isActive to false
      await updateDoc(rewardRef, {
        isActive: false,
        updatedAt: new Date(),
      });

      console.log('✅ Reward deleted successfully (soft delete)');
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting reward:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Permanently delete a reward (hard delete)
  async permanentlyDeleteReward(rewardId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🎁 Permanently deleting reward:', rewardId);
      
      if (!db) {
        console.log('📱 Mock mode: Permanently deleting reward');
        return { success: true };
      }

      const rewardRef = doc(db, 'rewards', rewardId);
      const rewardDoc = await getDoc(rewardRef);
      
      if (!rewardDoc.exists()) {
        return { success: false, error: 'Reward not found' };
      }

      // Check if there are any pending requests for this reward
      const pendingRequestsQuery = query(
        collection(db, 'rewardRequests'),
        where('rewardId', '==', rewardId),
        where('status', 'in', ['pending', 'approved'])
      );
      
      const pendingSnapshot = await getDocs(pendingRequestsQuery);
      
      if (!pendingSnapshot.empty) {
        return { 
          success: false, 
          error: 'Cannot delete reward with pending requests. Please process all requests first.' 
        };
      }

      // Permanently delete the reward
      await deleteDoc(rewardRef);

      console.log('✅ Reward permanently deleted');
      return { success: true };
    } catch (error) {
      console.error('❌ Error permanently deleting reward:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
};

// ============================================================================
// ACTIVITY TRACKING SERVICE
// ============================================================================

export const activityService = {
  // Create a new activity item
  async createActivity(activityData: Omit<ActivityItem, 'id' | 'timestamp'>): Promise<void> {
    try {
      if (!db) {
        console.log('📱 Mock mode: Creating activity');
        return;
      }

      const activity: Omit<ActivityItem, 'id'> = {
        ...activityData,
        timestamp: new Date(),
      };

      await addDoc(collection(db, 'activities'), activity);
      console.log('✅ Activity created:', activity.type);
    } catch (error) {
      console.error('❌ Error creating activity:', error);
    }
  },

  // Get recent activities for a household
  async getRecentActivities(householdId: string, limitCount: number = 10): Promise<ActivityItem[]> {
    try {
      if (!db) {
        console.log('📱 Mock mode: Getting recent activities');
        return this.getMockActivities();
      }

      const activitiesQuery = query(
        collection(db, 'activities'),
        where('householdId', '==', householdId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(activitiesQuery);
      const activities: ActivityItem[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
        } as ActivityItem);
      });

      console.log('✅ Loaded', activities.length, 'recent activities');
      return activities;
    } catch (error) {
      console.error('❌ Error getting recent activities:', error);
      return [];
    }
  },

  // Generate activity message based on type and data
  generateActivityMessage(type: ActivityItem['type'], data: ActivityItem['data'], userDisplayName: string): string {
    switch (type) {
      case 'chore_completed':
        return `${userDisplayName} completed "${data.choreTitle}"`;
      case 'reward_requested':
        return `${userDisplayName} requested "${data.rewardTitle}"`;
      case 'reward_approved':
        return `${userDisplayName}'s reward "${data.rewardTitle}" was approved`;
      case 'reward_denied':
        return `${userDisplayName}'s reward "${data.rewardTitle}" was denied`;
      case 'coins_earned':
        return `${userDisplayName} earned ${data.coinAmount} coins`;
      case 'coins_deducted':
        return `${data.coinAmount} coins deducted from ${userDisplayName}`;
      case 'chore_missed':
        return `${userDisplayName} missed chore "${data.choreTitle}"`;
      case 'member_joined':
        return `${userDisplayName} joined the household`;
      case 'chore_created':
        return `${userDisplayName} created chore "${data.choreTitle}"`;
      default:
        return `${userDisplayName} performed an action`;
    }
  },

  // Get activity icon and color based on type
  getActivityStyle(type: ActivityItem['type']): { icon: string; color: string } {
    switch (type) {
      case 'chore_completed':
        return { icon: 'check-circle', color: '#10B981' };
      case 'reward_requested':
        return { icon: 'gift', color: '#6366F1' };
      case 'reward_approved':
        return { icon: 'thumbs-up', color: '#10B981' };
      case 'reward_denied':
        return { icon: 'thumbs-down', color: '#EF4444' };
      case 'coins_earned':
        return { icon: 'coins', color: '#F59E0B' };
      case 'coins_deducted':
        return { icon: 'minus-circle', color: '#EF4444' };
      case 'chore_missed':
        return { icon: 'exclamation-triangle', color: '#F59E0B' };
      case 'member_joined':
        return { icon: 'user-plus', color: '#8B5CF6' };
      case 'chore_created':
        return { icon: 'plus-circle', color: '#6366F1' };
      default:
        return { icon: 'info-circle', color: '#6B7280' };
    }
  },

  // Mock activities for development
  getMockActivities(): ActivityItem[] {
    return [
      {
        id: '1',
        type: 'chore_completed',
        userId: 'user1',
        userDisplayName: 'Alice',
        householdId: 'household1',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        data: { choreTitle: 'Clean Kitchen', coinAmount: 15 },
        icon: 'check-circle',
        color: '#10B981',
        message: 'Alice completed "Clean Kitchen"',
      },
      {
        id: '2',
        type: 'reward_requested',
        userId: 'user2',
        userDisplayName: 'Bob',
        householdId: 'household1',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        data: { rewardTitle: 'Movie Night', coinAmount: 50 },
        icon: 'gift',
        color: '#6366F1',
        message: 'Bob requested "Movie Night"',
      },
      {
        id: '3',
        type: 'coins_earned',
        userId: 'user1',
        userDisplayName: 'Alice',
        householdId: 'household1',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
        data: { coinAmount: 25, choreTitle: 'Vacuum Living Room' },
        icon: 'coins',
        color: '#F59E0B',
        message: 'Alice earned 25 coins',
      },
    ];
  },

  // Helper function to create activity when chore is completed
  async logChoreCompletion(choreId: string, choreTitle: string, userId: string, userDisplayName: string, householdId: string, coinAmount: number): Promise<void> {
    const style = this.getActivityStyle('chore_completed');
    await this.createActivity({
      type: 'chore_completed',
      userId,
      userDisplayName,
      householdId,
      data: { choreId, choreTitle, coinAmount },
      icon: style.icon,
      color: style.color,
      message: this.generateActivityMessage('chore_completed', { choreTitle }, userDisplayName),
    });
  },

  // Helper function to create activity when reward is requested
  async logRewardRequest(rewardId: string, rewardTitle: string, userId: string, userDisplayName: string, householdId: string, coinAmount: number): Promise<void> {
    const style = this.getActivityStyle('reward_requested');
    await this.createActivity({
      type: 'reward_requested',
      userId,
      userDisplayName,
      householdId,
      data: { rewardId, rewardTitle, coinAmount },
      icon: style.icon,
      color: style.color,
      message: this.generateActivityMessage('reward_requested', { rewardTitle }, userDisplayName),
    });
  },

  // Helper function to create activity when coins are deducted
  async logCoinDeduction(userId: string, userDisplayName: string, householdId: string, coinAmount: number, reason: string): Promise<void> {
    const style = this.getActivityStyle('coins_deducted');
    await this.createActivity({
      type: 'coins_deducted',
      userId,
      userDisplayName,
      householdId,
      data: { coinAmount, reason },
      icon: style.icon,
      color: style.color,
      message: this.generateActivityMessage('coins_deducted', { coinAmount }, userDisplayName),
    });
  },
};

// ============================================================================
// MISSED CHORES SERVICE
// ============================================================================

export const missedChoresService = {
  // Get missed chores from the last 7 days for admin view
  async getMissedChoresLast7Days(householdId: string): Promise<MissedChore[]> {
    try {
      if (!db) {
        console.log('📱 Mock mode: Getting missed chores');
        return this.getMockMissedChores();
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Get all assigned chores that were due in the last 7 days
      const allChores = await choreService.getHouseholdChores(householdId, 'active');
      const missedChores: MissedChore[] = [];
      
      for (const chore of allChores) {
        // Only check assigned chores
        if (chore.anyoneCanDo || chore.assignedTo.length === 0) {
          continue;
        }

        // Check if chore had a due date in the last 7 days
        if (chore.nextDueDate) {
          const dueDate = timestampToDate(chore.nextDueDate);
          
          // If due date was in the last 7 days and chore wasn't completed
          if (dueDate >= sevenDaysAgo && dueDate < new Date()) {
            // Check if chore was completed after the due date
            const wasCompleted = await this.wasChoreCompletedAfterDueDate(chore.id, dueDate);
            
            if (!wasCompleted) {
              // Get assigned users
              const assignedUsers = await Promise.all(
                chore.assignedTo.map(userId => userService.getUser(userId))
              );
              
              const validUsers = assignedUsers.filter(user => user !== null) as FirestoreUser[];
              
              const daysMissed = Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
              
              // Get household settings for coin deduction
              const household = await householdService.getHousehold(householdId);
              const coinDeduction = household?.settings.coinDeduction.enabled 
                ? household.settings.coinDeduction.missedChoreDeduction 
                : 0;

              missedChores.push({
                id: `${chore.id}-${dueDate.getTime()}`,
                chore,
                assignedUsers: validUsers,
                dueDate,
                daysMissed,
                coinDeduction,
              });
            }
          }
        }
      }

      console.log('✅ Found', missedChores.length, 'missed chores in last 7 days');
      return missedChores.sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
    } catch (error) {
      console.error('❌ Error getting missed chores:', error);
      return [];
    }
  },

  // Check if a chore was completed after its due date
  async wasChoreCompletedAfterDueDate(choreId: string, dueDate: Date): Promise<boolean> {
    try {
      if (!db) return false;

      const completionsQuery = query(
        collection(db, 'choreCompletions'),
        where('choreId', '==', choreId),
        where('completedAt', '>', dueDate),
        where('status', '==', 'approved'),
        limit(1)
      );

      const snapshot = await getDocs(completionsQuery);
      return !snapshot.empty;
    } catch (error) {
      console.error('❌ Error checking chore completion:', error);
      return false;
    }
  },

  // Mock missed chores for development
  getMockMissedChores(): MissedChore[] {
    const mockChore: Chore = {
      id: 'chore1',
      householdId: 'household1',
      title: 'Take Out Trash',
      description: 'Take trash bins to the curb',
      createdBy: 'admin',
      createdAt: new Date() as any,
      updatedAt: new Date() as any,
      coinReward: 10,
      assignedTo: ['user1'],
      anyoneCanDo: false,
      requiresPhoto: false,
      beforePhotoRequired: false,
      afterPhotoRequired: false,
      frequency: 'weekly',
      status: 'active',
      isRecurring: true,
      completionCount: 0,
      nextDueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) as any, // 2 days ago
      autoDeleteAfterDays: 30,
    };

    const mockUser: FirestoreUser = {
      id: 'user1',
      email: 'alice@example.com',
      displayName: 'Alice',
      avatar: '👩',
      role: 'member',
      coins: 50,
      totalCoinsEarned: 100,
      totalCashRewards: 5.0,
      isPremium: false, // Add missing isPremium field
      joinedAt: new Date() as any,
      lastActive: new Date() as any,
      preferences: {
        darkMode: false,
        notifications: {
          pushEnabled: true,
          choreReminders: true,
          rewardAlerts: true,
          familyUpdates: true,
          soundEnabled: true,
          vibrationEnabled: true,
        },
        currency: { code: 'GBP', symbol: '£' },
        contentFilter: {
          showAdultContent: false, // Default to false, will be set based on age
          parentalControlsEnabled: false,
        },
        privacy: {
          profileVisibility: 'private',
          updatedAt: new Date(),
        },
      },
      stats: {
        choresCompleted: 15,
        rewardsClaimed: 3,
        currentStreak: 2,
        longestStreak: 5,
      },
    };

    return [
      {
        id: 'missed1',
        chore: mockChore,
        assignedUsers: [mockUser],
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        daysMissed: 2,
        coinDeduction: 5,
      },
    ];
  },
};

export default {
  userService,
  householdService,
  choreService,
  firestoreUtils,
  rewardService,
  choreSchedulingService,
  activityService,
  missedChoresService,
}; 