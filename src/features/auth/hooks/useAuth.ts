import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { queryKeys } from '@/lib/queryKeys';
import * as authService from '../auth.service';

export function useProfile() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: queryKeys.profiles.detail(user?.id ?? ''),
    queryFn: () => authService.getProfile(user!.id),
    enabled: !!user,
  });
}

export function useSignInWithApple() {
  const router = useRouter();

  return useMutation({
    mutationFn: authService.signInWithApple,
    onSuccess: () => {
      router.replace('/(tabs)/(feed)');
    },
  });
}

export function useSignInWithGoogle() {
  return useMutation({
    mutationFn: authService.signInWithGoogle,
  });
}

export function useSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.signOut,
    onSuccess: () => {
      queryClient.clear();
      router.replace('/(auth)/welcome');
    },
  });
}

export function useUpdateUsername() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (username: string) => authService.updateUsername(user!.id, username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.detail(user!.id) });
      router.replace('/(tabs)/(feed)');
    },
  });
}

export function useCheckUsername() {
  return useCallback(async (username: string): Promise<boolean> => {
    if (username.length < 3) return false;
    return authService.checkUsernameAvailable(username);
  }, []);
}
