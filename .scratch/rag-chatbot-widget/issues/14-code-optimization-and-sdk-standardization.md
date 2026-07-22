---
triage: ready-for-agent
---

**Status:** complete

# Issue 14: Codebase Optimization & Vercel AI SDK Standardization

## Problem Statement

The codebase currently contains custom SSE streaming parsers (`ReadableStream` encoders and manual string splitters on the client and server), lacks automatic Qdrant collection initialization for clean cold-start runs, hardcodes crawler target URLs inside TypeScript source files, uses character-level string slicing in the Markdown chunker, and uses direct `openai` SDK embedding instantiations alongside Vercel AI SDK.

## Solution

Standardize on Vercel AI SDK UI primitives (`createUIMessageStreamResponse`, `convertToModelMessages`, `toUIMessageStream`, and `@ai-sdk/react` `useChat`), add Qdrant auto-creation for missing collections, allow server environment variables (`.env`) to configure crawl limits and target URLs, and implement a single-pass boundary-aware Markdown paragraph chunker.

## User Stories

1. As an administrator, I want to trigger index crawls that automatically create the Qdrant collection if it does not exist, so that first-time runs succeed seamlessly.
2. As a developer, I want to set `CRAWLER_TARGET_URL`, `ALLOWED_ORIGINS`, `CRAWL_LIMIT`, and `CRAWL_MAX_DEPTH` in `.env`, so that local testing runs quickly with 1 page without modifying TypeScript source files.
3. As a developer, I want the Markdown chunker to split content at heading and paragraph boundaries without cutting words mid-character, so that embedding vector quality is preserved.
4. As a developer, I want all AI model calls (chat completions and embeddings) to use Vercel AI SDK (`@ai-sdk/openai`), so that the SDK stack is unified across the repository.
5. As a website visitor, I want the chat widget UI to consume streamed responses via Vercel AI SDK's standard `useChat` hook, so that chat rendering is fast, reliable, and memory-efficient.

## Implementation Decisions

1. **Environment Configuration**: Make `crawlerTargetUrl`, `allowedOrigins`, and `vectorCollection` configurable via `.env` (`CRAWLER_TARGET_URL`, `ALLOWED_ORIGINS`, `QDRANT_COLLECTION`) with fallbacks in `src/config/botConfig.ts`.
2. **Qdrant Auto-Creation**: Add `ensureCollectionExists(collectionName)` in `qdrantClient.ts` to check `qdrantClient.collectionExists(collectionName)` and create `vectors: { size: 1536, distance: "Cosine" }` if missing.
3. **Boundary-Aware Chunker**: Refactor `src/services/markdownChunker.ts` to a single-pass line/paragraph accumulator flushing on Markdown headings (`#`, `##`, `###`) or paragraph breaks (`\n\n`) up to ~1,000 characters.
4. **Firecrawl Safeguards & Test Limits**: Support `process.env.CRAWL_LIMIT` and `process.env.CRAWL_MAX_DEPTH` (defaulting to 1 / 1 in dev) and add a 180s timeout limit to the polling loop in `firecrawlService.ts`.
5. **Vercel AI SDK Integration**:
   - Update `app/api/chat/route.ts` to convert `UIMessage[]` via `convertToModelMessages`, retrieve vector context via AI SDK `embed`, and stream responses via `createUIMessageStreamResponse`.
   - Update `app/widget/page.tsx` to use `@ai-sdk/react` `useChat`.
   - Update `trigger/crawl-and-embed.ts` to use Vercel AI SDK `embedMany`.

## Testing Decisions

- **Chat API Seam**: Test `/api/chat` using Vitest with mocked Vercel AI SDK and `QdrantClient`, asserting response headers, stream structure, and 429 rate limits.
- **Pipeline Execution Seam**: Test `crawlAndEmbedTask` by mocking `firecrawlService` and `embedMany`, asserting collection creation check and Qdrant upsert points.
- **Widget Component Seam**: Test `WidgetPage` React UI by mocking `@ai-sdk/react` `useChat`.

## Out of Scope

- Search reranking models (Cohere/Jina); baseline Qdrant vector retrieval will be evaluated first.
- Multi-tenant architecture.
