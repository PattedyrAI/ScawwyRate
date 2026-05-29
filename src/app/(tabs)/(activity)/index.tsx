import { useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '@/features/notifications/hooks/useNotifications';
import { Avatar, EmptyState } from '@/shared/components/ui';
import { formatRelativeDate } from '@/shared/utils/formatDate';
import { colors, typography, spacing, borderRadius } from '@/theme';
import type { NotificationWithActor } from '@/features/notifications/notifications.service';

const NOTIFICATION_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  new_follower: { icon: 'person-add', color: colors.secondary, label: 'started following you' },
  new_comment: { icon: 'chatbubble', color: colors.primary, label: 'commented on your rating' },
  new_rating: { icon: 'star', color: colors.warning, label: 'rated a drink you follow' },
  rating_liked: { icon: 'heart', color: colors.error, label: 'liked your rating' },
  rereview_prompt: { icon: 'refresh', color: colors.secondary, label: 'Time to re-review!' },
};

export default function ActivityScreen() {
  const { data: notifications, isLoading, refetch, isRefetching } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const router = useRouter();

  const handlePress = useCallback(
    (notification: NotificationWithActor) => {
      if (!notification.is_read) {
        markAsRead.mutate(notification.id);
      }

      if (notification.rating_id) {
        router.push(`/rating/${notification.rating_id}`);
      } else if (notification.actor_id) {
        router.push(`/user/${notification.actor_id}`);
      }
    },
    [markAsRead, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: NotificationWithActor }) => {
      const config = NOTIFICATION_CONFIG[item.type] ?? NOTIFICATION_CONFIG.new_follower;
      const actorName = item.actor?.display_name || item.actor?.username || 'Someone';

      return (
        <Pressable
          style={[styles.item, !item.is_read && styles.itemUnread]}
          onPress={() => handlePress(item)}
        >
          <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
            <Ionicons name={config.icon} size={18} color={config.color} />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemText}>
              <Text style={styles.actorName}>{actorName}</Text>
              {' '}{config.label}
            </Text>
            <Text style={styles.itemTime}>{formatRelativeDate(item.created_at)}</Text>
          </View>
          {item.actor && (
            <Avatar
              uri={item.actor.avatar_url}
              name={item.actor.display_name || item.actor.username}
              size="sm"
            />
          )}
        </Pressable>
      );
    },
    [handlePress],
  );

  const hasUnread = notifications?.some((n: any) => !n.is_read);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        {hasUnread && (
          <Pressable onPress={() => markAllAsRead.mutate()}>
            <Text style={styles.markAllRead}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="notifications-outline"
              title="No activity yet"
              message="Follow people and rate drinks to see activity here"
            />
          ) : null
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  markAllRead: {
    ...typography.labelSmall,
    color: colors.primary,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  itemUnread: {
    backgroundColor: colors.surface,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  actorName: {
    fontWeight: '700',
  },
  itemTime: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
