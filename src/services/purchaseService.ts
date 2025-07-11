import {
  initConnection,
  endConnection,
  getProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  Product,
  Purchase,
  PurchaseError,
} from 'react-native-iap';
import { Platform, Alert } from 'react-native';
import { userService, FirestoreUser } from './firestoreService';
import { subscriptionUtils } from './premiumService';
import { receiptValidationService } from './receiptValidationService';
import { discountCodeService } from './discountCodeService';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface DiscountCode {
  id: string;
  code: string;
  discountPercent: number; // 0-100 (100 = free)
  discountAmount?: number; // Fixed amount discount
  maxUses: number; // -1 for unlimited
  currentUses: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  description: string;
  usedBy: string[]; // User IDs who used this code
}

export interface PurchaseResult {
  success: boolean;
  purchase?: Purchase;
  error?: string;
  subscription?: FirestoreUser['subscription'];
}

export interface DiscountValidation {
  valid: boolean;
  error?: string;
  discountPercent?: number;
  discountAmount?: number;
  finalPrice?: number;
  code?: DiscountCode;
}

// Product IDs for different platforms
const PRODUCT_IDS = {
  ios: ['chorecraft_premium_yearly'],
  android: ['chorecraft_premium_yearly'],
};

// ============================================================================
// PURCHASE SERVICE
// ============================================================================

export const purchaseService = {
  // Initialize IAP connection
  async initializeIAP(): Promise<boolean> {
    try {
      console.log('🛒 Initializing in-app purchases...');
      const result = await initConnection();
      console.log('✅ IAP connection initialized:', result);
      
      // Set up purchase listeners
      this.setupPurchaseListeners();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize IAP:', error);
      return false;
    }
  },

  // Set up purchase event listeners
  setupPurchaseListeners() {
    // Listen for successful purchases
    purchaseUpdatedListener(async (purchase: Purchase) => {
      console.log('🛒 Purchase updated:', purchase);
      
      try {
        // Validate the purchase receipt
        const validation = await receiptValidationService.validatePurchase(purchase);
        
        if (!validation.valid) {
          console.error('❌ Purchase validation failed:', validation.error);
          Alert.alert('Purchase Error', 'Failed to validate purchase. Please contact support.');
          return;
        }

        console.log('✅ Purchase validated successfully');

        // Process the validated purchase
        await this.processValidatedPurchase(purchase, validation);
        
        // Finish the transaction
        await finishTransaction({ purchase, isConsumable: false });
        console.log('✅ Transaction finished successfully');
      } catch (error) {
        console.error('❌ Error processing purchase:', error);
        Alert.alert('Purchase Error', 'Failed to process purchase. Please contact support.');
      }
    });

    // Listen for purchase errors
    purchaseErrorListener((error: PurchaseError) => {
      console.error('❌ Purchase error:', error);
      
      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert(
          'Purchase Failed',
          'Something went wrong with your purchase. Please try again.'
        );
      }
    });
  },

  // Process a validated purchase
  async processValidatedPurchase(purchase: Purchase, validation: any): Promise<void> {
    try {
      console.log('🛒 Processing validated purchase:', purchase);
      
      // Create subscription data
      const subscriptionData = subscriptionUtils.createSubscriptionData(
        'premium_yearly',
        Platform.OS as 'ios' | 'android',
        {
          transactionId: validation.transactionId || purchase.transactionId,
          originalTransactionId: validation.originalTransactionId,
          purchaseToken: (purchase as any).purchaseToken,
          priceAmount: 20.00,
          priceCurrency: 'GBP'
        }
      );

      // Get user ID - this should be set during purchase initiation
      const userId = (purchase as any).userId || this.getCurrentUserId();
      if (!userId) {
        console.warn('⚠️ No user ID found for purchase, using fallback method');
        // In production, you should have a way to identify the user
        return;
      }

      // Update user subscription
      await userService.updateSubscription(userId, subscriptionData);
      
      console.log('✅ Purchase processed successfully for user:', userId);
      
      // Show success message
      Alert.alert(
        'Welcome to Premium! 🌟',
        'Your subscription is now active! You can now enjoy all premium features.'
      );
    } catch (error) {
      console.error('❌ Error processing validated purchase:', error);
      throw error;
    }
  },

  // Get current user ID (should be implemented based on your auth system)
  getCurrentUserId(): string | null {
    // This should be implemented to get current user ID
    // You might need to pass this from the calling component
    console.warn('⚠️ getCurrentUserId not implemented - user ID should be passed during purchase');
    return null;
  },

  // Get available products
  async getProducts(): Promise<Product[]> {
    try {
      const productIds = Platform.OS === 'ios' ? PRODUCT_IDS.ios : PRODUCT_IDS.android;
      const products = await getProducts({ skus: productIds });
      console.log('🛒 Available products:', products);
      return products;
    } catch (error) {
      console.error('❌ Failed to get products:', error);
      return [];
    }
  },

  // Purchase subscription with optional discount code
  async purchaseSubscription(
    productId: string, 
    userId: string,
    discountCode?: string
  ): Promise<PurchaseResult> {
    try {
      console.log('🛒 Starting purchase process...', { productId, userId, discountCode });
      
      // Validate discount code if provided
      let discountValidation: DiscountValidation | null = null;
      if (discountCode) {
        discountValidation = await this.validateDiscountCode(discountCode, userId);
        if (!discountValidation.valid) {
          return {
            success: false,
            error: discountValidation.error || 'Invalid discount code'
          };
        }
        
        // If 100% discount, grant premium directly without IAP
        if (discountValidation.discountPercent === 100) {
          return await this.grantPremiumWithDiscount(userId, discountCode);
        }
      }

      // Proceed with IAP purchase
      const purchase = await requestPurchase({ sku: productId });
      console.log('🛒 Purchase completed:', purchase);

      return {
        success: true,
        purchase: purchase as Purchase
      };
    } catch (error: any) {
      console.error('❌ Purchase failed:', error);
      
      if (error.code === 'E_USER_CANCELLED') {
        return { success: false, error: 'Purchase cancelled by user' };
      }
      
      return { 
        success: false, 
        error: error.message || 'Purchase failed. Please try again.' 
      };
    }
  },

  // Validate discount code
  async validateDiscountCode(code: string, userId: string): Promise<DiscountValidation> {
    try {
      // Use Firestore-based discount code service
      const result = await discountCodeService.validateAndApplyDiscountCode(code, userId);
      
      return {
        valid: result.valid,
        error: result.error,
        discountPercent: result.discountPercent,
        discountAmount: result.discountAmount,
        finalPrice: result.finalPrice,
        code: result.codeData
      };
    } catch (error) {
      console.error('❌ Error validating discount code:', error);
      return {
        valid: false,
        error: 'Failed to validate discount code'
      };
    }
  },

  // Grant premium with 100% discount code
  async grantPremiumWithDiscount(userId: string, discountCode: string): Promise<PurchaseResult> {
    try {
      console.log('🎁 Granting premium with discount code:', { userId, discountCode });
      
      // Create subscription data for free premium
      const subscriptionData = subscriptionUtils.createSubscriptionData(
        'premium_yearly',
        Platform.OS as 'ios' | 'android',
        {
          transactionId: `discount_${discountCode}_${Date.now()}`,
          priceAmount: 0.00,
          priceCurrency: 'GBP'
        }
      );
      
      // Update user with premium status
      await userService.updateUser(userId, {
        isPremium: true,
        subscription: subscriptionData
      });
      
      Alert.alert(
        'Premium Activated! 🎉',
        'Your discount code has been applied and premium features are now active!'
      );
      
      return { success: true, subscription: subscriptionData };
    } catch (error) {
      console.error('❌ Error granting premium with discount:', error);
      return { 
        success: false, 
        error: 'Failed to apply discount code. Please try again.' 
      };
    }
  },

  // Restore previous purchases
  async restorePurchases(userId: string): Promise<Purchase[]> {
    try {
      console.log('🛒 Restoring purchases for user:', userId);
      
      const purchases = await getAvailablePurchases();
      console.log('🛒 Found purchases to restore:', purchases);
      
      if (purchases.length > 0) {
        Alert.alert(
          'Purchases Restored',
          `Successfully restored ${purchases.length} purchase(s).`
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'No previous purchases found to restore.'
        );
      }
      
      return purchases;
    } catch (error) {
      console.error('❌ Failed to restore purchases:', error);
      Alert.alert('Restore Failed', 'Unable to restore purchases. Please try again.');
      return [];
    }
  },

  // Clean up IAP connection
  async cleanup(): Promise<void> {
    try {
      await endConnection();
      console.log('✅ IAP connection closed');
    } catch (error) {
      console.error('❌ Error closing IAP connection:', error);
    }
  }
};

