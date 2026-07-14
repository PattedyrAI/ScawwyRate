# ScawwyRate Phase 2 — Items & Ratings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the Phase 1 groups foundation, let a group accumulate rated items. Add an item (with server-side deduplication), rate it 1–10 with an optional photo and comment (one rating per user per item; a second rating updates, not duplicates), browse the group feed of recent ratings, and open an item detail screen showing every rating plus live aggregate stats. Denormalized item stats are maintained by a database trigger. **Exit criterion (from the spec):** a group can accumulate rated items with correct aggregate stats.

**Architecture:** One new migration adds `categories` (seeded fixed set), `items` (group-scoped, `normalized_name` dedup), and `ratings` (score 1–10, denormalized `group_id`, one-per-user-per-item) with member-scoped RLS built on the existing `is_group_member` `SECURITY DEFINER` helper. All item/rating writes go through a single `SECURITY DEFINER` RPC `rate_item` that atomically finds-or-creates the item by normalized name and upserts the caller's rating — the same RPC-only-writes precedent Phase 1 set for `create_group`/`join_group`. An `AFTER INSERT/UPDATE/DELETE` trigger `update_item_rating_stats` (also `SECURITY DEFINER`, so it can maintain `items` regardless of who wrote the rating) keeps `rating_count`/`total_score`/`average_score`/`highest_score`/`lowest_score` correct. A `rating-photos` storage bucket holds rating photos. The app side follows the Phase 1 pattern: `items.service.ts` → React Query hooks → Expo Router screens (group feed replaces the Phase 2 placeholder; add-rating modal; item detail).

**Tech Stack:** Same as Phase 1 — Expo SDK 54 / React Native 0.81 / React 19 / TypeScript 5.9; Expo Router 6; `@supabase/supabase-js` 2.97 against the **local** Supabase stack (CLI); TanStack React Query 5; Zustand 5. New for Phase 2: `expo-image-picker` (already a dependency, already configured in `app.json` with `photosPermission`) feeding the existing `useImageUpload` hook.

**Design decisions (refinements of the spec, with rationale):**

1. **RPC-only writes for items + ratings, via a single `rate_item` RPC.** The spec's "pick-or-create item (with dedup) → rate" flow (screen 5) is one atomic user action, and Phase 1 established the RPC-only-writes precedent. `rate_item(p_group_id, p_score, p_item_id?, p_item_name?, p_category_id?, p_comment?, p_photo_url?, p_visited_at?)` is `SECURITY DEFINER`: it validates membership, validates the score **before** touching any table (so a rejected score never creates an orphan item), resolves the item (either a caller-supplied `p_item_id` validated to belong to the group, or find-or-create by `normalize_name(p_item_name)`), then upserts the rating `on conflict (user_id, item_id) do update`. There are deliberately **no INSERT policies** on `items` or `ratings`, and no INSERT/UPDATE grant for `authenticated` on either — creation happens only through the RPC (which runs as the table owner and so bypasses RLS, exactly as `create_group` does). Rationale: (a) `normalized_name` must be computed server-side so all clients agree on dedup; (b) the item find-or-create and the rating upsert must be one transaction; (c) a single code path is what the SQL tests exercise.
2. **A direct `DELETE` policy on `ratings` for the row's owner (`user_id = auth.uid()`).** This is the *only* non-RPC write path. It gives users a way to remove their own rating, and — critically — it makes the `AFTER DELETE` branch of the stat trigger reachable from an RLS-governed path so the test can prove stat correctness on delete. Because the stat trigger is `SECURITY DEFINER`, its `update items …` runs as the table owner and is **not** blocked by `items` having no `UPDATE` policy for `authenticated`. (No `UPDATE` policy on `ratings` for authenticated: re-rating goes through `rate_item`'s upsert.)
3. **Categories are seeded inside the migration, not `seed.sql`.** `seed.sql` only runs on local `supabase db reset`; it is **not** applied to the Railway deployment (Phase 5 ships schema via `supabase db push`, i.e. migrations). Categories are fixed reference data referenced by `items.category_id` FKs and must exist in every environment, so they belong in a migration. The seed is idempotent (`on conflict (slug) do update …`). `seed.sql`'s comment is updated to say categories now live in the migration. Icons are Ionicons glyph names (verified against `@expo/vector-icons`): `restaurant`, `film`, `game-controller`, `musical-notes`, `location`, `ellipsis-horizontal`.
4. **`rating_history` (re-review snapshots) and `comments` are NOT created in this phase — deferred to Phase 3, as the spec assigns them.** I considered creating the `rating_history` table + `snapshot_rating_before_update` trigger now for schema-completeness, but decided against it: no Phase 2 UI exercises re-review history, the trigger's semantics (what counts as a re-review, how `review_count` is bumped) are a Phase 3 concern with their own tests, and shipping an untested trigger is exactly the scope creep to avoid. **However**, the `ratings` table is created with its full spec column set — including `review_count` (default 1) and `comment_count` (default 0) — because those columns are stable and cheap, and defining them now means Phase 3 adds only triggers, not an `ALTER TABLE`. Phase 2 leaves both at their defaults (the `rate_item` upsert does not touch them); Phase 3 wires the snapshot trigger (owns `review_count`) and the comment-count trigger (owns `comment_count`). The `handle_updated_at` trigger (which already exists from the profiles migration) *is* attached to `ratings` now, since `updated_at` is a Phase 2-relevant column.
5. **Normalization is a server-side SQL function `normalize_name(text)`** = `lower(regexp_replace(btrim(raw), '\s+', ' ', 'g'))` (lowercase, trim ends, collapse internal whitespace runs to a single space). A `BEFORE INSERT OR UPDATE OF name` trigger on `items` sets `normalized_name` from it, so `rate_item`'s find-by-normalized-name and the stored value can never disagree. `UNIQUE (group_id, normalized_name)` enforces dedup at the database. The client does *not* re-implement normalization — the add-rating screen's dedup **suggestions** are a plain case-insensitive substring filter over the group's already-loaded items (the authoritative dedup is the RPC + unique constraint; the suggestion UI only helps users avoid obvious duplicates).
6. **One combined `src/features/items` feature (service + hooks) houses both items and ratings.** The domain is inseparable in Phase 2: `rate_item` creates an item and a rating together, the feed is ratings joined to items, and item detail is an item plus its ratings. A separate `ratings` feature would only re-import from `items`. This mirrors the single-folder `groups` feature.
7. **Storage: one `rating-photos` bucket, created via migration, `public = true`, with own-folder-scoped write policies.** `useImageUpload` calls `getPublicUrl`, which only returns a working URL for a **public** bucket; making the bucket private would force the read path onto expiring signed URLs (bad for cached feed images) and a rewrite of `useImageUpload`. So reads are public-by-URL. Writes are locked down: `INSERT`/`UPDATE`/`DELETE` policies on `storage.objects` require `bucket_id = 'rating-photos'` **and** the object's first path segment `= auth.uid()` — exactly the `${user.id}/${Date.now()}.jpg` layout `useImageUpload` produces. **Tradeoff (noted per the spec's guidance that authenticated-scoped storage is acceptable for Phase 2):** a rating photo URL is not access-controlled — a non-member who obtains the URL can view the image. Paths are unguessable (a UUID plus a millisecond timestamp), so for a private hobby app this is low risk. If group-private photos become a requirement, Phase 3+ can flip the bucket to private and mint short-lived signed URLs in the read path. Only `rating-photos` is created this phase; the spec's `item-images` and `avatars` buckets are not needed yet (`items.image_url` stays null in Phase 2; avatars come from the Discord CDN).
8. **`visited_at` column exists but has no Phase 2 UI.** The spec keeps `visited_at` as an optional field (spec §10 default: yes). The column is created (so ScawwyRate parity and Phase 3 are unblocked), but the add-rating screen sends `null` — adding a date picker would pull in a new native dependency for a field the phase doesn't require ("rate = score + photo + comment").
9. **Item images have no upload UI in Phase 2.** `items.image_url` exists (nullable) but the rate flow never sets it; item creation is name + category only. A future phase can add item-image upload without a migration.

