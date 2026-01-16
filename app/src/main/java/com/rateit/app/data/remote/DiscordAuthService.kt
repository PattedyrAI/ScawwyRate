package com.rateit.app.data.remote

import android.net.Uri
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.functions.FirebaseFunctions
import com.rateit.app.BuildConfig
import com.rateit.app.util.Constants
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DiscordAuthService @Inject constructor(
    private val firebaseAuth: FirebaseAuth,
    private val functions: FirebaseFunctions
) {
    /**
     * Builds the Discord OAuth2 authorization URL
     */
    fun buildAuthorizationUrl(): String {
        return Uri.parse(Constants.DISCORD_AUTH_URL)
            .buildUpon()
            .appendQueryParameter("client_id", BuildConfig.DISCORD_CLIENT_ID)
            .appendQueryParameter("redirect_uri", BuildConfig.DISCORD_REDIRECT_URI)
            .appendQueryParameter("response_type", "code")
            .appendQueryParameter("scope", Constants.DISCORD_SCOPES)
            .build()
            .toString()
    }

    /**
     * Exchanges the authorization code for a Firebase custom token
     * and signs in the user
     */
    suspend fun exchangeCodeAndSignIn(code: String) {
        val data = hashMapOf(
            "code" to code,
            "redirectUri" to BuildConfig.DISCORD_REDIRECT_URI
        )

        val result = functions
            .getHttpsCallable("exchangeDiscordCode")
            .call(data)
            .await()

        @Suppress("UNCHECKED_CAST")
        val resultData = result.data as Map<String, Any>
        val customToken = resultData["customToken"] as String

        firebaseAuth.signInWithCustomToken(customToken).await()
    }

    /**
     * Signs out the current user
     */
    fun signOut() {
        firebaseAuth.signOut()
    }

    /**
     * Returns the current user ID or null if not signed in
     */
    fun getCurrentUserId(): String? = firebaseAuth.currentUser?.uid

    /**
     * Returns true if a user is currently signed in
     */
    fun isSignedIn(): Boolean = firebaseAuth.currentUser != null
}
