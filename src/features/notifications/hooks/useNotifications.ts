import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { isDevMode } from '@/lib/isDevMode';
import { MOCK_NOTIFICATIONS } from '@/lib/mockData';
import * as notificationsService from '../notifications.service';

export function useNotifications() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () => {
      if (isDevMode()) return MOCK_NOTIFICATIONS as any;
      return notificationsService.getNotifications(user!.id);
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useUnreadCount() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => {
      if (isDevMode()) return MOCK_NOTIFICATIONS.filter(n => !n.is_read).length;
      return notificationsService.getUnreadCount(user!.id);
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });
}

export function useMarkAllAsRead() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsService.markAllAsRead(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });
}
