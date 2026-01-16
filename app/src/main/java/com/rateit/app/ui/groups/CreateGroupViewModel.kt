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
class CreateGroupViewModel @Inject constructor(
    private val groupRepository: GroupRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<CreateGroupUiState>(CreateGroupUiState.Idle)
    val uiState: StateFlow<CreateGroupUiState> = _uiState.asStateFlow()

    fun createGroup(name: String, webhookUrl: String?) {
        if (name.isBlank()) {
            _uiState.value = CreateGroupUiState.Error("Group name is required")
            return
        }

        val userId = authRepository.getCurrentUserId()
        if (userId == null) {
            _uiState.value = CreateGroupUiState.Error("Not logged in")
            return
        }

        viewModelScope.launch {
            _uiState.value = CreateGroupUiState.Loading

            when (val result = groupRepository.createGroup(
                name = name.trim(),
                ownerId = userId,
                discordWebhookUrl = webhookUrl?.takeIf { it.isNotBlank() }
            )) {
                is Result.Success -> {
                    _uiState.value = CreateGroupUiState.Success(result.data)
                }
                is Result.Error -> {
                    _uiState.value = CreateGroupUiState.Error(
                        result.exception.message ?: "Failed to create group"
                    )
                }
                is Result.Loading -> {}
            }
        }
    }
}

sealed class CreateGroupUiState {
    data object Idle : CreateGroupUiState()
    data object Loading : CreateGroupUiState()
    data class Success(val groupId: String) : CreateGroupUiState()
    data class Error(val message: String) : CreateGroupUiState()
}
