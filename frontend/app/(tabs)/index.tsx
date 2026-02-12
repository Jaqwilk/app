import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  Pressable,
  ActionSheetIOS,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { dailyAPI, aiAPI } from '../../src/services/api';
import { theme } from '../../src/theme';
import { ScreenWrapper, AnimatedChip, ScanShimmer } from '../../src/components/ui';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function HomeTab() {
  const router = useRouter();
  const { user } = useAuthStore();
  const inputRef = useRef<TextInput>(null);
  const [input, setInput] = useState('');
  const [ingredients, setIngredients] = useState<{ name: string; confidence: number }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Daily totals
  const [dailyTotals, setDailyTotals] = useState({
    total_calories: 0,
    total_protein: 0,
    total_carbs: 0,
    total_fat: 0,
  });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadDailyLog();
  }, []);

  const loadDailyLog = async () => {
    try {
      const log = await dailyAPI.getLog(today);
      setDailyTotals({
        total_calories: log.total_calories || 0,
        total_protein: log.total_protein || 0,
        total_carbs: log.total_carbs || 0,
        total_fat: log.total_fat || 0,
      });
    } catch (error) {
      console.error('Error loading daily log:', error);
    }
  };

  const remainingCalories = Math.max(0, (user?.daily_calories || 2000) - dailyTotals.total_calories);
  const remainingProtein = Math.max(0, (user?.daily_protein || 150) - dailyTotals.total_protein);
  const remainingCarbs = Math.max(0, (user?.daily_carbs || 200) - dailyTotals.total_carbs);
  const remainingFat = Math.max(0, (user?.daily_fat || 67) - dailyTotals.total_fat);

  const showImageOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleCamera();
          } else if (buttonIndex === 2) {
            handleGallery();
          }
        }
      );
    } else {
      Alert.alert(
        'Add Photo',
        'Scan your fridge to detect ingredients',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: handleCamera },
          { text: 'Choose from Library', onPress: handleGallery },
        ]
      );
    }
  };

  const handleCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is needed to scan your fridge');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        await scanImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const handleGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Gallery access is needed');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        await scanImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to open gallery');
    }
  };

  const scanImage = async (base64: string) => {
    setIsScanning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const response = await aiAPI.scanIngredients(base64);
      const newIngredients = [...(response.ingredients || []), ...(response.uncertain || [])];
      setIngredients(prev => [...prev, ...newIngredients]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Scan Error', error.response?.data?.detail || 'Failed to analyze image');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsScanning(false);
    }
  };

  const removeIngredient = (name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIngredients(ingredients.filter(i => i.name !== name));
  };

  const handleSubmit = async () => {
    // Auto-detect mode based on input
    const hasIngredients = ingredients.length > 0;
    const hasText = input.trim().length > 0;
    
    if (!hasIngredients && !hasText) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('What would you like to eat?', 'Type what you\'re craving or scan your fridge');
      return;
    }

    // Determine mode automatically
    let mode = 'mood';
    if (hasIngredients && hasText) {
      mode = 'hybrid';
    } else if (hasIngredients) {
      mode = 'fridge';
    }

    Keyboard.dismiss();
    setIsGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const params = {
        mode,
        ingredients: ingredients.map(i => i.name),
        craving: input,
        meal_time: 'auto',
        remaining_calories: remainingCalories,
        remaining_protein: remainingProtein,
        remaining_carbs: remainingCarbs,
        remaining_fat: remainingFat,
      };

      const response = await aiAPI.generateMeals(params);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      router.push({
        pathname: '/results',
        params: {
          meals: JSON.stringify(response.options),
          mealTime: response.meal_time,
          mode: mode,
        }
      });
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to generate meals');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <Animated.View 
          entering={FadeInDown.duration(300).delay(100)}
          style={styles.header}
        >
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>FridgeAI</Text>
          </View>
          <View style={styles.todayPill}>
            <Text style={styles.todayText}>Today</Text>
          </View>
          <View style={styles.headerActions}>
            <IconButton 
              icon="refresh-outline" 
              onPress={loadDailyLog}
            />
            <IconButton 
              icon="settings-outline" 
              onPress={() => router.push('/settings')}
            />
          </View>
        </Animated.View>

        {/* Main Content Area */}
        <Pressable 
          style={styles.mainArea} 
          onPress={() => inputRef.current?.focus()}
        >
          {/* Scanning State */}
          {isScanning && (
            <Animated.View 
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={styles.scanningContainer}
            >
              <ScanShimmer />
              <Text style={styles.scanningText}>Analyzing your fridge...</Text>
            </Animated.View>
          )}

          {/* Generating State */}
          {isGenerating && (
            <Animated.View 
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={styles.generatingContainer}
            >
              <Text style={styles.generatingText}>Generating meals...</Text>
            </Animated.View>
          )}

          {/* Ingredients Display */}
          {!isScanning && !isGenerating && ingredients.length > 0 && (
            <Animated.View 
              entering={FadeIn.duration(200)}
              style={styles.ingredientsContainer}
            >
              <View style={styles.chipContainer}>
                {ingredients.map((item, index) => (
                  <AnimatedChip
                    key={`${item.name}-${index}`}
                    label={item.name}
                    onRemove={() => removeIngredient(item.name)}
                  />
                ))}
              </View>
            </Animated.View>
          )}

          {/* Text Input - Full Screen Style */}
          {!isScanning && !isGenerating && (
            <TextInput
              ref={inputRef}
              style={styles.mainInput}
              value={input}
              onChangeText={setInput}
              placeholder={ingredients.length > 0 
                ? "Add a craving or press return to generate..." 
                : "What are you craving?"
              }
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              returnKeyType="send"
              blurOnSubmit={true}
              onSubmitEditing={handleSubmit}
            />
          )}
        </Pressable>

        {/* Bottom Bar */}
        <Animated.View 
          entering={FadeInDown.duration(300).delay(200)}
          style={styles.bottomBar}
        >
          <View style={styles.remainingPill}>
            <Text style={styles.remainingLabel}>Remaining</Text>
            <Text style={styles.remainingCalories}>{remainingCalories} cal</Text>
          </View>
          
          <AddButton onPress={showImageOptions} />
        </Animated.View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

