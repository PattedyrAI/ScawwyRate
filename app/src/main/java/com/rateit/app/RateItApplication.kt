package com.rateit.app

import android.app.Application
import com.cloudinary.android.MediaManager
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class RateItApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        initCloudinary()
    }

    private fun initCloudinary() {
        val config = mapOf(
            "cloud_name" to BuildConfig.CLOUDINARY_CLOUD_NAME,
            "secure" to true
        )
        try {
            MediaManager.init(this, config)
        } catch (e: IllegalStateException) {
            // Already initialized
        }
    }
}
