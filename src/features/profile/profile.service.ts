import { supabase } from '@/lib/supabase';
import type { Profile, UpdateTables } from '@/types/database';

export interface ProfileStats {
  totalRatings: number;
  avgScore: number;
  followersCount: number;
  followingCount: number;
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: UpdateTables<'profiles'>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  // Ratings stats
  const { data: ratings, error: ratingsError } = await supabase
    .from('ratings')
    .select('score')
    .eq('user_id', userId);

  if (ratingsError) throw ratingsError;

  const totalRatings = ratings?.length ?? 0;
  const avgScore = totalRatings > 0
    ? ratings!.reduce((sum, r) => sum + r.score, 0) / totalRatings
    : 0;

  // Followers count
  const { count: followersCount, error: fError } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId);

  if (fError) throw fError;

  // Following count
  const { count: followingCount, error: fgError } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId);

  if (fgError) throw fgError;

  return {
    totalRatings,
    avgScore: Math.round(avgScore * 10) / 10,
    followersCount: followersCount ?? 0,
    followingCount: followingCount ?? 0,
  };
}
