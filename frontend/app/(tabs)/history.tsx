import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  Layout,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { dailyAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { theme } from '../../src/theme';
import { ScreenWrapper, GlassCard, MacroBar } from '../../src/components/ui';

interface MealLog {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mode: string;
  meal_time: string;
  timestamp: string;
}

interface DailyLog {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  meals: MealLog[];
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function HistoryTab() {
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [weekDates, setWeekDates] = useState<Date[]>([]);

  useEffect(() => {
    generateWeekDates();
  }, [selectedDate]);

  useEffect(() => {
    loadDailyLog();
  }, [selectedDate]);

  const generateWeekDates = () => {
    const dates: Date[] = [];
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 3);
    
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    setWeekDates(dates);
  };

  const loadDailyLog = async () => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    try {
      const log = await dailyAPI.getLog(dateStr);
      setDailyLog(log);
    } catch (error) {
      console.error('Error loading daily log:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDailyLog();
    setRefreshing(false);
  };

  const handleDeleteMeal = async (mealId: string) => {
    Alert.alert(
      'Delete Meal',
      'Are you sure you want to remove this meal?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              const dateStr = selectedDate.toISOString().split('T')[0];
              await dailyAPI.deleteMeal(dateStr, mealId);
              await loadDailyLog();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete meal');
            }
          }
        }
      ]
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const formatDate = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      day: days[date.getDay()],
      date: date.getDate()
    };
  };

  const getMealTimeIcon = (mealTime: string): keyof typeof Ionicons.glyphMap => {
    switch (mealTime) {
      case 'breakfast': return 'sunny-outline';
      case 'lunch': return 'partly-sunny-outline';
      case 'dinner': return 'moon-outline';
      default: return 'restaurant-outline';
    }
  };

  const targetCalories = user?.daily_calories || 2000;
  const consumed = dailyLog?.total_calories || 0;
  const progress = Math.min((consumed / targetCalories) * 100, 100);

  return (
    <ScreenWrapper>
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(300)}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>History</Text>
      </Animated.View>

      {/* Week Calendar */}
      <Animated.View 
        entering={FadeInDown.duration(300).delay(100)}
        style={styles.calendarContainer}
      >
        <NavButton 
          icon="chevron-back" 
          onPress={() => {
            const newDate = new Date(selectedDate);
            newDate.setDate(newDate.getDate() - 7);
            setSelectedDate(newDate);
          }}
        />

        <View style={styles.weekDays}>
          {weekDates.map((date, index) => {
            const { day, date: dateNum } = formatDate(date);
            return (
              <DayButton
                key={index}
                day={day}
                date={dateNum}
                isSelected={isSelected(date)}
                isToday={isToday(date)}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedDate(date);
                }}
              />
            );
          })}
        </View>

        <NavButton 
          icon="chevron-forward" 
          onPress={() => {
            const newDate = new Date(selectedDate);
            newDate.setDate(newDate.getDate() + 7);
            setSelectedDate(newDate);
          }}
        />
      </Animated.View>

      {/* Summary Card */}
      <Animated.View 
        entering={FadeInDown.duration(300).delay(200)}
        style={styles.summaryContainer}
      >
        <GlassCard>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryDate}>
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              })}
            </Text>
            <Text style={styles.summaryCalories}>
              {consumed} / {targetCalories} cal
            </Text>
          </View>
          
          <View style={styles.progressBar}>
            <Animated.View 
              style={[styles.progressFill, { width: `${progress}%` }]} 
            />
          </View>

          <View style={styles.macrosSummary}>
            <MacroStat 
              label="Protein" 
              value={dailyLog?.total_protein || 0} 
              color={theme.colors.protein}
            />
            <View style={styles.macroDivider} />
            <MacroStat 
              label="Carbs" 
              value={dailyLog?.total_carbs || 0} 
              color={theme.colors.carbs}
            />
            <View style={styles.macroDivider} />
            <MacroStat 
              label="Fat" 
              value={dailyLog?.total_fat || 0} 
              color={theme.colors.fat}
            />
          </View>
        </GlassCard>
      </Animated.View>

      {/* Meals List */}
      <ScrollView 
        style={styles.mealsContainer}
        contentContainerStyle={styles.mealsContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.mealsTitle}>Meals</Text>
        
        {dailyLog?.meals && dailyLog.meals.length > 0 ? (
          dailyLog.meals.map((meal, index) => (
            <MealItem
              key={meal.id || index}
              meal={meal}
              index={index}
              onDelete={() => handleDeleteMeal(meal.id)}
            />
          ))
        ) : (
          <Animated.View 
            entering={FadeIn.duration(200)}
            style={styles.emptyState}
          >
            <Ionicons name="restaurant-outline" size={40} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>No meals logged</Text>
          </Animated.View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

// Nav Button Component
const NavButton: React.FC<{ icon: keyof typeof Ionicons.glyphMap; onPress: () => void }> = ({ icon, onPress }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      onPressIn={() => { scale.value = withSpring(0.9, theme.animation.spring.snappy); }}
      onPressOut={() => { scale.value = withSpring(1, theme.animation.spring.gentle); }}
      style={[styles.navButton, animatedStyle]}
    >
      <Ionicons name={icon} size={20} color={theme.colors.textSecondary} />
    </AnimatedPressable>
  );
};

// Day Button Component
interface DayButtonProps {
  day: string;
  date: number;
  isSelected: boolean;
  isToday: boolean;
  onPress: () => void;
}

const DayButton: React.FC<DayButtonProps> = ({ day, date, isSelected, isToday, onPress }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.95, theme.animation.spring.snappy); }}
      onPressOut={() => { scale.value = withSpring(1, theme.animation.spring.gentle); }}
      style={[
        styles.dayItem,
        isSelected && styles.dayItemSelected,
        isToday && !isSelected && styles.dayItemToday,
        animatedStyle,
      ]}
    >
      <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>{day}</Text>
      <Text style={[styles.dateLabel, isSelected && styles.dateLabelSelected]}>{date}</Text>
    </AnimatedPressable>
  );
};

