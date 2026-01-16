package com.rateit.app.data.remote

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.ktx.snapshots
import com.rateit.app.data.model.*
import com.rateit.app.util.Constants
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FirestoreDataSource @Inject constructor(
    private val firestore: FirebaseFirestore
) {
    // Users
    suspend fun getUser(userId: String): User? {
        return firestore.collection(Constants.COLLECTION_USERS)
            .document(userId)
            .get()
            .await()
            .toObject(User::class.java)
    }

    suspend fun saveUser(user: User) {
        firestore.collection(Constants.COLLECTION_USERS)
            .document(user.id)
            .set(user)
            .await()
    }

    // Groups
    fun getUserGroups(userId: String): Flow<List<Group>> {
        return firestore.collection(Constants.COLLECTION_GROUPS)
            .whereArrayContains("memberIds", userId)
            .snapshots()
            .map { snapshot ->
                snapshot.documents.mapNotNull { it.toObject(Group::class.java) }
            }
    }

    suspend fun getGroup(groupId: String): Group? {
        return firestore.collection(Constants.COLLECTION_GROUPS)
            .document(groupId)
            .get()
            .await()
            .toObject(Group::class.java)
    }

    suspend fun getGroupByInviteCode(inviteCode: String): Group? {
        return firestore.collection(Constants.COLLECTION_GROUPS)
            .whereEqualTo("inviteCode", inviteCode.uppercase())
            .limit(1)
            .get()
            .await()
            .documents
            .firstOrNull()
            ?.toObject(Group::class.java)
    }

    suspend fun createGroup(group: Group): String {
        val docRef = firestore.collection(Constants.COLLECTION_GROUPS).document()
        val groupWithId = group.copy(id = docRef.id)
        docRef.set(groupWithId).await()
        return docRef.id
    }

    suspend fun updateGroup(group: Group) {
        firestore.collection(Constants.COLLECTION_GROUPS)
            .document(group.id)
            .set(group)
            .await()
    }

    suspend fun deleteGroup(groupId: String) {
        firestore.collection(Constants.COLLECTION_GROUPS)
            .document(groupId)
            .delete()
            .await()
    }

    suspend fun addMemberToGroup(groupId: String, userId: String) {
        val group = getGroup(groupId) ?: return
        val updatedMembers = group.memberIds + userId
        firestore.collection(Constants.COLLECTION_GROUPS)
            .document(groupId)
            .update("memberIds", updatedMembers)
            .await()
    }

    suspend fun removeMemberFromGroup(groupId: String, userId: String) {
        val group = getGroup(groupId) ?: return
        val updatedMembers = group.memberIds - userId
        firestore.collection(Constants.COLLECTION_GROUPS)
            .document(groupId)
            .update("memberIds", updatedMembers)
            .await()
    }

    // Items
    fun getGroupItems(groupId: String): Flow<List<Item>> {
        return firestore.collection(Constants.COLLECTION_ITEMS)
            .whereEqualTo("groupId", groupId)
            .orderBy("averageScore", Query.Direction.DESCENDING)
            .snapshots()
            .map { snapshot ->
                snapshot.documents.mapNotNull { it.toObject(Item::class.java) }
            }
    }

    suspend fun getItem(itemId: String): Item? {
        return firestore.collection(Constants.COLLECTION_ITEMS)
            .document(itemId)
            .get()
            .await()
            .toObject(Item::class.java)
    }

    suspend fun findItemByNormalizedName(groupId: String, normalizedName: String): Item? {
        return firestore.collection(Constants.COLLECTION_ITEMS)
            .whereEqualTo("groupId", groupId)
            .whereEqualTo("normalizedName", normalizedName)
            .limit(1)
            .get()
            .await()
            .documents
            .firstOrNull()
            ?.toObject(Item::class.java)
    }

    suspend fun createItem(item: Item): String {
        val docRef = firestore.collection(Constants.COLLECTION_ITEMS).document()
        val itemWithId = item.copy(id = docRef.id)
        docRef.set(itemWithId).await()
        return docRef.id
    }

    suspend fun searchItems(groupId: String, query: String): List<Item> {
        // Simple prefix search - for better search, consider Algolia or similar
        val normalizedQuery = query.lowercase()
        return firestore.collection(Constants.COLLECTION_ITEMS)
            .whereEqualTo("groupId", groupId)
            .orderBy("normalizedName")
            .startAt(normalizedQuery)
            .endAt(normalizedQuery + "\uf8ff")
            .limit(10)
            .get()
            .await()
            .documents
            .mapNotNull { it.toObject(Item::class.java) }
    }

    // Ratings
    fun getGroupRatings(groupId: String): Flow<List<Rating>> {
        return firestore.collection(Constants.COLLECTION_RATINGS)
            .whereEqualTo("groupId", groupId)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .snapshots()
            .map { snapshot ->
                snapshot.documents.mapNotNull { it.toObject(Rating::class.java) }
            }
    }

    fun getItemRatings(itemId: String): Flow<List<Rating>> {
        return firestore.collection(Constants.COLLECTION_RATINGS)
            .whereEqualTo("itemId", itemId)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .snapshots()
            .map { snapshot ->
                snapshot.documents.mapNotNull { it.toObject(Rating::class.java) }
            }
    }

    suspend fun getRating(ratingId: String): Rating? {
        return firestore.collection(Constants.COLLECTION_RATINGS)
            .document(ratingId)
            .get()
            .await()
            .toObject(Rating::class.java)
    }

    suspend fun createRating(rating: Rating): String {
        val docRef = firestore.collection(Constants.COLLECTION_RATINGS).document()
        val ratingWithId = rating.copy(id = docRef.id)
        docRef.set(ratingWithId).await()
        return docRef.id
    }

    suspend fun updateRating(rating: Rating) {
        firestore.collection(Constants.COLLECTION_RATINGS)
            .document(rating.id)
            .set(rating)
            .await()
    }

    suspend fun deleteRating(ratingId: String) {
        firestore.collection(Constants.COLLECTION_RATINGS)
            .document(ratingId)
            .delete()
            .await()
    }

    // Comments
    fun getRatingComments(ratingId: String): Flow<List<Comment>> {
        return firestore.collection(Constants.COLLECTION_COMMENTS)
            .whereEqualTo("ratingId", ratingId)
            .orderBy("createdAt", Query.Direction.ASCENDING)
            .snapshots()
            .map { snapshot ->
                snapshot.documents.mapNotNull { it.toObject(Comment::class.java) }
            }
    }

    suspend fun createComment(comment: Comment): String {
        val docRef = firestore.collection(Constants.COLLECTION_COMMENTS).document()
        val commentWithId = comment.copy(id = docRef.id)
        docRef.set(commentWithId).await()
        return docRef.id
    }

    suspend fun deleteComment(commentId: String) {
        firestore.collection(Constants.COLLECTION_COMMENTS)
            .document(commentId)
            .delete()
            .await()
    }
}
