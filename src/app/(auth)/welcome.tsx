import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Text, Button } from '@/shared/components/ui';
import { colors, spacing } from '@/theme';

export default function Welcome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ScawwyRate</Text>
      <Text style={styles.subtitle}>Rate anything, with your friends.</Text>
      <Button title="Get started" onPress={() => router.push('/(auth)/login')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 36, fontWeight: '800', color: colors.primary },
  subtitle: { fontSize: 16, color: colors.textMuted, marginBottom: spacing.lg, textAlign: 'center' },
});
