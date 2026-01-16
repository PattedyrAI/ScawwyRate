package com.rateit.app.data.model

import com.google.firebase.firestore.DocumentId

data class Comment(
    @DocumentId
    val id: String = "",
    val ratingId: String = "",
    val userId: String = "",
    val text: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    // Denormalized fields for display
    val userName: String = "",
    val userAvatarUrl: String = ""
) {
    // No-arg constructor for Firestore
    constructor() : this("")
}
