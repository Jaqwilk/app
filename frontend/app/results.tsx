import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable,
  Alert,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'
import { dailyAPI } from '../src/services/api';
import { theme } from '../src/theme';
import { ScreenWrapper, GlassCard, PrimaryButton } from '../src/components/ui';

interface MealOption {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  prep_time_min: number;
  ingredients: { name: string; amount: string }[];
  steps: string[];
  why_it_fits: string;
  shopping_addons?: string[];
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLogging, setIsLogging] = useState(false);
  const [isLogged, setIsLogged] = useState(false);

  const meals: MealOption[] = params.meals ? JSON.parse(params.meals as string) : [];
  const mealTime = params.mealTime as string || 'lunch';
  const mode = params.mode as string || 'mood';
  const singleMeal = params.singleMeal === 'true';

  const meal = meals[0]; // Show first/selected meal
  const today = new Date().toISOString().split('T')[0];

  const handleLogMeal = async () => {
    if (!meal) return;
    
    setIsLogging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await dailyAPI.logMeal(today, meal, mode, mealTime);
      setIsLogged(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 800);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to log meal');
      setIsLogging(false);
    }
  };

  if (!meal) {
    return (
      <ScreenWrapper>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No meal selected</Text>
          <PrimaryButton title="Go Back" onPress={() => router.back()} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(200)} style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Recipe</Text>
        <View style={{ width: 44 }} />
      </Animated.View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Meal Name */}
        <Animated.Text 
          entering={FadeInDown.duration(300).delay(100)}
          style={styles.mealName}
        >
          {meal.name}
        </Animated.Text>

        {/* Time */}
        <Animated.View 
          entering={FadeInDown.duration(300).delay(150)}
          style={styles.timeRow}
        >
          <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.prepTime}>{meal.prep_time_min} min prep time</Text>
        </Animated.View>

        {/* Macros with Colored Dots */}
        <Animated.View 
          entering={FadeInDown.duration(300).delay(200)}
          style={styles.macrosCard}
        >
          <MacroItem 
            label="Calories" 
            value={meal.calories} 
            unit="kcal" 
            color={theme.colors.calories} 
          />
          <MacroItem 
            label="Protein" 
            value={meal.protein_g} 
            unit="g" 
            color={theme.colors.protein} 
          />
          <MacroItem 
            label="Carbs" 
            value={meal.carbs_g} 
            unit="g" 
            color={theme.colors.carbs} 
          />
          <MacroItem 
            label="Fat" 
            value={meal.fat_g} 
            unit="g" 
            color={theme.colors.fat} 
          />
        </Animated.View>

        {/* Why it fits */}
        <Animated.View entering={FadeInDown.duration(300).delay(250)}>
          <Text style={styles.whyFits}>{meal.why_it_fits}</Text>
        </Animated.View>

        {/* Ingredients */}
        <Animated.View entering={FadeInDown.duration(300).delay(300)}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {meal.ingredients.map((ing, idx) => (
            <View key={idx} style={styles.ingredientRow}>
              <View style={styles.ingredientDot} />
              <Text style={styles.ingredientName}>{ing.name}</Text>
              <Text style={styles.ingredientAmount}>{ing.amount}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Shopping Addons */}
        {meal.shopping_addons && meal.shopping_addons.length > 0 && (
          <Animated.View entering={FadeInDown.duration(300).delay(350)}>
            <Text style={[styles.sectionTitle, styles.shoppingTitle]}>Shopping List</Text>
            {meal.shopping_addons.map((item, idx) => (
              <View key={idx} style={styles.ingredientRow}>
                <View style={[styles.ingredientDot, styles.shoppingDot]} />
                <Text style={[styles.ingredientName, styles.shoppingText]}>{item}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Steps */}
        <Animated.View entering={FadeInDown.duration(300).delay(400)}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          {meal.steps.map((step, idx) => (
            <View key={idx} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{idx + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Bottom padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Log Button */}
      <Animated.View 
        entering={FadeInUp.duration(300).delay(500)}
        style={styles.bottomBar}
      >
        <PrimaryButton
          title={isLogged ? "Logged!" : "Log This Meal"}
          icon={isLogged ? "checkmark-circle" : "add-circle-outline"}
          onPress={handleLogMeal}
          loading={isLogging}
          disabled={isLogged}
        />
      </Animated.View>
    </ScreenWrapper>
  );
}

// Back Button
const BackButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      onPressIn={() => { scale.value = withSpring(0.9, theme.animation.spring.snappy); }}
      onPressOut={() => { scale.value = withSpring(1, theme.animation.spring.gentle); }}
      style={[styles.backButton, animatedStyle]}
    >
      <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
    </AnimatedPressable>
  );
};

// Macro Item with Dot
const MacroItem: React.FC<{ label: string; value: number; unit: string; color: string }> = ({ 
  label, value, unit, color 
}) => (
  <View style={styles.macroItem}>
    <View style={[styles.macroDot, { backgroundColor: color }]} />
    <View>
      <Text style={styles.macroValue}>{value}<Text style={styles.macroUnit}>{unit}</Text></Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
  },
  mealName: {
    ...theme.typography.displayMedium,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  prepTime: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
  },
  macrosCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  macroDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  macroValue: {
    ...theme.typography.headlineSmall,
    color: theme.colors.text,
  },
  macroUnit: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
  },
  macroLabel: {
    ...theme.typography.labelSmall,
    color: theme.colors.textTertiary,
  },
  whyFits: {
    ...theme.typography.bodyLarge,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  sectionTitle: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  shoppingTitle: {
    color: theme.colors.warning,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.text,
    marginRight: theme.spacing.md,
  },
  shoppingDot: {
    backgroundColor: theme.colors.warning,
  },
  ingredientName: {
    ...theme.typography.bodyLarge,
    color: theme.colors.text,
    flex: 1,
  },
  shoppingText: {
    color: theme.colors.warning,
  },
  ingredientAmount: {
    ...theme.typography.labelMedium,
    color: theme.colors.textSecondary,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    marginTop: 2,
  },
  stepNumberText: {
    ...theme.typography.labelMedium,
    color: theme.colors.text,
  },
  stepText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 24,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    backgroundColor: theme.colors.background,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  emptyText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.textTertiary,
  },
});
