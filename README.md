# ChoreCraft - Household Chore Management App

A modern React Native app built with Expo for managing household chores, rewards, and gamification.

## 🚀 Current Status

The app is currently in **development mode** with a robust authentication system that includes:

### ✅ Working Features
- **Fallback Authentication System**: Works with or without Firebase
- **Modern Home Screen**: Clean UI with user stats and quick actions
- **Tab Navigation**: Home, Chores, Calendar, Exchange, Settings
- **Mock Data**: Comprehensive chore management system ready for Firebase integration
- **Role-Based UI**: Admin vs Member user experiences
- **Professional Email System**: Direct email sending via Resend API for invitations and welcome messages

### 🔧 Authentication System

The app uses a **dual-mode authentication system**:

1. **Firebase Mode**: When Firebase is properly configured, uses real authentication
2. **Fallback Mode**: When Firebase is unavailable, uses mock authentication for testing

**For Development/Testing:**
- Any email/password combination works
- **Consistent User IDs**: Each email creates the same user ID (`user-` + normalized email)
- **Firestore Integration**: Mock users are automatically created in the database
- Sign In → Creates admin user (150 coins, £25.50)  
- Sign Up → Creates member user (0 coins, £0.00)

**User ID Examples:**
- `test@example.com` → `user-test-example-com`
- `admin@test.com` → `user-admin-test-com`

### 🎯 App Flow

```
Login Screen → Tab Navigation → Home Screen
```

- **Login Screen**: Always loads first, handles auth gracefully
- **Home Screen**: Modern dashboard with user stats and actions
- **Navigation**: Bottom tabs for different app sections

## ⚠️ **CRITICAL: Expo Go Limitations**

### **🚨 Firebase Services That DON'T Work in Expo Go:**

**Authentication & Push Notifications require native modules and will NOT work in Expo Go:**

- ✅ **Firestore Database** - Works perfectly in Expo Go
- ✅ **Cloud Storage** - Works perfectly in Expo Go  
- ✅ **Cloud Functions** - Works perfectly in Expo Go
- ❌ **Firebase Auth** - Requires native build (falls back to mock mode)
- ❌ **Push Notifications** - Requires native build
- ❌ **App Check** - Requires native build
- ❌ **Analytics** - Requires native build

### **📱 Development Strategy:**

**Expo Go (Current Development):**
- Perfect for testing UI, navigation, and business logic
- Database operations work normally
- Storage operations work normally
- Auth system falls back to mock mode (any login works)
- Push notifications cannot be tested

**Production/Development Build Required For:**
- Real Firebase Authentication
- Push Notifications
- App Check enforcement
- Analytics tracking

### **🔄 Testing Workflow:**

1. **Expo Go Phase**: Test all UI, navigation, database, storage features
2. **Development Build Phase**: Test auth, notifications, and native features
3. **Production Build Phase**: Final testing with all features enabled

**Remember: Don't waste time trying to fix Firebase Auth in Expo Go - it's designed to use the fallback system!**

## 📱 Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Testing the App

1. **Start the app** - Login screen should load without errors
2. **Login with any credentials**:
   - Email: `test@example.com`
   - Password: `password123`
3. **Explore the app**:
   - Home screen with user dashboard
   - Navigate through tabs
   - All features work with mock data

## 🔥 Firebase Integration (Optional)

To enable real Firebase authentication:

1. **Create Firebase Project**
2. **Add your config to `app.json`**:
```json
{
  "expo": {
    "extra": {
      "firebase": {
        "apiKey": "your-api-key",
        "authDomain": "your-project.firebaseapp.com",
        "projectId": "your-project-id",
        "storageBucket": "your-project.appspot.com",
        "messagingSenderId": "123456789",
        "appId": "1:123456789:web:abcdef123456",
        "measurementId": "G-ABCDEF123"
      }
    }
  }
}
```

3. **Environment Variables** (optional):
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
EXPO_PUBLIC_FIREBASE_MEASUREMENTID=G-ABCDEF123
```

## 📧 Email Integration

The app includes a professional email system using **Resend** for sending transactional emails:

### Features
- **Direct Email Sending**: No user interaction required
- **Professional Templates**: HTML emails with ChoreCraft branding
- **Invitation Emails**: Automatically sent when inviting household members
- **Welcome Emails**: Sent when users accept invitations
- **Development Testing**: Test button available in development builds

### Configuration
- **Provider**: Resend (resend.com)
- **Domain**: formcraft.co.uk
- **Cost**: Free tier (3,000 emails/month)

For detailed information, see [RESEND_EMAIL_INTEGRATION.md](RESEND_EMAIL_INTEGRATION.md)

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React Native + Expo + TypeScript
- **Navigation**: Expo Router
- **State Management**: React Context
- **Authentication**: Firebase Auth (with fallback)
- **Database**: Firebase Firestore (planned)
- **Storage**: Firebase Storage (planned)

### Project Structure
```
src/
├── components/     # Reusable UI components
├── contexts/       # React contexts (AuthContext)
├── screens/        # Main screen components
├── services/       # Firebase and API services
├── storage/        # AsyncStorage utilities
└── types/          # TypeScript type definitions

app/
├── (tabs)/         # Tab navigation screens
├── login.tsx       # Login screen
└── _layout.tsx     # Root layout
```

## 🎮 Features Planned

### Phase 1: Core Features (Current)
- ✅ Authentication system
- ✅ User dashboard
- ✅ Basic navigation
- 🔄 Chore management
- 🔄 Reward system

### Phase 2: Firebase Integration
- 📋 Real authentication
- 📋 Firestore database
- 📋 Real-time updates
- 📋 Photo uploads

### Phase 3: Advanced Features
- 📋 Household management
- 📋 Push notifications
- 📋 Offline sync
- 📋 Gamification

## 🐛 Troubleshooting

### Common Issues

**"Component auth has not been registered yet"**
- This is expected during development
- The app automatically falls back to mock mode
- All features still work for testing

**Login screen not loading**
- Check console for errors
- Ensure all dependencies are installed
- Try restarting the development server

**Navigation issues**
- Clear Expo cache: `expo start -c`
- Restart the app completely

## 📝 Development Notes

- **Mock Data**: All chore data is currently mocked for UI development
- **Firebase Ready**: Code is structured for easy Firebase integration
- **TypeScript**: Full type safety throughout the app
- **Responsive**: Works on iOS and Android
- **Development Friendly**: Clear logging and error handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Current Version**: Development Preview  
**Last Updated**: December 2024  
**Status**: Ready for Firebase integration and feature development 