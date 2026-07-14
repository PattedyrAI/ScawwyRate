-- groups + membership: private friend groups joined by 6-char invite code.
--
-- Design (see plan header): creation and joining go ONLY through the
-- SECURITY DEFINER RPCs create_group() / join_group(), so invite codes are
-- server-generated and owner membership is atomic. There are deliberately
-- NO INSERT policies on groups or group_members.
--
-- RLS is built on SECURITY DEFINER helpers so policies on groups /
-- group_members never recurse into group_members' own RLS (design-spec
-- section 9 calls this the #1 risk).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.groups (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(trim(name)) between 1 and 80),
  invite_code         text not null unique
                      check (invite_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$'),
  owner_id            uuid not null references public.profiles (id) on delete cascade,
  discord_webhook_url text,
  created_at          timestamptz not null default now()
);

create index groups_owner_id_idx on public.groups (owner_id);

create table public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- "my groups" lookups go through user_id.
create index group_members_user_id_idx on public.group_members (user_id);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER: bypass RLS to answer membership
-- questions inside policies without recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_group_member(gid uuid, uid uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = uid
  );
$$;

create or replace function public.is_group_owner(gid uuid, uid uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.groups
    where id = gid and owner_id = uid
  );
$$;

-- 6-char invite code from an unambiguous alphabet (no 0/O, 1/I/L).
-- Uniqueness is enforced by the unique constraint; create_group retries on
-- the (astronomically rare: 31^6 ≈ 887M) collision.
create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text := '';
  i int;
begin
  for i in 1..6 loop
    code := code || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
  end loop;
  return code;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs — the only write paths for group creation / joining
-- ---------------------------------------------------------------------------

-- Create a group owned by the caller; generates the invite code server-side
-- and atomically adds the caller as the 'owner' member.
create or replace function public.create_group(group_name text)
returns public.groups
language plpgsql
volatile
security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  new_group public.groups;
  attempts int := 0;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if group_name is null or char_length(trim(group_name)) not between 1 and 80 then
    raise exception 'invalid_group_name';
  end if;

  loop
    attempts := attempts + 1;
    begin
      insert into public.groups (name, invite_code, owner_id)
      values (trim(group_name), public.generate_invite_code(), uid)
      returning * into new_group;
      exit;
    exception when unique_violation then
      if attempts >= 5 then
        raise exception 'invite_code_generation_failed';
      end if;
    end;
  end loop;

  insert into public.group_members (group_id, user_id, role)
  values (new_group.id, uid, 'owner');

  return new_group;
end;
$$;

-- Join a group by invite code. SECURITY DEFINER so the code can be looked up
-- without groups being world-readable. Case-insensitive; idempotent if the
-- caller is already a member.
create or replace function public.join_group(code text)
returns public.groups
language plpgsql
volatile
security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  target public.groups;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into target
  from public.groups
  where invite_code = upper(trim(code));

  if not found then
    raise exception 'invalid_invite_code';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (target.id, uid, 'member')
  on conflict (group_id, user_id) do nothing;

  return target;
end;
$$;

-- Lock down execution: RPCs for authenticated users only; the raw code
-- generator is internal (called by create_group, which runs as its owner).
revoke execute on function public.create_group(text) from public, anon;
revoke execute on function public.join_group(text) from public, anon;
revoke execute on function public.generate_invite_code() from public, anon, authenticated;
revoke execute on function public.is_group_member(uuid, uuid) from public, anon;
revoke execute on function public.is_group_owner(uuid, uuid) from public, anon;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group(text) to authenticated;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.is_group_owner(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- This stack's default privileges give roles no DML on new tables (Phase 0
-- lesson: RLS policies are useless without the base GRANT — symptom is
-- "permission denied for table", not an empty result). Deliberately NO
-- insert grant for authenticated: creation/joining is RPC-only, and the
-- RPCs are SECURITY DEFINER so they run as the table owner.
grant select, update, delete on public.groups to authenticated;
grant select, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.groups to service_role;
grant select, insert, update, delete on public.group_members to service_role;

-- groups: readable by members (the owner is always a member — create_group
-- guarantees it and the delete policies below keep it that way).
create policy "groups_select_member"
  on public.groups for select
  to authenticated
  using (public.is_group_member(id, (select auth.uid())));

-- groups: only the owner may update (rename, webhook URL).
create policy "groups_update_owner"
  on public.groups for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- groups: only the owner may delete (cascades memberships).
create policy "groups_delete_owner"
  on public.groups for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- group_members: read the member rows of groups you belong to.
create policy "group_members_select_member"
  on public.group_members for select
  to authenticated
  using (public.is_group_member(group_id, (select auth.uid())));

-- leave: a non-owner member may delete their own row. Owners cannot leave
-- (they delete the group instead) so a group is never orphaned.
create policy "group_members_delete_self"
  on public.group_members for delete
  to authenticated
  using (user_id = (select auth.uid()) and role = 'member');

-- owner may remove other members (never themselves via this path).
create policy "group_members_delete_by_owner"
  on public.group_members for delete
  to authenticated
  using (
    public.is_group_owner(group_id, (select auth.uid()))
    and user_id <> (select auth.uid())
  );
