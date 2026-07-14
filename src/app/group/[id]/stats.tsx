import { useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Card, Avatar, ScoreDisplay, TagChip, EmptyState, LoadingSkeleton } from '@/shared/components/ui';
import { useGroupItems, useGroupLeaderboard } from '@/features/items/hooks/useItems';
import type { ItemWithCategory, LeaderboardRow } from '@/features/items/items.service';
import { colors, spacing } from '@/theme';

const SECTIONS = ['Top Rated', 'Most Rated', 'By Category', 'Leaderboard'] as const;
type Section = (typeof SECTIONS)[number];

export default function GroupStatsScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<Section>('Top Rated');

  const items = useGroupItems(groupId);
  const leaderboard = useGroupLeaderboard(groupId);

  const ratedItems = useMemo(
    () => (items.data ?? []).filter((i) => i.rating_count > 0),
    [items.data],
  );
  const topRated = useMemo(
    () => [...ratedItems].sort((a, b) => Number(b.average_score ?? 0) - Number(a.average_score ?? 0)),
    [ratedItems],
  );
  const mostRated = useMemo(
    () => [...ratedItems].sort((a, b) => b.rating_count - a.rating_count),
    [ratedItems],
  );
  const byCategory = useMemo(() => {
    const groupsMap = new Map<string, { name: string; items: ItemWithCategory[] }>();
    for (const i of ratedItems) {
      const key = i.categories?.slug ?? 'other';
      const entry = groupsMap.get(key) ?? { name: i.categories?.name ?? 'Other', items: [] };
      entry.items.push(i);
      groupsMap.set(key, entry);
    }
    return [...groupsMap.values()].sort((a, b) => b.items.length - a.items.length);
  }, [ratedItems]);

  const isLoading = section === 'Leaderboard' ? leaderboard.isLoading : items.isLoading;
  const isError = section === 'Leaderboard' ? leaderboard.isError : items.isError;
  const refetch = section === 'Leaderboard' ? leaderboard.refetch : items.refetch;

  function renderItemRow(i: ItemWithCategory) {
    return (
      <Card style={styles.row} onPress={() => router.push(`/group/${groupId}/item/${i.id}`)}>
        <View style={styles.rowMain}>
          <Text variant="body" numberOfLines={1} style={styles.rowName}>
            {i.name}
          </Text>
          <Text variant="caption" color={colors.textMuted}>
            {i.rating_count} {i.rating_count === 1 ? 'rating' : 'ratings'}
            {i.categories ? ` · ${i.categories.name}` : ''}
          </Text>
        </View>
        {i.average_score != null ? <ScoreDisplay score={Number(i.average_score)} size="sm" /> : null}
      </Card>
    );
  }

  function renderLeaderboardRow(r: LeaderboardRow, index: number) {
    return (
      <Card style={styles.row}>
        <Text variant="h3" color={colors.textMuted} style={styles.rank}>
          {index + 1}
        </Text>
        <Avatar uri={r.avatar_url} name={r.username} size="sm" />
        <View style={styles.rowMain}>
          <Text variant="body">@{r.username}</Text>
          <Text variant="caption" color={colors.textMuted}>
            {r.rating_count} {r.rating_count === 1 ? 'rating' : 'ratings'} · avg {r.average_score}
          </Text>
        </View>
      </Card>
    );
  }

  const empty = (
    <EmptyState
      icon="stats-chart-outline"
      title="Nothing to show yet"
      message="Stats appear once the group has some ratings."
    />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text variant="h3" style={styles.headerTitle}>
          Stats
        </Text>
      </View>

      <View style={styles.chipsWrap}>
        {SECTIONS.map((s) => (
          <TagChip key={s} label={s} selected={section === s} onPress={() => setSection(s)} />
        ))}
      </View>

      {isLoading ? (
        <View style={styles.skeletons}>
          <LoadingSkeleton width="100%" height={64} />
          <LoadingSkeleton width="100%" height={64} />
          <LoadingSkeleton width="100%" height={64} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text color={colors.error}>Could not load stats.</Text>
          <Button title="Retry" onPress={() => refetch()} variant="outline" />
        </View>
      ) : section === 'Leaderboard' ? (
        <FlatList
          data={leaderboard.data ?? []}
          keyExtractor={(r) => r.user_id}
          contentContainerStyle={styles.list}
          renderItem={({ item: r, index }) => renderLeaderboardRow(r, index)}
          ListEmptyComponent={empty}
        />
      ) : section === 'By Category' ? (
        <FlatList
          data={byCategory}
          keyExtractor={(c) => c.name}
          contentContainerStyle={styles.list}
          renderItem={({ item: c }) => (
            <View style={styles.categoryBlock}>
              <Text variant="label" color={colors.textSecondary}>
                {c.name} ({c.items.length})
              </Text>
              {c.items.map((i) => (
                <View key={i.id}>{renderItemRow(i)}</View>
              ))}
            </View>
          )}
          ListEmptyComponent={empty}
        />
      ) : (
        <FlatList
          data={section === 'Top Rated' ? topRated : mostRated}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: i }) => renderItemRow(i)}
          ListEmptyComponent={empty}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  skeletons: { gap: spacing.md, marginTop: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  headerTitle: { flex: 1 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  list: { gap: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowMain: { flex: 1 },
  rowName: { fontWeight: '600' },
  rank: { width: 24, textAlign: 'center' },
  categoryBlock: { gap: spacing.sm },
});