// Admin functions for managing premium users
export const adminPurchaseService = {
  // Grant premium manually to a user
  async grantPremiumToUser(
    userId: string, 
    grantedBy: string, 
    reason: string
  ): Promise<boolean> {
    try {
      console.log('👑 Admin granting premium:', { userId, grantedBy, reason });
      
      // Create subscription data for admin-granted premium
      const subscriptionData = subscriptionUtils.createSubscriptionData(
        'premium_yearly',
        Platform.OS as 'ios' | 'android',
        {
          transactionId: `admin_grant_${Date.now()}`,
          priceAmount: 0.00,
          priceCurrency: 'GBP'
        }
      );
      
      // Update user with premium status
      await userService.updateUser(userId, {
        isPremium: true,
        subscription: subscriptionData
      });
      
      console.log('✅ Premium granted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error granting premium:', error);
      return false;
    }
  },

  // Revoke premium from a user
  async revokePremiumFromUser(
    userId: string, 
    revokedBy: string, 
    reason: string
  ): Promise<boolean> {
    try {
      console.log('🚫 Admin revoking premium:', { userId, revokedBy, reason });
      
      await userService.updateUser(userId, {
        isPremium: false,
        subscription: undefined
      });
      
      console.log('✅ Premium revoked successfully');
      return true;
    } catch (error) {
      console.error('❌ Error revoking premium:', error);
      return false;
    }
  }
};

export default purchaseService;
