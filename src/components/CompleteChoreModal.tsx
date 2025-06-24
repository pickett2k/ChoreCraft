import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Image,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { choreService, userService } from '../services/firestoreService';

interface Chore {
  id: string;
  title: string;
  description: string;
  coinReward: number;
  rewardType: 'coins' | 'cash';
  requiresPhoto: boolean;
  beforePhoto?: string; // Existing before photo from creation
}

interface CompleteChoreModalProps {
  visible: boolean;
  chore: Chore | null;
  onClose: () => void;
  onChoreCompleted: (choreId: string) => void;
}

export const CompleteChoreModal: React.FC<CompleteChoreModalProps> = ({
  visible,
  chore,
  onClose,
  onChoreCompleted
}) => {
  const { user } = useAuth();
  const [beforePhoto, setBeforePhoto] = useState<string | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'before' | 'after' | 'confirm'>('before');
  const [loading, setLoading] = useState(false);

  // Initialize with existing before photo if available
  useEffect(() => {
    if (chore?.beforePhoto) {
      setBeforePhoto(chore.beforePhoto);
      setStep('after'); // Skip to after photo if before photo exists
    } else {
      setBeforePhoto(null);
      setStep('before');
    }
  }, [chore]);

  const resetModal = () => {
    setAfterPhoto(null);
    // Keep existing before photo if it was provided during creation
    if (!chore?.beforePhoto) {
      setBeforePhoto(null);
      setStep('before');
    } else {
      setStep('after');
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required', 
        'Camera permission is needed to take photos for chore proof.'
      );
      return false;
    }
    return true;
  };

  const takePhoto = async (type: 'before' | 'after') => {
    if (!chore?.requiresPhoto) return;

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8, // Reduced quality to save storage
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        
        if (type === 'before') {
          setBeforePhoto(photoUri);
          setStep('after');
        } else {
          setAfterPhoto(photoUri);
          setStep('confirm');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const selectFromGallery = async (type: 'before' | 'after') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        
        if (type === 'before') {
          setBeforePhoto(photoUri);
          setStep('after');
        } else {
          setAfterPhoto(photoUri);
          setStep('confirm');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    }
  };

  const showPhotoOptions = (type: 'before' | 'after') => {
    Alert.alert(
      `${type === 'before' ? 'Before' : 'After'} Photo`,
      'How would you like to add a photo?',
      [
        { text: 'Camera', onPress: () => takePhoto(type) },
        { text: 'Gallery', onPress: () => selectFromGallery(type) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleCompleteChore = async () => {
    if (!chore || !user) return;

    if (chore.requiresPhoto && (!beforePhoto || !afterPhoto)) {
      Alert.alert('Photos Required', 'Please take both before and after photos.');
      return;
    }

    try {
      setLoading(true);

      // Complete the chore using the real service (this creates a pending completion)
      const trimmedNotes = notes.trim();
      const completionId = await choreService.completeChore(
        chore.id, 
        user.id, 
        trimmedNotes.length > 0 ? trimmedNotes : undefined,
        beforePhoto || undefined,
        afterPhoto || undefined
      );
      
      // Don't award coins here - wait for admin approval
      // The completion is created with status 'pending' and coins will be awarded on approval

      const rewardText = `${chore.coinReward} coins 🪙`;
      
      Alert.alert(
        '🎉 Chore Completed!', 
        `Amazing work! You'll earn ${rewardText} once approved by an admin.\n\n${chore.requiresPhoto ? 'Your photos have been saved as proof!' : 'Great job finishing this task!'}\n\nYour completion is pending admin approval.`, 
        [
          { 
            text: 'Awesome! 💰', 
            onPress: () => {
              resetModal();
              onChoreCompleted(chore.id);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error completing chore:', error);
      Alert.alert('Error', 'Failed to complete chore. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!chore) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAwareScrollView 
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraHeight={50}
        extraScrollHeight={Platform.OS === 'ios' ? 50 : 30}
        keyboardOpeningTime={250}
        showsVerticalScrollIndicator={false}
        resetScrollToCoords={{ x: 0, y: 0 }}
        enableResetScrollToCoords={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Chore</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Chore Info */}
          <View style={styles.choreInfo}>
            <Text style={styles.choreTitle}>{chore.title}</Text>
            <Text style={styles.choreDescription}>{chore.description}</Text>
            
            <View style={styles.choreMetadata}>
              <View style={styles.rewardBadge}>
                <FontAwesome5 
                  name={chore.rewardType === 'coins' ? 'coins' : 'pound-sign'} 
                  size={16} 
                  color={chore.rewardType === 'coins' ? '#FFD700' : '#4CAF50'} 
                />
                <Text style={styles.rewardText}>
                  {chore.coinReward} {chore.rewardType === 'coins' ? 'coins' : '£'}
                </Text>
              </View>
              
              {chore.requiresPhoto && (
                <View style={styles.photoBadge}>
                  <FontAwesome5 name="camera" size={14} color="#6C63FF" />
                  <Text style={styles.photoText}>
                    {chore.beforePhoto ? 'Before Photo Ready' : 'Photo Required'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {chore.requiresPhoto ? (
            <>
              {/* Progress Steps */}
              <View style={styles.stepsContainer}>
                <View style={styles.step}>
                  <View style={[styles.stepCircle, step !== 'before' && styles.stepCompleted]}>
                    {step === 'before' ? (
                      <Text style={styles.stepNumber}>1</Text>
                    ) : (
                      <FontAwesome5 name="check" size={12} color="white" />
                    )}
                  </View>
                  <Text style={[styles.stepLabel, step !== 'before' && styles.stepLabelCompleted]}>
                    Before Photo
                  </Text>
                </View>

                <View style={styles.stepLine} />

                <View style={styles.step}>
                  <View style={[
                    styles.stepCircle, 
                    step === 'before' && styles.stepInactive,
                    step === 'confirm' && styles.stepCompleted
                  ]}>
                    {step === 'after' ? (
                      <Text style={styles.stepNumber}>2</Text>
                    ) : step === 'confirm' ? (
                      <FontAwesome5 name="check" size={12} color="white" />
                    ) : (
                      <Text style={[styles.stepNumber, styles.stepNumberInactive]}>2</Text>
                    )}
                  </View>
                  <Text style={[
                    styles.stepLabel,
                    step === 'before' && styles.stepLabelInactive,
                    step === 'confirm' && styles.stepLabelCompleted
                  ]}>
                    After Photo
                  </Text>
                </View>

                <View style={styles.stepLine} />

                <View style={styles.step}>
                  <View style={[
                    styles.stepCircle,
                    step !== 'confirm' && styles.stepInactive
                  ]}>
                    <Text style={[
                      styles.stepNumber,
                      step !== 'confirm' && styles.stepNumberInactive
                    ]}>3</Text>
                  </View>
                  <Text style={[
                    styles.stepLabel,
                    step !== 'confirm' && styles.stepLabelInactive
                  ]}>
                    Complete
                  </Text>
                </View>
              </View>

              {/* Photo Taking */}
              {step === 'before' && (
                <View style={styles.photoSection}>
                  <Text style={styles.photoTitle}>Take a "Before" Photo</Text>
                  <Text style={styles.photoSubtitle}>
                    Show the area before starting the chore
                  </Text>
                  
                  {beforePhoto ? (
                    <View style={styles.photoContainer}>
                      <Image source={{ uri: beforePhoto }} style={styles.photoPreview} />
                      <TouchableOpacity 
                        style={styles.retakeButton}
                        onPress={() => showPhotoOptions('before')}
                      >
                        <Text style={styles.retakeButtonText}>Retake Photo</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.photoButton}
                      onPress={() => showPhotoOptions('before')}
                    >
                      <FontAwesome5 name="camera" size={32} color="#6C63FF" />
                      <Text style={styles.photoButtonText}>Take Before Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {step === 'after' && (
                <View style={styles.photoSection}>
                  <Text style={styles.photoTitle}>Take an "After" Photo</Text>
                  <Text style={styles.photoSubtitle}>
                    Show the completed chore result
                  </Text>
                  
                  {afterPhoto ? (
                    <View style={styles.photoContainer}>
                      <Image source={{ uri: afterPhoto }} style={styles.photoPreview} />
                      <TouchableOpacity 
                        style={styles.retakeButton}
                        onPress={() => showPhotoOptions('after')}
                      >
                        <Text style={styles.retakeButtonText}>Retake Photo</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.photoButton}
                      onPress={() => showPhotoOptions('after')}
                    >
                      <FontAwesome5 name="camera" size={32} color="#6C63FF" />
                      <Text style={styles.photoButtonText}>Take After Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {step === 'confirm' && (
                <View style={styles.confirmSection}>
                  <Text style={styles.confirmTitle}>Review & Complete</Text>
                  
                  <View style={styles.photoReview}>
                    <View style={styles.photoReviewItem}>
                      <Text style={styles.photoReviewLabel}>Before</Text>
                      {beforePhoto && (
                        <Image source={{ uri: beforePhoto }} style={styles.photoReviewImage} />
                      )}
                    </View>
                    
                    <View style={styles.photoReviewItem}>
                      <Text style={styles.photoReviewLabel}>After</Text>
                      {afterPhoto && (
                        <Image source={{ uri: afterPhoto }} style={styles.photoReviewImage} />
                      )}
                    </View>
                  </View>
                  
                  {/* Notes Input */}
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Notes (Optional)</Text>
                    <TextInput
                      style={styles.notesInput}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Add any notes about completing this chore..."
                      multiline
                      numberOfLines={3}
                      maxLength={200}
                    />
                  </View>
                  
                  <View style={styles.completionNote}>
                    <FontAwesome5 name="info-circle" size={16} color="#6C63FF" />
                    <Text style={styles.completionNoteText}>
                      You'll receive {chore.coinReward} coins immediately upon completion.
                    </Text>
                  </View>
                </View>
              )}
            </>
          ) : (
            // No photos required
            <View style={styles.noPhotoSection}>
              <FontAwesome5 name="check-circle" size={64} color="#10B981" />
              <Text style={styles.noPhotoTitle}>Ready to Complete?</Text>
              <Text style={styles.noPhotoSubtitle}>
                This chore doesn't require photo proof. Tap complete when you're done!
              </Text>
              
              {/* Notes Input for non-photo chores */}
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Notes (Optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any notes about completing this chore..."
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Button */}
        <View style={styles.buttonContainer}>
          {chore.requiresPhoto ? (
            step === 'confirm' ? (
              <TouchableOpacity 
                style={[styles.completeButton, loading && styles.completeButtonDisabled]} 
                onPress={handleCompleteChore}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <FontAwesome5 name="check" size={18} color="white" />
                    <Text style={styles.completeButtonText}>Complete Chore</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.nextButton, (step === 'before' && !beforePhoto) || (step === 'after' && !afterPhoto) ? styles.nextButtonDisabled : null]}
                onPress={step === 'before' ? () => setStep('after') : () => setStep('confirm')}
                disabled={(step === 'before' && !beforePhoto) || (step === 'after' && !afterPhoto)}
              >
                <Text style={styles.nextButtonText}>
                  {step === 'before' ? 'Next: After Photo' : 'Next: Review'}
                </Text>
                <FontAwesome5 name="arrow-right" size={16} color="white" />
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity 
              style={[styles.completeButton, loading && styles.completeButtonDisabled]} 
              onPress={handleCompleteChore}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <FontAwesome5 name="check" size={18} color="white" />
                  <Text style={styles.completeButtonText}>Complete Chore</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAwareScrollView>
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
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingTop: 10,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  choreInfo: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  choreTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  choreDescription: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  choreMetadata: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16A34A',
  },
  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  photoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C63FF',
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 30,
  },
  step: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepCompleted: {
    backgroundColor: '#10B981',
  },
  stepInactive: {
    backgroundColor: '#E5E7EB',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  stepNumberInactive: {
    color: '#9CA3AF',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C63FF',
  },
  stepLabelCompleted: {
    color: '#10B981',
  },
  stepLabelInactive: {
    color: '#9CA3AF',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  photoSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  photoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  photoSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  photoButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#6C63FF',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C63FF',
  },
  photoContainer: {
    width: '100%',
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  retakeButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retakeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  photoReview: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  photoReviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  photoReviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  photoReviewImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  notesContainer: {
    marginTop: 16,
    marginBottom: 20,
    width: '100%',
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'left',
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#1F2937',
    width: '100%',
  },
  completionNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  completionNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#6C63FF',
    fontWeight: '500',
  },
  noPhotoSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  noPhotoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  noPhotoSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Account for safe area
  },
  completeButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  completeButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowColor: '#9CA3AF',
  },
  completeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#6C63FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  nextButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 