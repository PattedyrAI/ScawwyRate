export const colors = {
  // Backgrounds
  background: '#0a0a0f',
  surface: '#14141f',
  surfaceLight: '#1e1e2e',
  surfaceHighlight: '#2a2a3d',

  // Primary accent (vibrant green — energy drink vibe)
  primary: '#00e676',
  primaryDark: '#00c853',
  primaryLight: '#69f0ae',
  primaryMuted: 'rgba(0, 230, 118, 0.15)',

  // Secondary accent (electric blue)
  secondary: '#448aff',
  secondaryDark: '#2962ff',
  secondaryLight: '#82b1ff',

  // Text
  text: '#ffffff',
  textSecondary: '#a0a0b8',
  textMuted: '#6b6b80',
  textInverse: '#0a0a0f',

  // Score colors (1-10 gradient)
  scoreTerrible: '#ff1744',
  scoreBad: '#ff5252',
  scoreMediocre: '#ff9100',
  scoreAverage: '#ffc400',
  scoreGood: '#aeea00',
  scoreGreat: '#76ff03',
  scoreExcellent: '#00e676',

  // Semantic
  error: '#ff1744',
  warning: '#ffc400',
  success: '#00e676',
  info: '#448aff',

  // UI
  border: '#2a2a3d',
  borderLight: '#3a3a4d',
  overlay: 'rgba(0, 0, 0, 0.7)',
  tabBarBackground: '#0f0f18',
} as const;

export type ColorKey = keyof typeof colors;

export function getScoreColor(score: number): string {
  if (score <= 2) return colors.scoreTerrible;
  if (score <= 3) return colors.scoreBad;
  if (score <= 4) return colors.scoreMediocre;
  if (score <= 5) return colors.scoreAverage;
  if (score <= 6) return colors.scoreGood;
  if (score <= 7) return colors.scoreGood;
  if (score <= 8) return colors.scoreGreat;
  return colors.scoreExcellent;
}
