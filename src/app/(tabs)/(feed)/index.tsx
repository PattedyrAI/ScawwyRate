import { useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, Image, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useActivityFeed } from '@/features/social/hooks/useSocial';
import { Avatar, ScoreDisplay, EmptyState, LoadingSkeleton } from '@/shared/components/ui';
import { formatRelativeDate } from '@/shared/utils/formatDate';
import { colors, typography, spacing, borderRadius } from '@/theme';
import type { FeedItem } from '@/features/social/social.service';

export default function FeedScreen() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    useActivityFeed();
  const router = useRouter();

  const items = useMemo(
    () => data?.pages.flatMap((page) => page) ?? [],
    [data],
  );

  const handleRatingPress = useCallback(
    (ratingId: string) => {
      router.push(`/rating/${ratingId}`);
    },
    [router],
  );

  const handleUserPress = useCallback(
    (userId: string) => {
      router.push(`/user/${userId}`);
    },
    [router],
  );

  const handleProductPress = useCallback(
    (productId: string) => {
      router.push(`/product/${productId}`);
    },
    [router],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <Pressable style={styles.card} onPress={() => handleRatingPress(item.rating_id)}>
        {/* User row */}
        <Pressable style={styles.userRow} onPress={() => handleUserPress(item.user_id)}>
          <Avatar uri={item.avatar_url} name={item.display_name || item.username} size="sm" />
          <View style={styles.userInfo}>
            <Text style={styles.username}>{item.display_name || item.username}</Text>
            <Text style={styles.timestamp}>
              @{item.username} · {formatRelativeDate(item.rating_updated_at)}
            </Text>
          </View>
          <ScoreDisplay score={item.score} size="sm" showOutOf={false} />
        </Pressable>

        {/* Photo */}
        {item.photo_url && (
          <Image source={{ uri: item.photo_url }} style={styles.photo} />
        )}

        {/* Product info */}
        <Pressable style={styles.productRow} onPress={() => handleProductPress(item.product_id)}>
          <Ionicons name="beer-outline" size={16} color={colors.primary} />
          <Text style={styles.productName} numberOfLines={1}>
            {item.product_name}
          </Text>
          {item.brand_name && (
            <Text style={styles.brandName} numberOfLines={1}>
              · {item.brand_name}
            </Text>
          )}
        </Pressable>

        {/* Review text */}
        {item.review_text && (
          <Text style={styles.reviewText} numberOfLines={3}>{item.review_text}</Text>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="heart-outline" size={16} color={colors.textMuted} />
            {item.like_count > 0 && <Text style={styles.statText}>{item.like_count}</Text>}
          </View>
          <View style={styles.stat}>
            <Ionicons name="chatbubble-outline" size={16} color={colors.textMuted} />
            {item.comment_count > 0 && <Text style={styles.statText}>{item.comment_count}</Text>}
          </View>
          {item.review_count > 1 && (
            <View style={styles.stat}>
              <Ionicons name="refresh" size={16} color={colors.secondary} />
              <Text style={[styles.statText, { color: colors.secondary }]}>Re-reviewed</Text>
            </View>
          )}
        </View>
      </Pressable>
    ),
    [handleRatingPress, handleUserPress, handleProductPress],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>everrate</Text>
        </View>
        <View style={styles.skeletonContainer}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <LoadingSkeleton width={200} height={16} />
              <LoadingSkeleton width="100%" height={200} />
              <LoadingSkeleton width={150} height={14} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>everrate</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.rating_id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Your feed is empty"
            message="Follow people to see their ratings here"
            actionLabel="Find People"
            onAction={() => router.push('/(tabs)/(search)')}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -1,
  },
  list: {
    padding: spacing.xl,
    paddingTop: 0,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    ...typography.label,
    color: colors.text,
    fontSize: 13,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textMuted,
  },
  photo: {
    width: '100%',
    height: 250,
    borderRadius: borderRadius.md,
    resizeMode: 'cover',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  productName: {
    ...typography.label,
    color: colors.text,
    fontSize: 13,
    flexShrink: 1,
  },
  brandName: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 0,
  },
  reviewText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  skeletonContainer: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