**Spec:** `docs/superpowers/specs/2026-05-29-scawwyrate-cross-platform-rebuild-design.md` (section 5 data model, section 8 Phase 2, section 9 RLS risk). **Prior plan (structure/style + Phase 1 objects this builds on):** `docs/superpowers/plans/2026-07-14-scawwyrate-phase-1-groups.md`.

---

## Prerequisites (do before Task 1)

- [ ] **P1: Phase 1 complete and committed at HEAD.** `groups` + `group_members` + the `is_group_member` / `is_group_owner` helpers, `create_group` / `join_group` RPCs, and the member-scoped RLS all exist (branch `scawwyrate-rebuild`). Confirm:

```bash
cd /Users/pattedyr/Documents/coding_projects/everrate
git branch --show-current   # scawwyrate-rebuild
git status --porcelain      # clean (no uncommitted work)
ls supabase/migrations      # 2 files: …_profiles_foundation.sql, …_groups_membership.sql
```

- [ ] **P2: Local Supabase is running** (Docker up, stack started):

```bash
docker ps > /dev/null && npx supabase status
```
Expected: `API URL: http://127.0.0.1:54321` and keys printed. If not running: `set -a && source supabase/.env && set +a && npx supabase start`. Note: `edge_runtime` and `studio` are disabled locally (Docker file-sharing EPERM) — nothing in Phase 2 depends on them. The **storage** container must be up for the manual photo-upload smoke in Task 7 (the SQL migration/tests only insert a bucket row and never touch the storage API, so the automated gate does not need it).

- [ ] **P3 (manual exit test only): the same two Discord accounts used for the Phase 1 exit test** (or one account is enough for the core rate flow). The SQL test (Task 2) is the automated gate.

> **Environment lessons baked into this plan's SQL and commands (defects in earlier plans — do not re-introduce):**
> - Every migration includes an explicit `GRANT` block; this stack grants roles **no** DML on new tables by default (symptom of forgetting: "permission denied for table", not an empty result). Tables written only via `SECURITY DEFINER` RPCs get **no** INSERT/UPDATE grant for `authenticated`; `service_role` gets full DML.
> - Postgres grants `EXECUTE` on new functions to `PUBLIC` by default — every new function is explicitly revoked from `public, anon` (and `authenticated` where internal-only) then granted to its intended role. Every `SECURITY DEFINER` function sets `search_path = ''`.
> - SQL tests cannot disable the `auth.users` signup trigger locally — seed users **through** `handle_new_user` via `raw_user_meta_data` with fresh non-colliding UUIDs (Phase 2 uses `6666…`/`7777…`/`8888…`).
> - Run the CLI as `npx supabase <cmd>` after `set -a && source supabase/.env && set +a`. `gen types` **overwrites** `src/types/database.ts` — re-append **all** helper exports (Task 1 Step 6 lists the complete set).
> - RN-web: `Alert.alert` with button arrays silently no-ops — this phase has no destructive confirmation (rating is additive), so no two-tap confirm is needed here; if you add a "delete rating" affordance later, reuse `useTwoTapConfirm` from `group/[id]/settings.tsx`.

---

## Task 1: Migration — `categories` (seeded) + `items` + `ratings`, dedup + stat trigger, `rate_item` RPC, `rating-photos` bucket, member-scoped RLS

**Files:**
- Create: `supabase/migrations/<timestamp>_items_ratings.sql` (via `npx supabase migration new`)
- Modify: `supabase/seed.sql` (comment only — categories now seed in the migration)
- Regenerate: `src/types/database.ts`

- [ ] **Step 1: Create the migration file.**

```bash
cd /Users/pattedyr/Documents/coding_projects/everrate
set -a && source supabase/.env && set +a
npx supabase migration new items_ratings
```
Expected: prints a path like `supabase/migrations/20260714NNNNNN_items_ratings.sql`. Put the SQL below into that file.

- [ ] **Step 2: Write the migration SQL** (paste the whole block into the new file):

```sql
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
    if p_category_id is null then
      raise exception 'category_required';
    end if;

    select * into v_item
    from public.items
    where group_id = p_group_id
      and normalized_name = public.normalize_name(p_item_name);

    if not found then
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
```

- [ ] **Step 3: Update the seed comment.** Replace the entire contents of `supabase/seed.sql` with:

```sql
-- ScawwyRate seed data.
-- Empty by design. Reference data that must exist in EVERY environment (the
-- fixed category set) is seeded inside the migrations, so it ships to
-- production via `supabase db push` — seed.sql only runs on local `db reset`.
-- Profiles are created by the handle_new_user trigger on Discord signup.
```

- [ ] **Step 4: Apply the migration and verify the objects landed.**

```bash
npx supabase db reset
```
Expected: ends with `Finished supabase db reset`, listing all three migrations (`…_profiles_foundation.sql`, `…_groups_membership.sql`, `…_items_ratings.sql`) with no error.

