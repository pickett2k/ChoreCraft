/**
 * SUBSCRIPTION SERVICE
 * Handles Apple App Store and Google Play Store subscriptions using RevenueCat
 */

import Purchases, { 
  CustomerInfo,
} from 'react-native-purchases';
import { Platform, Alert } from 'react-native';
import { userService } from './firestoreService';
import { subscriptionUtils } from './premiumService';

// RevenueCat API Keys (get from environment variables for security)
const REVENUECAT_API_KEY = {
  ios: process.env.REVENUECAT_IOS_API_KEY || 'appl_YOUR_IOS_API_KEY_HERE',
  android: process.env.REVENUECAT_ANDROID_API_KEY || 'goog_YOUR_ANDROID_API_KEY_HERE',
};

// Product IDs (get from environment variables or use defaults)
export const SUBSCRIPTION_PRODUCTS = {
  PREMIUM_MONTHLY: process.env.SUBSCRIPTION_MONTHLY_PRODUCT_ID || 'chorecraft_premium_monthly',
  PREMIUM_YEARLY: process.env.SUBSCRIPTION_YEARLY_PRODUCT_ID || 'chorecraft_premium_yearly',
} as const;

export interface SubscriptionOffering {
  identifier: string;
  packages: SubscriptionPackage[];
}

export interface SubscriptionPackage {
  identifier: string;
  product: {
    identifier: string;
    description: string;
    title: string;
    price: number;
    priceString: string;
    currencyCode: string;
  };
  packageType: string;
}

export interface PurchaseResult {
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
  cancelled?: boolean;
}

class SubscriptionService {
  private isInitialized = false;
  private currentUserId: string | null = null;

  /**
   * Initialize RevenueCat SDK
   * Call this when the app starts and user logs in
   */
  async initialize(userId?: string): Promise<boolean> {
    try {
      console.log('🔄 Initializing RevenueCat...');
      
      // Get the appropriate API key for the platform
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY.ios : REVENUECAT_API_KEY.android;
      
      if (!apiKey || apiKey.includes('YOUR_')) {
        console.warn('⚠️ RevenueCat API key not configured. Please set REVENUECAT_IOS_API_KEY and REVENUECAT_ANDROID_API_KEY in your .env file');
        return false;
      }

      // Configure RevenueCat
      await Purchases.configure({ apiKey });
      
      // Set user ID if provided
      if (userId) {
        await this.setUserId(userId);
      }

      // Enable debug logs in development
      if (__DEV__) {
        await Purchases.setLogLevel('DEBUG' as any);
      }

      this.isInitialized = true;
      console.log('✅ RevenueCat initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize RevenueCat:', error);
      return false;
    }
  }

  /**
   * Set the user ID for RevenueCat
   * This links purchases to your user in the database
   */
  async setUserId(userId: string): Promise<void> {
    try {
      if (!this.isInitialized) {
        console.warn('RevenueCat not initialized');
        return;
      }

      await Purchases.logIn(userId);
      this.currentUserId = userId;
      console.log('✅ RevenueCat user ID set:', userId);
      
    } catch (error) {
      console.error('❌ Failed to set RevenueCat user ID:', error);
    }
  }

  /**
   * Get available subscription offerings
   */
  async getOfferings(): Promise<SubscriptionOffering[]> {
    try {
      if (!this.isInitialized) {
        console.warn('RevenueCat not initialized, returning empty offerings');
        return [];
      }

      const offerings = await Purchases.getOfferings();
      
      if (!offerings.current) {
        console.warn('No current offering available');
        return [];
      }

      // Convert RevenueCat offerings to our format
      const subscriptionOfferings: SubscriptionOffering[] = Object.values(offerings.all).map(offering => ({
        identifier: offering.identifier,
        packages: offering.availablePackages.map(pkg => ({
          identifier: pkg.identifier,
          product: {
            identifier: pkg.product.identifier,
            description: pkg.product.description,
            title: pkg.product.title,
            price: pkg.product.price,
            priceString: pkg.product.priceString,
            currencyCode: pkg.product.currencyCode,
          },
          packageType: pkg.packageType as string,
        })),
      }));

      console.log('✅ Retrieved subscription offerings:', subscriptionOfferings.length);
      return subscriptionOfferings;
      
    } catch (error) {
      console.error('❌ Failed to get offerings:', error);
      return [];
    }
  }

