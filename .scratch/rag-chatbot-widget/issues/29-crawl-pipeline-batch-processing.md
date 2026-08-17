# 29 — Crawl Pipeline Batch Processing

**What to build:**
Refactor the background indexing pipeline task (`crawlAndEmbedTask`) to process Markdown chunk embeddings (`embedMany`) and Qdrant point upserts (`qdrantClient.upsert`) in controlled batches of ~100 chunks, updating Trigger.dev task metadata per batch to optimize memory and token throughput.

**Blocked by:** 27 — Firecrawl Node SDK Migration.

**Status:** complete

- [x] Refactor `crawlAndEmbed()` in `trigger/crawl-and-embed.ts` to collect all Markdown chunks and process embeddings in batches of 100.
- [x] Upsert vector points to Qdrant batch by batch, updating `metadata.set("status", ...)` and processed chunk counts.
- [x] Update unit and integration tests in `trigger/crawl-and-embed.test.ts` to verify batch processing and metadata tracking.
- [x] All Vitest tests pass cleanly.
