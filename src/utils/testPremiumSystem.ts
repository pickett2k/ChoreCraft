/**
 * PREMIUM SYSTEM TEST UTILITY
 * Can be imported and run within the React Native app to test premium functionality
 */

import { premiumService, subscriptionUtils } from '../services/premiumService';
import { FirestoreUser } from '../services/firestoreService';

// Mock user data for testing
const mockFreeUser: FirestoreUser = {
  id: 'user-test-free',
  email: 'free@test.com',
  displayName: 'Free User',
  avatar: '👤',
  role: 'member',
  householdId: 'household-test',
  coins: 50,
  totalCoinsEarned: 50,
  totalCashRewards: 0,
  joinedAt: { toDate: () => new Date() } as any,
  lastActive: { toDate: () => new Date() } as any,
  isPremium: false,
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
      showAdultContent: false,
      parentalControlsEnabled: true,
    },
    privacy: {
      profileVisibility: 'household',
      updatedAt: new Date(),
    },
  },
  stats: {
    choresCompleted: 5,
    rewardsClaimed: 2,
    currentStreak: 3,
    longestStreak: 7,
  },
};

const mockPremiumUser: FirestoreUser = {
  ...mockFreeUser,
  id: 'user-test-premium',
  email: 'premium@test.com',
  displayName: 'Premium User',
  role: 'admin',
  coins: 100,
  isPremium: true,
  subscription: {
    status: 'active',
    planId: 'premium_yearly',
    startDate: { toDate: () => new Date() } as any,
    endDate: { toDate: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) } as any,
    platform: 'stripe',
    transactionId: 'test_123',
    priceAmount: 20.00,
    priceCurrency: 'GBP',
    autoRenew: true,
  },
};

interface TestResult {
  testName: string;
  passed: boolean;
  details?: string;
  error?: string;
}

export class PremiumSystemTester {
  private results: TestResult[] = [];

