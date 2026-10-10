package com.ansimi.app

import android.content.Context
import android.provider.Settings
import com.facebook.react.bridge.*

class AnsimiModule(private val reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AnsimiModule"

    @ReactMethod
    fun saveCredentials(
        userId: String,
        familyId: String,
        apiUrl: String,
        accessToken: String,
        promise: Promise
    ) {
        try {
            reactContext.getSharedPreferences("ansimi_prefs", Context.MODE_PRIVATE)
                .edit()
                .putString("userId",   userId)
                .putString("familyId", familyId)
                .putString("apiUrl",   apiUrl)
                .putString("accessToken", accessToken)
                .apply()
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("ERR", e.message) }
    }

    @ReactMethod
    fun clearCredentials(promise: Promise) {
        try {
            reactContext.getSharedPreferences("ansimi_prefs", Context.MODE_PRIVATE)
                .edit().clear().apply()
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("ERR", e.message) }
    }

    @ReactMethod
    fun isNotificationListenerEnabled(promise: Promise) {
        val flat = Settings.Secure.getString(
            reactContext.contentResolver, "enabled_notification_listeners"
        )
        promise.resolve(flat?.contains(reactContext.packageName) == true)
    }

    @ReactMethod
    fun openNotificationListenerSettings(promise: Promise) {
        try {
            reactContext.startActivity(
                android.content.Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS").apply {
                    flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                }
            )
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("ERR", e.message) }
    }
}
