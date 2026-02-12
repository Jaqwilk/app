import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { profileAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
  { id: 'light', label: 'Lightly Active', desc: '1-3 days/week' },
  { id: 'moderate', label: 'Moderately Active', desc: '3-5 days/week' },
  { id: 'active', label: 'Very Active', desc: '6-7 days/week' },
  { id: 'very_active', label: 'Athlete', desc: '2x per day' },
];

const GOALS = [
  { id: 'cut', label: 'Lose Weight', icon: 'trending-down-outline' },
  { id: 'maintain', label: 'Maintain', icon: 'remove-outline' },
  { id: 'bulk', label: 'Build Muscle', icon: 'trending-up-outline' },
];

const DIET_TYPES = [
  { id: 'none', label: 'No Restrictions' },
  { id: 'keto', label: 'Keto' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'halal', label: 'Halal' },
  { id: 'pescatarian', label: 'Pescatarian' },
];

const COMMON_ALLERGIES = [
  'Nuts', 'Dairy', 'Gluten', 'Eggs', 'Shellfish', 'Soy', 'Fish'
];

export default function ProfileOnboarding() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const [profile, setProfile] = useState({
    age: '',
    sex: '',
    height_cm: '',
    weight_kg: '',
    activity_level: 'moderate',
    goal: 'maintain',
    dietary_type: 'none',
    allergies: [] as string[],
    dislikes: [] as string[],
    cooking_time: 'normal',
    budget_mode: false,
  });

  const handleNext = () => {
    if (step === 0) {
      if (!profile.age || !profile.height_cm || !profile.weight_kg) {
        Alert.alert('Missing Info', 'Please fill in all required fields');
        return;
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 0) {
      router.back();
    } else {
      setStep(step - 1);
    }
  };

  const toggleAllergy = (allergy: string) => {
    const newAllergies = profile.allergies.includes(allergy)
      ? profile.allergies.filter(a => a !== allergy)
      : [...profile.allergies, allergy];
    setProfile({ ...profile, allergies: newAllergies });
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const profileData = {
        age: parseInt(profile.age),
        sex: profile.sex || undefined,
        height_cm: parseFloat(profile.height_cm),
        weight_kg: parseFloat(profile.weight_kg),
        activity_level: profile.activity_level,
        goal: profile.goal,
        dietary_type: profile.dietary_type,
        allergies: profile.allergies,
        dislikes: profile.dislikes,
        cooking_time: profile.cooking_time,
        budget_mode: profile.budget_mode,
      };

      const updatedUser = await profileAPI.update(profileData);
      setUser(updatedUser);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Tell us about yourself</Text>
            <Text style={styles.stepSubtitle}>This helps us calculate your targets</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Age *</Text>
              <TextInput
                style={styles.input}
                value={profile.age}
                onChangeText={(text) => setProfile({ ...profile, age: text })}
                placeholder="25"
                placeholderTextColor="#999"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Sex (optional)</Text>
              <View style={styles.optionRow}>
                {['male', 'female'].map((sex) => (
                  <TouchableOpacity
                    key={sex}
                    style={[
                      styles.optionButton,
                      profile.sex === sex && styles.optionButtonActive
                    ]}
                    onPress={() => setProfile({ ...profile, sex })}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      profile.sex === sex && styles.optionButtonTextActive
                    ]}>
                      {sex.charAt(0).toUpperCase() + sex.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Height (cm) *</Text>
              <TextInput
                style={styles.input}
                value={profile.height_cm}
                onChangeText={(text) => setProfile({ ...profile, height_cm: text })}
                placeholder="170"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Weight (kg) *</Text>
              <TextInput
                style={styles.input}
                value={profile.weight_kg}
                onChangeText={(text) => setProfile({ ...profile, weight_kg: text })}
                placeholder="70"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Activity Level</Text>
            <Text style={styles.stepSubtitle}>How active are you typically?</Text>

            {ACTIVITY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.listOption,
                  profile.activity_level === level.id && styles.listOptionActive
                ]}
                onPress={() => setProfile({ ...profile, activity_level: level.id })}
              >
                <View>
                  <Text style={[
                    styles.listOptionTitle,
                    profile.activity_level === level.id && styles.listOptionTitleActive
                  ]}>
                    {level.label}
                  </Text>
                  <Text style={styles.listOptionDesc}>{level.desc}</Text>
                </View>
                {profile.activity_level === level.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#000" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What's your goal?</Text>
            <Text style={styles.stepSubtitle}>We'll adjust your calories accordingly</Text>

            {GOALS.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.goalOption,
                  profile.goal === goal.id && styles.goalOptionActive
                ]}
                onPress={() => setProfile({ ...profile, goal: goal.id })}
              >
                <Ionicons 
                  name={goal.icon as any} 
                  size={28} 
                  color={profile.goal === goal.id ? '#000' : '#666'} 
                />
                <Text style={[
                  styles.goalOptionText,
                  profile.goal === goal.id && styles.goalOptionTextActive
                ]}>
                  {goal.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Dietary Preferences</Text>
            <Text style={styles.stepSubtitle}>Select your diet type</Text>

            <View style={styles.chipContainer}>
              {DIET_TYPES.map((diet) => (
                <TouchableOpacity
                  key={diet.id}
                  style={[
                    styles.chip,
                    profile.dietary_type === diet.id && styles.chipActive
                  ]}
                  onPress={() => setProfile({ ...profile, dietary_type: diet.id })}
                >
                  <Text style={[
                    styles.chipText,
                    profile.dietary_type === diet.id && styles.chipTextActive
                  ]}>
                    {diet.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.stepSubtitle, { marginTop: 32 }]}>Any allergies?</Text>

            <View style={styles.chipContainer}>
              {COMMON_ALLERGIES.map((allergy) => (
                <TouchableOpacity
                  key={allergy}
                  style={[
                    styles.chip,
                    profile.allergies.includes(allergy) && styles.chipActive
                  ]}
                  onPress={() => toggleAllergy(allergy)}
                >
                  <Text style={[
                    styles.chipText,
                    profile.allergies.includes(allergy) && styles.chipTextActive
                  ]}>
                    {allergy}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Almost done!</Text>
            <Text style={styles.stepSubtitle}>A few more preferences</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Cooking Time Preference</Text>
              <View style={styles.optionRow}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    profile.cooking_time === 'quick' && styles.optionButtonActive
                  ]}
                  onPress={() => setProfile({ ...profile, cooking_time: 'quick' })}
                >
                  <Ionicons name="flash-outline" size={18} color={profile.cooking_time === 'quick' ? '#FFF' : '#666'} />
                  <Text style={[
                    styles.optionButtonText,
                    profile.cooking_time === 'quick' && styles.optionButtonTextActive
                  ]}>
                    Quick (&lt;15 min)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    profile.cooking_time === 'normal' && styles.optionButtonActive
                  ]}
                  onPress={() => setProfile({ ...profile, cooking_time: 'normal' })}
                >
                  <Ionicons name="time-outline" size={18} color={profile.cooking_time === 'normal' ? '#FFF' : '#666'} />
                  <Text style={[
                    styles.optionButtonText,
                    profile.cooking_time === 'normal' && styles.optionButtonTextActive
                  ]}>
                    Normal
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.budgetToggle}
              onPress={() => setProfile({ ...profile, budget_mode: !profile.budget_mode })}
            >
              <View>
                <Text style={styles.budgetLabel}>Student Budget Mode</Text>
                <Text style={styles.budgetDesc}>Suggest more affordable ingredients</Text>
              </View>
              <View style={[
                styles.toggle,
                profile.budget_mode && styles.toggleActive
              ]}>
                <View style={[
                  styles.toggleKnob,
                  profile.budget_mode && styles.toggleKnobActive
                ]} />
              </View>
            </TouchableOpacity>
          </View>
        );
    }
  };

  const totalSteps = 5;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.progress}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.progressDot,
                  i <= step && styles.progressDotActive
                ]} 
              />
            ))}
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}
        </ScrollView>

        <View style={styles.footer}>
          {step < totalSteps - 1 ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.nextButton, isLoading && styles.nextButtonDisabled]} 
              onPress={handleComplete}
              disabled={isLoading}
            >
              <Text style={styles.nextButtonText}>
                {isLoading ? 'Setting up...' : 'Get Started'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progress: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  progressDotActive: {
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  stepContent: {
    flex: 1,
    paddingTop: 16,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 14,
  },
  optionButtonActive: {
    backgroundColor: '#000',
  },
  optionButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  optionButtonTextActive: {
    color: '#FFF',
  },
  listOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  listOptionActive: {
    backgroundColor: '#F0F0F0',
    borderWidth: 2,
    borderColor: '#000',
  },
  listOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  listOptionTitleActive: {
    color: '#000',
  },
  listOptionDesc: {
    fontSize: 13,
    color: '#666',
  },
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
  },
  goalOptionActive: {
    backgroundColor: '#F0F0F0',
    borderWidth: 2,
    borderColor: '#000',
  },
  goalOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  goalOptionTextActive: {
    color: '#000',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: '#000',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  chipTextActive: {
    color: '#FFF',
  },
  budgetToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  budgetLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  budgetDesc: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#000',
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  nextButton: {
    backgroundColor: '#000',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonDisabled: {
    backgroundColor: '#999',
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
