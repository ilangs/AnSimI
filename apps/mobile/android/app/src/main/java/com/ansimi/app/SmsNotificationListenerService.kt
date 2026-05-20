package com.ansimi.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class SmsNotificationListenerService : NotificationListenerService() {

    companion object {
        private val SMS_PACKAGES = setOf(
            "com.samsung.android.messaging",
            "com.google.android.apps.messaging",
            "com.android.mms",
            "com.verizon.messaging.vzmsgs",
            "com.lge.message",
            "com.kttech.ims",
        )
        private const val CHANNEL_ID = "ansimi-alerts"
        private const val MIN_LENGTH = 10
        // 중복 분석 방지 (30초 이내 동일 텍스트)
        private val recentKeys = mutableMapOf<String, Long>()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName !in SMS_PACKAGES) return

        val prefs = getSharedPreferences("ansimi_prefs", Context.MODE_PRIVATE)
        val userId  = prefs.getString("userId",  null) ?: return
        val familyId = prefs.getString("familyId", null) ?: return
        val apiUrl  = prefs.getString("apiUrl",  null) ?: return

        val extras = sbn.notification.extras
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim() ?: ""
        val text    = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
        val smsContent = if (bigText.length > text.length) bigText else text

        if (smsContent.length < MIN_LENGTH) return

        // 중복 방지
        val now = System.currentTimeMillis()
        val key = smsContent.take(60)
        if (recentKeys[key]?.let { now - it < 30_000 } == true) return
        recentKeys[key] = now
        recentKeys.entries.removeAll { now - it.value > 60_000 }

        Thread {
            try {
                val result = callAnalyzeApi(apiUrl, smsContent, userId, familyId)
                val score = result.optInt("score", 0)
                if (score >= 26) showResultNotification(result, smsContent)
            } catch (_: Exception) {}
        }.start()
    }

    private fun callAnalyzeApi(
        apiUrl: String, message: String, userId: String, familyId: String
    ): JSONObject {
        val conn = (URL("$apiUrl/analyze").openConnection() as HttpURLConnection).also {
            it.requestMethod = "POST"
            it.setRequestProperty("Content-Type", "application/json")
            it.doOutput = true
            it.connectTimeout = 15_000
            it.readTimeout    = 30_000
        }
        val body = JSONObject().apply {
            put("message",  message)
            put("userId",   userId)
            put("familyId", familyId)
        }.toString()
        OutputStreamWriter(conn.outputStream).use { it.write(body) }
        val code = conn.responseCode
        val resp = conn.inputStream.bufferedReader().readText()
        if (code != 200) throw Exception("HTTP $code")
        return JSONObject(resp)
    }

    private fun showResultNotification(result: JSONObject, originalText: String) {
        val score  = result.optInt("score", 0)
        val action = result.optString("action", "주의하세요")

        val title = when {
            score >= 76 -> "🚨 위험 문자 감지!"
            score >= 51 -> "⚠️ 의심 문자 감지"
            else        -> "📋 주의 문자 확인"
        }
        val importance = when {
            score >= 51 -> NotificationManager.IMPORTANCE_HIGH
            else        -> NotificationManager.IMPORTANCE_DEFAULT
        }

        val preview = originalText.take(40) + if (originalText.length > 40) "..." else ""
        val body    = "\"$preview\"\n$action"

        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "안심이 위험 알림", importance)
            )
        }

        val launch = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pi = PendingIntent.getActivity(
            this, 0, launch ?: Intent(),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notif = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION") Notification.Builder(this)
        }.apply {
            setSmallIcon(android.R.drawable.ic_dialog_alert)
            setContentTitle(title)
            setContentText(body)
            setStyle(Notification.BigTextStyle().bigText(body))
            setContentIntent(pi)
            setAutoCancel(true)
        }.build()

        nm.notify((System.currentTimeMillis() % Int.MAX_VALUE).toInt(), notif)
    }
}
