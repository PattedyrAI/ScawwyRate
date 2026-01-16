package com.rateit.app.data.model

enum class Category(val displayName: String) {
    FOOD("Food"),
    MOVIES("Movies"),
    GAMES("Games"),
    MUSIC("Music"),
    PLACES("Places"),
    OTHER("Other");

    companion object {
        fun fromString(value: String): Category {
            return entries.find { it.displayName.equals(value, ignoreCase = true) }
                ?: OTHER
        }

        fun all(): List<Category> = entries.toList()
    }
}
