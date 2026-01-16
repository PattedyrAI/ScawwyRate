package com.rateit.app.ui.feed

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.rateit.app.data.model.Rating
import com.rateit.app.databinding.ItemRatingBinding
import com.rateit.app.ui.common.getColorRes
import com.rateit.app.ui.common.gone
import com.rateit.app.ui.common.loadCircleImage
import com.rateit.app.ui.common.loadImage
import com.rateit.app.ui.common.toRelativeTime
import com.rateit.app.ui.common.visible

class RatingAdapter(
    private val onRatingClick: (Rating) -> Unit,
    private val onItemClick: (Rating) -> Unit
) : ListAdapter<Rating, RatingAdapter.RatingViewHolder>(RatingDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RatingViewHolder {
        val binding = ItemRatingBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return RatingViewHolder(binding)
    }

    override fun onBindViewHolder(holder: RatingViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class RatingViewHolder(
        private val binding: ItemRatingBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        init {
            binding.root.setOnClickListener {
                val position = bindingAdapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onRatingClick(getItem(position))
                }
            }

            binding.tvItemName.setOnClickListener {
                val position = bindingAdapterPosition
                if (position != RecyclerView.NO_POSITION) {
                    onItemClick(getItem(position))
                }
            }
        }

        fun bind(rating: Rating) {
            val context = binding.root.context

            // User info
            binding.ivUserAvatar.loadCircleImage(rating.userAvatarUrl)
            binding.tvUserName.text = rating.userName
            binding.tvTimestamp.text = rating.createdAt.toRelativeTime()

            // Item info
            binding.tvItemName.text = rating.itemName
            binding.tvCategory.text = rating.itemCategory

            // Score
            binding.tvScore.text = "${rating.score}/10"
            binding.tvScore.setTextColor(
                ContextCompat.getColor(context, rating.scoreColor.getColorRes())
            )

            // Image
            if (rating.hasImage) {
                binding.ivRatingImage.visible()
                binding.ivRatingImage.loadImage(rating.imageUrl)
            } else {
                binding.ivRatingImage.gone()
            }

            // Comment
            if (rating.hasComment) {
                binding.tvComment.visible()
                binding.tvComment.text = rating.comment
            } else {
                binding.tvComment.gone()
            }
        }
    }

    class RatingDiffCallback : DiffUtil.ItemCallback<Rating>() {
        override fun areItemsTheSame(oldItem: Rating, newItem: Rating): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Rating, newItem: Rating): Boolean {
            return oldItem == newItem
        }
    }
}
