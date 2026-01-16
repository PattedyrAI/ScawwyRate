package com.rateit.app.ui.common

import android.content.Context
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.ImageView
import androidx.core.content.ContextCompat
import coil.load
import coil.transform.CircleCropTransformation
import com.rateit.app.R
import com.rateit.app.data.model.ScoreColor
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

fun View.visible() {
    visibility = View.VISIBLE
}

fun View.gone() {
    visibility = View.GONE
}

fun View.invisible() {
    visibility = View.INVISIBLE
}

fun View.hideKeyboard() {
    val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
    imm.hideSoftInputFromWindow(windowToken, 0)
}

fun ImageView.loadCircleImage(url: String?, placeholder: Int = R.drawable.ic_person) {
    load(url) {
        crossfade(true)
        placeholder(placeholder)
        error(placeholder)
        transformations(CircleCropTransformation())
    }
}

fun ImageView.loadImage(url: String?, placeholder: Int = R.drawable.ic_image_placeholder) {
    load(url) {
        crossfade(true)
        placeholder(placeholder)
        error(placeholder)
    }
}

fun Long.toFormattedDate(): String {
    val sdf = SimpleDateFormat("MMM d, yyyy", Locale.getDefault())
    return sdf.format(Date(this))
}

fun Long.toFormattedDateTime(): String {
    val sdf = SimpleDateFormat("MMM d, yyyy 'at' h:mm a", Locale.getDefault())
    return sdf.format(Date(this))
}

fun Long.toRelativeTime(): String {
    val now = System.currentTimeMillis()
    val diff = now - this

    return when {
        diff < 60_000 -> "Just now"
        diff < 3_600_000 -> "${diff / 60_000}m ago"
        diff < 86_400_000 -> "${diff / 3_600_000}h ago"
        diff < 604_800_000 -> "${diff / 86_400_000}d ago"
        else -> toFormattedDate()
    }
}

fun ScoreColor.getColorRes(): Int {
    return when (this) {
        ScoreColor.EXCELLENT -> R.color.score_excellent
        ScoreColor.GOOD -> R.color.score_good
        ScoreColor.AVERAGE -> R.color.score_average
        ScoreColor.POOR -> R.color.score_poor
    }
}

fun Context.getScoreColor(scoreColor: ScoreColor): Int {
    return ContextCompat.getColor(this, scoreColor.getColorRes())
}
