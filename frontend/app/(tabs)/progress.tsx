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
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { weightAPI, premiumAPI } from '../../src/services/api';

interface WeightEntry {
  date: string;
  weight: number;
}

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
      Alert.alert('Invalid Weight', 'Please enter a valid weight');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      await weightAPI.log(today, weight);
      await loadData();
      setShowAddWeight(false);
      setNewWeight('');
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

  const getGoalEmoji = () => {
    const goal = user?.profile?.goal;
    if (goal === 'cut' && weightChange < 0) return '\u{1F525}';
    if (goal === 'bulk' && weightChange > 0) return '\u{1F4AA}';
    if (goal === 'maintain' && Math.abs(weightChange) < 1) return '\u{2705}';
    return '\u{1F3AF}';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Progress</Text>
        </View>

        {/* Streak Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakIconContainer}>
            <Ionicons name="flame" size={32} color="#E67E22" />
          </View>
          <View style={styles.streakInfo}>
            <Text style={styles.streakCount}>{streak}</Text>
            <Text style={styles.streakLabel}>Day Streak</Text>
          </View>
          <Text style={styles.streakMessage}>
            {streak > 0 ? 'Keep it up!' : 'Start logging!'}
          </Text>
        </View>

        {/* Weight Summary */}
        <View style={styles.weightCard}>
          <View style={styles.weightHeader}>
            <Text style={styles.sectionTitle}>Weight</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddWeight(true)}
            >
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.weightStats}>
            <View style={styles.weightStat}>
              <Text style={styles.weightStatLabel}>Start</Text>
              <Text style={styles.weightStatValue}>{startWeight.toFixed(1)} kg</Text>
            </View>
            <View style={styles.weightArrow}>
              <Ionicons 
                name={weightChange >= 0 ? "arrow-forward" : "arrow-forward"} 
                size={24} 
                color="#999" 
              />
            </View>
            <View style={styles.weightStat}>
              <Text style={styles.weightStatLabel}>Current</Text>
              <Text style={styles.weightStatValue}>{currentWeight.toFixed(1)} kg</Text>
            </View>
            <View style={styles.weightChange}>
              <Text style={[
                styles.weightChangeValue,
                weightChange < 0 && styles.weightDown,
                weightChange > 0 && styles.weightUp
              ]}>
                {weightChange >= 0 ? '+' : ''}{weightChange.toFixed(1)} kg
              </Text>
              <Text style={styles.goalEmoji}>{getGoalEmoji()}</Text>
            </View>
          </View>

          {/* Weight History */}
          {weightHistory.length > 0 && (
            <View style={styles.weightHistory}>
              <Text style={styles.historyTitle}>Recent</Text>
              {weightHistory.slice(0, 7).map((entry, index) => (
                <View key={index} style={styles.historyItem}>
                  <Text style={styles.historyDate}>
                    {new Date(entry.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </Text>
                  <Text style={styles.historyWeight}>{entry.weight.toFixed(1)} kg</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Targets Card */}
        <View style={styles.targetsCard}>
          <Text style={styles.sectionTitle}>Daily Targets</Text>
          
          <View style={styles.targetItem}>
            <View style={styles.targetIcon}>
              <Ionicons name="flame-outline" size={20} color="#E74C3C" />
            </View>
            <View style={styles.targetInfo}>
              <Text style={styles.targetLabel}>Calories</Text>
              <Text style={styles.targetValue}>{user?.daily_calories || 2000} kcal</Text>
            </View>
          </View>

          <View style={styles.targetItem}>
            <View style={styles.targetIcon}>
              <Ionicons name="barbell-outline" size={20} color="#3498DB" />
            </View>
            <View style={styles.targetInfo}>
              <Text style={styles.targetLabel}>Protein</Text>
              <Text style={styles.targetValue}>{user?.daily_protein || 150}g</Text>
            </View>
          </View>

          <View style={styles.targetItem}>
            <View style={styles.targetIcon}>
              <Ionicons name="leaf-outline" size={20} color="#27AE60" />
            </View>
            <View style={styles.targetInfo}>
              <Text style={styles.targetLabel}>Carbs</Text>
              <Text style={styles.targetValue}>{user?.daily_carbs || 200}g</Text>
            </View>
          </View>

          <View style={styles.targetItem}>
            <View style={styles.targetIcon}>
              <Ionicons name="water-outline" size={20} color="#F39C12" />
            </View>
            <View style={styles.targetInfo}>
              <Text style={styles.targetLabel}>Fat</Text>
              <Text style={styles.targetValue}>{user?.daily_fat || 67}g</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add Weight Modal */}
      <Modal
        visible={showAddWeight}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Weight</Text>
            <TextInput
              style={styles.modalInput}
              value={newWeight}
              onChangeText={setNewWeight}
              placeholder="e.g., 70.5"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
              autoFocus
            />
            <Text style={styles.modalUnit}>kg</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancel}
                onPress={() => { setShowAddWeight(false); setNewWeight(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalAdd} onPress={handleAddWeight}>
                <Text style={styles.modalAddText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  streakIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  streakInfo: {
    flex: 1,
  },
  streakCount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
  },
  streakLabel: {
    fontSize: 14,
    color: '#666',
  },
  streakMessage: {
    fontSize: 14,
    color: '#E67E22',
    fontWeight: '600',
  },
  weightCard: {
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weightStat: {
    alignItems: 'center',
  },
  weightStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  weightStatValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  weightArrow: {
    paddingHorizontal: 8,
  },
  weightChange: {
    alignItems: 'center',
  },
  weightChangeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  weightDown: {
    color: '#27AE60',
  },
  weightUp: {
    color: '#E74C3C',
  },
  goalEmoji: {
    fontSize: 20,
    marginTop: 4,
  },
  weightHistory: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
  },
  historyWeight: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  targetsCard: {
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
  },
  targetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  targetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  targetInfo: {
    flex: 1,
  },
  targetLabel: {
    fontSize: 14,
    color: '#666',
  },
  targetValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  modalUnit: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalAdd: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalAddText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
