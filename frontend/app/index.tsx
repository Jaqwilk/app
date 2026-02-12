import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        if (user?.profile) {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding/profile');
        }
      }
    }
  }, [isAuthenticated, user, isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>FridgeAI</Text>
            <View style={styles.aiTag}>
              <Ionicons name="sparkles" size={12} color="#000" />
              <Text style={styles.aiTagText}>AI</Text>
            </View>
          </View>
          <Text style={styles.tagline}>Your AI-powered diet assistant</Text>
        </View>

        <View style={styles.featuresSection}>
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Ionicons name="camera-outline" size={24} color="#000" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Scan Your Fridge</Text>
              <Text style={styles.featureDesc}>AI detects ingredients instantly</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Ionicons name="restaurant-outline" size={24} color="#000" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Smart Meal Plans</Text>
              <Text style={styles.featureDesc}>Personalized to your macros</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Ionicons name="fitness-outline" size={24} color="#000" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Track Your Progress</Text>
              <Text style={styles.featureDesc}>Calories, protein, carbs, fat</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonSection}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.secondaryButtonText}>I already have an account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          FridgeAI is not medical advice. Consult a healthcare professional for dietary guidance.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -1,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  aiTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    marginLeft: 4,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
  },
  featuresSection: {
    marginBottom: 48,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 14,
    color: '#666',
  },
  buttonSection: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#000',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 18,
  },
});
