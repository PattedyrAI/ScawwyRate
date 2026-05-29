# ScawwyRate — Cross-Platform Rebuild (everrate + ScawwyRate merge)

- **Date:** 2026-05-29
- **Status:** Design — approved (backend revised: self-hosted Supabase on Railway)
- **Author:** Claude (brainstorming session)

## 1. Context & the core finding

The user has two sibling "rating" hobby projects in `~/Documents/coding_projects/`:

- **everrate** — social *drink* rating app. Expo / React Native / TypeScript + Supabase. Cross-platform (iOS + Android + web). ~6.6k LOC, architecturally sound but **half-finished** (placeholder login & activity screens) and **local-only** (no git remote). Auth via Apple + Google. Public follow/follower social model.
- **ScawwyRate** (internal name "RateIt") — rate *anything* (food, movies, games, music, places) in **private friend groups** with invite codes. Native **Android** (Kotlin) + Firebase Firestore + Cloud Functions. **Complete & production-ready**, all screens work. Auth via **Discord** OAuth. Already on GitHub: `github.com/PattedyrAI/ScawwyRate`. Posts ratings to Discord channels via webhook.

**Critical finding: the two projects share zero code.** Different language (TS vs Kotlin), platform (cross-platform vs Android-only), backend (Supabase/Postgres vs Firebase/Firestore), auth (Apple+Google vs Discord), and social model (public followers vs private groups). Nothing ports mechanically. "Combine them" therefore cannot be a literal code merge — it is a **product decision plus a rebuild**.

## 2. Decisions locked (from brainstorming)

