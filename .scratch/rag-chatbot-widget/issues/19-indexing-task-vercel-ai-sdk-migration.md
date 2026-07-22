# 19 — Indexing Task Vercel AI SDK Migration

**What to build:**
Refactor `trigger/crawl-and-embed.ts` to execute `ensureCollectionExists` before upserting vector points and generate chunk embeddings using Vercel AI SDK's `embedMany` with `@ai-sdk/openai`, eliminating direct `openai` SDK client dependencies.

**Blocked by:** 16 — Qdrant Collection Auto-Initialization, 17 — Boundary-Aware Markdown Paragraph Chunker, 18 — Firecrawl Test Limits & Polling Timeout.

**Status:** ready-for-agent

- [ ] `crawlAndEmbed` calls `ensureCollectionExists(botConfig.vectorCollection)` prior to upserting.
- [ ] Replace `openaiClient.embeddings.create` with `embedMany({ model: openai.embedding("text-embedding-3-small"), values: ... })` from `ai` and `@ai-sdk/openai`.
- [ ] Update `trigger/crawl-and-embed.test.ts` to mock Vercel AI SDK `embedMany` and verify collection initialization and point upsert formatting.
- [ ] Remove or deprecate standalone `src/services/openaiClient.ts`.
