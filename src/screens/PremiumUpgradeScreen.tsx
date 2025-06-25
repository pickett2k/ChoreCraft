import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { premiumService } from '../services/premiumService';
import { subscriptionService } from '../services/subscriptionService';
import { useAuth } from '../contexts/AuthContext';
import { getPremiumPricing, getYearlySavings } from '../utils/pricing';

const { width } = Dimensions.get('window');

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  isPremium?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, isPremium = false }) => (
  <View style={[styles.featureCard, isPremium && styles.premiumFeatureCard]}>
    <View style={[styles.featureIcon, isPremium && styles.premiumFeatureIcon]}>
      <FontAwesome5 name={icon} size={20} color={isPremium ? "#FFD700" : "#6C63FF"} />
    </View>
    <View style={styles.featureContent}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
    {isPremium && (
      <View style={styles.premiumBadge}>
        <FontAwesome5 name="crown" size={12} color="#FFD700" />
      </View>
    )}
  </View>
);

const PremiumUpgradeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  // Get pricing configuration
  const pricing = getPremiumPricing();
  const savings = getYearlySavings();

  const handleUpgrade = async () => {
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
          Alert.alert(
            '🎉 Welcome to Premium!', 
            'Your account has been upgraded! You now have access to all premium features.',
            [{ text: 'Continue', onPress: () => navigation.goBack() }]
          );
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
          Alert.alert(
            '🎉 Welcome to Premium!', 
            'Your account has been upgraded! You now have access to all premium features.',
            [{ text: 'Continue', onPress: () => navigation.goBack() }]
          );
        } catch (error) {
          Alert.alert('Error', 'Failed to upgrade to premium. Please try again.');
        }
        return;
      }

      // Find the appropriate package
      const targetPackage = offerings[0]?.packages.find(pkg => 
        selectedPlan === 'monthly' 
          ? pkg.product.identifier.includes('monthly')
          : pkg.product.identifier.includes('yearly')
      );

      if (targetPackage) {
        // Use real RevenueCat purchase
        const result = await subscriptionService.purchasePackage(targetPackage);
        
        if (result.success) {
          await refreshUserData();
          Alert.alert(
            '🎉 Welcome to Premium!', 
            'Your subscription is now active! You have access to all premium features.',
            [{ text: 'Continue', onPress: () => navigation.goBack() }]
          );
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
          Alert.alert(
            '🎉 Welcome to Premium!', 
            'Your account has been upgraded! You now have access to all premium features.',
            [{ text: 'Continue', onPress: () => navigation.goBack() }]
          );
        } catch (error) {
          Alert.alert('Error', 'Failed to upgrade to premium. Please try again.');
        }
      }
      
    } catch (error) {
      console.error('Upgrade error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={['#6C63FF', '#5A52E3']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Upgrade to Premium</Text>
          <Text style={styles.headerSubtitle}>
            Unlock the full potential of ChoreCraft
          </Text>
          <View style={styles.crownContainer}>
            <FontAwesome5 name="crown" size={40} color="#FFD700" />
          </View>
        </View>
      </LinearGradient>

      {/* Benefits Section */}
      <View style={styles.benefitsSection}>
        <Text style={styles.sectionTitle}>✨ What You Get with Premium</Text>
        
        <FeatureCard
          icon="plus-circle"
          title="Unlimited Custom Chores"
          description="Create as many custom chores as you need for your household"
          isPremium
        />
        
        <FeatureCard
          icon="gift"
          title="Unlimited Custom Rewards"
          description="Design personalized rewards that motivate your family"
          isPremium
        />
        
        <FeatureCard
          icon="calendar-alt"
          title="Advanced Scheduling"
          description="Set complex recurring schedules and custom frequencies"
          isPremium
        />
        
        <FeatureCard
          icon="camera"
          title="Photo Proof System"
          description="Require before/after photos for chore completion verification"
          isPremium
        />
        
        <FeatureCard
          icon="coins"
          title="Coin Deduction Penalties"
          description="Automatically deduct coins for missed or incomplete chores"
          isPremium
        />
        
        <FeatureCard
          icon="download"
          title="Data Export"
          description="Export your household data and progress reports"
          isPremium
        />
        
        <FeatureCard
          icon="headset"
          title="Priority Support"
          description="Get fast, personalized help when you need it"
          isPremium
        />
      </View>

      {/* Free vs Premium Comparison */}
      <View style={styles.comparisonSection}>
        <Text style={styles.sectionTitle}>📊 Free vs Premium</Text>
        
        <View style={styles.comparisonTable}>
          <View style={styles.comparisonHeader}>
            <Text style={styles.comparisonHeaderText}>Feature</Text>
            <Text style={styles.comparisonHeaderText}>Free</Text>
            <Text style={styles.comparisonHeaderText}>Premium</Text>
          </View>
          
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonFeature}>Custom Chores</Text>
            <FontAwesome5 name="times" size={16} color="#EF4444" />
            <FontAwesome5 name="check" size={16} color="#10B981" />
          </View>
          
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonFeature}>Custom Rewards</Text>
            <FontAwesome5 name="times" size={16} color="#EF4444" />
            <FontAwesome5 name="check" size={16} color="#10B981" />
          </View>
          
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonFeature}>Household Members</Text>
            <Text style={styles.comparisonLimit}>Up to 4</Text>
            <Text style={styles.comparisonUnlimited}>Unlimited</Text>
          </View>
          
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonFeature}>Photo Proof</Text>
            <FontAwesome5 name="times" size={16} color="#EF4444" />
            <FontAwesome5 name="check" size={16} color="#10B981" />
          </View>
          
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonFeature}>Advanced Scheduling</Text>
            <FontAwesome5 name="times" size={16} color="#EF4444" />
            <FontAwesome5 name="check" size={16} color="#10B981" />
          </View>
        </View>
      </View>

      {/* Pricing Plans */}
      <View style={styles.pricingSection}>
        <Text style={styles.sectionTitle}>💰 Choose Your Plan</Text>
        
        <View style={styles.planContainer}>
          {/* Yearly Plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'yearly' && styles.selectedPlan
            ]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>MOST POPULAR</Text>
            </View>
            <Text style={styles.planName}>Annual</Text>
            <Text style={styles.planPrice}>{pricing.yearly.formatted}</Text>
            <Text style={styles.planPeriod}>{pricing.yearly.description}</Text>
            <Text style={styles.planSavings}>Save {savings.percentage}%!</Text>
            <Text style={styles.planEquivalent}>Just {savings.monthlyEquivalent}/month</Text>
          </TouchableOpacity>
          
          {/* Monthly Plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.selectedPlan
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <Text style={styles.planName}>Monthly</Text>
            <Text style={styles.planPrice}>{pricing.monthly.formatted}</Text>
            <Text style={styles.planPeriod}>{pricing.monthly.description}</Text>
            <Text style={styles.planDescription}>Perfect for trying premium</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Upgrade Button */}
      <View style={styles.upgradeSection}>
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={handleUpgrade}
          disabled={loading}
        >
          <LinearGradient
            colors={['#6C63FF', '#5A52E3']}
            style={styles.upgradeButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <FontAwesome5 name="crown" size={20} color="#FFD700" style={{ marginRight: 8 }} />
                <Text style={styles.upgradeButtonText}>
                  Upgrade to Premium {selectedPlan === 'yearly' ? 'Annual' : 'Monthly'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.disclaimer}>
          Cancel anytime • 30-day money-back guarantee • Secure payment
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 20,
  },
  crownContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumFeatureCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  premiumFeatureIcon: {
    backgroundColor: '#FEF3C7',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  premiumBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparisonSection: {
    padding: 20,
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  comparisonTable: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  comparisonHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  comparisonHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  comparisonFeature: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  comparisonLimit: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  comparisonUnlimited: {
    flex: 1,
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    textAlign: 'center',
  },
  pricingSection: {
    padding: 20,
  },
  planContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  planCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  selectedPlan: {
    borderColor: '#6C63FF',
    backgroundColor: '#FEFBFF',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    marginTop: 12,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6C63FF',
    marginBottom: 4,
  },
  planPeriod: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  planSavings: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  planEquivalent: {
    fontSize: 12,
    color: '#6B7280',
  },
  planDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  upgradeSection: {
    padding: 20,
    paddingBottom: 40,
  },
  upgradeButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  disclaimer: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default PremiumUpgradeScreen; 