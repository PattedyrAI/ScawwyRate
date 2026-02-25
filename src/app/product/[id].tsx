import { useCallback } from 'react';
import { View, Text, Image, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProduct } from '@/features/products/hooks/useProducts';
import { useProductRatings } from '@/features/ratings/hooks/useRatings';
import { Avatar, ScoreDisplay, Card } from '@/shared/components/ui';
import { formatRelativeDate } from '@/shared/utils/formatDate';
import { colors, typography, spacing, borderRadius, getScoreColor } from '@/theme';
import type { RatingWithDetails, EnergyDrinkAttributes } from '@/types/database';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: product, isLoading: productLoading } = useProduct(id);
  const { data: ratings, isLoading: ratingsLoading } = useProductRatings(id);
  const router = useRouter();

  const handleRatingPress = useCallback(
    (ratingId: string) => {
      router.push(`/rating/${ratingId}`);
    },
    [router],
  );

  if (productLoading || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const attrs = product.attributes as unknown as EnergyDrinkAttributes | null;

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Product image */}
      {product.image_url ? (
        <Image source={{ uri: product.image_url }} style={styles.productImage} />
      ) : (
        <View style={[styles.productImage, styles.productImagePlaceholder]}>
          <Ionicons name="beer-outline" size={48} color={colors.textMuted} />
        </View>
      )}

      {/* Product info */}
      <Text style={styles.productName}>{product.name}</Text>
      <Text style={styles.brandName}>{product.brands?.name ?? 'Unknown brand'}</Text>

      {/* Avg rating card */}
      {product.rating_count > 0 ? (
        <Card style={styles.avgRatingCard}>
          <ScoreDisplay score={product.avg_rating} size="lg" />
          <Text style={styles.ratingCountText}>
            {product.rating_count} {product.rating_count === 1 ? 'rating' : 'ratings'}
          </Text>

          {/* Score distribution */}
          <View style={styles.distribution}>
            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => {
              const count = ratings?.filter((r) => r.score === score).length ?? 0;
              const pct = product.rating_count > 0 ? (count / product.rating_count) * 100 : 0;
              return (
                <View key={score} style={styles.distRow}>
                  <Text style={styles.distLabel}>{score}</Text>
                  <View style={styles.distBarBg}>
                    <View
                      style={[
                        styles.distBarFill,
                        { width: `${pct}%`, backgroundColor: getScoreColor(score) },
                      ]}
                    />
                  </View>
                  <Text style={styles.distCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </Card>
      ) : (
        <Card style={styles.noRatingsCard}>
          <Text style={styles.noRatingsText}>No ratings yet. Be the first!</Text>
        </Card>
      )}

      {/* Attributes */}
      {attrs && (
        <View style={styles.attributesRow}>
          {attrs.flavor && (
            <View style={styles.attribute}>
              <Text style={styles.attrLabel}>Flavor</Text>
              <Text style={styles.attrValue}>{attrs.flavor}</Text>
            </View>
          )}
          {attrs.volume_ml && (
            <View style={styles.attribute}>
              <Text style={styles.attrLabel}>Volume</Text>
              <Text style={styles.attrValue}>{attrs.volume_ml}ml</Text>
            </View>
          )}
          {attrs.caffeine_mg && (
            <View style={styles.attribute}>
              <Text style={styles.attrLabel}>Caffeine</Text>
              <Text style={styles.attrValue}>{attrs.caffeine_mg}mg</Text>
            </View>
          )}
          {attrs.sugar_free !== undefined && (
            <View style={styles.attribute}>
              <Text style={styles.attrLabel}>Sugar</Text>
              <Text style={styles.attrValue}>{attrs.sugar_free ? 'Sugar Free' : 'Regular'}</Text>
            </View>
          )}
        </View>
      )}

      {/* Reviews header */}
      <Text style={styles.reviewsHeader}>Reviews</Text>
    </View>
  );

  const renderRating = ({ item }: { item: RatingWithDetails }) => (
    <Pressable style={styles.ratingCard} onPress={() => handleRatingPress(item.id)}>
      <View style={styles.ratingUserRow}>
        <Avatar
          uri={item.profiles.avatar_url}
          name={item.profiles.display_name || item.profiles.username}
          size="sm"
        />
        <View style={styles.ratingUserInfo}>
          <Text style={styles.ratingUsername}>
            {item.profiles.display_name || item.profiles.username}
          </Text>
          <Text style={styles.ratingTime}>{formatRelativeDate(item.updated_at)}</Text>
        </View>
        <ScoreDisplay score={item.score} size="sm" showOutOf={false} />
      </View>
      {item.review_text && (
        <Text style={styles.ratingText} numberOfLines={3}>{item.review_text}</Text>
      )}
      {item.review_count > 1 && (
        <Text style={styles.rereviewLabel}>Re-reviewed {item.review_count} times</Text>
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navHeader}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>{product.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={ratings}
        keyExtractor={(item) => item.id}
        renderItem={renderRating}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  navTitle: {
    ...typography.label,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  headerContent: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.lg,
    resizeMode: 'cover',
  },
  productImagePlaceholder: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: {
    ...typography.h1,
    color: colors.text,
  },
  brandName: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  avgRatingCard: {
    alignItems: 'center',
    gap: spacing.md,
  },
  ratingCountText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  distribution: {
    width: '100%',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  distLabel: {
    ...typography.caption,
    color: colors.textMuted,
    width: 20,
    textAlign: 'right',
  },
  distBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  distBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  distCount: {
    ...typography.caption,
    color: colors.textMuted,
    width: 20,
  },
  noRatingsCard: {
    alignItems: 'center',
  },
  noRatingsText: {
    ...typography.body,
    color: colors.textMuted,
  },
  attributesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  attribute: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attrLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  attrValue: {
    ...typography.label,
    color: colors.text,
    marginTop: 2,
  },
  reviewsHeader: {
    ...typography.h3,
    color: colors.text,
  },
  listContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  ratingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  ratingUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ratingUserInfo: {
    flex: 1,
  },
  ratingUsername: {
    ...typography.label,
    color: colors.text,
    fontSize: 13,
  },
  ratingTime: {
    ...typography.caption,
    color: colors.textMuted,
  },
  ratingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  rereviewLabel: {
    ...typography.caption,
    color: colors.secondary,
  },
});