| Decision | Choice |
|---|---|
| **Target product** | ScawwyRate's concept — *rate anything, with friends (private groups)* |
| **Platforms** | iOS + Android + web (cross-platform required) |
| **Login** | **Discord only** (via Supabase's native Discord OAuth provider) |
| **Discord webhook posting** | **Yes, from the start** |
| **Name & repo** | Keep the **ScawwyRate** name; reuse the existing `github.com/PattedyrAI/ScawwyRate` repo (replace the Android code) |
| **Categories** | **Fixed set:** Food, Movies, Games, Music, Places, Other |
| **Execution approach** | **A — transform everrate in place** (reuse its infra, rebuild the domain) |
| **Backend host** | **Self-hosted Supabase on Railway** (Docker stack). Dev against **local Supabase** (CLI); deploy the stack to Railway as the final step |
| **Launch deliverable** | **Android release APK** (distributable) **+ Expo web build on Railway** **+ self-hosted Supabase backend on Railway**; iOS later |

### How the choices reconcile

Because the user wants ScawwyRate's *concept* but on a *cross-platform* stack, ScawwyRate's Android-only Kotlin codebase cannot survive. The plan is therefore:

> **Foundation = everrate** (Expo/RN/TS + Supabase). **Product = ScawwyRate's concept**, rebuilt on top. Identity/name = **ScawwyRate**, pushed to the existing ScawwyRate GitHub repo.

Operationally: develop in the local `everrate` folder, rename to ScawwyRate, repoint the git remote to `github.com/PattedyrAI/ScawwyRate`, and replace the old Android app there. **Tag/branch the existing Android code before replacing it** so it stays recoverable.

**Infra:** Railway is the single hosting home — it runs **both** the self-hosted Supabase backend and the static web build. The Android APK is the platform distribution and talks to the Railway backend URL. During development the app runs against a **local** Supabase instance (Supabase CLI); the Railway deployment happens in the final phase.

## 3. Target product definition

A cross-platform mobile/web app where friend groups privately rate *anything*:

- Sign in with **Discord** (Discord username + avatar become your identity).
- Create or join **private groups** via a 6-character invite code.
- Within a group, add **items** in fixed **categories** (Food, Movies, Games, Music, Places, Other), with smart **deduplication** so "Pizza Palace" / "pizza palace" collapse to one item.
- **Rate** items 1–10 with an optional photo and comment. One rating per user per item; updating it keeps a **re-review history** (everrate's standout feature).
- Browse the **group feed**, **item detail** (all ratings + stats), and **rating detail** (comments + history).
- View per-group **stats**: top-rated, most-rated, by-category, member leaderboard.
- Optionally configure a **Discord webhook** per group so new ratings auto-post a color-coded embed into a Discord channel.

## 4. Architecture

**Stack (inherited from everrate, unchanged):** Expo SDK 54 / React Native 0.81 / React 19 / TypeScript; Expo Router (file-based nav); Supabase (Postgres + Auth + Storage); TanStack React Query (server state); Zustand (client state); react-hook-form + zod (forms); MMKV (token storage); `@gorhom/bottom-sheet`, `@expo/vector-icons`.

**Layering:** `data/storage (Supabase + RLS + triggers)` → `feature services + React Query hooks` → `screens (Expo Router)`. Dependencies flow inward.

### Keep ~as-is from everrate (the expensive infra)

- `src/lib/supabase.ts`, `queryClient.ts`, `queryKeys.ts`
- Theme system (`src/theme/*`) — dark, neon-green aesthetic
- Shared UI kit (`src/shared/components/ui/*`): `Button`, `Text`, `Card`, `Avatar`, `Badge`, `Input`, **`ScoreDisplay` (1–10 works unchanged)**, `TagChip`, `EmptyState`, `LoadingSkeleton`, `ScreenPlaceholder`, `ErrorBoundary`
- `useImageUpload` hook; `formatDate` / `formatScore` / `haptics` utils
- Expo Router shell + `app.json` build config (renamed)
- Zustand store *pattern* (authStore etc.)

### Rebuild (the domain)

- Entire Supabase schema (`products → ratings` ⇒ `groups → items → ratings`)
- All feature services + hooks (`products`, `ratings`, `social/follows` ⇒ `groups`, `items`, `ratings`, `comments`, `stats`)
- All screens (drinks flow ⇒ group flow)
- **Auth: Apple/Google ⇒ Discord** (fills everrate's empty `login.tsx` placeholder)

### Deliberate cuts (YAGNI)

- everrate's **public follow/follower** social model — replaced by private groups.
- **Likes** — not part of the chosen concept. Easy to add later.
- (Notifications: deferred; not in initial phases.)

### Build & deployment targets

- **Backend:** **self-hosted Supabase on Railway** — the full Supabase stack (Postgres + GoTrue auth + PostgREST + Storage + Edge runtime + Kong gateway) deployed to Railway via Docker. The app uses `@supabase/supabase-js` exactly as with managed Supabase; only the URL/keys differ. **Dev** runs against a **local Supabase instance** (`supabase start`, Supabase CLI); the Railway deployment is the final phase.
- **Android:** distributable **release APK**, built via **EAS Build** (cloud) or local `expo prebuild` + `./gradlew assembleRelease`. EAS is the lower-friction default; final call deferred to the Phase 5 plan. Requires an Android keystore for signing. Points at the Railway backend URL.
- **Web:** Expo **web export** (`npx expo export --platform web` → static `dist/`) **deployed to Railway** as the browser version (static hosting). Same (Railway-hosted) Supabase backend — so Railway runs both the web front-end and the backend.
- **iOS:** not a launch target, but the Expo stack keeps it available later at low marginal cost.

## 5. Data model (Postgres / Supabase)

```
profiles        id (uuid, = auth.users.id) · discord_id (text) · username (text, unique)
                · display_name · avatar_url · bio · created_at · updated_at

groups          id (uuid) · name (text) · invite_code (text, unique, 6-char)
                · owner_id (uuid → profiles) · discord_webhook_url (text, null) · created_at

group_members   group_id (uuid → groups) · user_id (uuid → profiles)
                · role (text: 'owner' | 'member') · joined_at        PK (group_id, user_id)

categories      id · slug (unique) · name · icon · sort_order        ← seeded fixed set

items           id (uuid) · group_id (→ groups) · name · normalized_name
                · category_id (→ categories) · image_url (null) · created_by (→ profiles) · created_at
                · rating_count · total_score · average_score (numeric 3,1) · highest_score · lowest_score
                UNIQUE (group_id, normalized_name)                    ← ScawwyRate dedup, ported

ratings         id (uuid) · item_id (→ items) · group_id (→ groups, denormalized)
                · user_id (→ profiles) · score (int, CHECK 1–10) · comment (text, null)
                · photo_url (null) · visited_at (date, null) · review_count (default 1)
                · comment_count (default 0) · created_at · updated_at
                UNIQUE (user_id, item_id)                             ← one rating per user/item

rating_history  id (uuid) · rating_id (→ ratings) · previous_score · previous_comment
                · previous_photo_url · changed_at                     ← everrate re-review bonus

comments        id (uuid) · rating_id (→ ratings) · user_id (→ profiles) · body · created_at
```

**Triggers (port everrate's pattern; replaces ScawwyRate's Cloud Functions for stats):**
- `handle_new_user()` — on `auth.users` insert, create a `profiles` row, populating `discord_id` / `username` / `avatar_url` from Discord OAuth metadata (`raw_user_meta_data`).
- `handle_updated_at()` — maintain `updated_at` on `profiles`, `ratings`.
- `snapshot_rating_before_update()` — BEFORE UPDATE on `ratings`, write the old values to `rating_history` and bump `review_count`.
- `update_item_rating_stats()` — AFTER INSERT/UPDATE/DELETE on `ratings`, recompute the parent item's `rating_count`/`total_score`/`average_score`/`highest_score`/`lowest_score`.
- `update_rating_comment_count()` — AFTER INSERT/DELETE on `comments`, maintain `ratings.comment_count`.

**RLS (the genuinely new complexity vs. everrate's public model):**
- Helper `is_group_member(gid, uid)` as a `SECURITY DEFINER` function to avoid recursive RLS on `group_members`.
- `profiles`: authenticated read (needed to render usernames/avatars); write own only.
- `groups`: read if member; insert by authenticated (owner = self); update/delete by owner.
- `group_members`: read rows for groups you belong to; leave (delete self); owner may remove members.
- `items` / `ratings` / `rating_history` / `comments`: read if member of the row's group; write own content within groups you belong to.
- **Join-by-code** via a `SECURITY DEFINER` RPC `join_group(code text)` so a user can look up + join a group by its invite code without `groups` being world-readable.

**Storage buckets:** `item-images`, `rating-photos`, `avatars` (avatars typically sourced from Discord CDN, but bucket kept for overrides).

## 6. Discord integration

**Auth:** Supabase Auth has a built-in Discord OAuth provider. Use `supabase.auth.signInWithOAuth({ provider: 'discord' })` with an Expo `makeRedirectUri()` deep link (scheme `scawwyrate://`). Follow everrate's existing `expo-web-browser` / OAuth pattern; needs platform-specific redirect handling for native vs. web. Scopes: `identify`, `email`.

**Webhook posting:** A Supabase **Edge Function** `post-rating-to-discord`, triggered on new `ratings` rows (via a Database Webhook or `pg_net` call from an `AFTER INSERT` trigger). It loads the group's `discord_webhook_url`, the item, and the rater's profile, then POSTs a **color-coded embed** (green/yellow/orange/red by score band — ported from ScawwyRate). No-op if the group has no webhook configured. The outbound HTTP call lives in the Edge Function, not the DB transaction.

## 7. Screens (Expo Router → iOS / Android / web)

1. **Auth** — Discord login (replaces placeholder `login.tsx`).
2. **Onboarding** — username (prefilled from Discord), editable.
3. **Groups** — list (your groups) · create · join-by-code · settings (name, Discord webhook, members, leave/delete).
4. **Group feed** — recent ratings in the selected group.
5. **Add rating** — pick-or-create item (with dedup) → choose category → score (1–10) + photo + comment → submit.
6. **Item detail** — item info + all ratings + score stats.
7. **Rating detail** — rating + comments + re-review history.
8. **Stats** — tabs: Top Rated · Most Rated · By Category · Leaderboard (per group).
9. **Profile** — your profile + your ratings across groups.

## 8. Phasing (each phase = its own plan → build cycle)

- **Phase 0 — Foundation reset.** Rename project to ScawwyRate; strip the drinks domain; stand up a **local Supabase** dev instance (Supabase CLI); wire **Discord auth** via Supabase's Discord provider; create the new schema + RLS + triggers as migrations; tag the old Android repo, repoint remote. *Exit:* Discord login lands on an empty Home, on iOS + Android + web, against local Supabase.
- **Phase 1 — Groups.** Create / join-by-code / list / settings; membership + RLS; invite-code RPC. *Exit:* you can create a group and a second account can join it.
- **Phase 2 — Items & Ratings.** Add item (with dedup), rate (score + photo + comment), item detail, group feed; stat triggers live. *Exit:* a group can accumulate rated items with correct aggregate stats.
- **Phase 3 — Stats & re-review.** Stats dashboard (top/most/by-category/leaderboard), comments, re-review history. *Exit:* full read experience.
- **Phase 4 — Discord posting.** Edge Function + trigger; color-coded embed. *Exit:* configuring a group webhook posts new ratings to Discord.
- **Phase 5 — Build & deploy.** Deploy the **self-hosted Supabase stack to Railway** (Docker), apply all migrations + seed + deploy Edge Functions against it, configure the Discord OAuth redirect for the Railway domain; deploy the **Expo web export to Railway**; build the **signed Android release APK** (EAS or local Gradle) pointed at the Railway backend URL; smoke-test Discord auth + a full rate flow on a real Android device and on the web URL. *Exit:* an installable APK **and** a live Railway web URL, **both talking to the self-hosted Supabase backend running on Railway**.

## 9. Risks & things to verify at plan time

- **RLS for group-scoped access is the main new risk.** Get the `SECURITY DEFINER` membership helper right to avoid recursive-policy errors; this is the #1 thing to test early.
- **Discord OAuth across all three platforms** (iOS/Android/web) has platform-specific redirect handling — verify against current Supabase + `expo-auth-session` docs (Context7) during Phase 0.
- **Triggering the Edge Function** — decide between Supabase Database Webhooks vs. `pg_net` from a trigger; verify current best practice.
- **Reusing the ScawwyRate GitHub repo overwrites working Android code** — **tag/branch it first** (e.g. `android-legacy`) so it's recoverable.
- **Pre-existing uncommitted WIP in the everrate repo** (24 changed files from Feb, drinks-app work) is unrelated to this rebuild and will be superseded; confirm with the user whether to stash/discard before starting Phase 0.
- **APK signing & build pipeline** — pick EAS Build vs local Gradle early; the Android keystore is a one-time setup gotcha (and must be backed up).
- **Discord OAuth redirect for the web build on Railway** — the Supabase Discord provider must list the Railway web domain (and the native `scawwyrate://` scheme) as allowed redirect URLs; verify once the Railway URL exists.
- **Self-hosting Supabase on Railway is the biggest new ops risk.** It's ~7 services; plan for a persistent Postgres volume + backups, generating the JWT/`anon`/`service_role` keys, Kong gateway routing, and wiring Discord OAuth secrets into GoTrue. Start from a known Supabase-on-Railway template / `docker-compose`, and verify against current Supabase self-hosting docs at deploy time.
- **Dev/prod parity:** keep dev on local Supabase pinned to the **same image versions** as the Railway deployment, so migrations and Edge Functions behave identically.

## 10. Open questions (non-blocking; can resolve at plan time)

- ~~Reuse everrate's existing Supabase project?~~ **Resolved:** dev uses a fresh **local** Supabase instance (CLI); prod is **self-hosted Supabase on Railway**. No managed Supabase cloud project is used.
- Keep everrate's dark neon-green theme, or restyle for ScawwyRate? (Default: keep — it's good and free.)
- Visited-date on ratings (from ScawwyRate) — keep as an optional field? (Default: yes, it's cheap.)
