# RateIt - Technical Specification Document

## Overview

RateIt is a native Android application (Kotlin) that allows friend groups to rate anything (restaurants, movies, games, etc.) and share those ratings within private groups. Each user authenticates via Discord, and ratings can optionally be posted to a Discord channel via webhook.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Platform | Android (Native) |
| Language | Kotlin |
| Min SDK | 26 (Android 8.0) |
| Target SDK | 34 (Android 14) |
| Database | Firebase Firestore |
| Image Storage | Cloudinary |
| Authentication | Discord OAuth2 |
| Discord Integration | Webhooks (for posting ratings) |
| Backend Functions | Firebase Cloud Functions (Node.js) |
| Build System | Gradle (Kotlin DSL) |

---

## Architecture

### MVVM Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  Activities / Fragments / Composables                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     ViewModel Layer                          │
│  ViewModels with LiveData / StateFlow                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Repository Layer                          │
│  UserRepository, GroupRepository, RatingRepository           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Sources                             │
│  Firebase Firestore, Cloudinary, Discord API                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Models

### User

```kotlin
data class User(
    val id: String = "",                    // Firestore document ID (same as oderId)
    val discordId: String = "",
    val username: String = "",
    val discriminator: String = "",         // Discord #0000 tag if applicable
    val avatarUrl: String = "",
    val email: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)
```

### Group

```kotlin
data class Group(
    val id: String = "",                    // Firestore document ID
    val name: String = "",
    val inviteCode: String = "",            // 6-8 char alphanumeric code
    val ownerId: String = "",               // User ID of creator
    val memberIds: List<String> = emptyList(),
    val discordWebhookUrl: String? = null,  // Optional Discord channel webhook
    val createdAt: Long = System.currentTimeMillis()
)
```

### Item

```kotlin
data class Item(
    val id: String = "",                    // Firestore document ID
    val groupId: String = "",
    val name: String = "",                  // Display name: "Pizza Palace"
    val normalizedName: String = "",        // For matching: "pizza palace"
    val category: String = "",              // "Food", "Movies", "Games", etc.
    val createdBy: String = "",             // User ID
    val createdAt: Long = System.currentTimeMillis(),
    // Denormalized stats (updated via Cloud Function on each rating)
    val ratingCount: Int = 0,
    val totalScore: Int = 0,                // Sum of all scores (for calculating average)
    val averageScore: Float = 0f,
    val highestScore: Int = 0,
    val lowestScore: Int = 10
)
```

### Rating

```kotlin
data class Rating(
    val id: String = "",                    // Firestore document ID
    val itemId: String = "",
    val groupId: String = "",
    val userId: String = "",
    val score: Int = 0,                     // 1-10
    val imageUrl: String? = null,           // Cloudinary URL
    val comment: String? = null,
    val visitedAt: Long? = null,            // When user visited/tried/watched (optional)
    val createdAt: Long = System.currentTimeMillis()
)
```

### Comment

```kotlin
data class Comment(
    val id: String = "",                    // Firestore document ID
    val ratingId: String = "",
    val userId: String = "",
    val text: String = "",
    val createdAt: Long = System.currentTimeMillis()
)
```

---

## Firestore Database Structure

```
/users/{userId}
    - discordId: string
    - username: string
    - discriminator: string
    - avatarUrl: string
    - email: string (nullable)
    - createdAt: timestamp

/groups/{groupId}
    - name: string
    - inviteCode: string
    - ownerId: string
    - memberIds: array<string>
    - discordWebhookUrl: string (nullable)
    - createdAt: timestamp

/items/{itemId}
    - groupId: string
    - name: string
    - normalizedName: string
    - category: string
    - createdBy: string
    - createdAt: timestamp
    - ratingCount: number
    - totalScore: number
    - averageScore: number
    - highestScore: number
    - lowestScore: number

/ratings/{ratingId}
    - itemId: string
    - groupId: string
    - userId: string
    - score: number (1-10)
    - imageUrl: string (nullable)
    - comment: string (nullable)
    - visitedAt: timestamp (nullable)
    - createdAt: timestamp

/comments/{commentId}
    - ratingId: string
    - userId: string
    - text: string
    - createdAt: timestamp
```

