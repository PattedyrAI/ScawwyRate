import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Input } from '@/shared/components/ui';
import { useCreateGroup } from '@/features/groups/hooks/useGroups';
import { friendlyError } from '@/shared/utils/friendlyError';
import { colors, spacing } from '@/theme';

export default function CreateGroupScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createGroup = useCreateGroup();

  function onCreate() {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 80) {
      setError('Group name must be 1–80 characters.');
      return;
    }
    setError(null);
    createGroup.mutate(trimmed, {
      onSuccess: (group) => router.replace(`/group/${group.id}`),
      onError: (e) => setError(friendlyError(e, { invalid_group_name: 'Group name must be 1–80 characters.' })),
    });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <Text variant="h2">Create a group</Text>
      <Text variant="body" color={colors.textSecondary}>
        You will get a 6-character invite code to share with friends.
      </Text>
      <Input
        label="Group name"
        placeholder="e.g. Movie Night"
        value={name}
        onChangeText={(t) => {
          setName(t);
          if (error) setError(null);
        }}
        maxLength={80}
        autoFocus
        error={error ?? undefined}
      />
      <Button title="Create group" onPress={onCreate} loading={createGroup.isPending} fullWidth />
      <Button title="Cancel" onPress={() => router.back()} variant="ghost" fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.lg },
});
