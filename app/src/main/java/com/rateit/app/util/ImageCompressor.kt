package com.rateit.app.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ImageCompressor @Inject constructor() {

    suspend fun compressImage(context: Context, uri: Uri): File = withContext(Dispatchers.IO) {
        val inputStream = context.contentResolver.openInputStream(uri)
            ?: throw IllegalArgumentException("Cannot open input stream for URI")

        val originalBitmap = BitmapFactory.decodeStream(inputStream)
        inputStream.close()

        // Resize if too large
        val scaledBitmap = if (originalBitmap.width > Constants.MAX_IMAGE_DIMENSION ||
            originalBitmap.height > Constants.MAX_IMAGE_DIMENSION
        ) {
            val scale = Constants.MAX_IMAGE_DIMENSION.toFloat() /
                    maxOf(originalBitmap.width, originalBitmap.height)
            Bitmap.createScaledBitmap(
                originalBitmap,
                (originalBitmap.width * scale).toInt(),
                (originalBitmap.height * scale).toInt(),
                true
            )
        } else {
            originalBitmap
        }

        // Compress to file
        val file = File(context.cacheDir, "upload_${System.currentTimeMillis()}.jpg")
        FileOutputStream(file).use { out ->
            scaledBitmap.compress(Bitmap.CompressFormat.JPEG, Constants.IMAGE_QUALITY, out)
        }

        // Clean up if we created a new bitmap
        if (scaledBitmap != originalBitmap) {
            scaledBitmap.recycle()
        }
        originalBitmap.recycle()

        file
    }
}
