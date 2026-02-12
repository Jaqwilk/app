import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  Pressable,
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
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { weightAPI, premiumAPI } from '../../src/services/api';
import { theme } from '../../src/theme';
import { ScreenWrapper, GlassCard, PrimaryButton, MacroBar } from '../../src/components/ui';

interface WeightEntry {
  date: string;
  weight: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ProgressTab() {
  const { user } = useAuthStore();
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [weights, premium] = await Promise.all([
        weightAPI.getHistory(),
        premiumAPI.getStatus()
      ]);
      setWeightHistory(weights);
      setStreak(premium.streak || 0);
    } catch (error) {
      console.error('Error loading progress data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddWeight = async () => {
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Invalid Weight', 'Please enter a valid weight');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const today = new Date().toISOString().split('T')[0];
      await weightAPI.log(today, weight);
      await loadData();
      setShowAddWeight(false);
      setNewWeight('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to log weight');
    }
  };

  const startWeight = weightHistory.length > 0 
    ? weightHistory[weightHistory.length - 1]?.weight 
    : user?.profile?.weight_kg || 0;
  const currentWeight = weightHistory.length > 0 
    ? weightHistory[0]?.weight 
    : user?.profile?.weight_kg || 0;
  const weightChange = currentWeight - startWeight;

  const getGoalStatus = () => {
    const goal = user?.profile?.goal;
    if (goal === 'cut' && weightChange < 0) return { emoji: '🔥', text: 'On track!' };
    if (goal === 'bulk' && weightChange > 0) return { emoji: '💪', text: 'Gaining!' };
    if (goal === 'maintain' && Math.abs(weightChange) < 1) return { emoji: '✓', text: 'Stable' };
    return { emoji: '🎯', text: 'Keep going!' };
  };

  const goalStatus = getGoalStatus();

