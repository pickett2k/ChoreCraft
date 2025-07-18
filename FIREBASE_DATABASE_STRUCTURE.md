# ChoreCraft Firebase Database Structure

## Overview
This document outlines the complete database structure for ChoreCraft using Firebase Firestore. The app manages households, users, chores, rewards, and various tracking data.

## ⚠️ **Development Environment Notes**

### **🚨 Expo Go Compatibility**

**IMPORTANT: Not all Firebase services work in Expo Go:**

#### ✅ **Expo Go Compatible (Test Freely):**
- **Firestore Database** - All CRUD operations work
- **Cloud Storage** - File uploads/downloads work
- **Cloud Functions** - HTTP callable functions work
- **Firestore Security Rules** - Can be tested

#### ❌ **Requires Native Build:**
- **Firebase Authentication** - Uses native modules
- **Push Notifications** - Uses native modules  
- **App Check** - Uses native modules
- **Analytics** - Uses native modules

**Development Strategy:**
1. **Expo Go Phase**: Test all database operations, storage, and business logic
2. **Development Build**: Test authentication and push notifications
3. **Production Build**: Final testing with all services

---

## Collections Structure

### 1. `users` Collection
Stores individual user information and authentication data.

```typescript
interface User {
  id: string;                    // Document ID (Firebase Auth UID)
  email: string;
  displayName: string;
  avatar: string;                // Emoji or image URL
  role: 'admin' | 'member';      // Household role
  householdId?: string;          // Reference to household
  coins: number;                 // Current coin balance
  totalCoinsEarned: number;      // Lifetime coins earned
  joinedAt: Timestamp;
  lastActive: Timestamp;
  preferences: {
    darkMode: boolean;
    notifications: {
      pushEnabled: boolean;
      choreReminders: boolean;
      rewardAlerts: boolean;
      familyUpdates: boolean;
      soundEnabled: boolean;
      vibrationEnabled: boolean;
    };
    currency: {
      code: string;              // USD, EUR, GBP, etc.
      symbol: string;            // $, €, £, etc.
    };
  };
  stats: {
    choresCompleted: number;
    rewardsClaimed: number;
    currentStreak: number;       // Days in a row with completed chores
    longestStreak: number;
  };
}
```

### 2. `households` Collection
Manages household/family groups and their settings.

```typescript
interface Household {
  id: string;                    // Document ID
  name: string;                  // "Smith Family"
  description?: string;
  createdBy: string;             // User ID of creator
  createdAt: Timestamp;
  inviteCode: string;            // 6-digit code for joining
  settings: {
    autoApprove: boolean;        // Auto-approve chore completions
    requirePhotoProof: boolean;  // Require photos for chores
    currency: {
      code: string;
      symbol: string;
    };
    coinValues: {
      defaultChoreValue: number; // Default coins per chore
      bonusMultiplier: number;   // Bonus for streaks
    };
  };
  members: string[];             // Array of user IDs
  admins: string[];              // Array of admin user IDs
  stats: {
    totalChoresCompleted: number;
    totalCoinsAwarded: number;
    activeMemberCount: number;
  };
}
```

### 3. `chores` Collection
Stores all chore definitions and assignments.

```typescript
interface Chore {
  id: string;                    // Document ID
  householdId: string;           // Reference to household
  title: string;
  description: string;
  createdBy: string;             // User ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Reward Information
  coinReward: number;
  
  // Assignment
  assignedTo: string[];          // User IDs (empty = anyone can do)
  anyoneCanDo: boolean;
  
  // Requirements
  requiresPhoto: boolean;
  beforePhotoRequired: boolean;
  afterPhotoRequired: boolean;
  
  // Frequency & Scheduling
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
  customFrequency?: {
    days: string[];              // ['monday', 'wednesday', 'friday']
    time?: string;               // '09:00'
  };
  
  // Status
  status: 'active' | 'paused' | 'completed' | 'archived';
  isRecurring: boolean;
  
  // Tracking
  completionCount: number;       // How many times completed
  lastCompletedAt?: Timestamp;
  nextDueDate?: Timestamp;
  
  // Photos
  beforePhoto?: string;          // Storage URL
  
  // Auto-cleanup
  autoDeleteAfterDays: number;   // Default: 7 days after completion
}
```

