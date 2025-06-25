import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { getUpgradeBannerText } from '../utils/pricing';

const PremiumBanner: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();

  // Don't show banner if user is already premium
  if (user?.isPremium) {
    return null;
  }

  const handleUpgradePress = () => {
    router.push('/premium-upgrade');
  };

  return (
    <TouchableOpacity onPress={handleUpgradePress} style={styles.container}>
      <LinearGradient
        colors={['#6C63FF', '#5A52E3']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.content}>
          <View style={styles.leftContent}>
            <View style={styles.crownContainer}>
              <FontAwesome5 name="crown" size={20} color="#FFD700" />
            </View>
            <View style={styles.textContent}>
              <Text style={styles.title}>Upgrade to Premium</Text>
              <Text style={styles.subtitle}>{getUpgradeBannerText()}</Text>
            </View>
          </View>
          
          <View style={styles.rightContent}>
            <View style={styles.arrowContainer}>
              <FontAwesome5 name="arrow-right" size={16} color="white" />
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    padding: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  crownContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  rightContent: {
    marginLeft: 12,
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PremiumBanner; 