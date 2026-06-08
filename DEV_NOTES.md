# Dev Notes — AI Extension with Local RAG

## Goal

Расширить существующую образовательную платформу минимальным локальным RAG без переусложнения архитектуры.

## Existing Project

- Frontend: React + Vite + TypeScript
- Backend: Hono
- Existing AI modes: OpenAI + mock fallback
- Existing content: articles, exercises, quiz, Knowledge Journey
- Existing client storage: localStorage for Journey session

## Local Models

- nomic-embed-text-v2-moe:latest — embeddings
- qwen3.5:4b — local answer generation

## MVP Decisions

- Start with articles only.
- One article text section = one chunk.
- Use a local JSON index.
- Use cosine similarity.
- Use topK = 3.
- Add semantic search before LLM answer generation.
- Keep the existing OpenAI and mock Journey flow unchanged.
- Use localStorage for future personal context.
- Do not add PostgreSQL, pgvector, Docker, Redis, Qdrant, Chroma, Pinecone, auth, queues or microservices.

## Planned Iterations

1. Project setup and Dev Notes
2. Ollama health check
3. Embedding for one test string
4. Article chunks
5. JSON index
6. Semantic search API
7. Grounded answer with sources through qwen3.5:4b
8. Ask Platform UI
9. Personal context
10. AI actions
11. Tests and README

## Prompt Journal

### Prompt 001 — Repository audit

Goal:
Audit the existing project before implementation.

Result:
Confirmed the existing frontend/backend structure, OpenAI and mock modes, localStorage Journey session, articles as the initial content source, and absence of Ollama/RAG code.

Decision:
Implement the smallest vertical slice first. Do not add infrastructure that is unnecessary for the assignment.

## Development Log

### Iteration 1 — Project setup and Dev Notes

Status:
Completed.

Changes:
- Added DEV_NOTES.md.

Verification:
- Confirmed the correct local git repository.
- Confirmed current branch and clean working tree before changes.

### Iteration 2 — Ollama health check

Status:
Completed.

Changes:
- Added a minimal Ollama HTTP adapter.
- Added `GET /api/ollama/health`.
- Added Ollama configuration variables to `.env.example`.

Verification:
- Confirmed that the local Ollama API responds.
- Confirmed that the required embedding and chat models are installed.

Decision:
Keep Ollama integration isolated from the existing OpenAI/mock Journey flow.
Do not add embeddings or RAG until the health check works independently.

### Iteration 3 — Embedding smoke test

Status:
Completed.

Changes:
- Added a minimal Ollama embedding method using `POST /api/embed`.
- Added separate prefixes for query and document embeddings.
- Added `npm run ollama:embed:test`.

Verification:
- Generated one document embedding.
- Generated one query embedding.
- Confirmed that both vectors are non-empty and have matching dimensions.

Decision:
Keep embeddings as an internal backend utility.
Do not expose a public embedding endpoint.
Use `search_document:` for indexed content and `search_query:` for user questions.

### Iteration 4 — Article chunks

Status:
Completed.

Changes:
- Added a minimal `RagChunk` type for article content.
- Added deterministic conversion from article text sections to chunks.
- Added `npm run rag:chunks:test`.

Verification:
- Confirmed that text sections are converted to non-empty chunks.
- Confirmed that inline exercises are skipped.
- Confirmed that chunk ids are stable and unique.
- Confirmed that each chunk contains source metadata and an article URL.

Decision:
Use one article text section as one chunk for the MVP.
Index articles first.
Do not include quiz, Journey or inline exercises until the article-only RAG path works end to end.

### Iteration 5 — Local JSON RAG index

Status:
Completed.

Changes:
- Added `IndexedRagChunk` and `RagIndex`.
- Added `npm run rag:index`.
- Generated `server/data/rag-index.json` with document embeddings for article chunks.

Verification:
- Indexed all article text chunks.
- Confirmed that every embedding is non-empty.
- Confirmed that all embeddings have matching dimensions.
- Confirmed that the generated index contains source metadata and article URLs.

Decision:
Store the small generated JSON index in the repository for the MVP.
Generate embeddings sequentially to keep the local implementation simple.
Do not add semantic search until the index structure is verified independently.

### Iteration 6 — Semantic search without LLM

Status:
Completed.

Changes:
- Added JSON index loading and runtime validation.
- Added cosine similarity.
- Added semantic search with query embeddings.
- Added `POST /api/rag/search`.
- Added `npm run rag:search:test`.

Verification:
- Confirmed that Russian-language queries retrieve relevant article chunks.
- Confirmed that the top result matches the expected article for hallucinations, tokens and prompt structure.
- Confirmed that search results include source metadata and URLs.
- Confirmed that embeddings are not returned through the API.

Decision:
Validate retrieval quality before adding LLM answer generation.
Read the small JSON index on each search request for the MVP.
Do not add caching or a vector database.

### Iteration 7 — Grounded RAG answer

Status:
Completed.

Changes:
- Added minimal Ollama text generation through `POST /api/generate`.
- Added a documented RAG answer prompt.
- Added grounded answer generation from top 3 article chunks.
- Added `POST /api/rag/ask`.
- Added `npm run rag:ask:test`.

Verification:
- Confirmed that the local chat model returns a non-empty answer.
- Confirmed that the hallucinations query uses `hallucinations-and-safety` as the first source.
- Confirmed that three source references are returned separately from the answer.
- Confirmed that embeddings are not exposed to the client.

Decision:
Use one-shot grounded generation for the MVP.
Keep sources separate from the generated answer.
Do not add chat history, streaming or UI until the backend RAG answer works independently.

### Iteration 8 — Ask Platform UI

Status:
Completed.

Changes:
- Added the `/ask` page.
- Added a client API helper for `/api/rag/ask`.
- Displayed the grounded answer and source references.
- Added navigation to `Спроси платформу`.

Decision:
Keep the first UI slice minimal.
Do not add chat history or streaming.

Note:
- Added a waiting caption for the local model response.

### Iteration 9 — Minimal user context

Status:
Completed.

Changes:
- Added localStorage user context.
- Saved recent queries, quiz attempts and Journey reports.
- Aggregated weak and strong topics from Journey reports.
- Kept the MVP without a database or auth.
- Disabled Ollama reasoning mode with `think: false` to speed up local answers.

### Iteration 10.1 — Explain simply action

Status:
Completed.

Changes:
- Added the AI action `Объяснить проще`.
- Used the local model for simpler explanations.
- Scoped the action to a specific article section.

### Iteration 10.2 — Next study recommendation

Status:
Completed.

Changes:
- Added a personal next-study recommendation.
- Used weakTopics, strongTopics and recentQueries.
- Grounded recommendations on platform articles.

### Iteration 11 — README and final verification

Status:
Completed.

Changes:
- Updated README with the local RAG extension.
- Completed final verification.
- Finished the MVP.
- Deliberately did not add a database, vector DB, auth, streaming or chat history.
