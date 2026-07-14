-- Run with: psql "$(npx supabase status -o env | grep '^DB_URL' | cut -d= -f2- | tr -d '"')" -f supabase/tests/items_ratings_rls.sql
-- Seeds three auth users (through handle_new_user, since the local postgres
-- role can't disable the auth.users trigger), builds two groups, then asserts
-- dedup, score bounds, one-rating-per-user, stat-trigger correctness across
-- insert/update/delete, and cross-group isolation. Group/category ids are
-- captured into transaction-local GUCs so every block can reference them
-- regardless of which user it impersonates (RLS would hide them otherwise).
-- Everything is rolled back.
begin;

-- Three fake auth users; on_auth_user_created derives usernames from user_name.
-- UUIDs deliberately distinct from the other test files (1111/2222/3333…).
insert into auth.users (id, aud, role, email, raw_user_meta_data)
values ('66666666-6666-6666-6666-666666666666', 'authenticated', 'authenticated', 'a-items@test.dev', '{"user_name":"alice_i"}'::jsonb),
       ('77777777-7777-7777-7777-777777777777', 'authenticated', 'authenticated', 'b-items@test.dev', '{"user_name":"bob_i"}'::jsonb),
       ('88888888-8888-8888-8888-888888888888', 'authenticated', 'authenticated', 'c-items@test.dev', '{"user_name":"carol_i"}'::jsonb)
on conflict (id) do nothing;

do $$
begin
  if (select count(*) from public.profiles where username in ('alice_i','bob_i','carol_i')) <> 3 then
    raise exception 'TRIGGER FAIL: handle_new_user did not create all three profiles';
  end if;
  raise notice 'TRIGGER OK: handle_new_user created alice_i, bob_i and carol_i';
end $$;

-- Alice creates group A; Carol creates group B.
set local role authenticated;
set local request.jwt.claims = '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';
do $$ begin perform public.create_group('Items Test A'); end $$;

set local request.jwt.claims = '{"sub":"88888888-8888-8888-8888-888888888888","role":"authenticated"}';
do $$ begin perform public.create_group('Items Test B'); end $$;

-- Capture ids + A's invite code into transaction-local GUCs (as superuser, so
-- RLS can't hide them). is_local = true => auto-cleared at rollback.
reset role;
select set_config('test.gid_a',     (select id::text from public.groups where name = 'Items Test A'), true);
select set_config('test.gid_b',     (select id::text from public.groups where name = 'Items Test B'), true);
select set_config('test.code_a',    (select invite_code from public.groups where name = 'Items Test A'), true);
select set_config('test.cat_food',  (select id::text from public.categories where slug = 'food'), true);
select set_config('test.cat_movies',(select id::text from public.categories where slug = 'movies'), true);

-- Bob joins group A.
set local role authenticated;
set local request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}';
do $$ begin perform public.join_group(current_setting('test.code_a')); end $$;

-- ---------------------------------------------------------------------------
-- Alice rates a brand-new item -> item created, stats initialised.
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';
do $$
declare it public.items;
begin
  perform public.rate_item(
    p_group_id    := current_setting('test.gid_a')::uuid,
    p_score       := 8,
    p_item_name   := 'Pizza Palace',
    p_category_id := current_setting('test.cat_food')::uuid
  );
  select * into it from public.items
  where group_id = current_setting('test.gid_a')::uuid and normalized_name = 'pizza palace';
  if not found then raise exception 'RPC FAIL: item was not created'; end if;
  if it.rating_count <> 1 or it.total_score <> 8 or it.average_score <> 8.0
     or it.highest_score <> 8 or it.lowest_score <> 8 then
    raise exception 'TRIGGER FAIL: item stats wrong after first rating (cnt % avg %)', it.rating_count, it.average_score;
  end if;
  raise notice 'RPC/TRIGGER OK: new item created, stats cnt=1 avg=8.0';
end $$;

-- ---------------------------------------------------------------------------
-- Dedup: Bob rates the SAME thing typed differently -> same item, no dup.
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}';
do $$
declare it public.items; n int;
begin
  perform public.rate_item(
    p_group_id    := current_setting('test.gid_a')::uuid,
    p_score       := 6,
    p_item_name   := '  Pizza   PALACE  ',   -- messy case + whitespace
    p_category_id := current_setting('test.cat_movies')::uuid  -- ignored: item exists
  );
  select count(*) into n from public.items
  where group_id = current_setting('test.gid_a')::uuid and normalized_name = 'pizza palace';
  if n <> 1 then raise exception 'DEDUP FAIL: expected 1 item, got %', n; end if;
  select * into it from public.items
  where group_id = current_setting('test.gid_a')::uuid and normalized_name = 'pizza palace';
  if it.rating_count <> 2 or it.total_score <> 14 or it.average_score <> 7.0
     or it.highest_score <> 8 or it.lowest_score <> 6 then
    raise exception 'TRIGGER FAIL: stats wrong after dedup rating (cnt % avg %)', it.rating_count, it.average_score;
  end if;
  if it.category_id <> current_setting('test.cat_food')::uuid then
    raise exception 'DEDUP FAIL: existing item''s category was changed by a later rating';
  end if;
  raise notice 'DEDUP/TRIGGER OK: same item, stats cnt=2 avg=7.0 high=8 low=6, category kept';