  /**
   * Purchase a subscription package
   */
  async purchasePackage(packageToPurchase: SubscriptionPackage): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        return {
          success: false,
          error: 'Subscription service not initialized'
        };
      }

      console.log('🛒 Attempting to purchase:', packageToPurchase.identifier);
      
      // Get the actual RevenueCat package
      const offerings = await Purchases.getOfferings();
      const offering = offerings.current;
      
      if (!offering) {
        return {
          success: false,
          error: 'No subscription offerings available'
        };
      }

      const rcPackage = offering.availablePackages.find(
        pkg => pkg.identifier === packageToPurchase.identifier
      );

      if (!rcPackage) {
        return {
          success: false,
          error: 'Subscription package not found'
        };
      }

      // Make the purchase
      const purchaseResult = await Purchases.purchasePackage(rcPackage);
      
      console.log('✅ Purchase successful:', purchaseResult.customerInfo.entitlements.active);
      
      // Update user's premium status in our database
      if (this.currentUserId && purchaseResult.customerInfo.entitlements.active['premium']) {
        await this.updateUserPremiumStatus(this.currentUserId, purchaseResult.customerInfo);
      }

      return {
        success: true,
        customerInfo: purchaseResult.customerInfo
      };
      
    } catch (error) {
      console.error('❌ Purchase failed:', error);
      
      // Handle user cancellation
      if (error && typeof error === 'object' && 'code' in error) {
        if ((error as any).code === 'PURCHASE_CANCELLED') {
          return {
            success: false,
            cancelled: true,
            error: 'Purchase was cancelled'
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed'
      };
    }
  }

  /**
   * Restore previous purchases
   * Important for users switching devices or reinstalling
   */
  async restorePurchases(): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        return {
          success: false,
          error: 'Subscription service not initialized'
        };
      }

      console.log('🔄 Restoring purchases...');
      
      const customerInfo = await Purchases.restorePurchases();
      
      // Update user's premium status based on restored purchases
      if (this.currentUserId && customerInfo.entitlements.active['premium']) {
        await this.updateUserPremiumStatus(this.currentUserId, customerInfo);
      }

      console.log('✅ Purchases restored successfully');
      
      return {
        success: true,
        customerInfo
      };
      
    } catch (error) {
      console.error('❌ Failed to restore purchases:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore purchases'
      };
    }
  }

  /**
   * Get current customer info and subscription status
   */
  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      if (!this.isInitialized) {
        return null;
      }

      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
      
    } catch (error) {
      console.error('❌ Failed to get customer info:', error);
      return null;
    }
  }

  /**
   * Check if user has active premium subscription
   */
  async hasActivePremiumSubscription(): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();
      
      if (!customerInfo) {
        return false;
      }

      // Check if user has active premium entitlement
      const premiumEntitlement = customerInfo.entitlements.active['premium'];
      return !!premiumEntitlement;
      
    } catch (error) {
      console.error('❌ Failed to check premium status:', error);
      return false;
    }
  }

  /**
   * Update user's premium status in our Firestore database
   * This syncs RevenueCat data with our app's user data
   */
  private async updateUserPremiumStatus(userId: string, customerInfo: CustomerInfo): Promise<void> {
    try {
      const premiumEntitlement = customerInfo.entitlements.active['premium'];
      
      if (premiumEntitlement) {
        // User has active premium subscription
        const subscriptionData = subscriptionUtils.createSubscriptionData(
          premiumEntitlement.productIdentifier === SUBSCRIPTION_PRODUCTS.PREMIUM_YEARLY ? 'premium_yearly' : 'premium_monthly',
          Platform.OS === 'ios' ? 'ios' : 'android',
          {
            transactionId: premiumEntitlement.latestPurchaseDate || 'revenuecat_managed',
            originalTransactionId: premiumEntitlement.originalPurchaseDate || undefined,
            priceAmount: 0, // RevenueCat manages pricing
            priceCurrency: 'GBP'
          }
        );

        await userService.updateUser(userId, {
          isPremium: true,
          subscription: subscriptionData
        });

        console.log('✅ User premium status updated in database');
      } else {
        // User doesn't have active premium subscription
        await userService.updateUser(userId, {
          isPremium: false
        });

        console.log('✅ User premium status removed from database');
      }
      
    } catch (error) {
      console.error('❌ Failed to update user premium status:', error);
    }
  }

  /**
   * Show subscription management screen
   * iOS: Opens Settings app subscription management
   * Android: Shows instructions for Google Play
   */
  async showManageSubscriptions(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await Purchases.showManageSubscriptions();
      } else {
        Alert.alert(
          'Manage Subscriptions',
          'To manage your subscription:\n\n1. Open Google Play Store\n2. Tap your profile picture\n3. Go to Payments & subscriptions\n4. Select Subscriptions',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Failed to show manage subscriptions:', error);
      Alert.alert('Error', 'Unable to open subscription management');
    }
  }

  /**
   * Get detailed subscription status for display in UI
   */
  async getSubscriptionStatus(): Promise<{
    isActive: boolean;
    productId?: string;
    expirationDate?: string;
    willRenew?: boolean;
  }> {
    try {
      const customerInfo = await this.getCustomerInfo();
      
      if (!customerInfo) {
        return { isActive: false };
      }

      const premiumEntitlement = customerInfo.entitlements.active['premium'];
      
      if (premiumEntitlement) {
        return {
          isActive: true,
          productId: premiumEntitlement.productIdentifier,
          expirationDate: premiumEntitlement.expirationDate || undefined,
          willRenew: premiumEntitlement.willRenew
        };
      }

      return { isActive: false };
      
    } catch (error) {
      console.error('❌ Failed to get subscription status:', error);
      return { isActive: false };
    }
  }

  /**
   * Logout user from RevenueCat
   * Call this when user logs out of your app
   */
  async logout(): Promise<void> {
    try {
      if (this.isInitialized) {
        await Purchases.logOut();
        this.currentUserId = null;
        console.log('✅ RevenueCat user logged out');
      }
    } catch (error) {
      console.error('❌ Failed to logout from RevenueCat:', error);
    }
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();

export default subscriptionService; 