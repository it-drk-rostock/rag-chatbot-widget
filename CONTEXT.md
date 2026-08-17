# RAG Chatbot Widget & Indexer

A retrieval-augmented generation chatbot widget that can be embedded on client websites, powered by background scraping and indexing tasks.

## Language

**Bot Configuration**:
Central settings stored in code, with deployment-specific values such as approved origins read from environment variables.
_Avoid_: Database-backed or per-request configuration

**Admin Dashboard**:
A secure, password-protected single-page interface used to trigger website crawling and monitor indexing status.
_Avoid_: Admin portal, control panel

**Background Pipeline**:
The long-running indexing process executed asynchronously to crawl a website, chunk the content, generate embeddings, and upsert them to the vector database.
_Avoid_: Ingest pipeline, scraper task

**Chat Widget**:
The user-facing embeddable chat interface loaded on external websites to interact with the assistant.
_Avoid_: Bot UI, chat frame

**Vector Payload**:
The payload attached to a point in Qdrant storing chunk metadata (`url`, `title`, `index`) and `content` (the chunk's specific Markdown text).
_Avoid_: Storing full-page unchunked raw markdown in payloads

**Full Re-index**:
Clearing or resetting existing vectors prior to crawling and embedding to guarantee no orphaned or stale chunks remain in Qdrant.
_Avoid_: Partial upserts without stale chunk cleanup

**Manual Vector Reset**:
An administrative operation triggered from the Admin Dashboard that resets/re-initializes the Qdrant vector collection on demand without running a crawl pipeline.
_Avoid_: Wiping vector DB during active chat traffic without admin confirmation

**Firecrawl SDK Wrapper**:
The application service interface wrapping the official `@mendable/firecrawl-js` client SDK, eliminating legacy raw REST fetch calls and manual polling timeouts.
_Avoid_: Custom HTTP polling loops, direct raw REST API requests to Firecrawl


