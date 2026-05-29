# ScawwyRate Phase 0 — Foundation Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the local `everrate` Expo/Supabase codebase into **ScawwyRate**, swap auth to **Discord** (via a **local** Supabase instance), stand up the `profiles` foundation, and prove the loop: Discord login → empty Home on Android + web (+ iOS if available).

**Architecture:** Reuse everrate's infra (Supabase client, React Query, Zustand, theme, shared UI, Expo Router shell). Delete the drinks domain. Run Supabase **locally** via the CLI for dev; the self-hosted-Supabase-on-Railway deployment is Phase 5, not now. Auth uses Supabase's native Discord OAuth provider, reusing everrate's existing `expo-web-browser` OAuth pattern with a web/native branch.

**Tech Stack:** Expo SDK 54 / React Native 0.81 / React 19 / TypeScript 5.9; Expo Router 6; `@supabase/supabase-js` 2.97; Supabase CLI 2.90 (local Postgres+Auth+Storage via Docker 29); Zustand 5; TanStack React Query 5.

**Scope note (refinement of the spec's phasing):** The design spec lists "create the new schema" under Phase 0. This plan intentionally builds **only the `profiles` table + auth triggers + RLS** in Phase 0 — that is all that login→home exercises. The group-scoped schema (`groups`, `group_members`, `categories`, `items`, `ratings`, `rating_history`, `comments`), its RLS, and the two-account *group* membership test move to **Phase 1**, where they are first used and actually testable. Phase 0 still includes a two-account RLS test, scoped to `profiles` (user B cannot edit user A's profile).

**Spec:** `docs/superpowers/specs/2026-05-29-scawwyrate-cross-platform-rebuild-design.md`

---

## Prerequisites (human, one-time — do before Task 1)

These need a human with the relevant accounts. Document the outputs; later tasks consume them.

- [ ] **P1: Create a Discord application** at <https://discord.com/developers/applications> → "New Application" named "ScawwyRate".
  - Under **OAuth2**, copy the **Client ID** and **Client Secret**.
  - Under **OAuth2 → Redirects**, add: `http://127.0.0.1:54321/auth/v1/callback` and `http://localhost:54321/auth/v1/callback` (the local Supabase GoTrue callback; Discord allows http for localhost/127.0.0.1). The Railway production callback is added in Phase 5.
  - Record Client ID + Secret in a password manager (they go into a git-ignored `.env`, never committed).
- [ ] **P2: Confirm Docker Desktop is running** (`docker ps` succeeds) — the local Supabase stack needs it.

---

## Task 1: Preserve the legacy code, then rename project to ScawwyRate

**Files:**
- Modify: `package.json:2` (name)
- Modify: `app.json` (name, slug, scheme, ios.bundleIdentifier, android.package, plugins, permission strings)

- [ ] **Step 1: Set aside the unrelated WIP and confirm the branch.**

The repo has 24 uncommitted drinks-app changes from February that are being superseded. Set them aside (recoverable via `git stash list`) and confirm we're on the rebuild branch.

Run:
```bash
cd /Users/pattedyr/Documents/coding_projects/everrate
git status --short | head
git stash push -u -m "everrate drinks WIP (pre-ScawwyRate rebuild)"
git branch --show-current   # expect: scawwyrate-rebuild
```
Expected: stash created; branch is `scawwyrate-rebuild`; `git status` clean except this plan/spec.

- [ ] **Step 2: Preserve the existing ScawwyRate Android repo (separate GitHub repo).**

The old native-Android ScawwyRate lives at `github.com/PattedyrAI/ScawwyRate`. Before its code is eventually replaced (Phase 5), tag it so it is recoverable. This touches the *remote* repo — confirm with the user before running.

Run (from a clone of that repo, or skip until Phase 5 if not cloned locally):
```bash
# Only if a local clone of the Android ScawwyRate exists; otherwise defer to Phase 5.
# git tag android-legacy && git push origin android-legacy
```
Expected: a recoverable `android-legacy` tag exists, OR this is explicitly deferred to Phase 5 (note it in the commit message).

- [ ] **Step 3: Rename in `package.json`.**

Change line 2 from `"name": "everrate",` to:
```json
  "name": "scawwyrate",
```

- [ ] **Step 4: Rewrite `app.json`** to the ScawwyRate identity and drop Apple sign-in.

