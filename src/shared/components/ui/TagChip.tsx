import { memo } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '@/theme';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export const TagChip = memo(function TagChip({ label, selected = false, onPress }: Props) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  text: {
    ...typography.labelSmall,
    color: colors.textSecondary,
  },
  textSelected: {
    color: colors.primary,
  },
});
