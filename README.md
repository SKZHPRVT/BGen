# 🎮 BGen — Browser Game Generator

> Промпт → LLM → playable HTML5-игра → WebView.
> Самописное гипер-ядро + Telegram Mini App.

---

## 💡 Что это

BGen превращает текстовый запрос на естественном языке
(например, «замути змейку для бабушки») в готовую браузерную игру
на HTML5 Canvas, которую можно запустить в любом WebView —
включая Telegram Mini App.

Без ручного написания кода. Без серверных зависимостей в момент игры.
Один self-contained HTML-файл на выходе.

---

## 🏗 Архитектура

[Prompt] → [Classifier] → [GameSpec]
             ↓
       [Prompt Compiler] ← [Corpus Retriever]
             ↓
       [LLM Router] → [Extractor] → [Analyzer]
             ↓                        ↓
       [Repair Loop] ←───── [Invariants]
             ↓
       [Semantic Cache] → [HTML Game]
             ↓
       [TMA iframe] → playable

### Слои

- core/    — Гипер-ядро: компилятор промптов, LLM-роутер, валидатор, кэш
- server/  — Hono HTTP API: /api/generate, /api/iterate, /api/games
- app/     — Telegram Mini App: ввод промпта, preview, галерея
- corpus/  — База эталонных игр для few-shot retrieval
- tools/   — CLI-утилиты: генерация корпуса, тесты, бенчи
- docs/    — Документация, презентация, сценарий демо

---

## 🚀 Быстрый старт

### Требования
- Bun ≥ 1.1
- Node.js ≥ 20 (опционально)
- Git

### Установка

git clone https://github.com/SKZHPRVT/BGen.git
cd BGen
bun install
cp .env.example .env

### Запуск dev-режима

bun run dev

Поднимутся:
- server — http://localhost:3000
- app    — http://localhost:5173

### Тесты

bun test

---

## 🧠 Как работает генерация

1. Классификация — промпт разбирается на GameSpec:
   жанр, аудитория, механики, тема, ограничения.

2. Компиляция промпта — из блоков (identity, hard rules,
   genre rules, audience rules, output format) собирается
   системный промпт. Никакой «склейки строк наугад».

3. Few-shot retrieval — из корпуса подтягиваются 2–3
   эталонные игры, ближайшие по жанру/аудитории/механикам.

4. Генерация — LLM-роутер шлёт запрос провайдеру
   (Claude / OpenAI / Ollama / Manual), поддерживает стриминг.

5. Анализ — экстрактор вырезает HTML, анализатор
   проверяет инварианты: state machine, обработчики ввода,
   игровой цикл, отсутствие внешних зависимостей.

6. Repair Loop — при провале инвариантов LLM получает
   точный фидбек («нет touch-обработчика») и чинит код.

7. Кэш — результат сохраняется по семантическому ключу
   genre|audience|theme|mechanics, повторные запросы
   отдаются мгновенно.

---

## 🎯 Целевые сценарии

- Telegram Mini App — мини-игры по запросу внутри чата
- WebView в мобильных приложениях — встраивание без SDK
- Образование — генерация обучающих игр по теме
- Быстрый прототип — геймдизайнер проверяет идею за 30 секунд

---

## 🛠 Технологии

- Runtime:   Bun
- Язык:      TypeScript (strict)
- Сервер:    Hono
- Frontend:  Vanilla TS + Vite
- LLM:       Anthropic / OpenAI / Ollama / Manual
- Хранение:  JSON-файлы + in-memory LRU
- Стриминг:  Server-Sent Events

---

## 📁 Структура

BGen/
├── core/       # гипер-ядро (zero-deps)
├── server/     # HTTP API
├── app/        # Telegram Mini App
├── tools/      # CLI-утилиты
├── corpus/     # база эталонных игр
├── docs/       # документация и презентация
└── scripts/    # dev/build/docker

Подробнее — в docs/ARCHITECTURE.md.

---

## 📖 Документация

- docs/ARCHITECTURE.md — устройство ядра
- docs/PROMPTS.md — компилятор промптов
- docs/CORPUS.md — как пополнять базу игр
- docs/DEMO.md — сценарий презентации

---

## 👥 Команда

- SKZHPRVT — архитектура, ядро, сервер, TMA
- (добавьте остальных участников)

---

## 📄 Лицензия

MIT — см. LICENSE.

---

## 🙏 Благодарности

Проект создан в рамках хакатона по вайбкодингу игр.
Заказчик сценария использования — Билайн (WebView-интеграция).