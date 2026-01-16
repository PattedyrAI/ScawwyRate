package com.rateit.app.ui.item

import android.content.Intent
import android.os.Bundle
import androidx.activity.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.recyclerview.widget.LinearLayoutManager
import com.rateit.app.R
import com.rateit.app.data.model.Item
import com.rateit.app.data.model.Rating
import com.rateit.app.databinding.ActivityItemDetailBinding
import com.rateit.app.ui.common.BaseActivity
import com.rateit.app.ui.common.gone
import com.rateit.app.ui.common.visible
import com.rateit.app.ui.feed.RatingAdapter
import com.rateit.app.ui.rating.RatingDetailActivity
import com.rateit.app.util.Constants
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class ItemDetailActivity : BaseActivity() {

    private lateinit var binding: ActivityItemDetailBinding
    private val viewModel: ItemDetailViewModel by viewModels()
    private lateinit var ratingAdapter: RatingAdapter
    private var groupId: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityItemDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val itemId = intent.getStringExtra(Constants.EXTRA_ITEM_ID) ?: run {
            finish()
            return
        }
        groupId = intent.getStringExtra(Constants.EXTRA_GROUP_ID) ?: ""

        setupToolbar()
        setupRecyclerView()
        setupFilterChips()
        observeState()

        viewModel.loadItem(itemId)
    }

    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.apply {
            setDisplayHomeAsUpEnabled(true)
            title = "Item Details"
        }
        binding.toolbar.setNavigationOnClickListener { finish() }
    }

    private fun setupRecyclerView() {
        ratingAdapter = RatingAdapter(
            onRatingClick = { rating -> navigateToRatingDetail(rating) },
            onItemClick = { /* Already on item detail */ }
        )

        binding.rvRatings.apply {
            adapter = ratingAdapter
            layoutManager = LinearLayoutManager(this@ItemDetailActivity)
        }
    }

    private fun setupFilterChips() {
        binding.chipAll.setOnClickListener {
            if (viewModel.filterMyRatings.value) {
                viewModel.toggleFilter()
            }
        }

        binding.chipMyRatings.setOnClickListener {
            if (!viewModel.filterMyRatings.value) {
                viewModel.toggleFilter()
            }
        }
    }

    private fun observeState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch {
                    viewModel.itemState.collect { state ->
                        when (state) {
                            is ItemDetailState.Loading -> {
                                binding.progressBar.visible()
                                binding.contentLayout.gone()
                            }
                            is ItemDetailState.Success -> {
                                binding.progressBar.gone()
                                binding.contentLayout.visible()
                                displayItem(state.item)
                            }
                            is ItemDetailState.Error -> {
                                binding.progressBar.gone()
                                showSnackbar(state.message)
                            }
                        }
                    }
                }

                launch {
                    viewModel.ratings.collect { ratings ->
                        ratingAdapter.submitList(ratings)
                        if (ratings.isEmpty()) {
                            binding.tvNoRatings.visible()
                        } else {
                            binding.tvNoRatings.gone()
                        }
                    }
                }

                launch {
                    viewModel.filterMyRatings.collect { isFiltered ->
                        binding.chipAll.isChecked = !isFiltered
                        binding.chipMyRatings.isChecked = isFiltered
                    }
                }
            }
        }
    }

    private fun displayItem(item: Item) {
        supportActionBar?.title = item.name

        binding.tvItemName.text = item.name
        binding.chipCategory.text = item.category

        // Stats
        binding.tvGroupAverage.text = if (item.hasRatings) {
            String.format("%.1f", item.averageScore)
        } else {
            "-"
        }
        binding.tvRatingCount.text = item.ratingCount.toString()
        binding.tvHighestScore.text = if (item.hasRatings) item.highestScore.toString() else "-"
        binding.tvLowestScore.text = if (item.hasRatings) item.lowestScore.toString() else "-"

        // My average
        val myAverage = viewModel.getMyAverageScore()
        binding.tvMyAverage.text = myAverage?.let { String.format("%.1f", it) } ?: "-"
    }

    private fun navigateToRatingDetail(rating: Rating) {
        val intent = Intent(this, RatingDetailActivity::class.java)
        intent.putExtra(Constants.EXTRA_RATING_ID, rating.id)
        intent.putExtra(Constants.EXTRA_GROUP_ID, groupId)
        startActivity(intent)
    }
}
