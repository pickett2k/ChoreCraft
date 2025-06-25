import { FirestoreUser, Chore, Reward } from './firestoreService';
import { Timestamp } from 'firebase/firestore';

// ============================================================================
// PREMIUM SERVICE - HANDLES PREMIUM FEATURES AND LIMITATIONS
// ============================================================================

export interface PremiumLimitations {
  maxHouseholdMembers: number;
  canCreateCustomChores: boolean;
  canCreateCustomRewards: boolean;
  canUseAdvancedScheduling: boolean;
  canUsePhotoProof: boolean;
  canUseCoinDeduction: boolean;
  canExportData: boolean;
  canUseMultipleHouseholds: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration: 'monthly' | 'yearly';
  features: string[];
  limitations: PremiumLimitations;
}

export const premiumService = {
  // Define subscription plans
  getSubscriptionPlans(): SubscriptionPlan[] {
    return [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'GBP',
        duration: 'monthly',
        features: [
          'Up to 1 household member',
          'Pre-selected chores and rewards',
          'Basic task management',
          'Coin system',
          'Basic notifications'
        ],
        limitations: {
          maxHouseholdMembers: 1,
          canCreateCustomChores: false,
          canCreateCustomRewards: false,
          canUseAdvancedScheduling: false,
          canUsePhotoProof: false,
          canUseCoinDeduction: false,
          canExportData: false,
          canUseMultipleHouseholds: false,
        }
      },
      {
        id: 'premium_yearly',
        name: 'Premium (Yearly)',
        price: 20.00,
        currency: 'GBP',
        duration: 'yearly',
        features: [
          'Unlimited household members',
          'Custom chores and rewards',
          'Advanced scheduling options',
          'Photo proof requirements',
          'Coin deduction for missed chores',
          'Data export capabilities',
          'Multiple household support',
          'Priority customer support',
          'Advanced analytics'
        ],
        limitations: {
          maxHouseholdMembers: -1, // Unlimited
          canCreateCustomChores: true,
          canCreateCustomRewards: true,
          canUseAdvancedScheduling: true,
          canUsePhotoProof: true,
          canUseCoinDeduction: true,
          canExportData: true,
          canUseMultipleHouseholds: true,
        }
      }
    ];
  },

  // Get user's current limitations based on premium status
  getUserLimitations(user: FirestoreUser): PremiumLimitations {
    const plans = this.getSubscriptionPlans();
    
    if (user.isPremium && user.subscription?.status === 'active') {
      return plans.find(p => p.id === 'premium_yearly')?.limitations || plans[0].limitations;
    }
    
    return plans[0].limitations; // Free plan limitations
  },

  // Check if user can perform a specific action
  canUserPerformAction(user: FirestoreUser, action: keyof PremiumLimitations): boolean {
    const limitations = this.getUserLimitations(user);
    return limitations[action] as boolean;
  },

  // Check if user can add more household members
  canAddHouseholdMember(user: FirestoreUser, currentMemberCount: number): boolean {
    const limitations = this.getUserLimitations(user);
    
    if (limitations.maxHouseholdMembers === -1) return true; // Unlimited
    return currentMemberCount < limitations.maxHouseholdMembers;
  },

  // Get premium upgrade message for blocked actions
  getPremiumUpgradeMessage(action: string): string {
    return `🌟 This feature requires Premium!\n\n${action} is available with our Premium plan for just £20/year.\n\nUpgrade to unlock:\n• Unlimited household members\n• Custom chores & rewards\n• Advanced scheduling\n• Photo proof features\n• And much more!`;
  },

  // Pre-selected chores for free users
  getPreSelectedChores(): Partial<Chore>[] {
    return [
      {
        title: 'Make Your Bed',
        description: 'Tidy up your bedroom by making your bed',
        coinReward: 5,
        frequency: 'daily',
        anyoneCanDo: true,
        requiresPhoto: false,
        beforePhotoRequired: false,
        afterPhotoRequired: false,
        status: 'active',
        isRecurring: true,
        autoDeleteAfterDays: 30,
        roomCategory: 'bedroom',
        taskCategory: 'organizing',
        categoryBonusEligible: true,
      },
      {
        title: 'Take Out Trash',
        description: 'Empty bins and take trash to collection point',
        coinReward: 10,
        frequency: 'weekly',
        anyoneCanDo: true,
        requiresPhoto: false,
        beforePhotoRequired: false,
        afterPhotoRequired: false,
        status: 'active',
        isRecurring: true,
        autoDeleteAfterDays: 30,
        roomCategory: 'outdoor',
        taskCategory: 'maintenance',
        categoryBonusEligible: true,
      },
      {
        title: 'Load Dishwasher',
        description: 'Load dirty dishes into the dishwasher',
        coinReward: 8,
        frequency: 'daily',
        anyoneCanDo: true,
        requiresPhoto: false,
        beforePhotoRequired: false,
        afterPhotoRequired: false,
        status: 'active',
        isRecurring: true,
        autoDeleteAfterDays: 30,
        roomCategory: 'kitchen',
        taskCategory: 'cleaning',
        categoryBonusEligible: true,
      },
      {
        title: 'Vacuum Living Room',
        description: 'Vacuum the main living area',
        coinReward: 15,
        frequency: 'weekly',
        anyoneCanDo: true,
        requiresPhoto: false,
        beforePhotoRequired: false,
        afterPhotoRequired: false,
        status: 'active',
        isRecurring: true,
        autoDeleteAfterDays: 30,
        roomCategory: 'living_room',
        taskCategory: 'cleaning',
        categoryBonusEligible: true,
      },
      {
        title: 'Feed Pets',
        description: 'Give food and water to household pets',
        coinReward: 5,
        frequency: 'daily',
        anyoneCanDo: true,
        requiresPhoto: false,
        beforePhotoRequired: false,
        afterPhotoRequired: false,
        status: 'active',
        isRecurring: true,
        autoDeleteAfterDays: 30,
        taskCategory: 'pet_care',
        categoryBonusEligible: true,
      },
      {
        title: 'Tidy Toy Room',
        description: 'Put toys away and organize play area',
        coinReward: 10,
        frequency: 'daily',
        anyoneCanDo: true,
        requiresPhoto: false,
        beforePhotoRequired: false,
        afterPhotoRequired: false,
        status: 'active',
        isRecurring: true,
        autoDeleteAfterDays: 30,
        roomCategory: 'living_room',
        taskCategory: 'organizing',
        categoryBonusEligible: true,
      },
      {
        title: 'Wipe Kitchen Counters',
        description: 'Clean and sanitize kitchen countertops',
        coinReward: 5,
        frequency: 'daily',
        anyoneCanDo: true,
        requiresPhoto: false,
        beforePhotoRequired: false,
        afterPhotoRequired: false,
        status: 'active',
        isRecurring: true,
        autoDeleteAfterDays: 30,
        roomCategory: 'kitchen',
        taskCategory: 'cleaning',
        categoryBonusEligible: true,
      },
      {
        title: 'Tidy Bedroom',
        description: 'Put clothes away and organize bedroom space',
        coinReward: 10,
        frequency: 'daily',
        anyoneCanDo: true,
        requiresPhoto: false,
        beforePhotoRequired: false,
        afterPhotoRequired: false,
        status: 'active',
        isRecurring: true,
        autoDeleteAfterDays: 30,
        roomCategory: 'bedroom',
        taskCategory: 'organizing',
        categoryBonusEligible: true,
      },
      {
        title: 'Walk the Dog',
        description: 'Take the dog for a 20-minute walk',
        coinReward: 15,
        frequency: 'daily',
        anyoneCanDo: true,
        requiresPhoto: false,
        beforePhotoRequired: false,
        afterPhotoRequired: false,
        status: 'active',
        isRecurring: true,
        autoDeleteAfterDays: 30,
        roomCategory: 'outdoor',
        taskCategory: 'pet_care',
        categoryBonusEligible: true,
      }
    ];
  },

  // Pre-selected rewards for free users
  getPreSelectedRewards(): Partial<Reward>[] {
    return [
      {
        title: '30 Minutes Extra Screen Time',
        description: 'Enjoy an extra 30 minutes of screen time',
        coinCost: 20,
        category: 'privileges',
        requiresApproval: false,
        isActive: true,
      },
      {
        title: 'Choose Tonight\'s Dinner',
        description: 'Pick what the family has for dinner',
        coinCost: 25,
        category: 'privileges',
        requiresApproval: true,
        isActive: true,
      },
      {
        title: 'Small Treat from Shop',
        description: 'Choose a small treat on next shopping trip',
        coinCost: 30,
        category: 'treats',
        requiresApproval: true,
        isActive: true,
      },
      {
        title: 'Stay Up 30 Minutes Later',
        description: 'Extended bedtime for one night',
        coinCost: 35,
        category: 'privileges',
        requiresApproval: true,
        isActive: true,
      },
      {
        title: '£2 Pocket Money',
        description: 'Earn real money for your efforts',
        coinCost: 40,
        category: 'money',
        requiresApproval: true,
        isActive: true,
        cashValue: 2.00,
      },
      {
        title: 'Have a Friend Over',
        description: 'Invite a friend for a playdate',
        coinCost: 50,
        category: 'experiences',
        requiresApproval: true,
        isActive: true,
      }
    ];
  },

  // Premium feature checks
  premiumChecks: {
    // Check if user can add more household members
    householdMembers(user: FirestoreUser, currentCount: number): { allowed: boolean; message?: string } {
      const canAdd = premiumService.canAddHouseholdMember(user, currentCount);
      
      if (!canAdd) {
        return {
          allowed: false,
          message: premiumService.getPremiumUpgradeMessage('Adding more household members')
        };
      }
      
      return { allowed: true };
    },

    // Check if user can create custom chores
    customChores(user: FirestoreUser): { allowed: boolean; message?: string } {
      const canCreate = premiumService.canUserPerformAction(user, 'canCreateCustomChores');
      
      if (!canCreate) {
        return {
          allowed: false,
          message: premiumService.getPremiumUpgradeMessage('Creating custom chores')
        };
      }
      
      return { allowed: true };
    },

    // Check if user can create custom rewards
    customRewards(user: FirestoreUser): { allowed: boolean; message?: string } {
      const canCreate = premiumService.canUserPerformAction(user, 'canCreateCustomRewards');
      
      if (!canCreate) {
        return {
          allowed: false,
          message: premiumService.getPremiumUpgradeMessage('Creating custom rewards')
        };
      }
      
      return { allowed: true };
    }
  },

  // Upgrade user to premium
  async upgradeToPremium(userId: string): Promise<void> {
    const { userService } = await import('./firestoreService');
    
    // Create premium subscription data
    const subscriptionData = subscriptionUtils.createSubscriptionData(
      'premium_yearly',
      'stripe', // Using stripe as the demo platform
      {
        transactionId: `demo_${Date.now()}`,
        priceAmount: 20.00,
        priceCurrency: 'GBP'
      }
    );

    // Update user to premium status
    await userService.updateUser(userId, {
      isPremium: true,
      subscription: subscriptionData
    });

    console.log('✅ User upgraded to premium:', userId);
  }
};

