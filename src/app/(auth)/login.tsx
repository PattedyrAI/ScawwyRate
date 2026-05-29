import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button } from '@/shared/components/ui';
import { signInWithDiscord } from '@/features/auth/auth.service';
import { colors, spacing } from '@/theme';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  async function onDiscord() {
    try {
      setLoading(true);
      await signInWithDiscord();
      // On success the root _layout's onAuthStateChange picks up the session
      // and index.tsx redirects to /(tabs). No manual navigation needed.
    } catch (e: any) {
      Alert.alert('Sign-in failed', e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
      <Button
        title={loading ? 'Connecting…' : 'Continue with Discord'}
        onPress={onDiscord}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
});