### Firestore Indexes Required

```
Collection: items
Fields: groupId ASC, averageScore DESC

Collection: items
Fields: groupId ASC, normalizedName ASC

Collection: ratings
Fields: groupId ASC, createdAt DESC

Collection: ratings
Fields: itemId ASC, createdAt DESC

Collection: ratings
Fields: userId ASC, createdAt DESC

Collection: comments
Fields: ratingId ASC, createdAt ASC
```

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user is member of a group
    function isGroupMember(groupId) {
      return isAuthenticated() && 
        request.auth.uid in get(/databases/$(database)/documents/groups/$(groupId)).data.memberIds;
    }
    
    // Helper function to check if user is owner of a group
    function isGroupOwner(groupId) {
      return isAuthenticated() && 
        request.auth.uid == get(/databases/$(database)/documents/groups/$(groupId)).data.ownerId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if request.auth.uid == userId;
    }
    
    // Groups collection
    match /groups/{groupId} {
      allow read: if isAuthenticated() && request.auth.uid in resource.data.memberIds;
      allow create: if isAuthenticated();
      allow update: if isGroupOwner(groupId);
      allow delete: if isGroupOwner(groupId);
    }
    
    // Items collection
    match /items/{itemId} {
      allow read: if isGroupMember(resource.data.groupId);
      allow create: if isGroupMember(request.resource.data.groupId);
      allow update: if isGroupMember(resource.data.groupId);
      allow delete: if isGroupOwner(resource.data.groupId);
    }
    
    // Ratings collection
    match /ratings/{ratingId} {
      allow read: if isGroupMember(resource.data.groupId);
      allow create: if isGroupMember(request.resource.data.groupId) && 
                       request.auth.uid == request.resource.data.userId;
      allow update: if request.auth.uid == resource.data.userId;
      allow delete: if request.auth.uid == resource.data.userId || 
                       isGroupOwner(resource.data.groupId);
    }
    
    // Comments collection
    match /comments/{commentId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.auth.uid == request.resource.data.userId;
      allow update: if request.auth.uid == resource.data.userId;
      allow delete: if request.auth.uid == resource.data.userId;
    }
  }
}
```

---

## Features & Screens

### 1. Authentication (Discord OAuth2)

**Screen: LoginActivity**

- Single "Login with Discord" button
- Opens Discord OAuth2 in browser/Custom Tab
- Redirect URI: `rateit://auth/callback`
- Required scopes: `identify`, `email`
- On success: Create/update user in Firestore, store tokens securely

**Discord OAuth2 Flow:**
1. Build authorization URL with client_id, redirect_uri, scopes
2. Open in Chrome Custom Tab
3. Handle redirect with authorization code
4. Exchange code for access token (via backend or Cloud Function)
5. Fetch user info from Discord API
6. Create Firebase custom token
7. Sign in to Firebase with custom token

### 2. My Groups

**Screen: GroupListActivity**

- List of groups user is member of
- Each item shows: Group name, member count, recent activity
- FAB with two options:
  - Create new group
  - Join group via invite code
- Pull to refresh

### 3. Create Group

**Screen: CreateGroupActivity**

- Input: Group name
- Optional: Discord webhook URL
- On create: Generate unique invite code (6-8 alphanumeric chars)
- Creator automatically becomes owner and first member

### 4. Join Group

**Screen: JoinGroupActivity**

- Input: Invite code
- Validate code exists
- Add user to memberIds array
- Navigate to group

### 5. Group Feed

**Screen: GroupFeedActivity**

- Shows recent ratings from all group members
- Each rating card shows:
  - User avatar + username
  - Item name + category
  - Score (1-10) with visual indicator
  - Image thumbnail (if exists)
  - Comment preview (if exists)
  - Timestamp
  - Comment count
