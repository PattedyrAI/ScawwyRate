# ScawwyRate Phase 1 — Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Private friend groups on the Phase 0 foundation — create a group, join by 6-character invite code, list your groups, and manage a group in settings (rename, Discord webhook URL storage, members, leave/delete). **Exit criterion (from the spec):** you can create a group and a second account can join it.

**Architecture:** One new migration adds `groups` + `group_members` with member-scoped RLS built on a `SECURITY DEFINER` membership helper (the spec's #1 risk: avoid recursive RLS on `group_members`). All membership-creating writes go through two `SECURITY DEFINER` RPCs — `create_group` and `join_group` — so invite codes are server-generated and owner membership is atomic. The app side follows the existing auth-feature pattern: `groups.service.ts` → React Query hooks → Expo Router screens. Groups becomes the primary tab; the old Home content becomes a Profile tab.

**Tech Stack:** Same as Phase 0 — Expo SDK 54 / React Native 0.81 / React 19 / TypeScript 5.9; Expo Router 6; `@supabase/supabase-js` 2.97 against the **local** Supabase stack (CLI); TanStack React Query 5; Zustand 5; `expo-clipboard` (already a dependency) for copying invite codes.

**Design decisions (refinements of the spec, with rationale):**

1. **RPC-only writes for group creation and joining.** The spec's RLS sketch says "groups: insert by authenticated (owner = self)". This plan intentionally ships **no INSERT policies** on `groups` or `group_members`; creation happens only via `create_group(group_name)` and joining only via `join_group(code)` (both `SECURITY DEFINER`). Rationale: (a) `invite_code` is `NOT NULL UNIQUE` and must be server-generated — a client insert can't supply it safely; (b) the owner's membership row must be created atomically with the group; (c) a single code path is what the SQL tests exercise, and it sidesteps the `INSERT … RETURNING` vs. SELECT-policy timing subtleties an AFTER-INSERT-trigger design would introduce. The spec's *intent* (any authenticated user can create a group they own) is preserved — the RPC enforces `owner_id = auth.uid()`.
2. **Owner auto-membership lives in the `create_group` RPC, not a trigger.** Same transaction either way, but the RPC keeps all group-creation logic in one readable function; a trigger would need `SECURITY DEFINER` anyway (no INSERT policy on `group_members`) and would split the logic across two objects.
3. **Owners cannot "leave"; they delete the group.** The self-delete policy on `group_members` is restricted to `role = 'member'` so a group can never be orphaned with an owner who can't see it. The settings screen shows *Delete group* to owners and *Leave group* to members.
4. **Navigation:** the single Home tab becomes **two tabs** — `(tabs)/index.tsx` is rewritten as the **Groups list** (primary tab) and Home's profile/sign-out content moves to a new `(tabs)/profile.tsx` (the seed of spec screen 9). *Create* and *Join* are modal routes (`group/create`, `group/join`, registered in the root stack — the everrate pattern for modals). `group/[id]/index.tsx` is the group home (invite code + Phase 2 feed placeholder) and `group/[id]/settings.tsx` holds members + management.
5. **Categories seeding is deferred to Phase 2** (where `items` first references it); `supabase/seed.sql`'s comment is updated to say so.
6. **Invite alphabet:** `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (31 chars — drops 0/O, 1/I/L), enforced by a CHECK constraint; `join_group` uppercases input so codes are case-insensitive to type.

**Spec:** `docs/superpowers/specs/2026-05-29-scawwyrate-cross-platform-rebuild-design.md` (section 5 data model, section 8 Phase 1, section 9 RLS risk)

---

## Prerequisites (do before Task 1)

- [x] **P1: Phase 0 exit criteria met and committed.** ~~Untracked Phase 0 artifacts~~ — resolved 2026-07-14: the profiles migration (with explicit table GRANTs — see the Phase 0 lesson repeated in Task 1's SQL), RLS test, config.toml, and the `(tabs)` auth-guard fix are all committed. The web login loop is verified via a minted local session; the literal Discord OAuth round-trip remains blocked on real Discord app credentials (placeholders in `supabase/.env`) — that blocks nothing in this plan.

- [ ] **P2: Local Supabase is running** (Docker up, stack started):

```bash
docker ps > /dev/null && supabase status
```
Expected: `API URL: http://127.0.0.1:54321` and keys printed. If not running: `supabase start`.

- [ ] **P3 (manual exit test only): a second Discord account** for the two-account UI flow in Task 7. The SQL-level test (Task 2) is the automated gate, so this can be arranged later.

---

## Task 1: Migration — `groups` + `group_members`, invite-code RPCs, member-scoped RLS

**Files:**
- Create: `supabase/migrations/<timestamp>_groups_membership.sql` (via `supabase migration new`)
- Modify: `supabase/seed.sql` (comment only — categories move to Phase 2)
- Regenerate: `src/types/database.ts`

- [ ] **Step 1: Create the migration file.**

```bash
cd /Users/pattedyr/Documents/coding_projects/everrate
supabase migration new groups_membership
```
Expected: prints a path like `supabase/migrations/20260714NNNNNN_groups_membership.sql`. Put the SQL below into that file.

- [ ] **Step 2: Write the migration SQL** (paste into the new file):

```sql
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
```

- [ ] **Step 3: Update the seed comment** — categories move to Phase 2. Replace the last line of `supabase/seed.sql` so the file reads:

```sql
-- ScawwyRate seed data.
-- Phase 0: empty (profiles are created by the handle_new_user trigger on Discord signup).
-- Phase 2 will seed the fixed category set (Food, Movies, Games, Music, Places, Other)
-- alongside the items table that first references it.
```

- [ ] **Step 4: Apply the migration and verify the objects exist.**

```bash
supabase db reset
```
Expected: ends with `Finished supabase db reset`, listing both migrations (`…_profiles_foundation.sql`, `…_groups_membership.sql`) with no error.

Then verify functions + RLS landed:
```bash
psql "$(supabase status -o env | grep '^DB_URL' | cut -d= -f2- | tr -d '"')" -c "
  select proname, prosecdef from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and proname in ('is_group_member','is_group_owner','generate_invite_code','create_group','join_group')
  order by proname;
  select relname, relrowsecurity from pg_class
  where relname in ('groups','group_members') order by relname;"
```
Expected: 5 function rows — `prosecdef = t` for `create_group`, `is_group_member`, `is_group_owner`, `join_group`; `f` for `generate_invite_code`. Both tables show `relrowsecurity = t`.

- [ ] **Step 5: Regenerate TypeScript types.**

```bash
supabase gen types typescript --local > src/types/database.ts
```
`gen types` **overwrites** the file, wiping the manually-appended helper exports — re-append **all** of these at the bottom of `src/types/database.ts`:
```ts
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Group = Database['public']['Tables']['groups']['Row'];
export type GroupMember = Database['public']['Tables']['group_members']['Row'];
```
Sanity check the generation picked everything up:
```bash
grep -c "create_group\|join_group\|group_members" src/types/database.ts
```
Expected: a count ≥ 3 (Functions and Tables entries present).

- [ ] **Step 6: Type-check.**

```bash
npx tsc --noEmit
```
Expected: clean (no errors).

- [ ] **Step 7: Commit.**

```bash
git add supabase/migrations supabase/seed.sql src/types/database.ts
git commit -m "feat(db): groups + membership schema, invite-code RPCs, member-scoped RLS"
```

---

## Task 2: SQL RLS test — two users, join-by-code, owner powers

**Files:**
- Create: `supabase/tests/groups_rls.sql` (runnable SQL assertions, style of `supabase/tests/profiles_rls.sql`)

- [ ] **Step 1: Write the test script.** Create `supabase/tests/groups_rls.sql`:

```sql
-- Run with: psql "$(supabase status -o env | grep '^DB_URL' | cut -d= -f2- | tr -d '"')" -f supabase/tests/groups_rls.sql
-- Seeds three auth users, then asserts group RLS + RPC behavior via
-- JWT-claim impersonation. The local `postgres` role does not own auth.users,
-- so the signup trigger cannot be disabled — users are seeded THROUGH
-- handle_new_user with deterministic usernames from user_name metadata
-- (same pattern as profiles_rls.sql). Everything is rolled back.
begin;

-- Three fake auth users; the on_auth_user_created trigger derives usernames
-- 'alice_g', 'bob_g', 'carol_g' from raw_user_meta_data->>'user_name'.
-- UUIDs deliberately distinct from profiles_rls.sql's 1111.../2222... users.
insert into auth.users (id, aud, role, email, raw_user_meta_data)
values ('33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'a-groups@test.dev', '{"user_name":"alice_g"}'::jsonb),
       ('44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'b-groups@test.dev', '{"user_name":"bob_g"}'::jsonb),
       ('55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated', 'c-groups@test.dev', '{"user_name":"carol_g"}'::jsonb)
on conflict (id) do nothing;

-- Trigger sanity: all three profile rows must exist before the group assertions.
do $$
begin
  if (select count(*) from public.profiles where username in ('alice_g','bob_g','carol_g')) <> 3 then
    raise exception 'TRIGGER FAIL: handle_new_user did not create all three profiles';
  end if;
  raise notice 'TRIGGER OK: handle_new_user created alice_g, bob_g and carol_g';
end $$;

-- ---------------------------------------------------------------------------
-- Alice creates a group via the RPC.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

do $$
declare
  grp public.groups;
begin
  grp := public.create_group('RLS Test Group 7f3a');
  if grp.invite_code !~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$' then
    raise exception 'RPC FAIL: invite code % is not 6 unambiguous chars', grp.invite_code;
  end if;
  if grp.owner_id <> '33333333-3333-3333-3333-333333333333' then
    raise exception 'RPC FAIL: owner_id was not set to the creator';
  end if;
  raise notice 'RPC OK: create_group returned invite code %', grp.invite_code;
end $$;

do $$
declare affected int;
begin
  select count(*) into affected
  from public.group_members gm
  join public.groups g on g.id = gm.group_id
  where g.name = 'RLS Test Group 7f3a'
    and gm.user_id = '33333333-3333-3333-3333-333333333333'
    and gm.role = 'owner';
  if affected <> 1 then
    raise exception 'RPC FAIL: owner membership row missing (% rows)', affected;
  end if;
  raise notice 'RPC OK: creator auto-added as owner member';
end $$;

-- Pin the (random) invite code so the rest of the script is deterministic.
reset role;
update public.groups set invite_code = 'TESTAA' where name = 'RLS Test Group 7f3a';

-- ---------------------------------------------------------------------------
-- Member vs. non-member visibility.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

do $$
declare affected int;
begin
  select count(*) into affected from public.groups where invite_code = 'TESTAA';
  if affected <> 1 then
    raise exception 'RLS FAIL: member cannot read her own group (% rows)', affected;
  end if;
  raise notice 'RLS OK: member (alice) can read the group';
end $$;

set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

do $$
declare affected int;
begin
  select count(*) into affected from public.groups where invite_code = 'TESTAA';
  if affected <> 0 then
    raise exception 'RLS FAIL: non-member can read the group (% rows)', affected;
  end if;
  select count(*) into affected from public.group_members;
  if affected <> 0 then
    raise exception 'RLS FAIL: non-member can read membership rows (% rows)', affected;
  end if;
  raise notice 'RLS OK: non-member (bob) sees neither group nor members';
end $$;

-- ---------------------------------------------------------------------------
-- join_group: invalid code rejected; valid (lowercase) code joins.
-- ---------------------------------------------------------------------------
do $$
declare ok boolean := false;
begin
  begin
    perform public.join_group('ZZZZZZ');
  exception when others then
    ok := sqlerrm like '%invalid_invite_code%';
  end;
  if not ok then
    raise exception 'RPC FAIL: join_group accepted an invalid code';
  end if;
  raise notice 'RPC OK: invalid invite code rejected';
end $$;

do $$
declare
  grp public.groups;
  affected int;
begin
  grp := public.join_group('testaa');  -- lowercase on purpose: input is normalized
  select count(*) into affected from public.groups where id = grp.id;
  if affected <> 1 then
    raise exception 'RLS FAIL: joined member cannot read the group (% rows)', affected;
  end if;
  select count(*) into affected from public.group_members where group_id = grp.id;
  if affected <> 2 then
    raise exception 'RLS FAIL: expected 2 visible member rows after join, got %', affected;
  end if;
  raise notice 'RPC OK: bob joined via code and can now read the group + members';
end $$;

-- ---------------------------------------------------------------------------
-- Direct INSERTs are blocked (no INSERT policies — RPCs are the only path).
-- ---------------------------------------------------------------------------
do $$
declare
  gid uuid := (select id from public.groups where invite_code = 'TESTAA');
  ok boolean := false;
begin
  begin
    insert into public.group_members (group_id, user_id, role)
    values (gid, '55555555-5555-5555-5555-555555555555', 'member');
  exception when insufficient_privilege then
    ok := true;
  end;
  if not ok then
    raise exception 'RLS FAIL: direct insert into group_members was allowed';
  end if;

  ok := false;
  begin
    insert into public.groups (name, invite_code, owner_id)
    values ('Evil Group', 'XYZ234', '44444444-4444-4444-4444-444444444444');
  exception when insufficient_privilege then
    ok := true;
  end;
  if not ok then
    raise exception 'RLS FAIL: direct insert into groups was allowed';
  end if;
  raise notice 'RLS OK: direct inserts into groups/group_members are blocked';
end $$;

-- ---------------------------------------------------------------------------
-- Updates: member cannot, owner can.
-- ---------------------------------------------------------------------------
do $$
declare affected int;
begin
  update public.groups set name = 'Hacked' where invite_code = 'TESTAA';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'RLS FAIL: non-owner member updated the group (% rows)', affected;
  end if;
  raise notice 'RLS OK: member (bob) cannot update the group';
end $$;

-- ---------------------------------------------------------------------------
-- Deletes on group_members: bob cannot remove alice; bob can leave.
-- ---------------------------------------------------------------------------
do $$
declare affected int;
begin
  delete from public.group_members
  where group_id = (select id from public.groups where invite_code = 'TESTAA')
    and user_id = '33333333-3333-3333-3333-333333333333';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'RLS FAIL: member removed another member (% rows)', affected;
  end if;
  raise notice 'RLS OK: member cannot remove other members';
end $$;

do $$
declare affected int;
begin
  delete from public.group_members
  where group_id = (select id from public.groups where invite_code = 'TESTAA')
    and user_id = '44444444-4444-4444-4444-444444444444';
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'RLS FAIL: member could not leave (% rows)', affected;
  end if;
  raise notice 'RLS OK: member (bob) left the group';
end $$;

do $$
declare affected int;
begin
  select count(*) into affected from public.groups where invite_code = 'TESTAA';
  if affected <> 0 then
    raise exception 'RLS FAIL: ex-member can still read the group (% rows)', affected;
  end if;
  raise notice 'RLS OK: after leaving, the group is invisible to bob again';
end $$;

-- Bob rejoins so the owner-removal path can be tested.
do $$
begin
  perform public.join_group('TESTAA');
end $$;

-- ---------------------------------------------------------------------------
-- Owner powers: update works, remove member works, cannot delete own
-- membership, can delete the whole group.
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

do $$
declare affected int;
begin
  update public.groups
  set name = 'RLS Test Group 7f3a (renamed)',
      discord_webhook_url = 'https://discord.com/api/webhooks/123/abc'
  where invite_code = 'TESTAA';
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'RLS FAIL: owner could not update the group (% rows)', affected;
  end if;
  raise notice 'RLS OK: owner updated name + webhook url';
end $$;

do $$
declare affected int;
begin
  delete from public.group_members
  where group_id = (select id from public.groups where invite_code = 'TESTAA')
    and user_id = '44444444-4444-4444-4444-444444444444';
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'RLS FAIL: owner could not remove a member (% rows)', affected;
  end if;
  raise notice 'RLS OK: owner removed a member';
end $$;

do $$
declare affected int;
begin
  delete from public.group_members
  where group_id = (select id from public.groups where invite_code = 'TESTAA')
    and user_id = '33333333-3333-3333-3333-333333333333';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'RLS FAIL: owner deleted their own membership (% rows)', affected;
  end if;
  raise notice 'RLS OK: owner cannot leave (must delete the group instead)';
end $$;

do $$
declare affected int;
begin
  delete from public.groups where invite_code = 'TESTAA';
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'RLS FAIL: owner could not delete the group (% rows)', affected;
  end if;
  raise notice 'RLS OK: owner deleted the group (memberships cascade via FK)';
end $$;

rollback; -- leave the DB clean
```

- [ ] **Step 2: Run it.**

```bash
psql "$(supabase status -o env | grep '^DB_URL' | cut -d= -f2- | tr -d '"')" -f supabase/tests/groups_rls.sql
```
Expected output includes all of these notices, in order, and **no** `FAIL`:
```
TRIGGER OK: handle_new_user created alice_g, bob_g and carol_g
RPC OK: create_group returned invite code ......
RPC OK: creator auto-added as owner member
RLS OK: member (alice) can read the group
RLS OK: non-member (bob) sees neither group nor members
RPC OK: invalid invite code rejected
RPC OK: bob joined via code and can now read the group + members
RLS OK: direct inserts into groups/group_members are blocked
RLS OK: member (bob) cannot update the group
RLS OK: member cannot remove other members
RLS OK: member (bob) left the group
RLS OK: after leaving, the group is invisible to bob again
RLS OK: owner updated name + webhook url
RLS OK: owner removed a member
RLS OK: owner cannot leave (must delete the group instead)
RLS OK: owner deleted the group (memberships cascade via FK)
```

- [ ] **Step 3: Commit.**

```bash
git add supabase/tests/groups_rls.sql
git commit -m "test(db): groups RLS — membership visibility, join-by-code, owner powers"
```

---

## Task 3: Groups feature layer — query keys, service, hooks

**Files:**
- Modify: `src/lib/queryKeys.ts` (replace — prune dead drinks-era keys, add groups)
- Create: `src/features/groups/groups.service.ts`
- Create: `src/features/groups/hooks/useGroups.ts`

- [ ] **Step 1: Confirm the old query keys are dead code** (the drinks features that used them were deleted in Phase 0):

```bash
grep -rn "queryKeys" src --include="*.ts" --include="*.tsx" | grep -v "lib/queryKeys.ts"
```
Expected: no output. (If anything shows up, keep the keys it uses and only add the `groups` block below.)

- [ ] **Step 2: Replace `src/lib/queryKeys.ts`** with the pruned + extended version:

```ts
export const queryKeys = {
  profiles: {
    detail: (id: string) => ['profiles', 'detail', id] as const,
  },
  groups: {
    all: ['groups'] as const,
    detail: (id: string) => ['groups', 'detail', id] as const,
    members: (id: string) => ['groups', 'members', id] as const,
  },
} as const;
```

- [ ] **Step 3: Create `src/features/groups/groups.service.ts`** (mirrors the `auth.service.ts` pattern — plain async functions over the supabase client):

```ts
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
  updates: { name?: string; discord_webhook_url?: string | null },
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
```

> **Verify-at-runtime note:** `select('*, group_members(count)')` relies on supabase-js typed aggregate inference. If `npx tsc` errors on `listMyGroups`'s return, append `.overrideTypes<GroupWithMemberCount[]>()` after `.order(...)` (or `.returns<GroupWithMemberCount[]>()` on older supabase-js). Same fallback applies to `listGroupMembers`.

- [ ] **Step 4: Create `src/features/groups/hooks/useGroups.ts`** (mirrors `features/auth/hooks/useAuth.ts` — thin React Query wrappers):

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import * as groupsService from '../groups.service';

export function useMyGroups() {
  return useQuery({
    queryKey: queryKeys.groups.all,
    queryFn: groupsService.listMyGroups,
  });
}

export function useGroup(groupId: string) {
  return useQuery({
    queryKey: queryKeys.groups.detail(groupId),
    queryFn: () => groupsService.getGroup(groupId),
    enabled: !!groupId,
  });
}

export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: queryKeys.groups.members(groupId),
    queryFn: () => groupsService.listGroupMembers(groupId),
    enabled: !!groupId,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => groupsService.createGroup(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => groupsService.joinGroup(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
}

export function useUpdateGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: { name?: string; discord_webhook_url?: string | null }) =>
      groupsService.updateGroup(groupId, updates),
    onSuccess: (group) => {
      queryClient.setQueryData(queryKeys.groups.detail(groupId), group);
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      groupsService.removeMembership(groupId, userId),
    onSuccess: (_data, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      queryClient.removeQueries({ queryKey: queryKeys.groups.detail(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.groups.members(groupId) });
    },
  });
}

