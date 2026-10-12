# Архитектура BGen

## Общая схема

┌──────────────────────────────────────────────────────────────┐
│                    Telegram Mini App (app/)                  │
│                                                              │
│   [prompt input] ──▶ [api.ts] ──▶ POST /api/generate        │
│                                       │                      │
│                                       ▼                      │
│   [iframe srcdoc] ◀── [html] ◀───────┘                       │
└──────────────────────────────────┬───────────────────────────┘
                                   │ HTTPS
                                   ▼
┌──────────────────────────────────────────────────────────────┐
│                       Server (server/)                        │
│                                                              │
│   Hono routes: /api/generate, /api/iterate, /api/health      │
│   Middleware: CORS, rateLimit, (planned) telegramAuth        │
│                                       │                      │
│                                       ▼                      │
│                          ┌───────────────────────┐           │
│                          │   Core (core/)         │           │
│                          │                        │           │
│                          │  classify() → GameSpec │           │
│                          │       ↓                │           │
│                          │  compile() → Prompt    │           │
│                          │       ↓                │           │
│                          │  retrieve() ← corpus   │           │
│                          │       ↓                │           │
│                          │  Router → LLM provider │           │
│                          │       ↓                │           │
│                          │  extractHTML()         │           │
│                          │       ↓                │           │
│                          │  analyze() → Report    │           │
│                          │       ↓                │           │
│                          │  repairLoop (if !ok)   │           │
│                          │       ↓                │           │
│                          │  SemanticCache.set()   │           │
│                          └───────────────────────┘           │
└──────────────────────────────────────────────────────────────┘
                                   │
                          ┌────────▼─────────┐
                          │  LLM (external)  │
                          │  Claude/OpenAI/  │
                          │  Ollama/Manual   │
                          └──────────────────┘

## Модули ядра

### prompt/

**classifier.ts** — превращает естественный язык в `GameSpec`.
Работает на эвристиках (regex + ключевые слова), без LLM. Детерминированно,
быстро, бесплатно.

Определяет: жанр (10 вариантов), аудиторию (4), механики (14), тему, ограничения.

**compiler.ts** — собирает системный и пользовательский промпт из блоков:
- `blocks.ts` — атомарные части (identity, hard rules, output format, quality)
- `genres.ts` — правила по жанрам
- `audiences.ts` — правила по аудиториям
- `mechanics.ts` — микро-правила по механикам
- `renderSpec.ts` — сериализация GameSpec в текст

**Важно:** промпт не пишется одной строкой наугад, а собирается из кусочков.
Это даёт воспроизводимость, расширяемость и лёгкую отладку.

### llm/

Провайдер-агностик. Все провайдеры реализуют `LLMProvider`:

| Провайдер     | Транспорт                    | Стриминг |
|---------------|------------------------------|----------|
| MockProvider   | фикстура                     | да (эмуляция) |
| ManualProvider | очередь из файла             | нет      |
| OllamaProvider | HTTP localhost:11434         | да (SSE) |
| AnthropicProvider | api.anthropic.com         | да (SSE) |
| OpenAIProvider | api.openai.com + совместимые | да (SSE) |

**Router** — единая точка входа. Фильтрует доступных провайдеров по `isAvailable()`
(наличие ключа), пробует по очереди с таймаутом и retry. Если все упали —
бросает агрегированную ошибку.

**stream.ts** — парсер SSE. Провайдеры отдают чанки через `onChunk`, что позволяет
UI показывать генерацию в реальном времени.

### analyze/

Статический анализ сгенерированного HTML. Без зависимостей, на регексах.

- **miniAst.ts** — извлекает структурные признаки: canvas, rAF, обработчики ввода,
  resize, state machine, restart, win/lose, score, viewport meta
- **invariants.ts** — игровые инварианты (есть ли цикл, ввод, победа)
- **security.ts** — WebView-совместимость (нет CDN, eval, alert, fetch)
- **report.ts** — сборка `AnalysisReport` с `errors[]` и `warnings[]`