### 4. `choreCompletions` Collection
Tracks individual chore completion instances.

```typescript
interface ChoreCompletion {
  id: string;                    // Document ID
  choreId: string;               // Reference to chore
  householdId: string;           // Reference to household
  completedBy: string;           // User ID
  completedAt: Timestamp;
  
  // Approval Status
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;           // Admin user ID
  approvedAt?: Timestamp;
  rejectionReason?: string;
  
  // Photos
  beforePhoto?: string;          // Storage URL
  afterPhoto?: string;           // Storage URL
  
  // Rewards
  coinsAwarded: number;
  coinsPending: number;          // If pending approval
  
  // Notes
  notes?: string;                // User notes about completion
  adminNotes?: string;           // Admin notes for approval/rejection
  
  // Cleanup
  scheduledDeletion?: Timestamp; // Auto-delete date
}
```

### 5. `rewards` Collection
Manages the marketplace rewards that users can claim.

```typescript
interface Reward {
  id: string;                    // Document ID
  householdId: string;           // Reference to household
  title: string;
  description: string;
  cost: number;                  // Coins required
  
  // Categorization
  category: 'cash' | 'treats' | 'privileges' | 'experiences' | 'items';
  icon: string;                  // FontAwesome icon name
  color: string;                 // Hex color
  
  // Availability
  isActive: boolean;
  maxClaims?: number;            // Limit total claims
  maxClaimsPerUser?: number;     // Limit per user
  
  // Tracking
  totalClaimed: number;
  claimedBy: string[];           // User IDs who claimed
  
  // Management
  createdBy: string;             // Admin user ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Expiration
  expiresAt?: Timestamp;
  
  // Requirements
  minimumStreak?: number;        // Require X day streak
  minimumChores?: number;        // Require X completed chores
}
```

### 6. `rewardClaims` Collection
Tracks reward claims and their approval status.

```typescript
interface RewardClaim {
  id: string;                    // Document ID
  rewardId: string;              // Reference to reward
  householdId: string;           // Reference to household
  claimedBy: string;             // User ID
  claimedAt: Timestamp;
  
  // Approval Status
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  approvedBy?: string;           // Admin user ID
  approvedAt?: Timestamp;
  fulfilledAt?: Timestamp;       // When reward was given
  rejectionReason?: string;
  
  // Cost
  coinsCost: number;
  coinsDeducted: boolean;        // Whether coins were deducted
  
  // Notes
  userNotes?: string;
  adminNotes?: string;
  fulfillmentNotes?: string;     // How reward was delivered
}
```

