import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';

interface ShimmerLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const ShimmerLoader: React.FC<ShimmerLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = theme.radius.md,
  style,
}) => {
  const translateX = useSharedValue(-1);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1, {
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          translateX.value,
          [-1, 1],
          [-200, 200]
        ),
      },
    ],
  }));

  return (
    <View
      style={[
        styles.container,
        {
          width: width as any,
          height,
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmer, animatedStyle]}>
        <LinearGradient
          colors={[
            theme.colors.shimmerBase,
            theme.colors.shimmerHighlight,
            theme.colors.shimmerBase,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
};

// Shimmer skeleton for scan loading
export const ScanShimmer: React.FC = () => {
  return (
    <View style={scanStyles.container}>
      <View style={scanStyles.header}>
        <ShimmerLoader width={120} height={16} />
        <ShimmerLoader width={80} height={16} />
      </View>
      <View style={scanStyles.chips}>
        <ShimmerLoader width={80} height={32} borderRadius={theme.radius.full} />
        <ShimmerLoader width={100} height={32} borderRadius={theme.radius.full} />
        <ShimmerLoader width={70} height={32} borderRadius={theme.radius.full} />
        <ShimmerLoader width={90} height={32} borderRadius={theme.radius.full} />
      </View>
    </View>
  );
};

// Shimmer skeleton for meal cards
export const MealCardShimmer: React.FC = () => {
  return (
    <View style={mealStyles.card}>
      <ShimmerLoader width="60%" height={20} style={{ marginBottom: 8 }} />
      <ShimmerLoader width="40%" height={14} style={{ marginBottom: 16 }} />
      <View style={mealStyles.macros}>
        <ShimmerLoader width={60} height={40} borderRadius={theme.radius.sm} />
        <ShimmerLoader width={60} height={40} borderRadius={theme.radius.sm} />
        <ShimmerLoader width={60} height={40} borderRadius={theme.radius.sm} />
        <ShimmerLoader width={60} height={40} borderRadius={theme.radius.sm} />
      </View>
      <ShimmerLoader width="100%" height={48} borderRadius={theme.radius.lg} style={{ marginTop: 16 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.shimmerBase,
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    width: 200,
    height: '100%',
  },
});

const scanStyles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
});

const mealStyles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  macros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
