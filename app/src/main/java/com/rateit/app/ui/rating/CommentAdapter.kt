package com.rateit.app.ui.rating

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.rateit.app.data.model.Comment
import com.rateit.app.databinding.ItemCommentBinding
import com.rateit.app.ui.common.gone
import com.rateit.app.ui.common.loadCircleImage
import com.rateit.app.ui.common.toRelativeTime
import com.rateit.app.ui.common.visible

class CommentAdapter(
    private val currentUserId: String?,
    private val onDeleteClick: (Comment) -> Unit
) : ListAdapter<Comment, CommentAdapter.CommentViewHolder>(CommentDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CommentViewHolder {
        val binding = ItemCommentBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return CommentViewHolder(binding)
    }

    override fun onBindViewHolder(holder: CommentViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class CommentViewHolder(
        private val binding: ItemCommentBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(comment: Comment) {
            binding.ivUserAvatar.loadCircleImage(comment.userAvatarUrl)
            binding.tvUserName.text = comment.userName
            binding.tvTimestamp.text = comment.createdAt.toRelativeTime()
            binding.tvComment.text = comment.text

            if (comment.userId == currentUserId) {
                binding.btnDelete.visible()
                binding.btnDelete.setOnClickListener {
                    onDeleteClick(comment)
                }
            } else {
                binding.btnDelete.gone()
            }
        }
    }

    class CommentDiffCallback : DiffUtil.ItemCallback<Comment>() {
        override fun areItemsTheSame(oldItem: Comment, newItem: Comment): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Comment, newItem: Comment): Boolean {
            return oldItem == newItem
        }
    }
}