// Macro Stat Component
const MacroStat: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <View style={styles.macroStat}>
    <View style={[styles.macroDot, { backgroundColor: color }]} />
    <View>
      <Text style={styles.macroStatValue}>{value}g</Text>
      <Text style={styles.macroStatLabel}>{label}</Text>
    </View>
  </View>
);

// Meal Item Component
interface MealItemProps {
  meal: MealLog;
  index: number;
  onDelete: () => void;
}

const MealItem: React.FC<MealItemProps> = ({ meal, index, onDelete }) => {
  const getMealTimeIcon = (mealTime: string): keyof typeof Ionicons.glyphMap => {
    switch (mealTime) {
      case 'breakfast': return 'sunny-outline';
      case 'lunch': return 'partly-sunny-outline';
      case 'dinner': return 'moon-outline';
      default: return 'restaurant-outline';
    }
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(200).delay(index * 50)}
      layout={Layout.springify()}
    >
      <GlassCard style={styles.mealItem}>
        <View style={styles.mealIcon}>
          <Ionicons name={getMealTimeIcon(meal.meal_time)} size={20} color={theme.colors.textSecondary} />
        </View>
        <View style={styles.mealInfo}>
          <Text style={styles.mealName}>{meal.name}</Text>
          <Text style={styles.mealMacros}>
            {meal.calories} cal • P: {meal.protein}g • C: {meal.carbs}g • F: {meal.fat}g
          </Text>
        </View>
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
        </TouchableOpacity>
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
  },
  headerTitle: {
    ...theme.typography.displayMedium,
    color: theme.colors.text,
  },
  calendarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  navButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDays: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dayItem: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.lg,
  },
  dayItemSelected: {
    backgroundColor: theme.colors.accent,
  },
  dayItemToday: {
    backgroundColor: theme.colors.surface,
  },
  dayLabel: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  dayLabelSelected: {
    color: theme.colors.textInverse,
  },
  dateLabel: {
    ...theme.typography.headlineSmall,
    color: theme.colors.text,
  },
  dateLabelSelected: {
    color: theme.colors.textInverse,
  },
  summaryContainer: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  summaryDate: {
    ...theme.typography.labelMedium,
    color: theme.colors.textSecondary,
  },
  summaryCalories: {
    ...theme.typography.headlineSmall,
    color: theme.colors.text,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 3,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: 3,
  },
  macrosSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  macroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroStatValue: {
    ...theme.typography.headlineSmall,
    color: theme.colors.text,
  },
  macroStatLabel: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
  },
  macroDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.border,
  },
  mealsContainer: {
    flex: 1,
  },
  mealsContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  mealsTitle: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  mealIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    ...theme.typography.labelLarge,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  mealMacros: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
  },
  deleteButton: {
    padding: theme.spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.section,
    gap: theme.spacing.md,
  },
  emptyText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textTertiary,
  },
});
