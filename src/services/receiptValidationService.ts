import { Platform } from 'react-native';
import { Purchase } from 'react-native-iap';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  transactionId?: string;
  originalTransactionId?: string;
  purchaseDate?: Date;
  expiresDate?: Date;
  productId?: string;
  bundleId?: string;
  environment?: 'sandbox' | 'production';
}

export interface iOSReceiptData {
  'receipt-data': string;
  password?: string; // App-specific shared secret
}

export interface AndroidReceiptData {
  packageName: string;
  productId: string;
  purchaseToken: string;
}

// ============================================================================
// RECEIPT VALIDATION SERVICE
// ============================================================================

export const receiptValidationService = {
  // Main validation function that routes to platform-specific validation
  async validatePurchase(purchase: Purchase): Promise<ValidationResult> {
    try {
      console.log('🔍 Validating purchase:', purchase);
      
      if (Platform.OS === 'ios') {
        return await this.validateiOSReceipt(purchase);
      } else if (Platform.OS === 'android') {
        return await this.validateAndroidPurchase(purchase);
      } else {
        return {
          valid: false,
          error: 'Unsupported platform for purchase validation'
        };
      }
    } catch (error) {
      console.error('❌ Receipt validation error:', error);
      return {
        valid: false,
        error: 'Failed to validate purchase receipt'
      };
    }
  },

  // iOS Receipt Validation
  async validateiOSReceipt(purchase: Purchase): Promise<ValidationResult> {
    try {
      const receiptData = (purchase as any).transactionReceipt;
      if (!receiptData) {
        // Fallback to basic validation if no receipt data
        return this.validateBasicPurchaseData(purchase);
      }

      // For production, you should validate with your backend server
      const result = await this.validateWithAppleServer(receiptData);
      
      if (result.valid) {
        return {
          valid: true,
          transactionId: purchase.transactionId,
          originalTransactionId: (purchase as any).originalTransactionId,
          purchaseDate: new Date(purchase.transactionDate),
          productId: purchase.productId,
          environment: result.environment
        };
      }
      
      return result;
    } catch (error) {
      console.error('❌ iOS receipt validation error:', error);
      // Fallback to basic validation
      return this.validateBasicPurchaseData(purchase);
    }
  },

  // Android Purchase Validation
  async validateAndroidPurchase(purchase: Purchase): Promise<ValidationResult> {
    try {
      const purchaseToken = (purchase as any).purchaseToken;
      if (!purchaseToken) {
        // Fallback to basic validation if no purchase token
        return this.validateBasicPurchaseData(purchase);
      }

      // For production, you should validate with your backend server
      const result = await this.validateWithGooglePlay(purchase.productId, purchaseToken);
      
      if (result.valid) {
        return {
          valid: true,
          transactionId: purchase.transactionId,
          purchaseDate: new Date(purchase.transactionDate),
          productId: purchase.productId,
          environment: 'production'
        };
      }
      
      return result;
    } catch (error) {
      console.error('❌ Android purchase validation error:', error);
      // Fallback to basic validation
      return this.validateBasicPurchaseData(purchase);
    }
  },

  // Apple Server Validation (should be done on your backend)
  async validateWithAppleServer(receiptData: string): Promise<ValidationResult> {
    try {
      const requestData: iOSReceiptData = {
        'receipt-data': receiptData,
      };

      // Try production first, then sandbox
      let response = await this.callAppleValidationAPI(requestData, 'production');
      
      if (response.status === 21007) {
        // Receipt is from sandbox, try sandbox endpoint
        response = await this.callAppleValidationAPI(requestData, 'sandbox');
      }

      if (response.status === 0) {
        // Valid receipt
        const receipt = response.receipt;
        const latestReceiptInfo = response.latest_receipt_info?.[0];
        
        return {
          valid: true,
          transactionId: latestReceiptInfo?.transaction_id || receipt.in_app?.[0]?.transaction_id,
          originalTransactionId: latestReceiptInfo?.original_transaction_id,
          purchaseDate: new Date(parseInt(latestReceiptInfo?.purchase_date_ms || receipt.in_app?.[0]?.purchase_date_ms)),
          expiresDate: latestReceiptInfo?.expires_date_ms ? new Date(parseInt(latestReceiptInfo.expires_date_ms)) : undefined,
          productId: latestReceiptInfo?.product_id || receipt.in_app?.[0]?.product_id,
          bundleId: receipt.bundle_id,
          environment: response.environment
        };
      } else {
        return {
          valid: false,
          error: `Apple validation failed with status: ${response.status}`
        };
      }
    } catch (error) {
      console.error('❌ Apple server validation error:', error);
      return {
        valid: false,
        error: 'Failed to validate with Apple servers'
      };
    }
  },

  // Google Play Validation (should be done on your backend)
  async validateWithGooglePlay(productId: string, purchaseToken: string): Promise<ValidationResult> {
    try {
      if (!productId || !purchaseToken) {
        return {
          valid: false,
          error: 'Missing product ID or purchase token'
        };
      }

      console.log('🔍 Validating with Google Play:', { productId, purchaseToken });
      
      // Simplified validation - in production, replace with actual API call to your backend
      return {
        valid: true,
        productId: productId,
        environment: 'production'
      };
    } catch (error) {
      console.error('❌ Google Play validation error:', error);
      return {
        valid: false,
        error: 'Failed to validate with Google Play'
      };
    }
  },

  // Call Apple's validation API (should be done on backend)
  async callAppleValidationAPI(receiptData: iOSReceiptData, environment: 'production' | 'sandbox'): Promise<any> {
    const url = environment === 'production' 
      ? 'https://buy.itunes.apple.com/verifyReceipt'
      : 'https://sandbox.itunes.apple.com/verifyReceipt';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(receiptData),
    });

    if (!response.ok) {
      throw new Error(`Apple API request failed: ${response.status}`);
    }

    const result = await response.json();
    result.environment = environment;
    return result;
  },

  // Basic client-side validation (fallback)
  validateBasicPurchaseData(purchase: Purchase): ValidationResult {
    try {
      // Basic validation checks
      if (!purchase.transactionId) {
        return { valid: false, error: 'Missing transaction ID' };
      }

      if (!purchase.productId) {
        return { valid: false, error: 'Missing product ID' };
      }

      if (!purchase.transactionDate) {
        return { valid: false, error: 'Missing transaction date' };
      }

      // Check if purchase is recent (within last 24 hours for extra security)
      const purchaseDate = new Date(purchase.transactionDate);
      const now = new Date();
      const hoursDiff = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        console.warn('⚠️ Purchase is older than 24 hours, may need additional validation');
      }

      return {
        valid: true,
        transactionId: purchase.transactionId,
        purchaseDate: purchaseDate,
        productId: purchase.productId
      };
    } catch (error) {
      console.error('❌ Basic validation error:', error);
      return {
        valid: false,
        error: 'Basic validation failed'
      };
    }
  }
};

export default receiptValidationService;
