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
