# BGen — Android WebView Demo

Минимальное Android-приложение, доказывающее, что сгенерированные BGen-игры работают в чистом Android WebView — без Telegram, без BGen-сервера, без JS-мостов, без injection.

## Что внутри

- Один MainActivity.kt — ~50 строк
- WebView с включённым JS
- URL test-страницы, которая грузит игру в iframe
- Ничего больше

## Зачем

Это прямой ответ на вопрос заказчика (Билайн): "Докажите, что экспортированная игра работает в независимом Android WebView, а не только внутри Telegram."

## Как собрать

Требования:
- Android Studio (Arctic Fox или новее)
- Android SDK 24+ (Android 7.0)
- Kotlin

Шаги:
1. Открыть Android Studio -> New Project -> Empty Views Activity
2. Название: BGenDemo, пакет: com.bgen.demo
3. Language: Kotlin, Minimum SDK: API 24
4. Заменить MainActivity.kt на код из соседнего файла
5. Добавить в AndroidManifest.xml интернет-разрешение:

   <uses-permission android:name="android.permission.INTERNET" />

6. Запустить на устройстве или эмуляторе

## Как проверить

1. Собрать APK
2. Открыть приложение
3. В поле URL вставить ссылку на любую сгенерированную игру (или data-URL)
4. Убедиться: игра запускается, работает touch, победа/поражение доступны

## Что это доказывает

- Никакого Telegram SDK
- Никаких JS-мостов (addJavascriptInterface)
- Никаких внешних зависимостей в игре
- Игра работает как обычная HTML-страница в WebView
- Touch-управление, safe-area, адаптивность — всё работает штатными средствами WebView

## Скриншот для презентации

Сделай скриншот экрана Android с запущенной игрой и приложи к слайдам демо.