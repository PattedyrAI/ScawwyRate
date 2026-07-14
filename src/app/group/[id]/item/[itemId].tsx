import { View, FlatList, StyleSheet, Pressable, ActivityIndicator, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Card, Avatar, ScoreDisplay } from '@/shared/components/ui';
import { useItem, useItemRatings } from '@/features/items/hooks/useItems';
import type { RatingWithAuthor } from '@/features/items/items.service';
import { getScoreLabel } from '@/shared/utils/formatScore';
import { formatRelativeDate } from '@/shared/utils/formatDate';
import { colors, spacing, borderRadius } from '@/theme';

export default function ItemDetailScreen() {
  const { id: groupId, itemId } = useLocalSearchParams<{ id: string; itemId: string }>();
  const insets = useSafeAreaInsets();
  const { data: item, isLoading } = useItem(itemId);
  const { data: ratings } = useItemRatings(itemId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.center}>
        <Text color={colors.textSecondary}>Item not found (or you are not a member).</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text color={colors.primary}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const avg = item.average_score != null ? Number(item.average_score) : null;

  const listHeader = (
    <View style={styles.listHeader}>
      <Card style={styles.statsCard}>
        {item.rating_count > 0 && avg != null ? (
          <>
            <ScoreDisplay score={avg} size="lg" />
            <Text variant="label" color={colors.textSecondary}>
              {getScoreLabel(avg)}
            </Text>
            <View style={styles.statRow}>
              <Text variant="caption" color={colors.textMuted}>
                {item.rating_count} {item.rating_count === 1 ? 'rating' : 'ratings'}
              </Text>
              <Text variant="caption" color={colors.textMuted}>
                High {item.highest_score} · Low {item.lowest_score}
              </Text>
            </View>
          </>
        ) : (
          <Text color={colors.textSecondary}>No ratings yet.</Text>
        )}
      </Card>
      <Button
        title="Rate this"
        onPress={() => router.push(`/group/${groupId}/rate?itemId=${itemId}`)}
        fullWidth
      />
      <Text variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
        All ratings
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text variant="h3" numberOfLines={1}>
            {item.name}
          </Text>
          {item.categories ? (
            <Text variant="caption" color={colors.textMuted}>
              {item.categories.name}
            </Text>
          ) : null}
        </View>
      </View>

      <FlatList
        data={ratings ?? []}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        renderItem={({ item: r }: { item: RatingWithAuthor }) => (
          <Card
            style={styles.ratingCard}
            onPress={() => router.push(`/group/${groupId}/rating/${r.id}`)}
          >
            <View style={styles.ratingTop}>
              <Avatar uri={r.profiles?.avatar_url} name={r.profiles?.username} size="sm" />
              <View style={styles.ratingWho}>
                <Text variant="bodySmall">@{r.profiles?.username ?? 'unknown'}</Text>
                <Text variant="caption" color={colors.textMuted}>
                  {formatRelativeDate(r.created_at)}
                </Text>
              </View>
              <ScoreDisplay score={r.score} size="sm" />
            </View>
            {r.comment ? (
              <Text variant="bodySmall" color={colors.textSecondary}>
                {r.comment}
              </Text>
            ) : null}
            {r.photo_url ? <Image source={{ uri: r.photo_url }} style={styles.ratingPhoto} /> : null}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  headerTitleWrap: { flex: 1 },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  listHeader: { gap: spacing.md, marginBottom: spacing.md },
  statsCard: { alignItems: 'center', gap: spacing.xs },
  statRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
  sectionLabel: { marginTop: spacing.sm },
  ratingCard: { gap: spacing.sm },
  ratingTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ratingWho: { flex: 1 },
  ratingPhoto: { width: '100%', height: 180, borderRadius: borderRadius.md, backgroundColor: colors.surfaceLight },
});
