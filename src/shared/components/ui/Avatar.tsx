import { memo } from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import { colors, typography } from '@/theme';

type Size = 'sm' | 'md' | 'lg' | 'xl';

interface Props {
  uri?: string | null;
  name?: string | null;
  size?: Size;
}

const sizeMap: Record<Size, number> = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const fontSizeMap: Record<Size, number> = {
  sm: 14,
  md: 16,
  lg: 22,
  xl: 32,
};

export const Avatar = memo(function Avatar({ uri, name, size = 'md' }: Props) {
  const dim = sizeMap[size];
  const containerStyle = [styles.container, { width: dim, height: dim, borderRadius: dim / 2 }];

  if (uri) {
    return <Image source={{ uri }} style={containerStyle} />;
  }

  const initial = (name || '?')[0].toUpperCase();

  return (
    <View style={[containerStyle, styles.placeholder]}>
      <Text style={[styles.initial, { fontSize: fontSizeMap[size] }]}>{initial}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
});
