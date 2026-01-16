package com.rateit.app.ui.auth

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.viewModels
import androidx.browser.customtabs.CustomTabsIntent
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.rateit.app.databinding.ActivityLoginBinding
import com.rateit.app.ui.common.BaseActivity
import com.rateit.app.ui.common.gone
import com.rateit.app.ui.common.visible
import com.rateit.app.ui.groups.GroupListActivity
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class LoginActivity : BaseActivity() {

    private lateinit var binding: ActivityLoginBinding
    private val viewModel: LoginViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Check if already signed in
        if (viewModel.isSignedIn()) {
            navigateToGroupList()
            return
        }

        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupViews()
        observeState()

        // Handle OAuth callback
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun setupViews() {
        binding.btnLoginDiscord.setOnClickListener {
            openDiscordAuth()
        }
    }

    private fun observeState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    when (state) {
                        is LoginUiState.Idle -> {
                            binding.progressBar.gone()
                            binding.btnLoginDiscord.isEnabled = true
                        }
                        is LoginUiState.Loading -> {
                            binding.progressBar.visible()
                            binding.btnLoginDiscord.isEnabled = false
                        }
                        is LoginUiState.Success -> {
                            binding.progressBar.gone()
                            navigateToGroupList()
                        }
                        is LoginUiState.Error -> {
                            binding.progressBar.gone()
                            binding.btnLoginDiscord.isEnabled = true
                            showSnackbarWithAction(
                                state.message,
                                "Retry"
                            ) { openDiscordAuth() }
                        }
                    }
                }
            }
        }
    }

    private fun openDiscordAuth() {
        val authUrl = viewModel.getAuthorizationUrl()
        val customTabsIntent = CustomTabsIntent.Builder()
            .setShowTitle(true)
            .build()
        customTabsIntent.launchUrl(this, Uri.parse(authUrl))
    }

    private fun handleIntent(intent: Intent) {
        val data = intent.data ?: return

        if (data.scheme == "rateit" && data.host == "auth" && data.path == "/callback") {
            val code = data.getQueryParameter("code")
            val error = data.getQueryParameter("error")

            when {
                code != null -> viewModel.handleAuthCallback(code)
                error != null -> showToast("Discord login cancelled")
            }
        }
    }

    private fun navigateToGroupList() {
        val intent = Intent(this, GroupListActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
}
