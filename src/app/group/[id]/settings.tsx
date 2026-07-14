import { useEffect, useRef, useState } from 'react';
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
  useGroupWebhook,
  useLeaveGroup,
  useRemoveMember,
  useSetGroupWebhook,
  useUpdateGroup,
} from '@/features/groups/hooks/useGroups';
import { colors, spacing } from '@/theme';

const WEBHOOK_PREFIX = 'https://discord.com/api/webhooks/';
const CONFIRM_DISARM_MS = 4000;
const CONFIRM_MIN_DELAY_MS = 400;

/**
 * Web-safe two-tap confirm: first call arms `target`, second call within the
 * disarm window (and after the minimum delay, so a reflexive double-click
 * can't blow through the safety) invokes `onConfirm` and disarms. Auto-disarms
 * after CONFIRM_DISARM_MS. Only one target can be armed at a time.
 */
function useTwoTapConfirm<T>() {
  const [armed, setArmed] = useState<T | null>(null);
  const armedAtRef = useRef(0);
  const disarmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (disarmTimeoutRef.current) clearTimeout(disarmTimeoutRef.current);
    };
  }, []);

  function disarm() {
    if (disarmTimeoutRef.current) {
      clearTimeout(disarmTimeoutRef.current);
      disarmTimeoutRef.current = null;
    }
    setArmed(null);
  }

  function trigger(target: T, onConfirm: () => void) {
    if (armed === target) {
      if (Date.now() - armedAtRef.current >= CONFIRM_MIN_DELAY_MS) {
        disarm();
        onConfirm();
      }
      // else: too soon after arming — ignore, treat as accidental double-tap.
      return;
    }
    armedAtRef.current = Date.now();
    setArmed(target);
    if (disarmTimeoutRef.current) clearTimeout(disarmTimeoutRef.current);
    disarmTimeoutRef.current = setTimeout(() => {
      disarmTimeoutRef.current = null;
      setArmed(null);
    }, CONFIRM_DISARM_MS);
  }

  return { armed, trigger };
}

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const { data: group, isLoading: isGroupLoading, isError: isGroupError, refetch: refetchGroup } = useGroup(id);
  const { data: members, isLoading: isMembersLoading } = useGroupMembers(id);
  const updateGroup = useUpdateGroup(id);
  const leaveGroup = useLeaveGroup();
  const removeMember = useRemoveMember(id);
  const deleteGroup = useDeleteGroup();
  const setWebhook = useSetGroupWebhook(id);

  const [name, setName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [dangerError, setDangerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveDeleteConfirm = useTwoTapConfirm<'leave' | 'delete'>();
  const removeConfirm = useTwoTapConfirm<string>();

  useEffect(() => {
    if (group) {
      setName(group.name);
    }
    // Re-sync the form only when a different group loads, not on every refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id]);

  const isOwnerForWebhook = !!group && !!user && group.owner_id === user.id;
  const { data: webhookData } = useGroupWebhook(id, isOwnerForWebhook);
  useEffect(() => {
    setWebhookUrl(webhookData ?? '');
    // Sync only when the fetched webhook changes (owner-only query).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webhookData]);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  const isOwner = !!group && !!user && group.owner_id === user.id;

  function onSave() {
    const trimmedName = name.trim();
    const trimmedUrl = webhookUrl.trim();
    let hasError = false;

    if (trimmedName.length < 1 || trimmedName.length > 80) {
      setNameError('Group name must be 1–80 characters.');
      hasError = true;
    } else {
      setNameError(null);
    }

    if (trimmedUrl && !trimmedUrl.startsWith(WEBHOOK_PREFIX)) {
      setWebhookError(`Webhook URL must start with ${WEBHOOK_PREFIX}`);
      hasError = true;
    } else {
      setWebhookError(null);
    }

    if (hasError) return;

    setFormError(null);
    updateGroup.mutate(
      { name: trimmedName },
      {
        onSuccess: () => {
          // Webhook lives in its own owner-scoped table; save it after the rename succeeds.
          setWebhook.mutate(trimmedUrl || null, {
            onSuccess: () => {
              setSaved(true);
              if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
              savedTimeoutRef.current = setTimeout(() => {
                savedTimeoutRef.current = null;
                setSaved(false);
              }, 2000);
            },
            onError: () => setFormError('Name saved, but the webhook could not be saved. Try again.'),
          });
        },
        // Server/network failures are form-level, not a problem with either field.
        onError: () => setFormError('Could not save changes. Check your connection and try again.'),
      },
    );
  }

  function onLeave() {
    leaveDeleteConfirm.trigger('leave', () => {
      if (!user) return;
      setDangerError(null);
      leaveGroup.mutate(
        { groupId: id, userId: user.id },
        {
          onSuccess: () => router.replace('/(tabs)'),
          onError: () => setDangerError('Could not leave the group. Try again.'),
        },
      );
    });
  }

  function onDelete() {
    leaveDeleteConfirm.trigger('delete', () => {
      setDangerError(null);
      deleteGroup.mutate(id, {
        onSuccess: () => router.replace('/(tabs)'),
        onError: () => setDangerError('Could not delete the group. Try again.'),
      });
    });
  }

  if (isGroupLoading || isMembersLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isGroupError) {
    return (
      <View style={styles.center}>
        <Text color={colors.error}>Could not load this group.</Text>
        <Button title="Retry" onPress={() => refetchGroup()} variant="outline" />
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
          <Input
            label="Name"
            value={name}
            onChangeText={setName}
            maxLength={80}
            error={nameError ?? undefined}
          />
          <Input
            label="Discord webhook URL (posting arrives in Phase 4)"
            value={webhookUrl}
            onChangeText={setWebhookUrl}
            placeholder={`${WEBHOOK_PREFIX}…`}
            autoCapitalize="none"
            autoCorrect={false}
            error={webhookError ?? undefined}
          />
          {formError ? (
            <Text variant="caption" color={colors.error}>
              {formError}
            </Text>
          ) : null}
          <Button
            title={saved ? 'Saved ✓' : 'Save changes'}
            onPress={onSave}
            loading={updateGroup.isPending || setWebhook.isPending}
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
              <Pressable
                onPress={() =>
                  removeConfirm.trigger(m.user_id, () => {
                    setDangerError(null);
                    removeMember.mutate(m.user_id, {
                      onError: () => setDangerError('Could not remove the member. Try again.'),
                    });
                  })
                }
                hitSlop={8}
              >
                {removeConfirm.armed === m.user_id ? (
                  <Text variant="caption" color={colors.error} style={styles.removeConfirmText}>
                    Remove?
                  </Text>
                ) : (
                  <Ionicons name="close-circle-outline" size={22} color={colors.error} />
                )}
              </Pressable>
            ) : null}
          </View>
        ))}
      </Card>

      {dangerError ? (
        <Text variant="caption" color={colors.error}>
          {dangerError}
        </Text>
      ) : null}

      {isOwner ? (
        <Button
          title={leaveDeleteConfirm.armed === 'delete' ? 'Tap again to delete group' : 'Delete group'}
          onPress={onDelete}
          variant="outline"
          loading={deleteGroup.isPending}
        />
      ) : (
        <Button
          title={leaveDeleteConfirm.armed === 'leave' ? 'Tap again to leave group' : 'Leave group'}
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
  removeConfirmText: { fontWeight: '600' },
});
