import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { gdprAPI, premiumAPI } from '../src/services/api';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await gdprAPI.exportData();
      Alert.alert(
        'Data Export',
        'Your data has been prepared. In a production app, this would download as a file.',
        [{ text: 'OK' }]
      );
      console.log('Exported data:', JSON.stringify(data, null, 2));
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await gdprAPI.deleteAccount();
              await logout();
              router.replace('/');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            await logout();
            router.replace('/');
          }
        }
      ]
    );
  };

  const handleActivatePremium = async () => {
    try {
      await premiumAPI.activate();
      Alert.alert('Success', 'Premium features activated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to activate premium');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          <View style={[
            styles.premiumBadge,
            user?.is_premium && styles.premiumBadgeActive
          ]}>
            <Ionicons 
              name="star" 
              size={14} 
              color={user?.is_premium ? '#FFF' : '#999'} 
            />
            <Text style={[
              styles.premiumText,
              user?.is_premium && styles.premiumTextActive
            ]}>
              {user?.is_premium ? 'Premium' : 'Free'}
            </Text>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/onboarding/profile')}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="person-outline" size={20} color="#666" />
            </View>
            <Text style={styles.menuText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          {!user?.is_premium && (
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleActivatePremium}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#FFF8E7' }]}>
                <Ionicons name="star" size={20} color="#E67E22" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuText}>Upgrade to Premium</Text>
                <Text style={styles.menuSubtext}>Unlock AI features</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          )}
        </View>

        {/* Data & Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleExportData}
            disabled={isExporting}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="download-outline" size={20} color="#666" />
            </View>
            <Text style={styles.menuText}>Export My Data</Text>
            {isExporting ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Ionicons name="document-text-outline" size={20} color="#666" />
            </View>
            <Text style={styles.menuText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#666" />
            </View>
            <Text style={styles.menuText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleLogout}
          >
            <View style={styles.menuIcon}>
              <Ionicons name="log-out-outline" size={20} color="#666" />
            </View>
            <Text style={styles.menuText}>Logout</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleDeleteAccount}
            disabled={isDeleting}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="trash-outline" size={20} color="#E74C3C" />
            </View>
            <Text style={[styles.menuText, { color: '#E74C3C' }]}>Delete Account</Text>
            {isDeleting ? (
              <ActivityIndicator size="small" color="#E74C3C" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            )}
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color="#999" />
          <Text style={styles.disclaimerText}>
            FridgeAI is not medical advice. Always consult a healthcare professional before making dietary changes.
          </Text>
        </View>

        <Text style={styles.version}>FridgeAI v1.0.0</Text>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  premiumBadgeActive: {
    backgroundColor: '#E67E22',
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  premiumTextActive: {
    color: '#FFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  menuSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#CCC',
    marginTop: 24,
  },
});
