import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { theme } from '../../theme';

// Short, varied prompts that cycle infinitely
const PROMPTS = [
  "What are you craving?",
  "Scan your fridge",
  "Something light?",
  "Hungry for pasta?",
  "Need a quick meal?",
  "Craving something sweet?",
  "What sounds good?",
  "Feeling like tacos?",
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
    // Blinking cursor animation
    cursorOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 530, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 530, easing: Easing.inOut(Easing.ease) })
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
      // Typing phase - character by character
      if (displayText.length < currentPrompt.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentPrompt.slice(0, displayText.length + 1));
        }, 40 + Math.random() * 40); // Slightly faster typing
      } else {
        // Finished typing, wait then start deleting
        timeout = setTimeout(() => {
          setIsTyping(false);
        }, 1800); // Hold for 1.8s
      }
    } else {
      // Deleting phase - faster deletion
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 25); // Fast deletion
      } else {
        // Finished deleting, move to next prompt
        timeout = setTimeout(() => {
          setCurrentPromptIndex((prev) => (prev + 1) % PROMPTS.length);
          setIsTyping(true);
        }, 200);
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
    minHeight: 32,
  },
  text: {
    ...theme.typography.headlineLarge,
    color: theme.colors.textTertiary,
  },
  cursor: {
    ...theme.typography.headlineLarge,
    color: theme.colors.accent,
    fontWeight: '300',
  },
});
