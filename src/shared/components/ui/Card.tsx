import { memo } from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius } from '@/theme';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'elevated';
}

export const Card = memo(function Card({ children, onPress, style, variant = 'default' }: Props) {
  const cardStyle = [styles.card, variant === 'elevated' && styles.elevated, style];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pressed: {
    opacity: 0.9,
  },
});
