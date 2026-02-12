import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  interpolate,
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';

type Phase = 'searching' | 'sources' | 'finalizing';

// Food emojis for the overlapping circles (like in the reference)
const FOOD_EMOJIS = ['🥐', '🍔', '🥗', '🍕', '🌮', '🍜', '🥙', '🍱', '🥪', '🍳'];

interface SearchAnimationProps {
  onComplete: () => void;
}

export const SearchAnimation: React.FC<SearchAnimationProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<Phase>('searching');
  const [sourceCount, setSourceCount] = useState(5);
  const [emojis, setEmojis] = useState<string[]>(['🥐', '🍔', '🥗']);
  
  const shimmerPosition = useSharedValue(0);
  const completeCalled = useRef(false);

  // Randomize emojis
  const getRandomEmojis = () => {
    const shuffled = [...FOOD_EMOJIS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  };

  useEffect(() => {
    // Continuous shimmer animation
    shimmerPosition.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Phase 1: Searching (1.2s)
    timers.push(setTimeout(() => {
      setPhase('sources');
      setEmojis(getRandomEmojis());
    }, 1200));

    // Phase 2: Sources - animate count
    let countInterval: NodeJS.Timeout;
    timers.push(setTimeout(() => {
      countInterval = setInterval(() => {
        setSourceCount(prev => {
          const next = prev + Math.floor(Math.random() * 2) + 1;
          if (next >= 9) {
            clearInterval(countInterval);
            return 9;
          }
          return next;
        });
      }, 180);
    }, 1200));

    // Phase 3: Finalizing (after 3s)
    timers.push(setTimeout(() => {
      if (countInterval) clearInterval(countInterval);
      setPhase('finalizing');
    }, 3000));

    // Complete (after 4.2s)
    timers.push(setTimeout(() => {
      if (!completeCalled.current) {
        completeCalled.current = true;
        onComplete();
      }
    }, 4200));

    return () => {
      timers.forEach(t => clearTimeout(t));
      if (countInterval) clearInterval(countInterval);
    };
  }, [onComplete]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmerPosition.value, [0, 1], [-80, 150]) },
    ],
  }));

  return (
    <View style={styles.container}>
      {phase === 'searching' && (
        <Animated.View 
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={styles.phaseContainer}
        >
          <View style={styles.textWrapper}>
            <Text style={styles.phaseText}>searching</Text>
            <Animated.View style={[styles.shimmerOverlay, shimmerStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.9)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>
          </View>
        </Animated.View>
      )}

      {phase === 'sources' && (
        <Animated.View 
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={styles.phaseContainer}
        >
          <View style={styles.sourcesRow}>
            {/* Overlapping emoji circles */}
            <View style={styles.emojiCircles}>
              {emojis.map((emoji, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.emojiCircle, 
                    { left: index * 18, zIndex: 3 - index }
                  ]}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.textWrapper}>
              <Text style={styles.sourceText}>{sourceCount} sources</Text>
              <Animated.View style={[styles.shimmerOverlay, shimmerStyle]}>
                <LinearGradient
                  colors={['transparent', 'rgba(255,255,255,0.9)', 'transparent']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.shimmerGradient}
                />
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      )}

      {phase === 'finalizing' && (
        <Animated.View 
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={styles.phaseContainer}
        >
          <View style={styles.textWrapper}>
            <Text style={styles.phaseText}>finalizing</Text>
            <Animated.View style={[styles.shimmerOverlay, shimmerStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.9)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.md,
  },
  phaseContainer: {
    alignItems: 'flex-start',
  },
  textWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: theme.radius.sm,
  },
  phaseText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.textSecondary,
    paddingHorizontal: 2,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmerGradient: {
    width: 80,
    height: '100%',
  },
  sourcesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  emojiCircles: {
    flexDirection: 'row',
    width: 70,
    height: 28,
    position: 'relative',
  },
  emojiCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    borderWidth: 2,
    borderColor: theme.colors.background,
    ...theme.shadows.sm,
  },
  emoji: {
    fontSize: 14,
  },
  sourceText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.textSecondary,
    paddingHorizontal: 2,
  },
});
