package com.rateit.app.ui.stats

import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import androidx.viewpager2.adapter.FragmentStateAdapter

class StatsPagerAdapter(
    activity: FragmentActivity,
    private val stats: StatsData
) : FragmentStateAdapter(activity) {

    override fun getItemCount(): Int = 4

    override fun createFragment(position: Int): Fragment {
        return when (position) {
            0 -> TopRatedFragment.newInstance(stats.topRated)
            1 -> MostRatedFragment.newInstance(stats.mostRated)
            2 -> CategoriesFragment.newInstance(stats.categoryStats)
            3 -> LeaderboardFragment.newInstance(stats.memberStats)
            else -> throw IllegalArgumentException("Invalid position: $position")
        }
    }
}
