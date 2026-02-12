import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  SlideInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

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

interface InlineMealResultsProps {
  meals: MealOption[];
  onSelectMeal: (meal: MealOption) => void;
  onGenerateMore: () => void;
  onDismiss: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const InlineMealResults: React.FC<InlineMealResultsProps> = ({
  meals,
  onSelectMeal,
  onGenerateMore,
  onDismiss,
}) => {
  return (
    <Animated.View
      entering={SlideInDown.duration(400).springify()}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{meals.length} meals found</Text>
        <Pressable onPress={onDismiss} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {meals.slice(0, 3).map((meal, index) => (
          <MealCard
            key={index}
            meal={meal}
            index={index}
            onSelect={() => onSelectMeal(meal)}
          />
        ))}
      </ScrollView>

      <Pressable 
        onPress={onGenerateMore} 
        style={styles.generateMoreButton}
      >
        <Ionicons name="refresh-outline" size={16} color={theme.colors.textSecondary} />
        <Text style={styles.generateMoreText}>Generate more</Text>
      </Pressable>
    </Animated.View>
  );
};

// Mini Meal Card
interface MealCardProps {
  meal: MealOption;
  index: number;
  onSelect: () => void;
}

const MealCard: React.FC<MealCardProps> = ({ meal, index, onSelect }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, theme.animation.spring.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, theme.animation.spring.gentle);
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(index * 80)}
    >
      <AnimatedPressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(); }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.mealCard, animatedStyle]}
      >
        <Text style={styles.mealName} numberOfLines={2}>{meal.name}</Text>
        
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={12} color={theme.colors.textTertiary} />
          <Text style={styles.prepTime}>{meal.prep_time_min} min</Text>
        </View>

        {/* Macros with colored dots */}
        <View style={styles.macrosRow}>
          <MacroDot value={meal.calories} label="cal" color={theme.colors.calories} />
          <MacroDot value={meal.protein_g} label="P" color={theme.colors.protein} />
          <MacroDot value={meal.carbs_g} label="C" color={theme.colors.carbs} />
          <MacroDot value={meal.fat_g} label="F" color={theme.colors.fat} />
        </View>

        <View style={styles.selectIndicator}>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

// Macro Dot Component
const MacroDot: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => (
  <View style={styles.macroDot}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <Text style={styles.macroValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.labelMedium,
    color: theme.colors.textSecondary,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  scrollContent: {
    paddingRight: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  mealCard: {
    width: 180,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    position: 'relative',
  },
  mealName: {
    ...theme.typography.labelLarge,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    paddingRight: theme.spacing.lg,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  prepTime: {
    ...theme.typography.labelSmall,
    color: theme.colors.textTertiary,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
  },
  macroDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroValue: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
  },
  selectIndicator: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
  },
  generateMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  generateMoreText: {
    ...theme.typography.labelMedium,
    color: theme.colors.textSecondary,
  },
});