// Icon Button Component
interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

const IconButton: React.FC<IconButtonProps> = ({ icon, onPress }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, theme.animation.spring.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, theme.animation.spring.gentle);
  };

  return (
    <AnimatedPressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.iconButton, animatedStyle]}
    >
      <Ionicons name={icon} size={22} color={theme.colors.text} />
    </AnimatedPressable>
  );
};

// Add Button (+ icon for camera)
const AddButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, theme.animation.spring.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, theme.animation.spring.gentle);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.addButton, animatedStyle]}
    >
      <Ionicons name="add" size={24} color={theme.colors.text} />
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  logoContainer: {
    flex: 1,
  },
  logoText: {
    ...theme.typography.displaySmall,
    color: theme.colors.text,
  },
  todayPill: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  todayText: {
    ...theme.typography.labelMedium,
    color: theme.colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainArea: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
  },
  mainInput: {
    ...theme.typography.headlineLarge,
    color: theme.colors.text,
    flex: 1,
    textAlignVertical: 'top',
  },
  scanningContainer: {
    marginBottom: theme.spacing.xl,
  },
  scanningText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  generatingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingText: {
    ...theme.typography.headlineMedium,
    color: theme.colors.textSecondary,
  },
  ingredientsContainer: {
    marginBottom: theme.spacing.lg,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  remainingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  remainingLabel: {
    ...theme.typography.labelSmall,
    color: theme.colors.textTertiary,
  },
  remainingCalories: {
    ...theme.typography.labelLarge,
    color: theme.colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
