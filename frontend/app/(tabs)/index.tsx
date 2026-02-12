import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInRight,
  Layout,
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
import {
  ScreenWrapper,
  GlassCard,
  PrimaryButton,
  AnimatedChip,
  ModeSwitch,
  ShimmerLoader,
  ScanShimmer,
} from '../../src/components/ui';

type Mode = 'fridge' | 'mood' | 'hybrid';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function HomeTab() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mode, setMode] = useState<Mode>('mood');
  const [input, setInput] = useState('');
  const [ingredients, setIngredients] = useState<{ name: string; confidence: number }[]>([]);
  const [uncertainIngredients, setUncertainIngredients] = useState<{ name: string; confidence: number }[]>([]);
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

  const handleScanFridge = async () => {
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
        setIsScanning(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
          const response = await aiAPI.scanIngredients(result.assets[0].base64);
          setIngredients(response.ingredients || []);
          setUncertainIngredients(response.uncertain || []);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
          Alert.alert('Scan Error', error.response?.data?.detail || 'Failed to analyze image');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
          setIsScanning(false);
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const handlePickImage = async () => {
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
        setIsScanning(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
          const response = await aiAPI.scanIngredients(result.assets[0].base64);
          setIngredients(response.ingredients || []);
          setUncertainIngredients(response.uncertain || []);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
          Alert.alert('Scan Error', error.response?.data?.detail || 'Failed to analyze image');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
          setIsScanning(false);
        }
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to open gallery');
    }
  };

  const removeIngredient = (name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIngredients(ingredients.filter(i => i.name !== name));
    setUncertainIngredients(uncertainIngredients.filter(i => i.name !== name));
  };

  const confirmUncertain = (item: { name: string; confidence: number }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIngredients([...ingredients, item]);
    setUncertainIngredients(uncertainIngredients.filter(i => i.name !== item.name));
  };

  const handleGenerate = async () => {
    // Validate based on mode
    if (mode === 'fridge' && ingredients.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('No Ingredients', 'Please scan your fridge or add ingredients first');
      return;
    }
    if (mode === 'mood' && !input.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('What are you craving?', 'Please enter what you feel like eating');
      return;
    }
    if (mode === 'hybrid' && ingredients.length === 0 && !input.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Missing Input', 'Please scan your fridge or enter what you\'re craving');
      return;
    }

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

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Mode Selector */}
          <Animated.View entering={FadeInDown.duration(300).delay(200)}>
            <ModeSwitch value={mode} onChange={setMode} />
          </Animated.View>

          {/* Main Input Area */}
          <Animated.View 
            entering={FadeInDown.duration(300).delay(300)}
            style={styles.inputSection}
          >
            <GlassCard style={styles.inputCard}>
              <TextInput
                style={styles.mainInput}
                value={input}
                onChangeText={setInput}
                placeholder={
                  mode === 'fridge' 
                    ? "Any specific dish in mind? (optional)" 
                    : mode === 'mood'
                    ? "What are you craving? e.g., chicken and rice"
                    : "What are you craving?"
                }
                placeholderTextColor={theme.colors.textTertiary}
                multiline
              />
              
              {/* Camera buttons for Fridge and Hybrid modes */}
              {(mode === 'fridge' || mode === 'hybrid') && (
                <View style={styles.cameraButtons}>
                  <IconButton 
                    icon="camera-outline" 
                    onPress={handleScanFridge}
                    variant="surface"
                  />
                  <IconButton 
                    icon="images-outline" 
                    onPress={handlePickImage}
                    variant="surface"
                  />
                </View>
              )}
            </GlassCard>
          </Animated.View>

          {/* Scanning State */}
          {isScanning && (
            <Animated.View 
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={styles.scanningSection}
            >
              <GlassCard>
                <ScanShimmer />
                <Text style={styles.scanningText}>Analyzing your fridge...</Text>
              </GlassCard>
            </Animated.View>
          )}

          {/* Ingredients List */}
          {!isScanning && (mode === 'fridge' || mode === 'hybrid') && ingredients.length > 0 && (
            <Animated.View 
              entering={FadeIn.duration(200)}
              style={styles.ingredientsSection}
            >
              <View style={styles.ingredientsHeader}>
                <Text style={styles.ingredientsTitle}>Detected Ingredients</Text>
                <Text style={styles.ingredientsCount}>{ingredients.length}</Text>
              </View>
              <View style={styles.chipContainer}>
                {ingredients.map((item, index) => (
                  <AnimatedChip
                    key={`${item.name}-${index}`}
                    label={item.name}
                    confidence={item.confidence}
                    onRemove={() => removeIngredient(item.name)}
                  />
                ))}
              </View>
            </Animated.View>
          )}

          {/* Uncertain Ingredients */}
          {!isScanning && (mode === 'fridge' || mode === 'hybrid') && uncertainIngredients.length > 0 && (
            <Animated.View 
              entering={FadeIn.duration(200).delay(100)}
              style={styles.ingredientsSection}
            >
              <Text style={styles.uncertainTitle}>Uncertain (tap to confirm)</Text>
              <View style={styles.chipContainer}>
                {uncertainIngredients.map((item, index) => (
                  <AnimatedChip
                    key={`uncertain-${item.name}-${index}`}
                    label={item.name}
                    confidence={item.confidence}
                    variant="uncertain"
                    onPress={() => confirmUncertain(item)}
                    onRemove={() => removeIngredient(item.name)}
                  />
                ))}
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Bottom Section */}
        <Animated.View 
          entering={FadeInDown.duration(300).delay(400)}
          style={styles.bottomSection}
        >
          {/* Remaining Macros */}
          <GlassCard style={styles.macrosCard}>
            <View style={styles.remainingRow}>
              <Text style={styles.remainingLabel}>Remaining</Text>
              <Text style={styles.remainingCalories}>{remainingCalories} cal</Text>
            </View>
            <View style={styles.macrosMini}>
              <MacroMini label="P" value={remainingProtein} color={theme.colors.protein} />
              <MacroMini label="C" value={remainingCarbs} color={theme.colors.carbs} />
              <MacroMini label="F" value={remainingFat} color={theme.colors.fat} />
            </View>
          </GlassCard>

          {/* Generate Button */}
          <PrimaryButton
            title="Generate Meals"
            icon="sparkles"
            onPress={handleGenerate}
            loading={isGenerating}
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

// Icon Button Component
interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: 'default' | 'surface';
}

