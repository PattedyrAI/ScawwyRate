import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import * as itemsService from '../items.service';
import type { RateItemInput } from '../items.service';

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: itemsService.listCategories,
    staleTime: Infinity, // fixed reference data
  });
}

export function useGroupItems(groupId: string) {
  return useQuery({
    queryKey: queryKeys.items.list(groupId),
    queryFn: () => itemsService.listGroupItems(groupId),
    enabled: !!groupId,
  });
}

export function useItem(itemId: string) {
  return useQuery({
    queryKey: queryKeys.items.detail(itemId),
    queryFn: () => itemsService.getItem(itemId),
    enabled: !!itemId,
  });
}

export function useGroupFeed(groupId: string) {
  return useQuery({
    queryKey: queryKeys.ratings.feed(groupId),
    queryFn: () => itemsService.getGroupFeed(groupId),
    enabled: !!groupId,
  });
}

export function useItemRatings(itemId: string) {
  return useQuery({
    queryKey: queryKeys.ratings.forItem(itemId),
    queryFn: () => itemsService.listItemRatings(itemId),
    enabled: !!itemId,
  });
}

export function useMyRatingForItem(itemId: string, userId: string) {
  return useQuery({
    queryKey: queryKeys.ratings.mine(itemId, userId),
    queryFn: () => itemsService.getMyRatingForItem(itemId, userId),
    enabled: !!itemId && !!userId,
  });
}

export function useRateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RateItemInput) => itemsService.rateItem(input),
    onSuccess: (rating, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.feed(input.groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.items.list(input.groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.items.detail(rating.item_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.forItem(rating.item_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.mine(rating.item_id, rating.user_id) });
      // Re-rates also touch the rating's own detail/history and the group leaderboard.
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.detail(rating.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.history.forRating(rating.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.leaderboard(input.groupId) });
    },
  });
}

export function useRating(ratingId: string) {
  return useQuery({
    queryKey: queryKeys.ratings.detail(ratingId),
    queryFn: () => itemsService.getRating(ratingId),
    enabled: !!ratingId,
  });
}

export function useRatingComments(ratingId: string) {
  return useQuery({
    queryKey: queryKeys.comments.forRating(ratingId),
    queryFn: () => itemsService.listRatingComments(ratingId),
    enabled: !!ratingId,
  });
}

export function useRatingHistory(ratingId: string) {
  return useQuery({
    queryKey: queryKeys.history.forRating(ratingId),
    queryFn: () => itemsService.listRatingHistory(ratingId),
    enabled: !!ratingId,
  });
}

export function useGroupLeaderboard(groupId: string) {
  return useQuery({
    queryKey: queryKeys.stats.leaderboard(groupId),
    queryFn: () => itemsService.getGroupLeaderboard(groupId),
    enabled: !!groupId,
  });
}

export function useAddComment(ratingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: string }) =>
      itemsService.addComment(ratingId, userId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.forRating(ratingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.detail(ratingId) }); // comment_count
    },
  });
}

export function useDeleteComment(ratingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => itemsService.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.forRating(ratingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.detail(ratingId) });
    },
  });
}
