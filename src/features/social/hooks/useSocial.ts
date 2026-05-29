import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import { isDevMode } from '@/lib/isDevMode';
import { MOCK_FEED_ITEMS } from '@/lib/mockData';
import * as socialService from '../social.service';

export function useIsFollowing(targetUserId: string) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: queryKeys.profiles.isFollowing(user?.id ?? '', targetUserId),
    queryFn: () => {
      if (isDevMode()) return false;
      return socialService.isFollowing(user!.id, targetUserId);
    },
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
  });
}

export function useToggleFollow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      followerId,
      followingId,
      isCurrentlyFollowing,
    }: {
      followerId: string;
      followingId: string;
      isCurrentlyFollowing: boolean;
    }) => {
      if (isDevMode()) return;
      if (isCurrentlyFollowing) {
        await socialService.unfollowUser(followerId, followingId);
      } else {
        await socialService.followUser(followerId, followingId);
      }
    },
    onSuccess: (_, { followerId, followingId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.profiles.isFollowing(followerId, followingId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.stats(followerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.stats(followingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.followers(followingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.following(followerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.activity });
    },
  });
}

export function useFollowers(userId: string) {
  return useQuery({
    queryKey: queryKeys.profiles.followers(userId),
    queryFn: () => {
      if (isDevMode()) return [];
      return socialService.getFollowers(userId);
    },
    enabled: !!userId,
  });
}

export function useFollowing(userId: string) {
  return useQuery({
    queryKey: queryKeys.profiles.following(userId),
    queryFn: () => {
      if (isDevMode()) return [];
      return socialService.getFollowing(userId);
    },
    enabled: !!userId,
  });
}

export function useActivityFeed() {
  const user = useAuthStore((s) => s.user);

  return useInfiniteQuery({
    queryKey: queryKeys.feed.activity,
    queryFn: ({ pageParam }) => {
      if (isDevMode()) return MOCK_FEED_ITEMS as any;
      return socialService.getActivityFeed(user!.id, 20, pageParam);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      if (isDevMode()) return undefined;
      if (lastPage.length < 20) return undefined;
      return lastPage[lastPage.length - 1]?.rating_updated_at ?? undefined;
    },
    enabled: !!user,
  });
}
