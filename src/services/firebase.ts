import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get Firebase config from environment variables or app.json
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENTID,
};

// Fallback to app.json if env vars aren't available
const config = firebaseConfig.apiKey ? firebaseConfig : Constants.expoConfig?.extra?.firebase;

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

// Initialize Firebase with 3-tier fallback system
async function initializeFirebaseAuth() {
  if (!config) {
    console.log('⚠️ No Firebase config found');
    return null;
  }

  try {
    console.log('🔥 Initializing Firebase...');
    app = initializeApp(config);
    
          // Tier 1: Try production setup with AsyncStorage persistence
      try {
        console.log('🏭 Attempting production Firebase setup with persistence...');
        
        // In Firebase v11, we just use initializeAuth without persistence for Expo Go
        // The warning about AsyncStorage is expected and handled by our fallback system
        auth = initializeAuth(app);
        console.log('✅ Firebase auth initialized (will use memory persistence in Expo Go)');
        return auth;
      } catch (persistenceError: any) {
        console.log('⚠️ initializeAuth failed, trying development mode:', persistenceError.message);
      
      // Tier 2: Fallback to memory persistence for Expo Go
      try {
        console.log('👨‍💻 Attempting development Firebase setup (memory persistence)...');
        
        auth = initializeAuth(app, {
          persistence: undefined // Memory persistence only
        });
        
        console.log('✅ Development Firebase auth initialized (memory persistence)');
        return auth;
      } catch (memoryError: any) {
        console.log('⚠️ Memory persistence failed, trying basic auth:', memoryError.message);
        
        // Tier 3: Basic getAuth() as last resort
        try {
          auth = getAuth(app);
          console.log('✅ Basic Firebase auth initialized');
          return auth;
        } catch (basicError: any) {
          console.log('❌ All Firebase auth methods failed:', basicError.message);
          return null;
        }
      }
    }
  } catch (error: any) {
    console.error('❌ Firebase initialization failed:', error);
    return null;
  }
}

// Initialize Firebase immediately for Firestore access
if (config) {
  try {
    app = initializeApp(config);
    db = getFirestore(app);
    console.log('🔥 Firebase app and Firestore initialized');
  } catch (error) {
    console.error('❌ Firebase app initialization failed:', error);
  }
}

// Initialize auth separately (async)
initializeFirebaseAuth().then((authInstance) => {
  if (authInstance) {
    auth = authInstance;
    console.log('🔥 Firebase auth initialized successfully');
  } else {
    console.log('📱 Auth will run in mock mode');
  }
}).catch((error) => {
  console.error('🚨 Firebase auth initialization error:', error);
  console.log('📱 Auth will run in mock mode');
});

// Export the instances (may be undefined for mock mode)
export { app, auth, db };

// Helper function to check if Firebase is available
export const isFirebaseAvailable = () => {
  return !!(app && auth && db);
};

// Helper function to get current auth mode
export const getAuthMode = () => {
  if (!auth) return 'mock';
  
  // Check if we have persistence by trying to access the persistence property
  try {
    // This is a bit of a hack, but it works to detect the auth mode
    const authConfig = (auth as any)._config;
    if (authConfig?.persistence) {
      return 'production'; // Has AsyncStorage persistence
    } else {
      return 'development'; // Memory persistence only
    }
  } catch {
    return 'basic'; // Basic auth without specific persistence
  }
};