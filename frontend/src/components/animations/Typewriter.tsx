import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { theme } from '../../theme';

const PROMPTS = [
  "What are you craving?",
  "Scan your fridge",
  "Hungry for something?",
  "What should you eat?",
  "Looking for meal ideas?",
];

interface TypewriterProps {
  isActive: boolean;
}

export const Typewriter: React.FC<TypewriterProps> = ({ isActive }) => {
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  
  const cursorOpacity = useSharedValue(1);

  useEffect(() => {
    // Blinking cursor
    cursorOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    if (!isActive) {
      setDisplayText('');
      return;
    }

    const currentPrompt = PROMPTS[currentPromptIndex];
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      // Typing phase
      if (displayText.length < currentPrompt.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentPrompt.slice(0, displayText.length + 1));
        }, 50 + Math.random() * 50); // Random delay for natural feel
      } else {
        // Finished typing, wait then start deleting
        timeout = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
      }
    } else {
      // Deleting phase
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 30);
      } else {
        // Finished deleting, move to next prompt
        timeout = setTimeout(() => {
          setCurrentPromptIndex((prev) => (prev + 1) % PROMPTS.length);
          setIsTyping(true);
        }, 300);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isTyping, currentPromptIndex, isActive]);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  if (!isActive) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {displayText}
        <Animated.Text style={[styles.cursor, cursorStyle]}>|</Animated.Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 30,
  },
  text: {
    ...theme.typography.headlineLarge,
    color: theme.colors.textTertiary,
  },
  cursor: {
    ...theme.typography.headlineLarge,
    color: theme.colors.textTertiary,
  },
});
