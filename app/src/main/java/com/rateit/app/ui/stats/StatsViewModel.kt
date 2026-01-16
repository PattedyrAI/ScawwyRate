package com.rateit.app.ui.stats

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rateit.app.data.model.Item
import com.rateit.app.data.model.Rating
import com.rateit.app.data.repository.ItemRepository
import com.rateit.app.data.repository.RatingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class StatsViewModel @Inject constructor(
    private val itemRepository: ItemRepository,
    private val ratingRepository: RatingRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<StatsUiState>(StatsUiState.Loading)
    val uiState: StateFlow<StatsUiState> = _uiState.asStateFlow()

    fun loadStats(groupId: String) {
        viewModelScope.launch {
            _uiState.value = StatsUiState.Loading

            combine(
                itemRepository.getGroupItems(groupId),
                ratingRepository.getGroupRatings(groupId)
            ) { items, ratings ->
                StatsData(
                    topRated = items.filter { it.hasRatings }
                        .sortedByDescending { it.averageScore }
                        .take(10),
                    mostRated = items.filter { it.hasRatings }
                        .sortedByDescending { it.ratingCount }
                        .take(10),
                    categoryStats = calculateCategoryStats(items),
                    memberStats = calculateMemberStats(ratings)
                )
            }.catch { e ->
                _uiState.value = StatsUiState.Error(e.message ?: "Failed to load stats")
            }.collect { stats ->
                _uiState.value = StatsUiState.Success(stats)
            }
        }
    }

    private fun calculateCategoryStats(items: List<Item>): List<CategoryStat> {
        return items
            .filter { it.hasRatings }
            .groupBy { it.category }
            .map { (category, categoryItems) ->
                CategoryStat(
                    name = category,
                    itemCount = categoryItems.size,
                    averageScore = categoryItems.map { it.averageScore }.average().toFloat()
                )
            }
            .sortedByDescending { it.averageScore }
    }

    private fun calculateMemberStats(ratings: List<Rating>): List<MemberStat> {
        return ratings
            .groupBy { it.userId }
            .map { (userId, userRatings) ->
                val firstRating = userRatings.first()
                MemberStat(
                    userId = userId,
                    userName = firstRating.userName,
                    userAvatarUrl = firstRating.userAvatarUrl,
                    ratingCount = userRatings.size,
                    averageScore = userRatings.map { it.score }.average().toFloat()
                )
            }
            .sortedByDescending { it.ratingCount }
    }
}

sealed class StatsUiState {
    data object Loading : StatsUiState()
    data class Success(val stats: StatsData) : StatsUiState()
    data class Error(val message: String) : StatsUiState()
}

data class StatsData(
    val topRated: List<Item>,
    val mostRated: List<Item>,
    val categoryStats: List<CategoryStat>,
    val memberStats: List<MemberStat>
)

data class CategoryStat(
    val name: String,
    val itemCount: Int,
    val averageScore: Float
)

data class MemberStat(
    val userId: String,
    val userName: String,
    val userAvatarUrl: String,
    val ratingCount: Int,
    val averageScore: Float
)
