package com.rateit.app.data.repository

import com.rateit.app.data.model.Comment
import com.rateit.app.data.remote.FirestoreDataSource
import com.rateit.app.util.Result
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CommentRepository @Inject constructor(
    private val firestoreDataSource: FirestoreDataSource
) {
    fun getRatingComments(ratingId: String): Flow<List<Comment>> {
        return firestoreDataSource.getRatingComments(ratingId)
    }

    suspend fun createComment(
        ratingId: String,
        userId: String,
        text: String,
        userName: String,
        userAvatarUrl: String
    ): Result<String> {
        return try {
            val comment = Comment(
                ratingId = ratingId,
                userId = userId,
                text = text,
                userName = userName,
                userAvatarUrl = userAvatarUrl
            )

            val commentId = firestoreDataSource.createComment(comment)
            Result.Success(commentId)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    suspend fun deleteComment(commentId: String): Result<Unit> {
        return try {
            firestoreDataSource.deleteComment(commentId)
            Result.Success(Unit)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}
