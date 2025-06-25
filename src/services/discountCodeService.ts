import { 
  doc, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp, 
  Timestamp,
  writeBatch,
  setDoc,
  increment
} from 'firebase/firestore';
import { db } from './firebase';
import { DiscountCode } from './purchaseService';

// ============================================================================
// DISCOUNT CODE SERVICE
// ============================================================================

export const discountCodeService = {
  // Get discount code by code string
  async getDiscountCodeByCode(code: string): Promise<DiscountCode | null> {
    try {
      if (!db) {
        console.error('❌ Firestore not initialized');
        return null;
      }

      const q = query(
        collection(db, 'discountCodes'),
        where('code', '==', code.toUpperCase()),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      
      return {
        id: doc.id,
        code: data.code,
        discountPercent: data.discountPercent,
        discountAmount: data.discountAmount,
        maxUses: data.maxUses,
        currentUses: data.currentUses,
        validFrom: data.validFrom.toDate(),
        validUntil: data.validUntil.toDate(),
        isActive: data.isActive,
        createdBy: data.createdBy,
        createdAt: data.createdAt.toDate(),
        description: data.description,
        usedBy: data.usedBy || []
      };
    } catch (error) {
      console.error('❌ Error getting discount code:', error);
      return null;
    }
  },

  // Validate and apply discount code
  async validateAndApplyDiscountCode(code: string, userId: string): Promise<{
    valid: boolean;
    error?: string;
    discountPercent?: number;
    discountAmount?: number;
    finalPrice?: number;
    codeData?: DiscountCode;
  }> {
    try {
      const discountCode = await this.getDiscountCodeByCode(code);
      
      if (!discountCode) {
        return { valid: false, error: 'Invalid discount code' };
      }
      
      // Check if code is active
      if (!discountCode.isActive) {
        return { valid: false, error: 'This discount code is no longer active' };
      }
      
      // Check if code is still valid (date range)
      const now = new Date();
      if (now < discountCode.validFrom || now > discountCode.validUntil) {
        return { valid: false, error: 'This discount code has expired' };
      }
      
      // Check usage limits
      if (discountCode.maxUses !== -1 && discountCode.currentUses >= discountCode.maxUses) {
        return { valid: false, error: 'This discount code has reached its usage limit' };
      }
      
      // Check if user already used this code
      if (discountCode.usedBy.includes(userId)) {
        return { valid: false, error: 'You have already used this discount code' };
      }
      
      // Calculate final price
      const originalPrice = 20.00;
      const discountAmount = discountCode.discountAmount || 
        (originalPrice * discountCode.discountPercent / 100);
      const finalPrice = Math.max(0, originalPrice - discountAmount);
      
      return {
        valid: true,
        discountPercent: discountCode.discountPercent,
        discountAmount: discountAmount,
        finalPrice: finalPrice,
        codeData: discountCode
      };
    } catch (error) {
      console.error('❌ Error validating discount code:', error);
      return { valid: false, error: 'Failed to validate discount code' };
    }
  },

  // Create a new discount code
  async createDiscountCode(codeData: Omit<DiscountCode, 'id' | 'createdAt' | 'currentUses' | 'usedBy'>): Promise<{ success: boolean; error?: string; codeId?: string }> {
    try {
      if (!db) {
        console.error('❌ Firestore not initialized');
        return {
          success: false,
          error: 'Firestore not initialized'
        };
      }

      console.log('📝 Creating discount code:', codeData);
      
      // Check if code already exists
      const existingCode = await this.getDiscountCodeByCode(codeData.code);
      if (existingCode) {
        return {
          success: false,
          error: 'A discount code with this code already exists'
        };
      }
      
      const discountCodeData = {
        ...codeData,
        createdAt: serverTimestamp(),
        currentUses: 0,
        usedBy: []
      };
      
      const docRef = await addDoc(collection(db, 'discountCodes'), discountCodeData);
      
      console.log('✅ Discount code created successfully:', docRef.id);
      return {
        success: true,
        codeId: docRef.id
      };
    } catch (error) {
      console.error('❌ Error creating discount code:', error);
      return {
        success: false,
        error: 'Failed to create discount code'
      };
    }
  },

  // Initialize default discount codes (run once during setup)
  async initializeDefaultDiscountCodes(): Promise<void> {
    try {
      console.log('🔧 Initializing default discount codes...');
      
      const defaultCodes = [
        {
          code: 'FREE100',
          discountPercent: 100,
          discountAmount: 20.00,
          maxUses: 10,
          validFrom: new Date('2024-01-01'),
          validUntil: new Date('2024-12-31'),
          isActive: true,
          createdBy: 'system',
          description: 'Free premium for early users'
        },
        {
          code: 'SAVE50',
          discountPercent: 50,
          discountAmount: 10.00,
          maxUses: 100,
          validFrom: new Date('2024-01-01'),
          validUntil: new Date('2024-12-31'),
          isActive: true,
          createdBy: 'system',
          description: '50% off premium subscription'
        }
      ];
      
      for (const codeData of defaultCodes) {
        const existing = await this.getDiscountCodeByCode(codeData.code);
        if (!existing) {
          await this.createDiscountCode(codeData);
          console.log(`✅ Created default discount code: ${codeData.code}`);
        } else {
          console.log(`ℹ️ Default discount code already exists: ${codeData.code}`);
        }
      }
      
      console.log('✅ Default discount codes initialization complete');
    } catch (error) {
      console.error('❌ Error initializing default discount codes:', error);
    }
  }
};

export default discountCodeService; 