- Tap rating → Rating detail
- Tap item name → Item detail
- FAB: Add new rating

### 6. Add Rating

**Screen: AddRatingActivity**

- Input: Item name (with autocomplete from existing items in group)
- Input: Category (dropdown or chips: Food, Movies, Games, Music, Places, Other)
- Input: Score (1-10 slider or number picker)
- Optional: Image (camera or gallery)
- Optional: Comment
- Optional: Visited/tried date

**Auto-duplicate Logic:**
```kotlin
fun normalizeItemName(name: String): String {
    return name
        .lowercase()
        .trim()
        .replace(Regex("[^a-z0-9\\s]"), "")  // Remove punctuation
        .replace(Regex("\\s+"), " ")          // Collapse whitespace
}

suspend fun findOrCreateItem(groupId: String, rawName: String, category: String): Item {
    val normalized = normalizeItemName(rawName)
    
    val existing = firestore.collection("items")
        .whereEqualTo("groupId", groupId)
        .whereEqualTo("normalizedName", normalized)
        .limit(1)
        .get()
        .await()
    
    return if (!existing.isEmpty) {
        existing.documents.first().toObject(Item::class.java)!!
    } else {
        val newItem = Item(
            id = firestore.collection("items").document().id,
            groupId = groupId,
            name = rawName,
            normalizedName = normalized,
            category = category,
            createdBy = currentUserId
        )
        firestore.collection("items").document(newItem.id).set(newItem).await()
        newItem
    }
}
```

### 7. Item Detail

**Screen: ItemDetailActivity**

