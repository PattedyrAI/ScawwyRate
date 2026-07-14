import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Input } from '@/shared/components/ui';
import { useJoinGroup } from '@/features/groups/hooks/useGroups';
import { colors, spacing } from '@/theme';

export default function JoinGroupScreen() {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const joinGroup = useJoinGroup();

  function onJoin() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError('Invite codes are exactly 6 characters.');
      return;
    }
    setError(null);
    joinGroup.mutate(trimmed, {
      onSuccess: (group) => router.replace(`/group/${group.id}`),
      onError: (e) =>
        setError(
          e.message.includes('invalid_invite_code')
            ? 'That code does not match any group.'
            : e.message,
        ),
    });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <Text variant="h2">Join a group</Text>
      <Text variant="body" color={colors.textSecondary}>
        Enter the 6-character invite code you were given.
      </Text>
      <Input
        label="Invite code"
        placeholder="ABC234"
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        maxLength={6}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        error={error ?? undefined}
      />
      <Button title="Join group" onPress={onJoin} loading={joinGroup.isPending} fullWidth />
      <Button title="Cancel" onPress={() => router.back()} variant="ghost" fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.lg },
});
