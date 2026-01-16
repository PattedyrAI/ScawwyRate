package com.rateit.app.ui.feed

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
import com.rateit.app.data.model.Rating
import com.rateit.app.databinding.ActivityGroupFeedBinding
import com.rateit.app.ui.common.BaseActivity
import com.rateit.app.ui.common.gone
import com.rateit.app.ui.common.visible
import com.rateit.app.ui.groups.GroupSettingsActivity
import com.rateit.app.ui.item.ItemDetailActivity
import com.rateit.app.ui.rating.AddRatingActivity
import com.rateit.app.ui.rating.RatingDetailActivity
import com.rateit.app.ui.stats.StatsActivity
import com.rateit.app.util.Constants
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class GroupFeedActivity : BaseActivity() {

    private lateinit var binding: ActivityGroupFeedBinding
    private val viewModel: GroupFeedViewModel by viewModels()
    private lateinit var ratingAdapter: RatingAdapter
    private var groupId: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityGroupFeedBinding.inflate(layoutInflater)
        setContentView(binding.root)

        groupId = intent.getStringExtra(Constants.EXTRA_GROUP_ID) ?: run {
            finish()
            return
        }

        setupToolbar()
        setupRecyclerView()
        setupFab()
        setupSwipeRefresh()
        observeState()

        viewModel.loadFeed(groupId)
    }

    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.apply {
            setDisplayHomeAsUpEnabled(true)
            title = "Feed"
        }
        binding.toolbar.setNavigationOnClickListener { finish() }
    }

    private fun setupRecyclerView() {
        ratingAdapter = RatingAdapter(
            onRatingClick = { rating -> navigateToRatingDetail(rating) },
            onItemClick = { rating -> navigateToItemDetail(rating) }
        )

        binding.rvRatings.apply {
            adapter = ratingAdapter
            layoutManager = LinearLayoutManager(this@GroupFeedActivity)
        }
    }

    private fun setupFab() {
        binding.fabAddRating.setOnClickListener {
            navigateToAddRating()
        }
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefresh.setOnRefreshListener {
            viewModel.loadFeed(groupId)
        }
    }

    private fun observeState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch {
                    viewModel.uiState.collect { state ->
                        binding.swipeRefresh.isRefreshing = false

                        when (state) {
                            is GroupFeedUiState.Loading -> {
                                binding.progressBar.visible()
                                binding.rvRatings.gone()
                                binding.emptyView.gone()
                            }
                            is GroupFeedUiState.Empty -> {
                                binding.progressBar.gone()
                                binding.rvRatings.gone()
                                binding.emptyView.visible()
                            }
                            is GroupFeedUiState.Success -> {
                                binding.progressBar.gone()
                                binding.emptyView.gone()
                                binding.rvRatings.visible()
                                ratingAdapter.submitList(state.ratings)
                            }
                            is GroupFeedUiState.Error -> {
                                binding.progressBar.gone()
                                showSnackbarWithAction(state.message, "Retry") {
                                    viewModel.loadFeed(groupId)
                                }
                            }
                        }
                    }
                }

                launch {
                    viewModel.groupState.collect { group ->
                        group?.let {
                            supportActionBar?.title = it.name
                        }
                    }
                }
            }
        }
    }

    private fun navigateToRatingDetail(rating: Rating) {
        val intent = Intent(this, RatingDetailActivity::class.java)
        intent.putExtra(Constants.EXTRA_RATING_ID, rating.id)
        intent.putExtra(Constants.EXTRA_GROUP_ID, groupId)
        startActivity(intent)
    }

    private fun navigateToItemDetail(rating: Rating) {
        val intent = Intent(this, ItemDetailActivity::class.java)
        intent.putExtra(Constants.EXTRA_ITEM_ID, rating.itemId)
        intent.putExtra(Constants.EXTRA_GROUP_ID, groupId)
        startActivity(intent)
    }

    private fun navigateToAddRating() {
        val intent = Intent(this, AddRatingActivity::class.java)
        intent.putExtra(Constants.EXTRA_GROUP_ID, groupId)
        startActivity(intent)
    }

    private fun navigateToStats() {
        val intent = Intent(this, StatsActivity::class.java)
        intent.putExtra(Constants.EXTRA_GROUP_ID, groupId)
        startActivity(intent)
    }

    private fun navigateToSettings() {
        val intent = Intent(this, GroupSettingsActivity::class.java)
        intent.putExtra(Constants.EXTRA_GROUP_ID, groupId)
        startActivity(intent)
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.menu_group_feed, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_stats -> {
                navigateToStats()
                true
            }
            R.id.action_settings -> {
                navigateToSettings()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }
}
