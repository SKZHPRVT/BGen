package com.bgen.demo

import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

/**
 * BGen — Android WebView Demo
 *
 * Минимальное приложение: открывает сгенерированную BGen-игру в чистом WebView.
 * Без Telegram SDK, без JS-мостов, без WebChromeClient.
 *
 * Опции:
 *   1. Открыть тест-страницу BGen — пользователь вводит URL игры вручную.
 *   2. Открыть игру из локального файла assets/game.html — полный офлайн.
 *   3. Открыть игру по URL — как хостинг.
 */
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.loadWithOverviewMode = true
            settings.useWideViewPort = true
            // Никаких JS-мостов!
            webViewClient = WebViewClient()
        }

        // Опция 1 (по умолчанию): тест-страница, где можно вставить URL игры
        webView.loadUrl("https://SKZHPRVT.github.io/BGen/webview-test.html")

        // Опция 2: офлайн-игра из assets/game.html (положить туда сгенерированный файл)
        // webView.loadUrl("file:///android_asset/game.html")

        // Опция 3: сгенерированная игра, залитая на любой хостинг
        // webView.loadUrl("https://твой-домен/game.html")

        setContentView(webView)
    }
}