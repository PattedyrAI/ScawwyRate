-- profiles foundation: one row per auth user, created from Discord OAuth metadata.

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  discord_id   text,
  username     text unique not null,
  display_name text,
  avatar_url   text,
  bio          text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- This stack's default privileges give roles no DML on new tables; grant the
-- base privileges explicitly (RLS below then scopes the rows). Anonymous
-- clients get nothing — every profile read requires a signed-in user.
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

-- Any authenticated user can read profiles (needed to render usernames/avatars).
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- A user may insert/update only their own row.
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- keep updated_at fresh
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- create a profile row when a Discord user signs up.
-- Discord OAuth populates raw_user_meta_data with keys such as:
--   full_name / name (display), avatar_url, provider_id (Discord snowflake), email.
-- username must be unique + not null, so derive a stable, collision-resistant value.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := coalesce(
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'full_name',
    split_part(coalesce(new.email, 'user'), '@', 1)
  );
  base_username := lower(regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g'));
  if base_username = '' then base_username := 'user'; end if;

  final_username := base_username;
  while exists (select 1 from public.profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, discord_id, username, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'provider_id',
    final_username,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
