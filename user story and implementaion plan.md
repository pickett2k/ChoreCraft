# Sweepy+ Clone – Project Specification

## 1. ✨ User Stories

### Household & Onboarding

* As a user, I can sign up/log in via email or magic link.
* As a parent, I can create a household and invite others via a code.
* As a user, I can join a household using an invite code or link.
* As a parent, I can assign roles (Parent or Child) to household members.

### Chore Management

* As a parent, I can create one-off or repeating chores.
* As a parent, I can assign chores to members.
* As a parent, I can upload a "before" photo for each chore.
* As a child, I can view assigned chores and upload an "after" photo when completed.
* As a parent, I can verify completed chores and issue rewards.

### Rewards

* As a parent, I can assign value to each chore (coins or GBP).
* As a parent, I can switch between virtual (coins) or real money (GBP).
* As a parent, I can define a coin-reward table.
* As a child, I can view my coin/GBP balance and reward history.
* As a parent, I can mark chores as paid and send notifications.

### Notifications

* Users receive push notifications for:

  * New task assignments
  * Task reminders
  * Task completion
  * Reward/payment issued

---

## 2. 📊 Technical Requirements

### Frontend (React Native + Expo)

* User Authentication (email, magic link)
* Household Creation & Invite Code Join
* Role Selection (Parent/Child)
* Chore List Views (Daily, Weekly, Assigned)
* Chore Creation Form with Frequency
* Image Picker & Upload (before/after)
* Reward Tracker (coins / GBP toggle)
* Reward Issuer UI with Payment Status
* Push Notifications via Expo
* Offline Mode (AsyncStorage + Sync)
* In-app purchase support (Apple/Google)

### Backend (Firebase – preferred)

* Auth (magic link / email)
* Firestore Database for:

  * Users (with `isPremium` flag)
  * Households
  * Roles
  * Chores
  * Photos
  * Payments
* Firebase Storage for images
* Push notification tokens
* Role-based access control (Parent vs Child)
* Premium tier flags stored and manageable via Firebase Console (for manual override or dev access)

### Optional Integrations

* Stripe API for subscription or one-time purchases
* Admin dashboard (internal use)

---

## 3. ⚖️ Implementation Plan (AI Agent-Friendly)

### Phase 1: Core Setup

1. Set up Expo project with navigation and basic screen structure
2. Integrate Firebase Auth with email login
3. Enable household creation + joining with invite code
4. Set user role (Parent/Child) on registration

### Phase 2: Chore Engine MVP

1. Create chore schema (task name, frequency, assigned to, reward value, before photo, etc.)
2. Build chore creation form (Parent only)
3. Build chore list view (Today, Upcoming, Completed)
4. Enable chore completion with after photo upload

### Phase 3: Rewards Engine

1. Add reward type selector (coins or GBP) at household level
2. Add coin-to-reward conversion chart (editable by Parent)
3. Show user reward balance (total coins/GBP)
4. Add reward issuance flow: Parent approves + marks as paid
5. Log reward history

### Phase 4: Notifications

1. Register for Expo push notifications per user
2. Send push notification on:

   * Task assignment
   * Task due reminder
   * Task completed
   * Reward issued

### Phase 5: Offline Sync & Polish

1. Store key chore and reward data in AsyncStorage
2. Add local caching and sync logic with backend
3. UI improvements and onboarding polish

### Phase 6: Optional Extensions

* Stripe or In-App Purchases for Premium Tier

  * Basic Free Tier: limited members, no image uploads, no reward tracking
  * Premium: all features unlocked
  * Manual premium flag override using Firebase Console (`isPremium=true` per user or household)
* Admin dashboard for oversight
* Gamification features (badges, streaks)

---

## 4. 💸 Monetization Strategy Options

### Option A: Freemium Model (Recommended)

* **Free Tier**:

  * 1 household
  * 3 members max
  * Limited tasks/week
  * No photo uploads or reward tracking

* **Premium Tier** (via Stripe or IAP):

  * Unlimited households and members
  * Photo support (before/after)
  * Full reward and payment tracking
  * Notifications and history logs

* **Developer Bypass**:

  * Set `isPremium=true` manually in Firebase Console for specific user or household
  * Optional local override for developer testing

### Option B: One-Time Purchase

* Charge **£9.99** on app stores
* No free tier
* Pros: No IAP headaches, no ongoing infra logic
* Cons: No trial experience, less discoverability, no recurring revenue

---

Let me know if you'd like Firebase schema mockups, rules for `isPremium`, or Stripe logic scaffolding.
