# Корпус эталонных игр

## Что это

База готовых проверенных игр в JSON. Используется для few-shot retrieval:
при новой генерации ядро достаёт 2 наиболее близких примера по спеке и вставляет
в системный промпт.

Это даёт LLM якорь стиля и структуры, что заметно улучшает качество —
особенно для редких жанров (memory, tower, breakout).

## Формат записи

{
  "id": "snake-elderly-01",
  "genre": "snake",
  "audience": "elderly",
  "theme": "природа",
  "mechanics": ["grow", "collect", "score"],
  "prompt": "замути змейку для бабушки",
  "metrics": {
    "avgSessionSec": 180,
    "winRate": 0.62,
    "plays": 128
  },
  "html": "<!DOCTYPE html>..."
}

## Где лежит

core/corpus/
├── index.json              # манифест
├── snake/
│   ├── elderly.json
│   ├── default.json
│   └── kids.json
├── clicker/
│   ├── kids.json
│   └── elderly.json
├── platformer/
│   └── default.json
├── memory/
│   └── elderly.json
└── .../

Загрузчик `loadCorpus()` рекурсивно читает все `*.json` из `core/corpus/`,
кроме `index.json`.

## Как работает retriever

`retrieveExamples(spec, corpus, {topK: 2})`:

1. Скорит каждую запись: +10 за совпадение жанра, +6 за аудиторию,
   +4 за тему, +1.5 за каждую общую механику
2. Бонусы за `metrics.winRate` и `metrics.plays` — «аналитика прошлых игр»
3. Фильтрует по minScore (по умолчанию 5)
4. Сортирует по score, берёт topK

## Как пополнять корпус

### Вариант 1 — вручную

Добавить JSON в нужную папку. Проверить:

bun -e "
import { loadCorpus } from './core/src/corpus/index.ts';
const c = await loadCorpus('core/corpus');
console.log('Corpus size:', c.length);
console.log(c.map(e => e.id));
"

### Вариант 2 — через LLM

# Все таргеты
bun tools/src/gen-corpus.ts

# Конкретные
TARGETS=snake:elderly,clicker:kids bun tools/src/gen-corpus.ts

Скрипт прогонит промпты через живой LLM-роутер и сохранит результат
в `core/corpus/<genre>/<audience>-<timestamp>.json`.

Перед этим убедись, что есть рабочий провайдер:
echo $ANTHROPIC_API_KEY      # или
echo $OPENAI_API_KEY         # или
curl http://localhost:11434/api/tags  # Ollama

### Вариант 3 — из галереи TMA

Если пользователь сгенерировал игру и она ему понравилась — можно
экспортировать её в корпус. Пока не реализовано, но точка расширения очевидна
(`POST /api/corpus/add`).

## Метрики

`metrics` — «аналитика прошлых игр». Может заполняться:

- вручную — ты знаешь, что эта игра работает хорошо
- из телеметрии TMA — сколько сессий, средняя длительность
- синтетически — для тестирования retriever'а

Влияние на retrieval:
- `winRate: 0.9` -> +1.8 к score
- `plays: 1000` -> +2 к score (капается)

## Рекомендуемый размер

Для MVP достаточно 3-4 игры (одна на популярный жанр).

Для продакшена — 15-25 игр, покрывающих 8-10 жанров × 2-3 аудитории.
Хорошая цель: 3 примера на каждый жанр.

## Как понять, что корпус помогает

Прогнать одинаковый промпт с `useCorpus: true` и `useCorpus: false`,
сравнить warnings и визуально:

bun -e "
import { createGenerator } from './core/src/index.ts';
import { MockProvider } from './core/src/llm/providers/mock.ts';

const gen = createGenerator({ providers: [new MockProvider(10)] });

const withCorpus = await gen.generate('замути змейку для бабушки', { useCache: false });
const withoutCorpus = await gen.generate('замути змейку для бабушки', { useCache: false, useCorpus: false });

console.log('with corpus    warnings:', withCorpus.warnings.length);
console.log('without corpus warnings:', withoutCorpus.warnings.length);
"

(С mock-провайдером разницы не будет — он всегда отдаёт одну фикстуру.
Нужен живой LLM.)