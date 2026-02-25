import { useCallback, useState } from 'react';
import { View, Text, Image, ScrollView, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRating, useRatingHistory } from '@/features/ratings/hooks/useRatings';
import { useComments, useAddComment, useIsLiked, useToggleLike } from '@/features/social/hooks/useComments';
import { Avatar, ScoreDisplay, TagChip, Card } from '@/shared/components/ui';
import { formatRelativeDate } from '@/shared/utils/formatDate';
import { getScoreLabel } from '@/shared/utils/formatScore';
import { colors, typography, spacing, borderRadius, getScoreColor } from '@/theme';

export default function RatingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: rating, isLoading } = useRating(id);
  const { data: history } = useRatingHistory(id);
  const { data: comments } = useComments(id);
  const { data: isLiked } = useIsLiked(id);
  const toggleLike = useToggleLike(id);
  const addComment = useAddComment(id);
  const [commentText, setCommentText] = useState('');
  const router = useRouter();

  const handleUserPress = useCallback(() => {
    if (rating) router.push(`/user/${rating.user_id}`);
  }, [rating, router]);

  const handleProductPress = useCallback(() => {
    if (rating) router.push(`/product/${rating.product_id}`);
  }, [rating, router]);

  if (isLoading || !rating) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Rating</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User info */}
        <Pressable style={styles.userRow} onPress={handleUserPress}>
          <Avatar
            uri={rating.profiles.avatar_url}
            name={rating.profiles.display_name || rating.profiles.username}
            size="md"
          />
          <View style={styles.userInfo}>
            <Text style={styles.username}>{rating.profiles.display_name || rating.profiles.username}</Text>
            <Text style={styles.timestamp}>
              @{rating.profiles.username} · {formatRelativeDate(rating.updated_at)}
            </Text>
          </View>
        </Pressable>

        {/* Photo */}
        {rating.photo_url && (
          <Image source={{ uri: rating.photo_url }} style={styles.photo} />
        )}

        {/* Product link */}
        <Pressable style={styles.productRow} onPress={handleProductPress}>
          <View style={styles.productIcon}>
            <Ionicons name="beer-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{rating.products.name}</Text>
            <Text style={styles.brandName}>{rating.products.brands?.name ?? ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>

        {/* Score */}
        <Card style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <ScoreDisplay score={rating.score} size="lg" />
            <Text style={[styles.scoreLabel, { color: getScoreColor(rating.score) }]}>
              {getScoreLabel(rating.score)}
            </Text>
          </View>

          {rating.would_buy_again !== null && (
            <View style={styles.buyAgainBadge}>
              <Ionicons
                name={rating.would_buy_again ? 'thumbs-up' : 'thumbs-down'}
                size={16}
                color={rating.would_buy_again ? colors.success : colors.error}
              />
              <Text style={styles.buyAgainText}>
                {rating.would_buy_again ? 'Would buy again' : "Wouldn't buy again"}
              </Text>
            </View>
          )}
        </Card>

        {/* Tags */}
        {rating.rating_tags.length > 0 && (
          <View style={styles.tagsRow}>
            {rating.rating_tags.map((rt) => (
              <TagChip key={rt.tags.id} label={rt.tags.name} selected />
            ))}
          </View>
        )}

        {/* Review text */}
        {rating.review_text && (
          <Text style={styles.reviewText}>{rating.review_text}</Text>
        )}

        {/* Re-review count */}
        {rating.review_count > 1 && (
          <View style={styles.rereviewBadge}>
            <Ionicons name="refresh" size={14} color={colors.secondary} />
            <Text style={styles.rereviewText}>
              Reviewed {rating.review_count} times
            </Text>
          </View>
        )}

        {/* Rating history */}
        {history && history.length > 0 && (
          <Card style={styles.historyCard}>
            <Text style={styles.historySectionTitle}>Score Evolution</Text>
            {history.map((h, i) => (
              <View key={h.id} style={styles.historyItem}>
                <Text style={[styles.historyScore, { color: getScoreColor(h.previous_score) }]}>
                  {h.previous_score}/10
                </Text>
                <Text style={styles.historyDate}>
                  {i === 0 ? 'First review' : `Review #${i + 1}`} · {formatRelativeDate(h.changed_at)}
                </Text>
              </View>
            ))}
            <View style={styles.historyItem}>
              <Text style={[styles.historyScore, styles.historyCurrent, { color: getScoreColor(rating.score) }]}>
                {rating.score}/10
              </Text>
              <Text style={styles.historyDate}>Current · {formatRelativeDate(rating.updated_at)}</Text>
            </View>
          </Card>
        )}

        {/* Like & comment actions */}
        <View style={styles.actionsRow}>
          <Pressable
            style={styles.actionButton}
            onPress={() => toggleLike.mutate(!!isLiked)}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={isLiked ? colors.error : colors.textSecondary}
            />
            <Text style={[styles.actionText, isLiked && { color: colors.error }]}>
              {rating.like_count}
            </Text>
          </Pressable>
          <View style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.actionText}>{rating.comment_count}</Text>
          </View>
        </View>

        {/* Comments */}
        {comments && comments.length > 0 && (
          <View style={styles.commentsSection}>
            <Text style={styles.commentsSectionTitle}>Comments</Text>
            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Avatar
                  uri={comment.profiles.avatar_url}
                  name={comment.profiles.display_name || comment.profiles.username}
                  size="sm"
                />
                <View style={styles.commentContent}>
                  <Text style={styles.commentAuthor}>
                    {comment.profiles.display_name || comment.profiles.username}
                  </Text>
                  <Text style={styles.commentBody}>{comment.body}</Text>
                  <Text style={styles.commentTime}>{formatRelativeDate(comment.created_at)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Comment input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            value={commentText}
            onChangeText={setCommentText}
            placeholder="Add a comment..."
            placeholderTextColor={colors.textMuted}
            maxLength={500}
          />
          <Pressable
            style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
            onPress={() => {
              if (commentText.trim()) {
                addComment.mutate(commentText.trim());
                setCommentText('');
              }
            }}
            disabled={!commentText.trim() || addComment.isPending}
          >
            <Ionicons name="send" size={18} color={commentText.trim() ? colors.primary : colors.textMuted} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.label,
    color: colors.text,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    ...typography.label,
    color: colors.text,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  photo: {
    width: '100%',
    height: 300,
    borderRadius: borderRadius.lg,
    resizeMode: 'cover',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    ...typography.label,
    color: colors.text,
  },
  brandName: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  scoreCard: {
    alignItems: 'center',
    gap: spacing.md,
  },
  scoreRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  scoreLabel: {
    ...typography.label,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  buyAgainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  buyAgainText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reviewText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
  },
  rereviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  rereviewText: {
    ...typography.caption,
    color: colors.secondary,
  },
  historyCard: {
    gap: spacing.md,
  },
  historySectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  historyScore: {
    ...typography.scoreSmall,
    width: 50,
  },
  historyCurrent: {
    fontWeight: '800',
  },
  historyDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  commentsSection: {
    gap: spacing.md,
  },
  commentsSectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  commentItem: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  commentContent: {
    flex: 1,
    gap: 2,
  },
  commentAuthor: {
    ...typography.labelSmall,
    color: colors.text,
  },
  commentBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  commentTime: {
    ...typography.caption,
    color: colors.textMuted,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  commentInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    ...typography.bodySmall,
    color: colors.text,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