  return (
    <ScreenWrapper>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <Animated.View 
          entering={FadeInDown.duration(300)}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Progress</Text>
        </Animated.View>

        {/* Streak Card */}
        <Animated.View entering={FadeInDown.duration(300).delay(100)}>
          <GlassCard style={styles.streakCard}>
            <View style={styles.streakIconContainer}>
              <Ionicons name="flame" size={32} color={theme.colors.warning} />
            </View>
            <View style={styles.streakInfo}>
              <Text style={styles.streakCount}>{streak}</Text>
              <Text style={styles.streakLabel}>Day Streak</Text>
            </View>
            <Text style={styles.streakMessage}>
              {streak > 0 ? 'Keep it up!' : 'Start logging!'}
            </Text>
          </GlassCard>
        </Animated.View>

        {/* Weight Summary */}
        <Animated.View entering={FadeInDown.duration(300).delay(200)}>
          <GlassCard>
            <View style={styles.weightHeader}>
              <Text style={styles.sectionTitle}>Weight</Text>
              <AddButton onPress={() => setShowAddWeight(true)} />
            </View>

            <View style={styles.weightStats}>
              <WeightStat label="Start" value={startWeight} />
              <View style={styles.weightArrow}>
                <Ionicons name="arrow-forward" size={20} color={theme.colors.textTertiary} />
              </View>
              <WeightStat label="Current" value={currentWeight} />
              <View style={styles.weightChange}>
                <Text style={[
                  styles.weightChangeValue,
                  weightChange < 0 && styles.weightDown,
                  weightChange > 0 && styles.weightUp
                ]}>
                  {weightChange >= 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                </Text>
                <Text style={styles.goalEmoji}>{goalStatus.emoji}</Text>
              </View>
            </View>

            {/* Weight History */}
            {weightHistory.length > 0 && (
              <View style={styles.weightHistory}>
                <Text style={styles.historyTitle}>Recent</Text>
                {weightHistory.slice(0, 5).map((entry, index) => (
                  <Animated.View
                    key={index}
                    entering={FadeInUp.duration(200).delay(index * 50)}
                    style={styles.historyItem}
                  >
                    <Text style={styles.historyDate}>
                      {new Date(entry.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </Text>
                    <Text style={styles.historyWeight}>{entry.weight.toFixed(1)} kg</Text>
                  </Animated.View>
                ))}
              </View>
            )}
          </GlassCard>
        </Animated.View>

        {/* Targets Card */}
        <Animated.View entering={FadeInDown.duration(300).delay(300)}>
          <GlassCard>
            <Text style={styles.sectionTitle}>Daily Targets</Text>
            
            <MacroBar 
              label="Calories" 
              current={0} 
              target={user?.daily_calories || 2000} 
              color={theme.colors.calories}
              unit=" kcal"
            />
            <MacroBar 
              label="Protein" 
              current={0} 
              target={user?.daily_protein || 150} 
              color={theme.colors.protein}
            />
            <MacroBar 
              label="Carbs" 
              current={0} 
              target={user?.daily_carbs || 200} 
              color={theme.colors.carbs}
            />
            <MacroBar 
              label="Fat" 
              current={0} 
              target={user?.daily_fat || 67} 
              color={theme.colors.fat}
            />
          </GlassCard>
        </Animated.View>
      </ScrollView>

      {/* Add Weight Modal */}
      <Modal
        visible={showAddWeight}
        transparent
        animationType="fade"
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowAddWeight(false)}
        >
          <Animated.View 
            entering={FadeInUp.duration(200)}
            style={styles.modalContent}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Log Weight</Text>
              <TextInput
                style={styles.modalInput}
                value={newWeight}
                onChangeText={setNewWeight}
                placeholder="e.g., 70.5"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
                autoFocus
              />
              <Text style={styles.modalUnit}>kg</Text>
              <View style={styles.modalButtons}>
                <PrimaryButton
                  title="Cancel"
                  onPress={() => { setShowAddWeight(false); setNewWeight(''); }}
                  variant="outline"
                  size="md"
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  title="Save"
                  onPress={handleAddWeight}
                  size="md"
                  style={{ flex: 1 }}
                />
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}

// Add Button Component
const AddButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      onPressIn={() => { scale.value = withSpring(0.9, theme.animation.spring.snappy); }}
      onPressOut={() => { scale.value = withSpring(1, theme.animation.spring.gentle); }}
      style={[styles.addButton, animatedStyle]}
    >
      <Ionicons name="add" size={20} color={theme.colors.textInverse} />
    </AnimatedPressable>
  );
};

// Weight Stat Component
const WeightStat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <View style={styles.weightStat}>
    <Text style={styles.weightStatLabel}>{label}</Text>
    <Text style={styles.weightStatValue}>{value.toFixed(1)} kg</Text>
  </View>
);

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.section,
    gap: theme.spacing.md,
  },
  header: {
    paddingVertical: theme.spacing.lg,
  },
  headerTitle: {
    ...theme.typography.displayMedium,
    color: theme.colors.text,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9E7',
  },
  streakIconContainer: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  streakInfo: {
    flex: 1,
  },
  streakCount: {
    ...theme.typography.displaySmall,
    color: theme.colors.text,
  },
  streakLabel: {
    ...theme.typography.labelMedium,
    color: theme.colors.textSecondary,
  },
  streakMessage: {
    ...theme.typography.labelMedium,
    color: theme.colors.warning,
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  weightStat: {
    alignItems: 'center',
  },
  weightStatLabel: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  weightStatValue: {
    ...theme.typography.headlineSmall,
    color: theme.colors.text,
  },
  weightArrow: {
    paddingHorizontal: theme.spacing.sm,
  },
  weightChange: {
    alignItems: 'center',
  },
  weightChangeValue: {
    ...theme.typography.labelLarge,
    color: theme.colors.textSecondary,
  },
  weightDown: {
    color: theme.colors.success,
  },
  weightUp: {
    color: theme.colors.error,
  },
  goalEmoji: {
    fontSize: 20,
    marginTop: theme.spacing.xs,
  },
  weightHistory: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.lg,
  },
  historyTitle: {
    ...theme.typography.labelMedium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  historyDate: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
  },
  historyWeight: {
    ...theme.typography.labelLarge,
    color: theme.colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surfaceElevated,
    borderTopLeftRadius: theme.radius.xxl,
    borderTopRightRadius: theme.radius.xxl,
    padding: theme.spacing.xxl,
    paddingBottom: theme.spacing.section,
  },
  modalTitle: {
    ...theme.typography.headlineLarge,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  modalInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    ...theme.typography.displaySmall,
    color: theme.colors.text,
    textAlign: 'center',
  },
  modalUnit: {
    ...theme.typography.labelMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
});
