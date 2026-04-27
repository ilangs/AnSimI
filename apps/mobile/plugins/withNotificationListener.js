/**
 * Expo Config Plugin — Android NotificationListenerService (자동 SMS 분석)
 *
 * 동작 원리:
 * 1. SmsNotificationListenerService: 삼성/구글 메시지 앱 알림 감지
 * 2. 알림 텍스트를 추출 → Vercel API(/api/analyze) 직접 호출
 * 3. 위험 감지 시 로컬 알림 표시 (앱이 닫혀 있어도 동작)
 * 4. API가 자녀→부모, 부모→자녀 푸시 알림도 자동 발송
 *
 * 권한: android.permission.BIND_NOTIFICATION_LISTENER_SERVICE
 * → 시스템 설정 > 알림 접근 권한에서 사용자가 직접 허용
 *
 * AnsimiModule (NativeModule):
 * - saveCredentials(userId, familyId, apiUrl): SharedPreferences에 저장
 *   → Kotlin 서비스가 읽어서 API 호출에 사용
 * - clearCredentials(): 로그아웃 시 삭제
 * - isNotificationListenerEnabled(): 권한 허용 여부 확인
 * - openNotificationListenerSettings(): 설정 화면 열기
 */

const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// ─── Kotlin: SMS 알림 감지 → API 호출 → 로컬 알림 ────────────────────────────
const SMS_SERVICE_KT = `package com.ansimi.app

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
        val conn = (URL("\$apiUrl/analyze").openConnection() as HttpURLConnection).also {
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
        if (code != 200) throw Exception("HTTP \$code")
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
        val body    = "\\"\$preview\\"\\n\$action"

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
`;

// ─── Kotlin: NativeModule — SharedPreferences 저장/읽기, 권한 확인 ──────────────
const ANSIMI_MODULE_KT = `package com.ansimi.app

import android.content.Context
import android.provider.Settings
import com.facebook.react.bridge.*

class AnsimiModule(private val reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AnsimiModule"

    @ReactMethod
    fun saveCredentials(userId: String, familyId: String, apiUrl: String, promise: Promise) {
        try {
            reactContext.getSharedPreferences("ansimi_prefs", Context.MODE_PRIVATE)
                .edit()
                .putString("userId",   userId)
                .putString("familyId", familyId)
                .putString("apiUrl",   apiUrl)
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
`;

// ─── Kotlin: ReactPackage 등록 ────────────────────────────────────────────────
const ANSIMI_PACKAGE_KT = `package com.ansimi.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AnsimiPackage : ReactPackage {
    override fun createNativeModules(ctx: ReactApplicationContext): List<NativeModule> =
        listOf(AnsimiModule(ctx))
    override fun createViewManagers(ctx: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
`;

// ─────────────────────────────────────────────────────────────────────────────
module.exports = function withNotificationListener(config) {
  // 1. AndroidManifest: NotificationListenerService 등록
  config = withAndroidManifest(config, (c) => {
    const app = c.modResults.manifest.application?.[0];
    if (!app) return c;
    app.service = app.service ?? [];

    const alreadyAdded = app.service.some(
      (s) => s.$?.['android:name'] === '.SmsNotificationListenerService'
    );
    if (!alreadyAdded) {
      app.service.push({
        $: {
          'android:name': '.SmsNotificationListenerService',
          'android:exported': 'true',
          'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
        },
        'intent-filter': [{
          action: [{
            $: { 'android:name': 'android.service.notification.NotificationListenerService' },
          }],
        }],
      });
    }
    return c;
  });

  // 2. Kotlin 소스 파일 작성
  config = withDangerousMod(config, ['android', (c) => {
    const dir = path.join(
      c.modRequest.platformProjectRoot,
      'app/src/main/java/com/ansimi/app'
    );
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SmsNotificationListenerService.kt'), SMS_SERVICE_KT);
    fs.writeFileSync(path.join(dir, 'AnsimiModule.kt'), ANSIMI_MODULE_KT);
    fs.writeFileSync(path.join(dir, 'AnsimiPackage.kt'), ANSIMI_PACKAGE_KT);
    return c;
  }]);

  // 3. MainApplication.kt에 AnsimiPackage 등록
  config = withDangerousMod(config, ['android', (c) => {
    const mainAppPath = path.join(
      c.modRequest.platformProjectRoot,
      'app/src/main/java/com/ansimi/app/MainApplication.kt'
    );
    if (!fs.existsSync(mainAppPath)) return c;

    let content = fs.readFileSync(mainAppPath, 'utf8');
    if (content.includes('AnsimiPackage')) return c; // 이미 등록됨

    content = content.replace(
      'val packages = PackageList(this).packages',
      'val packages = PackageList(this).packages\n        packages.add(AnsimiPackage())'
    );
    fs.writeFileSync(mainAppPath, content);
    return c;
  }]);

  return config;
};
