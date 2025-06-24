# ChoreCraft Notifications Setup

## Overview

ChoreCraft implements a comprehensive notification system using Expo's notification service for both local and push notifications on iOS and Android.

## Features

### Local Notifications
- **Chore Reminders**: Notifications sent 1 hour before chore due time
- **Chore Deadlines**: Notifications when chores are due
- **Custom Scheduling**: Support for various notification triggers

### Push Notifications
- **Real-time Updates**: Server-sent notifications for household events
- **Cross-platform**: Works on both iOS and Android
- **Token Management**: Automatic push token registration and storage

## Implementation

### Core Components

1. **NotificationService** (`src/services/notificationService.ts`)
   - Handles all notification logic
   - Manages permissions and push tokens
   - Provides scheduling and sending capabilities

2. **Settings Integration** (`src/screens/SettingsScreen.tsx`)
   - User notification preferences
   - Push notification toggle with automatic token management
   - Granular control over notification types

3. **App Initialization** (`app/_layout.tsx`)
   - Automatic service initialization on app start
   - Permission requests handled gracefully

### Notification Types

```typescript
interface NotificationData {
  choreId?: string;
  rewardId?: string;
  householdId?: string;
  type: 'chore_reminder' | 'chore_due' | 'reward_available' | 'invitation' | 'approval_needed' | 'general';
}
```

### Usage Examples

#### Schedule a Chore Reminder
```typescript
import { notificationService } from '../services/notificationService';

// Schedule reminder 1 hour before due time
await notificationService.scheduleChoreReminder(
  'Take out trash',
  new Date('2024-01-15T10:00:00'),
  'chore-123',
  'household-456'
);
```

#### Send Push Notification
```typescript
// Send to specific user's push token
await notificationService.sendPushNotification(
  userPushToken,
  'New Chore Assigned',
  'You have been assigned "Clean kitchen"',
  { type: 'chore_reminder', choreId: 'chore-123' }
);
```

## Platform-Specific Features

### Android
- **Notification Channels**: Separate channels for chores, rewards, and general notifications
- **Custom Vibration Patterns**: Different patterns for different notification types
- **LED Colors**: Custom colors for notification types

### iOS
- **Rich Notifications**: Support for images and actions
- **Notification Grouping**: Grouped by household or type
- **Badge Management**: Automatic badge count updates

## Setup Requirements

### Development
1. Install required packages (already done):
   ```bash
   npx expo install expo-notifications expo-device expo-constants
   ```

2. The notification service initializes automatically when the app starts

### Production
1. **iOS**: Requires Apple Developer Account for push notification certificates
2. **Android**: Requires Firebase Cloud Messaging (FCM) setup
3. **EAS Build**: Recommended for proper credential management

## User Experience

### Permission Flow
1. App requests notification permissions on first launch
2. User can enable/disable push notifications in Settings
3. Granular controls for different notification types
4. Clear feedback when permissions are granted/denied

### Settings Interface
- **Push Notifications**: Master toggle with token management
- **Chore Reminders**: Toggle for chore-related notifications
- **Reward Alerts**: Toggle for reward notifications
- **Family Updates**: Toggle for household activity notifications
- **Sound/Vibration**: Individual controls for audio feedback

## Privacy & Data

### User Control
- **Parental Controls**: Content filtering for age-appropriate notifications
- **Profile Visibility**: Controls who can trigger notifications to the user
- **Data Export**: Notification preferences included in user data export

### Security
- Push tokens are securely stored in Firestore
- Tokens automatically refresh and update
- No sensitive data included in notification payloads

## Testing

### Local Notifications
- Test on physical devices (simulators don't support notifications)
- Use the built-in scheduling functions
- Check notification appearance and behavior

### Push Notifications
- Use Expo's push notification tool: https://expo.dev/notifications
- Test with actual push tokens from device
- Verify delivery and interaction handling

## Troubleshooting

### Common Issues
1. **Notifications not appearing**: Check device permissions
2. **Push token not generated**: Ensure physical device and proper project ID
3. **Scheduled notifications not firing**: Verify time zones and date formats

### Debug Information
- Push tokens are logged to console during registration
- Notification events are logged for debugging
- Settings changes are logged with success/failure status

## Future Enhancements

### Planned Features
- **Smart Scheduling**: AI-powered optimal notification timing
- **Rich Media**: Image and video support in notifications
- **Interactive Actions**: Quick complete/snooze actions
- **Batch Notifications**: Grouped household updates
- **Custom Sounds**: User-selectable notification sounds

### Integration Opportunities
- **Calendar Sync**: Integration with device calendars
- **Location-based**: Notifications when arriving/leaving home
- **Smart Home**: Integration with IoT devices
- **Voice Assistants**: Voice notification reading

## API Reference

### NotificationService Methods

- `initialize()`: Initialize the service and request permissions
- `scheduleNotification(options)`: Schedule a local notification
- `scheduleChoreReminder(title, dueDate, choreId, householdId)`: Schedule chore reminder
- `sendPushNotification(token, title, body, data)`: Send push notification
- `cancelNotification(id)`: Cancel specific notification
- `cancelAllNotifications()`: Cancel all scheduled notifications
- `getExpoPushToken()`: Get current push token
- `setupNotificationListeners()`: Set up event listeners

This notification system provides a robust, user-friendly experience while maintaining privacy and giving users full control over their notification preferences. 