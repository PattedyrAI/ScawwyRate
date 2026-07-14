-- Run with: psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" -f supabase/tests/stats_comments_rls.sql
-- Phase 3: re-review history snapshot, comment counts, comment RLS, leaderboard.
-- Users seeded through handle_new_user (postgres cannot disable auth triggers).
begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data)
values ('99999999-9999-9999-9999-999999999999', 'authenticated', 'authenticated', 's-a@test.dev', '{"user_name":"stats_ann"}'::jsonb),
       ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 's-b@test.dev', '{"user_name":"stats_ben"}'::jsonb),
       ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 's-c@test.dev', '{"user_name":"stats_cat"}'::jsonb)
on conflict (id) do nothing;

do $$
begin
  if (select count(*) from public.profiles where username in ('stats_ann','stats_ben','stats_cat')) <> 3 then
    raise exception 'TRIGGER FAIL: handle_new_user did not create all three profiles';
  end if;
  raise notice 'TRIGGER OK: three profiles created';
end $$;

-- Ann creates a group; Ben joins; Cat stays outside.
set local role authenticated;
set local request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}';
select set_config('test.gid', (public.create_group('Stats Crew')).id::text, true);
select set_config('test.code', (select invite_code from public.groups where id = current_setting('test.gid')::uuid), true);

set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
select public.join_group(current_setting('test.code'));

-- Ann rates a new item (8), Ben rates the same item (6).
set local request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}';
select set_config('test.rid_ann', (public.rate_item(
  p_group_id := current_setting('test.gid')::uuid,
  p_score := 8,
  p_item_name := 'Taco Tower',
  p_category_id := (select id from public.categories where slug = 'food')
)).id::text, true);

set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
select public.rate_item(
  p_group_id := current_setting('test.gid')::uuid,
  p_score := 6,
  p_item_name := 'taco  TOWER'
);

-- 1) Re-review history: Ann re-rates 8 -> 9 → one history row w/ old score, review_count 2.
set local request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}';
select public.rate_item(
  p_group_id := current_setting('test.gid')::uuid,
  p_score := 9,
  p_item_name := 'Taco Tower'
);
do $$
declare hist_count int; prev int; rc int;
begin
  select count(*), min(previous_score) into hist_count, prev
  from public.rating_history where rating_id = current_setting('test.rid_ann')::uuid;
  select review_count into rc from public.ratings where id = current_setting('test.rid_ann')::uuid;
  if hist_count <> 1 or prev <> 8 or rc <> 2 then
    raise exception 'HISTORY FAIL: count=% prev=% review_count=%', hist_count, prev, rc;
  end if;
  raise notice 'HISTORY OK: snapshot row (prev 8) + review_count 2';
end $$;

-- 1b) No-op re-rate (same score, no comment/photo change) → NO new history row.
select public.rate_item(
  p_group_id := current_setting('test.gid')::uuid,
  p_score := 9,
  p_item_name := 'Taco Tower'
);
do $$
declare hist_count int;
begin
  select count(*) into hist_count from public.rating_history where rating_id = current_setting('test.rid_ann')::uuid;
  if hist_count <> 1 then
    raise exception 'HISTORY FAIL: no-op update wrote a history row (count=%)', hist_count;
  end if;
  raise notice 'HISTORY OK: no-op re-rate wrote no history';
end $$;

-- 2) Comments: Ben comments on Ann's rating → count 1; again → 2.
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
insert into public.comments (rating_id, user_id, body)
values (current_setting('test.rid_ann')::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bold choice.');
select set_config('test.cid_ben', (select id::text from public.comments where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' limit 1), true);
insert into public.comments (rating_id, user_id, body)
values (current_setting('test.rid_ann')::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Second thoughts.');
do $$
declare cc int;
begin
  select comment_count into cc from public.ratings where id = current_setting('test.rid_ann')::uuid;
  if cc <> 2 then raise exception 'COMMENTS FAIL: comment_count=% after 2 inserts', cc; end if;
  raise notice 'COMMENTS OK: comment_count 2 after two inserts';
end $$;

-- 2b) Ann cannot delete Ben's comment (0 rows); Ben can delete his own → count 1.
set local request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}';
do $$
declare affected int;
begin
  delete from public.comments where id = current_setting('test.cid_ben')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'COMMENTS FAIL: Ann deleted Ben''s comment'; end if;
  raise notice 'COMMENTS OK: cannot delete another member''s comment';
end $$;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
do $$
declare affected int; cc int;
begin
  delete from public.comments where id = current_setting('test.cid_ben')::uuid;
  get diagnostics affected = row_count;
  select comment_count into cc from public.ratings where id = current_setting('test.rid_ann')::uuid;
  if affected <> 1 or cc <> 1 then raise exception 'COMMENTS FAIL: own-delete affected=% count=%', affected, cc; end if;
  raise notice 'COMMENTS OK: own comment deleted, count back to 1';
end $$;

-- 2c) Non-member Cat: cannot insert a comment (RLS) and reads nothing.
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';
do $$
declare ok boolean := false; n int;
begin
  begin
    insert into public.comments (rating_id, user_id, body)
    values (current_setting('test.rid_ann')::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'let me in');
  exception when others then
    ok := true;
  end;
  if not ok then raise exception 'COMMENTS FAIL: non-member inserted a comment'; end if;
  select count(*) into n from public.comments;
  if n <> 0 then raise exception 'COMMENTS FAIL: non-member reads % comments', n; end if;
  select count(*) into n from public.rating_history;
  if n <> 0 then raise exception 'HISTORY FAIL: non-member reads % history rows', n; end if;
  raise notice 'RLS OK: non-member cannot comment, sees no comments or history';
end $$;

-- 3) Leaderboard: member sees Ann(1 rating, avg 9) + Ben(1, avg 6); non-member sees 0 rows.
set local request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}';
do $$
declare n int; ann_avg numeric; ben_avg numeric;
begin
  select count(*) into n from public.group_leaderboard(current_setting('test.gid')::uuid);
  select average_score into ann_avg from public.group_leaderboard(current_setting('test.gid')::uuid) where username = 'stats_ann';
  select average_score into ben_avg from public.group_leaderboard(current_setting('test.gid')::uuid) where username = 'stats_ben';
  if n <> 2 or ann_avg <> 9.0 or ben_avg <> 6.0 then
    raise exception 'LEADERBOARD FAIL: n=% ann=% ben=%', n, ann_avg, ben_avg;
  end if;
  raise notice 'LEADERBOARD OK: 2 members, ann 9.0, ben 6.0';
end $$;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from public.group_leaderboard(current_setting('test.gid')::uuid);
  if n <> 0 then raise exception 'LEADERBOARD FAIL: non-member sees % rows', n; end if;
  raise notice 'LEADERBOARD OK: non-member sees nothing';
end $$;

rollback; -- leave the DB clean