  private addResult(testName: string, passed: boolean, details?: string, error?: string) {
    this.results.push({ testName, passed, details, error });
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}${details ? ` - ${details}` : ''}`);
    if (error) {
      console.error(`   Error: ${error}`);
    }
  }

  // Test 1: Subscription Plans
  testSubscriptionPlans(): boolean {
    console.log('\n📋 Testing Subscription Plans...');
    
    try {
      const plans = premiumService.getSubscriptionPlans();
      this.addResult('Has subscription plans', plans.length > 0, `Found ${plans.length} plans`);
      
      const freePlan = plans.find(p => p.id === 'free');
      const premiumPlan = plans.find(p => p.id === 'premium_yearly');
      
      this.addResult('Free plan exists', !!freePlan, freePlan ? `£${freePlan.price}/${freePlan.duration}` : 'Not found');
      this.addResult('Premium plan exists', !!premiumPlan, premiumPlan ? `£${premiumPlan.price}/${premiumPlan.duration}` : 'Not found');
      
      if (freePlan) {
        this.addResult('Free plan has limitations', !freePlan.limitations.canCreateCustomChores, 'Cannot create custom chores');
      }
      
      if (premiumPlan) {
        this.addResult('Premium plan has features', premiumPlan.limitations.canCreateCustomChores, 'Can create custom chores');
      }
      
      return plans.length > 0 && !!freePlan && !!premiumPlan;
    } catch (error: any) {
      this.addResult('Subscription plans test', false, undefined, error.message);
      return false;
    }
  }

  // Test 2: User Limitations
  testUserLimitations(): boolean {
    console.log('\n🔒 Testing User Limitations...');
    
    try {
      const freeLimitations = premiumService.getUserLimitations(mockFreeUser);
      const premiumLimitations = premiumService.getUserLimitations(mockPremiumUser);
      
      this.addResult('Free user has limitations', !freeLimitations.canCreateCustomChores, 'Cannot create custom chores');
      this.addResult('Premium user has no limitations', premiumLimitations.canCreateCustomChores, 'Can create custom chores');
      
      // Test specific actions
      const freeCanCreateChores = premiumService.canUserPerformAction(mockFreeUser, 'canCreateCustomChores');
      const premiumCanCreateChores = premiumService.canUserPerformAction(mockPremiumUser, 'canCreateCustomChores');
      
      this.addResult('Free user blocked from custom chores', !freeCanCreateChores);
      this.addResult('Premium user allowed custom chores', premiumCanCreateChores);
      
      return !freeCanCreateChores && premiumCanCreateChores;
    } catch (error: any) {
      this.addResult('User limitations test', false, undefined, error.message);
      return false;
    }
  }

  // Test 3: Premium Checks
  testPremiumChecks(): boolean {
    console.log('\n🛡️ Testing Premium Checks...');
    
    try {
      const freeChoreCheck = premiumService.premiumChecks.customChores(mockFreeUser);
      const premiumChoreCheck = premiumService.premiumChecks.customChores(mockPremiumUser);
      
      this.addResult('Free user blocked with message', !freeChoreCheck.allowed && !!freeChoreCheck.message, 
        freeChoreCheck.message ? 'Has upgrade message' : 'No message');
      this.addResult('Premium user allowed', premiumChoreCheck.allowed && !premiumChoreCheck.message);
      
      // Test household member limits
      const freeHouseholdCheck = premiumService.premiumChecks.householdMembers(mockFreeUser, 2);
      const premiumHouseholdCheck = premiumService.premiumChecks.householdMembers(mockPremiumUser, 10);
      
      this.addResult('Free user limited household members', !freeHouseholdCheck.allowed);
      this.addResult('Premium user unlimited household members', premiumHouseholdCheck.allowed);
      
      return !freeChoreCheck.allowed && premiumChoreCheck.allowed;
    } catch (error: any) {
      this.addResult('Premium checks test', false, undefined, error.message);
      return false;
    }
  }

  // Test 4: Pre-selected Content
  testPreselectedContent(): boolean {
    console.log('\n📝 Testing Pre-selected Content...');
    
    try {
      const preselectedChores = premiumService.getPreSelectedChores();
      const preselectedRewards = premiumService.getPreSelectedRewards();
      
      this.addResult('Has pre-selected chores', preselectedChores.length > 0, `${preselectedChores.length} chores available`);
      this.addResult('Has pre-selected rewards', preselectedRewards.length > 0, `${preselectedRewards.length} rewards available`);
      
      // Check chore structure
      const firstChore = preselectedChores[0];
      const hasRequiredFields = !!(firstChore?.title && firstChore?.description && firstChore?.coinReward);
      this.addResult('Chores have required fields', hasRequiredFields, 
        `Sample: "${firstChore?.title}" - ${firstChore?.coinReward} coins`);
      
      // Check reward structure
      const firstReward = preselectedRewards[0];
      const rewardHasRequiredFields = !!(firstReward?.title && firstReward?.description && firstReward?.coinCost);
      this.addResult('Rewards have required fields', rewardHasRequiredFields,
        `Sample: "${firstReward?.title}" - ${firstReward?.coinCost} coins`);
      
      return preselectedChores.length > 0 && preselectedRewards.length > 0 && hasRequiredFields && rewardHasRequiredFields;
    } catch (error: any) {
      this.addResult('Pre-selected content test', false, undefined, error.message);
      return false;
    }
  }

  // Test 5: Subscription Utilities
  testSubscriptionUtils(): boolean {
    console.log('\n⚙️ Testing Subscription Utilities...');
    
    try {
      const subscriptionData = subscriptionUtils.createSubscriptionData(
        'premium_yearly',
        'stripe',
        {
          transactionId: 'test_transaction_123',
          priceAmount: 20.00,
          priceCurrency: 'GBP'
        }
      );
      
      this.addResult('Creates subscription data', !!subscriptionData, 'Subscription object created');
      
      if (subscriptionData) {
        this.addResult('Has correct plan ID', subscriptionData.planId === 'premium_yearly');
        this.addResult('Has active status', subscriptionData.status === 'active');
        this.addResult('Has transaction ID', subscriptionData.transactionId === 'test_transaction_123');
        this.addResult('Has correct price', subscriptionData.priceAmount === 20.00);
        
        // Test subscription validation
        const isActive = subscriptionUtils.isSubscriptionActive(subscriptionData);
        this.addResult('Subscription is active', isActive);
        
        const daysRemaining = subscriptionUtils.getDaysRemaining(subscriptionData);
        this.addResult('Has days remaining', daysRemaining > 300, `${daysRemaining} days remaining`);
        
        return !!subscriptionData && isActive && daysRemaining > 300;
      } else {
        this.addResult('Subscription data creation failed', false, 'No subscription data returned');
        return false;
      }
    } catch (error: any) {
      this.addResult('Subscription utilities test', false, undefined, error.message);
      return false;
    }
  }

  // Test 6: Category Integration
  testCategoryIntegration(): boolean {
    console.log('\n📂 Testing Category Integration...');
    
    try {
      const preselectedChores = premiumService.getPreSelectedChores();
      
      // Check if chores have category data
      const choresWithRoomCategory = preselectedChores.filter(c => c.roomCategory);
      const choresWithTaskCategory = preselectedChores.filter(c => c.taskCategory);
      const choresWithBonusEligibility = preselectedChores.filter(c => c.categoryBonusEligible);
      
      this.addResult('Chores have room categories', choresWithRoomCategory.length > 0, 
        `${choresWithRoomCategory.length}/${preselectedChores.length} chores categorized`);
      this.addResult('Chores have task categories', choresWithTaskCategory.length > 0,
        `${choresWithTaskCategory.length}/${preselectedChores.length} chores categorized`);
      this.addResult('Chores eligible for bonus', choresWithBonusEligibility.length > 0,
        `${choresWithBonusEligibility.length}/${preselectedChores.length} chores eligible`);
      
      return choresWithRoomCategory.length > 0 && choresWithTaskCategory.length > 0 && choresWithBonusEligibility.length > 0;
    } catch (error: any) {
      this.addResult('Category integration test', false, undefined, error.message);
      return false;
    }
  }

  // Test 7: Premium Upgrade Function
  testPremiumUpgrade(): boolean {
    console.log('\n🚀 Testing Premium Upgrade...');
    
    try {
      const upgradeFunction = premiumService.upgradeToPremium;
      this.addResult('Upgrade function exists', typeof upgradeFunction === 'function');
      
      // Test upgrade message generation
      const upgradeMessage = premiumService.getPremiumUpgradeMessage('Creating custom chores');
      this.addResult('Generates upgrade message', upgradeMessage.includes('Premium'), 
        'Message contains premium information');
      
      console.log('   Note: Actual upgrade test requires database connection');
      
      return typeof upgradeFunction === 'function' && upgradeMessage.includes('Premium');
    } catch (error: any) {
      this.addResult('Premium upgrade test', false, undefined, error.message);
      return false;
    }
  }

  // Run all tests
  async runAllTests(): Promise<{ passed: number; failed: number; total: number; results: TestResult[] }> {
    console.log('🧪 PREMIUM SYSTEM TEST SUITE');
    console.log('================================');
    
    const tests = [
      () => this.testSubscriptionPlans(),
      () => this.testUserLimitations(),
      () => this.testPremiumChecks(),
      () => this.testPreselectedContent(),
      () => this.testSubscriptionUtils(),
      () => this.testCategoryIntegration(),
      () => this.testPremiumUpgrade(),
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
      try {
        const result = test();
        if (result) passed++;
        else failed++;
      } catch (error) {
        failed++;
        console.error('Test failed:', error);
      }
    }
    
    const total = passed + failed;
    
    console.log('\n🎉 Test Results:');
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    
    if (failed === 0) {
      console.log('🎊 All premium system tests passed!');
      console.log('\nTo test the full premium upgrade flow in the app:');
      console.log('1. Sign in as a free user');
      console.log('2. Try to create a custom chore');
      console.log('3. Click "Upgrade to Premium"');
      console.log('4. Complete the upgrade flow');
      console.log('5. Verify you can now create custom chores');
    } else {
      console.log('⚠️ Some tests failed. Check the logs above.');
    }
    
    return { passed, failed, total, results: this.results };
  }

  // Get detailed results
  getResults(): TestResult[] {
    return this.results;
  }

  // Clear results
  clearResults(): void {
    this.results = [];
  }
}

// Export singleton instance
export const premiumTester = new PremiumSystemTester();

// Quick test function for console
export const testPremiumSystem = () => premiumTester.runAllTests(); 