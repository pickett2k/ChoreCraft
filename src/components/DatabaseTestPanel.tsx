import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { testDatabaseConnection, createRealTestData, createTestUser } from '../utils/simpleDatabaseTest';
import databaseTest from '../utils/simpleDatabaseTest';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  choreService, 
  choreSchedulingService,
  Chore 
} from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { premiumTester } from '../utils/testPremiumSystem';
import { premiumService } from '../services/premiumService';

export const DatabaseTestPanel: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testFirebaseConnection = async () => {
    setLoading(true);
    clearResults();
    
    try {
      if (!db) {
        addResult('❌ Firebase not initialized');
        return;
      }

      addResult('✅ Firebase connection active');
      
      // Test basic collection access
      const testQuery = query(collection(db, 'users'));
      const snapshot = await getDocs(testQuery);
      addResult(`✅ Users collection accessible (${snapshot.size} documents)`);
      
    } catch (error) {
      addResult(`❌ Firebase test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFullTest = async () => {
    setLoading(true);
    addResult('Starting real database test with sample data...');
    
    try {
      const result = await createRealTestData();
      if (result.success) {
        addResult('✅ Real database test passed!');
        addResult(`📊 Created user: ${result.userId}`);
        addResult(`🏠 Created household: ${result.householdId}`);
        addResult(`🧹 Created ${result.choreIds?.length || 0} chores`);
        addResult(`🔑 Invite code: ${result.inviteCode}`);
        Alert.alert(
          'Success!', 
          'Real data created! Check Firebase console for:\n- users collection\n- households collection\n- chores collection\n- test collection'
        );
      } else {
        addResult(`❌ Real test failed: ${result.error}`);
        Alert.alert('Error', result.error || 'Real test failed');
      }
    } catch (error: any) {
      addResult(`❌ Test error: ${error.message}`);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserTest = async () => {
    setLoading(true);
    addResult('Testing mock auth user creation...');
    
    try {
      // Test creating users like mock auth would
      const testEmails = ['test@example.com', 'admin@test.com', 'user123@gmail.com'];
      let successCount = 0;
      
      for (const email of testEmails) {
        const userId = 'user-' + email.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const displayName = email.split('@')[0];
        
        addResult(`Creating user: ${email} (ID: ${userId})...`);
        
        const success = await createTestUser(userId, email, displayName);
        if (success) {
          addResult(`✅ User ${email} created successfully`);
          successCount++;
        } else {
          addResult(`❌ Failed to create user ${email}`);
        }
      }
      
      addResult(`\n✅ User creation test completed! ${successCount}/${testEmails.length} users created`);
      Alert.alert(
        'User Test Complete', 
        `Created ${successCount}/${testEmails.length} test users.\nCheck Firebase console users collection.`
      );
    } catch (error: any) {
      addResult(`❌ User creation test failed: ${error.message}`);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSampleData = async () => {
    setLoading(true);
    addResult('🎯 Creating comprehensive sample data...');
    
    try {
      const success = await databaseTest.createSampleData();
      if (success) {
        addResult('✅ Sample data created successfully!');
      } else {
        addResult('❌ Failed to create sample data');
      }
    } catch (error) {
      addResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestRewardSystem = async () => {
    setLoading(true);
    addResult('🧪 Testing reward system...');
    
    try {
      const success = await databaseTest.testRewardSystem();
      if (success) {
        addResult('✅ Reward system test completed!');
      } else {
        addResult('❌ Reward system test failed');
      }
    } catch (error) {
      addResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestChoreCompletion = async () => {
    setLoading(true);
    addResult('🧪 Testing chore completion and approval flow...');
    
    try {
      const success = await databaseTest.testChoreCompletion();
      if (success) {
        addResult('✅ Chore completion test completed!');
        Alert.alert('Success!', 'Chore completion flow tested successfully. Check console for details.');
      } else {
        addResult('❌ Chore completion test failed');
        Alert.alert('Error', 'Chore completion test failed. Check console for details.');
      }
    } catch (error) {
      addResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestChoreScheduling = async () => {
    setLoading(true);
    addResult('🧪 Testing chore scheduling system...');
    
    try {
      const result = await databaseTest.testChoreScheduling();
      if (result.success) {
        addResult('✅ Chore scheduling test completed!');
        result.details.forEach(detail => addResult(detail));
        Alert.alert('Success!', 'Chore scheduling system is working. Calendar should show live data.');
      } else {
        addResult('❌ Chore scheduling test failed');
        addResult(result.message);
        result.details.forEach(detail => addResult(detail));
        Alert.alert('Error', 'Chore scheduling test failed. Check console for details.');
      }
    } catch (error) {
      addResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDebugCurrentState = async () => {
    setLoading(true);
    addResult('🔍 Debugging current app state...');
    
    try {
      // Check if we have any households
      const householdsQuery = query(collection(db!, 'households'));
      const householdsSnapshot = await getDocs(householdsQuery);
      addResult(`🏠 Found ${householdsSnapshot.size} households`);
      
      // Check if we have any chores
      const choresQuery = query(collection(db!, 'chores'));
      const choresSnapshot = await getDocs(choresQuery);
      addResult(`🧹 Found ${choresSnapshot.size} total chores`);
      
      // Check active chores
      const activeChoresQuery = query(collection(db!, 'chores'), where('status', '==', 'active'));
      const activeChoresSnapshot = await getDocs(activeChoresQuery);
      addResult(`✅ Found ${activeChoresSnapshot.size} active chores`);
      
      // Check completed chores
      const completedChoresQuery = query(collection(db!, 'chores'), where('status', '==', 'completed'));
      const completedChoresSnapshot = await getDocs(completedChoresQuery);
      addResult(`✅ Found ${completedChoresSnapshot.size} completed chores`);
      
      // Check pending completions
      const completionsQuery = query(collection(db!, 'choreCompletions'), where('status', '==', 'pending'));
      const completionsSnapshot = await getDocs(completionsQuery);
      addResult(`📋 Found ${completionsSnapshot.size} pending completions`);
      
      // Check all completions
      const allCompletionsQuery = query(collection(db!, 'choreCompletions'));
      const allCompletionsSnapshot = await getDocs(allCompletionsQuery);
      addResult(`📊 Found ${allCompletionsSnapshot.size} total completions`);
      
      Alert.alert('Debug Complete', 'Current state logged to console and results panel.');
    } catch (error) {
      addResult(`❌ Debug error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testDailyChoreCreation = async () => {
    setLoading(true);
    addResult('🧪 Testing daily chore creation and due date logic...');
    
    try {
      if (!user?.householdId) {
        addResult('❌ No household found for current user');
        return;
      }
      
      const today = new Date();
      const choreData = {
        title: `Test Daily Chore ${Date.now()}`,
        description: 'A test chore to verify daily scheduling',
        householdId: user.householdId,
        createdBy: user.id,
        coinReward: 10,
        frequency: 'daily' as const,
        anyoneCanDo: true,
        requiresPhoto: false,
        beforePhotoRequired: false,
        afterPhotoRequired: false,
        status: 'active' as const,
        isRecurring: true,
        autoDeleteAfterDays: 30,
        assignedTo: [],
      };
      
      addResult('📝 Creating daily chore...');
      const choreId = await choreService.createChore(choreData);
      addResult(`✅ Created chore with ID: ${choreId}`);
      
      // Get the created chore to check its due date
      const allChores = await choreService.getHouseholdChores(user.householdId, 'all');
      const createdChore = allChores.find((c: Chore) => c.id === choreId);
      if (createdChore) {
        addResult(`📅 Chore created successfully`);
        addResult(`   - Title: ${createdChore.title}`);
        addResult(`   - Frequency: ${createdChore.frequency}`);
        
        if (createdChore.nextDueDate) {
          const dueDate = createdChore.nextDueDate.toDate ? createdChore.nextDueDate.toDate() : 
            (createdChore.nextDueDate as any).seconds ? new Date((createdChore.nextDueDate as any).seconds * 1000) : 
            new Date(createdChore.nextDueDate as any);
          addResult(`   - Next Due: ${dueDate.toDateString()}`);
        }
        
        // Test if it appears in today's chores
        const todayChores = await choreSchedulingService.getChoresDueOnDate(user.householdId, today);
        addResult(`📅 Chores due today: ${todayChores.length}`);
        
        const isInToday = todayChores.find((c: Chore) => c.id === choreId);
        addResult(`📅 Daily chore appears in today's list: ${!!isInToday ? 'Yes' : 'No'}`);
        
        if (!isInToday) {
          addResult('🔍 Debugging why chore is not in today\'s list...');
          addResult(`   - Today: ${today.toDateString()}`);
          if (createdChore.nextDueDate) {
            const dueDate = createdChore.nextDueDate.toDate ? createdChore.nextDueDate.toDate() : 
              (createdChore.nextDueDate as any).seconds ? new Date((createdChore.nextDueDate as any).seconds * 1000) : 
              new Date(createdChore.nextDueDate as any);
            addResult(`   - Due Date: ${dueDate.toDateString()}`);
          }
        }
        
      } else {
        addResult('❌ Could not find created chore in household chores');
      }
      
    } catch (error) {
      addResult(`❌ Test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestPremiumSystem = async () => {
    setLoading(true);
    addResult('🧪 Testing Premium System...');
    
    try {
      // Clear previous results in the tester
      premiumTester.clearResults();
      
      // Run all premium tests
      const testResults = await premiumTester.runAllTests();
      
      // Add results to our display
      addResult(`\n🎉 Premium Test Results:`);
      addResult(`✅ Passed: ${testResults.passed}/${testResults.total}`);
      addResult(`❌ Failed: ${testResults.failed}/${testResults.total}`);
      
      // Add detailed results
      testResults.results.forEach(result => {
        const status = result.passed ? '✅' : '❌';
        addResult(`${status} ${result.testName}${result.details ? ` - ${result.details}` : ''}`);
        if (result.error) {
          addResult(`   Error: ${result.error}`);
        }
      });
      
      if (testResults.failed === 0) {
        addResult('\n🎊 All premium system tests passed!');
        addResult('Premium functionality is working correctly.');
        
        // Test current user's premium status
        if (user?.firestoreData) {
          const canCreateCustomChores = premiumService.canUserPerformAction(user.firestoreData, 'canCreateCustomChores');
          const isPremium = user.firestoreData.isPremium;
          
          addResult(`\n👤 Current User Status:`);
          addResult(`   - Is Premium: ${isPremium ? 'Yes' : 'No'}`);
          addResult(`   - Can Create Custom Chores: ${canCreateCustomChores ? 'Yes' : 'No'}`);
          
          if (!isPremium) {
            addResult('   💡 To test premium upgrade: Try creating a custom chore and click upgrade');
          }
        }
        
        Alert.alert(
          'Premium System Test Complete! 🎉',
          `All ${testResults.total} tests passed!\n\nThe premium system is working correctly. Check console for detailed results.`,
          [{ text: 'Excellent!' }]
        );
      } else {
        addResult('\n⚠️ Some premium tests failed.');
        Alert.alert(
          'Premium Test Issues',
          `${testResults.failed}/${testResults.total} tests failed. Check console for details.`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error: any) {
      addResult(`❌ Premium test error: ${error.message}`);
      Alert.alert('Error', `Premium test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <FontAwesome5 name="database" size={20} color="#6C63FF" />
        <Text style={styles.title}>Database Test Panel</Text>
      </View>

      <Text style={styles.subtitle}>
        Test Firebase connection and create sample data
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.basicButton]}
          onPress={testFirebaseConnection}
          disabled={loading}
        >
          <FontAwesome5 name="plug" size={16} color="#fff" />
          <Text style={styles.buttonText}>Test Connection</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: '#10B981' }]}
          onPress={handleCreateSampleData}
          disabled={loading}
        >
          <FontAwesome5 name="database" size={16} color="white" />
          <Text style={styles.buttonText}>Create Sample Data</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: '#8B5CF6' }]}
          onPress={handleTestRewardSystem}
          disabled={loading}
        >
          <FontAwesome5 name="gift" size={16} color="white" />
          <Text style={styles.buttonText}>Test Reward System</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: '#EF4444' }]}
          onPress={handleTestChoreCompletion}
          disabled={loading}
        >
          <FontAwesome5 name="check-circle" size={16} color="white" />
          <Text style={styles.buttonText}>Test Chore Completion</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.userButton]}
          onPress={handleUserTest}
          disabled={loading}
        >
          <FontAwesome5 name="users" size={16} color="#fff" />
          <Text style={styles.buttonText}>Test Mock Users</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: '#F59E0B' }]}
          onPress={handleTestChoreScheduling}
          disabled={loading}
        >
          <FontAwesome5 name="calendar" size={16} color="white" />
          <Text style={styles.buttonText}>Test Chore Scheduling</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: '#F59E0B' }]}
          onPress={handleDebugCurrentState}
          disabled={loading}
        >
          <FontAwesome5 name="bug" size={16} color="white" />
          <Text style={styles.buttonText}>Debug Current State</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: '#F59E0B' }]}
          onPress={testDailyChoreCreation}
          disabled={loading}
        >
          <FontAwesome5 name="calendar" size={16} color="white" />
          <Text style={styles.buttonText}>Test Daily Chore Creation</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: '#F59E0B' }]}
          onPress={handleTestPremiumSystem}
          disabled={loading}
        >
          <FontAwesome5 name="gift" size={16} color="white" />
          <Text style={styles.buttonText}>Test Premium System</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#6C63FF" size="small" />
          <Text style={styles.loadingText}>Running database test...</Text>
        </View>
      )}

      <View style={styles.resultsContainer}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Test Results</Text>
          <TouchableOpacity onPress={clearResults} style={styles.clearButton}>
            <FontAwesome5 name="trash" size={14} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
          {results.length === 0 ? (
            <Text style={styles.noResults}>No test results yet</Text>
          ) : (
            results.map((result, index) => (
              <Text key={index} style={styles.resultText}>
                {result}
              </Text>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  basicButton: {
    backgroundColor: '#17a2b8',
  },
  userButton: {
    backgroundColor: '#6f42c1',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    marginBottom: 16,
  },
  loadingText: {
    marginLeft: 8,
    color: '#1976d2',
    fontSize: 14,
  },
  resultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  clearButton: {
    padding: 4,
  },
  results: {
    maxHeight: 120,
  },
  noResults: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  resultText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
}); 