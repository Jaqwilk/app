import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, TextStyle, View } from 'react-native';
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
  duration = 600,
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (previousValue.current !== value) {
      const direction = value < previousValue.current ? -1 : 1;
      
      // Slide out animation
      translateY.value = withSequence(
        withTiming(direction * -15, { 
          duration: duration / 2, 
          easing: Easing.out(Easing.cubic) 
        }),
        withTiming(direction * 15, { duration: 0 }),
        withTiming(0, { 
          duration: duration / 2, 
          easing: Easing.out(Easing.cubic) 
        })
      );
      
      opacity.value = withSequence(
        withTiming(0, { duration: duration / 2 }),
        withTiming(1, { duration: duration / 2 })
      );

      // Update displayed value at midpoint
      setTimeout(() => {
        setDisplayValue(value);
      }, duration / 2);

      previousValue.current = value;
    }
  }, [value, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.text, style, animatedStyle]}>
        {Math.round(displayValue)}{suffix}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  text: {
    ...theme.typography.labelLarge,
    color: theme.colors.text,
  },
});
