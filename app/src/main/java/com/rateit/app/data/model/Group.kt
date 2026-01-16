package com.rateit.app.data.model

import com.google.firebase.firestore.DocumentId

data class Group(
    @DocumentId
    val id: String = "",
    val name: String = "",
    val inviteCode: String = "",
    val ownerId: String = "",
    val memberIds: List<String> = emptyList(),
    val discordWebhookUrl: String? = null,
    val createdAt: Long = System.currentTimeMillis()
) {
    // No-arg constructor for Firestore
    constructor() : this("")

    val memberCount: Int
        get() = memberIds.size

    fun isOwner(userId: String): Boolean = ownerId == userId

    fun isMember(userId: String): Boolean = memberIds.contains(userId)
}
