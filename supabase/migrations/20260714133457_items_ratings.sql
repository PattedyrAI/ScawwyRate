-- items + ratings: group-scoped items (with server-side dedup) rated 1-10.
--
-- Design (see plan header): all item/rating writes go ONLY through the
-- SECURITY DEFINER rate_item() RPC (find-or-create item by normalized name +
-- upsert the caller's rating, atomically). There are deliberately NO INSERT
-- policies on items or ratings; the one non-RPC write path is a DELETE policy
-- letting a user remove their OWN rating. Item aggregate stats are kept by the
-- update_item_rating_stats() trigger, which is SECURITY DEFINER so it can write
-- items no matter who wrote the rating. RLS is member-scoped via the Phase 1
-- is_group_member() helper.

-- ---------------------------------------------------------------------------
-- Categories (fixed reference set — seeded here, not in seed.sql, so it ships
-- to every environment via migrations).
-- ---------------------------------------------------------------------------

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  icon       text not null,               -- Ionicons glyph name
  sort_order int not null default 0
);

insert into public.categories (slug, name, icon, sort_order) values
  ('food',   'Food',   'restaurant',           1),
  ('movies', 'Movies', 'film',                 2),
  ('games',  'Games',  'game-controller',      3),
  ('music',  'Music',  'musical-notes',        4),
  ('places', 'Places', 'location',             5),
  ('other',  'Other',  'ellipsis-horizontal',  6)
on conflict (slug) do update
  set name = excluded.name,
      icon = excluded.icon,
      sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Normalization: server-side so every client agrees on dedup.
-- lower + trim ends + collapse internal whitespace runs to a single space.
-- ---------------------------------------------------------------------------

create or replace function public.normalize_name(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(btrim(raw), '\s+', ' ', 'g'));
$$;

-- ---------------------------------------------------------------------------
-- Items
-- ---------------------------------------------------------------------------

create table public.items (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid not null references public.groups (id) on delete cascade,
  name            text not null check (char_length(btrim(name)) between 1 and 120),
  normalized_name text not null,
  category_id     uuid not null references public.categories (id),
  image_url       text,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  -- denormalized aggregate stats, maintained by update_item_rating_stats()
  rating_count    int not null default 0,
  total_score     int not null default 0,
  average_score   numeric(3,1),           -- null when there are no ratings
  highest_score   int,
  lowest_score    int,
  unique (group_id, normalized_name)      -- dedup: one item per normalized name per group
);

create index items_group_id_idx on public.items (group_id);
create index items_category_id_idx on public.items (category_id);

-- Keep normalized_name in lockstep with name (only recomputes when name is set).
create or replace function public.set_item_normalized_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.normalized_name := public.normalize_name(new.name);
  return new;
end;
$$;

create trigger items_set_normalized_name
  before insert or update of name on public.items
  for each row execute function public.set_item_normalized_name();

-- ---------------------------------------------------------------------------
-- Ratings (one per user per item; group_id denormalized for member-scoped RLS
-- without a join). review_count / comment_count exist for schema-completeness;
-- their maintaining triggers arrive in Phase 3.
-- ---------------------------------------------------------------------------

create table public.ratings (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.items (id) on delete cascade,
  group_id      uuid not null references public.groups (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  score         int not null check (score between 1 and 10),
  comment       text,
  photo_url     text,
  visited_at    date,
  review_count  int not null default 1,
  comment_count int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, item_id)
);

create index ratings_item_id_idx on public.ratings (item_id);
create index ratings_group_created_idx on public.ratings (group_id, created_at desc);
create index ratings_user_id_idx on public.ratings (user_id);

-- Reuse the Phase 0/1 updated_at trigger function.
create trigger ratings_set_updated_at
  before update on public.ratings
  for each row execute function public.handle_updated_at();

-- Recompute the parent item's denormalized stats after any rating change.
-- SECURITY DEFINER so the items UPDATE runs as the table owner regardless of
-- which role wrote/deleted the rating (item_id never changes in our flow, so
-- coalesce(NEW, OLD) is the single affected item).
create or replace function public.update_item_rating_stats()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  affected_item uuid := coalesce(new.item_id, old.item_id);
begin
  update public.items i set
    rating_count  = agg.cnt,
    total_score   = agg.total,
    average_score = agg.avg_score,
    highest_score = agg.hi,
    lowest_score  = agg.lo
  from (
    select
      count(*)                       as cnt,
      coalesce(sum(score), 0)::int   as total,
      round(avg(score), 1)           as avg_score,   -- null when cnt = 0
      max(score)                     as hi,
      min(score)                     as lo
    from public.ratings
    where item_id = affected_item
  ) agg
  where i.id = affected_item;
  return null; -- AFTER trigger: return value ignored
end;
$$;

create trigger ratings_update_item_stats
  after insert or update or delete on public.ratings
  for each row execute function public.update_item_rating_stats();

