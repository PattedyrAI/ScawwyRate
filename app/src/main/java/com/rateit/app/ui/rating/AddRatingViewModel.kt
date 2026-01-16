package com.rateit.app.ui.rating

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rateit.app.data.model.Category
import com.rateit.app.data.model.Item
import com.rateit.app.data.model.User
import com.rateit.app.data.repository.AuthRepository
import com.rateit.app.data.repository.ItemRepository
import com.rateit.app.data.repository.RatingRepository
import com.rateit.app.util.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AddRatingViewModel @Inject constructor(
    private val ratingRepository: RatingRepository,
    private val itemRepository: ItemRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<AddRatingUiState>(AddRatingUiState.Idle)
    val uiState: StateFlow<AddRatingUiState> = _uiState.asStateFlow()

    private val _suggestions = MutableStateFlow<List<Item>>(emptyList())
    val suggestions: StateFlow<List<Item>> = _suggestions.asStateFlow()

    private var currentUser: User? = null
    private var groupId: String = ""

    fun init(groupId: String) {
        this.groupId = groupId

        viewModelScope.launch {
            when (val result = authRepository.getCurrentUser()) {
                is Result.Success -> currentUser = result.data
                else -> {}
            }
        }
    }

    fun searchItems(query: String) {
        if (query.length < 2) {
            _suggestions.value = emptyList()
            return
        }

        viewModelScope.launch {
            when (val result = itemRepository.searchItems(groupId, query)) {
                is Result.Success -> _suggestions.value = result.data
                else -> _suggestions.value = emptyList()
            }
        }
    }

    fun submitRating(
        itemName: String,
        category: Category,
        score: Int,
        imageUri: Uri?,
        comment: String?,
        visitedAt: Long?
    ) {
        if (itemName.isBlank()) {
            _uiState.value = AddRatingUiState.Error("Item name is required")
            return
        }

        if (score < 1 || score > 10) {
            _uiState.value = AddRatingUiState.Error("Score must be between 1 and 10")
            return
        }

        val user = currentUser
        if (user == null) {
            _uiState.value = AddRatingUiState.Error("Not logged in")
            return
        }

        viewModelScope.launch {
            _uiState.value = AddRatingUiState.Loading

            // Find or create item
            val itemResult = itemRepository.findOrCreateItem(
                groupId = groupId,
                rawName = itemName.trim(),
                category = category.displayName,
                createdBy = user.id
            )

            when (itemResult) {
                is Result.Success -> {
                    val item = itemResult.data

                    // Create rating
                    val ratingResult = ratingRepository.createRating(
                        itemId = item.id,
                        groupId = groupId,
                        userId = user.id,
                        score = score,
                        imageUri = imageUri,
                        comment = comment,
                        visitedAt = visitedAt,
                        userName = user.username,
                        userAvatarUrl = user.avatarUrl,
                        itemName = item.name,
                        itemCategory = item.category
                    )

                    when (ratingResult) {
                        is Result.Success -> {
                            _uiState.value = AddRatingUiState.Success(ratingResult.data)
                        }
                        is Result.Error -> {
                            _uiState.value = AddRatingUiState.Error(
                                ratingResult.exception.message ?: "Failed to create rating"
                            )
                        }
                        is Result.Loading -> {}
                    }
                }
                is Result.Error -> {
                    _uiState.value = AddRatingUiState.Error(
                        itemResult.exception.message ?: "Failed to create item"
                    )
                }
                is Result.Loading -> {}
            }
        }
    }
}

sealed class AddRatingUiState {
    data object Idle : AddRatingUiState()
    data object Loading : AddRatingUiState()
    data class Success(val ratingId: String) : AddRatingUiState()
    data class Error(val message: String) : AddRatingUiState()
}
