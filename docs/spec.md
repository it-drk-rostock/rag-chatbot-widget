# Specification: RAG Chatbot Widget & Indexer

## Problem Statement

Website owners want an easy, secure, and cost-efficient way to add a "Chat-with-your-Website" assistant to their sites (e.g. TYPO3). They need to trigger content indexing on demand and monitor progress, while ensuring the user-facing chat widget loads fast, respects rate limits, isolates styles to prevent layout breakage, and cites sources accurately.

Furthermore, the implementation must avoid overengineering and custom streaming parsers by leveraging standard Vercel AI SDK UI primitives (`useChat`, `createUIMessageStreamResponse`, `convertToModelMessages`, `toUIMessageStream`), ensuring Qdrant collections are auto-created when absent, and allowing environment variables (`.env`) to dynamically configure scraping targets and CORS boundaries without code changes.

## Solution

A Next.js serverless application hosted on Cloudflare (via OpenNext) paired with Trigger.dev (v4) for background execution. The system features:
1. A secure **Admin Dashboard** route `/admin/[secret]` for triggering and tracking indexing.
2. A **Background Pipeline** task executing Firecrawl recursive scraping, boundary-aware Markdown chunking, Vercel AI SDK `embedMany` vector generation, and Qdrant vector database storage with automatic collection initialization.
3. A rate-limited `/api/chat` route using Upstash Redis and Vercel AI SDK UI message streaming (`createUIMessageStreamResponse`).
4. A lightweight, embeddable **Chat Widget** rendered via `@ai-sdk/react` `useChat` inside a styled Mantine interface and injected via `embed.js`.

All runtime backend target URLs and allowed origins are loaded dynamically from environment variables (`.env`) with fallback defaults in `botConfig.ts`.

---

## User Stories

1. As an administrator, I want to access the **Admin Dashboard** only via a designated secret path parameter, so that unauthorized users cannot discover the admin access point.
2. As an administrator, I want to enter a password to log into the dashboard, so that I can prevent unauthorized triggers of crawls.
3. As an administrator, I want to see a clear error message if I enter the incorrect password, so that I know why access was denied.
4. As an administrator, I want to trigger a new index crawl on demand by clicking a button, so that the chatbot's knowledge matches the latest website updates.
5. As an administrator, I want to see the real-time status of the indexing task (e.g., "queued", "crawling", "embedding", "upserting", "completed") directly on the dashboard, so that I know when the job finishes.
6. As a developer, I want the system to check if the target Qdrant collection exists and create it automatically if missing, so that first-time index runs do not crash with 404 vector errors.
7. As a developer, I want to set `CRAWLER_TARGET_URL`, `ALLOWED_ORIGINS`, `CRAWL_LIMIT`, and `CRAWL_MAX_DEPTH` in `.env`, so that I can test with 1 page locally and target different sites without modifying TypeScript source files.
8. As a developer, I want the Markdown chunker to split content linearly at heading and paragraph boundaries without chopping words or code blocks mid-character, so that chunk quality and embedding performance are optimized.
9. As a developer, I want to standardise embedding generation across indexing and chat search using Vercel AI SDK (`embedMany` and `embed`), so that external SDK dependencies are unified.
10. As a website visitor, I want to see a floating chat bubble at the bottom right of the host website page, so that I can click it to open the assistant.
11. As a website visitor, I want the chat window to toggle open and closed smoothly when I click the bubble, so that it doesn't block screen real estate when not in use.
12. As a website visitor, I want the chat assistant to stream responses using standard Vercel AI SDK UI streams (`useChat`), so that UI updates are smooth and memory efficient.
13. As a website visitor, I want the assistant to include clickable Markdown links pointing to the source pages, so that I can verify facts and find more details.
14. As a website visitor, I want to see a friendly rate-limit warning message if I send queries too quickly, so that I understand why the bot is temporarily unavailable.

---

## Implementation Decisions

### 1. Central Configuration & Environment Overrides
- Server-side runtime settings (`crawlerTargetUrl`, `allowedOrigins`, `vectorCollection`) read directly from `process.env` (`CRAWLER_TARGET_URL`, `ALLOWED_ORIGINS`, `QDRANT_COLLECTION`) with fallback defaults in `src/config/botConfig.ts`.
- Client-side visual defaults (colors, bot name, welcome message) remain in `botConfig.ts`.

### 2. Qdrant Collection Auto-Initialization
- Before upserting vector points, `qdrantClient` checks `qdrantClient.collectionExists(collectionName)`.
- If missing, `qdrantClient.createCollection(collectionName, { vectors: { size: 1536, distance: "Cosine" } })` is executed automatically.

### 3. Boundary-Aware Paragraph Chunker
- Markdown splitting refactored to a single-pass linear paragraph accumulator ($O(N)$).
- Flushes accumulated text buffers on Markdown headings (`#`, `##`, `###`) or paragraph double-newlines (`\n\n`) up to ~1,000 characters, ensuring no words or syntax tokens are severed mid-character.

### 4. Firecrawl Scraper Configuration & Timeout Safeguards
- Crawl requests pass `limit` and `maxDiscoveryDepth` from `process.env.CRAWL_LIMIT` (default 1 in dev) and `process.env.CRAWL_MAX_DEPTH` (default 1 in dev).
- Status polling loop includes a 180-second timeout safeguard to fail fast if Firecrawl stalls.

### 5. Vercel AI SDK Standardized Chat & Embedding Pipeline
- Direct `openai` SDK embedding calls replaced with Vercel AI SDK `embedMany` and `embed` using `@ai-sdk/openai`.
- `/api/chat` route accepts `UIMessage[]` payloads, executes Qdrant vector retrieval, converts messages with `convertToModelMessages`, and streams responses via `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })`.
- `/widget` page refactored to consume `/api/chat` via `@ai-sdk/react` `useChat`.

---

## Testing Decisions

### Seams
1. **Chat API Seam:** `/api/chat` edge route tested via Vitest with mocked `@ai-sdk/openai` and `QdrantClient`, asserting `createUIMessageStreamResponse` stream format, CORS headers, and rate limiting (429 status code).
2. **Pipeline Execution Seam:** `crawlAndEmbedTask` tested by mocking `firecrawlService` and AI SDK `embedMany`, verifying collection auto-creation (`ensureCollectionExists`) and point payload upserts to Qdrant.
3. **Widget Component Seam:** React UI testing for `WidgetPage` using `@testing-library/react` and `useChat` hook mock, asserting chat message rendering and user interaction.

### Test Practices
- Assert external HTTP contracts, stream structures, and state transitions rather than private implementation details.
- Unit and integration tests run via **Vitest**.

---

## Out of Scope

- Search reranking models (Cohere/Jina); baseline Qdrant vector retrieval is evaluated first.
- Multi-tenant architecture or dynamic database-backed configuration.
- Crawling non-HTML elements (PDFs, images, binary documents).

## Further Notes
TYPO3 host site integration remains identical via `<script src="https://<domain>/embed.js"></script>`.
