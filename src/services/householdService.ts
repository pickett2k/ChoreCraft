import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  arrayUnion,
  arrayRemove 
} from 'firebase/firestore';
import { db } from './firebase';

// Household interface matching our database structure
export interface Household {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: any;
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
  };
  members: string[];
  admins: string[];
  stats: {
    totalChoresCompleted: number;
    totalCoinsAwarded: number;
    activeMemberCount: number;
  };
}

// Generate a 6-digit invite code
const generateInviteCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create default household settings
const createDefaultSettings = () => ({
  autoApprove: false,
  requirePhotoProof: true,
  currency: {
    code: 'USD',
    symbol: '$',
  },
  coinValues: {
    defaultChoreValue: 10,
    bonusMultiplier: 1.5,
  },
});

// Create default household stats
const createDefaultStats = () => ({
  totalChoresCompleted: 0,
  totalCoinsAwarded: 0,
  activeMemberCount: 1,
});

// Create a new household
export const createHousehold = async (
  name: string,
  createdBy: string,
  description?: string
): Promise<Household> => {
  try {
    if (!db) {
      console.log('📱 Mock mode: Creating household');
      return {
        id: 'mock-household-id',
        name,
        description,
        createdBy,
        createdAt: new Date(),
        inviteCode: generateInviteCode(),
        settings: createDefaultSettings(),
        members: [createdBy],
        admins: [createdBy],
        stats: createDefaultStats(),
      } as Household;
    }

    const inviteCode = generateInviteCode();
    
    // Check if invite code already exists (very unlikely but just in case)
    const existingHousehold = await getHouseholdByInviteCode(inviteCode);
    if (existingHousehold) {
      // Recursively generate a new code if collision
      return createHousehold(name, createdBy, description);
    }

    const householdData = {
      name: name.trim(),
      description: description?.trim(),
      createdBy,
      createdAt: serverTimestamp(),
      inviteCode,
      settings: createDefaultSettings(),
      members: [createdBy],
      admins: [createdBy],
      stats: createDefaultStats(),
    };

    const docRef = await addDoc(collection(db!, 'households'), householdData);
    
    // Update user to be admin and assign household
    const userRef = doc(db!, 'users', createdBy);
    await updateDoc(userRef, {
      householdId: docRef.id,
      role: 'admin',
    });

    return {
      id: docRef.id,
      ...householdData,
    } as Household;
  } catch (error) {
    console.error('❌ Error creating household:', error);
    throw new Error('Failed to create household');
  }
};

// Get household by ID
export const getHousehold = async (householdId: string): Promise<Household | null> => {
  try {
    if (!db) {
      console.log('📱 Mock mode: Getting household');
      return null;
    }

    const docRef = doc(db!, 'households', householdId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Household;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting household:', error);
    return null;
  }
};

// Get household by invite code
export const getHouseholdByInviteCode = async (inviteCode: string): Promise<Household | null> => {
  try {
    if (!db) {
      console.log('📱 Mock mode: Getting household by invite code');
      return null;
    }

    const q = query(
      collection(db!, 'households'),
      where('inviteCode', '==', inviteCode)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as Household;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting household by invite code:', error);
    return null;
  }
};

// Join household using invite code
export const joinHousehold = async (
  userId: string,
  inviteCode: string
): Promise<Household> => {
  try {
    if (!db) {
      console.log('📱 Mock mode: Joining household');
      return {
        id: 'mock-household-id',
        name: 'Mock Household',
        description: 'This is a mock household',
        createdBy: 'mock-user',
        createdAt: new Date(),
        inviteCode: generateInviteCode(),
        settings: createDefaultSettings(),
        members: [userId],
        admins: ['mock-user'],
        stats: createDefaultStats(),
      } as Household;
    }

    const householdsQuery = query(
      collection(db!, 'households'),
      where('inviteCode', '==', inviteCode)
    );

    const snapshot = await getDocs(householdsQuery);
    
    if (snapshot.empty) {
      throw new Error('Invalid invite code');
    }

    const householdDoc = snapshot.docs[0];
    const household = householdDoc.data();
    
    if (household.members.includes(userId)) {
      throw new Error('You are already a member of this household');
    }

    // Add user to household members
    await updateDoc(householdDoc.ref, {
      members: [...household.members, userId],
      'stats.activeMemberCount': household.members.length + 1
    });

    // Update user's household
    const userRef = doc(db!, 'users', userId);
    await updateDoc(userRef, {
      householdId: householdDoc.id,
      role: 'member'
    });

    // Return updated household
    return {
      id: householdDoc.id,
      ...household,
      members: [...household.members, userId],
      stats: {
        ...household.stats,
        activeMemberCount: household.stats.activeMemberCount + 1,
      },
    } as Household;
  } catch (error) {
    console.error('❌ Error joining household:', error);
    throw error;
  }
};
 