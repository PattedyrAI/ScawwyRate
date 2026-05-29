import { useAuthStore } from '@/stores/authStore';

/** True when using the dev skip auth bypass (no real Supabase) */
export function isDevMode(): boolean {
  const session = useAuthStore.getState().session;
  return session?.access_token === 'dev';
}
