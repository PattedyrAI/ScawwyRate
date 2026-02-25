import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, spacing } from '@/theme';
import { getScoreColor } from '@/theme/colors';

type Size = 'sm' | 'md' | 'lg';

interface Props {
  score: number;
  size?: Size;
  showOutOf?: boolean;
}

export const ScoreDisplay = memo(function ScoreDisplay({ score, size = 'md', showOutOf = true }: Props) {
  const color = getScoreColor(score);
  const textStyle = size === 'lg' ? typography.score : size === 'md' ? typography.scoreMedium : typography.scoreSmall;

  return (
    <View style={styles.container}>
      <Text style={[textStyle, { color }]}>{score}</Text>
      {showOutOf && <Text style={[styles.outOf, sizeStyles[size]]}>/ 10</Text>}
    </View>
  );
});

const sizeStyles: Record<Size, { fontSize: number }> = {
  sm: { fontSize: 12 },
  md: { fontSize: 16 },
  lg: { fontSize: 20 },
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  outOf: {
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
});