Severity:
- **error** — блокирует приёмку, запускает repair loop
- **warning** — не блокирует, но идёт в фидбек и UI

### repair/

**loop.ts** — auto-repair.

attempt 1: generate → analyze
  if ok → return
  if !ok → построить фидбек
attempt 2: generate с фидбеком → analyze
  ...
attempt N: сдаться, вернуть последний результат

Фидбек (`strategies.ts`) — структурированный: список ошибок с id + hint,
текущий код, требования к ответу.

### corpus/

**Few-shot retrieval.** База эталонных игр в JSON. Retriever скорит записи
по совпадению жанра/аудитории/темы/механик + бонус за winRate.

Топ-2 примера вставляются в системный промпт. Это даёт LLM якорь стиля
и структуры, что заметно улучшает качество генерации.

### cache/

**SemanticCache** — in-memory LRU по ключу `genre|audience|theme|mechanics`.
TTL 24 часа. Повторный запрос с той же спекой отдаётся мгновенно, без LLM.

### telemetry/

**logger.ts** — структурные логи с уровнями (debug/info/warn/error).
**metrics.ts** — счётчики: generations, successes, cacheHits, repairsTriggered,
avgDurationMs, byGenre.

## Слои сервера

**server/src/index.ts** — Hono app.
- CORS middleware (`*` для dev)
- hono logger
- rate limit на `/api/generate` и `/api/iterate` (20 req/min на IP)
- роуты: `/api/health`, `/api/generate`, `/api/iterate`, `/api/stats`
- onError — глобальный обработчик

**routes/generate.ts** — создаёт один `generator` на весь процесс,
чтобы кэш переиспользовался между запросами.

## Слои app

**main.ts** — entry. Инициализирует Telegram SDK, монтирует UI, подписывается на store.

**store.ts** — простейший observable-store, без зависимостей. Хранит текущую игру
и историю (localStorage, 20 последних).

**ui/** — модульные компоненты: promptInput, previewFrame (iframe srcdoc),
iterationBar, gallery.

**api.ts** — типизированные обёртки над fetch.

**tg.ts** — обёртка Telegram.WebApp с фолбэками для локальной разработки.

## Поток данных при генерации

1. Пользователь вводит промпт в app
2. `api.generate()` → POST `/api/generate` с `{prompt, audience}`
3. Сервер: `generator.generate()` из `core/`
4. Core: `classify()` → GameSpec
5. Core: проверка кэша, если hit — вернуть сразу
6. Core: `retrieve()` few-shot примеров из corpus
7. Core: `compile()` → system + user промпт
8. Core: `router.generate()` → LLM (с стримингом)
9. Core: `extractHTML()` → чистый HTML
10. Core: `analyze()` → если !ok, repair loop
11. Core: `cache.set()` если ok
12. Server: JSON response с html + мета
13. App: `iframe.srcdoc = html` → игра готова

## Итеративная доработка

Пользователь вводит «сделай кнопки больше». App шлёт POST `/api/iterate`
с `{prompt, previousCode, previousPrompt}`.

Compiler строит промпт специального вида:
- «Вот текущий код игры, вот новый запрос, верни полный обновлённый HTML»

LLM правит код, всё остальное — как при обычной генерации.

## Ключевые решения

| Решение | Почему |
|---------|--------|
| Zero-deps ядро | Портативность, легко тестировать, никаких конфликтов |
| Эвристический classifier | Быстро, детерминированно, бесплатно |
| Few-shot из корпуса | LLM даёт стабильно лучше с якорем стиля |
| Repair loop | Первая генерация ~70% валидна, после 2-3 попыток — 95%+ |
| Semantic cache | Демо не тормозит, повторные запросы мгновенны |
| Mock provider | Тесты и офлайн-демо без сети |
| iframe srcdoc | Изоляция, мгновенный preview, works in WebView |
| Vanilla TS + Vite | WebView не любит вес, TMA грузится быстро |