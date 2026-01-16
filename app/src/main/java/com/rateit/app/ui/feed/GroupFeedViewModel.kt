package com.rateit.app.ui.feed

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rateit.app.data.model.Group
import com.rateit.app.data.model.Rating
import com.rateit.app.data.repository.AuthRepository
import com.rateit.app.data.repository.GroupRepository
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
class GroupFeedViewModel @Inject constructor(
    private val groupRepository: GroupRepository,
    private val ratingRepository: RatingRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<GroupFeedUiState>(GroupFeedUiState.Loading)
    val uiState: StateFlow<GroupFeedUiState> = _uiState.asStateFlow()

    private val _groupState = MutableStateFlow<Group?>(null)
    val groupState: StateFlow<Group?> = _groupState.asStateFlow()

    private var groupId: String = ""

    fun loadFeed(groupId: String) {
        this.groupId = groupId

        viewModelScope.launch {
            // Load group info
            when (val result = groupRepository.getGroup(groupId)) {
                is Result.Success -> _groupState.value = result.data
                else -> {}
            }

            // Load ratings
            ratingRepository.getGroupRatings(groupId)
                .catch { e ->
                    _uiState.value = GroupFeedUiState.Error(e.message ?: "Failed to load ratings")
                }
                .collect { ratings ->
                    _uiState.value = if (ratings.isEmpty()) {
                        GroupFeedUiState.Empty
                    } else {
                        GroupFeedUiState.Success(ratings)
                    }
                }
        }
    }

    fun getCurrentUserId(): String? = authRepository.getCurrentUserId()

    fun isGroupOwner(): Boolean {
        val group = _groupState.value ?: return false
        val userId = authRepository.getCurrentUserId() ?: return false
        return group.isOwner(userId)
    }
}

sealed class GroupFeedUiState {
    data object Loading : GroupFeedUiState()
    data object Empty : GroupFeedUiState()
    data class Success(val ratings: List<Rating>) : GroupFeedUiState()
    data class Error(val message: String) : GroupFeedUiState()
}
