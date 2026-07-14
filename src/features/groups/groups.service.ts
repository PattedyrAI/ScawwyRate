import { supabase } from '@/lib/supabase';
import type { Group, GroupMember, Profile } from '@/types/database';

export type GroupWithMemberCount = Group & {
  group_members: { count: number }[];
};

export type GroupMemberWithProfile = GroupMember & {
  profiles: Pick<Profile, 'username' | 'display_name' | 'avatar_url'> | null;
};

/** Groups the signed-in user belongs to (RLS scopes the select to memberships). */
export async function listMyGroups(): Promise<GroupWithMemberCount[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('*, group_members(count)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // not found (or not a member)
    throw error;
  }
  return data;
}

export async function listGroupMembers(groupId: string): Promise<GroupMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('*, profiles(username, display_name, avatar_url)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return data;
}

/** SECURITY DEFINER RPC: generates the invite code and adds the caller as owner. */
export async function createGroup(name: string): Promise<Group> {
  const { data, error } = await supabase.rpc('create_group', { group_name: name });
  if (error) throw error;
  return data;
}

/** SECURITY DEFINER RPC: joins by invite code without groups being world-readable. */
export async function joinGroup(code: string): Promise<Group> {
  const { data, error } = await supabase.rpc('join_group', { code });
  if (error) throw error;
  return data;
}

export async function updateGroup(
  groupId: string,
  updates: { name?: string },
): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', groupId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Owner-only (RLS): the group's Discord webhook, or null when unset/not owner. */
export async function getGroupWebhook(groupId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('group_webhooks')
    .select('url')
    .eq('group_id', groupId)
    .maybeSingle();
  if (error) throw error;
  return data?.url ?? null;
}

/** Owner-only (RLS): set, replace, or clear (null) the group's webhook. */
export async function setGroupWebhook(groupId: string, url: string | null): Promise<void> {
  if (url === null) {
    const { error } = await supabase.from('group_webhooks').delete().eq('group_id', groupId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('group_webhooks')
    .upsert({ group_id: groupId, url }, { onConflict: 'group_id' });
  if (error) throw error;
}

/**
 * Delete a membership row. Used for both "leave" (own row; RLS restricts to
 * role='member') and owner-removal (RLS restricts to the group's owner).
 * NOTE: RLS turns a forbidden delete into a 0-row no-op, not an error —
 * the UI gates by role so users are never offered a no-op action.
 */
export async function removeMembership(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) throw error;
}
