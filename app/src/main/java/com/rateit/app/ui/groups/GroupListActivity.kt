package com.rateit.app.ui.groups

import android.content.Intent
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import androidx.activity.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.recyclerview.widget.LinearLayoutManager
import com.rateit.app.R
import com.rateit.app.data.model.Group
import com.rateit.app.databinding.ActivityGroupListBinding
import com.rateit.app.ui.auth.LoginActivity
import com.rateit.app.ui.common.BaseActivity
import com.rateit.app.ui.common.gone
import com.rateit.app.ui.common.visible
import com.rateit.app.ui.feed.GroupFeedActivity
import com.rateit.app.util.Constants
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class GroupListActivity : BaseActivity() {

    private lateinit var binding: ActivityGroupListBinding
    private val viewModel: GroupListViewModel by viewModels()
    private lateinit var groupAdapter: GroupAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityGroupListBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupToolbar()
        setupRecyclerView()
        setupFab()
        setupSwipeRefresh()
        observeState()
    }

    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.title = getString(R.string.my_groups)
    }

    private fun setupRecyclerView() {
        groupAdapter = GroupAdapter { group ->
            navigateToGroupFeed(group)
        }

        binding.rvGroups.apply {
            adapter = groupAdapter
            layoutManager = LinearLayoutManager(this@GroupListActivity)
        }
    }

    private fun setupFab() {
        binding.fabAdd.setOnClickListener {
            showAddGroupOptions()
        }
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefresh.setOnRefreshListener {
            viewModel.loadGroups()
        }
    }

    private fun observeState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    binding.swipeRefresh.isRefreshing = false

                    when (state) {
                        is GroupListUiState.Loading -> {
                            binding.progressBar.visible()
                            binding.rvGroups.gone()
                            binding.emptyView.gone()
                        }
                        is GroupListUiState.Empty -> {
                            binding.progressBar.gone()
                            binding.rvGroups.gone()
                            binding.emptyView.visible()
                        }
                        is GroupListUiState.Success -> {
                            binding.progressBar.gone()
                            binding.emptyView.gone()
                            binding.rvGroups.visible()
                            groupAdapter.submitList(state.groups)
                        }
                        is GroupListUiState.Error -> {
                            binding.progressBar.gone()
                            showSnackbarWithAction(state.message, "Retry") {
                                viewModel.loadGroups()
                            }
                        }
                    }
                }
            }
        }
    }

    private fun showAddGroupOptions() {
        val options = arrayOf(
            getString(R.string.create_group),
            getString(R.string.join_group)
        )

        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Add Group")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> navigateToCreateGroup()
                    1 -> navigateToJoinGroup()
                }
            }
            .show()
    }

    private fun navigateToGroupFeed(group: Group) {
        val intent = Intent(this, GroupFeedActivity::class.java)
        intent.putExtra(Constants.EXTRA_GROUP_ID, group.id)
        startActivity(intent)
    }

    private fun navigateToCreateGroup() {
        startActivity(Intent(this, CreateGroupActivity::class.java))
    }

    private fun navigateToJoinGroup() {
        startActivity(Intent(this, JoinGroupActivity::class.java))
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.menu_group_list, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_logout -> {
                viewModel.signOut()
                navigateToLogin()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    private fun navigateToLogin() {
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
}
