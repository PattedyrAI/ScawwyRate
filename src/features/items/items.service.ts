import { supabase } from '@/lib/supabase';
import type { Category, Item, Profile, Rating } from '@/types/database';

export type ItemWithCategory = Item & {
  categories: Pick<Category, 'slug' | 'name' | 'icon'> | null;
};

export type RatingWithAuthor = Rating & {
  profiles: Pick<Profile, 'username' | 'display_name' | 'avatar_url'> | null;
};

export type RatingFeedRow = RatingWithAuthor & {
  items:
    | (Pick<Item, 'id' | 'name' | 'category_id'> & {
        categories: Pick<Category, 'slug' | 'name' | 'icon'> | null;
      })
    | null;
};

export interface RateItemInput {
  groupId: string;
  /** Existing item to rate; when null, the item is found-or-created by name. */
  itemId?: string | null;
  itemName?: string;
  categoryId?: string;
  score: number;
  comment?: string | null;
  photoUrl?: string | null;
  visitedAt?: string | null;
}

/** The fixed category set (seeded in the migration). */
export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

/** All items in a group (RLS scopes to members). Used for lists + dedup hints. */
export async function listGroupItems(groupId: string): Promise<ItemWithCategory[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*, categories(slug, name, icon)')
    .eq('group_id', groupId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getItem(itemId: string): Promise<ItemWithCategory | null> {
  const { data, error } = await supabase
    .from('items')
    .select('*, categories(slug, name, icon)')
    .eq('id', itemId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // not found (or not a member)
    throw error;
  }
  return data;
}

/** Recent ratings in a group, newest first — the group feed. */
export async function getGroupFeed(groupId: string): Promise<RatingFeedRow[]> {
  const { data, error } = await supabase
    .from('ratings')
    .select(
      '*, profiles(username, display_name, avatar_url), items(id, name, category_id, categories(slug, name, icon))',
    )
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

/** Every rating on a single item, newest first. */
export async function listItemRatings(itemId: string): Promise<RatingWithAuthor[]> {
  const { data, error } = await supabase
    .from('ratings')
    .select('*, profiles(username, display_name, avatar_url)')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** The caller's own rating of an item, if any (to prefill the re-rate form). */
export async function getMyRatingForItem(itemId: string, userId: string): Promise<Rating | null> {
  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('item_id', itemId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** SECURITY DEFINER RPC: find-or-create the item (server-side dedup) + upsert the rating. */
export async function rateItem(input: RateItemInput): Promise<Rating> {
  const { data, error } = await supabase.rpc('rate_item', {
    p_group_id: input.groupId,
    p_score: input.score,
    p_item_id: input.itemId ?? undefined,
    p_item_name: input.itemName ?? undefined,
    p_category_id: input.categoryId ?? undefined,
    p_comment: input.comment ?? undefined,
    p_photo_url: input.photoUrl ?? undefined,
    p_visited_at: input.visitedAt ?? undefined,
  });
  if (error) throw error;
  return data;
}
