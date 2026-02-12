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
  ActivityIndicator,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/store/authStore';
import { dailyAPI, aiAPI } from '../../src/services/api';
import { IngredientChip } from '../../src/components/IngredientChip';

type Mode = 'fridge' | 'mood' | 'hybrid';

export default function HomeTab() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mode, setMode] = useState<Mode>('mood');
  const [input, setInput] = useState('');
  const [ingredients, setIngredients] = useState<{ name: string; confidence: number }[]>([]);
  const [uncertainIngredients, setUncertainIngredients] = useState<{ name: string; confidence: number }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [newIngredient, setNewIngredient] = useState('');
  
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

  const remainingCalories = (user?.daily_calories || 2000) - dailyTotals.total_calories;
  const remainingProtein = (user?.daily_protein || 150) - dailyTotals.total_protein;
  const remainingCarbs = (user?.daily_carbs || 200) - dailyTotals.total_carbs;
  const remainingFat = (user?.daily_fat || 67) - dailyTotals.total_fat;

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
        try {
          const response = await aiAPI.scanIngredients(result.assets[0].base64);
          setIngredients(response.ingredients || []);
          setUncertainIngredients(response.uncertain || []);
        } catch (error: any) {
          Alert.alert('Scan Error', error.response?.data?.detail || 'Failed to analyze image');
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
        try {
          const response = await aiAPI.scanIngredients(result.assets[0].base64);
          setIngredients(response.ingredients || []);
          setUncertainIngredients(response.uncertain || []);
        } catch (error: any) {
          Alert.alert('Scan Error', error.response?.data?.detail || 'Failed to analyze image');
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
    setIngredients(ingredients.filter(i => i.name !== name));
    setUncertainIngredients(uncertainIngredients.filter(i => i.name !== name));
  };

  const confirmUncertain = (item: { name: string; confidence: number }) => {
    setIngredients([...ingredients, item]);
    setUncertainIngredients(uncertainIngredients.filter(i => i.name !== item.name));
  };

  const addIngredient = () => {
    if (newIngredient.trim()) {
      setIngredients([...ingredients, { name: newIngredient.trim(), confidence: 1 }]);
      setNewIngredient('');
      setShowAddIngredient(false);
    }
  };

  const handleGenerate = async () => {
    // Validate based on mode
    if (mode === 'fridge' && ingredients.length === 0) {
      Alert.alert('No Ingredients', 'Please scan your fridge or add ingredients first');
      return;
    }
    if (mode === 'mood' && !input.trim()) {
      Alert.alert('What are you craving?', 'Please enter what you feel like eating');
      return;
    }
    if (mode === 'hybrid' && ingredients.length === 0 && !input.trim()) {
      Alert.alert('Missing Input', 'Please scan your fridge or enter what you\'re craving');
      return;
    }

    setIsGenerating(true);
    try {
      const params = {
        mode,
        ingredients: ingredients.map(i => i.name),
        craving: input,
        meal_time: 'auto',
        remaining_calories: Math.max(0, remainingCalories),
        remaining_protein: Math.max(0, remainingProtein),
        remaining_carbs: Math.max(0, remainingCarbs),
        remaining_fat: Math.max(0, remainingFat),
      };

      const response = await aiAPI.generateMeals(params);
      
      // Navigate to results screen with the meal options
      router.push({
        pathname: '/results',
        params: {
          meals: JSON.stringify(response.options),
          mealTime: response.meal_time,
          mode: mode,
        }
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to generate meals');
    } finally {
      setIsGenerating(false);
    }
  };

  const getModeColor = (m: Mode) => mode === m ? '#000' : '#999';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>FridgeAI</Text>
          </View>
          <View style={styles.todayPill}>
            <Text style={styles.todayText}>Today</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={loadDailyLog} style={styles.headerButton}>
              <Ionicons name="refresh-outline" size={22} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/settings')} style={styles.headerButton}>
              <Ionicons name="settings-outline" size={22} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Mode Selector */}
          <View style={styles.modeSelector}>
            <TouchableOpacity 
              style={[styles.modeTab, mode === 'fridge' && styles.modeTabActive]}
              onPress={() => setMode('fridge')}
            >
              <Ionicons name="grid-outline" size={18} color={getModeColor('fridge')} />
              <Text style={[styles.modeText, mode === 'fridge' && styles.modeTextActive]}>Fridge</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modeTab, mode === 'mood' && styles.modeTabActive]}
              onPress={() => setMode('mood')}
            >
              <Ionicons name="heart-outline" size={18} color={getModeColor('mood')} />
              <Text style={[styles.modeText, mode === 'mood' && styles.modeTextActive]}>Mood</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modeTab, mode === 'hybrid' && styles.modeTabActive]}
              onPress={() => setMode('hybrid')}
            >
              <Ionicons name="layers-outline" size={18} color={getModeColor('hybrid')} />
              <Text style={[styles.modeText, mode === 'hybrid' && styles.modeTextActive]}>Hybrid</Text>
            </TouchableOpacity>
          </View>

          {/* Main Input Area */}
          <View style={styles.inputSection}>
            {/* Text Input */}
            <View style={styles.inputContainer}>
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
                placeholderTextColor="#999"
                multiline
              />
              
              {/* Camera buttons for Fridge and Hybrid modes */}
              {(mode === 'fridge' || mode === 'hybrid') && (
                <View style={styles.cameraButtons}>
                  <TouchableOpacity onPress={handleScanFridge} style={styles.cameraButton}>
                    <Ionicons name="camera-outline" size={22} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handlePickImage} style={styles.cameraButton}>
                    <Ionicons name="images-outline" size={22} color="#666" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Scanning Indicator */}
            {isScanning && (
              <View style={styles.scanningContainer}>
                <ActivityIndicator size="small" color="#000" />
                <Text style={styles.scanningText}>Analyzing your fridge...</Text>
              </View>
            )}

            {/* Ingredients List */}
            {(mode === 'fridge' || mode === 'hybrid') && ingredients.length > 0 && (
              <View style={styles.ingredientsSection}>
                <View style={styles.ingredientsHeader}>
                  <Text style={styles.ingredientsTitle}>Detected Ingredients</Text>
                  <TouchableOpacity onPress={() => setShowAddIngredient(true)}>
                    <Ionicons name="add-circle-outline" size={24} color="#000" />
                  </TouchableOpacity>
                </View>
                <View style={styles.chipContainer}>
                  {ingredients.map((item, index) => (
                    <IngredientChip
                      key={`${item.name}-${index}`}
                      name={item.name}
                      confidence={item.confidence}
                      onRemove={() => removeIngredient(item.name)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Uncertain Ingredients */}
            {(mode === 'fridge' || mode === 'hybrid') && uncertainIngredients.length > 0 && (
              <View style={styles.ingredientsSection}>
                <Text style={styles.uncertainTitle}>Uncertain (tap to confirm)</Text>
                <View style={styles.chipContainer}>
                  {uncertainIngredients.map((item, index) => (
                    <TouchableOpacity key={`uncertain-${item.name}-${index}`} onPress={() => confirmUncertain(item)}>
                      <IngredientChip
                        name={item.name}
                        confidence={item.confidence}
                        onRemove={() => removeIngredient(item.name)}
                        isUncertain
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Remaining Macros */}
          <View style={styles.remainingContainer}>
            <Text style={styles.remainingLabel}>Remaining</Text>
            <Text style={styles.remainingCalories}>{Math.max(0, remainingCalories)} cal</Text>
            <View style={styles.macrosMini}>
              <Text style={styles.macroMiniText}>P: {Math.max(0, remainingProtein)}g</Text>
              <Text style={styles.macroMiniText}>C: {Math.max(0, remainingCarbs)}g</Text>
              <Text style={styles.macroMiniText}>F: {Math.max(0, remainingFat)}g</Text>
            </View>
          </View>

          {/* Generate Button */}
          <TouchableOpacity 
            style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#FFF" />
                <Text style={styles.generateButtonText}>Generate Meals</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Add Ingredient Modal */}
        <Modal
          visible={showAddIngredient}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Ingredient</Text>
              <TextInput
                style={styles.modalInput}
                value={newIngredient}
                onChangeText={setNewIngredient}
                placeholder="e.g., chicken breast"
                placeholderTextColor="#999"
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.modalCancel}
                  onPress={() => { setShowAddIngredient(false); setNewIngredient(''); }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalAdd} onPress={addIngredient}>
                  <Text style={styles.modalAddText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logoContainer: {
    flex: 1,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.5,
  },
  todayPill: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  todayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  headerActions: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'flex-end',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999',
  },
  modeTextActive: {
    color: '#000',
  },
  inputSection: {
    flex: 1,
  },
  inputContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    minHeight: 100,
  },
  mainInput: {
    fontSize: 18,
    color: '#000',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  cameraButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  scanningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  scanningText: {
    fontSize: 14,
    color: '#666',
  },
  ingredientsSection: {
    marginTop: 20,
  },
  ingredientsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ingredientsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  uncertainTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E67E22',
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  remainingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  remainingLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  remainingCalories: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  macrosMini: {
    flexDirection: 'row',
    gap: 12,
  },
  macroMiniText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  generateButton: {
    backgroundColor: '#000',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  generateButtonDisabled: {
    backgroundColor: '#999',
  },
  generateButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
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
    fontSize: 16,
    color: '#000',
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
