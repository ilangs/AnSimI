package com.ansimi.app

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
            val deepLink = Uri.parse("ansimi://share?text=$encoded")
            startActivity(Intent(Intent.ACTION_VIEW, deepLink).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            })
        }
        finish()
    }
}