export function useRemoveMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => groupsService.removeMembership(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.members(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => groupsService.deleteGroup(groupId),
    onSuccess: (_data, groupId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      queryClient.removeQueries({ queryKey: queryKeys.groups.detail(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.groups.members(groupId) });
    },
  });
}
```

- [ ] **Step 5: Type-check.**

```bash
npx tsc --noEmit
```
Expected: clean. (If `listMyGroups` errors, apply the `overrideTypes` fallback from Step 3's note.)

- [ ] **Step 6: Commit.**

```bash
git add src/lib/queryKeys.ts src/features/groups
git commit -m "feat(groups): service + React Query hooks; prune dead drinks-era query keys"
```

---

## Task 4: Navigation — Groups list becomes the primary tab, Profile tab added

**Files:**
- Modify: `src/app/(tabs)/_layout.tsx` (two tabs: Groups + Profile)
- Create: `src/app/(tabs)/profile.tsx` (old Home content, now the Profile tab)
- Rewrite: `src/app/(tabs)/index.tsx` (Groups list)
- Modify: `src/app/_layout.tsx` (register the create/join modal routes)

- [ ] **Step 1: Replace `src/app/(tabs)/_layout.tsx`** with the two-tab layout:

```tsx
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="people" color={color} size={size} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="person-circle" color={color} size={size} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.tabBarBackground,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
  },
  tabBarLabel: { fontSize: 10, fontWeight: '600' },
});
```

- [ ] **Step 2: Create `src/app/(tabs)/profile.tsx`** — the old Home content. One deliberate change: sign out via the existing `useSignOut` hook (it clears the React Query cache, which matters now that groups are cached — a second account on the same device must not see the first account's cached groups).

```tsx
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Avatar } from '@/shared/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { getProfile } from '@/features/auth/auth.service';
import { useSignOut } from '@/features/auth/hooks/useAuth';
import type { Profile } from '@/types/database';
import { colors, spacing } from '@/theme';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useSignOut();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user?.id) getProfile(user.id).then(setProfile).catch(() => {});
  }, [user?.id]);

  return (
    <View style={styles.container}>
      {profile?.avatar_url ? <Avatar uri={profile.avatar_url} size="xl" /> : null}
      <Text style={styles.hello}>
        {profile ? `Signed in as @${profile.username}` : 'Loading profile…'}
      </Text>
      <Button title="Sign out" onPress={() => signOut.mutate()} loading={signOut.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md },
  hello: { fontSize: 20, fontWeight: '700', color: colors.text },
});
```

- [ ] **Step 3: Rewrite `src/app/(tabs)/index.tsx`** as the Groups list:

```tsx
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Card, EmptyState } from '@/shared/components/ui';
import { useMyGroups } from '@/features/groups/hooks/useGroups';
import type { GroupWithMemberCount } from '@/features/groups/groups.service';
import { colors, spacing } from '@/theme';

