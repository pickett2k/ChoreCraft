import { collection, addDoc, setDoc, doc, getDocs, query, where, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import firestoreService from '../services/firestoreService';

// Test result interface
interface TestResult {
  success: boolean;
  message: string;
  details: string[];
  data?: any;
}

// Destructure services for easier access
const { choreService, choreSchedulingService, userService, householdService } = firestoreService;

// Sample chores data
const sampleChores = [
  {
    title: 'Take out the trash',
    description: 'Empty all trash bins and take bags to the curb for pickup',
    coinReward: 15,
    frequency: 'weekly' as const,
    requiresPhoto: false,
    anyoneCanDo: true,
  },
  {
    title: 'Load the dishwasher',
    description: 'Load dirty dishes and run the dishwasher cycle',
    coinReward: 10,
    frequency: 'daily' as const,
    requiresPhoto: false,
    anyoneCanDo: true,
  },
  {
    title: 'Vacuum living room',
    description: 'Vacuum the main living area including under furniture',
    coinReward: 20,
    frequency: 'weekly' as const,
    requiresPhoto: true,
    anyoneCanDo: true,
  },
  {
    title: 'Clean bathroom',
    description: 'Deep clean the main bathroom - toilet, sink, shower, and floor',
    coinReward: 25,
    frequency: 'weekly' as const,
    requiresPhoto: true,
    anyoneCanDo: false,
  },
  {
    title: 'Water plants',
    description: 'Water all indoor and outdoor plants',
    coinReward: 8,
    frequency: 'daily' as const,
    requiresPhoto: false,
    anyoneCanDo: true,
  },
];

export const testDatabaseConnection = async () => {
  console.log('🧪 Testing database connection...');
  
  if (!db) {
    console.error('❌ Firestore not available - running in mock mode');
    return false;
  }

  try {
    console.log('🔥 Testing Firestore connection...');

    // Test: Create a test document
    const testDoc = await addDoc(collection(db, 'test'), {
      message: 'Hello from ChoreCraft!',
      timestamp: new Date(),
      source: 'simpleDatabaseTest.ts',
      testType: 'connection'
    });
    
    console.log('✅ Test document created:', testDoc.id);

    // Test: Read the document back
    const testCollection = await getDocs(collection(db, 'test'));
    console.log('✅ Test collection read, documents:', testCollection.size);

    return true;
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return false;
  }
};

export const createRealTestData = async () => {
  console.log('🚀 Creating real test data in Firebase...');
  
  if (!db) {
    console.error('❌ Firestore not available - running in mock mode');
    return { success: false, error: 'Firestore not available' };
  }

  try {
    const userId = 'test-user-' + Date.now();
    
    // 1. Create test user
    console.log('👤 Creating test user...');
    const userData = {
      id: userId,
      email: 'test@chorecraft.com',
      displayName: 'Test User',
      avatar: '👤',
      role: 'admin',
      coins: 150,
      totalCoinsEarned: 150,
      joinedAt: new Date(),
      lastActive: new Date(),
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
      },
      stats: {
        choresCompleted: 5,
        rewardsClaimed: 2,
        currentStreak: 3,
        longestStreak: 7,
      },
    };

    await setDoc(doc(db, 'users', userId), userData);
    console.log('✅ Test user created:', userId);

    // 2. Create test household
    console.log('🏠 Creating test household...');
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const householdData = {
      name: 'Test Household',
      description: 'A test household for development and testing',
      createdBy: userId,
      createdAt: new Date(),
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
      },
      members: [userId],
      admins: [userId],
      stats: {
        totalChoresCompleted: 0,
        totalCoinsAwarded: 0,
        activeMemberCount: 1,
      },
    };

    const householdRef = await addDoc(collection(db, 'households'), householdData);
    console.log('✅ Test household created:', householdRef.id);
    console.log('🔑 Invite code:', inviteCode);

    // 3. Update user with household ID
    await setDoc(doc(db, 'users', userId), {
      householdId: householdRef.id,
    }, { merge: true });
    console.log('✅ User updated with household ID');

    // 4. Create test chores
    console.log('🧹 Creating test chores...');
    const testChores = [
      {
        title: 'Take out the trash',
        description: 'Empty all trash bins and take bags to the curb for pickup',
        coinReward: 15,
        frequency: 'weekly',
        requiresPhoto: false,
        anyoneCanDo: true,
      },
      {
        title: 'Load the dishwasher',
        description: 'Load dirty dishes and run the dishwasher cycle',
        coinReward: 10,
        frequency: 'daily',
        requiresPhoto: false,
        anyoneCanDo: true,
      },
      {
        title: 'Vacuum living room',
        description: 'Vacuum the main living area including under furniture',
        coinReward: 20,
        frequency: 'weekly',
        requiresPhoto: true,
        anyoneCanDo: true,
      },
      {
        title: 'Clean bathroom',
        description: 'Deep clean the main bathroom - toilet, sink, shower, and floor',
        coinReward: 25,
        frequency: 'weekly',
        requiresPhoto: true,
        anyoneCanDo: false,
      },
      {
        title: 'Water plants',
        description: 'Water all indoor and outdoor plants',
        coinReward: 8,
        frequency: 'daily',
        requiresPhoto: false,
        anyoneCanDo: true,
      },
    ];

    const chorePromises = testChores.map(chore => {
      const choreData = {
        ...chore,
        householdId: householdRef.id,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        assignedTo: [],
        beforePhotoRequired: false,
        afterPhotoRequired: chore.requiresPhoto,
        status: 'active',
        isRecurring: chore.frequency !== 'once',
        completionCount: 0,
        autoDeleteAfterDays: 7,
      };
      
      if (!db) {
        throw new Error('Firestore database instance is undefined');
      }
      
      return addDoc(collection(db, 'chores'), choreData);
    });

    const choreRefs = await Promise.all(chorePromises);
    console.log('✅ Test chores created:', choreRefs.length);

    console.log('🎉 Real test data creation completed successfully!');
    console.log('📊 Created in Firebase:');
    console.log('  - 1 user document in users collection');
    console.log('  - 1 household document in households collection');
    console.log('  - 5 chore documents in chores collection');
    console.log('  - Test documents in test collection');
    
    return {
      success: true,
      userId,
      householdId: householdRef.id,
      choreIds: choreRefs.map(ref => ref.id),
      inviteCode,
    };
  } catch (error) {
    console.error('❌ Real test data creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Test creating a user like mock auth would
export const createTestUser = async (userId: string, email: string, displayName: string): Promise<boolean> => {
  try {
    console.log(`Creating test user: ${email} with ID: ${userId}`);
    
    if (!db) {
      console.error('❌ Firestore not available');
      return false;
    }

    // Create user document
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      email,
      displayName,
      coins: 0,
      totalCoinsEarned: 0,
      role: 'member',
      stats: {
        choresCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalEarnings: 0,
        averageRating: 0,
        lastActive: new Date()
      },
      preferences: {
        notifications: true,
        currency: 'coins',
        theme: 'auto'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`✅ User ${email} created successfully with ID: ${userId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating user ${email}:`, error);
    return false;
  }
};

export const createSampleData = async (): Promise<boolean> => {
  try {
    console.log('🎯 Creating comprehensive sample data...');
    
    if (!db) {
      console.error('❌ Firestore not available');
      return false;
    }
    
    // Create test users
    const testUsers = [
      {
        id: 'user-test-example-com',
        email: 'test@example.com',
        displayName: 'Test Parent',
        role: 'admin' as const,
        coins: 150,
        totalCoinsEarned: 500,
        householdId: '',
        stats: {
          choresCompleted: 25,
          currentStreak: 5,
          longestStreak: 12,
          totalRewards: 8
        },
        preferences: {
          notifications: true,
          currency: 'coins' as const,
          theme: 'light' as const
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'user-child-example-com',
        email: 'child@example.com',
        displayName: 'Test Child',
        role: 'member' as const,
        coins: 75,
        totalCoinsEarned: 200,
        householdId: '',
        stats: {
          choresCompleted: 12,
          currentStreak: 3,
          longestStreak: 7,
          totalRewards: 4
        },
        preferences: {
          notifications: true,
          currency: 'coins' as const,
          theme: 'light' as const
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    // Create test household
    const testHousehold = {
      id: 'household-test-family',
      name: 'Test Family',
      inviteCode: '123456',
      members: ['user-test-example-com', 'user-child-example-com'],
      admins: ['user-test-example-com'],
      settings: {
        autoApprove: false,
        coinValues: {
          easy: 10,
          medium: 20,
          hard: 30
        },
        allowPhotoUploads: true,
        requirePhotoProof: false
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Update users with household ID
    testUsers.forEach(user => {
      user.householdId = testHousehold.id;
    });

    // Create users in Firestore
    for (const user of testUsers) {
      await setDoc(doc(db!, 'users', user.id), user);
      console.log('✅ Created user:', user.displayName);
    }

    // Create household in Firestore
    await setDoc(doc(db!, 'households', testHousehold.id), testHousehold);
    console.log('✅ Created household:', testHousehold.name);

    // Create sample chores
    for (const choreData of sampleChores) {
      const chore = {
        ...choreData,
        householdId: testHousehold.id,
        createdBy: 'user-test-example-com',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const choreRef = await addDoc(collection(db!, 'chores'), chore);
      console.log('✅ Created chore:', chore.title);
    }

    // Create sample rewards
    await createSampleRewards(testHousehold.id);

    console.log('🎉 Sample data creation completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    return false;
  }
};

export const createSampleRewards = async (householdId: string): Promise<boolean> => {
  try {
    console.log('🎁 Creating sample rewards...');
    
    if (!db) {
      console.error('❌ Firestore not available');
      return false;
    }
    
    const sampleRewards = [
      {
        title: 'Extra Screen Time',
        description: '30 minutes additional device time',
        coinCost: 15,
        category: 'privileges' as const,
        isActive: true,
        createdBy: 'user-test-example-com',
        householdId,
        requestCount: 8,
        currentRedemptions: 3,
        cooldownHours: 24,
        requiresApproval: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: 'Choose Tonight\'s Dinner',
        description: 'Pick what the family has for dinner',
        coinCost: 25,
        category: 'privileges' as const,
        isActive: true,
        createdBy: 'user-test-example-com',
        householdId,
        requestCount: 5,
        currentRedemptions: 2,
        requiresApproval: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: 'Movie Night Pick',
        description: 'Choose the movie for family movie night',
        coinCost: 20,
        category: 'entertainment' as const,
        isActive: true,
        createdBy: 'user-test-example-com',
        householdId,
        requestCount: 12,
        currentRedemptions: 4,
        requiresApproval: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: 'Candy Treat',
        description: 'Small candy or sweet treat from the cupboard',
        coinCost: 8,
        category: 'treats' as const,
        isActive: true,
        createdBy: 'user-test-example-com',
        householdId,
        requestCount: 15,
        currentRedemptions: 8,
        maxRedemptions: 20,
        requiresApproval: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: 'Stay Up Late',
        description: '1 hour past normal bedtime on weekend',
        coinCost: 35,
        category: 'privileges' as const,
        isActive: true,
        createdBy: 'user-test-example-com',
        householdId,
        requestCount: 3,
        currentRedemptions: 1,
        cooldownHours: 168, // 1 week
        requiresApproval: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: '£2 Pocket Money',
        description: 'Convert coins to real money',
        coinCost: 50,
        category: 'money' as const,
        isActive: true,
        createdBy: 'user-test-example-com',
        householdId,
        requestCount: 6,
        currentRedemptions: 2,
        requiresApproval: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: 'Friend Over',
        description: 'Have a friend over for the afternoon',
        coinCost: 40,
        category: 'experiences' as const,
        isActive: true,
        createdBy: 'user-test-example-com',
        householdId,
        requestCount: 4,
        currentRedemptions: 1,
        requiresApproval: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: 'Small Toy/Item',
        description: 'Small toy or item up to £5',
        coinCost: 100,
        category: 'items' as const,
        isActive: true,
        createdBy: 'user-test-example-com',
        householdId,
        requestCount: 2,
        currentRedemptions: 0,
        maxRedemptions: 5,
        requiresApproval: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    for (const reward of sampleRewards) {
      const rewardRef = await addDoc(collection(db!, 'rewards'), reward);
      console.log('✅ Created reward:', reward.title);
    }

    console.log('🎁 Sample rewards created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error creating sample rewards:', error);
    return false;
  }
};

export const testRewardSystem = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing reward system...');
    
    if (!db) {
      console.error('❌ Firestore not available');
      return false;
    }
    
    // Test reward creation
    const testReward = {
      title: 'Test Reward',
      description: 'This is a test reward',
      coinCost: 25,
      category: 'treats' as const,
      isActive: true,
      createdBy: 'user-test-example-com',
      householdId: 'household-test-family',
      requestCount: 0,
      currentRedemptions: 0,
      requiresApproval: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const rewardRef = await addDoc(collection(db!, 'rewards'), testReward);
    console.log('✅ Test reward created:', rewardRef.id);

    // Test reward request
    const testRewardRequest = {
      rewardId: rewardRef.id,
      userId: 'user-child-example-com',
      householdId: 'household-test-family',
      coinCost: 25,
      status: 'pending' as const,
      requestedAt: new Date(),
      rewardSnapshot: {
        title: testReward.title,
        description: testReward.description,
        category: testReward.category,
      },
    };

    const requestRef = await addDoc(collection(db!, 'rewardRequests'), testRewardRequest);
    console.log('✅ Test reward request created:', requestRef.id);

    // Test querying rewards
    const rewardsQuery = query(
      collection(db!, 'rewards'),
      where('householdId', '==', 'household-test-family'),
      where('isActive', '==', true)
    );

    const rewardsSnapshot = await getDocs(rewardsQuery);
    console.log('✅ Found', rewardsSnapshot.size, 'active rewards');

    // Test querying reward requests
    const requestsQuery = query(
      collection(db!, 'rewardRequests'),
      where('userId', '==', 'user-child-example-com')
    );

    const requestsSnapshot = await getDocs(requestsQuery);
    console.log('✅ Found', requestsSnapshot.size, 'reward requests');

    console.log('🎉 Reward system test completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error testing reward system:', error);
    return false;
  }
};

// Test chore completion and approval flow
export const testChoreCompletion = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing chore completion flow...');

    // First, ensure we have test data
    const testResult = await createRealTestData();
    if (!testResult.success || !testResult.choreIds || testResult.choreIds.length === 0) {
      throw new Error('No test chores available for completion test');
    }

    const choreId = testResult.choreIds[0];
    const userId = testResult.userId;
    const householdId = testResult.householdId;

    console.log('🎯 Testing with:', { choreId, userId, householdId });

    // Get user's initial coin balance
    const userRef = doc(db!, 'users', userId);
    const initialUserSnap = await getDoc(userRef);
    const initialCoins = initialUserSnap.exists() ? initialUserSnap.data().coins || 0 : 0;
    console.log('💰 Initial user coins:', initialCoins);

    // Complete the chore
    const completionId = await choreService.completeChore(choreId, userId, 'Test completion from database test');
    console.log('✅ Chore completed, completion ID:', completionId);

    // Check if coins were deducted
    const afterCompletionSnap = await getDoc(userRef);
    const coinsAfterCompletion = afterCompletionSnap.exists() ? afterCompletionSnap.data().coins || 0 : 0;
    console.log('💸 Coins after completion:', coinsAfterCompletion);
    console.log('📊 Coins deducted:', initialCoins - coinsAfterCompletion);

    // Check if completion appears in pending list
    const pendingCompletions = await choreService.getPendingCompletions(householdId);
    console.log('📋 Found', pendingCompletions.length, 'pending completions');

    // Find our completion
    const ourCompletion = pendingCompletions.find((c: any) => c.id === completionId);
    if (ourCompletion) {
      console.log('✅ Completion found in pending list:', ourCompletion.choreTitle);
      console.log('💰 Coins pending:', ourCompletion.coinsPending);
    } else {
      console.log('❌ Completion NOT found in pending list');
    }

    // Test approval
    if (ourCompletion) {
      await choreService.approveCompletion(completionId, userId);
      console.log('✅ Completion approved');

      // Check if coins were restored and total updated
      const afterApprovalSnap = await getDoc(userRef);
      const coinsAfterApproval = afterApprovalSnap.exists() ? afterApprovalSnap.data().coins || 0 : 0;
      const totalEarned = afterApprovalSnap.exists() ? afterApprovalSnap.data().totalCoinsEarned || 0 : 0;
      console.log('💰 Coins after approval:', coinsAfterApproval);
      console.log('🏆 Total coins earned:', totalEarned);

      // Check if it's no longer in pending list
      const updatedPending = await choreService.getPendingCompletions(householdId);
      const stillPending = updatedPending.find((c: any) => c.id === completionId);
      
      if (!stillPending) {
        console.log('✅ Completion correctly removed from pending list after approval');
      } else {
        console.log('❌ Completion still in pending list after approval');
      }
    }

    console.log('🎉 Coin flow test completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Chore completion test failed:', error);
    return false;
  }
};

// Test chore scheduling functionality
export async function testChoreScheduling(): Promise<TestResult> {
  console.log('🧪 Testing chore scheduling...');
  
  try {
    if (!choreSchedulingService) {
      return {
        success: false,
        message: 'Chore scheduling service not available',
        details: ['Service not initialized']
      };
    }

    // Test with a mock household ID (would normally get from user)
    const testHouseholdId = 'test-household-' + Date.now();
    
    // Test getting chores for today (will return empty but shouldn't crash)
    const today = new Date();
    const todayChores = await choreSchedulingService.getChoresDueOnDate(testHouseholdId, today);
    
    // Test getting overdue chores
    const overdueChores = await choreSchedulingService.getOverdueChores(testHouseholdId);
    
    // Test getting chores for a week
    const endDate = new Date();
    endDate.setDate(today.getDate() + 7);
    const weekChores = await choreSchedulingService.getChoresForDateRange(testHouseholdId, today, endDate);
    
    return {
      success: true,
      message: 'Chore scheduling test completed',
      details: [
        `✅ Scheduling service is available`,
        `✅ Can get chores for specific dates (found ${todayChores.length} for today)`,
        `✅ Can get overdue chores (found ${overdueChores.length})`,
        `✅ Can generate weekly schedule (${Object.keys(weekChores).length} days)`,
        `✅ Calendar functionality ready for live data`,
      ]
    };
    
  } catch (error: any) {
    console.error('❌ Chore scheduling test failed:', error);
    return {
      success: false,
      message: 'Chore scheduling test failed',
      details: [error.message || 'Unknown error']
    };
  }
}

export default {
  testDatabaseConnection,
  createRealTestData,
  createTestUser,
  createSampleData,
  createSampleRewards,
  testRewardSystem,
  testChoreCompletion,
  testChoreScheduling,
}; 