import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as authService from '../auth.service';

export function useSignInWithDiscord() {
  return useMutation({
    mutationFn: authService.signInWithDiscord,
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
