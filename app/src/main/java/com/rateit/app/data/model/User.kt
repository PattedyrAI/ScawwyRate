package com.rateit.app.data.model

import com.google.firebase.firestore.DocumentId

data class User(
    @DocumentId
    val id: String = "",
    val discordId: String = "",
    val username: String = "",
    val discriminator: String = "",
    val avatarUrl: String = "",
    val email: String? = null,
    val createdAt: Long = System.currentTimeMillis()
) {
    // No-arg constructor for Firestore
    constructor() : this("")

    val displayName: String
        get() = if (discriminator.isNotEmpty() && discriminator != "0") {
            "$username#$discriminator"
        } else {
            username
        }
}
