import { householdService, choreService, userService } from '../services/firestoreService';

export const sampleHouseholds = [
  {
    name: 'Smith Family',
    description: 'A busy family of four with two kids and two adults',
  },
  {
    name: 'Johnson Household',
    description: 'College roommates sharing chores and expenses',
  },
  {
    name: 'The Wilson Home',
    description: 'Multi-generational household with grandparents',
  },
];

export const sampleChores = [
  {
    title: 'Take out the trash',
    description: 'Empty all trash bins and take bags to the curb for pickup',
    coinReward: 15,
    frequency: 'weekly' as 'once' | 'daily' | 'weekly' | 'monthly',
    requiresPhoto: false,
    anyoneCanDo: true,
  },
  {
    title: 'Load the dishwasher',
    description: 'Load dirty dishes and run the dishwasher cycle',
    coinReward: 10,
    frequency: 'daily' as 'once' | 'daily' | 'weekly' | 'monthly',
    requiresPhoto: false,
    anyoneCanDo: true,
  },
  {
    title: 'Vacuum living room',
    description: 'Vacuum the main living area including under furniture',
    coinReward: 20,
    frequency: 'weekly' as 'once' | 'daily' | 'weekly' | 'monthly',
    requiresPhoto: true,
    anyoneCanDo: true,
  },
  {
    title: 'Clean bathroom',
    description: 'Deep clean the main bathroom - toilet, sink, shower, and floor',
    coinReward: 25,
    frequency: 'weekly' as 'once' | 'daily' | 'weekly' | 'monthly',
    requiresPhoto: true,
    anyoneCanDo: false,
  },
  {
    title: 'Do laundry',
    description: 'Wash, dry, and fold one load of laundry',
    coinReward: 15,
    frequency: 'weekly' as 'once' | 'daily' | 'weekly' | 'monthly',
    requiresPhoto: false,
    anyoneCanDo: true,
  },
  {
    title: 'Mow the lawn',
    description: 'Cut the grass in the front and back yard',
    coinReward: 30,
    frequency: 'weekly' as 'once' | 'daily' | 'weekly' | 'monthly',
    requiresPhoto: true,
    anyoneCanDo: false,
  },
  {
    title: 'Make beds',
    description: 'Make all beds in the house',
    coinReward: 5,
    frequency: 'daily' as 'once' | 'daily' | 'weekly' | 'monthly',
    requiresPhoto: false,
    anyoneCanDo: true,
  },
  {
    title: 'Organize pantry',
    description: 'Sort and organize all items in the pantry',
    coinReward: 35,
    frequency: 'monthly' as 'once' | 'daily' | 'weekly' | 'monthly',
    requiresPhoto: true,
    anyoneCanDo: true,
  },
  {
    title: 'Water plants',
    description: 'Water all indoor and outdoor plants',
    coinReward: 8,
    frequency: 'daily' as 'once' | 'daily' | 'weekly' | 'monthly',
    requiresPhoto: false,
    anyoneCanDo: true,
  },
  {
    title: 'Clean kitchen counters',
    description: 'Wipe down all kitchen counters and surfaces',
    coinReward: 8,
    frequency: 'daily' as 'once' | 'daily' | 'weekly' | 'monthly',
    requiresPhoto: false,
    anyoneCanDo: true,
  },
];

export const createSampleHousehold = async (userId: string, householdName?: string) => {
  try {
    console.log('🏠 Creating sample household for user:', userId);
    
    const household = sampleHouseholds[0];
    const householdId = await householdService.createHousehold(
      {
        name: householdName || household.name,
        description: household.description,
      },
      userId
    );

    // Update user with household ID
    await userService.updateUser(userId, {
      householdId,
      role: 'admin',
    });

    console.log('✅ Sample household created:', householdId);
    return householdId;
  } catch (error) {
    console.error('❌ Error creating sample household:', error);
    throw error;
  }
};

export const createSampleChores = async (householdId: string, userId: string) => {
  try {
    console.log('🧹 Creating sample chores for household:', householdId);
    
    const chorePromises = sampleChores.map(chore =>
      choreService.createChore({
        ...chore,
        householdId,
        createdBy: userId,
        isRecurring: chore.frequency !== 'once',
      })
    );

    await Promise.all(chorePromises);
    console.log('✅ Sample chores created:', sampleChores.length);
  } catch (error) {
    console.error('❌ Error creating sample chores:', error);
    throw error;
  }
};

export const initializeSampleData = async (userId: string, householdName?: string) => {
  try {
    console.log('🚀 Initializing sample data for user:', userId);
    
    const householdId = await createSampleHousehold(userId, householdName);
    await createSampleChores(householdId, userId);
    
    console.log('✅ Sample data initialization complete');
    return householdId;
  } catch (error) {
    console.error('❌ Error initializing sample data:', error);
    throw error;
  }
};

export default {
  sampleHouseholds,
  sampleChores,
  createSampleHousehold,
  createSampleChores,
  initializeSampleData,
}; 