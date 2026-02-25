import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export async function followUser(followerId: string, followingId: string) {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId });

  if (error) throw error;
}

export async function unfollowUser(followerId: string, followingId: string) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) throw error;
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function getFollowers(userId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('profiles!follows_follower_id_fkey(*)')
    .eq('following_id', userId);

  if (error) throw error;
  return (data ?? []).map((d) => (d as any).profiles).filter(Boolean);
}

export async function getFollowing(userId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('profiles!follows_following_id_fkey(*)')
    .eq('follower_id', userId);

  if (error) throw error;
  return (data ?? []).map((d) => (d as any).profiles).filter(Boolean);
}

export interface FeedItem {
  rating_id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  brand_name: string | null;
  score: number;
  review_text: string | null;
  photo_url: string | null;
  would_buy_again: boolean | null;
  review_count: number;
  comment_count: number;
  like_count: number;
  rating_created_at: string;
  rating_updated_at: string;
}

export async function getActivityFeed(
  userId: string,
  limit = 20,
  cursor?: string | null,
): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc('get_activity_feed', {
    p_user_id: userId,
    p_limit: limit,
    p_cursor: cursor ?? null,
  });

  if (error) throw error;
  return (data ?? []) as FeedItem[];
}
