import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { theme } from '../../theme';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  style?: TextStyle;
  duration?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  suffix = '',
  style,
  duration = 800,
}) => {
  const displayValue = useSharedValue(value);
  const previousValue = useRef(value);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (previousValue.current !== value) {
      const direction = value < previousValue.current ? -1 : 1;
      
      // Animate out
      translateY.value = withSequence(
        withTiming(direction * -20, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: duration / 2, easing: Easing.out(Easing.ease) })
      );
      
      opacity.value = withSequence(
        withTiming(0, { duration: duration / 2 }),
        withTiming(1, { duration: duration / 2 })
      );

      // Update value at midpoint
      setTimeout(() => {
        displayValue.value = value;
      }, duration / 2);

      previousValue.current = value;
    }
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[styles.text, style, animatedStyle]}>
      {Math.round(displayValue.value)}{suffix}
    </Animated.Text>
  );
};

const styles = StyleSheet.create({
  text: {
    ...theme.typography.headlineSmall,
    color: theme.colors.text,
  },
});
