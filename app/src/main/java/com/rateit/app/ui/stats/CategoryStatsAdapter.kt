package com.rateit.app.ui.stats

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.rateit.app.databinding.ItemCategoryStatBinding

class CategoryStatsAdapter(
    private val stats: List<CategoryStat>
) : RecyclerView.Adapter<CategoryStatsAdapter.ViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemCategoryStatBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(stats[position])
    }

    override fun getItemCount(): Int = stats.size

    inner class ViewHolder(
        private val binding: ItemCategoryStatBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(stat: CategoryStat) {
            binding.tvCategoryName.text = stat.name
            binding.tvItemCount.text = "${stat.itemCount} items"
            binding.tvAverageScore.text = String.format("%.1f avg", stat.averageScore)
        }
    }
}