const IconButton: React.FC<IconButtonProps> = ({ icon, onPress, variant = 'default' }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, theme.animation.spring.snappy);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, theme.animation.spring.gentle);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.iconButton,
        variant === 'surface' && styles.iconButtonSurface,
        animatedStyle,
      ]}
    >
      <Ionicons 
        name={icon} 
        size={22} 
        color={theme.colors.text} 
      />
    </AnimatedPressable>
  );
};

// Mini Macro Display
interface MacroMiniProps {
  label: string;
  value: number;
  color: string;
}

const MacroMini: React.FC<MacroMiniProps> = ({ label, value, color }) => (
  <View style={styles.macroMiniItem}>
    <View style={[styles.macroMiniDot, { backgroundColor: color }]} />
    <Text style={styles.macroMiniText}>{label}: {value}g</Text>
  </View>
);

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
  iconButtonSurface: {
    backgroundColor: theme.colors.surfaceElevated,
    ...theme.shadows.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  inputSection: {
    marginTop: theme.spacing.sm,
  },
  inputCard: {
    minHeight: 120,
  },
  mainInput: {
    ...theme.typography.bodyLarge,
    color: theme.colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  cameraButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  scanningSection: {
    marginTop: theme.spacing.sm,
  },
  scanningText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  ingredientsSection: {
    marginTop: theme.spacing.sm,
  },
  ingredientsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  ingredientsTitle: {
    ...theme.typography.headlineSmall,
    color: theme.colors.text,
  },
  ingredientsCount: {
    ...theme.typography.labelMedium,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
  },
  uncertainTitle: {
    ...theme.typography.labelLarge,
    color: theme.colors.warning,
    marginBottom: theme.spacing.md,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bottomSection: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  macrosCard: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  remainingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  remainingLabel: {
    ...theme.typography.labelMedium,
    color: theme.colors.textSecondary,
  },
  remainingCalories: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text,
  },
  macrosMini: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  macroMiniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  macroMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroMiniText: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
  },
});