// Subscription utilities
export const subscriptionUtils = {
  // Create subscription data object
  createSubscriptionData(
    planId: string,
    platform: 'ios' | 'android' | 'stripe',
    transactionData: {
      transactionId: string;
      originalTransactionId?: string;
      purchaseToken?: string;
      priceAmount: number;
      priceCurrency: string;
    }
  ): FirestoreUser['subscription'] {
    const now = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // Add 1 year

    return {
      planId,
      status: 'active',
      startDate: Timestamp.fromDate(now),
      endDate: Timestamp.fromDate(endDate),
      platform,
      transactionId: transactionData.transactionId,
      originalTransactionId: transactionData.originalTransactionId,
      purchaseToken: transactionData.purchaseToken,
      autoRenew: true,
      priceAmount: transactionData.priceAmount,
      priceCurrency: transactionData.priceCurrency
    };
  },

  // Check if subscription is active
  isSubscriptionActive(subscription?: FirestoreUser['subscription']): boolean {
    if (!subscription) return false;
    
    const now = new Date();
    const endDate = subscription.endDate.toDate();
    
    return subscription.status === 'active' && endDate > now;
  },

  // Get days remaining in subscription
  getDaysRemaining(subscription?: FirestoreUser['subscription']): number {
    if (!subscription) return 0;
    
    const now = new Date();
    const endDate = subscription.endDate.toDate();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }
};

export default premiumService; 