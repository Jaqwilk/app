import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

type Mode = 'fridge' | 'mood' | 'hybrid';

interface ModeSwitchProps {
  value: Mode;
  onChange: (mode: Mode) => void;
}

const modes: { id: Mode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'fridge', label: 'Fridge', icon: 'grid-outline' },
  { id: 'mood', label: 'Mood', icon: 'heart-outline' },
  { id: 'hybrid', label: 'Hybrid', icon: 'layers-outline' },
];

export const ModeSwitch: React.FC<ModeSwitchProps> = ({ value, onChange }) => {
  const activeIndex = modes.findIndex((m) => m.id === value);
  const translateX = useSharedValue(activeIndex * (100 / 3));

  React.useEffect(() => {
    const newIndex = modes.findIndex((m) => m.id === value);
    translateX.value = withSpring(newIndex * 33.33, theme.animation.spring.snappy);
  }, [value]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${translateX.value}%` as any }],
  }));

  const handlePress = (mode: Mode) => {
    if (mode !== value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(mode);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.pill, pillStyle]} />
      {modes.map((mode) => (
        <Pressable
          key={mode.id}
          style={styles.tab}
          onPress={() => handlePress(mode.id)}
        >
          <Ionicons
            name={mode.icon}
            size={18}
            color={value === mode.id ? theme.colors.text : theme.colors.textTertiary}
          />
          <Text
            style={[
              styles.label,
              value === mode.id && styles.labelActive,
            ]}
          >
            {mode.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 4,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: '33.33%',
    height: '100%',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.md,
    ...theme.shadows.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
    zIndex: 1,
  },
  label: {
    ...theme.typography.labelMedium,
    color: theme.colors.textTertiary,
  },
  labelActive: {
    color: theme.colors.text,
  },
});
