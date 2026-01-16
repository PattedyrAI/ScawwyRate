package com.rateit.app.ui.stats

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.rateit.app.databinding.ItemMemberStatBinding
import com.rateit.app.ui.common.loadCircleImage

class MemberStatsAdapter(
    private val stats: List<MemberStat>
) : RecyclerView.Adapter<MemberStatsAdapter.ViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemMemberStatBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(stats[position], position)
    }

    override fun getItemCount(): Int = stats.size

    inner class ViewHolder(
        private val binding: ItemMemberStatBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(stat: MemberStat, position: Int) {
            binding.tvRank.text = "${position + 1}."
            binding.ivAvatar.loadCircleImage(stat.userAvatarUrl)
            binding.tvUserName.text = stat.userName
            binding.tvRatingCount.text = "${stat.ratingCount} ratings"
            binding.tvAverageScore.text = String.format("%.1f avg", stat.averageScore)
        }
    }
}
