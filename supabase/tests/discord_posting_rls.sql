-- Run with: psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" -f supabase/tests/discord_posting_rls.sql
-- Phase 4: owner-scoped webhooks + pg_net posting trigger (asserted at the queue).
begin;

insert into auth.users (id, aud, role, email, raw_user_meta_data)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'authenticated', 'authenticated', 'd-a@test.dev', '{"user_name":"disc_owner"}'::jsonb),
       ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'authenticated', 'authenticated', 'd-b@test.dev', '{"user_name":"disc_member"}'::jsonb)
on conflict (id) do nothing;

set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}';
select set_config('test.gid', (public.create_group('Webhook Crew')).id::text, true);
select set_config('test.code', (select invite_code from public.groups where id = current_setting('test.gid')::uuid), true);

set local request.jwt.claims = '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}';
select public.join_group(current_setting('test.code'));

-- 1) Owner sets the webhook; member can neither see nor set one.
set local request.jwt.claims = '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}';
insert into public.group_webhooks (group_id, url)
values (current_setting('test.gid')::uuid, 'https://discord.com/api/webhooks/1234567890/test-token');
do $$
begin
  raise notice 'WEBHOOK OK: owner configured the webhook';
end $$;

set local request.jwt.claims = '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}';
do $$
declare n int; ok boolean := false;
begin
  select count(*) into n from public.group_webhooks;
  if n <> 0 then raise exception 'WEBHOOK FAIL: member reads % webhook rows', n; end if;
  begin
    update public.group_webhooks set url = 'https://discord.com/api/webhooks/9/evil'
    where group_id = current_setting('test.gid')::uuid;
    if found then ok := false; else ok := true; end if;
  exception when others then
    ok := true;
  end;
  if not ok then raise exception 'WEBHOOK FAIL: member modified the webhook'; end if;
  raise notice 'WEBHOOK OK: member cannot see or modify the webhook';
end $$;

-- 2) New rating queues exactly one pg_net request with the right URL + embed fields.
select set_config('test.q_before', (select count(*)::text from net.http_request_queue), true);
set local request.jwt.claims = '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}';
select set_config('test.rid', (public.rate_item(
  p_group_id := current_setting('test.gid')::uuid,
  p_score := 9,
  p_item_name := 'Webhook Waffles',
  p_category_id := (select id from public.categories where slug = 'food'),
  p_comment := 'Crispy.'
)).id::text, true);
reset role;
do $$
declare q int; b text;
begin
  select count(*) - current_setting('test.q_before')::int into q from net.http_request_queue;
  if q <> 1 then raise exception 'POST FAIL: % queued requests after insert (want 1)', q; end if;
  select convert_from(body, 'utf8') into b from net.http_request_queue order by id desc limit 1;
  if b not like '%Webhook Waffles%' or b not like '%9/10%' or b not like '%disc_member%' or b not like '%5763719%' then
    raise exception 'POST FAIL: embed missing fields: %', b;
  end if;
  raise notice 'POST OK: insert queued 1 request with item, score band color, and rater';
end $$;

-- 3) Score-change re-rate queues one more; no-op update queues none.
set local role authenticated;
set local request.jwt.claims = '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}';
select public.rate_item(
  p_group_id := current_setting('test.gid')::uuid,
  p_score := 3,
  p_item_name := 'Webhook Waffles'
);
reset role;
do $$
declare q int; b text;
begin
  select count(*) - current_setting('test.q_before')::int into q from net.http_request_queue;
  if q <> 2 then raise exception 'POST FAIL: % queued after score change (want 2)', q; end if;
  select convert_from(body, 'utf8') into b from net.http_request_queue order by id desc limit 1;
  if b not like '%updated their rating%' or b not like '%3/10%' or b not like '%15548997%' then
    raise exception 'POST FAIL: update embed wrong: %', b;
  end if;
  raise notice 'POST OK: score change queued an update embed (red band)';
end $$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}';
select public.rate_item(
  p_group_id := current_setting('test.gid')::uuid,
  p_score := 3,
  p_item_name := 'Webhook Waffles'
);
reset role;
do $$
declare q int;
begin
  select count(*) - current_setting('test.q_before')::int into q from net.http_request_queue;
  if q <> 2 then raise exception 'POST FAIL: no-op re-rate queued a request (total %)', q; end if;
  raise notice 'POST OK: no-op re-rate queued nothing';
end $$;

-- 4) Group without a webhook queues nothing.
set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}';
select set_config('test.gid2', (public.create_group('Silent Crew')).id::text, true);
select public.rate_item(
  p_group_id := current_setting('test.gid2')::uuid,
  p_score := 7,
  p_item_name := 'Quiet Curry',
  p_category_id := (select id from public.categories where slug = 'food')
);
reset role;
do $$
declare q int;
begin
  select count(*) - current_setting('test.q_before')::int into q from net.http_request_queue;
  if q <> 2 then raise exception 'POST FAIL: webhook-less group queued a request (total %)', q; end if;
  raise notice 'POST OK: group without webhook queues nothing';
end $$;

rollback; -- leave the DB (and the queue) clean
