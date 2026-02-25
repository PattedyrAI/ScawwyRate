import { supabase } from '@/lib/supabase';
import type { Comment, Profile } from '@/types/database';

export interface CommentWithUser extends Comment {
  profiles: Pick<Profile, 'username' | 'display_name' | 'avatar_url'>;
}

export async function getComments(ratingId: string): Promise<CommentWithUser[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(username, display_name, avatar_url)')
    .eq('rating_id', ratingId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as CommentWithUser[];
}

export async function addComment(ratingId: string, userId: string, body: string): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ rating_id: ratingId, user_id: userId, body })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) throw error;
}

export async function isLiked(userId: string, ratingId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('rating_id', ratingId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function toggleLike(userId: string, ratingId: string, currentlyLiked: boolean) {
  if (currentlyLiked) {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('rating_id', ratingId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('likes')
      .insert({ user_id: userId, rating_id: ratingId });
    if (error) throw error;
  }
}