Then verify tables, functions, triggers, the seeded categories, and the bucket:
```bash
psql "$(npx supabase status -o env | grep '^DB_URL' | cut -d= -f2- | tr -d '"')" -c "
  select relname, relrowsecurity from pg_class
  where relname in ('categories','items','ratings') order by relname;
  select proname, prosecdef from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and proname in ('normalize_name','set_item_normalized_name','update_item_rating_stats','rate_item')
  order by proname;
  select tgname from pg_trigger where tgrelid = 'public.ratings'::regclass and not tgisinternal order by tgname;
  select tgname from pg_trigger where tgrelid = 'public.items'::regclass and not tgisinternal order by tgname;
  select count(*) as category_count from public.categories;
  select id, public from storage.buckets where id = 'rating-photos';"
```
Expected:
- three tables, all `relrowsecurity = t`;
- four functions, with `prosecdef = t` for `rate_item` and `update_item_rating_stats`, `f` for `normalize_name` and `set_item_normalized_name`;
- `ratings` triggers include `ratings_set_updated_at` and `ratings_update_item_stats`;
- `items` triggers include `items_set_normalized_name`;
- `category_count = 6`;
- one `rating-photos` bucket with `public = t`.

- [ ] **Step 5: Regenerate TypeScript types.**

```bash
npx supabase gen types typescript --local > src/types/database.ts
```
`gen types` **overwrites** the file, wiping the manually-appended helper exports — re-append **all** of these at the bottom of `src/types/database.ts` (the Phase 1 three plus the three new ones):
```ts
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Group = Database['public']['Tables']['groups']['Row'];
export type GroupMember = Database['public']['Tables']['group_members']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Item = Database['public']['Tables']['items']['Row'];
export type Rating = Database['public']['Tables']['ratings']['Row'];
```
Sanity check the generation picked everything up:
```bash
grep -c "rate_item\|categories\|normalized_name" src/types/database.ts
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
git commit -m "feat(db): items + ratings schema, dedup + stat trigger, rate_item RPC, rating-photos bucket, member-scoped RLS"
```

---

## Task 2: SQL RLS + stats test — dedup, bounds, one-per-user, stat trigger, cross-group isolation

**Files:**
- Create: `supabase/tests/items_ratings_rls.sql` (runnable SQL assertions, style of `supabase/tests/groups_rls.sql`)

- [ ] **Step 1: Write the test script.** Create `supabase/tests/items_ratings_rls.sql`:

```sql
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
  raise notice 'DEDUP/TRIGGER OK: same item, stats cnt=2 avg=7.0 high=8 low=6';
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
```

- [ ] **Step 2: Run it.**

```bash
psql "$(npx supabase status -o env | grep '^DB_URL' | cut -d= -f2- | tr -d '"')" -f supabase/tests/items_ratings_rls.sql
```
Expected output includes all of these notices, in order, and **no** `FAIL`:
```
TRIGGER OK: handle_new_user created alice_i, bob_i and carol_i
RPC/TRIGGER OK: new item created, stats cnt=1 avg=8.0
DEDUP/TRIGGER OK: same item, stats cnt=2 avg=7.0 high=8 low=6
BOUNDS OK: score 11 rejected, no orphan item
UPSERT/TRIGGER OK: re-rate updated in place, stats cnt=2 avg=5.0 high=6 low=4
RLS OK: non-member (carol) cannot rate or read group A
RLS OK: member (bob) reads 1 item and 2 ratings
TRIGGER OK: after delete, stats cnt=1 avg=4.0
RLS OK: member cannot delete another user's rating
TRIGGER OK: last rating removed -> cnt=0, avg/high/low NULL, item kept
CROSS-GROUP OK: same name is a distinct item per group (2 rows)
CROSS-GROUP OK: group A member cannot see group B items
```

- [ ] **Step 3: Commit.**

```bash
git add supabase/tests/items_ratings_rls.sql
git commit -m "test(db): items/ratings — dedup, bounds, one-per-user, stat trigger, cross-group isolation"
```

---

## Task 3: Items feature layer — query keys, service, hooks

**Files:**
- Modify: `src/lib/queryKeys.ts` (add `categories`, `items`, `ratings` blocks)
- Create: `src/features/items/items.service.ts`
- Create: `src/features/items/hooks/useItems.ts`

- [ ] **Step 1: Extend `src/lib/queryKeys.ts`** (keep the existing `profiles`/`groups` blocks, add the three new ones):

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
  categories: {
    all: ['categories'] as const,
  },
  items: {
    list: (groupId: string) => ['items', 'list', groupId] as const,
    detail: (itemId: string) => ['items', 'detail', itemId] as const,
  },
  ratings: {
    feed: (groupId: string) => ['ratings', 'feed', groupId] as const,
    forItem: (itemId: string) => ['ratings', 'item', itemId] as const,
    mine: (itemId: string, userId: string) => ['ratings', 'mine', itemId, userId] as const,
  },
} as const;
```

- [ ] **Step 2: Create `src/features/items/items.service.ts`** (mirrors `groups.service.ts` — plain async functions over the supabase client; the write path is the `rate_item` RPC):

```ts
import { supabase } from '@/lib/supabase';
import type { Category, Item, Profile, Rating } from '@/types/database';

export type ItemWithCategory = Item & {
  categories: Pick<Category, 'slug' | 'name' | 'icon'> | null;
};

export type RatingWithAuthor = Rating & {
  profiles: Pick<Profile, 'username' | 'display_name' | 'avatar_url'> | null;
};

export type RatingFeedRow = RatingWithAuthor & {
  items:
    | (Pick<Item, 'id' | 'name' | 'category_id'> & {
        categories: Pick<Category, 'slug' | 'name' | 'icon'> | null;
      })
    | null;
};

export interface RateItemInput {
  groupId: string;
  /** Existing item to rate; when null, the item is found-or-created by name. */
  itemId?: string | null;
  itemName?: string;
  categoryId?: string;
  score: number;
  comment?: string | null;
  photoUrl?: string | null;
  visitedAt?: string | null;
}

/** The fixed category set (seeded in the migration). */
export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

