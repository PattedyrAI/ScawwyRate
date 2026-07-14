# Android release build (signed APK)

The `android/` directory is generated (CNG) and gitignored — these steps re-apply after any `expo prebuild`.

## One-time (done 2026-07-14)
- Keystore: `~/keystores/scawwyrate-release.jks` (alias `scawwyrate`), password in `~/keystores/scawwyrate-release.storepass` (both chmod 600). **Back these up — losing them means losing the app's signing identity.**
- Signing properties in `~/.gradle/gradle.properties` (global, never committed): `SCAWWYRATE_RELEASE_STORE_FILE / _STORE_PASSWORD / _KEY_ALIAS / _KEY_PASSWORD`.

## Per build
1. `npx expo prebuild --platform android` (if `android/` is missing or config changed).
2. In `android/app/build.gradle`:
   - add to `signingConfigs`:
     ```groovy
     release {
         storeFile file(SCAWWYRATE_RELEASE_STORE_FILE)
         storePassword SCAWWYRATE_RELEASE_STORE_PASSWORD
         keyAlias SCAWWYRATE_RELEASE_KEY_ALIAS
         keyPassword SCAWWYRATE_RELEASE_KEY_PASSWORD
     }
     ```
   - in `buildTypes.release`, change `signingConfig signingConfigs.debug` → `signingConfig signingConfigs.release`.
3. Build with the production backend baked in:
   ```bash
   cd android && EXPO_PUBLIC_SUPABASE_URL=<prod-url> EXPO_PUBLIC_SUPABASE_ANON_KEY=<prod-anon-key> \
     ./gradlew app:assembleRelease -x lint -x test
   ```
4. Output: `android/app/build/outputs/apk/release/app-release.apk`. Verify: `apksigner verify --print-certs <apk>` → `CN=ScawwyRate`.

Status 2026-07-14: pipeline proven end-to-end with a placeholder URL (`https://api.scawwyrate.example`); rebuild with the real URL once the backend (Phase 5, Railway-blocked) exists. Placeholder-URL APK archived at `~/keystores/scawwyrate-release-placeholder-url.apk`.
