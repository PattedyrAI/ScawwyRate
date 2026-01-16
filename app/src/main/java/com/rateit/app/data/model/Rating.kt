package com.rateit.app.data.model

import com.google.firebase.firestore.DocumentId

data class Rating(
    @DocumentId
    val id: String = "",
    val itemId: String = "",
    val groupId: String = "",
    val userId: String = "",
    val score: Int = 0,
    val imageUrl: String? = null,
    val comment: String? = null,
    val visitedAt: Long? = null,
    val createdAt: Long = System.currentTimeMillis(),
    // Denormalized fields for display
    val userName: String = "",
    val userAvatarUrl: String = "",
    val itemName: String = "",
    val itemCategory: String = ""
) {
    // No-arg constructor for Firestore
    constructor() : this("")

    val hasImage: Boolean
        get() = !imageUrl.isNullOrEmpty()

    val hasComment: Boolean
        get() = !comment.isNullOrEmpty()

    val scoreColor: ScoreColor
        get() = when {
            score >= 8 -> ScoreColor.EXCELLENT
            score >= 6 -> ScoreColor.GOOD
            score >= 4 -> ScoreColor.AVERAGE
            else -> ScoreColor.POOR
        }
}

enum class ScoreColor {
    EXCELLENT, GOOD, AVERAGE, POOR
}
