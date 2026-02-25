import { memo } from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { colors, typography, TypographyVariant } from '@/theme';

interface Props extends TextProps {
  variant?: TypographyVariant;
  color?: string;
}

export const Text = memo(function Text({
  variant = 'body',
  color = colors.text,
  style,
  ...props
}: Props) {
  return (
    <RNText style={[typography[variant], { color }, style]} {...props} />
  );
});
