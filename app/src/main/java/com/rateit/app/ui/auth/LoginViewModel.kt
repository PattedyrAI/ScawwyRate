package com.rateit.app.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rateit.app.data.repository.AuthRepository
import com.rateit.app.util.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun isSignedIn(): Boolean = authRepository.isSignedIn()

    fun getAuthorizationUrl(): String = authRepository.buildAuthorizationUrl()

    fun handleAuthCallback(code: String) {
        viewModelScope.launch {
            _uiState.value = LoginUiState.Loading

            when (val result = authRepository.exchangeCodeAndSignIn(code)) {
                is Result.Success -> {
                    _uiState.value = LoginUiState.Success
                }
                is Result.Error -> {
                    _uiState.value = LoginUiState.Error(
                        result.exception.message ?: "Login failed"
                    )
                }
                is Result.Loading -> {
                    // Already set above
                }
            }
        }
    }
}

sealed class LoginUiState {
    data object Idle : LoginUiState()
    data object Loading : LoginUiState()
    data object Success : LoginUiState()
    data class Error(val message: String) : LoginUiState()
}
