package com.rateit.app.ui.rating

import android.os.Bundle
import androidx.activity.viewModels
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.recyclerview.widget.LinearLayoutManager
import com.rateit.app.data.model.Rating
import com.rateit.app.databinding.ActivityRatingDetailBinding
import com.rateit.app.ui.common.BaseActivity
import com.rateit.app.ui.common.getColorRes
import com.rateit.app.ui.common.gone
import com.rateit.app.ui.common.loadCircleImage
import com.rateit.app.ui.common.loadImage
import com.rateit.app.ui.common.toFormattedDateTime
import com.rateit.app.ui.common.visible
import com.rateit.app.util.Constants
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class RatingDetailActivity : BaseActivity() {

    private lateinit var binding: ActivityRatingDetailBinding
    private val viewModel: RatingDetailViewModel by viewModels()
    private lateinit var commentAdapter: CommentAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRatingDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val ratingId = intent.getStringExtra(Constants.EXTRA_RATING_ID) ?: run {
            finish()
            return
        }

        setupToolbar()
        setupCommentInput()
        observeState()

        viewModel.loadRating(ratingId)
    }

    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.apply {
            setDisplayHomeAsUpEnabled(true)
            title = "Rating"
        }
        binding.toolbar.setNavigationOnClickListener { finish() }
    }

    private fun setupCommentsRecyclerView() {
        commentAdapter = CommentAdapter(
            currentUserId = viewModel.getCurrentUserId(),
            onDeleteClick = { comment ->
                viewModel.deleteComment(comment.id)
            }
        )

        binding.rvComments.apply {
            adapter = commentAdapter
            layoutManager = LinearLayoutManager(this@RatingDetailActivity)
        }
    }

    private fun setupCommentInput() {
        binding.btnSendComment.setOnClickListener {
            val text = binding.etComment.text.toString()
            if (text.isNotBlank()) {
                viewModel.addComment(text)
            }
        }
    }

    private fun observeState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch {
                    viewModel.ratingState.collect { state ->
                        when (state) {
                            is RatingDetailState.Loading -> {
                                binding.progressBar.visible()
                                binding.contentLayout.gone()
                            }
                            is RatingDetailState.Success -> {
                                binding.progressBar.gone()
                                binding.contentLayout.visible()
                                displayRating(state.rating)
                                setupCommentsRecyclerView()
                            }
                            is RatingDetailState.Error -> {
                                binding.progressBar.gone()
                                showSnackbar(state.message)
                            }
                        }
                    }
                }

                launch {
                    viewModel.comments.collect { comments ->
                        if (::commentAdapter.isInitialized) {
                            commentAdapter.submitList(comments)
                            if (comments.isEmpty()) {
                                binding.tvNoComments.visible()
                            } else {
                                binding.tvNoComments.gone()
                            }
                        }
                    }
                }

                launch {
                    viewModel.commentState.collect { state ->
                        when (state) {
                            is CommentActionState.Idle -> {
                                binding.btnSendComment.isEnabled = true
                            }
                            is CommentActionState.Loading -> {
                                binding.btnSendComment.isEnabled = false
                            }
                            is CommentActionState.Success -> {
                                binding.etComment.text?.clear()
                                binding.btnSendComment.isEnabled = true
                                viewModel.resetCommentState()
                            }
                            is CommentActionState.Error -> {
                                binding.btnSendComment.isEnabled = true
                                showSnackbar(state.message)
                                viewModel.resetCommentState()
                            }
                        }
                    }
                }
            }
        }
    }

    private fun displayRating(rating: Rating) {
        // User info
        binding.ivUserAvatar.loadCircleImage(rating.userAvatarUrl)
        binding.tvUserName.text = rating.userName
        binding.tvTimestamp.text = rating.createdAt.toFormattedDateTime()

        // Item info
        binding.tvItemName.text = rating.itemName
        binding.tvCategory.text = rating.itemCategory

        // Score
        binding.tvScore.text = "${rating.score}/10"
        binding.tvScore.setTextColor(
            ContextCompat.getColor(this, rating.scoreColor.getColorRes())
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
