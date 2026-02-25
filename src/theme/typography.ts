import { TextStyle } from 'react-native';

export const typography = {
  // Headers
  h1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
  } as TextStyle,
  h2: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.3,
  } as TextStyle,
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  } as TextStyle,

  // Body
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  } as TextStyle,
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  } as TextStyle,

  // Labels
  label: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: 0.2,
  } as TextStyle,
  labelSmall: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0.3,
  } as TextStyle,

  // Special
  score: {
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 56,
    letterSpacing: -1,
  } as TextStyle,
  scoreMedium: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.5,
  } as TextStyle,
  scoreSmall: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  } as TextStyle,

  // Caption
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  } as TextStyle,
} as const;

export type TypographyVariant = keyof typeof typography;
