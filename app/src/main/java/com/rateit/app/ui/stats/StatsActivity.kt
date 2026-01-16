package com.rateit.app.ui.stats

import android.os.Bundle
import androidx.activity.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.google.android.material.tabs.TabLayoutMediator
import com.rateit.app.R
import com.rateit.app.databinding.ActivityStatsBinding
import com.rateit.app.ui.common.BaseActivity
import com.rateit.app.ui.common.gone
import com.rateit.app.ui.common.visible
import com.rateit.app.util.Constants
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class StatsActivity : BaseActivity() {

    private lateinit var binding: ActivityStatsBinding
    private val viewModel: StatsViewModel by viewModels()
    private var statsPagerAdapter: StatsPagerAdapter? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityStatsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val groupId = intent.getStringExtra(Constants.EXTRA_GROUP_ID) ?: run {
            finish()
            return
        }

        setupToolbar()
        observeState()

        viewModel.loadStats(groupId)
    }

    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.apply {
            setDisplayHomeAsUpEnabled(true)
            title = getString(R.string.stats)
        }
        binding.toolbar.setNavigationOnClickListener { finish() }
    }

    private fun setupViewPager(stats: StatsData) {
        statsPagerAdapter = StatsPagerAdapter(this, stats)
        binding.viewPager.adapter = statsPagerAdapter

        TabLayoutMediator(binding.tabLayout, binding.viewPager) { tab, position ->
            tab.text = when (position) {
                0 -> getString(R.string.top_rated)
                1 -> getString(R.string.most_rated)
                2 -> getString(R.string.categories)
                3 -> getString(R.string.leaderboard)
                else -> ""
            }
        }.attach()
    }

    private fun observeState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    when (state) {
                        is StatsUiState.Loading -> {
                            binding.progressBar.visible()
                            binding.viewPager.gone()
                            binding.tabLayout.gone()
                        }
                        is StatsUiState.Success -> {
                            binding.progressBar.gone()
                            binding.viewPager.visible()
                            binding.tabLayout.visible()
                            setupViewPager(state.stats)
                        }
                        is StatsUiState.Error -> {
                            binding.progressBar.gone()
                            showSnackbar(state.message)
                        }
                    }
                }
            }
        }
    }
}