end $$;

-- ---------------------------------------------------------------------------
-- Score bounds: out-of-range rejected AND no orphan item created.
-- ---------------------------------------------------------------------------
do $$
declare ok boolean := false; n int;
begin
  begin
    perform public.rate_item(
      p_group_id    := current_setting('test.gid_a')::uuid,
      p_score       := 11,
      p_item_name   := 'Bounds Probe',
      p_category_id := current_setting('test.cat_food')::uuid
    );
  exception when others then ok := sqlerrm like '%invalid_score%';
  end;
  if not ok then raise exception 'BOUNDS FAIL: score 11 was accepted'; end if;
  select count(*) into n from public.items
  where group_id = current_setting('test.gid_a')::uuid and normalized_name = 'bounds probe';
  if n <> 0 then raise exception 'BOUNDS FAIL: rejected score still created an item'; end if;
  raise notice 'BOUNDS OK: score 11 rejected, no orphan item';
end $$;

-- Lower bound: score 0 rejected AND no orphan item or rating side effects.
do $$
declare ok boolean := false; n int;
begin
  begin
    perform public.rate_item(
      p_group_id    := current_setting('test.gid_a')::uuid,
      p_score       := 0,
      p_item_name   := 'Bounds Probe Low',
      p_category_id := current_setting('test.cat_food')::uuid
    );
  exception when others then ok := sqlerrm like '%invalid_score%';
  end;
  if not ok then raise exception 'BOUNDS FAIL: score 0 was accepted'; end if;
  select count(*) into n from public.items
  where group_id = current_setting('test.gid_a')::uuid and normalized_name = 'bounds probe low';
  if n <> 0 then raise exception 'BOUNDS FAIL: rejected score still created an item'; end if;
  select count(*) into n from public.ratings
  where group_id = current_setting('test.gid_a')::uuid;
  if n <> 2 then raise exception 'BOUNDS FAIL: rejected score changed ratings (% rows, expected 2)', n; end if;
  raise notice 'BOUNDS OK: score 0 rejected, no orphan item or rating';
end $$;

-- ---------------------------------------------------------------------------
-- One rating per user/item: Alice re-rates -> update, not a new row.
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';
do $$
declare it public.items; mine int;
begin
  perform public.rate_item(
    p_group_id  := current_setting('test.gid_a')::uuid,
    p_score     := 4,
    p_item_name := 'pizza palace'   -- dedups to the existing item
  );
  select count(*) into mine from public.ratings r
  join public.items i on i.id = r.item_id
  where i.normalized_name = 'pizza palace'
    and i.group_id = current_setting('test.gid_a')::uuid
    and r.user_id = '66666666-6666-6666-6666-666666666666';
  if mine <> 1 then raise exception 'UPSERT FAIL: Alice has % rating rows, expected 1', mine; end if;
  select * into it from public.items
  where group_id = current_setting('test.gid_a')::uuid and normalized_name = 'pizza palace';
  if it.rating_count <> 2 or it.total_score <> 10 or it.average_score <> 5.0
     or it.highest_score <> 6 or it.lowest_score <> 4 then
    raise exception 'TRIGGER FAIL: stats wrong after re-rate (cnt % avg %)', it.rating_count, it.average_score;
  end if;
  raise notice 'UPSERT/TRIGGER OK: re-rate updated in place, stats cnt=2 avg=5.0 high=6 low=4';
end $$;

-- ---------------------------------------------------------------------------
-- Non-member (Carol) cannot rate group A, and cannot read its items/ratings.
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"88888888-8888-8888-8888-888888888888","role":"authenticated"}';
do $$
declare ok boolean := false; n int;
begin
  begin
    perform public.rate_item(
      p_group_id  := current_setting('test.gid_a')::uuid,
      p_score     := 9,
      p_item_name := 'Sneaky Item',
      p_category_id := current_setting('test.cat_food')::uuid
    );
  exception when others then ok := sqlerrm like '%not_a_member%';
  end;
  if not ok then raise exception 'RLS FAIL: non-member rated group A'; end if;

  select count(*) into n from public.items where group_id = current_setting('test.gid_a')::uuid;
  if n <> 0 then raise exception 'RLS FAIL: non-member sees % of group A''s items', n; end if;
  select count(*) into n from public.ratings where group_id = current_setting('test.gid_a')::uuid;
  if n <> 0 then raise exception 'RLS FAIL: non-member sees % of group A''s ratings', n; end if;
  raise notice 'RLS OK: non-member (carol) cannot rate or read group A';
