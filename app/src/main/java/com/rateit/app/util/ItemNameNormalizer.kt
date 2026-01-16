package com.rateit.app.util

object ItemNameNormalizer {
    /**
     * Normalizes item names for matching/deduplication purposes.
     * Converts to lowercase, trims whitespace, removes punctuation,
     * and collapses multiple spaces into one.
     */
    fun normalize(name: String): String {
        return name
            .lowercase()
            .trim()
            .replace(Regex("[^a-z0-9\\s]"), "")  // Remove punctuation
            .replace(Regex("\\s+"), " ")          // Collapse whitespace
    }
}