## Security Rules Structure

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Household members can read household data
    match /households/{householdId} {
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.members;
      allow write: if request.auth != null && 
        request.auth.uid in resource.data.admins;
    }
    
    // Household members can read/write chores
    match /chores/{choreId} {
      allow read, write: if request.auth != null && 
        isHouseholdMember(resource.data.householdId);
    }
  }
  
  function isHouseholdMember(householdId) {
    return request.auth.uid in get(/databases/$(database)/documents/households/$(householdId)).data.members;
  }
}
```

## Implementation Plan

### Phase 1: Authentication & Users (Week 1)
- Set up Firebase Authentication
- Implement user registration/login
- Create user profiles
- Basic navigation flow

### Phase 2: Households (Week 1-2)
- Household creation and management
- Invite code system
- Member management
- Admin controls

### Phase 3: Core Chore System (Week 2-3)
- Chore creation and editing
- Assignment system
- Basic completion workflow
- Photo upload integration

### Phase 4: Approval System (Week 3-4)
- Admin approval interface
- Notification system
- Coin management
- Streak tracking

### Phase 5: Reward Marketplace (Week 4-5)
- Reward creation and management
- Claim system
- Admin approval for rewards
- Coin deduction logic

### Phase 6: Advanced Features (Week 5-6)
- Push notifications
- Recurring chore scheduling
- Analytics and reporting
- Performance optimization

## Next Steps

1. **Set up Firebase project** with authentication and Firestore
2. **Install Firebase SDK** and configure environment
3. **Implement authentication flow** with email/password
4. **Create user management system** with profiles
5. **Build household creation and joining** functionality

Ready to start implementation? Let's begin with Phase 1!

## 🚨 CRITICAL: Expo Go Limitations

**Database services that WORK in Expo Go:**
- ✅ Firestore Database (all CRUD operations)
- ✅ Cloud Storage (file uploads/downloads)  
- ✅ Cloud Functions (HTTP callable functions)

**Services that require native build:**
- ❌ Firebase Authentication (uses native modules)
- ❌ Push Notifications (uses native modules)
- ❌ App Check (uses native modules)

**Development Strategy:**
- Use Expo Go for database development and testing
- Database features work perfectly in development
- Authentication uses fallback system for Expo Go compatibility

---

## Collections Overview

### 1. `users` Collection
Stores user profiles with coins, stats, and preferences.

```typescript
interface FirestoreUser {
  coins: number;
  totalCoinsEarned: number;
  householdId?: string;
  role: 'admin' | 'member';
  stats: {
    choresCompleted: number;
    currentStreak: number;
    longestStreak: number;
    totalRewards: number;
  };
  preferences: {
    notifications: boolean;
    currency: 'coins' | 'gbp';
    theme: 'light' | 'dark';
  };
  createdAt: Date;
  updatedAt: Date;
}
```

**Document ID:** User's email converted to ID format (e.g., `user-test-example-com`)

### 2. `households` Collection
Stores household information and settings.

```typescript
interface Household {
  name: string;
  inviteCode: string; // 6-digit code
  members: string[];  // User IDs
  admins: string[];   // Admin user IDs
  settings: {
    autoApprove: boolean;
    coinValues: {
      easy: number;
      medium: number;
      hard: number;
    };
    allowPhotoUploads: boolean;
    requirePhotoProof: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

**Document ID:** Auto-generated by Firestore

### 3. `chores` Collection
Stores chore definitions and assignments.

```typescript
interface Chore {
  householdId: string;
  title: string;
  description: string;
  coinReward: number;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  anyoneCanDo: boolean;
  requiresPhoto: boolean;
  status: 'active' | 'paused' | 'completed';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Document ID:** Auto-generated by Firestore

### 4. `rewards` Collection ⭐ NEW
Stores marketplace rewards that can be purchased with coins.

```typescript
interface Reward {
  title: string;
  description: string;
  coinCost: number;
  category: 'entertainment' | 'treats' | 'privileges' | 'money' | 'experiences' | 'items';
  isActive: boolean;
  createdBy: string;
  householdId: string;
  
  // Popularity tracking
  requestCount: number;
  lastRequested?: Date;
  
  // Availability controls
  maxRedemptions?: number; // null = unlimited
  currentRedemptions: number;
  cooldownHours?: number; // Hours before can be redeemed again
  
  // Settings
  requiresApproval: boolean;
  ageRestriction?: number;
  icon?: string;
  color?: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

**Features:**
- **Smart Duplicate Prevention:** Checks for similar rewards before creating
- **Popularity Tracking:** Tracks how often rewards are requested
- **Availability Controls:** Max redemptions and cooldown periods
- **Category-based Organization:** 6 categories for easy filtering
- **Approval System:** Optional admin approval for high-value rewards

### 5. `rewardRequests` Collection ⭐ NEW
Stores user requests for rewards (coin exchanges).

```typescript
interface RewardRequest {
  rewardId: string;
  userId: string;
  householdId: string;
  coinCost: number;
  status: 'pending' | 'approved' | 'denied' | 'fulfilled';
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  notes?: string;
  
  // Reward snapshot (preserved if reward is deleted)
  rewardSnapshot: {
    title: string;
    description: string;
    category: string;
  };
}
```

**Features:**
- **Request Tracking:** Complete audit trail of all reward requests
- **Approval Workflow:** Admin can approve/deny requests
- **Automatic Processing:** Auto-approval for simple rewards
- **Data Preservation:** Reward details preserved even if original reward is deleted

### 6. `system` Collection ⭐ NEW
Stores global system data and popular reward recommendations.

```typescript
// Document: system/popularRewards
interface PopularRewardsDoc {
  rewards: PopularReward[];
  lastUpdated: Date;
}

interface PopularReward {
  title: string;
  description: string;
  category: string;
  averageCoinCost: number;
  requestFrequency: number; // Percentage of households that use this
  icon?: string;
  color?: string;
}
```

**Features:**
- **Cross-household Analytics:** Tracks popular rewards across all families
- **Smart Recommendations:** Suggests rewards when creating new ones
- **Usage Statistics:** Shows how often rewards are requested

---

## Reward System Workflow

### 1. Reward Creation Process
```mermaid
graph TD
    A[User Creates Reward] --> B{Check for Duplicates}
    B -->|Found Similar| C[Increment Popularity]
    B -->|No Duplicates| D[Create New Reward]
    C --> E[Return Existing ID]
    D --> F[Update Popular Rewards]
    F --> G[Return New ID]
```

### 2. Reward Request Process
```mermaid
graph TD
    A[User Requests Reward] --> B{Check Coin Balance}
    B -->|Insufficient| C[Show Error]
    B -->|Sufficient| D{Check Availability}
    D -->|Unavailable| E[Show Unavailable]
    D -->|Available| F{Check Cooldown}
    F -->|In Cooldown| G[Show Cooldown Time]
    F -->|Ready| H{Requires Approval?}
    H -->|Yes| I[Create Pending Request]
    H -->|No| J[Auto-approve & Deduct Coins]
    I --> K[Notify Admins]
    J --> L[Update Reward Stats]
```

### 3. Admin Approval Process
```mermaid
graph TD
    A[Admin Reviews Request] --> B{Decision}
    B -->|Approve| C[Deduct User Coins]
    B -->|Deny| D[Update Request Status]
    C --> E[Update Reward Stats]
    C --> F[Notify User]
    D --> F
```

---

## Database Relationships

```
users (1) ←→ (1) households
  ↓
  └─→ rewardRequests (many)

households (1) ←→ (many) rewards
households (1) ←→ (many) chores

rewards (1) ←→ (many) rewardRequests

system/popularRewards ←→ all rewards (aggregated data)
```

---

## Key Features

### 🎯 Smart Duplicate Prevention
- Checks title and category before creating rewards
- Increments popularity instead of creating duplicates
- Maintains clean, organized reward marketplace

### 📊 Popularity Tracking
- Tracks request frequency for each reward
- Provides recommendations based on popular rewards
- Helps families discover what works for other households

### ⏰ Availability Controls
- **Max Redemptions:** Limit how many times a reward can be claimed
- **Cooldown Periods:** Prevent spam requests (e.g., "Stay up late" once per week)
- **Status Tracking:** Active/paused rewards

### 🔒 Approval System
- **Auto-approval:** For simple rewards (screen time, treats)
- **Admin approval:** For expensive rewards (money, big purchases)
- **Request tracking:** Complete audit trail

### 🏷️ Category Organization
- **Privileges:** Screen time, bedtime, dinner choice
- **Treats:** Candy, snacks, special foods
- **Entertainment:** Movie choice, games, activities
- **Money:** Cash conversion, pocket money
- **Experiences:** Friends over, outings, activities
- **Items:** Toys, books, physical rewards

---

## Testing in Expo Go

The reward system is fully compatible with Expo Go development:

```javascript
// Test reward creation
const testReward = await rewardService.createReward({
  title: 'Extra Screen Time',
  description: '30 minutes additional device time',
  coinCost: 15,
  category: 'privileges',
  // ... other fields
});

// Test reward request
const request = await rewardService.requestReward(userId, rewardId);

// Test popular rewards
const popular = await rewardService.getPopularRewards();
```

All database operations work perfectly in Expo Go, making it ideal for developing and testing the reward marketplace features.

---

## Sample Data

The system includes comprehensive sample data:
- **8 realistic rewards** across all categories
- **Popularity metrics** showing usage patterns
- **Availability controls** demonstrating cooldowns and limits
- **Mixed approval settings** for testing workflows

Use the Database Test Panel to create sample data and test the complete reward system workflow.
 