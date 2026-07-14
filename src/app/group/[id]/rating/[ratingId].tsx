import { useState } from 'react';
import { View, FlatList, StyleSheet, Pressable, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Card, Avatar, Input, ScoreDisplay, LoadingSkeleton } from '@/shared/components/ui';
import { useAuthStore } from '@/stores/authStore';
import {
  useRating,
  useRatingComments,
  useRatingHistory,
  useAddComment,
  useDeleteComment,
} from '@/features/items/hooks/useItems';
import type { CommentWithAuthor } from '@/features/items/items.service';
import { formatRelativeDate } from '@/shared/utils/formatDate';
import { friendlyError } from '@/shared/utils/friendlyError';
import { colors, spacing, borderRadius } from '@/theme';

export default function RatingDetailScreen() {
  const { id: groupId, ratingId } = useLocalSearchParams<{ id: string; ratingId: string }>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const { data: rating, isLoading, isError, refetch } = useRating(ratingId);
  const { data: comments } = useRatingComments(ratingId);
  const { data: history } = useRatingHistory(ratingId);
  const addComment = useAddComment(ratingId);
  const deleteComment = useDeleteComment(ratingId);

  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function onPost() {
    if (!user) return;
    const trimmed = body.trim();
    if (trimmed.length < 1 || trimmed.length > 500) {
      setError('Comments are 1–500 characters.');
      return;
    }
    setError(null);
    addComment.mutate(
      { userId: user.id, body: trimmed },
      {
        onSuccess: () => setBody(''),
        onError: (e) => setError(friendlyError(e)),
      },
    );
  }

  function onDeleteComment(commentId: string) {
    if (confirmDeleteId !== commentId) {
      setConfirmDeleteId(commentId);
      return;
    }
    setConfirmDeleteId(null);
    deleteComment.mutate(commentId, {
      onError: (e) => setError(friendlyError(e)),
    });
  }

  if (isLoading) {
    return (
      <View style={[styles.skeletons, { paddingTop: insets.top + spacing.lg }]}>
        <LoadingSkeleton width="100%" height={140} />
        <LoadingSkeleton width="100%" height={64} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text color={colors.error}>Could not load this rating.</Text>
        <Button title="Retry" onPress={() => refetch()} variant="outline" />
      </View>
    );
  }

  if (!rating) {
    return (
      <View style={styles.center}>
        <Text color={colors.textSecondary}>Rating not found (or you are not a member).</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text color={colors.primary}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const listHeader = (
    <View style={styles.listHeader}>
      <Card style={styles.ratingCard}>
        <View style={styles.ratingTop}>
          <Avatar uri={rating.profiles?.avatar_url} name={rating.profiles?.username} size="sm" />
          <View style={styles.ratingWho}>
            <Text variant="bodySmall">@{rating.profiles?.username ?? 'unknown'}</Text>
            <Text variant="caption" color={colors.textMuted}>
              {formatRelativeDate(rating.created_at)}
            </Text>
          </View>
          <ScoreDisplay score={rating.score} size="md" />
        </View>
        {rating.items ? (
          <Pressable
            onPress={() => router.push(`/group/${groupId}/item/${rating.items!.id}`)}
            hitSlop={4}
          >
            <Text variant="h3" color={colors.primary} numberOfLines={1}>
              {rating.items.name}
            </Text>
            {rating.items.categories ? (
              <Text variant="caption" color={colors.textMuted}>
                {rating.items.categories.name}
              </Text>
            ) : null}
          </Pressable>
        ) : null}
        {rating.comment ? (
          <Text variant="body" color={colors.textSecondary}>
            {rating.comment}
          </Text>
        ) : null}
        {rating.photo_url ? <Image source={{ uri: rating.photo_url }} style={styles.photo} /> : null}
      </Card>

      {rating.review_count > 1 && (history ?? []).length > 0 ? (
        <Card style={styles.historyCard}>
          <Text variant="label" color={colors.textSecondary}>
            Re-review history (rated {rating.review_count} times)
          </Text>
          {(history ?? []).map((h) => (
            <View key={h.id} style={styles.historyRow}>
              <ScoreDisplay score={h.previous_score} size="sm" />
              <View style={styles.historyInfo}>
                {h.previous_comment ? (
                  <Text variant="caption" color={colors.textSecondary} numberOfLines={2}>
                    {h.previous_comment}
                  </Text>
                ) : (
                  <Text variant="caption" color={colors.textMuted}>
                    (no comment)
                  </Text>
                )}
                <Text variant="caption" color={colors.textMuted}>
                  until {formatRelativeDate(h.changed_at)}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      <Text variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
        Comments ({rating.comment_count})
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text variant="h3" style={styles.headerTitle}>
          Rating
        </Text>
      </View>

      <FlatList
        data={comments ?? []}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        renderItem={({ item: c }: { item: CommentWithAuthor }) => (
          <Card style={styles.commentCard}>
            <View style={styles.commentTop}>
              <Avatar uri={c.profiles?.avatar_url} name={c.profiles?.username} size="sm" />
              <View style={styles.commentWho}>
                <Text variant="bodySmall">@{c.profiles?.username ?? 'unknown'}</Text>
                <Text variant="caption" color={colors.textMuted}>
                  {formatRelativeDate(c.created_at)}
                </Text>
              </View>
              {c.user_id === user?.id ? (
                <Pressable onPress={() => onDeleteComment(c.id)} hitSlop={8}>
                  {confirmDeleteId === c.id ? (
                    <Text variant="caption" color={colors.error} style={styles.deleteConfirm}>
                      Delete?
                    </Text>
                  ) : (
                    <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                  )}
                </Pressable>
              ) : null}
            </View>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {c.body}
            </Text>
          </Card>
        )}
        ListEmptyComponent={
          <Text variant="caption" color={colors.textMuted} style={styles.noComments}>
            No comments yet — say something.
          </Text>
        }
        ListFooterComponent={
          <View style={styles.composer}>
            <Input
              placeholder="Add a comment…"
              value={body}
              onChangeText={(t) => {
                setBody(t);
                if (error) setError(null);
              }}
              maxLength={500}
            />
            {error ? (
              <Text variant="caption" color={colors.error}>
                {error}
              </Text>
            ) : null}
            <Button
              title={addComment.isPending ? 'Posting…' : 'Post comment'}
              onPress={onPost}
              loading={addComment.isPending}
              size="sm"
            />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, gap: spacing.md },
  skeletons: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  headerTitle: { flex: 1 },
  list: { gap: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  listHeader: { gap: spacing.md },
  ratingCard: { gap: spacing.sm },
  ratingTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ratingWho: { flex: 1 },
  photo: { width: '100%', height: 200, borderRadius: borderRadius.md, backgroundColor: colors.surfaceLight },
  historyCard: { gap: spacing.sm },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  historyInfo: { flex: 1 },
  sectionLabel: { marginTop: spacing.xs },
  commentCard: { gap: spacing.sm },
  commentTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  commentWho: { flex: 1 },
  deleteConfirm: { fontWeight: '600' },
  noComments: { textAlign: 'center', marginTop: spacing.sm },
  composer: { gap: spacing.sm, marginTop: spacing.md },
});