end $$;

-- ---------------------------------------------------------------------------
-- Member (Bob) CAN read group A's items + ratings.
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}';
do $$
declare items_n int; ratings_n int;
begin
  select count(*) into items_n   from public.items   where group_id = current_setting('test.gid_a')::uuid;
  select count(*) into ratings_n from public.ratings where group_id = current_setting('test.gid_a')::uuid;
  if items_n <> 1 or ratings_n <> 2 then
    raise exception 'RLS FAIL: member sees % items / % ratings, expected 1 / 2', items_n, ratings_n;
  end if;
  raise notice 'RLS OK: member (bob) reads 1 item and 2 ratings';
end $$;

-- ---------------------------------------------------------------------------
-- Stat trigger on DELETE: Bob deletes his own rating -> stats recompute.
-- ---------------------------------------------------------------------------
do $$
declare affected int; it public.items;
begin
  delete from public.ratings
  where user_id = '77777777-7777-7777-7777-777777777777'
    and item_id = (select id from public.items
                   where group_id = current_setting('test.gid_a')::uuid
                     and normalized_name = 'pizza palace');
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'RLS FAIL: member could not delete own rating (% rows)', affected; end if;
  select * into it from public.items
  where group_id = current_setting('test.gid_a')::uuid and normalized_name = 'pizza palace';
  if it.rating_count <> 1 or it.total_score <> 4 or it.average_score <> 4.0
     or it.highest_score <> 4 or it.lowest_score <> 4 then
    raise exception 'TRIGGER FAIL: stats wrong after delete (cnt % avg %)', it.rating_count, it.average_score;
  end if;
  raise notice 'TRIGGER OK: after delete, stats cnt=1 avg=4.0';
end $$;

-- A member cannot delete ANOTHER member's rating (RLS: own only).
do $$
declare affected int;
begin
  delete from public.ratings
  where user_id = '66666666-6666-6666-6666-666666666666'
    and group_id = current_setting('test.gid_a')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'RLS FAIL: member deleted another user''s rating (% rows)', affected; end if;
  raise notice 'RLS OK: member cannot delete another user''s rating';
end $$;

-- Delete the last rating (as its owner, Alice) -> stats reset to empty.
set local request.jwt.claims = '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';
do $$
declare it public.items;
begin
  delete from public.ratings
  where user_id = '66666666-6666-6666-6666-666666666666'
    and item_id = (select id from public.items
                   where group_id = current_setting('test.gid_a')::uuid
                     and normalized_name = 'pizza palace');
  select * into it from public.items
  where group_id = current_setting('test.gid_a')::uuid and normalized_name = 'pizza palace';
  if it.rating_count <> 0 or it.total_score <> 0 or it.average_score is not null
     or it.highest_score is not null or it.lowest_score is not null then
    raise exception 'TRIGGER FAIL: stats not reset when last rating removed (cnt % avg %)', it.rating_count, it.average_score;
  end if;
  raise notice 'TRIGGER OK: last rating removed -> cnt=0, avg/high/low NULL, item kept';
end $$;

-- ---------------------------------------------------------------------------
-- Cross-group: same name in group B is a DISTINCT item; A's members can't see it.
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"88888888-8888-8888-8888-888888888888","role":"authenticated"}';
do $$ begin
  perform public.rate_item(
    p_group_id    := current_setting('test.gid_b')::uuid,
    p_score       := 10,
    p_item_name   := 'Pizza Palace',
    p_category_id := current_setting('test.cat_food')::uuid
  );
end $$;

reset role;
do $$
declare n int;
begin
  select count(*) into n from public.items where normalized_name = 'pizza palace';
  if n <> 2 then raise exception 'CROSS-GROUP FAIL: expected 2 items named pizza palace across groups, got %', n; end if;
  raise notice 'CROSS-GROUP OK: same name is a distinct item per group (2 rows)';
end $$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from public.items where group_id = current_setting('test.gid_b')::uuid;
  if n <> 0 then raise exception 'CROSS-GROUP FAIL: group A member can see group B items (%)', n; end if;
  raise notice 'CROSS-GROUP OK: group A member cannot see group B items';
end $$;

rollback; -- leave the DB clean
