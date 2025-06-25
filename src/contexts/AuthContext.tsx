import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { firestoreUtils, userService, FirestoreUser } from '../services/firestoreService';
import { AsyncStorageService } from '../storage/AsyncStorageService';
import { User } from '../types';
import { subscriptionService } from '../services/subscriptionService';

// Enhanced User interface that includes both auth and Firestore data
interface AuthUser extends User {
  firestoreData?: FirestoreUser;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  updateUserProfile: (updates: Partial<AuthUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUserIdRef = useRef<string | null>(null);
  const mockListenerRef = useRef<(() => void) | null>(null);

  // Mock user data for testing - creates consistent user ID from email
  const createMockUser = (email: string, isSignUp: boolean = false): AuthUser => {
    // Create consistent user ID from email (replace special chars)
    const userId = 'user-' + email.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    return {
      id: userId,
      email,
      displayName: email.split('@')[0],
      coins: isSignUp ? 0 : 25,
      realBalance: 0, // Real money comes from reward redemptions, not chore completions
      role: isSignUp ? 'member' : 'admin',
      householdId: undefined, // Will be set when they join/create household
      avatar: '👤',
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      isPremium: false,
    };
  };

  // Create user from Firebase user and Firestore data
  const createUserFromFirebase = (firebaseUser: FirebaseUser, firestoreData?: FirestoreUser): AuthUser => ({
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firestoreData?.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
    role: firestoreData?.role || 'member',
    coins: firestoreData?.coins || 0,
    realBalance: firestoreData?.totalCashRewards || 0, // Track actual money from reward redemptions
    householdId: firestoreData?.householdId,
    firestoreData,
    avatar: '👤',
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    isPremium: false,
  });

  // Update user with Firestore data
  const updateUserWithFirestoreData = (currentUser: AuthUser, firestoreData: FirestoreUser): AuthUser => ({
    ...currentUser,
    displayName: firestoreData.displayName || currentUser.displayName,
    coins: firestoreData.coins || 0,
    realBalance: firestoreData.totalCashRewards || 0,
    role: firestoreData.role || 'member',
    householdId: firestoreData.householdId,
    firestoreData,
    avatar: '👤',
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    isPremium: false,
  });

  // Refresh user data from Firestore
  const refreshUserData = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Refreshing user data for:', user.id);
      const userData = await userService.getUser(user.id);
      if (userData) {
        const updatedUser = updateUserWithFirestoreData(user, userData);
        setUser(updatedUser);
        console.log('✅ User data refreshed:', { householdId: updatedUser.householdId });
        
        // Initialize subscription service for real subscriptions
        try {
          await subscriptionService.initialize(updatedUser.id);
          console.log('✅ Subscription service initialized');
        } catch (error) {
          console.log('⚠️ Subscription service initialization failed:', error);
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
    }
  };

  // Set up real-time Firestore listener for user data
  const setupUserDataListener = (userId: string) => {
    if (!db) {
      console.log('⚠️ No Firestore connection, skipping user data listener');
      return null;
    }

    console.log('🎧 Setting up real-time user data listener for:', userId);
    
    const userDocRef = doc(db, 'users', userId);
    return onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const firestoreData = docSnapshot.data() as FirestoreUser;
        console.log('🔄 User data updated:', { 
          householdId: firestoreData.householdId,
          coins: firestoreData.coins,
          role: firestoreData.role 
        });
        
        setUser(currentUser => {
          if (!currentUser) return null;
          return updateUserWithFirestoreData(currentUser, firestoreData);
        });
      } else {
        console.log('⚠️ User document does not exist in Firestore');
      }
    }, (error) => {
      console.error('❌ Error listening to user data:', error);
    });
  };

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('🔑 Attempting sign in...', { hasAuth: !!auth });
      
      if (auth) {
        // Try Firebase auth
        console.log('🔥 Using Firebase auth');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Firebase auth successful - would normally fetch user data from Firestore
        const mockUser = createMockUser(email, false);
        setUser(mockUser);
        console.log('✅ Firebase auth successful');
      } else {
        // Fallback mode - accept any email/password and create Firestore user
        console.log('🔧 Using fallback auth mode');
        const mockUser = createMockUser(email, false);
        
        // Create/update user in Firestore for mock auth
        try {
          await firestoreUtils.initializeUserData(mockUser.id, email, mockUser.displayName);
          console.log('✅ Mock user created/updated in Firestore');
          
          // Load real Firestore data to get householdId
          const userData = await userService.getUser(mockUser.id);
          if (userData) {
            const updatedUser = updateUserWithFirestoreData(mockUser, userData);
            setUser(updatedUser);
            console.log('✅ User data loaded from Firestore:', { householdId: updatedUser.householdId });
            
            // Initialize subscription service for real subscriptions
            try {
              await subscriptionService.initialize(updatedUser.id);
              console.log('✅ Subscription service initialized');
            } catch (error) {
              console.log('⚠️ Subscription service initialization failed:', error);
            }
          } else {
            setUser(mockUser);
          }
        } catch (firestoreError) {
          console.log('⚠️ Could not create Firestore user (mock mode will continue):', firestoreError);
          setUser(mockUser);
        }
      }
    } catch (error: any) {
      // If Firebase fails, fall back to mock mode
      console.log('🔧 Firebase auth failed, using fallback mode:', error.message);
      const mockUser = createMockUser(email, false);
      
      // Try to create user in Firestore even in fallback mode
      try {
        await firestoreUtils.initializeUserData(mockUser.id, email, mockUser.displayName);
        console.log('✅ Mock user created in Firestore during fallback');
        
        // Load real Firestore data
        const userData = await userService.getUser(mockUser.id);
        if (userData) {
          const updatedUser = updateUserWithFirestoreData(mockUser, userData);
          setUser(updatedUser);
          console.log('✅ User data loaded from Firestore during fallback:', { householdId: updatedUser.householdId });
          
          // Initialize subscription service for real subscriptions
          try {
            await subscriptionService.initialize(updatedUser.id);
            console.log('✅ Subscription service initialized');
          } catch (error) {
            console.log('⚠️ Subscription service initialization failed:', error);
          }
        } else {
          setUser(mockUser);
        }
      } catch (firestoreError) {
        console.log('⚠️ Could not create Firestore user during fallback:', firestoreError);
        setUser(mockUser);
      }
    } finally {
      setLoading(false);
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string, displayName?: string) => {
    console.log('🔐 Mock signup:', { email, displayName });
    
    // Create mock user
    const mockUser: AuthUser = {
      id: `user_${Date.now()}`,
      email,
      displayName: displayName || email.split('@')[0],
      avatar: '👤',
      coins: 0,
      realBalance: 0.0,
      householdId: undefined,
      role: 'member',
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      isPremium: false,
    };
    
    setUser(mockUser);
    const storageService = AsyncStorageService.getInstance();
    await storageService.setItem('user', mockUser);
  };

  const updateUserProfile = async (updates: Partial<AuthUser>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    const storageService = AsyncStorageService.getInstance();
    await storageService.setItem('user', updatedUser);
  };

  // Sign out function
  const logout = async () => {
    try {
      console.log('👋 Attempting logout...', { hasAuth: !!auth });
      
      // Logout from subscription service first
      try {
        await subscriptionService.logout();
        console.log('✅ Subscription service logout successful');
      } catch (error) {
        console.log('⚠️ Subscription service logout failed:', error);
      }
      
      if (auth) {
        await signOut(auth);
        console.log('✅ Firebase logout successful');
      }
      setUser(null);
      console.log('✅ User cleared');
    } catch (error: any) {
      console.error('Logout error:', error);
      // Even if Firebase logout fails, clear local user
      setUser(null);
      console.log('✅ User cleared (fallback)');
    }
  };

  // Set up auth state listener
  useEffect(() => {
    console.log('🎧 Setting up auth listener...', { hasAuth: !!auth });
    let firestoreUnsubscribe: (() => void) | null = null;
    
    if (!auth) {
      // No Firebase, just set loading to false
      console.log('⚠️ No Firebase auth, running in mock mode');
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        console.log('🔄 Auth state changed:', { user: !!firebaseUser });
        
        // Clean up previous Firestore listener
        if (firestoreUnsubscribe) {
          firestoreUnsubscribe();
          firestoreUnsubscribe = null;
        }
        
        if (firebaseUser) {
          try {
            // Load user data from Firestore
            const userData = await userService.getUser(firebaseUser.uid);
            const user = createUserFromFirebase(firebaseUser, userData || undefined);
            setUser(user);
            
            // Initialize subscription service for real subscriptions
            try {
              await subscriptionService.initialize(firebaseUser.uid);
              console.log('✅ Subscription service initialized for Firebase user');
            } catch (error) {
              console.log('⚠️ Subscription service initialization failed:', error);
            }
            
            // Set up real-time listener for user data changes
            firestoreUnsubscribe = setupUserDataListener(firebaseUser.uid);
            
            console.log('✅ Firebase user loaded with Firestore data:', { 
              uid: firebaseUser.uid, 
              hasFirestoreData: !!userData,
              householdId: userData?.householdId 
            });
          } catch (error) {
            console.error('❌ Error loading Firestore user data:', error);
            // Create user without Firestore data
            const user = createUserFromFirebase(firebaseUser);
            setUser(user);
          }
        } else {
          setUser(null);
          console.log('✅ User signed out');
        }
        
        setLoading(false);
      });

      return () => {
        unsubscribe();
        if (firestoreUnsubscribe) {
          firestoreUnsubscribe();
        }
      };
    } catch (error) {
      console.error('❌ Error setting up auth listener:', error);
      setLoading(false);
    }
  }, []);

  // Set up real-time listener for mock users too
  useEffect(() => {
    const userId = user?.id;
    
    // Only proceed if we have a user ID and it's different from the current one
    if (!userId || !db || currentUserIdRef.current === userId) return;
    
    // Only set up listener if we're in mock mode (no Firebase auth)
    if (auth) return;
    
    // Clean up previous listener
    if (mockListenerRef.current) {
      mockListenerRef.current();
      mockListenerRef.current = null;
    }
    
    console.log('🎧 Setting up Firestore listener for mock user:', userId);
    currentUserIdRef.current = userId;
    mockListenerRef.current = setupUserDataListener(userId);
    
    return () => {
      if (mockListenerRef.current) {
        mockListenerRef.current();
        mockListenerRef.current = null;
      }
      currentUserIdRef.current = null;
    };
  }, [user?.id, auth, db]);

  const value = {
    user,
    loading,
    signIn,
    signUp,
    logout,
    refreshUserData,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 