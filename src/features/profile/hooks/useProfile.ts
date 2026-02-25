import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/stores/authStore';
import * as profileService from '../profile.service';
import type { UpdateTables } from '@/types/database';

export function useProfileDetail(userId: string) {
  return useQuery({
    queryKey: queryKeys.profiles.detail(userId),
    queryFn: () => profileService.getProfile(userId),
    enabled: !!userId,
  });
}

export function useProfileStats(userId: string) {
  return useQuery({
    queryKey: queryKeys.profiles.stats(userId),
    queryFn: () => profileService.getProfileStats(userId),
    enabled: !!userId,
  });
}

export function useCurrentProfile() {
  const user = useAuthStore((s) => s.user);
  return useProfileDetail(user?.id ?? '');
}

export function useCurrentProfileStats() {
  const user = useAuthStore((s) => s.user);
  return useProfileStats(user?.id ?? '');
}

export function useUpdateProfile() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: UpdateTables<'profiles'>) =>
      profileService.updateProfile(user!.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.detail(user!.id) });
    },
  });
}