- Item name, category
- Stats card:
  - Group average score
  - Your average score (if you've rated)
  - Total rating count
  - Highest / Lowest scores
- List of all ratings for this item (newest first)
- Each rating shows: user, score, image, comment, date
- Can filter: All / My ratings only

### 8. Rating Detail

**Screen: RatingDetailActivity**

- Full rating display (user, score, full image, full comment)
- Comments section below
- Add comment input at bottom

### 9. Stats Dashboard

**Screen: StatsActivity**

- Tab: Top Rated (items by average score)
- Tab: Most Rated (items by rating count)
- Tab: Categories (breakdown by category)
- Tab: Members (leaderboard by rating count)
- Filter by time: All time / This month / This week

### 10. Group Settings

**Screen: GroupSettingsActivity**

- Show invite code (with copy button)
- Discord webhook URL (edit for owner)
- Member list (with remove option for owner)
- Leave group button
- Delete group button (owner only)

---

## Firebase Cloud Functions

### 1. Update Item Stats on New Rating

```javascript
// functions/src/index.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

export const onRatingCreated = functions.firestore
    .document('ratings/{ratingId}')
    .onCreate(async (snapshot, context) => {
        const rating = snapshot.data();
        const itemRef = db.collection('items').doc(rating.itemId);
        
        await db.runTransaction(async (transaction) => {
            const itemDoc = await transaction.get(itemRef);
            if (!itemDoc.exists) return;
            
            const item = itemDoc.data()!;
            const newCount = item.ratingCount + 1;
            const newTotal = item.totalScore + rating.score;
            const newAverage = newTotal / newCount;
            const newHighest = Math.max(item.highestScore, rating.score);
            const newLowest = Math.min(item.lowestScore, rating.score);
            
            transaction.update(itemRef, {
                ratingCount: newCount,
                totalScore: newTotal,
                averageScore: newAverage,
                highestScore: newHighest,
                lowestScore: newLowest
            });
        });
        
        // Post to Discord if webhook configured
        await postToDiscord(rating);
    });

async function postToDiscord(rating: any) {
    const groupDoc = await db.collection('groups').doc(rating.groupId).get();
    const group = groupDoc.data();
    
    if (!group?.discordWebhookUrl) return;
    
    const userDoc = await db.collection('users').doc(rating.userId).get();
    const user = userDoc.data()!;
    
    const itemDoc = await db.collection('items').doc(rating.itemId).get();
    const item = itemDoc.data()!;
    
    const embed = {
        embeds: [{
            title: 'New Rating!',
            description: `**${user.username}** rated **${item.name}** ${rating.score}/10`,
            color: getColorForScore(rating.score),
            fields: [
                { name: 'Category', value: item.category, inline: true },
                { name: 'Score', value: `${rating.score}/10`, inline: true }
            ],
            thumbnail: { url: user.avatarUrl },
            timestamp: new Date().toISOString()
        }]
    };
    
    if (rating.imageUrl) {
        embed.embeds[0].image = { url: rating.imageUrl };
    }
    
    if (rating.comment) {
        embed.embeds[0].fields.push({ 
            name: 'Comment', 
            value: rating.comment, 
            inline: false 
        });
    }
    
    await fetch(group.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(embed)
    });
}

function getColorForScore(score: number): number {
    if (score >= 8) return 0x00FF00;      // Green
    if (score >= 6) return 0xFFFF00;      // Yellow
    if (score >= 4) return 0xFFA500;      // Orange
    return 0xFF0000;                       // Red
}
```

### 2. Discord OAuth Token Exchange

```javascript
export const exchangeDiscordCode = functions.https.onCall(async (data, context) => {
    const { code, redirectUri } = data;
    
    const response = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: functions.config().discord.client_id,
            client_secret: functions.config().discord.client_secret,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri
        })
    });
    
    const tokens = await response.json();
    
    // Fetch Discord user info
    const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const discordUser = await userResponse.json();
    
    // Create or get Firebase user
    let firebaseUser;
    try {
        firebaseUser = await admin.auth().getUserByEmail(`${discordUser.id}@discord.rateit.app`);
    } catch {
        firebaseUser = await admin.auth().createUser({
            uid: discordUser.id,
            email: `${discordUser.id}@discord.rateit.app`,
            displayName: discordUser.username
        });
    }
    
    // Update user document in Firestore
    await db.collection('users').doc(firebaseUser.uid).set({
        discordId: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator || '',
        avatarUrl: discordUser.avatar 
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || '0') % 5}.png`,
        email: discordUser.email || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // Create custom token for Firebase Auth
    const customToken = await admin.auth().createCustomToken(firebaseUser.uid);
    
    return { customToken };
});
```

### 3. Generate Invite Code

```javascript
export const generateInviteCode = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
    let code = '';
    
    let isUnique = false;
    while (!isUnique) {
        code = '';
        for (let i = 0; i < 6; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        const existing = await db.collection('groups')
            .where('inviteCode', '==', code)
            .limit(1)
            .get();
        
        isUnique = existing.empty;
    }
    
    return { code };
});
```

---

## Cloudinary Integration

### Setup

1. Create Cloudinary account
2. Get cloud name, API key, API secret
3. Create unsigned upload preset for mobile uploads

### Android Implementation

```kotlin
// Using Cloudinary Android SDK
implementation("com.cloudinary:cloudinary-android:2.5.0")

object CloudinaryConfig {
    fun init(context: Context) {
        val config = mapOf(
            "cloud_name" to BuildConfig.CLOUDINARY_CLOUD_NAME,
            "secure" to true
        )
        MediaManager.init(context, config)
    }
}

