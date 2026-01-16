package com.rateit.app.data.model

import com.google.firebase.firestore.DocumentId

data class Item(
    @DocumentId
    val id: String = "",
    val groupId: String = "",
    val name: String = "",
    val normalizedName: String = "",
    val category: String = "",
    val createdBy: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val ratingCount: Int = 0,
    val totalScore: Int = 0,
    val averageScore: Float = 0f,
    val highestScore: Int = 0,
    val lowestScore: Int = 10
) {
    // No-arg constructor for Firestore
    constructor() : this("")

    val formattedAverage: String
        get() = String.format("%.1f", averageScore)

    val hasRatings: Boolean
        get() = ratingCount > 0
}
