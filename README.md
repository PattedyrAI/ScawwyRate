# RateIt

A native Android app for friend groups to rate and share opinions on anything - restaurants, movies, games, and more.

## Features

- **Discord Login**: Authenticate with your Discord account
- **Private Groups**: Create or join groups with invite codes
- **Rate Anything**: Score items 1-10 with optional photos and comments
- **Real-time Feed**: See your friends' ratings as they happen
- **Smart Deduplication**: Items are automatically matched to avoid duplicates
- **Statistics Dashboard**: View top-rated items, most active members, category breakdowns
- **Discord Integration**: Optionally post ratings to a Discord channel

## Setup

### Prerequisites

- Android Studio Hedgehog or later
- Node.js 18+ (for Cloud Functions)
- Firebase project
- Discord Developer Application
- Cloudinary account

### 1. Discord Setup

1. Create an app at [Discord Developer Portal](https://discord.com/developers/applications)
2. Add redirect URI: `rateit://auth/callback`
3. Enable OAuth2 scopes: `identify`, `email`
4. Note your Client ID and Client Secret

### 2. Firebase Setup

1. Create a Firebase project
2. Enable Firestore Database
3. Download `google-services.json` to `app/`
4. Deploy security rules: `firebase deploy --only firestore:rules`
5. Deploy indexes: `firebase deploy --only firestore:indexes`

### 3. Cloudinary Setup

1. Create account at [Cloudinary](https://cloudinary.com)
2. Create an unsigned upload preset named `rateit_unsigned_preset`
3. Note your Cloud Name

### 4. Configuration

Create `local.properties` in project root:

```properties
DISCORD_CLIENT_ID=your_discord_client_id
CLOUDINARY_CLOUD_NAME=your_cloud_name
```

Configure Firebase Functions:

```bash
cd functions
npm install
firebase functions:config:set discord.client_id="YOUR_ID" discord.client_secret="YOUR_SECRET"
npm run deploy
```

### 5. Build & Run

```bash
./gradlew assembleDebug
```

## Architecture

- **MVVM** with ViewModels and StateFlow
- **Repository Pattern** for data access
- **Hilt** for dependency injection
- **Firebase Firestore** with real-time listeners
- **Cloud Functions** for secure operations

## License

MIT
