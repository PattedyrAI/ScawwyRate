import { useEffect, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Pressable, ActivityIndicator, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Card, Avatar, ScoreDisplay, TagChip, EmptyState } from '@/shared/components/ui';
import { useGroup } from '@/features/groups/hooks/useGroups';
import { useGroupFeed } from '@/features/items/hooks/useItems';
import type { RatingFeedRow } from '@/features/items/items.service';
import { formatRelativeDate } from '@/shared/utils/formatDate';
import { colors, spacing, borderRadius } from '@/theme';

export default function GroupFeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: group, isLoading: isGroupLoading } = useGroup(id);
  const { data: feed, isLoading: isFeedLoading, isError, refetch } = useGroupFeed(id);
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  async function copyCode() {
    if (!group) return;
    await Clipboard.setStringAsync(group.invite_code);
    setCopied(true);
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = setTimeout(() => {
      copiedTimeoutRef.current = null;
      setCopied(false);
    }, 2000);
  }

  if (isGroupLoading) {
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
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text color={colors.primary}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const listHeader = (
    <View style={styles.listHeader}>
      <Card style={styles.inviteCard} onPress={copyCode}>
        <Text variant="labelSmall" color={colors.textMuted}>
          INVITE CODE
        </Text>
        <View style={styles.inviteRow}>
          <Text style={styles.inviteCode}>{group.invite_code}</Text>
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={20}
            color={copied ? colors.success : colors.textSecondary}
          />
        </View>
        <Text variant="caption" color={colors.textMuted}>
          {copied ? 'Copied!' : 'Tap to copy — share it to invite friends.'}
        </Text>
      </Card>
      <Button title="Rate something" onPress={() => router.push(`/group/${group.id}/rate`)} fullWidth />
      <Text variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
        Recent ratings
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text variant="h3" style={styles.headerTitle} numberOfLines={1}>
          {group.name}
        </Text>
        <Pressable onPress={() => router.push(`/group/${group.id}/settings`)} hitSlop={12}>
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      {isError && feed && feed.length > 0 ? (
        <View style={styles.refetchErrorBanner}>
          <Text variant="bodySmall" color={colors.error} style={styles.refetchErrorText}>
            Couldn&apos;t refresh the feed.
          </Text>
          <Button title="Retry" onPress={() => refetch()} variant="ghost" size="sm" />
        </View>
      ) : null}

      <FlatList
        data={feed ?? []}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        renderItem={({ item: r }: { item: RatingFeedRow }) => (
          <Card
            style={styles.feedCard}
            onPress={r.items ? () => router.push(`/group/${group.id}/item/${r.items!.id}`) : undefined}
          >
            <View style={styles.feedTop}>
              <Avatar uri={r.profiles?.avatar_url} name={r.profiles?.username} size="sm" />
              <View style={styles.feedWho}>
                <Text variant="bodySmall">@{r.profiles?.username ?? 'unknown'}</Text>
                <Text variant="caption" color={colors.textMuted}>
                  {formatRelativeDate(r.created_at)}
                </Text>
              </View>
              <ScoreDisplay score={r.score} size="sm" />
            </View>
            <View style={styles.feedItemRow}>
              <Text variant="h3" style={styles.feedItemName} numberOfLines={1}>
                {r.items?.name ?? 'Unknown item'}
              </Text>
              {r.items?.categories ? <TagChip label={r.items.categories.name} /> : null}
            </View>
            {r.comment ? (
              <Text variant="bodySmall" color={colors.textSecondary} numberOfLines={2}>
                {r.comment}
              </Text>
            ) : null}
            {r.photo_url ? <Image source={{ uri: r.photo_url }} style={styles.feedPhoto} /> : null}
          </Card>
        )}
        ListEmptyComponent={
          isFeedLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.feedLoading} />
          ) : isError ? (
            <View style={styles.feedError}>
              <Text color={colors.error}>Could not load the feed.</Text>
              <Button title="Retry" onPress={() => refetch()} variant="outline" size="sm" />
            </View>
          ) : (
            <EmptyState
              icon="star-outline"
              title="No ratings yet"
              message="Be the first to rate something in this group."
              actionLabel="Rate something"
              onAction={() => router.push(`/group/${group.id}/rate`)}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  headerTitle: { flex: 1 },
  list: { gap: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  listHeader: { gap: spacing.md, marginBottom: spacing.md },
  inviteCard: { gap: spacing.xs },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inviteCode: { fontSize: 28, fontWeight: '800', letterSpacing: 4, color: colors.primary },
  sectionLabel: { marginTop: spacing.sm },
  feedCard: { gap: spacing.sm },
  feedTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  feedWho: { flex: 1 },
  feedItemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  feedItemName: { flexShrink: 1 },
  feedPhoto: { width: '100%', height: 180, borderRadius: borderRadius.md, backgroundColor: colors.surfaceLight },
  feedLoading: { marginTop: spacing.xxl },
  feedError: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xxl },
  refetchErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  refetchErrorText: { flex: 1, marginRight: spacing.sm },
});
