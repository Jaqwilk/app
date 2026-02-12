import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { theme } from '../../theme';

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  color: string;
  unit?: string;
}

export const MacroBar: React.FC<MacroBarProps> = ({
  label,
  current,
  target,
  color,
  unit = 'g',
}) => {
  const progress = Math.min((current / target) * 100, 100);
  const width = useSharedValue(0);

  React.useEffect(() => {
    width.value = withSpring(progress, theme.animation.spring.gentle);
  }, [progress]);

  const animatedWidth = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {current}
          <Text style={styles.target}>/{target}{unit}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: color },
            animatedWidth,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  label: {
    ...theme.typography.labelMedium,
    color: theme.colors.textSecondary,
  },
  value: {
    ...theme.typography.labelMedium,
    color: theme.colors.text,
  },
  target: {
    color: theme.colors.textTertiary,
  },
  track: {
    height: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
