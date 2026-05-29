import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import type { Profile } from '@/types/database';

// Required for web OAuth popups to complete.
WebBrowser.maybeCompleteAuthSession();

/**
 * Sign in with Discord via Supabase OAuth.
 * - Web: full-page redirect; supabase-js auto-detects the session on return.
 * - Native: open the auth session in a browser, then extract tokens from the redirect URL.
 */
export async function signInWithDiscord() {
  const redirectTo = makeRedirectUri();

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo, scopes: 'identify email' },
    });
    if (error) throw error;
    return; // browser redirects away; session is detected on return
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo, skipBrowserRedirect: true, scopes: 'identify email' },
  });
  if (error) throw error;
  if (!data.url) throw new Error('No OAuth URL returned');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') throw new Error('OAuth cancelled');

  const url = new URL(result.url);
  const params = new URLSearchParams(url.hash.substring(1)); // tokens in the fragment
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) throw new Error('No tokens in OAuth redirect');

  const { data: session, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (sessionError) throw sessionError;
  return session;
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
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return data;
}
