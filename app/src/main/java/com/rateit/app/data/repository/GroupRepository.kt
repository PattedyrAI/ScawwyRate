package com.rateit.app.data.repository

import com.google.firebase.functions.FirebaseFunctions
import com.rateit.app.data.model.Group
import com.rateit.app.data.remote.FirestoreDataSource
import com.rateit.app.util.Result
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GroupRepository @Inject constructor(
    private val firestoreDataSource: FirestoreDataSource,
    private val functions: FirebaseFunctions
) {
    fun getUserGroups(userId: String): Flow<List<Group>> {
        return firestoreDataSource.getUserGroups(userId)
    }

    suspend fun getGroup(groupId: String): Result<Group?> {
        return try {
            val group = firestoreDataSource.getGroup(groupId)
            Result.Success(group)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    suspend fun createGroup(
        name: String,
        ownerId: String,
        discordWebhookUrl: String? = null
    ): Result<String> {
        return try {
            // Generate invite code via Cloud Function
            val codeResult = functions
                .getHttpsCallable("generateInviteCode")
                .call()
                .await()

            @Suppress("UNCHECKED_CAST")
            val inviteCode = (codeResult.data as Map<String, Any>)["code"] as String

            val group = Group(
                name = name,
                inviteCode = inviteCode,
                ownerId = ownerId,
                memberIds = listOf(ownerId),
                discordWebhookUrl = discordWebhookUrl
            )

            val groupId = firestoreDataSource.createGroup(group)
            Result.Success(groupId)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    suspend fun joinGroup(inviteCode: String, userId: String): Result<String> {
        return try {
            val group = firestoreDataSource.getGroupByInviteCode(inviteCode.uppercase())
                ?: return Result.Error(IllegalArgumentException("Invalid invite code"))

            if (group.memberIds.contains(userId)) {
                return Result.Success(group.id) // Already a member
            }

            firestoreDataSource.addMemberToGroup(group.id, userId)
            Result.Success(group.id)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    suspend fun leaveGroup(groupId: String, userId: String): Result<Unit> {
        return try {
            firestoreDataSource.removeMemberFromGroup(groupId, userId)
            Result.Success(Unit)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    suspend fun updateGroup(group: Group): Result<Unit> {
        return try {
            firestoreDataSource.updateGroup(group)
            Result.Success(Unit)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    suspend fun deleteGroup(groupId: String): Result<Unit> {
        return try {
            firestoreDataSource.deleteGroup(groupId)
            Result.Success(Unit)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    suspend fun removeMember(groupId: String, userId: String): Result<Unit> {
        return try {
            firestoreDataSource.removeMemberFromGroup(groupId, userId)
            Result.Success(Unit)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}