Replace the entire file with:
```json
{
  "expo": {
    "name": "ScawwyRate",
    "slug": "scawwyrate",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "scheme": "scawwyrate",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#0a0a0f"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.scawwyrate.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0a0a0f"
      },
      "package": "com.scawwyrate.app",
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-font",
      [
        "expo-camera",
        {
          "cameraPermission": "Allow ScawwyRate to access your camera to take photos of things you rate."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow ScawwyRate to access your photos to add images to ratings."
        }
      ],
      "expo-web-browser"
    ]
  }
}
```
Note: `usesAppleSignIn` and the `expo-apple-authentication` plugin are removed (Discord-only auth).

- [ ] **Step 5: Verify the app still type-checks and the config is valid.**

Run:
```bash
npx tsc --noEmit
npx expo config --type public > /dev/null && echo "app.json OK"
```
Expected: `tsc` may still report errors from the not-yet-deleted drinks code (that's fine for now); `app.json OK` prints.

- [ ] **Step 6: Commit.**

```bash
git add package.json app.json
git commit -m "chore: rename everrate -> ScawwyRate, drop Apple sign-in"
```

---

## Task 2: Discord-only auth service

**Files:**
- Modify: `src/features/auth/auth.service.ts` (replace Apple/Google with Discord)
- Modify: `src/lib/supabase.ts` (web needs `detectSessionInUrl`)
- Modify: `package.json` (remove `expo-apple-authentication`)

- [ ] **Step 1: Make the Supabase client web-aware.**

On web, Supabase must auto-detect the session from the redirect URL; on native we extract tokens manually. Replace `src/lib/supabase.ts` with:
```ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const isWeb = Platform.OS === 'web';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // On native, persist via AsyncStorage. On web, supabase-js uses localStorage by default.
    storage: isWeb ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Web: detect the OAuth session returned in the URL. Native: we set it manually.
    detectSessionInUrl: isWeb,
  },
});
```

- [ ] **Step 2: Replace `src/features/auth/auth.service.ts`** with a Discord-only implementation that branches web vs native.

```ts
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import type { Profile } from '@/types/database';

// Required for web OAuth popups to complete.
WebBrowser.maybeCompleteAuthSession();

/**
 * Sign in with Discord via Supabase OAuth.
 * - Web: full-page redirect; supabase-js auto-detects the session on return.
 * - Native: open the auth session in a browser, then extract tokens from the redirect URL.
 */
export async function signInWithDiscord() {
  const redirectTo = makeRedirectUri();

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo, scopes: 'identify email' },
    });
    if (error) throw error;
    return; // browser redirects away; session is detected on return
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: { redirectTo, skipBrowserRedirect: true, scopes: 'identify email' },
  });
  if (error) throw error;
  if (!data.url) throw new Error('No OAuth URL returned');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') throw new Error('OAuth cancelled');

  const url = new URL(result.url);
  const params = new URLSearchParams(url.hash.substring(1)); // tokens in the fragment
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) throw new Error('No tokens in OAuth redirect');

  const { data: session, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (sessionError) throw sessionError;
  return session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return data;
}
```

- [ ] **Step 3: Remove the Apple auth dependency.**

Run:
```bash
npm uninstall expo-apple-authentication
```
Expected: `package.json` no longer lists `expo-apple-authentication`.

- [ ] **Step 4: Commit.**

```bash
git add src/features/auth/auth.service.ts src/lib/supabase.ts package.json package-lock.json
git commit -m "feat(auth): Discord-only OAuth service with web/native branch"
```

---

## Task 3: Strip the drinks domain and reduce to a single Home tab

**Files:**
- Delete: drinks screens & feature folders (listed below)
- Modify: `src/app/_layout.tsx`, `src/app/index.tsx`, `src/app/(auth)/_layout.tsx`
- Create: `src/app/(tabs)/_layout.tsx` (single Home tab — overwrite), `src/app/(tabs)/index.tsx` (placeholder Home, replaced in Task 7)

- [ ] **Step 1: Delete drinks-domain screens and features.**

Run:
```bash
cd /Users/pattedyr/Documents/coding_projects/everrate
git rm -r \
  "src/app/(tabs)/(feed)" \
  "src/app/(tabs)/(activity)" \
  "src/app/(tabs)/(rate)" \
  "src/app/(tabs)/(search)" \
  "src/app/(tabs)/(profile)" \
  "src/app/(auth)/username.tsx" \
  "src/app/product" \
  "src/app/rating" \
  "src/app/user" \
  "src/features/products" \
  "src/features/ratings" \
  "src/features/social" \
  "src/features/notifications" \
  "src/features/profile" \
  "src/lib/mockData.ts" \
  "src/lib/isDevMode.ts"
```
Expected: files removed (some, like `mockData.ts`/`isDevMode.ts`, may be untracked → use `rm -f` if `git rm` errors on those two).

> Keep: `src/features/auth`, `src/shared/*`, `src/theme/*`, `src/lib/{supabase,queryClient,queryKeys}.ts`, `src/stores/*`, `src/types/*` (regenerated in Task 5).

- [ ] **Step 2: Overwrite `src/app/(tabs)/_layout.tsx`** with a single Home tab (no notifications dependency).

```tsx
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="home" color={color} size={size} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.tabBarBackground,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
  },
  tabBarLabel: { fontSize: 10, fontWeight: '600' },
});
```

- [ ] **Step 3: Create a temporary `src/app/(tabs)/index.tsx`** (replaced in Task 7) so the route resolves.

```tsx
import { View } from 'react-native';
import { Text } from '@/shared/components/ui';
import { colors } from '@/theme';

export default function Home() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <Text>Home (placeholder)</Text>
    </View>
  );
}
```
> If `@/shared/components/ui` does not re-export `Text`, import directly from its file (verify with `cat src/shared/components/ui/index.ts`).

- [ ] **Step 4: Update `src/app/index.tsx`** to redirect a signed-in user to the new Home route.

Change the final redirect (line 22) from `href="/(tabs)/(feed)"` to:
```tsx
  return <Redirect href="/(tabs)" />;
```

- [ ] **Step 5: Update `src/app/(auth)/_layout.tsx`** to drop the removed `username` screen.

Replace the `<Stack>` children so only `welcome` and `login` remain:
```tsx
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
```

- [ ] **Step 6: Update `src/app/_layout.tsx`** to drop the deleted modal routes.

Remove the three `<Stack.Screen>` entries for `rating/[id]`, `product/[id]`, and `user/[id]` (lines 45–56), leaving only `(auth)` and `(tabs)`.

- [ ] **Step 7: Type-check. Expect remaining errors only from the welcome screen (fixed in Task 6).**

Run:
```bash
npx tsc --noEmit
```
Expected: errors should now be limited to `src/app/(auth)/welcome.tsx` and `login.tsx` referencing removed code (resolved in Task 6). No errors referencing `features/products|ratings|social|notifications`.

- [ ] **Step 8: Commit.**

```bash
git add -A
git commit -m "refactor: strip drinks domain, reduce to single Home tab"
```

---

## Task 4: Initialize local Supabase with the Discord provider

**Files:**
- Delete: `supabase/migrations/001_initial_schema.sql`, `supabase/seed.sql` (drinks schema)
- Create: `supabase/config.toml` (via `supabase init`), `.env`, update `.env.example`

- [ ] **Step 1: Remove the old drinks schema + seed.**

```bash
cd /Users/pattedyr/Documents/coding_projects/everrate
git rm supabase/migrations/001_initial_schema.sql supabase/seed.sql
```

- [ ] **Step 2: Initialize Supabase locally.**

```bash
supabase init   # creates supabase/config.toml; accept defaults; do NOT overwrite VS Code settings if prompted
```
Expected: `supabase/config.toml` created. `project_id` defaults to `everrate` (the folder name) — change it next.

- [ ] **Step 3: Edit `supabase/config.toml`.**

Set the project id and configure auth redirect + the Discord external provider. Change `project_id` to:
```toml
project_id = "scawwyrate"
```
In the `[auth]` section, set the site URL and allowed redirects to include the Expo dev + native scheme:
```toml
[auth]
enabled = true
site_url = "http://localhost:8081"
additional_redirect_urls = ["scawwyrate://", "http://localhost:8081", "exp://"]
jwt_expiry = 3600
enable_signup = true
```
Append the Discord provider block (verify exact key names against `supabase config.toml` docs; this is the documented shape):
```toml
[auth.external.discord]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_DISCORD_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_DISCORD_SECRET)"
redirect_uri = "http://127.0.0.1:54321/auth/v1/callback"
```

- [ ] **Step 4: Create `.env`** (git-ignored) with the Discord secrets + placeholder Supabase local vars (filled after `supabase start` in Task 5).

```bash
cat > .env <<'EOF'
# Discord OAuth (from the Discord developer portal — DO NOT COMMIT)
SUPABASE_AUTH_EXTERNAL_DISCORD_CLIENT_ID=__paste_discord_client_id__
SUPABASE_AUTH_EXTERNAL_DISCORD_SECRET=__paste_discord_client_secret__

# Local Supabase (filled in from `supabase start` output in Task 5)
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=__paste_local_anon_key__
EOF
```
Replace the `__paste_*__` placeholders with the real Discord Client ID/Secret from Prerequisite P1.

- [ ] **Step 5: Confirm `.env` is git-ignored.**

Run:
```bash
git check-ignore .env && echo "ignored OK" || echo "ADD .env TO .gitignore"
```
If not ignored, add `.env` to `.gitignore` and commit that.

- [ ] **Step 6: Update `.env.example`** (committed) with the key names only (no values):

```bash
cat > .env.example <<'EOF'
SUPABASE_AUTH_EXTERNAL_DISCORD_CLIENT_ID=
SUPABASE_AUTH_EXTERNAL_DISCORD_SECRET=
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EOF
```

- [ ] **Step 7: Commit (config + example only — never the real `.env`).**

```bash
git add supabase/config.toml .env.example .gitignore
git rm --cached .env 2>/dev/null || true   # ensure secrets never staged
git commit -m "chore(supabase): init local stack + Discord provider config"
```

---

## Task 5: `profiles` foundation migration + triggers + RLS

**Files:**
- Create: `supabase/migrations/<timestamp>_profiles_foundation.sql` (via `supabase migration new`)
- Create/Regenerate: `src/types/database.ts`

- [ ] **Step 1: Create the migration file.**

```bash
supabase migration new profiles_foundation
```
Expected: prints a path like `supabase/migrations/20260529NNNNNN_profiles_foundation.sql`. Put the SQL below into that file.

- [ ] **Step 2: Write the migration SQL** (paste into the new file):

```sql
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
```

- [ ] **Step 3: Start Supabase and apply the migration.**

```bash
supabase start          # boots Postgres+Auth+Storage in Docker; prints URL + keys
supabase db reset       # applies migrations (and empty seed)
```
Expected: `supabase start` prints `API URL: http://127.0.0.1:54321` and an `anon key`. Copy the anon key into `.env` (`EXPO_PUBLIC_SUPABASE_ANON_KEY`). `db reset` ends with "Finished supabase db reset".

- [ ] **Step 4: Generate TypeScript types from the local DB.**

```bash
supabase gen types typescript --local > src/types/database.ts
```
Expected: `src/types/database.ts` now defines `Database` with the `profiles` row. Confirm `Profile` is exported — if the old file exported `export type Profile = Tables<'profiles'>`, re-add that helper at the bottom:
```ts
export type Profile = Database['public']['Tables']['profiles']['Row'];
```

- [ ] **Step 5: Type-check.**

```bash
npx tsc --noEmit
```
Expected: no errors referencing `profiles`/`Profile`. (Welcome/login screen errors resolved in Task 6.)

- [ ] **Step 6: Commit (migration + types only).**

```bash
git add supabase/migrations src/types/database.ts
git commit -m "feat(db): profiles table + handle_new_user (Discord) + RLS"
```

---

## Task 6: Discord login screen + welcome screen

**Files:**
- Modify: `src/app/(auth)/welcome.tsx` (remove drinks copy / Apple+Google buttons)
- Modify: `src/app/(auth)/login.tsx` (Discord button)

- [ ] **Step 1: Inspect the current welcome screen** to see what it references.

```bash
sed -n '1,80p' "src/app/(auth)/welcome.tsx"
```
Expected: identify imports of removed auth functions (`signInWithApple`/`signInWithGoogle`) — these must go.

- [ ] **Step 2: Replace `src/app/(auth)/welcome.tsx`** with a minimal branded welcome that routes to login.

```tsx
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Text, Button } from '@/shared/components/ui';
import { colors, spacing } from '@/theme';

export default function Welcome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ScawwyRate</Text>
      <Text style={styles.subtitle}>Rate anything, with your friends.</Text>
      <Button title="Get started" onPress={() => router.push('/(auth)/login')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 36, fontWeight: '800', color: colors.primary },
  subtitle: { fontSize: 16, color: colors.textMuted, marginBottom: spacing.lg, textAlign: 'center' },
});
```
> Verify `Text`, `Button` are exported from `@/shared/components/ui` and that `spacing` is exported from `@/theme`; adjust imports to the real export names if needed (`cat src/shared/components/ui/index.ts`, `cat src/theme/index.ts`).

- [ ] **Step 3: Replace `src/app/(auth)/login.tsx`** with a working Discord sign-in.

```tsx
import { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button } from '@/shared/components/ui';
import { signInWithDiscord } from '@/features/auth/auth.service';
import { colors, spacing } from '@/theme';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  async function onDiscord() {
    try {
      setLoading(true);
      await signInWithDiscord();
      // On success the root _layout's onAuthStateChange picks up the session
      // and index.tsx redirects to /(tabs). No manual navigation needed.
    } catch (e: any) {
      Alert.alert('Sign-in failed', e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
      <Button title={loading ? 'Connecting…' : 'Continue with Discord'} onPress={onDiscord} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
});
```

- [ ] **Step 4: Type-check — expect zero errors now.**

```bash
npx tsc --noEmit
```
Expected: clean (no errors).

- [ ] **Step 5: Commit.**

```bash
git add "src/app/(auth)/welcome.tsx" "src/app/(auth)/login.tsx"
git commit -m "feat(auth): welcome + Discord login screens"
```

---

## Task 7: Real empty Home (proves the signed-in loop)

**Files:**
- Modify: `src/app/(tabs)/index.tsx` (show the signed-in user + sign out)

- [ ] **Step 1: Replace `src/app/(tabs)/index.tsx`** to read the profile and offer sign-out.

```tsx
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Avatar } from '@/shared/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { getProfile, signOut } from '@/features/auth/auth.service';
import type { Profile } from '@/types/database';
import { colors, spacing } from '@/theme';

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user?.id) getProfile(user.id).then(setProfile).catch(() => {});
  }, [user?.id]);

  return (
    <View style={styles.container}>
      {profile?.avatar_url ? <Avatar uri={profile.avatar_url} size={72} /> : null}
      <Text style={styles.hello}>
        {profile ? `Signed in as @${profile.username}` : 'Loading profile…'}
      </Text>
      <Text style={styles.note}>Groups & ratings arrive in Phase 1.</Text>
      <Button title="Sign out" onPress={() => signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md },
  hello: { fontSize: 20, fontWeight: '700', color: colors.text },
  note: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md },
});
```
> Verify `Avatar`'s prop name (`uri` vs `url` vs `source`) against `src/shared/components/ui/Avatar.tsx`; adjust.

- [ ] **Step 2: Type-check.**

```bash
npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add "src/app/(tabs)/index.tsx"
git commit -m "feat(home): signed-in Home with profile + sign out"
```

---

## Task 8: profiles RLS verification (two simulated users)

**Files:**
- Create: `supabase/tests/profiles_rls.sql` (runnable SQL assertions)

- [ ] **Step 1: Write a SQL verification script** that impersonates two users and proves user B cannot edit user A's profile.

Create `supabase/tests/profiles_rls.sql`:
```sql
-- Run with: psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" -f supabase/tests/profiles_rls.sql
-- Seeds two auth users + profiles, then asserts RLS via JWT-claim impersonation.
-- Connects as the local `postgres` superuser, so it can disable the signup trigger.
begin;

-- Disable handle_new_user so we control the profile rows (deterministic usernames),
-- instead of the trigger auto-deriving them from metadata.
alter table auth.users disable trigger on_auth_user_created;

-- Two fake auth users.
-- NOTE: if this insert errors on a NOT NULL column, your GoTrue version requires more
-- columns — add e.g. confirmation_token='' , email_change='' , recovery_token='' (all ''),
-- created_at=now(). Local Supabase typically accepts this minimal form.
insert into auth.users (id, aud, role, email)
values ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'a@test.dev'),
       ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'b@test.dev')
on conflict (id) do nothing;

insert into public.profiles (id, username) values
  ('11111111-1111-1111-1111-111111111111', 'alice'),
  ('22222222-2222-2222-2222-222222222222', 'bob')
on conflict (id) do nothing;

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
```

- [ ] **Step 2: Run it.**

```bash
psql "$(supabase status -o env | grep '^DB_URL' | cut -d= -f2- | tr -d '"')" -f supabase/tests/profiles_rls.sql
```
Expected output includes `RLS OK: Bob cannot edit Alice` and `RLS OK: Bob edited his own profile`, and no `RLS FAIL`.

- [ ] **Step 3: Commit.**

```bash
git add supabase/tests/profiles_rls.sql
git commit -m "test(db): profiles RLS — owner-only updates"
```

---

## Task 9: End-to-end login verification on real platforms

No code changes — this is the Phase 0 exit gate. A dev build is required (OAuth deep links do not work in Expo Go).

- [ ] **Step 1: Confirm `.env` has the local anon key + Discord secrets**, and Supabase is running.

```bash
supabase status   # API URL + anon key shown; ensure .env matches
```

- [ ] **Step 2: Run on web** (fastest path; validates `detectSessionInUrl`).

```bash
npx expo start --web
```
Manual: click **Get started → Continue with Discord** → authorize → you land on **Home** showing `Signed in as @<discordname>`. Sign out returns to welcome.

- [ ] **Step 3: Confirm the profile row was created** by the trigger.

```bash
psql "$(supabase status -o env | grep '^DB_URL' | cut -d= -f2- | tr -d '"')" \
  -c "select id, discord_id, username, display_name, avatar_url is not null as has_avatar from public.profiles;"
```
Expected: one row for your Discord account; `discord_id` populated. **If `discord_id` is null or `username` looks wrong, inspect the real metadata keys** and adjust `handle_new_user` (Task 5):
```bash
psql "$(supabase status -o env | grep '^DB_URL' | cut -d= -f2- | tr -d '"')" \
  -c "select raw_user_meta_data from auth.users limit 1;"
```
Then edit the migration, `supabase db reset`, re-run, and amend the Task 5 commit.

- [ ] **Step 4: Run on Android** (dev build, real device or emulator).

```bash
npx expo run:android   # builds a dev client APK and installs it
```
Manual gotcha: a physical device cannot reach `127.0.0.1`. For device testing, set `EXPO_PUBLIC_SUPABASE_URL` to your machine's LAN IP (e.g. `http://192.168.x.x:54321`) and add that origin to `additional_redirect_urls` in `config.toml`, then `supabase stop && supabase start`. For the Android **emulator**, use `http://10.0.2.2:54321`. Verify the same login → Home loop.

- [ ] **Step 5 (optional): Run on iOS** if on a Mac with Xcode.

```bash
npx expo run:ios
```
Verify the same loop.

- [ ] **Step 6: Phase 0 exit checklist (tick all).**

  - [ ] `npx tsc --noEmit` is clean
  - [ ] `supabase db reset` applies migrations with no error
  - [ ] `supabase/tests/profiles_rls.sql` passes (Task 8)
  - [ ] Discord login → Home works on **web** and **Android**
  - [ ] A `profiles` row is auto-created with a populated `discord_id`
  - [ ] Sign out returns to welcome

- [ ] **Step 7: Final commit / tag the milestone.**

```bash
git add -A
git commit -m "chore: Phase 0 complete — Discord login -> Home on local Supabase" --allow-empty
git tag phase-0-foundation
```

---

## Self-review notes (author)

- **Spec coverage:** Phase 0 spec items — rename ✅(T1), strip drinks ✅(T3), local Supabase ✅(T4), Discord auth ✅(T2,T6), schema+RLS+triggers ✅(T5, scoped to `profiles` per the refinement note), repo tag/repoint ✅(T1S2, partly deferred to Phase 5 with rationale), empty Home on 3 platforms ✅(T7,T9). Group-scoped schema is explicitly deferred to Phase 1.
- **No placeholders:** every code/SQL/command step contains the actual content. The only intentional human-supplied values are the Discord Client ID/Secret and the printed local anon key, with explicit "paste here" markers.
- **Type/name consistency:** `signInWithDiscord`/`signOut`/`getProfile` defined in T2 and consumed in T6/T7; `Profile` type defined in T5 and used in T7; Home route `(tabs)/index.tsx` created in T3, referenced by redirect in T3S4, finalized in T7.
- **Known verify-at-runtime points (flagged inline):** exact Discord `raw_user_meta_data` keys (T9S3), `@/shared/components/ui` export names + `Avatar` prop (T3/T6/T7), and the `[auth.external.discord]` config key shape (T4S3).
