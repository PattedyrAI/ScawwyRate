package com.rateit.app.data.repository

import com.rateit.app.data.model.Item
import com.rateit.app.data.remote.FirestoreDataSource
import com.rateit.app.util.ItemNameNormalizer
import com.rateit.app.util.Result
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ItemRepository @Inject constructor(
    private val firestoreDataSource: FirestoreDataSource
) {
    fun getGroupItems(groupId: String): Flow<List<Item>> {
        return firestoreDataSource.getGroupItems(groupId)
    }

    suspend fun getItem(itemId: String): Result<Item?> {
        return try {
            val item = firestoreDataSource.getItem(itemId)
            Result.Success(item)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    /**
     * Finds an existing item or creates a new one if it doesn't exist.
     * Uses normalized name for matching to handle duplicates.
     */
    suspend fun findOrCreateItem(
        groupId: String,
        rawName: String,
        category: String,
        createdBy: String
    ): Result<Item> {
        return try {
            val normalizedName = ItemNameNormalizer.normalize(rawName)

            // Check for existing item
            val existingItem = firestoreDataSource.findItemByNormalizedName(groupId, normalizedName)
            if (existingItem != null) {
                return Result.Success(existingItem)
            }

            // Create new item
            val newItem = Item(
                groupId = groupId,
                name = rawName,
                normalizedName = normalizedName,
                category = category,
                createdBy = createdBy
            )

            val itemId = firestoreDataSource.createItem(newItem)
            Result.Success(newItem.copy(id = itemId))
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    suspend fun searchItems(groupId: String, query: String): Result<List<Item>> {
        return try {
            val items = firestoreDataSource.searchItems(groupId, query)
            Result.Success(items)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}
