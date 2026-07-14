# ScawwyRate Phase 3 — Stats & Re-review Implementation Plan

**Goal:** Full read experience — per-group stats dashboard (Top Rated / Most Rated / By Category / Leaderboard), comments on ratings, and re-review history. **Exit (spec §8):** full read experience: stats screens live, a re-rated rating shows its history, comments can be added/read/deleted with correct counts.

**Execution note:** implemented in-session by the controller (subagent dispatch paused by Patrick mid-Phase 2); the schema SQL below is exact, screens follow the established conventions (dark theme, shared UI kit, member-scoped data, guarded `group/*` subtree).

**Decisions:**
1. **Top/Most/By-Category derive client-side from `items`** — the stat columns (`rating_count`, `average_score`, …) are already denormalized and member-readable; no new SQL needed.
2. **Leaderboard is a SQL function** `group_leaderboard(gid)` (SECURITY INVOKER — RLS on `ratings` already scopes rows to members; a non-member gets zero rows rather than an error, acceptable for a read helper). Explicit revoke/grant per the function-privilege lesson.
3. **Comments write path is direct INSERT with RLS** (unlike groups/items' RPC-only writes): no server-generated fields, no atomicity needs — a policy fully expresses the rule (own comment + member of the rating's group). Delete: own only. No UPDATE (edit = delete + repost; YAGNI).
4. **`rating_history` is trigger-written only** (no client write path at all); readable by group members. The snapshot trigger fires on real changes only (score/comment/photo distinct) and bumps `review_count`.
5. **Screens:** `group/[id]/stats.tsx` (sections via SectionList-style layout), `group/[id]/rating/[ratingId].tsx` (rating + history + comments). Feed and item-detail rating rows link to rating detail. Stats entry point: bar-chart icon in the group header.

## Task 1: Migration `stats_rereview`

```sql
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
-- clients (trigger writes as owner). comments: direct-insert write path per plan.
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
```

Verify: `db reset` clean; both triggers + function exist; `gen types` (re-append helper exports + add `RatingHistory`, `Comment`); tsc clean. Commit.

## Task 2: SQL test `supabase/tests/stats_comments_rls.sql`
Seed 3 users through `handle_new_user` (UUIDs 9999…/aaaa…/bbbb… style, non-colliding), group via `create_group`, join via `join_group`, rate via `rate_item`. Assert:
1. Re-rate (score change) → `rating_history` row with old score; `review_count` bumped to 2; no-op update (same values) → NO history row.
2. Member comments on another member's rating → `comment_count` = 1; second comment → 2; delete own → 1; cannot delete someone else's (0 rows); non-member cannot insert (RLS violation) or read (0 rows).
3. `group_leaderboard(gid)`: member sees correct per-user counts/averages; non-member gets 0 rows; anon lacks EXECUTE.
Single begin…rollback. Commit.

## Task 3: Feature layer
`queryKeys`: `stats.leaderboard(groupId)`, `ratings.detail(ratingId)`, `comments.forRating(ratingId)`, `history.forRating(ratingId)`. Service (`src/features/items/items.service.ts` — same feature, read paths): `getRating(ratingId)` (with author + item embed), `listRatingComments`, `addComment`, `deleteComment`, `listRatingHistory`, `getGroupLeaderboard` (rpc). Hooks mirroring existing patterns, invalidations: addComment/deleteComment → comments.forRating + ratings.detail + feed (comment_count shown in feed later if ever). tsc clean. Commit.

## Task 4: Screens
- `group/[id]/stats.tsx`: header w/ back; tab-chip row (Top Rated / Most Rated / By Category / Leaderboard) switching sections; Top/Most/By-Category from `useGroupItems`; Leaderboard from RPC hook. Rows navigate to item detail. Skeleton loading, error+Retry, empty states.
- `group/[id]/rating/[ratingId].tsx`: rating card (author, score, comment, photo, relative time), "Rated N times" + history list (previous scores + dates) when `review_count > 1`, comments section (list, input + post, delete own via two-tap confirm), errors surfaced via `friendlyError`.
- Entry points: stats icon (bar-chart) in group header; feed + item-detail rating rows navigate to rating detail.
tsc clean. Commit.

## Task 5: Exit gate
`db reset` + all 4 SQL suites green + tsc clean + UI flow: re-rate an item → rating detail shows history; comment on a rating → count/list correct; stats screen shows all four sections with real data. Tag `phase-3-stats-rereview`.