suspend fun uploadImage(uri: Uri): String {
    return suspendCancellableCoroutine { continuation ->
        MediaManager.get().upload(uri)
            .unsigned("rateit_unsigned_preset")
            .option("folder", "ratings")
            .callback(object : UploadCallback {
                override fun onSuccess(requestId: String, resultData: Map<*, *>) {
                    val url = resultData["secure_url"] as String
                    continuation.resume(url)
                }
                
                override fun onError(requestId: String, error: ErrorInfo) {
                    continuation.resumeWithException(Exception(error.description))
                }
                
                override fun onStart(requestId: String) {}
                override fun onProgress(requestId: String, bytes: Long, totalBytes: Long) {}
                override fun onReschedule(requestId: String, error: ErrorInfo) {}
            })
            .dispatch()
    }
}
```

### Image Compression Before Upload

```kotlin
suspend fun compressImage(context: Context, uri: Uri): File {
    return withContext(Dispatchers.IO) {
        val bitmap = MediaStore.Images.Media.getBitmap(context.contentResolver, uri)
        
        // Resize if too large
        val maxDimension = 1200
        val scaledBitmap = if (bitmap.width > maxDimension || bitmap.height > maxDimension) {
            val scale = maxDimension.toFloat() / maxOf(bitmap.width, bitmap.height)
            Bitmap.createScaledBitmap(
                bitmap,
                (bitmap.width * scale).toInt(),
                (bitmap.height * scale).toInt(),
                true
            )
        } else bitmap
        
        // Compress to file
        val file = File(context.cacheDir, "upload_${System.currentTimeMillis()}.jpg")
        FileOutputStream(file).use { out ->
            scaledBitmap.compress(Bitmap.CompressFormat.JPEG, 80, out)
        }
        
        file
    }
}
```

---

## Project Structure

```
app/
├── src/main/
│   ├── java/com/rateit/app/
│   │   ├── RateItApplication.kt
│   │   ├── di/
│   │   │   └── AppModule.kt (Hilt modules)
│   │   ├── data/
│   │   │   ├── model/
│   │   │   │   ├── User.kt
│   │   │   │   ├── Group.kt
│   │   │   │   ├── Item.kt
│   │   │   │   ├── Rating.kt
│   │   │   │   └── Comment.kt
│   │   │   ├── repository/
│   │   │   │   ├── AuthRepository.kt
│   │   │   │   ├── GroupRepository.kt
│   │   │   │   ├── ItemRepository.kt
│   │   │   │   ├── RatingRepository.kt
│   │   │   │   └── CommentRepository.kt
│   │   │   └── remote/
│   │   │       ├── FirestoreDataSource.kt
│   │   │       ├── CloudinaryDataSource.kt
│   │   │       └── DiscordAuthService.kt
│   │   ├── ui/
│   │   │   ├── auth/
│   │   │   │   ├── LoginActivity.kt
│   │   │   │   └── LoginViewModel.kt
│   │   │   ├── groups/
│   │   │   │   ├── GroupListActivity.kt
│   │   │   │   ├── GroupListViewModel.kt
│   │   │   │   ├── CreateGroupActivity.kt
│   │   │   │   ├── JoinGroupActivity.kt
│   │   │   │   └── GroupSettingsActivity.kt
│   │   │   ├── feed/
│   │   │   │   ├── GroupFeedActivity.kt
│   │   │   │   ├── GroupFeedViewModel.kt
│   │   │   │   └── RatingAdapter.kt
│   │   │   ├── rating/
│   │   │   │   ├── AddRatingActivity.kt
│   │   │   │   ├── AddRatingViewModel.kt
│   │   │   │   ├── RatingDetailActivity.kt
│   │   │   │   └── RatingDetailViewModel.kt
│   │   │   ├── item/
│   │   │   │   ├── ItemDetailActivity.kt
│   │   │   │   └── ItemDetailViewModel.kt
│   │   │   ├── stats/
│   │   │   │   ├── StatsActivity.kt
│   │   │   │   └── StatsViewModel.kt
│   │   │   └── common/
│   │   │       ├── BaseActivity.kt
│   │   │       └── Extensions.kt
│   │   └── util/
│   │       ├── Constants.kt
│   │       ├── ItemNameNormalizer.kt
│   │       └── ImageCompressor.kt
│   ├── res/
│   │   ├── layout/
│   │   ├── values/
│   │   ├── drawable/
│   │   └── navigation/
│   └── AndroidManifest.xml
├── build.gradle.kts
└── google-services.json

functions/
├── src/
│   └── index.ts
├── package.json
└── tsconfig.json
```

---

## Dependencies (build.gradle.kts)

```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
    id("com.google.dagger.hilt.android")
    id("kotlin-kapt")
}

