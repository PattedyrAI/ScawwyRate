package com.rateit.app.ui.groups

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rateit.app.data.model.Group
import com.rateit.app.data.repository.AuthRepository
import com.rateit.app.data.repository.GroupRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class GroupListViewModel @Inject constructor(
    private val groupRepository: GroupRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<GroupListUiState>(GroupListUiState.Loading)
    val uiState: StateFlow<GroupListUiState> = _uiState.asStateFlow()

    init {
        loadGroups()
    }

    fun loadGroups() {
        val userId = authRepository.getCurrentUserId() ?: return

        viewModelScope.launch {
            _uiState.value = GroupListUiState.Loading

            groupRepository.getUserGroups(userId)
                .catch { e ->
                    _uiState.value = GroupListUiState.Error(e.message ?: "Failed to load groups")
                }
                .collect { groups ->
                    _uiState.value = if (groups.isEmpty()) {
                        GroupListUiState.Empty
                    } else {
                        GroupListUiState.Success(groups)
                    }
                }
        }
    }

    fun signOut() {
        authRepository.signOut()
    }
}

sealed class GroupListUiState {
    data object Loading : GroupListUiState()
    data object Empty : GroupListUiState()
    data class Success(val groups: List<Group>) : GroupListUiState()
    data class Error(val message: String) : GroupListUiState()
}
