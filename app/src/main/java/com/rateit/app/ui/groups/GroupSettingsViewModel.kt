package com.rateit.app.ui.groups

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rateit.app.data.model.Group
import com.rateit.app.data.model.User
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
class GroupSettingsViewModel @Inject constructor(
    private val groupRepository: GroupRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<GroupSettingsUiState>(GroupSettingsUiState.Loading)
    val uiState: StateFlow<GroupSettingsUiState> = _uiState.asStateFlow()

    private val _actionState = MutableStateFlow<GroupActionState>(GroupActionState.Idle)
    val actionState: StateFlow<GroupActionState> = _actionState.asStateFlow()

    private var groupId: String = ""

    fun loadGroup(groupId: String) {
        this.groupId = groupId

        viewModelScope.launch {
            _uiState.value = GroupSettingsUiState.Loading

            when (val result = groupRepository.getGroup(groupId)) {
                is Result.Success -> {
                    val group = result.data
                    if (group != null) {
                        val currentUserId = authRepository.getCurrentUserId() ?: ""
                        _uiState.value = GroupSettingsUiState.Success(
                            group = group,
                            isOwner = group.isOwner(currentUserId),
                            currentUserId = currentUserId
                        )
                    } else {
                        _uiState.value = GroupSettingsUiState.Error("Group not found")
                    }
                }
                is Result.Error -> {
                    _uiState.value = GroupSettingsUiState.Error(
                        result.exception.message ?: "Failed to load group"
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun updateWebhookUrl(webhookUrl: String?) {
        val currentState = _uiState.value as? GroupSettingsUiState.Success ?: return

        viewModelScope.launch {
            _actionState.value = GroupActionState.Loading

            val updatedGroup = currentState.group.copy(
                discordWebhookUrl = webhookUrl?.takeIf { it.isNotBlank() }
            )

            when (val result = groupRepository.updateGroup(updatedGroup)) {
                is Result.Success -> {
                    _actionState.value = GroupActionState.Success("Webhook updated")
                    loadGroup(groupId)
                }
                is Result.Error -> {
                    _actionState.value = GroupActionState.Error(
                        result.exception.message ?: "Failed to update webhook"
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun removeMember(userId: String) {
        viewModelScope.launch {
            _actionState.value = GroupActionState.Loading

            when (val result = groupRepository.removeMember(groupId, userId)) {
                is Result.Success -> {
                    _actionState.value = GroupActionState.Success("Member removed")
                    loadGroup(groupId)
                }
                is Result.Error -> {
                    _actionState.value = GroupActionState.Error(
                        result.exception.message ?: "Failed to remove member"
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun leaveGroup() {
        val userId = authRepository.getCurrentUserId() ?: return

        viewModelScope.launch {
            _actionState.value = GroupActionState.Loading

            when (val result = groupRepository.leaveGroup(groupId, userId)) {
                is Result.Success -> {
                    _actionState.value = GroupActionState.LeftGroup
                }
                is Result.Error -> {
                    _actionState.value = GroupActionState.Error(
                        result.exception.message ?: "Failed to leave group"
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun deleteGroup() {
        viewModelScope.launch {
            _actionState.value = GroupActionState.Loading

            when (val result = groupRepository.deleteGroup(groupId)) {
                is Result.Success -> {
                    _actionState.value = GroupActionState.DeletedGroup
                }
                is Result.Error -> {
                    _actionState.value = GroupActionState.Error(
                        result.exception.message ?: "Failed to delete group"
                    )
                }
                is Result.Loading -> {}
            }
        }
    }

    fun resetActionState() {
        _actionState.value = GroupActionState.Idle
    }
}

sealed class GroupSettingsUiState {
    data object Loading : GroupSettingsUiState()
    data class Success(
        val group: Group,
        val isOwner: Boolean,
        val currentUserId: String
    ) : GroupSettingsUiState()
    data class Error(val message: String) : GroupSettingsUiState()
}

sealed class GroupActionState {
    data object Idle : GroupActionState()
    data object Loading : GroupActionState()
    data class Success(val message: String) : GroupActionState()
    data class Error(val message: String) : GroupActionState()
    data object LeftGroup : GroupActionState()
    data object DeletedGroup : GroupActionState()
}
