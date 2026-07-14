-- Run with: psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" -f supabase/tests/profiles_rls.sql
-- Seeds two auth users, lets handle_new_user create their profiles (so the
-- signup trigger is exercised too), then asserts RLS via JWT-claim impersonation.
-- The `postgres` role does not own auth.users locally, so the trigger cannot be
-- disabled — deterministic usernames come from user_name in the metadata instead.
begin;

-- Two fake auth users; the on_auth_user_created trigger derives usernames
-- 'alice' and 'bob' from raw_user_meta_data->>'user_name'.
insert into auth.users (id, aud, role, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'a@test.dev', '{"user_name":"alice"}'::jsonb),
       ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'b@test.dev', '{"user_name":"bob"}'::jsonb)
on conflict (id) do nothing;

-- Trigger sanity: both profile rows must exist before the RLS assertions.
do $$
begin
  if (select count(*) from public.profiles where username in ('alice','bob')) <> 2 then
    raise exception 'TRIGGER FAIL: handle_new_user did not create both profiles';
  end if;
  raise notice 'TRIGGER OK: handle_new_user created alice and bob';
end $$;

-- Impersonate Bob and try to edit Alice's profile.
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

do $$
declare affected int;
begin
  update public.profiles set bio = 'hacked' where id = '11111111-1111-1111-1111-111111111111';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'RLS FAIL: Bob edited Alice''s profile (% rows)', affected;
  end if;
  raise notice 'RLS OK: Bob cannot edit Alice (0 rows affected)';
end $$;

-- Bob CAN edit his own.
do $$
declare affected int;
begin
  update public.profiles set bio = 'mine' where id = '22222222-2222-2222-2222-222222222222';
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'RLS FAIL: Bob could not edit his own profile (% rows)', affected;
  end if;
  raise notice 'RLS OK: Bob edited his own profile';
end $$;

rollback; -- leave the DB clean
