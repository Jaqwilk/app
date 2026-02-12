import React from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  Layout,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface AnimatedChipProps {
  label: string;
  onRemove?: () => void;
  onPress?: () => void;
  variant?: 'default' | 'uncertain' | 'selected';
  confidence?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const AnimatedChip: React.FC<AnimatedChipProps> = ({
  label,
  onRemove,
  onPress,
  variant = 'default',
  confidence,
}) => {
  const handleRemove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRemove?.();
  };

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(200).springify()}
      exiting={FadeOut.duration(150)}
      layout={Layout.springify().damping(15).stiffness(200)}
    >
      <Pressable
        onPress={handlePress}
        style={[
          styles.chip,
          variant === 'uncertain' && styles.chipUncertain,
          variant === 'selected' && styles.chipSelected,
        ]}
      >
        <Text
          style={[
            styles.label,
            variant === 'uncertain' && styles.labelUncertain,
            variant === 'selected' && styles.labelSelected,
          ]}
        >
          {label}
        </Text>
        
        {confidence !== undefined && (
          <Text style={styles.confidence}>
            {Math.round(confidence * 100)}%
          </Text>
        )}
        
        {onRemove && (
          <Pressable onPress={handleRemove} style={styles.removeButton}>
            <Ionicons
              name="close-circle"
              size={18}
              color={variant === 'uncertain' ? theme.colors.warning : theme.colors.textTertiary}
            />
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    paddingVertical: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  chipUncertain: {
    backgroundColor: '#FEF3E7',
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  chipSelected: {
    backgroundColor: theme.colors.accent,
  },
  label: {
    ...theme.typography.labelMedium,
    color: theme.colors.text,
  },
  labelUncertain: {
    color: theme.colors.warning,
  },
  labelSelected: {
    color: theme.colors.textInverse,
  },
  confidence: {
    ...theme.typography.labelSmall,
    color: theme.colors.textTertiary,
    marginLeft: theme.spacing.xs,
  },
  removeButton: {
    marginLeft: theme.spacing.xs,
    padding: 2,
  },
});
