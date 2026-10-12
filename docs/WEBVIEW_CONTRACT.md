# BGen WebView Contract

Что гарантирует BGen для каждой сгенерированной игры.

Этот документ описывает контракт между генератором (BGen) и средой исполнения (WebView, браузер, Telegram, любой Android WebView).

Все правила проверяются автоматически анализатором в core/src/analyze/.

---

## Гарантии

### 1. Self-contained
- Один HTML-файл: от <!DOCTYPE html> до </html>
- Все CSS inline в <style>
- Все JS inline в <script>
- Никаких внешних script src="http..."
- Никаких link href="http..."
- Никаких @import url(...) в CSS

Проверка: analyze/security.ts -> external-resources

### 2. Никаких модульных импортов
- Нет import ... from ...
- Нет require(...)
- Нет export ...

Проверка: analyze/security.ts -> module-imports

### 3. Ноль сетевых запросов в рантайме
- Нет fetch(...)
- Нет XMLHttpRequest
- Нет new WebSocket(...)

Игра работает офлайн после генерации. После того как файл сохранён на устройство, интернет больше не нужен.

Проверка: analyze/security.ts -> runtime-network

### 4. Никаких eval / new Function
- Нет eval(...)
- Нет new Function(...)

Это требование Android WebView CSP по умолчанию.

Проверка: analyze/security.ts -> eval

### 5. Никаких нативных диалогов
- Нет alert(...)
- Нет confirm(...)
- Нет prompt(...)

Эти вызовы блокируются в WebView, если WebChromeClient не переопределён.

Проверка: analyze/security.ts -> native-dialogs

### 6. Крупные бинарные ассеты запрещены
- Нет data:image/...;base64,... больше 5KB
- Только emoji, Canvas-рисование, простые SVG

Проверка: analyze/security.ts -> heavy-base64

### 7. Размер файла <= 80 KB
- Обычно 10-40 KB
- При превышении — warning, но не блокирует

Проверка: analyze/security.ts -> oversize

### 8. Есть meta viewport
- meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover"

Без этого WebView рендерит страницу шириной 980px, всё ломается.

Проверка: analyze/invariants.ts -> no-viewport

### 9. Есть игровой цикл
- requestAnimationFrame(...) или setInterval(...)

Проверка: analyze/invariants.ts -> no-game-loop

### 10. Есть обработчики ввода
- keydown (клавиатура)
- touchstart / touchmove / touchend (touch)
- click / pointerdown (мышь)

Минимум один из трёх обязателен, в идеале — все три.

Проверка: analyze/invariants.ts -> no-input

### 11. Есть touch-управление
- Слушатели touch-событий
- Экранные кнопки (требование к промпту)

Мобильный WebView без touch-управления неиграбелен.

Проверка: analyze/invariants.ts -> no-touch

### 12. Есть state machine
- Явные состояния: start, playing, gameover, win
- Переходы между ними

Без этого игра либо не начинается, либо не заканчивается.

Проверка: analyze/invariants.ts -> no-state-machine

### 13. Есть win/lose условие
- Проигрыш достижим
- Победа достижима (или бесконечная игра)

Проверка: analyze/invariants.ts -> no-win-lose

### 14. Есть restart
- Функция reset() / restart()
- Кнопка или тап для перезапуска

Проверка: analyze/invariants.ts -> no-restart

### 15. Адаптация под экран
- Обработчик resize или orientationchange
- Чтение innerWidth / innerHeight / clientWidth
- Canvas-скейлинг (если используется)

Проверка: analyze/invariants.ts -> no-resize

### 16. Блокировка жестов системы (для Telegram и embed)
- touch-action: none или manipulation в CSS
- overscroll-behavior: none в CSS
- preventDefault() в touchmove

Без этого свайпы в Telegram закрывают TMA, а в Android WebView скроллят родительский документ.

Проверка: не автоматическая, требование в промпте (HARD_RULES #14)

### 17. Safe-area учтена
- env(safe-area-inset-*) в CSS для HUD и кнопок

Иначе на iPhone с вырезом и на Android с жестовой навигацией интерфейс уходит под систему.

Проверка: не автоматическая, требование в промпте (HARD_RULES #13)

---

## Как проверить самостоятельно

### Способ 1 — через анализатор

Отправь запрос к API и посмотри поля warnings и repairedErrors:

curl -X POST https://bgenserver-production.up.railway.app/api/generate -H "content-type: application/json" -d "{\"prompt\":\"замути змейку\"}"

Если warnings пустой массив и repairedErrors пустой массив — все критичные проверки пройдены.

### Способ 2 — открыть в чистом WebView

1. Экспортируй игру кнопкой со стрелкой вниз в BGen
2. Полученный .html файл:
   - Открой в браузере
   - Или перенеси на Android и открой в любом WebView
   - Или открой через webview-test.html на Pages

### Способ 3 — встроенный тест-инструмент

Открой https://SKZHPRVT.github.io/BGen/webview-test.html

1. Вставь URL игры или её data-URL
2. Увидишь среду: userAgent, размер, touch, canvas, Web Audio
3. Игра запустится в iframe

Это доказательство: никакого Telegram, никакого нашего сервера, чистый WebView.

### Способ 4 — Android WebView (эталонный)

Минимальное Android-приложение (MainActivity.kt):

package com.bgen.demo

import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true
        webView.loadUrl("https://SKZHPRVT.github.io/BGen/webview-test.html")
        setContentView(webView)
    }
}

Без WebChromeClient, без JS-мостов, без Telegram SDK. Игра работает.

---

## Что НЕ гарантируется

- Серверный рендеринг — игра должна быть полностью client-side
- WebGL — используем Canvas 2D (совместимо со всем)
- Native API (камера, геолокация) — по умолчанию не запрашиваются
- Persistent data между сессиями — по умолчанию в памяти (можно localStorage)

---

## Итог для Билайна

Сгенерированная BGen-игра — это standalone артефакт:

[Промпт] -> [BGen Core] -> [HTML-файл 20KB] -> [WebView] -> играется
                                |
                        Можно сохранить
                        Отправить в чат
                        Открыть офлайн
                        Встроить в любое приложение

Наш сервер нужен только один раз — для генерации. После этого игра автономна.

Это ровно то, что нужно для встраивания в приложение Билайна: пользователь генерирует игру, получает .html и играет в любом WebView внутри приложения.