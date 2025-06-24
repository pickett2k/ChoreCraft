import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { 
  firestoreUtils, 
  choreService, 
  choreSchedulingService,
  Chore, 
  Household 
} from '../services/firestoreService';

interface CalendarScreenProps {
  navigation: any;
}

const { width } = Dimensions.get('window');

interface CalendarDay {
  date: Date;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
  isWeekend: boolean;
  chores: (Chore & { completionStatus?: 'none' | 'pending' | 'approved'; isDueToday?: boolean })[];
  overdueChores: (Chore & { completionStatus?: 'none' | 'pending' | 'approved'; isDueToday?: boolean })[];
}

export const CalendarScreen: React.FC<CalendarScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCalendarData();
  }, [user]);

  // Refresh calendar when tab is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('📅 Calendar tab focused, refreshing data...');
      if (user) {
        loadCalendarData();
      }
    }, [user])
  );

  const loadCalendarData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get user's household data
      const { household: userHousehold } = await firestoreUtils.getUserHouseholdData(user.id);
      
      if (userHousehold) {
        setHousehold(userHousehold);
        await generateCalendarWithChores(userHousehold.id);
      } else {
        generateEmptyCalendar();
      }
    } catch (error) {
      console.error('❌ Error loading calendar data:', error);
      generateEmptyCalendar();
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    console.log('🔄 Manual calendar refresh triggered');
    setRefreshing(true);
    await loadCalendarData();
    setRefreshing(false);
  };

  const onChoreCompleted = async (choreId: string) => {
    console.log('🎉 Chore completed on calendar, refreshing...');
    // Refresh calendar data to show updated chore status
    await loadCalendarData();
  };

  const generateCalendarWithChores = async (householdId: string) => {
    const days: CalendarDay[] = [];
    const today = new Date();
    
    console.log('📅 Generating calendar with chores for household:', householdId);
    
    // Generate 14 days (2 weeks) of calendar data
    const startDate = new Date(today);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 13);
    
    console.log('📅 Date range:', startDate.toDateString(), 'to', endDate.toDateString());
    
    // Get chores for the date range
    const choresByDate = await choreSchedulingService.getChoresForDateRange(householdId, startDate, endDate);
    const overdueChores = await choreSchedulingService.getOverdueChores(householdId);
    
    console.log('📅 Chores by date:', JSON.stringify(choresByDate, null, 2));
    console.log('⏰ Overdue chores:', overdueChores);
    
    // Debug: Check specifically for today's chores
    const todayString = today.toDateString();
    console.log(`📅 Today (${todayString}) chores:`, choresByDate[todayString] || 'none');
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const dayNumber = date.getDate();
      const isToday = i === 0;
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      const dateString = date.toDateString();
      let dayChores = choresByDate[dateString] || [];
      
      // For daily chores, check if they've been completed and add completion status
      if (isToday) {
        console.log(`📅 Checking completion status for ${dayChores.length} chores on ${dateString}`);
        const choreCompletionPromises = dayChores.map(async (chore) => {
          const { completed, status } = await choreService.hasChoreBeenCompletedOrPendingToday(chore.id);
          console.log(`📅 Chore "${chore.title}" (${chore.id}) status: ${status}`);
          return { ...chore, completionStatus: status, isDueToday: true };
        });
        
        dayChores = await Promise.all(choreCompletionPromises);
      } else {
        // For future days, mark all as not completed and not due today
        dayChores = dayChores.map(chore => ({ ...chore, completionStatus: 'none' as const, isDueToday: false }));
      }
      
      // On the first day (today), also include overdue chores (these are always due today)
      let dayOverdueChores: any[] = [];
      if (isToday && overdueChores.length > 0) {
        const overdueCompletionPromises = overdueChores.map(async (chore) => {
          const { completed, status } = await choreService.hasChoreBeenCompletedOrPendingToday(chore.id);
          return { ...chore, completionStatus: status, isDueToday: true };
        });
        
        dayOverdueChores = await Promise.all(overdueCompletionPromises);
      }
      
      console.log(`📅 Day ${i} (${dateString}): ${dayChores.length} chores, ${dayOverdueChores.length} overdue`);
      
      days.push({
        date,
        dayName,
        monthName,
        dayNumber,
        isToday,
        isWeekend,
        chores: dayChores,
        overdueChores: dayOverdueChores,
      });
    }
    
    console.log('📅 Calendar generated with', days.length, 'days');
    setCalendarDays(days);
  };

  const generateEmptyCalendar = () => {
    const days: CalendarDay[] = [];
    const today = new Date();
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const dayNumber = date.getDate();
      const isToday = i === 0;
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      days.push({
        date,
        dayName,
        monthName,
        dayNumber,
        isToday,
        isWeekend,
        chores: [],
        overdueChores: [],
      });
      }
      
    setCalendarDays(days);
  };

  const selectedDayData = calendarDays[selectedDay];
  const totalChoresForDay = selectedDayData ? 
    selectedDayData.chores.length + selectedDayData.overdueChores.length : 0;

  const handleChorePress = (chore: Chore & { completionStatus?: 'none' | 'pending' | 'approved'; isDueToday?: boolean }) => {
    if (chore.completionStatus === 'approved') {
      Alert.alert(
        `${chore.title} - Completed`,
        `This chore has already been completed today!\n\n${chore.description}\n\nReward: ${chore.coinReward} coins\nFrequency: ${chore.frequency}`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    if (chore.completionStatus === 'pending') {
      Alert.alert(
        `${chore.title} - Pending Approval`,
        `This chore is waiting for approval!\n\n${chore.description}\n\nReward: ${chore.coinReward} coins\nFrequency: ${chore.frequency}`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    if (chore.isDueToday === false) {
      Alert.alert(
        `${chore.title} - Scheduled`,
        `This chore is scheduled for later!\n\n${chore.description}\n\nReward: ${chore.coinReward} coins\nFrequency: ${chore.frequency}`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    // Show completion dialog for active chores
    Alert.alert(
      `Complete ${chore.title}?`,
      `${chore.description}\n\nReward: ${chore.coinReward} coins`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', style: 'default', onPress: () => completeChore(chore.id) }
      ]
    );
  };

  const completeChore = async (choreId: string) => {
    if (!user || !household) return;

    try {
      await choreService.completeChore(choreId, user.id);
      // Refresh calendar data immediately after completion
      await loadCalendarData();
      
      Alert.alert('Success', 'Chore completed! Pending approval.');
    } catch (error) {
      console.error('Error completing chore:', error);
      Alert.alert('Error', 'Failed to complete chore. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <FontAwesome5 name="calendar-alt" size={48} color="#6C63FF" />
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
  );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6C63FF" />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Calendar</Text>
          <Text style={styles.headerSubtitle}>
            {household ? `${household.name} schedule` : 'No household - Join one to see chores'}
          </Text>
        </View>
      </View>

        <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Calendar Days */}
        <View style={styles.calendarContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {calendarDays.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                  styles.dayCard,
                  selectedDay === index && styles.selectedDayCard,
                  day.isToday && styles.todayCard,
                  day.isWeekend && styles.weekendCard,
              ]}
              onPress={() => setSelectedDay(index)}
            >
                <Text style={[
                  styles.monthName,
                  selectedDay === index && styles.selectedMonthName,
                ]}>
                  {day.monthName}
                </Text>
              <Text style={[
                styles.dayName,
                selectedDay === index && styles.selectedDayName,
                day.isToday && styles.todayDayName,
              ]}>
                {day.dayName}
              </Text>
              <Text style={[
                styles.dayNumber,
                selectedDay === index && styles.selectedDayNumber,
                day.isToday && styles.todayDayNumber,
              ]}>
                {day.dayNumber}
              </Text>
                
                {/* Chore indicators */}
                <View style={styles.choreIndicators}>
              {day.chores.length > 0 && (
                    <View style={[styles.choreIndicator, styles.regularChoreIndicator]}>
                      <Text style={styles.choreIndicatorText}>{day.chores.length}</Text>
                    </View>
                  )}
                  {day.overdueChores.length > 0 && (
                    <View style={[styles.choreIndicator, styles.overdueChoreIndicator]}>
                      <Text style={styles.choreIndicatorText}>{day.overdueChores.length}</Text>
                    </View>
                  )}
                </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

        {/* Selected Day Content */}
      {selectedDayData && (
          <View style={styles.dayContent}>
            <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>
            {selectedDayData.isToday ? 'Today' : selectedDayData.date.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
          <Text style={styles.daySubtitle}>
                {totalChoresForDay} {totalChoresForDay === 1 ? 'chore' : 'chores'} scheduled
              </Text>
            </View>

            {/* No household message */}
            {!household && (
              <View style={styles.noHouseholdContainer}>
                <FontAwesome5 name="home" size={48} color="#9CA3AF" />
                <Text style={styles.noHouseholdTitle}>No Household</Text>
                <Text style={styles.noHouseholdText}>
                  Join or create a household to see scheduled chores in your calendar.
          </Text>
        </View>
      )}

            {/* Overdue chores */}
            {selectedDayData.overdueChores.length > 0 && (
              <View style={styles.choreSection}>
                <View style={styles.sectionHeader}>
                  <FontAwesome5 name="exclamation-triangle" size={16} color="#EF4444" />
                  <Text style={styles.sectionTitle}>Overdue ({selectedDayData.overdueChores.length})</Text>
                </View>
                {selectedDayData.overdueChores.map((chore) => (
                  <TouchableOpacity 
                    key={chore.id} 
                    style={[styles.choreCard, styles.overdueChoreCard]}
                    onPress={() => handleChorePress(chore)}
                  >
                    <View style={styles.choreHeader}>
                      <Text style={styles.choreTitle}>{chore.title}</Text>
                      <View style={styles.coinBadge}>
                        <FontAwesome5 name="coins" size={12} color="#F59E0B" />
                        <Text style={styles.coinText}>{chore.coinReward}</Text>
                      </View>
                    </View>
                    <Text style={styles.choreDescription} numberOfLines={2}>
                      {chore.description}
                    </Text>
                    <View style={styles.choreFooter}>
                      <Text style={styles.choreFrequency}>{chore.frequency}</Text>
                      <Text style={styles.overdueText}>OVERDUE</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Scheduled chores */}
            {selectedDayData.chores.length > 0 && (
              <View style={styles.choreSection}>
                <View style={styles.sectionHeader}>
                  <FontAwesome5 name="calendar-check" size={16} color="#6C63FF" />
                  <Text style={styles.sectionTitle}>
                    {selectedDayData.isToday ? 'Due Today' : 'Scheduled'} ({selectedDayData.chores.length})
            </Text>
                </View>
                {selectedDayData.chores.map((chore) => (
            <TouchableOpacity 
                    key={chore.id} 
                    style={[
                      styles.choreCard,
                      chore.completionStatus === 'approved' && styles.completedChoreCard,
                      chore.isDueToday === false && styles.futureChoreCard
                    ]}
                    onPress={() => handleChorePress(chore)}
                  >
                    <View style={styles.choreHeader}>
                      <View style={styles.choreTitleContainer}>
                        {chore.completionStatus === 'approved' && (
                          <FontAwesome5 name="check-circle" size={16} color="#10B981" style={styles.completedIcon} />
                        )}
                        {chore.completionStatus === 'pending' && (
                          <FontAwesome5 name="clock" size={16} color="#F59E0B" style={styles.pendingIcon} />
                        )}
                        {chore.isDueToday === false && (
                          <FontAwesome5 name="clock" size={16} color="#9CA3AF" style={styles.futureIcon} />
                        )}
                        <Text style={[
                          styles.choreTitle,
                          chore.completionStatus === 'approved' && styles.completedChoreTitle,
                          chore.isDueToday === false && styles.futureChoreTitle
                        ]}>
                          {chore.title}
                        </Text>
                      </View>
                      <View style={styles.coinBadge}>
                        <FontAwesome5 name="coins" size={12} color="#F59E0B" />
                        <Text style={styles.coinText}>{chore.coinReward}</Text>
                      </View>
                    </View>
                    <Text style={[
                      styles.choreDescription,
                      chore.completionStatus === 'approved' && styles.completedChoreDescription,
                      chore.isDueToday === false && styles.futureChoreDescription
                    ]} numberOfLines={2}>
                      {chore.description}
                    </Text>
                    <View style={styles.choreFooter}>
                      <Text style={[
                        styles.choreFrequency,
                        chore.isDueToday === false && styles.futureChoreFrequency
                      ]}>
                        {chore.frequency}
                      </Text>
                      {chore.completionStatus === 'approved' ? (
                        <Text style={styles.completedText}>COMPLETED</Text>
                      ) : chore.completionStatus === 'pending' ? (
                        <Text style={styles.pendingText}>PENDING</Text>
                      ) : chore.isDueToday === false ? (
                        <Text style={styles.scheduledText}>SCHEDULED</Text>
                      ) : chore.anyoneCanDo ? (
                        <Text style={styles.anyoneText}>Anyone can do</Text>
                      ) : (
                        <Text style={styles.assignedText}>Assigned</Text>
                      )}
                    </View>
            </TouchableOpacity>
                ))}
              </View>
            )}

            {/* No chores message */}
            {household && totalChoresForDay === 0 && (
              <View style={styles.noChoresContainer}>
                <FontAwesome5 name="calendar-check" size={48} color="#9CA3AF" />
                <Text style={styles.noChoresTitle}>
                  {selectedDayData.isToday ? 'No chores due today!' : 'No chores scheduled'}
                </Text>
                <Text style={styles.noChoresText}>
                  {selectedDayData.isToday 
                    ? 'Enjoy your free time! Check other days for upcoming chores.' 
                    : 'This day is free of scheduled chores.'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#6C63FF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
  },
  calendarContainer: {
    paddingVertical: 20,
    paddingLeft: 20,
  },
  dayCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedDayCard: {
    backgroundColor: '#6C63FF',
  },
  todayCard: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  weekendCard: {
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  selectedDayName: {
    color: 'white',
  },
  todayDayName: {
    color: '#10B981',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  selectedDayNumber: {
    color: 'white',
  },
  todayDayNumber: {
    color: '#10B981',
  },
  monthName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  selectedMonthName: {
    color: 'white',
  },
  dayContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dayHeader: {
    marginBottom: 20,
  },
  dayTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  daySubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  choreIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  choreIndicator: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginRight: 4,
  },
  regularChoreIndicator: {
    backgroundColor: '#6C63FF',
  },
  overdueChoreIndicator: {
    backgroundColor: '#EF4444',
  },
  choreIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  choreSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  choreCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  choreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  choreTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  choreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  completedIcon: {
    marginRight: 8,
  },
  completedChoreTitle: {
    textDecorationLine: 'line-through',
  },
  coinBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginLeft: 8,
  },
  coinText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  choreDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  completedChoreDescription: {
    textDecorationLine: 'line-through',
  },
  choreFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  choreFrequency: {
    fontSize: 12,
    color: '#6B7280',
  },
  overdueText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: 'bold',
  },
  anyoneText: {
    fontSize: 12,
    color: '#6B7280',
  },
  assignedText: {
    fontSize: 12,
    color: '#6B7280',
  },
  completedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: 'bold',
  },
  noHouseholdContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noHouseholdTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 12,
  },
  noHouseholdText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  noChoresContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noChoresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 12,
  },
  noChoresText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 20,
  },
  overdueChoreCard: {
    backgroundColor: '#EF4444',
  },
  completedChoreCard: {
    backgroundColor: '#F3F4F6',
  },
  futureChoreCard: {
    backgroundColor: '#F3F4F6',
  },
  futureIcon: {
    marginRight: 8,
  },
  futureChoreTitle: {
    color: '#9CA3AF',
  },
  futureChoreDescription: {
    color: '#9CA3AF',
  },
  futureChoreFrequency: {
    color: '#9CA3AF',
  },
  scheduledText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  pendingIcon: {
    marginRight: 8,
  },
  pendingText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: 'bold',
  },
});
