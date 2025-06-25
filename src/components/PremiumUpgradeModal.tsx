import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { premiumService } from '../services/premiumService';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionService } from '../services/subscriptionService';

interface PremiumUpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  blockedFeature?: string;
}

const PremiumUpgradeModal: React.FC<PremiumUpgradeModalProps> = ({
  visible,
  onClose,
  blockedFeature
}) => {
  const { user, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(false);

  const plans = premiumService.getSubscriptionPlans();
  const premiumPlan = plans.find(p => p.id === 'premium_yearly');
  const freePlan = plans.find(p => p.id === 'free');

  const handleUpgradeMonthly = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Check if RevenueCat is initialized
      const isInitialized = await subscriptionService.initialize(user.id);
      
      if (!isInitialized) {
        // Fallback to demo upgrade if RevenueCat not configured
        console.log('Using demo upgrade - RevenueCat not configured');
        try {
          await premiumService.upgradeToPremium(user.id);
          await refreshUserData();
          Alert.alert('Success!', 'Premium subscription activated! 🎉');
          onClose();
        } catch (error) {
          Alert.alert('Error', 'Failed to upgrade to premium. Please try again.');
        }
        return;
      }

      // Try to get real subscription offerings
      const offerings = await subscriptionService.getOfferings();
      
      if (offerings.length === 0) {
        // No real offerings available, use demo
        console.log('No RevenueCat offerings available, using demo upgrade');
        try {
          await premiumService.upgradeToPremium(user.id);
          await refreshUserData();
          Alert.alert('Success!', 'Premium subscription activated! 🎉');
          onClose();
        } catch (error) {
          Alert.alert('Error', 'Failed to upgrade to premium. Please try again.');
        }
        return;
      }

      // Find monthly package
      const monthlyPackage = offerings[0]?.packages.find(pkg => 
        pkg.product.identifier.includes('monthly')
      );

      if (monthlyPackage) {
        // Use real RevenueCat purchase
        const result = await subscriptionService.purchasePackage(monthlyPackage);
        
        if (result.success) {
          await refreshUserData();
          Alert.alert('Success!', 'Premium subscription activated! 🎉');
          onClose();
        } else if (result.cancelled) {
          // User cancelled, no need to show error
          console.log('Purchase cancelled by user');
        } else {
          Alert.alert('Purchase Failed', result.error || 'Unable to complete purchase');
        }
      } else {
        // Fallback to demo if package not found
        try {
          await premiumService.upgradeToPremium(user.id);
          await refreshUserData();
          Alert.alert('Success!', 'Premium subscription activated! 🎉');
          onClose();
        } catch (error) {
          Alert.alert('Error', 'Failed to upgrade to premium. Please try again.');
        }
      }
      
    } catch (error) {
      console.error('Monthly upgrade error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeYearly = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Check if RevenueCat is initialized
      const isInitialized = await subscriptionService.initialize(user.id);
      
      if (!isInitialized) {
        // Fallback to demo upgrade if RevenueCat not configured
        console.log('Using demo upgrade - RevenueCat not configured');
        try {
          await premiumService.upgradeToPremium(user.id);
          await refreshUserData();
          Alert.alert('Success!', 'Premium subscription activated! 🎉');
          onClose();
        } catch (error) {
          Alert.alert('Error', 'Failed to upgrade to premium. Please try again.');
        }
        return;
      }

      // Try to get real subscription offerings
      const offerings = await subscriptionService.getOfferings();
      
      if (offerings.length === 0) {
        // No real offerings available, use demo
        console.log('No RevenueCat offerings available, using demo upgrade');
        try {
          await premiumService.upgradeToPremium(user.id);
          await refreshUserData();
          Alert.alert('Success!', 'Premium subscription activated! 🎉');
          onClose();
        } catch (error) {
          Alert.alert('Error', 'Failed to upgrade to premium. Please try again.');
        }
        return;
      }

      // Find yearly package
      const yearlyPackage = offerings[0]?.packages.find(pkg => 
        pkg.product.identifier.includes('yearly')
      );

      if (yearlyPackage) {
        // Use real RevenueCat purchase
        const result = await subscriptionService.purchasePackage(yearlyPackage);
        
        if (result.success) {
          await refreshUserData();
          Alert.alert('Success!', 'Premium subscription activated! 🎉');
          onClose();
        } else if (result.cancelled) {
          // User cancelled, no need to show error
          console.log('Purchase cancelled by user');
        } else {
          Alert.alert('Purchase Failed', result.error || 'Unable to complete purchase');
        }
      } else {
        // Fallback to demo if package not found
        try {
          await premiumService.upgradeToPremium(user.id);
          await refreshUserData();
          Alert.alert('Success!', 'Premium subscription activated! 🎉');
          onClose();
        } catch (error) {
          Alert.alert('Error', 'Failed to upgrade to premium. Please try again.');
        }
      }
      
    } catch (error) {
      console.error('Yearly upgrade error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upgrade to Premium</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {blockedFeature && (
            <View style={styles.blockedFeatureCard}>
              <FontAwesome5 name="lock" size={20} color="#EF4444" />
              <Text style={styles.blockedFeatureText}>
                {blockedFeature} requires Premium
              </Text>
            </View>
          )}

          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>🌟 Unlock Premium Features</Text>
            <Text style={styles.heroSubtitle}>
              Get the most out of ChoreCraft with our premium plan
            </Text>
          </View>

          <View style={styles.planComparison}>
            {/* Free Plan */}
            <View style={styles.planCard}>
              <View style={styles.planHeader}>
                <Text style={styles.planName}>Free</Text>
                <Text style={styles.planPrice}>£0</Text>
              </View>
              <View style={styles.featuresList}>
                {freePlan?.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <FontAwesome5 name="check" size={12} color="#10B981" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Premium Plan */}
            <View style={[styles.planCard, styles.premiumCard]}>
              <View style={styles.planHeader}>
                <Text style={[styles.planName, styles.premiumPlanName]}>Premium</Text>
                <Text style={[styles.planPrice, styles.premiumPrice]}>£20/year</Text>
              </View>
              <View style={styles.featuresList}>
                {premiumPlan?.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <FontAwesome5 name="star" size={12} color="#FFD700" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.upgradeSection}>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgradeMonthly}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Text style={styles.upgradeButtonText}>Upgrade to Premium Monthly</Text>
                  <Text style={styles.upgradeButtonSubtext}>£2.99/month</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgradeYearly}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Text style={styles.upgradeButtonText}>Upgrade to Premium Annual</Text>
                  <Text style={styles.upgradeButtonSubtext}>£20/year</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Cancel anytime. 30-day money-back guarantee.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  blockedFeatureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  blockedFeatureText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    flex: 1,
  },
  heroSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  planComparison: {
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 16,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  premiumCard: {
    borderColor: '#6C63FF',
    backgroundColor: '#FEFBFF',
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  premiumPlanName: {
    color: '#6C63FF',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  premiumPrice: {
    color: '#6C63FF',
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  upgradeSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  upgradeButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  upgradeButtonSubtext: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    marginTop: 2,
  },
  disclaimer: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default PremiumUpgradeModal;