/** All items in a group (RLS scopes to members). Used for lists + dedup hints. */
export async function listGroupItems(groupId: string): Promise<ItemWithCategory[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*, categories(slug, name, icon)')
    .eq('group_id', groupId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getItem(itemId: string): Promise<ItemWithCategory | null> {
  const { data, error } = await supabase
    .from('items')
    .select('*, categories(slug, name, icon)')
    .eq('id', itemId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // not found (or not a member)
    throw error;
  }
  return data;
}

/** Recent ratings in a group, newest first — the group feed. */
export async function getGroupFeed(groupId: string): Promise<RatingFeedRow[]> {
  const { data, error } = await supabase
    .from('ratings')
    .select(
      '*, profiles(username, display_name, avatar_url), items(id, name, category_id, categories(slug, name, icon))',
    )
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

/** Every rating on a single item, newest first. */
export async function listItemRatings(itemId: string): Promise<RatingWithAuthor[]> {
  const { data, error } = await supabase
    .from('ratings')
    .select('*, profiles(username, display_name, avatar_url)')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** The caller's own rating of an item, if any (to prefill the re-rate form). */
export async function getMyRatingForItem(itemId: string, userId: string): Promise<Rating | null> {
  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('item_id', itemId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** SECURITY DEFINER RPC: find-or-create the item (server-side dedup) + upsert the rating. */
export async function rateItem(input: RateItemInput): Promise<Rating> {
  const { data, error } = await supabase.rpc('rate_item', {
    p_group_id: input.groupId,
    p_score: input.score,
    p_item_id: input.itemId ?? null,
    p_item_name: input.itemName ?? null,
    p_category_id: input.categoryId ?? null,
    p_comment: input.comment ?? null,
    p_photo_url: input.photoUrl ?? null,
    p_visited_at: input.visitedAt ?? null,
  });
  if (error) throw error;
  return data;
}
```

> **Verify-at-runtime note (same class as Phase 1's `group_members(count)`):** the nested embeds in `getGroupFeed` (`items(… categories(…))`) and the `getItem`/`listGroupItems` category embeds rely on supabase-js typed relationship inference. If `npx tsc` errors on any of those returns, append `.overrideTypes<RatingFeedRow[]>()` (resp. `ItemWithCategory[]`, `RatingWithAuthor[]`) after the final builder call, or `.returns<…>()` on older supabase-js. If `rateItem`'s `return data;` errors because the generated `rate_item` `Returns` composite differs from `Rating`, cast `return data as Rating;` (Phase 1 hit the same with `create_group`).

- [ ] **Step 3: Create `src/features/items/hooks/useItems.ts`** (mirrors `features/groups/hooks/useGroups.ts`):

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import * as itemsService from '../items.service';
import type { RateItemInput } from '../items.service';

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: itemsService.listCategories,
    staleTime: Infinity, // fixed reference data
  });
}

export function useGroupItems(groupId: string) {
  return useQuery({
    queryKey: queryKeys.items.list(groupId),
    queryFn: () => itemsService.listGroupItems(groupId),
    enabled: !!groupId,
  });
}

export function useItem(itemId: string) {
  return useQuery({
    queryKey: queryKeys.items.detail(itemId),
    queryFn: () => itemsService.getItem(itemId),
    enabled: !!itemId,
  });
}

export function useGroupFeed(groupId: string) {
  return useQuery({
    queryKey: queryKeys.ratings.feed(groupId),
    queryFn: () => itemsService.getGroupFeed(groupId),
    enabled: !!groupId,
  });
}

export function useItemRatings(itemId: string) {
  return useQuery({
    queryKey: queryKeys.ratings.forItem(itemId),
    queryFn: () => itemsService.listItemRatings(itemId),
    enabled: !!itemId,
  });
}

export function useMyRatingForItem(itemId: string, userId: string) {
  return useQuery({
    queryKey: queryKeys.ratings.mine(itemId, userId),
    queryFn: () => itemsService.getMyRatingForItem(itemId, userId),
    enabled: !!itemId && !!userId,
  });
}

export function useRateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RateItemInput) => itemsService.rateItem(input),
    onSuccess: (rating, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.feed(input.groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.items.list(input.groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.items.detail(rating.item_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.forItem(rating.item_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.ratings.mine(rating.item_id, rating.user_id) });
    },
  });
}
```

- [ ] **Step 4: Type-check.**

```bash
npx tsc --noEmit
```
Expected: clean. (If a nested-embed return errors, apply the `overrideTypes`/`as Rating` fallback from Step 2's note.)

- [ ] **Step 5: Commit.**

```bash
git add src/lib/queryKeys.ts src/features/items
git commit -m "feat(items): service + React Query hooks for items, ratings, categories, and the rate_item RPC"
```

---

## Task 4: Group feed — replace the Phase 2 placeholder; register the rate modal route

**Files:**
- Rewrite: `src/app/group/[id]/index.tsx` (invite code kept; feed of recent ratings replaces the placeholder; "Rate something" entry point)
- Modify: `src/app/group/_layout.tsx` (register `[id]/rate` as a modal route — nested guarded layout, per the Phase 1 guard fix)

- [ ] **Step 1: Rewrite `src/app/group/[id]/index.tsx`** (keeps the Phase 1 invite-code copy card, adds the feed):

```tsx
import { useEffect, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Pressable, ActivityIndicator, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Card, Avatar, ScoreDisplay, TagChip, EmptyState } from '@/shared/components/ui';
import { useGroup } from '@/features/groups/hooks/useGroups';
import { useGroupFeed } from '@/features/items/hooks/useItems';
import type { RatingFeedRow } from '@/features/items/items.service';
import { formatRelativeDate } from '@/shared/utils/formatDate';
import { colors, spacing, borderRadius } from '@/theme';

export default function GroupFeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: group, isLoading: isGroupLoading } = useGroup(id);
  const { data: feed, isLoading: isFeedLoading, isError, refetch } = useGroupFeed(id);
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  async function copyCode() {
    if (!group) return;
    await Clipboard.setStringAsync(group.invite_code);
    setCopied(true);
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = setTimeout(() => {
      copiedTimeoutRef.current = null;
      setCopied(false);
    }, 2000);
  }

  if (isGroupLoading) {
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

  const listHeader = (
    <View style={styles.listHeader}>
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
      <Button title="Rate something" onPress={() => router.push(`/group/${group.id}/rate`)} fullWidth />
      <Text variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
        Recent ratings
      </Text>
    </View>
  );

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

      <FlatList
        data={feed ?? []}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        renderItem={({ item: r }: { item: RatingFeedRow }) => (
          <Card
            style={styles.feedCard}
            onPress={() => r.items && router.push(`/group/${group.id}/item/${r.items.id}`)}
          >
            <View style={styles.feedTop}>
              <Avatar uri={r.profiles?.avatar_url} name={r.profiles?.username} size="sm" />
              <View style={styles.feedWho}>
                <Text variant="bodySmall">@{r.profiles?.username ?? 'unknown'}</Text>
                <Text variant="caption" color={colors.textMuted}>
                  {formatRelativeDate(r.created_at)}
                </Text>
              </View>
              <ScoreDisplay score={r.score} size="sm" />
            </View>
            <View style={styles.feedItemRow}>
              <Text variant="h3" style={styles.feedItemName} numberOfLines={1}>
                {r.items?.name ?? 'Unknown item'}
              </Text>
              {r.items?.categories ? <TagChip label={r.items.categories.name} /> : null}
            </View>
            {r.comment ? (
              <Text variant="bodySmall" color={colors.textSecondary} numberOfLines={2}>
                {r.comment}
              </Text>
            ) : null}
            {r.photo_url ? <Image source={{ uri: r.photo_url }} style={styles.feedPhoto} /> : null}
          </Card>
        )}
        ListEmptyComponent={
          isFeedLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.feedLoading} />
          ) : isError ? (
            <View style={styles.feedError}>
              <Text color={colors.error}>Could not load the feed.</Text>
              <Button title="Retry" onPress={() => refetch()} variant="outline" size="sm" />
            </View>
          ) : (
            <EmptyState
              icon="star-outline"
              title="No ratings yet"
              message="Be the first to rate something in this group."
              actionLabel="Rate something"
              onAction={() => router.push(`/group/${group.id}/rate`)}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  headerTitle: { flex: 1 },
  list: { gap: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  listHeader: { gap: spacing.md, marginBottom: spacing.md },
  inviteCard: { gap: spacing.xs },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inviteCode: { fontSize: 28, fontWeight: '800', letterSpacing: 4, color: colors.primary },
  sectionLabel: { marginTop: spacing.sm },
  feedCard: { gap: spacing.sm },
  feedTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  feedWho: { flex: 1 },
  feedItemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  feedItemName: { flexShrink: 1 },
  feedPhoto: { width: '100%', height: 180, borderRadius: borderRadius.md, backgroundColor: colors.surfaceLight },
  feedLoading: { marginTop: spacing.xxl },
  feedError: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xxl },
});
```

- [ ] **Step 2: Register the rate modal route in `src/app/group/_layout.tsx`.** (NOT the root `_layout.tsx` — after the Phase 1 final-review guard fix, all `group/*` routes are nested under the session-guarded `src/app/group/_layout.tsx`, and the root stack has a single `name="group"` entry.) Add one `Stack.Screen` line inside that file's `<Stack>…</Stack>` block, alongside the existing `create` / `join` modal entries:

```tsx
          <Stack.Screen name="create" options={{ presentation: 'modal' }} />
          <Stack.Screen name="join" options={{ presentation: 'modal' }} />
          <Stack.Screen name="[id]/rate" options={{ presentation: 'modal' }} />
```
(Route names inside the nested layout are relative — `[id]/rate`, not `group/[id]/rate`. The `group/[id]/item/[itemId]` detail screen from Task 6 is auto-registered by Expo Router with the default slide animation — no entry needed. Read the actual file first and match its exact existing option shapes.)

- [ ] **Step 3: Type-check.**

```bash
npx tsc --noEmit
```
Expected: clean. (The `group/[id]/rate` and `group/[id]/item/[itemId]` routes referenced by `router.push` don't exist until Tasks 5–6; typed routes are not enabled, so route strings are not checked by tsc.)

- [ ] **Step 4: Commit.**

```bash
git add "src/app/group/[id]/index.tsx" src/app/group/_layout.tsx
git commit -m "feat(feed): group feed of recent ratings replaces the Phase 2 placeholder; register rate modal route"
```

---

## Task 5: Add-rating modal — pick-or-create item (dedup), score 1–10, optional photo + comment

**Files:**
- Create: `src/app/group/[id]/rate.tsx`

- [ ] **Step 1: Create `src/app/group/[id]/rate.tsx`.** Reads an optional `?itemId=` param (from "Rate this" on item detail) to preselect an item; otherwise the user types a name (with dedup suggestions) and picks a category. Score chips reuse `TagChip`; the photo path reuses `expo-image-picker` → the existing `useImageUpload('rating-photos')`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Input, Card, TagChip, ScoreDisplay } from '@/shared/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useImageUpload } from '@/shared/hooks/useImageUpload';
import {
  useCategories,
  useGroupItems,
  useItem,
  useMyRatingForItem,
  useRateItem,
} from '@/features/items/hooks/useItems';
import type { ItemWithCategory } from '@/features/items/items.service';
import { getScoreLabel } from '@/shared/utils/formatScore';
import { colors, spacing, borderRadius } from '@/theme';

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function RateScreen() {
  const { id: groupId, itemId: paramItemId } = useLocalSearchParams<{ id: string; itemId?: string }>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const { data: items } = useGroupItems(groupId);
  const { data: categories } = useCategories();
  const { data: paramItem } = useItem(paramItemId ?? '');
  const { upload, uploading } = useImageUpload('rating-photos');
  const rateItem = useRateItem();

  const [name, setName] = useState('');
  const [manualSelectedId, setManualSelectedId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Resolve the item this rating attaches to:
  //  1. a route-param item ("Rate this" from item detail),
  //  2. a suggestion the user tapped,
  //  3. an exact name match of what they typed (the server dedups regardless;
  //     this just lets the category picker step aside in the UI).
  const manualItem = useMemo(
    () => items?.find((i) => i.id === manualSelectedId) ?? null,
    [items, manualSelectedId],
  );
  const matchedItem = useMemo(() => {
    const n = name.trim().toLowerCase();
    if (!n || manualSelectedId) return null;
    return items?.find((i) => i.name.trim().toLowerCase() === n) ?? null;
  }, [items, name, manualSelectedId]);
  const effectiveItem: ItemWithCategory | null = paramItem ?? manualItem ?? matchedItem;

  const suggestions = useMemo(() => {
    const n = name.trim().toLowerCase();
    if (paramItem || manualItem || !n) return [];
    return (items ?? []).filter((i) => i.name.toLowerCase().includes(n)).slice(0, 6);
  }, [items, name, paramItem, manualItem]);

  // Prefill from the caller's existing rating of the resolved item (upsert path).
  const { data: myRating } = useMyRatingForItem(effectiveItem?.id ?? '', user?.id ?? '');
  useEffect(() => {
    if (myRating) {
      setScore(myRating.score);
      setComment(myRating.comment ?? '');
    }
    // Only re-run when the resolved item (hence myRating) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveItem?.id, myRating?.id]);

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo library permission is required to add a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled && result.assets?.[0]) {
      setError(null);
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function onSubmit() {
    if (!user) return;
    if (score == null) {
      setError('Pick a score from 1 to 10.');
      return;
    }
    const useExisting = !!effectiveItem;
    const trimmedName = name.trim();
    if (!useExisting) {
      if (trimmedName.length < 1) {
        setError('Give the item a name.');
        return;
      }
      if (!categoryId) {
        setError('Pick a category.');
        return;
      }
    }
    setError(null);
    try {
      let photoUrl: string | null = null;
      if (photoUri) {
        const res = await upload(photoUri);
        photoUrl = res.publicUrl;
      }
      const rating = await rateItem.mutateAsync({
        groupId,
        itemId: useExisting ? effectiveItem!.id : null,
        itemName: useExisting ? undefined : trimmedName,
        categoryId: useExisting ? undefined : categoryId!,
        score,
        comment: comment.trim() || null,
        photoUrl,
        visitedAt: null,
      });
      router.replace(`/group/${groupId}/item/${rating.item_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit your rating.');
    }
  }

  const submitting = uploading || rateItem.isPending;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text variant="h2">Rate</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
      </View>

      {effectiveItem ? (
        <Card style={styles.section}>
          <Text variant="labelSmall" color={colors.textMuted}>
            ITEM
          </Text>
          <Text variant="h3">{effectiveItem.name}</Text>
          {effectiveItem.categories ? (
            <Text variant="caption" color={colors.textMuted}>
              {effectiveItem.categories.name}
            </Text>
          ) : null}
          {!paramItem ? (
            <Pressable
              onPress={() => {
                setManualSelectedId(null);
                setName('');
              }}
              hitSlop={8}
            >
              <Text variant="caption" color={colors.primary}>
                Rate a different item
              </Text>
            </Pressable>
          ) : null}
        </Card>
      ) : (
        <View style={styles.section}>
          <Input
            label="What are you rating?"
            placeholder="e.g. Pizza Palace"
            value={name}
            onChangeText={setName}
            autoFocus
          />
          {suggestions.length > 0 ? (
            <Card style={styles.suggestions}>
              <Text variant="caption" color={colors.textMuted}>
                Did you mean…
              </Text>
              {suggestions.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    setManualSelectedId(s.id);
                    setName(s.name);
                  }}
                  style={styles.suggestionRow}
                  hitSlop={4}
                >
                  <Text variant="bodySmall" color={colors.primary}>
                    {s.name}
                  </Text>
                  {s.categories ? (
                    <Text variant="caption" color={colors.textMuted}>
                      {s.categories.name}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </Card>
          ) : null}
          <Text variant="label" color={colors.textSecondary}>
            Category
          </Text>
          <View style={styles.chipsWrap}>
            {(categories ?? []).map((c) => (
              <TagChip
                key={c.id}
                label={c.name}
                selected={categoryId === c.id}
                onPress={() => setCategoryId(c.id)}
              />
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text variant="label" color={colors.textSecondary}>
          Score
        </Text>
        <View style={styles.chipsWrap}>
          {SCORES.map((n) => (
            <TagChip key={n} label={String(n)} selected={score === n} onPress={() => setScore(n)} />
          ))}
        </View>
        {score != null ? (
          <View style={styles.scorePreview}>
            <ScoreDisplay score={score} size="lg" />
            <Text variant="label" color={colors.textSecondary}>
              {getScoreLabel(score)}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Input
          label="Comment (optional)"
          placeholder="What did you think?"
          value={comment}
          onChangeText={setComment}
          multiline
          style={styles.commentInput}
        />
      </View>

      <View style={styles.section}>
        <Text variant="label" color={colors.textSecondary}>
          Photo (optional)
        </Text>
        {photoUri ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            <Button title="Remove photo" onPress={() => setPhotoUri(null)} variant="ghost" size="sm" />
          </View>
        ) : (
          <Button title="Add photo" onPress={pickPhoto} variant="outline" />
        )}
      </View>

      {error ? (
        <Text variant="caption" color={colors.error}>
          {error}
        </Text>
      ) : null}

      <Button
        title={submitting ? 'Submitting…' : 'Submit rating'}
        onPress={onSubmit}
        loading={submitting}
        fullWidth
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { gap: spacing.sm },
  suggestions: { gap: spacing.sm },
  suggestionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  scorePreview: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  commentInput: { height: 96, paddingTop: spacing.md, textAlignVertical: 'top' },
  photoWrap: { gap: spacing.sm },
  photoPreview: { width: '100%', height: 200, borderRadius: borderRadius.md, backgroundColor: colors.surfaceLight },
});
```

> **`mediaTypes: ['images']` note:** this is the current `expo-image-picker` (SDK 54 / ~17) API. If tsc rejects the string-array form, use `[ImagePicker.MediaType.Images]`. The `expo-image-picker` plugin + `photosPermission` are already configured in `app.json`, so no config change is needed.

- [ ] **Step 2: Type-check.**

```bash
npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add "src/app/group/[id]/rate.tsx"
git commit -m "feat(rate): add-rating modal — pick-or-create item with dedup, 1-10 score, optional photo + comment"
```

---

## Task 6: Item detail — item info, live stats, all ratings

**Files:**
- Create: `src/app/group/[id]/item/[itemId].tsx`

- [ ] **Step 1: Create `src/app/group/[id]/item/[itemId].tsx`:**

```tsx
import { View, FlatList, StyleSheet, Pressable, ActivityIndicator, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Card, Avatar, ScoreDisplay } from '@/shared/components/ui';
import { useItem, useItemRatings } from '@/features/items/hooks/useItems';
import type { RatingWithAuthor } from '@/features/items/items.service';
import { getScoreLabel } from '@/shared/utils/formatScore';
import { formatRelativeDate } from '@/shared/utils/formatDate';
import { colors, spacing, borderRadius } from '@/theme';

export default function ItemDetailScreen() {
  const { id: groupId, itemId } = useLocalSearchParams<{ id: string; itemId: string }>();
  const insets = useSafeAreaInsets();
  const { data: item, isLoading } = useItem(itemId);
  const { data: ratings } = useItemRatings(itemId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.center}>
        <Text color={colors.textSecondary}>Item not found (or you are not a member).</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text color={colors.primary}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const avg = item.average_score != null ? Number(item.average_score) : null;

  const listHeader = (
    <View style={styles.listHeader}>
      <Card style={styles.statsCard}>
        {item.rating_count > 0 && avg != null ? (
          <>
            <ScoreDisplay score={avg} size="lg" />
            <Text variant="label" color={colors.textSecondary}>
              {getScoreLabel(avg)}
            </Text>
            <View style={styles.statRow}>
              <Text variant="caption" color={colors.textMuted}>
                {item.rating_count} {item.rating_count === 1 ? 'rating' : 'ratings'}
              </Text>
              <Text variant="caption" color={colors.textMuted}>
                High {item.highest_score} · Low {item.lowest_score}
              </Text>
            </View>
          </>
        ) : (
          <Text color={colors.textSecondary}>No ratings yet.</Text>
        )}
      </Card>
      <Button
        title="Rate this"
        onPress={() => router.push(`/group/${groupId}/rate?itemId=${itemId}`)}
        fullWidth
      />
      <Text variant="label" color={colors.textSecondary} style={styles.sectionLabel}>
        All ratings
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text variant="h3" numberOfLines={1}>
            {item.name}
          </Text>
          {item.categories ? (
            <Text variant="caption" color={colors.textMuted}>
              {item.categories.name}
            </Text>
          ) : null}
        </View>
      </View>

      <FlatList
        data={ratings ?? []}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        renderItem={({ item: r }: { item: RatingWithAuthor }) => (
          <Card style={styles.ratingCard}>
            <View style={styles.ratingTop}>
              <Avatar uri={r.profiles?.avatar_url} name={r.profiles?.username} size="sm" />
              <View style={styles.ratingWho}>
                <Text variant="bodySmall">@{r.profiles?.username ?? 'unknown'}</Text>
                <Text variant="caption" color={colors.textMuted}>
                  {formatRelativeDate(r.created_at)}
                </Text>
              </View>
              <ScoreDisplay score={r.score} size="sm" />
            </View>
            {r.comment ? (
              <Text variant="bodySmall" color={colors.textSecondary}>
                {r.comment}
              </Text>
            ) : null}
            {r.photo_url ? <Image source={{ uri: r.photo_url }} style={styles.ratingPhoto} /> : null}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  headerTitleWrap: { flex: 1 },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  listHeader: { gap: spacing.md, marginBottom: spacing.md },
  statsCard: { alignItems: 'center', gap: spacing.xs },
  statRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
  sectionLabel: { marginTop: spacing.sm },
  ratingCard: { gap: spacing.sm },
  ratingTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ratingWho: { flex: 1 },
  ratingPhoto: { width: '100%', height: 180, borderRadius: borderRadius.md, backgroundColor: colors.surfaceLight },
});
```

- [ ] **Step 2: Type-check.**

```bash
npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Quick manual smoke on web** (full flow is Task 7):

```bash
npx expo start --web
```
Manual: open a group → **Rate something** → type a name → pick a category → tap a score → Submit → land on item detail showing the average, count, and your rating. Back to the group → the rating appears in the feed.

- [ ] **Step 4: Commit.**

```bash
git add "src/app/group/[id]/item/[itemId].tsx"
git commit -m "feat(item): item detail — info, live aggregate stats, and all ratings"
```

---

## Task 6.5: Phase 1 deferred polish (from the Phase 1 final whole-branch review)

**Files:**
- Modify: `src/app/(tabs)/index.tsx`, `src/app/group/[id]/index.tsx`, `src/app/group/[id]/settings.tsx`, `src/app/group/create.tsx`, `src/app/group/join.tsx`

These are the Phase 1 final review's DEFER-triaged findings, folded into this phase as agreed. Each is small; do them as one pass.

- [ ] **Step 1: Adopt `LoadingSkeleton`** (from `@/shared/components/ui`) for the loading states of the Groups list (`(tabs)/index.tsx`) and the new group feed (`group/[id]/index.tsx`), replacing bare `ActivityIndicator`s. Check `LoadingSkeleton`'s actual props before use. This resurrects a currently-dead component; if its API fits poorly, report DONE_WITH_CONCERNS instead of forcing it.
- [ ] **Step 2: Error states for group screens.** `group/[id]/index.tsx` and `group/[id]/settings.tsx` currently destructure only `isLoading` — any query error renders as "Group not found (or you are not a member)". Read `isError` and show the same error+Retry treatment `(tabs)/index.tsx` uses.
- [ ] **Step 3: Surface settings mutation failures.** `onLeave`/`onDelete`/`removeMember.mutate` in `settings.tsx` have no `onError` — add error surfacing consistent with the screen's existing per-field error slots (a form-level error `Text` above the danger zone is fine). Route rename/webhook server errors to a neutral form-level slot instead of `webhookError`.
- [ ] **Step 4: Create/join error polish.** In `create.tsx` and `join.tsx`: clear the field error when the user edits the input after a failed submit; map remaining raw error codes to friendly text (`not_authenticated` → "Your session expired — sign in again."; default → "Something went wrong. Check your connection and try again." with the raw message logged via `console.warn`).
- [ ] **Step 5: Type-check.** `npx tsc --noEmit` — expected clean.
- [ ] **Step 6: Commit.**

```bash
git add "src/app/(tabs)/index.tsx" "src/app/group"
git commit -m "polish(groups): skeletons, error states, mutation error surfacing (Phase 1 review deferrals)"
```

---

## Task 7: Phase 2 exit verification — rated items with correct aggregate stats

No code changes — this is the Phase 2 exit gate: *"a group can accumulate rated items with correct aggregate stats."* The **SQL test is the automated gate** (it proves dedup, bounds, one-per-user upsert, stat-trigger correctness across insert/update/delete, and cross-group isolation); the UI flow is the manual confirmation of the exit story: rate an item from the feed and watch the stats update on item detail.

- [ ] **Step 1: Full clean rebuild of the database and all checks.**

```bash
cd /Users/pattedyr/Documents/coding_projects/everrate
set -a && source supabase/.env && set +a
npx supabase db reset
psql "$(npx supabase status -o env | grep '^DB_URL' | cut -d= -f2- | tr -d '"')" -f supabase/tests/profiles_rls.sql
psql "$(npx supabase status -o env | grep '^DB_URL' | cut -d= -f2- | tr -d '"')" -f supabase/tests/groups_rls.sql
psql "$(npx supabase status -o env | grep '^DB_URL' | cut -d= -f2- | tr -d '"')" -f supabase/tests/items_ratings_rls.sql
npx tsc --noEmit
```
Expected: `Finished supabase db reset`; all three test scripts print only `… OK …` notices (no `FAIL`); tsc clean. **This is the automated Phase 2 exit gate.**

- [ ] **Step 2: Manual UI flow on web** (single account is enough for the core exit story; use two if verifying multi-user aggregation).

```bash
npx expo start --web
```
Manual:
1. Sign in → open (or create) a group.
2. **Rate something** → type a new item name (e.g. `Pizza Palace`) → pick a category (e.g. Food) → tap score **8** → optionally **Add photo** and a comment → **Submit rating**.
3. You land on **item detail**: average shows **8.0**, "1 rating", High 8 · Low 8. Your rating is listed.
4. Back to the group feed → the rating appears (rater, item, score 8, category chip, comment/photo).
5. Tap the feed row → item detail again. Tap **Rate this** → the form is **prefilled with your existing score/comment** (upsert path). Change the score to **4** → Submit → item detail now shows **4.0**, still "1 rating" (updated, not duplicated).
6. **Dedup check:** **Rate something** again → type the same name with different case/spacing (e.g. `  pizza   palace  `). If the suggestion appears, it resolves to the existing item; if you just type it and submit with any category, it still attaches to the same item (no duplicate is created). Item detail keeps a single item; the feed does not gain a second "Pizza Palace" item.
7. **(Two-account, optional)** second account joins the group → rates the same item **6** → item detail shows average **5.0**, "2 ratings", High 6 · Low 4 — confirming multi-user aggregation.

- [ ] **Step 3 (optional): Same flow on Android** (dev build, `npx expo run:android`). Phase 0 networking gotcha still applies: the emulator reaches local Supabase at `http://10.0.2.2:54321`; a physical device needs your LAN IP in `EXPO_PUBLIC_SUPABASE_URL`. Photo upload needs the storage container up.

- [ ] **Step 4: Phase 2 exit checklist (tick all).**

  - [ ] `npx tsc --noEmit` is clean
  - [ ] `npx supabase db reset` applies all three migrations with no error
  - [ ] `supabase/tests/profiles_rls.sql` and `groups_rls.sql` still pass (no regression)
  - [ ] `supabase/tests/items_ratings_rls.sql` passes — dedup, score bounds, one-per-user upsert, stat trigger on insert/update/delete, cross-group isolation (automated exit gate)
  - [ ] UI: rating a new item from the feed creates it, and item detail shows correct average/count/high/low
  - [ ] Re-rating the same item updates in place (no duplicate) and stats recompute
  - [ ] Dedup: the same name typed with different case/spacing attaches to the existing item
  - [ ] A non-member cannot see or rate another group's items (proven at SQL level; RLS member-scoped)

- [ ] **Step 5: Final commit / tag the milestone.**

```bash
git add -A
git commit -m "chore: Phase 2 complete — items + ratings with dedup and live aggregate stats on local Supabase" --allow-empty
git tag phase-2-items-ratings
```

---

## Self-review notes (author)

- **Spec coverage (Phase 2 = "Add item (with dedup), rate (score + photo + comment), item detail, group feed; stat triggers live"):** schema — categories/items/ratings + dedup + stat trigger + `updated_at` ✅(T1); RLS + stat correctness proven across insert/update/delete with two groups ✅(T2); feature service + hooks + query keys ✅(T3); group feed replaces the Phase 2 placeholder ✅(T4); add-rating flow with pick-or-create dedup, 1–10 score, optional photo + comment ✅(T5); item detail with live stats + all ratings ✅(T6); exit criterion verified SQL-first + manual UI ✅(T7). Member-scoped RLS uses the Phase 1 `is_group_member` `SECURITY DEFINER` helper (spec §9).
- **Design decisions where the spec left room (all called out in the header, flagged here for the orchestrator):**
  1. **Write path = single `rate_item` RPC** (SECURITY DEFINER), no INSERT policies on items/ratings — consistent with Phase 1's RPC-only precedent; the RPC validates score *before* creating an item.
  2. **One non-RPC write: a `ratings` DELETE policy for the row owner** — gives users a delete path *and* makes the stat trigger's DELETE branch RLS-testable.
  3. **`rating_history` + snapshot trigger + comments DEFERRED to Phase 3** (as the spec assigns); ratings table nonetheless ships the full column set (incl. `review_count`/`comment_count`) so Phase 3 adds only triggers.
  4. **Categories seeded in the migration, not `seed.sql`** — so they reach production via `db push` (seed.sql is local-only). Idempotent upsert by slug.
  5. **Normalization is a server-side SQL function** + a `BEFORE INSERT/UPDATE OF name` trigger; client dedup is suggestion-only (substring filter).
  6. **Combined `src/features/items` feature** houses items + ratings + categories (mirrors the single-folder `groups` feature).
  7. **Storage: one public `rating-photos` bucket** with own-folder-scoped write policies; reads are public-by-URL (tradeoff noted — required because `useImageUpload` uses `getPublicUrl`; Phase 3+ can switch to private + signed URLs).
  8. **`visited_at` column exists, no Phase 2 UI** (avoids a date-picker dependency); **`items.image_url` exists, no upload UI** in Phase 2.
- **Stat-trigger correctness details:** `update_item_rating_stats` is `SECURITY DEFINER` (so it can write `items` even when a user deletes a rating under RLS); recomputes for `coalesce(NEW.item_id, OLD.item_id)` (item_id never moves in this flow); empties to `count=0, total=0, avg/high/low = NULL` when the last rating is removed (item row is kept). All three branches asserted in T2.
- **No placeholders:** every code/SQL step is complete. The only "verify at runtime" flags are typed-inference fallbacks — the nested-embed `overrideTypes` note and the `rate_item` `as Rating` cast note (T3 Step 2), and the `mediaTypes` array-vs-enum note (T5) — each flagged inline, Phase 0/1 style.
- **Type/name consistency:** `rate_item(p_group_id, p_score, p_item_id, p_item_name, p_category_id, p_comment, p_photo_url, p_visited_at)` (T1) ⇄ `supabase.rpc('rate_item', { p_group_id, p_score, … })` (T3); `ItemWithCategory`/`RatingWithAuthor`/`RatingFeedRow`/`RateItemInput` defined in T3, consumed in T4/T5/T6; hooks defined in T3 match every screen import; `queryKeys.{categories,items,ratings}` used only via the T3 hooks; helper type exports re-appended in T1 Step 6 (`Category`/`Item`/`Rating` added to the Phase 1 three); route strings `/group/[id]/rate` (modal, registered in `group/_layout.tsx` T4 Step 2) and `/group/[id]/item/[itemId]` (auto-registered) match the files created in T5/T6.
- **Reused existing primitives (no new components):** `ScoreDisplay` (score chips preview + feed/detail scores), `TagChip` (score buttons, category picker, feed category chip), `Card`/`Button`/`Input`/`Avatar`/`EmptyState`/`Text`, `useImageUpload('rating-photos')`, `formatRelativeDate`/`getScoreLabel`, the two-tab nav + modal-route pattern from Phase 1.
- **Known verify-at-runtime points:** supabase-js typing of nested relationship embeds (feed/item-detail selects; fallback given); the generated `rate_item` composite `Returns` shape (cast `as Rating` if needed); `numeric(3,1)` `average_score` arriving as a JS number vs string (handled with `Number(item.average_score)` in T6); `presentation: 'modal'` degrading to a plain screen on web (harmless, as in Phase 1).
