import { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUpdateUsername, useCheckUsername } from '@/features/auth/hooks/useAuth';
import { colors, typography, spacing, borderRadius } from '@/theme';

export default function UsernameScreen() {
  const [username, setUsername] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const updateUsername = useUpdateUsername();
  const checkUsername = useCheckUsername();

  const handleUsernameChange = useCallback(
    async (text: string) => {
      const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
      setUsername(cleaned);
      setIsAvailable(null);

      if (cleaned.length >= 3) {
        setChecking(true);
        const available = await checkUsername(cleaned);
        setIsAvailable(available);
        setChecking(false);
      }
    },
    [checkUsername],
  );

  const canSubmit = username.length >= 3 && isAvailable === true && !updateUsername.isPending;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Pick a username</Text>
        <Text style={styles.subtitle}>This is how others will find you</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.prefix}>@</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={handleUsernameChange}
            placeholder="username"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
          {checking && <ActivityIndicator size="small" color={colors.textSecondary} />}
        </View>

        {username.length >= 3 && isAvailable !== null && (
          <Text style={[styles.availability, isAvailable ? styles.available : styles.taken]}>
            {isAvailable ? 'Username is available!' : 'Username is taken'}
          </Text>
        )}
        {username.length > 0 && username.length < 3 && (
          <Text style={styles.hint}>At least 3 characters</Text>
        )}
      </View>

      <View style={styles.bottom}>
        <Pressable
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={() => updateUsername.mutate(username)}
          disabled={!canSubmit}
        >
          {updateUsername.isPending ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  content: {
    paddingTop: spacing.xxxl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    height: 56,
  },
  prefix: {
    ...typography.h3,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    ...typography.h3,
    color: colors.text,
  },
  availability: {
    ...typography.bodySmall,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  available: {
    color: colors.success,
  },
  taken: {
    color: colors.error,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  bottom: {
    paddingBottom: spacing.xl,
  },
  button: {
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    ...typography.label,
    color: colors.textInverse,
    fontSize: 16,
  },
});
