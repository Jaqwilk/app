/**
 * FridgeAI Design System
 * Apple + OpenAI + Gemini aesthetic
 * Clean, minimal, professional, premium
 */

export const colors = {
  // Backgrounds
  background: '#FFFFFF',
  surface: '#F8F9FA',
  surfaceElevated: '#FFFFFF',
  surfaceGlass: 'rgba(255, 255, 255, 0.85)',
  
  // Text
  text: '#000000',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  
  // Borders & Dividers
  border: '#F0F0F0',
  borderLight: '#F5F5F5',
  divider: '#E5E7EB',
  
  // Accent (single, restrained)
  accent: '#000000',
  accentSoft: '#374151',
  
  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  
  // Special
  shimmerBase: '#F3F4F6',
  shimmerHighlight: '#FAFAFA',
  overlay: 'rgba(0, 0, 0, 0.4)',
  
  // Macros (subtle)
  protein: '#3B82F6',
  carbs: '#10B981',
  fat: '#F59E0B',
  calories: '#EF4444',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const typography = {
  // Display
  displayLarge: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 41,
  },
  displayMedium: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  displaySmall: {
    fontSize: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 29,
  },
  
  // Headlines
  headlineLarge: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
    lineHeight: 25,
  },
  headlineMedium: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 23,
  },
  headlineSmall: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 21,
  },
  
  // Body
  bodyLarge: {
    fontSize: 17,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 21,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 18,
  },
  
  // Labels
  labelLarge: {
    fontSize: 15,
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 20,
  },
  labelMedium: {
    fontSize: 13,
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 18,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
    lineHeight: 15,
  },
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
};

export const animation = {
  // Durations (ms)
  instant: 100,
  fast: 150,
  normal: 200,
  slow: 300,
  
  // Spring configs for reanimated
  spring: {
    gentle: { damping: 20, stiffness: 200 },
    default: { damping: 15, stiffness: 300 },
    snappy: { damping: 12, stiffness: 400 },
    bouncy: { damping: 10, stiffness: 350 },
  },
  
  // Easing
  easing: {
    easeOut: [0.33, 1, 0.68, 1],
    easeInOut: [0.65, 0, 0.35, 1],
  },
};

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
  animation,
};

export type Theme = typeof theme;
export default theme;
