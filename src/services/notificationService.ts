import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  choreId?: string;
  rewardId?: string;
  householdId?: string;
  type: 'chore_reminder' | 'chore_due' | 'reward_available' | 'invitation' | 'approval_needed' | 'general';
  [key: string]: unknown; // Add index signature for compatibility
}

export interface ScheduleNotificationOptions {
  title: string;
  body: string;
  data?: NotificationData;
  trigger: {
    date?: Date;
    seconds?: number;
    repeats?: boolean;
  };
}

class NotificationService {
  private expoPushToken: string | null = null;
  private initialized = false;

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6C63FF',
        });

        // Create specific channels for different notification types
        await Notifications.setNotificationChannelAsync('chores', {
          name: 'Chore Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
        });

        await Notifications.setNotificationChannelAsync('rewards', {
          name: 'Rewards & Achievements',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 150, 150, 150],
          lightColor: '#F59E0B',
        });
      }

      // Request permissions and get push token
      await this.requestPermissions();
      await this.registerForPushNotifications();

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Register for push notifications and get Expo push token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Push notifications require a physical device');
        return null;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Notification permission not granted');
        return null;
      }

      // Get project ID from app config
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? 
                       Constants?.easConfig?.projectId;

      if (!projectId) {
        console.warn('Project ID not found for push notifications');
        return null;
      }

      const pushTokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.expoPushToken = pushTokenData.data;
      console.log('Expo Push Token:', this.expoPushToken);
      
      return this.expoPushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Get the current Expo push token
   */
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Schedule a local notification
   */
  async scheduleNotification(options: ScheduleNotificationOptions): Promise<string | null> {
    try {
      const { title, body, data, trigger } = options;

      // Determine the channel based on notification type
      let channelId = 'default';
      if (Platform.OS === 'android' && data?.type) {
        switch (data.type) {
          case 'chore_reminder':
          case 'chore_due':
            channelId = 'chores';
            break;
          case 'reward_available':
            channelId = 'rewards';
            break;
          default:
            channelId = 'default';
        }
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
          ...(Platform.OS === 'android' && { channelId }),
        },
        trigger: trigger.date ? {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: trigger.date,
        } : {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: trigger.seconds || 1,
          repeats: trigger.repeats || false,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Schedule a chore reminder notification
   */
  async scheduleChoreReminder(
    choreTitle: string,
    dueDate: Date,
    choreId: string,
    householdId: string
  ): Promise<string | null> {
    // Schedule notification 1 hour before due time
    const reminderTime = new Date(dueDate.getTime() - 60 * 60 * 1000);
    
    if (reminderTime <= new Date()) {
      console.warn('Chore reminder time is in the past, skipping');
      return null;
    }

    return this.scheduleNotification({
      title: '🏠 Chore Reminder',
      body: `"${choreTitle}" is due in 1 hour!`,
      data: {
        type: 'chore_reminder',
        choreId,
        householdId,
      },
      trigger: {
        date: reminderTime,
      },
    });
  }

  /**
   * Schedule a chore due notification
   */
  async scheduleChoreDeadline(
    choreTitle: string,
    dueDate: Date,
    choreId: string,
    householdId: string
  ): Promise<string | null> {
    if (dueDate <= new Date()) {
      console.warn('Chore due date is in the past, skipping');
      return null;
    }

    return this.scheduleNotification({
      title: '⏰ Chore Due Now!',
      body: `"${choreTitle}" is due now!`,
      data: {
        type: 'chore_due',
        choreId,
        householdId,
      },
      trigger: {
        date: dueDate,
      },
    });
  }

  /**
   * Send a push notification to a specific user (requires server implementation)
   */
  async sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data?: NotificationData
  ): Promise<boolean> {
    try {
      const message = {
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data: data || {},
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      return result.data?.status === 'ok';
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners(): {
    remove: () => void;
  } {
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        // Handle notification received while app is open
      }
    );

    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        // Handle notification tap/interaction
        const data = response.notification.request.content.data as NotificationData;
        
        // Navigate based on notification type
        if (data.type === 'chore_reminder' || data.type === 'chore_due') {
          // Navigate to chores screen or specific chore
        } else if (data.type === 'reward_available') {
          // Navigate to rewards screen
        }
      }
    );

    return {
      remove: () => {
        notificationListener.remove();
        responseListener.remove();
      },
    };
  }
}

// Export singleton instance
export const notificationService = new NotificationService(); 