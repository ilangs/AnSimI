/**
 * Expo Config Plugin — Android Share Intent (text/plain)
 *
 * 동작 원리:
 * 1. ShareReceiverActivity를 AndroidManifest에 등록 (text/plain ACTION_SEND 수신)
 * 2. 사용자가 삼성 메시지 → [공유] → 안심이 선택 시 이 Activity가 실행됨
 * 3. Activity가 문자 내용을 읽어 ansimi://share?text=<인코딩> 딥링크로 메인 앱에 전달
 * 4. 메인 앱의 Linking 리스너가 텍스트를 받아 분석 화면으로 이동
 */
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Kotlin 소스 — 공유된 텍스트를 딥링크로 변환해 메인 앱에 전달
const SHARE_ACTIVITY_KT = `package com.ansimi.app

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import java.net.URLEncoder

class ShareReceiverActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val text = intent
            ?.takeIf { it.action == Intent.ACTION_SEND && it.type == "text/plain" }
            ?.getStringExtra(Intent.EXTRA_TEXT)
            .orEmpty()
            .trim()

        if (text.isNotBlank()) {
            val encoded = URLEncoder.encode(text, "UTF-8")
            val deepLink = Uri.parse("ansimi://share?text=\$encoded")
            startActivity(Intent(Intent.ACTION_VIEW, deepLink).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            })
        }
        finish()
    }
}
`;

module.exports = function withShareIntent(config) {
  // Step 1: AndroidManifest에 ShareReceiverActivity 선언 추가
  config = withAndroidManifest(config, (c) => {
    const app = c.modResults.manifest.application?.[0];
    if (!app) return c;
    if (!app.activity) app.activity = [];

    const alreadyAdded = app.activity.some(
      (a) => a.$?.['android:name'] === '.ShareReceiverActivity'
    );

    if (!alreadyAdded) {
      app.activity.push({
        $: {
          'android:name': '.ShareReceiverActivity',
          'android:label': '@string/app_name',
          'android:exported': 'true',
          'android:theme': '@android:style/Theme.NoDisplay',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
            category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
            data: [{ $: { 'android:mimeType': 'text/plain' } }],
          },
        ],
      });
    }

    return c;
  });

  // Step 2: Kotlin 소스 파일을 Android 프로젝트에 추가
  config = withDangerousMod(config, [
    'android',
    (c) => {
      const dir = path.join(
        c.modRequest.platformProjectRoot,
        'app/src/main/java/com/ansimi/app'
      );
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'ShareReceiverActivity.kt'), SHARE_ACTIVITY_KT);
      return c;
    },
  ]);

  return config;
};