export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const { data: groups, isLoading, isError, refetch } = useMyGroups();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text color={colors.error}>Could not load your groups.</Text>
        <Button title="Retry" onPress={() => refetch()} variant="outline" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <Text variant="h2">Groups</Text>
        <View style={styles.headerActions}>
          <Button title="Join" onPress={() => router.push('/group/join')} variant="outline" size="sm" />
          <Button title="Create" onPress={() => router.push('/group/create')} size="sm" />
        </View>
      </View>
      <FlatList
        data={groups ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }: { item: GroupWithMemberCount }) => {
          const memberCount = item.group_members[0]?.count ?? 0;
          return (
            <Card onPress={() => router.push(`/group/${item.id}`)} style={styles.card}>
              <Text variant="h3">{item.name}</Text>
              <Text variant="caption" color={colors.textMuted}>
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </Text>
            </Card>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No groups yet"
            message="Create a group or join one with an invite code."
            actionLabel="Create a group"
            onAction={() => router.push('/group/create')}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  list: { gap: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  card: { gap: spacing.xs },
});
```

- [ ] **Step 4: Register the modal routes in `src/app/_layout.tsx`.** Replace the `<Stack>…</Stack>` children block so it reads:

```tsx
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="group/create" options={{ presentation: 'modal' }} />
          <Stack.Screen name="group/join" options={{ presentation: 'modal' }} />
        </Stack>
```
(The `group/[id]/*` screens are auto-registered by Expo Router with the default slide animation — no entries needed.)

- [ ] **Step 5: Type-check.**

```bash
npx tsc --noEmit
```
Expected: clean. (The `group/create` and `group/join` routes referenced by `router.push` don't exist until Task 5 — that's fine; typed routes are not enabled, so route strings are not checked by tsc.)

- [ ] **Step 6: Commit.**

```bash
git add "src/app/(tabs)/_layout.tsx" "src/app/(tabs)/index.tsx" "src/app/(tabs)/profile.tsx" src/app/_layout.tsx
git commit -m "feat(nav): Groups list as primary tab, Profile tab, modal routes for create/join"
```

---

## Task 5: Create-group and join-by-code screens

**Files:**
- Create: `src/app/group/create.tsx`
- Create: `src/app/group/join.tsx`

- [ ] **Step 1: Create `src/app/group/create.tsx`:**

```tsx
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Input } from '@/shared/components/ui';
import { useCreateGroup } from '@/features/groups/hooks/useGroups';
import { colors, spacing } from '@/theme';

export default function CreateGroupScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createGroup = useCreateGroup();

  function onCreate() {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 80) {
      setError('Group name must be 1–80 characters.');
      return;
    }
    setError(null);
    createGroup.mutate(trimmed, {
      onSuccess: (group) => router.replace(`/group/${group.id}`),
      onError: (e) => setError(e.message),
    });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <Text variant="h2">Create a group</Text>
      <Text variant="body" color={colors.textSecondary}>
        You will get a 6-character invite code to share with friends.
      </Text>
      <Input
        label="Group name"
        placeholder="e.g. Movie Night"
        value={name}
        onChangeText={setName}
        maxLength={80}
        autoFocus
        error={error ?? undefined}
      />
      <Button title="Create group" onPress={onCreate} loading={createGroup.isPending} fullWidth />
      <Button title="Cancel" onPress={() => router.back()} variant="ghost" fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.lg },
});
```

- [ ] **Step 2: Create `src/app/group/join.tsx`:**

```tsx
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Input } from '@/shared/components/ui';
import { useJoinGroup } from '@/features/groups/hooks/useGroups';
import { colors, spacing } from '@/theme';

export default function JoinGroupScreen() {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const joinGroup = useJoinGroup();

  function onJoin() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError('Invite codes are exactly 6 characters.');
      return;
    }
    setError(null);
    joinGroup.mutate(trimmed, {
      onSuccess: (group) => router.replace(`/group/${group.id}`),
      onError: (e) =>
        setError(
          e.message.includes('invalid_invite_code')
            ? 'That code does not match any group.'
            : e.message,
        ),
    });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <Text variant="h2">Join a group</Text>
      <Text variant="body" color={colors.textSecondary}>
        Enter the 6-character invite code you were given.
      </Text>
      <Input
        label="Invite code"
        placeholder="ABC234"
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        maxLength={6}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        error={error ?? undefined}
      />
      <Button title="Join group" onPress={onJoin} loading={joinGroup.isPending} fullWidth />
      <Button title="Cancel" onPress={() => router.back()} variant="ghost" fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.lg },
});
```

- [ ] **Step 3: Type-check.**

```bash
npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add src/app/group/create.tsx src/app/group/join.tsx
git commit -m "feat(groups): create-group and join-by-code screens"
```

---

## Task 6: Group home (invite code) + group settings screens

**Files:**
- Create: `src/app/group/[id]/index.tsx` (group home — invite code + Phase 2 feed placeholder)
- Create: `src/app/group/[id]/settings.tsx` (rename, webhook URL storage, members, leave/delete)

- [ ] **Step 1: Create `src/app/group/[id]/index.tsx`:**

```tsx
import { useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Card, EmptyState } from '@/shared/components/ui';
import { useGroup } from '@/features/groups/hooks/useGroups';
import { colors, spacing } from '@/theme';

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: group, isLoading } = useGroup(id);
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!group) return;
    await Clipboard.setStringAsync(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.center}>
        <Text color={colors.textSecondary}>Group not found (or you are not a member).</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text color={colors.primary}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text variant="h3" style={styles.headerTitle} numberOfLines={1}>
          {group.name}
        </Text>
        <Pressable onPress={() => router.push(`/group/${group.id}/settings`)} hitSlop={12}>
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      <Card style={styles.inviteCard} onPress={copyCode}>
        <Text variant="labelSmall" color={colors.textMuted}>
          INVITE CODE
        </Text>
        <View style={styles.inviteRow}>
          <Text style={styles.inviteCode}>{group.invite_code}</Text>
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={20}
            color={copied ? colors.success : colors.textSecondary}
          />
        </View>
        <Text variant="caption" color={colors.textMuted}>
          {copied ? 'Copied!' : 'Tap to copy — share it to invite friends.'}
        </Text>
      </Card>

      <EmptyState
        icon="star-outline"
        title="No ratings yet"
        message="Rating items in this group arrives in Phase 2."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  headerTitle: { flex: 1 },
  inviteCard: { gap: spacing.xs },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inviteCode: { fontSize: 28, fontWeight: '800', letterSpacing: 4, color: colors.primary },
});
```

- [ ] **Step 2: Create `src/app/group/[id]/settings.tsx`:**

```tsx
import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Input, Card, Avatar } from '@/shared/components/ui';
import { useAuthStore } from '@/stores/authStore';
import {
  useDeleteGroup,
  useGroup,
  useGroupMembers,
  useLeaveGroup,
  useRemoveMember,
  useUpdateGroup,
} from '@/features/groups/hooks/useGroups';
import { colors, spacing } from '@/theme';

const WEBHOOK_PREFIX = 'https://discord.com/api/webhooks/';

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const { data: group, isLoading } = useGroup(id);
  const { data: members } = useGroupMembers(id);
  const updateGroup = useUpdateGroup(id);
  const leaveGroup = useLeaveGroup();
  const removeMember = useRemoveMember(id);
  const deleteGroup = useDeleteGroup();

  const [name, setName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'leave' | 'delete' | null>(null);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setWebhookUrl(group.discord_webhook_url ?? '');
    }
    // Re-sync the form only when a different group loads, not on every refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id]);

  const isOwner = !!group && !!user && group.owner_id === user.id;

  function onSave() {
    const trimmedName = name.trim();
    const trimmedUrl = webhookUrl.trim();
    if (trimmedName.length < 1 || trimmedName.length > 80) {
      setFormError('Group name must be 1–80 characters.');
      return;
    }
    if (trimmedUrl && !trimmedUrl.startsWith(WEBHOOK_PREFIX)) {
      setFormError(`Webhook URL must start with ${WEBHOOK_PREFIX}`);
      return;
    }
    setFormError(null);
    updateGroup.mutate(
      { name: trimmedName, discord_webhook_url: trimmedUrl || null },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
        onError: (e) => setFormError(e.message),
      },
    );
  }

  function onLeave() {
    if (confirmAction !== 'leave') {
      setConfirmAction('leave');
      return;
    }
    if (!user) return;
    leaveGroup.mutate(
      { groupId: id, userId: user.id },
      { onSuccess: () => router.replace('/(tabs)') },
    );
  }

  function onDelete() {
    if (confirmAction !== 'delete') {
      setConfirmAction('delete');
      return;
    }
    deleteGroup.mutate(id, { onSuccess: () => router.replace('/(tabs)') });
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.center}>
        <Text color={colors.textSecondary}>Group not found (or you are not a member).</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg }]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text variant="h3" style={styles.headerTitle}>
          Settings
        </Text>
      </View>

      {isOwner ? (
        <Card style={styles.section}>
          <Text variant="label" color={colors.textSecondary}>
            Group
          </Text>
          <Input label="Name" value={name} onChangeText={setName} maxLength={80} />
          <Input
            label="Discord webhook URL (posting arrives in Phase 4)"
            value={webhookUrl}
            onChangeText={setWebhookUrl}
            placeholder={`${WEBHOOK_PREFIX}…`}
            autoCapitalize="none"
            autoCorrect={false}
            error={formError ?? undefined}
          />
          <Button
            title={saved ? 'Saved ✓' : 'Save changes'}
            onPress={onSave}
            loading={updateGroup.isPending}
          />
        </Card>
      ) : null}

      <Card style={styles.section}>
        <Text variant="label" color={colors.textSecondary}>
          Members ({members?.length ?? 0})
        </Text>
        {(members ?? []).map((m) => (
          <View key={m.user_id} style={styles.memberRow}>
            <Avatar uri={m.profiles?.avatar_url} name={m.profiles?.username} size="sm" />
            <View style={styles.memberInfo}>
              <Text variant="body">@{m.profiles?.username ?? 'unknown'}</Text>
              <Text variant="caption" color={colors.textMuted}>
                {m.role}
              </Text>
            </View>
            {isOwner && m.user_id !== user?.id ? (
              <Pressable onPress={() => removeMember.mutate(m.user_id)} hitSlop={8}>
                <Ionicons name="close-circle-outline" size={22} color={colors.error} />
              </Pressable>
            ) : null}
          </View>
        ))}
      </Card>

      {isOwner ? (
        <Button
          title={confirmAction === 'delete' ? 'Tap again to delete group' : 'Delete group'}
          onPress={onDelete}
          variant="outline"
          loading={deleteGroup.isPending}
        />
      ) : (
        <Button
          title={confirmAction === 'leave' ? 'Tap again to leave group' : 'Leave group'}
          onPress={onLeave}
          variant="outline"
          loading={leaveGroup.isPending}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerTitle: { flex: 1 },
  section: { gap: spacing.md },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  memberInfo: { flex: 1 },
});
```

> Destructive actions use a two-tap confirm (button relabels to "Tap again to …") instead of `Alert.alert` — `Alert` buttons are a no-op on web, and this app ships web + Android.

- [ ] **Step 3: Type-check.**

```bash
npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 4: Quick manual smoke on web** (full two-account flow is Task 7):

```bash
npx expo start --web
```
Manual: sign in → Groups tab shows the empty state → **Create** → name a group → land on the group home showing a 6-char invite code → tap it → "Copied!" → gear icon → Settings shows you as `owner`, name + webhook inputs, and a **Delete group** button. Back out; the Groups list shows the group with "1 member".

- [ ] **Step 5: Commit.**

```bash
git add "src/app/group/[id]/index.tsx" "src/app/group/[id]/settings.tsx"
git commit -m "feat(groups): group home with invite code + settings (rename, webhook, members, leave/delete)"
```

---

## Task 7: Phase 1 exit verification — two accounts, one group

No code changes — this is the Phase 1 exit gate: *"you can create a group and a second account can join it."* The **SQL test is the automated gate** (it exercises exactly this: user A creates via `create_group`, user B joins via `join_group` and can then read the group); the UI flow is the manual confirmation.

- [ ] **Step 1: Full clean rebuild of the database and all checks.**

```bash
cd /Users/pattedyr/Documents/coding_projects/everrate
supabase db reset
psql "$(supabase status -o env | grep '^DB_URL' | cut -d= -f2- | tr -d '"')" -f supabase/tests/profiles_rls.sql
psql "$(supabase status -o env | grep '^DB_URL' | cut -d= -f2- | tr -d '"')" -f supabase/tests/groups_rls.sql
npx tsc --noEmit
```
Expected: `Finished supabase db reset`; both test scripts print only `… OK …` notices (no `FAIL`); tsc clean. **This is the automated Phase 1 exit gate.**

- [ ] **Step 2: Manual two-account UI flow on web** (needs the second Discord account from Prerequisite P3).

```bash
npx expo start --web
```
Manual:
1. **Window A** (normal browser window): sign in with Discord account 1 → Create a group "Test Crew" → note the invite code on the group home.
2. **Window B** (incognito/private window, so sessions don't share localStorage): sign in with Discord account 2 → Groups tab → **Join** → type the code (try it in lowercase — it must still work) → you land on "Test Crew".
3. In Window B: Settings shows **2 members** (account 1 as `owner`, account 2 as `member`) and a **Leave group** button (no rename/delete controls).
4. In Window A: refresh → Settings shows both members; remove account 2 with the ✕ → member list drops to 1.
5. In Window B: refresh the Groups list → "Test Crew" is gone (removed member loses access).

- [ ] **Step 3 (optional): Same flow on Android** (dev build, `npx expo run:android`). Remember the Phase 0 networking gotcha: emulator reaches local Supabase at `http://10.0.2.2:54321`, a physical device needs your LAN IP in `EXPO_PUBLIC_SUPABASE_URL`.

- [ ] **Step 4: Phase 1 exit checklist (tick all).**

  - [ ] `npx tsc --noEmit` is clean
  - [ ] `supabase db reset` applies both migrations with no error
  - [ ] `supabase/tests/profiles_rls.sql` still passes (no regression)
  - [ ] `supabase/tests/groups_rls.sql` passes — create as A, join by code as B, member/non-member visibility, owner powers (automated exit gate)
  - [ ] UI: account A created a group and account B joined it by invite code (web)
  - [ ] Invite code is 6 unambiguous chars, shown on the group home, copyable
  - [ ] Settings: owner can rename + store a webhook URL + remove a member + delete the group; member can leave; removed/left members lose access

- [ ] **Step 5: Final commit / tag the milestone.**

```bash
git add -A
git commit -m "chore: Phase 1 complete — groups create/join/list/settings on local Supabase" --allow-empty
git tag phase-1-groups
```

---

## Self-review notes (author)

- **Spec coverage (Phase 1 = "Groups — create / join-by-code / list / settings; membership + RLS; invite-code RPC"):** schema + RLS + RPCs ✅(T1), RLS proven with two users incl. join-by-code ✅(T2), feature service + hooks + query keys ✅(T3), list screen as main tab ✅(T4), create + join screens ✅(T5), settings (rename, webhook URL storage-only per Phase 4 boundary, members list, leave/delete, owner-remove) ✅(T6), exit criterion verified SQL-first + manual UI ✅(T7). `is_group_member` is `SECURITY DEFINER` per spec section 9.
- **Deviations from the spec, called out in the header:** no client INSERT policies on `groups`/`group_members` (RPC-only creation/joining, rationale in Design decision 1); owners cannot leave, only delete (decision 3); categories seed deferred to Phase 2 (decision 5).
- **No placeholders:** every code/SQL step is complete; the only "verify at runtime" flags are typed-inference fallbacks (`overrideTypes` note in T3S3) — flagged inline in Phase 0 style.
- **Type/name consistency:** `create_group(group_name)` / `join_group(code)` (T1) ⇄ `supabase.rpc('create_group', { group_name })` / `rpc('join_group', { code })` (T3); `GroupWithMemberCount`/`GroupMemberWithProfile` defined in T3, consumed in T4/T6; hooks defined in T3 match every screen import in T4–T6; `queryKeys.groups.{all,detail,members}` used only via the T3 hooks; route strings `/group/create`, `/group/join`, `/group/[id]`, `/group/[id]/settings` match the files created in T4–T6.
- **Known verify-at-runtime points:** supabase-js typing of the `group_members(count)` aggregate (fallback given), the generated `Functions` return shape for `returns public.groups` composites (should be the row shape; cast `as Group` if not), and `presentation: 'modal'` degrading to a plain screen on web (harmless).
- **Pre-existing issue flagged (No Blind Eye):** Phase 0's migration/test files were untracked at plan time — Prerequisite P1 commits them before Phase 1 begins.
