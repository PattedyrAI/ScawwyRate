# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RateIt is a native Android application (Kotlin) that allows friend groups to rate anything (restaurants, movies, games, etc.) and share ratings within private groups. Users authenticate via Discord OAuth2, and ratings can optionally be posted to a Discord channel via webhook.

## Tech Stack

- **Platform**: Android (Native Kotlin)
- **Min SDK**: 26 (Android 8.0), Target SDK: 34
- **Architecture**: MVVM with Repository pattern
- **Database**: Firebase Firestore
- **Image Storage**: Cloudinary
- **Authentication**: Discord OAuth2 → Firebase Custom Tokens
- **Backend**: Firebase Cloud Functions (Node.js/TypeScript)
- **DI**: Hilt
- **Build System**: Gradle (Kotlin DSL)

## Build Commands

```bash
# Build Android app
./gradlew build

# Build debug APK
./gradlew assembleDebug

# Run unit tests
./gradlew test

# Build Cloud Functions
cd functions && npm run build

# Deploy Cloud Functions
cd functions && npm run deploy
```

## Project Structure

```
ScawwyRate/
├── app/src/main/java/com/rateit/app/
│   ├── data/
│   │   ├── model/          # Data classes (User, Group, Item, Rating, Comment)
│   │   ├── repository/     # Repository layer
│   │   └── remote/         # Data sources (Firestore, Cloudinary, Discord)
│   ├── di/                 # Hilt modules
│   ├── ui/                 # Activities, ViewModels, Adapters per feature
│   └── util/               # Constants, helpers
├── functions/src/          # Firebase Cloud Functions
└── firestore.rules         # Firestore security rules
```

## Key Architecture Patterns

- **MVVM**: Activities observe ViewModels via StateFlow
- **Repository Pattern**: ViewModels → Repositories → DataSources
- **Firestore Real-time**: Use `snapshots()` Flow for live data
- **Denormalization**: Rating documents include userName/userAvatarUrl/itemName to minimize reads

## Data Flow

1. Discord OAuth2 code → Cloud Function → Firebase Custom Token
2. Rating created → Cloud Function trigger updates Item stats
3. Rating created → Cloud Function posts to Discord webhook (if configured)

## Important Files

- `app/build.gradle.kts` - Android dependencies and build config
- `functions/src/index.ts` - All Cloud Functions
- `firestore.rules` - Security rules
- `firestore.indexes.json` - Required Firestore indexes

## Environment Setup

Required in `local.properties`:
```
DISCORD_CLIENT_ID=your_discord_client_id
CLOUDINARY_CLOUD_NAME=your_cloud_name
```

Firebase Functions config:
```bash
firebase functions:config:set discord.client_id="YOUR_ID" discord.client_secret="YOUR_SECRET"
```

## Item Name Normalization

Items are deduplicated using normalized names (lowercase, no punctuation, collapsed whitespace). See `ItemNameNormalizer.kt`.
