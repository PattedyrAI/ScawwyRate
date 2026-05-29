import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  devSkipAuth: () => void;
}

const DEV_USER_ID = '00000000-0000-0000-0000-000000000000';

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  hasCompletedOnboarding: false,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  setOnboardingComplete: (hasCompletedOnboarding) => set({ hasCompletedOnboarding }),
  devSkipAuth: () =>
    set({
      session: { access_token: 'dev', refresh_token: 'dev', expires_in: 999999, token_type: 'bearer', user: { id: DEV_USER_ID, aud: 'authenticated', role: 'authenticated', email: 'dev@test.com', created_at: new Date().toISOString() } as any } as any,
      user: { id: DEV_USER_ID, aud: 'authenticated', role: 'authenticated', email: 'dev@test.com', created_at: new Date().toISOString() } as any,
      isLoading: false,
    }),
}));
