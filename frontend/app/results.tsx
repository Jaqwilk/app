import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MealCard } from '../src/components/MealCard';
import { dailyAPI } from '../src/services/api';

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

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [isLogging, setIsLogging] = useState(false);

  const meals: MealOption[] = params.meals ? JSON.parse(params.meals as string) : [];
  const mealTime = params.mealTime as string || 'lunch';
  const mode = params.mode as string || 'mood';

  const today = new Date().toISOString().split('T')[0];

  const handleSelectMeal = async (meal: MealOption) => {
    setIsLogging(true);
    try {
      await dailyAPI.logMeal(today, meal, mode, mealTime);
      Alert.alert(
        'Meal Logged!',
        `${meal.name} has been added to your daily log.`,
        [
          { text: 'OK', onPress: () => router.replace('/(tabs)') }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to log meal');
    } finally {
      setIsLogging(false);
    }
  };

  const getMealTimeIcon = () => {
    switch (mealTime) {
      case 'breakfast': return 'sunny-outline';
      case 'lunch': return 'partly-sunny-outline';
      case 'dinner': return 'moon-outline';
      default: return 'restaurant-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name={getMealTimeIcon()} size={20} color="#666" />
          <Text style={styles.headerTitle}>
            {mealTime.charAt(0).toUpperCase() + mealTime.slice(1)} Options
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.modeTag}>
        <Ionicons 
          name={mode === 'fridge' ? 'grid-outline' : mode === 'mood' ? 'heart-outline' : 'layers-outline'} 
          size={14} 
          color="#666" 
        />
        <Text style={styles.modeTagText}>
          {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.subtitle}>
          {meals.length} meal{meals.length !== 1 ? 's' : ''} tailored to your macros
        </Text>

        {meals.map((meal, index) => (
          <MealCard
            key={index}
            meal={meal}
            onSelect={() => handleSelectMeal(meal)}
            isExpanded={expandedIndex === index}
            onToggleExpand={() => setExpandedIndex(expandedIndex === index ? null : index)}
          />
        ))}

        {meals.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={48} color="#999" />
            <Text style={styles.emptyText}>No meals generated</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => router.back()}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {isLogging && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Logging meal...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  modeTagText: {
    fontSize: 13,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
