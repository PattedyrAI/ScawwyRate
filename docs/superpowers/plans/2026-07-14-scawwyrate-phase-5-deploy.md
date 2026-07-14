# ScawwyRate Phase 5 — Deploy: Supabase on Railway + Web + Signed APK

**Goal (spec §8):** an installable signed Android APK and a live Railway web URL, both talking to the self-hosted Supabase backend on Railway. **Execution:** in-session, Railway CLI (authenticated as patskj99@gmail.com).

**Design decisions:**
1. **No Kong, no edge runtime.** supabase-js sends `apikey` + `Authorization` itself and GoTrue/PostgREST/Storage each validate JWTs; the gateway only needs path routing → a 10-line Caddy reverse proxy (built via `railway up` from `deploy/gateway/`). Phase 4 already removed the Edge Function dependency (pg_net). Stack: **postgres (supabase image, has pg_net) + gotrue + postgrest + storage + gateway** — 5 services vs the spec's ~7.
2. **Secrets minted locally**: 32-byte JWT secret; `anon` + `service_role` HS256 JWTs signed with it (10-year exp, `iss: scawwyrate`). Stored as Railway service variables; never committed.
3. **Discord OAuth env on GoTrue ships with the placeholder creds** — auth goes live the moment Patrick's task #9 values are set (`railway variables --set` + redeploy); everything else (REST/RLS/storage/webhooks) is verifiable now with an admin-created user.
4. **Migrations applied via psql** over Railway's Postgres TCP proxy, in order; GoTrue and Storage run their own schema migrations on boot.
5. **Web**: `expo export --platform web` with prod env baked in → static Caddy file server (`deploy/web/`) on Railway.
6. **APK**: local `gradle assembleRelease`; keystore generated with keytool into `~/keystores/scawwyrate-release.jks` (OUTSIDE the repo; Patrick must back it up); signing config via `~/.gradle` project properties, not committed.
7. **Repo repoint** (spec Task): tag the legacy Android repo `android-legacy`, push it, then push this branch to `github.com/PattedyrAI/ScawwyRate` as the new default work branch. Nothing force-pushed; legacy code stays reachable via the tag.

## Tasks
1. Railway project `scawwyrate` + postgres service (supabase/postgres image, volume, password) + TCP proxy; mint secrets.
2. Apply the 5 migrations via psql; verify tables/roles/pg_net.
3. gotrue + postgrest + storage services (env wired to postgres private domain); verify each `/health`-equivalent via the gateway once it's up.
4. Gateway (Caddy) with public domain; smoke: `/auth/v1/settings` shows discord=true (after creds) / health endpoints respond; `/rest/v1/categories` with anon key returns 6 rows.
5. Web export + deploy; smoke in browser against prod.
6. Keystore + signed APK build pointed at prod URL; install on emulator to boot-check.
7. Repo repoint + push branch & tags. Exit checklist + tag `phase-5-deploy`.

**Rollback:** every service is a Railway service in one project — `railway down`/delete project removes all; DB volume snapshot via Railway dashboard before destructive changes.
