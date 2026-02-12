import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  Pressable,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  Layout,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { dailyAPI } from '../src/services/api';
import { theme } from '../src/theme';
import { ScreenWrapper, GlassCard, PrimaryButton, MealCardShimmer } from '../src/components/ui';

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
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [isLogging, setIsLogging] = useState(false);
  const [loggedMealIndex, setLoggedMealIndex] = useState<number | null>(null);

  const meals: MealOption[] = params.meals ? JSON.parse(params.meals as string) : [];
  const mealTime = params.mealTime as string || 'lunch';
  const mode = params.mode as string || 'mood';

  const today = new Date().toISOString().split('T')[0];

  const handleSelectMeal = async (meal: MealOption, index: number) => {
    setIsLogging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await dailyAPI.logMeal(today, meal, mode, mealTime);
      setLoggedMealIndex(index);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1000);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to log meal');
      setIsLogging(false);
    }
  };

  const getMealTimeIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (mealTime) {
      case 'breakfast': return 'sunny-outline';
      case 'lunch': return 'partly-sunny-outline';
      case 'dinner': return 'moon-outline';
      default: return 'restaurant-outline';
    }
  };

  return (
    <ScreenWrapper>
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(200)}
        style={styles.header}
      >
        <BackButton onPress={() => router.back()} />
        <View style={styles.headerCenter}>
          <Ionicons name={getMealTimeIcon()} size={20} color={theme.colors.textSecondary} />
          <Text style={styles.headerTitle}>
            {mealTime.charAt(0).toUpperCase() + mealTime.slice(1)} Options
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </Animated.View>

      {/* Mode Tag */}
      <Animated.View 
        entering={FadeIn.duration(200).delay(100)}
        style={styles.modeTag}
      >
        <Ionicons 
          name={mode === 'fridge' ? 'grid-outline' : mode === 'mood' ? 'heart-outline' : 'layers-outline'} 
          size={14} 
          color={theme.colors.textSecondary} 
        />
        <Text style={styles.modeTagText}>
          {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
        </Text>
      </Animated.View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Text 
          entering={FadeIn.duration(200).delay(150)}
          style={styles.subtitle}
        >
          {meals.length} meal{meals.length !== 1 ? 's' : ''} tailored to your macros
        </Animated.Text>

        {meals.map((meal, index) => (
          <MealCard
            key={index}
            meal={meal}
            index={index}
            isExpanded={expandedIndex === index}
            onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
            onSelect={() => handleSelectMeal(meal, index)}
            isLogging={isLogging && expandedIndex === index}
            isLogged={loggedMealIndex === index}
          />
        ))}

        {meals.length === 0 && (
          <Animated.View 
            entering={FadeIn.duration(200)}
            style={styles.emptyState}
          >
            <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>No meals generated</Text>
            <PrimaryButton
              title="Try Again"
              onPress={() => router.back()}
              variant="outline"
              size="md"
            />
          </Animated.View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

// Back Button Component
const BackButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
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
      style={[styles.backButton, animatedStyle]}
    >
      <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
    </AnimatedPressable>
  );
};

// Meal Card Component
interface MealCardProps {
  meal: MealOption;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  isLogging: boolean;
  isLogged: boolean;
}

const MealCard: React.FC<MealCardProps> = ({ 
  meal, 
  index, 
  isExpanded, 
  onToggle, 
  onSelect,
  isLogging,
  isLogged,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, theme.animation.spring.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, theme.animation.spring.gentle);
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(300).delay(200 + index * 100)}
      layout={Layout.springify().damping(15).stiffness(150)}
    >
      <AnimatedPressable
        onPress={onToggle}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.mealCard, animatedStyle]}
      >
        {/* Header */}
        <View style={styles.mealHeader}>
          <View style={styles.mealHeaderContent}>
            <Text style={styles.mealName}>{meal.name}</Text>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.prepTime}>{meal.prep_time_min} min</Text>
            </View>
          </View>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={theme.colors.textTertiary} 
          />
        </View>

        {/* Macros */}
        <View style={styles.macros}>
          <MacroItem value={meal.calories} label="cal" color={theme.colors.calories} />
          <View style={styles.macroDivider} />
          <MacroItem value={meal.protein_g} label="protein" unit="g" color={theme.colors.protein} />
          <View style={styles.macroDivider} />
          <MacroItem value={meal.carbs_g} label="carbs" unit="g" color={theme.colors.carbs} />
          <View style={styles.macroDivider} />
          <MacroItem value={meal.fat_g} label="fat" unit="g" color={theme.colors.fat} />
        </View>

        {/* Expanded Content */}
        {isExpanded && (
          <Animated.View 
            entering={FadeIn.duration(200)}
            style={styles.expandedContent}
          >
            <Text style={styles.whyFits}>{meal.why_it_fits}</Text>
            
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {meal.ingredients.map((ing, idx) => (
              <Text key={idx} style={styles.ingredient}>
                • {ing.name} - {ing.amount}
              </Text>
            ))}

            {meal.shopping_addons && meal.shopping_addons.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, styles.shoppingTitle]}>
                  Shopping List
                </Text>
                {meal.shopping_addons.map((item, idx) => (
                  <Text key={idx} style={styles.shoppingItem}>• {item}</Text>
                ))}
              </>
            )}

            <Text style={styles.sectionTitle}>Steps</Text>
            {meal.steps.map((step, idx) => (
              <Text key={idx} style={styles.step}>
                {idx + 1}. {step}
              </Text>
            ))}
          </Animated.View>
        )}

        {/* Select Button */}
        <View style={styles.selectButtonContainer}>
          <PrimaryButton
            title={isLogged ? "Logged!" : "Log This Meal"}
            icon={isLogged ? "checkmark-circle" : undefined}
            onPress={onSelect}
            loading={isLogging}
            disabled={isLogged}
          />
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

// Macro Item Component
interface MacroItemProps {
  value: number;
  label: string;
  unit?: string;
  color: string;
}

const MacroItem: React.FC<MacroItemProps> = ({ value, label, unit = '', color }) => (
  <View style={styles.macroItem}>
    <Text style={styles.macroValue}>
      {value}{unit}
    </Text>
    <Text style={styles.macroLabel}>{label}</Text>
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text,
  },
  modeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  modeTagText: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.section,
  },
  subtitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  mealCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.md,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  mealHeaderContent: {
    flex: 1,
  },
  mealName: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  prepTime: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
  },
  macros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    ...theme.typography.headlineSmall,
    color: theme.colors.text,
  },
  macroLabel: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  macroDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  expandedContent: {
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  whyFits: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  sectionTitle: {
    ...theme.typography.labelLarge,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  shoppingTitle: {
    color: theme.colors.warning,
  },
  ingredient: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    paddingLeft: theme.spacing.sm,
  },
  shoppingItem: {
    ...theme.typography.bodyMedium,
    color: theme.colors.warning,
    marginBottom: theme.spacing.xs,
    paddingLeft: theme.spacing.sm,
  },
  step: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    paddingLeft: theme.spacing.sm,
    lineHeight: 22,
  },
  selectButtonContainer: {
    marginTop: theme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.section,
    gap: theme.spacing.lg,
  },
  emptyText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.textTertiary,
  },
});
