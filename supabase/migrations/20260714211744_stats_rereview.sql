-- Phase 3: re-review history, comments, and the group leaderboard.

-- rating_history: written only by the snapshot trigger; read by group members.
create table public.rating_history (
  id                 uuid primary key default gen_random_uuid(),
  rating_id          uuid not null references public.ratings (id) on delete cascade,
  previous_score     int not null,
  previous_comment   text,
  previous_photo_url text,
  changed_at         timestamptz not null default now()
);
create index rating_history_rating_id_idx on public.rating_history (rating_id);

-- comments on ratings.
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  rating_id  uuid not null references public.ratings (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index comments_rating_id_idx on public.comments (rating_id);

alter table public.rating_history enable row level security;
alter table public.comments enable row level security;

-- Explicit base grants (stack default = no DML). rating_history: read-only for
-- clients (the trigger writes as the function owner). comments: direct-insert
-- write path — a policy fully expresses the rule, no RPC needed.
grant select on public.rating_history to authenticated;
grant select, insert, delete on public.comments to authenticated;
grant select, insert, update, delete on public.rating_history to service_role;
grant select, insert, update, delete on public.comments to service_role;

-- Member-scoped reads via the rating's group.
create policy "rating_history_select_member"
  on public.rating_history for select to authenticated
  using (exists (
    select 1 from public.ratings r
    where r.id = rating_id and public.is_group_member(r.group_id, (select auth.uid()))
  ));

create policy "comments_select_member"
  on public.comments for select to authenticated
  using (exists (
    select 1 from public.ratings r
    where r.id = rating_id and public.is_group_member(r.group_id, (select auth.uid()))
  ));

create policy "comments_insert_own_member"
  on public.comments for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.ratings r
      where r.id = rating_id and public.is_group_member(r.group_id, (select auth.uid()))
    )
  );

create policy "comments_delete_own"
  on public.comments for delete to authenticated
  using (user_id = (select auth.uid()));

-- Snapshot the old rating on real changes; bump review_count.
create or replace function public.snapshot_rating_before_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.score is distinct from old.score
     or new.comment is distinct from old.comment
     or new.photo_url is distinct from old.photo_url then
    insert into public.rating_history (rating_id, previous_score, previous_comment, previous_photo_url)
    values (old.id, old.score, old.comment, old.photo_url);
    new.review_count := old.review_count + 1;
  end if;
  return new;
end;
$$;
revoke execute on function public.snapshot_rating_before_update() from public, anon, authenticated;

create trigger ratings_snapshot_before_update
  before update on public.ratings
  for each row execute function public.snapshot_rating_before_update();

-- Maintain ratings.comment_count.
create or replace function public.update_rating_comment_count()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.ratings set comment_count = comment_count + 1 where id = new.rating_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.ratings set comment_count = greatest(comment_count - 1, 0) where id = old.rating_id;
    return old;
  end if;
  return null;
end;
$$;
revoke execute on function public.update_rating_comment_count() from public, anon, authenticated;

create trigger comments_maintain_count
  after insert or delete on public.comments
  for each row execute function public.update_rating_comment_count();

-- Leaderboard: per-member rating count + average in a group.
-- SECURITY INVOKER: RLS on ratings scopes rows; non-members simply see nothing.
create or replace function public.group_leaderboard(gid uuid)
returns table (user_id uuid, username text, avatar_url text, rating_count bigint, average_score numeric)
language sql
stable
set search_path = ''
as $$
  select r.user_id, p.username, p.avatar_url,
         count(*)::bigint as rating_count,
         round(avg(r.score)::numeric, 1) as average_score
  from public.ratings r
  join public.profiles p on p.id = r.user_id
  where r.group_id = gid
  group by r.user_id, p.username, p.avatar_url
  order by rating_count desc, average_score desc;
$$;
revoke execute on function public.group_leaderboard(uuid) from public, anon;
grant execute on function public.group_leaderboard(uuid) to authenticated;
