import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

interface HouseholdOption {
  id: string;
  name: string;
  description: string;
  role: 'admin' | 'member';
  isPrimary: boolean;
  memberCount: number;
  choreCount: number;
}

interface HouseholdSwitcherProps {
  visible: boolean;
  onClose: () => void;
  onHouseholdSwitch: (householdId: string) => void;
  currentHouseholdId?: string;
}

export const HouseholdSwitcher: React.FC<HouseholdSwitcherProps> = ({
  visible,
  onClose,
  onHouseholdSwitch,
  currentHouseholdId,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [households, setHouseholds] = useState<HouseholdOption[]>([]);

  useEffect(() => {
    if (visible && user) {
      loadUserHouseholds();
    }
  }, [visible, user]);

  const loadUserHouseholds = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Mock data - in real implementation, this would load actual household data
      const mockHouseholds: HouseholdOption[] = [
        {
          id: 'household-1',
          name: 'Johnson Family',
          description: 'Our family household',
          role: 'admin',
          isPrimary: true,
          memberCount: 4,
          choreCount: 12,
        },
        {
          id: 'household-2',
          name: 'Work Team',
          description: 'Office cleaning duties',
          role: 'member',
          isPrimary: false,
          memberCount: 6,
          choreCount: 8,
        },
      ];
      
      setHouseholds(mockHouseholds);
    } catch (error) {
      console.error('Error loading user households:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchHousehold = async (householdId: string) => {
    try {
      setLoading(true);
      onHouseholdSwitch(householdId);
      onClose();
    } catch (error) {
      console.error('Error switching household:', error);
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
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Switch Household</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.householdsList}>
            <View style={styles.infoBox}>
              <FontAwesome5 name="info-circle" size={16} color="#6C63FF" />
              <Text style={styles.infoText}>
                <Text style={styles.infoTitle}>Household Switching:</Text>{'\n'}
                • Your role and permissions change with each household{'\n'}
                • Primary household is your default when opening the app{'\n'}
                • All data (chores, rewards, members) is household-specific
              </Text>
            </View>

            {households.map((household) => {
              const isActive = household.id === currentHouseholdId;
              
              return (
                <TouchableOpacity
                  key={household.id}
                  style={[styles.householdItem, isActive && styles.activeHousehold]}
                  onPress={() => handleSwitchHousehold(household.id)}
                  disabled={isActive}
                >
                  <View style={styles.householdHeader}>
                    <View style={styles.householdInfo}>
                      <View style={styles.householdNameRow}>
                        <Text style={[styles.householdName, isActive && styles.activeHouseholdName]}>
                          {household.name}
                        </Text>
                        {household.isPrimary && (
                          <View style={styles.primaryBadge}>
                            <FontAwesome5 name="star" size={10} color="#F59E0B" />
                            <Text style={styles.primaryBadgeText}>Primary</Text>
                          </View>
                        )}
                      </View>
                      
                      <Text style={styles.householdDescription}>
                        {household.description}
                      </Text>
                      
                      <View style={styles.householdMeta}>
                        <View style={[styles.roleTag, { 
                          backgroundColor: household.role === 'admin' ? '#FEF3C7' : '#E0E7FF' 
                        }]}>
                          <FontAwesome5 
                            name={household.role === 'admin' ? 'crown' : 'user'} 
                            size={12} 
                            color={household.role === 'admin' ? '#D97706' : '#6366F1'} 
                          />
                          <Text style={[styles.roleTagText, { 
                            color: household.role === 'admin' ? '#D97706' : '#6366F1' 
                          }]}>
                            {household.role === 'admin' ? 'Admin' : 'Member'}
                          </Text>
                        </View>
                        
                        <View style={styles.statsTag}>
                          <FontAwesome5 name="users" size={12} color="#6B7280" />
                          <Text style={styles.statsTagText}>{household.memberCount}</Text>
                        </View>
                        
                        <View style={styles.statsTag}>
                          <FontAwesome5 name="tasks" size={12} color="#6B7280" />
                          <Text style={styles.statsTagText}>{household.choreCount}</Text>
                        </View>
                      </View>
                    </View>
                    
                    {isActive ? (
                      <View style={styles.activeIndicator}>
                        <FontAwesome5 name="check-circle" size={20} color="#10B981" />
                      </View>
                    ) : (
                      <FontAwesome5 name="chevron-right" size={16} color="#D1D5DB" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={styles.createNewButton}>
              <FontAwesome5 name="plus-circle" size={20} color="#6C63FF" />
              <Text style={styles.createNewButtonText}>Create New Household</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  householdsList: {
    padding: 20,
    gap: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#0369A1',
    lineHeight: 20,
  },
  infoTitle: {
    fontWeight: '600',
  },
  householdItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  activeHousehold: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  householdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  householdInfo: {
    flex: 1,
  },
  householdNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  householdName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  activeHouseholdName: {
    color: '#059669',
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
  householdDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  householdMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  roleTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsTagText: {
    fontSize: 12,
    color: '#6B7280',
  },
  activeIndicator: {
    marginLeft: 12,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  createNewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C63FF',
  },
});

export default HouseholdSwitcher; 