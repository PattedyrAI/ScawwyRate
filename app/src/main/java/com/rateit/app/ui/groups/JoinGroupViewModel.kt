package com.rateit.app.ui.groups

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rateit.app.data.repository.AuthRepository
import com.rateit.app.data.repository.GroupRepository
import com.rateit.app.util.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class JoinGroupViewModel @Inject constructor(
    private val groupRepository: GroupRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<JoinGroupUiState>(JoinGroupUiState.Idle)
    val uiState: StateFlow<JoinGroupUiState> = _uiState.asStateFlow()

    fun joinGroup(inviteCode: String) {
        if (inviteCode.isBlank()) {
            _uiState.value = JoinGroupUiState.Error("Invite code is required")
            return
        }

        val userId = authRepository.getCurrentUserId()
        if (userId == null) {
            _uiState.value = JoinGroupUiState.Error("Not logged in")
            return
        }

        viewModelScope.launch {
            _uiState.value = JoinGroupUiState.Loading

            when (val result = groupRepository.joinGroup(inviteCode.trim(), userId)) {
                is Result.Success -> {
                    _uiState.value = JoinGroupUiState.Success(result.data)
                }
                is Result.Error -> {
                    _uiState.value = JoinGroupUiState.Error(
                        result.exception.message ?: "Failed to join group"
                    )
                }
                is Result.Loading -> {}
            }
        }
    }
}

sealed class JoinGroupUiState {
    data object Idle : JoinGroupUiState()
    data object Loading : JoinGroupUiState()
    data class Success(val groupId: String) : JoinGroupUiState()
    data class Error(val message: String) : JoinGroupUiState()
}
