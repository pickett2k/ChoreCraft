# 🍎🤖 Apple & Google Play Subscription Setup Guide

## 🎯 Overview
Your ChoreCraft app is **ready for real subscriptions**! This guide shows you how to configure Apple App Store and Google Play Store in-app purchases using RevenueCat.

## 🚀 Current Status
✅ Premium system implemented  
✅ Database structure ready  
✅ UI components complete  
✅ RevenueCat integration code ready  

**You just need to configure the store accounts!**

## 📋 Prerequisites
- Apple Developer Account ($99/year)
- Google Play Developer Account ($25 one-time)  
- RevenueCat Account (free tier available)

## 🔧 Step 1: RevenueCat Setup

### Create Account
1. Sign up at [RevenueCat](https://www.revenuecat.com/)
2. Create project: **"ChoreCraft"**
3. Get API keys:
   - iOS: `appl_xxxxxxxxx`
   - Android: `goog_xxxxxxxxx`

### Update App
Replace keys in `src/services/subscriptionService.ts`:
```typescript
const REVENUECAT_API_KEY = {
  ios: 'appl_your_actual_key_here',
  android: 'goog_your_actual_key_here',
};
```

## 🍎 Step 2: Apple App Store Connect

### Create Subscription Products
**Product IDs (must match exactly):**
- `chorecraft_premium_monthly` - £2.99/month
- `chorecraft_premium_yearly` - £20.00/year

### Setup Process
1. App Store Connect → New App
2. In-App Purchases → Auto-Renewable Subscriptions  
3. Create subscription group: "ChoreCraft Premium"
4. Add both products to group

## 🤖 Step 3: Google Play Console

### Create Same Products
**Same Product IDs:**
- `chorecraft_premium_monthly` - £2.99/month
- `chorecraft_premium_yearly` - £20.00/year

### Setup Process
1. Google Play Console → Create App
2. Monetization → Subscriptions
3. Create matching products

## 🔗 Step 4: Connect RevenueCat

### Link Stores
1. RevenueCat → Apps → Apple App Store
2. Upload App Store Connect API key
3. RevenueCat → Apps → Google Play Store
4. Upload Google Play service account JSON

### Create Entitlements
1. RevenueCat → Entitlements → New
2. Create **"premium"** entitlement
3. Attach both subscription products

## 🧪 Step 5: Testing

### iOS Testing
- TestFlight with sandbox accounts
- Test purchase/cancel/restore

### Android Testing  
- Internal testing track
- Test with Google Play test accounts

## 🚀 Step 6: Launch

### Requirements
- Privacy policy mentioning subscriptions
- Terms of service updated
- Store listings describe premium features
- Screenshots show premium UI

## 💎 What Users Get

### Premium Features
✅ Unlimited custom chores  
✅ Unlimited custom rewards  
✅ Advanced scheduling  
✅ Photo proof requirements  
✅ Coin deduction penalties  
✅ Data export  
✅ Priority support  

### Payment Experience
1. Tap "Upgrade to Premium"
2. Native Apple Pay/Google Pay sheet
3. Face ID/fingerprint confirmation  
4. Instant premium unlock
5. Auto-renewal handling

## 💰 Revenue Structure

### Apple App Store
- 30% to Apple (first year)
- 15% to Apple (after year 1)
- **70%/85% to you**

### Google Play Store
- Same rates as Apple
- 30%/15% split

### RevenueCat
- **Free:** First 3,000 transactions/month
- **Paid:** $99/month unlimited

## 🎉 Ready to Launch!

Your app has everything needed for real subscriptions:

✅ **Complete backend infrastructure**  
✅ **Premium feature gating**  
✅ **Cross-platform compatibility**  
✅ **Purchase restoration**  
✅ **Analytics ready**  
✅ **User interface polished**  

## 📝 Next Steps

1. **Set up store accounts** (2-3 hours)
2. **Configure RevenueCat** (30 minutes)  
3. **Update API keys** (5 minutes)
4. **Test thoroughly** (1-2 days)
5. **Submit for review** (1-2 weeks)

Then start earning **real revenue**! 💰

## 📞 Support Resources
- **RevenueCat:** [docs.revenuecat.com](https://docs.revenuecat.com)
- **Apple:** [developer.apple.com](https://developer.apple.com)
- **Google:** [support.google.com/googleplay](https://support.google.com/googleplay)

---

**🎯 Bottom Line:** Your subscription system is production-ready. The hard work is done - now it's just configuration! Once live, users can purchase real subscriptions and you'll earn revenue from ChoreCraft! 🚀
