import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Input, Card, Avatar } from '@/shared/components/ui';
import { useAuthStore } from '@/stores/authStore';
import {
  useDeleteGroup,
  useGroup,
  useGroupMembers,
  useLeaveGroup,
  useRemoveMember,
  useUpdateGroup,
} from '@/features/groups/hooks/useGroups';
import { colors, spacing } from '@/theme';

const WEBHOOK_PREFIX = 'https://discord.com/api/webhooks/';

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const { data: group, isLoading } = useGroup(id);
  const { data: members } = useGroupMembers(id);
  const updateGroup = useUpdateGroup(id);
  const leaveGroup = useLeaveGroup();
  const removeMember = useRemoveMember(id);
  const deleteGroup = useDeleteGroup();

  const [name, setName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'leave' | 'delete' | null>(null);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setWebhookUrl(group.discord_webhook_url ?? '');
    }
    // Re-sync the form only when a different group loads, not on every refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id]);

  const isOwner = !!group && !!user && group.owner_id === user.id;

  function onSave() {
    const trimmedName = name.trim();
    const trimmedUrl = webhookUrl.trim();
    if (trimmedName.length < 1 || trimmedName.length > 80) {
      setFormError('Group name must be 1–80 characters.');
      return;
    }
    if (trimmedUrl && !trimmedUrl.startsWith(WEBHOOK_PREFIX)) {
      setFormError(`Webhook URL must start with ${WEBHOOK_PREFIX}`);
      return;
    }
    setFormError(null);
    updateGroup.mutate(
      { name: trimmedName, discord_webhook_url: trimmedUrl || null },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
        onError: (e) => setFormError(e.message),
      },
    );
  }

  function onLeave() {
    if (confirmAction !== 'leave') {
      setConfirmAction('leave');
      return;
    }
    if (!user) return;
    leaveGroup.mutate(
      { groupId: id, userId: user.id },
      { onSuccess: () => router.replace('/(tabs)') },
    );
  }

  function onDelete() {
    if (confirmAction !== 'delete') {
      setConfirmAction('delete');
      return;
    }
    deleteGroup.mutate(id, { onSuccess: () => router.replace('/(tabs)') });
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.center}>
        <Text color={colors.textSecondary}>Group not found (or you are not a member).</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg }]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text variant="h3" style={styles.headerTitle}>
          Settings
        </Text>
      </View>

      {isOwner ? (
        <Card style={styles.section}>
          <Text variant="label" color={colors.textSecondary}>
            Group
          </Text>
          <Input label="Name" value={name} onChangeText={setName} maxLength={80} />
          <Input
            label="Discord webhook URL (posting arrives in Phase 4)"
            value={webhookUrl}
            onChangeText={setWebhookUrl}
            placeholder={`${WEBHOOK_PREFIX}…`}
            autoCapitalize="none"
            autoCorrect={false}
            error={formError ?? undefined}
          />
          <Button
            title={saved ? 'Saved ✓' : 'Save changes'}
            onPress={onSave}
            loading={updateGroup.isPending}
          />
        </Card>
      ) : null}

      <Card style={styles.section}>
        <Text variant="label" color={colors.textSecondary}>
          Members ({members?.length ?? 0})
        </Text>
        {(members ?? []).map((m) => (
          <View key={m.user_id} style={styles.memberRow}>
            <Avatar uri={m.profiles?.avatar_url} name={m.profiles?.username} size="sm" />
            <View style={styles.memberInfo}>
              <Text variant="body">@{m.profiles?.username ?? 'unknown'}</Text>
              <Text variant="caption" color={colors.textMuted}>
                {m.role}
              </Text>
            </View>
            {isOwner && m.user_id !== user?.id ? (
              <Pressable onPress={() => removeMember.mutate(m.user_id)} hitSlop={8}>
                <Ionicons name="close-circle-outline" size={22} color={colors.error} />
              </Pressable>
            ) : null}
          </View>
        ))}
      </Card>

      {isOwner ? (
        <Button
          title={confirmAction === 'delete' ? 'Tap again to delete group' : 'Delete group'}
          onPress={onDelete}
          variant="outline"
          loading={deleteGroup.isPending}
        />
      ) : (
        <Button
          title={confirmAction === 'leave' ? 'Tap again to leave group' : 'Leave group'}
          onPress={onLeave}
          variant="outline"
          loading={leaveGroup.isPending}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerTitle: { flex: 1 },
  section: { gap: spacing.md },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  memberInfo: { flex: 1 },
});
