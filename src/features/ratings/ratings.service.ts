import { supabase } from '@/lib/supabase';
import type { Rating, RatingWithDetails, RatingHistory, InsertTables } from '@/types/database';

export async function createRating(
  rating: InsertTables<'ratings'>,
  tagIds: string[],
): Promise<Rating> {
  const { data, error } = await supabase
    .from('ratings')
    .insert(rating)
    .select()
    .single();

  if (error) throw error;

  // Insert tags
  if (tagIds.length > 0) {
    const { error: tagError } = await supabase
      .from('rating_tags')
      .insert(tagIds.map((tag_id) => ({ rating_id: data.id, tag_id })));

    if (tagError) throw tagError;
  }

  return data;
}

export async function updateRating(
  ratingId: string,
  updates: { score: number; review_text?: string; photo_url?: string; would_buy_again?: boolean },
  tagIds: string[],
): Promise<Rating> {
  const { data, error } = await supabase
    .from('ratings')
    .update(updates)
    .eq('id', ratingId)
    .select()
    .single();

  if (error) throw error;

  // Replace tags: delete old, insert new
  await supabase.from('rating_tags').delete().eq('rating_id', ratingId);

  if (tagIds.length > 0) {
    await supabase
      .from('rating_tags')
      .insert(tagIds.map((tag_id) => ({ rating_id: ratingId, tag_id })));
  }

  return data;
}

export async function getRating(id: string): Promise<RatingWithDetails> {
  const { data, error } = await supabase
    .from('ratings')
    .select(`
      *,
      profiles(username, display_name, avatar_url),
      products(name, image_url, brands(name)),
      rating_tags(tags(id, name, slug))
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as unknown as RatingWithDetails;
}

export async function getUserRatings(userId: string, limit = 50): Promise<RatingWithDetails[]> {
  const { data, error } = await supabase
    .from('ratings')
    .select(`
      *,
      profiles(username, display_name, avatar_url),
      products(name, image_url, brands(name)),
      rating_tags(tags(id, name, slug))
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as RatingWithDetails[];
}

export async function getProductRatings(productId: string, limit = 50): Promise<RatingWithDetails[]> {
  const { data, error } = await supabase
    .from('ratings')
    .select(`
      *,
      profiles(username, display_name, avatar_url),
      products(name, image_url, brands(name)),
      rating_tags(tags(id, name, slug))
    `)
    .eq('product_id', productId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as RatingWithDetails[];
}

export async function getUserRatingForProduct(userId: string, productId: string): Promise<Rating | null> {
  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getRatingHistory(ratingId: string): Promise<RatingHistory[]> {
  const { data, error } = await supabase
    .from('rating_history')
    .select('*')
    .eq('rating_id', ratingId)
    .order('changed_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function deleteRating(id: string): Promise<void> {
  const { error } = await supabase.from('ratings').delete().eq('id', id);
  if (error) throw error;
}
