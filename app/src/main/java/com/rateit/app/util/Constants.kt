package com.rateit.app.util

object Constants {
    // Firestore collections
    const val COLLECTION_USERS = "users"
    const val COLLECTION_GROUPS = "groups"
    const val COLLECTION_ITEMS = "items"
    const val COLLECTION_RATINGS = "ratings"
    const val COLLECTION_COMMENTS = "comments"

    // Discord OAuth
    const val DISCORD_AUTH_URL = "https://discord.com/api/oauth2/authorize"
    const val DISCORD_SCOPES = "identify email"

    // Score range
    const val MIN_SCORE = 1
    const val MAX_SCORE = 10

    // Image constraints
    const val MAX_IMAGE_DIMENSION = 1200
    const val IMAGE_QUALITY = 80

    // Invite code
    const val INVITE_CODE_LENGTH = 6

    // Intent extras
    const val EXTRA_GROUP_ID = "extra_group_id"
    const val EXTRA_ITEM_ID = "extra_item_id"
    const val EXTRA_RATING_ID = "extra_rating_id"
}
