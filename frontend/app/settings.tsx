import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
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
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { gdprAPI, premiumAPI } from '../src/services/api';
import { theme } from '../src/theme';
import { ScreenWrapper, GlassCard, PrimaryButton, ShimmerLoader } from '../src/components/ui';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const data = await gdprAPI.exportData();
      Alert.alert(
        'Data Export',
        'Your data has been prepared. In a production app, this would download as a file.',
        [{ text: 'OK' }]
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('Exported data:', JSON.stringify(data, null, 2));
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await premiumAPI.activate();
      Alert.alert('Success', 'Premium features activated!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to activate premium');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <ScreenWrapper>
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(200)}
        style={styles.header}
      >
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 44 }} />
      </Animated.View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <Animated.View entering={FadeInDown.duration(300).delay(100)}>
          <GlassCard style={styles.profileCard}>
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
                size={12} 
                color={user?.is_premium ? theme.colors.textInverse : theme.colors.textTertiary} 
              />
              <Text style={[
                styles.premiumText,
                user?.is_premium && styles.premiumTextActive
              ]}>
                {user?.is_premium ? 'Premium' : 'Free'}
              </Text>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Account Section */}
        <Animated.View entering={FadeInDown.duration(300).delay(200)}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <MenuItem
            icon="person-outline"
            label="Edit Profile"
            onPress={() => router.push('/onboarding/profile')}
          />

          {!user?.is_premium && (
            <MenuItem
              icon="star"
              label="Upgrade to Premium"
              subtitle="Unlock AI features"
              onPress={handleActivatePremium}
              highlight
            />
          )}
        </Animated.View>

        {/* Data & Privacy Section */}
        <Animated.View entering={FadeInDown.duration(300).delay(300)}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>
          
          <MenuItem
            icon="download-outline"
            label="Export My Data"
            onPress={handleExportData}
            loading={isExporting}
          />

          <MenuItem
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => {}}
          />

          <MenuItem
            icon="shield-checkmark-outline"
            label="Terms of Service"
            onPress={() => {}}
          />
        </Animated.View>

        {/* Danger Zone */}
        <Animated.View entering={FadeInDown.duration(300).delay(400)}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          
          <MenuItem
            icon="log-out-outline"
            label="Logout"
            onPress={handleLogout}
          />

          <MenuItem
            icon="trash-outline"
            label="Delete Account"
            onPress={handleDeleteAccount}
            loading={isDeleting}
            danger
          />
        </Animated.View>

        {/* Disclaimer */}
        <Animated.View 
          entering={FadeIn.duration(300).delay(500)}
          style={styles.disclaimer}
        >
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.textTertiary} />
          <Text style={styles.disclaimerText}>
            FridgeAI is not medical advice. Always consult a healthcare professional before making dietary changes.
          </Text>
        </Animated.View>

        <Text style={styles.version}>FridgeAI v1.0.0</Text>
      </ScrollView>
    </ScreenWrapper>
  );
}

// Back Button Component
const BackButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      onPressIn={() => { scale.value = withSpring(0.9, theme.animation.spring.snappy); }}
      onPressOut={() => { scale.value = withSpring(1, theme.animation.spring.gentle); }}
      style={[styles.backButton, animatedStyle]}
    >
      <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
    </AnimatedPressable>
  );
};

// Menu Item Component
interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  loading?: boolean;
  danger?: boolean;
  highlight?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ 
  icon, 
  label, 
  subtitle, 
  onPress, 
  loading,
  danger,
  highlight,
}) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={() => { if (!loading) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}}
      onPressIn={() => { scale.value = withSpring(0.98, theme.animation.spring.snappy); }}
      onPressOut={() => { scale.value = withSpring(1, theme.animation.spring.gentle); }}
      disabled={loading}
      style={[styles.menuItem, animatedStyle]}
    >
      <View style={[
        styles.menuIcon,
        danger && styles.menuIconDanger,
        highlight && styles.menuIconHighlight,
      ]}>
        <Ionicons 
          name={icon} 
          size={20} 
          color={danger ? theme.colors.error : highlight ? theme.colors.warning : theme.colors.textSecondary} 
        />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuText, danger && styles.menuTextDanger]}>
          {label}
        </Text>
        {subtitle && <Text style={styles.menuSubtext}>{subtitle}</Text>}
      </View>
      {loading ? (
        <ShimmerLoader width={20} height={20} borderRadius={10} />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.section,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  avatarText: {
    ...theme.typography.displaySmall,
    color: theme.colors.textInverse,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...theme.typography.headlineMedium,
    color: theme.colors.text,
  },
  profileEmail: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.md,
  },
  premiumBadgeActive: {
    backgroundColor: theme.colors.warning,
  },
  premiumText: {
    ...theme.typography.labelSmall,
    color: theme.colors.textTertiary,
  },
  premiumTextActive: {
    color: theme.colors.textInverse,
  },
  sectionTitle: {
    ...theme.typography.labelMedium,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  menuIconDanger: {
    backgroundColor: '#FFEBEE',
  },
  menuIconHighlight: {
    backgroundColor: '#FEF9E7',
  },
  menuContent: {
    flex: 1,
  },
  menuText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.text,
  },
  menuTextDanger: {
    color: theme.colors.error,
  },
  menuSubtext: {
    ...theme.typography.labelSmall,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.xxl,
  },
  disclaimerText: {
    flex: 1,
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  version: {
    ...theme.typography.labelSmall,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: theme.spacing.xxl,
  },
});
