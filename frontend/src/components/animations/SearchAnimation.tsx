import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  interpolate,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme';

type Phase = 'searching' | 'sources' | 'finalizing';

interface SearchAnimationProps {
  onComplete: () => void;
}

export const SearchAnimation: React.FC<SearchAnimationProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<Phase>('searching');
  const [sourceCount, setSourceCount] = useState(5);
  
  const shimmerPosition = useSharedValue(0);

  useEffect(() => {
    // Start shimmer animation
    shimmerPosition.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  useEffect(() => {
    // Phase transitions
    const timers: NodeJS.Timeout[] = [];

    // Searching phase: 1.5s
    timers.push(setTimeout(() => {
      setPhase('sources');
    }, 1500));

    // Sources phase: animate count and wait 2s
    timers.push(setTimeout(() => {
      const countInterval = setInterval(() => {
        setSourceCount(prev => {
          const next = prev + Math.floor(Math.random() * 3) + 1;
          return next > 19 ? 19 : next;
        });
      }, 200);
      timers.push(setTimeout(() => clearInterval(countInterval), 1800) as any);
    }, 1500));

    // Finalizing phase: after 3.3s
    timers.push(setTimeout(() => {
      setPhase('finalizing');
    }, 3500));

    // Complete: after 5s
    timers.push(setTimeout(() => {
      onComplete();
    }, 5000));

    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmerPosition.value, [0, 1], [-100, 200]) },
    ],
  }));

  return (
    <View style={styles.container}>
      {phase === 'searching' && (
        <Animated.View 
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.phaseContainer}
        >
          <View style={styles.textContainer}>
            <Text style={styles.phaseText}>Searching</Text>
            <Animated.View style={[styles.shimmerOverlay, shimmerStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.8)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>
          </View>
        </Animated.View>
      )}

      {phase === 'sources' && (
        <Animated.View 
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.phaseContainer}
        >
          <View style={styles.sourcesRow}>
            {/* Overlapping circles */}
            <View style={styles.circlesContainer}>
              <View style={[styles.sourceCircle, styles.circle1]} />
              <View style={[styles.sourceCircle, styles.circle2]} />
              <View style={[styles.sourceCircle, styles.circle3]} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.sourceText}>{sourceCount} sources</Text>
              <Animated.View style={[styles.shimmerOverlay, shimmerStyle]}>
                <LinearGradient
                  colors={['transparent', 'rgba(255,255,255,0.8)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.shimmerGradient}
                />
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      )}

      {phase === 'finalizing' && (
        <Animated.View 
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.phaseContainer}
        >
          <View style={styles.textContainer}>
            <Text style={styles.phaseText}>Finalizing</Text>
            <Animated.View style={[styles.shimmerOverlay, shimmerStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.8)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
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
    paddingVertical: theme.spacing.xl,
  },
  phaseContainer: {
    alignItems: 'flex-start',
  },
  textContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  phaseText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.textSecondary,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmerGradient: {
    width: 100,
    height: '100%',
  },
  sourcesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  circlesContainer: {
    flexDirection: 'row',
    width: 50,
    height: 24,
    position: 'relative',
  },
  sourceCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    position: 'absolute',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  circle1: {
    backgroundColor: '#3B82F6',
    left: 0,
    zIndex: 3,
  },
  circle2: {
    backgroundColor: '#10B981',
    left: 12,
    zIndex: 2,
  },
  circle3: {
    backgroundColor: '#F59E0B',
    left: 24,
    zIndex: 1,
  },
  sourceText: {
    ...theme.typography.bodyLarge,
    color: theme.colors.textSecondary,
  },
});
