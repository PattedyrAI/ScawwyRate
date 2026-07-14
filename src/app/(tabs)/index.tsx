import { View, FlatList, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Card, EmptyState, LoadingSkeleton } from '@/shared/components/ui';
import { useMyGroups } from '@/features/groups/hooks/useGroups';
import type { GroupWithMemberCount } from '@/features/groups/groups.service';
import { colors, spacing } from '@/theme';

export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const { data: groups, isLoading, isError, refetch } = useMyGroups();

  if (isLoading) {
    return (
      <View style={[styles.skeletons, { paddingTop: insets.top + spacing.lg }]}>
        <LoadingSkeleton width="100%" height={72} />
        <LoadingSkeleton width="100%" height={72} />
        <LoadingSkeleton width="100%" height={72} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text color={colors.error}>Could not load your groups.</Text>
        <Button title="Retry" onPress={() => refetch()} variant="outline" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <Text variant="h2">Groups</Text>
        <View style={styles.headerActions}>
          <Button title="Join" onPress={() => router.push('/group/join')} variant="outline" size="sm" />
          <Button title="Create" onPress={() => router.push('/group/create')} size="sm" />
        </View>
      </View>
      <FlatList
        data={groups ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: GroupWithMemberCount }) => {
          const memberCount = item.group_members[0]?.count ?? 0;
          return (
            <Card onPress={() => router.push(`/group/${item.id}`)} style={styles.card}>
              <Text variant="h3">{item.name}</Text>
              <Text variant="caption" color={colors.textMuted}>
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </Text>
            </Card>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No groups yet"
            message="Create a group or join one with an invite code."
            actionLabel="Create a group"
            onAction={() => router.push('/group/create')}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, gap: spacing.md },
  skeletons: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  list: { gap: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  card: { gap: spacing.xs },
});
