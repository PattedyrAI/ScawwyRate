package com.rateit.app.ui.item

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rateit.app.data.model.Item
import com.rateit.app.data.model.Rating
import com.rateit.app.data.repository.AuthRepository
import com.rateit.app.data.repository.ItemRepository
import com.rateit.app.data.repository.RatingRepository
import com.rateit.app.util.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ItemDetailViewModel @Inject constructor(
    private val itemRepository: ItemRepository,
    private val ratingRepository: RatingRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _itemState = MutableStateFlow<ItemDetailState>(ItemDetailState.Loading)
    val itemState: StateFlow<ItemDetailState> = _itemState.asStateFlow()

    private val _ratings = MutableStateFlow<List<Rating>>(emptyList())
    val ratings: StateFlow<List<Rating>> = _ratings.asStateFlow()

    private val _filterMyRatings = MutableStateFlow(false)
    val filterMyRatings: StateFlow<Boolean> = _filterMyRatings.asStateFlow()

    private var allRatings: List<Rating> = emptyList()

    fun loadItem(itemId: String) {
        viewModelScope.launch {
            // Load item
            when (val result = itemRepository.getItem(itemId)) {
                is Result.Success -> {
                    val item = result.data
                    if (item != null) {
                        _itemState.value = ItemDetailState.Success(item)
                    } else {
                        _itemState.value = ItemDetailState.Error("Item not found")
                    }
                }
                is Result.Error -> {
                    _itemState.value = ItemDetailState.Error(
                        result.exception.message ?: "Failed to load item"
                    )
                }
                is Result.Loading -> {}
            }

            // Load ratings
            ratingRepository.getItemRatings(itemId)
                .catch { }
                .collect { ratings ->
                    allRatings = ratings
                    applyFilter()
                }
        }
    }

    fun toggleFilter() {
        _filterMyRatings.value = !_filterMyRatings.value
        applyFilter()
    }

    private fun applyFilter() {
        val userId = authRepository.getCurrentUserId()
        _ratings.value = if (_filterMyRatings.value && userId != null) {
            allRatings.filter { it.userId == userId }
        } else {
            allRatings
        }
    }

    fun getCurrentUserId(): String? = authRepository.getCurrentUserId()

    fun getMyAverageScore(): Float? {
        val userId = getCurrentUserId() ?: return null
        val myRatings = allRatings.filter { it.userId == userId }
        if (myRatings.isEmpty()) return null
        return myRatings.map { it.score }.average().toFloat()
    }
}

sealed class ItemDetailState {
    data object Loading : ItemDetailState()
    data class Success(val item: Item) : ItemDetailState()
    data class Error(val message: String) : ItemDetailState()
}
