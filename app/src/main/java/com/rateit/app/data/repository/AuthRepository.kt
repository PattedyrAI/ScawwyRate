package com.rateit.app.data.repository

import com.rateit.app.data.model.User
import com.rateit.app.data.remote.DiscordAuthService
import com.rateit.app.data.remote.FirestoreDataSource
import com.rateit.app.util.Result
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val discordAuthService: DiscordAuthService,
    private val firestoreDataSource: FirestoreDataSource
) {
    fun buildAuthorizationUrl(): String = discordAuthService.buildAuthorizationUrl()

    suspend fun exchangeCodeAndSignIn(code: String): Result<Unit> {
        return try {
            discordAuthService.exchangeCodeAndSignIn(code)
            Result.Success(Unit)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    fun signOut() = discordAuthService.signOut()

    fun getCurrentUserId(): String? = discordAuthService.getCurrentUserId()

    fun isSignedIn(): Boolean = discordAuthService.isSignedIn()

    suspend fun getCurrentUser(): Result<User?> {
        return try {
            val userId = getCurrentUserId() ?: return Result.Success(null)
            val user = firestoreDataSource.getUser(userId)
            Result.Success(user)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    suspend fun getUser(userId: String): Result<User?> {
        return try {
            val user = firestoreDataSource.getUser(userId)
            Result.Success(user)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}
