import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import * as commentsService from '../comments.service';

export function useComments(ratingId: string) {
  return useQuery({
    queryKey: queryKeys.comments.byRating(ratingId),
    queryFn: () => commentsService.getComments(ratingId),
    enabled: !!ratingId,
  });
}

export function useAddComment(ratingId: string) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => commentsService.addComment(ratingId, user!.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.byRating(ratingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.detail(ratingId) });
    },
  });
}

export function useDeleteComment(ratingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: commentsService.deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.byRating(ratingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.detail(ratingId) });
    },
  });
}

export function useIsLiked(ratingId: string) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: queryKeys.likes.isLiked(user?.id ?? '', ratingId),
    queryFn: () => commentsService.isLiked(user!.id, ratingId),
    enabled: !!user && !!ratingId,
  });
}

export function useToggleLike(ratingId: string) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (currentlyLiked: boolean) =>
      commentsService.toggleLike(user!.id, ratingId, currentlyLiked),
    onMutate: async (currentlyLiked) => {
      // Optimistic update
      await queryClient.cancelQueries({
        queryKey: queryKeys.likes.isLiked(user!.id, ratingId),
      });
      const prev = queryClient.getQueryData(queryKeys.likes.isLiked(user!.id, ratingId));
      queryClient.setQueryData(queryKeys.likes.isLiked(user!.id, ratingId), !currentlyLiked);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev !== undefined) {
        queryClient.setQueryData(
          queryKeys.likes.isLiked(user!.id, ratingId),
          context.prev,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.likes.isLiked(user!.id, ratingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.detail(ratingId) });
    },
  });
}
