package com.rateit.app.ui.rating

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rateit.app.data.model.Comment
import com.rateit.app.data.model.Rating
import com.rateit.app.data.model.User
import com.rateit.app.data.repository.AuthRepository
import com.rateit.app.data.repository.CommentRepository
import com.rateit.app.data.repository.RatingRepository
import com.rateit.app.util.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class RatingDetailViewModel @Inject constructor(
    private val ratingRepository: RatingRepository,
    private val commentRepository: CommentRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _ratingState = MutableStateFlow<RatingDetailState>(RatingDetailState.Loading)
    val ratingState: StateFlow<RatingDetailState> = _ratingState.asStateFlow()

    private val _comments = MutableStateFlow<List<Comment>>(emptyList())
    val comments: StateFlow<List<Comment>> = _comments.asStateFlow()

    private val _commentState = MutableStateFlow<CommentActionState>(CommentActionState.Idle)
    val commentState: StateFlow<CommentActionState> = _commentState.asStateFlow()

    private var currentUser: User? = null
    private var ratingId: String = ""

    fun loadRating(ratingId: String) {
        this.ratingId = ratingId

        viewModelScope.launch {
            // Load current user
            when (val result = authRepository.getCurrentUser()) {
                is Result.Success -> currentUser = result.data
                else -> {}
            }

            // Load rating
            when (val result = ratingRepository.getRating(ratingId)) {
                is Result.Success -> {
                    val rating = result.data
                    if (rating != null) {
                        _ratingState.value = RatingDetailState.Success(rating)
                    } else {
                        _ratingState.value = RatingDetailState.Error("Rating not found")
                    }
                }
                is Result.Error -> {
                    _ratingState.value = RatingDetailState.Error(
                        result.exception.message ?: "Failed to load rating"
                    )
                }
                is Result.Loading -> {}
            }

            // Load comments
            commentRepository.getRatingComments(ratingId)
                .catch { }
                .collect { comments ->
                    _comments.value = comments
                }
        }
    }

    fun addComment(text: String) {
        val user = currentUser ?: return
        if (text.isBlank()) return

        viewModelScope.launch {
            _commentState.value = CommentActionState.Loading

            when (val result = commentRepository.createComment(
                ratingId = ratingId,
                userId = user.id,
                text = text.trim(),
                userName = user.username,
                userAvatarUrl = user.avatarUrl
            )) {
                is Result.Success -> {
                    _commentState.value = CommentActionState.Success
                }
                is Result.Error -> {
                    _commentState.value = CommentActionState.Error(
                        result.exception.message ?: "Failed to add comment"
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun deleteComment(commentId: String) {
        viewModelScope.launch {
            commentRepository.deleteComment(commentId)
        }
    }

    fun getCurrentUserId(): String? = authRepository.getCurrentUserId()

    fun resetCommentState() {
        _commentState.value = CommentActionState.Idle
    }
}

sealed class RatingDetailState {
    data object Loading : RatingDetailState()
    data class Success(val rating: Rating) : RatingDetailState()
    data class Error(val message: String) : RatingDetailState()
}

sealed class CommentActionState {
    data object Idle : CommentActionState()
    data object Loading : CommentActionState()
    data object Success : CommentActionState()
    data class Error(val message: String) : CommentActionState()
}