-- ---------------------------------------------------------------------------
-- rate_item: the only write path for items + ratings.
-- Validates membership + score BEFORE touching any table (so a bad score never
-- creates an orphan item), resolves the item (supplied id OR find-or-create by
-- normalized name), then upserts the caller's rating. Required args first;
-- everything a "rate an existing item" call omits has a default.
-- ---------------------------------------------------------------------------

create or replace function public.rate_item(
  p_group_id    uuid,
  p_score       int,
  p_item_id     uuid default null,
  p_item_name   text default null,
  p_category_id uuid default null,
  p_comment     text default null,
  p_photo_url   text default null,
  p_visited_at  date default null
)
returns public.ratings
language plpgsql
volatile
security definer set search_path = ''
as $$
declare
  uid      uuid := (select auth.uid());
  v_item   public.items;
  v_rating public.ratings;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_group_member(p_group_id, uid) then
    raise exception 'not_a_member';
  end if;
  if p_score is null or p_score not between 1 and 10 then
    raise exception 'invalid_score';
  end if;

  if p_item_id is not null then
    select * into v_item
    from public.items
    where id = p_item_id and group_id = p_group_id;
    if not found then
      raise exception 'item_not_found';
    end if;
  else
    if p_item_name is null or btrim(p_item_name) = '' then
      raise exception 'item_name_required';
    end if;

    select * into v_item
    from public.items
    where group_id = p_group_id
      and normalized_name = public.normalize_name(p_item_name);

    if not found then
      -- Only the create path needs a category; re-rating an existing item
      -- by name must not require one.
      if p_category_id is null then
        raise exception 'category_required';
      end if;

      insert into public.items (group_id, name, category_id, created_by)
      values (p_group_id, btrim(p_item_name), p_category_id, uid)
      on conflict (group_id, normalized_name) do nothing
      returning * into v_item;

      -- Lost an insert race: fetch the row the other transaction created.
      if v_item.id is null then
        select * into v_item
        from public.items
        where group_id = p_group_id
          and normalized_name = public.normalize_name(p_item_name);
      end if;
    end if;
  end if;

  insert into public.ratings (item_id, group_id, user_id, score, comment, photo_url, visited_at)
  values (v_item.id, p_group_id, uid, p_score, p_comment, p_photo_url, p_visited_at)
  on conflict (user_id, item_id) do update
    set score      = excluded.score,
        comment    = excluded.comment,
        photo_url  = excluded.photo_url,
        visited_at = excluded.visited_at
  returning * into v_rating;

  return v_rating;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function EXECUTE privileges (Postgres grants to PUBLIC by default).
-- normalize_name + the two trigger functions are internal-only. rate_item is
-- the authenticated write path.
-- ---------------------------------------------------------------------------

revoke execute on function public.normalize_name(text) from public, anon, authenticated;
revoke execute on function public.set_item_normalized_name() from public, anon, authenticated;
revoke execute on function public.update_item_rating_stats() from public, anon, authenticated;
revoke execute on function public.rate_item(uuid, int, uuid, text, uuid, text, text, date) from public, anon;

grant execute on function public.normalize_name(text) to service_role;
grant execute on function public.rate_item(uuid, int, uuid, text, uuid, text, text, date) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Table privileges (this stack grants none by default). Reads are RLS-scoped;
-- writes to items/ratings are RPC-only (no INSERT/UPDATE grant for
-- authenticated), except a user deleting their OWN rating.
-- ---------------------------------------------------------------------------

grant select on public.categories to authenticated;
grant select on public.items to authenticated;
grant select, delete on public.ratings to authenticated;

grant select, insert, update, delete on public.categories to service_role;
grant select, insert, update, delete on public.items to service_role;
grant select, insert, update, delete on public.ratings to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.ratings enable row level security;

-- categories: global reference data, readable by any signed-in user.
create policy "categories_select_authenticated"
  on public.categories for select
  to authenticated
  using (true);

-- items: readable by members of the item's group.
create policy "items_select_member"
  on public.items for select
  to authenticated
  using (public.is_group_member(group_id, (select auth.uid())));

-- ratings: readable by members of the rating's group.
create policy "ratings_select_member"
  on public.ratings for select
  to authenticated
  using (public.is_group_member(group_id, (select auth.uid())));

-- ratings: a user may delete their OWN rating (the stat trigger then recomputes
-- item stats). This is the only non-RPC write path.
create policy "ratings_delete_own"
  on public.ratings for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage: rating photos. Public bucket (so useImageUpload's getPublicUrl
-- serves images) with own-folder-scoped write policies. See plan Design
-- decision 7 for the reads-are-public-by-URL tradeoff.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('rating-photos', 'rating-photos', true)
on conflict (id) do nothing;

create policy "rating_photos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'rating-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "rating_photos_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'rating-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "rating_photos_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'rating-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