android {
    namespace = "com.rateit.app"
    compileSdk = 34
    
    defaultConfig {
        applicationId = "com.rateit.app"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
        
        buildConfigField("String", "DISCORD_CLIENT_ID", "\"${properties["DISCORD_CLIENT_ID"]}\"")
        buildConfigField("String", "DISCORD_REDIRECT_URI", "\"rateit://auth/callback\"")
        buildConfigField("String", "CLOUDINARY_CLOUD_NAME", "\"${properties["CLOUDINARY_CLOUD_NAME"]}\"")
    }
    
    buildFeatures {
        viewBinding = true
        buildConfig = true
    }
}

dependencies {
    // Core Android
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.activity:activity-ktx:1.8.2")
    implementation("androidx.fragment:fragment-ktx:1.6.2")
    
    // Lifecycle
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-livedata-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    
    // Navigation
    implementation("androidx.navigation:navigation-fragment-ktx:2.7.6")
    implementation("androidx.navigation:navigation-ui-ktx:2.7.6")
    
    // Firebase
    implementation(platform("com.google.firebase:firebase-bom:32.7.0"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")
    implementation("com.google.firebase:firebase-functions-ktx")
    
    // Hilt
    implementation("com.google.dagger:hilt-android:2.48")
    kapt("com.google.dagger:hilt-compiler:2.48")
    
    // Cloudinary
    implementation("com.cloudinary:cloudinary-android:2.5.0")
    
    // Image loading
    implementation("io.coil-kt:coil:2.5.0")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3")
    
    // Chrome Custom Tabs (for OAuth)
    implementation("androidx.browser:browser:1.7.0")
    
    // SwipeRefreshLayout
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
}
```

---

## Environment Setup Required

### 1. Discord Developer Portal
- Create application at https://discord.com/developers/applications
- Get Client ID and Client Secret
- Add redirect URI: `rateit://auth/callback`
- Enable OAuth2 scopes: `identify`, `email`

### 2. Firebase Console
- Create project
- Enable Authentication (no providers needed, using custom tokens)
- Create Firestore database
- Deploy Cloud Functions
- Download `google-services.json` to `app/` folder

### 3. Cloudinary
- Create account at https://cloudinary.com
- Get cloud name
- Create unsigned upload preset named `rateit_unsigned_preset`

### 4. Local Properties
Create `local.properties` with:
```properties
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
```

---

## Development Phases

### Phase 1: Foundation
- [ ] Project setup with all dependencies
- [ ] Firebase configuration
- [ ] Discord OAuth2 login flow
- [ ] Basic user creation/retrieval

### Phase 2: Groups
- [ ] Create group with invite code generation
- [ ] Join group via invite code
- [ ] Group list screen
- [ ] Group settings screen

### Phase 3: Ratings Core
- [ ] Add rating screen with item autocomplete
- [ ] Item name normalization and deduplication
- [ ] Group feed with realtime updates
- [ ] Item detail screen

### Phase 4: Images & Comments
- [ ] Cloudinary integration
- [ ] Image picker (camera + gallery)
- [ ] Image compression
- [ ] Comments on ratings

### Phase 5: Stats & Polish
- [ ] Stats dashboard
- [ ] Discord webhook posting
- [ ] UI polish and animations
- [ ] Error handling and edge cases

### Phase 6: Testing & Release
- [ ] Unit tests for repositories
- [ ] UI tests for critical flows
- [ ] Beta testing with friends
- [ ] Play Store release

---

## Notes for Implementation

1. **Always use Firestore real-time listeners** for feed and item details - don't poll
2. **Denormalize aggressively** - duplicate user names in ratings to avoid extra reads
3. **Handle offline gracefully** - Firestore has built-in offline support, leverage it
4. **Rate limit Discord webhooks** - don't spam the channel, maybe batch if multiple ratings come in quickly
5. **Validate invite codes server-side** - don't trust client validation alone
6. **Image URLs should be HTTPS** - Cloudinary provides this by default with `secure_url`
