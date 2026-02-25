import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import * as ratingsService from '../ratings.service';
import type { InsertTables } from '@/types/database';

export function useRating(id: string) {
  return useQuery({
    queryKey: queryKeys.ratings.detail(id),
    queryFn: () => ratingsService.getRating(id),
    enabled: !!id,
  });
}

export function useUserRatings(userId: string) {
  return useQuery({
    queryKey: queryKeys.ratings.byUser(userId),
    queryFn: () => ratingsService.getUserRatings(userId),
    enabled: !!userId,
  });
}

export function useProductRatings(productId: string) {
  return useQuery({
    queryKey: queryKeys.ratings.byProduct(productId),
    queryFn: () => ratingsService.getProductRatings(productId),
    enabled: !!productId,
  });
}

export function useRatingHistory(ratingId: string) {
  return useQuery({
    queryKey: [...queryKeys.ratings.detail(ratingId), 'history'],
    queryFn: () => ratingsService.getRatingHistory(ratingId),
    enabled: !!ratingId,
  });
}

export function useCreateRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rating, tagIds }: { rating: InsertTables<'ratings'>; tagIds: string[] }) =>
      ratingsService.createRating(rating, tagIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.activity });
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.byUser(data.user_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.byProduct(data.product_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(data.product_id) });
    },
  });
}

export function useUpdateRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ratingId,
      updates,
      tagIds,
    }: {
      ratingId: string;
      updates: { score: number; review_text?: string; photo_url?: string; would_buy_again?: boolean };
      tagIds: string[];
    }) => ratingsService.updateRating(ratingId, updates, tagIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.activity });
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.byUser(data.user_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.byProduct(data.product_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(data.product_id) });
    },
  });
}

export function useDeleteRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ratingsService.deleteRating,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.activity });
    },
  });
}
