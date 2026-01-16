package com.rateit.app.ui.groups

import android.content.Intent
import android.os.Bundle
import androidx.activity.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.rateit.app.R
import com.rateit.app.databinding.ActivityCreateGroupBinding
import com.rateit.app.ui.common.BaseActivity
import com.rateit.app.ui.common.gone
import com.rateit.app.ui.common.visible
import com.rateit.app.ui.feed.GroupFeedActivity
import com.rateit.app.util.Constants
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class CreateGroupActivity : BaseActivity() {

    private lateinit var binding: ActivityCreateGroupBinding
    private val viewModel: CreateGroupViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCreateGroupBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupToolbar()
        setupViews()
        observeState()
    }

    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.apply {
            setDisplayHomeAsUpEnabled(true)
            title = getString(R.string.create_group)
        }
        binding.toolbar.setNavigationOnClickListener { finish() }
    }

    private fun setupViews() {
        binding.btnCreate.setOnClickListener {
            val name = binding.etGroupName.text.toString()
            val webhookUrl = binding.etWebhookUrl.text.toString()
            viewModel.createGroup(name, webhookUrl)
        }
    }

    private fun observeState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    when (state) {
                        is CreateGroupUiState.Idle -> {
                            binding.progressBar.gone()
                            binding.btnCreate.isEnabled = true
                        }
                        is CreateGroupUiState.Loading -> {
                            binding.progressBar.visible()
                            binding.btnCreate.isEnabled = false
                        }
                        is CreateGroupUiState.Success -> {
                            binding.progressBar.gone()
                            navigateToGroupFeed(state.groupId)
                        }
                        is CreateGroupUiState.Error -> {
                            binding.progressBar.gone()
                            binding.btnCreate.isEnabled = true
                            showSnackbar(state.message)
                        }
                    }
                }
            }
        }
    }

    private fun navigateToGroupFeed(groupId: String) {
        val intent = Intent(this, GroupFeedActivity::class.java)
        intent.putExtra(Constants.EXTRA_GROUP_ID, groupId)
        intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP
        startActivity(intent)
        finish()
    }
}
