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
}

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
}));
