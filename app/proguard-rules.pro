# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Keep data classes for Firestore serialization
-keepclassmembers class com.rateit.app.data.model.** { *; }

# Firebase
-keepattributes Signature
-keepattributes *Annotation*

# Cloudinary
-keep class com.cloudinary.** { *; }
