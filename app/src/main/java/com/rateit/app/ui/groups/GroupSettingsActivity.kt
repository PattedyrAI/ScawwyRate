package com.rateit.app.ui.groups

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.rateit.app.R
import com.rateit.app.databinding.ActivityGroupSettingsBinding
import com.rateit.app.ui.common.BaseActivity
import com.rateit.app.ui.common.gone
import com.rateit.app.ui.common.visible
import com.rateit.app.util.Constants
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class GroupSettingsActivity : BaseActivity() {

    private lateinit var binding: ActivityGroupSettingsBinding
    private val viewModel: GroupSettingsViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityGroupSettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val groupId = intent.getStringExtra(Constants.EXTRA_GROUP_ID)
        if (groupId == null) {
            finish()
            return
        }

        setupToolbar()
        setupViews()
        observeState()

        viewModel.loadGroup(groupId)
    }

    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.apply {
            setDisplayHomeAsUpEnabled(true)
            title = "Group Settings"
        }
        binding.toolbar.setNavigationOnClickListener { finish() }
    }

    private fun setupViews() {
        binding.btnCopyInviteCode.setOnClickListener {
            copyInviteCode()
        }

        binding.btnLeaveGroup.setOnClickListener {
            showLeaveConfirmation()
        }

        binding.btnDeleteGroup.setOnClickListener {
            showDeleteConfirmation()
        }

        binding.btnSaveWebhook.setOnClickListener {
            val webhookUrl = binding.etWebhookUrl.text.toString()
            viewModel.updateWebhookUrl(webhookUrl)
        }
    }

    private fun observeState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch {
                    viewModel.uiState.collect { state ->
                        when (state) {
                            is GroupSettingsUiState.Loading -> {
                                binding.progressBar.visible()
                                binding.contentLayout.gone()
                            }
                            is GroupSettingsUiState.Success -> {
                                binding.progressBar.gone()
                                binding.contentLayout.visible()
                                displayGroup(state)
                            }
                            is GroupSettingsUiState.Error -> {
                                binding.progressBar.gone()
                                showSnackbar(state.message)
                            }
                        }
                    }
                }

                launch {
                    viewModel.actionState.collect { state ->
                        when (state) {
                            is GroupActionState.Idle -> {}
                            is GroupActionState.Loading -> {
                                binding.progressBar.visible()
                            }
                            is GroupActionState.Success -> {
                                binding.progressBar.gone()
                                showToast(state.message)
                                viewModel.resetActionState()
                            }
                            is GroupActionState.Error -> {
                                binding.progressBar.gone()
                                showSnackbar(state.message)
                                viewModel.resetActionState()
                            }
                            is GroupActionState.LeftGroup -> {
                                navigateToGroupList()
                            }
                            is GroupActionState.DeletedGroup -> {
                                showToast("Group deleted")
                                navigateToGroupList()
                            }
                        }
                    }
                }
            }
        }
    }

    private fun displayGroup(state: GroupSettingsUiState.Success) {
        val group = state.group

        binding.tvGroupName.text = group.name
        binding.tvInviteCode.text = group.inviteCode
        binding.tvMemberCount.text = "${group.memberCount} members"
        binding.etWebhookUrl.setText(group.discordWebhookUrl ?: "")

        // Show/hide owner-only options
        if (state.isOwner) {
            binding.webhookSection.visible()
            binding.btnDeleteGroup.visible()
            binding.btnLeaveGroup.gone()
        } else {
            binding.webhookSection.gone()
            binding.btnDeleteGroup.gone()
            binding.btnLeaveGroup.visible()
        }
    }

    private fun copyInviteCode() {
        val state = viewModel.uiState.value as? GroupSettingsUiState.Success ?: return
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Invite Code", state.group.inviteCode)
        clipboard.setPrimaryClip(clip)
        showToast("Invite code copied!")
    }

    private fun showLeaveConfirmation() {
        AlertDialog.Builder(this)
            .setTitle("Leave Group")
            .setMessage("Are you sure you want to leave this group?")
            .setPositiveButton("Leave") { _, _ ->
                viewModel.leaveGroup()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showDeleteConfirmation() {
        AlertDialog.Builder(this)
            .setTitle("Delete Group")
            .setMessage("Are you sure you want to delete this group? This action cannot be undone.")
            .setPositiveButton("Delete") { _, _ ->
                viewModel.deleteGroup()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun navigateToGroupList() {
        val intent = Intent(this, GroupListActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
        startActivity(intent)
        finish()
    }
}
