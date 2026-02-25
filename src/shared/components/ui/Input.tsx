import { memo, forwardRef } from 'react';
import { View, TextInput, TextInputProps, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '@/theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = memo(
  forwardRef<TextInput, Props>(function Input({ label, error, style, ...props }, ref) {
    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        <TextInput
          ref={ref}
          style={[styles.input, error && styles.inputError, style]}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          {...props}
        />
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }),
);

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  input: {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    ...typography.body,
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginLeft: spacing.xs,
  },
});
