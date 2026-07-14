# ScawwyRate Phase 4 — Discord Webhook Posting Implementation Plan

**Goal:** Configuring a group webhook posts new ratings to the group's Discord channel as color-coded embeds. **Exit (spec §8):** a configured webhook receives a POST for a new rating (verified end-to-end against a local capture server; the literal Discord round-trip needs Patrick's server/webhook URL and is a manual checklist item like the OAuth one).

**Execution note:** in-session (subagent dispatch paused).

**Design decisions (deviations from the spec, with rationale):**
1. **`pg_net` from an AFTER trigger replaces the Edge Function.** The spec's own risk list (§9) said "decide between Database Webhooks vs `pg_net`" — Supabase Database Webhooks *are* `pg_net` triggers. `net.http_post` is asynchronous (queued in `net.http_request_queue`, sent by a background worker), so the spec's real requirement — "the outbound HTTP call [must not live] in the DB transaction" — is satisfied. Bonus: the self-hosted Railway stack (Phase 5) no longer needs the edge-runtime service at all, and the locally-disabled edge runtime (Docker EPERM) stops being a blocker.
2. **Webhook URL moves to an owner-scoped `group_webhooks` table** (Phase 1 final-review note: the URL is a bearer credential, and `groups` rows are member-readable). Now that posting is server-mediated (trigger reads it as definer), only the owner ever needs to read/write it. `groups.discord_webhook_url` is migrated in and dropped.
3. **Posting fires on INSERT always, and on UPDATE only when the score changed** (re-review), marked as an update in the embed. Color bands ported from the legacy app: ≥8 green, 6–7 yellow, 4–5 orange, ≤3 red.
4. **Trigger is fail-open:** if queuing the HTTP call throws for any reason, the rating write still commits (exception swallowed with a warning) — a broken webhook must never block rating.

## Task 1: Migration `discord_posting`
- `create extension if not exists pg_net` (idempotent; already installed locally).
- `group_webhooks(group_id pk → groups on delete cascade, url text check discord prefix, updated_at)`; RLS owner-only for select/insert/update/delete via `is_group_owner`; explicit grants (authenticated: select/insert/update/delete — all owner-gated by RLS; service_role: full).
- Migrate existing `groups.discord_webhook_url` values in; drop the column (and regenerate types — `Group` loses the field).
- `post_rating_to_discord()` SECURITY DEFINER trigger fn: joins webhook + item + profile + group name, builds the embed JSON, `net.http_post(url, body)`; separate AFTER INSERT and AFTER UPDATE (score changed) triggers on `ratings`; fail-open exception handler; EXECUTE revoked from client roles.
- Verify: reset clean; triggers exist; anon/authenticated lack EXECUTE.

## Task 2: SQL test `supabase/tests/discord_posting_rls.sql`
Seed via established pattern (fresh UUIDs cccc…/dddd…). Assert: owner can set webhook, member cannot see or set it (0 rows / RLS violation); rating INSERT with webhook configured queues exactly one row in `net.http_request_queue` with the right URL + embed fields (item name, score, username); score-change UPDATE queues one more; no-op update queues none; rating in a group with NO webhook queues none. Single begin…rollback.

## Task 3: App wiring
- Types regen; service: `getGroupWebhook(groupId)` / `setGroupWebhook(groupId, url|null)` (upsert/delete on group_webhooks); `updateGroup` loses the webhook field; settings.tsx webhook Input backed by the new hooks (owner-only UI already).
- tsc clean.

## Task 4: Exit gate
All 5 SQL suites green; tsc clean; end-to-end delivery: local capture server on host, webhook URL `http://host.docker.internal:<port>/hook` set via UI, rate something via UI, capture server logs the embed JSON. Manual item for Patrick: point a real Discord webhook at a channel and re-run. Tag `phase-4-discord-posting`.
