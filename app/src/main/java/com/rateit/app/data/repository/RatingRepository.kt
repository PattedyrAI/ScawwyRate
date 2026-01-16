package com.rateit.app.data.repository

import android.content.Context
import android.net.Uri
import com.rateit.app.data.model.Rating
import com.rateit.app.data.remote.CloudinaryDataSource
import com.rateit.app.data.remote.FirestoreDataSource
import com.rateit.app.util.ImageCompressor
import com.rateit.app.util.Result
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RatingRepository @Inject constructor(
    private val firestoreDataSource: FirestoreDataSource,
    private val cloudinaryDataSource: CloudinaryDataSource,
    private val imageCompressor: ImageCompressor,
    @ApplicationContext private val context: Context
) {
    fun getGroupRatings(groupId: String): Flow<List<Rating>> {
        return firestoreDataSource.getGroupRatings(groupId)
    }

    fun getItemRatings(itemId: String): Flow<List<Rating>> {
        return firestoreDataSource.getItemRatings(itemId)
    }

    suspend fun getRating(ratingId: String): Result<Rating?> {
        return try {
            val rating = firestoreDataSource.getRating(ratingId)
            Result.Success(rating)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    suspend fun createRating(
        itemId: String,
        groupId: String,
        userId: String,
        score: Int,
        imageUri: Uri? = null,
        comment: String? = null,
        visitedAt: Long? = null,
        userName: String,
        userAvatarUrl: String,
        itemName: String,
        itemCategory: String
    ): Result<String> {
        return try {
            // Upload image if provided
            val imageUrl = imageUri?.let { uri ->
                val compressedFile = imageCompressor.compressImage(context, uri)
                cloudinaryDataSource.uploadImage(Uri.fromFile(compressedFile))
            }

            val rating = Rating(
                itemId = itemId,
                groupId = groupId,
                userId = userId,
                score = score,
                imageUrl = imageUrl,
                comment = comment?.takeIf { it.isNotBlank() },
                visitedAt = visitedAt,
                userName = userName,
                userAvatarUrl = userAvatarUrl,
                itemName = itemName,
                itemCategory = itemCategory
            )

            val ratingId = firestoreDataSource.createRating(rating)
            Result.Success(ratingId)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    suspend fun updateRating(rating: Rating): Result<Unit> {
        return try {
            firestoreDataSource.updateRating(rating)
            Result.Success(Unit)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    suspend fun deleteRating(ratingId: String): Result<Unit> {
        return try {
            firestoreDataSource.deleteRating(ratingId)
            Result.Success(Unit)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}
