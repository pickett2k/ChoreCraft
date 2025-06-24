import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { FirestoreUser, householdService } from '../services/firestoreService';

interface LeaderboardCardProps {
  householdId: string;
}

interface LeaderboardEntry {
  user: FirestoreUser;
  rank: number;
  choresCompleted: number;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ householdId }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [householdId]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      
      // Get all household members
      const members = await householdService.getHouseholdMembers(householdId);
      
      // Sort by chores completed (descending)
      const sortedMembers = members
        .filter(member => member.stats?.choresCompleted !== undefined)
        .sort((a, b) => (b.stats?.choresCompleted || 0) - (a.stats?.choresCompleted || 0));
      
      // Create leaderboard entries with ranks
      const leaderboardEntries: LeaderboardEntry[] = sortedMembers.map((member, index) => ({
        user: member,
        rank: index + 1,
        choresCompleted: member.stats?.choresCompleted || 0,
      }));
      
      setLeaderboard(leaderboardEntries);
      console.log('📊 Leaderboard loaded:', leaderboardEntries.length, 'members');
    } catch (error) {
      console.error('❌ Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return { name: 'crown', color: '#FFD700' }; // Gold
      case 2:
        return { name: 'medal', color: '#C0C0C0' }; // Silver
      case 3:
        return { name: 'award', color: '#CD7F32' }; // Bronze
      default:
        return { name: 'user', color: '#6B7280' }; // Gray
    }
  };

  const getRankSuffix = (rank: number) => {
    if (rank === 1) return 'st';
    if (rank === 2) return 'nd';
    if (rank === 3) return 'rd';
    return 'th';
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <FontAwesome5 name="trophy" size={20} color="#6C63FF" />
          <Text style={styles.title}>Leaderboard</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6C63FF" />
          <Text style={styles.loadingText}>Loading rankings...</Text>
        </View>
      </View>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <FontAwesome5 name="trophy" size={20} color="#6C63FF" />
          <Text style={styles.title}>Leaderboard</Text>
        </View>
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="users" size={32} color="#9CA3AF" />
          <Text style={styles.emptyText}>No completed chores yet!</Text>
          <Text style={styles.emptySubtext}>Start completing chores to see rankings</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <FontAwesome5 name="trophy" size={20} color="#6C63FF" />
        <Text style={styles.title}>Chore Champions</Text>
        <Text style={styles.subtitle}>Who's doing the most work?</Text>
      </View>
      
      <ScrollView style={styles.leaderboardContainer} showsVerticalScrollIndicator={false}>
        {leaderboard.map((entry) => {
          const rankIcon = getRankIcon(entry.rank);
          const isTopThree = entry.rank <= 3;
          
          return (
            <View 
              key={entry.user.id} 
              style={[
                styles.leaderboardEntry,
                isTopThree && styles.topThreeEntry,
                entry.rank === 1 && styles.firstPlaceEntry
              ]}
            >
              <View style={styles.rankContainer}>
                <FontAwesome5 
                  name={rankIcon.name} 
                  size={isTopThree ? 18 : 14} 
                  color={rankIcon.color} 
                />
                <Text style={[
                  styles.rankText,
                  isTopThree && styles.topThreeRankText
                ]}>
                  {entry.rank}{getRankSuffix(entry.rank)}
                </Text>
              </View>
              
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{entry.user.displayName}</Text>
                <Text style={styles.userRole}>
                  {entry.user.role === 'admin' ? '👑 Admin' : '👤 Member'}
                </Text>
              </View>
              
              <View style={styles.scoreContainer}>
                <Text style={[
                  styles.choreCount,
                  isTopThree && styles.topThreeChoreCount
                ]}>
                  {entry.choresCompleted}
                </Text>
                <Text style={styles.choreLabel}>
                  {entry.choresCompleted === 1 ? 'chore' : 'chores'}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
      
      {leaderboard.length > 3 && (
        <Text style={styles.footerText}>
          Keep completing chores to climb the rankings! 🚀
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    width: '100%',
    marginTop: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  leaderboardContainer: {
    maxHeight: 300,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 2,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  topThreeEntry: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  firstPlaceEntry: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 50,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4,
  },
  topThreeRankText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  userRole: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  choreCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6C63FF',
  },
  topThreeChoreCount: {
    fontSize: 20,
    color: '#4F46E5',
  },
  choreLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 12,
    fontStyle: 'italic',
  },
}); 