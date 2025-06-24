import AsyncStorage from '@react-native-async-storage/async-storage';

export class AsyncStorageService {
  private static instance: AsyncStorageService;

  public static getInstance(): AsyncStorageService {
    if (!AsyncStorageService.instance) {
      AsyncStorageService.instance = new AsyncStorageService();
    }
    return AsyncStorageService.instance;
  }

  // Generic storage methods
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error storing data:', error);
      throw error;
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error retrieving data:', error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing data:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  // App-specific storage keys
  private static readonly KEYS = {
    CHORES: 'offline_chores',
    HOUSEHOLDS: 'offline_households',
    USERS: 'offline_users',
    PENDING_ACTIONS: 'pending_actions',
    LAST_SYNC: 'last_sync',
    USER_PREFERENCES: 'user_preferences',
  } as const;

  // Offline data management
  async storeChores(chores: any[]): Promise<void> {
    await this.setItem(AsyncStorageService.KEYS.CHORES, chores);
  }

  async getChores(): Promise<any[] | null> {
    return await this.getItem(AsyncStorageService.KEYS.CHORES);
  }

  async storeHouseholds(households: any[]): Promise<void> {
    await this.setItem(AsyncStorageService.KEYS.HOUSEHOLDS, households);
  }

  async getHouseholds(): Promise<any[] | null> {
    return await this.getItem(AsyncStorageService.KEYS.HOUSEHOLDS);
  }

  async storeUsers(users: any[]): Promise<void> {
    await this.setItem(AsyncStorageService.KEYS.USERS, users);
  }

  async getUsers(): Promise<any[] | null> {
    return await this.getItem(AsyncStorageService.KEYS.USERS);
  }

  // Pending actions for offline functionality
  async addPendingAction(action: { type: string; data: any; timestamp: number }): Promise<void> {
    const pendingActions: any[] = (await this.getItem(AsyncStorageService.KEYS.PENDING_ACTIONS)) || [];
    pendingActions.push(action);
    await this.setItem(AsyncStorageService.KEYS.PENDING_ACTIONS, pendingActions);
  }

  async getPendingActions(): Promise<any[]> {
    return (await this.getItem(AsyncStorageService.KEYS.PENDING_ACTIONS)) || [];
  }

  async clearPendingActions(): Promise<void> {
    await this.removeItem(AsyncStorageService.KEYS.PENDING_ACTIONS);
  }

  // Sync management
  async setLastSync(timestamp: number): Promise<void> {
    await this.setItem(AsyncStorageService.KEYS.LAST_SYNC, timestamp);
  }

  async getLastSync(): Promise<number | null> {
    return await this.getItem(AsyncStorageService.KEYS.LAST_SYNC);
  }

  // User preferences
  async setUserPreferences(preferences: any): Promise<void> {
    await this.setItem(AsyncStorageService.KEYS.USER_PREFERENCES, preferences);
  }

  async getUserPreferences(): Promise<any | null> {
    return await this.getItem(AsyncStorageService.KEYS.USER_PREFERENCES);
  }
} 