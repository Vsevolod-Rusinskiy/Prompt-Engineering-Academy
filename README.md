# Knowledge Journey

Интерактивная система обучения на `React + Vite + TypeScript + Hono`, которая превращает тему или учебный текст в минимальный `Knowledge Journey`: генерация маршрута, прохождение чекпоинтов под таймером, оценка ответов и финальный отчёт.

Backend умеет работать в двух режимах:

- `OpenAI`-режим: реальная генерация journey, оценка открытых ответов и сборка narrative summary;
- `mock`-режим: fallback без API-ключа, чтобы проект можно было локально поднять и прогнать тестами.

В проекте сохранён и старый контент из Модуля 1: статьи с упражнениями и итоговый тест. Новый основной сценарий лежит в разделе `/journey`.

## AI Extension with Local RAG

Проект расширен минимальным локальным RAG-слоем на базе Ollama:

- `nomic-embed-text-v2-moe:latest` используется для embeddings;
- `qwen3.5:4b` используется для локальной генерации ответов;
- статьи превращаются в chunks и индексируются в локальный JSON-индекс;
- semantic search ищет релевантные chunks по cosine similarity;
- grounded answers возвращаются вместе с источниками;
- персональный контекст хранится в `localStorage` под ключом `prompt-engineering-user-context`;
- AI-действия:
  - `Спроси платформу` на `/ask`;
  - `Объяснить проще` в текстовых секциях статей;
  - `Что изучить дальше?` после quiz или Journey report.

## Почему этот стек

- `React` даёт быстрый интерфейс для пошагового прохождения чекпоинтов.
- `Vite` нужен как простой SPA-dev server и proxy до локального API.
- `TypeScript` держит под контролем доменную модель `journey / checkpoint / activity / attempt / report`.
- `Hono` даёт тонкий backend-слой для генерации, оценки и сборки отчёта.
- `Zod` валидирует входные payload'ы API.
- `OpenAI Responses API` используется для структурированной генерации и оценки через `zod`-схемы.
- `dotenv` подтягивает локальную конфигурацию сервера через `.env`.

## Что реализовано

- Новый поток `Knowledge Journey`:
  - экран генерации из темы или текста;
  - прохождение 3 чекпоинтов;
  - таймер на чекпоинт;
  - XP, streak, achievements;
  - финальный отчёт с артефактом.
- Backend API:
  - `POST /api/journey/generate`
  - `POST /api/attempt/evaluate`
  - `POST /api/report/build`
- Типы активностей в journey:
  - `MultipleChoice`
  - `TrueFalse`
  - `FillTheBlank`
  - `MatchPairs`
  - `OrderSteps`
  - `FreeResponse`
  - `TeachBack`
  - `SourceAnchor`
- Старая часть проекта из Модуля 1 сохранена:
  - 3 статьи;
  - 7 интерактивных компонентов;
  - итоговый тест на 10 вопросов.

## Архитектура

- Новый домен описан в `src/lib/journey.ts`.
- Клиентские запросы до API лежат в `src/lib/journey-api.ts`.
- Сессия journey хранится в `localStorage` через `src/lib/journey-session.ts`.
- Backend лежит в `server/`:
  - `server/index.ts` — точка входа;
  - `server/routes/` — HTTP-маршруты;
  - `server/lib/ai.ts` — orchestration генерации, оценки и fallback-логики;
  - `server/lib/openai.ts` — клиент OpenAI и structured output requests;
  - `server/lib/prompts.ts` — промпты для генерации journey, оценки и отчёта;
  - `server/lib/llm-schemas.ts` — `zod`-схемы ответов от LLM;
  - `server/lib/scoring.ts` — оценка ответов и сборка отчёта;
  - `server/lib/schemas.ts` — валидация payload'ов.
- Старый модуль 1 остаётся как отдельный слой контента и упражнений.

### Architecture

```text
articles → chunks → embeddings → JSON index → semantic search → qwen3.5:4b → answer + sources
```

## Локальный запуск

1. Установить зависимости:

```bash
npm install
```

2. Создать `.env`:

```bash
cp .env.example .env
```

Для локального RAG должен быть запущен Ollama, а модели должны быть установлены:

```bash
ollama pull nomic-embed-text-v2-moe
ollama pull qwen3.5:4b
```

Собрать локальный JSON-индекс:

```bash
npm run rag:index
```

3. При желании включить реальный AI-режим:

- заполнить `OPENAI_API_KEY` в `.env`;
- при необходимости поменять `OPENAI_MODEL` (по умолчанию `gpt-5-mini`).

Если ключ не указан, backend автоматически работает в `mock`-режиме.

4. Запустить API:

```bash
npm run server:start
```

5. В отдельном терминале запустить dev-сервер:

```bash
npm run dev
```

6. Открыть:

- `http://127.0.0.1:4173/journey` — новый основной сценарий
- `http://127.0.0.1:4173/` — главная
- `http://127.0.0.1:4173/quiz` — старый итоговый тест

### Local setup

```bash
npm install
cp .env.example .env
npm run rag:index
npm run server:start
npm run dev
```

### How to try

- Открыть `/ask` и задать вопрос платформе.
- В статье нажать `Объяснить проще`.
- После quiz или Journey report нажать `Что изучить дальше?`.
- Проверить персональный контекст в `localStorage` по ключу `prompt-engineering-user-context`.

## Как проверить проект

1. Открыть `/journey`.
2. Ввести тему или вставить текст.
3. Нажать `Сгенерировать journey`.
4. Пройти 3 чекпоинта:
   - отвечать на активности;
   - следить за таймером;
   - перейти дальше после закрытия чекпоинта.
5. На последнем этапе нажать `Собрать отчёт`.
6. Убедиться, что появился отчёт с:
   - итоговым процентом;
   - сильными зонами;
   - зонами роста;
   - summary по чекпоинтам;
   - итоговым артефактом.
7. Для автоматической проверки выполнить:

```bash
npm run test
npm run build
```

### Tests

```bash
npm run rag:chunks:test
npm run rag:index
npm run rag:search:test
npm run rag:ask:test
npm run ollama:embed:test
npm run build
```

`npm test` сам поднимает frontend и backend в mock-режиме на тестовых портах.

8. Для проверки AI-режима отдельно открыть:

- `http://127.0.0.1:8787/api/health`

Если ключ настроен, endpoint вернёт `provider: "openai"`. Иначе будет `provider: "mock"`.

## Что ещё не сделано

- Нет БД и серверного хранения прогресса между устройствами.
- Нет PDF или printable-версии финального отчёта.
- Journey сейчас специально ограничен 3 чекпоинтами, чтобы удержать минимальный рабочий объём.
- Реальный `OpenAI`-поток встроен в backend, но в этом репозитории он зависит от наличия `OPENAI_API_KEY`.
- UX доведён только до минимально рабочего состояния, без отдельной косметической полировки.

`npm test` запускает e2e-проверки через `Playwright` и поднимает тестовый API автоматически.
