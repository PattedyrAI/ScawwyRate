package com.rateit.app.ui.stats

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.rateit.app.data.model.Item
import com.rateit.app.databinding.ItemStatsRankBinding

class ItemStatsAdapter(
    private val items: List<Item>,
    private val showRatingCount: Boolean = false,
    private val getRankText: (Int) -> String
) : RecyclerView.Adapter<ItemStatsAdapter.ViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemStatsRankBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position], position)
    }

    override fun getItemCount(): Int = items.size

    inner class ViewHolder(
        private val binding: ItemStatsRankBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(item: Item, position: Int) {
            binding.tvRank.text = getRankText(position)
            binding.tvName.text = item.name
            binding.tvCategory.text = item.category

            if (showRatingCount) {
                binding.tvScore.text = "${item.ratingCount} ratings"
            } else {
                binding.tvScore.text = String.format("%.1f", item.averageScore)
            }
        }
    }
}
