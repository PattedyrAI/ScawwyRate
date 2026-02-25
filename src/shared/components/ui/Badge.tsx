import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '@/theme';

interface Props {
  count: number;
  color?: string;
}

export const Badge = memo(function Badge({ count, color = colors.error }: Props) {
  if (count <= 0) return null;

  const display = count > 99 ? '99+' : String(count);

  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.text}>{display}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...typography.labelSmall,
    color: colors.text,
    fontSize: 11,
  },
});
