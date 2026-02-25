import { supabase } from '@/lib/supabase';
import * as AppleAuthentication from 'expo-apple-authentication';
import type { Profile } from '@/types/database';

export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('No identity token from Apple');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  // Google Sign-In for React Native requires expo-auth-session or a native module.
  // For now, use Supabase's OAuth redirect flow.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'everrate://auth/callback',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

export async function updateUsername(userId: string, username: string) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ username })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('username', username);

  if (error) throw error;
  return count === 0;
}
