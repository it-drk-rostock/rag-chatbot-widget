# 09 — Trigger.dev Crawl Task Integration

**What to build:** Integrating the crawling, chunking, embedding, and vector database upsert services into the background Trigger.dev task `crawl-and-embed`.

**Blocked by:**

- 03 — Trigger.dev Setup & Hello World Task
- 06 — Firecrawl & Chunking Service
- 07 — Embedding & Qdrant Service

**Status:** complete

- [x] The Trigger.dev task definition for `crawl-and-embed` is created, executing the site crawl recursively using the Firecrawl service.
- [x] For each scraped page, the task splits the content using the chunking service, generates vector embeddings using the embedding service, and upserts them to the Qdrant database.
- [x] The task reports status milestones (queued, crawling, embedding, completed) to the Trigger.dev execution context.
- [x] Integration tests verify that triggering the `crawl-and-embed` task invokes the sub-services (Firecrawl, chunker, OpenAI embedding, and Qdrant client) in the correct sequence.
