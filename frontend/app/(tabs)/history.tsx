import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { dailyAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';

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
            try {
              const dateStr = selectedDate.toISOString().split('T')[0];
              await dailyAPI.deleteMeal(dateStr, mealId);
              await loadDailyLog();
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

  const getMealTimeIcon = (mealTime: string) => {
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
      </View>

      {/* Week Calendar */}
      <View style={styles.calendarContainer}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => {
            const newDate = new Date(selectedDate);
            newDate.setDate(newDate.getDate() - 7);
            setSelectedDate(newDate);
          }}
        >
          <Ionicons name="chevron-back" size={20} color="#666" />
        </TouchableOpacity>

        <View style={styles.weekDays}>
          {weekDates.map((date, index) => {
            const { day, date: dateNum } = formatDate(date);
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayItem,
                  isSelected(date) && styles.dayItemSelected,
                  isToday(date) && !isSelected(date) && styles.dayItemToday
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[
                  styles.dayLabel,
                  isSelected(date) && styles.dayLabelSelected
                ]}>
                  {day}
                </Text>
                <Text style={[
                  styles.dateLabel,
                  isSelected(date) && styles.dateLabelSelected
                ]}>
                  {dateNum}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => {
            const newDate = new Date(selectedDate);
            newDate.setDate(newDate.getDate() + 7);
            setSelectedDate(newDate);
          }}
        >
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
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
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.macrosSummary}>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{dailyLog?.total_protein || 0}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroDivider} />
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{dailyLog?.total_carbs || 0}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroDivider} />
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{dailyLog?.total_fat || 0}g</Text>
            <Text style={styles.macroLabel}>Fat</Text>
          </View>
        </View>
      </View>

      {/* Meals List */}
      <ScrollView 
        style={styles.mealsContainer}
        contentContainerStyle={styles.mealsContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.mealsTitle}>Meals</Text>
        
        {dailyLog?.meals && dailyLog.meals.length > 0 ? (
          dailyLog.meals.map((meal, index) => (
            <View key={meal.id || index} style={styles.mealItem}>
              <View style={styles.mealIcon}>
                <Ionicons name={getMealTimeIcon(meal.meal_time)} size={20} color="#666" />
              </View>
              <View style={styles.mealInfo}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealMacros}>
                  {meal.calories} cal • P: {meal.protein}g • C: {meal.carbs}g • F: {meal.fat}g
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeleteMeal(meal.id)}
              >
                <Ionicons name="trash-outline" size={18} color="#E74C3C" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={40} color="#CCC" />
            <Text style={styles.emptyText}>No meals logged</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  calendarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 20,
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
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  dayItemSelected: {
    backgroundColor: '#000',
  },
  dayItemToday: {
    backgroundColor: '#F5F5F5',
  },
  dayLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dayLabelSelected: {
    color: '#FFF',
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  dateLabelSelected: {
    color: '#FFF',
  },
  summaryCard: {
    marginHorizontal: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryDate: {
    fontSize: 14,
    color: '#666',
  },
  summaryCalories: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 16,
  },
  progressFill: {
    height: 8,
    backgroundColor: '#000',
    borderRadius: 4,
  },
  macrosSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  macroDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  mealsContainer: {
    flex: 1,
  },
  mealsContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mealsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  mealIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  mealMacros: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
});
