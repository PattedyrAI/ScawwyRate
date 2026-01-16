package com.rateit.app.ui.groups

import android.content.Intent
import android.os.Bundle
import androidx.activity.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.rateit.app.R
import com.rateit.app.databinding.ActivityJoinGroupBinding
import com.rateit.app.ui.common.BaseActivity
import com.rateit.app.ui.common.gone
import com.rateit.app.ui.common.visible
import com.rateit.app.ui.feed.GroupFeedActivity
import com.rateit.app.util.Constants
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class JoinGroupActivity : BaseActivity() {

    private lateinit var binding: ActivityJoinGroupBinding
    private val viewModel: JoinGroupViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityJoinGroupBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupToolbar()
        setupViews()
        observeState()
    }

    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.apply {
            setDisplayHomeAsUpEnabled(true)
            title = getString(R.string.join_group)
        }
        binding.toolbar.setNavigationOnClickListener { finish() }
    }

    private fun setupViews() {
        binding.btnJoin.setOnClickListener {
            val inviteCode = binding.etInviteCode.text.toString()
            viewModel.joinGroup(inviteCode)
        }
    }

    private fun observeState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    when (state) {
                        is JoinGroupUiState.Idle -> {
                            binding.progressBar.gone()
                            binding.btnJoin.isEnabled = true
                        }
                        is JoinGroupUiState.Loading -> {
                            binding.progressBar.visible()
                            binding.btnJoin.isEnabled = false
                        }
                        is JoinGroupUiState.Success -> {
                            binding.progressBar.gone()
                            showToast("Joined group successfully!")
                            navigateToGroupFeed(state.groupId)
                        }
                        is JoinGroupUiState.Error -> {
                            binding.progressBar.gone()
                            binding.btnJoin.isEnabled = true
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
